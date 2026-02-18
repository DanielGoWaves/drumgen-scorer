import React, { useEffect, useMemo, useRef, useState } from 'react';
import api, { API_BASE_URL } from '../services/api';
import WaveformAudioPlayer from '../components/WaveformAudioPlayer';

let modelTestingPageCache = null;

const DRUM_TYPES = [
  { value: 'bass_drum', label: 'Bass Drum' },
  { value: 'snare', label: 'Snare' },
  { value: 'low_tom', label: 'Low Tom' },
  { value: 'mid_tom', label: 'Mid Tom' },
  { value: 'high_tom', label: 'High Tom' },
];

const buildDefaultLabels = (labelSchema) => {
  const defaults = {};
  const dictionaries = labelSchema?.dictionaries || {};
  const multiValue = new Set(labelSchema?.multi_value_cols || []);

  Object.keys(dictionaries).forEach((key) => {
    defaults[key] = multiValue.has(key) ? [] : '';
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

const toList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
};

const caseInsensitiveMatch = (candidate, allowed) => {
  if (!candidate) return null;
  const lower = String(candidate).toLowerCase().trim();
  return allowed.find((opt) => opt.toLowerCase().trim() === lower) || null;
};

const normalizeSampleTagsToSchema = (sampleTags, labelSchema) => {
  const dictionaries = labelSchema?.dictionaries || {};
  const multiValue = new Set(labelSchema?.multi_value_cols || []);
  const result = {};

  Object.keys(dictionaries).forEach((key) => {
    const rawValues = Object.keys(dictionaries[key] || {});
    const allowed = key === 'Velocity'
      ? rawValues.filter((v) => v !== 'quiet')
      : rawValues;

    if (multiValue.has(key)) {
      const values = toList(sampleTags?.[key])
        .map((v) => caseInsensitiveMatch(v, allowed))
        .filter(Boolean);
      result[key] = values;
      return;
    }

    const candidate = sampleTags?.[key];
    const matched = caseInsensitiveMatch(candidate, allowed);
    if (matched) {
      result[key] = matched;
    }
  });

  return result;
};

export default function ModelTestingPage() {
  const [drumType, setDrumType] = useState(() => modelTestingPageCache?.drumType || 'bass_drum');
  const [schema, setSchema] = useState(null);
  const [schemaError, setSchemaError] = useState('');
  const [sampleQueue, setSampleQueue] = useState(() => modelTestingPageCache?.sampleQueue || []);
  const [sampleIndex, setSampleIndex] = useState(() => modelTestingPageCache?.sampleIndex || 0);
  const [labels, setLabels] = useState(() => modelTestingPageCache?.labels || {});
  const [sliders, setSliders] = useState(() => modelTestingPageCache?.sliders || {});
  const [temperature, setTemperature] = useState(() => modelTestingPageCache?.temperature ?? 1.0);
  const [width, setWidth] = useState(() => modelTestingPageCache?.width ?? 0.5);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState(() => modelTestingPageCache?.generatedAudioUrl || '');
  const [generatedData, setGeneratedData] = useState(() => modelTestingPageCache?.generatedData || null);
  const [score, setScore] = useState(() => modelTestingPageCache?.score ?? 50);
  const [scoreEditing, setScoreEditing] = useState(false);
  const [scoreText, setScoreText] = useState(() => String(modelTestingPageCache?.score ?? 50));
  const [notes, setNotes] = useState(() => modelTestingPageCache?.notes || '');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [status, setStatus] = useState('');
  const scoreRef = useRef(null);
  const scoreDragRef = useRef({ active: false, startX: 0, startScore: 50 });
  const latestGenerationRequestRef = useRef(0);
  const latestSamplesRequestRef = useRef(0);
  const currentSampleIdRef = useRef(null);
  const labelsRef = useRef(labels);
  const slidersRef = useRef(sliders);
  const temperatureRef = useRef(temperature);
  const widthRef = useRef(width);
  const skipInitialLoadSamplesRef = useRef(Boolean(modelTestingPageCache?.sampleQueue?.length));
  const skipHydrationAutogenerateRef = useRef(Boolean(modelTestingPageCache?.generatedData));

  const selectedSample = sampleQueue[sampleIndex] || null;
  const conditioningParams = schema?.conditioning_params || [];
  const labelSchema = schema?.label_schema || {};
  const dictionaries = labelSchema?.dictionaries || {};
  const multiValueCols = new Set(labelSchema?.multi_value_cols || []);

  const labelSections = useMemo(() => {
    return Object.entries(dictionaries).map(([key, values]) => {
      const options = Object.keys(values || {});
      const filtered = key === 'Velocity'
        ? options.filter((option) => option !== 'quiet')
        : options;
      return { key, options: filtered };
    });
  }, [dictionaries]);

  useEffect(() => {
    const load = async () => {
      setSchemaLoading(true);
      setSchemaError('');
      try {
        const { data } = await api.get('/api/model-testing/schema');
        setSchema(data);
        setSliders(buildDefaultSliders(data.conditioning_params));
      } catch (err) {
        const message = err?.response?.data?.detail || err.message || 'Failed to load model schema.';
        setSchemaError(message);
      } finally {
        setSchemaLoading(false);
      }
    };
    load();
  }, []);

  const loadSamples = async () => {
    const samplesRequestId = ++latestSamplesRequestRef.current;
    setLoading(true);
    try {
      const { data } = await api.get('/api/model-testing/samples', {
        params: { drum_type: drumType, limit: 50 },
      });
      if (samplesRequestId !== latestSamplesRequestRef.current) {
        return;
      }
      const nextSamples = data?.samples || [];
      setSampleQueue(nextSamples);
      setSampleIndex(0);
      setGeneratedAudioUrl('');
      setGeneratedData(null);
      setNotes('');
      setScore(50);
      setScoreText('50');
      setScoreEditing(false);
      if (!nextSamples.length) {
        setStatus(data?.message || 'No unused samples left for selected kind.');
      } else if (nextSamples.length < 50) {
        setStatus(`Only ${nextSamples.length} unused samples left for selected kind.`);
      } else {
        setStatus('');
      }
    } catch (err) {
      if (samplesRequestId !== latestSamplesRequestRef.current) {
        return;
      }
      setStatus(`Error loading samples: ${err?.response?.data?.detail || err.message}`);
    } finally {
      if (samplesRequestId === latestSamplesRequestRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (skipInitialLoadSamplesRef.current && sampleQueue.length > 0) {
      skipInitialLoadSamplesRef.current = false;
      return;
    }
    loadSamples();
  }, [drumType]);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  useEffect(() => {
    slidersRef.current = sliders;
  }, [sliders]);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    currentSampleIdRef.current = selectedSample?.id || null;
    // Invalidate any in-flight generation tied to the previous sample.
    latestGenerationRequestRef.current += 1;
  }, [selectedSample?.id]);

  useEffect(() => {
    if (!schema || !selectedSample) return;
    if (skipHydrationAutogenerateRef.current) {
      skipHydrationAutogenerateRef.current = false;
      return;
    }
    setTemperature(1.0);
    temperatureRef.current = 1.0;
    setWidth(0.5);
    widthRef.current = 0.5;
    const defaultSliders = buildDefaultSliders(schema.conditioning_params);
    setSliders(defaultSliders);
    slidersRef.current = defaultSliders;
    const newLabels = normalizeSampleTagsToSchema(selectedSample.tags || {}, schema.label_schema);
    setLabels(newLabels);
    labelsRef.current = newLabels;
    generateCurrent({
      labels: newLabels,
      sliders: defaultSliders,
      temperature: 1.0,
      width: 0.5,
    });
  }, [schema, selectedSample?.id]);

  const generateCurrent = async (overrides = {}) => {
    if (!selectedSample) return;
    const tagsToSend = buildRequestTags(overrides.labels || labelsRef.current);
    const slidersToSend = overrides.sliders || slidersRef.current;
    const temperatureToSend = overrides.temperature ?? temperatureRef.current;
    const widthToSend = overrides.width ?? widthRef.current;
    if (!Object.keys(tagsToSend).length) return;
    const generationRequestId = ++latestGenerationRequestRef.current;
    const sampleIdAtRequest = selectedSample.id;
    setGenerating(true);
    setStatus('Generating V18 acoustic sample...');
    try {
      const response = await api.post('/api/model-testing/generate', {
        sample: selectedSample.source_json_for_model || selectedSample.raw_sample || {},
        tags: tagsToSend,
        temperature: temperatureToSend,
        width: widthToSend,
        sliders: slidersToSend,
      });
      const data = response.data;
      if (
        generationRequestId !== latestGenerationRequestRef.current
        || sampleIdAtRequest !== currentSampleIdRef.current
      ) {
        return;
      }
      setGeneratedData(data);

      const audioUrl = data?.audio_url
        ? `${API_BASE_URL}${data.audio_url}?t=${Date.now()}`
        : '';
      setGeneratedAudioUrl(audioUrl);
      setStatus('Generated sample ready');
      setTimeout(() => setStatus(''), 2000);
    } catch (err) {
      if (generationRequestId !== latestGenerationRequestRef.current) {
        return;
      }
      const errorMessage = err?.response?.data?.detail || err.message;
      setStatus(`Generation failed: ${errorMessage}`);
    } finally {
      if (generationRequestId === latestGenerationRequestRef.current) {
        setGenerating(false);
      }
    }
  };

  useEffect(() => {
    modelTestingPageCache = {
      drumType,
      sampleQueue,
      sampleIndex,
      labels,
      sliders,
      temperature,
      width,
      generatedAudioUrl,
      generatedData,
      score,
      notes,
    };
  }, [
    drumType,
    sampleQueue,
    sampleIndex,
    labels,
    sliders,
    temperature,
    width,
    generatedAudioUrl,
    generatedData,
    score,
    notes,
  ]);

  const snapScore = (value) => {
    const snapped = Math.round(value / 10) * 10;
    return Math.max(0, Math.min(100, snapped));
  };

  const updateScore = (nextValue) => {
    const safeValue = snapScore(nextValue);
    setScore(safeValue);
    setScoreText(String(safeValue));
  };

  const handleScoreArrow = (direction) => {
    updateScore(score + (direction * 10));
  };

  const handleScoreDragStart = (event) => {
    event.preventDefault();
    scoreDragRef.current = { active: true, startX: event.clientX, startScore: score };
    window.addEventListener('mousemove', handleScoreDragMove);
    window.addEventListener('mouseup', handleScoreDragEnd);
  };

  const handleScoreDragMove = (event) => {
    const dragState = scoreDragRef.current;
    if (!dragState.active) return;
    const deltaX = event.clientX - dragState.startX;
    const stepDelta = Math.trunc(deltaX / 12) * 10;
    updateScore(dragState.startScore + stepDelta);
  };

  const handleScoreDragEnd = () => {
    scoreDragRef.current.active = false;
    window.removeEventListener('mousemove', handleScoreDragMove);
    window.removeEventListener('mouseup', handleScoreDragEnd);
  };

  useEffect(() => () => {
    window.removeEventListener('mousemove', handleScoreDragMove);
    window.removeEventListener('mouseup', handleScoreDragEnd);
  }, []);

  const handleScoreDoubleClick = () => {
    setScoreEditing(true);
    setScoreText(String(score));
  };

  const commitScoreText = () => {
    const value = Number(scoreText);
    if (Number.isNaN(value)) {
      setScoreText(String(score));
      setScoreEditing(false);
      return;
    }
    updateScore(value);
    setScoreEditing(false);
  };

  const advanceToNextSample = async () => {
    const next = sampleIndex + 1;
    if (next < sampleQueue.length) {
      setSampleIndex(next);
      setGeneratedAudioUrl('');
      setGeneratedData(null);
      setNotes('');
      setScore(50);
      setScoreText('50');
      setScoreEditing(false);
      return;
    }
    await loadSamples();
  };

  const handleSubmit = async () => {
    if (!selectedSample || !generatedData) {
      setStatus('Generate a sample before submitting a score.');
      return;
    }
    setLoading(true);
    setStatus('Saving result...');
    try {
      await api.post('/api/model-testing/results', {
        source_dataset: selectedSample.dataset,
        source_filename: selectedSample.filename,
        source_kind: selectedSample.kind,
        source_audio_url: selectedSample.source_audio_url || null,
        source_metadata: selectedSample.raw_sample || {},
        applied_tags: generatedData.applied_tags || labels,
        generated_audio_id: generatedData.audio_id,
        generated_audio_path: generatedData.audio_file_path,
        score,
        notes: notes.trim() || null,
      });
      setStatus('Result saved');
      await advanceToNextSample();
    } catch (err) {
      setStatus(`Failed to save result: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSingleChange = (key, value) => {
    const next = { ...labelsRef.current, [key]: value };
    labelsRef.current = next;
    setLabels(next);
    generateCurrent({ labels: next });
  };

  const handleMultiToggle = (key, value) => {
    const current = new Set(labelsRef.current[key] || []);
    if (current.has(value)) current.delete(value);
    else current.add(value);
    const next = { ...labelsRef.current, [key]: Array.from(current) };
    labelsRef.current = next;
    setLabels(next);
    generateCurrent({ labels: next });
  };

  const getSortedMultiOptions = (key, options) => {
    const selected = new Set(labels[key] || []);
    return [...options].sort((a, b) => {
      const aChecked = selected.has(a);
      const bChecked = selected.has(b);
      if (aChecked !== bChecked) {
        return aChecked ? -1 : 1;
      }
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    });
  };

  const buildRequestTags = (inputLabels) => {
    const source = inputLabels || {};
    const output = {};

    Object.entries(source).forEach(([key, value]) => {
      if (!(key in (dictionaries || {}))) return;

      if (multiValueCols.has(key)) {
        output[key] = toList(value).map((item) => String(item));
        return;
      }

      if (value == null) return;
      const asString = String(value).trim();
      if (!asString) return;
      output[key] = asString;
    });

    return output;
  };

  const handleSliderChange = (key, value) => {
    const nextValue = Number(value);
    const next = { ...slidersRef.current, [key]: nextValue };
    slidersRef.current = next;
    setSliders(next);
    generateCurrent({ sliders: next });
  };

  const handleClearSelections = () => {
    const nextLabels = buildDefaultLabels(labelSchema);
    const nextSliders = buildDefaultSliders(conditioningParams);
    labelsRef.current = nextLabels;
    slidersRef.current = nextSliders;
    temperatureRef.current = 1.0;
    widthRef.current = 0.5;
    setLabels(nextLabels);
    setSliders(nextSliders);
    setTemperature(1.0);
    setWidth(0.5);
    generateCurrent({
      labels: nextLabels,
      sliders: nextSliders,
      temperature: 1.0,
      width: 0.5,
    });
  };

  const sourceAudioUrl = selectedSample ? `${API_BASE_URL}${selectedSample.source_audio_proxy_url}` : '';
  const generatedDownloadUrl = generatedData?.audio_url ? `${API_BASE_URL}${generatedData.audio_url}` : '';
  const generatedDownloadName = (() => {
    const baseName = (selectedSample?.filename || 'generated_sample.wav').replace(/\.[^/.]+$/, '');
    return `${baseName}_v18_generated.wav`;
  })();
  const handleDownloadGenerated = async () => {
    if (!generatedDownloadUrl) return;
    try {
      const response = await fetch(generatedDownloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = generatedDownloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setStatus(`Download failed: ${error?.message || 'Unable to download generated sample.'}`);
    }
  };

  return (
    <div className="grid" style={{ maxWidth: '1250px', margin: '0 auto', gap: '16px' }}>
      {/* Drum Type Selector */}
      <div className="card" style={{ zIndex: 1, padding: '18px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '21px', fontWeight: '700' }}>Model Testing (V18 Acoustic)</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '220px' }}>
              <label className="label">Drum Type</label>
              <select className="input" value={drumType} onChange={(e) => setDrumType(e.target.value)} style={{ cursor: 'pointer' }}>
                {DRUM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div className="text-secondary" style={{ fontSize: '12px' }}>
              Sample {sampleIndex + 1} / {sampleQueue.length || '-'}
            </div>
          </div>
        </div>

        {/* Two columns: Original left, Generated right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* LEFT: Original DB sample */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px' }}>Original Database Sample</h3>
            {sourceAudioUrl ? (
              <WaveformAudioPlayer src={sourceAudioUrl} />
            ) : (
              <div className="text-secondary">No sample loaded</div>
            )}
            {selectedSample && (
              <div className="text-secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
                {selectedSample.kind || '-'} | {selectedSample.filename}
              </div>
            )}
            <details style={{ marginTop: '10px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Show Source JSON</summary>
              <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {JSON.stringify(selectedSample?.source_json_for_model || selectedSample?.raw_sample || {}, null, 2)}
              </pre>
            </details>
          </div>

          {/* RIGHT: Generated sample */}
          <div className="card" style={{ padding: '16px' }}>
            <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px' }}>Generated Sample (V18 Acoustic)</h3>
            {generatedAudioUrl ? (
              <WaveformAudioPlayer src={generatedAudioUrl} autoPlayOnSrcChange />
            ) : (
              <div className="text-secondary">{generating ? 'Generating audio...' : 'Generate audio to preview it here.'}</div>
            )}
            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => generateCurrent()} disabled={generating || !selectedSample || schemaLoading}>
                {generating ? 'Generating...' : 'Regenerate'}
              </button>
              <button
                className="btn btn-secondary"
                title="Download generated WAV"
                aria-label="Download generated WAV"
                type="button"
                onClick={handleDownloadGenerated}
                style={{
                  minWidth: '40px',
                  width: '40px',
                  padding: '0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: generatedDownloadUrl ? 1 : 0.5,
                }}
                disabled={!generatedDownloadUrl}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 4v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 10l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 18h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div style={{ marginTop: '16px', display: 'grid', gap: '12px', justifyItems: 'center' }}>
          <label className="label" style={{ textAlign: 'center' }}>Generation Score</label>
          <div
            ref={scoreRef}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
          >
            <button className="btn btn-secondary" onClick={() => handleScoreArrow(-1)} type="button" aria-label="Decrease score">
              ←
            </button>
            <div
              onMouseDown={handleScoreDragStart}
              onDoubleClick={handleScoreDoubleClick}
              title="Drag left/right to adjust, or double-click to type"
              style={{
                minWidth: '130px',
                height: '42px',
                display: 'grid',
                placeItems: 'center',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                background: 'var(--secondary-bg)',
                cursor: scoreEditing ? 'text' : 'ew-resize',
                fontWeight: 700,
              }}
            >
              {scoreEditing ? (
                <input
                  autoFocus
                  type="text"
                  value={scoreText}
                  onChange={(e) => setScoreText(e.target.value)}
                  onBlur={commitScoreText}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitScoreText();
                    if (e.key === 'Escape') {
                      setScoreText(String(score));
                      setScoreEditing(false);
                    }
                  }}
                  className="input"
                  style={{ width: '96px', textAlign: 'center', height: '30px', padding: '4px 8px' }}
                />
              ) : (
                <span>{score} / 100</span>
              )}
            </div>
            <button className="btn btn-secondary" onClick={() => handleScoreArrow(1)} type="button" aria-label="Increase score">
              →
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' }}>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={loading || generating || !generatedData}
              style={{ minWidth: '170px' }}
            >
              Submit Score
            </button>
            <button className="btn btn-secondary" onClick={advanceToNextSample} disabled={loading || generating}>
              Skip Sample
            </button>
          </div>
          <div style={{ width: '100%' }}>
            <label className="label">Notes (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Add notes about the generated sample..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>

        {/* Advanced Model Controls - expandable panel with full Model Beta UI */}
        <details style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Advanced Model Controls (inspect / tweak tags)</summary>

          {schemaLoading && (
            <div className="text-secondary" style={{ marginTop: '8px' }}>Loading model schema...</div>
          )}
          {schemaError && (
            <div className="text-error" style={{ marginTop: '8px' }}>{schemaError}</div>
          )}

          {!schemaLoading && !schemaError && (
            <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary" onClick={handleClearSelections} disabled={generating}>
                  Clear All
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Any tweak auto-regenerates immediately
                </span>
              </div>

              {/* Core Controls */}
              <details open style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Core Controls</summary>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
                  <div>
                    <label className="label">Temperature</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range" min="0" max="10" step="0.1"
                        value={temperature}
                        className="modern-slider"
                        onChange={(e) => {
                          const nextTemperature = Number(e.target.value);
                          temperatureRef.current = nextTemperature;
                          setTemperature(nextTemperature);
                          generateCurrent({ temperature: nextTemperature });
                        }}
                      />
                      <span className="text-secondary" style={{ minWidth: '44px' }}>{temperature.toFixed(1)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="label">Stereo Width</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="range" min="0" max="1" step="0.01"
                        value={width}
                        className="modern-slider modern-slider-secondary"
                        onChange={(e) => {
                          const nextWidth = Number(e.target.value);
                          widthRef.current = nextWidth;
                          setWidth(nextWidth);
                          generateCurrent({ width: nextWidth });
                        }}
                      />
                      <span className="text-secondary" style={{ minWidth: '44px' }}>{width.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </details>

              {/* Conditioning Sliders */}
              <details open style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Conditioning Sliders</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {conditioningParams.map((name) => (
                    <div key={name} style={{ textAlign: 'center' }}>
                      <div className="label" style={{ fontSize: '12px' }}>{name}</div>
                      <input
                        type="range" min="-1" max="1" step="0.01"
                        value={sliders[name] ?? 0}
                        className="modern-slider"
                        onChange={(e) => handleSliderChange(name, e.target.value)}
                      />
                      <div className="text-secondary" style={{ fontSize: '11px', marginTop: '4px' }}>
                        {(sliders[name] ?? 0).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </details>

              {/* Label Metadata */}
              <details open style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
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
                          {getSortedMultiOptions(key, options).map((option) => (
                            <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
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
                          <option value="">(not set)</option>
                          {options.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </details>

              <details style={{ border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Current Model Payload JSON</summary>
                <pre style={{ marginTop: '10px', whiteSpace: 'pre-wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {JSON.stringify(
                    {
                      tags: buildRequestTags(labels),
                      sliders,
                      temperature,
                      width,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>
          )}
        </details>
      </div>

      {/* Status */}
      {status && (
        <div
          className="card status-message-fade"
          style={{
            background: status.startsWith('Generated') || status.startsWith('Result')
              ? 'rgba(52, 211, 153, 0.1)' : status.startsWith('Error') || status.startsWith('Generation failed')
              ? 'rgba(248, 113, 113, 0.15)' : 'var(--secondary-bg)',
            border: status.startsWith('Generated') || status.startsWith('Result')
              ? '1px solid var(--success-color)' : status.startsWith('Error') || status.startsWith('Generation failed')
              ? '1px solid var(--error-color)' : '1px solid var(--border-color)',
          }}
        >
          <p style={{
            color: status.startsWith('Generated') || status.startsWith('Result')
              ? 'var(--success-color)' : status.startsWith('Error') || status.startsWith('Generation failed')
              ? 'var(--error-color)' : 'var(--text-secondary)',
          }}>
            {status}
          </p>
        </div>
      )}
    </div>
  );
}
