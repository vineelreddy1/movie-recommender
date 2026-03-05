import { useState } from 'react'

const PLACEHOLDER = 'https://via.placeholder.com/500x750/13100c/6b5e4a?text=No+Poster'

export default function MovieCard({ movie, index }) {
  const [expanded, setExpanded] = useState(false)
  const dots = Array.from({ length: 5 }, (_, i) => i < movie.vibe_score)

  return (
    <div className="movie-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className="card-number">{String(index + 1).padStart(2, '0')}</div>

      <div className="poster-wrap">
        <img
          className="poster"
          src={movie.poster || PLACEHOLDER}
          alt={movie.title}
          onError={e => { e.target.src = PLACEHOLDER }}
        />
        <div className="poster-overlay" />
      </div>

      <div className="card-body">
        <div className="movie-year">{movie.year}</div>
        <div className="movie-title">{movie.title}</div>
        <div className="movie-director">dir. <span>{movie.director}</span></div>

        {movie.genres && movie.genres.length > 0 && (
          <div className="movie-genres">
            {movie.genres.map(g => <span key={g} className="genre-pill">{g}</span>)}
          </div>
        )}

        {movie.overview && (
          <div className="movie-desc-wrap">
            <div className={`movie-desc ${expanded ? 'expanded' : ''}`}>
              {movie.overview}
            </div>
            {movie.overview.length > 120 && (
              <button className="expand-btn" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Show less ↑' : 'Read more ↓'}
              </button>
            )}
          </div>
        )}

        <div className="movie-why">
          <div className="movie-why-label">Why you will love it</div>
          <div className="movie-why-text">{movie.why_watch}</div>
        </div>

        <div className="card-footer">
          <div className="vibe-score">
            <span className="vibe-label">Vibe</span>
            <div className="vibe-dots">
              {dots.map((filled, i) => (
                <div key={i} className={`vibe-dot ${filled ? 'filled' : ''}`} />
              ))}
            </div>
          </div>
          {movie.tmdb_rating && (
            <div className="rating-badge">★ {movie.tmdb_rating}</div>
          )}
        </div>

        {movie.providers && movie.providers.length > 0 && (
          <div className="providers-wrap">
            <span className="providers-label">Stream on:</span>
            <div className="providers-logos">
              {movie.providers.map(p => (
                <img
                  key={p.name}
                  src={p.logo}
                  alt={p.name}
                  title={p.name}
                  className="provider-img"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
