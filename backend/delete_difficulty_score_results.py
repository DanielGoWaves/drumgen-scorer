#!/usr/bin/env python3
"""
Script to delete test results with specific difficulty and audio score.
Usage: python delete_difficulty_score_results.py <difficulty> <audio_score>
"""
import asyncio
import sys
import os

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import get_session
from backend.models import TestResult, Prompt
from sqlalchemy import select

async def list_difficulty_results(difficulty: int):
    """List all results for a given difficulty to see what scores exist."""
    async for session in get_session():
        query = select(TestResult, Prompt).join(
            Prompt, TestResult.prompt_id == Prompt.id
        ).where(
            Prompt.difficulty == difficulty
        )
        
        result = await session.execute(query)
        results = result.all()
        
        if not results:
            print(f"No results found with difficulty {difficulty}")
            return
        
        print(f"\nFound {len(results)} result(s) with difficulty {difficulty}:")
        score_counts = {}
        for test, prompt in results:
            score = test.audio_quality_score
            score_counts[score] = score_counts.get(score, 0) + 1
        
        print("\nScore distribution:")
        for score in sorted(score_counts.keys()):
            print(f"  Score {score}: {score_counts[score]} result(s)")
        
        print("\nAll results:")
        for test, prompt in results:
            print(f"  - Result ID: {test.id}, Audio Score: {test.audio_quality_score}, LLM Score: {test.llm_accuracy_score}")
        break

async def delete_results(difficulty: int, audio_score: int):
    """Delete all results with the specified difficulty and audio score."""
    async for session in get_session():
        # Find results with the specified difficulty and audio score
        query = select(TestResult, Prompt).join(
            Prompt, TestResult.prompt_id == Prompt.id
        ).where(
            Prompt.difficulty == difficulty
        ).where(
            TestResult.audio_quality_score == audio_score
        )
        
        result = await session.execute(query)
        results = result.all()
        
        if not results:
            print(f"No results found with difficulty {difficulty} and audio score {audio_score}")
            print("\nListing all results for difficulty {difficulty}...")
            await list_difficulty_results(difficulty)
            return
        
        print(f"Found {len(results)} result(s) with difficulty {difficulty} and audio score {audio_score}:")
        for test, prompt in results:
            print(f"  - Result ID: {test.id}")
            print(f"    Prompt: {prompt.text[:60]}...")
            print(f"    Audio Score: {test.audio_quality_score}, LLM Score: {test.llm_accuracy_score}")
            print(f"    Tested at: {test.tested_at}")
        
        # Confirm deletion
        response = input(f"\nDelete these {len(results)} result(s)? (yes/no): ")
        if response.lower() != 'yes':
            print("Deletion cancelled.")
            return
        
        # Delete the results
        for test, prompt in results:
            await session.delete(test)
        
        await session.commit()
        print(f"\n✓ Successfully deleted {len(results)} result(s)")
        break

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python delete_difficulty_score_results.py <difficulty> <audio_score>")
        print("Example: python delete_difficulty_score_results.py 1 1")
        sys.exit(1)
    
    try:
        difficulty = int(sys.argv[1])
        audio_score = int(sys.argv[2])
    except ValueError:
        print("Error: difficulty and audio_score must be integers")
        sys.exit(1)
    
    asyncio.run(delete_results(difficulty, audio_score))

