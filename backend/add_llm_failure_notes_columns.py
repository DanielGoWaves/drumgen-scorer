"""
Add notes and notes_audio_path columns to llm_failures table.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import engine


async def add_columns():
    """Add notes and notes_audio_path columns to llm_failures table."""
    async with engine.begin() as conn:
        # Check if columns exist
        result = await conn.execute(text("PRAGMA table_info(llm_failures)"))
        columns = [row[1] for row in result.fetchall()]
        
        if "notes" in columns and "notes_audio_path" in columns:
            print("Columns 'notes' and 'notes_audio_path' already exist.")
            return
        
        # Add the columns
        if "notes" not in columns:
            await conn.execute(text(
                "ALTER TABLE llm_failures ADD COLUMN notes TEXT"
            ))
            print("✓ Added 'notes' column to llm_failures table.")
        
        if "notes_audio_path" not in columns:
            await conn.execute(text(
                "ALTER TABLE llm_failures ADD COLUMN notes_audio_path VARCHAR"
            ))
            print("✓ Added 'notes_audio_path' column to llm_failures table.")


if __name__ == "__main__":
    asyncio.run(add_columns())

