import { useState } from 'react'

const EMPTY = {
  first_name: '', last_name: '', gender: '',
  birth_date: '', death_date: '', birth_place: '',
  profession: '', bio: '',
}

// "1965-01-01" stored for year-only → display as "1965"
const fmtForInput = (d) => {
  if (!d) return ''
  const s = d.split('T')[0]
  return s.endsWith('-01-01') ? s.slice(0, 4) : s
}

// Accept "1965" → "1965-01-01", "1965-06" → "1965-06-01", or full ISO
const normalizeDate = (val) => {
  if (!val) return null
  const v = val.trim()
  if (/^\d{4}$/.test(v)) return `${v}-01-01`
  if (/^\d{4}-\d{2}$/.test(v)) return `${v}-01`
  return v || null
}

export default function PersonForm({ initial = {}, onSubmit, loading, suggestions = {} }) {
  const initFormatted = {
    ...EMPTY,
    ...initial,
    birth_date: fmtForInput(initial.birth_date),
    death_date: fmtForInput(initial.death_date),
  }
  const [form, setForm] = useState(initFormatted)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    const data = { ...form }
    data.birth_date = normalizeDate(data.birth_date)
    data.death_date = normalizeDate(data.death_date)
    Object.keys(data).forEach((k) => { if (data[k] === '' || data[k] === null) data[k] = null })
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid2">
        <div className="form-group">
          <label>Prénom *</label>
          <input value={form.first_name} onChange={set('first_name')} required />
        </div>
        <div className="form-group">
          <label>Nom de famille *</label>
          <input list="dl-lastnames" value={form.last_name} onChange={set('last_name')} required />
          <datalist id="dl-lastnames">
            {(suggestions.lastNames || []).map(n => <option key={n} value={n} />)}
          </datalist>
        </div>
      </div>

      <div className="grid2">
        <div className="form-group">
          <label>Genre</label>
          <select value={form.gender} onChange={set('gender')}>
            <option value="">— Sélectionner —</option>
            <option value="male">Homme</option>
            <option value="female">Femme</option>
            <option value="other">Autre</option>
          </select>
        </div>
        <div className="form-group">
          <label>Lieu de naissance</label>
          <input list="dl-birthplaces" value={form.birth_place} onChange={set('birth_place')} placeholder="ex: Ghomrassen, Tataouine" />
          <datalist id="dl-birthplaces">
            {(suggestions.birthPlaces || []).map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
      </div>

      <div className="grid2">
        <div className="form-group">
          <label>Date de naissance</label>
          <input
            type="text"
            value={form.birth_date}
            onChange={set('birth_date')}
            placeholder="AAAA ou AAAA-MM-JJ"
            pattern="(\d{4}(-\d{2}(-\d{2})?)?)?"
          />
        </div>
        <div className="form-group">
          <label>Date de décès</label>
          <input
            type="text"
            value={form.death_date}
            onChange={set('death_date')}
            placeholder="AAAA ou AAAA-MM-JJ"
            pattern="(\d{4}(-\d{2}(-\d{2})?)?)?"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Profession / Métier</label>
        <input value={form.profession} onChange={set('profession')} placeholder="ex: Agriculteur, Enseignant, Médecin..." />
      </div>

      <div className="form-group">
        <label>Biographie</label>
        <textarea value={form.bio} onChange={set('bio')} rows={4} placeholder="Notes, anecdotes, histoire personnelle..." />
      </div>

      <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '0.75rem' }}>
        {loading ? 'Enregistrement...' : 'Enregistrer'}
      </button>
    </form>
  )
}
