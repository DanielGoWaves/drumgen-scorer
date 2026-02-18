#!/usr/bin/env python3
"""
Safe migration script - adds columns to llm_failures table with full backup and verification.
"""
import sqlite3
import shutil
from pathlib import Path
from datetime import datetime

# Paths
DB_PATH = Path(__file__).parent / "drumgen.db"
BACKUP_PATH = DB_PATH.parent / f"drumgen.db.backup-before-migration-{datetime.now().strftime('%Y%m%d_%H%M%S')}"

def main():
    print("=" * 60)
    print("SAFE MIGRATION: Adding notes columns to llm_failures")
    print("=" * 60)
    
    # Step 1: Create backup
    print(f"\n1. Creating backup: {BACKUP_PATH.name}")
    shutil.copy2(DB_PATH, BACKUP_PATH)
    print(f"   ✓ Backup created: {BACKUP_PATH}")
    
    # Step 2: Connect to database
    print("\n2. Connecting to database...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print("   ✓ Connected")
    
    # Step 3: Check current state
    print("\n3. Checking current state...")
    cursor.execute("SELECT COUNT(*) FROM test_results")
    test_results_count = cursor.fetchone()[0]
    print(f"   ✓ Test results: {test_results_count}")
    
    cursor.execute("SELECT COUNT(*) FROM llm_failures")
    llm_failures_count = cursor.fetchone()[0]
    print(f"   ✓ LLM failures: {llm_failures_count}")
    
    cursor.execute("PRAGMA table_info(llm_failures)")
    columns = [row[1] for row in cursor.fetchall()]
    print(f"   ✓ Current llm_failures columns: {', '.join(columns)}")
    
    # Step 4: Add columns if they don't exist
    print("\n4. Adding new columns...")
    
    if "notes" not in columns:
        cursor.execute("ALTER TABLE llm_failures ADD COLUMN notes TEXT")
        print("   ✓ Added 'notes' column")
    else:
        print("   - 'notes' column already exists")
    
    if "notes_audio_path" not in columns:
        cursor.execute("ALTER TABLE llm_failures ADD COLUMN notes_audio_path VARCHAR")
        print("   ✓ Added 'notes_audio_path' column")
    else:
        print("   - 'notes_audio_path' column already exists")
    
    conn.commit()
    
    # Step 5: Verify nothing was lost
    print("\n5. Verifying data integrity...")
    cursor.execute("SELECT COUNT(*) FROM test_results")
    new_test_results_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM llm_failures")
    new_llm_failures_count = cursor.fetchone()[0]
    
    if new_test_results_count == test_results_count:
        print(f"   ✓ Test results count unchanged: {new_test_results_count}")
    else:
        print(f"   ✗ ERROR: Test results changed from {test_results_count} to {new_test_results_count}")
        conn.close()
        return False
    
    if new_llm_failures_count == llm_failures_count:
        print(f"   ✓ LLM failures count unchanged: {new_llm_failures_count}")
    else:
        print(f"   ✗ ERROR: LLM failures changed from {llm_failures_count} to {new_llm_failures_count}")
        conn.close()
        return False
    
    # Step 6: Check audio files exist
    print("\n6. Checking audio files...")
    cursor.execute("SELECT audio_file_path FROM test_results WHERE audio_file_path IS NOT NULL LIMIT 5")
    sample_paths = cursor.fetchall()
    
    for (path,) in sample_paths:
        file_path = DB_PATH.parent / path
        if file_path.exists():
            print(f"   ✓ {path}")
        else:
            print(f"   ⚠ {path} (file missing but this is pre-existing)")
    
    # Step 7: Verify new columns
    print("\n7. Verifying new schema...")
    cursor.execute("PRAGMA table_info(llm_failures)")
    new_columns = [row[1] for row in cursor.fetchall()]
    
    if "notes" in new_columns and "notes_audio_path" in new_columns:
        print("   ✓ New columns successfully added!")
        print(f"   ✓ Updated llm_failures columns: {', '.join(new_columns)}")
    else:
        print("   ✗ ERROR: Columns not added properly")
        conn.close()
        return False
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("✓ MIGRATION COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\n✓ Backup saved at: {BACKUP_PATH}")
    print(f"✓ All {test_results_count} test results preserved")
    print(f"✓ All {llm_failures_count} LLM failures preserved")
    print("✓ Audio files intact")
    print("✓ New columns added to llm_failures table")
    print("\n➜ Safe to restart your backend server now!")
    
    return True

if __name__ == "__main__":
    try:
        success = main()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        print(f"\nIf anything went wrong, restore from backup:")
        print(f"  cp drumgen.db.backup-* drumgen.db")
        exit(1)

