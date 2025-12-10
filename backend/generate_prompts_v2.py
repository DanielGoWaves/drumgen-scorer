"""
Generate 4000 properly-scaled prompts for DrumGen testing.

Difficulty scaling:
- 1-2: Very short, single descriptor (e.g., "punchy kick", "bright snare")
- 3-4: Short with 2-3 descriptors (e.g., "tight punchy kick", "warm vintage snare")
- 5-6: Medium with specific parameters (e.g., "70s disco kick with tight attack")
- 7-8: Complex with multiple parameters and context (e.g., "Ludwig 22 inch maple kick with felt beater, warm and punchy like Bonham")
- 9-10: Very complex combining technical, emotional, genre, and brand references

Categories:
- Technical: Size, material, brand, tuning, mic placement
- Emotional: Warm, cold, aggressive, gentle, crisp, muddy
- Genre-based: Rock, jazz, electronic, hip-hop, metal, funk
- Artistic: Reference to famous drummers, songs, or eras
- Sampler/Synth: References to classic samplers and drum machines
"""

import random
import sqlite3
from typing import List, Tuple

# Drum types (excluding 'fx' and '32')
DRUM_TYPES = [
    "kick", "bass drum", "snare", "hihat", "closed hihat", "open hihat",
    "ride", "crash", "tom", "floor tom", "rack tom", "china", "splash",
    "cowbell", "tambourine", "shaker", "clap", "snap", "bongo", 
    "triangle", "woodblock", "cabasa", "impact", "scratch"
]

# Categories for prompts
TECHNICAL_TERMS = {
    "kick": ["22 inch", "24 inch", "20 inch", "18 inch", "maple", "birch", "oak", "beech", "felt beater", "plastic beater", "wood beater", "front head removed", "ported", "dampened", "wide open", "tight", "loose tuning", "high tuning", "low tuning"],
    "snare": ["14x5", "14x6.5", "13x7", "14x8", "brass", "steel", "aluminum", "copper", "maple", "birch", "snares tight", "snares loose", "rimshot", "ghost notes", "cross stick", "center hit", "edge hit", "dampened", "wide open", "high tuning", "low tuning", "piccolo"],
    "hihat": ["14 inch", "15 inch", "13 inch", "heavy", "medium", "thin", "tight", "loose", "half open", "sloshy", "crisp", "dark", "bright", "trashy"],
    "tom": ["10 inch", "12 inch", "13 inch", "14 inch", "16 inch", "maple", "birch", "high tuning", "low tuning", "dampened", "wide open", "single ply", "double ply"],
    "cymbal": ["20 inch", "22 inch", "18 inch", "16 inch", "thin", "medium", "heavy", "dark", "bright", "dry", "trashy", "washy", "pingy", "complex", "brilliant finish", "traditional finish"],
}

EMOTIONAL_TERMS = [
    "warm", "cold", "aggressive", "gentle", "punchy", "soft", "crisp", "muddy",
    "fat", "thin", "round", "sharp", "smooth", "rough", "lively", "dead",
    "boomy", "tight", "loose", "controlled", "wild", "subtle", "bold",
    "vintage", "modern", "classic", "futuristic", "organic", "synthetic",
    "natural", "processed", "raw", "polished", "gritty", "clean"
]

GENRE_TERMS = [
    "rock", "jazz", "blues", "funk", "soul", "r&b", "hip hop", "electronic",
    "metal", "punk", "pop", "disco", "reggae", "latin", "afrobeat", "gospel",
    "country", "folk", "indie", "alternative", "progressive", "fusion",
    "80s", "70s", "60s", "90s", "2000s", "modern", "vintage", "classic"
]

BRANDS = [
    "Ludwig", "DW", "Pearl", "Tama", "Yamaha", "Gretsch", "Sonor", "Mapex",
    "Premier", "Rogers", "Slingerland", "Zildjian", "Sabian", "Meinl", "Paiste"
]

