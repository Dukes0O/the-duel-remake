// Export the actual preloaded runtime factory for the Skyline shape review.
// Usage: node tools/art/skyline-export.mjs <lane .evidence output.glb> [paint id]
// The paint id is one of SKYLINE_PAINTS (factory, skyline_white, skyline_silver, skyline_black).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { loadSkylineVehicle, SKYLINE_MODEL_URL, SKYLINE_PAINTS } from '../../src/skyline-vehicle.js';
import { applyVehiclePaint } from '../../src/vehicle-paint.js';

const target = resolve(process.argv[2]);
if (relative(resolve('.evidence'), target).startsWith('..')) throw Error('Review output belongs under lane .evidence.');
const bytes = await readFile(new URL('../../public' + SKYLINE_MODEL_URL, import.meta.url));
const create = await loadSkylineVehicle({loadAsset: () => new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')});
const vehicle = create();
const paintId = process.argv[3];
if (paintId) {
  if (!SKYLINE_PAINTS[paintId]) throw Error('Unknown paint ' + paintId);
  applyVehiclePaint(vehicle, paintId === 'factory' ? null : SKYLINE_PAINTS[paintId]);
}
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const hidden = [];
vehicle.traverse(node => { if (!node.visible) hidden.push(node); });
for (const node of hidden) node.parent?.remove(node);
vehicle.updateMatrixWorld(true);
const glb = await new GLTFExporter().parseAsync(vehicle, {binary:true});
await mkdir(dirname(target), {recursive:true});
await writeFile(target, Buffer.from(glb));
console.log('Runtime Skyline review export:', target);
