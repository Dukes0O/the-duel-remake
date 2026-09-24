import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';

const fixturePath = fileURLToPath(new URL('./replays/combat-inputs.json', import.meta.url));
const expectedPath = fileURLToPath(new URL('./replays/combat-fingerprints.json', import.meta.url));
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const round = value => Number.isFinite(value) ? +value.toFixed(5) : value ?? null;
const fields = (object, names) => Object.fromEntries(names.map(name => [name, round(object?.[name])]));
const actorFields = ['s', 'lateral', 'speedMph', 'armor', 'maxArmor', 'impactTimer',
  'combatWrecking', 'combatWreckTimer', 'pushVelocity'];
const scoreFields = ['hitsLanded', 'wrecksCaused', 'wrecksTaken', 'damageDealt',
  'bestCombo', 'combatStyleScore', 'combo'];

function validate() {
  assert.equal(fixture.version, 1);
  assert.equal(fixture.stepHz, 120);
  assert.deepEqual(fixture.framesPerSecond, [30, 60, 144]);
  assert.ok(Number.isSafeInteger(fixture.seed));
  assert.equal(fixture.cases.length, 4);
  const ids = new Set();
  for (const race of fixture.cases) {
    assert.ok(!ids.has(race.id), `duplicate combat replay ${race.id}`);
    ids.add(race.id);
    assert.ok(COURSE.some(event => event.id === race.eventId && event.hasRival));
    assert.equal(race.opponents.length, 3);
    assert.ok(race.actions.length > 0);
    const durationTicks = race.durationTicks ?? fixture.durationTicks;
    assert.ok(race.actions.every((action, index) => Number.isInteger(action.atTick) &&
      action.atTick >= 0 && action.atTick < durationTicks &&
      (index === 0 || action.atTick >= race.actions[index - 1].atTick)),
    `${race.id}: actions must be ordered simulation ticks`);
  }
}

function place(actor, s, lateral = 0) {
  Object.assign(actor, {s, prevS: s, lateral, prevLateral: lateral,
    speedMph: 0, pushVelocity: 0, headingError: 0, slipAngle: 0,
    impactTimer: 0, contactCooldown: 0, damageCooldown: 0,
    bombImpactCooldown: 0, airborne: false, airHeight: 0, prevAirHeight: 0});
}

function makeRace(race) {
  // These explicit flags make the fixture independent of the release switch.
  const duel = new Duel({seed: fixture.seed,
    featureFlags: {wasteland2: true, 'roadside-destruction': true}});
  duel.startCampaign({mode: 'wasteland', seed: fixture.seed, car: race.car,
    startStage: COURSE.findIndex(event => event.id === race.eventId),
    opponentCount: 3, cpuDifficulty: 'hard'});
  const state = duel.state;
  assert.equal(state.mode, 'wasteland');
  assert.equal(state.opponents.length, 3);
  assert.ok(state.combat?.scoring, 'flagged combat scoring is active');
  state.status = 'racing';
  state.countdown = 0;
  state.invulnerableSec = 0;
  state.traffic = [];
  place(state, race.playerS);
  state.opponents.forEach((actor, index) => {
    place(actor, race.opponents[index], race.opponentLateral?.[index] ?? 0);
    if (race.armor) actor.armor = race.armor[index];
  });
  if (race.playerArmor) state.armor = race.playerArmor;
  state.combat.aiTimer = race.cpuAttacks ? null : Infinity;
  state.combat.pickupTimer = Infinity;
  state.combat.shield = 0;
  state.combat.rivalShield = 0;
  return duel;
}

