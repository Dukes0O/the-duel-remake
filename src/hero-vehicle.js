import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createDriver } from './driver.js';
import { prepareVehicleDamage } from './vehicles.js';

// Car Concept by Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0.
// See public/assets/models/CREDITS.md. Original badges are omitted at runtime.
let assetPromise;
export function loadHeroVehicle() {
  assetPromise ||= new GLTFLoader().loadAsync('/assets/models/car-concept.glb').then(gltf => {
    const source = gltf.scene;
    source.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(source), size = box.getSize(new THREE.Vector3());
    const scale = 4.8 / size.z;
    const center = box.getCenter(new THREE.Vector3());
    const normalize = new THREE.Matrix4().makeScale(scale, scale, scale);
    normalize.multiply(new THREE.Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
    const entries = [], wheelCenters = new Map();
    source.traverse(o => {
      if (/^Wheel(?:Front|Rear)[LR]$/.test(o.name)) {
        wheelCenters.set(o.name, new THREE.Vector3().setFromMatrixPosition(o.matrixWorld).applyMatrix4(normalize));
      }
    });
    source.traverse(o => {
      if (!o.isMesh || /Emblem|Logo/i.test(o.name)) return;
      let ancestor = o, wheelName;
      while (ancestor) { if (wheelCenters.has(ancestor.name)) { wheelName = ancestor.name; break; } ancestor = ancestor.parent; }
      const geometry = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(normalize, o.matrixWorld));
      if (wheelName) {
        const c = wheelCenters.get(wheelName);
        geometry.translate(-c.x, -c.y, -c.z);
        // The source poses its front wheels at 30 degrees. Start the game straight.
        if (wheelName.includes('Front')) geometry.rotateY(Math.PI / 6);
      }
      for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv', 'uv1'].includes(name)) geometry.deleteAttribute(name);
      for (const name of ['uv', 'uv1']) if (!geometry.attributes[name]) geometry.setAttribute(name, new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
      if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, i) => i));
      const material = o.material;
      for (const value of Object.values(material)) if (value?.isTexture) value.userData.sharedAsset = true;
      entries.push({geometry, material, wheelName, steering: /^InteriorSteering(?:Wheel|Cylinder)/.test(o.name), stationary: /BrakePad/.test(o.name)});
    });
    // Batch static parts by material, while retaining independent wheel pivots.
    const batches = new Map();
    for (const e of entries) {
      const key = `${e.material.uuid}:${e.wheelName || 'body'}:${e.stationary}:${e.steering}`;
      if (!batches.has(key)) batches.set(key, {...e, geometries: []});
      batches.get(key).geometries.push(e.geometry);
    }
    const parts = [...batches.values()].map(b => {
      const geometry = mergeGeometries(b.geometries); b.geometries.forEach(g => g.dispose());
      geometry.userData.sharedAsset = true;
      return {...b, geometry};
    });
    const originals = new Set(); source.traverse(o => { if (o.geometry) originals.add(o.geometry); });
    originals.forEach(g => g.dispose());
    return options => instantiate(parts, wheelCenters, options);
  }).catch(error => { assetPromise = null; throw error; });
  return assetPromise;
}

