"""
Add drum_type column to prompts table and tag all prompts with their drum type.
"""
import asyncio
import re
import sys
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from backend.database import engine, async_session_maker
from backend.models import Prompt


# All drum types to detect
DRUM_TYPES = [
    "kick",
    "snare", 
    "closed hihat",
    "open hihat",
    "hihat",
    "ride",
    "crash",
    "floor tom",
    "rack tom",
    "tom",
    "china",
    "splash",
    "cowbell",
    "tambourine",
    "shaker",
    "clap",
    "snap",
    "bongo",
    "triangle",
    "woodblock",
    "cabasa",
    "fx",
    "scratch",
    "impact"
]


def extract_drum_type(prompt_text: str) -> str:
    """Extract drum type from prompt text."""
    text_lower = prompt_text.lower()
    
    # Check for specific drum types (order matters - check specific before general)
    # Floor tom and rack tom must be checked before "tom"
    if "floor tom" in text_lower:
        return "floor tom"
    if "rack tom" in text_lower:
        return "rack tom"
    
    # Check hihat variants before general hihat
    if "closed hihat" in text_lower or "closed hat" in text_lower:
        return "closed hihat"
    if "open hihat" in text_lower or "open hat" in text_lower:
        return "open hihat"
    
    # Check other specific types
    for drum_type in ["kick", "snare", "ride", "crash", "china", "splash", "cowbell", "tambourine", "shaker", "clap", "snap", "bongo", "triangle", "woodblock", "cabasa", "fx", "scratch", "impact"]:
        if drum_type in text_lower:
            return drum_type
    
    # Tom (but not floor/rack tom, and not "bottom")
    if "tom" in text_lower and "bottom" not in text_lower:
        return "tom"
    
    # Hihat/hat (must come after all other checks to avoid false positives)
    if "hihat" in text_lower or "hi-hat" in text_lower or " hat" in text_lower:
        return "hihat"
    
    # Fallback - try to guess from context
    if any(word in text_lower for word in ["808", "909", "sub", "bass drum"]):
        return "kick"
    
    return "unknown"


async def add_drum_type_column():
    """Add drum_type column to existing database."""
    async with engine.begin() as conn:
        try:
            # Try to add the column
            await conn.execute(text("ALTER TABLE prompts ADD COLUMN drum_type VARCHAR"))
            print("✓ Added drum_type column")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                print("✓ drum_type column already exists")
            else:
                print(f"Note: {e}")


async def tag_all_prompts():
    """Tag all prompts with their drum type."""
    async with async_session_maker() as session:
        # Get all prompts
        result = await session.execute(text("SELECT id, text FROM prompts"))
        prompts = result.fetchall()
        
        print(f"Tagging {len(prompts)} prompts with drum types...")
        
        tagged = 0
        unknown = 0
        drum_type_counts = {}
        
        for prompt_id, prompt_text in prompts:
            drum_type = extract_drum_type(prompt_text)
            
            # Update the prompt
            await session.execute(
                text("UPDATE prompts SET drum_type = :drum_type WHERE id = :id"),
                {"drum_type": drum_type, "id": prompt_id}
            )
            
            if drum_type == "unknown":
                unknown += 1
                print(f"  Unknown: {prompt_text[:60]}")
            else:
                tagged += 1
                drum_type_counts[drum_type] = drum_type_counts.get(drum_type, 0) + 1
        
        await session.commit()
        
        print(f"\n✓ Tagged {tagged} prompts")
        print(f"⚠ Unknown: {unknown} prompts")
        print(f"\nDrum type distribution:")
        for drum_type, count in sorted(drum_type_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {drum_type}: {count}")


async def main():
    await add_drum_type_column()
    await tag_all_prompts()


if __name__ == "__main__":
    asyncio.run(main())

