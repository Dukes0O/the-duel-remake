// LAB-ART: writes the Lab's models as GLBs under public/assets/models/lab/ from
// the recipes in lab-hangar.mjs (the room) and lab-benches.mjs (one model per
// bench), with a manifest that also holds where each bench stands in the hangar
// and each animatable part's pivot. Seeded, so the same command gives the same bytes.
//
//   node tools/art/lab-props.mjs                 write the models and the manifest
//   node tools/art/lab-props.mjs --out <dir>     write them to <dir> (inside .qa-dist/)
//   node tools/art/lab-props.mjs --review <dir>  also write review GLBs under <dir>
//                                                (inside .evidence/): each model, plus
//                                                `layout.glb` (the whole Lab, roof cut
//                                                away) and `layout-closed.glb`
//
// Each model is one glTF scene: a group named for the model with one mesh per
// part (a part has up to three materials: solid, glass, lamps). Part meshes sit at
// their pivot, so a viewer can spin a fan or swing a cord by turning that node.
// Metres, Y up, the model's origin on the floor, +Z facing the player.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { partMesh, triangleCount } from './lab-kit.mjs';
import { HALL, HANGAR_LAYOUT, HANGAR_SWEEP, hangar } from './lab-hangar.mjs';
import { BENCHES1 } from './lab-benches.mjs';
import { BENCHES2 } from './lab-benches2.mjs';
import { BENCHES3 } from './lab-benches3.mjs';

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }, error => this.onerror?.(error)); }
};
const root = fileURLToPath(new URL('../../', import.meta.url));
const argValue = name => process.argv.includes(name) ? resolve(process.argv[process.argv.indexOf(name) + 1]) : null;
const publicDir = resolve(root, 'public/assets/models/lab');
const outDir = argValue('--out') ?? publicDir;
const reviewDir = argValue('--review');
if (outDir !== publicDir && relative(resolve(root, '.qa-dist'), outDir).startsWith('..')) throw new Error('--out goes under .qa-dist/.');
if (reviewDir && relative(resolve(root, '.evidence'), reviewDir).startsWith('..')) throw new Error('Review GLBs go under .evidence/.');

export const MODELS = { hangar: opts => hangar(opts), ...BENCHES1, ...BENCHES2, ...BENCHES3 };
const build = (id, opts) => {
  const group = new THREE.Group(); group.name = id;
  const parts = MODELS[id](opts);
  for (const part of parts) { const mesh = partMesh(part); if (mesh) group.add(mesh); }
  return { group, parts };
};
async function glb(object) { return Buffer.from(await new GLTFExporter().parseAsync(object, { binary: true })); }
async function write(path, buffer) { await mkdir(dirname(path), { recursive: true }); await writeFile(path, buffer); }

const manifest = { formatVersion: 1, source: 'tools/art/lab-props.mjs', coordinates: 'metres; glTF Y up; each model\'s origin on the floor, +Z facing the player; the hangar\'s open door is on its +Z side; part pivots are node positions', hall: HALL, layout: HANGAR_LAYOUT, sweepRadius: HANGAR_SWEEP, models: [] };
const built = {};
let totalBytes = 0;
for (const id of Object.keys(MODELS)) {
  const { group, parts } = build(id); built[id] = group;
  const buffer = await glb(group);
  await write(resolve(outDir, `${id}.glb`), buffer);
  if (reviewDir) await write(resolve(reviewDir, `${id}.glb`), buffer);
  const box = new THREE.Box3().setFromObject(group), size = box.getSize(new THREE.Vector3());
  totalBytes += buffer.length;
  manifest.models.push({ id, path: `assets/models/lab/${id}.glb`, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex'),
    triangles: parts.reduce((sum, part) => sum + triangleCount(part), 0),
    dimensionsMetres: [size.x, size.y, size.z].map(v => Math.round(v * 1000) / 1000),
    footprint: { minX: Math.round(box.min.x * 1000) / 1000, maxX: Math.round(box.max.x * 1000) / 1000, minZ: Math.round(box.min.z * 1000) / 1000, maxZ: Math.round(box.max.z * 1000) / 1000 },
    parts: parts.map(part => ({ name: part.name, pivot: part.pivot })) });
  console.log(`${id}: ${buffer.length} bytes, ${manifest.models.at(-1).triangles} triangles`);
}
manifest.totalBytes = totalBytes;
await write(resolve(outDir, 'manifest.json'), Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
console.log(`total ${totalBytes} bytes`);

if (reviewDir) {
  // The whole Lab, benches in place; the cutaway leaves off the roof and the front wall so a camera can look in.
  for (const closed of [false, true]) {
    const scene = new THREE.Group(); scene.name = 'lab';
    const room = build('hangar', { roof: closed }).group;
    scene.add(room);
    for (const [id, at] of Object.entries(HANGAR_LAYOUT)) {
      if (!built[id]) continue;
      const bench = build(id).group; bench.position.set(at.x, 0, at.z); bench.rotation.y = at.yaw; scene.add(bench);
    }
    await write(resolve(reviewDir, closed ? 'layout-closed.glb' : 'layout.glb'), await glb(scene));
  }
}
