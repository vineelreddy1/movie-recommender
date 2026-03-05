import express from 'express'
import cors from 'cors'
import axios from 'axios'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manually load .env file
const envPath = resolve('.env')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  })
  console.log('.env loaded successfully')
} catch (e) {
  console.error('Could not read .env file:', e.message)
}

const app = express()
app.use(cors())
app.use(express.json())

const TMDB_KEY = process.env.VITE_TMDB_API_KEY || '37a6bc86a3397811ace6d18055c16ee4'

// Map mood to TMDB sort & vote filters
const moodFilters = {
  'Mind-bending and cerebral': { sort: 'vote_average.desc', minVote: 7.5 },
  'Heartwarming and feel-good': { sort: 'popularity.desc', minVote: 7.0 },
  'Edge-of-seat thrilling': { sort: 'popularity.desc', minVote: 6.5 },
  'Laugh-out-loud funny': { sort: 'popularity.desc', minVote: 6.5 },
  'Deeply emotional and moving': { sort: 'vote_average.desc', minVote: 7.5 },
  'Dark and unsettling': { sort: 'vote_average.desc', minVote: 7.0 },
  'Epic and adventurous': { sort: 'popularity.desc', minVote: 7.0 },
  'Dreamy and surreal': { sort: 'vote_average.desc', minVote: 7.0 },
  'Thought-provoking and philosophical': { sort: 'vote_average.desc', minVote: 7.5 },
  'Romantic and intimate': { sort: 'popularity.desc', minVote: 6.5 },
}

// TMDB genre IDs
const genreMap = {
  'Drama': 18, 'Sci-Fi': 878, 'Horror': 27, 'Comedy': 35,
  'Thriller': 53, 'Action': 28, 'Fantasy': 14, 'Romance': 10749,
  'Documentary': 99, 'Animation': 16, 'Crime': 80, 'Mystery': 9648,
  'Historical': 36, 'Art-house': 10402
}

// Era to year range
const eraYears = {
  'Pre-1960s': { lte: '1959-12-31' },
  '1960s–1970s': { gte: '1960-01-01', lte: '1979-12-31' },
  '1980s–1990s': { gte: '1980-01-01', lte: '1999-12-31' },
  '2000s–2010s': { gte: '2000-01-01', lte: '2019-12-31' },
  'Any era': {},
}

app.post('/api/recommend', async (req, res) => {
  try {
    const { mood, genres, era, prefs } = req.body

    const moodConfig = moodFilters[mood] || { sort: 'vote_average.desc', minVote: 7.0 }
    const yearRange = eraYears[era] || {}

    // Build genre IDs string
    const genreIds = (genres || [])
      .map(g => genreMap[g])
      .filter(Boolean)
      .join(',')

    // Hidden gems = low popularity high rating
    const isHiddenGems = (prefs || []).includes('hidden gems and underseen films')
    const isForeign = (prefs || []).includes('non-English foreign films')
    const isShort = (prefs || []).includes('under 100 minutes runtime')

    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      sort_by: moodConfig.sort,
      'vote_average.gte': moodConfig.minVote,
      'vote_count.gte': isHiddenGems ? 50 : 200,
      page: Math.floor(Math.random() * 5) + 1, // randomise for variety
      include_adult: false,
    })

    if (genreIds) params.append('with_genres', genreIds)
    if (yearRange.gte) params.append('primary_release_date.gte', yearRange.gte)
    if (yearRange.lte) params.append('primary_release_date.lte', yearRange.lte)
    if (isForeign) params.append('without_original_language', 'en')
    if (isShort) params.append('with_runtime.lte', '100')
    if (isHiddenGems) params.append('popularity.lte', '20')

    const url = `https://api.themoviedb.org/3/discover/movie?${params}`
    console.log('TMDB URL:', url)

    const response = await axios.get(url)
    const data = response.data

    if (!data.results || data.results.length === 0) {
      // Fallback: broader search
      const fallback = await axios.get(
        `https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&page=1`
      )
      const fallbackData = fallback.data
      const fallbackResults = fallbackData.results || []
      return res.json({ movies: fallbackResults.slice(0, 6) })
    }

    // Shuffle and pick 6
    const shuffled = data.results.sort(() => Math.random() - 0.5).slice(0, 6)

    // Enrich each with credits (director)
    const enriched = await Promise.all(shuffled.map(async (movie) => {
      try {
        const creditsRes = await axios.get(
          `https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_KEY}`
        )
        const credits = creditsRes.data
        const director = credits.crew?.find(c => c.job === 'Director')?.name ?? 'Unknown'

        // Fetch watch providers (streaming platforms)
        let streamingProviders = []
        try {
          const providersRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${TMDB_KEY}`
          )
          const providersData = providersRes.data
          const usProviders = providersData.results?.US?.flatrate || []
          streamingProviders = usProviders.slice(0, 3).map(p => ({
            name: p.provider_name,
            logo: `https://image.tmdb.org/t/p/w200${p.logo_path}`
          }))
        } catch (providerErr) {
          console.error(`Error fetching providers for movie ${movie.id}:`, providerErr)
        }

        return {
          id: movie.id,
          title: movie.title,
          year: movie.release_date?.split('-')[0] ?? '?',
          director,
          overview: movie.overview,
          poster: movie.poster_path
            ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
            : null,
          tmdb_rating: movie.vote_average?.toFixed(1),
          vibe_score: Math.min(5, Math.round(movie.vote_average / 2)),
          providers: streamingProviders,
          why_watch: `Rated ${movie.vote_average?.toFixed(1)}/10 by ${movie.vote_count?.toLocaleString()} viewers — a perfect match for your mood.`
        }
      } catch (err) {
        console.error(`Error fetching details for movie ${movie.id}:`, err)
        return movie
      }
    }))

    res.json({ movies: enriched })

  } catch (err) {
    console.error('Server error (falling back to mock data):', err.message)
    // Fallback Mock Data
    const mockMovies = [
      {
        id: 'mock1',
        title: 'Cyberpunk Odyssey',
        year: '2024',
        director: 'Alan Turing Jr.',
        overview: 'A mind-bending journey through the digital ether. When the internet becomes sentient, one rogue programmer must dive in.',
        poster: 'https://via.placeholder.com/500x750/13100c/e8a235?text=Cyberpunk',
        tmdb_rating: '8.9',
        vibe_score: 4,
        providers: [
          { name: 'Netflix', logo: 'https://via.placeholder.com/200/E50914/FFFFFF?text=N' }
        ],
        why_watch: 'Rated 8.9/10 — A perfect fallback synthetic film for your mood.'
      },
      {
        id: 'mock2',
        title: 'The Silent Code',
        year: '2023',
        director: 'Ada Lovelace',
        overview: 'A thrilling documentary about the origins of modern computing and the hidden secrets within the first machine languages.',
        poster: 'https://via.placeholder.com/500x750/13100c/a06a18?text=Silent+Code',
        tmdb_rating: '7.8',
        vibe_score: 3,
        providers: [
          { name: 'Prime Video', logo: 'https://via.placeholder.com/200/00A8E1/FFFFFF?text=P' },
          { name: 'Hulu', logo: 'https://via.placeholder.com/200/1CE783/000000?text=H' }
        ],
        why_watch: 'Rated 7.8/10 — Critically acclaimed fallback pick.'
      }
    ]
    res.json({ movies: mockMovies })
  }
})

app.listen(3001, () => {
  console.log('✅ API server running on http://localhost:3001')
})
