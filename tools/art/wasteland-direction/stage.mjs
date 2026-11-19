// Export the game's actual meshes for the offline light study. Run from the repo root.
import {mkdir, writeFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createTinTownGate, TIN_TOWN_GATE} from '../../../src/world/tin-town-gate.js';
import {createTinTownShacks} from '../../../src/world/tin-town-shacks.js';
import {scablandsSurfaceHeightAt} from '../../../src/world/scablands-ground.js';

const out = process.argv[2];
if (!out) throw new Error('Pass the evidence directory as the first argument.');
await mkdir(out, {recursive: true});
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(data => { this.result = data; this.onloadend?.(); }, error => this.onerror?.(error));
  }
};

const gate = createTinTownGate({ground: scablandsSurfaceHeightAt(TIN_TOWN_GATE.x, TIN_TOWN_GATE.z)});
const shacks = createTinTownShacks();
const stage = new THREE.Group();
stage.position.copy(gate.position).multiplyScalar(-1);
stage.add(gate, shacks);
// WebGL's material callbacks and sign canvas are renderer-specific. The mesh
// and material factors export directly. The render recipe reconstructs the sign.
stage.traverse(node => { node.userData = {}; });
const bytes = await new GLTFExporter().parseAsync(stage, {binary: true});
await writeFile(out + '/gate.glb', new Uint8Array(bytes));
