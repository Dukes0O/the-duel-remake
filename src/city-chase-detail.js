import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createCityInteriorMaterial } from './city-interiors.js';

// Shared with the base building renderer: only these complete facades replace
// its legacy windows. Buildings crossing a biome edge keep their fallback.
export function hasDetailedCityFacade(course, building) {
  if ((building.theme || course.themeAt(building.s)) !== 'city') return false;
  const reach = Math.hypot(building.halfX, building.halfZ) + 1;
  return course.themeAt(building.s - reach) === 'city' && course.themeAt(building.s + reach) === 'city';
}

// All substantial geometry is attached to existing building/pole collision
// footprints. Street surfaces are shallow, drivable overlays sampled from Course.
export function addCityChaseDetail(world, course) {
  const sections = course.sections.filter(s => s.theme === 'city');
  if (!sections.length) return null;
  const group = new THREE.Group(); group.name = 'City storefronts and street surfaces';
  const atlas = signAtlas(), masonry = masonryTexture(), concrete = pavementTexture();
  const mats = {
    masonry: new THREE.MeshStandardMaterial({ color: 0xffffff, map: masonry, bumpMap: masonry, bumpScale: .018, roughness: .96, vertexColors: true }),
    stone: new THREE.MeshStandardMaterial({ color: 0xaba596, roughness: .97, side: THREE.DoubleSide }),
    metal: new THREE.MeshStandardMaterial({ color: 0x59727b, metalness: .72, roughness: .46 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x16232c, metalness: .42, roughness: .55, side: THREE.DoubleSide }),
    glass: createCityInteriorMaterial(),
    warm: new THREE.MeshStandardMaterial({ color: 0xf6d89f, emissive: 0xffad53, emissiveIntensity: .9, roughness: .4 }),
    cyan: new THREE.MeshStandardMaterial({ color: 0x8ff1ec, emissive: 0x38ddda, emissiveIntensity: 2.1 }),
    pink: new THREE.MeshStandardMaterial({ color: 0xf49dba, emissive: 0xe54184, emissiveIntensity: 2.0 }),
    pavement: new THREE.MeshStandardMaterial({ color: 0xd5d0c6, map: concrete, bumpMap: concrete, bumpScale: .013, roughness: .95, side: THREE.DoubleSide }),
    marking: new THREE.MeshStandardMaterial({ color: 0xbac3bf, roughness: .9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    signs: new THREE.MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .42, side: THREE.DoubleSide }),
  };
  const batch = batches(group, mats), signs = [];
  const buildings = course.features.buildings.filter(b => hasDetailedCityFacade(course, b));
  buildings.forEach((b, index) => facade(batch, signs, b, index));
  let crossings = 0;
  for (const section of sections) {
    for (let s = section.start + 12; s < section.end - 12; s += 6) {
      const end = Math.min(section.end - 12, s + 6), middle = (s + end) / 2;
      if (course.features.stations.some(v => Math.abs(v.s - middle) < 23)) continue;
      if (course.features.shortcuts.some(v => middle > v.start - 18 && middle < v.end + 18)) continue;
      for (const side of [-1, 1]) {
        const offset = (ss, d) => side * (course.roadHalfWidthAt(ss) + d);
        batch.geo('pavement', roadQuad(course, s, end, ss => offset(ss, .75), ss => offset(ss, 5.1), .17));
        batch.geo('stone', roadQuad(course, s, end, ss => offset(ss, .75), ss => offset(ss, 1.0), .19));
        batch.geo('stone', curbFace(course, s, end, ss => offset(ss, .75)));
        batch.geo('dark', roadQuad(course, s, Math.min(end, s + .024), ss => offset(ss, 1.03), ss => offset(ss, 5.1), .172));
        if (Math.floor(s / 6) % 5 === 0) batch.geo('dark', roadQuad(course, s + 2, Math.min(end, s + 3.1), ss => offset(ss, .35), ss => offset(ss, .67), .016));
      }
    }
    for (let s = section.start + 135; s < section.end - 80; s += 365) {
      if (course.tunnelAt(s) || course.features.stations.some(v => Math.abs(v.s - s) < 35)) continue;
      const width = course.roadHalfWidthAt(s);
      for (let off = -width + .7; off < width - .3; off += 1.25) batch.geo('marking', roadQuad(course, s, s + 3.5, () => off, () => Math.min(width - .4, off + .65), .06, true));
      batch.geo('marking', roadQuad(course, s - 3.0, s - 2.68, () => -width + .5, () => -.3, .06, true));
      crossings++;
    }
  }
  const poles = course.features.poles.filter(p => (p.theme || course.themeAt(p.s)) === 'city');
  poles.forEach((pole, i) => {
    // Cabinets and sockets fit the existing 0.2 m radius pole hull. Signboards
    // sit above vehicle clearance rather than creating new roadside hazards.
    batch.put(pole, 'dark', [.30, .83, .30], [0, .67, 0]);
    for (const y of [.3, 1.07]) batch.put(pole, 'metal', [.33, .045, .33], [0, y, 0]);
    batch.put(pole, 'metal', [.08, .7, .06], [.145, .7, 0]);
    batch.put(pole, 'dark', [1.2, .45, .075], [.0, 5.0, 0]);
    signs.push(sign(pole, i % 2 ? 6 : 7, [0, 5.0, -.045], [1.16, .42], Math.PI));
    batch.put(pole, i % 2 ? 'pink' : 'cyan', [.14, 1.6, .14], [0, 7.5, 0]);
  });
  for (const geometry of signs) batch.geo('signs', geometry);
  batch.finish();
  group.userData.cityDetail = { buildings: buildings.length, poles: poles.length, crossings, draws: group.children.length, sections: sections.map(s => [s.start, s.end]) };
  world.add(group); return group;
}

