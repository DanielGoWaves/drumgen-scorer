"""
Generate 2000 new prompts for additional drum kinds (percussion, fx, etc).
"""
import asyncio
import random
import sys
from pathlib import Path
from typing import List, Dict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import async_session_maker
from backend.models import Prompt

# New drum types to focus on
NEW_DRUM_TYPES = [
    "clap", "snap", "bongo", "triangle", "woodblock", 
    "cabasa", "fx", "scratch", "impact"
]

# Generators adapted for percussion/fx
def generate_technical_prompt(drum: str, difficulty: int) -> str:
    patterns = [
        f"dry {drum}", f"wet {drum}", f"{drum} with reverb", f"tight {drum}",
        f"loose {drum}", f"processed {drum}", f"raw {drum}",
        f"{drum} close mic", f"{drum} room mic",
        f"stereo {drum}", f"mono {drum}"
    ]
    if drum in ["bongo", "conga"]:
        patterns.extend([
            f"{drum} high pitch", f"{drum} low pitch", f"{drum} slap",
            f"{drum} open tone", f"{drum} heel-toe"
        ])
    return random.choice(patterns)

def generate_emotional_prompt(drum: str, difficulty: int) -> str:
    adjectives = ["crispy", "crunchy", "smooth", "harsh", "soft", "hard", "aggressive", "gentle", "dark", "bright", "lo-fi", "hi-fi", "distorted", "clean"]
    return f"{random.choice(adjectives)} {drum}"

def generate_artistic_prompt(drum: str, difficulty: int) -> str:
    artists = ["Pharrell", "Timbaland", "Dre", "Kanye", "Dilla", "Prince", "MJ", "Trap", "House", "Techno", "Disco"]
    return f"{random.choice(artists)} style {drum}"

def generate_prompt_for_drum(drum: str, difficulty: int) -> str:
    generators = [generate_technical_prompt, generate_emotional_prompt, generate_artistic_prompt]
    return random.choice(generators)(drum, difficulty)

async def generate_and_save_prompts():
    async with async_session_maker() as session:
        print("Generating 2000 new prompts...")
        
        # Get existing prompts to check for duplicates (case-insensitive)
        from sqlalchemy import func
        existing_result = await session.execute(
            select(func.lower(Prompt.text)).where(Prompt.is_user_generated == False)
        )
        existing_texts = {text.lower() for text in existing_result.scalars().all()}
        print(f"Found {len(existing_texts)} existing prompts to check against")
        
        prompts_to_add = []
        duplicates_skipped = 0
        
        # Generate ~222 prompts for each of the 9 new types
        for drum in NEW_DRUM_TYPES:
            print(f"Generating for {drum}...")
            # Distribute across difficulties 1-10
            for difficulty in range(1, 11):
                # ~22 prompts per difficulty per drum type -> ~2000 total
                count = 22
                if drum == "impact": count = 23 # slight adjust to reach 2000
                
                generated_count = 0
                attempts = 0
                max_attempts = count * 10  # Allow up to 10x attempts to find unique prompts
                
                while generated_count < count and attempts < max_attempts:
                    text = generate_prompt_for_drum(drum, difficulty)
                    text_lower = text.lower()
                    
                    # Skip if duplicate
                    if text_lower in existing_texts:
                        duplicates_skipped += 1
                        attempts += 1
                        continue
                    
                    category = random.choice(["technical", "emotional", "artistic"])
                    
                    prompt = Prompt(
                        text=text,
                        difficulty=difficulty,
                        category=category,
                        drum_type=drum,
                        is_user_generated=False,
                        used_count=0
                    )
                    prompts_to_add.append(prompt)
                    existing_texts.add(text_lower)  # Track in current batch too
                    generated_count += 1
                    attempts += 1
        
        if duplicates_skipped > 0:
            print(f"\n⚠️  Skipped {duplicates_skipped} duplicate prompt(s)")
        
        # Shuffle
        random.shuffle(prompts_to_add)
        
        # Limit to exactly 2000 just in case
        prompts_to_add = prompts_to_add[:2000]
        
        # Add to session in batches
        batch_size = 100
        for i in range(0, len(prompts_to_add), batch_size):
            batch = prompts_to_add[i:i+batch_size]
            session.add_all(batch)
            await session.commit()
            print(f"Saved batch {i//batch_size + 1}/{(len(prompts_to_add) + batch_size - 1)//batch_size}")
            
        print(f"✓ Successfully added {len(prompts_to_add)} new prompts for types: {', '.join(NEW_DRUM_TYPES)}")

if __name__ == "__main__":
    asyncio.run(generate_and_save_prompts())

