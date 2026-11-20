// BOWL-REX-FIGHT: night five's Scrapasaurus, headless. The rules are checked
// without driving (three landings end it, fire never comes without its tell and
// only goes where the tell showed); then one child-pace test driver plays the
// fight on the real Duel on each level. Easy must be won at least 8 times in 10;
// Medium and Hard are reported. Memory-only: nothing here touches a save.
import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {SHOW_NIGHTS, BOWL_EVENTS} from '../src/bowl/bowl-show.js';
import {bowlHudView, bowlNightPlayable, settleShowNight} from '../src/bowl/bowl-night.js';
import {REX_CUES, REX_EVENT, REX_RULES, REX_TROPHY, createRexFight, rexBoxS, rexFightOf,
  rexInTheYard, rexPlaces, stepRexFight} from '../src/bowl/bowl-rex.js';
import {BIG_MO, BOWL_EVENT_NAMES, BOWL_GOALS, BOWL_RESULTS, BOWL_SOUND_CUES} from '../src/bowl/bowl-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createProfile} from '../src/progression.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const DT = 1 / 120;
const showDuel = seed => {
  const duel = new Duel({seed});
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  return duel;
};
// The Bowl as Show Night loads it.
const course = (() => { const duel = showDuel(1); assert.ok(duel.startBowlNight({night: 1})); return duel.course; })();
const L = course.length;
const wrap = value => ((value % L) + L) % L;
const along = (a, b) => wrap(a - b + L / 2) - L / 2;
// Every place in the fight comes from the course's data.
const P = rexPlaces(course);

// ---- night five ----------------------------------------------------------
{
  ok(P.stageBoxS > P.rampEnd && P.stageBoxS - P.rampEnd < 8 && P.rail < 0 && P.rail > -P.edge,
    'the rails, the rest and the reach come from the course: the open box just past the big ramp, the rails on the floor');
  ok(SHOW_NIGHTS[4].events.at(-1) === BOWL_EVENTS.SCRAPASAURUS && SHOW_NIGHTS[4].events.length === 3,
    'night five is three events and ends with the Scrapasaurus');
  ok(SHOW_NIGHTS.slice(0, 4).every(night => !night.events.includes(REX_EVENT)), 'only night five has the Scrapasaurus');
  ok(bowlNightPlayable(5), 'night five has every event');
  ok(BOWL_EVENT_NAMES[REX_EVENT] === 'The Scrapasaurus', 'the event has its name');
}

// ---- the rules, without driving ---------------------------------------------
// A truck that sits still far from the Rex's path, and a scripted truck that the
// rules see at chosen places. Each step returns events; nothing else is read.
function runRules(level, truckAt, seconds = 400, dt = DT) {
  const fight = createRexFight({difficulty: level, course}), log = [];
  for (let t = 0; t < seconds && !fight.done; t += dt) {
    const truck = truckAt(fight, t);
    for (const event of stepRexFight(fight, truck, dt, course)) log.push({...event, t, phase: fight.phase,
      truck: {...truck}});
  }
  return {fight, log};
}
// A truck that keeps behind its tail on the stands' side, out of every cone, and
// steps away from the ring when a junk car is in the air.
const parked = fight => ({s: wrap(fight.s + (fight.phase === 'throw' ? 40 : 25)), lateral: P.edge - 1,
  airborne: false, airHeight: 0, speedMph: 0});
// A truck that is over the open box in the air whenever a box is open, and keeps away otherwise.
const lander = fight => fight.phase === 'rest'
  ? {s: rexBoxS(fight, fight.boxes.indexOf(false)), lateral: P.rail + .5, airborne: true, airHeight: 2.4, speedMph: 32}
  : parked(fight);

