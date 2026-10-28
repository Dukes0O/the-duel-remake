// LAB-FAN-ART: the "Project Fan" blueprint, a pinned sheet for the Lab wall
// (docs/LAB.md section 6): the three fan cars side by side (Chaparral 2J 1970,
// Brabham BT46B 1978, McMurtry Spéirling 2022) as line drawings, and below them the
// Spéirling in plan and side view with the air's path from under the floor into
// the fans. Drawn as thin quads on a creased, curling sheet with pins, a tape
// strip and a coffee ring. Seeded; the same command gives the same bytes.
//
//   node tools/art/speirling-blueprint.mjs [--out <dir>]    (dir inside .qa-dist/)
//
// Writes project-fan.glb and manifest.json into public/assets/models/speirling/.
// Metres, the sheet in the XY plane facing +Z, its top-centre edge at the origin.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { C, Part, fbm, lerpColor, noise, partMesh, rng, thick, triangleCount } from './lab-kit.mjs';

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }, error => this.onerror?.(error)); }
};
const root = fileURLToPath(new URL('../../', import.meta.url));
const publicDir = resolve(root, 'public/assets/models/speirling');
const outIndex = process.argv.indexOf('--out');
const outDir = outIndex >= 0 ? resolve(process.argv[outIndex + 1]) : publicDir;
if (outDir !== publicDir && relative(resolve(root, '.qa-dist'), outDir).startsWith('..')) throw new Error('--out goes under .qa-dist/.');

const W = 1.2, H = .85, INK = C(0xe2ebf7), BLUE = C(0x1c4c88);
const sheet = new Part('sheet', [0, 0, 0]);
// The paper: a thin sheet hung from its top edge, blue with mottling, light fold creases,
// a pale margin, and the bottom-right corner curling off the wall.
const curl = (x, y) => { const d = Math.max(0, (x - .38) + (-y - .55)); return .09 * d * d + .004 * Math.sin(x * 9) * Math.cos(y * 7); };
// The sheet is a grid in the XY plane (x across, y down from the hanging edge), curling out in Z.
const gridXY = (cols, rows, colorAt) => {
  const positions = [], indices = [];
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) { const x = -W / 2 + W * c / cols, y = -H * r / rows; positions.push(x, y, curl(x, y)); }
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const a = r * (cols + 1) + c, b = a + 1, d = a + cols + 1, e = d + 1; indices.push(a, b, d, b, e, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return { geometry: g, colorAt };
};
const paper = gridXY(60, 42, (p) => {
  let c = lerpColor(BLUE, C(0x2a62a6), fbm(p, 5, 1)); c = lerpColor(c, C(0x153a6a), fbm(p, 14, 2) * .5);
  const margin = Math.min(p.x + W / 2, W / 2 - p.x, p.y + H, -p.y) < .028; if (margin) c = lerpColor(c, C(0xcfdcf0), .75);
  for (const fx of [-.2, .2]) if (Math.abs(p.x - fx) < .004) c = lerpColor(c, C(0x6f97cf), .6);
  if (Math.abs(p.y + .42) < .004) c = lerpColor(c, C(0x6f97cf), .6);
  return c.multiplyScalar(.9 + noise(p.x * 40, p.y * 40, 0, 3) * .12);
});
sheet.add('solid', thick(paper.geometry, .003), [0, 0, 0], [0, 0, 0], [1, 1, 1], paper.colorAt);

// Line work: thin quads lying on the paper (+ the curl under them).
const lineGeometry = [];
const line = (ax, ay, bx, by, w = .0035) => {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len * w / 2, ny = dx / len * w / 2;
  const z = (x, y) => curl(x, y) + .004;
  const verts = [[ax + nx, ay + ny], [ax - nx, ay - ny], [bx + nx, by + ny], [bx - nx, by - ny]];
  lineGeometry.push(verts.map(([x, y]) => [x, y, z(x, y)]));
};
const poly = (points, ox, oy, s, closed = false, w) => { for (let i = 0; i < points.length - 1; i++) line(ox + points[i][0] * s, oy + points[i][1] * s, ox + points[i + 1][0] * s, oy + points[i + 1][1] * s, w); if (closed) line(ox + points.at(-1)[0] * s, oy + points.at(-1)[1] * s, ox + points[0][0] * s, oy + points[0][1] * s, w); };
const circle = (cx, cy, r, w, a0 = 0, a1 = Math.PI * 2, n = 28) => { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / n, b = a0 + (a1 - a0) * (i + 1) / n; line(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(b) * r, cy + Math.sin(b) * r, w); } };
const rect = (x0, y0, x1, y1, w) => poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0, 0, 1, true, w);
const arrow = (ax, ay, bx, by, w = .004) => { line(ax, ay, bx, by, w); const a = Math.atan2(by - ay, bx - ax); for (const d of [2.6, -2.6]) line(bx, by, bx + Math.cos(a + d) * .02, by + Math.sin(a + d) * .02, w); };

