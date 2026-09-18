import { Navigate, Route, Routes } from 'react-router-dom'
import { Overview } from './pages/Overview'
import { Detail } from './pages/Detail'

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/instruments/:contractCode" element={<Detail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