{
  const {fight, log} = runRules('easy', lander);
  const smashes = log.filter(event => event.type === 'smash');
  ok(fight.done?.won === true && fight.done.reason === 'fallen', 'three landings on the open boxes bring it down');
  ok(smashes.length === 3 && smashes.map(event => event.box).join() === '0,1,2', 'each landing smashes the next box, one to three');
  ok(log.filter(event => event.type === 'fall').length === 1 && log.at(-1).type !== 'smash', 'it falls once, after the third');
  ok(smashes.every(event => Math.abs(along(event.truck.s, P.stageBoxS)) < 1e-6),
    'every open box is at the same resting place, just past the big ramp');
  // Two landings are not enough, and a landing with the box shut does nothing.
  const twice = runRules('easy', f => f.phase === 'rest' && f.boxes.filter(Boolean).length < 2 ? lander(f) : parked(f));
  const landed = twice.log.filter(event => event.type === 'smash').length;
  ok(landed === 2 && twice.fight.done?.won === false && twice.fight.done.reason === 'gate',
    'two landings do not stop it, and after its last rest it walks out of the gate');
  const shut = runRules('easy', f => f.phase === 'walk' && Math.abs(along(f.s, P.startS)) > 30
    ? {s: f.s, lateral: P.rail, airborne: true, airHeight: 2.4, speedMph: 30} : parked(f), 120);
  ok(!shut.log.some(event => event.type === 'smash'), 'a truck over its back while it walks smashes nothing');
}

{
  // Fire: every breath has its tell first, as long as the level says, and the
  // cone it fills is the one the tell drew. A truck parked in the stage's cone
  // is scorched by every stage breath and by nothing else.
  for (const level of ['easy', 'medium', 'hard']) {
    for (const truckAt of [parked, lander, () => ({s: P.rampStart + 5, lateral: P.rail, airborne: false, airHeight: 0, speedMph: 0})]) {
      const {log} = runRules(level, truckAt, 300);
      let tell = null, fires = 0;
      for (const event of log) {
        if (event.type === 'tell') { assert.equal(tell, null, 'a tell is never doubled'); tell = event; }
        if (event.type === 'fire') {
          assert.ok(tell, `${level}: fire came without its tell`);
          assert.ok(event.t - tell.t >= REX_RULES.level[level].tellSec - DT * 1.5, `${level}: the tell lasted its full time`);
          assert.deepEqual(event.cone, tell.cone, `${level}: the fire went where the tell showed`);
          tell = null; fires++;
        }
      }
      ok(fires > 0, `${level}: fire always comes after a tell the player can see (${fires} breaths)`);
    }
  }
  const tellSec = REX_RULES.level;
  ok(tellSec.easy.tellSec > tellSec.medium.tellSec && tellSec.medium.tellSec > tellSec.hard.tellSec &&
    tellSec.easy.walkMps < tellSec.medium.walkMps && tellSec.medium.walkMps < tellSec.hard.walkMps,
    'Easy is slower, with a longer tell');
  ok(P.range > 9 && P.range >= P.rampEnd - P.rampStart && REX_RULES.fire.halfAngle > 15 * Math.PI / 180, 'its cone is larger than the flamethrower\'s');
  const inRamp = runRules('easy', () => ({s: P.rampStart + 5, lateral: P.rail, airborne: false, airHeight: 0, speedMph: 0}), 200);
  const stageFires = inRamp.log.filter(event => event.type === 'fire' && event.kind === 'stage').length;
  ok(stageFires > 0 && inRamp.log.filter(event => event.type === 'scorch' && event.kind === 'stage').length === stageFires,
    'a truck sitting on the big ramp is caught by each breath at the ramp, once per breath');
  const outside = runRules('easy', () => ({s: P.rampStart + 5, lateral: P.edge - .6, airborne: false, airHeight: 0, speedMph: 0}), 200);
  ok(!outside.log.some(event => event.type === 'scorch' && event.kind === 'stage'),
    'the stands\' edge of the floor beside the ramp is outside the ramp\'s cone');
  const hits = REX_RULES.level.easy.hits, toasted = runRules('easy', () => ({s: P.rampStart + 5, lateral: P.rail, airborne: false,
    airHeight: 0, speedMph: 0}), 600);
  ok(toasted.fight.done?.reason === 'toasted' && toasted.fight.hits === hits, `${hits} scorches on Easy stop the show`);
}

