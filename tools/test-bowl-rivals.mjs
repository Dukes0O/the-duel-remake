// BOWL-RIVALS: the five rivals, Side by Side and Last Truck Rolling, headless.
// Kyle's rule: Easy must be winnable by a young driver. Measure two laps per
// rival, run a one-wall Easy driver, and check a clean versus wide Hard line.
// Unarmed fight wins are reported; BOWL-WEAPONS measures armed balance.
import assert from 'node:assert/strict';
import {chooseShowWeapon, showTarget, SHOW_WEAPONS} from '../src/bowl/bowl-weapons.js';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {BOWL_NIGHT_RULES, SHOW_TRUCK, bowlHudView, bowlNightPlayable} from '../src/bowl/bowl-night.js';
import {BOWL_RIVALS, BOWL_RIVAL_IDS, BOWL_RIVAL_NIGHTS, BOWL_RIVAL_RULES, lastTruckRivals,
  bowlRivalGapScale, bowlRivalLapTarget, sideBySideLanes, sideBySideRival} from '../src/bowl/bowl-rivals.js';
import {BIG_MO, BOWL_GOALS, BOWL_RESULTS, BOWL_TURN_LINES} from '../src/bowl/bowl-lines.js';
import {beginGo, createTurnShow, currentTurn, passKeyboard, recordGo} from '../src/bowl/bowl-turns.js';
import {createProfile} from '../src/progression.js';
import {SHOW_NIGHTS} from '../src/bowl/bowl-show.js';
import {worldPose} from '../src/arena/arena-floor.js';
import {bowlFightPilotGoal} from '../src/arena/arena-event.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const DT = 1 / 120, LEVELS = ['easy', 'medium', 'hard'], TRIALS = 10;

// A Show Night at one event: the night is started and the earlier events are
// skipped by winning them on paper, so each trial starts at the event itself.
function showAt(night, type, {level = 'easy', seed = 1989, rivals, weapon = 'hammer'} = {}) {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night, cpuDifficulty: level, seed, owned: false, playerId: 'rivals-test', rivals}),
    `night ${night} starts`);
  const index = SHOW_NIGHTS[night - 1].events.indexOf(type);
  const show = duel.state.bowlNight;
  show.show = {...show.show, eventIndex: index};
  show.phase = 'result';
  duel.continueBowlNight();
  if (type === 'lastTruckRolling') assert.ok(chooseShowWeapon(duel, weapon));
  assert.equal(duel.state.bowlNight.event.type, type);
  return duel;
}

// The child-pace driver: a young player who aims roughly, reacts late, wobbles
// on the wheel, drives at a speed they are comfortable with, lifts off now and
// then, never brakes for a turn and never uses boost. Stuck against a wall, they
// back off it and go again. Its randomness is the game's seeded generator.
export const CHILD = Object.freeze({reactionSec: .3, comfortMph: [22, 30], wobble: .3, liftChance: .12, liftSec: .6,
  decisionSec: .5, stuckMetres: 1, stuckSec: 1.5, reverseSec: 1});
function childDriver(seed) {
  const rng = makeRng(seed ^ 0x5eed).float, seen = [];
  const lagSteps = Math.round(CHILD.reactionSec / DT), [slow, fast] = CHILD.comfortMph;
  let comfortMph = slow + rng() * (fast - slow), aimOffset = 0, wobble = 0, liftSec = 0, decisionSec = 0;
  let stuckSec = 0, reverseSec = 0, stuckFrom = null;
  return (duel, aim) => {
    const s = duel.state;
    decisionSec -= DT;
    if (decisionSec <= 0) {
      decisionSec = CHILD.decisionSec;
      aimOffset = (rng() - .5) * 2.4;
      wobble = (rng() - .5) * CHILD.wobble;
      comfortMph = Math.max(slow, Math.min(fast, comfortMph + (rng() - .5) * 4));
      if (rng() < CHILD.liftChance) liftSec = CHILD.liftSec;
    }
    liftSec = Math.max(0, liftSec - DT);
    // The player acts on what they saw a moment ago.
    seen.push(aim(duel, aimOffset));
    const view = seen.length > lagSteps ? seen.shift() : seen[0];
    const racing = s.status === 'racing' && !s.airborne;
    // Stuck: the truck has hardly moved for a while, whatever the pedal says.
    const here = duel.course.worldAt(s.s, s.lateral);
    if (!racing || !stuckFrom || Math.hypot(here.x - stuckFrom.x, here.z - stuckFrom.z) > CHILD.stuckMetres) { stuckFrom = here; stuckSec = 0; }
    else stuckSec += DT;
    if (stuckSec > CHILD.stuckSec) { reverseSec = CHILD.reverseSec; stuckSec = 0; stuckFrom = null; }
    if (reverseSec > 0) {
      reverseSec -= DT;
      duel.setInput({throttle: 0, brake: 1, steer: -Math.sign(view.steer || 1), boost: false});
      return;
    }
    const steer = Math.max(-1, Math.min(1, view.steer + wobble));
    const tooFast = s.speedMph > (view.mph ?? comfortMph);
    duel.setInput({throttle: liftSec > 0 || tooFast ? 0 : 1, brake: 0, steer, boost: false});
  };
}

const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
// Side by Side: keep to the outside lane, roughly.
const laneAim = (duel, offset) => {
  const s = duel.state, line = sideBySideLanes(duel.course).player.lateral + offset * .5;
  return {steer: (s.lateral - line) * .2 + (s.headingError || 0) * 1};
};
// Last Truck Rolling: drive at the nearest truck still rolling and hit it.
const chaseAim = (duel, offset) => {
  const s = duel.state, me = worldPose(duel, s);
  let target = null, best = Infinity;
  s.opponents.forEach(actor => {
    if (actor.combatWrecking) return;
    const at = worldPose(duel, actor), distance = Math.hypot(at.x - me.x, at.z - me.z);
    if (distance < best) { best = distance; target = at; }
  });
  if (!target) return {steer: 0, mph: 0};
  const want = Math.atan2(target.x - me.x + offset, target.z - me.z + offset);
  return {steer: -wrap(want - me.heading) * 2, mph: 45};
};

