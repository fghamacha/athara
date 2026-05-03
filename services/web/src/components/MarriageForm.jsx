import { useState, useEffect } from 'react'
import { persons as personsApi, marriages as marriagesApi } from '../api/client'

// Accept "1965" → "1965-01-01", "1965-06" → "1965-06-01", full ISO, or null
const normalizeDate = (val) => {
  if (!val) return null
  const v = val.trim()
  if (/^\d{4}$/.test(v)) return `${v}-01-01`
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`
  return v || null
}

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
      data.start_date = normalizeDate(data.start_date)
      data.end_date   = normalizeDate(data.end_date)
      Object.keys(data).forEach((k) => { if (data[k] === '' || data[k] === null) data[k] = null })
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
          <input
            type="text" value={form.start_date} onChange={set('start_date')}
            placeholder="AAAA ou AAAA-MM-JJ"
            pattern="(\d{4}(-\d{2}(-\d{2})?)?)?"
          />
        </div>
        <div className="form-group">
          <label>Date de fin</label>
          <input
            type="text" value={form.end_date} onChange={set('end_date')}
            placeholder="AAAA ou AAAA-MM-JJ"
            pattern="(\d{4}(-\d{2}(-\d{2})?)?)?"
          />
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