// Frame and title block.
rect(-W / 2 + .035, -H + .035, W / 2 - .035, -.035, .005);
rect(W / 2 - .36, -H + .035, W / 2 - .035, -H + .16, .004);
for (const y of [-H + .075, -H + .115]) line(W / 2 - .36, y, W / 2 - .035, y, .003);
line(W / 2 - .20, -H + .035, W / 2 - .20, -H + .115, .003);
// Three small panels along the top: the fan cars (side views, front to the left), a year bar under each.
const panels = [[-.40, 'chaparral'], [0, 'brabham'], [.40, 'speirling']];
for (const [cx, kind] of panels) {
  rect(cx - .17, -.285, cx + .17, -.075, .003);
  const s = .30, ox = cx - .15, oy = -.26;
  if (kind === 'chaparral') {
    poly([[0, .10], [.03, .15], [.30, .20], [.42, .31], [.56, .31], [.62, .21], [.93, .22], [.97, .12], [.97, .10], [0, .10]], ox, oy, s);
    rect(ox + .80 * s, oy + .22 * s, ox + .96 * s, oy + .33 * s, .003);                          // the rear fan boxes
    circle(ox + .20 * s, oy + .11 * s, .06 * s * 1.2, .0035); circle(ox + .82 * s, oy + .12 * s, .07 * s * 1.2, .0035);
    poly([[.88, .33], [.96, .38]], ox, oy, s); line(ox + .96 * s, oy + .38 * s, ox + .99 * s, oy + .30 * s);  // the high wing on struts
  } else if (kind === 'brabham') {
    poly([[0, .10], [.02, .15], [.36, .18], [.46, .27], [.54, .27], [.62, .20], [.80, .26], [.97, .25], [.98, .10], [0, .10]], ox, oy, s);
    rect(ox + .72 * s, oy + .25 * s, ox + .95 * s, oy + .33 * s, .003);                          // the fan housing on top of the engine
    poly([[.72, .29], [.95, .29]], ox, oy, s, false, .0025);
    circle(ox + .18 * s, oy + .105 * s, .065 * s * 1.2, .0035); circle(ox + .84 * s, oy + .115 * s, .07 * s * 1.2, .0035);
  } else {
    poly([[0, .10], [.05, .13], [.30, .16], [.46, .27], [.58, .27], [.66, .22], [.74, .25], [.97, .22], [.99, .10], [0, .10]], ox, oy, s);
    circle(ox + .78 * s, oy + .20 * s, .05 * s * 1.2, .0035, 0, Math.PI * 2, 18); circle(ox + .78 * s, oy + .20 * s, .03 * s * 1.2, .0025, 0, Math.PI * 2, 14);
    circle(ox + .19 * s, oy + .105 * s, .06 * s * 1.2, .0035); circle(ox + .80 * s, oy + .105 * s, .06 * s * 1.2, .0035);
  }
  for (let i = 0; i < (kind === 'chaparral' ? 3 : kind === 'brabham' ? 4 : 5); i++) line(cx - .15 + i * .016, -.295 - .004, cx - .15 + i * .016, -.31, .003);   // the year as tally bars
}
// The big drawing: the Spéirling in side view, plan view and the air's path.
const L = .5;                  // metres of paper per car: the car's 3.2 m at about 1:6.4
const sideOx = -.57, sideOy = -.55;
poly([[0, .06], [.04, .08], [.30, .12], [.44, .22], [.60, .22], [.68, .16], [.76, .20], [.97, .18], [.99, .06], [0, .06]], sideOx, sideOy, L * 1.0);
circle(sideOx + .20 * L, sideOy + .075 * L, .075 * L, .004); circle(sideOx + .80 * L, sideOy + .075 * L, .075 * L, .004);
poly([[.46, .22], [.50, .27], [.56, .27], [.62, .22]], sideOx, sideOy, L);
for (let i = 0; i < 12; i++) line(sideOx + (.05 + i * .08) * L, sideOy + .055 * L, sideOx + (.05 + i * .08) * L, sideOy + .035 * L, .003);   // the skirt's fringe
const planOx = 0, planOy = -.58;
poly([[0, .0], [.04, -.12], [.30, -.16], [.50, -.17], [.80, -.15], [.97, -.12], [.99, 0], [.97, .12], [.80, .15], [.50, .17], [.30, .16], [.04, .12], [0, .0]], planOx, planOy, L);
for (const sy of [-1, 1]) { circle(planOx + .80 * L, planOy + sy * .06 * L, .052 * L, .0035); circle(planOx + .80 * L, planOy + sy * .06 * L, .03 * L, .0025, 0, Math.PI * 2, 14); for (const wx of [.19, .80]) rect(planOx + (wx - .06) * L, planOy + sy * .17 * L - .018, planOx + (wx + .06) * L, planOy + sy * .17 * L + .018, .003); }
rect(planOx + .02 * L, planOy - .15 * L, planOx + .96 * L, planOy + .15 * L, .003);          // the skirt outline round the floor
// The air: arrows from the road under the skirt up into the fans, in both views.
for (const x of [.25, .45, .62]) arrow(sideOx + x * L, sideOy - .02, sideOx + x * L, sideOy + .035 * L);
arrow(sideOx + .70 * L, sideOy + .06 * L, sideOx + .78 * L, sideOy + .17 * L); arrow(sideOx + .86 * L, sideOy + .22 * L, sideOx + 1.03 * L, sideOy + .22 * L);
for (const y of [-.07, 0, .07]) arrow(planOx + .35 * L, planOy + y * L, planOx + .70 * L, planOy + y * L * .6);
// Dimension lines: length under the side view, width beside the plan view.
line(sideOx, sideOy - .06, sideOx + L, sideOy - .06, .003); line(sideOx, sideOy - .075, sideOx, sideOy - .045, .003); line(sideOx + L, sideOy - .075, sideOx + L, sideOy - .045, .003);
line(planOx + L + .035, planOy - .15 * L, planOx + L + .035, planOy + .15 * L, .003); for (const y of [-.15, .15]) line(planOx + L + .025, planOy + y * L, planOx + L + .045, planOy + y * L, .003);
// A grid of faint ticks at the lower left for scale.
for (let i = 0; i < 12; i++) line(-W / 2 + .06 + i * .03, -H + .06, -W / 2 + .06 + i * .03, -H + .06 + (i % 5 === 0 ? .03 : .018), .0025);
const lines = new THREE.BufferGeometry(), positions = [], indices = [];
lineGeometry.forEach((quad, i) => { positions.push(...quad.flat()); const a = i * 4; indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); });
lines.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); lines.setIndex(indices); lines.computeVertexNormals();
const flipUp = lines.attributes.normal; for (let i = 0; i < flipUp.count; i++) if (flipUp.getZ(i) < 0) { for (let k = 0; k < indices.length; k += 3) { const t = indices[k + 1]; indices[k + 1] = indices[k + 2]; indices[k + 2] = t; } lines.setIndex(indices); lines.computeVertexNormals(); break; }
sheet.add('solid', lines, [0, 0, 0], [0, 0, 0], [1, 1, 1], (p) => INK.clone().multiplyScalar(.82 + noise(p.x * 60, p.y * 60, 0, 5) * .3));

