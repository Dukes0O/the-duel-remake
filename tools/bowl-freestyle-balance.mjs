import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Duel} from '../src/game.js';
import {makeRng} from '../src/rng.js';
import {SHOW_NIGHTS} from '../src/bowl/bowl-show.js';
import {secretOf} from '../src/bowl/bowl-secrets.js';

const DT = 1 / 120, RUNS = 10;
const LEVELS = ['easy', 'medium', 'hard'];
const SKILLS = ['child', 'middle', 'expert'];

export function createFreestyleDriver(skill = 'child', seed = 1, random = () => .5) {
  function turn(input, kind) {
    if (kind === 'frontFlip') input.throttle = 1;
    else if (kind === 'backflip') input.brake = 1;
    else {
      input.steer = 1;
      if (kind === 'barrelRoll') input.boost = true;
    }
  }
  let lap = -1, pace = 28, steer = 0, react = 0, airTicks = 0, triedBig = false, chosenFlight = false, airSeconds = 0;
  return (duel, dt = 1 / 120) => {
    const {state: s, course} = duel, night = s.bowlNight.night;
    const {ramps} = course.features, length = course.length;
    const bigIndex = ramps.findIndex(ramp => ramp.id === 'big-jump'), bigJump = ramps[bigIndex];
    const tableId = 'ramp-' + ramps.findIndex(ramp => ramp.id === 'table');
    const earlyOnly = ['double', 'triple'].includes(skill);
    const featured = night === 2 ? 'frontFlip' : night === 3 ? 'spin' : night === 5 ? 'barrelRoll' : 'backflip';
    const laterChild = skill === 'child' && night >= 3;
    const childTap = night === 3 ? 8 + seed * 9 : 4 + seed * (night === 2 ? 4 : 5);
    const at = ((s.s % length) + length) % length, n = Math.floor(s.s / length);
    if (n !== lap) {
      lap = n;
      pace = (laterChild ? 33 : skill === 'child' && night === 2 ? 26 : skill === 'child' || earlyOnly ? 24 : 48) + random() * 8;
    }
    const ramp = ramps.find(r => at > r.start - 30 && at < r.end + 2 && (r.off ?? 0) < 0);
    let line = ramp?.off ?? (skill === 'expert' && night === 3 ? -6 : 0);
    if (at < bigJump.end + 4 || at > length - 35) line = bigJump.off;

    if (earlyOnly && triedBig) line = night === 2 && at > 62 && at < 130 ? 13 : 7;
    if (skill === 'child' && night === 3 && at > 233 && at < 270) line = 0;
    const bend = Math.abs(course.at(s.s + 12).curvature) > .02;
    const target = bend ? Math.min(pace, skill === 'expert' ? 32 : laterChild && night === 5 ? 27 : 24) : pace;
    react -= dt;
    if (skill === 'expert' || earlyOnly && triedBig || laterChild) {
      steer = Math.max(-1, Math.min(1, (s.lateral - line) * .26 + (s.headingError || 0) * 3));
    } else if (react <= 0) {
      react = .12 + random() * .1;
      steer = Math.max(-1, Math.min(1, (s.lateral - line) * .22 + (s.headingError || 0) * 1.4 + (random() - .5) * .3));
    }
    const input = {throttle: +(s.speedMph < target), brake: s.speedMph > target + 6 ? .6 : 0, steer, boost: false};
    const seconds = s.stageTimeSec;
    if (skill !== 'child' && skill !== 'show' && !triedBig)
      Object.assign(input, {throttle: 1, brake: 0, steer: 0, boost: s.s >= 26});
    else if (['child', 'show'].includes(skill) && seconds < 5) Object.assign(input, {throttle: 1, brake: 0, steer: 1, boost: true});
    else if (['child', 'show'].includes(skill) && seconds < 6.6) Object.assign(input, {throttle: 1, brake: 0, steer: 0, boost: true});
    if (!earlyOnly && (laterChild || skill !== 'child') && !s.airborne && at > 27 && at < 50 &&
        Math.abs(s.lateral - bigJump.off) < 1.3 && Math.abs(s.headingError) < .07) {
      Object.assign(input, {throttle: 1, brake: 0, boost: s.speedMph >= 18});
    }
    if (earlyOnly && triedBig && seconds < 6.7) Object.assign(input, {throttle: 0, brake: +(s.speedMph > 4)});
    if (skill === 'child' && !laterChild && !s.airborne && seconds > 8) {
      if (seconds < 10 || seconds > 35 && seconds < 37)
        Object.assign(input, {throttle: 1, brake: 0, boost: true, steer: 0});
      if (seconds > 12 && seconds < 15 && s.speedMph <= 24)
        Object.assign(input, {throttle: 1, brake: 0, boost: true, steer: 1});
    }
    if (s.airborne) {
      airTicks++;
      const flightRamp = s._jumpOrigin?.rampId;
      const big = flightRamp === 'ramp-' + bigIndex, table = flightRamp === tableId;
      if (airTicks === 1) {
        chosenFlight = big && !triedBig;
        if (chosenFlight) triedBig = true;
        const vy = s._verticalSpeed;
        airSeconds = (vy + Math.sqrt(vy ** 2 + 36 * Math.max(0, s.airHeight))) / 18;
      }
      Object.assign(input, {boost: false, throttle: 0, brake: 0, steer: 0});
      if (earlyOnly && chosenFlight) {
        const hold = featured === 'barrelRoll' ? (skill === 'triple' ? 253 : 133)
          : skill === 'triple' ? (featured === 'spin' ? 226 : 218) : 112;
        if (airTicks > 3 && airTicks <= hold) turn(input, featured);
      } else if (skill === 'child' && (big || table || night === 2 && flightRamp) && airTicks === childTap) {
        const frontFlip = table ? laterChild : featured === 'frontFlip';
        turn(input, frontFlip ? 'frontFlip' : 'backflip');
      } else if (!earlyOnly && skill !== 'child') {
        const pitchHeld = big ? (skill === 'expert' && airSeconds > 2.6 ? 230 : airSeconds > 1.72 ? 115 : 4) : 4;
        const spinHeld = big ? (skill === 'expert' && airSeconds > 2.9 ? 235 : airSeconds > 1.94 ? 120 : 4) : 4;
        if (airTicks >= 4 && airTicks <= pitchHeld)
          turn(input, featured === 'frontFlip' ? featured : 'backflip');
        if (night >= 3 && skill === 'expert' && big && airSeconds > 2.6) {
          // Roll while the first spin has the truck sideways. Return to the spin after the rolls.
          input.steer = +(airTicks >= 4 && airTicks <= 156 || airTicks === 159);
          input.boost = airTicks >= 27 && airTicks <= 156;
        } else if (airTicks >= 4 && airTicks <= spinHeld) input.steer = 1;
      }
    } else airTicks = 0;
    return input;
  };
}

