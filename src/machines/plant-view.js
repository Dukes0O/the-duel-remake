// The concrete plant in the machine yard: models from plants.glb and machines-2.glb,
// posed from the plant's state. This file only draws and plays sounds; it never changes the plant.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createMachineView} from './view.js';
import {createPlantSounds} from './plant-sounds.js';
import {binsKg, drumKg, formCapacityKg, mixerChuteTip, pileKg, pileRadiusM, placeLocal} from './plant.js';
import {machineDefinition} from './content/machines.js';
import {PLANT_CONTENT} from './content/plant.js';

export const PLANT_MODEL = '/assets/models/wasteland/town/plants.glb';
export const PLANT_MACHINE_MODEL = '/assets/models/wasteland/town/machines-2.glb';
// The formwork model is 6.36 m square inside, and its concrete surface is 0.93 m up.
const FORM_INSIDE_HALF_M = 3.18, FORM_SURFACE_M = 0.93;
const BELT_RISE = Object.freeze({lengthM:4, startY:0.6, endY:2.65});
const CONVEYOR_Y = 0.86;

const sanitized = name => name.replace(/[\[\]\.:\/]/g, '');
/** GLTFLoader removes ':' and other reserved marks from node names when it loads a model. */
export function findModelNode(root, name) {
  return root.getObjectByName(name) ?? root.getObjectByName(sanitized(name)) ?? null;
}

// With no surroundings to reflect, full metal draws black. Keep the paint and rust visible.
function prepare(node) {
  node.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true; child.receiveShadow = true;
    for (const mat of [].concat(child.material || [])) if (mat.metalness > 0.3) { mat.metalness = 0.3; mat.roughness = Math.max(mat.roughness, 0.6); }
  });
  return node;
}

function cloneNamed(asset, name) {
  const source = findModelNode(asset.scene, name);
  if (!source) throw new Error(`The plant model is missing ${name}.`);
  const copy = source.clone(true);
  copy.position.set(0, 0, 0);
  return prepare(copy);
}

/** Every material a clone uses is its own, so tinting one form does not tint the other. */
function ownMaterials(root) {
  root.traverse(node => { if (node.isMesh) node.material = Array.isArray(node.material) ? node.material.map(m => m.clone()) : node.material.clone(); });
}

/** A rough cone of loose material at its natural slope, one unit across. */
function pileGeometry(seed) {
  const geometry = new THREE.ConeGeometry(1, Math.tan(PLANT_CONTENT.pileReposeRadians), 18, 4);
  geometry.translate(0, Math.tan(PLANT_CONTENT.pileReposeRadians) / 2, 0);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i);
    if (y <= 1e-6) continue;
    const wobble = 1 + 0.07 * Math.sin(i * 12.9898 + seed * 78.233);
    position.setX(i, position.getX(i) * wobble); position.setZ(i, position.getZ(i) * wobble);
  }
  geometry.computeVertexNormals();
  return geometry;
}

const PILE_COLOURS = Object.freeze({gravel:0x86796a, sand:0xc4a77c});

/** The colour and shine of concrete as it sets, from wet to dry. */
export function concreteLook(set, wet, dry) {
  const t = Math.max(0, Math.min(1, set));
  return {color:wet.clone().lerp(dry, t), roughness:0.25 + 0.7 * t};
}

