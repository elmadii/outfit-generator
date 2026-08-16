import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { storage } from './lib/storage'
import Nav from './components/Nav'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import ClosetPage from './pages/ClosetPage'
import GeneratePage from './pages/GeneratePage'
import ArcadePage from './pages/ArcadePage'
import SavedPage from './pages/SavedPage'

export default function App() {
  // Apply stored theme on first mount
  useEffect(() => {
    const theme = storage.getTheme()
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  return (
    <div className="max-w-lg mx-auto min-h-dvh relative">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/closet" element={<ClosetPage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/arcade" element={<ArcadePage />} />
        <Route path="/saved" element={<SavedPage />} />
      </Routes>
      <Nav />
    </div>
  )
}
