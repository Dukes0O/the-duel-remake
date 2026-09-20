import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Lightweight traffic/police sedans and shared damage support for current cars.
// Playable body selection lives in vehicle-assets.js; retired coupe branches
// are deliberately absent so they cannot return as temporary player models.
// Metres. +Z is forward. Ground is y=0. Static detail is batched by material.
const geometries = new Map();
const shared = {
  rubber: new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.86 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x0b1018, roughness: 0.56 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x4c6978, metalness: 0.18, roughness: 0.08, clearcoat: 1, transparent: true, opacity: .62, depthWrite: false }),
  alloy: new THREE.MeshStandardMaterial({ color: 0xb1b6bd, metalness: 0.88, roughness: 0.25 }),
  darkAlloy: new THREE.MeshStandardMaterial({ color: 0x404650, metalness: 0.83, roughness: 0.36 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd9d9d3, metalness: 1, roughness: 0.18 }),
  headlight: new THREE.MeshStandardMaterial({ color: 0xfff5db, emissive: 0xffdf97, emissiveIntensity: 1.7, roughness: 0.2 }),
  indicator: new THREE.MeshStandardMaterial({ color: 0xff9438, emissive: 0xf36718, emissiveIntensity: 0.4 }),
};
for (const material of Object.values(shared)) material.userData.sharedAsset = true;

function cached(key, make) {
  if (!geometries.has(key)) {
    const geometry = make();
    geometry.userData.sharedAsset = true;
    geometries.set(key, geometry);
  }
  return geometries.get(key);
}

// A faceted surface through cross sections, sculpting shoulders and taper.
function loft(sections) {
  const positions = [], indices = [];
  for (const [z, width, base, shoulder, crown, crownWidth] of sections) {
    const lower=Math.min(shoulder-.012,base+.13);
    for (const [x, y] of [
      [-width * .86, base], [-width, lower], [-width, shoulder],
      [-crownWidth, crown], [crownWidth, crown], [width, shoulder],
      [width, lower], [width * .86, base],
    ]) positions.push(x, y, z);
  }
  for (let s = 0; s < sections.length - 1; s++) {
    for (let j = 0; j < 8; j++) {
      const a = s * 8 + j, b = s * 8 + (j + 1) % 8, c = b + 8, d = a + 8;
      indices.push(a, c, b, a, d, c);
    }
  }
  for (let j = 1; j < 7; j++) {
    indices.push(0, j, j + 1);
    const last = (sections.length - 1) * 8;
    indices.push(last, last + j + 1, last + j);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function staticBatch(group) {
  const buckets = new Map();
  const add = (geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    );
    let copy = geometry.clone().applyMatrix4(matrix);
    if (copy.index) { const expanded = copy.toNonIndexed(); copy.dispose(); copy = expanded; }
    copy.deleteAttribute('uv');
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(copy);
  };
  const box = (material, size, pos, rot) => add(cached('box', () => new THREE.BoxGeometry(1, 1, 1)), material, pos, rot, size);
  return { add, box, finish() {
    for (const [material, parts] of buckets) {
      const merged = mergeGeometries(parts, false);
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      parts.forEach(p => p.dispose());
    }
  } };
}

function makeWheels(vehicle) {
  const wheels = [], pivots = [];
  const radius = 0.39, width = 0.28;
  const geo = cached('tire:sedan', () => new THREE.CylinderGeometry(radius, radius, width, 14).rotateZ(Math.PI / 2));
  for (const side of [-1, 1]) for (const axle of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 1.04, radius + 0.01, axle * 1.39);
    pivot.userData.front = axle === 1;
    const wheel = new THREE.Group();
    const batch = staticBatch(wheel);
    batch.add(geo, shared.rubber);
    const face = side * (width / 2 + 0.012);
    const rim = cached(`rim:${radius}`, () => new THREE.CylinderGeometry(radius * 0.64, radius * 0.64, 0.035, 40).rotateZ(Math.PI / 2));
    batch.add(rim, shared.darkAlloy, [face, 0, 0]);
    const torus = cached(`lip:${radius}`, () => new THREE.TorusGeometry(radius * 0.73, 0.026, 6, 24).rotateY(Math.PI / 2));
    batch.add(torus, shared.chrome, [face + side * 0.025, 0, 0]);
    for (let spoke = 0; spoke < 5; spoke++) {
      const theta = spoke * Math.PI * 2 / 5;
      batch.box(shared.alloy, [0.043, radius * 0.64, 0.036], [face + side * 0.042, Math.cos(theta) * radius * 0.36, Math.sin(theta) * radius * 0.36], [theta, 0, 0]);
    }
    batch.add(cached('hub', () => new THREE.CylinderGeometry(0.087, 0.087, 0.06, 12).rotateZ(Math.PI / 2)), shared.chrome, [face + side * 0.04, 0, 0]);
    batch.finish();
    pivot.add(wheel); vehicle.add(pivot); wheels.push(wheel); pivots.push(pivot);
    pivot.userData.restPosition = pivot.position.clone();
  }
  vehicle.userData.wheels = wheels;
  vehicle.userData.wheelPivots = pivots;
}

