"""
Cleanup script to delete orphaned audio files.

An audio file is considered orphaned if:
- It exists in the audio_files directory
- It is NOT linked to any test result in the database

This script will:
1. Find all audio files in audio_files directory
2. Check which ones are linked to results in the database
3. Delete any files that are not linked
"""

import os
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "drumgen.db"
AUDIO_DIR = Path(__file__).parent.parent / "audio_files"


def cleanup_orphaned_audio(dry_run: bool = False) -> tuple[int, list[str]]:
    """
    Clean up orphaned audio files.
    
    Args:
        dry_run: If True, only report what would be deleted without actually deleting
        
    Returns:
        Tuple of (deleted_count, deleted_files_list)
    """
    if not AUDIO_DIR.exists():
        print(f"Audio directory {AUDIO_DIR} does not exist. Nothing to clean.")
        return 0, []
    
    # Connect to database
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all audio_ids that are linked to classic LLM test results
    cursor.execute("SELECT DISTINCT audio_id FROM test_results WHERE audio_id IS NOT NULL")
    linked_audio_ids = {row[0] for row in cursor.fetchall()}
    # Also protect Model Testing generated audio files
    cursor.execute("SELECT DISTINCT generated_audio_id FROM model_test_results WHERE generated_audio_id IS NOT NULL")
    linked_audio_ids.update(row[0] for row in cursor.fetchall())
    
    conn.close()
    
    # Get all audio files in the directory
    audio_files = list(AUDIO_DIR.glob("*.wav"))
    
    orphaned_files = []
    for audio_file in audio_files:
        # Extract audio_id from filename (remove .wav extension)
        audio_id = audio_file.stem
        
        # Check if this audio_id is linked to any result
        if audio_id not in linked_audio_ids:
            orphaned_files.append(str(audio_file))
    
    # Delete orphaned files
    deleted_count = 0
    deleted_files = []
    
    for file_path in orphaned_files:
        if not dry_run:
            try:
                os.remove(file_path)
                deleted_files.append(file_path)
                deleted_count += 1
            except OSError as e:
                print(f"Error deleting {file_path}: {e}")
        else:
            deleted_files.append(file_path)
            deleted_count += 1
    
    return deleted_count, deleted_files


def main():
    """Main entry point for the cleanup script."""
    import sys
    
    dry_run = "--dry-run" in sys.argv
    
    print("=" * 60)
    print("Orphaned Audio File Cleanup")
    print("=" * 60)
    print()
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be deleted")
        print()
    
    # Get statistics
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM test_results WHERE audio_id IS NOT NULL")
    linked_test_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM model_test_results WHERE generated_audio_id IS NOT NULL")
    linked_model_count = cursor.fetchone()[0]
    conn.close()
    
    audio_files_count = len(list(AUDIO_DIR.glob("*.wav"))) if AUDIO_DIR.exists() else 0
    
    print(f"📊 Statistics:")
    print(f"   Total audio files: {audio_files_count}")
    print(f"   Audio files linked to LLM results: {linked_test_count}")
    print(f"   Audio files linked to model-testing results: {linked_model_count}")
    print()
    
    # Run cleanup
    deleted_count, deleted_files = cleanup_orphaned_audio(dry_run=dry_run)
    
    print(f"🗑️  Cleanup Results:")
    print(f"   Orphaned files found: {deleted_count}")
    
    if deleted_count > 0:
        if dry_run:
            print(f"\n   Files that would be deleted:")
        else:
            print(f"\n   Files deleted:")
        
        for file_path in deleted_files[:20]:  # Show first 20
            print(f"      - {Path(file_path).name}")
        if len(deleted_files) > 20:
            print(f"      ... and {len(deleted_files) - 20} more")
    else:
        print("   ✓ No orphaned files found!")
    
    print()
    
    if not dry_run and deleted_count > 0:
        print("✓ Cleanup completed successfully!")
    elif dry_run:
        print("💡 Run without --dry-run to actually delete these files")
    
    print("=" * 60)


if __name__ == "__main__":
    main()
