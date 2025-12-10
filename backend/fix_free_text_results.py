#!/usr/bin/env python3
"""
Script to fix free text results that might have missing drum_type or other issues.
This ensures all test results can be properly filtered in the results page.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from backend.database import async_session_maker
from backend.models import TestResult, Prompt


async def fix_results():
    """Check and fix any test results that might have issues."""
    async with async_session_maker() as session:
        # Get all test results
        result = await session.execute(select(TestResult))
        all_results = result.scalars().all()
        
        print(f"Found {len(all_results)} test results")
        
        fixed_count = 0
        issues_found = []
        
        for test_result in all_results:
            # Get the associated prompt
            prompt_result = await session.execute(
                select(Prompt).where(Prompt.id == test_result.prompt_id)
            )
            prompt = prompt_result.scalar_one_or_none()
            
            if not prompt:
                issues_found.append({
                    'result_id': test_result.id,
                    'issue': 'Missing prompt',
                    'prompt_id': test_result.prompt_id
                })
                continue
            
            # Check if prompt is user-generated but missing drum_type
            if prompt.is_user_generated and not prompt.drum_type:
                issues_found.append({
                    'result_id': test_result.id,
                    'issue': 'User-generated prompt missing drum_type',
                    'prompt_id': prompt.id,
                    'prompt_text': prompt.text[:50] + '...' if len(prompt.text) > 50 else prompt.text
                })
                # Try to extract drum type from generated_json if available
                if test_result.generated_json and 'Kind' in test_result.generated_json:
                    drum_type = test_result.generated_json['Kind']
                    prompt.drum_type = drum_type
                    await session.commit()
                    print(f"✓ Fixed prompt {prompt.id}: Set drum_type to '{drum_type}'")
                    fixed_count += 1
        
        print(f"\n{'='*60}")
        print(f"Summary:")
        print(f"  Total results checked: {len(all_results)}")
        print(f"  Issues found: {len(issues_found)}")
        print(f"  Fixed automatically: {fixed_count}")
        print(f"  Needs manual attention: {len(issues_found) - fixed_count}")
        
        if issues_found:
            print(f"\n{'='*60}")
            print("Issues found:")
            for issue in issues_found:
                print(f"  Result ID {issue['result_id']}: {issue['issue']}")
                if 'prompt_text' in issue:
                    print(f"    Prompt: {issue['prompt_text']}")
        
        # Verify all results now have valid prompts with drum_type
        print(f"\n{'='*60}")
        print("Verification:")
        result = await session.execute(
            select(TestResult)
            .join(Prompt, TestResult.prompt_id == Prompt.id)
        )
        verified_results = result.scalars().all()
        print(f"  Results with valid prompts: {len(verified_results)}/{len(all_results)}")
        
        # Check user-generated prompts
        user_gen_result = await session.execute(
            select(Prompt).where(Prompt.is_user_generated == True)
        )
        user_gen_prompts = user_gen_result.scalars().all()
        missing_drum_type = [p for p in user_gen_prompts if not p.drum_type]
        print(f"  User-generated prompts: {len(user_gen_prompts)}")
        print(f"  Missing drum_type: {len(missing_drum_type)}")
        
        if missing_drum_type:
            print(f"\n  Prompts still missing drum_type:")
            for p in missing_drum_type[:10]:  # Show first 10
                print(f"    ID {p.id}: {p.text[:60]}...")
            if len(missing_drum_type) > 10:
                print(f"    ... and {len(missing_drum_type) - 10} more")


if __name__ == "__main__":
    asyncio.run(fix_results())

