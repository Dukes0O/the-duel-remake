// BOWL-RIVALS: the five rivals, Side by Side and Last Truck Rolling, headless.
// Kyle's rule: Easy must be winnable by a young driver. Every rival finishes
// Side by Side on every level, every Last Truck Rolling ends with a result, and
// a child-pace test driver wins Easy at least 8 times in 10. The Medium and
// Hard win rates are printed for the change note. Memory only: no saves.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {BOWL_NIGHT_RULES, SHOW_TRUCK, bowlHudView, bowlNightPlayable} from '../src/bowl/bowl-night.js';
import {BOWL_RIVALS, BOWL_RIVAL_IDS, BOWL_RIVAL_NIGHTS, BOWL_RIVAL_RULES, lastTruckRivals,
  sideBySideRival} from '../src/bowl/bowl-rivals.js';
import {BIG_MO, BOWL_GOALS, BOWL_RESULTS} from '../src/bowl/bowl-lines.js';
import {SHOW_NIGHTS} from '../src/bowl/bowl-show.js';
import {worldPose} from '../src/arena/arena-floor.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const DT = 1 / 120, LEVELS = ['easy', 'medium', 'hard'], TRIALS = 10;

// A Show Night at one event: the night is started and the earlier events are
// skipped by winning them on paper, so each trial starts at the event itself.
function showAt(night, type, {level = 'easy', seed = 1989, rivals} = {}) {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  assert.ok(duel.startBowlNight({night, cpuDifficulty: level, seed, owned: false, playerId: 'rivals-test', rivals}),
    `night ${night} starts`);
  const index = SHOW_NIGHTS[night - 1].events.indexOf(type);
  const show = duel.state.bowlNight;
  show.show = {...show.show, eventIndex: index};
  show.phase = 'result';
  duel.continueBowlNight();
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
  const s = duel.state, line = BOWL_NIGHT_RULES.sideBySide.lane + offset * .5;
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

// ---- the rivals are data ------------------------------------------------
{
  ok(BOWL_RIVAL_IDS.length === 5 && BOWL_RIVAL_IDS.every(id => BOWL_RIVALS[id].name && BOWL_RIVALS[id].way),
    'there are five rivals, each with a name and a way of driving');
  ok(BOWL_RIVAL_IDS.every(id => LEVELS.every((level, index) => index === 0 ||
    BOWL_RIVALS[id].pace[level] > BOWL_RIVALS[id].pace[LEVELS[index - 1]])), 'each rival is faster on each harder level');
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

// ---- Side by Side: every rival finishes on every level -------------------
for (const id of BOWL_RIVAL_IDS) for (const level of LEVELS) {
  const duel = showAt(1, 'sideBySide', {level, rivals: [id]});
  ok(duel.state.opponents.length === 1 && duel.state.opponents[0].bowlRival === id &&
    duel.state.opponents[0].car === SHOW_TRUCK, `${id} drives the show's truck in Side by Side`);
  const result = race(duel, null, null, BOWL_NIGHT_RULES.sideBySide.timeLimitSec + 2);
  ok(result && !result.won && result.rival === id && result.rivalDoneAt > BOWL_RIVALS[id].startDelaySec &&
    result.rivalDoneAt < BOWL_NIGHT_RULES.sideBySide.timeLimitSec, `${id} finishes Side by Side on ${level}`);
}

// Pace is data: on each level the slowest rival takes longer than the fastest.
{
  const time = (id, level) => race(showAt(1, 'sideBySide', {level, rivals: [id]}), null, null, 62).rivalDoneAt;
  for (const level of LEVELS) ok(time('old-bess', level) > time('dragon-wagon', level), `Old Bess is slower than Dragon Wagon on ${level}`);
  ok(time('rust-rhino', 'easy') > time('rust-rhino', 'medium') && time('rust-rhino', 'medium') > time('rust-rhino', 'hard'),
    'a rival is quicker round on each harder level');
}

// The HUD names the rival, and Big Mo says who is in the other lane.
{
  const duel = showAt(2, 'sideBySide'), captions = [];
  duel.onChange((_, ev) => ev.bowlCaption && captions.push(ev.bowlCaption.id));
  for (let i = 0; i < 120 * 4; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  ok(duel.state.bowlNight.event.rival === 'rust-rhino' && bowlHudView(duel.state).goal ===
    'Race Rust Rhino once round the Bowl and cross the line first.', 'night two\'s Side by Side is against Rust Rhino, named in the goal');
  // Big Mo waits for his earlier lines; the results card stays up while he talks.
  for (let i = 0; i < 120 * 40; i++) { duel.setInput({throttle: 0, brake: 0, steer: 0}); duel.step(DT); }
  const intro = captions.indexOf('event.sideBySide.intro');
  ok(captions.indexOf('rival.rust-rhino') > Math.max(-1, intro), 'Big Mo says who is in the other lane, after naming the event');
}

// ---- Last Truck Rolling: four trucks on the arena's rules -----------------
{
  const duel = showAt(3, 'lastTruckRolling'), s = duel.state, captions = [], knockouts = [];
  duel.onChange((_, ev) => { if (ev.bowlCaption) captions.push(ev.bowlCaption.id); if (ev.bowlKnockout) knockouts.push(ev.bowlKnockout); });
  ok(s.arena?.mode === 'last-car-rolling' && s.bowlNight?.event.type === 'lastTruckRolling', 'Last Truck Rolling runs as the arena\'s fight');
  ok(s.opponents.length === 3 && s.opponents.every(truck => truck.car === SHOW_TRUCK), 'four trucks: the player and three rivals in the show truck');
  ok(new Set(s.arena.participants.map(participant => participant.team)).size === 4, 'every truck is its own team');
  ok(s.arena.participants.slice(1).map(participant => participant.name).join() === 'BIG KETTLE,TIN LIZARD,OLD BESS',
    'the arena calls the rivals by name');
  ok(s.opponents.every((truck, index) => truck.bowlRival === lastTruckRivals({night: 3})[index] &&
    s.arena.participants[index + 1].brain === BOWL_RIVALS[truck.bowlRival].brain), 'each rival drives in their own way');
  ok([s, ...s.opponents].every(truck => truck.maxArmor === BOWL_RIVAL_RULES.lastTruckRolling.showArmor && truck.armor === truck.maxArmor),
    'every truck takes the same knocks, the player\'s too');
  ok(s.weaponLoadout.length === 0 && s.opponents.every(truck => truck.weaponLoadout.length === 0), 'nobody has a weapon in the Bowl');
  ok(bowlHudView(s).goal === 'Knock out Big Kettle, Tin Lizard and Old Bess, and be the last truck still rolling.', 'the goal names every rival');
  const result = race(duel, null, null, BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
  ok(result && result.event === 'lastTruckRolling' && typeof result.won === 'boolean', 'an event with a truck that never moves still ends');
  ok(!result.won && (result.knockedOut || result.timeUp), 'a truck that never moves does not win');
  ok(!s.combat.pickups?.length, 'no crates appear in the Bowl');
  const out = knockouts.map(entry => entry.rival);
  ok(out.every(id => captions.includes(`out.${id}`)) && knockouts.every(entry => entry.cue === 'bowl.mo'),
    'each knock-out between rivals has Big Mo\'s line and chime');
  ok(captions.includes('rivals.night.3'), 'Big Mo says who is in the Bowl tonight');
  // A knocked-out rival stays out: no wreck comes back.
  const night = s.bowlNight;
  ok(night.event.rivals.filter(entry => entry.out).every(entry => s.opponents[night.event.rivals.indexOf(entry)].combatWrecking),
    'a knocked-out truck stays a wreck where it stopped');
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
const rates = {}, playerKnockouts = [];
function winRate(night, type, level) {
  let wins = 0, ended = 0;
  for (let trial = 0; trial < TRIALS; trial++) {
    const seed = 1989 + trial * 101;
    const duel = showAt(night, type, {level, seed});
    duel.onChange((_, ev) => {
      if (ev.bowlKnockout?.by === 'player') playerKnockouts.push({...ev.bowlKnockout, said: duel.state.bowlNight.captionQueue
        .concat(duel.state.bowlNight.caption?.id ?? []).includes(`out.${ev.bowlKnockout.rival}`)});
    });
    const result = race(duel, childDriver(seed), type === 'sideBySide' ? laneAim : chaseAim,
      type === 'sideBySide' ? 62 : BOWL_RIVAL_RULES.lastTruckRolling.timeLimitSec + 5);
    if (result) ended++;
    if (result?.won) wins++;
  }
  ok(ended === TRIALS, `night ${night} ${type} on ${level} always ends`);
  return wins;
}
for (const [night, type] of [[1, 'sideBySide'], [2, 'sideBySide'], [3, 'lastTruckRolling'], [4, 'lastTruckRolling'], [5, 'lastTruckRolling']]) {
  for (const level of LEVELS) {
    rates[`${night}:${type}:${level}`] = winRate(night, type, level);
  }
}
ok(playerKnockouts.length > 0 && playerKnockouts.every(entry => entry.cue === 'arena.wreck-credit' && entry.said),
  'a truck the player knocks out is credited to the player, plays the arena\'s wreck cue and has Big Mo\'s line');
const table = Object.entries(rates).map(([key, wins]) => `${key} ${wins}/${TRIALS}`).join(', ');
console.log(`test-bowl-rivals: child-pace wins: ${table}`);
for (const [key, wins] of Object.entries(rates)) if (key.endsWith(':easy'))
  ok(wins >= 8, `a child-pace driver wins ${key.replace(':easy', '')} on Easy at least 8 in 10 (won ${wins})`);
console.log(`test-bowl-rivals: ${checks} checks passed`);
