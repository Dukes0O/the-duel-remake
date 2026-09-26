import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {ARENA_VENUES, SCRAPDOME_VENUE, spawnSlots, venueCurvatureRatio} from '../src/arena/venues.js';
import {ARENA_RULES, arenaRanking, chooseRespawnSlot} from '../src/arena/arena-event.js';
import {BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {worldPose, floorLimit} from '../src/arena/arena-floor.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {combatOwnerId, combatTeam, hostile} from '../src/combat-teams.js';

// The Scrapdome foundation (docs/SCRAPDOME.md). Headless, seeded, no graphics.
const ON = {wasteland2: true, 'hidden-road': true, scrapdome: true};
const FIELD = [{car: 'dusthawk_rally'}, {car: 'aurora_gt'}, {car: 'stuttgart_959s'}];

function arena({difficulty = 'medium', seed = 1989, opponents = FIELD, flags = ON} = {}) {
  const duel = new Duel({seed, featureFlags: flags});
  const started = duel.startArenaEvent({car: 'banshee_muscle', cpuDifficulty: difficulty, seed, opponents});
  return {duel, started};
}

// A plain scripted player: chase the nearest car, fire the crossbow every 4 s.
function playerInput(duel, step) {
  const s = duel.state, me = worldPose(duel, s);
  let best = null, bestDistance = Infinity;
  for (const other of s.opponents) {
    if (other.combatWrecking) continue;
    const at = worldPose(duel, other), distance = Math.hypot(at.x - me.x, at.z - me.z);
    if (distance < bestDistance) { best = at; bestDistance = distance; }
  }
  let steer = 0;
  if (best) {
    const turn = Math.atan2(best.x - me.x, best.z - me.z) - me.heading;
    steer = Math.max(-1, Math.min(1, -Math.atan2(Math.sin(turn), Math.cos(turn)) * 2));
  }
  duel.setInput({throttle: 1, brake: 0, steer, boost: false});
  if (s.status === 'racing' && step % 480 === 0) duel.fireWeapon('crossbow');
}

function playRound(options = {}, watch = () => {}, onEvent = () => {}) {
  const {duel} = arena(options);
  const events = [];
  duel.onChange((_state, event) => {
    if (event.arenaWreck || event.arenaResult) events.push(event);
    onEvent(event);
  });
  let step = 0;
  while (duel.state.status !== 'arena_result' && step < 120 * 200) {
    playerInput(duel, step);
    duel.step(1 / 120);
    watch(duel, step++);
  }
  return {duel, events, seconds: step / 120};
}

test('the venue is a valid ring and never a menu circuit', () => {
  assert.equal(COURSE.some(course => course.id === 'scrapdome'), false);
  assert.equal(ARENA_VENUES.scrapdome, SCRAPDOME_VENUE);
  const course = new Course(SCRAPDOME_VENUE, 1989);
  assert.ok(venueCurvatureRatio(course) < .8, 'the floor fits inside the tightest bend');
  const slots = spawnSlots(course);
  assert.equal(slots.length, 8);
  for (const slot of slots) {
    assert.ok(Math.abs(slot.lateral) < course.def.scrapdome.floorHalfWidth);
    assert.equal(course.jumpAt(slot.s), 0, 'no slot is on a ramp');
  }
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const a = course.worldAt(slots[i].s, slots[i].lateral), b = course.worldAt(slots[j].s, slots[j].lateral);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= ARENA_RULES.spawnClearMetres, 'slots are clear of each other');
  }
  const titan = new Course(COURSE.find(course => course.id === 'titan-arena'), 1989);
  assert.equal(titan.roadHalfWidthAt(0), 13, 'Titan Monster Arena is unchanged');
  assert.ok(titan.features.barriers.every(barrier => Math.abs(barrier.off) === 22));
});