export function createVehicle({ color = 0xef382b, accent = 0x111924 } = {}) {
  const vehicle = new THREE.Group();
  vehicle.name = 'vehicle-sedan';
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .58, roughness: .22, clearcoat: 1, clearcoatRoughness: .09 });
  const originalColor = paint.color.clone();
  const accentMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).lerp(new THREE.Color(0x151a20),.92), metalness: 0.3, roughness: 0.42 });
  const b = staticBatch(vehicle);
  const body = loft([
    [-2.23, 0.93, 0.31, 0.87, 0.96, 0.79], [-1.48, 1.05, 0.3, 0.98, 1.04, 0.84],
    [0, 1.02, 0.29, 0.93, 0.99, 0.83], [1.42, 1.02, 0.3, 0.85, 0.92, 0.82], [2.22, 0.92, 0.37, 0.7, 0.76, 0.8],
  ]);
  b.add(body, paint);
  body.dispose();
  // Black sill and splitter make the body read as one coherent low shape.
  b.box(accentMaterial, [1.59, 0.12, 4.24], [0, 0.3, 0]);
  b.box(shared.trim, [1.92, 0.075, 0.26], [0, 0.375, 2.25]);
  b.box(shared.trim, [1.96, 0.09, 0.27], [0, 0.31, -2.17]);
  for (const side of [-1, 1]) {
    b.box(paint, [0.095, 0.16, 2.0], [side * 1.015, 0.37, -0.02]);
    // Dark wheel wells, partially inset behind the exposed tread.
    for (const z of [-1.39, 1.39]) {
      b.add(cached('arch', () => new THREE.TorusGeometry(0.456, 0.037, 5, 20, Math.PI).rotateY(Math.PI / 2)), shared.trim,
        [side * 1.082, 0.438, z]);
    }
  }

  const cabin = loft([
    [-1.27, 0.86, 0.94, 0.98, 1.0, 0.78], [-0.81, 0.8, 0.96, 1.18, 1.52, 0.64],
    [0.36, 0.8, 0.94, 1.18, 1.52, 0.64], [1.03, 0.84, 0.89, 0.94, 0.97, 0.77],
  ]);
  b.add(cabin, shared.glass); cabin.dispose();
  b.box(paint, [1.32, 0.035, 1.1], [0, 1.53, -0.23], [0, 0, 0]);
  // Red structural roof edges, pillars, mirrors and lower glass trim.
  for (const side of [-1, 1]) {
    b.box(paint, [0.053, 0.05, 0.83], [side * 0.664, 1.458, -0.2], [0.055, 0, 0]);
    b.box(paint, [0.07, 0.05, 1.02], [side * 0.728, 1.19, 0.645], [0.535, side * 0.105, 0]);
    b.box(paint, [0.11, 0.065, 0.9], [side * 0.735, 1.2, -0.925], [-0.59, -side * 0.1, 0]);
    b.box(shared.trim, [0.034, 0.44, 0.05], [side * 0.794, 1.172, -0.25], [0, 0, side * 0.31]);
    b.box(shared.trim, [0.04, 0.037, 2.01], [side * 0.85, 0.976, -0.03]);
    b.box(paint, [0.18, 0.06, 0.08], [side * 0.94, 1.03, 0.57]);
    b.box(paint, [0.19, 0.135, 0.27], [side * 1.075, 1.07, 0.56]);
    b.box(shared.chrome, [0.14, 0.08, 0.009], [side * 1.076, 1.08, 0.416]);
    b.box(shared.trim, [0.012, 0.04, 0.16], [side * 1.036, 0.835, -0.24]);
  }
  // Tail panel and 4 separate red lenses remain dynamic for braking.
  b.box(shared.trim, [1.83, 0.285, 0.037], [0, 0.785, -2.335]);
  for (let slot = 0; slot < 5; slot++) b.box(accentMaterial, [0.94, 0.016, 0.026], [0, 0.678 + slot * 0.048, -2.361]);
  const brakeLights = [];
  const brakeMaterial = new THREE.MeshStandardMaterial({ color: 0xef211c, emissive: 0xff2116, emissiveIntensity: 0.85, roughness: 0.3 });
  for (const x of [-0.76, -0.49, 0.49, 0.76]) {
    b.add(cached('tail-rim', () => new THREE.CylinderGeometry(0.128, 0.128, 0.024, 18).rotateX(Math.PI / 2)), shared.darkAlloy, [x, 0.785, -2.365]);
    const light = new THREE.Mesh(cached('tail', () => new THREE.TorusGeometry(0.082, 0.028, 7, 18)).clone().translate(x, .785, -2.389), brakeMaterial);
    light.geometry.userData.sharedAsset = false; brakeLights.push(light); vehicle.add(light);
  }
  vehicle.userData.brakeLights = brakeLights;
  vehicle.userData.brakeMaterial = brakeMaterial;
  for (const side of [-1, 1]) {
    b.box(shared.trim, [0.58, 0.16, 0.065], [side * 0.568, 0.521, 2.339]);
    b.box(shared.headlight, [0.415, 0.079, 0.013], [side * 0.559, 0.531, 2.377]);
    b.box(shared.indicator, [0.06, 0.064, 0.014], [side * 0.817, 0.53, 2.373]);
    b.box(shared.trim, [0.4, 0.012, 0.42], [side * 0.58, 0.734, 1.93], [0.18, 0, 0]);
    b.box(paint, [0.376, 0.014, 0.398], [side * 0.58, 0.742, 1.93], [0.18, 0, 0]);
  }
  const boostFlames = [];
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const side of [-1, 1]) {
    b.add(cached('exhaust', () => new THREE.CylinderGeometry(0.075, 0.077, 0.25, 12).rotateX(Math.PI / 2)), shared.chrome, [side * 0.65, 0.39, -2.265]);
    b.add(cached('exhaust-inner', () => new THREE.CylinderGeometry(0.059, 0.059, 0.014, 12).rotateX(Math.PI / 2)), shared.trim, [side * 0.65, 0.39, -2.398]);
    const flame = new THREE.Mesh(cached('flame', () => new THREE.ConeGeometry(0.13, 0.95, 10).rotateX(-Math.PI / 2).translate(0, 0, -0.475)), flameMaterial);
    flame.position.set(side * 0.65, 0.39, -2.42); flame.visible = false; boostFlames.push(flame); vehicle.add(flame);
  }
  vehicle.userData.boostFlames = boostFlames;
  b.finish();
  vehicle.userData.damageMeshes = vehicle.children.filter(o => o.isMesh && !o.geometry.userData.sharedAsset).map(mesh => ({mesh, rest: mesh.geometry.attributes.position.array.slice()}));
  vehicle.userData.paint = paint; vehicle.userData.originalColor = originalColor;
  makeWheels(vehicle);
  vehicle.userData.size = { width: 2.59, length: 4.8, height: 1.55 };
  // Prepare once, before world placement. Wear is zero until this sedan is hit;
  // private body materials keep a traffic dent from changing every shared sedan.
  prepareVehicleDamage(vehicle);
  return vehicle;
}

