import React, { useState, useEffect, lazy, Suspense } from 'react';
import { getToken, setToken, clearToken, getStoredUser, apiFetch } from './auth';
import LoginScreen from './components/LoginScreen';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Matters = lazy(() => import('./pages/Matters'));
const MatterDetail = lazy(() => import('./pages/MatterDetail'));
const Clients = lazy(() => import('./pages/Clients'));
const TimeEntry = lazy(() => import('./pages/TimeEntry'));
const Billing = lazy(() => import('./pages/Billing'));
const TrustAccounting = lazy(() => import('./pages/TrustAccounting'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Settings = lazy(() => import('./pages/Settings'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Utilization = lazy(() => import('./pages/Utilization'));

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-law-600"></div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [authReady, setAuthReady] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);

  useEffect(() => {
    const stored = getStoredUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
    }
    setAuthReady(true);
  }, []);

  function handleLogin(userData, token) {
    setToken(token, userData);
    setUser(userData);
  }

  function handleLogout() {
    clearToken();
    setUser(null);
    setPage('dashboard');
  }

  function navigateTo(pg, data) {
    setPage(pg);
    if (data?.matterId) setSelectedMatter(data.matterId);
    if (data?.clientId) setSelectedClient(data.clientId);
  }

  if (!authReady) return <LoadingSpinner />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <ErrorBoundary>
      <Layout activePage={page} onNavigate={navigateTo} user={user} onLogout={handleLogout}>
        <Suspense fallback={<LoadingSpinner />}>
          {page === 'dashboard' && <Dashboard onNavigate={navigateTo} />}
          {page === 'matters' && <Matters onNavigate={navigateTo} />}
          {page === 'matter-detail' && <MatterDetail matterId={selectedMatter} onNavigate={navigateTo} />}
          {page === 'clients' && <Clients onNavigate={navigateTo} />}
          {page === 'time-entry' && <TimeEntry onNavigate={navigateTo} selectedMatter={selectedMatter} />}
          {page === 'billing' && <Billing onNavigate={navigateTo} />}
          {page === 'trust' && <TrustAccounting onNavigate={navigateTo} />}
          {page === 'calendar' && <Calendar onNavigate={navigateTo} />}
          {page === 'utilization' && <Utilization onNavigate={navigateTo} />}
          {page === 'integrations' && <Integrations />}
          {page === 'settings' && <Settings />}
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}