function transform(feature) {
  return new THREE.Matrix4().compose(new THREE.Vector3(feature.x, feature.y, feature.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), feature.heading), new THREE.Vector3(1, 1, 1));
}
function batches(group, mats) {
  const buckets = new Map(), surfaces = new Map(), cube = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(.5, .5, 1, 12), pane = new THREE.PlaneGeometry(1, 1).translate(0, 0, .5);
  // A single batch spanning the whole city defeats frustum and shadow culling.
  // Nearby blocks share draws; distant blocks keep their own finite bounds.
  const cell=(x,z)=>`${Math.floor(x/200)}:${Math.floor(z/200)}`;
  const surface=(mat,geometry)=>{
    geometry.computeBoundingBox();const box=geometry.boundingBox,key=`${mat}:${cell((box.min.x+box.max.x)/2,(box.min.z+box.max.z)/2)}`;
    if(!surfaces.has(key))surfaces.set(key,{mat,geometries:[]});surfaces.get(key).geometries.push(geometry);
  };
  return { put(feature, mat, size, position, rotation = [0, 0, 0], shape = 'box', tint = 0xffffff) {
    // Glass occupies only the existing outside face. A two-triangle quad avoids
    // rendering the five box faces already hidden by the solid wall/frame.
    if (mat === 'glass') {
      const thinX = size[0] < size[2], facing = Math.sign(position[thinX ? 0 : 2]) || 1;
      rotation = [rotation[0], rotation[1] + (thinX ? facing * Math.PI / 2 : facing < 0 ? Math.PI : 0), rotation[2]];
      size = [thinX ? size[2] : size[0], size[1], thinX ? size[0] : size[2]];
      shape = 'pane';
    }
    const local = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...size));
    if (mat === 'masonry') {
      // Bake physical UVs before merging. One generated brick sheet covers
      // 1.6 m, so tall buildings retain real brick scale instead of stretching.
      const geometry = cube.clone(), p = geometry.attributes.position, n = geometry.attributes.normal, uv = geometry.attributes.uv, colors = [], color = new THREE.Color(tint);
      for (let i = 0; i < p.count; i++) {
        uv.setXY(i, (Math.abs(n.getX(i)) > .5 ? p.getZ(i) * size[2] : p.getX(i) * size[0]) / 1.6, p.getY(i) * size[1] / 1.6);
        colors.push(color.r, color.g, color.b);
      }
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.applyMatrix4(transform(feature).multiply(local));
      surface(mat,geometry); return;
    }
    const key = `${mat}:${shape}:${cell(feature.x,feature.z)}`; if (!buckets.has(key)) buckets.set(key, { mat, shape, entries: [] });
    buckets.get(key).entries.push({ matrix: transform(feature).multiply(local), tint });
  }, geo(mat, geometry) { surface(mat,geometry); }, finish() {
    const used = new Set(), shapes = new Set();
    for (const { mat, shape, entries } of buckets.values()) {
      used.add(mat); shapes.add(shape);
      const mesh = new THREE.InstancedMesh(shape === 'box' ? cube : shape === 'pane' ? pane : cylinder, mats[mat], entries.length); mesh.name = `City ${mat} ${shape}`;
      const color = new THREE.Color(); entries.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); mesh.setColorAt(i, color.set(entry.tint)); });
      mesh.castShadow = !['glass', 'warm', 'cyan', 'pink'].includes(mat); mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const {mat, geometries} of surfaces.values()) {
      used.add(mat); const geometry = mergeGeometries(geometries, false); geometries.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geometry, mats[mat]); mesh.name = `City ${mat} surface`; mesh.receiveShadow = true;geometry.computeBoundingSphere(); group.add(mesh);
    }
    if (!shapes.has('box')) cube.dispose(); if (!shapes.has('cylinder')) cylinder.dispose(); if (!shapes.has('pane')) pane.dispose();
    for (const [name, material] of Object.entries(mats)) if (!used.has(name)) { for (const map of [material.map, material.bumpMap, material.emissiveMap]) if (map) map.dispose(); material.dispose(); }
  } };
}

