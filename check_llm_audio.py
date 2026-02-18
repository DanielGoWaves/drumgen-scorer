#!/usr/bin/env python3
"""
Check if notes_audio_path is being saved in LLM failures
"""
import sqlite3

DB = "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/drumgen.db"

conn = sqlite3.connect(DB)
c = conn.cursor()

print("=== CHECKING LLM FAILURES WITH NOTES/AUDIO ===\n")

# Check all LLM failures
c.execute("""
    SELECT id, prompt_text, notes, notes_audio_path, created_at 
    FROM llm_failures 
    ORDER BY id DESC 
    LIMIT 5
""")

failures = c.fetchall()

if not failures:
    print("No LLM failures found")
else:
    for fail in failures:
        fid, prompt, notes, audio_path, created = fail
        print(f"ID: {fid}")
        print(f"Prompt: {prompt[:50]}...")
        print(f"Has Notes: {'✓' if notes else '✗'}")
        print(f"Has Audio Path: {'✓ ' + audio_path if audio_path else '✗'}")
        print(f"Created: {created}")
        print("-" * 60)

# Check test results with notes/audio
print("\n=== TEST RESULTS WITH NOTES/AUDIO (for reference) ===\n")
c.execute("""
    SELECT id, notes, notes_audio_path 
    FROM test_results 
    WHERE notes IS NOT NULL OR notes_audio_path IS NOT NULL
    LIMIT 5
""")

results = c.fetchall()
for res in results:
    rid, notes, audio_path = res
    print(f"Result ID: {rid}")
    print(f"  Notes: {notes[:50] + '...' if notes and len(notes) > 50 else notes or 'None'}")
    print(f"  Audio: {audio_path or 'None'}")
    print()

conn.close()