export function driveFreestyle(cpuDifficulty, seed, skill = 'child', night = 1) {
  const duel = new Duel({seed}), rng = makeRng(seed);
  duel.featureFlags = {enabled: name => name === 'titan-bowl'};
  const eventIndex = SHOW_NIGHTS[night - 1].events.indexOf('freestyle');
  assert.ok(duel.startBowlNight({night, eventIndex, cpuDifficulty, seed}));
  const {ramps} = duel.course.features;
  const bigIndex = ramps.findIndex(ramp => ramp.id === 'big-jump'), bigJump = ramps[bigIndex];
  if (skill !== 'child') {
    // Give the one-trick challenge a centered run-up, then use only driving inputs.
    const s = duel.state, start = bigJump.start - 37;
    Object.assign(s, {s: start, prevS: start, lateral: bigJump.off, prevLateral: bigJump.off});
  }
  const awarded = [];
  let crushedBusPile = false;
  duel.onChange((_, ev) => {
    if (ev.propCrushed?.byPlayer && /^(?:bowl-bus-pile|bowl-second-bus-pile)-/.test(ev.propCrushed.id)) crushedBusPile = true;
  });
  const input = createFreestyleDriver(skill, seed, () => rng.float());
  let result = null, flightRamp;
  duel.onChange((_, ev) => {
    if (ev.bowlEventResult) result = ev.bowlEventResult;
    if (ev.bowlTrick?.points) awarded.push({kind: ev.bowlTrick.kind, turns: ev.bowlTrick.turns,
      at: duel.state.stageTimeSec, ramp: flightRamp});
  });
  for (let i = 0; i < 120 * 100 && !result; i++) {
    const s = duel.state;
    if (s.airborne) flightRamp = s._jumpOrigin?.rampId;
    duel.setInput(input(duel, DT));
    duel.step(DT);
    if (!s.airborne) flightRamp = undefined;
  }
  assert.ok(result);
  const event = duel.state.bowlNight.event;
  const floor = night === 3 ? crushedBusPile
    : event.facts.some(fact => fact.type === ({1: 'carLaunch', 2: 'busClear', 5: 'barClear'})[night]);
  return {...result, awarded, floor, facts: event.facts,
    pieces: event.facts.filter(fact => ['busClear', 'barClear', 'crush'].includes(fact.type)).map(fact => fact.type),
    outside: event.facts.some(fact => fact.type === 'bowlOverWall')};
}