// Cache intact vertex data once. Every vehicle owns these mutable meshes/materials;
// the loaded template, wheel geometry and texture maps remain safely shared.
export function prepareVehicleDamage(vehicle) {
  const data = vehicle.userData, privateMaterials = new Map();
  if(data.damagePrepared)return;
  const damageSpace = data.damageSpace || { scale: [1, 1, 1], offset: [0, 0, 0] };
  data.damageBase = { roughness: data.paint.roughness, clearcoat: data.paint.clearcoat };
  for (const item of data.damageMeshes || []) {
    const { mesh } = item;
    if (mesh.material.userData.sharedAsset) {
      if (!privateMaterials.has(mesh.material)) {
        const material = mesh.material.clone(); material.userData.sharedAsset = false;
        privateMaterials.set(mesh.material, material);
      }
      mesh.material = privateMaterials.get(mesh.material);
    }
    item.normals = mesh.geometry.attributes.normal?.array.slice();
    const wear = new THREE.Float32BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count), 1);
    mesh.geometry.setAttribute('panelWear', wear);
    installWearShader(mesh.material);
  }
  const glass = (data.damageMeshes || []).filter(({ mesh }) => /glass/i.test(mesh.material.name) || mesh.material.transparent && mesh.material.opacity < .8).map(({ mesh }) => mesh);
  data.fractures = [];
  vehicle.updateMatrixWorld(true);
  for (const zone of ['front', 'rear', 'left', 'right']) {
    const points = [], ray = new THREE.Raycaster(), side = zone === 'left' ? 1 : -1;
    const sideWindow = zone === 'left' || zone === 'right';
    const project = (u, v) => {
      if (sideWindow) ray.set(new THREE.Vector3(side * 3, 1.275 + u, -.06 + v), new THREE.Vector3(-side, 0, 0));
      else ray.set(new THREE.Vector3((zone === 'front' ? -.23 : .21) + u, 3, (zone === 'front' ? damageSpace.frontGlassZ ?? .88 : damageSpace.rearGlassZ ?? -1.03) + v), new THREE.Vector3(0, -1, 0));
      ray.ray.origin.multiply(new THREE.Vector3(...damageSpace.scale)).add(new THREE.Vector3(...damageSpace.offset));
      const hit = ray.intersectObjects(glass, false)[0];
      return hit ? hit.point.addScaledVector(hit.face.normal, .004) : null;
    };
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.39996, u = Math.sin(angle), v = Math.cos(angle);
      const p = project(0, 0), q = project(u * (sideWindow ? .043 : .11), v * .1), r = project(u * (sideWindow ? .105 : .25), v * .24);
      if (p && q) points.push(...p.toArray(), ...q.toArray());
      if (q && r) points.push(...q.toArray(), ...r.toArray());
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const fracture = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xc6d8df, transparent: true, opacity: .74, depthWrite: false }));
    fracture.visible = false; vehicle.add(fracture);
    data.fractures.push({ mesh: fracture, rest: geometry.attributes.position.array.slice(), zone });
  }
  data.damagePrepared=true;
}

