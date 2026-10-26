import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRankPaint, RANK_PAINTS} from '../src/heli/heli-rank-paint.js';

// Use the real Three material/geometry types: this guards the paint being
// visible on the model, its lazy loading and the return to existing colours.
const original = new THREE.MeshPhysicalMaterial({color: 0x283654, roughness: .32, clearcoat: .6});
original.name = 'paint_navy';
const glass = new THREE.MeshStandardMaterial({color: 0x667788});
glass.name = 'glass';
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.Float32BufferAttribute([.5, 1.2, .7, .6, 1.3, .8, .7, 1.4, .9], 3));
const mesh = new THREE.Mesh(geometry, [original, glass]);
const model = new THREE.Group(); model.add(mesh);
const pending = new Map(), loaded = [];
const paint = createRankPaint({THREE, loadTexture: url => {
  loaded.push(url); return new Promise(resolve => pending.set(url, resolve));
}});
paint.attach(model);
paint.update('stock');
assert.equal(loaded.length, 0, 'stock does not request rank textures');
paint.update('rank-student');
paint.update('rank-private');
const student = new THREE.Texture(), privatePaint = new THREE.Texture();
pending.get('/assets/heli/skins/rank-student.png')(student);
await new Promise(resolve => setImmediate(resolve));
assert.equal(original.map, null, 'late previous paint cannot replace the selected paint');
pending.get('/assets/heli/skins/rank-private.png')(privatePaint);
await new Promise(resolve => setImmediate(resolve));
assert.equal(original.map, privatePaint);
assert.equal(privatePaint.colorSpace, THREE.SRGBColorSpace);
assert.equal(original.roughness, .24, 'private paint has a gloss finish');
assert.ok(Math.abs(geometry.attributes.uv.getX(0) - (6.8 + .7) / 9.5) < 1e-6);
assert.equal(glass.map, null, 'glass is never painted');
assert.equal(glass.color.getHex(), 0x667788);
paint.update('fire');
assert.equal(original.map, null, 'mission colours return to their existing model material');
assert.equal(original.color.getHex(), 0x283654);
assert.equal(original.roughness, .32);
paint.update('rank-private');
await new Promise(resolve => setImmediate(resolve));
assert.equal(loaded.length, 2, 'previously loaded paints are reused');
assert.equal(original.map, privatePaint);
assert.equal(RANK_PAINTS.length, 5);
paint.dispose();
console.log('heli-rank-paint: lazy texture loading, selection races, projection, glass and restoration pass');
