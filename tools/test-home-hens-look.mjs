// HOME-GROUND-LOOK-1: Home Ground's hens, crate nest box, tin coop and egg, checked with no graphics. Each named part exists and
// stays within its budget, the sizes are a real hen's, nest box's, coop's and egg's, the poses are the same for the same moment, the
// look is behind the switch home-ground and no game file uses it yet, and every string the look scenario sends to the page parses.
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {join} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {HOME_COOP_SIZE, HOME_EGG_SIZE, HOME_HEN_HEIGHT, HOME_HEN_POSES, HOME_HENS_BUDGET, HOME_HENS_LAYOUT, HOME_HENS_PARTS,
  HOME_HENS_STAGES, HOME_NEST_SIZE, buildHomeHens, createEgg, createHen, createNestBox, createTinCoop, partCost}
  from '../src/world/open/looks/home-hens-look.js';
import {PICTURES, pageSources, views} from './scenarios/look-home-hens.mjs';

const root = new URL('../', import.meta.url);

// The wildlife line's chicken, read with its pictures left out (Node has no image decoder).
async function chicken() {
  const bytes = await readFile(new URL('public/assets/wildlife/chicken.glb', root));
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.toString('utf8', 20, 20 + length));
  const strip = value => { if (!value || typeof value !== 'object') return; for (const key of Object.keys(value)) if (/Texture$/.test(key)) delete value[key]; else strip(value[key]); };
  strip(json.materials); delete json.images; delete json.textures; delete json.samplers;
  const encoded = Buffer.from(JSON.stringify(json)), padded = Math.ceil(encoded.length / 4) * 4;
  const binary = bytes.subarray(20 + length), result = Buffer.alloc(20 + padded + binary.length, 0x20);
  result.writeUInt32LE(0x46546c67, 0); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(padded, 12); result.writeUInt32LE(0x4e4f534a, 16);
  encoded.copy(result, 20); binary.copy(result, 20 + padded);
  return new GLTFLoader().parseAsync(result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength), '');
}
const model = await chicken();
const within = (cost, budget, what) => {
  assert.ok(cost.draws <= budget.draws, `${what}: ${cost.draws} draws is over ${budget.draws}`);
  assert.ok(cost.triangles <= budget.triangles, `${what}: ${cost.triangles} triangles is over ${budget.triangles}`);
};
const boxOf = object => { object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(object, true); };

// ---- Each named part, alone, within its budget. -----------------------------------------------------------------------------
const hen = createHen(model), nest = createNestBox(), coop = createTinCoop(), egg = createEgg();
for (const [key, part] of Object.entries({hen: hen.object, nestBox: nest, coop, egg})) {
  assert.equal(part.name, HOME_HENS_PARTS[key].name, `the ${key} is named ${HOME_HENS_PARTS[key].name}`);
  within(partCost(part), HOME_HENS_PARTS[key], HOME_HENS_PARTS[key].name);
  let meshes = 0;
  part.traverse(node => { if (node.isMesh) { meshes++; for (const value of node.geometry.attributes.position.array) assert.ok(Number.isFinite(value), `${node.name} has a point that is not a number`); } });
  assert.ok(meshes > 0, `${part.name} draws something`);
}

// ---- Sizes. ------------------------------------------------------------------------------------------------------------------
// A hen standing is about 40 cm tall, her feet on the ground; sitting she is lower.
hen.setPose('stand'); hen.update(0);
let box = boxOf(hen.object);
assert.ok(box.max.y >= HOME_HEN_HEIGHT.least && box.max.y <= HOME_HEN_HEIGHT.most, `a standing hen is ${box.max.y.toFixed(3)} m tall`);
assert.ok(Math.abs(box.min.y) < .025, `her feet are on the ground (${box.min.y.toFixed(3)} m)`);
hen.setPose('sit'); hen.update(0);
assert.ok(boxOf(hen.object).max.y < box.max.y - .08, 'a sitting hen is lower than a standing one');
assert.throws(() => hen.setPose('fly'), RangeError);
// Her leg band rides on her left shank.
const band = hen.object.getObjectByName('home-hen-band');
assert.ok(band && /shank/.test(band.parent.name), 'the leg band is on a shank');
hen.setBand('red'); assert.equal(band.material.color.getHex(), 0xc8281e, 'the band\'s colour can be changed');

