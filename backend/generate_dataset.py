"""
Generate a comprehensive dataset of 2000 natural-sounding drum prompts.
200 prompts per difficulty level (1-10), distributed across all drum types.
"""
import json
import random
from typing import List, Dict

# Drum types from DrumGen site
DRUM_TYPES = [
    "kick", "snare", "hihat", "closed hihat", "open hihat", 
    "ride", "crash", "tom", "floor tom", "rack tom",
    "china", "splash", "cowbell", "tambourine", "shaker"
]

# Natural prompt patterns by category

def generate_technical_prompt(drum: str, difficulty: int) -> str:
    """Technical prompts focus on specs, sizes, materials, tuning."""
    patterns = [
        # Simple (1-3)
        f"dry {drum}",
        f"wet {drum}",
        f"{drum} with room",
        f"{drum} no reverb",
        f"tight {drum}",
        f"loose {drum}",
        
        # Medium (4-6)
        f"{random.choice(['14 inch', '12 inch', '16 inch', '18 inch', '20 inch', '22 inch'])} {drum}",
        f"{random.choice(['birch', 'maple', 'mahogany', 'acrylic', 'steel', 'bronze'])} {drum}",
        f"{drum} {random.choice(['center hit', 'rim shot', 'side stick', 'edge hit'])}",
        f"{random.choice(['deep', 'shallow', 'medium depth'])} {drum}",
        f"{drum} {random.choice(['high tuning', 'low tuning', 'medium tuning'])}",
        
        # Complex (7-10)
        f"{random.choice(['10x5', '12x6', '14x5.5', '14x6.5', '16x16', '18x14', '22x18'])} {drum}, {random.choice(['coated', 'clear', 'hydraulic'])} head",
        f"{random.choice(['vintage', 'modern', '70s', '80s'])} {random.choice(['Ludwig', 'Gretsch', 'Pearl', 'Yamaha', 'Tama'])} {drum}",
        f"{drum} with {random.choice(['felt', 'wood', 'plastic'])} beater, {random.choice(['front head off', 'both heads on', 'muffled'])}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:6])
    elif difficulty <= 6:
        return random.choice(patterns[6:11])
    else:
        return random.choice(patterns[11:])

def generate_emotional_prompt(drum: str, difficulty: int) -> str:
    """Emotional prompts use descriptive adjectives and feel."""
    adjectives_simple = ["punchy", "warm", "bright", "dark", "fat", "thin", "crispy", "soft"]
    adjectives_complex = ["aggressive", "gentle", "fuzzy", "clear", "muddy", "trashy", "clean", "gritty", "smooth", "rough"]
    
    patterns = [
        # Simple (1-3)
        f"{random.choice(adjectives_simple)} {drum}",
        f"{drum} that sounds {random.choice(['warm', 'crispy', 'punchy', 'tight'])}",
        
        # Medium (4-6)
        f"{random.choice(adjectives_simple)} and {random.choice(adjectives_simple)} {drum}",
        f"{drum} with a {random.choice(['warm', 'bright', 'dark', 'fat'])} tone",
        
        # Complex (7-10)
        f"{random.choice(adjectives_complex)}, {random.choice(adjectives_simple)} {drum} with {random.choice(['a lot of body', 'nice decay', 'quick attack', 'long sustain'])}",
        f"{drum} that's {random.choice(adjectives_complex)} but still {random.choice(['controlled', 'musical', 'usable'])}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:2])
    elif difficulty <= 6:
        return random.choice(patterns[2:4])
    else:
        return random.choice(patterns[4:])

def generate_artistic_prompt(drum: str, difficulty: int) -> str:
    """Artistic prompts reference songs, artists, albums, eras."""
    artists = ["John Bonham", "Steve Gadd", "Tony Williams", "Questlove", "J Dilla", "Clyde Stubblefield", "Bernard Purdie", "Jeff Porcaro"]
    songs = ["Billie Jean", "When the Levee Breaks", "Superstition", "Rosanna", "In the Air Tonight", "Good Times Bad Times", "Amen Brother"]
    albums = ["Led Zeppelin IV", "Thriller", "Songs in the Key of Life", "Aja"]
    eras = ["60s", "70s", "80s", "90s", "2000s"]
    
    patterns = [
        # Simple (1-3)
        f"{random.choice(eras)} {drum}",
        f"vintage {drum}",
        f"classic rock {drum}",
        
        # Medium (4-6)
        f"{drum} like {random.choice(songs)}",
        f"{random.choice(artists)} style {drum}",
        f"{random.choice(eras)} {random.choice(['funk', 'rock', 'jazz', 'soul'])} {drum}",
        
        # Complex (7-10)
        f"{drum} similar to {random.choice(songs)}, that {random.choice(['punchy', 'tight', 'warm', 'big'])} sound",
        f"{random.choice(artists)} {drum} from the {random.choice(albums)} sessions",
        f"{random.choice(eras)} {random.choice(['Motown', 'Stax', 'Atlantic', 'Blue Note'])} {drum}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:3])
    elif difficulty <= 6:
        return random.choice(patterns[3:6])
    else:
        return random.choice(patterns[6:])

def generate_genre_prompt(drum: str, difficulty: int) -> str:
    """Genre-based prompts."""
    genres = ["rock", "jazz", "funk", "hip-hop", "pop", "R&B", "soul", "metal", "punk", "indie", "electronic", "trap"]
    subgenres = ["boom bap", "trap", "lo-fi", "hard rock", "bebop", "fusion", "neo-soul"]
    
    patterns = [
        # Simple (1-3)
        f"{random.choice(genres)} {drum}",
        f"{drum} for {random.choice(genres)}",
        
        # Medium (4-6)
        f"{random.choice(genres)} {drum} with {random.choice(['some room', 'tight sound', 'natural decay'])}",
        f"{random.choice(subgenres)} {drum}",
        
        # Complex (7-10)
        f"{random.choice(genres)} {drum}, {random.choice(['punchy', 'warm', 'aggressive', 'smooth'])} with {random.choice(['parallel compression', 'some saturation', 'transient shaping'])}",
        f"{drum} for {random.choice(subgenres)} production, {random.choice(['tight and controlled', 'big and roomy', 'vintage vibe'])}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:2])
    elif difficulty <= 6:
        return random.choice(patterns[2:4])
    else:
        return random.choice(patterns[4:])

def generate_processing_prompt(drum: str, difficulty: int) -> str:
    """Prompts that mention processing, effects, production."""
    simple_fx = ["reverb", "compression", "room", "close mic"]
    complex_fx = ["plate reverb", "spring reverb", "tape saturation", "parallel compression", "transient shaping", "bitcrushing"]
    
    patterns = [
        # Simple (1-3)
        f"{drum} with {random.choice(['reverb', 'compression', 'some room'])}",
        f"{drum} no effects",
        
        # Medium (4-6)
        f"{drum} with {random.choice(simple_fx)} and {random.choice(['light compression', 'subtle saturation'])}",
        f"compressed {drum} with {random.choice(['room', 'a bit of reverb', 'natural ambience'])}",
        
        # Complex (7-10)
        f"{drum} with {random.choice(complex_fx)}, {random.choice(['close mics only', 'room mics blended', 'overhead perspective'])}",
        f"{drum} processed with {random.choice(complex_fx)} and {random.choice(complex_fx)}",
        f"{random.choice(['heavily compressed', 'saturated', 'transient shaped'])} {drum} with {random.choice(['plate reverb', 'spring reverb', 'chamber reverb'])}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:2])
    elif difficulty <= 6:
        return random.choice(patterns[2:4])
    else:
        return random.choice(patterns[4:])

def generate_sampler_prompt(drum: str, difficulty: int) -> str:
    """Prompts referencing vintage samplers and machines."""
    samplers = ["MPC", "SP-404", "SP-1200", "Akai S950", "E-mu SP-1200", "Roland TR-808", "Roland TR-909", "LinnDrum", "DMX"]
    
    patterns = [
        # Simple (1-3)
        f"808 {drum}",
        f"909 {drum}",
        
        # Medium (4-6)
        f"{drum} like an {random.choice(['MPC', 'SP-404', '808', '909'])}",
        f"{random.choice(samplers)} {drum}",
        
        # Complex (7-10)
        f"{drum} sampled through {random.choice(samplers)}, {random.choice(['12-bit', 'lo-fi', 'vintage'])} quality",
        f"{random.choice(['crunchy', 'lo-fi', 'vintage'])} {drum} like {random.choice(samplers)} era",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:2])
    elif difficulty <= 6:
        return random.choice(patterns[2:4])
    else:
        return random.choice(patterns[4:])

def generate_combo_prompt(drum: str, difficulty: int) -> str:
    """Combination of multiple approaches."""
    patterns = [
        # Simple (1-3)
        generate_technical_prompt(drum, difficulty),
        generate_emotional_prompt(drum, difficulty),
        
        # Medium (4-6)
        f"{generate_emotional_prompt(drum, difficulty).split()[0]} {random.choice(['60s', '70s', '80s', '90s'])} {drum}",
        f"{generate_genre_prompt(drum, difficulty)} with {random.choice(['some compression', 'a bit of room', 'natural tone'])}",
        
        # Complex (7-10)
        f"{generate_artistic_prompt(drum, difficulty)}, {random.choice(['punchy', 'warm', 'tight', 'fat'])} with {random.choice(['plate reverb', 'compression', 'saturation'])}",
        f"{generate_genre_prompt(drum, difficulty)}, {random.choice(['processed', 'saturated', 'compressed'])} but {random.choice(['natural', 'musical', 'not over the top'])}",
    ]
    
    if difficulty <= 3:
        return random.choice(patterns[:2])
    elif difficulty <= 6:
        return random.choice(patterns[2:4])
    else:
        return random.choice(patterns[4:])

def generate_prompt_for_drum_and_difficulty(drum: str, difficulty: int, category: str) -> str:
    """Generate a single natural prompt."""
    generators = {
        "technical": generate_technical_prompt,
        "emotional": generate_emotional_prompt,
        "artistic": generate_artistic_prompt,
        "genre": generate_genre_prompt,
        "processing": generate_processing_prompt,
        "sampler": generate_sampler_prompt,
        "combo": generate_combo_prompt,
    }
    
    return generators[category](drum, difficulty)

def generate_full_dataset() -> List[Dict]:
    """Generate 2000 prompts: 200 per difficulty level (1-10)."""
    prompts = []
    categories = ["technical", "emotional", "artistic", "genre", "processing", "sampler", "combo"]
    
    for difficulty in range(1, 11):
        print(f"Generating difficulty {difficulty}...")
        
        # 200 prompts per difficulty
        for i in range(200):
            # Cycle through drum types evenly
            drum = DRUM_TYPES[i % len(DRUM_TYPES)]
            
            # Vary the category
            category = categories[i % len(categories)]
            
            # Generate natural prompt
            text = generate_prompt_for_drum_and_difficulty(drum, difficulty, category)
            
            prompts.append({
                "text": text,
                "difficulty": difficulty,
                "category": category,
                "expected_parameters": None
            })
    
    # Shuffle to mix things up
    random.shuffle(prompts)
    
    return prompts

if __name__ == "__main__":
    print("Generating 2000 drum prompts...")
    dataset = generate_full_dataset()
    
    # Save to JSON
    with open("prompts_dataset_2000.json", "w") as f:
        json.dump(dataset, f, indent=2)
    
    print(f"✓ Generated {len(dataset)} prompts")
    print(f"✓ Saved to prompts_dataset_2000.json")
    
    # Show some examples
    print("\nExample prompts:")
    for i in range(10):
        p = dataset[i]
        print(f"  [{p['difficulty']}/10] ({p['category']}) {p['text']}")

