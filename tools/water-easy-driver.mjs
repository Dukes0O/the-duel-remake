// WATER-EASY: the child-pace test player for The Water Road (docs/story/wasteland-water-road.md section 4).
// A test helper only: it plays through the same inputs a player has (pedals, steering, fire, the F key and the
// on-foot keys) and never changes a rule, a tuning number or a computer car.
//
// CHILD PACE. The player is never quicker or sharper than an Easy computer car (BRAIN_DIFFICULTY.easy,
// CPU_COMBAT.easy):
// - Sees late: it decides from where things were 0.3 to 0.6 s ago (seeded per game), and it re-plans only every
//   0.6 s, the Easy car's own reaction time. An Easy car re-plans every 0.6 s from what is there now.
// - Drives slower: at most 80 to 85% of the car's top speed on an arena floor (Easy cars drive at 85%), and 85 to 90%
//   of the autopilot's corner speeds on a road. It never boosts (Easy cars never boost).
// - Aims no better: it attacks no more often than an Easy car (one crossbow or bomb every 10 to 12 s; an Easy car
//   attacks every 10 s), and each bolt leaves with the Easy car's aim error (up to 10 degrees either side) and no
//   homing. It bombs only inside the Easy car's bomb range. It does not lead a moving car: it drives at where the
//   car was seen, where an Easy rammer drives at where the car will be.
// - On foot it walks (no sprint, no jump), turns with the keys (2.4 rad/s), and aims each rocket with the same
//   10-degree error.
// - No tricks: no boost, no shield, no UFO hop, no arsenal specials, no pickups chased, no shortcuts.
// The hands are an Easy car's hands: it steers off walls, slows for tight turns and backs out when stuck, as
// the computer pilot does (src/arena/arena-pilot.js), because a child who keeps driving into a wall is a broken
// test, not a child.
globalThis.cancelAnimationFrame ??= () => {};
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {DRIVE, COURSE} from '../src/config.js';
import {CPU_COMBAT, COMBAT_TUNING, WEAPONS} from '../src/wasteland-tuning.js';
import {BRAIN_DIFFICULTY} from '../src/arena/arena-brains.js';
import {worldPose, floorLimit} from '../src/arena/arena-floor.js';
import {ringDistance} from '../src/arena/arena-pilot.js';
import {arenaFloorSpeed} from '../src/arena/venues.js';
import {arenaActor, hostile, outOfPlay} from '../src/combat-teams.js';
import {startWarlordEvent, beginWarlordEvent} from '../src/arena/warlord-event.js';
import {convoyRig, convoyBoardingOpen, convoyStopped, convoyBodyGap} from '../src/arena/modes/convoy-raid.js';
import {fighterDistanceToCar} from '../src/onfoot-transition.js';
import {convoyValvePoints} from '../src/arena/convoy.js';
import {WARLORDS} from '../src/warlords.js';
import {ARENA_FIELD} from '../src/arena/arena-event.js';

const EASY = BRAIN_DIFFICULTY.easy, EASY_FIRE = CPU_COMBAT.easy;
export const CHILD = Object.freeze({
  seeLateSec: [.3, .6], replanSec: EASY.reactionSec, arenaPace: [.80, .85], roadPace: [.85, .90],
  attackEverySec: [EASY_FIRE.interval, EASY_FIRE.interval * 1.2], aimErrorRadians: EASY_FIRE.aimError,
  bombMetres: COMBAT_TUNING.cpu.bombRange, footTurnRadiansPerSecond: 2.4,
});
export const STARTER_CAR = 'falcone_f42';   // the first free car (src/progression.js FREE_CARS) and the arena default
const DT = 1 / 120;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

