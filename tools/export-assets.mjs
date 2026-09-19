// Deterministic GLB export without a browser or Blender installation.
// Run: node tools/export-assets.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { createVehicle } from '../src/vehicles.js';

// GLTFExporter uses the browser FileReader API to assemble its binary container.
globalThis.FileReader ??= class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }, error => this.onerror?.(error));
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then(buffer => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(buffer).toString('base64')}`;
      this.onloadend?.();
    }, error => this.onerror?.(error));
  }
};

const out = new URL('../public/assets/models/', import.meta.url);
await mkdir(out, { recursive: true });
const car = createVehicle();
car.name = 'Cinder GT';
car.userData.wheelPivots.forEach((pivot, i) => { pivot.name = `WheelPivot_${i}_${pivot.userData.front ? 'front' : 'rear'}`; });
car.userData.wheels.forEach((wheel, i) => { wheel.name = `Wheel_${i}`; });
car.userData.brakeLights.forEach((light, i) => { light.name = `BrakeLight_${i}`; });
car.traverse(object => { object.userData = {}; });
car.userData = { asset: 'Cinder GT original sports coupe', forward: '+Z', up: '+Y', unit: 'metre', source: 'src/vehicles.js' };

const station = new THREE.Group();
station.name = 'Mojave service station';
const materials = {
  stucco: new THREE.MeshStandardMaterial({ color: 0xc5b48f, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x988c76, roughness: 0.95 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x953e27, roughness: 0.77, metalness: 0.25 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x29312f, roughness: 0.6, metalness: 0.2 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x273a3b, metalness: 0.6, roughness: 0.15, clearcoat: 1 }),
  light: new THREE.MeshStandardMaterial({ color: 0xffdb9c, emissive: 0xffbf60, emissiveIntensity: 1.2 }),
};
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function box(name, mat, size, position, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(unitBox, materials[mat]);
  mesh.name = name;
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  station.add(mesh);
  return mesh;
}
box('Concrete apron', 'concrete', [17, .18, 13], [0, -.09, 0]);
box('Cream stucco building', 'stucco', [11, 3.4, 5], [0, 1.7, -3]);
box('Rust red roof parapet', 'rust', [11.35, .34, 5.35], [0, 3.4, -3]);
box('Roof coping', 'concrete', [11.45, .09, 5.45], [0, 3.62, -3]);
box('Tinted storefront glazing', 'glass', [6.8, 2.46, .075], [-.8, 1.42, -.46]);
for (const x of [-4.2, -2.7, -1.2, .3, 1.8, 2.6]) box('Storefront mullion', 'trim', [.065, 2.5, .11], [x, 1.42, -.405]);
box('Window transom', 'trim', [6.9, .075, .12], [-.8, 2.45, -.4]);
box('Window sill', 'concrete', [7.1, .13, .23], [-.8, .21, -.37]);
box('Shop door', 'trim', [1.28, 2.38, .1], [4.1, 1.27, -.425]);
box('Door window', 'glass', [1.06, 1.37, .02], [4.1, 1.72, -.36]);
box('Door handle', 'concrete', [.04, .25, .06], [4.55, 1.06, -.33]);
box('Faded red fascia stripe', 'rust', [11.05, .26, .1], [0, 2.96, -.43]);
box('Pump canopy outer', 'rust', [12.5, .29, 5.6], [0, 3.43, 2.6]);
box('Canopy cream soffit', 'stucco', [12.28, .075, 5.4], [0, 3.255, 2.6]);
box('Canopy top lip', 'concrete', [12.56, .07, 5.66], [0, 3.6, 2.6]);
for (const side of [-1, 1]) {
  box('Canopy steel post', 'rust', [.21, 3.27, .21], [side * 5.3, 1.63, 4.9]);
  box('Post base', 'concrete', [.37, .35, .37], [side * 5.3, .175, 4.9]);
  box('Pump island', 'concrete', [2.15, .16, 1.45], [side * 3.15, .08, 2.45]);
  box('Vintage fuel pump pedestal', 'rust', [.72, 1, .57], [side * 3.15, .68, 2.45]);
  box('Pump upper cream shell', 'stucco', [.89, .95, .65], [side * 3.15, 1.58, 2.45]);
  box('Pump display bezel', 'trim', [.6, .3, .026], [side * 3.15, 1.72, 2.79]);
  for (let digit = 0; digit < 4; digit++) box('Backlit meter digit', 'light', [.064, .1, .01], [side * 3.15 - .16 + digit * .107, 1.72, 2.811]);
  box('Pump red brand stripe', 'rust', [.905, .11, .018], [side * 3.15, 1.25, 2.79]);
  box('Fuel nozzle', 'trim', [.055, .39, .11], [side * 3.15 + .49, 1.39, 2.53]);
  const hoseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 3.15 + .43, 1.8, 2.39),
    new THREE.Vector3(side * 3.15 + .71, 1.32, 2.39),
    new THREE.Vector3(side * 3.15 + .64, .42, 2.45),
    new THREE.Vector3(side * 3.15 + .48, 1.2, 2.53),
  ]);
  const hose = new THREE.Mesh(new THREE.TubeGeometry(hoseCurve, 14, .025, 6, false), materials.trim);
  hose.name = 'Flexible fuel hose'; station.add(hose);
  for (const light of [-1, 1]) box('Canopy light fixture', 'light', [.2, .03, .95], [side * 3.3, 3.2, 2.5 + light * 1.3]);
}
// Surface wear comes from geometry patches, leaving the model fully editable.
for (let patch = 0; patch < 17; patch++) {
  const x = Math.sin(patch * 19.73) * 5.95;
  box('Chipped canopy paint', 'stucco', [.08 + (patch % 4) * .11, .04 + (patch % 3) * .025, .005], [x, 3.41 + Math.sin(patch * 8.9) * .08, 5.403]);
}
station.userData = { asset: 'Mojave modular roadside service station', forward: '+Z', up: '+Y', unit: 'metre', source: 'tools/export-assets.mjs' };

const exporter = new GLTFExporter();
for (const [name, object] of [['cinder-gt.glb', car], ['desert-service-station.glb', station]]) {
  object.updateMatrixWorld(true);
  const buffer = await exporter.parseAsync(object, { binary: true, onlyVisible: true });
  await writeFile(new URL(name, out), Buffer.from(buffer));
  console.log(`Exported ${name}: ${buffer.byteLength.toLocaleString()} bytes`);
}
