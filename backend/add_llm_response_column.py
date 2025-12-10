#!/usr/bin/env python3
"""
Add llm_response column to test_results table.
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import async_session_maker

async def add_column():
    """Add llm_response column to test_results table."""
    async with async_session_maker() as session:
        try:
            # Check if column already exists
            result = await session.execute(text("""
                SELECT COUNT(*) FROM pragma_table_info('test_results') 
                WHERE name = 'llm_response'
            """))
            exists = result.scalar() > 0
            
            if exists:
                print("✓ Column 'llm_response' already exists")
                return
            
            # Add the column
            await session.execute(text("""
                ALTER TABLE test_results 
                ADD COLUMN llm_response TEXT
            """))
            await session.commit()
            print("✓ Successfully added 'llm_response' column to test_results table")
        except Exception as e:
            await session.rollback()
            print(f"Error: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(add_column())

