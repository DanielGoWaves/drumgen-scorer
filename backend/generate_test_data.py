"""
Generate test dataset for dashboard testing.
Creates 1000 test results with prompts, tagged for easy deletion.
"""
import asyncio
import random
import sys
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import async_session_maker
from backend.models import Prompt, TestResult

# Drum types to distribute across
DRUM_TYPES = [
    "kick", "snare", "closed hihat", "open hihat", "hihat",
    "ride", "crash", "floor tom", "rack tom", "tom",
    "china", "splash", "cowbell", "tambourine", "shaker"
]

# Model versions
MODEL_VERSIONS = ["v11", "v12", "v13", "v14", "v15"]

# Test prompt templates (simple ones for testing only)
TEST_PROMPTS = [
    "test {drum} {adj}",
    "test {adj} {drum}",
    "test {drum} for testing",
    "test sample {drum}",
]

ADJECTIVES = ["dry", "wet", "warm", "bright", "dark", "punchy", "tight", "loose"]


async def generate_test_data():
    """Generate 1000 test results with prompts."""
    async with async_session_maker() as session:
        print("Generating test dataset...")
        
        # Create test prompts (100 prompts, each will have ~10 results)
        test_prompts = []
        for i in range(100):
            drum_type = random.choice(DRUM_TYPES)
            difficulty = random.randint(1, 10)
            template = random.choice(TEST_PROMPTS)
            adj = random.choice(ADJECTIVES)
            
            prompt = Prompt(
                text=f"[TEST] {template.format(drum=drum_type, adj=adj)} {i}",
                difficulty=difficulty,
                category="test-data",
                drum_type=drum_type,
                is_user_generated=False,
                used_count=0
            )
            session.add(prompt)
            test_prompts.append(prompt)
        
        await session.commit()
        print(f"✓ Created {len(test_prompts)} test prompts")
        
        # Refresh to get IDs
        for prompt in test_prompts:
            await session.refresh(prompt)
        
        # Create 1000 test results
        results_created = 0
        base_date = datetime.now() - timedelta(days=30)
        
        for i in range(1000):
            # Pick a random prompt
            prompt = random.choice(test_prompts)
            
            # Increment used count
            prompt.used_count += 1
            
            # Determine model version
            # Cymbals should use v13, electric drums use v14, acoustic drums use v15
            cymbal_types = ['ride', 'crash', 'china', 'splash', 'hihat', 'closed hihat', 'open hihat']
            electric_types = ['clap', 'snap', 'scratch', 'impact']
            if prompt.drum_type in cymbal_types:
                version = 'v13'
            elif prompt.drum_type in electric_types:
                version = 'v14'
            else:
                # Acoustic drums: 30% v11, 20% v12 (legacy), 50% v15 (current)
                rand = random.random()
                if rand < 0.3:
                    version = 'v11'
                elif rand < 0.5:
                    version = 'v12'
                else:
                    version = 'v15'
            
            # Generate realistic scores based on difficulty
            # Harder prompts tend to have slightly lower scores
            difficulty_factor = (11 - prompt.difficulty) / 10.0  # 1.0 for easy, 0.1 for hard
            
            # Audio quality: varies but trends based on version
            version_bonus = {'v11': 0, 'v12': 0.5, 'v13': 1.0, 'v14': 0.8, 'v15': 1.2}[version]
            audio_base = 5 + random.uniform(-2, 2) + (difficulty_factor * 1.5) + version_bonus
            audio_score = max(1, min(10, int(audio_base)))
            
            # LLM accuracy: generally high but varies
            llm_base = 7 + random.uniform(-2, 2) + (difficulty_factor * 0.5)
            llm_score = max(1, min(10, int(llm_base)))
            
            # Generate mock JSON based on drum type
            generated_json = {
                "Kind": prompt.drum_type,
                "Velocity": random.choice(["soft", "medium", "hard"]),
                "Era": random.choice(["60s", "70s", "80s", "90s", "modern"]),
                "Process": random.choice(["no room", "plate reverb", "compressed"])
            }
            
            # Spread results over 30 days
            tested_at = base_date + timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59)
            )
            
            result = TestResult(
                prompt_id=prompt.id,
                audio_quality_score=audio_score,
                llm_accuracy_score=llm_score,
                generated_json=generated_json,
                audio_id=f"test_audio_{i}",
                model_version=version,
                notes="[TEST DATA]"
            )
            # Manually set tested_at
            result.tested_at = tested_at
            session.add(result)
            results_created += 1
            
            if (i + 1) % 100 == 0:
                print(f"  Created {i + 1}/1000 test results...")
        
        await session.commit()
        print(f"✓ Created {results_created} test results")
        
        # Print summary
        print("\n" + "="*50)
        print("TEST DATASET SUMMARY")
        print("="*50)
        print(f"Total test prompts: 100")
        print(f"Total test results: 1000")
        print(f"Date range: Last 30 days")
        print(f"Model versions: v11, v12, v13, v14, v15")
        print(f"Drum types: {len(DRUM_TYPES)} types")
        print(f"Difficulty range: 1-10")
        print("\nTo identify test data:")
        print("  - Prompts: category='test-data' OR text starts with '[TEST]'")
        print("  - Results: notes='[TEST DATA]'")
        print("\nTo delete test data, run:")
        print("  python backend/delete_test_data.py")
        print("="*50)


if __name__ == "__main__":
    asyncio.run(generate_test_data())

