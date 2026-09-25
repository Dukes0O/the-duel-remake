// Cue data is the single home for assets, routing and authored sound recipes.
export const BUS_NAMES = Object.freeze([
  'engine',
  'vehicle',
  'weapons',
  'impacts',
  'ambience',
  'music',
  'voice',
  'interface',
]);
const cue = (bus, data = {}) => ({
  bus,
  volume: 1,
  pitchRange: [1, 1],
  volumeRange: [1, 1],
  priority: 50,
  limit: 12,
  spatial: null,
  duck: null,
  ...data,
});
const tone = (
  frequency,
  duration,
  volume,
  type = 'sine',
  delay = 0,
  endFrequency = null,
) => ({ kind: 'tone', frequency, duration, volume, type, delay, endFrequency });
const noise = (frequency, duration, volume, type = 'bandpass') => ({
  kind: 'noise',
  frequency,
  duration,
  volume,
  type,
});
export const SOUND_BANK = {
  'gatekeeper.welcome': cue('voice', {
    file: 'gatekeeper-welcome.mp3',
    volume: 2.2,
    limit: 1,
    priority: 100,
    duck: 'voice',
    flag: 'hidden-road',
  }),
  'engine.fallback': cue('engine', {
    sample: 'engine',
    file: 'engine-loop.flac',
    loop: true,
  }),
  'engine.idle': cue('engine', {
    sample: 'idle',
    file: 'engine-idle.flac',
    loop: true,
    rpm: 0.18,
    toneHz: 75.73,
  }),
  'engine.low': cue('engine', {
    sample: 'loadLow',
    file: 'engine-load-low.flac',
    loop: true,
    rpm: 0.44,
    toneHz: 81,
  }),
  'engine.mid': cue('engine', {
    sample: 'loadMid',
    file: 'engine-load-mid.flac',
    loop: true,
    rpm: 0.65,
    toneHz: 81,
  }),
  'engine.high': cue('engine', {
    sample: 'loadHigh',
    file: 'engine-load-high.flac',
    loop: true,
    rpm: 0.82,
    toneHz: 86,
  }),
  'engine.coast': cue('engine', {
    sample: 'coast',
    file: 'engine-coast.flac',
    loop: true,
  }),
  'engine.throttle': cue('engine', {
    sample: 'throttle',
    file: 'engine-throttle.flac',
    limit: 1,
  }),
  'engine.lift': cue('engine', {
    sample: 'lift',
    file: 'engine-lift.flac',
    limit: 1,
  }),
  'engine.shift': cue('engine', {
    sample: 'shift',
    file: 'engine-shift.flac',
    limit: 1,
  }),
  'engine.shift-fallback': cue('engine', {
    dry: true,
    layers: [tone(95, 0.085, 0.075, 'triangle')],
  }),
  'vehicle.tires': cue('vehicle', {
    sample: 'squeal',
    file: 'tire-loop.flac',
    loop: true,
  }),
  'vehicle.wind': cue('vehicle', { filter: ['lowpass', 1600], loop: true }),
  'vehicle.road': cue('vehicle', { filter: ['bandpass', 950], loop: true }),
  'vehicle.gravel': cue('vehicle', { filter: ['lowpass', 1600], loop: true }),
  'vehicle.boost': cue('vehicle', { filter: ['highpass', 2400], loop: true }),
  'vehicle.siren': cue('vehicle', {
    loop: true,
    harmonic: 1.5,
    harmonicGain: 0.22,
  }),
  'ambience.coast': cue('ambience', {
    biome: 'coast',
    file: 'ambience-coast.flac',
    gain: 0.18,
    cutoff: 3500,
    loop: true,
  }),
  'ambience.forest': cue('ambience', {
    biome: 'alpine',
    file: 'ambience-forest.flac',
    gain: 0.15,
    cutoff: 6000,
    loop: true,
  }),
  'ambience.stadium': cue('ambience', {
    biome: 'arena',
    file: 'ambience-stadium.flac',
    gain: 0.2,
    cutoff: 4200,
    loop: true,
  }),
  'combat.blast': cue('impacts', {
    sample: 'explosion',
    file: 'catastrophic-blast.flac',
    volume: 2.45,
    priority: 80,
    limit: 12,
    duck: 'blast',
    cutoff: 2600,
    variants: [
      { rate: 0.8, attack: 0.009 },
      { rate: 1.2, attack: 0.018 },
      { rate: 1.08, attack: 0.028 },
    ],
    fallback: tone(65, 0.45, 0.4, 'sine', 0, 22),
  }),
  'combat.hit': cue('impacts', {
    layers: [noise(1050, 0.18, 2.15), tone(150, 0.18, 2.5, 'triangle', 0, 45)],
  }),
  'combat.explosion': cue('impacts', {
    volume: 1.15,
    sampleRef: 'explosion',
    duck: 'blast',
  }),
  'combat.rpg-direct': cue('impacts', {
    layers: [
      noise(620, 0.2, 0.17, 'lowpass'),
      tone(128, 0.24, 0.16, 'triangle', 0, 46),
    ],
  }),
  'combat.rpg-splash': cue('impacts', {
    layers: [
      noise(420, 0.2, 0.13, 'lowpass'),
      tone(96, 0.24, 0.12, 'triangle', 0, 35),
    ],
  }),
  'raider.shot': cue('weapons', {
    flag: 'wasteland2',
    files: [
      'raider-arcade-a.ogg',
      'raider-arcade-b.ogg',
      'raider-arcade-c.ogg',
    ],
    volume: 1.8,
    layers: [
      noise(2250, 0.085, 0.115),
      tone(470, 0.13, 0.065, 'triangle', 0, 205),
    ],
  }),
  'raider.warning': cue('interface', {
    layers: [tone(630, 0.11, 0.055), tone(475, 0.15, 0.06, 'sine', 0.11)],
  }),
  'repair.start': cue('vehicle', {
    dry: true,
    layers: [
      noise(1650, 0.075, 0.075),
      tone(410, 0.13, 0.075, 'triangle', 0, 220),
    ],
  }),
  'repair.complete': cue('vehicle', {
    dry: true,
    layers: [
      tone(530, 0.16, 0.09, 'triangle', 0, 760),
      tone(820, 0.14, 0.055, 'sine', 0.065, 1040),
    ],
  }),
  'repair.interrupted': cue('vehicle', {
    dry: true,
    layers: [tone(240, 0.15, 0.055, 'triangle', 0, 110)],
  }),
  'weapon.ufo.fire': cue('weapons', {
    flag: 'wasteland2',
    files: ['ufo-arcade-a.ogg', 'ufo-arcade-b.ogg', 'ufo-arcade-c.ogg'],
    volume: 2.1,
    layers: [
      tone(210, 0.32, 0.075, 'triangle', 0, 390),
      ...Array.from({ length: 4 }, (_, i) =>
        tone(520 + i * 95, 0.12, 0.085, 'sine', i * 0.057, 700 + i * 125),
      ),
    ],
  }),
  'weapon.bomb.fire': cue('weapons', {
    flag: 'wasteland2',
    files: ['bomb-arcade-a.ogg', 'bomb-arcade-b.ogg', 'bomb-arcade-c.ogg'],
    volume: 1.8,
    layers: [
      noise(460, 0.17, 0.16, 'lowpass'),
      tone(138, 0.22, 0.19, 'triangle', 0, 52),
    ],
  }),
  'weapon.crossbow.fire': cue('weapons', {
    flag: 'wasteland2',
    files: ['crossbow-pew-a.ogg', 'crossbow-pew-b.ogg', 'crossbow-pew-c.ogg'],
    volume: 1.8,
    layers: [
      noise(2450, 0.075, 0.17),
      tone(1050, 0.16, 0.12, 'triangle', 0, 260),
      tone(340, 0.11, 0.045, 'sine', 0.016, 175),
    ],
  }),
  'weapon.star.fire': cue('weapons', {
    flag: 'wasteland2',
    files: ['star-arcade-a.ogg', 'star-arcade-b.ogg', 'star-arcade-c.ogg'],
    volume: 1.8,
    layers: [
      ...[
        [392, 0],
        [587.33, 0.055],
        [783.99, 0.11],
      ].map(([note, delay]) =>
        tone(note, 0.34, 0.105, 'sine', delay, note * 1.18),
      ),
      tone(1320, 0.38, 0.045, 'sine', 0, 1680),
    ],
  }),
  'weapon.rpg.fire': cue('weapons', {
    flag: 'wasteland2',
    files: [
      'rocket-launch-a.ogg',
      'rocket-launch-b.ogg',
      'rocket-launch-c.ogg',
    ],
    volume: 2,
    layers: [
      noise(820, 0.14, 0.14, 'lowpass'),
      tone(100, 0.22, 0.14, 'triangle', 0, 54),
      tone(280, 0.2, 0.045, 'sawtooth', 0.018, 480),
    ],
  }),
  'weapon.bomb.flight': cue('weapons', {
    flag: 'wasteland2',
    files: ['bomb-flight-a.ogg', 'bomb-flight-b.ogg', 'bomb-flight-c.ogg'],
    volume: 0.6,
    limit: 12,
    spatial: { refDistance: 12, maxDistance: 600, rolloff: 1 },
  }),
  'weapon.rpg.flight': cue('weapons', {
    flag: 'wasteland2',
    files: ['rpg-flight-a.ogg', 'rpg-flight-b.ogg', 'rpg-flight-c.ogg'],
    volume: 0.6,
    limit: 12,
    spatial: { refDistance: 12, maxDistance: 600, rolloff: 1 },
  }),
  'weapon.crossbow.flight': cue('weapons', {
    flag: 'wasteland2',
    files: [
      'crossbow-whistle-a.ogg',
      'crossbow-whistle-b.ogg',
      'crossbow-whistle-c.ogg',
    ],
    volume: 1.4,
    limit: 16,
    spatial: { refDistance: 12, maxDistance: 600, rolloff: 1 },
  }),
  'combat.hit-confirm': cue('impacts', {
    flag: 'wasteland2',
    files: ['hit-confirm-a.ogg', 'hit-confirm-b.ogg', 'hit-confirm-c.ogg'],
    volume: 1.8,
    priority: 75,
  }),
  'combat.blast.recorded': cue('impacts', {
    flag: 'wasteland2',
    files: ['blast-a.ogg', 'blast-b.ogg', 'blast-c.ogg'],
    volume: 2.6,
    priority: 80,
    limit: 8,
    duck: 'blast',
    farCutoff: 1600,
  }),
  'vehicle.crash.recorded': cue('impacts', {
    flag: 'wasteland2',
    files: ['crash-a.ogg', 'crash-b.ogg', 'crash-c.ogg'],
    volume: 2.8,
    priority: 75,
    limit: 4,
    farCutoff: 2400,
  }),
  'weapon.default.fire': cue('weapons', {
    layers: [tone(220, 0.22, 0.12, 'triangle', 0, 88)],
  }),
  ...Object.fromEntries(
    Object.entries({
      ufo: 760,
      bomb: 130,
      crossbow: 440,
      star: 980,
      default: 220,
    }).map(([id, note]) => [
      `weapon.${id}.legacy`,
      cue('weapons', {
        layers: [tone(note, 0.22, 0.12, 'triangle', 0, note * 0.4)],
      }),
    ]),
  ),
  'interface.countdown': cue('interface', { layers: [tone(440, 0.12, 0.16)] }),
  'interface.go': cue('interface', {
    layers: [tone(880, 0.32, 0.16), tone(1320, 0.22, 0.055)],
  }),
  'interface.bonus': cue('interface', {
    layers: [523.25, 783.99, 1046.5].map((f, i) =>
      tone(f, 0.13, 0.075, 'sine', i * 0.07),
    ),
  }),
  'interface.near-miss': cue('interface', {
    layers: [659.25, 880, 1318.51].map((f, i) =>
      tone(f, 0.15, 0.06, 'sine', i * 0.055),
    ),
  }),
  'interface.win': cue('interface', {
    layers: [440, 554.37, 659.25, 880].map((f, i) =>
      tone(f, 0.35, 0.08, 'triangle', i * 0.08),
    ),
  }),
  'interface.lose': cue('interface', {
    layers: [tone(110, 0.65, 0.1, 'triangle', 0, 65)],
  }),
  'interface.radar': cue('interface', { layers: [tone(1200, 0.045, 0.025)] }),
  'vehicle.boost-start': cue('vehicle', {
    dry: true,
    layers: [tone(180, 0.25, 0.065, 'sine', 0, 650)],
  }),
  'vehicle.landing': cue('vehicle', {
    layers: [tone(82, 0.2, 0.1, 'sine', 0, 35)],
  }),
  'vehicle.crash': cue('impacts', {
    filter: ['lowpass', 1400],
    duration: 0.45,
    tail: 0.5,
    noiseVolume: 0.56,
    layers: [tone(70, 0.4, 0.24, 'sine', 0, 28)],
  }),
  'vehicle.crush': cue('vehicle', {
    filter: ['bandpass', 720],
    duration: 0.22,
    tail: 0.26,
    noiseVolume: 0.18,
    rate: 0.72,
    layers: [tone(145, 0.18, 0.045, 'triangle', 0, 80)],
  }),
  'combat.explosion-fallback': cue('impacts', {
    layers: [
      tone(44, 2, 0.6, 'sine', 0, 20),
      tone(90, 1.2, 0.2, 'triangle', 0.03, 22),
    ],
  }),
  'vehicle.flutter': cue('vehicle', {
    dry: true,
    filter: ['bandpass', 1250],
    q: 0.55,
    pulses: 5,
    interval: 0.075,
    peak: 0.13,
    decay: 0.13,
    attack: 0.018,
    release: 0.062,
    duration: 0.42,
  }),
  'music.sequence': cue('music', {
    pattern: [110, 164.81, 220, 261.63, 98, 146.83, 196, 246.94],
    lead: { type: 'triangle', duration: [0.5, 0.18], volume: [0.033, 0.006] },
    bass: { type: 'sine', duration: [0.9, 0.25], volume: [0.028, 0.009] },
  }),
  'gate.drum': cue('ambience', {
    duration: 0.55,
    gain: 0.34,
    tones: [70, 108],
    pitchEnd: 0.42,
  }),
  'gate.latch': cue('ambience', {
    duration: 0.35,
    gain: 0.23,
    tones: [155, 463, 917],
    pitchEnd: 0.86,
    noise: true,
  }),
  'gate.chain': cue('ambience', {
    duration: 0.14,
    gain: 0.16,
    tones: [510, 1130],
    toneStep: [37, 81],
    tonePeriod: [3, 4],
    pitchEnd: 0.86,
    noise: true,
  }),
};
export const ENGINE_BANDS = Object.values(SOUND_BANK)
  .filter((c) => c.rpm != null)
  .map((c) => ({ key: c.sample, rpm: c.rpm, toneHz: c.toneHz }));