function installWearShader(material) {
  if (material.userData.panelWearShader) return;
  material.userData.panelWearShader = true;
  const previous = material.onBeforeCompile, previousKey = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.vertexShader = 'attribute float panelWear; varying float vPanelWear; varying vec3 vWearPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPanelWear=panelWear;vWearPosition=position;');
    shader.fragmentShader = 'varying float vPanelWear; varying vec3 vWearPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float wear = clamp(vPanelWear * 1.8, 0., 1.);
      float grit = fract(sin(dot(floor(vWearPosition * 160.), vec3(12.9898, 78.233, 39.425))) * 43758.5453);
      float streak = smoothstep(.85,.96,fract(vWearPosition.y * 64. + sin(vWearPosition.z * 12.) * .12 + vWearPosition.x * 1.7));
      float scratch = smoothstep(.48,.94,grit) * streak * wear;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.085,.092,.10), wear * .24);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.34,.36,.37), scratch * .82);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, .93, clamp(vPanelWear * 1.5,0.,1.));');
    // Damage lives in the shader, so the normal brake input cannot relight a broken lens.
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= 1. - clamp(vPanelWear * 1.85, 0., .97);');
  };
  material.customProgramCacheKey = () => `${previousKey}:localized-panel-wear-v1`;
  material.needsUpdate = true;
}

