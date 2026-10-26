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
export function canStand(x, z, bounds, hall) {
  const r = WALK.radius;
  return Math.abs(x) <= hall.halfWidth - r && Math.abs(z) <= hall.halfDepth - r &&
    !bounds.some(b => x > b.minX - r && x < b.maxX + r && z > b.minZ - r && z < b.maxZ + r);
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