{
  // The pen: it throws a junk car at where the truck was, and eats one to mend its limp when it is hurt.
  // Two landings, then none: it eats after each and throws once it is mended.
  const {log} = runRules('easy', f => f.phase === 'rest' && f.boxes.filter(Boolean).length < 2 ? lander(f) : parked(f));
  const lifts = log.filter(event => event.type === 'lift'), lands = log.filter(event => event.type === 'thrownLand');
  ok(lifts.length >= 1 && lands.length === lifts.length, 'it picks up a junk car to throw, and the car comes down');
  ok(lifts.every((lift, index) => lands[index].t - lift.t >= REX_RULES.level.easy.throwTellSec + REX_RULES.thrown.flightSec - DT * 2),
    'a thrown car always waits for its tell and its flight');
  ok(lands.every((land, index) => land.at.x === lifts[index].at.x && land.at.z === lifts[index].at.z),
    'the car lands in the ring drawn when it was picked up');
  ok(log.some(event => event.type === 'eat') && log.filter(event => event.type === 'eat')
    .every(eat => log.some(event => event.type === 'smash' && event.t < eat.t)), 'it eats only when a box has been smashed');
  const still = runRules('easy', () => ({s: P.penS - 20, lateral: 5, airborne: false, airHeight: 0, speedMph: 0}), 200);
  ok(still.log.some(event => event.type === 'thrownLand' && event.hit), 'a truck that stays in the ring is hit');
}

{
  // The words: every fight line is in Big Mo's list, plain and whole, and every cue is a real sound.
  const ids = ['event.scrapasaurus.intro', 'event.won.scrapasaurus', 'event.lost.scrapasaurus', 'rex.tell', 'rex.rest',
    'rex.rest.last', 'rex.smash.1', 'rex.smash.2', 'rex.smash.3', 'rex.scorch', 'rex.bump', 'rex.lift', 'rex.eat', 'rex.ate',
    'rex.gone', 'rex.toasted', 'rex.seen.1', 'rex.seen.2', 'rex.seen.3', 'rex.seen.4'];
  const goals = ['walk', 'tell', 'fire', 'rest', 'lift', 'throw', 'eat', 'stagger', 'fallen'].flatMap(phase =>
    [1, 2, 3].flatMap(left => [false, true].map(last => BOWL_GOALS.scrapasaurus({phase, left, last}))));
  const words = [...ids.map(id => BIG_MO[id]), ...goals, BOWL_RESULTS.eventRexYard,
    ...[0, 1, 2, 3].flatMap(boxes => ['gate', 'toasted', 'fallen'].flatMap(reason => BOWL_RESULTS.eventRex({boxes, reason})))];
  ok(words.every(line => typeof line === 'string' && /^[A-Z]/.test(line) && /[.!?]$/.test(line) && !/[–—]/.test(line)),
    'every fight line is a plain whole sentence with no dashes');
  ok(Object.values(REX_CUES).every(cue => SOUND_BANK[BOWL_SOUND_CUES[cue]]), 'every fight event names a sound cue that plays');
}

// ---- the yard ---------------------------------------------------------------
{
  const profile = createProfile();
  ok(!rexInTheYard(profile), 'before night five the yard has no Scrapasaurus');
  const settled = settleShowNight(profile, {won: true, night: 5, bests: {}});
  ok(settled.ok && rexInTheYard(settled.profile) && settled.profile.bowl.trophies.includes(REX_TROPHY),
    'winning night five puts the Scrapasaurus in the yard, from the save alone');
}