test('an arena event needs the switch and a valid field', () => {
  assert.equal(arena({flags: {wasteland2: true, scrapdome: false}}).started, false);
  assert.equal(arena({flags: {wasteland2: false, scrapdome: true}}).started, false);
  assert.equal(arena({opponents: []}).started, false);
  assert.equal(arena({opponents: [...FIELD, {car: 'viper_proto'}]}).started, false);
  assert.equal(arena({opponents: [{car: 'no-such-car'}]}).started, false);
  const {duel, started} = arena();
  assert.equal(started, true);
  assert.equal(duel.state.mode, 'wasteland');
  assert.equal(duel.state.status, 'countdown');
  assert.equal(duel.state.arena.participants.length, 4);
  assert.deepEqual(duel.state.arena.participants.map(p => p.brain), [null, 'rammer', 'gunner', 'brawler']);
  assert.equal(duel.state.traffic.length, 0);
  assert.equal(duel.state.raids, undefined);
  duel.startCampaign({mode: 'duel', startStage: 0, seed: 1989});
  assert.equal(duel.state.arena, null, 'a race start leaves the arena behind');
});

test('a full round is repeatable, stays on the floor, holds the hunter cap and ends with a result', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const cap = BRAIN_DIFFICULTY[difficulty].huntersOnPlayer;
    let worstLateral = 0, worstHunters = 0;
    const first = playRound({difficulty}, duel => {
      const s = duel.state, limit = floorLimit(duel);
      for (const actor of [s, ...s.opponents]) {
        assert.ok([actor.s, actor.lateral, actor.headingError, actor.speedMph].every(Number.isFinite));
        worstLateral = Math.max(worstLateral, Math.abs(actor.lateral) - limit);
      }
      worstHunters = Math.max(worstHunters, s.arena.participants.filter(p => p.targetId === 'player').length);
    });
    const second = playRound({difficulty});
    assert.ok(worstLateral <= 1e-9, `${difficulty}: every car stays on the floor`);
    assert.ok(worstHunters <= cap, `${difficulty}: at most ${cap} computer cars hunt the player`);
    const result = first.duel.state.arena.result;
    assert.ok(result && ['time', 'sudden-death', 'damage'].includes(result.reason));
    assert.deepEqual(result.placings, arenaRanking(first.duel.state.arena).map(p => p.id));
    assert.deepEqual(second.duel.state.arena.result, result, `${difficulty}: same seed, same result`);
    assert.deepEqual(second.events, first.events, `${difficulty}: same wrecks in the same order`);
    assert.ok(first.seconds >= 150 && first.seconds <= 180.1);
    assert.equal(first.duel.state.status, 'arena_result');
  }
});

test('computer cars fight each other, not only the player', () => {
  const {events} = playRound({difficulty: 'medium'});
  const wrecks = events.filter(event => event.arenaWreck).map(event => event.arenaWreck);
  assert.ok(wrecks.some(w => w.creditedId?.startsWith('cpu') && w.victimId.startsWith('cpu')),
    'at least one computer car wrecks another');
});

test('wreck credit goes to the last recent attacker, never to a wall or yourself', () => {
  const {duel} = arena();
  duel.state.countdown = 0; duel.step(1 / 120);
  const [cpu1, cpu2] = duel.state.opponents;
  const credits = [];
  duel.onChange((_s, event) => { if (event.arenaWreck) credits.push(event.arenaWreck); });
  cpu1.armor = 1;
  applyArmorDamage(duel, cpu1, 'crossbow', {owner: 'player'});
  duel.step(1 / 120);
  assert.deepEqual(credits.at(-1), {victimId: 'cpu-1', creditedId: 'player'});
  cpu2.armor = 1;
  applyArmorDamage(duel, cpu2, 'scenery', {});
  duel.step(1 / 120);
  assert.deepEqual(credits.at(-1), {victimId: 'cpu-2', creditedId: null}, 'a wall alone credits nobody');
  const participants = duel.state.arena.participants;
  assert.equal(participants[0].wrecks, 1);
  assert.equal(participants[1].wrecked, 1);
  assert.equal(participants[2].wrecked, 1);
});