export function createPlantYardView({parent, heightAt, audio = null, effects = null, loader = new GLTFLoader()} = {}) {
  if (!parent?.isObject3D || typeof heightAt !== 'function') throw new TypeError('The plant view needs a scene and the ground height.');
  const group = new THREE.Group();
  group.name = 'Concrete plant';
  parent.add(group);
  const sounds = createPlantSounds(audio);
  const owned = new Set();
  const own = thing => { owned.add(thing); return thing; };
  const place = (object, at, lift = 0) => {
    object.position.set(at.x, heightAt(at.x, at.z) + lift, at.z);
    object.rotation.y = at.heading ?? 0;
    group.add(object);
    return object;
  };
  // Loose piles and the gravel riding the belt are drawn as soon as the view exists.
  const piles = {};
  for (const [material, colour] of Object.entries(PILE_COLOURS)) {
    const mesh = new THREE.Mesh(own(pileGeometry(material.length)), own(new THREE.MeshStandardMaterial({color:colour, roughness:1, flatShading:true})));
    mesh.name = `${material} pile`; mesh.castShadow = true; mesh.receiveShadow = true; mesh.visible = false;
    group.add(mesh); piles[material] = mesh;
  }
  const stoneGeometry = own(new THREE.DodecahedronGeometry(0.16, 0));
  const beltStones = new THREE.InstancedMesh(stoneGeometry, own(new THREE.MeshStandardMaterial({color:0x8a7f70, roughness:1, flatShading:true})), 96);
  beltStones.name = 'Gravel on the belt'; beltStones.castShadow = true; beltStones.count = 0;
  beltStones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(beltStones);
  const concreteStream = new THREE.Mesh(own(new THREE.CylinderGeometry(0.12, 0.18, 1, 8, 1, true)),
    own(new THREE.MeshStandardMaterial({color:0x5d5b56, roughness:0.35})));
  concreteStream.name = 'Concrete falling'; concreteStream.visible = false; group.add(concreteStream);
  const spillGeometry = own(new THREE.CylinderGeometry(1, 1.1, 0.08, 16));
  const spills = [];
  const wetColour = new THREE.Color(0x4e4d4a), dryColour = new THREE.Color(0xb9b5ab);
  const parts = {crusher:null, jaw:null, falling:[], forms:[], loader:null, mixer:null, bins:null, binHeaps:{}};
  let failed = false, time = 0, bursts = 0;
  // The layout is known from the first state seen; models that arrive first wait for it.
  let layout = null, built = null;

  const ready = (async () => {
    const [plants, machines] = await Promise.all([loader.loadAsync(PLANT_MODEL), loader.loadAsync(PLANT_MACHINE_MODEL)]);
    return {plants, machines};
  })().then(({plants, machines}) => {
    if (!group.parent) return;
    build(plants, machines);
  }).catch(error => {
    failed = true;
    console.warn('The concrete plant model could not be loaded:', error?.message || error);
  });

  function build(plants, machines) {
    const pending = layout;
    if (!pending) { built = {plants, machines}; return; }
    const crusher = place(cloneNamed(plants, 'crusher'), pending.crusher);
    crusher.name = 'Crusher';
    parts.crusher = crusher;
    parts.jaw = findModelNode(crusher, 'crusher:jaw');
    findModelNode(crusher, 'crusher-gravel-cone')?.removeFromParent();
    crusher.traverse(node => { if (/^crushergravel-?fallstone/.test(node.name) || /^crusher:gravel-fall:stone/.test(node.name)) parts.falling.push({node, y:node.position.y, phase:parts.falling.length * 0.37}); });
    for (const conveyor of pending.conveyors) place(cloneNamed(plants, conveyor.node), conveyor).name = 'Conveyor';
    const plant = place(cloneNamed(plants, 'batch-plant'), pending.batchPlant);
    plant.name = 'Batch plant';
    parts.bins = plant;
    for (const [material, x] of [['gravel', -3.2], ['sand', 1.8]]) {
      const heap = new THREE.Mesh(piles[material].geometry, piles[material].material);
      heap.name = `${material} in the bin`; heap.visible = false; heap.position.set(x, 3.7, -1.9);
      plant.add(heap); parts.binHeaps[material] = heap;
    }
    for (const form of pending.forms) {
      const model = cloneNamed(plants, 'formwork-1');
      ownMaterials(model);
      model.scale.set(form.halfM / FORM_INSIDE_HALF_M, form.depthM / FORM_SURFACE_M, form.halfM / FORM_INSIDE_HALF_M);
      place(model, form).name = `Form ${form.id}`;
      findModelNode(model, 'formwork-1:set')?.removeFromParent();
      const surface = findModelNode(model, 'formwork-1:wet');
      if (surface) surface.visible = false;
      parts.forms.push({id:form.id, model, surface});
    }
    for (const id of ['loader', 'mixer']) {
      const model = cloneNamed(machines, id === 'mixer' ? 'mixer-truck' : 'loader');
      // These two models face -Z; the machines drive towards +Z.
      model.rotation.y = Math.PI;
      const holder = new THREE.Group(); holder.add(model);
      const view = createMachineView({model:holder, definition:machineDefinition(id), parent:group});
      const node = name => findModelNode(view.body, name);
      if (id === 'loader') {
        const arms = node('loader:arms'), bucket = node('loader:bucket');
        const heap = new THREE.Mesh(piles.gravel.geometry, own(new THREE.MeshStandardMaterial({color:PILE_COLOURS.gravel, roughness:1, flatShading:true})));
        heap.name = 'Bucket load'; heap.visible = false; heap.scale.set(0.8, 0.6, 0.55); heap.position.set(0, 0.1, -0.5);
        bucket?.add(heap);
        parts.loader = {view, arms, bucket, heap, armsRest:arms?.quaternion.clone(), bucketRest:bucket?.quaternion.clone()};
      } else {
        const drum = node('mixer-truck:drum'), chute = node('mixer-truck:chute');
        parts.mixer = {view, drum, chute, drumRest:drum?.quaternion.clone(), chuteRest:chute?.quaternion.clone()};
      }
    }
  }

  const axisX = new THREE.Vector3(1, 0, 0), axisY = new THREE.Vector3(0, 1, 0), axisZ = new THREE.Vector3(0, 0, 1);
  const turn = new THREE.Quaternion(), matrix = new THREE.Matrix4(), spot = new THREE.Vector3(), spin = new THREE.Euler();
  const pose = (node, rest, axis, angle) => { if (node && rest) node.quaternion.copy(rest).multiply(turn.setFromAxisAngle(axis, angle)); };

  function beltPoint(layout, s) {
    const {from, to} = layout.belt;
    const length = Math.hypot(to.x - from.x, to.z - from.z), dirX = (to.x - from.x) / length, dirZ = (to.z - from.z) / length;
    if (s < BELT_RISE.lengthM) {
      // The crusher's own belt rises from the jaw to its head drum.
      const t = s / BELT_RISE.lengthM, back = BELT_RISE.lengthM - s;
      return {x:from.x - dirX * back, z:from.z - dirZ * back, y:BELT_RISE.startY + (BELT_RISE.endY - BELT_RISE.startY) * t};
    }
    const along = (s - BELT_RISE.lengthM) / (PLANT_CONTENT.belt.lengthM - BELT_RISE.lengthM) * length;
    return {x:from.x + dirX * along, z:from.z + dirZ * along, y:CONVEYOR_Y};
  }

  function update(sim, dtSeconds = 0, events = []) {
    const plant = sim?.plant;
    if (!plant) return;
    time += dtSeconds;
    if (!layout) { layout = plant.layout; if (built) { build(built.plants, built.machines); built = null; } }
    sounds.update(events);
    // Piles grow as cones at their natural slope.
    for (const [material, place] of [['gravel', layout.gravelPile], ['sand', layout.sandPile]]) {
      const kg = pileKg(plant, material), mesh = piles[material], radius = pileRadiusM(kg);
      mesh.visible = radius > 0.05;
      if (mesh.visible) { mesh.position.set(place.x, heightAt(place.x, place.z) - 0.05, place.z); mesh.scale.setScalar(radius); }
    }
    for (const [material, heap] of Object.entries(parts.binHeaps)) {
      const kg = binsKg(plant, material);
      heap.visible = kg > 1;
      heap.scale.setScalar(Math.min(2.4, 0.6 + pileRadiusM(kg) * 0.6));
    }
    // Gravel parcels ride the belt.
    const stonesPer = 4;
    let count = 0;
    for (const parcel of plant.belt) {
      for (let i = 0; i < stonesPer && count < beltStones.instanceMatrix.count; i++) {
        const point = beltPoint(layout, Math.min(PLANT_CONTENT.belt.lengthM, parcel.s + i * 0.09));
        const ground = point.y === CONVEYOR_Y ? heightAt(point.x, point.z) : heightAt(layout.belt.from.x, layout.belt.from.z);
        spot.set(point.x + ((i * 37) % 5 - 2) * 0.06, ground + point.y + 0.08, point.z + ((i * 53) % 5 - 2) * 0.06);
        spin.set(i, parcel.s * 3, i * 2);
        matrix.makeRotationFromEuler(spin).setPosition(spot);
        beltStones.setMatrixAt(count++, matrix);
      }
    }
    beltStones.count = count;
    beltStones.instanceMatrix.needsUpdate = true;
    if (parts.jaw) parts.jaw.rotation.x = plant.crushing ? Math.sin(time * 18) * 0.06 : 0;
    for (const stone of parts.falling) {
      stone.node.visible = plant.belt.length > 0;
      stone.node.position.y = stone.y - ((time * 1.8 + stone.phase) % 1) * 0.25;
    }
    // Concrete in each form rises with its volume and turns pale as it sets.
    for (const view of parts.forms) {
      const form = plant.forms.find(item => item.id === view.id);
      if (!view.surface || !form) continue;
      const fill = Math.min(1, form.kg / formCapacityKg(form));
      view.surface.visible = fill > 0.002;
      view.surface.position.y = FORM_SURFACE_M * (fill - 1) + 0.002;
      const look = concreteLook(form.set, wetColour, dryColour);
      view.surface.traverse(node => { if (node.isMesh) { node.material.color.copy(look.color); node.material.roughness = look.roughness; } });
    }
    while (spills.length < plant.spills.length) {
      const mesh = new THREE.Mesh(spillGeometry, own(new THREE.MeshStandardMaterial({color:wetColour, roughness:0.25})));
      mesh.name = 'Spilled concrete'; mesh.receiveShadow = true; group.add(mesh); spills.push(mesh);
    }
    plant.spills.forEach((spill, index) => {
      const mesh = spills[index], radius = Math.sqrt(spill.kg / 2375 / 0.08 / Math.PI);
      mesh.position.set(spill.x, heightAt(spill.x, spill.z) + 0.03, spill.z);
      mesh.scale.set(radius, 1, radius);
      const look = concreteLook(spill.set, wetColour, dryColour);
      mesh.material.color.copy(look.color); mesh.material.roughness = look.roughness;
    });
    // The loader lifts its arms to carry and tip; the mixer turns its drum and swings its chute.
    const active = sim.activeMachine;
    if (parts.loader) {
      const {view, arms, bucket, heap, armsRest, bucketRest} = parts.loader;
      const state = plant.loader.machine;
      view.update({...state, y:heightAt(state.x, state.z)}, dtSeconds, []);
      pose(arms, armsRest, axisX, plant.loader.lift * 1.1);
      const tipping = active === 'loader' && plant.loader.lift >= 0.9 && events.some(event => event.type === 'bucket-tip' || event.type === 'plant-refused');
      pose(bucket, bucketRest, axisX, tipping ? -0.9 : plant.loader.bucket.kg > 0 ? 0.35 : 0);
      heap.visible = plant.loader.bucket.kg > 1;
      if (heap.visible) heap.material.color.setHex(PILE_COLOURS[plant.loader.bucket.material] ?? PILE_COLOURS.gravel);
    }
    concreteStream.visible = false;
    if (parts.mixer) {
      const {view, drum, chute, drumRest, chuteRest} = parts.mixer;
      const state = plant.mixer.machine;
      view.update({...state, y:heightAt(state.x, state.z)}, dtSeconds, []);
      pose(drum, drumRest, axisZ, plant.mixer.drumTurns * Math.PI * 2);
      pose(chute, chuteRest, axisY, plant.mixer.chute);
      const pouring = events.some(event => event.type === 'pouring');
      const charging = events.some(event => event.type === 'batching');
      if (pouring || charging) {
        let top, bottom;
        if (pouring) {
          const tip = mixerChuteTip(plant), form = plant.forms.find(item => Math.abs(tip.x - item.x) <= item.halfM && Math.abs(tip.z - item.z) <= item.halfM);
          const ground = heightAt(tip.x, tip.z);
          top = new THREE.Vector3(tip.x, ground + 1.45, tip.z);
          bottom = new THREE.Vector3(tip.x, ground + (form ? form.depthM * Math.min(1, form.kg / formCapacityKg(form)) : 0.02), tip.z);
        } else {
          const batch = layout.batchPlant, at = placeLocal(batch, batch.charge.x, batch.charge.z);
          const ground = heightAt(at.x, at.z);
          top = new THREE.Vector3(at.x, ground + 3.3, at.z);
          bottom = new THREE.Vector3(at.x, ground + 2.9, at.z);
        }
        concreteStream.visible = true;
        concreteStream.position.copy(top).add(bottom).multiplyScalar(0.5);
        concreteStream.scale.set(1, Math.max(0.05, top.y - bottom.y), 1);
      }
    }
    for (const event of events) {
      if (event.type === 'hopper-tip' && effects && bursts++ % 12 === 0) {
        const hopper = layout.hopper;
        effects.burst({x:hopper.x, y:heightAt(hopper.x, hopper.z) + 3, z:hopper.z, direction:{x:0, z:0}, strength:1.2, material:'rock'});
      }
    }
  }

  return {
    ready, update,
    get failed() { return failed; },
    /** The posed body of a plant machine, for the cab camera. */
    body(id) { return parts[id]?.view?.body ?? null; },
    dispose() {
      sounds.dispose();
      parts.loader?.view.dispose(); parts.mixer?.view.dispose();
      group.removeFromParent();
      for (const thing of owned) thing.dispose();
      beltStones.dispose();
    },
  };
}
