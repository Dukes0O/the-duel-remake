// Drawing H2 Fire (docs/HELI_FIRE.md sections 6.1, 8.4, 9 and 14): the fire's
// sprites and their caps, the bucket model and the aim ring, the fire line on
// the instruments, and the burnt course's look on the drawn pines. Headless:
// the real models are parsed from public/, the atlas is a stand-in texture.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createFireView, FIRE_SPRITE_LIMITS, FIRE_BUCKET_URL} from '../src/heli/heli-fire-view.js';
import {createBurntLook, BURNT_LOOK, cellStages, lookSignature} from '../src/burnt-look.js';
import {fireLineMarkup, instrumentsMarkup, noticeText} from '../src/heli/heli-ui.js';
import {createHeliView} from '../src/heli/heli-scene.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (a, b, label) => { assert.deepEqual(a, b, label); checks++; };
const wait = async test => { for (let i = 0; i < 60 && !test(); i++) await new Promise(resolve => setTimeout(resolve, 25)); };
const parseFile = path => {
  const bytes = readFileSync(new URL('../public' + path, import.meta.url));
  return new Promise((resolve, reject) => new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '',
    gltf => resolve(gltf.scene), reject));
};
const table = JSON.parse(readFileSync(new URL('../public/assets/heli/fire-fx.json', import.meta.url), 'utf8'));
const load = {model: parseFile, texture: () => Promise.resolve(new THREE.Texture()), table: () => Promise.resolve(table)};

// The bucket model's contract (docs/board/looks/fire-bucket/round-3-review.md).
{
  const bytes = readFileSync(new URL('../public' + FIRE_BUCKET_URL, import.meta.url));
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  for (const name of ['bucket', 'rigging', 'valve', 'water', 'bucket_dented'])
    ok(gltf.nodes.some(node => node.name === name), `the bucket has its ${name} node`);
}

const cell = (i, j, percent) => ({cell: (i + 512) * 1024 + (j + 512), x: (i + .5) * 20, z: (j + .5) * 20, y: 10, percent});
const fireView = (burning, extra = {}) => ({heli: {x: 0, y: 80, z: 0}, courseId: 'tremblant-woods', bucket: null,
  fire: {call: {kind: 'fire', id: 'fire-1', courseId: 'tremblant-woods', day: 1, answered: true}, courseId: 'tremblant-woods',
    courseName: 'Tremblant Woods', shareOut: 40, cells: burning.length, burning, burnt: [],
    wind: {name: 'NW', speed: 7, kind: 'windy', toward: {x: .7, z: -.7}}, target: {x: 30, z: 40, distance: 800, bearing: 45}, answerLeft: 0}, ...extra});

// Sprites: nothing loads before a fire or bucket shows; the caps hold.
{
  const scene = new THREE.Scene(), view = createFireView({THREE, scene, load});
  view.update({heli: {x: 0, y: 30, z: 0}, courseId: 'tremblant-woods'});
  eq(view.artStatus, 'idle', 'no fire, no download');
  const big = Array.from({length: 60}, (_, k) => cell(k % 10, Math.floor(k / 10), 100 - k));
  view.update(fireView(big));
  await wait(() => view.artStatus === 'ready');
  eq(view.artStatus, 'ready', 'the atlas loads with the first fire');
  view.update(fireView(big), {dt: 1 / 60});
  ok(view.spriteCount > 100 && view.spriteCount <= FIRE_SPRITE_LIMITS.high, `a 60-cell fire on High: ${view.spriteCount} sprites, at most 400`);
  view.setQuality('performance');
  view.update(fireView(big), {dt: 1 / 60});
  ok(view.spriteCount <= FIRE_SPRITE_LIMITS.performance, `on Performance at most 200 (${view.spriteCount})`);
  view.setQuality('high');
  const small = createFireView({THREE, scene, load});
  small.update(fireView([cell(0, 0, 25)])); await wait(() => small.artStatus === 'ready');
  small.update(fireView([cell(0, 0, 25)]));
  ok(small.spriteCount >= 2 && small.spriteCount < 10, `a fresh one-cell fire is a few sprites (${small.spriteCount})`);
  small.update(fireView([cell(0, 0, 25)], {courseId: 'tremblant-snow'}));
  eq(small.spriteCount, 0, 'a fire on another course is not drawn here');
  // Same view, same frame: the drawing is the same.
  const a = createFireView({THREE, scene, load}), b = createFireView({THREE, scene, load});
  a.update(fireView(big)); b.update(fireView(big)); await wait(() => a.artStatus === 'ready' && b.artStatus === 'ready');
  a.update(fireView(big), {dt: .5}); b.update(fireView(big), {dt: .5});
  eq(Array.from(a.group.children[0].geometry.attributes.position.array.slice(0, 30)),
    Array.from(b.group.children[0].geometry.attributes.position.array.slice(0, 30)), 'the same frame draws the same flames');
}

