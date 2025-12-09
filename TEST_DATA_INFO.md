# Test Dataset Information

## Overview

A complete test dataset has been generated to test the dashboard functionality without affecting your real 2000 prompts.

## Test Data Summary

- **100 test prompts** (tagged with `category='test-data'`)
- **1000 test results** (tagged with `notes='[TEST DATA]'`)
- **Date range**: Spread across last 30 days
- **Model versions**: V11 (40%), V12 (30%), V13 (30% + all cymbals)
- **Drum types**: All 15 types evenly distributed
- **Difficulty**: 1-10, randomly distributed

## Identification

Test data is clearly marked and separated:

### Test Prompts
- Category: `test-data`
- Text starts with: `[TEST]`
- Examples: `[TEST] test snare warm 1`, `[TEST] test kick dry 2`

### Test Results
- Notes field: `[TEST DATA]`
- Linked to test prompts

## Test Data Characteristics

- **Scores vary by difficulty**: Easier prompts tend to have higher scores
- **Version performance**: V13 has slight bonus, V11 baseline
- **Realistic distribution**: Mimics real testing patterns
- **Complete metadata**: All fields populated (drum_type, model_version, generated_json, etc.)

## Dashboard Testing

With this test data, you can now:

1. **View overall metrics** - See weighted score (0-100), generation quality, LLM accuracy
2. **Filter by drum type** - Select specific drums to see isolated performance
3. **Track version progress** - Compare V11, V12, V13 performance
4. **Analyze difficulty distribution** - Heat map shows score distribution across difficulty levels

## Clean Deletion

When you're ready to remove the test data:

```bash
cd backend
source ../.venv/bin/activate
python delete_test_data.py
```

This will remove **only** the test data, leaving your 2010 real prompts untouched.

## Current Database State

After test data generation:
- **Real prompts**: 2010 (your dataset)
- **Test prompts**: 100 (for testing)
- **Total**: 2110 prompts

- **Real results**: 0 (you haven't started testing yet)
- **Test results**: 1000 (for testing dashboard)
- **Total**: 1000 results

## Sample Test Data

```
Overall Score: 61.16/100
Generation Quality: 6.04/10
LLM Accuracy: 6.82/10
Total Tests: 1000

By Version:
- V11: 190 tests
- V12: 153 tests  
- V13: 657 tests (includes all cymbal tests)

By Drum Type (example - kick):
- Overall Score: 58.81/100
- Total Tests: 83
- Versions: V11: 28, V12: 25, V13: 30
```

Refresh your dashboard to see the test data visualized!