FAMOUS_DRUMMERS = [
    "Bonham", "Peart", "Moon", "Copeland", "Grohl", "Starr", "Baker",
    "Gadd", "Portnoy", "Weckl", "Colaiuta", "Porcaro", "Phillips", "Collins",
    "Blakey", "Roach", "Elvin Jones", "Tony Williams", "Buddy Rich"
]

SAMPLER_REFERENCES = [
    "808", "909", "LinnDrum", "SP-1200", "MPC", "Oberheim DMX", "CR-78",
    "Drumulator", "Simmons", "Alesis HR-16", "E-mu SP-12"
]

PROCESSING_TERMS = [
    "compressed", "gated", "reverbed", "dry", "saturated", "distorted",
    "EQed", "filtered", "layered", "parallel compressed", "tape saturated"
]


def get_cymbal_types():
    """Return cymbal-related drum types."""
    return ["hihat", "closed hihat", "open hihat", "ride", "crash", "china", "splash"]


def generate_difficulty_1(drum_type: str) -> str:
    """Very simple, single word or two words."""
    simple_descriptors = ["punchy", "warm", "bright", "dark", "tight", "fat", "crisp", "clean", "dry", "wet"]
    return f"{random.choice(simple_descriptors)} {drum_type}"


def generate_difficulty_2(drum_type: str) -> str:
    """Simple with one clear descriptor."""
    descriptors = [
        "punchy", "warm", "bright", "dark", "tight", "fat", "crisp", "clean",
        "soft", "hard", "deep", "high", "low", "vintage", "modern", "classic"
    ]
    templates = [
        f"{random.choice(descriptors)} {drum_type}",
        f"{drum_type} with {random.choice(['attack', 'body', 'sustain', 'punch'])}",
        f"nice {random.choice(descriptors)} {drum_type}",
    ]
    return random.choice(templates)


def generate_difficulty_3(drum_type: str) -> str:
    """Two descriptors combined."""
    adj1 = random.choice(["punchy", "warm", "tight", "fat", "crisp", "clean", "deep", "bright"])
    adj2 = random.choice(["vintage", "modern", "classic", "dry", "organic", "natural", "processed"])
    templates = [
        f"{adj1} {adj2} {drum_type}",
        f"{adj1} {drum_type} with {random.choice(['good attack', 'nice sustain', 'tight decay', 'round tone'])}",
        f"{random.choice(GENRE_TERMS)} style {drum_type}",
    ]
    return random.choice(templates)


def generate_difficulty_4(drum_type: str) -> str:
    """Genre or style reference with descriptor."""
    genre = random.choice(GENRE_TERMS)
    adj = random.choice(EMOTIONAL_TERMS)
    templates = [
        f"{adj} {genre} {drum_type}",
        f"{drum_type} for {genre} music",
        f"{genre} style {adj} {drum_type}",
        f"classic {genre} {drum_type} sound",
    ]
    return random.choice(templates)


def generate_difficulty_5(drum_type: str) -> str:
    """Technical detail or specific characteristic."""
    adj = random.choice(EMOTIONAL_TERMS)
    genre = random.choice(GENRE_TERMS)
    
    if drum_type in ["kick", "bass drum"]:
        tech = random.choice(["22 inch", "felt beater", "maple shell", "dampened", "ported"])
    elif drum_type == "snare":
        tech = random.choice(["14x5.5", "brass shell", "tight snares", "rimshot", "maple"])
    elif drum_type in get_cymbal_types():
        tech = random.choice(["dark", "trashy", "washy", "bright", "complex"])
    else:
        tech = random.choice(["maple", "birch", "dampened", "wide open", "high tuning"])
    
    templates = [
        f"{adj} {drum_type} with {tech}",
        f"{tech} {drum_type} for {genre}",
        f"{genre} {drum_type}, {adj} and {tech}",
    ]
    return random.choice(templates)


