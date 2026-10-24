// Exports a code-built car to a GLB for a Blender look review (EARN-CAR-3 and
// later earned cars). The game's own builder is the source; the GLB is review
// evidence only and goes under .evidence/, never public/. Usage:
//   node tools/art/car-review-export.mjs <module under src/> <factory> <out.glb>
// e.g. node tools/art/car-review-export.mjs bolide-vehicle.js createBolideVehicle .evidence/2026-10-15/EARN-CAR-3/bolide.glb
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(buffer => { this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`; this.onloadend?.(); }, error => this.onerror?.(error)); }
};

const [moduleName, factory, out] = process.argv.slice(2);
if (!moduleName || !factory || !out) throw new Error('Usage: car-review-export.mjs <module> <factory> <out.glb>');
const root = fileURLToPath(new URL('..', new URL('..', import.meta.url)));
const target = resolve(out);
if (relative(resolve(root, '.evidence'), target).startsWith('..')) throw new Error('The review GLB goes under .evidence/.');
const builder = (await import(pathToFileURL(resolve(root, 'src', moduleName)).href))[factory];
if (typeof builder !== 'function') throw new Error(`${moduleName} has no ${factory}.`);
const vehicle = builder();
// Hidden parts (boost flames, wreck pieces) stay out of the review.
const hidden = [];
vehicle.traverse(node => { if (node.visible === false) hidden.push(node); });
for (const node of hidden) node.parent?.remove(node);
vehicle.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(vehicle, { binary: true });
await mkdir(dirname(target), { recursive: true });
await writeFile(target, Buffer.from(glb));
console.log(`${target} ${Buffer.byteLength(Buffer.from(glb))} bytes`);