const SAMPLE_ORDER = [
  'engine',
  'squeal',
  'idle',
  'loadLow',
  'loadMid',
  'loadHigh',
  'coast',
  'throttle',
  'lift',
  'shift',
  'explosion',
];
export const SAMPLE_ENTRIES = Object.values(SOUND_BANK)
  .filter((c) => c.sample)
  .sort(
    (a, b) => SAMPLE_ORDER.indexOf(a.sample) - SAMPLE_ORDER.indexOf(b.sample),
  )
  .map((c) => [c.sample, c.file, !c.loop]);
export const AMBIENCE = Object.fromEntries(
  Object.values(SOUND_BANK)
    .filter((c) => c.biome)
    .map((c) => [c.biome, c]),
);
export const DUCKING = {
  voice: { music: 0.32, ambience: 0.4 },
  blast: { music: 0.55, ambience: 0.6 },
};

const FALCONE_VOICE = {
  pitch: 1,
  brightness: 1,
  gain: 1,
  accent: 1,
  exhaust: 0.14,
  intake: 0.09,
};
export const CAR_VOICES = {
  falcone_f42: FALCONE_VOICE,
  falcone_heritage: FALCONE_VOICE,
  stuttgart_959s: {
    pitch: 0.93,
    brightness: 0.9,
    gain: 0.97,
    accent: 0.86,
    exhaust: 0.12,
    intake: 0.07,
  },
  aurora_gt: {
    pitch: 0.98,
    brightness: 0.95,
    gain: 0.96,
    accent: 0.9,
    exhaust: 0.1,
    intake: 0.11,
  },
  dusthawk_rally: {
    pitch: 1.035,
    brightness: 1.04,
    gain: 0.98,
    accent: 1.05,
    exhaust: 0.12,
    intake: 0.13,
  },
  banshee_muscle: {
    pitch: 0.89,
    brightness: 0.83,
    gain: 1.035,
    accent: 1.08,
    exhaust: 0.22,
    intake: 0.055,
  },
  viper_proto: {
    pitch: 1.06,
    brightness: 1.08,
    gain: 0.96,
    accent: 0.92,
    exhaust: 0.075,
    intake: 0.16,
  },
  koenigsegg_jesko: {
    pitch: 1.075,
    brightness: 1.12,
    gain: 1,
    accent: 1.08,
    exhaust: 0.17,
    intake: 0.19,
  },
  titan_monster: {
    pitch: 0.83,
    brightness: 0.76,
    gain: 1.04,
    accent: 1.02,
    exhaust: 0.25,
    intake: 0.04,
  },
};
