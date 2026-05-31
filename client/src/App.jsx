import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { setTokenResolver } from './utils/api';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardHome from './pages/Dashboard/DashboardHome';
import MenuManager from './pages/Dashboard/MenuManager';
import QrGenerator from './pages/Dashboard/QrGenerator';
import Settings from './pages/Dashboard/Settings';
import CustomerMenu from './pages/CustomerMenu';
import LiveDashboard from './pages/Dashboard/LiveDashboard';
import OrdersTracker from './pages/Dashboard/OrdersTracker';

const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk Token Resolver component to set active session token
function ClerkTokenResolver() {
  const { getToken } = useAuth();
  useEffect(() => {
    setTokenResolver(getToken);
  }, [getToken]);
  return null;
}

// Protected Route Wrapper
function ClerkProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div style={{ display: 'flex', height: '100vh', flexDirection: 'column', gap: '16px', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-dark)', color: 'var(--text-dark-primary)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></div>
        <p style={{ fontSize: '14px', color: 'var(--text-dark-secondary)' }}>Loading Session...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function LocalProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

const ProtectedRoute = isClerkEnabled ? ClerkProtectedRoute : LocalProtectedRoute;

// Dashboard Layout wrapper to include the Sidebar
function DashboardLayout() {
  return (
    <div className="dashboard-container">
      <Navbar />
      <main className="dashboard-content">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="menu" element={<MenuManager />} />
          <Route path="qr" element={<QrGenerator />} />
          <Route path="settings" element={<Settings />} />
          <Route path="live" element={<LiveDashboard />} />
          <Route path="orders" element={<OrdersTracker />} />
        </Routes>
      </main>

      <style>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background-color: var(--bg-dark);
          color: var(--text-dark-primary);
        }
        
        .dashboard-content {
          margin-left: 260px; /* Width of navbar */
          flex-grow: 1;
          padding: 40px;
          overflow-x: hidden;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            flex-direction: column;
          }
          .dashboard-content {
            margin-left: 0;
            padding: 20px;
            margin-top: 60px;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {isClerkEnabled && <ClerkTokenResolver />}
      <Routes>
        {/* Public Landing Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Public Customer Scan Menu */}
        <Route path="/menu/:slug" element={<CustomerMenu />} />

        {/* Protected Admin Dashboards */}
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