// The bucket: the model at its ring, dented when damaged, water by fill; the aim ring.
{
  const scene = new THREE.Scene(), view = createFireView({THREE, scene, load});
  const bucket = {x: 5, y: 20, z: 6, heading: .4, water: 300, holds: 600, damage: 0, words: 'half', pouring: false, filling: 0, parcels: [],
    aim: {x: 8, y: 0, z: 9, radius: 12, locked: false}};
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket});
  await wait(() => view.bucketStatus === 'ready');
  eq(view.bucketStatus, 'ready', 'the bucket model loads with its named nodes');
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket});
  const root = scene.getObjectByName('bucket').parent ?? scene.getObjectByName('bucket');
  ok(scene.getObjectByName('bucket').visible && !scene.getObjectByName('bucket_dented').visible, 'whole: the clean body shows');
  const water = scene.getObjectByName('water');
  ok(water.visible, 'half full: the water shows');
  const half = water.position.y;
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket: {...bucket, water: 600}});
  ok(water.position.y > half, 'fuller water sits higher');
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket: {...bucket, water: 0, aim: null}});
  ok(!water.visible, 'empty: no water');
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket: {...bucket, damage: 1}});
  ok(!scene.getObjectByName('bucket').visible && scene.getObjectByName('bucket_dented').visible, 'dented: the crumpled body shows');
  const ring = view.group.children.find(child => child.geometry?.type === 'RingGeometry');
  ok(ring.visible && Math.abs(ring.position.x - 8) < 1e-9, 'the aim ring sits where the water would land');
  eq(ring.material.color.getHex(), 0xf4f1e8, 'white');
  view.update({heli: {x: 5, y: 35, z: 6}, courseId: 'tremblant-woods', bucket: {...bucket, aim: {...bucket.aim, locked: true}}});
  eq(ring.material.color.getHex(), 0xff8a2a, 'orange when locked over a burning cell');
  eq(view.cableEnd({bucket}), {x: 5, y: 20, z: 6}, 'the cable ends at the bucket ring');
  void root;
}

// The helicopter scene carries the fire view and hangs the cable to the bucket.
{
  const scene = new THREE.Scene();
  const heliView = createHeliView({THREE, scene, vehicleAssets: {status: () => 'error', load: () => Promise.resolve(false), create: () => null},
    load: () => new Promise(() => {}), fireLoad: load});
  ok(heliView.fire && typeof heliView.fire.update === 'function', 'the helicopter view has the fire view');
}

// The instruments: the answer prompt, the fire line, the bucket in words.
{
  const ringing = fireView([cell(0, 0, 50)]);
  ringing.fire = {...ringing.fire, call: {...ringing.fire.call, answered: false}, answerLeft: 12.2};
  ok(fireLineMarkup(ringing).includes('answer now · 13 s'), 'R: answer now, with the seconds left');
  ok(fireLineMarkup({...ringing, fire: {...ringing.fire, answerLeft: 0}}).includes('FIRE CALL WAITING'), 'then waiting');
  const line = fireLineMarkup(fireView([cell(0, 0, 50)]));
  ok(line.includes('FIRE 045° 0.8 km · 40% out · wind NW 7'), `the fire line: ${line}`);
  ok(fireLineMarkup({...fireView([]), courseId: 'panorama-ridge'}).includes('FIRE AT TREMBLANT WOODS'), 'elsewhere: where the fire is');
  ok(fireLineMarkup({heli: {}, bucket: {words: 'full', aim: null}}).includes('Bucket: full'), 'the bucket in words');
  eq(fireLineMarkup({heli: {}}), '', 'nothing without a fire or bucket');
  eq(noticeText({type: 'fireOut', paid: 1500, firstBadge: true}), 'Fire out: 1,500 credits and the firefighter badge', 'fire out notice');
  eq(noticeText({type: 'bucketDamaged', damage: 1}), 'Bucket dented: it leaks', 'dent notice');
}

