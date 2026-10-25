// Cue data is the single home for assets, routing and authored sound recipes.
import {FIGHT_VOICE_LINES} from './fight-voices.js';
import {HELI_CUES} from './heli/heli-audio.js';
import {DRIVE_LESSON_CUES} from './lessons/drive-radio-lines.js';
import {DEEP_PHONE_CUES} from './deep/deep-phone-lines.js';
import {LAB_CUES} from './lab/lab-lines.js';
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
  // The Deep adapter lazy-loads these only during a submerged visit.
  // The helicopter (docs/HELICOPTER.md): radio lines, rotor and cable sounds, behind its switch.
  ...HELI_CUES,
  ...DRIVE_LESSON_CUES,
  ...DEEP_PHONE_CUES,
  ...LAB_CUES,
  'deep.splash': cue('vehicle', {flag: 'the-deep', file: 'deep/splash.ogg', volume: .9, priority: 60, limit: 1}),
  'deep.engine-muffle': cue('engine', {flag: 'the-deep', file: 'deep/engine-muffle.ogg', volume: .65, priority: 50, limit: 1}),
  'deep.bubbles': cue('ambience', {flag: 'the-deep', file: 'deep/bubbles.ogg', volume: .6, loop: true, priority: 30, limit: 1}),
  'deep.sand-land': cue('vehicle', {flag: 'the-deep', file: 'deep/sand-land.ogg', volume: .7, priority: 50, limit: 2}),
  'deep.logged': cue('interface', {flag: 'the-deep', file: 'deep/logged.ogg', volume: .75, priority: 65, limit: 1}),
  'deep.pearl': cue('interface', {flag: 'the-deep', file: 'deep/pearl.ogg', volume: .75, priority: 65, limit: 1}),
  'deep.whale': cue('ambience', {flag: 'the-deep', file: 'deep/whale.ogg', volume: .45, priority: 35, limit: 1}),
  'deep.cave': cue('ambience', {flag: 'the-deep', file: 'deep/cave.ogg', volume: .4, loop: true, priority: 30, limit: 1}),
  // P4 assets remain dormant until their owning race events land.
  'race.start.light': cue('interface', {flag: 'grand-prix', file: 'p4/race-start-light.ogg',
    volume: 1, priority: 80, limit: 2}),
  'race.start.go': cue('interface', {flag: 'grand-prix', file: 'p4/race-start-go.ogg',
    volume: 1, priority: 80, limit: 2}),
  'race.position.gain': cue('interface', {flag: 'grand-prix', file: 'p4/race-position-gain.ogg',
    volume: 1, priority: 80, limit: 2}),
  'race.lap.final': cue('interface', {flag: 'grand-prix', file: 'p4/race-lap-final.ogg',
    volume: 1, priority: 80, limit: 2}),
  'race.finish.flag': cue('interface', {flag: 'grand-prix', file: 'p4/race-finish-flag.ogg',
    volume: 1, priority: 80, limit: 2}),
  'pit.limiter': cue('vehicle', {flag: 'grand-prix', file: 'p4/pit-limiter.ogg',
    volume: 1, priority: 50, limit: 1, loop: true}),
  'pit.wrench': cue('vehicle', {flag: 'grand-prix', file: 'p4/pit-wrench.ogg',
    volume: 1, priority: 50, limit: 2}),
  'pit.go': cue('interface', {flag: 'grand-prix', file: 'p4/pit-go.ogg',
    volume: 1, priority: 80, limit: 2}),
  'surface.gravel': cue('vehicle', {flag: 'grand-prix', file: 'p4/surface-gravel.ogg',
    volume: 1, priority: 50, limit: 1, loop: true}),
  'surface.snow': cue('vehicle', {flag: 'grand-prix', file: 'p4/surface-snow.ogg',
    volume: 1, priority: 50, limit: 1, loop: true}),
  'surface.ice': cue('vehicle', {flag: 'grand-prix', file: 'p4/surface-ice.ogg',
    volume: 1, priority: 50, limit: 1, loop: true}),
  'avalanche.rumble': cue('impacts', {flag: 'grand-prix', file: 'p4/avalanche-rumble.ogg',
    volume: 1, priority: 50, limit: 2}),
  'avalanche.slide': cue('impacts', {flag: 'grand-prix', file: 'p4/avalanche-slide.ogg',
    volume: 1, priority: 50, limit: 2}),
  'yeti.roar': cue('impacts', {flag: 'grand-prix', file: 'p4/yeti-roar.ogg',
    volume: 1, priority: 50, limit: 2}),
  'snowman.burst': cue('impacts', {flag: 'grand-prix', file: 'p4/snowman-burst.ogg',
    volume: 1, priority: 50, limit: 2}),
  'crowd.cheer': cue('ambience', {flag: 'grand-prix', file: 'p4/crowd-cheer.ogg',
    volume: 1, priority: 25, limit: 2}),
  'wind.summit': cue('ambience', {flag: 'grand-prix', file: 'p4/wind-summit.ogg',
    volume: 1, priority: 25, limit: 2}),
  'ambient.harbour-night': cue('ambience', {flag: 'grand-prix', file: 'p4/ambient-harbour-night.ogg',
    volume: 1, priority: 25, limit: 1, loop: true}),
  'ambient.forest-morning': cue('ambience', {flag: 'grand-prix', file: 'p4/ambient-forest-morning.ogg',
    volume: 1, priority: 25, limit: 1, loop: true}),
  'ambient.mountain-wind': cue('ambience', {flag: 'grand-prix', file: 'p4/ambient-mountain-wind.ogg',
    volume: 1, priority: 25, limit: 1, loop: true}),
  ...Object.fromEntries(Object.entries(FIGHT_VOICE_LINES).map(([id, line]) =>
    [id, cue('voice', {file: `voices/${line.file}`, flag: 'fight-voices',
      volume: line.gain || 1, priority: 90, limit: 1, duck: 'voice'})])),
  'crew.sticky.arm': cue('weapons', {flag: 'crew-gear', layers: [tone(105, .18, .11, 'triangle', 0, 65)]}),
  'crew.sticky.throw': cue('weapons', {flag: 'crew-gear', layers: [noise(620, .11, .1), tone(220, .12, .08, 'triangle', 0, 110)]}),
  'crew.sticky.beep': cue('weapons', {flag: 'crew-gear', layers: [tone(1180, .07, .07, 'square')]}),
  'crew.sticky.explode': cue('impacts', {flag: 'crew-gear', layers: [noise(190, .24, .24), tone(68, .3, .18, 'triangle', 0, 28)]}),
  'crew.grapple.launch': cue('weapons', {flag: 'crew-gear', layers: [tone(190, .14, .13, 'sawtooth', 0, 520)]}),
  'crew.turret.deploy': cue('weapons', {flag: 'crew-gear', layers: [tone(130, .22, .14, 'triangle', 0, 52)]}),
  'crew.turret.fire': cue('weapons', {flag: 'crew-gear', layers: [noise(760, .09, .09), tone(90, .08, .12, 'triangle', 0, 40)]}),
  'crew.turret.retire': cue('weapons', {flag: 'crew-gear', layers: [tone(210, .18, .1, 'triangle', 0, 70)]}),
  'crew.flamer.start': cue('weapons', {flag: 'crew-gear', layers: [noise(1100, .3, .11, 'lowpass'), tone(74, .3, .14, 'sawtooth')]}),
  'crew.flamer.stop': cue('weapons', {flag: 'crew-gear', layers: [noise(700, .18, .07, 'lowpass')]}),
  'crew.marksman.fire': cue('weapons', {flag: 'crew-gear', layers: [noise(1250, .1, .15), tone(180, .12, .1, 'triangle', 0, 48)]}),
  'crew.scrap-cannon.fire': cue('weapons', {flag: 'crew-gear', layers: [noise(360, .2, .21), tone(62, .24, .2, 'triangle', 0, 25)]}),
  'weapon.harpoon.fire': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/harpoon-fire-a.ogg', 'arsenal-wave1/harpoon-fire-b.ogg',
      'arsenal-wave1/harpoon-fire-c.ogg'],
    volume: 1.8, priority: 60, limit: 6,
  }),
  'weapon.harpoon.flight': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/harpoon-flight-a.ogg', 'arsenal-wave1/harpoon-flight-b.ogg',
      'arsenal-wave1/harpoon-flight-c.ogg'],
    volume: 1.4, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'weapon.harpoon.hit': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/harpoon-hit-a.ogg', 'arsenal-wave1/harpoon-hit-b.ogg',
      'arsenal-wave1/harpoon-hit-c.ogg'],
    volume: 1.8, priority: 75, limit: 6,
  }),
  'weapon.harpoon.break': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/harpoon-break-a.ogg', 'arsenal-wave1/harpoon-break-b.ogg',
      'arsenal-wave1/harpoon-break-c.ogg'],
    volume: 1.8, priority: 65, limit: 6,
  }),
  'weapon.caltrops.deploy': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/caltrops-deploy-a.ogg', 'arsenal-wave1/caltrops-deploy-b.ogg',
      'arsenal-wave1/caltrops-deploy-c.ogg'],
    volume: 1.8, priority: 60, limit: 6,
  }),
  'weapon.caltrops.hit': cue('weapons', {
    flag: 'arsenal',
    files: ['arsenal-wave1/caltrops-hit-a.ogg', 'arsenal-wave1/caltrops-hit-b.ogg',
      'arsenal-wave1/caltrops-hit-c.ogg'],
    volume: 1.8, priority: 75, limit: 6,
  }),
  'weapon.oil.deploy': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-core/oil-deploy.ogg',
      'arsenal-core/oil-deploy-b.ogg', 'arsenal-core/oil-deploy-c.ogg'], volume: 3.375, priority: 60, limit: 6,
  }),
  'weapon.oil.slip': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-core/oil-slip.ogg',
      'arsenal-core/oil-slip-b.ogg', 'arsenal-core/oil-slip-c.ogg'], volume: 3.9, priority: 65, limit: 6,
  }),
  'weapon.smoke.deploy': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-core/smoke-deploy.ogg',
      'arsenal-core/smoke-deploy-b.ogg', 'arsenal-core/smoke-deploy-c.ogg'], volume: 3.915, priority: 60, limit: 6,
  }),
  'weapon.rockets.lock': cue('weapons', {
    flag: 'seeker-rockets', priority: 70, limit: 2,
    layers: [tone(880, .09, .1, 'sine'), tone(1320, .09, .08, 'sine', .07)],
  }),
  'weapon.rockets.fire': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/rocket-fire-a.ogg',
      'arsenal-wave2/rocket-fire-b.ogg', 'arsenal-wave2/rocket-fire-c.ogg'],
    volume: 2.8, priority: 60, limit: 6,
  }),
  'weapon.rockets.flight': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/rocket-flight-a.ogg',
      'arsenal-wave2/rocket-flight-b.ogg', 'arsenal-wave2/rocket-flight-c.ogg'],
    volume: 2.25, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'weapon.rockets.hit': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/rocket-hit-a.ogg',
      'arsenal-wave2/rocket-hit-b.ogg', 'arsenal-wave2/rocket-hit-c.ogg'],
    volume: 3, priority: 75, limit: 6,
  }),
  'weapon.flame.start': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/flame-start-a.ogg',
      'arsenal-wave2/flame-start-b.ogg', 'arsenal-wave2/flame-start-c.ogg'],
    volume: 4.2, priority: 60, limit: 6,
  }),
  'weapon.flame.loop': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/flame-loop-a.ogg',
      'arsenal-wave2/flame-loop-b.ogg', 'arsenal-wave2/flame-loop-c.ogg'],
    volume: 2.5, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'weapon.flame.end': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/flame-end-a.ogg',
      'arsenal-wave2/flame-end-b.ogg', 'arsenal-wave2/flame-end-c.ogg'],
    volume: 2.5, priority: 55, limit: 6,
  }),
  'weapon.magnet.hum': cue('weapons', {
    flag: 'arsenal', files: ['arsenal-wave2/magnet-hum-a.ogg',
      'arsenal-wave2/magnet-hum-b.ogg', 'arsenal-wave2/magnet-hum-c.ogg'],
    volume: 1.8, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'weapon.mortar.fire': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/mortar-fire-a.ogg',
      'arsenal-wave3/mortar-fire-b.ogg', 'arsenal-wave3/mortar-fire-c.ogg'],
    volume: 3, priority: 60, limit: 6,
  }),
  'weapon.mortar.whistle': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/mortar-whistle-a.ogg',
      'arsenal-wave3/mortar-whistle-b.ogg', 'arsenal-wave3/mortar-whistle-c.ogg'],
    volume: 2.5, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'weapon.mortar.hit': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/mortar-hit-a.ogg',
      'arsenal-wave3/mortar-hit-b.ogg', 'arsenal-wave3/mortar-hit-c.ogg'],
    volume: 3, priority: 75, limit: 6,
  }),
  'weapon.tesla.charge': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/tesla-charge-a.ogg',
      'arsenal-wave3/tesla-charge-b.ogg', 'arsenal-wave3/tesla-charge-c.ogg'],
    volume: 3.5, priority: 60, limit: 6,
  }),
  'weapon.tesla.pulse': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/tesla-pulse-a.ogg',
      'arsenal-wave3/tesla-pulse-b.ogg', 'arsenal-wave3/tesla-pulse-c.ogg'],
    volume: 5.5, priority: 70, limit: 6,
  }),
  'weapon.decoy.deploy': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/decoy-deploy-a.ogg',
      'arsenal-wave3/decoy-deploy-b.ogg', 'arsenal-wave3/decoy-deploy-c.ogg'],
    volume: 4, priority: 60, limit: 6,
  }),
  'weapon.decoy.burst': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/decoy-burst-a.ogg',
      'arsenal-wave3/decoy-burst-b.ogg', 'arsenal-wave3/decoy-burst-c.ogg'],
    volume: 3, priority: 65, limit: 6,
  }),
  'weapon.nitro.start': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/nitro-start-a.ogg',
      'arsenal-wave3/nitro-start-b.ogg', 'arsenal-wave3/nitro-start-c.ogg'],
    volume: 6.5, priority: 60, limit: 6,
  }),
  'weapon.nitro.loop': cue('weapons', {
    flag: 'arsenal-wave3', files: ['arsenal-wave3/nitro-loop-a.ogg',
      'arsenal-wave3/nitro-loop-b.ogg', 'arsenal-wave3/nitro-loop-c.ogg'],
    volume: 3, priority: 55, limit: 4, loop: true,
    spatial: {refDistance: 12, maxDistance: 600, rolloff: 1},
  }),
  'gatekeeper.welcome': cue('voice', {
    file: 'gatekeeper-welcome.mp3',
    volume: 2.2,
    limit: 1,
    priority: 100,
    duck: 'voice',
    flag: 'hidden-road',
  }),
  'vehicle.rival-engine': cue('engine', {
    flag: 'rival-voices', donor: 'loadHigh', toneHz: 86,
    volume: .35, priority: 40, limit: 3, loop: true,
    spatial: {refDistance: 15, maxDistance: 250, rolloff: 1},
  }),
  'vehicle.traffic-engine': cue('engine', {
    flag: 'rival-voices', donor: 'engine', toneHz: 86,
    volume: .25, priority: 30, limit: 4, loop: true,
    spatial: {refDistance: 15, maxDistance: 250, rolloff: 1},
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
    files: ['bomb-arcade-a.ogg', 'bomb-arcade-b.ogg', 'bomb-arcade-c.ogg'],
    volume: 1.8,
    layers: [
      noise(460, 0.17, 0.16, 'lowpass'),
      tone(138, 0.22, 0.19, 'triangle', 0, 52),
    ],
  }),
  'weapon.crossbow.fire': cue('weapons', {
    files: ['crossbow-pew-a.ogg', 'crossbow-pew-b.ogg', 'crossbow-pew-c.ogg'],
    volume: 1.8,
    layers: [
      noise(2450, 0.075, 0.17),
      tone(1050, 0.16, 0.12, 'triangle', 0, 260),
      tone(340, 0.11, 0.045, 'sine', 0.016, 175),
    ],
  }),
  'weapon.star.fire': cue('weapons', {
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
    files: ['bomb-flight-a.ogg', 'bomb-flight-b.ogg', 'bomb-flight-c.ogg'],
    volume: 0.6,
    limit: 12,
    spatial: { refDistance: 12, maxDistance: 600, rolloff: 1 },
  }),
  'weapon.rpg.flight': cue('weapons', {
    files: ['rpg-flight-a.ogg', 'rpg-flight-b.ogg', 'rpg-flight-c.ogg'],
    volume: 0.6,
    limit: 12,
    spatial: { refDistance: 12, maxDistance: 600, rolloff: 1 },
  }),
  'weapon.crossbow.flight': cue('weapons', {
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
    files: ['hit-confirm-a.ogg', 'hit-confirm-b.ogg', 'hit-confirm-c.ogg'],
    volume: 1.8,
    priority: 75,
  }),
  'combat.blast.recorded': cue('impacts', {
    files: ['blast-a.ogg', 'blast-b.ogg', 'blast-c.ogg'],
    volume: 3.7,
    priority: 80,
    limit: 8,
    duck: 'blast',
    farCutoff: 1600,
  }),
  'vehicle.crash.recorded': cue('impacts', {
    files: ['crash-a.ogg', 'crash-b.ogg', 'crash-c.ogg'],
    volume: 4.2,
    priority: 75,
    limit: 4,
    farCutoff: 2400,
  }),
  // CRASH-02 audio: a smash reuses the recorded crashes, scaled by the change
  // in velocity and placed at the hit; the thump covers them while loading.
  'vehicle.crash-impact': cue('impacts', {
    buffersFrom: 'vehicle.crash.recorded',
    volume: 3.4,
    priority: 72,
    limit: 4,
    farCutoff: 2400,
    layers: [tone(62, 0.35, 0.22, 'sine', 0, 30)],
  }),
  // EGG-03 audio (tools/audio/build-hollow.mjs): pond entry and mud.
  'world.muddy-hollow-splash': cue('vehicle', {
    files: ['hollow-splash-a.ogg', 'hollow-splash-b.ogg', 'hollow-splash-c.ogg'],
    volume: 2.6,
    priority: 70,
    limit: 3,
  }),
  'world.muddy-hollow-mud': cue('vehicle', {
    files: ['hollow-mud-a.ogg', 'hollow-mud-b.ogg'],
    volume: 2.2,
    priority: 55,
    limit: 3,
  }),
  'world.muddy-hollow-churn': cue('vehicle', {
    filter: ['bandpass', 420],
    loop: true,
  }),
  // ARENA-FEEL: a computer car's charge tell (an engine roar rising), a
  // respawn shimmer, and the player's wreck credit.
  'arena.tell': cue('impacts', {
    priority: 68,
    limit: 3,
    layers: [
      tone(92, 0.7, 0.15, 'sawtooth', 0, 185),
      tone(184, 0.55, 0.06, 'square', 0.06, 370),
    ],
  }),
  'arena.toll-gate': cue('impacts', {
    priority: 85,
    limit: 1,
    files: ['tollkeeper/gate-klaxon.ogg'],
    volume: .5,
  }),
  'arena.gunn-barrage': cue('impacts', {
    flag: 'gunn', priority: 70, limit: 1,
    // The oscillator tail also fits Gunn's shortest (phase-two Hard) tell.
    layers: [
      tone(420, .36, .12, 'triangle', 0, 1500),
      tone(840, .34, .045, 'sine', .02, 2300),
    ],
  }),
  'warlord.nitroSpent': cue('weapons', {
    flag: 'blackiron', files: ['blackiron/nitro-spent.ogg'],
    volume: .65, priority: 75, limit: 1,
  }),
  'arena.respawn': cue('interface', {
    layers: [
      tone(330, 0.35, 0.05, 'sine', 0, 990),
      tone(660, 0.3, 0.03, 'triangle', 0.08, 1320),
    ],
  }),
  'arena.bounty-mark': cue('interface', {
    flag: 'bounty-hunt',
    priority: 72,
    limit: 1,
    layers: [
      tone(520, 0.14, 0.12, 'triangle', 0, 780),
      tone(780, 0.22, 0.09, 'sine', 0.11, 1040),
    ],
  }),
  'arena.wreck-credit': cue('impacts', {
    buffersFrom: 'combat.hit-confirm',
    volume: 2.2,
    priority: 78,
    layers: [tone(70, 0.4, 0.2, 'sine', 0, 35)],
  }),
  'arena.sal-saw': cue('impacts', {
    file: 'sal-saw-scream.ogg',
    volume: 1.65,
    priority: 82,
    limit: 1,
    spatial: true,
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
SOUND_BANK['arena.blackiron-barrage'] = cue('impacts', {
  flag: 'blackiron', priority: 70, limit: 1,
  layers: SOUND_BANK['arena.gunn-barrage'].layers,
});
SOUND_BANK['warlord.nitroTell'] = cue('weapons', {
  flag: 'blackiron', files: SOUND_BANK['weapon.nitro.start'].files,
  volume: .7, priority: 75, limit: 1,
});
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
  // Earned car 1: a naturally aspirated V12, so a touch higher and brighter
  // than the muscle car, with a clear intake and a loud exhaust.
  ferrari_enzo: {
    pitch: 1.05,
    brightness: 1.1,
    gain: 1,
    accent: 1.04,
    exhaust: 0.16,
    intake: 0.15,
  },
  // Earned car 2: a smooth road V12 using the existing engine layers.
  mclaren_f1: {
    pitch: 1.04,
    brightness: 1.06,
    gain: 0.98,
    accent: 1.02,
    exhaust: 0.14,
    intake: 0.17,
  },
  // Earned car 3: a big quad-turbo engine, lower and smoother than the
  // Enzo's V12, with a deep intake rush.
  bugatti_bolide: {
    pitch: 0.94,
    brightness: 1.02,
    gain: 1.04,
    accent: 1.02,
    exhaust: 0.17,
    intake: 0.2,
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
