import {landingPoints, trickVariety} from './bowl-show.js';

const TURN = Math.PI * 2;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const states = new WeakMap();

export function tricksEnabled(duel, actor) {
  return actor === duel.state && duel.course?.def.tricks === true &&
    duel.featureFlags?.enabled('titan-bowl') === true && !actor.arena;
}

function award(duel, state, kind, turns, points, combo = 1, landing = 'clean') {
  const {fresh, repeat} = landing === 'slam' ? {fresh: false, repeat: 1} : trickVariety(state, kind);
  const cue = landing === 'slam' ? 'slam' : kind === 'cyclone' ? 'cyclone' :
    kind === 'wheelie' ? 'wheelie' : fresh ? 'new' : 'land';
  duel.emit({bowlTrick: {kind, turns, points, combo, fresh, landing, repeat, cue: 'bowl.trick.' + cue}});
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

function air(duel, state, dt) {
  const s = duel.state, input = s.input;
  if (!state.flight) {
    state.flight = {held: {...input}, pitch: 0, yaw: 0, roll: 0, barrelRoll: 0, sideFlip: 0};
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
  f.roll += roll;
  f[Math.abs(wrap(f.yaw)) > Math.PI / 4 ? 'sideFlip' : 'barrelRoll'] += roll;
  if (!rolling) f.yaw += steer * TURN * dt / .9;
  f.pitch += pitch * TURN * dt / (Math.abs(f.pitch) + 1e-8 >= TURN ? .8 : 1);
  if (!pitch && !steer && !input.boost && (s.bowlNight?.cpuDifficulty ?? s.difficulty) === 'easy') {
    for (const axis of ['pitch', 'roll']) {
      const offset = wrap(f[axis]);
      if (Math.abs(offset) <= Math.PI / 6) f[axis] -= offset * Math.min(1, dt * 6);
    }
  }
  Object.assign(s.bowlPose, {pitch: wrap(f.pitch), yaw: wrap(f.yaw), roll: wrap(f.roll)});
}

function land(duel, state) {
  const f = state.flight, pose = duel.state.bowlPose;
  state.flight = null;
  const landing = Math.cos(f.pitch) * Math.cos(f.roll) < Math.SQRT1_2 - 1e-8 ? 'slam' :
    Math.abs(wrap(f.yaw)) > Math.PI / 4 ? 'slide' : 'clean';
  if (landing === 'slam') {
    state.recovery = 1.5;
    award(duel, state, 'slam', 0, 0, 0, landing);
    return;
  }
  if (landing === 'slide') state.slide = 1;
  const angles = [[f.pitch < 0 ? 'frontFlip' : 'backflip', f.pitch], ['spin', f.yaw],
    ['barrelRoll', f.barrelRoll], ['sideFlip', f.sideFlip]];
  const tricks = angles.map(([kind, angle]) => [kind, Math.floor(Math.abs(angle) / TURN + 1e-8)]).filter(([, turns]) => turns);
  const combo = tricks.length;
  for (const [kind, turns] of tricks) {
    const points = landingPoints(kind, turns, combo, landing);
    award(duel, state, kind, turns, points, combo, landing);
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
  }
  state.clock = actor.stageTimeSec;
  if (state.recovery > 0) {
    const share = Math.max(0, 1 - dt / state.recovery);
    for (const axis of ['pitch', 'yaw', 'roll']) actor.bowlPose[axis] *= share;
    actor.speedMph = 0;
    state.recovery = Math.max(0, state.recovery - dt);
  } else if (actor.airborne && !actor.tumble) air(duel, state, dt);
  else if (state.flight) land(duel, state);
  else {
    if (state.slide > 0) {
      const elapsed = Math.min(dt, state.slide);
      actor.speedMph *= .5 ** elapsed;
      state.slide -= elapsed;
    }
    ground(duel, state, dt);
  }
}
