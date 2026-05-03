import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Collections → trailing slash  (route définie comme GET "/")
// Items       → sans slash final (route définie comme GET "/{id}")
export const persons = {
  list: (search) => api.get('/persons/', { params: search ? { search } : {} }),
  get: (id) => api.get(`/persons/${id}`),
  create: (data) => api.post('/persons/', data),
  update: (id, data) => api.put(`/persons/${id}`, data),
  delete: (id) => api.delete(`/persons/${id}`),
  uploadPhoto: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post(`/persons/${id}/photo`, form)
  },
  ancestors: (id) => api.get(`/persons/${id}/ancestors`),
  descendants: (id) => api.get(`/persons/${id}/descendants`),
}

export const marriages = {
  create: (data) => api.post('/marriages/', data),
  update: (id, data) => api.put(`/marriages/${id}`, data),
  delete: (id) => api.delete(`/marriages/${id}`),
}

export const relationships = {
  create: (data) => api.post('/relationships/', data),
  delete: (id) => api.delete(`/relationships/${id}`),
}

export const attachments = {
  list: (personId) => api.get(`/attachments/${personId}`),
  upload: (personId, file, description) => {
    const form = new FormData()
    form.append('file', file)
    if (description) form.append('description', description)
    return api.post(`/attachments/${personId}`, form)
  },
  getUrl: (personId, attachmentId) => api.get(`/attachments/${personId}/${attachmentId}/url`),
  delete: (personId, attachmentId) => api.delete(`/attachments/${personId}/${attachmentId}`),
}

export const tree = {
  get: () => api.get('/tree/'),
}