function facade(batch, signs, b, index) {
  const roadSide = -Math.sign(b.off), faceX = roadSide * (b.halfX + .085), palette = [0xfff2e5, 0xe7e8dd, 0xd8e2e2, 0xecd9c0, 0xc6ced2];
  const put = (mat, size, p, r, shape, tint) => batch.put(b, mat, size, p, r, shape, tint);
  const foundation = b.foundationDepth || 0;
  if (foundation) {
    for (const side of [-1, 1]) {
      put('stone', [.085, foundation + .32, b.halfZ * 2], [side * b.halfX, (.32 - foundation) / 2, 0]);
      put('stone', [b.halfX * 2, foundation + .32, .085], [0, (.32 - foundation) / 2, side * b.halfZ]);
    }
  }
  // Masonry bays lie between the existing side windows, preserving the original
  // window locations and the building's physical silhouette.
  for (let z = -b.halfZ + .6; z < b.halfZ; z += 3.1) {
    put('masonry', [.055, b.height - .45, 1.05], [faceX, b.height / 2, z], undefined, undefined, palette[index % palette.length]);
  }
  for (let y = 3.55; y < b.height; y += 3.5) {
    put('stone', [.18, .21, b.halfZ * 2 + .12], [faceX, y, 0]);
    put('dark', [.055, .06, b.halfZ * 2], [faceX + roadSide * .06, y - .18, 0]);
  }
  for (const z of [-b.halfZ + .17, b.halfZ - .17]) put('stone', [.19, b.height + .2, .32], [faceX, b.height / 2, z]);
  const bays = Math.max(2, Math.floor((b.halfZ * 2 - 1) / 4.2)), step = (b.halfZ * 2 - .8) / bays;
  for (let i = 0; i < bays; i++) {
    const z = -b.halfZ + .4 + (i + .5) * step, width = step - .16;
    put('dark', [.105, 3.2, width], [faceX, 1.66, z]);
    put('glass', [.11, 2.55, width - .26], [faceX + roadSide * .052, 1.55, z]);
    for (const dz of [-width * .44, 0, width * .44]) put('metal', [.15, 2.73, .058], [faceX + roadSide * .1, 1.55, z + dz]);
    for (const y of [.18, 2.89]) put('metal', [.16, .055, width - .1], [faceX + roadSide * .1, y, z]);
    put('warm', [.16, .10, width - .37], [faceX + roadSide * .13, 2.8, z]);
    put('metal', [.20, .44, .035], [faceX + roadSide * .13, 1.33, z + .25]);
    put('dark', [.39, .17, width + .08], [faceX + roadSide * .075, 3.40, z]);
    put(index % 3 ? 'cyan' : 'pink', [.043, .025, width - .05], [faceX + roadSide * .28, 3.38, z]);
    signs.push(sign(b, (index + i) % 8, [faceX + roadSide * .2, 3.075, z], [width - .22, .48], roadSide * Math.PI / 2));
  }
  // Thin overlays cover the existing upper panes, inside the facade's current
  // trim envelope. The same glass material/batches supply all interior depth.
  for (const face of [-1, 1]) {
    for (let z = -b.halfZ + 2; z < b.halfZ - 1; z += 3.1) for (let y = 5; y < b.height - 1; y += 3.5) {
      put('glass', [.03, 1.12, 1.57], [face * (b.halfX + .092), y, z]);
    }
    for (let y = 6; y < b.height - 1; y += 3.1) for (let x = -b.halfX + 1.6; x < b.halfX - 1; x += 2.6) {
      put('glass', [1.37, 1.07, .03], [x, y, face * (b.halfZ + .092)]);
    }
  }
  // Vertical illuminated business markers sit flush against solid facades.
  const neon = index % 2 ? 'pink' : 'cyan', z = b.halfZ - .65;
  put('dark', [.22, 3.8, .78], [faceX, 7.4, z]);
  put(neon, [.035, 3.63, .044], [faceX + roadSide * .14, 7.4, z - .31]);
  put(neon, [.035, 3.63, .044], [faceX + roadSide * .14, 7.4, z + .31]);
  signs.push(sign(b, index % 8, [faceX + roadSide * .16, 7.4, z], [3.45, .62], roadSide * Math.PI / 2, Math.PI / 2));
  // Fire escape lands on the end wall. Its shallow projections start above
  // 4 m, leaving the existing ground-level collision hull unchanged.
  const end = index % 2 ? -1 : 1, endZ = end * (b.halfZ + .105), x = b.halfX * .45;
  for (let y = 4.25, floor = 0; y < b.height - .7; y += 3.1, floor++) {
    put('dark', [2.1, .10, .55], [x, y, endZ]);
    put('metal', [2.08, .045, .045], [x, y + .84, endZ + end * .28]);
    for (const dx of [-.95, -.48, 0, .48, .95]) put('metal', [.035, .85, .035], [x + dx, y + .42, endZ + end * .28]);
    for (const dx of [-.34, .34]) put('metal', [.045, 3.2, .055], [x + dx, y + 1.45, endZ + end * .14]);
    for (let step = 0; step < 10; step++) put('metal', [.73, .036, .06], [x, y + .1 + step * .31, endZ + end * .14]);
  }
  for (const face of [-1, 1]) {
    put('stone', [b.halfX * 2 + .18, .55, .20], [0, b.height + .35, face * (b.halfZ - .05)]);
    put('stone', [.20, .55, b.halfZ * 2], [face * (b.halfX - .05), b.height + .35, 0]);
  }
  // Rooftop ductwork, fan housings and a water tank stay inside the footprint.
  const tankX = -b.halfX * .43, tankZ = b.halfZ * .35;
  put('metal', [2.25, 2.3, 2.25], [tankX, b.height + 1.9, tankZ], undefined, 'cylinder', 0x98948b);
  for (const y of [.93, 2.17, 2.91]) put('dark', [2.31, .065, 2.31], [tankX, b.height + y, tankZ], undefined, 'cylinder');
  for (const x of [-.72, .72]) for (const zz of [-.72, .72]) put('metal', [.10, .64, .10], [tankX + x, b.height + .6, tankZ + zz]);
  put('metal', [Math.max(2.4, b.halfX * .85), .58, .74], [b.halfX * .13, b.height + .65, -b.halfZ * .48]);
  put('dark', [1.55, .10, 1.55], [b.halfX * .45, b.height + .41, -b.halfZ * .48]);
  put('metal', [1.33, 1.35, 1.33], [b.halfX * .45, b.height + 1.1, -b.halfZ * .48]);
  for (let y = 0; y < 7; y++) put('dark', [1.16, .055, .03], [b.halfX * .45, b.height + .6 + y * .16, -b.halfZ * .48 - .68]);
}

