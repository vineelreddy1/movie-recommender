const GENRES = [
  'Drama', 'Sci-Fi', 'Horror', 'Comedy', 'Thriller',
  'Action', 'Fantasy', 'Romance', 'Documentary',
  'Animation', 'Crime', 'Mystery', 'Historical', 'Art-house'
]

export default function GenrePicker({ selected, onToggle }) {
  return (
    <div className="genres-grid">
      {GENRES.map(g => (
        <button
          key={g}
          className={`genre-btn ${selected.includes(g) ? 'active' : ''}`}
          onClick={() => onToggle(g)}
        >
          {g}
        </button>
      ))}
    </div>
  )
}
