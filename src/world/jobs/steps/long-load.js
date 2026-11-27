// The shaft stays in one piece. Its overhang sweeps through every pose between frames.
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const point = place => place?.position ?? place;
const angle = value => Math.atan2(Math.sin(value), Math.cos(value));

export function longLoadEnds(pose, length) {
  const x = Math.sin(pose.heading) * length / 2, z = Math.cos(pose.heading) * length / 2;
  return [{x:pose.x - x, z:pose.z - z}, {x:pose.x + x, z:pose.z + z}];
}

function intersects(pose, length, solid) {
  const floor = solid.y ?? 0;
  if (pose.y != null && (pose.y > floor + (solid.height ?? 8) || pose.y + 2 < floor)) return false;
  const cos = Math.cos(solid.heading ?? 0), sin = Math.sin(solid.heading ?? 0);
  const [a, b] = longLoadEnds(pose, length).map(p => ({
    x:(p.x - solid.x) * cos - (p.z - solid.z) * sin,
    z:(p.x - solid.x) * sin + (p.z - solid.z) * cos,
  }));
  let lo = 0, hi = 1;
  for (const axis of ['x', 'z']) {
    const half = (axis === 'x' ? solid.halfX ?? solid.halfWidth : solid.halfZ ?? solid.halfLength) + .2;
    if (!Number.isFinite(half)) return false;
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) { if (Math.abs(a[axis]) > half) return false; }
    else {
      const t1 = (-half - a[axis]) / delta, t2 = (half - a[axis]) / delta;
      lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
      if (lo > hi) return false;
    }
  }
  return true;
}

export function longLoadContacts(previous, pose, length, solids = []) {
  const start = previous ?? pose, turn = angle(pose.heading - start.heading);
  // At most 20 cm of centre travel plus end travel per sample. The shaft's 20 cm skin closes the gaps.
  const count = Math.max(1, Math.ceil((gap(start, pose) + Math.abs(turn) * length / 2) / .2));
  const hits = new Set();
  for (let i = 0; i <= count; i++) {
    const t = i / count, sample = {x:start.x + (pose.x - start.x) * t, z:start.z + (pose.z - start.z) * t,
      y:pose.y, heading:start.heading + turn * t};
    for (const solid of solids) if (!hits.has(solid.id) && intersects(sample, length, solid)) hits.add(solid.id);
  }
  return [...hits];
}

export function stepLongLoad(step, state, view, dt) {
  const here = view.player?.position;
  const events = [], requests = [], next = {...state, phase:state.phase ?? 'out', clock:state.clock ?? 0,
    sheds:state.sheds ?? 0, loadKg:state.loadKg ?? 0};
  if (!here || !step.destination) return {state:next, complete:false, events, requests};
  const pose = {...here, heading:view.player?.heading ?? view.heading ?? 0};
  const speed = Math.abs(view.speedKmh ?? 0), still = speed < 1.5 && !view.onFoot;
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  let marker = step.origin;
  if (next.phase === 'out') {
    if (still && gap(here, point(step.origin)) <= step.origin.radius) {
      next.clock += dt;
      if (next.clock >= step.loadSeconds) {
        next.phase = 'carry'; next.clock = 0; next.loadKg = step.loadTonnes * 1000;
        events.push({type:'longLoadLift', kg:next.loadKg, cue:'world.bellows.load'});
      }
    } else next.clock = 0;
  } else if (next.phase === 'shed') {
    marker = next.dropped;
    next.clock = still && gap(here, next.dropped.position) <= step.radius ? next.clock + dt : 0;
    if (next.clock >= step.loadSeconds) {
      next.phase = 'carry'; next.clock = 0; next.loadKg = step.loadTonnes * 1000;
      events.push({type:'longLoadRecovered', cue:'world.bellows.load'});
    }
  } else if (next.phase === 'carry') {
    marker = step.destination;
    const contacts = longLoadContacts(state.pose, pose, step.loadLengthMetres, view.solids);
    const newContact = contacts.some(id => !(state.contacts ?? []).includes(id));
    next.contacts = contacts;
    next.turn = (state.turn ?? 0) + (state.pose && speed > 0 ? Math.abs(angle(pose.heading - state.pose.heading)) : 0);
    if (!next.cornerSaid && next.turn >= .12) {
      next.cornerSaid = true; say(step.cornerLineId);
    }
    if ((newContact && speed >= 6) || (view.hitKmh ?? 0) >= 10 || view.severeHit) {
      next.sheds++; next.loadKg = 0; next.clock = 0; next.phase = 'shed';
      next.dropped = {id:'fallen-shaft', position:{...here}, radius:step.radius};
      say(step.shedLineId);
      events.push({type:'longLoadShed', contacts, cue:'vehicle.crush'});
      if (next.sheds >= step.shedLimit) return {state:{}, restart:true, complete:false, events,
        requests:[...requests, {type:'marker', place:step.origin}]};
    } else if (still && gap(here, point(step.destination)) <= step.radius) {
      next.clock += dt;
      if (next.clock >= step.loadSeconds) {
        next.phase = 'done'; next.loadKg = 0;
        events.push({type:'longLoadDelivered', load:step.load, kg:step.loadTonnes * 1000, cue:'interface.bonus'});
      }
    } else next.clock = 0;
  }
  next.pose = pose;
  requests.push({type:'marker', place:marker});
  return {state:next, complete:next.phase === 'done', events, requests};
}
