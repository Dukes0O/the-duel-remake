import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WORKSHOP_CARS, isWorkshopCar} from './town/content/workshop-cars.js';
import {createDriver} from './driver.js';
import {prepareVehicleDamage} from './vehicles.js';

// The authored wheel centres, in metres, from the four Blender recipes. The
// photo-car wheels have multiple material primitives under one named node.
const RIGS = {
  rattler: {wheels: [[.825, .38046, 1.81523], [-.825, .38046, 1.81523], [.98356, .50907, -1.6518], [-.98356, .50907, -1.6518]],
    driver: [.30, .22, -.40], paint: /Photo.*rattler/, lampsY: .55},
  longhaul: {wheels: [2.12, -1.20, -2.72].flatMap(z => [[1.16, .70, z], [-1.16, .70, z]]),
    driver: [-.34, 1.35, 1.55], paint: /faded ochre enamel/, lampsY: .95},
  scarab: {wheels: [1.23, -1.23].flatMap(z => [[.875, .62, z], [-.875, .62, z]]),
    driver: [.27, .10, -.42], paint: /chipped deep olive enamel/, lampsY: .75},
  bully: {wheels: [[.957273, .525951, 1.597966], [-.957273, .525951, 1.597966], [.957273, .525951, -1.799099], [-.957273, .525951, -1.799099]],
    driver: [.42, .95, .35], paint: /Photo.*bully-(?:side|front|rear|top)/, lampsY: .9},
};
const pending = new Map();
const defaultLoad = url => new GLTFLoader().loadAsync(url);
export const wastelandModelUrl = id => isWorkshopCar(id) ? `/assets/models/wasteland/cars/${id}.glb` : null;

export function loadWastelandVehicle(id, {loadAsset = defaultLoad} = {}) {
  if (!isWorkshopCar(id)) return Promise.reject(new Error('Unknown Workshop car.'));
  const load = async () => {
    const {scene} = await loadAsset(wastelandModelUrl(id));
    const template = prepareTemplate(id, scene);
    return options => instantiate(id, template, options);
  };
  if (loadAsset !== defaultLoad) return load();
  if (!pending.has(id)) pending.set(id, load().catch(error => {pending.delete(id); throw error;}));
  return pending.get(id);
}

function wheelIndex(id, mesh, centre) {
  const name = mesh.name.replaceAll(' ', '_');
  if (id === 'rattler' || id === 'bully') {
    let node = mesh;
    while (node) {
      const match = node.name.match(/wheel[ _](front|rear)-(left|right)/);
      if (match) return (match[1] === 'front' ? 0 : 2) + (match[2] === 'right' ? 1 : 0);
      node = node.parent;
    }
    return -1;
  }
  const moving = id === 'longhaul'
    ? /^(axle_[123]_round_tread_tyre|pressed_steel_wheel_rim|rusted_rim_dish|wheel_hub|wheel_lug_nut)/
    : /^(continuous_carcass_with_swept_paddle_tread|deep_dished_wheel_centre|scarred_rim|scarred_hub|grease_cap|rim_vent_fastener|vented_brake_disc)/;
  if (!moving.test(name)) return -1;
  let nearest = -1, distance = Infinity;
  RIGS[id].wheels.forEach((position, index) => {
    const gap = centre.distanceToSquared(new THREE.Vector3(...position));
    if (gap < distance) {nearest = index; distance = gap;}
  });
  return nearest;
}

function prepareTemplate(id, source) {
  source.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(source), size = bounds.getSize(new THREE.Vector3());
  // Ground the whole model and centre its collision envelope, without scaling
  // or changing any of the reviewed proportions.
  const offset = new THREE.Vector3(-(bounds.min.x + bounds.max.x) / 2, -bounds.min.y, -(bounds.min.z + bounds.max.z) / 2);
  const normalize = new THREE.Matrix4().makeTranslation(...offset.toArray());
  const batches = new Map(), centre = new THREE.Vector3();
  source.traverse(mesh => {
    if (!mesh.isMesh) return;
    new THREE.Box3().setFromObject(mesh).getCenter(centre);
    const wheel = wheelIndex(id, mesh, centre), stationary = /^vented_brake_disc/.test(mesh.name);
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(normalize);
    if (wheel >= 0) {
      const at = new THREE.Vector3(...RIGS[id].wheels[wheel]).add(offset);
      geometry.translate(-at.x, -at.y, -at.z);
    }
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
    if (!geometry.attributes.normal) geometry.computeVertexNormals();
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const material = mesh.material, key = `${material.uuid}:${wheel}:${stationary}`;
    if (!batches.has(key)) batches.set(key, {material, wheel, stationary, geometries: []});
    batches.get(key).geometries.push(flat);
    for (const value of Object.values(material)) if (value?.isTexture) value.userData.sharedAsset = true;
  });
  const parts = [...batches.values()].map(batch => {
    const geometry = mergeGeometries(batch.geometries);
    batch.geometries.forEach(item => item.dispose());
    geometry.userData.sharedAsset = true;
    return {material: batch.material, wheel: batch.wheel, stationary: batch.stationary, geometry};
  });
  if (new Set(parts.filter(part => part.wheel >= 0).map(part => part.wheel)).size !== RIGS[id].wheels.length)
    throw new Error(`The ${id} model is missing a wheel.`);
  return {parts, offset, size: {width: size.x, height: size.y, length: size.z}};
}