const damageWeights = [0, 0, 0, 0];
function weightsAt(x, y, z, strengths) {
  const height = THREE.MathUtils.smoothstep(y, .12, .42);
  damageWeights[0] = strengths[0] * THREE.MathUtils.smoothstep(z, .65, 2.18) * Math.exp(-((x + .22) ** 2) * .38) * height;
  damageWeights[1] = strengths[1] * THREE.MathUtils.smoothstep(-z, .70, 2.15) * Math.exp(-((x - .20) ** 2) * .43) * height;
  const door = Math.exp(-((z - .04) ** 2) * .60 - ((y - .79) ** 2) * 1.7) * height;
  // Vehicle +X is the driver's left, matching contactZone and the source GLB.
  damageWeights[2] = strengths[2] * THREE.MathUtils.smoothstep(x, .32, .99) * door;
  damageWeights[3] = strengths[3] * THREE.MathUtils.smoothstep(-x, .32, .99) * door;
  return damageWeights;
}
function deformGeometry(mesh, rest, strengths, wear, space, roofCrush = 0) {
  const a = mesh.geometry.attributes.position;
  // The default preserves existing cars; tall bodies use canonical panel space.
  const scale = space?.scale || [1, 1, 1], offset = space?.offset || [0, 0, 0];
  if (!roofCrush && !strengths.some(Boolean)) {
    a.array.set(rest); a.needsUpdate = true;
    if (wear) { wear.array.fill(0); wear.needsUpdate = true; }
    mesh.geometry.computeBoundingSphere(); return;
  }
  for (let i = 0; i < a.count; i++) {
    const x = (rest[i * 3] - offset[0]) / scale[0], y = (rest[i * 3 + 1] - offset[1]) / scale[1], z = (rest[i * 3 + 2] - offset[2]) / scale[2];
    const [front, rear, left, right] = weightsAt(x, y, z, strengths);
    const crush = front + rear, side = left + right;
    const crease = Math.sin(z * 24 + x * 19) * .005 + Math.sin(y * 51 + z * 11) * .002;
    // One buckled fold per end reads as crushed sheet metal without regular ripples.
    const buckle = front * Math.exp(-(((z - 1.65) * 7 + x * .7) ** 2)) * .10
      + rear * Math.exp(-(((z + 1.67) * 7 - x * .7) ** 2)) * .10;
    // The tire load collapses the cabin most, with smaller buckles reaching the
    // hood and deck. Deform glazing/interior in the same panel space so nothing
    // is left floating above the flattened roof. The sill stays on its wheels.
    const roof = roofCrush * (.42 + .58 * Math.exp(-((z + .12) ** 2) * .48));
    const upper = Math.max(0, y - .43), fold = Math.sin(z * 8 + x * 3.5) * .025 * roof * THREE.MathUtils.smoothstep(y, .45, .9);
    a.setXYZ(i,
      (x - left * .34 + right * .34 + (right - left) * crease * 1.4 + Math.sign(x) * roof * upper * .10) * scale[0] + offset[0],
      (y - crush * .18 + buckle + (crush + side) * crease + Math.sin(z * 7) * side * .012 - upper * roof * .79 + fold) * scale[1] + offset[1],
      (z - front * .39 + rear * .38 + (front - rear) * crease * 1.2) * scale[2] + offset[2]);
    wear?.setX(i, Math.min(1, Math.max(front, rear, left, right, roof * THREE.MathUtils.smoothstep(y, .35, .85))));
  }
  a.needsUpdate = true; if (wear) wear.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}

const cleanDamageZones=Object.freeze({front:0,rear:0,left:0,right:0});

