import * as THREE from 'three';
import { makeRng } from './rng.js';

// Geometry follows the solid station/warehouse footprints in course.features.
// This layer adds surface construction, not new roadside collision obstacles.
export function addSceneryDetail(world, course) {
  const cityBuildings = (course.features.buildings || []).filter(b => (b.theme || course.themeAt(b.s)) === 'city');
  const detail = new THREE.Group(); detail.name = 'Station and warehouse construction';
  if (!course.features.stations.length && !cityBuildings.length) { world.add(detail); return detail; }
  const wallMap = surfaceMap('plaster'), metalMap = surfaceMap('metal');
  const windowMap = glazingMap(), signs = serviceAtlas();
  const materials = {
    frame: new THREE.MeshStandardMaterial({ color: 0x56676b, roughness: .45, metalness: .72 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9ba6a6, roughness: .57, metalness: .72, map: metalMap, bumpMap: metalMap, bumpScale: .016 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x192326, roughness: .71, metalness: .32 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xb8b3a2, roughness: .96, map: wallMap, bumpMap: wallMap, bumpScale: .015 }),
    soffit: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78, metalness: .15 }),
    enamel: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .48, metalness: .25 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xffebc6, emissive: 0xffce86, emissiveIntensity: .5, roughness: .3 }),
    nightLamp: new THREE.MeshStandardMaterial({ color: 0xffebc6, emissive: 0xffce86, emissiveIntensity: 2.4, roughness: .3 }),
    paint: new THREE.MeshStandardMaterial({ color: 0xd0c6a3, roughness: .95, transparent: true, opacity: .64, depthWrite: false }),
    decal: new THREE.MeshStandardMaterial({ map: signs, transparent: true, alphaTest: .15, roughness: .8, metalness: .05, side: THREE.DoubleSide }),
  };
  const batch = instancedBuilder(detail, materials);
  const decalGeometries = [];
  for (const station of course.features.stations || []) {
    const theme = station.theme || course.themeAt(station.s), night = theme === 'city', coast = theme === 'coast';
    refineStationSurfaces(world, station, { wallMap, windowMap, coast, night });
    stationDetail(batch, station, night, coast);
    decalGeometries.push(decal(station, 0, [0, 1.76, 2.148], [.65, .20], Math.PI));
    decalGeometries.push(decal(station, 1, [1.30, 1.97, 2.242], [.49, .58], Math.PI));
    for (const x of [-3, 3]) decalGeometries.push(decal(station, 2, [x, 2.10, -2.984], [.57, .235], Math.PI));
  }
  if (cityBuildings.length) {
    refineWarehouseSurfaces(world, course, metalMap, windowMap);
    cityBuildings.forEach((building, i) => {
      warehouseDetail(batch, building, i);
      for (const face of [-1, 1]) decalGeometries.push(decal(building, 3, [building.halfX - 1.5, 2.3, face * (building.halfZ + .071)], [1.6, .76], face < 0 ? Math.PI : 0));
    });
  }
  batch.finish();
  if (decalGeometries.length) {
    // Decals share one atlas and one draw, with no extra texture per building.
    const positions = [], normals = [], uv = [];
    for (const geometry of decalGeometries) {
      positions.push(...geometry.attributes.position.array); normals.push(...geometry.attributes.normal.array); uv.push(...geometry.attributes.uv.array); geometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const mesh = new THREE.Mesh(geometry, materials.decal); mesh.receiveShadow = true; detail.add(mesh);
  }
  // Keep texture ownership explicit even in a stage with no warehouse materials.
  detail.userData.sceneryDetail = { stations: course.features.stations.length, warehouses: course.features.buildings?.length || 0, draws: detail.children.length };
  world.add(detail); return detail;
}

function frameMatrix(feature) {
  return new THREE.Matrix4().compose(new THREE.Vector3(feature.x, feature.y, feature.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), feature.heading), new THREE.Vector3(1, 1, 1));
}

