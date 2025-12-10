#!/usr/bin/env python3
"""
Remove duplicate prompts from the database.
For non-user-generated prompts, keeps the first occurrence (lowest ID).
User-generated prompts are not affected (allowed to have duplicates).
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func
from backend.database import async_session_maker
from backend.models import Prompt, TestResult

async def remove_duplicates():
    """Remove duplicate prompts, keeping the first occurrence."""
    async with async_session_maker() as session:
        print("Finding duplicate prompts (non-user-generated only)...")
        
        # Find duplicates by text (case-insensitive) for non-user-generated prompts
        # Group by text and find which ones have duplicates
        stmt = select(
            func.lower(Prompt.text).label('text_lower'),
            func.count(Prompt.id).label('count'),
            func.min(Prompt.id).label('keep_id')
        ).where(
            Prompt.is_user_generated == False
        ).group_by(
            func.lower(Prompt.text)
        ).having(
            func.count(Prompt.id) > 1
        )
        
        result = await session.execute(stmt)
        duplicates = result.all()
        
        if not duplicates:
            print("✓ No duplicates found!")
            return
        
        print(f"\nFound {len(duplicates)} duplicate text(s):")
        total_to_delete = 0
        
        for dup in duplicates:
            text_lower = dup.text_lower
            keep_id = dup.keep_id
            count = dup.count
            
            # Get all prompts with this text (case-insensitive)
            stmt = select(Prompt).where(
                func.lower(Prompt.text) == text_lower,
                Prompt.is_user_generated == False
            ).order_by(Prompt.id)
            
            result = await session.execute(stmt)
            prompts = result.scalars().all()
            
            # Keep the first one (lowest ID), delete the rest
            to_delete = [p for p in prompts if p.id != keep_id]
            total_to_delete += len(to_delete)
            
            print(f"  '{prompts[0].text[:60]}...' - {count} copies, keeping ID {keep_id}, deleting {len(to_delete)}")
        
        if total_to_delete == 0:
            print("\n✓ No duplicates to remove!")
            return
        
        print(f"\n⚠️  About to delete {total_to_delete} duplicate prompt(s)")
        print("   (Keeping the first occurrence of each duplicate)")
        
        # Allow non-interactive mode via command line argument
        auto_confirm = len(sys.argv) > 1 and sys.argv[1] == '--yes'
        
        if not auto_confirm:
            response = input("\nProceed with deletion? (yes/no): ")
            if response.lower() != 'yes':
                print("Deletion cancelled.")
                return
        else:
            print("\nAuto-confirming deletion (--yes flag provided)...")
        
        # Delete duplicates
        deleted_count = 0
        for dup in duplicates:
            text_lower = dup.text_lower
            keep_id = dup.keep_id
            
            # Get prompts to delete
            stmt = select(Prompt).where(
                func.lower(Prompt.text) == text_lower,
                Prompt.is_user_generated == False,
                Prompt.id != keep_id
            )
            
            result = await session.execute(stmt)
            prompts_to_delete = result.scalars().all()
            
            for prompt in prompts_to_delete:
                # Check if prompt has test results
                results_stmt = select(TestResult).where(TestResult.prompt_id == prompt.id)
                results_result = await session.execute(results_stmt)
                results = results_result.scalars().all()
                
                if results:
                    print(f"  ⚠️  Prompt ID {prompt.id} has {len(results)} test result(s) - skipping deletion")
                    continue
                
                await session.delete(prompt)
                deleted_count += 1
        
        await session.commit()
        print(f"\n✓ Successfully deleted {deleted_count} duplicate prompt(s)")
        
        if deleted_count < total_to_delete:
            skipped = total_to_delete - deleted_count
            print(f"  ⚠️  Skipped {skipped} prompt(s) that have test results")

if __name__ == "__main__":
    asyncio.run(remove_duplicates())

