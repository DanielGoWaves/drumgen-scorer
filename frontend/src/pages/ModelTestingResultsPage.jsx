import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api, { API_BASE_URL } from '../services/api';
import AudioPlayer from '../components/AudioPlayer';

const SCORE_OPTIONS = Array.from({ length: 11 }, (_, index) => index * 10);

const DRUM_LABELS = {
  bass_drum: 'Bass Drum',
  snare: 'Snare',
  low_tom: 'Low Tom',
  mid_tom: 'Mid Tom',
  high_tom: 'High Tom',
  all: 'All',
};

export default function ModelTestingResultsPage() {
  const location = useLocation();
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drumType, setDrumType] = useState(location.state?.drumType || 'all');
  const [scoreFilter, setScoreFilter] = useState(
    location.state?.audioScore !== undefined && location.state?.audioScore !== null
      ? String(location.state.audioScore * 10)
      : 'all'
  );
  const [hasNotesFilter, setHasNotesFilter] = useState(false);
  const [sortColumn, setSortColumn] = useState('tested_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [editScore, setEditScore] = useState(50);
  const [editNotes, setEditNotes] = useState('');

  const filteredResults = useMemo(() => {
    let rows = [...results];
    if (drumType !== 'all') {
      rows = rows.filter((result) => result.drum_type === drumType);
    }
    if (scoreFilter !== 'all') {
      rows = rows.filter((result) => result.score === Number(scoreFilter));
    }
    if (hasNotesFilter) {
      rows = rows.filter((result) => (result.notes || '').trim().length > 0);
    }
    return rows;
  }, [results, drumType, scoreFilter, hasNotesFilter]);

  const sortedResults = useMemo(() => {
    const rows = [...filteredResults];
    rows.sort((a, b) => {
      let aVal;
      let bVal;
      switch (sortColumn) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'drum_type':
          aVal = a.drum_type || '';
          bVal = b.drum_type || '';
          break;
        case 'source_kind':
          aVal = a.source_kind || '';
          bVal = b.source_kind || '';
          break;
        case 'score':
          aVal = a.score || 0;
          bVal = b.score || 0;
          break;
        case 'tested_at':
        default:
          aVal = new Date(a.tested_at || 0).getTime();
          bVal = new Date(b.tested_at || 0).getTime();
          break;
      }
      if (typeof aVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return rows;
  }, [filteredResults, sortColumn, sortDirection]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/model-testing/results');
      setResults(data?.results || []);
    } catch (err) {
      console.error('Failed to load model-testing results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const hasActiveFilters = () => drumType !== 'all' || scoreFilter !== 'all' || hasNotesFilter;
  const resetFilters = () => {
    setDrumType('all');
    setScoreFilter('all');
    setHasNotesFilter(false);
  };
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection(column === 'tested_at' ? 'desc' : 'asc');
    }
  };

  const openDetail = (result) => {
    setSelected(result);
    setEditScore(result.score);
    setEditNotes(result.notes || '');
  };

  const saveEdit = async () => {
    if (!selected) return;
    try {
      const { data } = await api.put(`/api/model-testing/results/${selected.id}`, {
        score: editScore,
        notes: editNotes,
      });
      setResults((prev) => prev.map((row) => (row.id === selected.id ? data : row)));
      setSelected(data);
    } catch (err) {
      alert(`Failed to update: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const deleteResult = async () => {
    if (!selected) return;
    if (!window.confirm('Delete this result?')) return;
    try {
      await api.delete(`/api/model-testing/results/${selected.id}`);
      setResults((prev) => prev.filter((row) => row.id !== selected.id));
      setSelected(null);
    } catch (err) {
      alert(`Failed to delete: ${err?.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div className="grid" style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <div className="card">
        <div className="flex items-center justify-between" style={{ gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Model Testing Results</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-secondary" disabled={!hasActiveFilters()} onClick={resetFilters}>
              Reset Filters
            </button>
            <div style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontWeight: 600 }}>
              {sortedResults.length} {sortedResults.length === 1 ? 'result' : 'results'}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label className="label">Drum Type</label>
            <select className="input" value={drumType} onChange={(e) => setDrumType(e.target.value)}>
              <option value="all">All</option>
              <option value="bass_drum">Bass Drum</option>
              <option value="snare">Snare</option>
              <option value="low_tom">Low Tom</option>
              <option value="mid_tom">Mid Tom</option>
              <option value="high_tom">High Tom</option>
            </select>
          </div>
          <div>
            <label className="label">Score</label>
            <select className="input" value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}>
              <option value="all">All</option>
              {SCORE_OPTIONS.map((value) => <option key={value} value={String(value)}>{value}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'end' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minHeight: '42px' }}>
              <input type="checkbox" checked={hasNotesFilter} onChange={(e) => setHasNotesFilter(e.target.checked)} />
              <span className="text-secondary">Has Notes</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th onClick={() => handleSort('id')} style={{ textAlign: 'left', padding: '10px', cursor: 'pointer' }}>ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('tested_at')} style={{ textAlign: 'left', padding: '10px', cursor: 'pointer' }}>Date {sortColumn === 'tested_at' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('drum_type')} style={{ textAlign: 'left', padding: '10px', cursor: 'pointer' }}>Drum Type {sortColumn === 'drum_type' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('source_kind')} style={{ textAlign: 'left', padding: '10px', cursor: 'pointer' }}>Source Kind {sortColumn === 'source_kind' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th onClick={() => handleSort('score')} style={{ textAlign: 'center', padding: '10px', cursor: 'pointer' }}>Score {sortColumn === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
            </tr>
          </thead>
          <tbody>
            {!loading && sortedResults.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center' }} className="text-secondary">
                  No model-testing results yet.
                </td>
              </tr>
            )}
            {sortedResults.map((result) => (
              <tr
                key={result.id}
                onClick={() => openDetail(result)}
                style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
              >
                <td style={{ padding: '10px' }}>#{result.id}</td>
                <td style={{ padding: '10px' }} className="text-secondary">{new Date(result.tested_at).toLocaleString()}</td>
                <td style={{ padding: '10px' }}>{DRUM_LABELS[result.drum_type] || result.drum_type}</td>
                <td style={{ padding: '10px' }}>{result.source_kind || '-'}</td>
                <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>
                  {result.score}
                  {(result.notes || '').trim() && (
                    <span style={{ marginLeft: '6px', display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} title="Has notes" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelected(null)}
        >
          <div className="card" style={{ width: '100%', maxWidth: '950px' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Result #{selected.id}</h3>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <h4 className="label">Original Database Audio</h4>
                <AudioPlayer src={`${API_BASE_URL}${selected.source_audio_proxy_url}`} />
              </div>
              <div>
                <h4 className="label">Generated Audio</h4>
                <AudioPlayer src={selected.generated_audio_url ? `${API_BASE_URL}${selected.generated_audio_url}` : ''} />
              </div>
            </div>

            <details style={{ marginTop: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Applied Tags</summary>
              <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(selected.applied_tags || {}, null, 2)}
              </pre>
            </details>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', marginTop: '12px' }}>
              <div>
                <label className="label">Score</label>
                <select className="input" value={editScore} onChange={(e) => setEditScore(Number(e.target.value))}>
                  {SCORE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
              <button className="btn btn-secondary" onClick={deleteResult} style={{ background: '#ef4444', borderColor: '#ef4444' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