function hammerDrive(seed) {
  const drive=childDriver(seed);
  return (duel,aim)=>{
    drive(duel,aim);
    const s=duel.state, me=worldPose(duel,s), weapon=s.bowlWeapon;
    if (!weapon || weapon.kind!=='hammer') return;
    const target=s.opponents.some(actor=>{
      if(actor.combatWrecking) return false;
      const at=worldPose(duel,actor), dx=at.x-me.x,dz=at.z-me.z;
      const forward=dx*Math.sin(me.heading)+dz*Math.cos(me.heading);
      const across=dx*Math.cos(me.heading)-dz*Math.sin(me.heading);
      return forward>0 && forward<17 && Math.abs(across)<5;
    });
    duel.setInput({interact:!!target && weapon.phase==='ready' && !weapon.wasHeld});
  };
}

function race(duel, drive, aim, limitSec) {
  const results = [];
  const stop = duel.onChange((_, ev) => { if (ev.bowlEventResult) results.push(ev.bowlEventResult); });
  for (let i = 0; i < limitSec / DT && !results.length; i++) {
    if (drive) drive(duel, aim); else duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    duel.step(DT);
  }
  stop?.();
  return results[0] ?? null;
}

function chaser(seed) {
  const rng = makeRng(seed ^ 0x4146);
  const pace = rng.range(36, 44), response = rng.range(.18, .32);
  let decision = 0, yaw = 0, stuck = 0, reverse = 0, last;
  return duel => {
    if (duel.state.status !== 'racing') return;
    const s = duel.state, me = worldPose(duel, s), weapon = s.bowlWeapon;
    decision -= DT;
    if (decision <= 0) {
      decision = response;
      let nearest = null, minimum = Infinity;
      for (const actor of s.opponents) {
        if (actor.combatWrecking) continue;
        const at = worldPose(duel, actor), metres = Math.hypot(at.x - me.x, at.z - me.z);
        if (metres < minimum) { nearest = at; minimum = metres; }
      }
      yaw = nearest ? Math.atan2(nearest.x - me.x, nearest.z - me.z) : me.heading;
    }
    if (!last || Math.hypot(me.x - last.x, me.z - last.z) > .75 || s.airborne || s.bowlHeldStill > 0) {
      last = me; stuck = 0;
    } else stuck += DT;
    if (reverse <= 0 && stuck > 1.3) { reverse = .75; stuck = 0; }
    const toRival = wrap(yaw - me.heading), steer = Math.max(-1, Math.min(1, -2 * toRival));
    if (reverse > 0) {
      reverse -= DT;
      duel.setInput({throttle: 0, brake: 1, steer: -Math.sign(steer || 1), interact: false, boost: false});
      return;
    }
    const definition = SHOW_WEAPONS[weapon.kind], level = s.bowlNight.cpuDifficulty;
    const reach = level === 'hard' ? definition.hardReach ?? definition.reach : definition.reach;
    const willing = weapon.kind === 'saw' || weapon.phase === 'ready' && !weapon.wasHeld;
    const interact = willing && !!showTarget(duel, s, reach, null, definition.arc);
    duel.setInput({throttle: s.speedMph < pace ? 1 : 0, brake: 0, steer, interact, boost: false});
  };
}

// A careful Saw drive closes the gap, then matches the rival's pace to keep
// the spinning blade in reach. The driver still has to steer and use F.
function sawCareful(seed) {
  const rng = makeRng(seed ^ 0x25b0);
  const cruise = rng.range(34, 38), response = rng.range(.13, .19);
  const definition = SHOW_WEAPONS.saw;
  let wait = 0, turn = 0, pace = cruise;
  let stuck = 0, back = 0, previous;
  return duel => {
    const s = duel.state;
    if (s.status !== 'racing') return;
    const me = worldPose(duel, s);
    wait -= DT;
    if (wait <= 0) {
      wait = response;
      let target = null, distance = Infinity;
      for (const rival of s.opponents) {
        if (rival.combatWrecking) continue;
        const pose = worldPose(duel, rival), gap = Math.hypot(pose.x-me.x, pose.z-me.z);
        if (gap < distance) { target = {pose, rival}; distance = gap; }
      }
      if (!target) return;
      const {pose, rival} = target;
      const lead = Math.max(0, Math.min(4, (distance - 9) * .22));
      const yaw = Math.atan2(pose.x + Math.sin(pose.heading) * lead - me.x, pose.z + Math.cos(pose.heading) * lead - me.z);
      const error = wrap(yaw - me.heading);
      turn = Math.max(-1, Math.min(1, -2.4 * error));
      pace = distance > 11 ? cruise : Math.max(12, Math.min(26, Math.abs(rival.speedMph) + 4));
      if (Math.abs(error) > 1.1) pace = Math.min(pace, 18);
    }
    if (!previous || Math.hypot(me.x-previous.x, me.z-previous.z) > .8 || s.airborne || s.bowlHeldStill > 0) {
      previous = me;
      stuck = 0;
    } else stuck += DT;
    if (back <= 0 && stuck > 1.4) { back = .75; stuck = 0; }
    if (back > 0) {
      back -= DT;
      duel.setInput({throttle: 0, brake: 1, steer: -Math.sign(turn || 1), interact: false, boost: false});
      return;
    }
    const target = showTarget(duel, s, definition.reach, null, definition.arc);
    const brake = s.speedMph > pace + 6 ? .4 : 0;
    duel.setInput({throttle: +(s.speedMph < pace), brake, steer: turn, interact: !!target, boost: false});
  };
}

