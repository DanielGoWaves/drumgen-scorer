import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import AudioPlayer from '../components/AudioPlayer';

export default function ResultsPage() {
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [prompts, setPrompts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState({ audio_quality_score: 5, llm_accuracy_score: 5, notes: '' });
  
  // Filters (initialize from navigation state if provided)
  const [drumTypeFilter, setDrumTypeFilter] = useState(location.state?.drumType || 'all');
  const [difficultyFilter, setDifficultyFilter] = useState(location.state?.difficulty ? String(location.state.difficulty) : 'all');
  const [versionFilter, setVersionFilter] = useState(location.state?.modelVersion || 'all');
  const [audioScoreFilter, setAudioScoreFilter] = useState(location.state?.audioScore ? String(location.state.audioScore) : 'all');
  const [availableDrumTypes, setAvailableDrumTypes] = useState([]);
  
  // Sorting
  const [sortColumn, setSortColumn] = useState('tested_at');
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'
  
  // Update filters when navigating to results page with state (e.g., clicking from dashboard)
  // Use location.key to detect navigation changes even when pathname stays the same
  useEffect(() => {
    const state = location.state;
    if (state) {
      // Update filters from navigation state - always update when state is present
      setDrumTypeFilter(state.drumType || 'all');
      setDifficultyFilter(state.difficulty !== undefined && state.difficulty !== null ? String(state.difficulty) : 'all');
      setVersionFilter(state.modelVersion || 'all');
      setAudioScoreFilter(state.audioScore !== undefined && state.audioScore !== null ? String(state.audioScore) : 'all');
    }
  }, [location.key, location.state]);
  
  // Load results when filters change
  useEffect(() => {
    loadResults();
  }, [drumTypeFilter, difficultyFilter, versionFilter, audioScoreFilter]);
  
  // Load drum types once on mount
  useEffect(() => {
    loadDrumTypes();
  }, []);

  const loadDrumTypes = async () => {
    try {
      const { data } = await api.get('/api/prompts/', { params: { limit: 5000 } });
      const types = [...new Set(data.map(p => p.drum_type).filter(Boolean))].sort();
      setAvailableDrumTypes(types);
    } catch (err) {
      console.error('Failed to load drum types:', err);
    }
  };

  const loadResults = async () => {
    setLoading(true);
    try {
      const params = {};
      if (drumTypeFilter !== 'all') params.drum_type = drumTypeFilter;
      if (difficultyFilter !== 'all') params.difficulty = parseInt(difficultyFilter);
      if (versionFilter !== 'all') params.model_version = versionFilter;
      if (audioScoreFilter !== 'all') params.audio_quality_score = parseInt(audioScoreFilter);
      
      const { data } = await api.get('/api/results/', { params });
      setResults(data);
      
      // Load prompts for each result
      const promptIds = [...new Set(data.map(r => r.prompt_id))];
      const promptsMap = {};
      for (const id of promptIds) {
        try {
          const { data: prompt } = await api.get(`/api/prompts/${id}`);
          promptsMap[id] = prompt;
        } catch (err) {
          console.error(`Failed to load prompt ${id}:`, err);
        }
      }
      setPrompts(promptsMap);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (result) => {
    setSelectedResult(result);
    setEditMode(false);
    setEditedScores({
      audio_quality_score: result.audio_quality_score,
      llm_accuracy_score: result.llm_accuracy_score,
      notes: result.notes || ''
    });
  };

  const closeDetail = () => {
    setSelectedResult(null);
    setEditMode(false);
  };

  const saveEdit = async () => {
    try {
      await api.put(`/api/results/${selectedResult.id}`, editedScores);
      closeDetail();
      loadResults();
    } catch (err) {
      console.error('Failed to update result:', err);
      alert('Failed to save changes');
    }
  };

  const deleteResult = async (id) => {
    if (!confirm('Are you sure you want to delete this result?')) return;
    
    try {
      await api.delete(`/api/results/${id}`);
      closeDetail();
      loadResults();
    } catch (err) {
      console.error('Failed to delete result:', err);
      alert('Failed to delete result');
    }
  };

  useEffect(() => {
    loadResults();
  }, [drumTypeFilter, difficultyFilter, versionFilter, audioScoreFilter]);

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (min/A first)
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getSortedResults = () => {
    const sorted = [...results].sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'prompt':
          aVal = prompts[a.prompt_id]?.text || '';
          bVal = prompts[b.prompt_id]?.text || '';
          break;
        case 'drum_type':
          aVal = prompts[a.prompt_id]?.drum_type || '';
          bVal = prompts[b.prompt_id]?.drum_type || '';
          break;
        case 'difficulty':
          aVal = prompts[a.prompt_id]?.difficulty || 0;
          bVal = prompts[b.prompt_id]?.difficulty || 0;
          break;
        case 'version':
          aVal = a.model_version || '';
          bVal = b.model_version || '';
          break;
        case 'audio_score':
          aVal = a.audio_quality_score;
          bVal = b.audio_quality_score;
          break;
        case 'llm_score':
          aVal = a.llm_accuracy_score;
          bVal = b.llm_accuracy_score;
          break;
        case 'tested_at':
          aVal = new Date(a.tested_at).getTime();
          bVal = new Date(b.tested_at).getTime();
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' 
          ? aVal - bVal
          : bVal - aVal;
      }
    });

    return sorted;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading && results.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <p className="text-secondary">Loading results...</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Test Results</h2>

      {/* Filters */}
      <div className="card" style={{ zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label className="label">Drum Type</label>
            <select value={drumTypeFilter} onChange={(e) => setDrumTypeFilter(e.target.value)} className="input">
              <option value="all">All</option>
              {availableDrumTypes.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)} className="input">
              <option value="all">All</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Model Version</label>
            <select value={versionFilter} onChange={(e) => setVersionFilter(e.target.value)} className="input">
              <option value="all">All</option>
              <option value="v11">V11</option>
              <option value="v12">V12</option>
              <option value="v13">V13</option>
              <option value="v14">V14</option>
            </select>
          </div>
          <div>
            <label className="label">Generation Score</label>
            <select value={audioScoreFilter} onChange={(e) => setAudioScoreFilter(e.target.value)} className="input">
              <option value="all">All</option>
              {[...Array(10)].map((_, i) => (
                <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th 
                onClick={() => handleSort('id')} 
                style={{ padding: '12px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('prompt')} 
                style={{ padding: '12px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Prompt {sortColumn === 'prompt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('drum_type')} 
                style={{ padding: '12px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Drum {sortColumn === 'drum_type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('difficulty')} 
                style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Diff {sortColumn === 'difficulty' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('version')} 
                style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Version {sortColumn === 'version' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('audio_score')} 
                style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Gen Score {sortColumn === 'audio_score' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('llm_score')} 
                style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                LLM Score {sortColumn === 'llm_score' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                onClick={() => handleSort('tested_at')} 
                style={{ padding: '12px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
              >
                Date {sortColumn === 'tested_at' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No results found. Start testing to see results here!
                </td>
              </tr>
            ) : (
              getSortedResults().map((result) => {
                const prompt = prompts[result.prompt_id];
                return (
                  <tr 
                    key={result.id}
                    onClick={() => openDetail(result)}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--secondary-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px' }}>#{result.id}</td>
                    <td style={{ padding: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prompt?.text || 'Loading...'}
                    </td>
                    <td style={{ padding: '12px' }}>{prompt?.drum_type || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{prompt?.difficulty || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', textTransform: 'uppercase' }}>{result.model_version || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: 'var(--success-color)' }}>
                      {result.audio_quality_score}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: 'var(--secondary-color)' }}>
                      {result.llm_accuracy_score}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {formatDate(result.tested_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedResult && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeDetail}
        >
          <div 
            className="card"
            style={{ 
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - fixed to modal card, outside scrollable area */}
            <button
              onClick={closeDetail}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
                zIndex: 10,
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-secondary)'}
            >
              ×
            </button>

            {/* Scrollable content area */}
            <div 
              style={{ 
                overflowY: 'auto', 
                flex: 1, 
                paddingRight: '8px'
              }}
              className="custom-scrollbar"
            >
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
                Result #{selectedResult.id}
              </h3>

              {/* Prompt Info */}
              <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Prompt:</div>
                <div style={{ fontSize: '15px' }}>{prompts[selectedResult.prompt_id]?.text}</div>
                <div style={{ marginTop: '12px', display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Drum: <strong>{prompts[selectedResult.prompt_id]?.drum_type}</strong></span>
                  <span>Difficulty: <strong>{prompts[selectedResult.prompt_id]?.difficulty}</strong></span>
                  <span>Version: <strong>{selectedResult.model_version?.toUpperCase()}</strong></span>
                </div>
              </div>

              {/* Audio Player */}
              {selectedResult.audio_id && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Audio:</div>
                  <AudioPlayer src={`${API_BASE_URL}/api/audio/${selectedResult.audio_id}`} />
                </div>
              )}

              {/* Scores */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Scores:</div>
                {editMode ? (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div>
                      <label className="label">Generation Score: {editedScores.audio_quality_score}</label>
                      <input 
                        type="range"
                        min="1"
                        max="10"
                        value={editedScores.audio_quality_score}
                        onChange={(e) => setEditedScores({...editedScores, audio_quality_score: parseInt(e.target.value)})}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="label">LLM Score: {editedScores.llm_accuracy_score}</label>
                      <input 
                        type="range"
                        min="1"
                        max="10"
                        value={editedScores.llm_accuracy_score}
                        onChange={(e) => setEditedScores({...editedScores, llm_accuracy_score: parseInt(e.target.value)})}
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label className="label">Notes:</label>
                      <textarea 
                        value={editedScores.notes}
                        onChange={(e) => setEditedScores({...editedScores, notes: e.target.value})}
                        className="input"
                        rows="3"
                        placeholder="Add notes..."
                      />
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '12px', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Generation Score</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success-color)' }}>
                        {selectedResult.audio_quality_score}/10
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>LLM Score</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--secondary-color)' }}>
                        {selectedResult.llm_accuracy_score}/10
                      </div>
                    </div>
                  </div>
                )}
                {selectedResult.notes && !editMode && (
                  <div style={{ marginTop: '12px', padding: '12px', background: 'var(--secondary-bg)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Notes:</div>
                    <div style={{ fontSize: '14px' }}>{selectedResult.notes}</div>
                  </div>
                )}
              </div>

              {/* LLM Response Text */}
              {selectedResult.llm_response && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>LLM Response:</div>
                  <div 
                    style={{ 
                      padding: '12px', 
                      background: 'var(--secondary-bg)', 
                      borderRadius: '6px',
                      fontSize: '13px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'monospace',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    {selectedResult.llm_response}
                  </div>
                </div>
              )}
            </div>

            {/* Actions - Fixed at bottom */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', flexShrink: 0 }}>
              {editMode ? (
                <>
                  <button onClick={saveEdit} className="btn btn-primary" style={{ flex: 1 }}>
                    Save Changes
                  </button>
                  <button onClick={() => setEditMode(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditMode(true)} className="btn btn-primary" style={{ flex: 1 }}>
                    Edit Scores
                  </button>
                  <button 
                    onClick={() => deleteResult(selectedResult.id)} 
                    className="btn btn-secondary"
                    style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