function instancedBuilder(group, materials) {
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
    ring: new THREE.TorusGeometry(.43, .035, 6, 20).rotateX(Math.PI / 2),
  };
  const buckets = new Map(), frames = new WeakMap(), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const translation = new THREE.Vector3(), scale = new THREE.Vector3(), angles = new THREE.Euler();
  const cellSize = 256;
  const add = (feature, material, size, position, euler = [0, 0, 0], shape = 'box', tint = 0xffffff) => {
    // Each facade has many small parts but only one immutable world frame.
    // Cache that frame during assembly and reuse scratch vectors for its parts.
    if (!frames.has(feature)) frames.set(feature, frameMatrix(feature));
    rotation.setFromEuler(angles.set(...euler));
    matrix.compose(translation.set(...position), rotation, scale.set(...size)).premultiply(frames.get(feature));
    // Whole-course batches submitted every distant vent, sill and fan whenever
    // any warehouse was visible. Cells change only grouping, never placement.
    const cell = `${Math.floor(matrix.elements[12] / cellSize)}:${Math.floor(matrix.elements[14] / cellSize)}`;
    const key = `${material}:${shape}:${cell}`;
    if (!buckets.has(key)) buckets.set(key, { material: materials[material], shape, cell, items: [] });
    buckets.get(key).items.push({ matrix: matrix.clone(), tint });
  };
  return { add, finish() {
    const used = new Set();
    for (const { material, shape, cell, items } of buckets.values()) {
      const mesh = new THREE.InstancedMesh(geometries[shape], material, items.length); used.add(shape);
      mesh.name = `Architectural ${shape} details`;
      const color = new THREE.Color();
      items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, color.set(item.tint)); });
      mesh.castShadow = material !== materials.paint && material !== materials.lamp && material !== materials.nightLamp;
      mesh.receiveShadow = true;
      // Three's sphere encloses every complete rotated/scaled part, including
      // cell crossings. Derive a conservative box from it instead of walking
      // every instance twice; rendering uses this same padded sphere.
      mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .02;
      mesh.boundingBox = mesh.boundingSphere.getBoundingBox(new THREE.Box3());
      mesh.userData.sceneryCell = { key: cell, size: cellSize };
      group.add(mesh);
    }
    for (const [shape, geometry] of Object.entries(geometries)) if (!used.has(shape)) geometry.dispose();
    const usedMaterials = new Set([...buckets.values()].map(b => b.material));
    for (const [key, material] of Object.entries(materials)) if (key !== 'decal' && !usedMaterials.has(material)) material.dispose();
  } };
}

