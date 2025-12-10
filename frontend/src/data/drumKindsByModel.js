/**
 * Drum kinds available for each model version
 * v11 - Legacy general drums
 * v12 - General drums (kick, snare, tom, etc.)
 * v13 - Cymbals only
 * v14 - Electronic drums
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

