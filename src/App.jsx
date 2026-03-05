import { useState, useEffect } from "react"
import MoodSelector from "./components/MoodSelector"
import GenrePicker from "./components/GenrePicker"
import ResultsGrid from "./components/ResultsGrid"

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY

const ALL_MOODS = ["Mind-bending and cerebral", "Heartwarming and feel-good", "Edge-of-seat thrilling", "Laugh-out-loud funny", "Deeply emotional and moving", "Dark and unsettling", "Epic and adventurous", "Dreamy and surreal", "Thought-provoking and philosophical", "Romantic and intimate"]
const ALL_GENRES = ["Drama", "Sci-Fi", "Horror", "Comedy", "Thriller", "Action", "Fantasy", "Romance", "Documentary", "Animation", "Crime", "Mystery"]

const moodFilters = {
  "Mind-bending and cerebral": { sort: "vote_average.desc", minVote: 7.5 },
  "Heartwarming and feel-good": { sort: "popularity.desc", minVote: 7.0 },
  "Edge-of-seat thrilling": { sort: "popularity.desc", minVote: 6.5 },
  "Laugh-out-loud funny": { sort: "popularity.desc", minVote: 6.5 },
  "Deeply emotional and moving": { sort: "vote_average.desc", minVote: 7.5 },
  "Dark and unsettling": { sort: "vote_average.desc", minVote: 7.0 },
  "Epic and adventurous": { sort: "popularity.desc", minVote: 7.0 },
  "Dreamy and surreal": { sort: "vote_average.desc", minVote: 7.0 },
  "Thought-provoking and philosophical": { sort: "vote_average.desc", minVote: 7.5 },
  "Romantic and intimate": { sort: "popularity.desc", minVote: 6.5 },
}

const genreMap = {
  "Drama": 18, "Sci-Fi": 878, "Horror": 27, "Comedy": 35, "Thriller": 53,
  "Action": 28, "Fantasy": 14, "Romance": 10749, "Documentary": 99,
  "Animation": 16, "Crime": 80, "Mystery": 9648, "Historical": 36, "Art-house": 10402
}

const eraYears = {
  "Pre-1960s": { lte: "1959-12-31" },
  "1960s-1970s": { gte: "1960-01-01", lte: "1979-12-31" },
  "1980s-1990s": { gte: "1980-01-01", lte: "1999-12-31" },
  "2000s-2010s": { gte: "2000-01-01", lte: "2019-12-31" },
  "Any era": {},
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true)
  const [mood, setMood] = useState("")
  const [genres, setGenres] = useState([])
  const [era, setEra] = useState(4)
  const [prefs, setPrefs] = useState([])
  const [movies, setMovies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const eras = ["Pre-1960s", "1960s-1970s", "1980s-1990s", "2000s-2010s", "Any era"]
  const prefOptions = [
    { label: "Hidden Gems", value: "hidden gems and underseen films" },
    { label: "Foreign Language", value: "non-English foreign films" },
    { label: "Short Runtime", value: "under 100 minutes runtime" },
    { label: "Critically Acclaimed", value: "critically acclaimed films" },
    { label: "Auteur Cinema", value: "director-driven auteur cinema" },
  ]

  useEffect(() => {
    document.body.classList.toggle("light", !darkMode)
  }, [darkMode])

  const togglePref = (val) =>
    setPrefs(prev => prev.includes(val) ? prev.filter(p => p !== val) : [...prev, val])

  const fetchMovies = async (selectedMood, selectedGenres, selectedEra, selectedPrefs) => {
    setError("")
    setMovies([])
    setLoading(true)
    try {
      const payload = {
        mood: selectedMood,
        genres: selectedGenres,
        era: selectedEra,
        prefs: selectedPrefs
      }

      const res = await fetch("http://localhost:3001/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMovies(data.movies || [])
    } catch (err) {
      setError("Something went wrong: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRecommend = () => fetchMovies(mood, genres, eras[era], prefs)

  const handleSurprise = () => {
    const rMood = ALL_MOODS[Math.floor(Math.random() * ALL_MOODS.length)]
    const rGenre = ALL_GENRES[Math.floor(Math.random() * ALL_GENRES.length)]
    const rEraIdx = Math.floor(Math.random() * eras.length)
    setMood(rMood)
    setGenres([rGenre])
    setEra(rEraIdx)
    setPrefs([])
    fetchMovies(rMood, [rGenre], eras[rEraIdx], [])
  }

  return (
    <div className="app">
      <div className="grain" />
      <header className="header">
        <div className="header-left">
          <div className="logo">R<span>EEL</span></div>
          <div className="tagline">ML-powered cinema discovery</div>
        </div>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </header>
      <main className="main">
        <section className="section">
          <div className="section-label">01 Your Mood Tonight</div>
          <MoodSelector selected={mood} onSelect={setMood} />
        </section>
        <section className="section">
          <div className="section-label">02 Pick Genres</div>
          <GenrePicker selected={genres} onToggle={(g) =>
            setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
          } />
        </section>
        <section className="section">
          <div className="section-label">03 Era Preference</div>
          <div className="era-row">
            <input type="range" min="0" max="4" value={era} step="1"
              className="era-slider"
              onChange={e => setEra(parseInt(e.target.value))} />
            <span className="era-desc">{eras[era]}</span>
          </div>
        </section>
        <section className="section">
          <div className="section-label">04 Extra Preferences</div>
          <div className="prefs-row">
            {prefOptions.map(p => (
              <label key={p.value} className={"pref-check " + (prefs.includes(p.value) ? "active" : "")}>
                <input type="checkbox" checked={prefs.includes(p.value)} onChange={() => togglePref(p.value)} />
                <span className="pref-box">{prefs.includes(p.value) ? "v" : ""}</span>
                <span className="pref-text">{p.label}</span>
              </label>
            ))}
          </div>
        </section>
        <div className="cta-wrap">
          <button className="cta-btn" onClick={handleRecommend} disabled={loading}>
            {loading ? "Searching..." : "Find My Films"}
          </button>
          <button className="surprise-btn" onClick={handleSurprise} disabled={loading}>
            Surprise Me
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
