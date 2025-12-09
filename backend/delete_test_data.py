"""
Delete all test data from the database.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import delete, select
from backend.database import async_session_maker
from backend.models import Prompt, TestResult


async def delete_test_data():
    """Delete all test prompts and results."""
    async with async_session_maker() as session:
        print("Deleting test data...")
        
        # Get test prompt IDs
        test_prompt_stmt = select(Prompt.id).where(Prompt.category == "test-data")
        result = await session.execute(test_prompt_stmt)
        test_prompt_ids = [row[0] for row in result.all()]
        
        if not test_prompt_ids:
            print("No test data found.")
            return
        
        # Delete test results (by prompt_id or notes)
        result_delete_stmt = delete(TestResult).where(
            (TestResult.prompt_id.in_(test_prompt_ids)) | 
            (TestResult.notes == "[TEST DATA]")
        )
        result = await session.execute(result_delete_stmt)
        results_deleted = result.rowcount
        
        # Delete test prompts
        prompt_delete_stmt = delete(Prompt).where(Prompt.category == "test-data")
        result = await session.execute(prompt_delete_stmt)
        prompts_deleted = result.rowcount
        
        await session.commit()
        
        print(f"✓ Deleted {results_deleted} test results")
        print(f"✓ Deleted {prompts_deleted} test prompts")
        print("Test data cleanup complete!")


if __name__ == "__main__":
    if input("Are you sure you want to delete all test data? (yes/no): ").lower() == "yes":
        asyncio.run(delete_test_data())
    else:
        print("Cancelled.")

