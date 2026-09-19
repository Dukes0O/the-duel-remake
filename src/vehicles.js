import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original vehicle design, based on assets/reference/redline-horizons-art-direction.png.
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
  leather: new THREE.MeshStandardMaterial({ color: 0x342d2d, roughness: .84 }),
  brake: new THREE.MeshStandardMaterial({ color: 0xe94928, metalness: .45, roughness: .32 }),
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
function loft(sections, wheelArches = false) {
  if(wheelArches){
    const original=sections, samples=[];
    for(let z=original[0][0];z<original.at(-1)[0];z+=.065)samples.push(z);
    samples.push(original.at(-1)[0]);
    sections=samples.map(z=>{const upper=original.findIndex(p=>p[0]>=z);if(upper<=0)return [...original[0]];
      const a=original[upper-1],b=original[upper],t=(z-a[0])/(b[0]-a[0]);return a.map((v,i)=>i===0?z:v+(b[i]-v)*t);});
  }
  const positions = [], indices = [];
  for (const [z, width, base, shoulder, crown, crownWidth] of sections) {
    const dz=Math.min(Math.abs(z-1.39),Math.abs(z+1.39));
    const arch=wheelArches&&dz<.52?.45+Math.sqrt(.52*.52-dz*dz):base+.13;
    const lower=Math.min(shoulder-.012,Math.max(base+.13,arch));
    for (const [x, y] of [
      [-width * (wheelArches?.73:.86), base], [-width, lower], [-width, shoulder],
      [-crownWidth, crown], [crownWidth, crown], [width, shoulder],
      [width, lower], [width * (wheelArches?.73:.86), base],
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

function makeWheels(vehicle, bodyMaterial, detailed, sedan) {
  const wheels = [], pivots = [];
  const radius = sedan ? 0.39 : 0.43;
  const width = sedan ? 0.28 : 0.34;
  const geo = cached(`tire:${radius}:${detailed}`, () => detailed
    ? new THREE.TorusGeometry(radius - .095, .095, 12, 48).rotateY(Math.PI / 2).scale(width / .19, 1, 1)
    : new THREE.CylinderGeometry(radius, radius, width, 14).rotateZ(Math.PI / 2));
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
    for (let spoke = 0; spoke < (detailed ? 10 : 5); spoke++) {
      const theta = spoke * Math.PI * 2 / (detailed ? 10 : 5);
      batch.box(shared.alloy, [0.043, radius * 0.64, 0.036], [face + side * 0.042, Math.cos(theta) * radius * 0.36, Math.sin(theta) * radius * 0.36], [theta, 0, 0]);
    }
    batch.add(cached('hub', () => new THREE.CylinderGeometry(0.087, 0.087, 0.06, 12).rotateZ(Math.PI / 2)), shared.chrome, [face + side * 0.04, 0, 0]);
    if (detailed) {
      for (let tread = 0; tread < 48; tread++) {
        const theta = tread * Math.PI * 2 / 48;
        for (const row of [-1, 1]) batch.box(shared.trim, [width * .36, .007, .012], [row * width * .22, Math.cos(theta) * radius, Math.sin(theta) * radius], [theta, row * .28, 0]);
        if (tread % 2 === 0) batch.add(cached('disc-hole', () => new THREE.CylinderGeometry(.012, .012, .003, 5).rotateZ(Math.PI / 2)), shared.trim,
          [face + side * .021, Math.cos(theta) * radius * .53, Math.sin(theta) * radius * .53]);
      }
      for (let lug = 0; lug < 5; lug++) {
        const theta = lug * Math.PI * 2 / 5;
        batch.add(cached('lug', () => new THREE.CylinderGeometry(.017, .017, .02, 6).rotateZ(Math.PI / 2)), shared.darkAlloy,
          [face + side * .08, Math.cos(theta) * .058, Math.sin(theta) * .058]);
      }
      const caliper = new THREE.Mesh(cached('caliper', () => new THREE.BoxGeometry(.07, .21, .11)), shared.brake);
      caliper.position.set(face, .07, -.20); pivot.add(caliper);
    }
    batch.finish();
    pivot.add(wheel); vehicle.add(pivot); wheels.push(wheel); pivots.push(pivot);
    pivot.userData.restPosition = pivot.position.clone();
  }
  vehicle.userData.wheels = wheels;
  vehicle.userData.wheelPivots = pivots;
}

export function createVehicle({ color = 0xef382b, accent = 0x111924, kind = 'sport', detail = 'high' } = {}) {
  const vehicle = new THREE.Group();
  vehicle.name = `vehicle-${kind}`;
  const sedan = kind === 'sedan' || kind === 'traffic';
  const silver = kind === 'stuttgart';
  const detailed = detail === 'high' && !sedan;
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: silver ? .8 : .58, roughness: .22, clearcoat: 1, clearcoatRoughness: .09 });
  const originalColor = paint.color.clone();
  if (detailed) paint.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vPaintPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaintPosition=position;');
    shader.fragmentShader = 'varying vec3 vPaintPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nfloat fleck=fract(sin(dot(floor(vPaintPosition*420.),vec3(12.9898,78.233,39.425)))*43758.5453); roughnessFactor += (fleck-.5)*.055;');
  };
  const accentMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(accent).lerp(new THREE.Color(0x151a20),.92), metalness: 0.3, roughness: 0.42 });
  const b = staticBatch(vehicle);
  const body = loft(sedan ? [
    [-2.23, 0.93, 0.31, 0.87, 0.96, 0.79], [-1.48, 1.05, 0.3, 0.98, 1.04, 0.84],
    [0, 1.02, 0.29, 0.93, 0.99, 0.83], [1.42, 1.02, 0.3, 0.85, 0.92, 0.82], [2.22, 0.92, 0.37, 0.7, 0.76, 0.8],
  ] : silver ? [
    [-2.3,.88,.34,.78,.88,.74],[-2.05,1.04,.28,.91,1.02,.87],[-1.55,1.12,.27,1.02,1.08,.89],
    [-.85,1.04,.26,.92,1,.78],[0,1.02,.26,.85,.94,.75],[.75,1.05,.28,.86,.94,.79],
    [1.3,1.1,.3,.94,.99,.84],[1.8,1.04,.32,.8,.86,.83],[2.16,.93,.4,.64,.71,.76],[2.36,.78,.43,.57,.64,.7],
  ] : [
    [-2.33, 0.95, 0.35, 0.88, 0.97, 0.86], [-2.06, 1.08, 0.29, 0.99, 1.03, 0.87],
    [-1.37, 1.1, 0.28, 0.98, 1.07, 0.85], [-0.35, 1.02, 0.26, 0.9, 0.98, 0.77],
    [0.8, 1.0, 0.27, 0.83, 0.93, 0.75], [1.38, 1.07, 0.28, 0.84, 0.88, 0.87],
    [1.96, 0.99, 0.35, 0.63, 0.72, 0.84], [2.36, 0.9, 0.42, 0.55, 0.61, 0.79],
  ], !sedan);
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

  const cabin = loft(sedan ? [
    [-1.27, 0.86, 0.94, 0.98, 1.0, 0.78], [-0.81, 0.8, 0.96, 1.18, 1.52, 0.64],
    [0.36, 0.8, 0.94, 1.18, 1.52, 0.64], [1.03, 0.84, 0.89, 0.94, 0.97, 0.77],
  ] : [
    [-1.25, 0.86, 0.93, 0.99, 1.03, 0.79], [-0.58, 0.81, 0.95, 1.23, 1.49, 0.64],
    [0.21, 0.8, 0.93, 1.2, silver ? 1.48 : 1.44, 0.65], [1.09, 0.81, 0.89, 0.92, 0.94, 0.76],
  ]);
  b.add(cabin, shared.glass); cabin.dispose();
  b.box(paint, [1.32, 0.035, sedan ? 1.1 : 0.75], [0, sedan ? 1.53 : 1.474, sedan ? -0.23 : -0.195], [sedan ? 0 : 0.055, 0, 0]);
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
    if (!sedan) {
      b.box(shared.trim, [0.019, 0.29, 0.51], [side * 1.069, 0.68, -0.86], [0.14, 0, 0]);
      for (let i = 0; i < 4; i++) b.box(accentMaterial, [0.035, 0.021, 0.47], [side * 1.085, 0.565 + i * 0.07, -0.86]);
    }
  }
  // Tail panel and 4 separate red lenses remain dynamic for braking.
  b.box(shared.trim, [1.83, 0.285, 0.037], [0, 0.785, -2.335]);
  for (let slot = 0; slot < 5; slot++) b.box(accentMaterial, [0.94, 0.016, 0.026], [0, 0.678 + slot * 0.048, -2.361]);
  const brakeLights = [];
  const brakeMaterial = new THREE.MeshStandardMaterial({ color: 0xef211c, emissive: 0xff2116, emissiveIntensity: 0.85, roughness: 0.3 });
  for (const x of [-0.76, -0.49, 0.49, 0.76]) {
    b.add(cached('tail-rim', () => new THREE.CylinderGeometry(0.128, 0.128, 0.024, 18).rotateX(Math.PI / 2)), shared.darkAlloy, [x, 0.785, -2.365]);
    const light = new THREE.Mesh(cached('tail', () => new THREE.TorusGeometry(0.082, 0.028, 7, 18)), brakeMaterial);
    light.position.set(x, 0.785, -2.389); brakeLights.push(light); vehicle.add(light);
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
  if (!sedan) {
    // Rear glass louvers, engine vents and freestanding wing.
    for (let i = 0; i < 8; i++) {
      b.box(shared.trim, [1.43 - i * 0.021, 0.028, 0.07], [0, 1.065 + i * 0.049, -1.26 + i * 0.085], [-0.24, 0, 0]);
    }
    for (let i = 0; i < 5; i++) b.box(shared.trim, [1.37, 0.018, 0.033], [0, 1.046, -1.43 - i * 0.09]);
    for (const side of [-1, 1]) b.box(accentMaterial, [0.065, 0.16, 0.25], [side * 0.76, 1.094, -2.026], [-0.22, 0, 0]);
    b.box(paint, [2.08, 0.075, 0.27], [0, 1.19, -2.058], [-0.07, 0, 0]);
    for (const side of [-1, 1]) b.box(paint, [0.065, 0.14, 0.32], [side * 1.027, 1.19, -2.058]);
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
  if (detailed) {
    addFineDetail(b, silver, paint);
    for (let i = -2; i <= 2; i++) b.box(shared.trim, [0.025, 0.18, 0.35], [i * 0.24, 0.365, -2.2], [-0.15, 0, 0]);
  }
  b.finish();
  vehicle.userData.damageMeshes = vehicle.children.filter(o => o.isMesh && !o.geometry.userData.sharedAsset).map(mesh => ({mesh, rest: mesh.geometry.attributes.position.array.slice()}));
  vehicle.userData.paint = paint; vehicle.userData.originalColor = originalColor;
  makeWheels(vehicle, paint, detailed, sedan);
  if (detailed) {
    const cracks = new THREE.BufferGeometry(), points = [];
    for (let i=0;i<12;i++) { const angle=i*2.4, x=Math.sin(angle)*.3, z=Math.cos(angle)*.19; points.push(-.2,1.195,.64,-.2+x,1.195-z*.53,.64+z); }
    cracks.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    const fracture = new THREE.LineSegments(cracks,new THREE.LineBasicMaterial({color:0xb8dce4,transparent:true,opacity:.65}));
    fracture.visible=false; vehicle.add(fracture); vehicle.userData.fracture=fracture;
  }
  vehicle.userData.size = { width: 2.59, length: 4.8, height: sedan ? 1.55 : 1.52 };
  return vehicle;
}

function addFineDetail(b, silver, paint) {
  // Seats, instrument binnacle and roll structure can be seen through the glazing.
  for (const side of [-1,1]) {
    b.box(shared.leather,[.48,.18,.52],[side*.41,.83,-.18]);
    b.box(shared.leather,[.48,.58,.16],[side*.41,1.08,-.45],[-.18,0,0]);
    b.box(shared.trim,[.27,.19,.13],[side*.41,1.39,-.49]);
    b.box(shared.brake,[.044,.43,.025],[side*.41-.09,1.10,-.345],[-.18,0,0]);
    b.box(shared.brake,[.044,.43,.025],[side*.41+.09,1.10,-.345],[-.18,0,0]);
    b.box(shared.trim,[.012,.37,.014],[side*1.025,.68,.48]);
    b.box(shared.trim,[.013,.015,.83],[side*1.027,.51,.05]);
    b.box(shared.trim,[.014,.35,.014],[side*1.05,.7,-.42]);
    b.box(shared.chrome,[.015,.026,.125],[side*1.041,.824,-.23]);
    b.box(shared.trim,[.014,.014,1.11],[side*.89,.851,1.12],[-.12,0,0]);
    for (let i=0;i<10;i++) b.box(shared.darkAlloy,[.21,.008,.012],[side*.50,.878-i*.008,1.24+i*.041],[.17,0,0]);
    for (let i=0;i<12;i++) b.box(shared.chrome,[.023,.067,.005],[side*.56+(i-5.5)*.027,.53,2.388]);
    for (let i=0;i<9;i++) b.box(shared.darkAlloy,[.012,.16,.018],[side*.55+(i-4)*.045,.51,-2.36]);
    b.add(cached('fuelcap',()=>new THREE.CylinderGeometry(.068,.068,.014,24).rotateZ(Math.PI/2)),shared.darkAlloy,[side*1.091,.918,-1.42]);
  }
  b.box(shared.trim,[1.43,.14,.3],[0,1.02,.54]);
  b.box(shared.trim,[.42,.13,.22],[-.41,1.13,.56]);
  b.box(shared.alloy,[.08,.032,.06],[-.39,1.115,.438]);
  b.add(cached('steering-wheel',()=>new THREE.TorusGeometry(.17,.025,8,32).rotateX(-.36)),shared.leather,[-.41,1.1,.32]);
  b.box(shared.chrome,[.29,.023,.015],[-.41,1.1,.32]);
  b.box(shared.trim,[.13,.08,.017],[-.41,1.1,.32]);
  b.box(shared.leather,[.14,.12,.64],[0,.99,-.03]);
  b.box(shared.chrome,[.024,.17,.024],[0,1.08,.13]);
  b.add(cached('shiftknob',()=>new THREE.SphereGeometry(.038,12,8)),shared.trim,[0,1.175,.13]);
  // Engine hardware glimpsed between louvers and a finned rear diffuser.
  b.box(shared.darkAlloy,[.8,.16,.64],[0,.995,-1.55]);
  for(let i=0;i<7;i++) b.box(shared.alloy,[.71,.035,.026],[0,1.09,-1.3-i*.08]);
  b.box(shared.brake,[.64,.028,.13],[0,1.11,-1.58]);
  for(let i=0;i<3;i++) b.box(shared.chrome,[.09,.02,.016],[(i-1)*.16,.98,-2.35]);
  b.box(shared.trim,[.37,.13,.027],[0,.455,-2.359]);
  b.box(shared.alloy,[.3,.085,.006],[0,.455,-2.379]);
  for(let i=0;i<7;i++) b.box(shared.trim,[.017,.05,.008],[(i-3)*.031,.455,-2.387]);
  // Hood shut lines and front intake vanes stay visible in the garage camera.
  for (const side of [-1,1]) b.box(shared.trim,[.012,.009,.68],[side*.40,.808,1.51],[.17,0,0]);
  for(let i=-8;i<=8;i++) b.box(shared.darkAlloy,[.027,.073,.013],[i*.042,.48,2.376]);
}

export function updateVehicleDamage(vehicle, count, catastrophic, age = 0) {
  if(vehicle.userData.contactShadow) vehicle.userData.contactShadow.visible = !catastrophic;
  const damage = Math.min(3, (count || 0)*.6), key = `${damage}:${catastrophic}`;
  if (vehicle.userData.damageKey !== key) {
    vehicle.userData.damageKey = key;
    const paint=vehicle.userData.paint;
    paint.color.copy(vehicle.userData.originalColor).lerp(new THREE.Color(0x191a1b),catastrophic?.88:damage*.14);
    paint.roughness = .22+damage*.14; paint.clearcoat = catastrophic ? .05 : 1-damage*.16;
    for (const {mesh,rest} of vehicle.userData.damageMeshes || []) {
      const a=mesh.geometry.attributes.position;
      for(let i=0;i<a.count;i++) {
        const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
        const dent=Math.exp(-((x+.8)**2*3+(z-1.8)**2*1.6))*damage;
        const rear=Math.exp(-((x-.7)**2*3+(z+1.9)**2*2))*Math.max(0,damage-1);
        a.setXYZ(i,x+dent*.13-rear*.08,y-dent*.14+Math.sin(z*21+x*16)*dent*.025,z-dent*.19+rear*.16);
      }
      a.needsUpdate=true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    }
    if(vehicle.userData.fracture)vehicle.userData.fracture.visible=damage>0;
  }
  for (let i=0;i<(vehicle.userData.wheelPivots||[]).length;i++) {
    const pivot=vehicle.userData.wheelPivots[i]; pivot.position.copy(pivot.userData.restPosition);
    pivot.visible=!(catastrophic&&i%2===0);
    if(catastrophic && i%2===0) { const t=Math.min(2,age),side=pivot.position.x<0?-1:1;
      pivot.position.x+=side*t*2.4; pivot.position.z+=(i===0?-1:1)*t*1.8;
      pivot.position.y+=Math.max(-.15,Math.sin(Math.min(1,t/1.2)*Math.PI)*1.5);
      pivot.rotation.z=side*Math.min(age*4,Math.PI/2);
    } else pivot.rotation.z=damage*.025*(i%2?1:-1);
  }
}