// One child per game: its lateness, pace and attack clock come from the game's seed.
export function childFor(seed, overrides = {}) {
  const rng = makeRng((seed ^ 0x6b1d) >>> 0), rule = {...CHILD, ...overrides};
  const seeLateSec = rng.range(...rule.seeLateSec);
  return {rng, seeLateSec, arenaPace: rng.range(...rule.arenaPace), roadPace: rng.range(...rule.roadPace),
    homing: rule.homing === true, attackClock: rule.attackClock ?? 'ready',
    // The next press of fire: on the Easy clock, or as soon as the weapon is ready, seen late.
    nextAttack: weapon => rule.attackClock === 'easy' ? rng.range(...rule.attackEverySec)
      : WEAPONS[weapon].cooldown + seeLateSec + rng.range(0, .5),
    aimError: () => rng.range(-rule.aimErrorRadians, rule.aimErrorRadians)};
}

// An attack: one press of crossbow (or bomb when close), then the bolt is given the Easy car's error and no homing.
function attack(duel, child, nearestMetres) {
  const combat = duel.state.combat, before = combat.projectiles.length;
  const weapon = nearestMetres < CHILD.bombMetres ? 'bomb' : 'crossbow';
  if (!duel.fireWeapon(weapon)) return weapon === 'bomb' && attack(duel, child, Infinity);
  if (weapon === 'crossbow' && !child.homing) for (const bolt of combat.projectiles.slice(before)) {
    const error = child.aimError(), {vx, vz} = bolt;
    bolt.vx = vx * Math.cos(error) + vz * Math.sin(error);
    bolt.vz = vz * Math.cos(error) - vx * Math.sin(error);
    bolt.targetIndex = null; delete bolt.targetId;
    bolt.launchBearing = Math.atan2(bolt.vx, bolt.vz);
  }
  return weapon;
}

// ---- The arena ------------------------------------------------------------------------------------------------------
// What the child saw `seeLateSec` ago: world points of every car, fighter and canister, kept as a short history.
function snapshot(duel) {
  const state = duel.state, cars = {};
  for (const actor of [state, ...state.opponents]) {
    const id = actor === state ? 'player' : actor.arenaId ?? actor.id;
    if (!id || !Number.isFinite(actor.s)) continue;
    cars[id] = {...worldPose(duel, actor), s: actor.s, actor};
  }
  return {t: state.stageTimeSec, cars};
}

function seen(memory, child, now) {
  const wanted = now - child.seeLateSec;
  let pick = memory[0];
  for (const shot of memory) { if (shot.t <= wanted) pick = shot; else break; }
  while (memory.length > 2 && memory[1].t <= wanted - .2) memory.shift();
  return pick;
}

// Live, hostile cars the child can fight, nearest first (by where it saw them).
function enemies(duel, view, me) {
  const state = duel.state;
  return state.opponents.filter(actor => !outOfPlay(duel, actor) && hostile(duel, state, actor))
    .map(actor => {
      const at = view.cars[actor.arenaId ?? actor.id] ?? {...worldPose(duel, actor), s: actor.s};
      return {actor, at, metres: Math.hypot(at.x - me.x, at.z - me.z)};
    }).sort((a, b) => a.metres - b.metres);
}