// Four red pins at the corners, a strip of yellowed tape on the curling corner and a coffee ring.
const random = rng(77);
for (const [x, y] of [[-W / 2 + .05, -.05], [W / 2 - .05, -.05], [-W / 2 + .05, -H + .2], [W / 2 - .09, -.45]]) {
  const z = curl(x, y) + .004;
  sheet.add('solid', new THREE.SphereGeometry(.014, 10, 8), [x, y, z + .012], [0, 0, 0], [1, 1, .8], () => C(0xb02a22));
  sheet.add('solid', new THREE.CylinderGeometry(.002, .002, .02, 5).rotateX(Math.PI / 2), [x, y, z + .004], [0, 0, 0], [1, 1, 1], () => C(0x8a8d90));
}
sheet.add('solid', new THREE.BoxGeometry(.12, .035, .002), [W / 2 - .12, -H + .24, curl(W / 2 - .12, -H + .24) + .007], [0, 0, .2], [1, 1, 1], () => C(0xcfc08a));
sheet.add('solid', new THREE.TorusGeometry(.045, .004, 4, 28), [-.28, -.74, curl(-.28, -.74) + .005], [0, 0, 0], [1, 1, 1], () => C(0x6a4a2a).multiplyScalar(.9 + random() * .1));

const mesh = partMesh(sheet), group = new THREE.Group(); group.name = 'project-fan'; group.add(mesh);
const buffer = Buffer.from(await new GLTFExporter().parseAsync(group, { binary: true }));
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, 'project-fan.glb'), buffer);
const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
const manifest = { formatVersion: 1, source: 'tools/art/speirling-blueprint.mjs', coordinates: 'metres; the sheet faces +Z with its top-centre edge at the origin, so a viewer pins it to a wall at that point', models: [{ id: 'project-fan', path: 'assets/models/speirling/project-fan.glb', bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'), triangles: triangleCount(sheet), dimensionsMetres: [size.x, size.y, size.z].map(v => Math.round(v * 1000) / 1000) }] };
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`project-fan: ${buffer.length} bytes, ${manifest.models[0].triangles} triangles`);
