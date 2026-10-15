import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/layout/Sidebar';
import TopHeader from './components/layout/TopHeader';
import EmergencyModal from './components/layout/EmergencyModal';
import ChatbotWidget from './components/chat/ChatbotWidget';
import { Spinner } from './components/common/PageHeader';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MoodTrackingPage from './pages/MoodTrackingPage';
import SelfHelpToolsPage from './pages/SelfHelpToolsPage';
import CounsellingPage from './pages/CounsellingPage';
import ResourcesPage from './pages/ResourcesPage';
import AwarenessPage from './pages/AwarenessPage';
import EmergencyPage from './pages/EmergencyPage';
import PrivacyPage from './pages/PrivacyPage';
import CommunityPage from './pages/CommunityPage';
import RewardsPage from './pages/RewardsPage';
import AdminDashboard from './pages/admin/AdminDashboard';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function AppLayout({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:bg-white focus:p-3 focus:rounded-lg">Skip to content</a>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader onMenu={() => setNavOpen(true)} onHelp={() => setHelpOpen(true)} />
        <main id="main" key={pathname} className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto w-full pb-24">{children}</div>
        </main>
      </div>
      <ChatbotWidget />
      <EmergencyModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}

const P = (el, adminOnly) => <ProtectedRoute adminOnly={adminOnly}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="bottom-center" toastOptions={{ style: { background: '#1d2b36', color: '#fff', borderRadius: '12px', fontSize: '14px' } }} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

          <Route path="/dashboard" element={P(<DashboardPage />)} />
          <Route path="/mood" element={P(<MoodTrackingPage />)} />
          <Route path="/tools" element={P(<SelfHelpToolsPage />)} />
          <Route path="/rewards" element={P(<RewardsPage />)} />
          <Route path="/awareness" element={P(<AwarenessPage />)} />
          <Route path="/resources" element={P(<ResourcesPage />)} />
          <Route path="/community" element={P(<CommunityPage />)} />
          <Route path="/counselling" element={P(<CounsellingPage />)} />
          <Route path="/emergency" element={P(<EmergencyPage />)} />
          <Route path="/privacy" element={P(<PrivacyPage />)} />
          <Route path="/admin" element={P(<AdminDashboard />, true)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