function carefulWeaponDrive(weapon, seed) {
  if (weapon === 'hammer') return hammerDrive(seed);
  if (weapon === 'saw') return sawCareful(seed);
  const drive = childDriver(seed);
  return (duel, aim) => {
    if (duel.state.status !== 'racing') return;
    drive(duel, aim);
    const s = duel.state, armed = s.bowlWeapon, definition = SHOW_WEAPONS[weapon];
    const willing = weapon === 'saw' || armed.phase === 'ready' && !armed.wasHeld;
    const target = willing && showTarget(duel, s, definition.reach, null, definition.arc);
    duel.setInput({interact: !!target});
  };
}

function checkEasyChasers() {
  const outcomes = [];
  for (const [weapon, night] of [['hammer', 3], ['saw', 4], ['launcher', 5]]) {
    const trials = driver => Array.from({length: TRIALS}, (_, index) => {
      const seed = 1989 + index * 101;
      const duel = showAt(night, 'lastTruckRolling', {seed, weapon});
      const result = race(duel, driver(seed), chaseAim, 130);
      ok(result, weapon + ' fight ends in every seed');
      return {won: result.won, seconds: duel.state.stageTimeSec};
    });
    const chased = trials(chaser);
    const careful = trials(seed => carefulWeaponDrive(weapon, seed));
    const wins = chased.filter(row => row.won).length;
    const longEnough = chased.filter(row => row.seconds + 1e-8 >= 75).length;
    const carefulWins = careful.filter(row => row.won).length;
    console.log(`${weapon} Easy: chaser ${wins}/10 wins, ${longEnough}/10 at or above 75 seconds, careful ${carefulWins}/10 wins.`);
    console.log('Fight times:', chased.map(row => (row.won ? 'W ' : 'L ') + row.seconds.toFixed(1)).join(', '));
    outcomes.push({weapon, wins, longEnough, carefulWins});
  }
  for (const {weapon, wins, longEnough, carefulWins} of outcomes) {
    ok(wins >= 5 && wins <= 7, weapon + ' chaser wins five to seven of ten on Easy');
    ok(longEnough >= 8, weapon + ' gives the chaser at least 75 seconds in eight of ten fights');
    ok(carefulWins >= 6, weapon + ' is still winnable by the careful driver');
  }
}

if (process.argv.includes('--chaser-only')) {
  checkEasyChasers();
  process.exit(0);
}

// ---- the rivals are data ------------------------------------------------
{
  ok(BOWL_RIVAL_IDS.length === 5 && BOWL_RIVAL_IDS.every(id => BOWL_RIVALS[id].name && BOWL_RIVALS[id].way),
    'there are five rivals, each with a name and a way of driving');
  ok(BOWL_RIVAL_IDS.every(id => LEVELS.every((level, index) => index === 0 ||
    bowlRivalLapTarget(id, level) < bowlRivalLapTarget(id, LEVELS[index - 1]))), 'each rival aims for a shorter lap on each harder level');
  const used = new Set(BOWL_RIVAL_NIGHTS.flatMap(night => [night.sideBySide, ...(night.lastTruckRolling ?? [])].filter(Boolean)));
  ok(BOWL_RIVAL_IDS.every(id => used.has(id)), 'every rival drives on at least one night');
  ok(SHOW_NIGHTS.every((night, index) => night.events.includes('sideBySide') ? !!BOWL_RIVAL_NIGHTS[index].sideBySide
    : BOWL_RIVAL_NIGHTS[index].lastTruckRolling?.length === 3), 'each night names its rivals: one, or three for four trucks');
  ok([1, 2, 3, 4, 5].every(bowlNightPlayable), 'every night can be played');
  ok(sideBySideRival({night: 1}) === 'old-bess' && lastTruckRivals({night: 3}).length === 3, 'the nights choose their rivals');
}

// ---- every line is a plain whole sentence --------------------------------
{
  const lines = [...BOWL_RIVAL_IDS.flatMap(id => [BIG_MO[`rival.${id}`], BIG_MO[`out.${id}`], BOWL_RIVALS[id].way]),
    ...[3, 4, 5].map(night => BIG_MO[`rivals.night.${night}`]),
    BOWL_GOALS.sideBySide('Old Bess'), BOWL_GOALS.lastTruckRolling(['Big Kettle', 'Tin Lizard', 'Old Bess']),
    BOWL_GOALS.lastTruckRolling(['Tin Lizard']), BOWL_GOALS.lastTruckRolling([]),
    BOWL_RESULTS.eventRace(true, 'Old Bess'), BOWL_RESULTS.eventRace(false, 'Old Bess'), BOWL_RESULTS.eventRace(false),
    ...[{won: true}, {won: true, timeUp: true}, {won: false, timeUp: true}, {won: false, knockouts: 0},
      {won: false, knockouts: 1}, {won: false, knockouts: 2}].map(BOWL_RESULTS.eventKnockouts)];
  ok(lines.every(line => typeof line === 'string' && /^[A-Z]/.test(line) && /[.!?]$/.test(line) && !/[—–]/.test(line) &&
    !/undefined|NaN/.test(line)), 'every rival line starts with a capital, ends a sentence and has no dash');
  ok(BOWL_RESULTS.eventKnockouts({won: false, knockouts: 2}) === 'You knocked out two trucks before your own truck was knocked out.',
    'a count of trucks is said as a word');
  ok(BOWL_GOALS.lastTruckRolling(['Big Kettle', 'Tin Lizard', 'Old Bess']) ===
    'Knock out Big Kettle, Tin Lizard and Old Bess, and be the last truck still rolling.', 'the goal names the trucks still rolling');
  ok(BIG_MO['rivals.night.3'].includes('Big Kettle, Tin Lizard and Old Bess') &&
    [4, 5].every(night => lastTruckRivals({night}).every(id => BIG_MO[`rivals.night.${night}`].includes(BOWL_RIVALS[id].name))),
  'Big Mo names the night\'s own rivals');
}

