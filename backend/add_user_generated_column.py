"""
Add is_user_generated column to prompts table.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import engine


async def add_column():
    """Add is_user_generated column to existing database."""
    async with engine.begin() as conn:
        try:
            # Add the column, default to 0 (False) for existing prompts
            await conn.execute(text("ALTER TABLE prompts ADD COLUMN is_user_generated INTEGER DEFAULT 0 NOT NULL"))
            print("✓ Added is_user_generated column")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ is_user_generated column already exists")
            else:
                print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(add_column())

