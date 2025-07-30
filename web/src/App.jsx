import { Routes, Route, Link } from "react-router-dom"
import Campaigns from "./pages/Campaigns"

function App() {
  return (
    <div className="p-6">
      {/* NAVBAR */}
      <nav className="mb-6 flex gap-4">
        <Link to="/" className="text-blue-600 underline">🏠 Home</Link>
        <Link to="/campaigns" className="text-blue-600 underline">🎯 Signature Campaigns</Link>
      </nav>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<h1 className="text-3xl font-bold">Welcome to Bitcointalk Dashboard</h1>} />
        <Route path="/campaigns" element={<Campaigns />} />
      </Routes>
    </div>
  )
}

export default App
