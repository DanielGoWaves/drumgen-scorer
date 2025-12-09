import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDrumType, setSelectedDrumType] = useState('all');
  const [selectedVersion, setSelectedVersion] = useState('all');
  const [availableDrumTypes, setAvailableDrumTypes] = useState([]);
  const [showScoreTooltip, setShowScoreTooltip] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // All possible versions from the generation website
  const ALL_VERSIONS = ['v11', 'v12', 'v13'];

  useEffect(() => {
    loadDrumTypes();
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [selectedDrumType, selectedVersion]);

  const loadDrumTypes = async () => {
    try {
      const { data } = await api.get('/api/prompts/', { params: { limit: 5000 } });
      const types = [...new Set(data.map(p => p.drum_type).filter(Boolean))].sort();
      setAvailableDrumTypes(types);
    } catch (err) {
      console.error('Failed to load drum types:', err);
    }
  };

  const loadAnalytics = async () => {
    try {
      const params = {};
      if (selectedDrumType !== 'all') params.drum_type = selectedDrumType;
      if (selectedVersion !== 'all') params.model_version = selectedVersion;
      const { data } = await api.get('/api/results/dashboard', { params });
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };


  // Determine if we have data to display
  const hasData = analytics && analytics.total_tests > 0;

  // Filter data by version if selected
  const filteredByVersion = hasData && selectedVersion === 'all' ? analytics : hasData ? {
    ...analytics,
    by_version: analytics?.by_version?.filter(v => v.version === selectedVersion) || []
  } : null;

  const currentVersionData = hasData && selectedVersion !== 'all'
    ? analytics?.by_version?.find(v => v.version === selectedVersion)
    : null;

  const displayScore = hasData 
    ? (selectedVersion === 'all' 
        ? analytics.overall_generation_score 
        : (currentVersionData?.generation_score || 0))
    : 0;

  // Calculate color for heat map (1=red, 10=green)
  const getScoreColor = (score) => {
    const colors = [
      '#ef4444', // 1 - red
      '#f97316', // 2 - orange-red
      '#fb923c', // 3 - orange
      '#fbbf24', // 4 - yellow-orange
      '#facc15', // 5 - yellow
      '#bef264', // 6 - yellow-green
      '#86efac', // 7 - light green
      '#4ade80', // 8 - green
      '#22c55e', // 9 - bright green
      '#16a34a', // 10 - dark green
    ];
    return colors[score - 1] || colors[4]; // default to yellow
  };


  return (
    <div className="grid" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header with Filters */}
      <div className="flex items-center justify-between" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700' }}>
          Analytics Dashboard
        </h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedVersion}
              onChange={(e) => setSelectedVersion(e.target.value)}
              className="input"
              style={{ cursor: 'pointer', width: '100%' }}
            >
              <option value="all">All Versions</option>
              {ALL_VERSIONS.map(v => (
                <option key={v} value={v}>{v.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '200px' }}>
            <select
              value={selectedDrumType}
              onChange={(e) => setSelectedDrumType(e.target.value)}
              className="input"
              style={{ cursor: 'pointer', width: '100%' }}
            >
              <option value="all">All Drum Types</option>
              {availableDrumTypes.map(dt => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p className="text-secondary">Loading analytics...</p>
        </div>
      )}

      {/* Empty State - No Data */}
      {!loading && !hasData && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Test Data Available</p>
          <p className="text-secondary">Start testing to see analytics here!</p>
        </div>
      )}

      {/* Metrics Cards - Only show when we have data */}
      {!loading && hasData && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          {/* Overall Generation Score - main emphasis */}
          <div className="card" style={{ zIndex: 1, position: 'relative', overflow: 'visible', textAlign: 'center' }}>
            <div 
              style={{ 
                position: 'absolute', 
                top: '10px', 
                right: '10px', 
                cursor: 'pointer', 
                zIndex: 1100 
              }}
              onMouseEnter={() => setShowScoreTooltip(true)}
              onMouseLeave={() => setShowScoreTooltip(false)}
            >
              <span style={{ 
                fontSize: '12px', 
                color: 'var(--primary-color)',
                border: '1px solid var(--primary-color)',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--primary-bg)'
              }}>?</span>
              {showScoreTooltip && (
                <div style={{
                  position: 'absolute',
                  top: '0',
                  right: '120%',
                  background: 'var(--secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '14px',
                  width: '360px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                  fontSize: '12px',
                  lineHeight: '1.6',
                  zIndex: 3000,
                  whiteSpace: 'normal'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '8px', color: 'var(--primary-color)' }}>
                    Generation Score Formula
                  </div>
                  <div style={{ fontFamily: 'monospace', background: 'var(--primary-bg)', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                    ((difficulty × 0.3) + (audio × 0.7)) × 10
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Audio-only, weighted by difficulty. Easy prompts with high scores count less than difficult prompts with average scores. Range: 0-100.
                  </div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '86px' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '13px', marginBottom: '6px' }}>
                  Generation Score
                </div>
                <div style={{ fontSize: '36px', fontWeight: '800', color: 'var(--primary-color)' }}>
                  {displayScore}/100
                </div>
              </div>
            </div>
          </div>

          {/* LLM Accuracy - deemphasized */}
          <div className="card" style={{ zIndex: 1, opacity: 0.8, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70px' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px', marginBottom: '2px' }}>
                  LLM Accuracy
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--secondary-color)' }}>
                  {analytics?.avg_llm_accuracy || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Total Tests - deemphasized */}
          <div className="card" style={{ zIndex: 1, opacity: 0.8, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70px' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '12px', marginBottom: '2px' }}>
                  Total Tests
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--warning-color)' }}>
                  {analytics?.total_tests || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Difficulty Distribution Heat Map - Only show when we have data */}
      {!loading && hasData && (
        <div className="card" style={{ zIndex: 1, overflow: 'visible' }}>
          <h3 className="label" style={{ fontSize: '18px', marginBottom: '16px', zIndex: 1 }}>
            Difficulty vs Score Distribution
          </h3>
        <div style={{ overflowX: 'auto', overflowY: 'visible', zIndex: 1, position: 'relative' }}>
          <div style={{ minWidth: '820px', padding: '10px 10px 24px', overflow: 'visible', position: 'relative' }}>
            {/* Chart container */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', overflow: 'visible' }}>
              {/* Y-axis label */}
              <div style={{ 
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                paddingRight: '8px',
                whiteSpace: 'nowrap',
                alignSelf: 'center',
                marginBottom: '40px'
              }}>
                Number of Tests
              </div>

              {/* Bars */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(10, minmax(50px, 1fr))', 
                gap: '12px', 
                width: '100%',
                paddingBottom: '12px',
                alignItems: 'end',
                overflow: 'visible'
              }}>
                {(analytics?.difficulty_distribution || []).map((diff, idx) => {
                  const isRightSide = idx >= (analytics?.difficulty_distribution || []).length - 3; // last 3 bars
                  const maxTests = Math.max(...(analytics?.difficulty_distribution || []).map(d => d.total_tests), 1);
                  const barHeightPx = diff.total_tests > 0 ? Math.max((diff.total_tests / maxTests) * 260, 18) : 10;

                  // Build segment heights in pixels with a minimum size and rescale to fit
                  const segments = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
                    .map((score) => ({
                      score,
                      count: diff.score_distribution[score] || 0,
                    }))
                    .filter((s) => s.count > 0);

                  let segmentHeights = segments.map((s) => Math.max((s.count / diff.total_tests) * barHeightPx, 8));
                  const totalHeight = segmentHeights.reduce((a, b) => a + b, 0);
                  if (totalHeight > barHeightPx) {
                    const scale = barHeightPx / totalHeight;
                    segmentHeights = segmentHeights.map((h) => h * scale);
                  }

                  return (
                    <div 
                      key={diff.difficulty}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                    >
                      {/* Count above bar */}
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', minHeight: '16px' }}>
                        {diff.total_tests > 0 ? diff.total_tests : ''}
                      </div>

                      {/* Bar */}
                      <div style={{
                        width: '100%',
                        height: `${barHeightPx}px`,
                        background: diff.total_tests === 0 ? 'var(--border-color)' : 'transparent',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        overflow: 'visible',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        position: 'relative'
                      }}>
                        {diff.total_tests > 0 && segments.map((segment, idx) => {
                          const isHovered = hoveredSegment?.difficulty === diff.difficulty && hoveredSegment?.score === segment.score;
                            return (
                            <div
                              key={segment.score}
                              style={{
                                height: `${segmentHeights[idx]}px`,
                                background: getScoreColor(segment.score),
                                borderTop: '1px solid rgba(0,0,0,0.15)',
                                position: 'relative',
                                cursor: 'pointer',
                                opacity: 1,
                                transition: 'opacity 0.2s, transform 0.2s, box-shadow 0.2s',
                                transform: isHovered ? 'translateY(-2px) scale(1.02)' : 'none',
                                boxShadow: isHovered ? '0 6px 14px rgba(0,0,0,0.25)' : 'none',
                                zIndex: isHovered ? 3000 : 1
                              }}
                              onMouseEnter={() => setHoveredSegment({ difficulty: diff.difficulty, score: segment.score, count: segment.count })}
                              onMouseLeave={() => setHoveredSegment(null)}
                              onClick={() => {
                                navigate('/results', {
                                  state: {
                                    difficulty: diff.difficulty,
                                    audioScore: segment.score,
                                    drumType: selectedDrumType !== 'all' ? selectedDrumType : null,
                                    modelVersion: selectedVersion !== 'all' ? selectedVersion : null
                                  }
                                });
                              }}
                            >
                              {isHovered && (
                                <div style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: isRightSide ? 'auto' : '110%',
                                  right: isRightSide ? '110%' : 'auto',
                                  transform: 'translateY(-50%)',
                                  background: 'var(--primary-bg)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '6px',
                                  padding: '10px 12px',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                                  zIndex: 4000,
                                  marginBottom: '6px'
                                }}>
                                  Difficulty {diff.difficulty} • Score {segment.score}<br />
                                  {segment.count} test{segment.count !== 1 ? 's' : ''}<br />
                                  <span style={{ fontSize: '11px', opacity: 0.7, fontStyle: 'italic' }}>Click to view results →</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Difficulty label */}
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        {diff.difficulty}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis label */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              marginTop: '6px'
            }}>
              <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>
                Difficulty Level
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Version Comparison - Only show when "All Versions" selected and has data */}
      {!loading && hasData && selectedVersion === 'all' && analytics.by_version && analytics.by_version.length > 0 && (
        <div className="card" style={{ zIndex: 1 }}>
          <h3 className="label" style={{ fontSize: '18px', marginBottom: '16px', zIndex: 1 }}>
            Performance by Model Version
          </h3>
          <div style={{ 
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            zIndex: 1
          }}>
            {(analytics?.by_version || []).map((version) => (
              <div 
                key={version.version}
                style={{
                  flex: '1 1 200px',
                  padding: '20px',
                  background: 'var(--secondary-bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-color)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                onClick={() => setSelectedVersion(version.version)}
              >
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '700', 
                  color: 'var(--text-secondary)',
                  marginBottom: '12px',
                  textTransform: 'uppercase'
                }}>
                  {version.version}
                </div>
                <div style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary-color)' }}>
                  {version.generation_score}
                </div>
                <div className="text-secondary" style={{ fontSize: '11px', marginBottom: '12px' }}>
                  / 100 (Generation)
                </div>
                <div style={{ 
                  fontSize: '12px',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '12px',
                  textAlign: 'center'
                }}>
                  <div className="text-secondary">LLM Accuracy</div>
                  <div style={{ fontWeight: '600', color: 'var(--secondary-color)', fontSize: '16px', marginTop: '4px' }}>{version.avg_llm}</div>
                </div>
                <div className="text-secondary" style={{ fontSize: '11px', marginTop: '12px' }}>
                  {version.count} test{version.count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