def generate_difficulty_6(drum_type: str) -> str:
    """Multiple technical parameters."""
    adj1 = random.choice(EMOTIONAL_TERMS)
    adj2 = random.choice(EMOTIONAL_TERMS)
    genre = random.choice(GENRE_TERMS)
    
    if drum_type in ["kick", "bass drum"]:
        specs = f"{random.choice(['22', '24', '20'])} inch {random.choice(['maple', 'birch', 'oak'])} with {random.choice(['felt beater', 'plastic beater', 'wood beater'])}"
    elif drum_type == "snare":
        specs = f"{random.choice(['14x5', '14x6.5', '13x7'])} {random.choice(['brass', 'steel', 'maple', 'aluminum'])} shell"
    elif drum_type in get_cymbal_types():
        specs = f"{random.choice(['18', '20', '22'])} inch {random.choice(['thin', 'medium', 'heavy'])} {random.choice(['dark', 'bright', 'complex'])}"
    else:
        specs = f"{random.choice(['maple', 'birch'])} shell, {random.choice(['high', 'low', 'medium'])} tuning"
    
    templates = [
        f"{adj1} {adj2} {drum_type}, {specs}",
        f"{specs} {drum_type} for {genre}",
        f"{genre} {drum_type}: {adj1}, {specs}",
    ]
    return random.choice(templates)


def generate_difficulty_7(drum_type: str) -> str:
    """Brand reference with technical specs."""
    brand = random.choice(BRANDS)
    adj = random.choice(EMOTIONAL_TERMS)
    genre = random.choice(GENRE_TERMS)
    processing = random.choice(PROCESSING_TERMS)
    
    if drum_type in ["kick", "bass drum"]:
        specs = f"{random.choice(['22', '24'])} inch {random.choice(['maple', 'birch'])} kick"
    elif drum_type == "snare":
        specs = f"{random.choice(['14x5.5', '14x6.5'])} {random.choice(['brass', 'steel', 'maple'])} snare"
    elif drum_type in get_cymbal_types():
        specs = f"{random.choice(['20', '22'])} inch {drum_type}"
    else:
        specs = f"{random.choice(['12', '13', '14', '16'])} inch {drum_type}"
    
    templates = [
        f"{brand} {specs}, {adj} and {processing} for {genre}",
        f"{adj} {brand} style {drum_type}, {processing}, good for {genre}",
        f"{genre} {drum_type} like a {brand}, {adj} with {processing} sound",
    ]
    return random.choice(templates)


def generate_difficulty_8(drum_type: str) -> str:
    """Famous drummer or era reference with specs."""
    drummer = random.choice(FAMOUS_DRUMMERS)
    brand = random.choice(BRANDS)
    adj1 = random.choice(EMOTIONAL_TERMS)
    adj2 = random.choice(EMOTIONAL_TERMS)
    genre = random.choice(GENRE_TERMS)
    
    templates = [
        f"{adj1} {drum_type} like {drummer}'s sound, {adj2} {brand} style with {random.choice(PROCESSING_TERMS)}",
        f"{drummer} inspired {drum_type}, {adj1} {brand} {genre} tone with {random.choice(PROCESSING_TERMS)} processing",
        f"vintage {genre} {drum_type} in the style of {drummer}, {adj1} and {adj2} like a {brand}",
    ]
    return random.choice(templates)


def generate_difficulty_9(drum_type: str) -> str:
    """Complex combining sampler reference, era, and detailed specs."""
    sampler = random.choice(SAMPLER_REFERENCES)
    drummer = random.choice(FAMOUS_DRUMMERS)
    brand = random.choice(BRANDS)
    adj1 = random.choice(EMOTIONAL_TERMS)
    adj2 = random.choice(EMOTIONAL_TERMS)
    genre = random.choice(GENRE_TERMS)
    era = random.choice(["60s", "70s", "80s", "90s"])
    processing = random.choice(PROCESSING_TERMS)
    
    if drum_type in ["kick", "bass drum"]:
        size = f"{random.choice(['22', '24'])} inch"
        material = random.choice(["maple", "birch", "oak"])
    elif drum_type == "snare":
        size = random.choice(["14x5", "14x6.5", "13x7"])
        material = random.choice(["brass", "steel", "maple", "aluminum"])
    else:
        size = f"{random.choice(['12', '14', '16'])} inch"
        material = random.choice(["maple", "birch"])
    
    templates = [
        f"{era} {genre} {drum_type} like {drummer}, {size} {material} {brand} style, {adj1} and {adj2}, {processing}, similar to {sampler} samples",
        f"{brand} {size} {material} {drum_type} with {adj1} {adj2} character, {processing} like {era} {genre} records, {drummer} influence",
        f"vintage {sampler} style {drum_type}, {adj1} {brand} {size} {material} sound, {processing}, {era} {genre} vibe like {drummer}",
    ]
    return random.choice(templates)


