// Source adapter for sirena-wreck.py. Keep the game's actual panel geometry and
// spin/steer hierarchy; omit the renderer's driver, hidden effects and damage
// bookkeeping. This is a build tool, never imported by the game.
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, resolve, relative} from 'node:path';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createSirenaVehicle} from '../../src/sirena-vehicle.js';

globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); });
  }
};
const target = resolve(process.argv[2] ?? '.qa-dist/sirena-wreck/source.glb');
if (relative(resolve('.qa-dist'), target).startsWith('..')) throw Error('Source goes under .qa-dist/.');
const car = createSirenaVehicle();
const omitted = [];
car.traverse(node => {
  if (!node.visible || node.name === 'Helmeted racing driver') omitted.push(node);
});
for (const node of omitted) node.removeFromParent();
car.userData.wheelPivots.forEach((pivot, i) => {
  pivot.name = ['steer-front-left', 'steer-front-right', 'steer-rear-left', 'steer-rear-right'][i];
  car.userData.wheels[i].name = ['spin-front-left', 'spin-front-right', 'spin-rear-left', 'spin-rear-right'][i];
});
car.traverse(node => { node.userData = {}; });
car.updateMatrixWorld(true);
const bytes = await new GLTFExporter().parseAsync(car, {binary: true});
await mkdir(dirname(target), {recursive: true});
await writeFile(target, Buffer.from(bytes));
console.log(`Sirena source: ${bytes.byteLength} bytes -> ${target}`);
