import {outsideGateAt, terraceHeight} from './bowl-outside.js';
import {readCode, secretOf} from './bowl-secrets.js';
import {crowdAfter, landingPoints, scoreStuntEvent, trickVariety} from './bowl-show.js';

const TURN = Math.PI * 2;
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const states = new WeakMap();
const arenaCourses = new WeakMap();

export function tricksEnabled(duel, actor) {
  return actor === duel.state && duel.course?.def.tricks === true &&
    duel.featureFlags?.enabled(duel.course.def.bowl ? 'titan-bowl' : 'arena-tricks') === true && actor.bowlNight?.event?.type !== 'lastTruckRolling';
}

export function bowlGroundTricksAllowed(actor) {
  const go = actor.bowlNight?.event?.go;
  return !go || go.launched === true;
}

export function bowlJumpMessagesAllowed(duel, actor, peak = 0) {
  const outside = duel.course?.features?.bowl?.outside;
  return !actor.bowlNight || !outside || actor.lateral <= outside.wall || Math.max(peak, actor.airHeight || 0) >= 1;
}

export function startArenaTrickShow(duel, foundTricks = []) {
  const s = duel.state;
  if (s.arenaTrickShow || s.bowlPose && !duel.course?.def.bowl) {
    delete s.bowlPose; delete s.bowlLanding; delete s.bowlGroundTrick;
    delete s.arenaTrickShow;
    states.delete(s);
  }
  arenaCourses.set(s, duel.course);
  if (!duel.course?.def.tricks || duel.course.def.bowl || !tricksEnabled(duel, s)) return;
  s.arenaTrickShow = {clock: 0, trickKinds: [], foundTricks: [...foundTricks],
    event: {score: 0, crowd: 0, crowdAt: 0, trickPopups: []}};
  return s.arenaTrickShow;
}
function arenaAward(actor, trick) {
  const show = actor.arenaTrickShow;
  if (!show || actor.bowlNight) return;
  const event = show.event, now = actor.stageTimeSec ?? 0;
  const crowd = crowdAfter(event.crowd, now-event.crowdAt);
  if (trick.landing === 'slam' && difficulty(actor) === 'easy') return;
  const scored = scoreStuntEvent({type:'bowlTrick', ...trick}, crowd);
  event.crowd = scored.crowd; event.crowdAt = now; event.score += scored.points;
  if (!scored.points) return;
  if (!show.trickKinds.includes(trick.kind)) show.trickKinds.push(trick.kind);
  if (event.trickPopups[0]?.at !== now) event.trickPopups = [];
  event.trickPopups.push({kind:trick.kind, turns:trick.turns, fresh:trick.fresh, at:now,
    points:scored.points, base:trick.points * (trick.fresh ? 1.5 : trick.repeat), multiplier:1+crowd/100});
  return true;
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
  const trick = {kind, turns, points, combo, fresh, landing, repeat, cues};
  if (arenaAward(duel.state, trick)) cues.push('bowl.crowd.rise');
  duel.emit({bowlTrick: trick});
}

export function genuineSecretFind(duel, event) {
  return !!event && states.get(duel.state)?.finding === event;
}
function findSecret(duel, state, kind) {
  const owner = duel.state.bowlNight ?? duel.state.arenaTrickShow;
  if (!owner) return;
  owner.foundTricks ??= [];
  if (owner.foundTricks.includes(kind)) return;
  owner.foundTricks.push(kind);
  const event = {kind, cue: 'bowl.secret.found'};
  if (owner === duel.state.arenaTrickShow) {
    owner.event.crowd = 100; owner.event.crowdAt = owner.clock;
    owner.event.trickPopups = [{notice:'SECRET TRICK FOUND', detail:secretOf(kind).name, at:owner.clock}];
  }
  state.finding = event;
  try { duel.emit({bowlSecretFound: event}); } finally { state.finding = null; }
}

function reportBowlTry(duel, reason) {
  const event = duel.state.bowlNight?.event;
  if (event && !event.schoolFailures?.includes(reason)) duel.emit?.({bowlTrickTry: {reason}});
}

