import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { persons as api, relationships, marriages as marriagesApi } from '../api/client'
import AttachmentList from '../components/AttachmentList'
import MarriageForm from '../components/MarriageForm'

function avatarColor(p) {
  if (p?.gender === 'male') return 'var(--male)'
  if (p?.gender === 'female') return 'var(--female)'
  return '#6c63ff'
}

function Initials({ p }) {
  const txt = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()
  return (
    <div className="avatar-placeholder" style={{ background: avatarColor(p), width: 96, height: 96, fontSize: '2rem' }}>
      {txt}
    </div>
  )
}

function RelativeChip({ person }) {
  return (
    <Link to={`/persons/${person.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '0.4rem 0.75rem',
      }}>
        <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem', background: avatarColor(person) }}>
          {`${person.first_name?.[0] ?? ''}${person.last_name?.[0] ?? ''}`.toUpperCase()}
        </div>
        <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{person.first_name} {person.last_name}</span>
      </div>
    </Link>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  )
}

export default function PersonDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [person, setPerson] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [showMarriageForm, setShowMarriageForm] = useState(false)
  const [showParentForm, setShowParentForm] = useState(false)
  const [showChildForm, setShowChildForm] = useState(false)
  const [allPersons, setAllPersons] = useState([])
  const [selectedParent, setSelectedParent] = useState('')
  const [selectedChild, setSelectedChild] = useState('')

  const load = () => api.get(id)
    .then((r) => setPerson(r.data))
    .catch((e) => setLoadError(e?.response?.data?.detail ?? 'Erreur de chargement'))

  useEffect(() => { load() }, [id])
  useEffect(() => {
    api.list().then((r) => setAllPersons(r.data.filter((p) => p.id !== id)))
  }, [id])

  const handleDelete = async () => {
    if (!confirm(`Supprimer ${person.first_name} ${person.last_name} définitivement ?`)) return
    await api.delete(id)
    navigate('/people')
  }

  const handleAddParent = async (e) => {
    e.preventDefault()
    await relationships.create({ parent_id: selectedParent, child_id: id })
    setShowParentForm(false)
    setSelectedParent('')
    load()
  }

  const handleAddChild = async (e) => {
    e.preventDefault()
    await relationships.create({ parent_id: id, child_id: selectedChild })
    setShowChildForm(false)
    setSelectedChild('')
    load()
  }

  if (loadError) return <div className="empty" style={{ color: '#ef4444' }}>Erreur : {loadError}</div>
  if (!person) return <div className="spinner">Chargement...</div>

  const age = () => {
    if (!person.birth_date) return null
    const end = person.death_date ? new Date(person.death_date) : new Date()
    return Math.floor((end - new Date(person.birth_date)) / (365.25 * 24 * 3600 * 1000))
  }

  const fmtDate = (d) => {
    if (!d) return null
    const s = d.split('T')[0]
    if (s.endsWith('-01-01')) return s.slice(0, 4)  // year-only entry
    const [y, m, day] = s.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const endReasonLabel = { death: 'Décès du conjoint', divorce: 'Divorce', separation: 'Séparation' }

  return (
    <div className="page" style={{ maxWidth: '900px' }}>
      <div className="page-header">
        <button className="btn-ghost" onClick={() => navigate(-1)}>← Retour</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to={`/persons/${id}/edit`}>
            <button className="btn-ghost">Modifier</button>
          </Link>
          <button className="btn-danger" onClick={handleDelete}>Supprimer</button>
        </div>
      </div>

      {/* Header person */}
      <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        {person.photo_url ? (
          <img src={person.photo_url} alt="" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <Initials p={person} />
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {person.first_name} {person.last_name}
          </h1>
          {person.profession && (
            <div style={{ color: 'var(--text2)', marginBottom: '0.5rem' }}>{person.profession}</div>
          )}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {person.gender && (
              <span className={`tag tag-${person.gender}`}>
                {person.gender === 'male' ? 'Homme' : person.gender === 'female' ? 'Femme' : 'Autre'}
              </span>
            )}
            {person.death_date && <span className="tag tag-deceased">Décédé(e)</span>}
            {age() !== null && <span className="badge">{age()} ans</span>}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {person.birth_date && <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>🎂 {fmtDate(person.birth_date)}{person.birth_place ? ` — ${person.birth_place}` : ''}</span>}
            {person.death_date && <span style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>Décès · {fmtDate(person.death_date)}</span>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          {/* Bio */}
          {person.bio && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="section-title">Biographie</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)' }}>{person.bio}</p>
            </div>
          )}

          {/* Mariages */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <Section title={`Mariages (${person.marriages.length})`}>
              {person.marriages.length === 0 && <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Aucun mariage enregistré.</p>}
              {person.marriages.map((m) => (
                <div key={m.id} style={{ marginBottom: '0.75rem', background: 'var(--bg3)', borderRadius: '8px', padding: '0.75rem', border: '1px solid var(--border)' }}>
                  <Link to={`/persons/${m.spouse_id}`} style={{ fontWeight: 600 }}>
                    {m.spouse_first_name} {m.spouse_last_name}
                  </Link>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: '0.25rem' }}>
                    {m.start_date ? `Marié(e) le ${fmtDate(m.start_date)}` : 'Date inconnue'}
                    {m.end_date && ` — ${fmtDate(m.end_date)}`}
                    {m.end_reason && ` (${endReasonLabel[m.end_reason]})`}
                  </div>
                  {m.notes && <div style={{ fontSize: '0.8rem', color: 'var(--text2)', marginTop: '0.25rem' }}>{m.notes}</div>}
                </div>
              ))}
            </Section>

            {!showMarriageForm ? (
              <button className="btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowMarriageForm(true)}>
                + Ajouter un mariage
              </button>
            ) : (
              <div style={{ marginTop: '1rem' }}>
                <MarriageForm personId={id} onAdded={() => { setShowMarriageForm(false); load() }} />
                <button className="btn-ghost" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setShowMarriageForm(false)}>Annuler</button>
              </div>
            )}
          </div>

          {/* Attachments */}
          <div className="card">
            <AttachmentList personId={id} />
          </div>
        </div>

        <div>
          {/* Parents */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <Section title={`Parents (${person.parents.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {person.parents.map((p) => <RelativeChip key={p.id} person={p} />)}
              </div>
            </Section>
            {!showParentForm ? (
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowParentForm(true)}>+ Lier un parent</button>
            ) : (
              <form onSubmit={handleAddParent} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <select value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)} required style={{ flex: 1 }}>
                  <option value="">— Choisir —</option>
                  {allPersons.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
                <button className="btn-primary" type="submit">OK</button>
                <button className="btn-ghost" type="button" onClick={() => setShowParentForm(false)}>✕</button>
              </form>
            )}
          </div>

          {/* Enfants */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <Section title={`Enfants (${person.children.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {person.children.map((p) => <RelativeChip key={p.id} person={p} />)}
              </div>
            </Section>
            {!showChildForm ? (
              <button className="btn-ghost" style={{ width: '100%' }} onClick={() => setShowChildForm(true)}>+ Lier un enfant</button>
            ) : (
              <form onSubmit={handleAddChild} style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} required style={{ flex: 1 }}>
                  <option value="">— Choisir —</option>
                  {allPersons.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
                </select>
                <button className="btn-primary" type="submit">OK</button>
                <button className="btn-ghost" type="button" onClick={() => setShowChildForm(false)}>✕</button>
              </form>
            )}
          </div>

          {/* Frères et sœurs */}
          {person.siblings.length > 0 && (
            <div className="card">
              <Section title={`Frères & Sœurs (${person.siblings.length})`}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {person.siblings.map((p) => <RelativeChip key={p.id} person={p} />)}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
