import { useEffect, useState } from 'react'
import { tree as treeApi } from '../api/client'
import FamilyTree from '../components/FamilyTree'
import FamilyTreeClassic from '../components/FamilyTreeClassic'

const VIEWS = [
  { key: 'classic', label: '🌳 Arbre classique' },
  { key: 'nodes',   label: '⬤  Noeuds' },
]

export default function TreePage() {
  const [data, setData]   = useState(null)
  const [error, setError] = useState(null)
  const [view, setView]   = useState('classic')   // default = classic

  useEffect(() => {
    treeApi.get()
      .then(r => setData(r.data))
      .catch(() => setError("Impossible de charger l'arbre. L'API est-elle démarrée ?"))
  }, [])

  if (error) return <div className="empty" style={{ color: '#ef4444' }}>{error}</div>
  if (!data)  return <div className="spinner">Chargement de l'arbre...</div>

  if (!data.nodes.length) {
    return (
      <div className="empty">
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🌳</div>
        <p>L'arbre est vide. Commencez par <a href="/persons/new">ajouter une personne</a>.</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 56px)', position: 'relative' }}>

      {/* Toggle bar */}
      <div style={{
        position: 'absolute', top: '1rem', right: '1rem', zIndex: 10,
        display: 'flex', gap: '0.25rem',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '0.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              background: view === v.key ? 'var(--accent)' : 'transparent',
              color: view === v.key ? '#fff' : 'var(--text2)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Stats badge */}
      <div style={{
        position: 'absolute', top: '1rem', left: '1rem', zIndex: 10,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: '8px', padding: '0.6rem 0.9rem', fontSize: '0.8rem',
        color: 'var(--text2)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}>
        <b style={{ color: 'var(--text)' }}>{data.nodes.length}</b> personnes ·{' '}
        <b style={{ color: 'var(--text)' }}>{data.marriages.length}</b> mariages ·{' '}
        <b style={{ color: 'var(--text)' }}>{data.parent_child.length}</b> liens
        {view === 'classic' && (
          <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.8rem', fontSize: '0.75rem' }}>
            <span style={{ color: '#3b82f6' }}>■ Homme</span>
            <span style={{ color: '#ec4899' }}>■ Femme</span>
            <span style={{ color: '#e91e8c' }}>-- Mariage</span>
          </div>
        )}
        {view === 'nodes' && (
          <div style={{ marginTop: '0.3rem', display: 'flex', gap: '0.8rem', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--male)' }}>— parent</span>
            <span style={{ color: 'var(--accent2)' }}>-- mariage</span>
          </div>
        )}
      </div>

      {/* Tree */}
      {view === 'classic'
        ? <FamilyTreeClassic data={data} />
        : <FamilyTree data={data} />
      }
    </div>
  )
}
