import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { TranscriptionDetail } from './pages/TranscriptionDetail'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:projectId" element={<TranscriptionDetail />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
