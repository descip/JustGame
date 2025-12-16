import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import ToastContainer from './components/ToastContainer'
import { ProtectedRoute, RoleBasedRedirect, AdminRoute, OperatorRoute } from './components/RouteGuards'
import { queryClient } from './config/queryClient'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Machines from './pages/Machines'
import Bookings from './pages/Bookings'
import Sessions from './pages/Sessions'
import Payments from './pages/Payments'
import Users from './pages/Users'
import Reports from './pages/Reports'
import AuditLogs from './pages/AuditLogs'
import Profile from './pages/Profile'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleBasedRedirect />} />
            <Route path="profile" element={<Profile />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
            <Route path="machines" element={<AdminRoute><Machines /></AdminRoute>} />
            <Route path="sessions" element={<AdminRoute><Sessions /></AdminRoute>} />
            <Route path="payments" element={<AdminRoute><Payments /></AdminRoute>} />
            <Route path="users" element={<OperatorRoute><Users /></OperatorRoute>} />
            <Route path="reports" element={<OperatorRoute><Reports /></OperatorRoute>} />
            <Route path="audit-logs" element={<OperatorRoute><AuditLogs /></OperatorRoute>} />
          </Route>
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App


