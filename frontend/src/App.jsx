import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';  // ✅ Main Dashboard
import CustomerDashboard from './pages/Customer/CustomerDashboard';
import AgentDashboard from './pages/Agent/AgentDashboard';
import AgentPortal from './pages/Agent/AgentPortal';
import WorkerDashboard from './pages/Worker/WorkerDashboard';
import WorkerPortal from './pages/Worker/WorkerPortal';
import AdminPortal from './pages/Admin/AdminPortal';
import TicketDetail from './pages/TicketDetail';
import CreateTicket from './pages/CreateTicket';
import MyTickets from './pages/Customer/MyTickets';
import WorkerAssignment from './pages/Agent/WorkerAssignment';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="min-h-screen bg-gray-100">
          {/* ✅ Navbar - Auto hidden on login/register */}
          <Navbar />
          
          <div className="container mx-auto px-4 py-6">
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* ✅ MAIN DASHBOARD - Default route after login */}
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />  {/* ← Yeh main dashboard hai */}
                </ProtectedRoute>
              } />
              
              {/* Customer Routes */}
              <Route path="/customer/dashboard" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/my-tickets" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <MyTickets />
                </ProtectedRoute>
              } />
              <Route path="/create-ticket" element={
                <ProtectedRoute allowedRoles={['customer']}>
                  <CreateTicket />
                </ProtectedRoute>
              } />
              
              {/* Agent Routes */}
              <Route path="/agent/dashboard" element={
                <ProtectedRoute allowedRoles={['agent', 'admin']}>
                  <AgentPortal />
                </ProtectedRoute>
              } />
              <Route path="/agent/portal" element={
                <ProtectedRoute allowedRoles={['agent', 'admin']}>
                  <AgentPortal />
                </ProtectedRoute>
              } />
              <Route path="/agent/assign/:id" element={
                <ProtectedRoute allowedRoles={['agent', 'admin']}>
                  <WorkerAssignment />
                </ProtectedRoute>
              } />
              
              {/* Worker Routes */}
              <Route path="/worker/dashboard" element={
                <ProtectedRoute allowedRoles={['worker']}>
                  <WorkerPortal />
                </ProtectedRoute>
              } />
              <Route path="/worker/portal" element={
                <ProtectedRoute allowedRoles={['worker']}>
                  <WorkerPortal />
                </ProtectedRoute>
              } />
              
              {/* Admin Routes */}
              <Route path="/admin/dashboard" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminPortal />
                </ProtectedRoute>
              } />
              
              {/* Shared Ticket Detail */}
              <Route path="/ticket/:id" element={
                <ProtectedRoute>
                  <TicketDetail />
                </ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;