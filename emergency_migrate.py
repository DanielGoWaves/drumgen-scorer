#!/usr/bin/env python3
"""
EMERGENCY SAFE MIGRATION
Just run: python3 /Users/qa_m2/Documents/Cursor\ AI/DrumGen\ Scorer/emergency_migrate.py
"""
import sqlite3
import shutil
from datetime import datetime

DB = "/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/drumgen.db"
BACKUP = f"/Users/qa_m2/Documents/Cursor AI/DrumGen Scorer/drumgen.db.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}"

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
if "notes" not in cols:
    c.execute("ALTER TABLE llm_failures ADD COLUMN notes TEXT")
    print("✓ Added notes column")
else:
    print("- notes column exists")

if "notes_audio_path" not in cols:
    c.execute("ALTER TABLE llm_failures ADD COLUMN notes_audio_path VARCHAR")
    print("✓ Added notes_audio_path column")
else:
    print("- notes_audio_path column exists")

conn.commit()

# Verify
c.execute("SELECT COUNT(*) FROM test_results")
results_after = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM llm_failures")
failures_after = c.fetchone()[0]

if results_before == results_after and failures_before == failures_after:
    print(f"\n✓ VERIFIED: All {results_before} results and {failures_before} failures intact!")
    print("✓ MIGRATION COMPLETE - RESTART YOUR BACKEND!")
else:
    print(f"\n✗ ERROR: Counts changed! Restore: cp {BACKUP} {DB}")

conn.close()

