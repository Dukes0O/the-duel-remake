// Lab-only navigation. Plain metres and inputs; no race state, saves or graphics.
export const WALK = Object.freeze({eye: 1.6, radius: .28, speed: 2.2, acceleration: 5, turn: Math.PI / 2, scale: .65});
export const WALK_LAYOUT = Object.freeze({
  'weighing-pad': [-8, -1], 'drop-tower': [-12, -6], 'fire-pit': [-12, 2.2],
  'pendulum-frame': [-7, -6], 'rotor-stand': [-3, -6], 'weights-and-cans': [-4, 1],
  'bending-rig': [3, -6], 'nail-jars': [7, -7], 'turning-arm': [8, -1.5], 'map-table': [12, -6],
  'wind-tunnel': [-7, 6], 'launcher-ramp': [7, 6], 'snow-trays': [12, 6],
});
export const CORNERS = Object.freeze([
  {name: 'Flying', x: -8, z: -5}, {name: 'Workshop', x: 8, z: -5},
  {name: 'Wind tunnel', x: -8, z: 6}, {name: 'Snow', x: 9, z: 6},
]);
export const createWalker = () => ({x: 0, z: 7.8, yaw: 0, pitch: 0, vx: 0, vz: 0});
export const blocksWalker = b => b.id !== 'weights-and-cans' && (b.maxY == null || b.maxY > .5);
export function canStand(x, z, bounds, hall) {
  const r = WALK.radius;
  return Math.abs(x) <= hall.halfWidth - r && Math.abs(z) <= hall.halfDepth - r &&
    !bounds.some(b => blocksWalker(b) && x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r);
}
// Visibility graph: the shortest clear route turns only at expanded box corners.
// Segment/box slabs also catch very thin obstacles between the endpoints.
export function clearWalkLine(a, b, bounds, hall) {
  if (!canStand(...a, bounds, hall) || !canStand(...b, bounds, hall)) return false;
  return !bounds.filter(blocksWalker).some(box => {
    let lo = 0, hi = 1;
    for (const [axis, min, max] of [[0, box.minX - WALK.radius, box.maxX + WALK.radius],
      [1, box.minZ - WALK.radius, box.maxZ + WALK.radius]]) {
      const d = b[axis] - a[axis];
      if (Math.abs(d) < 1e-10) { if (a[axis] <= min || a[axis] >= max) return false; }
      else {
        const t1 = (min - a[axis]) / d, t2 = (max - a[axis]) / d;
        lo = Math.max(lo, Math.min(t1, t2)); hi = Math.min(hi, Math.max(t1, t2));
        if (lo >= hi) return false;
      }
    }
    return lo < hi;
  });
}
export function walkRoute(state, goals, bounds, hall) {
  const nodes = [[state.x, state.z], ...goals.filter(p => canStand(...p, bounds, hall))];
  const goalCount = nodes.length;
  if (goalCount === 1) return null;
  const margin = WALK.radius + .12;
  for (const b of bounds.filter(blocksWalker)) for (const x of [b.minX - margin, b.maxX + margin])
    for (const z of [b.minZ - margin, b.maxZ + margin]) if (canStand(x, z, bounds, hall)) nodes.push([x, z]);
  const distances = nodes.map(() => Infinity), previous = [], visited = new Set(); distances[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (current < 0 || distances[i] < distances[current])) current = i;
    if (current < 0 || !Number.isFinite(distances[current])) return null;
    if (current > 0 && current < goalCount) {
      const route = [];
      for (let i = current; i !== 0; i = previous[i]) route.unshift(nodes[i]);
      return route;
    }
    visited.add(current);
    for (let i = 1; i < nodes.length; i++) {
      if (visited.has(i)) continue;
      const distance = distances[current] + Math.hypot(nodes[i][0] - nodes[current][0], nodes[i][1] - nodes[current][1]);
      if (distance < distances[i] && clearWalkLine(nodes[current], nodes[i], bounds, hall)) {
        distances[i] = distance; previous[i] = current;
      }
    }
  }
  return null;
}
export function stepTravel(state, route, dt, bounds, hall) {
  if (!route.length) return true;
  const [x, z] = route[0], dx = x - state.x, dz = z - state.z, distance = Math.hypot(dx, dz);
  if (distance < .06) {
    route.shift(); state.vx = state.vz = 0;
    return route.length === 0;
  }
  faceWalker(state, x, z, dt); state.pitch = 0;
  const speed = Math.min(1, Math.sqrt(distance * WALK.acceleration) / WALK.speed);
  stepWalker(state, {forward: (-Math.sin(state.yaw) * dx - Math.cos(state.yaw) * dz) / distance * speed,
    side: (Math.cos(state.yaw) * dx - Math.sin(state.yaw) * dz) / distance * speed}, dt, bounds, hall);
  return false;
}
export function faceWalker(state, x, z, dt) {
  const yaw = Math.atan2(state.x - x, state.z - z);
  const difference = Math.atan2(Math.sin(yaw - state.yaw), Math.cos(yaw - state.yaw));
  const turn = WALK.turn * Math.max(0, Math.min(.1, dt));
  state.yaw += Math.max(-turn, Math.min(turn, difference));
  return Math.abs(difference) <= turn;
}
export function nearbyWalkGoals(x, z, bounds, hall) {
  const goals = [];
  for (let r = 0; r <= 2; r += .4) for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
    const p = [x + r * Math.cos(a), z + r * Math.sin(a)];
    if (canStand(...p, bounds, hall)) goals.push(p);
    if (!r) break;
  }
  return goals;
}
export function machineApproaches(b, bounds, hall) {
  const x = (b.minX + b.maxX) / 2, z = (b.minZ + b.maxZ) / 2, gap = .85;
  return [[x, b.maxZ + gap], [x, b.minZ - gap], [b.maxX + gap, z], [b.minX - gap, z],
    [b.minX - gap, b.maxZ], [b.maxX + gap, b.maxZ], [b.minX - gap, b.minZ], [b.maxX + gap, b.minZ]]
    .filter(([px, pz]) => canStand(px, pz, bounds, hall));
}
export function brianPosition(station, bounds, hall) {
  const {x, z, bound} = station;
  return [[x + 1.7, z], [x - 1.7, z], [x, z + 1.5], [x, z - 1.5], ...machineApproaches(bound, bounds, hall)]
    .find(([px, pz]) => Math.hypot(px - x, pz - z) > 1.3 && canStand(px, pz, bounds, hall));
}
// The floor prompt and E share this choice. Looking at Brian must beat a
// nearer machine; distance only breaks ties in facing direction.
export function walkTarget(state, stations, brian, last) {
  const candidates = [{x: 1.8, z: 7.7, range: 2.4, target: {kind: 'board'}},
    ...stations.map(s => ({...s, range: 1.8, target: {kind: 'machine', ids: s.ids}}))];
  if (brian) candidates.push({x: brian[0], z: brian[1], range: 2.5, target: {kind: 'brian', id: last}});
  let best = null;
  for (const c of candidates) {
    const dx = c.x - state.x, dz = c.z - state.z, distance = Math.hypot(dx, dz);
    if (distance >= c.range) continue;
    const facing = distance > .05 ? (-Math.sin(state.yaw) * dx - Math.cos(state.yaw) * dz) / distance : -1;
    if (!best || facing > best.facing + 1e-6 || Math.abs(facing - best.facing) <= 1e-6 && distance < best.distance)
      best = {target: c.target, facing, distance};
  }
  return best?.target ?? null;
}
export function stepWalker(state, input, seconds, bounds, hall) {
  // Small substeps prevent crossing thin objects after a delayed frame.
  let left = Math.max(0, Math.min(.1, seconds));
  while (left > 1e-8) {
    const dt = Math.min(left, 1 / 120); left -= dt;
    state.yaw += (input.turn || 0) * WALK.turn * dt;
    const f = input.forward || 0, s = input.side || 0, length = Math.max(1, Math.hypot(f, s));
    const tx = (s * Math.cos(state.yaw) - f * Math.sin(state.yaw)) / length * WALK.speed;
    const tz = (-f * Math.cos(state.yaw) - s * Math.sin(state.yaw)) / length * WALK.speed;
    const dx = tx - state.vx, dz = tz - state.vz, distance = Math.hypot(dx, dz);
    const blend = distance ? Math.min(1, WALK.acceleration * dt / distance) : 1;
    state.vx += dx * blend; state.vz += dz * blend;
    const x = state.x + state.vx * dt, z = state.z + state.vz * dt;
    if (canStand(x, state.z, bounds, hall)) state.x = x; else state.vx = 0;
    if (canStand(state.x, z, bounds, hall)) state.z = z; else state.vz = 0;
  }
  return state;
}
export const machinePrompts = rows => rows.map(row => ({...row,
  state: row.done ? 'passed' : row.open ? 'open' : 'locked',
  prompt: `${row.done ? '✓ ' : ''}${row.open ? `E: use the ${row.name} bench` : row.note}`,
}));
export function stationPrompt(ids, rows) {
  const lessons = machinePrompts(rows.filter(r => ids.includes(r.id)));
  if (ids.length === 1) return {text: lessons[0]?.prompt ?? '',
    floor: `${lessons[0]?.done ? '✓ ' : ''}${lessons[0]?.name ?? ''} · ${lessons[0]?.open ? 'E' : 'Locked'}`,
    done: lessons[0]?.done === true};
  const open = lessons.some(r => r.open), done = lessons.length > 0 && lessons.every(r => r.done);
  return {text: open ? `${done ? '✓ ' : ''}E: choose a wind tunnel lesson` : lessons[0]?.note ?? '',
    floor: `${done ? '✓ ' : ''}Wind tunnel · ${open ? 'E' : 'Locked'}`, done};
}