function stationDetail(batch, s, night, coast) {
  const put = (material, size, p, r, shape, tint) => {
    if (material === 'soffit') tint = coast ? 0xe8e1cb : 0xc9cbc2;
    if (material === 'enamel') tint = coast ? 0x315d72 : night ? 0x294957 : 0x6a4938;
    if (material === 'lamp' && night) material = 'nightLamp';
    batch.add(s, material, size, p, r, shape, tint);
  };
  // Window frames sit over the existing glazing at local z=2.22.
  for (const center of [-3.7, 3.7]) {
    for (const dx of [-1.80, -.60, .60, 1.80]) put('frame', [.052, 1.96, .055], [center + dx, 2.15, 2.167]);
    for (const y of [1.18, 2.52, 3.12]) put('frame', [3.65, .052, .058], [center, y, 2.165]);
    put('concrete', [3.78, .11, .10], [center, 1.14, 2.20]);
  }
  for (const x of [-.64, .64]) put('frame', [.065, 2.77, .073], [x, 1.45, 2.151]);
  for (const y of [.08, 1.03, 2.83]) put('frame', [1.31, .055, .073], [0, y, 2.151]);
  put('steel', [.029, .35, .037], [.43, 1.36, 2.105]);
  // Soffit, shallow rafters, capping and downpipes make the canopy read as built.
  put('soffit', [13.76, .042, 6.28], [0, 3.855, -2.4]);
  for (const z of [-5.26, -2.4, .45]) put('frame', [13.64, .12, .07], [0, 3.79, z]);
  for (const x of [-5.5, 5.5]) {
    put('frame', [.255, .3, .255], [x, .16, -3]);
    put('enamel', [.245, .62, .245], [x, 1.05, -3]);
    for (const z of [-4.25, -.8]) {
      put('dark', [.83, .06, .25], [x * .55, 3.815, z]);
      put('lamp', [.75, .025, .19], [x * .55, 3.775, z]);
    }
  }
  put('steel', [12.44, .045, .17], [0, 4.39, 2.14]);
  put('steel', [12.44, .045, .17], [0, 4.39, 7.86]);
  for (const x of [-5.85, 5.85]) {
    put('steel', [.083, 3.88, .083], [x, 2.06, 2.285], undefined, 'cylinder');
    for (const y of [.65, 2.25, 3.72]) put('frame', [.145, .046, .093], [x, y, 2.28]);
  }
  for (const x of [-2.8, 2.6]) {
    put('dark', [1.9, .10, 1.5], [x, 4.44, 5.8]);
    put('steel', [1.72, .72, 1.3], [x, 4.80, 5.8]);
    put('dark', [.80, .04, .80], [x, 5.178, 5.8], undefined, 'cylinder');
    put('frame', [1, 1, 1], [x, 5.202, 5.8], undefined, 'ring');
    for (let i = -4; i <= 4; i++) put('dark', [1.46, .025, .018], [x, 4.80 + i * .06, 5.14]);
    for (const side of [-1, 1]) put('steel', [.055, .025, .7], [x + side * .21, 5.205, 5.8]);
  }
  put('steel', [.21, .73, .21], [4.76, 4.73, 6.8], undefined, 'cylinder');
  put('dark', [.36, .055, .36], [4.76, 5.105, 6.8], undefined, 'cylinder');
  for (const x of [-3, 3]) {
    put('frame', [.69, .35, .025], [x, 2.1, -2.951]);
    put('dark', [.595, .267, .018], [x, 2.1, -2.969]);
    put('steel', [.045, .30, .026], [x - .30, 1.28, -2.943]);
    put('dark', [.055, .30, .085], [x + .483, 1.40, -2.58], [.16, 0, .12]);
    // Hose stays inside the existing pump footprint (half-width .55, depth .45).
    const points = [[x + .47, 1.90, -2.5], [x + .51, 1.25, -2.31], [x + .45, .55, -2.33], [x + .47, 1.25, -2.57]];
    for (let segment = 0; segment < 3; segment++) {
      const a = new THREE.Vector3(...points[segment]), b = new THREE.Vector3(...points[segment + 1]), axis = b.clone().sub(a);
      const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
      const euler = new THREE.Euler().setFromQuaternion(quaternion);
      put('dark', [.044, axis.length(), .044], a.add(b).multiplyScalar(.5).toArray(), [euler.x, euler.y, euler.z], 'cylinder');
    }
    put('enamel', [.91, .04, .025], [x, 1.16, -2.932]);
  }
  for (const x of [-8.7, -6.0, 6.0, 8.7]) put('paint', [.09, .006, 3.4], [x, .071, 5.95]);
  for (const x of [-7.35, 7.35]) put('paint', [2.75, .006, .09], [x, .071, 7.6]);
}

