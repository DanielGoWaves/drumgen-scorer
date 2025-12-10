import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../services/api';
import PromptDisplay from '../components/PromptDisplay';
import AudioPlayer from '../components/AudioPlayer';
import ScoringSliders from '../components/ScoringSliders';
import DifficultySlider from '../components/DifficultySlider';
import JsonViewer from '../components/JsonViewer';
import { DRUM_KINDS_BY_MODEL, kindToDrumType } from '../data/drumKindsByModel';

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
  const [llmResponse, setLlmResponse] = useState(() => getInitialState('llmResponse', null));
  const [audioUrl, setAudioUrl] = useState(() => getInitialState('audioUrl', ''));
  const [status, setStatus] = useState('');
  const [scores, setScores] = useState(() => getInitialState('scores', { audio_quality_score: null, llm_accuracy_score: null }));
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [freeTextMode, setFreeTextMode] = useState(() => getInitialState('freeTextMode', false));
  const [freeText, setFreeText] = useState(() => getInitialState('freeText', ''));
  const [modelVersion, setModelVersion] = useState(() => getInitialState('modelVersion', 'v12'));
  
  // Free text metadata - user fills these in after generation
  const [freeTextMetadata, setFreeTextMetadata] = useState(() => getInitialState('freeTextMetadata', {
    drum_type: '',
    difficulty: null
  }));
  const [difficultyError, setDifficultyError] = useState(false);
  const [drumTypeError, setDrumTypeError] = useState(false);
  const [freeTextError, setFreeTextError] = useState(false);
  const [generationScoreError, setGenerationScoreError] = useState(false);
  const [llmScoreError, setLlmScoreError] = useState(false);
  
  // Edit/Delete prompt state
  const [editMode, setEditMode] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [promptWasEdited, setPromptWasEdited] = useState(false);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('testingPage_currentPrompt', JSON.stringify(currentPrompt));
  }, [currentPrompt]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_llmJson', JSON.stringify(llmJson));
  }, [llmJson]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_llmResponse', JSON.stringify(llmResponse));
  }, [llmResponse]);
  
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
  
  // Reset promptWasEdited when loading a new prompt
  useEffect(() => {
    if (currentPrompt) {
      setPromptWasEdited(false);
      setEditMode(false);
    }
  }, [currentPrompt?.id]);
  
  // Load initial prompt only if no state exists (first load or after refresh)
  useEffect(() => {
    if (!freeTextMode && !currentPrompt && !hasLoadedInitialPrompt.current) {
      loadNextPrompt(true); // Pass true to indicate initial load (start from difficulty 1)
      hasLoadedInitialPrompt.current = true;
    }
  }, []);

  // Auto-select v13 for cymbals, v14 for electric drums, v12 for non-cymbals (unless user manually changed it)
  const [userModifiedVersion, setUserModifiedVersion] = useState(false);
  
  useEffect(() => {
    if (currentPrompt && currentPrompt.drum_type && !userModifiedVersion && !freeTextMode) {
      const cymbalTypes = ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat'];
      const electricDrumTypes = ['clap', 'snap', 'scratch', 'impact']; // Electric drums typically use these
      
      if (cymbalTypes.includes(currentPrompt.drum_type.toLowerCase())) {
        setModelVersion('v13');
      } else if (electricDrumTypes.includes(currentPrompt.drum_type.toLowerCase())) {
        setModelVersion('v14');
      } else {
        setModelVersion('v12');
      }
    }
  }, [currentPrompt, userModifiedVersion, freeTextMode]);

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
      setLlmResponse(null);
      setAudioUrl('');
      setScores({ audio_quality_score: null, llm_accuracy_score: null });
      setStatus('');
      setUserModifiedVersion(false); // Reset user modification flag on new prompt
    } catch (err) {
      setStatus(`Error loading prompt: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async () => {
    // Validate free text mode requirements
    if (freeTextMode) {
      // First check if prompt text is empty
      if (!freeText.trim()) {
        setFreeTextError(true);
        setTimeout(() => {
          setFreeTextError(false);
        }, 2400);
        return;
      }
      
      // Only check difficulty (drum type is now automated)
      const hasDifficulty = freeTextMetadata.difficulty !== null && freeTextMetadata.difficulty !== undefined;
      
      if (!hasDifficulty) {
        // Only difficulty missing
        setDifficultyError(true);
        setTimeout(() => {
          setDifficultyError(false);
        }, 2400);
        return;
      }
    }
    
    setStatus('Sending prompt to DrumGen...');
    setLoading(true);
    try {
      const payload = freeTextMode 
        ? { text: freeText, model_version: modelVersion } 
        : { prompt_id: currentPrompt.id, model_version: modelVersion };
      
      const { data } = await api.post('/api/test/send-prompt', payload);
      setLlmJson(data.llm_controls);
      setLlmResponse(data.llm_response || null);
      // Construct full audio URL using API base (for network access)
      setAudioUrl(data.audio_url ? `${API_BASE_URL}${data.audio_url}` : '');
      
      // Auto-extract drum type from LLM response for free text mode
      if (freeTextMode && data.drum_type) {
        setFreeTextMetadata({ ...freeTextMetadata, drum_type: data.drum_type });
      }
      
      // Clear errors on successful send
      setDifficultyError(false);
      setDrumTypeError(false);
      setFreeTextError(false);
      
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
    
    // Note: Drum type is now automated from LLM response, difficulty is still required
    if (freeTextMode && (freeTextMetadata.difficulty === null || freeTextMetadata.difficulty === undefined)) {
      setStatus('Please set the difficulty before submitting.');
      return;
    }
    
    // Ensure drum type is set (should be auto-extracted, but check as safety)
    if (freeTextMode && !freeTextMetadata.drum_type) {
      setStatus('Drum type could not be extracted. Please try generating again.');
      return;
    }
    
    // Check that both scores are set
    let hasError = false;
    if (scores.audio_quality_score === null || scores.audio_quality_score === undefined) {
      setGenerationScoreError(true);
      hasError = true;
      setTimeout(() => {
        setGenerationScoreError(false);
      }, 2000);
    }
    
    if (scores.llm_accuracy_score === null || scores.llm_accuracy_score === undefined) {
      setLlmScoreError(true);
      hasError = true;
      setTimeout(() => {
        setLlmScoreError(false);
      }, 2000);
    }
    
    if (hasError) {
      return;
    }
    
    setSubmitting(true);
    setStatus('Submitting score...');
    try {
      const audioId = audioUrl?.split('/').pop() || null;
      
      // Extract kind from LLM response
      const llmKind = extractKindFromLLM(llmJson);
      
      // For database prompts: validate/update kind
      if (!freeTextMode && currentPrompt) {
        // If prompt was edited, always use LLM kind and update prompt
        if (promptWasEdited && llmKind) {
          // Update prompt's drum_type to match LLM kind
          try {
            await api.put(`/api/prompts/${currentPrompt.id}`, {
              text: currentPrompt.text,
              difficulty: currentPrompt.difficulty,
              drum_type: llmKind.toLowerCase().replace(/\s+/g, '_'),
              category: currentPrompt.category,
              is_user_generated: currentPrompt.is_user_generated,
              expected_parameters: currentPrompt.expected_parameters,
            });
            // Reload prompt to get updated drum_type
            const { data } = await api.get(`/api/prompts/${currentPrompt.id}`);
            setCurrentPrompt(data);
          } catch (err) {
            console.error('Failed to update prompt drum_type:', err);
          }
        } else if (llmKind && currentPrompt.drum_type) {
          // Check if LLM kind matches prompt drum_type
          const normalizedLLMKind = llmKind.toLowerCase().replace(/\s+/g, '_');
          const normalizedPromptKind = (currentPrompt.drum_type || '').toLowerCase().replace(/\s+/g, '_');
          
          if (normalizedLLMKind !== normalizedPromptKind) {
            // Kind doesn't match - update prompt to use LLM kind
            try {
              await api.put(`/api/prompts/${currentPrompt.id}`, {
                text: currentPrompt.text,
                difficulty: currentPrompt.difficulty,
                drum_type: normalizedLLMKind,
                category: currentPrompt.category,
                is_user_generated: currentPrompt.is_user_generated,
                expected_parameters: currentPrompt.expected_parameters,
              });
              // Reload prompt to get updated drum_type
              const { data } = await api.get(`/api/prompts/${currentPrompt.id}`);
              setCurrentPrompt(data);
              // Note: Status will be updated after score submission
            } catch (err) {
              console.error('Failed to update prompt drum_type:', err);
            }
          }
        }
      }
      
      const payload = {
        ...scores,
        generated_json: llmJson,
        llm_response: llmResponse,
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
      
      // Show appropriate success message
      if (promptWasEdited) {
        setStatus('✓ Score saved! Prompt kind updated from LLM response.');
      } else if (llmKind && currentPrompt && currentPrompt.drum_type) {
        const normalizedLLMKind = llmKind.toLowerCase().replace(/\s+/g, '_');
        const normalizedPromptKind = (currentPrompt.drum_type || '').toLowerCase().replace(/\s+/g, '_');
        if (normalizedLLMKind !== normalizedPromptKind) {
          setStatus('✓ Score saved! Prompt kind was updated to match LLM response.');
        } else {
          setStatus('✓ Score saved!');
        }
      } else {
        setStatus('✓ Score saved!');
      }
      
      // Auto-fade success message after 3 seconds
      setTimeout(() => {
        setStatus('');
      }, 3000);
      
      // Reset promptWasEdited flag after successful submission
      setPromptWasEdited(false);
      
      // Load next prompt after a brief delay
      if (!freeTextMode) {
        setTimeout(() => {
          setSubmitting(false);
          loadNextPrompt();
        }, 1000);
      } else {
        setLlmJson(null);
        setLlmResponse(null);
        setAudioUrl('');
        setScores({ audio_quality_score: null, llm_accuracy_score: null });
        setFreeText('');
        setFreeTextMetadata({ drum_type: '', difficulty: null });
        setSubmitting(false);
      }
    } catch (err) {
      setStatus(`Error: ${err?.response?.data?.detail || err.message}`);
      setSubmitting(false);
    }
  };

  const toggleMode = () => {
    const newMode = !freeTextMode;
    setFreeTextMode(newMode);
    setLlmJson(null);
    setLlmResponse(null);
    setAudioUrl('');
    setStatus('');
    
    // Unlock model version when switching to free text mode
    if (newMode) {
      setUserModifiedVersion(false);
    }
  };
  
  // Get available drum kinds based on selected model version
  const getAvailableKinds = () => {
    return DRUM_KINDS_BY_MODEL[modelVersion] || DRUM_KINDS_BY_MODEL.v12;
  };

  const handleEditPrompt = () => {
    if (!currentPrompt) return;
    setEditedPromptText(currentPrompt.text);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    if (!currentPrompt) return;
    
    // Validate
    if (!editedPromptText.trim()) {
      setStatus('Error: Prompt text cannot be empty');
      return;
    }

    setLoading(true);
    setStatus('Updating prompt...');
    try {
      await api.put(`/api/prompts/${currentPrompt.id}`, {
        text: editedPromptText.trim(),
        difficulty: currentPrompt.difficulty,
        drum_type: currentPrompt.drum_type,
        category: currentPrompt.category,
        is_user_generated: currentPrompt.is_user_generated,
        expected_parameters: currentPrompt.expected_parameters,
      });
      
      // Reload the current prompt to get updated data
      const { data } = await api.get(`/api/prompts/${currentPrompt.id}`);
      setCurrentPrompt(data);
      setEditMode(false);
      setEditedPromptText('');
      setPromptWasEdited(true); // Mark that prompt was edited
      setStatus('✓ Prompt updated! Kind will be pulled from LLM response.');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(`Error updating prompt: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!currentPrompt) return;
    
    setLoading(true);
    setStatus('Deleting prompt...');
    try {
      await api.delete(`/api/prompts/${currentPrompt.id}`);
      setShowDeleteConfirm(false);
      setStatus('✓ Prompt deleted successfully!');
      
      // Load next prompt after deletion
      setTimeout(() => {
        setStatus('');
        loadNextPrompt();
      }, 1000);
    } catch (err) {
      setStatus(`Error deleting prompt: ${err?.response?.data?.detail || err.message}`);
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedPromptText('');
  };

  // Extract kind from LLM JSON response
  const extractKindFromLLM = (llmJson) => {
    if (!llmJson || typeof llmJson !== 'object') return null;
    
    // Check for "Kind" field (case-insensitive)
    for (const key of ['Kind', 'kind', 'KIND']) {
      if (key in llmJson) {
        return String(llmJson[key]).trim();
      }
    }
    return null;
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
              disabled={currentPrompt && currentPrompt.drum_type && !freeTextMode &&
                (['ride', 'crash', 'china', 'hihat', 'closed hihat', 'open hihat'].includes(currentPrompt.drum_type.toLowerCase()) ||
                 ['clap', 'snap', 'scratch', 'impact'].includes(currentPrompt.drum_type.toLowerCase()))}
            >
              <option value="v11">V11</option>
              <option value="v12">V12</option>
              <option value="v13">V13 (Cymbals Only)</option>
              <option value="v14">V14 (Electronic)</option>
            </select>
            {currentPrompt && currentPrompt.drum_type && !freeTextMode && 
             ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat'].includes(currentPrompt.drum_type.toLowerCase()) && (
              <span className="text-secondary" style={{ fontSize: '13px' }}>
                ℹ️ Auto-selected V13 for cymbal
              </span>
            )}
            {currentPrompt && currentPrompt.drum_type && !freeTextMode && 
             ['clap', 'snap', 'scratch', 'impact'].includes(currentPrompt.drum_type.toLowerCase()) && (
              <span className="text-secondary" style={{ fontSize: '13px' }}>
                ℹ️ Auto-selected V14 for electric drum
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Display */}
      <div className="card" style={{ zIndex: 1 }}>
        {freeTextMode ? (
          <div style={{ zIndex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', alignItems: 'start' }}>
              {/* Left: Prompt Input - Wider */}
              <div>
                <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Enter your prompt:</label>
                <textarea
                  value={freeText}
                  onChange={(e) => {
                    setFreeText(e.target.value);
                    setFreeTextError(false);
                  }}
                  placeholder={modelVersion === 'v14' 
                    ? "Describe the electric drum sound you want... (e.g., 'punchy 808 kick with reverb', 'crispy snare with vintage character'). Use v14 for electric drums."
                    : modelVersion === 'v13'
                    ? "Describe the cymbal sound you want... (Tip: Use V13 for cymbals)"
                    : "Describe the drum sound you want... (Tip: Switch to V13 for cymbals, V14 for electric drums)"}
                  rows={6}
                  className={`input ${freeTextError ? 'flash-error-active' : ''}`}
                  style={{ 
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    zIndex: 1,
                    width: '100%',
                    minHeight: '140px',
                    ...(freeTextError ? {
                      borderColor: 'var(--secondary-color)',
                      borderWidth: '2px',
                      backgroundColor: 'rgba(199, 155, 255, 0.08)'
                    } : {})
                  }}
                />
              </div>
              
              {/* Right: Difficulty Only */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch', paddingTop: '28px' }}>
                {/* Difficulty */}
                <div style={{ zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label className="label" style={{ margin: 0, minWidth: '85px', fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>
                      Difficulty:
                    </label>
                    <div style={{ flex: 1 }}>
                      <DifficultySlider 
                        value={freeTextMetadata.difficulty}
                        onChange={(value) => {
                          setFreeTextMetadata({ ...freeTextMetadata, difficulty: value });
                          setDifficultyError(false);
                        }}
                        showError={difficultyError}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          currentPrompt && (
            <div style={{ zIndex: 1 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="label">Current Prompt:</label>
                  <span className="text-secondary" style={{ fontSize: '13px', marginLeft: '12px' }}>
                    Difficulty: {currentPrompt.difficulty}/10 | Category: {currentPrompt.category || 'N/A'} | Drum: {currentPrompt.drum_type || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleEditPrompt}
                    className="btn btn-secondary"
                    disabled={loading || editMode}
                    style={{ zIndex: 1, fontSize: '13px', padding: '6px 12px' }}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="btn btn-secondary"
                    disabled={loading || editMode}
                    style={{ zIndex: 1, fontSize: '13px', padding: '6px 12px', background: 'var(--error-color)', borderColor: 'var(--error-color)' }}
                  >
                    🗑️ Delete
                  </button>
                  <button 
                    onClick={() => loadNextPrompt()} 
                    className="btn btn-secondary"
                    disabled={loading || editMode}
                    style={{ zIndex: 1 }}
                  >
                    ⏭️ Next Prompt
                  </button>
                </div>
              </div>
              
              {editMode ? (
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--secondary-bg)', 
                  borderRadius: '8px',
                  border: '2px solid var(--primary-color)',
                  zIndex: 1
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Prompt Text:</label>
                    <textarea
                      value={editedPromptText}
                      onChange={(e) => setEditedPromptText(e.target.value)}
                      rows={4}
                      className="input"
                      style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                  
                  <div style={{ 
                    padding: '12px', 
                    background: 'rgba(199, 155, 255, 0.1)', 
                    borderRadius: '6px',
                    marginBottom: '16px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)'
                  }}>
                    ℹ️ Only the prompt text can be edited. Kind will be automatically updated from the LLM response when you submit results.
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button 
                      onClick={handleCancelEdit}
                      className="btn btn-secondary"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>
          )
        )}

        <button 
          onClick={sendPrompt} 
          disabled={loading || (!freeTextMode && !currentPrompt)}
          className="btn btn-primary"
          style={{ marginTop: '16px', width: '100%', justifyContent: 'center', zIndex: 1 }}
        >
          {loading ? '⏳ Generating...' : 'Generate'}
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
                  <ScoringSliders 
                    scores={scores} 
                    onChange={(newScores) => {
                      setScores(newScores);
                      // Clear errors when user sets scores
                      if (newScores.audio_quality_score !== null && newScores.audio_quality_score !== undefined) {
                        setGenerationScoreError(false);
                      }
                      if (newScores.llm_accuracy_score !== null && newScores.llm_accuracy_score !== undefined) {
                        setLlmScoreError(false);
                      }
                    }}
                    generationError={generationScoreError}
                    llmError={llmScoreError}
                  />
                </div>
              </div>

              {/* Submit Button - Centered Below */}
              <div style={{ maxWidth: '400px', margin: '0 auto' }}>
                <button 
                  onClick={submitScoreAndNext} 
                  disabled={loading || submitting}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="card"
            style={{ 
              maxWidth: '500px',
              width: '100%',
              zIndex: 2001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              Delete Prompt?
            </h3>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this prompt? This action cannot be undone and will affect all results associated with this prompt.
            </p>
            {currentPrompt && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--secondary-bg)', 
                borderRadius: '6px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                <strong>Prompt:</strong> {currentPrompt.text.substring(0, 100)}{currentPrompt.text.length > 100 ? '...' : ''}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                onClick={handleDeletePrompt}
                className="btn btn-secondary"
                disabled={loading}
                style={{ 
                  background: 'var(--error-color)', 
                  borderColor: 'var(--error-color)',
                  color: '#fff'
                }}
              >
                {loading ? 'Deleting...' : 'Delete Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {status && (
        <div 
          className="card status-message-fade" 
          style={{ 
            background: status.startsWith('✓') ? 'rgba(52, 211, 153, 0.1)' : 
                       (status.startsWith('Error') || status.startsWith('⚠️')) ? 'rgba(248, 113, 113, 0.15)' : 
                       'var(--secondary-bg)',
            border: status.startsWith('✓') ? '1px solid var(--success-color)' : 
                    (status.startsWith('Error') || status.startsWith('⚠️')) ? '1px solid var(--error-color)' : 
                    '1px solid var(--border-color)',
            zIndex: 1
          }}
        >
          <p style={{ 
            color: status.startsWith('✓') ? 'var(--success-color)' : 
                   (status.startsWith('Error') || status.startsWith('⚠️')) ? 'var(--error-color)' : 
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