function roadQuad(course, s0, s1, off0, off1, lift, followsRoad = false) {
  // Sidewalks follow terrain; painted crossings follow the raised asphalt.
  // The road is worldAt +.035, while groundAt can be lower or uneven here.
  const points = [[s0, off0(s0)], [s0, off1(s0)], [s1, off0(s1)], [s1, off1(s1)]].map(([s, off]) => { const p = followsRoad ? course.worldAt(s, off) : course.groundAt(s, off); return [p.x, p.y + lift, p.z]; });
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  // Concrete keeps a two-metre scale across strips, curves and cell boundaries.
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([off0(s0)/2,s0/2,off1(s0)/2,s0/2,off0(s1)/2,s1/2,off1(s1)/2,s1/2], 2)); geometry.setIndex([0, 2, 1, 1, 2, 3]); geometry.computeVertexNormals(); return geometry;
}

function curbFace(course,s0,s1,offset){
  const a=course.groundAt(s0,offset(s0)),b=course.groundAt(s1,offset(s1));
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y+.025,a.z,b.x,b.y+.025,b.z,a.x,a.y+.19,a.z,b.x,b.y+.19,b.z],3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute([s0/2,0,s1/2,0,s0/2,.0825,s1/2,.0825],2));
  g.setIndex([0,2,1,1,2,3]);g.computeVertexNormals();return g;
}

