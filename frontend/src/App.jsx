import { Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import AdminDashboard from './pages/AdminDashboard';
import HeadDashboard from './pages/HeadDashboard';
import LabHeadDashboard from './pages/LabHeadDashboard';
import AssistantDashboard from './pages/AssistantDashboard';
import Layout from './components/Layout';
import Login from './pages/Login';
import NotificationsPage from './pages/NotificationsPage';
import BugReportPage from './pages/BugReportPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div className="flex-center" style={{height:'100vh'}}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <Layout>{children}</Layout>;
};

function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          !user ? <Navigate to="/login" replace /> :
          user.role === 'ADMIN' ? <Navigate to="/admin" replace /> :
          user.role === 'LAB_HEAD' ? <Navigate to="/lab-head" replace /> :
          user.role === 'HEAD' ? <Navigate to="/head" replace /> :
          <Navigate to="/assistant" replace />
        } 
      />
      
      {/* Admin Routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Lab Head Routes */}
      <Route path="/lab-head/*" element={
        <ProtectedRoute allowedRoles={['LAB_HEAD']}>
          <LabHeadDashboard />
        </ProtectedRoute>
      } />

      {/* Head Routes */}
      <Route path="/head/*" element={
        <ProtectedRoute allowedRoles={['HEAD']}>
          <HeadDashboard />
        </ProtectedRoute>
      } />

      {/* Assistant Routes */}
      <Route path="/assistant/*" element={
        <ProtectedRoute allowedRoles={['ASSISTANT']}>
          <AssistantDashboard />
        </ProtectedRoute>
      } />

      {/* Notifications — all roles */}
      <Route path="/notifications" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'LAB_HEAD', 'HEAD', 'ASSISTANT']}>
          <NotificationsPage />
        </ProtectedRoute>
      } />

      {/* Bug Reports — all roles */}
      <Route path="/report-bug" element={
        <ProtectedRoute allowedRoles={['ADMIN', 'LAB_HEAD', 'HEAD', 'ASSISTANT']}>
          <BugReportPage />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
