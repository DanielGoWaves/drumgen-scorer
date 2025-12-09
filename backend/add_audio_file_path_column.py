"""
Add audio_file_path column to test_results table.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import engine


async def add_column():
    """Add audio_file_path column to test_results table."""
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text("PRAGMA table_info(test_results)"))
        columns = [row[1] for row in result.fetchall()]
        
        if "audio_file_path" in columns:
            print("Column 'audio_file_path' already exists.")
            return
        
        # Add the column
        await conn.execute(text(
            "ALTER TABLE test_results ADD COLUMN audio_file_path VARCHAR"
        ))
        print("✓ Added 'audio_file_path' column to test_results table.")


if __name__ == "__main__":
    asyncio.run(add_column())