// The car's hands: a goal {x, z, speedMph} becomes pedals and steering, with an Easy car's wall sense and unstick.
function drive(duel, hands, goal, top) {
  const state = duel.state, course = duel.course, me = worldPose(duel, state);
  const speed = state.speedMph || 0, metres = Math.abs(speed) * DRIVE.mphToWorld;
  const goalRing = course.nearest(goal.x, goal.z, state.s);
  const gap = ringDistance(course, state.s, goalRing.s);
  let desired = Math.abs(gap) > 55
    ? course.at(state.s).heading + (gap >= 0 ? 0 : Math.PI) + (gap >= 0 ? 1 : -1) *
      clamp((goalRing.lateral - state.lateral) * .035, -.5, .5)
    : Math.atan2(goal.x - me.x, goal.z - me.z);
  let target = goal.speedMph;
  const margin = floorLimit(duel) - 3.5;
  for (const [seconds, minimum] of [[.45, 6], [1, 10]]) {
    const reach = Math.max(minimum, metres * seconds);
    const ahead = course.nearest(me.x + Math.sin(me.heading) * reach, me.z + Math.cos(me.heading) * reach, state.s);
    const over = Math.abs(ahead.lateral) - margin;
    if (over <= 0) continue;
    const danger = Math.min(2, over / 3.5), tangent = course.at(state.s).heading;
    const along = Math.cos(wrap(me.heading - tangent)) >= 0 ? 1 : -1;
    desired = tangent + (along > 0 ? 0 : Math.PI) - Math.sign(ahead.lateral) * along * (.3 + .25 * danger);
    target *= 1 - .45 * Math.min(1, danger);
    break;
  }
  // Stuck (nose in a wall or junk): back out for 1.4 s, then a 1.5 s grace.
  if (hands.reverse > 0) hands.reverse -= DT;
  else if (hands.grace > 0) { hands.grace -= DT; hands.watch = null; }
  else if (goal.speedMph > 10) {
    if (!hands.watch) hands.watch = {x: me.x, z: me.z, sec: 0};
    else if ((hands.watch.sec += DT) >= 1) {
      if (Math.hypot(me.x - hands.watch.x, me.z - hands.watch.z) < 1.5) { hands.reverse = 1.4; hands.grace = 1.5; }
      hands.watch = null;
    }
  }
  const turn = wrap(desired - me.heading);
  if (hands.reverse > 0) {
    duel.setInput({throttle: 0, brake: 1, steer: clamp(turn * 2.2, -1, 1), boost: false});
    return;
  }
  if (Math.abs(turn) > 1.1) target = Math.min(target, Math.max(22, top * .6));
  duel.setInput({throttle: speed < target ? 1 : 0, brake: speed > target + 5 ? 1 : 0,
    steer: clamp(-turn * 2.2, -1, 1), boost: false});
}

// Mode goals. Each returns {x, z, speedMph} from the child's late view.
function arenaGoal(duel, view, me, top) {
  const arena = duel.state.arena, cruise = () => {
    const ahead = duel.course.worldAt(duel.state.s + 40, 0);
    return {x: ahead.x, z: ahead.z, speedMph: top * .6};
  };
  if (arena.mode === 'fuel-run') {
    const fuel = arena.fuelRun, mine = arena.participants[0], course = duel.course;
    const spots = mine.fuelCanisterId ? [fuel.depots.find(depot => depot.participantId === 'player')]
      : fuel.canisters.filter(canister => !canister.carriedBy);
    const pick = spots.map(spot => ({spot, at: course.worldAt(spot.s, spot.lateral)}))
      .sort((a, b) => Math.hypot(a.at.x - me.x, a.at.z - me.z) - Math.hypot(b.at.x - me.x, b.at.z - me.z))[0];
    if (!pick) return cruise();
    const metres = Math.hypot(pick.at.x - me.x, pick.at.z - me.z);
    return {x: pick.at.x, z: pick.at.z, speedMph: Math.min(top, Math.max(10, metres * 1.7))};
  }
  if (arena.mode === 'bounty-hunt') {
    const markedId = arena.bountyHunt?.markedId;
    if (markedId === 'player') return cruise();   // holding the bounty: keep driving round the bowl
    const marked = markedId && arenaActor(duel, markedId);
    if (marked && !outOfPlay(duel, marked)) {
      const at = view.cars[markedId] ?? worldPose(duel, marked);
      return {x: at.x, z: at.z, speedMph: top};
    }
  }
  if (arena.convoy) {
    const rig = convoyRig(duel);
    if (rig && arena.convoy.valves.some(armor => armor > 0)) {
      // Drive at the nearest red valve still holding (the screen says HIT THE RED VALVES), where it was seen.
      const seenRig = view.cars[rig.arenaId], now = worldPose(duel, rig);
      const shift = seenRig ? {x: seenRig.x - now.x, z: seenRig.z - now.z} : {x: 0, z: 0};
      const valve = convoyValvePoints(duel, rig).filter((_, index) => arena.convoy.valves[index] > 0)
        .sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      return {x: valve.x + shift.x, z: valve.z + shift.z, speedMph: top};
    }
  }
  const nearest = enemies(duel, view, me)[0];
  return nearest ? {x: nearest.at.x, z: nearest.at.z, speedMph: top} : cruise();
}