def generate_difficulty_10(drum_type: str) -> str:
    """Maximum complexity with all elements combined."""
    sampler = random.choice(SAMPLER_REFERENCES)
    drummer = random.choice(FAMOUS_DRUMMERS)
    brand = random.choice(BRANDS)
    adj1 = random.choice(EMOTIONAL_TERMS)
    adj2 = random.choice(EMOTIONAL_TERMS)
    adj3 = random.choice(EMOTIONAL_TERMS)
    genre1 = random.choice(GENRE_TERMS)
    genre2 = random.choice(GENRE_TERMS)
    era = random.choice(["60s", "70s", "80s", "90s"])
    processing1 = random.choice(PROCESSING_TERMS)
    processing2 = random.choice(PROCESSING_TERMS)
    
    if drum_type in ["kick", "bass drum"]:
        size = f"{random.choice(['22', '24'])} inch"
        material = random.choice(["maple", "birch", "oak"])
        beater = random.choice(["felt beater", "plastic beater", "wood beater"])
    elif drum_type == "snare":
        size = random.choice(["14x5", "14x6.5", "13x7"])
        material = random.choice(["brass", "steel", "maple", "aluminum"])
        beater = random.choice(["tight snares", "loose snares", "snares off"])
    elif drum_type in get_cymbal_types():
        size = f"{random.choice(['18', '20', '22'])} inch"
        material = random.choice(["thin", "medium", "heavy"])
        beater = random.choice(["tip of stick", "shoulder hit", "bell hit"])
    else:
        size = f"{random.choice(['10', '12', '14', '16'])} inch"
        material = random.choice(["maple", "birch"])
        beater = random.choice(["center hit", "edge hit", "rim hit"])
    
    templates = [
        f"I need a {adj1} {adj2} {drum_type} in the style of {drummer}'s {era} {genre1} sound, using a {brand} {size} {material} drum with {beater}, {processing1} and {processing2}, combining {genre1} and {genre2} influences, similar to classic {sampler} samples but more {adj3}",
        f"Looking for a {brand} inspired {size} {material} {drum_type}, {adj1} and {adj2} like {drummer} on {era} {genre1} records, {processing1} with {processing2} for a {adj3} {genre2} feel, reminiscent of {sampler} era drum machines but organic",
        f"Complex {era} {genre1}/{genre2} fusion {drum_type}: {brand} {size} {material}, {beater}, {adj1} {adj2} {adj3} tone, {processing1} then {processing2}, channeling {drummer}'s legendary sound with hints of {sampler} character",
    ]
    return random.choice(templates)


def generate_prompt(drum_type: str, difficulty: int) -> str:
    """Generate a prompt for the given drum type and difficulty."""
    generators = {
        1: generate_difficulty_1,
        2: generate_difficulty_2,
        3: generate_difficulty_3,
        4: generate_difficulty_4,
        5: generate_difficulty_5,
        6: generate_difficulty_6,
        7: generate_difficulty_7,
        8: generate_difficulty_8,
        9: generate_difficulty_9,
        10: generate_difficulty_10,
    }
    return generators[difficulty](drum_type)


def get_category_for_difficulty(difficulty: int) -> str:
    """Assign category based on difficulty and randomness."""
    if difficulty <= 2:
        return "technical"  # Simple technical descriptions
    elif difficulty <= 4:
        return random.choice(["technical", "emotional", "genre"])
    elif difficulty <= 6:
        return random.choice(["technical", "genre", "emotional"])
    elif difficulty <= 8:
        return random.choice(["artistic", "genre", "technical"])
    else:
        return random.choice(["combo", "artistic", "sampler"])


