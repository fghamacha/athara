import { useState, useEffect } from 'react'
import { persons as personsApi, marriages as marriagesApi } from '../api/client'

export default function MarriageForm({ personId, onAdded }) {
  const [all, setAll] = useState([])
  const [form, setForm] = useState({ spouse2_id: '', start_date: '', end_date: '', end_reason: '', notes: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    personsApi.list().then((r) => setAll(r.data.filter((p) => p.id !== personId)))
  }, [personId])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = { spouse1_id: personId, ...form }
      Object.keys(data).forEach((k) => { if (data[k] === '') data[k] = null })
      await marriagesApi.create(data)
      onAdded()
      setForm({ spouse2_id: '', start_date: '', end_date: '', end_reason: '', notes: '' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div className="form-group">
        <label>Conjoint(e) *</label>
        <select value={form.spouse2_id} onChange={set('spouse2_id')} required>
          <option value="">— Choisir une personne —</option>
          {all.map((p) => (
            <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
          ))}
        </select>
      </div>
      <div className="grid2">
        <div className="form-group">
          <label>Date du mariage</label>
          <input type="date" value={form.start_date} onChange={set('start_date')} />
        </div>
        <div className="form-group">
          <label>Date de fin</label>
          <input type="date" value={form.end_date} onChange={set('end_date')} />
        </div>
      </div>
      <div className="form-group">
        <label>Raison de fin</label>
        <select value={form.end_reason} onChange={set('end_reason')}>
          <option value="">— En cours —</option>
          <option value="death">Décès du conjoint</option>
          <option value="divorce">Divorce</option>
          <option value="separation">Séparation</option>
        </select>
      </div>
      <div className="form-group">
        <label>Notes</label>
        <input value={form.notes} onChange={set('notes')} placeholder="Optionnel" />
      </div>
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? 'Enregistrement...' : 'Ajouter le mariage'}
      </button>
    </form>
  )
}