// On foot: walk (turning with the keys) toward a world point; returns the distance left.
function walk(duel, point, stopMetres = 1) {
  const fighter = duel.state.fighter;
  const metres = Math.hypot(point.x - fighter.x, point.z - fighter.z);
  const turn = wrap(Math.atan2(point.x - fighter.x, point.z - fighter.z) - fighter.yaw);
  duel.setFighterInput({turnLeft: turn > .06, turnRight: turn < -.06, forward: metres > stopMetres && Math.abs(turn) < 1.2,
    back: false, left: false, right: false, sprint: false, jump: false, lookX: 0, lookY: 0});
  return metres;
}

// The Convoy Raid boarding, step by step, once the valves are broken.
function board(duel, child, hands) {
  const state = duel.state, rig = convoyRig(duel), convoy = state.arena.convoy;
  const open = convoyBoardingOpen(duel, rig);
  if (state.boarding) {
    duel.setFighterInput({fire: true, forward: false, turnLeft: false, turnRight: false});
    return true;
  }
  if (!state.onFoot) {
    if (!open) return false;
    hands.stoppedFor = convoyStopped(duel, rig) ? (hands.stoppedFor || 0) + DT : 0;
    const at = worldPose(duel, rig), me = worldPose(duel, state);
    const metres = Math.hypot(at.x - me.x, at.z - me.z);
    if (metres > 9) { drive(duel, hands, {x: at.x, z: at.z, speedMph: Math.min(30, metres)}, 30); return true; }
    // Beside the tanker: stop, and once it has stood still for the child's late-seeing time, hold F to get out.
    const still = Math.abs(state.speedMph) < 3 && hands.stoppedFor > child.seeLateSec;
    duel.setInput({throttle: 0, brake: Math.abs(state.speedMph) > 1 ? 1 : 0, steer: 0, boost: false, interact: still});
    return true;
  }
  // On foot.
  duel.setInput({interact: false});
  if (state.fighter.knockedDown) return true;
  if (!open) {
    // The window shut: walk back to the car and hold F to get in.
    const car = duel.course.groundAt(state.s, state.lateral);
    walk(duel, car, 2);
    duel.setInput({interact: fighterDistanceToCar(duel) < 3});
    return true;
  }
  const at = duel.course.groundAt(rig.s, rig.lateral);
  walk(duel, at, 0);
  if (convoyBodyGap(duel, rig, state.fighter) < 2.5) {
    hands.press = !hands.press;   // a press, then a release, so F is seen as a new press
    duel.setInput({interact: hands.press});
  }
  return true;
}

