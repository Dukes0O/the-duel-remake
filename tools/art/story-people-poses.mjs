// Bake the actual presentation pose for a Blender review away from the GPU.
// Run node tools/art/story-people-poses.mjs <evidence-dir>, then the render recipe.
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createStoryPeopleView} from '../../src/world/story-people-view.js';
import {createStoryPeople, walkerGroupAt, setStoryPersonAction} from '../../src/world/jobs/story-people.js';
import {createOnFootFigures} from '../../src/onfoot-figures.js';
import {createHandcartView} from '../../src/world/handcart-view.js';
import {createLoosePot} from '../../src/world/ember-pot.js';
import {createTinTownGate} from '../../src/world/tin-town-gate.js';

const out = path.resolve(process.argv[2]);
await fs.mkdir(out, {recursive:true});
async function loadAsset(url) {
  const buffer = await fs.readFile(new URL('../../public' + url, import.meta.url));
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength));
  const images = await Promise.all(json.images.map(async (img, i) => {
    const view = json.bufferViews[img.bufferView], offset = 28 + jsonLength + (view.byteOffset || 0);
    const name = path.basename(url, '.glb') + '-' + i + (img.mimeType === 'image/png' ? '.png' : '.jpg');
    await fs.writeFile(path.join(out, name), buffer.subarray(offset, offset + view.byteLength));
    return name;
  }));
  const loader = new GLTFLoader();
  loader.register(() => ({name:'REVIEW_EMBEDDED_TEXTURE', loadTexture(index) {
    const map = new THREE.Texture();
    map.userData.imageFile = images[json.textures[index].source];
    return Promise.resolve(map);
  }}));
  return loader.parseAsync(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), '');
}

const point = new THREE.Vector3(), matrix = new THREE.Matrix4(), shade = new THREE.Color();
const normal = new THREE.Vector3(), worldNormal = new THREE.Matrix3(), direction = new THREE.Matrix3();
const skinned = new THREE.Vector3(), weighted = new THREE.Vector3(), joint = new THREE.Matrix4();
function posedNormal(mesh, index, result) {
  result.fromBufferAttribute(mesh.geometry.attributes.normal, index);
  if (!mesh.isSkinnedMesh) return result;
  // Same weighted joint matrix as Three's skinnormal_vertex, with w=0.
  skinned.copy(result).applyMatrix3(direction.setFromMatrix4(mesh.bindMatrix));
  result.set(0, 0, 0);
  const indices = mesh.geometry.attributes.skinIndex, weights = mesh.geometry.attributes.skinWeight;
  for (let n = 0; n < 4; n++) {
    const w = weights.getComponent(index, n);
    if (!w) continue;
    const i = indices.getComponent(index, n);
    joint.multiplyMatrices(mesh.skeleton.bones[i].matrixWorld, mesh.skeleton.boneInverses[i]);
    weighted.copy(skinned).applyMatrix3(direction.setFromMatrix4(joint));
    result.addScaledVector(weighted, w);
  }
  return result.applyMatrix3(direction.setFromMatrix4(mesh.bindMatrixInverse));
}
const round = n => Math.round(n * 100000) / 100000;
function bake(group) {
  group.updateMatrixWorld(true);
  const objects = [];
  group.traverseVisible(mesh => {
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry, positions = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let instance = 0; instance < (mesh.isInstancedMesh ? mesh.count : 1); instance++) {
      if (mesh.isInstancedMesh) {
        mesh.getMatrixAt(instance, matrix);
        matrix.premultiply(mesh.matrixWorld);
        mesh.getColorAt(instance, shade);
      } else {
        matrix.copy(mesh.matrixWorld);
        shade.setScalar(1);
      }
      const material = mesh.material;
      worldNormal.getNormalMatrix(matrix);
      const row = {name:mesh.name, position:[], normal:[], uv:[], index:Array.from(
        geometry.index?.array ?? Array.from({length:positions.count}, (_, i) => i)),
        texture:material.map?.userData?.imageFile, colour:shade.clone().multiply(material.color).toArray(),
        emissive:material.emissive?.toArray(), rough:material.roughness ?? .85, metal:material.metalness ?? 0};
      for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, point).applyMatrix4(matrix);
        row.position.push([round(point.x), round(-point.z), round(point.y)]);
        if (geometry.attributes.normal && !material.flatShading) {
          posedNormal(mesh, i, normal).applyNormalMatrix(worldNormal);
          row.normal.push([round(normal.x), round(-normal.z), round(normal.y)]);
        }
        if (uv) row.uv.push([round(uv.getX(i)), round(1 - uv.getY(i))]);
      }
      objects.push(row);
    }
  });
  return objects;
}

