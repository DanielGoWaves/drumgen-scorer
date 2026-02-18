# LLM Failure Improvements - Notes & Audio Preservation + Viewed Toggle

## Date: January 4, 2026

## Changes Implemented

### 1. Preserve Notes and Audio When Converting to LLM Failure

**Problem:** When marking a result as an LLM failure, the audio files and notes were deleted, losing valuable reference information.

**Solution:** Modified the system to preserve audio files and notes when converting results to LLM failures.

#### Backend Changes

**A. Database Model (`backend/models.py`)**
- Added `notes` column to `LLMFailure` table
- Added `notes_audio_path` column to `LLMFailure` table
- Updated `LLMFailureRead` schema to include these fields

**B. Migration Script (`backend/add_llm_failure_notes_columns.py`)**
- Created migration to add the new columns to existing database
- Run with: `python backend/add_llm_failure_notes_columns.py`

**C. API Endpoint (`backend/routers/results.py`)**
- Updated `set_result_as_llm_failure` endpoint to:
  - Copy `notes` from result to LLM failure
  - Copy `notes_audio_path` from result to LLM failure
  - **Remove audio file deletion** (previously deleted the audio)
  - Updated docstring to reflect audio preservation

**Before:**
```python
llm_failure = LLMFailure(
    prompt_id=result.prompt_id,
    prompt_text=prompt.text,
    llm_response=llm_response_text,
    model_version=result.model_version,
    drum_type=drum_type,
    viewed=False,
)
# ... deleted audio file with cleanup_orphaned_audio_file
```

**After:**
```python
llm_failure = LLMFailure(
    prompt_id=result.prompt_id,
    prompt_text=prompt.text,
    llm_response=llm_response_text,
    model_version=result.model_version,
    drum_type=drum_type,
    viewed=False,
    notes=result.notes,  # ← Preserve notes
    notes_audio_path=result.notes_audio_path,  # ← Preserve audio
)
# ... NO audio deletion - preserved for reference
```

#### Frontend Changes

**Updated Warning Message (`frontend/src/pages/ResultsPage.jsx`)**

**Before:**
```
This will:
• Create an LLM failure record
• Remove this result from all score averages
• Delete the attached audio file  ← Changed
```

**After:**
```
This will:
• Create an LLM failure record
• Remove this result from all score averages
• Preserve the audio file and notes for reference  ← New
```

---

### 2. Toggle Viewed/Unviewed Status in LLM Failures Page

**Problem:** Once an LLM failure was marked as viewed, there was no easy way to mark it as unviewed again. The system only prompted to mark as viewed when closing.

**Solution:** Added a toggle button in the LLM failure detail modal that can mark failures as viewed or unviewed with a single click.

#### Frontend Changes (`frontend/src/pages/LLMFailuresPage.jsx`)

**A. Removed Auto-Prompt on Close**
```javascript
// BEFORE: Asked to mark as viewed when closing unviewed failures
const closeDetail = async () => {
  if (selectedFailure && !selectedFailure.viewed) {
    const shouldMarkAsViewed = window.confirm('Mark as viewed?');
    // ...
  }
  setSelectedFailure(null);
};

// AFTER: Simple close without prompt
const closeDetail = () => {
  setSelectedFailure(null);
};
```

**B. Added Toggle Function**
```javascript
const toggleViewed = async () => {
  if (!selectedFailure) return;
  
  const newViewedStatus = !selectedFailure.viewed;
  
  try {
    await api.put(`/api/llm-failures/${selectedFailure.id}`, { viewed: newViewedStatus });
    // Update local state
    setFailures(prev => prev.map(f => 
      f.id === selectedFailure.id ? { ...f, viewed: newViewedStatus } : f
    ));
    setSelectedFailure({ ...selectedFailure, viewed: newViewedStatus });
  } catch (err) {
    console.error('Failed to update viewed status:', err);
    alert('Failed to update viewed status');
  }
};
```

**C. Added Toggle Button in Modal**
- Positioned between close and delete buttons
- Shows current status with color coding:
  - **Unviewed**: Green background, "✓ Mark Viewed"
  - **Viewed**: Red background, "👁️ Mark Unviewed"
- Instant toggle with local state update
- Hover effects for better UX

---

## Files Modified

### Backend
1. `backend/models.py` - Added notes columns to LLMFailure
2. `backend/routers/results.py` - Updated conversion endpoint
3. `backend/add_llm_failure_notes_columns.py` - NEW migration script

### Frontend
1. `frontend/src/pages/ResultsPage.jsx` - Updated warning message
2. `frontend/src/pages/LLMFailuresPage.jsx` - Added toggle button and removed auto-prompt

---

## How to Apply

### 1. Run Database Migration
```bash
cd backend
python add_llm_failure_notes_columns.py
```

This will add the `notes` and `notes_audio_path` columns to the `llm_failures` table.

### 2. Restart Servers
- Restart backend server
- Reload frontend in browser

---

## Testing Checklist

- [ ] Run migration script successfully
- [ ] Convert a result with notes to LLM failure
- [ ] Verify notes are preserved in LLM failure
- [ ] Verify audio file is NOT deleted
- [ ] Open LLM failure detail modal
- [ ] Click "Mark Viewed" button - should turn to "Mark Unviewed"
- [ ] Click "Mark Unviewed" button - should turn back to "Mark Viewed"
- [ ] Filter by viewed/unviewed - should update correctly
- [ ] Close modal without auto-prompt

---

## Benefits

### Preservation of Information
✅ Audio files kept for reference and debugging  
✅ Notes preserved to understand why it was marked as failure  
✅ Complete audit trail maintained  
✅ No data loss when categorizing failures  

### Improved UX
✅ Easy toggle between viewed/unviewed states  
✅ No annoying prompt on modal close  
✅ Visual feedback with color coding  
✅ One-click status changes  

---

## Database Schema Changes

```sql
-- Added to llm_failures table
ALTER TABLE llm_failures ADD COLUMN notes TEXT;
ALTER TABLE llm_failures ADD COLUMN notes_audio_path VARCHAR;
```

---

## API Changes

### Modified Endpoint
**POST `/api/results/{result_id}/set-as-llm-failure`**
- Now preserves `notes` field
- Now preserves `notes_audio_path` field
- No longer deletes audio files
- Response unchanged

### Response Schema Update
**`LLMFailureRead`** now includes:
```typescript
{
  // ... existing fields ...
  notes?: string;
  notes_audio_path?: string;
}
```

---

## Backward Compatibility

✅ Existing LLM failures without notes will have `NULL` values (handled gracefully)  
✅ Migration is idempotent (safe to run multiple times)  
✅ Frontend handles missing notes fields  
✅ No breaking changes to API  

---

## Date: January 4, 2026

