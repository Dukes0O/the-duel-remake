import * as THREE from 'three';
import { makeRng } from './rng.js';
import { createPolylineIndex } from './polyline-index.js';

export const SKYLINE_CLEARANCE = 115;
const CELL_SIZE = 200, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isCityCircuit = course => (course.def.kind === 'chase' || course.def.layout === 'city') && course.sections.every(section => section.theme === 'city');

function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((x - a.x) * dx + (z - a.z) * dz) / Math.max(.001, dx * dx + dz * dz), 0, 1);
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}

function surfaceSegments(course) {
  const segments = [];
  const add = (start, end, offset, width) => {
    const steps = Math.ceil((end - start) / 4); let previous = course.worldAt(start, offset(start));
    for (let i = 1; i <= steps; i++) {
      const s = start + (end - start) * i / steps, point = course.worldAt(s, offset(s));
      segments.push({ a: previous, b: point, width: Math.max(width(s), width(s - (end - start) / steps)) }); previous = point;
    }
  };
  add(0, course.length, () => 0, s => course.roadHalfWidthAt(s));
  for (const cut of course.features.shortcuts) add(cut.start, cut.end, s => course.shortcutOffset(cut, s), () => cut.halfWidth);
  return segments;
}

// Match the existing city far-terrain eight-metre grid and its triangle split.
// Only placement uses this sampler; no terrain, route or collision data changes.
function cityGroundSampler(course) {
  const route = course.samples.filter((_, index) => index % 4 === 0), last = course.samples.at(-1), cache = new Map();
  if (route.at(-1) !== last) route.push(last);
  const routeIndex = createPolylineIndex(route);
  const vertex = (i, j) => {
    const key = `${i}:${j}`; if (cache.has(key)) return cache.get(key);
    const x = i * 8, z = j * 8, {index,t,distanceSq} = routeIndex.query(x,z);
    const a = route[index-1], b = route[index], dx = b.x-a.x, dz = b.z-a.z, px = x-a.x-t*dx, pz = z-a.z-t*dz;
    const s = a.s+(b.s-a.s)*t, lateral = Math.sqrt(distanceSq)*Math.sign(px*dz-pz*dx);
    const y = Math.fround(course.groundAt(s, lateral).y - .15); cache.set(key, y); return y;
  };
  return (x, z) => {
    const i = Math.floor(x / 8), j = Math.floor(z / 8), u = x / 8 - i, v = z / 8 - j;
    const a = vertex(i, j), b = vertex(i + 1, j), c = vertex(i, j + 1), d = vertex(i + 1, j + 1);
    return u + v <= 1 ? a * (1 - u - v) + b * u + c * v : b * (1 - v) + c * (1 - u) + d * (u + v - 1);
  };
}