test('a just-respawned car neither takes nor deals damage, and respawns away from enemies', () => {
  const {duel} = arena();
  duel.state.countdown = 0; duel.step(1 / 120);
  const cpu1 = duel.state.opponents[0], participants = duel.state.arena.participants;
  participants[1].protectedSec = 1;
  assert.equal(applyArmorDamage(duel, cpu1, 'crossbow', {owner: 'player'}), 0);
  participants[1].protectedSec = 0; participants[0].protectedSec = 1;
  assert.equal(applyArmorDamage(duel, cpu1, 'crossbow', {owner: 'player'}), 0);
  participants[0].protectedSec = 0;
  assert.ok(applyArmorDamage(duel, cpu1, 'crossbow', {owner: 'player'}) > 0);

  const slot = chooseRespawnSlot(duel, participants[1]);
  const at = duel.course.worldAt(slot.s, slot.lateral);
  const nearest = actor => { const p = worldPose(duel, actor); return Math.hypot(p.x - at.x, p.z - at.z); };
  const enemies = [duel.state, ...duel.state.opponents.slice(1)];
  const chosen = Math.min(...enemies.map(nearest));
  for (const other of duel.state.arena.spawnSlots) {
    const q = duel.course.worldAt(other.s, other.lateral);
    const clear = [duel.state, ...duel.state.opponents].filter(a => a !== cpu1).every(a => {
      const p = worldPose(duel, a); return Math.hypot(p.x - q.x, p.z - q.z) >= ARENA_RULES.spawnClearMetres;
    });
    if (!clear) continue;
    const distance = Math.min(...enemies.map(actor => {
      const p = worldPose(duel, actor); return Math.hypot(p.x - q.x, p.z - q.z);
    }));
    assert.ok(distance <= chosen + 1e-9, 'no clear slot is farther from enemies');
  }
});

test('a tie at the whistle goes to sudden death, and the next credited wreck ends it', () => {
  const {duel} = arena({opponents: [FIELD[0]]});
  duel.state.countdown = 0; duel.step(1 / 120);
  duel.state.arena.clockSec = duel.state.arena.timeLimitSec - 1 / 240;
  duel.step(1 / 120);
  assert.equal(duel.state.arena.phase, 'sudden-death');
  const cpu = duel.state.opponents[0];
  cpu.armor = 1;
  applyArmorDamage(duel, cpu, 'crossbow', {owner: 'player'});
  duel.step(1 / 120);
  assert.equal(duel.state.status, 'arena_result');
  assert.deepEqual(duel.state.arena.result, {placings: ['player', 'cpu-1'], winnerId: 'player', reason: 'sudden-death'});
});

test('outside an arena the teams are exactly the player against the computer cars', () => {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2: true}});
  duel.startCampaign({mode: 'wasteland', startStage: 0, seed: 1989, opponentCount: 2});
  const [a, b] = duel.state.opponents;
  assert.equal(combatOwnerId(duel, duel.state), 'player');
  assert.equal(combatOwnerId(duel, a), 'cpu');
  assert.equal(combatTeam(duel, b), 'cpu');
  assert.equal(hostile(duel, a, b), false, 'computer cars never fight each other in a race');
  assert.equal(hostile(duel, duel.state, a), true);
});

test('the floor squeezes top speeds toward 70 mph and keeps their order', async () => {
  const {arenaFloorSpeed, SCRAPDOME_LAYOUT} = await import('../src/arena/venues.js');
  const {CARS} = await import('../src/config.js');
  const speeds = Object.values(CARS).map(car => [car.topSpeed, arenaFloorSpeed(SCRAPDOME_LAYOUT, car.topSpeed)])
    .sort((a, b) => a[0] - b[0]);
  for (const [top, floor] of speeds) assert.ok(floor <= top && floor > 50 && floor < 85, `${top} mph -> ${floor}`);
  for (let i = 1; i < speeds.length; i++) assert.ok(speeds[i][1] >= speeds[i - 1][1], 'faster cars stay faster');
  assert.equal(arenaFloorSpeed(null, 150), 150, 'no venue, no limit');
});