// Ambush Alley: on foot at the fort; rockets at the nearest raider (or the buggy), back to the car to reload.
function holdFort(duel, child, hands, view) {
  const state = duel.state, alley = state.arena.ambushAlley, weapons = state.footWeapons;
  if (!state.onFoot) {
    // In the car only to refill rockets: release F once, then hold it to step out again.
    if (!hands.released) { duel.setInput({interact: false, throttle: 0, brake: 1, steer: 0}); hands.released = true; return; }
    duel.setInput({interact: true, throttle: 0, brake: 1, steer: 0});
    return;
  }
  hands.released = false;
  const fighter = state.fighter;
  if (fighter.knockedDown) return;
  if (weapons.ammo <= 0) {
    const car = duel.course.groundAt(state.s, state.lateral);
    walk(duel, car, 2);
    duel.setInput({interact: fighterDistanceToCar(duel) < 3});
    return;
  }
  duel.setInput({interact: false});
  // The nearest raider still standing (as seen late), else this wave's buggy.
  const raiders = (state.raids?.zones || []).flatMap(zone => zone.raiders)
    .filter(raider => raider.ambushWave === alley.wave && !raider.knockedDown);
  const lateRaider = raider => hands.raiderSeen.get(raider.id) ?? raider;
  let target = raiders.map(raider => ({raider, at: lateRaider(raider)}))
    .sort((a, b) => Math.hypot(a.at.x - fighter.x, a.at.z - fighter.z) - Math.hypot(b.at.x - fighter.x, b.at.z - fighter.z))[0];
  const buggy = state.opponents.find(actor => actor.arenaRole === 'ambush-buggy' && actor.ambushWave === alley.wave &&
    !actor.finished && !actor.combatWrecking);
  let car = false;
  if (!target && buggy) { const at = duel.course.groundAt(buggy.s, buggy.lateral); target = {at: {...at, y: at.y - .6}}; car = true; }
  if (!target) {
    // Nothing to shoot: mend the fort with the wrench (the mode's own repair, 40 health over 4 s).
    const fort = alley.fort;
    if (fort.health < fort.maxHealth - 20) {
      if (weapons.selected !== 'wrench') duel.selectFootGear(2);
      const cover = fort.cover.reduce((best, item) => Math.hypot(item.x - fighter.x, item.z - fighter.z) <
        Math.hypot(best.x - fighter.x, best.z - fighter.z) ? item : best);
      const metres = walk(duel, cover, 2.2);
      hands.mend = metres < 3 && !(weapons.repairBlockedUntilRelease && hands.mend);
      duel.setFighterInput({fire: hands.mend, aim: false});
      return;
    }
    duel.setFighterInput({fire: false, aim: false, turnLeft: false, turnRight: false, forward: false});
    return;
  }
  if (weapons.selected !== 'rpg') { duel.selectFootGear(1); duel.setFighterInput({fire: false}); hands.fired = false; }
  if (hands.aimError == null) hands.aimError = child.aimError();
  const dx = target.at.x - fighter.x, dz = target.at.z - fighter.z, flat = Math.hypot(dx, dz);
  const yawWanted = Math.atan2(dx, dz) + hands.aimError;
  const pitchWanted = Math.atan2((target.at.y ?? fighter.y) + .9 - (fighter.y + COMBAT_TUNING.foot.rpgEyeHeight), flat);
  const turn = wrap(yawWanted - fighter.yaw), tilt = pitchWanted - (fighter.pitch || 0);
  const step = CHILD.footTurnRadiansPerSecond * DT;
  const ready = flat < 40 && state.stageTimeSec + 1e-9 >= weapons.nextFireAt && Math.abs(turn) < step * 1.5 && Math.abs(tilt) < .02 &&
    (!car || weapons.lockSeconds >= COMBAT_TUNING.foot.rpgLockSeconds - 1e-9);
  const fire = ready && !hands.fired;
  duel.setFighterInput({turnLeft: turn > step / 2, turnRight: turn < -step / 2, forward: false, back: false,
    left: false, right: false, sprint: false, jump: false, lookX: 0,
    lookY: clamp(-tilt / .0022, -step / .0022, step / .0022), aim: car, fire});
  hands.fired = fire;
  if (fire) hands.aimError = null;
}