// The lanes come from the course's own data (course.features.bowl.lanes), so the
// rebuilt Bowl (BOWL-EXPAND) and any later floor move them.
{
  const duel = showAt(1, 'sideBySide'), lanes = sideBySideLanes(duel.course), course = duel.course;
  const named = course.features.bowl.lanes;
  ok(lanes.player.s === named[0].s && lanes.player.lateral === named[0].lateral &&
    lanes.rival.s === named[1].s && lanes.rival.lateral === named[1].lateral, 'the player and the rival take the course\'s two lanes');
  ok(lanes.player.finishS === named[0].s + 2 * course.length && lanes.rival.finishS === named[1].s + 2 * course.length,
    'each truck drives two full laps from its own start');
  ok(bowlRivalLapTarget('old-bess', 'easy') === 19.7 * 1.45, 'Old Bess gets the longer Easy lap allowance');
  ok(bowlRivalLapTarget('dragon-wagon', 'hard') === 19.7 * .97, 'Dragon Wagon aims below the reference');
  ok(bowlRivalGapScale(25, 'easy') === 1 && bowlRivalGapScale(90, 'easy') === .85 &&
    bowlRivalGapScale(-90, 'medium') === 1.08 && bowlRivalGapScale(90, 'hard') === 1,
    'catch-up starts beyond 25 metres and never runs on Hard');
  ok(duel.state.s === lanes.player.s && duel.state.lateral === lanes.player.lateral &&
    duel.state.opponents[0].s === lanes.rival.s && duel.state.opponents[0].lateral === lanes.rival.lateral,
  'the player and the rival start on their lanes');
  const floor = extra => ({length: 300, features: {crushables: [], ramps: [], ...extra}, def: {scrapdome: {floorHalfWidth: 12}}});
  const other = sideBySideLanes(floor({bowl: {lanes: [{s: 10, lateral: 4}, {s: 160, lateral: -4}]}}));
  ok(other.player.s === 10 && other.player.lateral === 4 && other.rival.s === 160 && other.rival.lateral === -4 &&
    other.rival.finishS === 760, 'lanes another floor names are used as they are');
}

// With equivalent race progress, measure two actual laps without triggering catch-up.
function neutralRace(id, level, skipFlip = false) {
  const duel = showAt(1, 'sideBySide', {level, rivals: [id]});
  const state = duel.state, rival = state.opponents[0], event = state.bowlNight.event;
  const lanes = sideBySideLanes(duel.course);
  if (skipFlip) event.dragonFlipped = true;
  for (let step = 0; step < 80 / DT && event.rivalDoneAt == null; step++) {
    state.s = state.prevS = lanes.player.s + rival.s - lanes.rival.s - 10;
    state.lateral = state.prevLateral = -14;
    state.speedMph = 0;
    duel.step(DT);
  }
  return event;
}

for (const id of BOWL_RIVAL_IDS) for (const level of LEVELS) {
  const event = neutralRace(id, level), target = bowlRivalLapTarget(id, level) * 2;
  ok(event.rivalDoneAt != null && Math.abs(event.rivalDoneAt - target) / target <= .05,
    `${id} on ${level} finishes within five percent of ${target.toFixed(2)} seconds (got ${event.rivalDoneAt?.toFixed(2)})`);
  if (id === 'rust-rhino') ok(event.rhinoTouched, `Rust Rhino brushes the wall on ${level}`);
  if (id === 'dragon-wagon') {
    const skipped = neutralRace(id, level, true);
    const lost = event.rivalDoneAt - skipped.rivalDoneAt;
    ok(event.dragonFlipped && Math.abs(lost - .5) < .08, `Dragon Wagon's flip costs about half a second on ${level} (got ${lost.toFixed(3)})`);
  }
}

// ---- Side by Side: every rival finishes on every level -------------------
// The player waits beside the rival's line, so a rival that comes round to the
// player's start is not held up behind a truck that never moves.
function idleBesideLane(duel) {
  const s = duel.state, lane = sideBySideLanes(duel.course).rival.lateral;
  const half = duel.course.def.scrapdome?.floorHalfWidth ?? 6;
  const side = Math.min(half - 2, Math.abs(lane) + 5) * (lane > 0 ? -1 : 1);
  if (Math.abs(s.lateral - lane) < 3) s.lateral = s.prevLateral = side;
  return duel;
}
for (const id of BOWL_RIVAL_IDS) for (const level of LEVELS) {
  const duel = idleBesideLane(showAt(1, 'sideBySide', {level, rivals: [id]}));
  ok(duel.state.opponents.length === 1 && duel.state.opponents[0].bowlRival === id &&
    duel.state.opponents[0].car === SHOW_TRUCK, `${id} drives the show's truck in Side by Side`);
  const result = race(duel, null, null, BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 2);
  ok(result && !result.won && result.rival === id && result.rivalDoneAt > BOWL_RIVALS[id].startDelaySec &&
    result.rivalDoneAt < BOWL_NIGHT_RULES.sideBySide.timeLimitSec, `${id} finishes Side by Side on ${level}`);
}

// Pace is data: on each level the slowest rival takes longer than the fastest.
{
  const time = (id, level) => race(idleBesideLane(showAt(1, 'sideBySide', {level, rivals: [id]})),
    null, null, BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 5).rivalDoneAt;
  for (const level of LEVELS) ok(time('old-bess', level) > time('dragon-wagon', level), `Old Bess is slower than Dragon Wagon on ${level}`);
  ok(time('rust-rhino', 'easy') > time('rust-rhino', 'medium') && time('rust-rhino', 'medium') > time('rust-rhino', 'hard'),
    'a rival is quicker round on each harder level');
}

