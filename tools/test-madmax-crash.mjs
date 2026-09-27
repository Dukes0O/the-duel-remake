import assert from 'node:assert/strict';
import test from 'node:test';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {CRASH_TUNING} from '../src/vehicle-collision.js';

// CRASH-04 (docs/CRASH_PHYSICS.md section 6): Mad Max Duel starts from the
// Rival Duel crash physics. Wrecks keep moving, hard-hit traffic explodes and
// tumbles off instead of vanishing, and ram damage comes from each car's own
// change in velocity, so mass matters.
const STAGE = COURSE.findIndex(stage => !stage.kind && stage.hasRival);
const BASE = 900;
// m/s², about 1 g: the hardest a sliding, spinning car may slow.
const MAX_DECEL = 10;

function start({mode = 'wasteland', car = 'falcone_f42', crashPhysics = true,
  playerMph = 100} = {}) {
  const duel = new Duel({seed: 2709,
    featureFlags: {wasteland2: true, 'crash-physics': crashPhysics}});
  duel.startCampaign({mode, startStage: STAGE, car, opponentCount: 1});
  const s = duel.state;
  Object.assign(s, {status: 'racing', countdown: 0, invulnerableSec: 0,
    s: BASE, prevS: BASE, lateral: 0, prevLateral: 0, speedMph: playerMph,
    pushVelocity: 0, headingError: 0});
  Object.assign(s.input, {throttle: 1, brake: 0, steer: 0});
  s.traffic = []; s.trafficTimer = 999;
  const events = [];
  duel.onChange((state, ev) => { if (ev) events.push(ev); });
  return {duel, s, events};
}

function placeRival(s, {mph = 40, car, armor} = {}) {
  const r = s.opponents[0];
  Object.assign(r, {s: BASE + 8, prevS: BASE + 8, lateral: 0, prevLateral: 0,
    speedMph: mph, headingError: 0, pushVelocity: 0});
  if (car) r.car = car;
  if (armor != null) r.armor = armor;
  return r;
}

function placeTraffic(s, mph = 40) {
  const t = {s: BASE + 8, prevS: BASE + 8, lateral: 0, prevLateral: 0,
    speedMph: mph, dir: 1, alive: true, headingError: 0, pushVelocity: 0,
    model: 'sedan'};
  s.traffic = [t];
  return t;
}

const run = (duel, seconds, each = () => {}) => {
  for (let tick = 0; tick < Math.round(seconds * 60); tick++) {
    duel.step(1 / 60); each(tick);
  }
};

// Worst slowing along the road between samples, ignoring the last crawl.
function worstStop(samples) {
  let worst = 0;
  for (let i = 2; i < samples.length; i++) {
    const v1 = (samples[i - 1] - samples[i - 2]) * 60, v2 = (samples[i] - samples[i - 1]) * 60;
    if (Math.abs(v1) >= 3) worst = Math.max(worst, (Math.abs(v1) - Math.abs(v2)) * 60);
  }
  return worst;
}

test('Mad Max: hard-hit traffic explodes and its hulk slides off the road', () => {
  const {duel, s, events} = start({playerMph: 110});
  const traffic = placeTraffic(s, 40);
  let hitS = null;
  const samples = [];
  run(duel, 10, () => {
    if (hitS == null && (traffic.wrecked || traffic.knock || traffic.roadsideMotion)) hitS = traffic.s;
    if (hitS != null) samples.push(traffic.s);
  });
  assert.ok(traffic.wrecked?.physical, 'the struck car is a physical wreck, not a scripted burst');
  assert.ok(!traffic.roadsideMotion || traffic.roadsideMotion.visible !== false,
    'the hulk stays visible');
  assert.ok(traffic.s - hitS >= 40, `the hulk carries on down the road (${(traffic.s - hitS).toFixed(1)} m)`);
  assert.ok(Math.abs(traffic.lateral) > duel.course.roadHalfWidthAt(traffic.s),
    'the hulk ends off the road');
  assert.ok(worstStop(samples) <= MAX_DECEL, 'the hulk never stops dead');
  assert.ok(events.some(ev => ev.roadsideImpact?.outcome === 'obliterate' ||
    ev.roadsideImpact?.kind === 'traffic' && ev.roadsideImpact.outcome === 'obliterate'),
  'the hit is reported as an explosion');
});

test('Mad Max: explosions start at a smash, well below the old half-top-speed rule', () => {
  // 60 mph closing on an equal-mass sedan is a smash (about 36 mph of Δv).
  // The old rule needed a closing speed of half the Falcone's 201 mph.
  const {duel, s, events} = start({playerMph: 100});
  const traffic = placeTraffic(s, 40);
  run(duel, 3);
  assert.ok(traffic.wrecked, 'a smash wrecks the car');
  assert.ok(events.some(ev => ev.roadsideImpact?.outcome === 'obliterate'), 'and it explodes');
});

test('Mad Max: a light shove still just knocks traffic aside', () => {
  const {duel, s, events} = start({playerMph: 58});
  const traffic = placeTraffic(s, 40);
  run(duel, 1.5);
  assert.ok(!traffic.wrecked?.physical || traffic.wrecked.rollLimit <= .2, 'no tumbling wreck');
  assert.ok(!events.some(ev => ev.roadsideImpact?.outcome === 'obliterate'), 'no explosion');
  assert.ok(events.some(ev => ev.roadsideImpact?.outcome === 'knock'), 'shoved clear');
});