const {width, height, depth, lift} = HOME_NEST_SIZE;
box = boxOf(nest.getObjectByName('home-nest-box-crate'));
assert.ok(Math.abs(box.max.x - box.min.x - width) < .05 && Math.abs(box.max.y - (lift + height)) < .03, 'the nest box is a crate on blocks');
assert.equal(nest.userData.egg.visible, false, 'an empty box shows no egg');
nest.userData.setEgg(true);
assert.ok(nest.userData.egg.visible, 'a laid egg shows');
const eggAt = nest.userData.egg.position;
assert.ok(Math.abs(eggAt.x) < width / 2 && Math.abs(eggAt.z) < depth / 2 && eggAt.y > lift && eggAt.y < lift + .15, 'the egg lies in the straw');

box = boxOf(coop);
assert.ok(Math.abs(box.max.x - box.min.x - HOME_COOP_SIZE.length) < .45, `the coop is ${(box.max.x - box.min.x).toFixed(2)} m long`);
assert.ok(box.max.y > HOME_COOP_SIZE.ridge && box.max.y < HOME_COOP_SIZE.ridge + .12, `the coop is ${box.max.y.toFixed(2)} m to the ridge`);
assert.ok(box.min.y > -.01, 'nothing of the coop lies under the ground');

box = boxOf(egg);
assert.ok(Math.abs(box.max.x - box.min.x - HOME_EGG_SIZE.length) < .004 && Math.abs(box.max.y - box.min.y - HOME_EGG_SIZE.width) < .004, 'a large hen\'s egg');
assert.equal(egg.userData.rest, HOME_EGG_SIZE.width / 2, 'an egg set down rests on its side');

// ---- The stand's scene, each stage, within the budget, and the same for the same moment. ---------------------------------------
assert.throws(() => buildHomeHens({stage: 'night', model}), RangeError);
for (const stage of HOME_HENS_STAGES) {
  const group = buildHomeHens({stage, model, heightAt: (x, z) => .01 * x - .005 * z});
  const cost = partCost(group);
  within(cost, HOME_HENS_BUDGET, stage);
  assert.equal(group.userData.draws, cost.draws, 'the group counts its own draws');
  const [a, b] = group.userData.hens;
  const pose = () => [a, b].flatMap(one => Object.values(one.bones).map(bone => bone.quaternion.toArray().map(value => value.toFixed(6)).join())).join('|');
  group.userData.update(3.1); const first = pose();
  group.userData.update(5.7); assert.notEqual(pose(), first, 'the hens move with the seconds');
  group.userData.update(3.1); assert.equal(pose(), first, 'the same seconds give the same pose');
  assert.equal(b.pose, stage === 'laid' ? 'peck' : 'sit', 'hen B sits until she has laid');
  assert.equal(group.userData.eggs.every(one => one.visible), stage === 'laid', 'the eggs show once she has laid');
  for (const one of group.userData.hens) assert.ok(Math.hypot(one.object.position.x, one.object.position.z) < HOME_HENS_LAYOUT.radius, 'each hen is on the stand');
  group.userData.dispose();
}
for (const pose of HOME_HEN_POSES) { hen.setPose(pose); hen.update(1.3); }

// ---- Behind the switch, and no rule or save uses it yet. -------------------------------------------------------------------
const stand = await readFile(new URL('tools/open-look-stand.js', root), 'utf8');
assert.match(stand, /'home-hens'[\s\S]*?flag: 'home-ground'/, 'the look stand shows the hens only with the switch home-ground');
async function sources(dir) {
  const found = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await sources(path)); else if (/\.m?js$/.test(entry.name)) found.push(path);
  }
  return found;
}
for (const file of await sources(new URL('src/', root).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  if (file.endsWith('home-hens-look.js')) continue;
  assert.ok(!(await readFile(file, 'utf8')).includes('home-hens-look'), `${file} uses the hens' look before step 2`);
}

// ---- The scenario's pictures and what it sends to the page. -------------------------------------------------------------------
assert.deepEqual(PICTURES.filter(picture => !picture.extra).map(picture => picture.name).sort(),
  ['coop-day', 'coop-dusk', 'egg-in-box', 'hen-far', 'hen-near', 'nest-sit'], 'the card\'s pictures');
const all = views(), henA = all['hen-far'];
assert.ok(Math.abs(Math.hypot(henA.eye.x - henA.look.x, henA.eye.z - henA.look.z) - 10) < .1, 'hen-far is taken from 10 m');
assert.ok(Math.abs(Math.hypot(all['hen-near'].eye.x - all['hen-near'].look.x, all['hen-near'].eye.z - all['hen-near'].look.z) - 2) < .1, 'hen-near is taken from 2 m');
for (const source of pageSources()) assert.doesNotThrow(() => new Function(`return ${source}`));
console.log('home hens look: parts, sizes, poses, budgets, switch and scenario strings checked');
