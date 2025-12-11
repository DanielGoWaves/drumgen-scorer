import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function PromptsPage({ setOverlayLoading }) {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [drumTypeFilter, setDrumTypeFilter] = useState('');
  const [promptSource, setPromptSource] = useState('all'); // 'all', 'pre-generated', 'user-generated'
  
  // Sorting
  const [sortColumn, setSortColumn] = useState('used_count');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc' - default 'desc' for 'used_count'

  useEffect(() => {
    const run = async () => {
      // Only show the overlay on initial page entry
      setOverlayLoading?.(true);
      await loadPrompts();
      setOverlayLoading?.(false);
    };
    run();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/prompts/', { params: { limit: 5000 } });
      setPrompts(data || []);
    } catch (err) {
      console.error('Failed to load prompts:', err);
    } finally {
      setLoading(false);
    }
  };


  const deletePrompt = async (id) => {
    if (!confirm('Delete this prompt?')) return;
    try {
      await api.delete(`/api/prompts/${id}`);
      await loadPrompts();
    } catch (err) {
      alert(`Error: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending (min/A first), except 'used_count' which defaults to descending (most to fewest)
      setSortColumn(column);
      setSortDirection(column === 'used_count' ? 'desc' : 'asc');
    }
  };

  const getSortedPrompts = () => {
    const filtered = prompts.filter(p => {
      const matchesSearch = !searchTerm || p.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = !difficultyFilter || p.difficulty === Number(difficultyFilter);
      const matchesDrumType = !drumTypeFilter || p.drum_type === drumTypeFilter;
      const matchesSource = promptSource === 'all' || 
                           (promptSource === 'pre-generated' && !p.is_user_generated) ||
                           (promptSource === 'user-generated' && p.is_user_generated);
      return matchesSearch && matchesDifficulty && matchesDrumType && matchesSource;
    });

    const sorted = [...filtered].sort((a, b) => {
      let aVal, bVal;

      switch (sortColumn) {
        case 'text':
          aVal = a.text || '';
          bVal = b.text || '';
          break;
        case 'difficulty':
          aVal = a.difficulty || 0;
          bVal = b.difficulty || 0;
          break;
        case 'drum_type':
          aVal = a.drum_type || '';
          bVal = b.drum_type || '';
          break;
        case 'used_count':
          aVal = a.used_count || 0;
          bVal = b.used_count || 0;
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

  const filteredPrompts = getSortedPrompts();

  const drumTypes = [...new Set(prompts.map(p => p.drum_type).filter(Boolean))].sort();
  const userGeneratedCount = prompts.filter(p => p.is_user_generated).length;
  const preGeneratedCount = prompts.filter(p => !p.is_user_generated).length;

  return (
    <div className="grid" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: '24px', fontWeight: '700' }}>
          Prompt Database Manager
        </h2>
        <div className="text-secondary" style={{ fontSize: '14px' }}>
          {prompts.length} total ({preGeneratedCount} pre-generated, {userGeneratedCount} user-generated)
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ zIndex: 1 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px',
          zIndex: 1
        }}>
          {/* Search */}
          <div style={{ zIndex: 1 }}>
            <label className="label">🔍 Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search prompts..."
              className="input"
            />
          </div>

          {/* Difficulty Filter */}
          <div style={{ zIndex: 1 }}>
            <label className="label">Difficulty</label>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">All</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Drum Type Filter */}
          <div style={{ zIndex: 1 }}>
            <label className="label">Drum Type</label>
            <select
              value={drumTypeFilter}
              onChange={(e) => setDrumTypeFilter(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">All</option>
              {drumTypes.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>

          {/* Prompt Source Filter */}
          <div style={{ zIndex: 1 }}>
            <label className="label">Source</label>
            <select
              value={promptSource}
              onChange={(e) => setPromptSource(e.target.value)}
              className="input"
              style={{ cursor: 'pointer' }}
            >
              <option value="all">All Prompts</option>
              <option value="pre-generated">Pre-Generated ({preGeneratedCount})</option>
              <option value="user-generated">User-Generated ({userGeneratedCount})</option>
            </select>
          </div>

        </div>

        <div className="text-secondary" style={{ marginTop: '12px', fontSize: '14px' }}>
          Showing {filteredPrompts.length} of {prompts.length} prompts
        </div>
      </div>

      {/* Prompts Table */}
      <div className="card" style={{ zIndex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            Loading prompts...
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No prompts found. Try adjusting your filters or generate new prompts.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', zIndex: 1 }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontSize: '14px',
              zIndex: 1
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th 
                    onClick={() => handleSort('text')} 
                    style={{ padding: '12px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Prompt Text {sortColumn === 'text' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('difficulty')} 
                    style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Difficulty {sortColumn === 'difficulty' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('drum_type')} 
                    style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Drum Type {sortColumn === 'drum_type' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    onClick={() => handleSort('used_count')} 
                    style={{ padding: '12px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
                  >
                    Times Used {sortColumn === 'used_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: '600' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPrompts.map((prompt) => (
                  <tr 
                    key={prompt.id}
                    style={{ 
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-muted)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px', maxWidth: '500px' }}>
                      {prompt.text}
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      color: 'var(--primary-color)',
                      fontWeight: '600'
                    }}>
                      {prompt.difficulty}/10
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ 
                        padding: '4px 8px',
                        background: 'var(--secondary-bg)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}>
                        {prompt.drum_type || 'N/A'}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'center',
                      color: 'var(--success-color)',
                      fontWeight: '600'
                    }}>
                      {prompt.used_count || 0}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={() => deletePrompt(prompt.id)}
                        className="btn btn-secondary"
                        style={{ 
                          padding: '6px 12px',
                          fontSize: '12px',
                          background: 'var(--error-color)',
                          color: '#fff'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
