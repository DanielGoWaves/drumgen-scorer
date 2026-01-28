/**
 * Drum kinds available for each model version
 * v11 - Legacy general drums
 * v12 - Legacy general drums (deprecated, use v15)
 * v13 - Cymbals only (legacy)
 * v14 - Electronic drums (legacy)
 * v15 - Acoustic drums (kick, snare, tom, etc.)
 * v16 - Cymbals only (current)
 * v17 - Electronic drums (current)
 */

export const DRUM_KINDS_BY_MODEL = {
  v11: [
    'Kick',
    'Snare',
    'Tom',
    'Ride',
    'Crash',
    'HiHat',
    'ClosedHiHat',
    'OpenHiHat'
  ],
  v12: [
    'Kick',
    'Snare',
    'Tom',
    'Ride',
    'Crash',
    'HiHat',
    'ClosedHiHat',
    'OpenHiHat',
    'China',
    'Splash',
    'Bongo',
    'Conga',
    'Triangle',
    'Woodblock',
    'Cabasa'
  ],
  v13: [
    'Ride',
    'Crash',
    'HiHat',
    'ClosedHiHat',
    'OpenHiHat',
    'China',
    'Splash'
  ],
  v14: [
    'Clap',
    'Snap',
    'Scratch',
    'Impact',
    'Kick',
    'Snare'
  ],
  v15: [
    'Kick',
    'Snare',
    'Tom',
    'Ride',
    'Crash',
    'HiHat',
    'ClosedHiHat',
    'OpenHiHat',
    'China',
    'Splash',
    'Bongo',
    'Conga',
    'Triangle',
    'Woodblock',
    'Cabasa'
  ],
  v16: [
    'Ride',
    'Crash',
    'HiHat',
    'ClosedHiHat',
    'OpenHiHat',
    'China',
    'Splash'
  ],
  v17: [
    'Clap',
    'Snap',
    'Scratch',
    'Impact',
    'Kick',
    'Snare'
  ]
};

/**
 * Helper function to convert drum kind to drum type
 * (Normalizes the kind to match database drum_type format)
 */
export const kindToDrumType = (kind) => {
  if (!kind) return '';
  return kind.toLowerCase().replace(/\s+/g, '_');
};