function act(duel, action) {
  const state = duel.state;
  const target = state.opponents[action.targetIndex];
  switch (action.kind) {
    case 'input':
      duel.setInput({throttle: action.throttle, brake: action.brake ?? 0,
        steer: action.steer ?? 0, boost: action.boost ?? false});
      break;
    case 'bolt': {
      assert.ok(target, 'bolt target exists');
      const at = duel.course.groundAt(target.s, target.lateral);
      state.combat.projectiles.push({kind: 'crossbow', enemy: false, level: 0,
        x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
      break;
    }
    case 'rearRam':
      assert.ok(target, 'ram target exists');
      place(state, 102);
      state.prevS = 98;
      state.speedMph = 80;
      place(target, 104);
      target.speedMph = 20;
      assert.equal(duel._vehicleContact(state, target, 'rival'), true,
        'recorded rear ram reaches its target');
      break;
    case 'fire':
      assert.equal(duel.fireWeapon(action.weapon), true,
        `recorded ${action.weapon} fires`);
      break;
    case 'pickup':
      state.combat.pickups = [{id: `script-${action.atTick}`, s: state.s,
        lateral: state.lateral, kind: action.pickupKind,
        ...(action.weapon ? {weapon: action.weapon} : {}), age: 0}];
      break;
    default:
      assert.fail(`unknown combat replay action ${action.kind}`);
  }
}

function snapshot(duel, tick, race) {
  const state = duel.state, combat = state.combat;
  return {tick, status: state.status,
    player: fields(state, actorFields),
    opponents: state.opponents.map(actor => fields(actor, actorFields)),
    progress: fields(state, ['stageTimeSec', 'score', 'stageStyleScore',
      'stageCrashes', 'racePenaltySec', 'boundaryResets']),
    combat: {hits: combat.hits, scoring: fields(combat.scoring, scoreFields),
      ...(race.cpuAttacks ? {ai: fields(combat, ['aiTurn', 'aiShot', 'aiTimer'])} : {}),
      cooldowns: fields(combat.cooldowns, ['ufo', 'bomb', 'crossbow', 'star']),
      pickups: combat.pickups.map(pickup => pickup.id ?? pickup.weapon),
      projectiles: combat.projectiles.map(projectile => fields(projectile,
        ['kind', 'x', 'y', 'z', 'age']))},
  };
}

function eventRecord(event, tick) {
  if (!(event.combatHit || event.combatWreck || event.combatRecovered ||
    event.combatRamHit || event.powerupCollected)) return null;
  return {tick, ...fields(event, ['combatHit', 'combatWreck', 'combatRecovered',
    'combatRamHit', 'powerupCollected', 'pickupKind', 'collector',
    'opponentIndex', 'attackerIndex', 'victimIndex', 'victim', 'source',
    'armorRemoved', 'amount'])};
}

function replay(race, fps) {
  const duel = makeRace(race);
  const events = [], samples = [], shooters = [];
  let tick = 0, actionIndex = 0;
  duel.onChange((_, event) => {
    const record = eventRecord(event, tick);
    if (record) events.push(record);
    if (race.cpuAttacks && ['crossbow', 'bomb'].includes(event.weaponFired)) {
      const projectile = duel.state.combat.projectiles.at(-1);
      assert.ok(projectile?.enemy, 'recorded CPU attack launches a projectile');
      const shooter = projectile.sourceIndex ?? 0;
      shooters.push(shooter);
      events.push({tick, cpuWeaponFired: event.weaponFired, shooter});
    }
  });
  const durationTicks = race.durationTicks ?? fixture.durationTicks;
  const frames = Math.ceil(durationTicks * fps / fixture.stepHz);
  for (let frame = 1; frame <= frames; frame++) {
    const targetTick = Math.min(durationTicks,
      Math.floor(frame * fixture.stepHz / fps + 1e-9));
    while (tick < targetTick) {
      while (race.actions[actionIndex]?.atTick === tick) act(duel, race.actions[actionIndex++]);
      duel.step(1 / fixture.stepHz);
      tick++;
      if (tick % 30 === 0) samples.push(snapshot(duel, tick, race));
    }
  }
  assert.equal(tick, durationTicks, `${race.id}: frame schedule lost ticks`);
  const count = name => events.filter(event => event[name]).length;
  assert.equal(count('combatHit'), race.expect.hits, `${race.id}: projectile hits`);
  assert.equal(count('combatWreck'), race.expect.wrecks, `${race.id}: wrecks`);
  assert.equal(count('combatRamHit'), race.expect.ramHits, `${race.id}: ram hits`);
  assert.equal(count('powerupCollected'), race.expect.pickups, `${race.id}: pickups`);
  if (race.cpuAttacks) {
    assert.equal(shooters.length, race.expect.cpuShots, 'CPU attack count');
    assert.deepEqual(shooters, race.expect.shooterOrder,
      'three CPU cars take their scheduled attack turns in order');
    assert.equal(duel.state.combat.aiShot, race.expect.cpuShots);
  }
  assert.equal(duel.state.police.ticketCount, 0, 'combat race has no police tickets');
  if (race.id === 'three-opponent-bolt-order') {
    assert.deepEqual(events.filter(event => event.combatHit || event.combatWreck)
      .map(event => event.combatWreck ? 'wreck' : 'hit'),
    ['hit', 'hit', 'wreck'], 'projectiles resolve in their recorded order');
    assert.equal(duel.state.combat.scoring.hitsLanded, 2);
    assert.equal(duel.state.combat.scoring.wrecksCaused, 1);
    assert.equal(duel.state.combat.scoring.damageDealt, 17);
    assert.equal(duel.state.combat.scoring.bestCombo, 2);
    assert.deepEqual(events.filter(event => event.combatWreck)
      .map(event => event.opponentIndex), [1]);
  }
  if (race.id === 'rear-ram-wreck-recovery') {
    assert.equal(duel.state.combat.scoring.wrecksCaused, 1);
    assert.equal(duel.state.combat.scoring.hitsLanded, 1);
    assert.ok(events.some(event => event.combatRecovered), 'wreck recovers during replay');
  }
  if (race.id === 'armor-and-weapon-crates') {
    assert.deepEqual(events.filter(event => event.powerupCollected)
      .map(event => event.powerupCollected), ['armor', 'star']);
    assert.equal(duel.state.armor, 75);
    assert.equal(duel.state.combat.cooldowns.star, 0);
  }
  const trace = {id: race.id, events, samples};
  return createHash('sha256').update(JSON.stringify(trace)).digest('hex');
}

validate();
const recording = process.argv.length === 3 && process.argv[2] === '--record';
assert.ok(recording || process.argv.length === 2,
  'usage: node tools/test-combat-replays.mjs [--record]');
const baseline = recording ? {version: 1, fixtureVersion: fixture.version,
  stepHz: fixture.stepHz, fingerprints: {}} :
  JSON.parse(readFileSync(expectedPath, 'utf8'));
if (!recording) {
  assert.equal(baseline.version, 1);
  assert.equal(baseline.fixtureVersion, fixture.version);
  assert.equal(baseline.stepHz, fixture.stepHz);
  assert.deepEqual(Object.keys(baseline.fingerprints).sort(),
    fixture.cases.map(race => race.id).sort());
}
let checks = 0;
for (const race of fixture.cases) {
  const first = replay(race, fixture.framesPerSecond[0]);
  for (const fps of fixture.framesPerSecond) {
    const actual = fps === fixture.framesPerSecond[0] ? first : replay(race, fps);
    if (recording) baseline.fingerprints[race.id] ??= {};
    if (recording) baseline.fingerprints[race.id][fps] = actual;
    else assert.equal(actual, baseline.fingerprints[race.id][fps],
      `${race.id} at ${fps} FPS: combat fingerprint changed`);
    assert.equal(actual, first, `${race.id} at ${fps} FPS: frame cadence changed combat`);
    checks++;
  }
}
if (recording) {
  writeFileSync(expectedPath, JSON.stringify(baseline, null, 2) + '\n', 'utf8');
  console.log(`Recorded ${fixture.cases.length} combat replays at 30, 60 and 144 FPS.`);
} else {
  console.log(`Combat replay fingerprints: ${checks} checks passed across ${fixture.cases.length} encounters.`);
}