function instantiate(parts, wheelCenters, {color, kind}) {
  const vehicle = new THREE.Group(), materials = new Map(), pivots = new Map(), spins = new Map();
  const silver = kind === 'stuttgart', grandTourer = kind === 'gt';
  const data = vehicle.userData;
  data.wheels = []; data.wheelPivots = []; data.brakeLights = []; data.damageMeshes = [];
  data.originalColor = new THREE.Color(color);
  const steeringPivot = new THREE.Group();
  steeringPivot.position.set(.004, .896, .766);
  steeringPivot.rotation.x = .378;
  vehicle.add(steeringPivot); steeringPivot.updateMatrix();
  const steeringInverse = steeringPivot.matrix.clone().invert();
  data.steeringPivot = steeringPivot;
  for (const [name, center] of wheelCenters) {
    const pivot = new THREE.Group(), spin = new THREE.Group();
    pivot.position.copy(center); pivot.userData.restPosition = center.clone(); pivot.userData.front = name.includes('Front');
    pivot.add(spin); vehicle.add(pivot); pivots.set(name, pivot); spins.set(name, spin);
    data.wheels.push(spin); data.wheelPivots.push(pivot);
  }
  for (const part of parts) {
    if (!materials.has(part.material)) {
      const m = part.material.clone();
      if (/Paint 1/.test(m.name)) {
        m.color.set(color); m.metalness = silver ? .82 : .65; m.roughness = .24; m.clearcoat = 1;
        m.normalScale?.setScalar(.13); m.aoMapIntensity = .6; m.side = THREE.FrontSide; data.paint = m;
      }
      if (/Paint 2/.test(m.name)) { m.color.set(silver ? 0x262c32 : 0x080c10); m.roughness = .3; }
      if (grandTourer && /^Rim[12]$/.test(m.name)) { m.color.set(m.name === 'Rim1' ? 0xb99858 : 0x67563a); m.metalness = .92; m.roughness = .28; }
      if (m.name === 'License') { m.map = null; m.color.set(0xd0d5cc); }
      if (m.name === 'Headlight') m.emissiveIntensity = 3;
      if (m.name === 'Signallight') m.emissiveIntensity = .12;
      // Transparent glazing avoids a second full-scene transmission render.
      if (m.name === 'Glass') { m.transmission = 0; m.transparent = true; m.opacity = .28; m.color.set(0x738d9d); m.roughness = .06; m.depthWrite = false; m.side = THREE.FrontSide; }
      materials.set(part.material, m);
    }
    const material = materials.get(part.material);
    const geometry = part.wheelName ? part.geometry : part.geometry.clone();
    if (!part.wheelName) geometry.userData.sharedAsset = false;
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = material.name !== 'Glass'; mesh.receiveShadow = true;
    if (part.wheelName) (part.stationary ? pivots : spins).get(part.wheelName).add(mesh);
    else if (part.steering) {
      geometry.applyMatrix4(steeringInverse); steeringPivot.add(mesh);
    } else { vehicle.add(mesh); data.damageMeshes.push({mesh, rest: geometry.attributes.position.array.slice()}); }
    if (material.name === 'Brakelight') data.brakeLights.push(mesh);
  }
  if (grandTourer) addGrandTourerAero(vehicle);
  data.driver = createDriver({ hero: true, suitColor: silver ? 0x314b62 : 0x233e46 });
  vehicle.add(data.driver);
  prepareVehicleDamage(vehicle);
  data.size = {width: 2.3, length: 4.8, height: 1.3};
  // Soft underbody occlusion complements the moving sun shadow at low GPU cost.
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.5), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 vUv; void main(){vec2 p=(vUv-.5)*2.;float a=exp(-pow(p.x*1.8,4.)-pow(p.y*1.8,6.))*.38;gl_FragColor=vec4(.015,.02,.025,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  }));
  contact.rotation.x = -Math.PI / 2; contact.position.y = -.015; vehicle.add(contact); data.contactShadow = contact;
  data.heroAsset = true;
  return vehicle;
}

function addGrandTourerAero(vehicle) {
  const carbon = new THREE.MeshPhysicalMaterial({ color: 0x10191f, roughness: .34, metalness: .3, clearcoat: .7 });
  const hardware = new THREE.MeshStandardMaterial({ color: 0x262f37, roughness: .28, metalness: .86 });
  const carbonParts = [], metalParts = [];
  const box = (parts, size, position, rotateX = 0) => {
    const geometry = new THREE.BoxGeometry(...size).rotateX(rotateX).translate(...position); parts.push(geometry);
  };
  // Deck-mounted wing, carbon endplates and a low splitter distinguish the reward car.
  box(carbonParts, [2.12, .065, .39], [0, 1.31, -1.97], -.045);
  for (const side of [-1, 1]) {
    box(metalParts, [.055, .35, .19], [side * .70, 1.13, -1.93], -.20);
    box(carbonParts, [.045, .23, .43], [side * 1.057, 1.34, -1.97]);
    box(carbonParts, [.16, .042, 1.66], [side * 1.12, .25, -.035]);
  }
  box(carbonParts, [1.91, .045, .24], [0, .278, 2.285]);
  for (const [parts, material] of [[carbonParts, carbon], [metalParts, hardware]]) {
    const geometry = mergeGeometries(parts), mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true; mesh.receiveShadow = true; vehicle.add(mesh);
    vehicle.userData.damageMeshes.push({ mesh, rest: geometry.attributes.position.array.slice() });
    parts.forEach(g => g.dispose());
  }
  vehicle.userData.aeroPackage = 'carbon-gt';
}
