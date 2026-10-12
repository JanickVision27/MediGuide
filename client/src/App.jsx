import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Layout from './components/layout/Layout.jsx'
import Home from './pages/Home.jsx'
import Profile from './pages/Profile.jsx'
import Prescriptions from './pages/Prescriptions.jsx'
import Appointments from './pages/Appointments.jsx'
import ChatUI from './pages/ChatUI.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'

/**
 * Application router.
 *
 * Every route is nested under <Layout />, which owns the persistent sidebar and
 * renders the matched page through its <Outlet />. That means the navigation is
 * always on screen, on every page.
 *
 * Want a full-bleed page with no sidebar (e.g. a public marketing landing
 * page)? Add it as a sibling of the <Layout /> route:
 *
 *   <Route path="/welcome" element={<Home />} />
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="profile" element={<Profile />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="chat" element={<ChatUI />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />

          {/* Unknown URL -> send the user home instead of showing a blank screen */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
