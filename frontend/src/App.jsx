import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import TestingPage from './pages/TestingPage';
import DashboardPage from './pages/DashboardPage';
import ResultsPage from './pages/ResultsPage';
import PromptsPage from './pages/PromptsPage';
import LLMFailuresPage from './pages/LLMFailuresPage';
import MainMenuPage from './pages/MainMenuPage';
import ModelTestingPage from './pages/ModelTestingPage';
import ModelTestingDashboardPage from './pages/ModelTestingDashboardPage';
import ModelTestingResultsPage from './pages/ModelTestingResultsPage';
import LoadingOverlay from './components/LoadingOverlay';
import './styles/theme.css';

const SectionLayout = ({ title, navLinks, children, overlayLoading }) => {
  const location = useLocation();

  return (
    <div className="container">
      <div className="header" style={{ zIndex: 10 }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', zIndex: 1 }}>
          {title}
        </h1>
        <nav className="nav" style={{ zIndex: 1 }}>
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${location.pathname.startsWith(item.activePrefix) ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <LoadingOverlay key={location.pathname} isLoading={overlayLoading} />
      <main>{children}</main>
    </div>
  );
};

export default function App() {
  const [overlayLoading, setOverlayLoading] = useState(false);

  const llmLinks = [
    { to: '/llm/test', label: 'Testing', activePrefix: '/llm/test' },
    { to: '/llm/dashboard', label: 'Dashboard', activePrefix: '/llm/dashboard' },
    { to: '/llm/results', label: 'Results', activePrefix: '/llm/results' },
    { to: '/llm/llm-failures', label: 'LLM Failures', activePrefix: '/llm/llm-failures' },
    { to: '/llm/prompts', label: 'Prompts', activePrefix: '/llm/prompts' },
    { to: '/', label: 'Main Menu', activePrefix: '/__never__' },
  ];

  const modelLinks = [
    { to: '/model/test', label: 'Model Testing', activePrefix: '/model/test' },
    { to: '/model/dashboard', label: 'Dashboard', activePrefix: '/model/dashboard' },
    { to: '/model/results', label: 'Results', activePrefix: '/model/results' },
    { to: '/', label: 'Main Menu', activePrefix: '/__never__' },
  ];

  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainMenuPage />} />

        <Route
          path="/llm/*"
          element={(
            <SectionLayout title="DrumGen Scorer - LLM Testing" navLinks={llmLinks} overlayLoading={overlayLoading}>
              <Routes>
                <Route path="test" element={<TestingPage setOverlayLoading={setOverlayLoading} />} />
                <Route path="dashboard" element={<DashboardPage setOverlayLoading={setOverlayLoading} />} />
                <Route path="results" element={<ResultsPage setOverlayLoading={setOverlayLoading} />} />
                <Route path="prompts" element={<PromptsPage setOverlayLoading={setOverlayLoading} />} />
                <Route path="llm-failures" element={<LLMFailuresPage />} />
                <Route path="*" element={<Navigate to="/llm/test" replace />} />
              </Routes>
            </SectionLayout>
          )}
        />

        <Route
          path="/model/*"
          element={(
            <SectionLayout title="DrumGen Scorer - Model Testing" navLinks={modelLinks} overlayLoading={false}>
              <Routes>
                <Route path="test" element={<ModelTestingPage />} />
                <Route path="dashboard" element={<ModelTestingDashboardPage />} />
                <Route path="results" element={<ModelTestingResultsPage />} />
                <Route path="*" element={<Navigate to="/model/test" replace />} />
              </Routes>
            </SectionLayout>
          )}
        />

        <Route path="/test" element={<Navigate to="/llm/test" replace />} />
        <Route path="/dashboard" element={<Navigate to="/llm/dashboard" replace />} />
        <Route path="/results" element={<Navigate to="/llm/results" replace />} />
        <Route path="/prompts" element={<Navigate to="/llm/prompts" replace />} />
        <Route path="/llm-failures" element={<Navigate to="/llm/llm-failures" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

