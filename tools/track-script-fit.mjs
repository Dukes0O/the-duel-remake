// Finds the smallest changes that make a draft circuit close.
//   node tools/track-script-fit.mjs <course id | file.js> [--turns 4] [--round 1]
// The draft's straights and turn angles are nudged (straights by their length,
// turn angles four times as dearly, `--turns` changes that) until the end of
// the road meets the start, heading and all. Radii, names, climbs and every
// other option stay as written. Prints each change and a corrected script.
import { measureScript } from '../src/track-script.js';
import { findDefinition } from './track-script.mjs';
import { pathToFileURL } from 'node:url';

const DEG = Math.PI / 180;

function solve3(a, b) {
  const m = a.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    [m[c], m[p]] = [m[p], m[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = m[r][c] / m[c][c]; for (let k = c; k < 4; k++) m[r][k] -= f * m[c][k]; }
  }
  return m.map((row, i) => row[3] / row[i]);
}

export function fitScript(def, { turnWeight = 4, minStraight = 20, keep = [] } = {}) {
  const script = def.script.map(piece => [...piece.slice(0, piece[0] === 'turn' ? 4 : 2), { ...(piece[piece[0] === 'turn' ? 4 : 2] ?? {}) }]);
  const slots = [];
  script.forEach((piece, i) => slots.push({ piece: i, field: piece[0] === 'turn' ? 2 : 1, turn: piece[0] === 'turn', nominal: piece[piece[0] === 'turn' ? 2 : 1] }));
  const sign = Math.sign(measureScript({ ...def, script }).turnSumDeg) || 1;
  const wanted = sign * Math.PI * 2;
  const residual = () => {
    const m = measureScript({ ...def, script });
    return [m.x, m.z, (m.heading - wanted) * 100];
  };
  for (let round = 0; round < 40; round++) {
    const r = residual();
    if (Math.hypot(...r) < 1e-6) break;
    const columns = slots.map(slot => {
      const keep = script[slot.piece][slot.field], step = slot.turn ? .01 : .05;
      script[slot.piece][slot.field] = keep + step;
      const r2 = residual();
      script[slot.piece][slot.field] = keep;
      return r2.map((v, k) => (v - r[k]) / step);
    });
    // Minimise sum of (change / nominal)^2 * weight subject to J change = -r.
    const cost = slots.map(slot => slot.nominal ** 2 / (keep.includes(def.script[slot.piece].at(-1)?.name) ? 1e4 : slot.turn ? turnWeight : 1));
    const a = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    slots.forEach((slot, i) => { for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) a[p][q] += columns[i][p] * columns[i][q] * cost[i]; });
    const lambda = solve3(a, r.map(v => -v));
    slots.forEach((slot, i) => {
      let change = 0; for (let p = 0; p < 3; p++) change += columns[i][p] * lambda[p] * cost[i];
      const next = script[slot.piece][slot.field] + change * .8;
      script[slot.piece][slot.field] = slot.turn ? Math.max(1, next) : Math.max(minStraight, next);
    });
  }
  return { script, slots, closed: Math.hypot(...residual()) < 1e-4 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2), target = args.find(arg => !arg.startsWith('--'));
  if (!target) { console.error('Usage: node tools/track-script-fit.mjs <course id | file.js> [--turns 4] [--round 1]'); process.exit(2); }
  const value = name => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : undefined; };
  const def = await findDefinition(target);
  const keep = args.flatMap((arg, i) => (arg === '--keep' ? [args[i + 1]] : []));
  const result = fitScript(def, { turnWeight: value('--turns') ?? 4, keep });
  const places = value('--round') ?? 1;
  const round = (n, turn) => (turn ? Math.round(n * 2) / 2 : Math.round(n / places) * places);
  console.log(result.closed ? 'Closed.' : 'Did not close.');
  for (const slot of result.slots) {
    const now = result.script[slot.piece][slot.field], name = def.script[slot.piece].at(-1)?.name ?? '';
    if (Math.abs(now - slot.nominal) < (slot.turn ? .05 : .5)) continue;
    console.log(`piece ${String(slot.piece + 1).padStart(2)} ${slot.turn ? 'turn ' : 'straight'} ${name.padEnd(20)} ${slot.nominal} -> ${round(now, slot.turn)} (${((now / slot.nominal - 1) * 100).toFixed(1)}%)`);
  }
  console.log('\n[');
  const text = value => JSON.stringify(value).replace(/"([a-z]+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ').replace(/^\{/, '{ ').replace(/\}$/, ' }');
  for (const piece of result.script) {
    const turn = piece[0] === 'turn', opts = piece.at(-1);
    const head = turn ? `'turn', '${piece[1]}', ${round(piece[2], true)}, ${piece[3]}` : `'straight', ${round(piece[1], false)}`;
    console.log(`  [${head}${Object.keys(opts).length ? ', ' + text(opts) : ''}],`);
  }
  console.log(']');
}