export function balance(onlyNight, {measure = false} = {}) {
  const nights = SHOW_NIGHTS.filter(row => row.freestyle);
  for (const [index, {night, freestyle}] of nights.entries()) {
    if (onlyNight && night !== onlyNight) continue;
    const rows = LEVELS.map((level, i) => {
      const config = [SKILLS[i], 'double', ...(i > 0 ? ['triple'] : [])];
      return config.map(skill => {
        const runs = Array.from({length: RUNS}, (_, seed) => driveFreestyle(level, seed + 1, skill, night));
        return {skill, runs, scores: runs.map(run => run.score)};
      });
    });
    const evidence = rows.map(row => row.map(({skill, scores, runs}) => ({skill, scores,
      wins: runs.filter(run => run.won).length, floor: runs.filter(run => run.floor).length})));
    console.log(JSON.stringify({night, targets: freestyle.target, evidence}));
    if (measure) continue;
    for (const [levelIndex, level] of LEVELS.entries()) {
      const target = freestyle.target[level], previous = nights[index - 1]?.freestyle.target[level];
      const label = `Night ${night} ${level}`;
      if (previous) assert.ok(target * 10 >= previous * 11, `${label} rises at least 10%`);
      for (const {runs, skill} of rows[levelIndex]) {
        assert.ok(runs.every(run => !run.outside && !run.awarded.some(trick => secretOf(trick.kind))),
          `${label} ${skill} uses no secrets or trips outside`);
        const wins = runs.filter(run => run.won).length;
        if (skill === 'double' || skill === 'triple') {
          const turns = skill === 'double' ? 2 : 3;
          assert.ok(runs.every(run => run.awarded.length === 1 && run.awarded[0].turns === turns &&
            run.awarded[0].ramp === 'ramp-1' && run.awarded[0].at < 15), `${label} really lands one early ${skill}`);
          assert.equal(wins, 0, `${label} cannot be won with one ${skill}`);
        } else if (skill === 'child') {
          assert.ok(wins >= 6 && wins < RUNS, `${label} child wins ${wins}/${RUNS}`);
          const moves = runs.flatMap(run => run.awarded);
          assert.ok(['wheelie', 'donut'].every(kind => moves.some(move => move.kind === kind)));
          assert.ok(['ramp-1', 'ramp-3'].every(ramp => moves.some(move => move.ramp === ramp &&
            ['backflip', 'frontFlip'].includes(move.kind) && move.turns === 1)), `${label} uses single flips off both ramps`);
          assert.ok(moves.filter(move => move.ramp).every(move => move.turns === 1), `${label} child only lands singles`);
          if (night !== 1) assert.ok(runs.some(run => run.floor), `${label} child uses the event's floor`);
        } else assert.ok(wins >= 8, `${label} ${skill} driver wins ${wins}/${RUNS}`);
      }
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const night = process.argv.slice(2).find(arg => !arg.startsWith('--'));
  balance(Number(night), {measure: process.argv.includes('--measure')});
}