// NPC meshes are pooled independently of simulation actors. Missing/menu actors
// clear the mesh; unchanged clean or damaged actors never rewrite vertex buffers.
export function updateNpcVehicleDamage(vehicle,actor=null) {
  const zones=actor?.damageZones||cleanDamageZones;
  const crush=crushAmount(actor?.crushDamage);
  const key=`${Math.max(0,Number(zones.front)||0)}:${Math.max(0,Number(zones.rear)||0)}:${Math.max(0,Number(zones.left)||0)}:${Math.max(0,Number(zones.right)||0)}:false:${crush}`;
  if(vehicle.userData.damageKey===key)return false;
  updateVehicleDamage(vehicle,0,false,0,zones,crush);
  return true;
}

const crushAmount=value=>Number.isFinite(value)?THREE.MathUtils.clamp(value,0,1):0;

export function updateVehicleDamage(vehicle, count, catastrophic, age = 0, damageZones, crushDamage = 0) {
  const data = vehicle.userData;
  const roofCrush=crushAmount(crushDamage);
  if (data.contactShadow) data.contactShadow.visible = !catastrophic;
  // Fallback keeps old preview calls useful while gameplay supplies true contact sides.
  const zones = damageZones || { front: Math.min(count || 0, 2), rear: Math.max(0, (count || 0) - 2), left: 0, right: 0 };
  const values = ['front', 'rear', 'left', 'right'].map(zone => Math.max(0, Number(zones[zone]) || 0));
  const strengths = values.map(value => catastrophic ? 1 : 1 - Math.exp(-value * .62));
  const key = `${values.join(':')}:${!!catastrophic}:${roofCrush}`;
  if (data.damageKey !== key) {
    data.damageKey = key;
    const paint = data.paint, total = Math.min(5, values.reduce((a, b) => a + b, 0));
    paint.color.copy(data.originalColor).lerp(new THREE.Color(0x191a1b), catastrophic ? .88 : total * .018);
    paint.roughness = catastrophic ? .94 : data.damageBase?.roughness ?? .22;
    paint.clearcoat = catastrophic ? .05 : data.damageBase?.clearcoat ?? 1;
    for (const { mesh, rest, normals } of data.damageMeshes || []) {
      deformGeometry(mesh, rest, strengths, mesh.geometry.attributes.panelWear, data.damageSpace, roofCrush);
      if (roofCrush || strengths.some(Boolean)) mesh.geometry.computeVertexNormals();
      else if (normals) { mesh.geometry.attributes.normal.array.set(normals); mesh.geometry.attributes.normal.needsUpdate = true; }
    }
    for (const { mesh, rest, zone } of data.fractures || []) {
      mesh.visible = catastrophic || roofCrush > .12 || (zones[zone] || 0) > .2;
      deformGeometry(mesh, rest, strengths, undefined, data.damageSpace, roofCrush);
    }
    // These articulated cabin accessories are outside the baked body batches.
    // Hide the driver only in a flattened wreck; preserve its intact pose for a
    // pooled reset, and lower roof-mounted accessories with the cabin.
    if(data.driver)data.driver.visible=roofCrush<.45;
    if(data.steeringPivot)data.steeringPivot.visible=roofCrush<.45;
    for(const attachment of data.crushAttachments||[]){
      attachment.userData.crushRestY??=attachment.position.y;
      attachment.position.y=attachment.userData.crushRestY*(1-roofCrush*.52);
      attachment.scale.y=1-roofCrush*.52;
    }
  }
  for (let i = 0; i < (data.wheelPivots || []).length; i++) {
    const pivot = data.wheelPivots[i], rest = pivot.userData.restPosition;
    pivot.position.copy(rest); pivot.visible = !(catastrophic && i % 2 === 0);
    // Detached wheels are independent debris in the explosion system.
    const corner = (rest.x > 0 ? strengths[2] : strengths[3]) * .8 + (pivot.userData.front ? strengths[0] : strengths[1]) * .5;
    pivot.rotation.z = corner * .095 * (rest.x < 0 ? -1 : 1);
    pivot.position.x -= Math.sign(rest.x) * corner * .035;
    pivot.rotation.z += Math.sign(rest.x) * roofCrush * .42;
    pivot.position.x += Math.sign(rest.x) * roofCrush * .10;
    pivot.position.y -= roofCrush * .075;
    pivot.scale.y = 1-roofCrush*.18;
  }
}
