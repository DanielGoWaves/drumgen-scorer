import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const DRUM_LABELS = {
  bass_drum: 'Bass Drum',
  snare: 'Snare',
  low_tom: 'Low Tom',
  mid_tom: 'Mid Tom',
  high_tom: 'High Tom',
};

export default function ModelTestingDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const getScoreColor = (score10) => {
    const colors = [
      '#ff1744', '#ff5722', '#ff9100', '#ffc400', '#ffea00',
      '#c6ff00', '#76ff03', '#00e676', '#00c853', '#00b248',
    ];
    return colors[Math.max(1, Math.min(10, score10)) - 1];
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: response } = await api.get('/api/model-testing/dashboard');
        setData(response);
      } catch (err) {
        console.error('Failed to load model-testing dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
        <p className="text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  const rows = (data?.by_drum_type || []).filter((item) => item.total_results > 0);
  const maxTotal = Math.max(...rows.map((item) => item.total_results), 1);

  return (
    <div className="grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card">
        <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Model Testing Dashboard</h2>
        <p className="text-secondary">
          Overall Average Score: <strong>{data?.overall_average_score ?? 0}</strong> / 100
          {' '}({data?.total_results ?? 0} results)
        </p>
      </div>

      <div className="card" style={{ zIndex: 1 }}>
        <h3 className="label" style={{ fontSize: '18px', marginBottom: '10px' }}>Score Distribution</h3>
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <div style={{ minWidth: `${Math.max(820, rows.length * 110)}px`, padding: '10px 10px 24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
                fontSize: '13px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                paddingRight: '8px',
                whiteSpace: 'nowrap',
                alignSelf: 'center',
                marginBottom: '40px',
              }}>
                Number of Tests
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${rows.length || 1}, minmax(80px, 1fr))`,
                gap: '16px',
                width: '100%',
                paddingBottom: '12px',
                alignItems: 'end',
              }}>
                {rows.map((item, itemIdx) => {
                  const isRightSide = itemIdx >= rows.length - 3;
                  const barHeightPx = Math.max((item.total_results / maxTotal) * 260, 18);
                  const segments = Array.from({ length: 11 }, (_, idx) => 10 - idx)
                    .map((score10) => {
                      const score100 = score10 * 10;
                      return {
                        score10,
                        score100,
                        count: item.score_distribution?.[score100] || 0,
                      };
                    })
                    .filter((segment) => segment.count > 0);

                  let segmentHeights = segments.map((segment) => Math.max((segment.count / item.total_results) * barHeightPx, 8));
                  const totalHeight = segmentHeights.reduce((a, b) => a + b, 0);
                  if (totalHeight > barHeightPx) {
                    const scale = barHeightPx / totalHeight;
                    segmentHeights = segmentHeights.map((h) => h * scale);
                  }

                  return (
                    <div
                      key={item.drum_type}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 6px 0',
                        borderRadius: '10px',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.28)';
                        e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ fontSize: '18px', fontWeight: '700', minHeight: '22px' }}>
                        <span style={{ color: getScoreColor(Math.ceil((item.average_score || 0) / 10) || 1) }}>{item.average_score}</span>
                        <span style={{ color: '#16a34a', fontSize: '12px', fontWeight: 500 }}>/100</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minHeight: '16px' }}>
                        {item.total_results}
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${barHeightPx}px`,
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                      }}>
                        {segments.map((segment, idx) => (
                          <div
                            key={segment.score100}
                            onMouseEnter={() => setHoveredSegment({
                              drumType: item.drum_type,
                              score100: segment.score100,
                              count: segment.count,
                            })}
                            onMouseLeave={() => setHoveredSegment(null)}
                            onClick={() => navigate('/model/results', { state: { drumType: item.drum_type, audioScore: segment.score10 } })}
                            style={{
                              height: `${segmentHeights[idx]}px`,
                              background: getScoreColor(segment.score10),
                              borderTop: '1px solid rgba(0,0,0,0.15)',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'transform 0.15s ease, filter 0.15s ease',
                              transform: hoveredSegment?.drumType === item.drum_type && hoveredSegment?.score100 === segment.score100
                                ? 'translateY(-1px) scale(1.01)'
                                : 'none',
                              filter: hoveredSegment?.drumType === item.drum_type && hoveredSegment?.score100 === segment.score100
                                ? 'brightness(1.1)'
                                : 'none',
                            }}
                          >
                            {hoveredSegment?.drumType === item.drum_type && hoveredSegment?.score100 === segment.score100 && (
                              <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: isRightSide ? 'auto' : '110%',
                                right: isRightSide ? '110%' : 'auto',
                                transform: 'translateY(-50%)',
                                background: 'var(--primary-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '12px',
                                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                                zIndex: 50,
                                minWidth: '120px',
                                whiteSpace: 'nowrap',
                              }}>
                                <div style={{ fontWeight: 700, color: 'var(--primary-color)', marginBottom: '4px' }}>
                                  {segment.count} test{segment.count !== 1 ? 's' : ''}
                                </div>
                                <div className="text-secondary">
                                  Score: <strong style={{ color: getScoreColor(segment.score10) }}>{segment.score100}</strong>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div
                        onClick={() => navigate('/model/results', { state: { drumType: item.drum_type } })}
                        style={{
                          fontSize: '13px',
                          fontWeight: '700',
                          color: 'var(--primary-color)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          maxWidth: '80px',
                          lineHeight: '1.2',
                          minHeight: '32px',
                        }}
                      >
                        {DRUM_LABELS[item.drum_type] || item.drum_type}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
              <div className="text-secondary" style={{ fontSize: '13px', fontWeight: '600' }}>
                Drum Type (click to filter)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

