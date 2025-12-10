import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import TestingPage from './pages/TestingPage';
import DashboardPage from './pages/DashboardPage';
import ResultsPage from './pages/ResultsPage';
import PromptsPage from './pages/PromptsPage';
import './styles/theme.css';

const Layout = ({ children }) => {
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
            to="/prompts" 
            className={`nav-link ${location.pathname === '/prompts' ? 'active' : ''}`}
          >
            Prompts
          </Link>
        </nav>
      </div>
      <main>{children}</main>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/test" element={<TestingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="*" element={<Navigate to="/test" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

