import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { persons as api } from '../api/client'
import PersonForm from '../components/PersonForm'

export default function PersonFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id && id !== 'new'
  const [initial, setInitial] = useState(null)
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)

  useEffect(() => {
    if (isEdit) {
      api.get(id).then((r) => setInitial(r.data))
    } else {
      setInitial({})
    }
  }, [id, isEdit])

  const handleSubmit = async (data) => {
    setLoading(true)
    try {
      let person
      if (isEdit) {
        person = (await api.update(id, data)).data
      } else {
        person = (await api.create(data)).data
      }
      if (photoFile) {
        await api.uploadPhoto(person.id, photoFile)
      }
      navigate(`/persons/${person.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: '640px' }}>
      <div className="page-header">
        <h1 className="page-title">{isEdit ? 'Modifier la personne' : 'Ajouter une personne'}</h1>
        <button className="btn-ghost" onClick={() => navigate(-1)}>← Retour</button>
      </div>

      <div className="card">
        <div className="form-group">
          <label>Photo de profil</label>
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files[0])} />
          {photoFile && (
            <img
              src={URL.createObjectURL(photoFile)}
              alt="preview"
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', marginTop: '0.5rem' }}
            />
          )}
        </div>
        <hr className="divider" />
        {initial === null
          ? <div className="spinner">Chargement...</div>
          : <PersonForm key={id || 'new'} initial={initial} onSubmit={handleSubmit} loading={loading} />
        }
      </div>
    </div>
  )
}