function instantiate(id, template, {color = WORKSHOP_CARS[id].spec.color} = {}) {
  const rig = RIGS[id], vehicle = new THREE.Group(), data = vehicle.userData;
  vehicle.name = id;
  Object.assign(data, {vehicleKey: id, size: {...template.size}, wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [],
    damageSpace: {scale: [template.size.width / 2.1, template.size.height / 1.5, template.size.length / 4.8], offset: [0, 0, 0]}});
  for (const [index, position] of rig.wheels.entries()) {
    const pivot = new THREE.Group(), spin = new THREE.Group();
    pivot.position.fromArray(position).add(template.offset);
    pivot.userData.restPosition = pivot.position.clone();
    pivot.userData.front = index < 2;
    pivot.add(spin); vehicle.add(pivot);
    data.wheels.push(spin); data.wheelPivots.push(pivot);
  }
  const materials = new Map();
  for (const part of template.parts) {
    const materialKey = `${part.material.uuid}:${part.wheel < 0 ? 'body' : 'wheel'}`;
    if (!materials.has(materialKey)) {
      let material = part.material.clone();
      if (part.wheel < 0 && rig.paint.test(material.name) && !material.isMeshPhysicalMaterial) {
        material = new THREE.MeshPhysicalMaterial();
        THREE.MeshStandardMaterial.prototype.copy.call(material, part.material);
      }
      material.userData.sharedAsset = false;
      if (part.wheel < 0 && rig.paint.test(material.name)) {
        if (!data.paint) {
          data.paint = material;
          if (color !== WORKSHOP_CARS[id].spec.color) material.color.setHex(color);
          data.originalColor = material.color.clone();
        } else material.color = data.paint.color;
      }
      materials.set(materialKey, material);
    }
    const mesh = new THREE.Mesh(part.geometry.clone(), materials.get(materialKey));
    mesh.geometry.userData.sharedAsset = false;
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (part.wheel >= 0) (part.stationary ? data.wheelPivots : data.wheels)[part.wheel].add(mesh);
    else {vehicle.add(mesh); data.damageMeshes.push({mesh, rest: mesh.geometry.attributes.position.array.slice()});}
  }
  if (!data.paint) throw new Error(`The ${id} model has no paint material.`);
  if (id === 'scarab') {
    // The buggy has an open cage. Bolt the weapon bridge to its upper rails;
    // the bow's four feet need a continuous surface above the occupants.
    const pieces = [new THREE.BoxGeometry(1.18, .035, 1.15).translate(0, 1.535, .64)];
    for (const x of [-.55, .55]) for (const z of [.12, 1.16])
      pieces.push(new THREE.BoxGeometry(.07, .14, .07).translate(x, 1.45, z));
    const geometry = mergeGeometries(pieces);
    pieces.forEach(piece => piece.dispose());
    const bridge = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: 0x34312b, metalness: .65, roughness: .85}));
    bridge.name = 'Scarab cage weapon bridge';
    bridge.castShadow = true; bridge.receiveShadow = true;
    vehicle.add(bridge); data.damageMeshes.push({mesh: bridge, rest: geometry.attributes.position.array.slice()});
  }
  data.driver = createDriver({suitColor: 0x6b5e45});
  data.driver.position.fromArray(rig.driver).add(template.offset);
  vehicle.add(data.driver);
  data.steeringPivot = new THREE.Group();
  data.steeringPivot.position.copy(data.driver.position).add(data.driver.userData.wheelCenter);
  const steering = new THREE.Mesh(new THREE.TorusGeometry(.18, .018, 6, 20), new THREE.MeshStandardMaterial({color: 0x282421}));
  data.steeringPivot.add(steering); vehicle.add(data.steeringPivot);
  // Small working lenses and boost outlets complete the standard animation
  // contract. The imported body, plough and all its textures stay in place.
  for (const side of [-1, 1]) {
    const brake = new THREE.Mesh(new THREE.BoxGeometry(.12, .07, .035),
      new THREE.MeshStandardMaterial({color: 0x8b1910, emissive: 0xd52114, emissiveIntensity: .35}));
    brake.position.set(side * template.size.width * .32, rig.lampsY, -template.size.length / 2 - .018);
    vehicle.add(brake); data.brakeLights.push(brake);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.06, .35, 6),
      new THREE.MeshBasicMaterial({color: 0x5cbeff, transparent: true, opacity: .8}));
    flame.rotation.x = -Math.PI / 2;
    flame.position.set(side * template.size.width * .30, .4, -template.size.length / 2 - .12);
    flame.visible = false; vehicle.add(flame); data.boostFlames.push(flame);
  }
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}
