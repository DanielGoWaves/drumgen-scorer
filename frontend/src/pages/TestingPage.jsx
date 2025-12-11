import React, { useState, useEffect, useRef } from 'react';
import api, { API_BASE_URL } from '../services/api';
import PromptDisplay from '../components/PromptDisplay';
import AudioPlayer from '../components/AudioPlayer';
import SimpleAudioPlayer from '../components/SimpleAudioPlayer';
import ScoringSliders from '../components/ScoringSliders';
import DifficultySlider from '../components/DifficultySlider';
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
  const [llmResponse, setLlmResponse] = useState(() => getInitialState('llmResponse', null));
  const [audioUrl, setAudioUrl] = useState(() => getInitialState('audioUrl', ''));
  const [illugenData, setIllugenData] = useState(() => getInitialState('illugenData', null));
  const [status, setStatus] = useState('');
  const [scores, setScores] = useState(() => getInitialState('scores', { audio_quality_score: null, llm_accuracy_score: null }));
  const [notes, setNotes] = useState(() => getInitialState('notes', ''));
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [noteAudioFile, setNoteAudioFile] = useState(null);
  const [noteAudioPath, setNoteAudioPath] = useState('');
  const [noteAttachments, setNoteAttachments] = useState(() => getInitialState('noteAttachments', []));
  const [noteDragActive, setNoteDragActive] = useState(false);
  const noteFileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [illugenLoading, setIllugenLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [wasGenerating, setWasGenerating] = useState(false);
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
  const [showDifficultyTooltip, setShowDifficultyTooltip] = useState(false);
  const [showIllugenTooltip, setShowIllugenTooltip] = useState(false);
  
  // Edit/Delete prompt state
  const [editMode, setEditMode] = useState(false);
  const [editedPromptText, setEditedPromptText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [promptWasEdited, setPromptWasEdited] = useState(false);
  
  const resetTestingForm = () => {
    [
      'testingPage_llmJson',
      'testingPage_llmResponse',
      'testingPage_audioUrl',
      'testingPage_illugenData',
      'testingPage_scores',
      'testingPage_notes',
      'testingPage_noteAttachments',
      'testingPage_freeText',
      'testingPage_freeTextMetadata',
    ].forEach((key) => sessionStorage.removeItem(key));

    setStatus('');
    setScores({ audio_quality_score: null, llm_accuracy_score: null });
    setNotes('');
    setNotesPanelOpen(false);
    setNoteAudioFile(null);
    setNoteAudioPath('');
    setNoteAttachments([]);
    setNoteDragActive(false);
    setIllugenData(null);
    setAudioUrl('');
    setLlmJson(null);
    setLlmResponse(null);
    setWasGenerating(false);
    setSubmitting(false);
    setIllugenLoading(false);
    setPromptWasEdited(false);
    setGenerationScoreError(false);
    setLlmScoreError(false);
    setDifficultyError(false);
    setDrumTypeError(false);
    setFreeTextError(false);
    if (noteFileInputRef.current) {
      noteFileInputRef.current.value = '';
    }
    if (freeTextMode) {
      setFreeText('');
      setFreeTextMetadata({ drum_type: '', difficulty: null });
    }
  };

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
    sessionStorage.setItem('testingPage_illugenData', JSON.stringify(illugenData));
  }, [illugenData]);
  
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

  useEffect(() => {
    sessionStorage.setItem('testingPage_notes', JSON.stringify(notes));
  }, [notes]);

  // Track when generation completes for letter drop animation
  useEffect(() => {
    if (loading || illugenLoading) {
      setWasGenerating(true);
    } else if (wasGenerating) {
      // Letters will drop, then after animation completes, reset the flag
      const timer = setTimeout(() => setWasGenerating(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [loading, illugenLoading, wasGenerating]);
  
  useEffect(() => {
    sessionStorage.setItem('testingPage_noteAttachments', JSON.stringify(noteAttachments));
  }, [noteAttachments]);

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

  const handleNoteFileSelect = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.wav')) {
      setStatus('Error: Only .wav files are supported for attachments');
      setTimeout(() => setStatus(''), 2000);
      return;
    }
    setNoteAudioFile(file);
    setNoteAudioPath('');
  };

  const handleNoteFileInput = (event) => {
    const file = event.target.files?.[0];
    handleNoteFileSelect(file);
  };

  const resetNotesAndAttachments = () => {
    setNotes('');
    setNoteAudioFile(null);
    setNoteAudioPath('');
    setNoteAttachments([]);
    setNoteDragActive(false);
    if (noteFileInputRef.current) {
      noteFileInputRef.current.value = '';
    }
  };

  const toggleIllugenAttachment = (variation) => {
    setNoteAttachments((prev) => {
      const exists = prev.find((att) => att.type === 'illugen' && att.variation_id === variation.variation_id);
      const order = (variation.order_index ?? 0) + 1;
      if (exists) {
        return prev.filter((att) => !(att.type === 'illugen' && att.variation_id === variation.variation_id));
      }
      return [
        ...prev,
        {
          id: `illugen-${variation.variation_id}`,
          type: 'illugen',
          label: variation.title ? `${variation.title} (${order})` : `Illugen Variation ${order}`,
          request_id: variation.request_id,
          variation_id: variation.variation_id,
          serve_path: variation.serve_path,
          url: variation.url,
        },
      ];
    });
    setNotesPanelOpen(true);
  };

  const uploadNoteAttachment = async () => {
    if (!noteAudioFile) return null;
    const formData = new FormData();
    formData.append('file', noteAudioFile);
    const { data } = await api.post('/api/results/upload-note-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data?.path || null;
  };

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
      setIllugenData(null);
      setScores({ audio_quality_score: null, llm_accuracy_score: null });
      resetNotesAndAttachments();
      setNotesPanelOpen(false);
      setStatus('');
      setUserModifiedVersion(false); // Reset user modification flag on new prompt
    } catch (err) {
      setStatus(`Error loading prompt: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRandomPrompt = async () => {
    setStatus('Loading random prompt...');
    setLoading(true);
    try {
      const params = {};
      if (currentPrompt) {
        params.exclude_id = currentPrompt.id;
      }
      
      const { data } = await api.get('/api/prompts/random', { params });
      setCurrentPrompt(data);
      setLlmJson(null);
      setLlmResponse(null);
      setAudioUrl('');
      setIllugenData(null);
      setScores({ audio_quality_score: null, llm_accuracy_score: null });
      resetNotesAndAttachments();
      setNotesPanelOpen(false);
      setStatus('');
      setUserModifiedVersion(false); // Reset user modification flag on new prompt
      // Model version logic will be handled by the useEffect that watches currentPrompt
    } catch (err) {
      setStatus(`Error loading random prompt: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async (withIllugen = false) => {
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
    
    setStatus(withIllugen ? 'Sending prompt to DrumGen + Illugen...' : 'Sending prompt to DrumGen...');
    setLoading(true);
    setIllugenLoading(withIllugen);
    try {
      const payload = freeTextMode 
        ? { text: freeText, model_version: modelVersion } 
        : { prompt_id: currentPrompt.id, model_version: modelVersion };
      if (withIllugen) {
        payload.illugen = true;
        payload.illugen_sfx_type = 'one-shot';
      }
      
      const { data } = await api.post('/api/test/send-prompt', payload);
      setLlmJson(data.llm_controls);
      setLlmResponse(data.llm_response || null);
      // Construct full audio URL using API base (for network access)
      setAudioUrl(data.audio_url ? `${API_BASE_URL}${data.audio_url}` : '');
      setNoteAttachments([]);
      setNoteAudioFile(null);
      setNoteAudioPath('');

      if (withIllugen) {
        const mappedVariations = (data.illugen_variations || []).map((v, idx) => ({
          ...v,
          request_id: v.request_id || (v.serve_path ? v.serve_path.split('/')?.[3] : undefined),
          order_index: v.order_index ?? idx,
          url: v.serve_path ? `${API_BASE_URL}${v.serve_path}` : v.url,
        }));
        setIllugenData({
          generationId: data.illugen_generation_id || null,
          variations: mappedVariations,
          error: data.illugen_error || null,
        });
        if (data.illugen_error) {
          setStatus(`⚠️ Illugen error: ${data.illugen_error}`);
        } else if (!mappedVariations.length) {
          setStatus('⚠️ Illugen returned no samples');
        } else {
          setStatus('✓ Received DrumGen + Illugen results');
        }
      } else {
        setIllugenData(null);
        setStatus('✓ Received JSON and audio from DrumGen');
      }
      // Auto-extract drum type from LLM response for free text mode
      if (freeTextMode && data.drum_type) {
        setFreeTextMetadata({ ...freeTextMetadata, drum_type: data.drum_type });
      }
      
      // Clear errors on successful send
      setDifficultyError(false);
      setDrumTypeError(false);
      setFreeTextError(false);
    } catch (err) {
      // Handle 502 Bad Gateway errors (upstream service issues) with better messaging
      if (err?.response?.status === 502) {
        const detail = err?.response?.data?.detail || 'The DrumGen service is temporarily unavailable.';
        setStatus(`⚠️ ${detail} Please try again in a moment.`);
      } else {
        // Other errors (network, validation, etc.)
        setStatus(`Error: ${err?.response?.data?.detail || err.message || 'An unexpected error occurred'}`);
      }
    } finally {
      setLoading(false);
      setIllugenLoading(false);
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
      let notesAudioPathValue = noteAudioPath || null;
      let attachmentsPayload = [...noteAttachments];
      if (noteAudioFile) {
        try {
          const uploadedPath = await uploadNoteAttachment();
          notesAudioPathValue = uploadedPath;
          attachmentsPayload = [
            ...attachmentsPayload,
            {
              id: `upload-${Date.now()}`,
              type: 'upload',
              label: noteAudioFile.name,
              serve_path: uploadedPath,
              url: uploadedPath ? `${API_BASE_URL}${uploadedPath}` : '',
            },
          ];
        } catch (err) {
          setStatus(`Error uploading note audio: ${err?.response?.data?.detail || err.message}`);
          setSubmitting(false);
          setLoading(false);
          return;
        }
      } else if (noteAudioPath) {
        attachmentsPayload = [
          ...attachmentsPayload,
          {
            id: 'upload-existing',
            type: 'upload',
            label: 'Note attachment',
            serve_path: noteAudioPath,
            url: `${API_BASE_URL}${noteAudioPath}`,
          },
        ];
      }

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
        notes: notes.trim() || null,
        notes_audio_path: notesAudioPathValue,
        illugen_generation_id: illugenData?.generationId || null,
        illugen_attachments: attachmentsPayload.length ? { items: attachmentsPayload } : null,
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
      setNoteAudioFile(null);
      setNoteAudioPath('');
      setNoteAttachments([]);
      setIllugenData(null);
      setNoteDragActive(false);
      if (noteFileInputRef.current) {
        noteFileInputRef.current.value = '';
      }
      
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
        setNotes('');
        setNotesPanelOpen(false);
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', zIndex: 1 }}>
            <button
              onClick={resetTestingForm}
              className="btn btn-secondary"
              style={{ zIndex: 1, background: 'var(--secondary-bg)', border: '1px solid var(--border-color)' }}
              title="Reset form fields and attachments"
            >
              Reset
            </button>
            <button onClick={toggleMode} className="btn btn-secondary" style={{ zIndex: 1 }}>
              {freeTextMode ? '← Database Mode' : '✏️ Free Text Mode'}
            </button>
          </div>
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
                <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
                  {(loading || illugenLoading) ? 'Your prompt:' : 'Enter your prompt:'}
                </label>
                {(loading || illugenLoading || wasGenerating) ? (
                  <div style={{ 
                    padding: '16px', 
                    background: 'var(--secondary-bg)', 
                    borderRadius: '8px',
                    fontSize: '16px',
                    lineHeight: '1.6',
                    border: '1px solid var(--border-color)',
                    zIndex: 1,
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    paddingTop: '16px'
                  }}>
                    {(loading || illugenLoading) && freeText ? (
                      <span>
                        {freeText.split('').map((char, index) => (
                          <span
                            key={index}
                            style={{
                              display: 'inline-block',
                              animation: `floatUp 3s ease-in-out infinite`,
                              animationDelay: `${index * 0.05}s`,
                              whiteSpace: char === ' ' ? 'pre' : 'normal',
                              ...(illugenLoading ? {
                                background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 30%, #ff6b9d 60%, #ffd93d 100%)',
                                backgroundSize: '300% 300%',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                animation: `floatUp 3s ease-in-out infinite, shimmer 3s ease-in-out infinite`,
                                animationDelay: `${index * 0.05}s, 0s`
                              } : {})
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    ) : wasGenerating && freeText ? (
                      <span>
                        {freeText.split('').map((char, index) => (
                          <span
                            key={index}
                            style={{
                              display: 'inline-block',
                              animation: `dropDown 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
                              animationDelay: `${index * 0.02}s`,
                              animationFillMode: 'backwards',
                              whiteSpace: char === ' ' ? 'pre' : 'normal'
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </div>
                ) : (
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
                    rows={2}
                    className={`input ${freeTextError ? 'flash-error-active' : ''}`}
                    style={{ 
                      fontFamily: 'inherit',
                      fontSize: '16px',
                      lineHeight: '1.6',
                      resize: 'vertical',
                      zIndex: 1,
                      width: '100%',
                      minHeight: '60px',
                      padding: '16px',
                      ...(freeTextError ? {
                        borderColor: 'var(--secondary-color)',
                        borderWidth: '2px',
                        backgroundColor: 'rgba(199, 155, 255, 0.08)'
                      } : {})
                    }}
                  />
                )}
              </div>
              
              {/* Right: Difficulty Only */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch', paddingTop: '28px' }}>
                {/* Difficulty */}
                <div style={{ zIndex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '85px', justifyContent: 'flex-end' }}>
                      <label className="label" style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>
                        Difficulty:
                      </label>
                      <div 
                        style={{ 
                          position: 'relative',
                          cursor: 'pointer',
                          zIndex: 10000
                        }}
                        onMouseEnter={() => setShowDifficultyTooltip(true)}
                        onMouseLeave={() => setShowDifficultyTooltip(false)}
                      >
                        <span style={{ 
                          fontSize: '12px', 
                          color: 'var(--primary-color)',
                          border: '1px solid var(--primary-color)',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--primary-bg)',
                          fontWeight: '600'
                        }}>i</span>
                        {showDifficultyTooltip && (
                          <div style={{
                            position: 'absolute',
                            top: '0',
                            right: '120%',
                            background: 'var(--secondary-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px',
                            width: '240px',
                            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            zIndex: 10001,
                            whiteSpace: 'normal',
                            pointerEvents: 'auto'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--primary-color)' }}>
                              Difficulty Rating
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>
                              Set how difficult you believe this prompt is for the model to generate. This helps weight the scoring appropriately.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                  zIndex: 1,
                  position: 'relative'
                }}>
                  {/* Random button in top right corner of prompt text area */}
                  <button
                    onClick={(e) => {
                      if (!loading && !editMode) {
                        e.currentTarget.style.transform = 'scale(0.95) rotate(-15deg)';
                        setTimeout(() => {
                          e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                        }, 150);
                        loadRandomPrompt();
                      }
                    }}
                    disabled={loading || editMode}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      zIndex: 2,
                      fontSize: '20px',
                      padding: '6px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: loading || editMode ? 'not-allowed' : 'pointer',
                      opacity: loading || editMode ? 0.4 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '36px',
                      minHeight: '36px'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading && !editMode) {
                        e.currentTarget.style.transform = 'scale(1.1) rotate(15deg)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                    }}
                    title="Load a random prompt from the database"
                  >
                    🎲
                  </button>
                  {(loading || illugenLoading) && currentPrompt?.text ? (
                    <span>
                      {currentPrompt.text.split('').map((char, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            animation: `floatUp 3s ease-in-out infinite`,
                            animationDelay: `${index * 0.05}s`,
                            whiteSpace: char === ' ' ? 'pre' : 'normal',
                            ...(illugenLoading ? {
                              background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 30%, #ff6b9d 60%, #ffd93d 100%)',
                              backgroundSize: '300% 300%',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              animation: `floatUp 3s ease-in-out infinite, shimmer 3s ease-in-out infinite`,
                              animationDelay: `${index * 0.05}s, 0s`
                            } : {})
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  ) : wasGenerating && currentPrompt?.text ? (
                    <span>
                      {currentPrompt.text.split('').map((char, index) => (
                        <span
                          key={index}
                          style={{
                            display: 'inline-block',
                            animation: `dropDown 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
                            animationDelay: `${index * 0.02}s`,
                            animationFillMode: 'backwards',
                            whiteSpace: char === ' ' ? 'pre' : 'normal'
                          }}
                        >
                          {char}
                        </span>
                      ))}
                    </span>
                  ) : (
                    currentPrompt?.text || ''
                  )}
                </div>
              )}
            </div>
          )
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button 
            onClick={() => sendPrompt(false)} 
            disabled={loading || illugenLoading || (!freeTextMode && !currentPrompt)}
            className="btn"
            style={{ 
              width: '50%', 
              justifyContent: 'center', 
              zIndex: 1,
              background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
              borderColor: '#8b5cf6',
              color: '#fff',
              fontWeight: '600',
              boxShadow: loading && !illugenLoading ? '0 0 0 4px rgba(124,58,237,0.2)' : '0 4px 16px rgba(124, 58, 237, 0.4)',
              transition: 'all 150ms ease',
              transform: loading && !illugenLoading ? 'scale(0.98)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !illugenLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(124, 58, 237, 0.4)';
              }
            }}
            onMouseDown={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
          >
            {loading && !illugenLoading ? '⏳ Generating...' : 'DrumGen'}
          </button>
          <button 
            onClick={() => sendPrompt(true)} 
            disabled={loading || illugenLoading || (!freeTextMode && !currentPrompt)}
            className="btn"
            style={{ 
              width: '50%', 
              justifyContent: 'center', 
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(135deg, #5b21b6 0%, #6366f1 100%)',
              borderColor: '#6366f1',
              color: '#fff',
              fontWeight: '600',
              boxShadow: illugenLoading ? '0 0 0 4px rgba(99,102,241,0.2)' : '0 4px 16px rgba(99, 102, 241, 0.4)',
              transition: 'all 150ms ease',
              position: 'relative',
              overflow: 'visible',
              transform: illugenLoading ? 'scale(0.98)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.45)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !illugenLoading) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.4)';
              }
            }}
            onMouseDown={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
            onMouseUp={(e) => {
              if (!loading && !illugenLoading && (freeTextMode || currentPrompt)) {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
          >
            {illugenLoading ? (
              '⏳ Generating...'
            ) : (
              <>
                <span>DrumGen + </span>
                <span style={{
                  background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 30%, #ff6b9d 60%, #ffd93d 100%)',
                  backgroundSize: '300% 300%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 3s ease-in-out infinite',
                  fontWeight: '600'
                }}>
                  Illugen
                </span>
                <img 
                  src="/illugen-icon.icns" 
                  alt="Illugen" 
                  style={{ 
                    width: '18px', 
                    height: '18px', 
                    objectFit: 'contain', 
                    filter: 'drop-shadow(0 0 6px rgba(84,208,255,0.5))' 
                  }} 
                />
              </>
            )}
            <div 
              style={{ 
                position: 'absolute',
                right: '8px',
                cursor: 'pointer',
                zIndex: 1100,
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={() => setShowIllugenTooltip(true)}
              onMouseLeave={() => setShowIllugenTooltip(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <span style={{ 
                fontSize: '11px', 
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.2)',
                fontWeight: '700',
                lineHeight: '1',
                flexShrink: 0
              }}>i</span>
              {showIllugenTooltip && (
                <div style={{
                  position: 'absolute',
                  bottom: '100%',
                  right: '0',
                  marginBottom: '8px',
                  background: 'var(--secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  width: '260px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
                  fontSize: '12px',
                  lineHeight: '1.5',
                  zIndex: 3000,
                  whiteSpace: 'normal',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px', color: 'var(--primary-color)' }}>
                    Compare DrumGen & Illugen
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    This allows you to compare DrumGen to Illugen when scoring.
                  </div>
                  {/* Arrow pointing down */}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    right: '7px',
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid var(--border-color)'
                  }}></div>
                  <div style={{
                    position: 'absolute',
                    bottom: '-5px',
                    right: '8px',
                    width: '0',
                    height: '0',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid var(--secondary-bg)'
                  }}></div>
                </div>
              )}
            </div>
          </button>
        </div>
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


          {/* Audio Player and Scoring - Different layouts for Illugen vs regular */}
          {submitting ? (
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              minHeight: '400px'
            }}>
              <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                {/* Outer rotating gradient ring */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 25%, #ff6b9d 50%, #ffd93d 75%, #8247ff 100%)',
                    backgroundSize: '400% 400%',
                    animation: 'rotateGradient 3s linear infinite, pulse 2s ease-in-out infinite',
                    filter: 'blur(20px)',
                    opacity: 0.6
                  }}
                />

                {/* Middle spinning circle */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    border: '4px solid transparent',
                    borderTopColor: '#8247ff',
                    borderRightColor: '#54d0ff',
                    borderBottomColor: '#ff6b9d',
                    borderLeftColor: '#ffd93d',
                    animation: 'spin 1.5s linear infinite'
                  }}
                />

                {/* Inner pulsing circles */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 100%)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    opacity: 0.8
                  }}
                />

                {/* Center circle with shimmer */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 30%, #ff6b9d 60%, #ffd93d 100%)',
                    backgroundSize: '300% 300%',
                    animation: 'shimmer 3s ease-in-out infinite',
                    boxShadow: '0 0 30px rgba(130, 71, 255, 0.6), 0 0 50px rgba(84, 208, 255, 0.4)'
                  }}
                />

                {/* Orbiting dots */}
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: ['#8247ff', '#54d0ff', '#ff6b9d', '#ffd93d'][i],
                      transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-70px)`,
                      animation: `orbit 2s linear infinite`,
                      animationDelay: `${i * 0.5}s`,
                      boxShadow: `0 0 15px ${['#8247ff', '#54d0ff', '#ff6b9d', '#ffd93d'][i]}`
                    }}
                  />
                ))}
              </div>

              {/* Loading text */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(50% - 140px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '18px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #8247ff 0%, #54d0ff 30%, #ff6b9d 60%, #ffd93d 100%)',
                  backgroundSize: '300% 300%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 3s ease-in-out infinite',
                  letterSpacing: '1px'
                }}
              >
                Saving score...
              </div>
            </div>
          ) : illugenData?.variations?.length ? (
            /* Illugen Layout: Wider, symmetrical with simple play buttons */
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '480px 420px', gap: '20px', maxWidth: '920px', margin: '0 auto', alignItems: 'start' }}>
                {/* Left Column: DrumGen Audio + Illugen Samples */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* DrumGen Audio */}
                  <div className="card" style={{ zIndex: 1, padding: '16px' }}>
                    <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px' }}>
                      DrumGen Audio
                    </h3>
                    <AudioPlayer src={audioUrl} />
                  </div>

                  {/* Illugen Samples */}
                  <div className="card" style={{ zIndex: 1, padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <img src="/illugen-icon.icns" alt="Illugen" style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                      <h3 className="label" style={{ fontSize: '16px', margin: 0 }}>
                        Illugen Samples
                      </h3>
                    </div>
                    {illugenData.error && (
                      <div style={{ color: '#f97316', fontSize: '12px', marginBottom: '10px' }}>
                        Warning: {illugenData.error}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {illugenData.variations.map((variation, idx) => {
                        const attached = noteAttachments.some((att) => att.type === 'illugen' && att.variation_id === variation.variation_id);
                        return (
                          <div key={variation.variation_id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', minWidth: '65px' }}>
                              Sample {idx + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <SimpleAudioPlayer src={variation.url} />
                            </div>
                            <button
                              onClick={() => toggleIllugenAttachment(variation)}
                              className={attached ? 'btn btn-secondary' : 'btn btn-primary'}
                              style={{ 
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                padding: '6px',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                borderRadius: '6px'
                              }}
                              title={attached ? 'Attached to notes' : 'Attach to notes'}
                            >
                              📎
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Scoring + Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                  {/* Scoring */}
                  <div className="card" style={{ zIndex: 1, padding: '16px' }}>
                    <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px' }}>
                      Score the Results
                    </h3>
                    <ScoringSliders 
                      scores={scores} 
                      onChange={(newScores) => {
                        setScores(newScores);
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

                  {/* Notes */}
                  <div className="card" style={{ zIndex: 1, padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 className="label" style={{ fontSize: '16px', marginBottom: '10px' }}>
                      Notes
                    </h3>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setNoteDragActive(true); }}
                      onDragLeave={() => setNoteDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setNoteDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        handleNoteFileSelect(file);
                      }}
                      style={{
                        position: 'relative',
                        border: noteDragActive ? '1px dashed var(--secondary-color)' : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '4px',
                        background: noteDragActive ? 'rgba(99, 212, 255, 0.04)' : 'transparent',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}
                    >
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes... drag & drop a .wav for manual upload."
                        className="input"
                        style={{ 
                          width: '100%', 
                          fontFamily: 'inherit', 
                          resize: 'none',
                          flex: 1,
                          minHeight: '100px',
                          paddingRight: '45px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => noteFileInputRef.current?.click()}
                        className="btn btn-secondary"
                        style={{
                          position: 'absolute',
                          right: '8px',
                          bottom: '8px',
                          padding: '6px 8px',
                          fontSize: '14px',
                          minWidth: 'auto'
                        }}
                        title="Attach .wav file from your computer"
                      >
                        📎
                      </button>
                      <input
                        ref={noteFileInputRef}
                        type="file"
                        accept=".wav,audio/wav"
                        style={{ display: 'none' }}
                        onChange={handleNoteFileInput}
                      />
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {noteAudioFile
                        ? `Pending: ${noteAudioFile.name}`
                        : noteAudioPath
                        ? 'Manual upload attached'
                        : 'Drag/drop or 📎 to attach .wav'}
                    </div>
                    {(noteAttachments.length > 0 || noteAudioFile) && (
                      <div style={{ marginTop: '10px', padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px', background: 'var(--secondary-bg)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '13px' }}>Attachments</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
                          {noteAttachments.map((att) => (
                            <div key={att.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {att.type === 'illugen' ? '≈' : '📎'} {att.label}
                              </span>
                              <button
                                onClick={() => setNoteAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '11px' }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          {noteAudioFile && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                📎 {noteAudioFile.name}
                              </span>
                              <button
                                onClick={() => {
                                  setNoteAudioFile(null);
                                  setNoteAudioPath('');
                                  if (noteFileInputRef.current) noteFileInputRef.current.value = '';
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '3px 6px', fontSize: '11px' }}
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ maxWidth: '920px', margin: '16px auto 0' }}>
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
          ) : (
            /* Regular Generate Layout: Side-by-side with collapsible notes */
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

              {/* Notes Panel Toggle & Submit Button */}
              <div style={{ maxWidth: '520px', margin: '0 auto', marginTop: '20px' }}>
                {/* Notes Toggle Button */}
                <button
                  onClick={() => setNotesPanelOpen(!notesPanelOpen)}
                  className="btn btn-secondary"
                  style={{ 
                    width: '100%', 
                    justifyContent: 'center', 
                    marginBottom: notesPanelOpen ? '12px' : '16px',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    position: 'relative'
                  }}
                >
                  {notes && notes.trim() ? (
                    <>
                      <span 
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444'
                        }}
                      />
                      {notesPanelOpen ? '▼ Hide notes + attachments' : '▶ Add notes (optional)'}
                    </>
                  ) : (
                    <>
                      {notesPanelOpen ? '▼ Hide notes + attachments' : '▶ Add notes (optional)'}
                    </>
                  )}
                </button>

                {/* Collapsible Notes Panel */}
                <div 
                  style={{ 
                    overflow: 'hidden', 
                    maxHeight: notesPanelOpen ? '1200px' : '0px', 
                    transition: 'max-height 240ms ease', 
                    marginBottom: notesPanelOpen ? '16px' : '0px'
                  }}
                  aria-hidden={!notesPanelOpen}
                >
                  <div 
                    className="card" 
                    style={{ 
                      zIndex: 1, 
                      padding: '16px', 
                      opacity: notesPanelOpen ? 1 : 0, 
                      transform: notesPanelOpen ? 'scaleX(1)' : 'scaleX(0.9)', 
                      transformOrigin: 'left', 
                      transition: 'opacity 200ms ease, transform 220ms ease',
                      pointerEvents: notesPanelOpen ? 'auto' : 'none'
                    }}
                  >
                    <label className="label" style={{ fontSize: '14px', marginBottom: '8px', display: 'block' }}>
                      Notes (optional)
                    </label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setNoteDragActive(true); }}
                      onDragLeave={() => setNoteDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setNoteDragActive(false);
                        const file = e.dataTransfer.files?.[0];
                        handleNoteFileSelect(file);
                      }}
                      style={{
                        position: 'relative',
                        border: noteDragActive ? '1px dashed var(--secondary-color)' : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '4px',
                        background: noteDragActive ? 'rgba(99, 212, 255, 0.04)' : 'transparent'
                      }}
                    >
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes... drag & drop a .wav to attach."
                        rows={3}
                        className="input"
                        style={{ 
                          width: '100%', 
                          fontFamily: 'inherit', 
                          resize: 'vertical',
                          minHeight: '80px',
                          paddingRight: '90px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => noteFileInputRef.current?.click()}
                        className="btn btn-secondary"
                        style={{
                          position: 'absolute',
                          right: '10px',
                          bottom: '10px',
                          padding: '6px 10px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        title="Attach .wav file from your computer"
                      >
                        📎 Attach .wav
                      </button>
                      <input
                        ref={noteFileInputRef}
                        type="file"
                        accept=".wav,audio/wav"
                        style={{ display: 'none' }}
                        onChange={handleNoteFileInput}
                      />
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {noteAudioFile
                        ? `Pending upload: ${noteAudioFile.name}`
                        : noteAudioPath
                        ? 'Audio note attached'
                        : 'Add a local .wav (drag/drop or paperclip).'}
                    </div>
                    {(noteAudioFile || noteAudioPath) && (
                      <div style={{ marginTop: '12px', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--secondary-bg)' }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px' }}>Attached</div>
                        {noteAudioFile && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <span>Pending: {noteAudioFile.name}</span>
                            <button
                              onClick={() => {
                                setNoteAudioFile(null);
                                setNoteAudioPath('');
                                if (noteFileInputRef.current) noteFileInputRef.current.value = '';
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {!noteAudioFile && noteAudioPath && <div>Upload attached</div>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
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