// Guard rails for how the computer cars drive (docs/SCRAPDOME.md 4). Measured
// on 26 September 2026: about 1 to 4 hard wall hits by computer cars per
// round, and 52 to 68 percent of samples within 40 m of their target.
test('computer cars fight close and rarely hit the walls hard', () => {
  let wallHits = 0, near = 0, samples = 0;
  playRound({difficulty: 'medium'}, (d, step) => {
    const s = d.state;
    if (s.status !== 'racing' || step % 60) return;
    for (const participant of s.arena.participants) {
      if (participant.kind !== 'cpu' || !participant.targetId) continue;
      const actor = s.opponents.find(a => a.arenaId === participant.id);
      const target = participant.targetId === 'player' ? s : s.opponents.find(a => a.arenaId === participant.targetId);
      if (!actor || !target || actor.combatWrecking) continue;
      const a = worldPose(d, actor), b = worldPose(d, target);
      samples++; if (Math.hypot(a.x - b.x, a.z - b.z) < 40) near++;
    }
  }, event => { if (event.arenaWallHit?.id?.startsWith('cpu')) wallHits++; });
  assert.ok(near / samples >= .45, `computer cars within 40 m of their target ${(100 * near / samples).toFixed(0)}% of the time`);
  assert.ok(wallHits <= 8, `computer cars hit walls hard ${wallHits} times`);
});

test('crates sit on the ramp tops and by the Heap, come back, and can be taken from any direction', async () => {
  const {arenaPickupSpots, ARENA_PICKUPS} = await import('../src/arena/arena-pickups.js');
  const {duel} = arena();
  duel.state.countdown = 0; duel.step(1 / 120);
  const spots = arenaPickupSpots(duel.course);
  assert.equal(spots.filter(spot => spot.kind === 'weapon').length, 3);
  assert.equal(spots.filter(spot => spot.kind === 'armor').length, 2);
  for (let i = 0; i < 120 * (ARENA_PICKUPS.firstDelaySec + .1); i++) duel.step(1 / 120);
  assert.equal(duel.state.combat.pickups.length, 5, 'all five crates are out after the first delay');
  const s = duel.state, crate = duel.state.combat.pickups.find(item => item.kind === 'armor');
  s.armor = s.maxArmor / 2;
  // Drive backwards along the ring onto the crate: arena crates do not care.
  Object.assign(s, {s: crate.s + 1, prevS: crate.s + 2, lateral: crate.lateral, prevLateral: crate.lateral,
    headingError: Math.PI, speedMph: 5, airHeight: 0});
  for (const other of s.opponents) Object.assign(other, {s: crate.s + 200, prevS: crate.s + 200});
  const before = s.armor;
  duel.step(1 / 120);
  assert.ok(s.armor > before, 'the repair crate was collected');
  assert.equal(duel.state.combat.pickups.some(item => item.spot === crate.spot), false);
  for (let i = 0; i < 120 * (ARENA_PICKUPS.respawnSec + .1); i++) duel.step(1 / 120);
  assert.ok(duel.state.combat.pickups.some(item => item.spot === crate.spot), 'the crate came back');
});

test('spawn points are well clear of junk, and a stalled rammer backs off to charge again', async () => {
  const {spawnSlots, SCRAPDOME_VENUE} = await import('../src/arena/venues.js');
  const {decideGoal} = await import('../src/arena/arena-brains.js');
  const course = new Course(SCRAPDOME_VENUE, 1989);
  for (const slot of spawnSlots(course)) {
    const at = course.worldAt(slot.s, slot.lateral);
    const nearest = Math.min(...course.features.crushables.map(prop => Math.hypot(prop.x - at.x, prop.z - at.z)));
    assert.ok(nearest >= course.def.scrapdome.junkSpawnClearance, `slot at ${slot.s} is ${nearest.toFixed(1)} m from junk`);
  }
  const {duel} = arena();
  duel.state.countdown = 0; duel.step(1 / 120);
  const rammer = duel.state.opponents[0], participant = duel.state.arena.participants[1];
  assert.equal(participant.brain, 'rammer');
  participant.targetId = 'player';
  Object.assign(rammer, {s: duel.state.s - 6, lateral: duel.state.lateral, headingError: 0, speedMph: 3});
  const goal = decideGoal(duel, participant, rammer);
  assert.ok(participant.backoffSec > 0, 'a stalled shove starts a back-off');
  assert.ok(rammer._arenaReverseSec > 0, 'it reverses out first');
  const me = worldPose(duel, rammer), them = worldPose(duel, duel.state);
  assert.ok(Math.hypot(goal.x - them.x, goal.z - them.z) > Math.hypot(me.x - them.x, me.z - them.z), 'then it heads away to line up a charge');
});
