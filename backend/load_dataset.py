"""
Load the generated prompt dataset into the database.
"""
import asyncio
import json
import sys
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import get_session
from backend.models import Prompt


async def load_prompts():
    """Load prompts from JSON file into database."""
    # Read the dataset
    dataset_path = Path(__file__).parent / "prompts_dataset_2000.json"
    
    with open(dataset_path, "r") as f:
        prompts_data = json.load(f)
    
    print(f"Loading {len(prompts_data)} prompts into database...")
    
    # Get database session
    async for session in get_session():
        # Add all prompts
        for prompt_data in prompts_data:
            prompt = Prompt(
                text=prompt_data["text"],
                difficulty=prompt_data["difficulty"],
                category=prompt_data["category"],
                expected_parameters=prompt_data.get("expected_parameters"),
            )
            session.add(prompt)
        
        # Commit all at once
        await session.commit()
        print(f"✓ Successfully loaded {len(prompts_data)} prompts into database")
        
        break  # Only need one session iteration


if __name__ == "__main__":
    asyncio.run(load_prompts())

