import assert from 'node:assert/strict';
import {test, after} from 'node:test';
import {Duel} from '../src/game.js';
import {chooseTarget, thinkBrain, decideGoal} from '../src/arena/arena-brains.js';
import {arenaTargetOf, outOfPlay} from '../src/combat-teams.js';
import {stepFuelRun} from '../src/arena/modes/fuel-run.js';
import {point, aimPoint, fireWeapon} from '../src/combat-weapons.js';
import {stepProjectiles} from '../src/combat-projectiles.js';
import {stepCombatAI} from '../src/combat-ai.js';
import {COMBAT_TUNING as T, CPU_COMBAT} from '../src/wasteland-tuning.js';

// Fuel carrier identity follows the standing fighter, not its parked wreck.
// Physical-car outOfPlay remains intact. Every carry and wreck below is real.
const DT = 1 / 120;
const FLAGS = {wasteland2: true, 'hidden-road': true, scrapdome: true,
  warlords: true, 'fuel-run': true};
let checks = 0;
const eq = (a, b, message) => { checks++; assert.deepEqual(a, b, message); };
const ok = (value, message) => { checks++; assert.ok(value, message); };
const near = (a, b, message) => ok(Math.abs(a - b) < 1e-6,
  message + ': expected ' + b + ', received ' + a);