export function planCitySkyline(course) {
  if (!isCityCircuit(course)) return [];
  const rng = makeRng(course.seed ^ 0x73594c49), segments = surfaceSegments(course), ground = cityGroundSampler(course);
  const occupied = course.features.obstacles.map(obstacle => ({ x: obstacle.x, z: obstacle.z, radius: Math.hypot(obstacle.halfX, obstacle.halfZ) }));
  // Harbor cranes extend beyond their support posts. Reserve the whole boom.
  for (let s = 420; s < course.length; s += 680) { const point = course.groundAt(s, 130); occupied.push({ x: point.x, z: point.z, radius: 50 }); }
  const minX = Math.min(...course.samples.map(point => point.x)) - 310, maxX = Math.max(...course.samples.map(point => point.x)) + 310;
  const minZ = Math.min(...course.samples.map(point => point.z)) - 310, maxZ = Math.max(...course.samples.map(point => point.z)) + 310;
  const candidates = [], towers = [];
  for (let x = minX + 28; x < maxX - 28; x += 56) for (let z = minZ + 28; z < maxZ - 28; z += 56) {
    candidates.push({ x: x + rng.range(-11, 11), z: z + rng.range(-11, 11), order: rng.float() });
  }
  candidates.sort((a, b) => a.order - b.order);
  for (const candidate of candidates) {
    if (towers.length >= 96) break;
    const halfX = rng.range(8, 16), halfZ = rng.range(8, 18), radius = Math.hypot(halfX + 1, halfZ + 1);
    const clearance = Math.min(...segments.map(segment => segmentDistance(candidate.x, candidate.z, segment.a, segment.b) - segment.width - radius));
    if (clearance < SKYLINE_CLEARANCE + 1 || clearance > 320) continue;
    if (occupied.some(other => Math.hypot(candidate.x - other.x, candidate.z - other.z) < radius + other.radius + 10)) continue;
    const heading = Math.round(rng.range(0, 4)) * Math.PI / 2, c = Math.cos(heading), sn = Math.sin(heading);
    let lowest = Infinity, highest = -Infinity;
    const nx = Math.ceil((halfX + 1) / 2), nz = Math.ceil((halfZ + 1) / 2);
    for (let i = -nx; i <= nx; i++) for (let j = -nz; j <= nz; j++) {
      const x = i / nx * (halfX + 1), z = j / nz * (halfZ + 1), y = ground(candidate.x + c * x + sn * z, candidate.z - sn * x + c * z);
      lowest = Math.min(lowest, y); highest = Math.max(highest, y);
    }
    const tower = { id: `skyline-${towers.length}`, x: candidate.x, z: candidate.z, halfX, halfZ, radius, heading,
      foundationY: lowest - 1.2, floorY: highest + .18, height: rng.range(52, 124) + (rng.chance(.12) ? 28 : 0),
      style: rng.int(0, 4), tint: rng.int(0, 4), clearance, cell: `${Math.floor(candidate.x / CELL_SIZE)}:${Math.floor(candidate.z / CELL_SIZE)}` };
    towers.push(tower); occupied.push({ x: tower.x, z: tower.z, radius });
  }
  return towers;
}

export function createSkylineFacadeMaterial() {
  // The same opaque Standard material family as the nearby city. Window grids
  // run in the facade shader, so distant floors require no window meshes.
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .79, metalness: .16, emissive: 0xffffff, emissiveIntensity: .22 });
  material.name = 'Muted distant city windows'; material.customProgramCacheKey = () => 'city-skyline-grid-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>
      varying vec3 vSkylineMetric; varying vec3 vSkylineNormal; varying float vSkylineSeed;`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      mat4 skylineMatrix=modelMatrix;
      #ifdef USE_INSTANCING
        skylineMatrix=modelMatrix*instanceMatrix;
      #endif
      vSkylineMetric=position*vec3(length(skylineMatrix[0].xyz),length(skylineMatrix[1].xyz),length(skylineMatrix[2].xyz));
      vSkylineNormal=normal;
      vSkylineSeed=fract(sin(dot(skylineMatrix[3].xz,vec2(12.9898,78.233)))*43758.5453);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vSkylineMetric; varying vec3 vSkylineNormal; varying float vSkylineSeed;
      vec3 skylineGlow=vec3(0.0);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      if(abs(vSkylineNormal.y)<.5){
        vec2 metric=abs(vSkylineNormal.x)>.5?vSkylineMetric.zy:vSkylineMetric.xy;
        vec2 grid=metric/vec2(3.0,3.55),cell=floor(grid),uv=abs(fract(grid)-.5),aa=fwidth(grid)*1.2;
        float window=(1.0-smoothstep(.28-aa.x,.28+aa.x,uv.x))*(1.0-smoothstep(.25-aa.y,.25+aa.y,uv.y));
        float occupancy=fract(sin(dot(cell+vSkylineSeed*51.0,vec2(127.1,311.7)))*43758.5453);
        float lit=step(.67,occupancy)*window;
        diffuseColor.rgb*=mix(1.0,.39,window);
        skylineGlow=mix(vec3(.40,.47,.52),vec3(.62,.49,.32),step(.37,vSkylineSeed))*lit*.28;
      }`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance=skylineGlow;');
  };
  return material;
}