def generate_all_prompts() -> List[Tuple[str, int, str, str]]:
    """Generate 4000 prompts: 400 per difficulty level, distributed across drum types."""
    prompts = []
    
    prompts_per_difficulty = 400
    
    for difficulty in range(1, 11):
        prompts_per_drum_type = prompts_per_difficulty // len(DRUM_TYPES)
        remainder = prompts_per_difficulty % len(DRUM_TYPES)
        
        for i, drum_type in enumerate(DRUM_TYPES):
            count = prompts_per_drum_type + (1 if i < remainder else 0)
            
            for _ in range(count):
                text = generate_prompt(drum_type, difficulty)
                category = get_category_for_difficulty(difficulty)
                prompts.append((text, difficulty, category, drum_type))
    
    # Shuffle to mix up the order
    random.shuffle(prompts)
    
    return prompts


def verify_prompts(prompts: List[Tuple[str, int, str, str]]):
    """Verify prompt distribution and length scaling."""
    print("\n=== Verification ===")
    
    # Check difficulty distribution
    diff_counts = {}
    diff_lengths = {}
    for text, diff, _, _ in prompts:
        diff_counts[diff] = diff_counts.get(diff, 0) + 1
        if diff not in diff_lengths:
            diff_lengths[diff] = []
        diff_lengths[diff].append(len(text))
    
    print("\nDifficulty distribution:")
    for d in sorted(diff_counts.keys()):
        avg_len = sum(diff_lengths[d]) / len(diff_lengths[d])
        min_len = min(diff_lengths[d])
        max_len = max(diff_lengths[d])
        print(f"  Difficulty {d}: {diff_counts[d]} prompts, avg length: {avg_len:.1f}, range: {min_len}-{max_len}")
    
    # Check drum type distribution
    drum_counts = {}
    for _, _, _, drum_type in prompts:
        drum_counts[drum_type] = drum_counts.get(drum_type, 0) + 1
    
    print("\nDrum type distribution:")
    for dt in sorted(drum_counts.keys()):
        print(f"  {dt}: {drum_counts[dt]}")
    
    # Show examples for each difficulty
    print("\n=== Sample Prompts by Difficulty ===")
    for diff in range(1, 11):
        examples = [p for p in prompts if p[1] == diff][:3]
        print(f"\nDifficulty {diff}:")
        for text, _, cat, dt in examples:
            print(f"  [{dt}] ({len(text)} chars) {text[:100]}{'...' if len(text) > 100 else ''}")


def save_prompts_to_db(prompts: List[Tuple[str, int, str, str]]):
    """Save prompts to the database, skipping duplicates."""
    conn = sqlite3.connect("drumgen.db")
    cursor = conn.cursor()
    
    # Get existing prompts (case-insensitive) to check for duplicates
    cursor.execute("SELECT LOWER(text) FROM prompts WHERE is_user_generated = 0")
    existing_texts = {row[0] for row in cursor.fetchall()}
    
    inserted_count = 0
    skipped_count = 0
    
    # Insert prompts, skipping duplicates
    for text, difficulty, category, drum_type in prompts:
        text_lower = text.lower()
        
        # Skip if duplicate
        if text_lower in existing_texts:
            skipped_count += 1
            continue
        
        cursor.execute(
            "INSERT INTO prompts (text, difficulty, category, drum_type, is_user_generated, used_count) VALUES (?, ?, ?, ?, 0, 0)",
            (text, difficulty, category, drum_type)
        )
        existing_texts.add(text_lower)  # Track in current batch
        inserted_count += 1
    
    conn.commit()
    
    if skipped_count > 0:
        print(f"\n⚠️  Skipped {skipped_count} duplicate prompt(s)")
    print(f"✓ Saved {inserted_count} new prompts to database")
    conn.close()


if __name__ == "__main__":
    print("Generating 4000 prompts...")
    prompts = generate_all_prompts()
    
    verify_prompts(prompts)
    
    print("\n" + "="*50)
    response = input("\nSave to database? (y/n): ")
    if response.lower() == 'y':
        save_prompts_to_db(prompts)
    else:
        print("Prompts not saved.")

