import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import PromptDisplay from '../components/PromptDisplay';
import AudioPlayer from '../components/AudioPlayer';
import ScoringSliders from '../components/ScoringSliders';
import JsonViewer from '../components/JsonViewer';

export default function TestingPage() {
  // Detect if this is a page refresh (reload) vs navigation
  const isPageRefresh = useRef(false);
  
  useEffect(() => {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      isPageRefresh.current = navEntries[0].type === 'reload';
    }
  }, []);

  // Helper to get state from sessionStorage (only if not a refresh)
  const getInitialState = (key, defaultValue) => {
    if (isPageRefresh.current) {
      return defaultValue;
    }
    try {
      const saved = sessionStorage.getItem(`testingPage_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [currentPrompt, setCurrentPrompt] = useState(() => getInitialState('currentPrompt', null));
  const [llmJson, setLlmJson] = useState(() => getInitialState('llmJson', null));
  const [audioUrl, setAudioUrl] = useState(() => getInitialState('audioUrl', ''));
  const [status, setStatus] = useState('');
  const [scores, setScores] = useState(() => getInitialState('scores', { audio_quality_score: 5, llm_accuracy_score: 5 }));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [freeTextMode, setFreeTextMode] = useState(() => getInitialState('freeTextMode', false));
  const [freeText, setFreeText] = useState(() => getInitialState('freeText', ''));
  const [modelVersion, setModelVersion] = useState(() => getInitialState('modelVersion', 'v12'));
  
  // Free text metadata - user fills these in after generation
  const [freeTextMetadata, setFreeTextMetadata] = useState(() => getInitialState('freeTextMetadata', {
    drum_type: '',
    difficulty: 5
  }));

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('testingPage_currentPrompt', JSON.stringify(currentPrompt));
  }, [currentPrompt]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_llmJson', JSON.stringify(llmJson));
  }, [llmJson]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_audioUrl', JSON.stringify(audioUrl));
  }, [audioUrl]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_scores', JSON.stringify(scores));
  }, [scores]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_freeTextMode', JSON.stringify(freeTextMode));
  }, [freeTextMode]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_freeText', JSON.stringify(freeText));
  }, [freeText]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_modelVersion', JSON.stringify(modelVersion));
  }, [modelVersion]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_freeTextMetadata', JSON.stringify(freeTextMetadata));
  }, [freeTextMetadata]);

  // Track if we've loaded the initial prompt (only once per component lifecycle)
  const hasLoadedInitialPrompt = useRef(false);
  
  // Load initial prompt only if no state exists (first load or after refresh)
  useEffect(() => {
    if (!freeTextMode && !currentPrompt && !hasLoadedInitialPrompt.current) {
      loadNextPrompt(true); // Pass true to indicate initial load (start from difficulty 1)
      hasLoadedInitialPrompt.current = true;
    }
  }, []);

  // Auto-select v13 for cymbals, v12 for non-cymbals (unless user manually changed it)
  const [userModifiedVersion, setUserModifiedVersion] = useState(false);
  
  useEffect(() => {
    if (currentPrompt && currentPrompt.drum_type && !userModifiedVersion) {
      const cymbalTypes = ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat'];
      if (cymbalTypes.includes(currentPrompt.drum_type.toLowerCase())) {
        setModelVersion('v13');
      } else {
        setModelVersion('v12');
      }
    }
  }, [currentPrompt, userModifiedVersion]);

  const loadNextPrompt = async (isInitialLoad = false) => {
    setStatus('Loading next prompt...');
    setLoading(true);
    try {
      // Pass current position for batch rotation (difficulty 1-10 per drum type)
      const params = {};
      
      if (isInitialLoad === true) {
        // On initial load, always start from difficulty 1
        params.start_from_beginning = true;
      } else if (currentPrompt) {
        // On subsequent loads, continue the rotation
        params.current_drum_type = currentPrompt.drum_type;
        params.current_difficulty = currentPrompt.difficulty;
        params.exclude_id = currentPrompt.id;
      }
      
      const { data } = await api.get('/api/prompts/next-in-rotation', { params });
      setCurrentPrompt(data);
      setLlmJson(null);
      setAudioUrl('');
      setScores({ audio_quality_score: 5, llm_accuracy_score: 5 });
      setStatus('');
      setUserModifiedVersion(false); // Reset user modification flag on new prompt
    } catch (err) {
      setStatus(`Error loading prompt: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async () => {
    setStatus('Sending prompt to DrumGen...');
    setLoading(true);
    try {
      const payload = freeTextMode 
        ? { text: freeText, model_version: modelVersion } 
        : { prompt_id: currentPrompt.id, model_version: modelVersion };
      
      const { data } = await api.post('/api/test/send-prompt', payload);
      setLlmJson(data.llm_controls);
      setAudioUrl(data.audio_url);
      
      // For free text, extract drum type from LLM response as suggestion
      if (freeTextMode && data.llm_controls && data.llm_controls.Kind) {
        setFreeTextMetadata({
          ...freeTextMetadata,
          drum_type: data.llm_controls.Kind
        });
      }
      
      setStatus('✓ Received JSON and audio from DrumGen');
      
      // Auto-fade success message after 2 seconds
      setTimeout(() => {
        setStatus('');
      }, 2000);
    } catch (err) {
      setStatus(`Error: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const submitScoreAndNext = async () => {
    if (!currentPrompt && !freeTextMode) {
      setStatus('Cannot submit score without prompt.');
      return;
    }
    
    if (freeTextMode && !freeTextMetadata.drum_type) {
      setStatus('Please select a drum type for the free text prompt.');
      return;
    }
    
    setSubmitting(true);
    setStatus('Submitting score...');
    try {
      const audioId = audioUrl?.split('/').pop() || null;
      const payload = {
        ...scores,
        generated_json: llmJson,
        audio_id: audioId,
        audio_file_path: audioId ? `audio_files/${audioId}.wav` : null,
        model_version: modelVersion,
      };
      
      // Add free text metadata if in free text mode
      if (freeTextMode) {
        payload.free_text_prompt = freeText;
        payload.free_text_drum_type = freeTextMetadata.drum_type;
        payload.free_text_difficulty = freeTextMetadata.difficulty;
        payload.free_text_category = 'user-generated';
      } else {
        payload.prompt_id = currentPrompt.id;
      }
      
      await api.post('/api/results/score', payload);
      setStatus('✓ Score saved!');
      
      // Auto-fade success message after 2 seconds
      setTimeout(() => {
        setStatus('');
      }, 2000);
      
      // Load next prompt after a brief delay
      if (!freeTextMode) {
        setTimeout(() => {
          setSubmitting(false);
          loadNextPrompt();
        }, 1000);
      } else {
        setLlmJson(null);
        setAudioUrl('');
        setScores({ audio_quality_score: 5, llm_accuracy_score: 5 });
        setFreeText('');
        setFreeTextMetadata({ drum_type: '', difficulty: 5 });
        setSubmitting(false);
      }
    } catch (err) {
      setStatus(`Error: ${err?.response?.data?.detail || err.message}`);
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    setFreeTextMode(!freeTextMode);
    setLlmJson(null);
    setAudioUrl('');
    setStatus('');
  };

  return (
    <div className="grid" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Mode Toggle & Model Selection */}
      <div className="card" style={{ zIndex: 1 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', zIndex: 1 }}>Testing Mode</h2>
          <button onClick={toggleMode} className="btn btn-secondary" style={{ zIndex: 1 }}>
            {freeTextMode ? '← Database Mode' : '✏️ Free Text Mode'}
          </button>
        </div>
        <div style={{ zIndex: 1 }}>
          <label className="label">Model Version:</label>
          <div className="flex items-center gap-4" style={{ marginTop: '8px' }}>
            <select
              value={modelVersion}
              onChange={(e) => {
                setModelVersion(e.target.value);
                setUserModifiedVersion(true);
              }}
              className="input"
              style={{ maxWidth: '200px', cursor: 'pointer', zIndex: 1 }}
              disabled={currentPrompt && currentPrompt.drum_type && 
                ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat'].includes(currentPrompt.drum_type.toLowerCase())}
            >
              <option value="v11">V11</option>
              <option value="v12">V12 (Latest)</option>
              <option value="v13">V13 (Cymbals Only)</option>
            </select>
            {currentPrompt && currentPrompt.drum_type && 
             ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat'].includes(currentPrompt.drum_type.toLowerCase()) && (
              <span className="text-secondary" style={{ fontSize: '13px' }}>
                ℹ️ Auto-selected V13 for cymbal
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="card" style={{ zIndex: 1 }}>
        {freeTextMode ? (
          <div style={{ zIndex: 1 }}>
            <label className="label">Enter your prompt:</label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Describe the drum sound you want... (Tip: Switch to V13 for cymbals)"
              rows={4}
              className="input"
              style={{ 
                marginTop: '8px', 
                fontFamily: 'inherit',
                resize: 'vertical',
                zIndex: 1 
              }}
            />
          </div>
        ) : (
          currentPrompt && (
            <div style={{ zIndex: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="label">Current Prompt:</label>
                  <span className="text-secondary" style={{ fontSize: '13px', marginLeft: '12px' }}>
                    Difficulty: {currentPrompt.difficulty}/10 | Category: {currentPrompt.category}
                  </span>
                </div>
                <button 
                  onClick={() => loadNextPrompt()} 
                  className="btn btn-secondary"
                  disabled={loading}
                  style={{ zIndex: 1 }}
                >
                  ⏭️ Next Prompt
                </button>
              </div>
              <div style={{ 
                padding: '16px', 
                background: 'var(--secondary-bg)', 
                borderRadius: '8px',
                fontSize: '16px',
                lineHeight: '1.6',
                border: '1px solid var(--border-color)',
                zIndex: 1
              }}>
                {currentPrompt.text}
              </div>
            </div>
          )
        )}

        <button 
          onClick={sendPrompt} 
          disabled={loading || (!freeTextMode && !currentPrompt) || (freeTextMode && !freeText.trim())}
          className="btn btn-primary"
          style={{ marginTop: '16px', width: '100%', justifyContent: 'center', zIndex: 1 }}
        >
          {loading ? '⏳ Generating...' : '🎵 Send to DrumGen'}
        </button>
      </div>

      {/* Results Section - Only show after sending */}
      {(llmJson || audioUrl) && (
        <>
          {/* LLM JSON Output */}
          <div className="card" style={{ zIndex: 1 }}>
            <h3 className="label" style={{ fontSize: '18px', marginBottom: '12px', zIndex: 1 }}>
              LLM Output (JSON)
            </h3>
            <JsonViewer data={llmJson} />
          </div>

          {/* Free Text Metadata - Only in Free Text Mode */}
          {freeTextMode && (
            <div className="card" style={{ zIndex: 1 }}>
              <h3 className="label" style={{ fontSize: '18px', marginBottom: '16px', zIndex: 1 }}>
                Tag Your Prompt
              </h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ zIndex: 1 }}>
                  <label className="label">Drum Type *</label>
                  <select
                    value={freeTextMetadata.drum_type}
                    onChange={(e) => setFreeTextMetadata({ ...freeTextMetadata, drum_type: e.target.value })}
                    className="input"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Select drum type...</option>
                    <option value="kick">Kick</option>
                    <option value="snare">Snare</option>
                    <option value="hihat">Hihat</option>
                    <option value="closed hihat">Closed Hihat</option>
                    <option value="open hihat">Open Hihat</option>
                    <option value="ride">Ride</option>
                    <option value="crash">Crash</option>
                    <option value="tom">Tom</option>
                    <option value="floor tom">Floor Tom</option>
                    <option value="rack tom">Rack Tom</option>
                    <option value="china">China</option>
                    <option value="splash">Splash</option>
                    <option value="cowbell">Cowbell</option>
                    <option value="tambourine">Tambourine</option>
                    <option value="shaker">Shaker</option>
                    <option value="clap">Clap</option>
                    <option value="snap">Snap</option>
                    <option value="bongo">Bongo</option>
                    <option value="triangle">Triangle</option>
                    <option value="woodblock">Woodblock</option>
                    <option value="cabasa">Cabasa</option>
                    <option value="fx">FX</option>
                    <option value="scratch">Scratch</option>
                    <option value="impact">Impact</option>
                  </select>
                </div>
                <div style={{ zIndex: 1 }}>
                  <label className="label">Difficulty: {freeTextMetadata.difficulty}</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={freeTextMetadata.difficulty}
                    onChange={(e) => setFreeTextMetadata({ ...freeTextMetadata, difficulty: parseInt(e.target.value) })}
                    className="modern-slider"
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>1 (Easy)</span>
                    <span>10 (Hard)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio Player and Scoring - Side by Side or Loading */}
          {submitting ? (
            <div className="submission-loading-container">
              <div className="submission-loading-spinner"></div>
              <p className="submission-loading-text">Saving score...</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '900px', margin: '0 auto' }}>
                {/* Audio Player */}
                <div className="card" style={{ zIndex: 1, padding: '16px' }}>
                  <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px', zIndex: 1 }}>
                    Generated Audio
                  </h3>
                  <AudioPlayer src={audioUrl} />
                </div>

                {/* Scoring */}
                <div className="card" style={{ zIndex: 1, padding: '16px' }}>
                  <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px', zIndex: 1 }}>
                    Score the Results
                  </h3>
                  <ScoringSliders scores={scores} onChange={setScores} />
                </div>
              </div>

              {/* Submit Button - Centered Below */}
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <button 
                  onClick={submitScoreAndNext} 
                  disabled={loading}
                  className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', zIndex: 1 }}
                >
                  {freeTextMode ? 'Submit Score' : 'Submit Score & Next Prompt'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Status Message */}
      {status && (
        <div 
          className="card status-message-fade" 
          style={{ 
            background: status.startsWith('✓') ? 'rgba(52, 211, 153, 0.1)' : 
                       status.startsWith('Error') ? 'rgba(248, 113, 113, 0.1)' : 
                       'var(--secondary-bg)',
            border: status.startsWith('✓') ? '1px solid var(--success-color)' : 
                    status.startsWith('Error') ? '1px solid var(--error-color)' : 
                    '1px solid var(--border-color)',
            zIndex: 1
          }}
        >
          <p style={{ 
            color: status.startsWith('✓') ? 'var(--success-color)' : 
                   status.startsWith('Error') ? 'var(--error-color)' : 
                   'var(--text-secondary)',
            zIndex: 1
          }}>
            {status}
          </p>
        </div>
      )}
    </div>
  );
}