export function addCitySkyline(world, course) {
  const towers = planCitySkyline(course); if (!towers.length) return null;
  const group = new THREE.Group(); group.name = 'Distant city skyline';
  const box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(.5, .5, 1, 12), crown = new THREE.ConeGeometry(.5, 1, 4).rotateY(Math.PI / 4);
  const facade = createSkylineFacadeMaterial(), roof = new THREE.MeshStandardMaterial({ color: 0x303e49, roughness: .9, metalness: .22 });
  const buckets = new Map(), palettes = [0x596774, 0x6c6c68, 0x4b6069, 0x6d6660, 0x64717b];
  const put = (tower, kind, geometry, x, y, z, sx, sy, sz) => {
    const key = `${tower.cell}:${kind}:${geometry}`, c = Math.cos(tower.heading), sn = Math.sin(tower.heading);
    if (!buckets.has(key)) buckets.set(key, { cell: tower.cell, kind, geometry, entries: [] });
    buckets.get(key).entries.push({ tower, x: tower.x + c * x + sn * z, y, z: tower.z - sn * x + c * z, sx, sy, sz });
  };
  for (const t of towers) {
    const w = t.halfX * 2, depth = t.halfZ * 2, h = t.height, floor = t.floorY;
    put(t, 'roof', 'box', 0, (t.foundationY + floor) / 2, 0, w + 2, floor - t.foundationY, depth + 2);
    if (t.style === 1) {
      put(t, 'facade', 'box', 0, floor + h * .08, 0, w, h * .16, depth);
      for (const side of [-1, 1]) { const height = h * (side < 0 ? 1 : .79); put(t, 'facade', 'box', side * w * .24, floor + height / 2, 0, w * .43, height, depth * .83); put(t, 'roof', 'box', side * w * .24, floor + height + .45, 0, w * .45, .9, depth * .85); }
    } else if (t.style === 3) {
      const diameter = Math.min(w, depth);
      put(t, 'facade', 'cylinder', 0, floor + h / 2, 0, diameter, h, diameter);
      put(t, 'roof', 'cylinder', 0, floor + h + .65, 0, diameter * 1.03, 1.3, diameter * 1.03);
      put(t, 'roof', 'crown', 0, floor + h + 4, 0, diameter * .6, 6, diameter * .6);
    } else {
      const tiers = t.style === 0 ? [[.56, 1], [.28, .77], [.16, .53]] : t.style === 2 ? [[.82, 1], [.18, .73]] : [[.38, 1], [.29, .85], [.21, .66], [.12, .45]];
      let bottom = floor;
      for (const [fraction, size] of tiers) {
        put(t, 'facade', 'box', 0, bottom + h * fraction / 2, 0, w * size, h * fraction, depth * size);
        bottom += h * fraction; put(t, 'roof', 'box', 0, bottom + .35, 0, w * size + .35, .7, depth * size + .35);
      }
      if (t.style === 2) put(t, 'roof', 'crown', 0, bottom + 5, 0, w * .7, 10, depth * .7);
      if (t.style === 4) put(t, 'roof', 'box', 0, bottom + 8, 0, .55, 16, .55);
    }
  }
  const object = new THREE.Object3D(), color = new THREE.Color(), usedGeometry = new Set();
  for (const [key, bucket] of buckets) {
    const geometry = { box, cylinder, crown }[bucket.geometry]; usedGeometry.add(geometry);
    const mesh = new THREE.InstancedMesh(geometry, bucket.kind === 'facade' ? facade : roof, bucket.entries.length); mesh.name = `Skyline ${key}`;
    bucket.entries.forEach((entry, i) => {
      object.position.set(entry.x, entry.y, entry.z); object.rotation.set(0, entry.tower.heading, 0); object.scale.set(entry.sx, entry.sy, entry.sz); object.updateMatrix(); mesh.setMatrixAt(i, object.matrix);
      if (bucket.kind === 'facade') mesh.setColorAt(i, color.set(palettes[entry.tower.tint]));
    });
    mesh.castShadow = mesh.receiveShadow = false; mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.05); mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .05;
    mesh.userData.skylineCell = { key: bucket.cell, size: CELL_SIZE, towers: [...new Set(bucket.entries.map(entry => entry.tower.id))] };
    group.add(mesh);
  }
  for (const geometry of [box, cylinder, crown]) if (!usedGeometry.has(geometry)) geometry.dispose();
  group.userData.citySkyline = { towers, cells: new Set(towers.map(tower => tower.cell)).size, draws: group.children.length, clearance: SKYLINE_CLEARANCE };
  world.add(group); return group;
}