function sign(feature, tile, position, size, yaw, roll = 0) {
  const geometry = new THREE.PlaneGeometry(...size), uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * .98 + .01 + tile % 4) / 4, (uv.getY(i) * .98 + .01 + 1 - Math.floor(tile / 4)) / 2);
  const local = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, roll, 'YXZ')), new THREE.Vector3(1, 1, 1));
  geometry.applyMatrix4(transform(feature).multiply(local)); return geometry;
}

function fallbackTexture() {
  const t = new THREE.DataTexture(new Uint8Array([150, 150, 145, 255]), 1, 1); t.needsUpdate = true; return t;
}
function signAtlas() {
  if (typeof document === 'undefined') return fallbackTexture();
  const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const x = c.getContext('2d');
  const names = [['NIGHT SHIFT', 'COFFEE · UNTIL LATE'], ['LANTERN', 'ROOMS · OLD HARBOR'], ['TURBO WORKS', 'PERFORMANCE GARAGE'], ['CITY MARKET', 'FRESH · LOCAL · DAILY'], ['ELECTRIC', 'ARCADE · OPEN LATE'], ['AFTER HOURS', 'VINYL · SOUND · CULTURE'], ['OLD HARBOR', 'WATERFRONT DISTRICT'], ['NEON EXCHANGE', 'DOWNTOWN DISTRICT']];
  names.forEach(([title, subtitle], i) => {
    const a = i % 4 * 512, b = Math.floor(i / 4) * 128, tint = i % 3 === 0 ? '#f5a6c2' : i % 3 === 1 ? '#f3d6a1' : '#75e1dc';
    x.fillStyle = '#122029'; x.fillRect(a, b, 512, 128); x.strokeStyle = tint; x.lineWidth = 2; x.strokeRect(a + 12, b + 8, 488, 112);
    x.strokeStyle = '#344950'; x.lineWidth = 1; for (let j = 0; j < 5; j++) { x.beginPath(); x.moveTo(a + 14, b + 16 + j * 24); x.lineTo(a + 498, b + 16 + j * 24); x.stroke(); }
    x.shadowColor = tint; x.shadowBlur = 9; x.fillStyle = tint; x.textAlign = 'center'; x.font = 'bold 43px Arial'; x.fillText(title, a + 256, b + 62, 460);
    x.shadowBlur = 0; x.fillStyle = '#d5d9d1'; x.font = '17px Arial'; x.fillText(subtitle, a + 256, b + 94, 450);
    x.fillStyle = tint; x.fillRect(a + 107, b + 108, 298, 2);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function masonryTexture() {
  if (typeof document === 'undefined') return fallbackTexture();
  const t = new THREE.TextureLoader().load('/assets/textures/city-brick.png');
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

function pavementTexture(){
  if(typeof document==='undefined')return fallbackTexture();
  const t=new THREE.TextureLoader().load('/assets/textures/sidewalk-concrete.png');
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=8;return t;
}
