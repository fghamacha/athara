import { useEffect, useState } from 'react'
import { persons as api } from '../api/client'
import PersonCard from '../components/PersonCard'

export default function PeoplePage() {
  const [list, setList] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setLoading(true)
      api.list(search || undefined)
        .then((r) => setList(r.data))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Personnes</h1>
        <a href="/persons/new">
          <button className="btn-primary">+ Ajouter</button>
        </a>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom..."
        style={{ marginBottom: '1.5rem', maxWidth: '400px' }}
      />

      {loading && <div className="spinner">Chargement...</div>}

      {!loading && list.length === 0 && (
        <div className="empty">
          {search ? `Aucun résultat pour "${search}"` : 'Aucune personne enregistrée.'}
        </div>
      )}

      <div className="grid2">
        {list.map((p) => <PersonCard key={p.id} person={p} />)}
      </div>
    </div>
  )
}
