// SKI-AUDIO: authored snow, wind and equipment sounds. Voice ids remain text-only.
const cue = (name, {loop = false, bus = 'vehicle', volume = 1} = {}) => Object.freeze({
  bus, volume, pitchRange: [1, 1], volumeRange: [1, 1], priority: 55,
  limit: loop ? 1 : 3, spatial: null, duck: null, flag: 'heli-skiing',
  file: `ski/${name}.ogg`, loop,
});
export const SKI_CUES = Object.freeze({
  'ski.carve': cue('carve', {loop: true}),
  'ski.skid': cue('skid', {loop: true}),
  'ski.wind': cue('wind', {loop: true, bus: 'ambience'}),
  'ski.gate': cue('gate'),
  'ski.pop': cue('pop'),
  'ski.land': cue('land-soft'),
  'ski.land.hard': cue('land-hard', {bus: 'impacts'}),
  'ski.tumble': cue('tumble', {bus: 'impacts'}),
  'ski.powder': cue('powder', {loop: true}),
  'ski.step-out': cue('step-out'),
});

export function skiEventCue(event) {
  switch (event.type) {
    case 'skiGate': return event.passed ? 'ski.gate' : null;
    case 'skiPop': return 'ski.pop';
    case 'skiLand': return event.safe ? 'ski.land' : 'ski.land.hard';
    case 'skiTumble': return 'ski.tumble';
    default: return null;
  }
}

// Speeds are m/s. Read-only presentation; the simulation owns all movement.
export function skiBeds(run, deepSnow = 0) {
  const skier = run?.skier;
  const speed = Number.isFinite(skier?.speed) ? Math.max(0, skier.speed) : 0;
  const amount = Math.min(1, speed / 25);
  const active = !!skier && !run.ended;
  return Object.fromEntries(['carve', 'skid', 'wind', 'powder'].map(name => {
    const wanted = active && speed > .5 && (name === 'wind' || skier.grounded &&
      (name === 'carve' ? skier.carving && !skier.tumbling : name === 'powder' ? deepSnow > 0 && !skier.tumbling : skier.skidding));
    return [`ski.${name}`, {gain: wanted ? amount * (name === 'wind' ? .65 : name === 'powder' ? Math.min(1, Math.max(0, deepSnow)) * .75 : .85) : 0,
      rate: .7 + .6 * amount, lowpass: 1800 + 6500 * amount}];
  }));
}