// ---- the child-pace driver on the real Duel ----------------------------------
// It drives round at a child's pace on the stands' side of the floor, sees what
// the Scrapasaurus does late (a child's reaction), keeps to the floor's edge
// while fire is coming, and lines up on the rails for the big ramp only once a
// box is open. Its speed, lane and reaction wander from its seed.
function fightAt(level, seed) {
  const duel = showDuel(seed);
  assert.ok(duel.startBowlNight({night: 5, cpuDifficulty: level, seed}), 'night five starts');
  const night = duel.state.bowlNight;
  night.show.eventIndex = 2; night.phase = 'result';
  duel.continueBowlNight();
  assert.equal(night.event.type, REX_EVENT);
  const rng = makeRng(seed * 7919 + 13), seen = [], result = {won: false, events: [], hud: null, captions: []};
  duel.onChange((_, ev) => {
    if (ev.bowlRex) result.events.push(ev.bowlRex.type);
    if (ev.bowlCaption) result.captions.push(ev.bowlCaption.id);
    if (ev.bowlEventResult) result.outcome = ev.bowlEventResult;
  });
  const reaction = rng.range(.6, 1.1);
  let pace = rng.range(29, 34), lane = rng.range(1.8, 3), wobble = rng.range(0, Math.PI * 2), lastLap = 0;
  let going = false, stuck = 0, backing = 0;
  for (let i = 0; i < 120 * 600 && duel.state.status !== 'bowl_break'; i++) {
    const s = duel.state, fight = rexFightOf(night), time = s.stageTimeSec;
    seen.push({time, phase: fight.phase});
    while (seen.length > 1 && seen[1].time <= time - reaction) seen.shift();
    const phase = seen[0].phase, at = wrap(s.s);
    if (s.completedLaps !== lastLap) { lastLap = s.completedLaps; pace = rng.range(29, 34); lane = rng.range(1.8, 3); }
    if (phase === 'rest' && at > 4 && at < 28) going = true;
    if (at > 70 || at < 2) going = false;
    let target = going ? P.rail + .3 : lane;
    if (!going && (phase === 'tell' || phase === 'fire') && at > 18 && at < 58) target = 5;
    wobble += DT * 1.3;
    target += Math.sin(wobble) * .25;
    if (s.speedMph < 3 && s.status === 'racing' && time > 3) stuck += DT; else stuck = 0;
    if (stuck > 1.2) { backing = 1; stuck = 0; }
    if (backing > 0) {
      backing -= DT;
      duel.setInput({throttle: 0, brake: 1, steer: 0, boost: false});
    } else {
      duel.setInput({throttle: s.speedMph < pace ? 1 : 0, brake: 0, boost: false,
        steer: Math.max(-1, Math.min(1, (s.lateral - target) * .35 + (s.headingError || 0) * 1.6))});
    }
    duel.step(DT);
    if (!result.hud && fight.phase === 'rest') result.hud = bowlHudView(duel.state);
  }
  // The card stays up while Big Mo finishes what he is saying.
  for (let wait = 0; wait < 120 * 10 && result.outcome; wait++) duel.step(DT);
  result.won = result.outcome?.won === true;
  return result;
}

const rates = {};
for (const level of ['easy', 'medium', 'hard']) {
  const runs = Array.from({length: 10}, (_, index) => fightAt(level, 101 + index));
  rates[level] = {won: runs.filter(run => run.won).length, of: runs.length,
    reasons: runs.filter(run => !run.won).map(run => run.outcome?.reason ?? 'unfinished'),
    scorched: runs.map(run => run.outcome?.hits ?? 0),
    boxes: runs.map(run => run.outcome?.boxes ?? 0)};
  if (level === 'easy') {
    const won = runs.find(run => run.won);
    ok(won && won.events.filter(type => type === 'smash').length === 3 && won.outcome.boxes === 3,
      'a won fight is three landings on the battery boxes');
    ok(won.captions.includes('event.scrapasaurus.intro') && won.captions.includes('rex.rest') &&
      won.captions.includes('event.won.scrapasaurus'), 'Big Mo introduces the fight, calls the rest and calls the win');
    ok(won.hud?.name === 'The Scrapasaurus' && won.hud.goal === BOWL_GOALS.scrapasaurus({phase: 'rest'}),
      'the HUD names the fight and says what to do now');
    ok(runs.every(run => run.outcome), 'every Easy fight ends');
    const again = fightAt(level, 101);
    ok(JSON.stringify(again.events) === JSON.stringify(runs[0].events) && again.outcome.score === runs[0].outcome.score,
      'the same seed and inputs give the same fight');
  }
}
console.log(JSON.stringify(rates));
ok(rates.easy.won >= 8, `the child-pace driver wins Easy at least 8 times in 10 (${rates.easy.won} of 10)`);
console.log(`Bowl Scrapasaurus: ${checks} checks passed. Win rates for the child-pace driver: Easy ${rates.easy.won} of 10, Medium ${rates.medium.won} of 10, Hard ${rates.hard.won} of 10.`);
