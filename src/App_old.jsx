import { useState } from 'react'
import MoodSelector from './components/MoodSelector'
import GenrePicker from './components/GenrePicker'
import ResultsGrid from './components/ResultsGrid'

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

const moodFilters = {
  'Mind-bending and cerebral':           { sort: 'vote_average.desc', minVote: 7.5 },
  'Heartwarming and feel-good':          { sort: 'popularity.desc',   minVote: 7.0 },
  'Edge-of-seat thrilling':              { sort: 'popularity.desc',   minVote: 6.5 },
  'Laugh-out-loud funny':                { sort: 'popularity.desc',   minVote: 6.5 },
  'Deeply emotional and moving':         { sort: 'vote_average.desc', minVote: 7.5 },
  'Dark and unsettling':                 { sort: 'vote_average.desc', minVote: 7.0 },
  'Epic and adventurous':                { sort: 'popularity.desc',   minVote: 7.0 },
  'Dreamy and surreal':                  { sort: 'vote_average.desc', minVote: 7.0 },
  'Thought-provoking and philosophical': { sort: 'vote_average.desc', minVote: 7.5 },
  'Romantic and intimate':               { sort: 'popularity.desc',   minVote: 6.5 },
}

const genreMap = {
  'Drama': 18, 'Sci-Fi': 878, 'Horror': 27, 'Comedy': 35,
  'Thriller': 53, 'Action': 28, 'Fantasy': 14, 'Romance': 10749,
  'Documentary': 99, 'Animation': 16, 'Crime': 80, 'Mystery': 9648,
  'Historical': 36, 'Art-house': 10402
}

const eraYears = {
  'Pre-1960s':   { lte: '1959-12-31' },
  '1960s–1970s': { gte: '1960-01-01', lte: '1979-12-31' },
  '1980s–1990s': { gte: '1980-01-01', lte: '1999-12-31' },
  '2000s–2010s': { gte: '2000-01-01', lte: '2019-12-31' },
  'Any era':     {},
}

export default function App() {
  const [mood, setMood] = useState('')
  const [genres, setGenres] = useState([])
  const [era, setEra] = useState(4)
  const [prefs, setPrefs] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const eras = ['Pre-1960s', '1960s–1970s', '1980s–1990s', '2000s–2010s', 'Any era']
  const prefOptions = [
    { label: 'Hidden Gems',       value: 'hidden gems and underseen films' },
    { label: 'Foreign Language',  value: 'non-English foreign films' },
    { label: 'Short Runtime',     value: 'under 100 minutes runtime' },
    { label: 'Critically Acclaimed', value: 'critically acclaimed films' },
    { label: 'Auteur Cinema',     value: 'director-driven auteur cinema' },
  ]

  const togglePref = (val) =>
    setPrefs(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val])

  const handleRecommend = async () => {
    setError('')
    setMovies([])
    setLoading(true)

    try {
      const moodConfig = moodFilters[mood] || { sort: 'vote_average.desc', minVote: 7.0 }
      const yearRange = eraYears[eras[era]] || {}
      const isHiddenGems = prefs.includes('hidden gems and underseen films')
      const isForeign = prefs.includes('non-English foreign films')
      const isShort = prefs.includes('under 100 minutes runtime')

      const genreIds = genres.map(g => genreMap[g]).filter(Boolean).join(',')

      const params = new URLSearchParams({
        api_key: TMDB_KEY,
        sort_by: moodConfig.sort,
        'vote_average.gte': moodConfig.minVote,
        'vote_count.gte': isHiddenGems ? 50 : 200,
        page: Math.floor(Math.random() * 5) + 1,
        include_adult: false,
      })

      if (genreIds) params.append('with_genres', genreIds)
      if (yearRange.gte) params.append('primary_release_date.gte', yearRange.gte)
      if (yearRange.lte) params.append('primary_release_date.lte', yearRange.lte)
      if (isForeign) params.append('without_original_language', 'en')
      if (isShort) params.append('with_runtime.lte', '100')
      if (isHiddenGems) params.append('popularity.lte', '20')

      const res = await fetch(`https://api.themoviedb.org/3/discover/movie?${params}`)
      const data = await res.json()

      let results = data.results || []

      // Fallback if no results
      if (results.length === 0) {
        const fallback = await fetch(`https://api.themoviedb.org/3/movie/top_rated?api_key=${TMDB_KEY}&page=1`)
        const fallbackData = await fallback.json()
        results = fallbackData.results || []
      }

      // Shuffle and pick 6
      const picked = results.sort(() => Math.random() - 0.5).slice(0, 6)

      // Fetch director for each
      const enriched = await Promise.all(picked.map(async (movie) => {
        try {
          const credRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${TMDB_KEY}`)
          const credits = await credRes.json()
          const director = credits.crew?.find(c => c.job === 'Director')?.name ?? 'Unknown'
          return {
            id: movie.id,
            title: movie.title,
            year: movie.release_date?.split('-')[0] ?? '?',
            director,
            overview: movie.overview,
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            tmdb_rating: movie.vote_average?.toFixed(1),
            vibe_score: Math.min(5, Math.round(movie.vote_average / 2)),
            why_watch: `Rated ${movie.vote_average?.toFixed(1)}/10 by ${movie.vote_count?.toLocaleString()} viewers — a perfect match for your mood.`
          }
        } catch {
          return {
            ...movie,
            year: movie.release_date?.split('-')[0] ?? '?',
            director: 'Unknown',
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
            tmdb_rating: movie.vote_average?.toFixed(1),
            vibe_score: Math.min(5, Math.round(movie.vote_average / 2)),
            why_watch: `Rated ${movie.vote_average?.toFixed(1)}/10 — a great pick for tonight.`
          }
        }
      }))

      setMovies(enriched)
    } catch (err) {
      setError(`Something went wrong: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="grain" />
      <header className="header">
        <div className="logo">R<span>EEL</span></div>
        <div className="tagline">Cinema discovery powered by TMDB</div>
      </header>

      <main className="main">
        <section className="section">
          <div className="section-label">01 — Your Mood Tonight</div>
          <MoodSelector selected={mood} onSelect={setMood} />
        </section>

        <section className="section">
          <div className="section-label">02 — Pick Genres</div>
          <GenrePicker selected={genres} onToggle={(g) =>
            setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
          } />
        </section>

        <section className="section">
          <div className="section-label">03 — Era Preference</div>
          <div className="era-row">
            <input type="range" min="0" max="4" value={era} step="1"
              className="era-slider"
              onChange={e => setEra(parseInt(e.target.value))} />
            <span className="era-desc">{eras[era]}</span>
          </div>
        </section>

        <section className="section">
          <div className="section-label">04 — Extra Preferences</div>
          <div className="prefs-row">
            {prefOptions.map(p => (
              <label key={p.value} className={`pref-check ${prefs.includes(p.value) ? 'active' : ''}`}>
                <input type="checkbox" checked={prefs.includes(p.value)} onChange={() => togglePref(p.value)} />
                <span className="pref-box">{prefs.includes(p.value) ? '✓' : ''}</span>
                <span className="pref-text">{p.label}</span>
              </label>
            ))}
          </div>
        </section>

        <div className="cta-wrap">
          <button className="cta-btn" onClick={handleRecommend} disabled={loading}>
            {loading ? 'Searching...' : 'Find My Films'}
          </button>
          <span className="cta-note">Powered by TMDB</span>
        </div>

        {loading && (
          <div className="loading">
            <div className="spinner" />
            <div className="loading-text">Searching the archives...</div>
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}
        {!loading && movies.length > 0 && <ResultsGrid movies={movies} />}
      </main>
    </div>
  )
}
