import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import TestingPage from './pages/TestingPage';
import DashboardPage from './pages/DashboardPage';
import ResultsPage from './pages/ResultsPage';
import PromptsPage from './pages/PromptsPage';
import LoadingOverlay from './components/LoadingOverlay';
import './styles/theme.css';

const Layout = ({ children, setOverlayLoading, overlayLoading }) => {
  const location = useLocation();
  
  return (
    <div className="container">
      <div className="header" style={{ zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            DrumGen Scorer
          </h1>
          {/* DEV_BADGE_START */}
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '700',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}>
            DEV
          </div>
          {/* DEV_BADGE_END */}
        </div>
        <nav className="nav" style={{ zIndex: 1 }}>
          <Link 
            to="/test" 
            className={`nav-link ${location.pathname === '/test' ? 'active' : ''}`}
          >
            Testing
          </Link>
          <Link 
            to="/dashboard" 
            className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/results" 
            className={`nav-link ${location.pathname === '/results' ? 'active' : ''}`}
          >
            Results
          </Link>
          <Link 
            to="/prompts" 
            className={`nav-link ${location.pathname === '/prompts' ? 'active' : ''}`}
          >
            Prompts
          </Link>
        </nav>
      </div>
      {/* Full-screen overlay for page-level loading (results/prompts) */}
      <LoadingOverlay key={location.pathname} isLoading={overlayLoading} />
      <main>{children}</main>
    </div>
  );
};

export default function App() {
  const [overlayLoading, setOverlayLoading] = useState(false);

  return (
    <Router>
      <Layout overlayLoading={overlayLoading} setOverlayLoading={setOverlayLoading}>
        <Routes>
          <Route path="/test" element={<TestingPage setOverlayLoading={setOverlayLoading} />} />
          <Route path="/dashboard" element={<DashboardPage setOverlayLoading={setOverlayLoading} />} />
          <Route path="/results" element={<ResultsPage setOverlayLoading={setOverlayLoading} />} />
          <Route path="/prompts" element={<PromptsPage setOverlayLoading={setOverlayLoading} />} />
          <Route path="*" element={<Navigate to="/test" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

