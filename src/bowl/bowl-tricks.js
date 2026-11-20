import {landingPoints, trickVariety} from './bowl-show.js';

const TURN = Math.PI * 2;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const states = new WeakMap();

export function tricksEnabled(duel, actor) {
  return actor === duel.state && duel.course?.def.tricks === true &&
    duel.featureFlags?.enabled('titan-bowl') === true && actor.bowlNight?.event?.type !== 'lastTruckRolling';
}

// A steering direction already down at the lip keeps its driving function.
// A fresh direction in flight belongs to the trick, never the trajectory.
export function carriedSteer(actor) {
  const state = states.get(actor);
  const carried = (state?.flight?.held ?? state?.groundKeys)?.steer;
  const steer = actor.input.steer;
  return carried && Math.sign(steer) === Math.sign(carried) ? steer : 0;
}

function award(duel, state, kind, turns, points, combo = 1, landing = 'clean', firstOnLanding = false) {
  const {fresh, repeat} = landing === 'slam' ? {fresh: false, repeat: 1} : trickVariety(state, kind);
  const cues = [];
  if (landing === 'slam') cues.push('bowl.trick.slam');
  if (firstOnLanding && landing === 'clean') cues.push('bowl.trick.land');
  if (kind === 'wheelie' || kind === 'cyclone') cues.push('bowl.trick.' + kind);
  if (fresh) cues.push('bowl.trick.new');
  duel.emit({bowlTrick: {kind, turns, points, combo, fresh, landing, repeat, cues}});
}

function ground(duel, state, dt) {
  const s = duel.state, input = s.input, speed = Math.abs(s.speedMph);
  let kind = null;
  if (input.boost) {
    if (input.throttle && Math.abs(input.steer) > .5 && speed < 15) kind = 'donut';
    else if (input.throttle && Math.abs(input.steer) <= .5 && speed < (state.kind === 'wheelie' ? 30 : 10)) kind = 'wheelie';
    else if (input.brake && speed > (state.kind === 'stoppie' ? 8 : 25)) kind = 'stoppie';
  }
  if (kind !== state.kind) { state.time = 0; state.circle = 0; state.count = 0; }
  state.kind = s.bowlGroundTrick = kind;
  const pose = s.bowlPose;
  pose.pitch = kind === 'wheelie' ? .49 : kind === 'stoppie' ? -.49 : 0;
  pose.roll = pose.yaw = 0;
  if (!kind) return;
  state.time += dt;
  if (kind === 'donut') {
    s.speedMph = Math.min(7, speed);
    const angle = input.steer * TURN * dt / 1.5;
    s.headingError = wrap((s.headingError || 0) + angle);
    state.circle += angle;
    const turns = Math.floor(Math.abs(state.circle) / TURN + 1e-8);
    if (turns > state.count) {
      award(duel, state, kind, 1, Math.min(40, 10 + 5 * turns));
      if (turns === 3) award(duel, state, 'cyclone', 3, 30);
      state.count = turns;
    }
  } else {
    const seconds = Math.floor(state.time + 1e-8);
    if (seconds > state.count) {
      state.count = seconds;
      award(duel, state, kind, 1, kind === 'stoppie' ? 10 : 8 + (seconds === 3 ? 25 : 0));
    }
  }
}

// Bank a completed turn before changing direction. Reversing a partial turn
// unwinds the visual pose, but never completes a turn of either kind.
function rotate(flight, axis, delta, kind) {
  if (!delta) return;
  const run = flight.runs[axis] ??= {direction: 0, angle: 0, kind};
  if (run.direction !== Math.sign(delta) || run.kind !== kind) {
    run.angle = 0;
    run.direction = Math.sign(delta);
    run.kind = kind;
  }
  run.angle += Math.abs(delta);
  const turns = Math.floor(run.angle / TURN + 1e-8);
  if (turns) {
    flight.turns[kind] = (flight.turns[kind] || 0) + turns;
    run.angle -= turns * TURN;
  }
  flight[axis] += delta;
}

