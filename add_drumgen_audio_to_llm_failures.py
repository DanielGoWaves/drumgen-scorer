#!/usr/bin/env python3
"""
Add audio_file_path and audio_id columns to llm_failures table.
"""
import sqlite3
import shutil
from datetime import datetime
from pathlib import Path

DB = "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/drumgen.db"
BACKUP = f"/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/drumgen.db.backup-audio-{datetime.now().strftime('%Y%m%d_%H%M%S')}"

print("BACKING UP DATABASE...")
shutil.copy2(DB, BACKUP)
print(f"✓ Backup: {BACKUP}")

conn = sqlite3.connect(DB)
c = conn.cursor()

# Get current counts
c.execute("SELECT COUNT(*) FROM test_results")
results_before = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM llm_failures")
failures_before = c.fetchone()[0]

print(f"\n✓ Test results: {results_before}")
print(f"✓ LLM failures: {failures_before}")

# Check columns
c.execute("PRAGMA table_info(llm_failures)")
cols = [r[1] for r in c.fetchall()]

# Add columns
if "audio_file_path" not in cols:
    c.execute("ALTER TABLE llm_failures ADD COLUMN audio_file_path VARCHAR")
    print("✓ Added audio_file_path column")
else:
    print("- audio_file_path column exists")

if "audio_id" not in cols:
    c.execute("ALTER TABLE llm_failures ADD COLUMN audio_id VARCHAR")
    print("✓ Added audio_id column")
else:
    print("- audio_id column exists")

conn.commit()

# Verify
c.execute("SELECT COUNT(*) FROM test_results")
results_after = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM llm_failures")
failures_after = c.fetchone()[0]

if results_before == results_after and failures_before == failures_after:
    print(f"\n✓ VERIFIED: All {results_before} results and {failures_before} failures intact!")
    print("✓ DrumGen audio columns added!")
    print("✓ RESTART YOUR BACKEND NOW!")
else:
    print(f"\n✗ ERROR: Counts changed! Restore: cp {BACKUP} {DB}")

conn.close()