// The burnt look on the drawn pines.
function pines(scene, positions) {
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.1, .2, 6), new THREE.MeshStandardMaterial(), positions.length);
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 4), new THREE.MeshStandardMaterial(), positions.length);
  trunks.name = 'Pine trunks 0:0'; crowns.name = 'Pine crowns 0:0';
  const object = new THREE.Object3D();
  positions.forEach(([x, z], i) => { object.position.set(x, 0, z); object.updateMatrix(); trunks.setMatrixAt(i, object.matrix); crowns.setMatrixAt(i, object.matrix); });
  scene.add(trunks, crowns);
  return {trunks, crowns};
}
const scale = (mesh, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return new THREE.Vector3().setFromMatrixScale(m).x; };
{
  const scene = new THREE.Scene(), course = {def: {id: 'tremblant-woods'}, samples: []};
  const trees = Array.from({length: 24}, (_, k) => [5 + (k % 6) * 40, 5 + Math.floor(k / 6) * 40]);
  const {trunks, crowns} = pines(scene, trees);
  // The art never arrives here: the trees still char, no snag takes a tree.
  const slow = createBurntLook({THREE, scene, load: {model: () => new Promise(() => {}), texture: () => new Promise(() => {})}});
  slow.apply({course, look: null});
  eq(slow.group.children.length, 0, 'a normal course adds nothing');
  ok(trees.every((_, i) => scale(crowns, i) === 1) && !trunks.instanceColor, 'and leaves the pines alone');
  slow.apply({course, look: {stage: 'closed', smoke: true, scars: [], live: []}});
  ok(trees.every((_, i) => scale(crowns, i) === 0), 'a burnt course: every crown gone');
  eq([...trunks.instanceColor.array.slice(0, 3)].map(v => +v.toFixed(3)), BURNT_LOOK.charcoal.map(v => +v.toFixed(3)), 'trunks charcoal');
  ok(trees.every((_, i) => scale(trunks, i) === 1), 'no trunk is taken for a snag before the snag art is in');
  slow.apply({course, look: null});
  ok(trees.every((_, i) => scale(crowns, i) === 1 && scale(trunks, i) === 1), 'healed: every tree back');
  eq([...trunks.instanceColor.array.slice(0, 3)], [1, 1, 1], 'with no tint on its bark');
  slow.dispose();
}
{
  // With the real props: snags and logs, ash, shoots and fireweed drawn whole.
  const scene = new THREE.Scene(), course = {def: {id: 'tremblant-woods'}, samples: []};
  const trees = Array.from({length: 60}, (_, k) => [5 + (k % 10) * 25, 5 + Math.floor(k / 10) * 25]);
  const {trunks, crowns} = pines(scene, trees);
  const look = createBurntLook({THREE, scene, load: {model: url => parseFile(url), texture: () => Promise.resolve(new THREE.Texture())}});
  look.apply({course, look: {stage: 'fireweed', smoke: false, scars: [], live: []}});
  await wait(() => look.statusFor('tremblant-woods') === 'ready');
  eq(look.statusFor('tremblant-woods'), 'ready', 'the burnt props and grounds load');
  ok(look.apply({course, look: {stage: 'fireweed', smoke: false, scars: [], live: []}}), 'and the look is drawn again with them');
  const names = look.group.children.map(child => child.name);
  ok(names.some(name => /^Burnt snag_/.test(name)) && names.includes('Burnt log_fallen'), 'snags and a fallen log stand among the trees');
  ok(names.filter(name => name === 'Burnt fireweed').length >= 2, 'fireweed drawn with all its parts (stems and petals)');
  ok(names.includes('Burnt shoots') && names.includes('Burnt ground fireweed'), 'shoots and the fireweed ground');
  const taken = trees.filter((_, i) => scale(trunks, i) === 0).length;
  ok(taken >= 8 && taken <= 20, `about one tree in four or five becomes a snag or log (${taken} of 60)`);
  // A knocked-down burnt tree (vegetation.js writes both matrices) keeps no crown.
  const fall = new THREE.Matrix4().makeRotationZ(1.2).setPosition(5, 0, 5);
  crowns.setMatrixAt(0, fall); trunks.setMatrixAt(0, fall);
  eq(scale(crowns, 0), 0, 'a knocked-down burnt tree grows no crown');
  const upright = new THREE.Matrix4().makeTranslation(5, 0, 5);
  crowns.setMatrixAt(0, upright);
  look.apply({course, look: null});
  const off = trees.map((_, i) => [i, +scale(crowns, i).toFixed(3), +scale(trunks, i).toFixed(3)]).filter(([, c, k]) => c !== 1 || k !== 1);
  eq(off, [], 'healed: every tree back, as vegetation last put it');
  eq(look.group.children.length, 0, 'and nothing of the burn is left');
  // A scar burns only its own cells.
  const first = (Math.floor(5 / 20) + 512) * 1024 + (Math.floor(5 / 20) + 512);
  look.apply({course, look: {stage: null, smoke: false, scars: [{cells: [first], stage: 'shoots'}], live: []}});
  ok(scale(crowns, 0) === 0 && scale(crowns, 1) === 1, 'a scar: only the trees in its cells');
  eq(cellStages({scars: [{cells: [1, 2], stage: 'black'}], live: [2]}), new Map([[1, 'black'], [2, 'black']]), 'stages by cell');
  ok(lookSignature(null) === '' && lookSignature({stage: 'black'}) !== lookSignature({stage: 'shoots'}), 'a new stage draws again');
  look.dispose();
}

console.log(`test-fire-view: ${checks} checks passed`);