// One arena game. job: {mode, venueId} or fight: {warlordId}. Returns what happened.
export function playArena({mode = 'last-car-rolling', venueId = 'scrapdome', warlordId = null, seed = 1989,
  car = STARTER_CAR, arsenalRank = 12, maxSec = 420, rules = {}, opponents = 3, featureFlags = {}}) {
  const duel = new Duel({seed, featureFlags: {'hidden-road': true, ...featureFlags}});
  duel.state.wastelandGateDiscovered = true;
  const count = mode === 'ambush-alley' ? 0 : opponents;
  const field = ARENA_FIELD.filter(key => key !== car).slice(0, count).map((key, index) => ({car: key, upgradeLevel: 0,
    ...(mode === 'fuel-run' ? {brain: ['collector', 'rammer', 'hunter'][index]} : {})}));
  const options = {mode, venueId, car, cpuDifficulty: 'easy', difficulty: 'casual', seed, opponents: field, arsenalRank};
  const started = warlordId ? startWarlordEvent(duel, {...options, warlordId}) : duel.startArenaEvent(options);
  if (!started) throw Error(`could not start ${warlordId ?? mode}`);
  if (warlordId) beginWarlordEvent(duel);
  const child = childFor(seed, rules), state = duel.state, hands = {raiderSeen: new Map()}, memory = [];
  const out = {attacks: 0, tells: 0};
  // A tell aimed at the child (the flashing lights and roar of ARENA-FEEL, Sal's spin-up): seen late, the child
  // stamps on the brake until it is over. It never dodges sideways or times a counter.
  duel.onChange((_state, event) => {
    const tell = event.arenaTell ?? event.salSaw;
    if (!tell || (tell.targetId && tell.targetId !== 'player')) return;
    out.tells++;
    const now = state.stageTimeSec;
    hands.brakeFrom = now + child.seeLateSec;
    hands.brakeUntil = Math.max(hands.brakeUntil || 0, now + tell.seconds + .4);
  });
  const top = arenaFloorSpeed(duel.course.def.scrapdome, duel.car.topSpeed) * child.arenaPace;
  let goal = null, replan = 0, attackAt = child.nextAttack('crossbow');
  const raiderHistory = [];
  for (let step = 0; state.status !== 'arena_result' && step < maxSec / DT; step++) {
    if (state.status === 'racing') {
      memory.push(snapshot(duel));
      const view = seen(memory, child, state.stageTimeSec), me = worldPose(duel, state);
      if (state.arena.mode === 'ambush-alley') {
        raiderHistory.push({t: state.stageTimeSec, at: new Map((state.raids?.zones || []).flatMap(zone => zone.raiders)
          .map(raider => [raider.id, {x: raider.x, y: raider.y, z: raider.z}]))});
        while (raiderHistory.length > 2 && raiderHistory[1].t <= state.stageTimeSec - child.seeLateSec) raiderHistory.shift();
        hands.raiderSeen = raiderHistory[0].at;
        holdFort(duel, child, hands, view);
      } else if (state.arena.convoy && (state.onFoot || state.boarding ||
          convoyBoardingOpen(duel, convoyRig(duel)))) {
        board(duel, child, hands);
      } else {
        if ((replan -= DT) <= 0 || !goal) { goal = arenaGoal(duel, view, me, top); replan = CHILD.replanSec; }
        drive(duel, hands, goal, top);
        if (state.stageTimeSec >= hands.brakeFrom && state.stageTimeSec < hands.brakeUntil && !(hands.reverse > 0))
          duel.setInput({throttle: 0, brake: 1});
        if (state.stageTimeSec >= attackAt) {
          const nearest = enemies(duel, view, me)[0];
          const fired = nearest && nearest.metres < COMBAT_TUNING.cpu.attackRange && attack(duel, child, nearest.metres);
          if (fired) {
            out.attacks++;
            attackAt = state.stageTimeSec + child.nextAttack(fired);
          }
        }
      }
    }
    duel.step(DT);
  }
  const arena = state.arena, result = arena.result;
  const me = arena.participants.find(participant => participant.id === 'player');
  return {won: result?.winnerId === 'player', reason: result?.reason ?? 'unfinished', sec: Math.round(arena.clockSec),
    wrecks: me.wrecks, wrecked: me.wrecked, attacks: out.attacks, tells: out.tells,
    ...(arena.fuelRun ? {fuel: arena.participants.map(p => p.fuelDelivered)} : {}),
    ...(arena.bountyHunt ? {points: arena.participants.map(p => p.bountyPoints)} : {}),
    ...(arena.ambushAlley ? {waves: arena.ambushAlley.completedWaves, fort: Math.round(arena.ambushAlley.fort.health)} : {}),
    ...(arena.convoy ? {valves: arena.convoy.valves.map(Math.round), boarded: !!state.boarding || arena.convoy.finished} : {}),
    ...(arena.mode === 'warlord' ? {them: arena.participants.filter(p => p.id !== 'player' && !p.decoy)
      .reduce((sum, p) => sum + (p.wrecks || 0), 0)} : {})};
}

