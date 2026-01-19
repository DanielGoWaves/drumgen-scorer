"""
Seed a small batch of low-score test results to ensure heat map shows red bands.
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure imports work when run as a script
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import async_session_maker
from backend.models import Prompt, TestResult


async def add_low_scores():
    async with async_session_maker() as session:
        # Fetch some test prompts (category test-data) across difficulties
        prompts_result = await session.execute(
            Prompt.__table__.select().where(Prompt.category == "test-data")
        )
        prompts = prompts_result.fetchall()
        if not prompts:
            print("No test-data prompts found. Run generate_test_data first.")
            return

        # Pick 20 prompts spread across difficulties
        selected_prompts = []
        by_diff = {}
        for row in prompts:
            prompt = Prompt(**row._mapping)
            by_diff.setdefault(prompt.difficulty, []).append(prompt)
        for diff in range(1, 11):
            if by_diff.get(diff):
                selected_prompts.append(random.choice(by_diff[diff]))
        while len(selected_prompts) < 20 and prompts:
            selected_prompts.append(random.choice([Prompt(**p._mapping) for p in prompts]))

        base_date = datetime.now() - timedelta(days=3)
        created = 0
        for i, prompt in enumerate(selected_prompts):
            # Create 2 low audio results per prompt
            for j in range(2):
                audio_score = random.choice([1, 2, 3])
                llm_score = random.choice([4, 5, 6])  # keep llm moderate
                tested_at = base_date + timedelta(hours=i * 2 + j)
                # Cymbals use v16, electric use v14, acoustic use v15 or legacy v12
                cymbal_types = ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat']
                electric_types = ['clap', 'snap', 'scratch', 'impact']
                if prompt.drum_type and prompt.drum_type.lower() in cymbal_types:
                    version = "v16"
                elif prompt.drum_type and prompt.drum_type.lower() in electric_types:
                    version = "v14"
                else:
                    version = random.choice(["v11", "v12", "v15"])

                tr = TestResult(
                    prompt_id=prompt.id,
                    audio_quality_score=audio_score,
                    llm_accuracy_score=llm_score,
                    generated_json={"Kind": prompt.drum_type or "unknown"},
                    audio_id=f"low_audio_{i}_{j}",
                    model_version=version,
                    notes="[TEST DATA] low-audio"
                )
                tr.tested_at = tested_at
                session.add(tr)
                prompt.used_count += 1
                created += 1

        await session.commit()
        print(f"Created {created} low-score test results.")


if __name__ == "__main__":
    asyncio.run(add_low_scores())