const ticks = (duel, n = 1) => { for (let i = 0; i < n; i++) duel.step(DT); };
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angleGap = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
function place(car, pose) {
  Object.assign(car, {s: pose.s, prevS: pose.s, lateral: pose.lateral,
    prevLateral: pose.lateral, speedMph: 0, headingError: 0,
    yawVelocity: 0, pushVelocity: 0, impactTimer: 0, airHeight: 0,
    prevAirHeight: 0, combatShield: 0});
}
function placeFighter(duel, pose) {
  const at = duel.course.groundAt(pose.s, pose.lateral);
  Object.assign(duel.state.fighter, {...at, ...pose, groundY: at.y,
    airHeight: 0, verticalSpeed: 0, yaw: at.heading});
}
function arena(mode = 'fuel-run', difficulty = 'hard', brain = 'hunter') {
  const duel = new Duel({seed: 1989, featureFlags: FLAGS});
  eq(duel.startArenaEvent({mode, car: 'falcone_f42', crewId: 'nell', seed: 1989,
    cpuDifficulty: difficulty, opponents: [{car: 'dusthawk_rally', brain},
      {car: 'aurora_gt', brain: 'collector'}, {car: 'stuttgart_959s', brain: 'collector'}]}),
  true, 'the real arena entry starts the named mode and controlled CPU field');
  const state = duel.state;
  state.status = 'racing'; state.countdown = 0; state.invulnerableSec = 0;
  state.combat.pickupTimer = state.combat.aiTimer = Infinity;
  for (const p of state.arena.participants) p.protectedSec = 0;
  for (const car of state.opponents) {
    car.combatWrecking = true; car.combatWreckTimer = 100000;
    state.arena.participants.find(p => p.id === car.arenaId).wreckCounted = true;
  }
  return duel;
}
function carrier(difficulty = 'hard', brain = 'hunter') {
  const duel = arena('fuel-run', difficulty, brain), state = duel.state;
  duel.setInput({interact: true}); ticks(duel, 48);
  duel.setInput({interact: false});
  eq(state.onFoot, true, 'the actual 48-step F hold creates the standing fighter');
  const f = state.fighter, pad = state.arena.fuelRun.pads[0], id = pad.canisterId;
  placeFighter(duel, pad); ticks(duel);
  const player = state.arena.participants.find(p => p.id === 'player');
  eq(player.fuelCanisterId, id, 'actual fighter collection owns the real pad canister');
  eq(state.arena.fuelRun.canisters.find(c => c.id === id).carriedBy, 'player',
    'the physical canister retains the same carrier identity');
  eq(f.knockedDown, false, 'the actual carrier is standing before the parked-car hit');
  ok(Math.hypot(point(duel, state).x - f.x, point(duel, state).z - f.z) > 40,
    'the actual fighter and parked car are far enough apart to distinguish targets');
  const cpu = state.opponents[0], participant = state.arena.participants.find(p => p.id === 'cpu-1');
  Object.assign(cpu, {combatWrecking: false, combatWreckTimer: 0, armor: cpu.maxArmor,
    impactTimer: 0, aiShieldCooldown: 1000});
  Object.assign(participant, {wreckCounted: false, protectedSec: 0,
    targetId: null, targetHeldSec: 0, goal: null, reactionSec: 0});
  place(cpu, {s: f.s - 40, lateral: f.lateral});
  thinkBrain(duel, participant, cpu, DT);
  eq(participant.targetId, 'player', 'the actual brain initially chooses the genuine standing carrier');
  return {duel, f, cpu, participant, player, id};
}
function wreckParked(c) {
  const {duel, f, player, id} = c, state = duel.state, at = point(duel, state);
  state.armor = 1; state.invulnerableSec = 0;
  state.combat.projectiles.push({id: ++state.combat.serial, kind: 'crossbow',
    level: 0, enemy: true, ownerId: 'cpu-1', sourceIndex: 0,
    x: at.x, y: at.y, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
  stepProjectiles(duel, DT);
  eq(state.combatWrecking, true, 'a real hostile bolt physically wrecks only the parked car');
  eq(state.armor, 0, 'the actual parked car has zero armor');
  eq(f.knockedDown, false, 'the actual separated carrier remains standing after the car wreck');
  eq(f.health, 100, 'physical parked-car damage leaves the distant fighter health intact');
  eq(player.fuelCanisterId, id, 'the standing fighter keeps its actual canister after the car wreck');
  eq(player.protectedSec, 0, 'no fabricated participant respawn protection hides the targeting finding');
  eq(outOfPlay(duel, state), true, 'the physical parked wreck remains out of play under the existing car rules');
}

for (const difficulty of ['medium', 'hard']) for (const brain of ['hunter', 'rammer']) {
  const name = difficulty + ' ' + brain;
  test(name + ': target selection retains the actual standing carrier after its parked car wrecks', () => {
    const c = carrier(difficulty, brain); wreckParked(c);
    eq(chooseTarget(c.duel, c.participant), 'player',
      'CPU selection still targets the standing fuel carrier despite its parked wreck');
  });
  test(name + ': actual brain and pilot goal follow the standing carrier after its parked wrecks', () => {
    const c = carrier(difficulty, brain); wreckParked(c);
    c.participant.reactionSec = 0; c.participant.targetHeldSec = 0;
    const goal = thinkBrain(c.duel, c.participant, c.cpu, DT);
    eq(c.participant.targetId, 'player', 'the real Fuel brain cannot discard a standing carrier because its car is wrecked');
    ok(Math.hypot(goal.x - c.f.x, goal.z - c.f.z) < 3,
      'the actual pursuit goal follows the real stationary fighter rather than the parked wreck');
    const directGoal = decideGoal(c.duel, c.participant, c.cpu);
    ok(Math.hypot(directGoal.x - c.f.x, directGoal.z - c.f.z) < 3,
      'direct native pilot planning also follows the standing carrier pose');
  });
  test(name + ': native arena weapon target retains the carrier while physical car stays out of play', () => {
    const c = carrier(difficulty, brain); wreckParked(c);
    eq(arenaTargetOf(c.duel, c.cpu), c.duel.state,
      'the native arena weapon target still identifies the standing carrier participant');
    const at = aimPoint(c.duel, c.duel.state);
    near(at.x, c.f.x, 'actual weapon aiming remains at the fighter x');
    near(at.z, c.f.z, 'actual weapon aiming remains at the fighter z');
    eq(outOfPlay(c.duel, c.duel.state), true, 'fighter targeting never makes the parked wreck a live physical car');
  });
  test(name + ': actual CPU crossbow fires and aims at the standing carrier after parked-car wreck', () => {
    const c = carrier(difficulty, brain); wreckParked(c);
    // At eight metres every existing seeded spread can hit the real body.
    // Scheduled weapon/range tests below retain their original forty metres.
    place(c.cpu, {s: c.f.s - 8, lateral: c.f.lateral});
    const from = point(c.duel, c.cpu);
    eq(fireWeapon(c.duel, 'crossbow', true, c.cpu), true,
      'native CPU crossbow can fire at the standing carrier despite its parked wreck');
    const shot = c.duel.state.combat.projectiles.at(-1);
    eq(shot.ownerId, 'cpu-1', 'the actual launched bolt retains CPU ownership');
    eq(shot.targetIndex, -1, 'the real launched bolt tracks the carrier participant');
    ok(Math.abs(angleGap(bearing(from, c.f), Math.atan2(shot.vx, shot.vz))) <=
      CPU_COMBAT[difficulty].aimError + 1e-8,
    'actual CPU launch keeps its existing difficulty spread around the real fighter');
    for (let i = 0; i < 90 && c.f.health === 100; i++) stepProjectiles(c.duel, DT);
    eq(c.f.health, 65, 'the actual fired and guided CPU car bolt can hit the real standing fighter');
    eq(c.player.fuelCanisterId, c.id, 'a surviving actual incoming bolt keeps the standing carrier cargo');
  });
}

for (const difficulty of ['medium', 'hard']) test(difficulty + ': positive native CPU shot hits the carrier before any parked-car wreck', () => {
  const c = carrier(difficulty);
  place(c.cpu, {s: c.f.s - 8, lateral: c.f.lateral});
  eq(c.duel.state.combatWrecking, false, 'the native CPU-hit positive control keeps the parked car healthy');
  eq(fireWeapon(c.duel, 'crossbow', true, c.cpu), true,
    'the actual CPU crossbow fires at the real carrier before a car wreck');
  for (let i = 0; i < 90 && c.f.health === 100; i++) stepProjectiles(c.duel, DT);
  eq(c.f.health, 65, 'the actual seeded CPU shot can physically hit this carrier with unchanged aim accuracy');
  eq(c.player.fuelCanisterId, c.id, 'the native positive surviving hit keeps real cargo');
});
for (const difficulty of ['medium', 'hard']) test(difficulty + ': native scheduled CPU attack still fires at standing carrier beside its parked wreck', () => {
  const c = carrier(difficulty); wreckParked(c);
  const state = c.duel.state;
  state.combat.aiTimer = 0; state.combat.aiTurn = 0;
  stepCombatAI(c.duel, DT);
  const shot = state.combat.projectiles.find(p => p.ownerId === 'cpu-1' && p.kind === 'crossbow');
  ok(shot, 'the actual scheduled CPU attack uses the standing carrier and emits its real crossbow');
  eq(state.combat.aiShot, 1, 'the existing scheduler records one native CPU attack');
  ok(Math.abs(angleGap(bearing(point(c.duel, c.cpu), c.f), Math.atan2(shot.vx, shot.vz))) <=
    CPU_COMBAT[difficulty].aimError + 1e-8,
  'the scheduled native launch aims at the real standing carrier');
});
test('an already-fired CPU bolt still guides toward the moved carrier after the parked car wrecks', () => {
  const c = carrier(), from = point(c.duel, c.cpu);
  eq(fireWeapon(c.duel, 'crossbow', true, c.cpu), true, 'the native CPU crossbow fires before the parked wreck');
  const shot = c.duel.state.combat.projectiles.at(-1), initial = bearing(from, c.f);
  const speed = Math.hypot(shot.vx, shot.vz);
  Object.assign(shot, {x: from.x + Math.sin(initial) * 3, z: from.z + Math.cos(initial) * 3,
    vx: Math.sin(initial) * speed, vz: Math.cos(initial) * speed, launchBearing: initial});
  // Keep the actual fired bolt apart while another native bolt wrecks the car.
  c.duel.state.combat.projectiles = [];
  wreckParked(c); c.duel.state.combat.projectiles.push(shot);
  const old = {s: c.f.s, lateral: c.f.lateral};
  const parkedSide = Math.sign(angleGap(initial, bearing(shot, point(c.duel, c.duel.state))));
  const destination = [-3, 3].map(offset => ({s: old.s, lateral: old.lateral + offset}))
    .find(pose => Math.sign(angleGap(initial, bearing(shot,
      c.duel.course.worldAt(pose.s, pose.lateral)) + shot.aimBias)) !== parkedSide);
  ok(destination, 'a real controlled fighter pose separates moved-fighter and parked-wreck guidance');
  placeFighter(c.duel, destination);
  const desired = bearing(shot, c.f) + shot.aimBias;
  const before = Math.abs(angleGap(Math.atan2(shot.vx, shot.vz), desired));
  stepProjectiles(c.duel, DT);
  const after = Math.abs(angleGap(Math.atan2(shot.vx, shot.vz), bearing(shot, c.f) + shot.aimBias));
  ok(after < before, 'actual in-flight bolt guidance continues toward the moved standing carrier');
});
for (const condition of ['knocked-down', 'protected', 'no-cargo', 'friendly']) {
  test('standing-carrier targeting excludes the actual ' + condition + ' control', () => {
    const c = carrier(); wreckParked(c);
    if (condition === 'knocked-down') {
      for (let i = 0; i < 3; i++) {
        c.duel.state.combat.projectiles.push({id: ++c.duel.state.combat.serial,
          kind: 'crossbow', level: 0, enemy: true, ownerId: 'cpu-1', sourceIndex: 0,
          x: c.f.x - 2, y: c.f.y + .9, z: c.f.z,
          vx: 480, vy: 0, vz: 0, age: 0});
        stepProjectiles(c.duel, DT);
      }
      eq(c.f.knockedDown, true, 'actual incoming body bolts create the knocked-down exclusion control');
      eq(c.player.fuelCanisterId, c.id, 'the actual downed control still carries until the native Fuel step drops it');
      eq(chooseTarget(c.duel, c.participant), null, 'a downed actual fighter is excluded before cargo drop');
      eq(arenaTargetOf(c.duel, c.cpu), null, 'native weapon targeting excludes the downed fighter before cargo drop');
      stepFuelRun(c.duel, DT);
      eq(c.player.fuelCanisterId, null, 'the real knockdown physically drops the actual cargo');
    } else if (condition === 'protected') c.player.protectedSec = 1;
    else if (condition === 'friendly') c.participant.team = c.player.team;
    else {
      placeFighter(c.duel, c.duel.state.arena.fuelRun.depots.find(d => d.participantId === 'player'));
      stepFuelRun(c.duel, DT);
      eq(c.player.fuelCanisterId, null, 'actual native delivery creates the no-cargo exclusion control');
    }
    eq(chooseTarget(c.duel, c.participant), null, 'CPU selection excludes the real unavailable/non-carrier control');
    eq(arenaTargetOf(c.duel, c.cpu), null, 'native weapon targeting excludes the actual control before the brain clears it');
    thinkBrain(c.duel, c.participant, c.cpu, DT);
    eq(c.participant.targetId, null, 'the actual brain drops the unavailable/non-carrier target');
    eq(arenaTargetOf(c.duel, c.cpu), null, 'the native arena weapon target excludes the actual control');
  });
}
test('Last Car Rolling still excludes a physically wrecked player car from CPU targets', () => {
  const duel = arena('last-car-rolling'), state = duel.state;
  const cpu = state.opponents[0], participant = state.arena.participants.find(p => p.id === 'cpu-1');
  Object.assign(cpu, {combatWrecking: false, combatWreckTimer: 0, impactTimer: 0});
  Object.assign(participant, {targetId: 'player', protectedSec: 0, wreckCounted: false});
  const at = point(duel, state); state.armor = 1;
  state.combat.projectiles.push({id: ++state.combat.serial, kind: 'crossbow',
    level: 0, enemy: true, ownerId: 'cpu-1', sourceIndex: 0,
    x: at.x, y: at.y, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
  stepProjectiles(duel, DT);
  eq(state.onFoot, false, 'the native non-Fuel control remains in its car');
  eq(state.combatWrecking, true, 'the actual non-Fuel hostile bolt wrecks the player car');
  eq(outOfPlay(duel, state), true, 'the original physical-car rule still excludes a non-Fuel wreck');
  eq(chooseTarget(duel, participant), null, 'Last Car Rolling never selects the physical wreck');
  eq(arenaTargetOf(duel, cpu), null, 'Last Car Rolling weapon targeting retains its original wreck guard');
});
after(() => console.log('Fuel standing carrier: ' + checks + ' acceptance checks reached.'));


// Independent player regression controls. SCRAPDOME's carrier-only pursuit
// rule belongs to computer brains; occupied player cars retain physical targets.
function playerCarTarget(mode = 'fuel-run', carrying = false) {
  const duel = arena(mode), state = duel.state, cpu = state.opponents[0];
  const participant = state.arena.participants.find(p => p.id === 'cpu-1');
  const pose = mode === 'fuel-run' ? state.arena.fuelRun.pads[0] : {s: 100, lateral: -6};
  Object.assign(cpu, {combatWrecking: false, combatWreckTimer: 0,
    armor: cpu.maxArmor, impactTimer: 0});
  Object.assign(participant, {wreckCounted: false, protectedSec: 0});
  place(cpu, pose); place(state, {s: pose.s - 40, lateral: pose.lateral});
  eq(state.onFoot, false, 'the real player launch fixture stays inside its healthy car');
  eq(outOfPlay(duel, cpu), false, 'the real CPU car is physically healthy and unprotected');
  eq(participant.fuelCanisterId ?? null, null, 'the real target begins without cargo');
  if (carrying) {
    const id = state.arena.fuelRun.pads[0].canisterId;
    stepFuelRun(duel, DT);
    eq(participant.fuelCanisterId, id, 'native car collection creates the real CPU carrier');
    eq(state.arena.fuelRun.canisters.find(c => c.id === id).carriedBy, 'cpu-1',
      'the collected physical canister belongs to the actual CPU');
  }
  return {duel, state, cpu, participant};
}
function playerBolt(c) {
  eq(fireWeapon(c.duel, 'crossbow', false), true,
    'the occupied player car can launch its native crossbow at this physical CPU target');
  const shot = c.state.combat.projectiles.at(-1);
  eq(shot.enemy, false, 'the actual launched crossbow is player-owned');
  eq(shot.ownerId, 'player', 'the native arena projectile retains player ownership');
  eq(shot.targetIndex, 0, 'the actual player projectile tracks the selected physical CPU');
  return shot;
}
function movedPlayerBolt(c, shot) {
  const from = point(c.duel, c.state), at = point(c.duel, c.cpu);
  const initial = bearing(from, at), speed = Math.hypot(shot.vx, shot.vz);
  // Preserve the actual native projectile and its speed. Remove initial lead
  // angle so the subsequent native turn is measurable independently of motion.
  Object.assign(shot, {x: from.x + Math.sin(initial) * 3,
    z: from.z + Math.cos(initial) * 3, vx: Math.sin(initial) * speed,
    vz: Math.cos(initial) * speed, launchBearing: initial});
  place(c.cpu, {s: c.cpu.s, lateral: c.cpu.lateral + 3});
  const desired = bearing(shot, point(c.duel, c.cpu));
  const gap = angleGap(initial, desired);
  ok(Math.abs(gap) > .01 && Math.abs(gap) < T.crossbow.homingConeRadians,
    'the real moved car is a distinct aim point inside the unchanged public homing cone');
  stepProjectiles(c.duel, DT);
  const turn = angleGap(initial, Math.atan2(shot.vx, shot.vz));
  return {turn, gap};
}
function nativePlayerImpact(c, kind = 'crossbow', level = 0) {
  const at = point(c.duel, c.cpu);
  c.state.combat.projectiles.push({id: ++c.state.combat.serial, kind, level,
    enemy: false, ownerId: 'player', x: at.x, y: at.y, z: at.z,
    vx: 0, vy: 0, vz: 0, age: kind === 'bomb' ? 2 : 0});
  stepProjectiles(c.duel, DT);
}

test('player crossbow launches at a healthy Fuel CPU without cargo', () => {
  const c = playerCarTarget();
  // The original forty-metre path crosses a real raised ramp before the car.
  // Use a clear eight-metre native shot for the independent physical-hit control.
  place(c.cpu, {s: c.state.s + 8, lateral: c.state.lateral});
  // CPU hunting deliberately retains its carrier-only no-cargo guard.
  eq(chooseTarget(c.duel, c.participant), null,
    'the same no-cargo field still offers no carrier to the computer hunter');
  playerBolt(c);
  const before = c.cpu.armor;
  for (let i = 0; i < 90 && c.cpu.armor === before; i++) stepProjectiles(c.duel, DT);
  ok(c.cpu.armor < before, 'the actual player launch can damage the healthy noncarrier car');
});

test('already-fired player bolt keeps guiding after a native hit drops CPU cargo', () => {
  const c = playerCarTarget('fuel-run', true), shot = playerBolt(c);
  const id = c.participant.fuelCanisterId, before = c.cpu.armor;
  c.state.combat.projectiles = [];
  nativePlayerImpact(c, 'bomb', 3);
  near(before - c.cpu.armor, 26.1, 'the actual level-three bomb removes more than 25 armor');
  eq(c.cpu.combatWrecking, false, 'the native cargo-drop hit leaves the physical target healthy');
  eq(c.participant.fuelCanisterId, null, 'the native bomb hit actually drops the CPU cargo');
  eq(c.state.arena.fuelRun.canisters.find(canister => canister.id === id).carriedBy,
    null, 'the actual dropped canister no longer has a carrier');
  eq(outOfPlay(c.duel, c.cpu), false, 'cargo loss does not make the real healthy car physically unavailable');
  c.state.combat.projectiles.push(shot);
  const {turn, gap} = movedPlayerBolt(c, shot);
  ok(Math.abs(turn) > 1e-8 && Math.sign(turn) === Math.sign(gap),
    'actual in-flight PLAYER bolt keeps turning toward its healthy CPU after native cargo loss');
});

test('positive player bolt guidance follows a moved CPU while it still carries cargo', () => {
  const c = playerCarTarget('fuel-run', true), shot = playerBolt(c);
  const id = c.participant.fuelCanisterId;
  const {turn, gap} = movedPlayerBolt(c, shot);
  ok(Math.abs(turn) > 1e-8 && Math.sign(turn) === Math.sign(gap),
    'native player guidance turns toward the actual moved carrier control');
  eq(c.participant.fuelCanisterId, id, 'the native guidance positive control keeps its real cargo');
});

test('player crossbow still refuses a physically wrecked Fuel CPU', () => {
  const c = playerCarTarget('fuel-run', true);
  c.cpu.armor = 1; nativePlayerImpact(c);
  eq(c.cpu.combatWrecking, true, 'the native player bolt physically wrecks the CPU control');
  eq(outOfPlay(c.duel, c.cpu), true, 'the physical CPU wreck remains out of play');
  eq(fireWeapon(c.duel, 'crossbow', false), false,
    'actual player launch still rejects a physical wreck even while its cargo has not yet dropped');
});

test('already-fired player bolt stops guiding at a physically wrecked CPU', () => {
  const c = playerCarTarget('fuel-run', true), shot = playerBolt(c);
  const id = c.participant.fuelCanisterId;
  c.state.combat.projectiles = []; c.cpu.armor = 1; nativePlayerImpact(c);
  eq(c.cpu.combatWrecking, true, 'a separate actual player bolt creates the physical wreck control');
  eq(c.participant.fuelCanisterId, id, 'the wreck guidance control is checked before native Fuel cargo drop');
  c.state.combat.projectiles.push(shot);
  const {turn} = movedPlayerBolt(c, shot);
  near(turn, 0, 'native player guidance never follows a physically wrecked car');
});

for (const protectedId of ['cpu-1', 'player']) test('native player shot preserves ' + protectedId + ' respawn damage protection', () => {
  const c = playerCarTarget('fuel-run', true), shot = playerBolt(c);
  c.state.arena.participants.find(p => p.id === protectedId).protectedSec = 1;
  const before = c.cpu.armor, at = point(c.duel, c.cpu);
  // Move the actual fired bolt into the real physical contact band. Damage
  // protection is checked separately from the player's freedom to launch.
  Object.assign(shot, {x: at.x - 2, y: at.y, z: at.z,
    vx: 480, vy: 0, vz: 0, targetIndex: null});
  stepProjectiles(c.duel, DT);
  eq(c.cpu.armor, before, 'actual player projectile contact cannot bypass participant respawn protection');
  eq(c.cpu.combatWrecking, false, 'the protected native physical contact cannot create a wreck');
});

test('Last Car Rolling preserves native player launch and guidance without cargo', () => {
  const c = playerCarTarget('last-car-rolling'), shot = playerBolt(c);
  eq(c.state.arena.fuelRun, undefined, 'the actual non-Fuel control has no fuel event state');
  const {turn, gap} = movedPlayerBolt(c, shot);
  ok(Math.abs(turn) > 1e-8 && Math.sign(turn) === Math.sign(gap),
    'non-Fuel player guidance retains physical-car targeting and native homing');
});
