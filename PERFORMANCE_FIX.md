# Performance Optimization Fix - Prompt Relationship Loading

## Issue
After implementing performance optimizations, updating results returned a 500 error:
```
AxiosError: Request failed with status code 500
Failed to save changes
```

The data was actually saving correctly (visible after refresh), but the API response was failing.

## Root Cause
When we added `prompt: Optional[PromptRead] = None` to `TestResultRead`, endpoints that return individual results (submit, get, update) were not loading the prompt relationship. SQLAlchemy's `session.refresh()` doesn't automatically load relationships, causing serialization to fail when trying to convert the result to `TestResultRead`.

## Solution
Added explicit prompt relationship loading to all endpoints that return `TestResultRead`:

### 1. Submit Score Endpoint (POST /api/results/score)
```python
await session.commit()
await session.refresh(result)
# Eagerly load the prompt relationship for the response
await session.refresh(result, attribute_names=['prompt'])
return TestResultRead.model_validate(result)
```

### 2. Get Result Endpoint (GET /api/results/{result_id})
```python
result = await session.get(TestResult, result_id)
if not result:
    raise HTTPException(status_code=404, detail="Result not found")
# Eagerly load the prompt relationship for the response
await session.refresh(result, attribute_names=['prompt'])
return TestResultRead.model_validate(result)
```

### 3. Update Result Endpoint (PUT /api/results/{result_id})
```python
await session.commit()
await session.refresh(result)
# Eagerly load the prompt relationship for the response
await session.refresh(result, attribute_names=['prompt'])
return TestResultRead.model_validate(result)
```

## Why This Works
- `session.refresh(result, attribute_names=['prompt'])` explicitly loads the `prompt` relationship
- This ensures the `TestResult` object has its `prompt` attribute populated
- `TestResultRead.model_validate(result)` can now successfully access `result.prompt`
- The API response includes the prompt data as expected

## Note on List Results Endpoint
The list results endpoint (GET /api/results/) already uses `selectinload(TestResult.prompt)` in the query, so it doesn't have this issue. The problem only affected individual result endpoints that use `session.get()` or `session.refresh()`.

## Files Modified
- `backend/routers/results.py` - Added prompt loading to 3 endpoints

## Testing
✅ Submit new test result - should return with prompt
✅ Get single result - should return with prompt  
✅ Update result - should save and return updated result with prompt (no more 500 error!)
✅ Delete result - should work (doesn't return TestResultRead, so no issue)

## Date
January 4, 2026

