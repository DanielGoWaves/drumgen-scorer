import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import TestingPage from './pages/TestingPage';
import DashboardPage from './pages/DashboardPage';
import ResultsPage from './pages/ResultsPage';
import PromptsPage from './pages/PromptsPage';
import LLMFailuresPage from './pages/LLMFailuresPage';
import LoadingOverlay from './components/LoadingOverlay';
import './styles/theme.css';

const Layout = ({ children, setOverlayLoading, overlayLoading }) => {
  const location = useLocation();
  
  return (
    <div className="container">
      <div className="header" style={{ zIndex: 10 }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', zIndex: 1 }}>
          DrumGen Scorer
        </h1>
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
            to="/llm-failures" 
            className={`nav-link ${location.pathname === '/llm-failures' ? 'active' : ''}`}
          >
            LLM Failures
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
          <Route path="/llm-failures" element={<LLMFailuresPage />} />
          <Route path="*" element={<Navigate to="/test" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