function ground(duel, state, dt) {
  const s = duel.state, input = s.input, speed = Math.abs(s.speedMph);
  const keys = directionKeys(input), previous = state.groundPrevious;
  if (speed >= 5) state.code.length = 0;
  else if (!state.usedFull) {
    for (const key of ['Up','Down','Left','Right']) {
      if (keys[key] && !state.groundPrevious?.[key] && readCode(state.code, key, state.elapsed, true)) {
        state.armed = state.usedFull = true;
        s.bowlPose.flashUntil = (s.stageTimeSec ?? 0) + .8;
        if (s.arenaTrickShow) s.arenaTrickShow.event.trickPopups = [{notice:'FULL WORKS ARMED', at:s.arenaTrickShow.clock}];
        duel.emit({bowlSecretArmed: {kind: 'fullWorks', cue: 'bowl.secret.armed'}});
      }
    }
  }
  state.groundPrevious = keys;
  let kind = null;
  const showGround = input.boost && bowlGroundTricksAllowed(s);
  if (showGround) {
    if (input.throttle && Math.abs(input.steer) > .5 && speed < 15) kind = 'donut';
    else if (input.throttle && Math.abs(input.steer) <= .5 && speed < (state.kind === 'wheelie' ? 30 : 10)) kind = 'wheelie';
    else if (input.brake && speed > (state.kind === 'stoppie' ? 8 : 25)) kind = 'stoppie';
  }
  if (!kind && showGround) {
    if (keys.Up && !keys.Left && !keys.Right && (!previous?.Up || !previous.Space || previous.Left || previous.Right)) {
      reportBowlTry(duel, 'wheelieSpeed');
    } else if (keys.Down && (!previous?.Down || !previous.Space)) {
      reportBowlTry(duel, 'stoppieSpeed');
    }
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

const moves = {
  frontFlip: {axis: 'pitch', time: .8}, backflip: {axis: 'pitch', time: .8},
  spin: {axis: 'yaw', time: .9}, barrelRoll: {axis: 'roll', time: 1}, sideFlip: {axis: 'roll', time: 1},
};
const difficulty = s => s.bowlNight?.cpuDifficulty ?? s.cpuDifficulty ?? 'medium';
const directionKeys = input => ({
  Up: input.throttle > 0, Down: input.brake > 0,
  Left: input.steer < 0, Right: input.steer > 0, Space: !!input.boost,
});
function remainingAir(duel, s, dt) {
  const velocity = s._verticalSpeed || 0;
  const flat = (velocity + Math.sqrt(velocity ** 2 + 36 * Math.max(0, s.airHeight || 0))) / 18;
  const course = duel.course, outside = course.features?.bowl?.outside;
  if (!outside || !Number.isFinite(s._jumpY) || !(s.lateral > s.prevLateral)) return flat;
  const here = course.worldAt(s.s,s.lateral), prev = course.worldAt(s.prevS,s.prevLateral);
  const vx = (here.x-prev.x)/dt, vz = (here.z-prev.z)/dt;
  if (s.lateral + Math.hypot(vx,vz)*flat < outside.wall) return flat;
  // The world-space velocity is already known. Read the rising terrace along that
  // path only when starting a turn; the real flight keeps its normal ground solver.
  function meetsDeck(t) {
    const p = duel._roadPosition({x:here.x+vx*t,z:here.z+vz*t},s.s);
    const deck = terraceHeight(outside,p.lateral);
    return deck>0 && !outsideGateAt(outside,course.phase(p.s),p.lateral) &&
      s._jumpY+velocity*t-9*t*t <= deck;
  }
  let low=0;
  for(let i=1;i<=12;i++) {
    let high=flat*i/12;
    if (meetsDeck(high)) {
      for(let j=0;j<7;j++) {
        const mid=(low+high)/2;
        if (meetsDeck(mid)) high=mid; else low=mid;
      }
      return high;
    }
    low=high;
  }
  return flat;
}
function late(duel, flight, kind) {
  if (flight.late) return;
  flight.late = true;
  const s = duel.state;
  if (!bowlJumpMessagesAllowed(duel, s, s.bowlNight?.event?.flight?.peak)) return;
  const show = s.arenaTrickShow;
  if (show && !s.bowlNight) show.event.trickPopups = [{notice:'NOT ENOUGH AIR', at:show.clock}];
  const turnsCompleted = flight.turns[kind] || 0;
  duel.emit?.({bowlTrickLate: {kind, turnsCompleted, cue: 'bowl.trick.late'}});
}
function begin(duel, flight, axis, request, airLeft) {
  if (axis === 'roll') {
    request = {...request, kind: Math.abs(wrap(flight.yaw)) > Math.PI / 4 ? 'sideFlip' : 'barrelRoll'};
    if (request.kind === 'barrelRoll' && duel.state.bowlNight?.featuredTricks?.includes('sideFlip')) {
      reportBowlTry(duel, 'rollDirection');
    }
  }
  const time = moves[request.kind].time;
  const hard = difficulty(duel.state) === 'hard';
  if (!hard && airLeft + 1e-8 < .75 * time) { late(duel, flight, request.kind); return; }
  flight.active[axis] = {...request, duration: hard ? time : Math.min(airLeft, time), elapsed: 0};
  duel.emit?.({bowlTrickGo: {kind: request.kind, cue: 'bowl.trick.go'}});
}
function bank(f, kind) { f.turns[kind] = (f.turns[kind] || 0) + 1; }
function beginSecret(duel, flight, trick, airLeft) {
  const hard = difficulty(duel.state) === 'hard';
  if (!hard && airLeft + 1e-8 < trick.duration*.75) { late(duel, flight, trick.id); return false; }
  flight.active = {}; flight.queue = {}; flight.pitch = flight.yaw = flight.roll = 0;
  flight.secret = {trick, elapsed: 0, duration: hard ? trick.duration : Math.min(airLeft, trick.duration)};
  flight.code.length = 0;
  duel.emit({bowlSecretStart: {kind: trick.id, cue: 'bowl.secret.start'}});
  return true;
}
function air(duel, state, dt) {
  const s = duel.state, input = s.input;
  if (!state.flight) {
    s.bowlLanding = null;
    const held = {...(state.groundKeys ?? input)};
    state.flight = {held, previous: directionKeys(held), active: {}, queue: {}, turns: {}, code: [], pitch: 0, yaw: 0, roll: 0};
    state.code.length = 0;
    if (state.armed && remainingAir(duel,s,dt) >= .9) { state.armed = false; beginSecret(duel, state.flight, secretOf('fullWorks'), remainingAir(duel,s,dt)); }
    state.kind = s.bowlGroundTrick = null;
  }
  const f = state.flight, keys = directionKeys(input), fresh = [];
  for (const key of Object.keys(keys)) if (keys[key] && !f.previous[key]) fresh.push(key);
  f.previous = keys;
  for (const key of ['throttle', 'brake', 'steer', 'boost']) {
    if (!input[key] || Math.sign(input[key]) !== Math.sign(f.held[key])) f.held[key] = 0;
  }
  const night = s.bowlNight;
  if (f.held.throttle && s.airTime >= .25 &&
      (night?.event?.lesson === 'frontFlip' || night?.featuredTricks?.includes('frontFlip'))) {
    reportBowlTry(duel, 'heldThrottle');
  }
  let airLeft;
  const airTime = () => airLeft ??= remainingAir(duel,s,dt);
  if (!f.secret) for (const key of fresh.filter(k => k !== 'Space')) {
    const secret = readCode(f.code, key, state.elapsed, false);
    if (secret && beginSecret(duel, f, secret, airTime())) break;
  }
  if (f.secret) {
    const turn = f.secret;
    turn.elapsed += dt;
    Object.assign(s.bowlPose, turn.trick.pose(turn.elapsed / turn.duration));
    if (turn.trick.id === 'fullWorks') s.bowlPose.sparks = turn.elapsed < turn.duration;
    if (turn.elapsed + 1e-8 >= turn.duration) { bank(f, turn.trick.id); delete f.secret; }
    return;
  }
  const held = {};
  for (const [key, blocked] of [['Up', f.held.throttle], ['Down', f.held.brake], ['Left', f.held.steer], ['Right', f.held.steer]]) {
    if (!keys[key] || blocked) continue;
    const roll = keys.Space && !f.held.boost;
    const kind = key === 'Up' ? 'frontFlip' : key === 'Down' ? 'backflip' : !roll ? 'spin' :
      Math.abs(wrap(f.yaw)) > Math.PI / 4 ? 'sideFlip' : 'barrelRoll';
    const axis = moves[kind].axis, sign = key === 'Up' || key === 'Left' ? -1 : 1;
    held[axis] = {kind, sign};
    if (fresh.includes(key) || axis === 'roll' && fresh.includes('Space')) f.queue[axis] = held[axis];
  }
  for (const axis of ['pitch', 'yaw', 'roll']) {
    if (!f.active[axis] && f.queue[axis]) {
      begin(duel, f, axis, f.queue[axis], airTime());
      delete f.queue[axis];
    }
    const turn = f.active[axis];
    if (!turn) continue;
    turn.elapsed += dt;
    f[axis] = turn.sign * TURN * Math.min(1, turn.elapsed / turn.duration);
    if (turn.elapsed + 1e-8 >= turn.duration) {
      bank(f, turn.kind); f[axis] = 0; delete f.active[axis];
      if (!f.queue[axis] && held[axis]) f.queue[axis] = held[axis];
    }
  }
  Object.assign(s.bowlPose, {pitch: wrap(f.pitch), yaw: wrap(f.yaw), roll: wrap(f.roll)});
}

export function landBowlTricks(duel, actor) {
  const state = states.get(actor);
  if (!state?.flight || !tricksEnabled(duel, actor)) return;
  const f = state.flight;
  state.flight = null;
  let landing = 'clean';
  const level = difficulty(actor), window = level === 'hard' ? 45 : 60;
  for (const [axis, turn] of Object.entries(f.active)) {
    if ((1 - turn.elapsed / turn.duration) * 360 <= window + 1e-8) bank(f, turn.kind);
    else if (axis !== 'yaw') landing = 'slam';
    else if (landing === 'clean') landing = 'slide';
  }
  if (f.secret) {
    if ((1 - f.secret.elapsed / f.secret.duration)*360 <= window + 1e-8) bank(f, f.secret.trick.id);
    else landing = 'slam';
  }
  if (actor.bowlPose.sparks) actor.bowlPose.sparks = false;
  actor.bowlLanding = landing;
  if (landing === 'slam') {
    state.recovery = level === 'easy' ? 1 : 1.5;
    award(duel, state, 'slam', 0, 0, 0, landing);
    if (level !== 'easy') return;
  } else state.levelTime = .2;
  if (landing === 'slide') state.slide = 1;
  const tricks = Object.keys(moves).filter(kind => f.turns[kind]);
  if (f.turns.frontFlip && f.turns.backflip) bank(f, 'yoYo');
  const paidLanding = landing === 'slam' ? 'clean' : landing;
  for (const [index, kind] of tricks.entries()) {
    const turns = f.turns[kind];
    award(duel, state, kind, turns, landingPoints(kind, turns, tricks.length, paidLanding),
      tricks.length, paidLanding, index === 0 && landing === 'clean');
  }
  for (const [kind, turns] of Object.entries(f.turns)) {
    const trick = secretOf(kind);
    if (!trick) continue;
    award(duel, state, kind, turns, trick.points * turns * (paidLanding === 'slide' ? .5 : 1),
      1, paidLanding, !tricks.length && landing === 'clean');
    findSecret(duel, state, kind);
  }
}
// A new jump go gets a fresh truck. Variety and one-shot secrets belong to the event.
export function resetBowlTrickGo(actor) {
  const state = states.get(actor);
  if (!state || state.event !== actor.bowlNight?.event) return;
  const {event, seen, last, repeat, usedFull} = state;
  states.set(actor, {event, seen, last, repeat, usedFull, code: [], elapsed: 0, recovery: 0, slide: 0});
  actor.bowlPose = {pitch: 0, roll: 0, yaw: 0};
  actor.bowlLanding = null;
  actor.bowlGroundTrick = null;
}

export function stepBowlTricks(duel, actor, dt) {
  if (!tricksEnabled(duel, actor) || !(dt > 0)) {
    if (actor === duel.state && actor.arenaTrickShow && arenaCourses.get(actor) !== duel.course)
      startArenaTrickShow(duel);
    return;
  }
  if (!duel.course.def.bowl) {
    const show = arenaCourses.get(actor) === duel.course && actor.arenaTrickShow || startArenaTrickShow(duel);
    show.clock = actor.stageTimeSec ?? 0;
  }
  const event = actor.bowlNight?.event ?? actor.arenaTrickShow?.event;
  let state = states.get(actor);
  if (!state || state.event !== event || actor.stageTimeSec < state.clock) {
    state = {event, seen: new Set(), code: [], elapsed: 0, repeat: 1, recovery: 0, slide: 0};
    states.set(actor, state);
    actor.bowlPose = {pitch: 0, roll: 0, yaw: 0};
    actor.bowlLanding = null;
  }
  state.clock = actor.stageTimeSec;
  state.elapsed += dt;
  if (state.slide > 0 && !actor.airborne) {
    const elapsed = Math.min(dt, state.slide);
    actor.speedMph *= .5 ** elapsed;
    state.slide -= elapsed;
  }
  if (state.recovery > 0) {
    const share = Math.max(0, 1 - dt / state.recovery);
    for (const axis of ['pitch', 'yaw', 'roll']) actor.bowlPose[axis] *= share;
    actor.speedMph = 0;
    state.recovery = Math.max(0, state.recovery - dt);
  } else if (state.levelTime > 0 && !actor.airborne) {
    const share = Math.max(0, 1 - dt / state.levelTime);
    for (const axis of ['pitch', 'yaw', 'roll']) actor.bowlPose[axis] *= share;
    state.levelTime = Math.max(0, state.levelTime - dt);
  } else if (actor.airborne && !actor.tumble) air(duel, state, dt);
  else if (state.flight) landBowlTricks(duel, actor);
  else {
    state.groundKeys ??= {};
    Object.assign(state.groundKeys, actor.input);
    ground(duel, state, dt);
  }
}
