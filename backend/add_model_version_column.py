"""
Add model_version column to test_results table.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import engine


async def add_column():
    """Add model_version column to existing database."""
    async with engine.begin() as conn:
        try:
            # Add the column
            await conn.execute(text("ALTER TABLE test_results ADD COLUMN model_version VARCHAR"))
            print("✓ Added model_version column to test_results")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ model_version column already exists")
            else:
                print(f"Error: {e}")


if __name__ == "__main__":
    asyncio.run(add_column())

