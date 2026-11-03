// Export one earned car's runtime model for the outline round review (EARN-OUTLINE).
// Usage: node tools/art/earned-export.mjs <ferrari_enzo|mclaren_f1|bugatti_bolide> <lane .evidence folder>
// Writes <key>.glb (for tools/art/skyline-review.py) and <key>-tris.bin (every visible
// triangle in metres, for tools/art/earned-outline-fit.py).
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createVehicleAssets } from '../../src/vehicle-assets.js';

const [key, folder] = process.argv.slice(2);
const target = resolve(folder ?? '');
if (!folder || relative(resolve('.evidence'), target).startsWith('..')) throw Error('Review output belongs under lane .evidence.');
const vehicle = createVehicleAssets().create(key);
if (vehicle?.userData.vehicleSource !== 'earned') throw Error('Not an earned car: ' + key);
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const hidden = [];
vehicle.traverse(node => { if (!node.visible) hidden.push(node); });
for (const node of hidden) node.parent?.remove(node);
vehicle.updateMatrixWorld(true);
const tris = [];
vehicle.traverseVisible(mesh => {
  if (!mesh.isMesh || mesh === vehicle.userData.contactShadow) return;
  const p = mesh.geometry.attributes.position, index = mesh.geometry.index, e = mesh.matrixWorld.elements;
  for (let i = 0, n = index ? index.count : p.count; i < n; i++) {
    const k = index ? index.getX(i) : i, x = p.getX(k), y = p.getY(k), z = p.getZ(k);
    tris.push(e[0]*x + e[4]*y + e[8]*z + e[12], e[1]*x + e[5]*y + e[9]*z + e[13], e[2]*x + e[6]*y + e[10]*z + e[14]);
  }
});
await mkdir(target, { recursive: true });
await writeFile(join(target, key + '-tris.bin'), Buffer.from(new Float32Array(tris).buffer));
const glb = await new GLTFExporter().parseAsync(vehicle, { binary: true });
await writeFile(join(target, key + '.glb'), Buffer.from(glb));
console.log(key, tris.length / 9, 'triangles ->', target);
