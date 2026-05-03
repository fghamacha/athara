import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import TreePage from './pages/TreePage'
import PeoplePage from './pages/PeoplePage'
import PersonDetailPage from './pages/PersonDetailPage'
import PersonFormPage from './pages/PersonFormPage'

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<TreePage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/persons/new" element={<PersonFormPage />} />
        <Route path="/persons/:id" element={<PersonDetailPage />} />
        <Route path="/persons/:id/edit" element={<PersonFormPage />} />
      </Routes>
    </>
  )
}
