// DEEP-EXPLORER: a route-independent, 16 m survey grid. One zone is 2,304
// hexadecimal characters (1,152 bitmap bytes). No graphics, storage or rewards.
export const CHART_SIDE = 96, CHART_CELL = 16, CHART_HEX = CHART_SIDE * CHART_SIDE / 4;
export const CHART_ZONES = Object.freeze(['kelp-coast']);
export const chartHas = (bits, id) => !!(parseInt(bits?.[id >> 2] || '0', 16) & (1 << (id & 3)));
export function normalizeChart(value) {
  const out = {};
  for (const zone of CHART_ZONES) {
    const bits = value?.[zone];
    if (typeof bits === 'string' && bits.length <= CHART_HEX && /^[0-9a-f]+$/.test(bits)) out[zone] = bits;
  }
  return out;
}
export function chartFrame(zone) {
  const origin = zone.trail[0], next = zone.trail[1];
  const length = Math.hypot(next.x - origin.x, next.z - origin.z);
  const fx = (next.x - origin.x) / length, fz = (next.z - origin.z) / length;
  const mirror = zone.ramp.side === 'right' ? -1 : 1;
  return {
    local(p) { const x = p.x - origin.x, z = p.z - origin.z;
      return {x: (x * fz - z * fx) * mirror, z: x * fx + z * fz}; },
    world(x, z) { return {x: origin.x + fx * z + fz * x * mirror,
      z: origin.z + fz * z - fx * x * mirror}; },
  };
}
export function chartCells(zone, floor) {
  const frame = chartFrame(zone), cells = [];
  for (let row = 0; row < CHART_SIDE; row++) for (let col = 0; col < CHART_SIDE; col++) {
    const p = frame.world((col + .5) * CHART_CELL - 512, (row + .5) * CHART_CELL - 512);
    const at = floor.sample(p.x, p.z);
    if (at?.distance <= 90) cells.push({id: row * CHART_SIDE + col, ...p,
      depth: at.depth, kelp: at.kelp, rock: at.rock});
  }
  return cells;
}
// Test distance to the whole segment, so coarse or slow frames leave no gaps.
export function revealChart(bits = '', cells, from, to = from) {
  if (!from || !to || ![from.x, from.z, to.x, to.z].every(Number.isFinite)) return bits;
  const chars = bits.padEnd(CHART_HEX, '0').split('');
  const dx = to.x - from.x, dz = to.z - from.z, length2 = dx * dx + dz * dz;
  let changed = false;
  for (const cell of cells) {
    if (chartHas(bits, cell.id)) continue;
    const t = length2 ? Math.max(0, Math.min(1, ((cell.x - from.x) * dx + (cell.z - from.z) * dz) / length2)) : 0;
    if (Math.hypot(cell.x - from.x - dx * t, cell.z - from.z - dz * t) > 25) continue;
    chars[cell.id >> 2] = (parseInt(chars[cell.id >> 2], 16) | (1 << (cell.id & 3))).toString(16);
    changed = true;
  }
  return changed ? chars.join('') : bits;
}
export function chartPercent(bits, cells) {
  const count = cells.reduce((sum, cell) => sum + Number(chartHas(bits, cell.id)), 0);
  return cells.length ? Math.floor(100 * count / cells.length) : 0;
}
