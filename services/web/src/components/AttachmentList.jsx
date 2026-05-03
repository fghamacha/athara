import { useState, useEffect } from 'react'
import { attachments as api } from '../api/client'

const icons = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️', 'image/png': '🖼️', 'image/webp': '🖼️',
  'audio/mpeg': '🎵', 'audio/wav': '🎵',
  'video/mp4': '🎬',
}
const icon = (type) => icons[type] ?? '📎'

function fmt(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

export default function AttachmentList({ personId }) {
  const [list, setList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [desc, setDesc] = useState('')

  useEffect(() => {
    api.list(personId).then((r) => setList(r.data))
  }, [personId])

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const r = await api.upload(personId, file, desc || undefined)
      setList((l) => [r.data, ...l])
      setDesc('')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDownload = async (a) => {
    const r = await api.getUrl(personId, a.id)
    window.open(r.data.url, '_blank')
  }

  const handleDelete = async (a) => {
    if (!confirm(`Supprimer "${a.file_name}" ?`)) return
    await api.delete(personId, a.id)
    setList((l) => l.filter((x) => x.id !== a.id))
  }

  return (
    <div>
      <div className="section-title">Pièces jointes ({list.length})</div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Description (optionnel)"
          style={{ flex: 1, minWidth: 200 }}
        />
        <label className="btn-ghost" style={{ cursor: 'pointer', padding: '0.5rem 1rem' }}>
          {uploading ? 'Envoi...' : '+ Joindre un fichier'}
          <input type="file" hidden onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      {list.length === 0 && (
        <p style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>Aucune pièce jointe.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {list.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'var(--bg3)', borderRadius: '8px', padding: '0.6rem 0.8rem',
              border: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>{icon(a.file_type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {a.file_name}
              </div>
              {a.description && <div style={{ fontSize: '0.75rem', color: 'var(--text2)' }}>{a.description}</div>}
              <div style={{ fontSize: '0.7rem', color: 'var(--text2)' }}>
                {fmt(a.file_size)} · {new Date(a.created_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <button className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDownload(a)}>↓</button>
            <button className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDelete(a)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
