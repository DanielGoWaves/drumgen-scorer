import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';

const buildDefaultLabels = (labelSchema) => {
  const defaults = {};
  const dictionaries = labelSchema?.dictionaries || {};
  const multiValue = new Set(labelSchema?.multi_value_cols || []);

  Object.keys(dictionaries).forEach((key) => {
    const rawValues = Object.keys(dictionaries[key] || {});
    const values = key === 'Velocity'
      ? rawValues.filter((value) => value !== 'quiet')
      : rawValues;

    if (multiValue.has(key)) {
      defaults[key] = [];
    } else {
      defaults[key] = values[0] || '<UNK>';
    }
  });

  return defaults;
};

const buildDefaultSliders = (conditioningParams) => {
  const defaults = {};
  (conditioningParams || []).forEach((name) => {
    defaults[name] = 0;
  });
  return defaults;
};

export default function ModelBetaPage() {
  const [schema, setSchema] = useState(null);
  const [schemaError, setSchemaError] = useState('');
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [labels, setLabels] = useState({});
  const [sliders, setSliders] = useState({});
  const [temperature, setTemperature] = useState(1.0);
  const [width, setWidth] = useState(0.5);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(true);
  const audioRef = useRef(null);
  const generateTimeout = useRef(null);
  const didInitialGenerate = useRef(false);
  const shouldAutoplay = useRef(false);

  useEffect(() => {
    const loadSchema = async () => {
      setLoadingSchema(true);
      setSchemaError('');
      try {
        let ready = false;
        while (!ready) {
          try {
            await api.get('/api/model-beta/health');
            ready = true;
            setModelReady(true);
          } catch (err) {
            setModelReady(false);
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        const { data } = await api.get('/api/model-beta/schema');
        setSchema(data);
        setLabels(buildDefaultLabels(data.label_schema));
        setSliders(buildDefaultSliders(data.conditioning_params));
      } catch (err) {
        setSchemaError(err?.response?.data?.detail || err.message || 'Failed to load model schema.');
      } finally {
        setLoadingSchema(false);
      }
    };

    loadSchema();
  }, []);

  useEffect(() => {
    if (!schema || didInitialGenerate.current) return;
    didInitialGenerate.current = true;
    if (autoGenerate) {
      handleGenerate();
    }
  }, [schema, autoGenerate]);

  useEffect(() => {
    if (!audioUrl || !shouldAutoplay.current) return;
    shouldAutoplay.current = false;
    if (audioRef.current) {
      audioRef.current.play();
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (generateTimeout.current) {
        clearTimeout(generateTimeout.current);
      }
    };
  }, [audioUrl]);

  const conditioningParams = schema?.conditioning_params || [];
  const labelSchema = schema?.label_schema || {};
  const dictionaries = labelSchema?.dictionaries || {};
  const multiValueCols = new Set(labelSchema?.multi_value_cols || []);

  const scheduleGenerate = () => {
    if (!autoGenerate) return;
    if (generateTimeout.current) {
      clearTimeout(generateTimeout.current);
    }
    generateTimeout.current = setTimeout(() => {
      handleGenerate();
    }, 250);
  };

  const handleGenerate = async () => {
    if (!schema) return;
    setGenerating(true);
    setStatus('Generating audio...');
    try {
      const payload = {
        labels,
        sliders,
        temperature,
        width,
      };
      const response = await api.post('/api/model-beta/generate', payload, {
        responseType: 'arraybuffer',
      });
      const blob = new Blob([response.data], { type: 'audio/wav' });
      const nextUrl = URL.createObjectURL(blob);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      shouldAutoplay.current = true;
      setAudioUrl(nextUrl);
      setStatus('✓ Audio generated');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      setStatus(`Error: ${err?.response?.data?.detail || err.message || 'Generation failed.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePlay = () => {
    if (audioRef.current) {
      audioRef.current.play();
    }
  };

  const handleClearSelections = () => {
    setLabels(buildDefaultLabels(labelSchema));
    setSliders(buildDefaultSliders(conditioningParams));
    setTemperature(1.0);
    setWidth(0.5);
    scheduleGenerate();
  };

  const handleSingleChange = (key, value) => {
    setLabels((prev) => ({ ...prev, [key]: value }));
    scheduleGenerate();
  };

  const handleMultiToggle = (key, value) => {
    setLabels((prev) => {
      const current = new Set(prev[key] || []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }
      return { ...prev, [key]: Array.from(current) };
    });
    scheduleGenerate();
  };

  const handleSliderChange = (key, value) => {
    setSliders((prev) => ({ ...prev, [key]: Number(value) }));
  };

  const handleSliderCommit = () => {
    scheduleGenerate();
  };

  const labelSections = useMemo(() => {
    const entries = Object.entries(dictionaries);
    return entries.map(([key, values]) => {
      const options = Object.keys(values || {});
      const filtered = key === 'Velocity'
        ? options.filter((option) => option !== 'quiet')
        : options;
      return { key, options: filtered };
    });
  }, [dictionaries]);

  return (
    <div className="grid" style={{ maxWidth: '1200px', margin: '0 auto', gap: '16px' }}>
      <div className="card" style={{ zIndex: 1, padding: '18px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>Model Beta</h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={handleClearSelections}
              disabled={loadingSchema || generating || !modelReady}
            >
              Clear All
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                disabled={!modelReady}
              />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Auto regenerate</span>
            </label>
          </div>
        </div>

        {loadingSchema && (
          <div className="text-secondary">
            {modelReady ? 'Loading model schema...' : 'Waiting for model worker...'}
          </div>
        )}
        {schemaError && <div className="text-error">{schemaError}</div>}

        {!loadingSchema && !schemaError && (
          <div style={{ display: 'grid', gap: '12px' }}>
            <details open style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Core Controls</summary>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
                <div>
                  <label className="label">Temperature</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={temperature}
                      className="modern-slider"
                      onChange={(e) => setTemperature(Number(e.target.value))}
                      onMouseUp={handleSliderCommit}
                      onTouchEnd={handleSliderCommit}
                    />
                    <span className="text-secondary" style={{ minWidth: '44px' }}>
                      {temperature.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label">Stereo Width</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={width}
                      className="modern-slider modern-slider-secondary"
                      onChange={(e) => setWidth(Number(e.target.value))}
                      onMouseUp={handleSliderCommit}
                      onTouchEnd={handleSliderCommit}
                    />
                    <span className="text-secondary" style={{ minWidth: '44px' }}>
                      {width.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </details>

            <details open style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Conditioning Sliders</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {conditioningParams.map((name) => (
                  <div key={name} style={{ textAlign: 'center' }}>
                    <div className="label" style={{ fontSize: '12px' }}>{name}</div>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={sliders[name] ?? 0}
                      className="modern-slider"
                      onChange={(e) => handleSliderChange(name, e.target.value)}
                      onMouseUp={handleSliderCommit}
                      onTouchEnd={handleSliderCommit}
                    />
                    <div className="text-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
                      {(sliders[name] ?? 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </details>

            <details style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Label Metadata</summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '12px' }}>
                {labelSections.map(({ key, options }) => (
                  <div key={key} style={{ minHeight: '96px' }}>
                    <div className="text-secondary" style={{ fontSize: '11px', marginBottom: '6px' }}>{key}</div>
                    {multiValueCols.has(key) ? (
                      <div
                        className="custom-scrollbar"
                        style={{
                          maxHeight: '160px',
                          overflowY: 'auto',
                          padding: '8px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--secondary-bg)',
                          display: 'grid',
                          gap: '6px',
                        }}
                      >
                        {options.map((option) => (
                          <label
                            key={option}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}
                          >
                            <input
                              type="checkbox"
                              checked={(labels[key] || []).includes(option)}
                              onChange={() => handleMultiToggle(key, option)}
                            />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <select
                        className="input"
                        value={labels[key] || ''}
                        onChange={(e) => handleSingleChange(key, e.target.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        {options.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </details>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={generating || loadingSchema || !modelReady}
              >
                {generating ? 'Generating...' : 'Regenerate'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handlePlay}
                disabled={!audioUrl}
              >
                Play
              </button>
              {audioUrl && (
                <a
                  className="btn btn-secondary"
                  href={audioUrl}
                  download="drumgen-model-beta.wav"
                >
                  Export Sample
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ zIndex: 1, padding: '18px' }}>
        <details open>
          <summary style={{ cursor: 'pointer', fontWeight: 600, marginBottom: '10px' }}>Audio Output</summary>
          {audioUrl ? (
            <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%' }} />
          ) : (
            <div className="text-secondary">Generate audio to preview it here.</div>
          )}
        </details>
      </div>

      {status && (
        <div
          className="card status-message-fade"
          style={{
            background: status.startsWith('✓') ? 'rgba(52, 211, 153, 0.1)' :
                       status.startsWith('Error') ? 'rgba(248, 113, 113, 0.15)' :
                       'var(--secondary-bg)',
            border: status.startsWith('✓') ? '1px solid var(--success-color)' :
                    status.startsWith('Error') ? '1px solid var(--error-color)' :
                    '1px solid var(--border-color)'
          }}
        >
          <p style={{
            color: status.startsWith('✓') ? 'var(--success-color)' :
                   status.startsWith('Error') ? 'var(--error-color)' :
                   'var(--text-secondary)'
          }}>
            {status}
          </p>
        </div>
      )}
    </div>
  );
}
