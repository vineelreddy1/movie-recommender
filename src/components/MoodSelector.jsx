const MOODS = [
  { label: 'Mind-bending', value: 'Mind-bending and cerebral' },
  { label: 'Heartwarming', value: 'Heartwarming and feel-good' },
  { label: 'Thrilling', value: 'Edge-of-seat thrilling' },
  { label: 'Laughing', value: 'Laugh-out-loud funny' },
  { label: 'Emotional', value: 'Deeply emotional and moving' },
  { label: 'Dark', value: 'Dark and unsettling' },
  { label: 'Epic', value: 'Epic and adventurous' },
  { label: 'Dreamy', value: 'Dreamy and surreal' },
  { label: 'Thought-provoking', value: 'Thought-provoking and philosophical' },
  { label: 'Romantic', value: 'Romantic and intimate' },
]

export default function MoodSelector({ selected, onSelect }) {
  return (
    <div className="moods-grid">
      {MOODS.map(m => (
        <button
          key={m.value}
          className={`mood-btn ${selected === m.value ? 'active' : ''}`}
          onClick={() => onSelect(selected === m.value ? '' : m.value)}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
