import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './routes/Home.jsx'
import Orders from './routes/Orders.jsx'
import Carriers from './routes/Carriers.jsx'
import Tracking from './routes/Tracking.jsx'
import Users from './routes/Users.jsx'
import ShipmentsRoute from './routes/shipments/ShipmentsRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/orders" element={<Orders />} />
      <Route path="/carriers" element={<Carriers />} />
      <Route path="/shipments/*" element={<ShipmentsRoute />} />
      <Route path="/tracking" element={<Tracking />} />
      <Route path="/users" element={<Users />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