const gate = createTinTownGate();
gate.position.set(0, 0, -5.1);
gate.rotation.y = 0;
await fs.writeFile(path.join(out, 'gate.json'), JSON.stringify(bake(gate)));
const placements = walkerGroupAt({x:0, y:0, z:0}, 0);
const source = createOnFootFigures({capacity:11});
source.update(placements.map(({position, yaw}) => ({...position, yaw})), {active:true});
for (const person of createStoryPeople(placements)) {
  if (!person.cart) continue;
  const view = createHandcartView();
  view.update(person.cart, 0);
  source.group.add(view.root);
}
await fs.writeFile(path.join(out, 'current.json'), JSON.stringify(bake(source.group)));
source.dispose();
const view = createStoryPeopleView(loadAsset);
async function savePose(name, specs, speaker, viewer, beforeDraw = () => {}, frames = 120) {
  const people = createStoryPeople(specs), world = {storyPeople:people, storySpeaker:speaker};
  beforeDraw(people);
  view.update(world, viewer, 0);
  await view.group.userData.ready;
  if (view.group.userData.loadError) throw Error(view.group.userData.loadError);
  for (let i = 0; i <= frames; i++) view.update(world, viewer, i / 60);
  await fs.writeFile(path.join(out, name + '.json'), JSON.stringify(bake(view.group)));
}
await savePose('gate-walkers', placements, 'rell', {x:0,z:6});
await savePose('speaking', placements, 'rell', {x:.3,z:3.9}, undefined, 192);
const leads = [{id:'rell', x:-1}, {id:'dace', x:0}, {id:'wim', x:1}]
  .map(({id,x}) => ({id, position:{x, y:0, z:0}, yaw:.04}));
await savePose('leads', leads, null, {x:0,z:3});
const cast = [{id:'dace', x:-2.7, yaw:.93}, {id:'walker-h', x:-1.1, yaw:.75},
  {id:'rell', x:.7, yaw:-.3}, {id:'wim', x:2.1, yaw:-.3}, {id:'auntie-solder', x:2.9, yaw:-.48}]
  .map(({id,x,yaw}) => ({id:id === 'walker-h' ? 'walker-8' : id, position:{x,y:0,z:0},yaw}));
await savePose('actions', cast, null, {x:1,z:6}, ([dace, carter, rell, wim]) => {
  setStoryPersonAction(dace, 'run', [{x:3,z:4}]);
  dace.distance = .25;
  setStoryPersonAction(carter, 'push-cart', [{x:4,z:3}]);
  carter.distance = .23;
  setStoryPersonAction(rell, 'sit');
  setStoryPersonAction(wim, 'sleep');
});
const resting = [
  {id:'rell',position:{x:-1.1,y:0,z:.15},yaw:-.27,action:'sit'},
  {id:'wim',position:{x:.89,y:0,z:.12},yaw:.18,action:'sleep'},
  {id:'auntie-solder',position:{x:.46,y:0,z:-.17},yaw:-.32,action:'sit'},
];
await savePose('at-rest', resting, null, {x:0,z:3.3});
const fence = createTinTownGate().getObjectByName('Gate fence right');
fence.removeFromParent();
fence.position.set(-12,0,-.45);
const camp = new THREE.Group();
camp.add(fence);
const pot = createLoosePot();
pot.position.set(-1.81,0,.46);
const coals = pot.getObjectByName('Ember coals');
// Blender does not run the game's animated coal shader. Give the real disc
// the ember colour for a parked firelight shot.
coals.material = new THREE.MeshStandardMaterial({color:0xb54215,emissive:0xb7470c,roughness:1});
camp.add(pot);
await fs.writeFile(path.join(out,'camp.json'),JSON.stringify(bake(camp)));
view.dispose();
