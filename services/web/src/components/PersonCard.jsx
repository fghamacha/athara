import { useNavigate } from 'react-router-dom'

function initials(p) {
  return `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()
}

function avatarColor(p) {
  if (p.gender === 'male') return 'var(--male)'
  if (p.gender === 'female') return 'var(--female)'
  return '#6c63ff'
}

export default function PersonCard({ person }) {
  const navigate = useNavigate()

  const alive = !person.death_date
  const age = () => {
    if (!person.birth_date) return null
    const end = person.death_date ? new Date(person.death_date) : new Date()
    const birth = new Date(person.birth_date)
    return Math.floor((end - birth) / (365.25 * 24 * 3600 * 1000))
  }

  return (
    <div
      className="card"
      style={{ cursor: 'pointer', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
      onClick={() => navigate(`/persons/${person.id}`)}
    >
      {person.photo_url ? (
        <img src={person.photo_url} alt="" className="avatar" />
      ) : (
        <div className="avatar-placeholder" style={{ background: avatarColor(person) }}>
          {initials(person)}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>
          {person.first_name} {person.last_name}
        </div>

        {person.profession && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginBottom: '0.35rem' }}>
            {person.profession}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {person.gender && (
            <span className={`tag tag-${person.gender}`}>
              {person.gender === 'male' ? 'Homme' : person.gender === 'female' ? 'Femme' : 'Autre'}
            </span>
          )}
          {!alive && <span className="tag tag-deceased">Décédé(e)</span>}
          {age() !== null && <span className="badge">{age()} ans</span>}
          {person.birth_place && <span className="badge">{person.birth_place}</span>}
        </div>
      </div>
    </div>
  )
}