test('Mad Max: a heavy launch tumbles further than in Rival Duel, but not wildly', () => {
  // The Titan flattens traffic in Rival Duel, so the heavy car here is the
  // Banshee (1.8 t) into a 1.45 t sedan at 90 mph closing.
  const roll = mode => {
    const {duel, s} = start({mode, car: 'banshee_muscle', playerMph: 110});
    const traffic = placeTraffic(s, 20);
    run(duel, 1);
    return traffic.wrecked?.rollLimit ?? 0;
  };
  const duelRoll = roll('duel'), madMaxRoll = roll('wasteland');
  assert.ok(duelRoll > 1.05, `the Banshee launches traffic in Rival Duel (${duelRoll.toFixed(2)})`);
  assert.ok(madMaxRoll > duelRoll * 1.15, `Mad Max rolls further (${madMaxRoll.toFixed(2)} vs ${duelRoll.toFixed(2)})`);
  assert.ok(madMaxRoll <= Math.PI * 1.25, 'but stays within about one and a quarter turns');
});

test('Mad Max: a rival wrecked at speed slides to rest, then recovers where it ended', () => {
  const {duel, s} = start({playerMph: 100});
  const rival = placeRival(s, {mph: 40, armor: 1});
  let wreckS = null;
  const samples = [];
  run(duel, 6, () => {
    if (wreckS == null && rival.combatWrecking) wreckS = rival.s;
    if (rival.combatWrecking) samples.push(rival.s);
  });
  assert.ok(wreckS != null, 'the ram wrecks the rival');
  const slid = Math.max(...samples) - wreckS;
  assert.ok(slid >= 15, `the wreck keeps moving (${slid.toFixed(1)} m)`);
  assert.ok(worstStop(samples) <= MAX_DECEL, 'the wreck never stops dead');
  assert.equal(rival.combatWrecking, false, 'the rival recovers');
  assert.ok(rival.s >= wreckS + 10, 'recovery happens where the wreck came to rest');
});

// The player's wreck plays out as a Rival Duel crash does: a short skid and
// spin, then recovery. Before CRASH-04 the car stopped dead on the spot.
test('Mad Max: the player wrecked at speed skids on instead of stopping dead', () => {
  const {duel, s} = start({playerMph: 110});
  s.armor = 1;
  placeRival(s, {mph: 20});
  let wreckS = null;
  run(duel, 2, () => { if (wreckS == null && s.combatWrecking) wreckS = s.s; });
  assert.ok(wreckS != null, 'the ram wrecks the player');
  assert.ok(s.s - wreckS >= 3, `the player's car skids on (${(s.s - wreckS).toFixed(1)} m)`);
});

test('Mad Max: ram damage follows the struck car\'s change in velocity (F = ma)', () => {
  const damage = (playerCar, rivalCar) => {
    const {duel, s} = start({car: playerCar, playerMph: 100});
    s.combatBumperSpikes = false;
    const rival = placeRival(s, {mph: 40, car: rivalCar, armor: 500});
    run(duel, .6);
    return 500 - rival.armor;
  };
  const titanHitsFalcone = damage('titan_monster', 'falcone_f42');
  const falconeHitsTitan = damage('falcone_f42', 'titan_monster');
  const equal = damage('falcone_f42', 'falcone_f42');
  assert.ok(titanHitsFalcone > falconeHitsTitan * 3,
    `the heavy car deals far more (${titanHitsFalcone.toFixed(1)} vs ${falconeHitsTitan.toFixed(1)})`);
  // The closing-speed rule gave about 19 armor for this equal-mass hit.
  assert.ok(equal >= 25, `an equal-mass 60 mph rear-end hits harder than before (${equal.toFixed(1)})`);
  assert.ok(titanHitsFalcone > falconeHitsTitan * 5, 'about seven times, by mass');
  assert.ok(equal <= 45, 'but four or so big rams, not one, wreck a car');
});

test('Mad Max: front spikes multiply the change-in-velocity ram damage by half again', () => {
  const damage = spikes => {
    const {duel, s} = start({playerMph: 100});
    s.combatBumperSpikes = spikes;
    const rival = placeRival(s, {mph: 40, armor: 500});
    run(duel, .6);
    return 500 - rival.armor;
  };
  const plain = damage(false), spiked = damage(true);
  assert.ok(plain > 0);
  assert.ok(Math.abs(spiked / plain - 1.5) < .01, `spiked ${spiked.toFixed(1)} vs plain ${plain.toFixed(1)}`);
});

test('Mad Max: a big hit spins the armored player; a small one does not', () => {
  // Into a parked Banshee (1.8 t): 100 mph gives the Falcone about 50 mph of
  // Δv, above Mad Max's bar and below the 70 mph the arena keeps.
  const knocked = playerMph => {
    const {duel, s} = start({playerMph});
    s.armor = 500;
    placeRival(s, {mph: 0, car: 'banshee_muscle', armor: 500});
    let spun = false;
    run(duel, .5, () => { spun ||= !!s.knock; });
    return spun;
  };
  assert.equal(knocked(40), false, 'a 40 mph bump keeps control');
  assert.equal(knocked(100), true, 'a 100 mph hit into a parked Banshee spins you');
  assert.ok(CRASH_TUNING.madMax.playerKnockDvMph < CRASH_TUNING.armoredPlayerKnockDvMph,
    'the road bar is lower than the arena bar');
});

test('Mad Max: armor-kit plating adds weight to the crash body', () => {
  const {duel, s} = start();
  const bare = duel._vehicleSpec(s).mass;
  s.combatArmorKit = 'warlord';
  assert.equal(duel._vehicleSpec(s).mass, bare + 270);
});

test('Crash physics off: Mad Max keeps the scripted burst and closing-speed damage', () => {
  const {duel, s} = start({crashPhysics: false, playerMph: 205});
  const traffic = placeTraffic(s, 40);
  run(duel, .3);
  assert.equal(traffic.roadsideMotion?.outcome, 'obliterate');
  assert.ok(!traffic.wrecked);
});
