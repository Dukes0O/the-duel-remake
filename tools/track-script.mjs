// Prints the facts of an authored circuit and draws it from above.
//   node tools/track-script.mjs <course id | path to a .js/.mjs file> [--reverse] [--out file.png]
// A file may export a course definition (default export, or any export that
// carries a `script`). Output goes to .qa-dist/ unless --out is given.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildTrackScript, buildRacingLine, TrackScriptError } from '../src/track-script.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- a very small picture maker: boxes, discs, lines, 5x7 letters, PNG ----

const FONT = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#', B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.####|#....|#....|#....|#....|#....|.####', D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####', F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#.###|#...#|#...#|.###.', H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '.###.|..#..|..#..|..#..|..#..|..#..|.###.', J: '..###|...#.|...#.|...#.|...#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.', P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.', T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.', V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', 1: '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####', 3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.', 5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.', 7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.', 9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '-': '.....|.....|.....|#####|.....|.....|.....', '.': '.....|.....|.....|.....|.....|.##..|.##..',
  "'": '..#..|..#..|.#...|.....|.....|.....|.....', '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
  ' ': '.....|.....|.....|.....|.....|.....|.....',
};

class Picture {
  constructor(width, height, background) {
    this.width = width; this.height = height;
    this.pixels = Buffer.alloc(width * height * 3);
    for (let i = 0; i < width * height; i++) this.pixels.set(background, i * 3);
  }
  dot(x, y, colour) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.pixels.set(colour, (y * this.width + x) * 3);
  }
  disc(cx, cy, radius, colour) {
    const r = Math.max(.5, radius), r2 = r * r;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) this.dot(x, y, colour);
    }
  }
  line(x0, y0, x1, y1, colour, radius = .5) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) this.disc(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, radius, colour);
  }
  text(string, x, y, colour, scale = 2, shadow = [0, 0, 0]) {
    let cursor = x;
    for (const raw of string.toUpperCase()) {
      const glyph = (FONT[raw] ?? FONT[' ']).split('|');
      for (const [shift, ink] of [[1, shadow], [0, colour]]) {
        glyph.forEach((row, gy) => [...row].forEach((cell, gx) => {
          if (cell !== '#') return;
          for (let a = 0; a < scale; a++) for (let b = 0; b < scale; b++) this.dot(cursor + gx * scale + a + shift, y + gy * scale + b + shift, ink);
        }));
      }
      cursor += 6 * scale;
    }
    return cursor - x;
  }
  textWidth(string, scale = 2) { return string.length * 6 * scale; }
  png() {
    const raw = Buffer.alloc((this.width * 3 + 1) * this.height);
    for (let y = 0; y < this.height; y++) {
      raw[y * (this.width * 3 + 1)] = 0;
      this.pixels.copy(raw, y * (this.width * 3 + 1) + 1, y * this.width * 3, (y + 1) * this.width * 3);
    }
    const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
    const crc = buffer => { let c = 0xffffffff; for (const byte of buffer) c = table[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => {
      const head = Buffer.alloc(4); head.writeUInt32BE(data.length);
      const body = Buffer.concat([Buffer.from(type), data]), tail = Buffer.alloc(4); tail.writeUInt32BE(crc(body));
      return Buffer.concat([head, body, tail]);
    };
    const header = Buffer.alloc(13);
    header.writeUInt32BE(this.width, 0); header.writeUInt32BE(this.height, 4); header[8] = 8; header[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  }
}

// ---- the picture of a circuit ----

export function drawCircuit(def, { width = 1800, height = 1300 } = {}) {
  const script = buildTrackScript(def), line = buildRacingLine(script);
  const xs = script.samples.map(p => p.x), zs = script.samples.map(p => p.z);
  const margin = 150, minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min((width - margin * 2) / Math.max(1, maxX - minX), (height - margin * 2 - 60) / Math.max(1, maxZ - minZ));
  const offsetX = (width - (maxX - minX) * scale) / 2, offsetY = (height + 60 - (maxZ - minZ) * scale) / 2;
  // True top-down, as the game camera sees it: +x to the right and +z down the page.
  const px = x => offsetX + (x - minX) * scale, py = z => offsetY + (z - minZ) * scale;
  const pic = new Picture(width, height, [24, 28, 32]);
  const at = (s, lat) => {
    const p = script.phase(s), i = Math.min(script.count - 1, Math.floor(p / script.step)), u = (p - i * script.step) / script.step;
    const a = script.samples[i], b = script.samples[i + 1];
    const x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u, h = a.heading + (b.heading - a.heading) * u;
    return { x: x + Math.cos(h) * lat, z: z - Math.sin(h) * lat, heading: h };
  };
  const step = Math.max(1, Math.round(1.5 / (script.step * scale)));
  // Road, then verges, kerbs, walls, centre and racing line.
  for (let i = 0; i <= script.count; i += 1) {
    const p = script.samples[i], hw = script.halfWidthAt(p.s);
    pic.disc(px(p.x), py(p.z), Math.max(1.5, hw * scale), [86, 90, 96]);
  }
  for (const wall of script.walls) {
    for (let s = wall.s0; s < wall.s1; s += script.step) {
      const q = at(s, wall.side * (script.halfWidthAt(s) + 1.5));
      pic.disc(px(q.x), py(q.z), 1.6, [225, 225, 230]);
    }
  }
  for (const kerb of script.kerbs) {
    for (let s = kerb.s0; s < kerb.s1; s += script.step) {
      const q = at(s, kerb.side * (script.halfWidthAt(s) - .5));
      pic.disc(px(q.x), py(q.z), 1.4, Math.floor(s / 3) % 2 ? [220, 60, 50] : [240, 240, 240]);
    }
  }
  for (let i = 0; i < script.count; i += step) {
    const a = script.samples[i], b = script.samples[Math.min(script.count, i + step)];
    pic.line(px(a.x), py(a.z), px(b.x), py(b.z), [120, 124, 130], .6);
    const ca = at(a.s, line.offset[i]), cb = at(b.s, line.offset[Math.min(script.count, i + step)]);
    const fast = line.speed[i] / 70, colour = [Math.round(255 * (1 - Math.min(1, fast))), Math.round(120 + 100 * Math.min(1, fast)), 60];
    pic.line(px(ca.x), py(ca.z), px(cb.x), py(cb.z), colour, 1);
  }
  for (const board of script.boards) {
    const q = at(board.s, board.side * (script.halfWidthAt(board.s) + 3));
    pic.disc(px(q.x), py(q.z), 3, [250, 210, 60]);
  }
  const start = at(0, 0), h = start.heading;
  const cx = px(start.x), cy = py(start.z), ux = Math.cos(h), uy = -Math.sin(h), reach = script.halfWidthAt(0) * scale * 1.3;
  pic.line(cx - ux * reach, cy - uy * reach, cx + ux * reach, cy + uy * reach, [90, 230, 120], 2.5);
  // Names beside each corner and each named straight, on the outside of the bend.
  for (const piece of script.pieces) {
    if (!piece.name) continue;
    const mid = (piece.s0 + piece.s1) / 2, turn = piece.kind === 'turn';
    const side = turn ? -piece.dir : 1, q = at(mid, side * (script.halfWidthAt(mid) + 22 / scale));
    const label = piece.name, w = pic.textWidth(label, 2);
    const tx = px(q.x) - (side * Math.cos(q.heading) < 0 ? w : 0), ty = py(q.z) - 7;
    pic.line(px(at(mid, side * script.halfWidthAt(mid)).x), py(at(mid, side * script.halfWidthAt(mid)).z), px(q.x), py(q.z), [150, 150, 160], .5);
    pic.text(label, Math.max(4, Math.min(width - w - 4, tx)), Math.max(4, Math.min(height - 20, ty)), turn ? [255, 226, 130] : [160, 205, 255], 2, [24, 28, 32]);
  }
  const title = `${def.name ?? def.id}  ${(script.length / 1000).toFixed(2)} KM  ${script.closed ? 'LOOP' : 'POINT TO POINT'}${script.reverse ? '  REVERSE' : ''}`;
  pic.text(title, 20, 18, [255, 255, 255], 3, [0, 0, 0]);
  pic.text('LEGEND  GREEN START  ORANGE-GREEN RACING LINE (GREEN FAST)  WHITE WALL  RED-WHITE KERB  YELLOW BRAKING BOARD', 20, 52, [190, 195, 200], 2, [24, 28, 32]);
  return pic;
}

export function describeCircuit(def) {
  const script = buildTrackScript(def), r = script.report;
  const lines = [];
  lines.push(`${def.name ?? def.id}${r.reverse ? ' (reverse)' : ''}`);
  lines.push(`  length            ${r.length.toFixed(1)} m (${(r.length / 1000).toFixed(2)} km), ${r.closed ? 'closed loop' : 'point to point'}`);
  lines.push(`  turns add up to   ${r.turnSumDeg.toFixed(1)} degrees${r.closed ? `; shared out ${r.turnAdjustDeg.toFixed(2)} degrees to close the heading` : ''}`);
  if (r.closed) {
    lines.push(`  loop gap          ${r.closureGap.toFixed(1)} m before closing`);
    const changed = r.straightChanges.filter(v => Math.abs(v.percent) > .005);
    lines.push(changed.length ? '  straight changes:' : '  straight changes: none');
    for (const v of changed) lines.push(`    piece ${String(v.index + 1).padStart(2)} ${(v.name || 'straight').padEnd(22)} ${v.before.toFixed(1)} m -> ${v.after.toFixed(1)} m (${v.percent >= 0 ? '+' : ''}${v.percent.toFixed(2)}%)`);
    lines.push(`  leftover climb    ${r.elevationLeftover.toFixed(2)} m spread over the straights`);
  }
  lines.push(`  highest grade     ${r.highestGradePercent.toFixed(1)}% at ${r.highestGradeAt.toFixed(0)} m`);
  if (r.tightestRadius) lines.push(`  tightest radius   ${r.tightestRadius.radius} m (${r.tightestRadius.name || 'piece ' + (r.tightestRadius.index + 1)})`);
  lines.push(`  walls ${script.walls.length} spans, kerbs ${script.kerbs.length}, braking boards ${script.boards.length}`);
  return lines.join('\n');
}

export async function findDefinition(target) {
  const loadable = /\.(m?js)$/i.test(target);
  if (loadable) {
    const module = await import(pathToFileURL(resolve(target)).href);
    const candidates = [module.default, ...Object.values(module)].flat().filter(value => value && typeof value === 'object' && Array.isArray(value.script));
    if (!candidates.length) throw new Error(`${target} exports no course definition with a script.`);
    return candidates[0];
  }
  const { COURSE } = await import('../src/config.js');
  const def = COURSE.find(item => item.id === target);
  if (!def) throw new Error(`No course "${target}". Courses with a script: ${COURSE.filter(item => item.script).map(item => item.id).join(', ') || 'none yet'}.`);
  if (!def.script) throw new Error(`Course "${target}" is not a scripted circuit.`);
  return def;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2), target = args.find(arg => !arg.startsWith('--'));
  if (!target) { console.error('Usage: node tools/track-script.mjs <course id | file.js> [--reverse] [--out file.png]'); process.exit(2); }
  try {
    let def = await findDefinition(target);
    if (args.includes('--reverse')) def = { ...def, reverse: !def.reverse };
    console.log(describeCircuit(def));
    const outIndex = args.indexOf('--out');
    const out = outIndex >= 0 ? resolve(args[outIndex + 1]) : join(ROOT, '.qa-dist', `track-script-${def.id ?? basename(target)}${def.reverse ? '-reverse' : ''}.png`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, drawCircuit(def).png());
    console.log(`  picture           ${out}`);
  } catch (error) {
    if (error instanceof TrackScriptError) { console.error(error.message); process.exit(1); }
    throw error;
  }
}