// ---- Mad Max Duel races -----------------------------------------------------------------------------------------------
// The App's autopilot holds the line; the child drives it at 85 to 90% of the autopilot's corner speed and attacks on
// the Easy clock with the Easy aim error.
export async function playRace({courseId, seed = 1989, car = STARTER_CAR, rules = {}}) {
  const memory = new Map();
  globalThis.localStorage = {getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)),
    removeItem: k => memory.delete(k), key: i => [...memory.keys()][i] ?? null, get length() { return memory.size; }};
  const {App} = await import('../src/app.js');
  const app = new App();
  app._refreshPlayer(); app.seed = seed; app.cpuDifficulty = 'easy';
  const startStage = COURSE.findIndex(course => course.id === courseId);
  if (startStage < 0) throw Error('no course ' + courseId);
  app.duel.startCampaign({startStage, seed, mode: 'wasteland', discoveredGate: true, car, difficulty: 'casual',
    cpuDifficulty: 'easy', playerId: app.player.id, upgrades: {}});
  if (app.duel.state.mode !== 'wasteland' || app.duel.course.def.id !== courseId) throw Error('could not start ' + courseId);
  const duel = app.duel, state = duel.state, child = childFor(seed, rules);
  app.autopilot = true; app._scriptedCrashDone = true;
  let attackAt = child.nextAttack('crossbow'), attacks = 0;
  const line = app._driveAutopilot.bind(app);
  app._driveAutopilot = dt => {
    line(dt);
    if (state.status !== 'racing' || state.impactTimer > 0) return;
    // The autopilot's own corner speed (src/app.js _driveAutopilot), times the child's pace.
    const course = duel.course;
    const bend = Math.max(Math.abs(course.at(state.s).curvature), Math.abs(course.at(state.s + 100).curvature),
      Math.abs(course.at(state.s + 220).curvature));
    const surface = duel._drivingSurface(state.s, state.lateral);
    const grip = ['snow', 'deep-snow', 'ice'].includes(surface.gripKind) ? surface.traction : 1;
    const corner = Math.min(duel.car.topSpeed * .94, .85 * Math.sqrt(DRIVE.maxLateralAccel * duel.car.grip * grip /
      Math.max(.0001, bend)) / DRIVE.mphToWorld);
    const target = Math.min(surface.speedLimit, corner) * child.roadPace;
    const input = state.input;
    duel.setInput({throttle: state.speedMph < target ? input.throttle : 0,
      brake: Math.max(input.brake, state.speedMph > target + 4 ? Math.min(1, (state.speedMph - target) / 20) : 0), boost: false});
    if (state.stageTimeSec >= attackAt) {
      const rivals = (state.opponents?.length ? state.opponents : [state.rival]).filter(actor => actor && !outOfPlay(duel, actor));
      const nearest = rivals.map(actor => Math.abs(duel.relativeS(actor.s, state.s) - state.s)).sort((a, b) => a - b)[0];
      const fired = nearest != null && nearest < COMBAT_TUNING.cpu.attackRange && attack(duel, child, nearest);
      if (fired) { attacks++; attackAt = state.stageTimeSec + child.nextAttack(fired);
      }
    }
  };
  let frames = 0;
  while (!['stage_result', 'gameover', 'complete'].includes(state.status) && frames++ < 60 * 900) app.advance(1 / 60, 1 / 60);
  const result = {won: state.results?.won === true, status: state.status, sec: Math.round(state.results?.timeSec ?? state.stageTimeSec),
    attacks, lives: state.lives, opponents: state.opponents?.length ?? 1};
  app.dispose?.();
  return result;
}

export {WARLORDS};
