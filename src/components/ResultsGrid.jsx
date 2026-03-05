import MovieCard from './MovieCard'

export default function ResultsGrid({ movies }) {
  return (
    <div className="results">
      <div className="results-header">
        <div className="results-title">Your Programme</div>
        <div className="results-count">{movies.length} films selected</div>
      </div>
      <div className="cards-grid">
        {movies.map((movie, i) => (
          <MovieCard key={movie.title + i} movie={movie} index={i} />
        ))}
      </div>
    </div>
  )
}