function warehouseDetail(batch, b, index) {
  const put = (material, size, p, r, shape, tint) => batch.add(b, material === 'lamp' ? 'nightLamp' : material, size, p, r, shape, tint);
  const tint = [0xb3bbc0, 0x778d98, 0xb0a48c, 0x839c9b][index % 4];
  // Slim facade beams subdivide the existing box without enlarging its footprint.
  for (const face of [-1, 1]) {
    const z = face * (b.halfZ + .025);
    for (let x = -b.halfX + .18; x < b.halfX; x += 3.8) {
      put('frame', [.16, b.height, .09], [x, b.height / 2, z], undefined, undefined, tint);
      put('steel', [.24, .19, .10], [x, 3.45, z]);
    }
    for (let y = 3.3; y < b.height; y += 3.1) put('frame', [b.halfX * 2, .085, .08], [0, y, z], undefined, undefined, tint);
    // Existing warehouse panes: fine mullions and sills make the scale legible.
    for (let y = 6; y < b.height - 1; y += 3.1) for (let x = -b.halfX + 1.6; x < b.halfX - 1; x += 2.6) {
      // Upper floors use the same mullions baked into the glazing texture.
      if (y > 10) continue;
      put('dark', [.037, 1.18, .035], [x, y, face * (b.halfZ + .088)]);
      put('dark', [1.48, .035, .035], [x, y, face * (b.halfZ + .088)]);
      put('steel', [1.58, .055, .13], [x, y - .62, face * (b.halfZ + .03)]);
    }
    for (let y = .20; y < 4.75; y += .24) put('steel', [4.66, .026, .036], [0, y, face * (b.halfZ + .077)], undefined, undefined, 0x8d9798);
    for (const x of [-2.46, 2.46]) put('frame', [.10, 4.9, .10], [x, 2.45, z]);
    put('frame', [5.03, .10, .10], [0, 4.91, z]);
    put('dark', [.43, .22, .10], [0, 1.07, face * (b.halfZ + .089)]);
    for (const x of [-b.halfX + .9, b.halfX - .9]) {
      put('dark', [.48, .35, .16], [x, 4.2, z]);
      put('lamp', [.33, .19, .12], [x, 4.2, face * (b.halfZ + .072)]);
    }
  }
  for (const face of [-1, 1]) {
    const x = face * (b.halfX + .026);
    for (let z = -b.halfZ + .16; z < b.halfZ; z += 3.4) put('frame', [.09, b.height, .14], [x, b.height / 2, z], undefined, undefined, tint);
    for (let z = -b.halfZ + 2; z < b.halfZ - 1; z += 3.1) for (let y = 5; y < b.height - 1; y += 3.5) {
      if (y > 9) continue;
      put('dark', [.033, 1.22, .036], [face * (b.halfX + .088), y, z]);
      put('dark', [.033, .036, 1.68], [face * (b.halfX + .088), y, z]);
    }
    put('steel', [.14, .09, b.halfZ * 2], [face * (b.halfX - .01), b.height + .34, 0]);
  }
  // Roof equipment remains entirely over the solid building hull.
  for (const side of [-1, 1]) {
    const x = side * b.halfX * .43, z = side * b.halfZ * .31;
    put('dark', [2.7, .16, 2.2], [x, b.height + .38, z]);
    put('steel', [2.4, .94, 1.8], [x, b.height + .86, z]);
    for (const dx of [-.58, .58]) {
      put('dark', [.79, .04, .79], [x + dx, b.height + 1.35, z], undefined, 'cylinder');
      put('frame', [1, 1, 1], [x + dx, b.height + 1.38, z], undefined, 'ring');
    }
    for (let y = 0; y < 5; y++) put('dark', [2.13, .037, .025], [x, b.height + .60 + y * .13, z - .915]);
  }
  put('steel', [.55, 1.75, .55], [b.halfX * .63, b.height + 1.18, -b.halfZ * .61], undefined, 'cylinder');
  put('dark', [.78, .11, .78], [b.halfX * .63, b.height + 2.07, -b.halfZ * .61], undefined, 'cylinder');
}

function refineStationSurfaces(world, feature, { wallMap, windowMap, coast, night }) {
  const group = world.children.find(o => o.isGroup && Math.abs(o.position.x - feature.x) < .01 && Math.abs(o.position.z - feature.z) < .01
    && o.children.some(mesh => mesh.geometry?.parameters?.width === 12 && mesh.geometry.parameters.height === 4.1));
  if (!group) return;
  const changed = new Set();
  for (const mesh of group.children) {
    const p = mesh.geometry?.parameters, material = mesh.material; if (!p || !material) continue;
    if (p.width === 12 && p.height === 4.1) {
      material.map = wallMap; material.bumpMap = wallMap; material.bumpScale = .015;
      material.color.set(coast ? 0xe6ddc7 : night ? 0xa9b0ab : 0xd5c2a2); material.needsUpdate = true;
    }
    if (p.width === 3.6 && p.height === 1.9 || p.width === 1.2 && p.height === 2.7) {
      const glass = new THREE.MeshStandardMaterial({ color: night ? 0xe8c290 : 0x738d89, map: windowMap, emissiveMap: windowMap, emissive: 0xffbc71, emissiveIntensity: night ? .8 : .08, metalness: .32, roughness: .2 });
      mesh.material = glass;
    }
    if ((p.width === 12.6 || p.width === 14) && !changed.has(material)) {
      material.roughness = .54; material.metalness = .21; if (coast) material.color.set(0x345f76); material.needsUpdate = true; changed.add(material);
    }
  }
}

