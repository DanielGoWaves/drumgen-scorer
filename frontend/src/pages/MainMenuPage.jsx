import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function MainMenuPage() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <div className="grid" style={{ maxWidth: '700px', margin: '60px auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <h1 style={{ fontSize: '30px', fontWeight: '700', marginBottom: '10px' }}>DrumGen Scorer</h1>
          <p className="text-secondary" style={{ marginBottom: '28px' }}>
            Choose the testing flow you want to run.
          </p>

          <div style={{ display: 'grid', gap: '14px' }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/llm/test')}
              style={{ justifyContent: 'center', padding: '14px 20px', fontSize: '16px' }}
            >
              LLM Testing
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/model/test')}
              style={{ justifyContent: 'center', padding: '14px 20px', fontSize: '16px' }}
            >
              Model Testing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

