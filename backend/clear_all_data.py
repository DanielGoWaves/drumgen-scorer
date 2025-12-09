"""Clear all test data: results, prompts, usage counts, and audio files."""
import os
import shutil
import sqlite3

DB_PATH = "drumgen.db"
AUDIO_DIR = "audio_files"

def clear_all_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Delete all test results
    cursor.execute("DELETE FROM test_results")
    print(f"Deleted all test results")
    
    # Delete all prompts
    cursor.execute("DELETE FROM prompts")
    print(f"Deleted all prompts")
    
    conn.commit()
    conn.close()
    
    # Clear audio files directory
    if os.path.exists(AUDIO_DIR):
        shutil.rmtree(AUDIO_DIR)
        os.makedirs(AUDIO_DIR)
        print(f"Cleared audio files directory")
    else:
        os.makedirs(AUDIO_DIR, exist_ok=True)
        print(f"Created audio files directory")
    
    print("\n✓ All data cleared successfully!")

if __name__ == "__main__":
    clear_all_data()