function refineWarehouseSurfaces(world, course, metalMap, windowMap) {
  for (const mesh of world.children) {
    if (!mesh.isInstancedMesh || !mesh.material?.color) continue;
    const material = mesh.material, color = material.color.getHex();
    if (mesh.count === course.features.buildings.length && color === 0x687d86) {
      material.map = metalMap; material.bumpMap = metalMap; material.bumpScale = .045; material.roughness = .76; material.metalness = .24;
      // Replace the old view-space stripes with surface-attached cladding.
      material.onBeforeCompile = () => {}; material.needsUpdate = true;
      const tint = new THREE.Color(), palette = [0x83969e, 0xb0aaa0, 0x5c7782, 0x81877b, 0x657b85];
      for (let i = 0; i < mesh.count; i++) mesh.setColorAt(i, tint.set(palette[i % palette.length]));
      mesh.instanceColor.needsUpdate = true;
    }
    if (color === 0xffc783 && material.emissiveIntensity === 1.5) {
      material.map = windowMap; material.emissiveMap = windowMap; material.emissiveIntensity = .82; material.roughness = .24; material.needsUpdate = true;
    }
  }
}

function surfaceMap(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), image = x.createImageData(256, 256), rng = makeRng(kind === 'metal' ? 62831 : 52419);
  for (let y = 0; y < 256; y++) for (let u = 0; u < 256; u++) {
    const grain = rng.range(-8, 8), rib = kind === 'metal' ? Math.sin(u * Math.PI / 4) * 11 + Math.cos(u * Math.PI / 2) * 3 : 0;
    const stain = 7 * Math.sin(u * .036 + y * .023) * Math.cos(y * .017 - u * .061);
    const n = 216 + grain + rib + stain, i = (y * 256 + u) * 4;
    image.data[i] = n; image.data[i + 1] = n - 1; image.data[i + 2] = n - 3; image.data[i + 3] = 255;
  }
  x.putImageData(image, 0, 0);
  x.fillStyle = 'rgba(57,49,37,.08)';
  for (let i = 0; i < 34; i++) x.fillRect(rng.range(0, 256), rng.range(0, 230), rng.range(.5, 2), rng.range(5, 33));
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

function glazingMap() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  const gradient = x.createLinearGradient(0, 0, 0, 256); gradient.addColorStop(0, '#363e3c'); gradient.addColorStop(.45, '#a6a08b'); gradient.addColorStop(1, '#4c5957');
  x.fillStyle = gradient; x.fillRect(0, 0, 256, 256);
  x.fillStyle = '#252e2d';
  for (const u of [0, 126, 252]) x.fillRect(u, 0, 4, 256);
  for (const y of [0, 126, 252]) x.fillRect(0, y, 256, 4);
  x.fillStyle = 'rgba(12,24,27,.42)'; x.fillRect(4, 142, 116, 20); x.fillRect(134, 203, 116, 42);
  x.fillStyle = 'rgba(255,239,194,.22)'; x.fillRect(15, 30, 100, 5); x.fillRect(137, 154, 102, 4);
  x.strokeStyle = 'rgba(207,222,215,.12)'; x.lineWidth = 19; x.beginPath(); x.moveTo(4, 16); x.lineTo(245, 212); x.stroke();
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}

function serviceAtlas() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
  const panel = (i, color, title, sub) => {
    const a = i % 2 * 256, b = Math.floor(i / 2) * 256;
    x.fillStyle = color; x.fillRect(a + 3, b + 3, 250, 250); x.strokeStyle = '#c5c5b3'; x.lineWidth = 5; x.strokeRect(a + 8, b + 8, 240, 240);
    x.fillStyle = '#e6e5d3'; x.textAlign = 'center'; x.font = 'bold 35px Arial'; x.fillText(title, a + 128, b + 114); x.font = '24px Arial'; x.fillText(sub, a + 128, b + 170);
  };
  panel(0, '#1d3c43', 'OPEN', 'SERVICE'); panel(1, '#563326', 'NOTICE', 'NO SMOKING');
  panel(2, '#142627', '0089.50', 'LITRES   47.10'); panel(3, '#354246', 'LOADING', 'KEEP CLEAR');
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; return texture;
}

function decal(feature, tile, position, size, yaw) {
  const indexed = new THREE.PlaneGeometry(...size), geometry = indexed.toNonIndexed(); indexed.dispose();
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + tile % 2) / 2, (uv.getY(i) + 1 - Math.floor(tile / 2)) / 2);
  const local = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(1, 1, 1));
  geometry.applyMatrix4(frameMatrix(feature).multiply(local)); return geometry;
}