// Two trucks can cross in one fixed step. The earlier physical crossing wins.
{
  const duel = showAt(1, 'sideBySide', {level: 'hard', rivals: ['dragon-wagon']});
  const state = duel.state, rival = state.opponents[0], event = state.bowlNight.event;
  state.status = 'racing';
  state.stageTimeSec = event.lastRaceTime = 35;
  state.s = state.prevS = event.finishS.player - .106;
  rival.s = rival.prevS = event.finishS.rival - .008;
  state.speedMph = rival.speedMph = 40;
  const result = race(duel, null, null, .025);
  ok(result && !result.won && result.rivalDoneAt < result.playerDoneAt,
    'the rival crosses first even when both trucks finish inside one physics step');
  ok(event.finishWinner === 'rival', 'the finish gate marks the actual first truck');
}

// The HUD names the rival, and Big Mo says who is in the other lane.
{
  const duel = showAt(2, 'sideBySide'), captions = [];
  duel.onChange((_, ev) => ev.bowlCaption && captions.push(ev.bowlCaption.id));
  for (let i = 0; i < 120 * 4; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  ok(duel.state.bowlNight.event.rival === 'rust-rhino' && bowlHudView(duel.state, duel.course).goal ===
    'Beat Rust Rhino over two laps.', 'night two names Rust Rhino and the two laps in the goal');
  // Big Mo waits for his earlier lines; the results card stays up while he talks.
  for (let i = 0; i < 120 * 40; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  ok([duel.state, ...duel.state.opponents].every(truck => Object.values(truck.damageZones).every(value => value === 0)),
    'the player and Rust Rhino finish Side by Side with every zone undamaged');
  const intro = captions.indexOf('event.sideBySide.intro');
  ok(captions.indexOf('rival.rust-rhino') > Math.max(-1, intro), 'Big Mo says who is in the other lane, after naming the event');
}

// A wounded rival can break away for a moment, then has to re-engage.
{
  const duel = showAt(3, 'lastTruckRolling', {level: 'medium'}), state = duel.state, rival = state.opponents[0];
  const participant = state.arena.participants[1];
  participant.targetId = 'player';
  const from = worldPose(duel, rival), target = worldPose(duel, state);
  const away = {x: 2 * from.x - target.x, z: 2 * from.z - target.z, speedMph: 24, boost: false};
  const first = bowlFightPilotGoal(duel, rival, participant, away, 1);
  assert.deepEqual([first.x, first.z, first.speedMph], [away.x, away.z, 30]);
  const afterTwo = bowlFightPilotGoal(duel, rival, participant, away, 1);
  assert.deepEqual([afterTwo.x, afterTwo.z], [target.x, target.z]);
  checks += 2;
}


{
  const duel = showAt(3, 'lastTruckRolling');
  const state = duel.state;
  const [lead, firstJoin, lastJoin] = state.opponents;
  for (let tick = 0; tick < 10 / DT; tick++) duel.step(DT);
  ok(state.status === 'racing', 'the Easy fight starts before the circling trucks join');
  ok(state.arena.participants.slice(2).every(participant => participant.targetId === null),
    'circling rivals do not reserve a target or use the Easy pursuit slot');
  ok(!lead.bowlFightDrive.opening, 'one Easy rival takes up pursuit as soon as the fight starts');
  const normalGoal = {...worldPose(duel, state), speedMph: 24, boost: false};
  const leadPilot = bowlFightPilotGoal(duel, lead, state.arena.participants[1], normalGoal, DT);
  ok(leadPilot.speedMph === BOWL_RIVAL_RULES.lastTruckRolling.pace.minimum, 'the Easy lead rival keeps its ordinary fight pace');
  ok(firstJoin.bowlFightDrive.opening.joinsAt < lastJoin.bowlFightDrive.opening.joinsAt,
    'the other two Easy rivals join the fight at different times');
  for (const [index, rival] of state.opponents.entries()) {
    const {opening} = rival.bowlFightDrive;
    if (!opening) continue;
    const participant = state.arena.participants[index + 1];
    participant.targetId = 'player';
    const goal = {...worldPose(duel, state), speedMph: 40, boost: false};
    state.stageTimeSec = opening.joinsAt - DT;
    const followingLane = bowlFightPilotGoal(duel, rival, participant, goal, DT);
    ok(followingLane.x !== goal.x || followingLane.z !== goal.z, 'an Easy rival circles before it starts pursuit');
    ok(followingLane.speedMph === opening.speedMph, 'a waiting rival keeps moving at its Easy opening pace');
    state.stageTimeSec = opening.joinsAt;
    const joining = bowlFightPilotGoal(duel, rival, participant, goal, DT);
    assert.deepEqual(joining, goal, 'at its opening time the rival follows the normal fight goal');
    checks++;
  }
}

{
  const clockResult = (level, playerHealth, rivalHealth, playerDamage, rivalDamage) => {
    const duel = showAt(3, 'lastTruckRolling', {level}), state = duel.state;
    for (let tick = 0; state.status !== 'racing' && tick < 6 / DT; tick++) duel.step(DT);
    ok(state.status === 'racing', 'the show clock test starts the fight');
    state.stageTimeSec = BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec;
    state.armor = playerHealth;
    state.arena.participants[0].damageDealt = playerDamage;
    for (const [index, truck] of state.opponents.entries()) {
      truck.armor = index === 2 ? 60 : rivalHealth;
      state.arena.participants[index + 1].damageDealt = rivalDamage;
    }
    // A wreck stops competing, even if its old armor entry is higher.
    state.opponents[2].combatWrecking = true;
    state.bowlNight.event.rivals[2].out = true;
    const result = race(duel, null, null, DT);
    ok(result?.timeUp === true, level + ' ends at the show clock');
    return result;
  };
  const tie = clockResult('easy', 30, 30, 0, 100);
  ok(tie.won && tie.decidedBy === 'health', 'on Easy, a tie on remaining health goes to the player');
  const loss = clockResult('easy', 29, 30, 100, 1);
  ok(!loss.won, 'on Easy, a sound rival with more health wins even if the player hit harder');
  ok(BOWL_RESULTS.eventKnockouts(tie).includes('no truck still rolling had more health'),
    'the Solo Show explains the Easy clock win');
  ok(BOWL_RESULTS.eventKnockouts(loss).includes('another truck still rolling had more health'),
    'the Solo Show explains the Easy clock loss');
  for (const level of ['medium', 'hard']) {
    const result = clockResult(level, 29, 30, 100, 1);
    ok(result.won && result.decidedBy !== 'health', level + ' still awards the clock to the truck that did more damage');
  }
}

{
  const duel = showAt(3, 'lastTruckRolling'), s = duel.state;
  const result = race(duel, null, null, BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
  ok(result?.timeUp && result.decidedBy === 'health', 'the seeded idle Easy fight reaches the health decision');
  ok(result.won === s.opponents.every(truck => truck.combatWrecking || s.armor >= truck.armor),
    'Easy applies remaining health even when the player gives no input');
  ok(result.score === 0 && result.knockouts === 0, 'the idle Easy result earns no score or knockout credit');
}

// ---- Last Truck Rolling: four trucks on the arena's rules -----------------
{
  const duel = showAt(3, 'lastTruckRolling', {level: 'medium'});
  const s = duel.state, captions = [], knockouts = [], shots = [];
  duel.onChange((_, ev) => { if (ev.bowlCaption) captions.push(ev.bowlCaption.id); if (ev.bowlKnockout) knockouts.push(ev.bowlKnockout);
    if (ev.weaponFired) shots.push(ev); });
  ok(s.arena?.mode === 'last-car-rolling' && s.bowlNight?.event.type === 'lastTruckRolling', 'Last Truck Rolling runs as the arena\'s fight');
  ok(s.opponents.length === 3 && s.opponents.every(truck => truck.car === SHOW_TRUCK), 'four trucks: the player and three rivals in the show truck');
  ok(new Set(s.arena.participants.map(participant => participant.team)).size === 4, 'every truck is its own team');
  ok(s.arena.participants.slice(1).map(participant => participant.name).join() === 'BIG KETTLE,TIN LIZARD,OLD BESS',
    'the arena calls the rivals by name');
  ok(s.opponents.every((truck, index) => truck.bowlRival === lastTruckRivals({night: 3})[index] &&
    s.arena.participants[index + 1].brain === BOWL_RIVALS[truck.bowlRival].brain), 'each rival drives in their own way');
  ok([s, ...s.opponents].every(truck => truck.maxArmor === BOWL_RIVAL_RULES.lastTruckRolling.showArmor && truck.armor === truck.maxArmor),
    'every truck takes the same knocks, the player\'s too');
  assert.equal(s.bowlWeapon.kind,'hammer');
  assert.deepEqual(s.opponents.map(truck=>truck.bowlWeapon.kind),['hammer','saw','launcher']);
  ok(s.weaponLoadout.length === 0 && s.opponents.every(truck => truck.weaponLoadout.length === 0), 'the normal arena weapon loadouts stay empty');
  ok(bowlHudView(s, duel.course).goal === 'Knock out Big Kettle, Tin Lizard and Old Bess, and be the last truck still rolling.', 'the goal names every rival');
  for (let i = 0; i < 120 * 4; i++) duel.step(DT);
  ok(s.status === 'racing' && ['ufo', 'bomb', 'crossbow', 'star', 'shield'].every(weapon => duel.fireWeapon(weapon) === false),
    'the fight cannot fire the default arena weapons');
  const result = race(duel, null, null, BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
  ok(shots.length === 0, 'no ordinary arena projectile is fired in the whole event');
  ok(result && result.event === 'lastTruckRolling' && typeof result.won === 'boolean', 'an event with a truck that never moves still ends');
  ok(!result.won && (result.knockedOut || result.timeUp), 'an idle truck still loses on Medium');
  ok(!s.combat.pickups?.length, 'no crates appear in the Bowl');
  const out = knockouts.map(entry => entry.rival);
  ok(out.every(id => captions.includes(`out.${id}`)) && knockouts.every(entry => entry.cue === 'bowl.knockout'),
    'each knock-out between rivals has Big Mo\'s line and the Bowl knockout cue');
  ok(captions.includes('rivals.night.3'), 'Big Mo says who is in the Bowl tonight');
  // A knocked-out rival stays out: no wreck comes back.
  const night = s.bowlNight;
  ok(night.event.rivals.filter(entry => entry.out).every(entry => s.opponents[night.event.rivals.indexOf(entry)].combatWrecking),
    'a knocked-out truck stays a wreck where it stopped');
}

// A Turn Show go (BOWL-TURNS) is a one-event night: Side by Side races the
// night's named rival and Last Truck Rolling is the arena's fight, and each
// go's record keeps who was raced and how the fight ended.
{
  const go = (night, eventIndex) => {
    const duel = new Duel({seed: 1989});
    duel.featureFlags = {enabled: name => name === 'titan-bowl'};
    ok(duel.startBowlNight({night, eventIndex, turn: {driver: 'Gratian'}, cpuDifficulty: 'easy', seed: 1989, playerId: 'p1'}),
      `a Turn Show go at night ${night}'s last event starts`);
    if (duel.state.status === 'bowl_weapon_pick') assert.ok(chooseShowWeapon(duel, 'hammer'));
    return duel;
  };
  const side = go(1, 2);
  ok(side.state.bowlNight.event.type === 'sideBySide' && side.state.opponents[0]?.bowlRival === 'old-bess',
    'a Turn Show go at Side by Side races Old Bess');
  const sideResult = race(side, null, null, BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 5);
  ok(side.state.bowlNight.phase === 'turn' && sideResult.rival === 'old-bess', 'the go ends as a turn and names the rival');
  const truck = go(3, 2);
  ok(truck.state.bowlNight.event.type === 'lastTruckRolling' && truck.state.arena?.mode === 'last-car-rolling' &&
    truck.state.opponents.length === 3 && truck.state.bowlNight.turn?.driver === 'Gratian',
  'a Turn Show go at Last Truck Rolling is the arena\'s fight with four trucks, and keeps its driver');
  const truckResult = race(truck, null, null, BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
  ok(truck.state.bowlNight.phase === 'turn' && Number.isSafeInteger(truckResult.knockouts), 'the fight ends as a turn with its knock-outs');
  const players = [{id: 'p1', name: 'Gratian', profile: {...createProfile(), bowl: {nightsWon: [1, 2]}}},
    {id: 'p2', name: 'Kyle', profile: {...createProfile(), bowl: {nightsWon: [1, 2]}}}];
  const recordEventGo = (night, event, result, cpuDifficulty = 'medium') => {
    let show = createTurnShow({night, players, cpuDifficulty}).show;
    while (currentTurn(show) && currentTurn(show).event !== event) {
      const turn = currentTurn(show);
      const blank = {playerId: turn.playerId, event: turn.event, eventIndex: turn.eventIndex, score: 0};
      show = passKeyboard(recordGo(beginGo(show).show, blank).show).show;
    }
    const turn = currentTurn(show);
    ok(turn?.event === event, 'the Turn Show reaches ' + event);
    return recordGo(beginGo(show).show, {...result, playerId: turn.playerId, event: turn.event, eventIndex: turn.eventIndex});
  };
  const recorded = recordEventGo(1, 'sideBySide', sideResult);
  ok(recorded.ok && recorded.go.rival === 'old-bess' && BOWL_TURN_LINES.goRace('Gratian', recorded.go.won, BOWL_RIVALS[recorded.go.rival].name)
    .includes('Old Bess'), 'the card between goes names the rival');
  const clockWin = {won: true, score: 0, timeUp: true, decidedBy: 'health'};
  const clockGo = recordEventGo(3, 'lastTruckRolling', clockWin, 'easy');
  ok(recordEventGo(3, 'lastTruckRolling', clockWin, 'medium').go.decidedBy === undefined,
    'a Medium Turn Show does not record the Easy clock reason');
  ok(recordEventGo(1, 'sideBySide', clockWin, 'easy').go.decidedBy === undefined,
    'another Easy event does not record the Last Truck Rolling clock reason');
  ok(clockGo.ok && clockGo.go.decidedBy === 'health' &&
    BOWL_TURN_LINES.goKnockouts('Gratian', clockGo.go).includes("no truck still rolling had more health than Gratian's"),
    'the Turn Show carries the Easy clock reason to the card between goes');
  ok(BOWL_TURN_LINES.goKnockouts('Kyle', {won: false, knockouts: 2}) === 'Kyle knocked out two trucks before their own truck was knocked out.',
    'the card between goes says how a go at Last Truck Rolling ended');
}

// Repeatable from seed and inputs: the same trial twice gives the same result.
{
  const once = () => {
    const duel = showAt(4, 'lastTruckRolling', {level: 'medium', seed: 77});
    const result = race(duel, childDriver(77), chaseAim, 160);
    return JSON.stringify([result, duel.state.opponents.map(truck => [truck.s.toFixed(4), truck.lateral.toFixed(4), truck.armor])]);
  };
  ok(once() === once(), 'Last Truck Rolling is the same from the same seed and inputs');
}

// ---- Kyle's rule: Easy is winnable by a young driver ---------------------
// Drive a real scoring hit into a weakened truck. Credit, the sound and the
// spoken line are event rules and must hold regardless of the child's win rate.
{
  const duel = showAt(3, 'lastTruckRolling'), player = duel.state, victim = player.opponents[0];
  for (let tick = 0; tick < 120 * 4; tick++) duel.step(DT);
  Object.assign(player, {s: 34, prevS: 25, lateral: 0, prevLateral: 0, speedMph: 35, headingError: 0, pushVelocity: 0});
  Object.assign(victim, {s: 35, prevS: 35, lateral: 0, prevLateral: 0, speedMph: 0, headingError: 0, pushVelocity: 0, armor: 1});
  const events = [];
  duel.onChange((_, ev) => { if (ev.bowlKnockout) events.push(ev.bowlKnockout); });
  player.arena.participants[1].targetId = 'player';
  duel._vehicleContact(player, victim, 'rival');
  for (let tick = 0; tick < 120 && !events.length; tick++) duel.step(DT);
  ok(player.arena.participants[1].targetId === null, 'an Easy wreck gives up its pursuit slot');
  const night = player.bowlNight, rival = victim.bowlRival;
  assert.deepEqual(events, [{rival, by: 'player', cue: 'bowl.knockout'}]);
  ok(night.event.knockouts === 1 && night.event.rivals[0].by === 'player' && night.event.rivals[0].out,
    'the scoring collision credits exactly one player knockout');
  ok(night.caption?.id === 'out.' + rival || night.captionQueue.some(line => line.id === 'out.' + rival),
    'Big Mo names the knocked-out rival');
}
const rates = {};
const outcomes = {};
function winRate(night, type, level) {
  let wins = 0, ended = 0;
  const rows = outcomes[`${night}:${level}`] = [];
  for (let trial = 0; trial < TRIALS; trial++) {
    const seed = 1989 + trial * 101;
    const duel = showAt(night, type, {level, seed});
    const belowFive = new Map();
    let longestStop = 0;
    const drive = type === 'lastTruckRolling' ? hammerDrive(seed) : childDriver(seed);
    const result = race(duel, (game, aim) => {
      drive(game, aim);
      if (type !== 'lastTruckRolling' || game.state.status !== 'racing') return;
      for (const truck of game.state.opponents) {
        const sound = !truck.combatWrecking && truck.armor >= truck.maxArmor * .4 &&
          !truck.bowlFlight && !truck.bowlRighting && !(truck.bowlHeldStill > 0);
        const seconds = sound && Math.abs(truck.speedMph) < 5 ? (belowFive.get(truck) ?? 0) + DT : 0;
        belowFive.set(truck, seconds);
        longestStop = Math.max(longestStop, seconds);
      }
    }, type === 'sideBySide' ? laneAim : chaseAim,
    type === 'sideBySide' ? BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 5 : BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
    if (type === 'lastTruckRolling') ok(longestStop <= 1, `night ${night} ${level}: a sound rival stays moving (seed ${seed}, ${longestStop.toFixed(2)} s below 5 mph)`);
    if (result) ended++;
    if (result?.won) wins++;
    if (type === 'lastTruckRolling' && result) {
      const out = duel.state.bowlNight.event.rivals.filter(entry => entry.out);
      rows.push({won: result.won, how: result.won && !result.timeUp ? 'all out' : result.timeUp ? 'clock' : 'player out',
        knockouts: out.length, byPlayer: out.filter(entry => entry.by === 'player').length, at: Math.round(duel.state.stageTimeSec)});
    }
  }
  ok(ended === TRIALS, `night ${night} ${type} on ${level} always ends`);
  return wins;
}
for (const [night, type] of [[1, 'sideBySide'], [2, 'sideBySide'], [3, 'lastTruckRolling'], [4, 'lastTruckRolling'], [5, 'lastTruckRolling']]) {
  for (const level of LEVELS) {
    rates[`${night}:${type}:${level}`] = winRate(night, type, level);
  }
}
// Last Truck Rolling, trial by trial: won or lost, how it ended, trucks knocked out (by the player) and when.
for (const [key, rows] of Object.entries(outcomes)) if (rows.length)
  console.log(`test-bowl-rivals: night ${key} Last Truck Rolling: ${rows.map(row =>
    `${row.won ? 'W' : 'L'} ${row.how} ${row.knockouts}(${row.byPlayer}) ${row.at}s`).join(', ')}`);
// The Easy gate below counts valid clock wins as well as knockout wins.
// The scoring collision above independently checks who gets knockout credit.
ok(outcomes['3:hard'].every(row=>!row.won),'the Hard driver who never dodges a tell loses');
const table = Object.entries(rates).map(([key, wins]) => `${key} ${wins}/${TRIALS}`).join(', ');
console.log(`test-bowl-rivals: child-pace wins: ${table}`);
function runLaneTrial(night, seed, {level = 'easy', wide = false} = {}) {
  const duel = showAt(night, 'sideBySide', {level, seed, rivals: level === 'hard' ? ['dragon-wagon'] : undefined});
  const state = duel.state, rng = makeRng(seed ^ 0x8e7);
  const easyPace = rng.range(26.55, 26.85), moveWideAt = rng.range(.93, 1.08), sway = rng.range(-.25, .25);
  let walls = 0, markedWinner = null;
  duel.onChange((_, ev) => {
    if (ev.bowlWall && Math.abs(state.lateral) >= 13) walls++;
    if (ev.bowlRaceCue === 'bowl.race.finish') markedWinner = ev.bowlRaceWinner;
  });
  const drive = game => {
    const s = game.state, t = s.stageTimeSec;
    const drift = level === 'easy' && t > moveWideAt && t < 11 && walls === 0;
    const approachingBend = [3, 9, 16].some(lead => Math.abs(duel.course.at(s.s + lead).curvature) > .025);
    const cap = level === 'easy' ? easyPace : approachingBend ? 36 : 49;
    const line = drift ? 25 : wide && s.s > 42 && s.s < 133 ? 14 : level === 'easy' ? .4 * Math.sin(t * 1.3 + sway) : 0;
    const steer = Math.max(-1, Math.min(1, (s.lateral - line) * .28 + (s.headingError || 0) * 1.8));
    // Lifting the keys during a jump avoids accidentally attempting a flip.
    duel.setInput(s.airborne ? {throttle: 0, brake: 0, steer: 0, boost: false}
      : {throttle: +(s.speedMph < cap), brake: +(level === 'hard' && s.speedMph > cap + 2), steer, boost: false});
  };
  return {result: race(duel, drive, null, BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 5),
    get walls() { return walls; }, get markedWinner() { return markedWinner; }, event: state.bowlNight.event};
}

for (const night of [1, 2]) {
  const headToHead = Array.from({length: TRIALS}, (_, index) => runLaneTrial(night, 1989 + index * 101));
  const closeWins = headToHead.filter(({walls, result, markedWinner}) => walls === 1 &&
    result?.won && markedWinner === 'player' && Number.isFinite(result.rivalDoneAt) &&
    result.rivalDoneAt - result.playerDoneAt < 6);
  ok(closeWins.length >= 9, `night ${night}: a child who clips one wall wins narrowly in ${closeWins.length} of 10 seeds`);
  console.log(`test-bowl-rivals: night ${night} one-wall Easy close wins: ${closeWins.length}/${TRIALS}`);
}
{
  const clean = runLaneTrial(1, 1989, {level: 'hard'});
  const wide = runLaneTrial(1, 1989, {level: 'hard', wide: true});
  ok(clean.walls === 0 && clean.result?.won, 'the clean line can beat Dragon Wagon');
  ok(wide.walls === 0 && !wide.result?.won && wide.markedWinner === 'rival',
    'taking a turn wide costs the clean driver the race against Dragon Wagon');
  ok(wide.event.dragonFlipped, 'Dragon Wagon flips on the last kicker');
}
checkEasyChasers();
console.log(`test-bowl-rivals: ${checks} checks passed`);