function air(duel, state, dt) {
  const s = duel.state, input = s.input;
  if (!state.flight) {
    s.bowlLanding = null;
    state.flight = {held: {...(state.groundKeys ?? input)}, pitch: 0, yaw: 0, roll: 0, turns: {}, runs: {}};
    state.kind = s.bowlGroundTrick = null;
  }
  const f = state.flight;
  for (const key of ['throttle', 'brake', 'steer', 'boost']) {
    if (!input[key] || Math.sign(input[key]) !== Math.sign(f.held[key])) f.held[key] = 0;
  }
  const pitch = (f.held.brake ? 0 : input.brake || 0) - (f.held.throttle ? 0 : input.throttle || 0);
  const steer = f.held.steer ? 0 : input.steer || 0;
  const rolling = input.boost && !f.held.boost;
  const roll = rolling ? steer * dt * TURN : 0;
  const pitchKind = pitch < 0 ? 'frontFlip' : 'backflip';
  const pitchSeconds = (f.turns.backflip || f.turns.frontFlip) ? .8 : 1;
  rotate(f, 'pitch', pitch * TURN * dt / pitchSeconds, pitchKind);
  rotate(f, 'roll', roll, Math.abs(wrap(f.yaw)) > Math.PI / 4 ? 'sideFlip' : 'barrelRoll');
  if (!rolling) rotate(f, 'yaw', steer * TURN * dt / .9, 'spin');
  if (!pitch && !steer && !input.boost && (s.bowlNight?.cpuDifficulty ?? s.difficulty) === 'easy') {
    for (const axis of ['pitch', 'roll']) {
      const offset = wrap(f[axis]);
      if (Math.abs(offset) <= Math.PI / 6) f[axis] -= offset * Math.min(1, dt * 6);
    }
  }
  Object.assign(s.bowlPose, {pitch: wrap(f.pitch), yaw: wrap(f.yaw), roll: wrap(f.roll)});
}

export function landBowlTricks(duel, actor) {
  const state = states.get(actor);
  if (!state?.flight || !tricksEnabled(duel, actor)) return;
  const f = state.flight, pose = duel.state.bowlPose;
  state.flight = null;
  const landing = Math.cos(f.pitch) * Math.cos(f.roll) < Math.SQRT1_2 - 1e-8 ? 'slam' :
    Math.abs(wrap(f.yaw)) > Math.PI / 4 ? 'slide' : 'clean';
  actor.bowlLanding = landing;
  if (landing === 'slam') {
    state.recovery = 1.5;
    award(duel, state, 'slam', 0, 0, 0, landing);
    return;
  }
  if (landing === 'slide') state.slide = 1;
  const tricks = ['frontFlip', 'backflip', 'spin', 'barrelRoll', 'sideFlip']
    .filter(kind => f.turns[kind]).map(kind => [kind, f.turns[kind]]);
  const combo = tricks.length;
  for (const [index, [kind, turns]] of tricks.entries()) {
    const points = landingPoints(kind, turns, combo, landing);
    award(duel, state, kind, turns, points, combo, landing, index === 0);
  }
  pose.pitch = pose.yaw = pose.roll = 0;
}

export function stepBowlTricks(duel, actor, dt) {
  if (!tricksEnabled(duel, actor) || !(dt > 0)) return;
  let state = states.get(actor);
  if (!state || state.event !== actor.bowlNight?.event || actor.stageTimeSec < state.clock) {
    state = {event: actor.bowlNight?.event, seen: new Set(), repeat: 1, recovery: 0, slide: 0};
    states.set(actor, state);
    actor.bowlPose = {pitch: 0, roll: 0, yaw: 0};
    actor.bowlLanding = null;
  }
  state.clock = actor.stageTimeSec;
  if (state.recovery > 0) {
    const share = Math.max(0, 1 - dt / state.recovery);
    for (const axis of ['pitch', 'yaw', 'roll']) actor.bowlPose[axis] *= share;
    actor.speedMph = 0;
    state.recovery = Math.max(0, state.recovery - dt);
  } else if (actor.airborne && !actor.tumble) air(duel, state, dt);
  else if (state.flight) landBowlTricks(duel, actor);
  else {
    if (state.slide > 0) {
      const elapsed = Math.min(dt, state.slide);
      actor.speedMph *= .5 ** elapsed;
      state.slide -= elapsed;
    }
    state.groundKeys ??= {};
    Object.assign(state.groundKeys, actor.input);
    ground(duel, state, dt);
  }
}
