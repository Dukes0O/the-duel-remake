// Plain, batched small things for the realism trial. The scene owns the switch.
import * as THREE from 'three';
import {smallThingsInCell, thingSolids, realismThingsData, THINGS_CELL, THINGS_RANGE} from './scablands-things.js';
import {nearGroundHeightAt} from './near-ground.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';

const KINDS = {
  stone: [0x79756b, () => new THREE.IcosahedronGeometry(.5, 0)],
  scrub: [0x747968, () => new THREE.ConeGeometry(.5, 1, 5)],
  brush: [0x77705e, () => new THREE.ConeGeometry(.4, 1, 4)],
  bone: [0xb5ab8e, () => new THREE.BoxGeometry(.2, .15, 1)],
  can: [0x77746a, () => new THREE.CylinderGeometry(.3, .3, .7, 6)],
  scrap: [0x786456, () => new THREE.BoxGeometry(1, .08, .65)],
  salt: [0xc6bca3, () => new THREE.IcosahedronGeometry(.5, 0)],
  stump: [0x514b42, () => new THREE.CylinderGeometry(.25, .4, 1, 5)],
};
const CELL_RADIUS = Math.ceil(THINGS_RANGE / THINGS_CELL) + 1;
const CAPACITY = (CELL_RADIUS * 2 + 1) ** 2 * 12;
const fade = distance => Math.max(0, Math.min(1, (THINGS_RANGE - distance) / 24));

// The caller must supply every job start and create this only with the switch on.
export function createSmallThingsView({seed, jobStarts, heightAt = scablandsSurfaceHeightAt}) {
  if (!Array.isArray(jobStarts)) throw new TypeError('Job starts are required');
  const group = new THREE.Group(), batches = new Map();
  for (const [kind, [colour, geometry]] of Object.entries(KINDS)) {
    const mesh = new THREE.InstancedMesh(geometry(), new THREE.MeshStandardMaterial({color: colour, roughness: 1}), CAPACITY);
    mesh.name = `Scablands ${kind}`;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    batches.set(kind, {mesh, items: []});
  }
  let centreI = NaN, centreJ = NaN;
  let cells = new Map();
  const object = new THREE.Object3D();
  function update(x, z) {
    const i = Math.floor(x / THINGS_CELL), j = Math.floor(z / THINGS_CELL);
    if (i !== centreI || j !== centreJ) {
      centreI = i; centreJ = j;
      for (const batch of batches.values()) batch.items.length = 0;
      const nextCells = new Map();
      for (let a = i - CELL_RADIUS; a <= i + CELL_RADIUS; a++) for (let b = j - CELL_RADIUS; b <= j + CELL_RADIUS; b++) {
        const key = `${a}:${b}`;
        let items = cells.get(key);
        if (!items) {
          items = smallThingsInCell(seed, a, b, jobStarts);
          for (const item of items) item.drawY = nearGroundHeightAt(item.x, item.z, heightAt);
        }
        nextCells.set(key, items);
        for (const item of items) {
          batches.get(item.kind).items.push(item);
        }
      }
      cells = nextCells;
    }
    for (const [kind, {mesh, items}] of batches) {
      let count = 0;
      for (const item of items) {
        const amount = fade(Math.hypot(item.x - x, item.z - z));
        if (!amount) continue;
        const size = item.size * amount;
        // Three proportions give stones distinct silhouettes within one batch.
        const wide = kind === 'stone' ? [1, 1.35, .75][item.shape] : 1;
        const high = kind === 'stone' ? [.65, .45, 1][item.shape] : 1;
        object.position.set(item.x, item.drawY + size * high * .35, item.z);
        object.rotation.set(0, item.heading, 0);
        object.scale.set(size * wide, size * high, size);
        object.updateMatrix();
        mesh.setMatrixAt(count++, object.matrix);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
  function dispose() {
    for (const {mesh} of batches.values()) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); }
    cells.clear();
    group.clear();
  }
  return {group, update, dispose};
}

// Draw exactly the footprints supplied to the collision index. The caller
// owns the trial switch and supplies the same cleared records to both users.
export function createFixedThingsView(fixed, loneBoulders = []) {
  const solids = thingSolids(fixed, loneBoulders);
  const group = new THREE.Group();
  const object = new THREE.Object3D();
  const styles = {
    'pylon-foot': [0x675e54, () => new THREE.BoxGeometry(1, 1, 1)],
    telegraph: [0x665848, () => new THREE.BoxGeometry(1, 1, 1)],
    'fence-post': [0x776858, () => new THREE.BoxGeometry(1, 1, 1)],
    'sign-post': [0x776858, () => new THREE.BoxGeometry(1, 1, 1)],
    boulder: [0x777267, () => new THREE.BoxGeometry(1, 1, 1)],
  };
  for (const [kind, [colour, geometry]] of Object.entries(styles)) {
    const parts = solids.filter(part => part.kind === kind);
    if (!parts.length) continue;
    const mesh = new THREE.InstancedMesh(geometry(), new THREE.MeshStandardMaterial({color: colour, roughness: 1}), parts.length);
    mesh.name = `Scablands ${kind}`;
    mesh.userData.solidIds = parts.map(part => part.id);
    for (const [index, part] of parts.entries()) {
      object.position.set(...part.center);
      object.rotation.set(0, part.heading, 0);
      object.scale.set(...part.size);
      object.updateMatrix();
      mesh.setMatrixAt(index, object.matrix);
    }
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  function dispose() {
    for (const mesh of group.children) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); }
    group.clear();
  }
  return {group, dispose};
}

// A separate batch for the parts above the collision footprints. Missing
// supports deliberately break a span rather than drawing wire across a gap.
export function createThingsLinesView(fixed) {
  const towers = [], wires = [];
  const segment = (out, a, b) => out.push(...a, ...b);
  const span = (a, b, height, sag) => {
    const start = [a.x, a.y + height, a.z], end = [b.x, b.y + height, b.z];
    let previous = start;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const y = start[1] * (1 - t) + end[1] * t - 4 * t * (1 - t) * sag;
      const point = [a.x * (1 - t) + b.x * t, y, a.z * (1 - t) + b.z * t];
      segment(wires, previous, point);
      previous = point;
    }
  };
  for (const pylon of fixed.pylons.filter(Boolean)) {
    const c = Math.cos(pylon.heading), s = Math.sin(pylon.heading);
    const point = (x, y, z) => [pylon.x + x * c + z * s, pylon.y + y, pylon.z - x * s + z * c];
    const top = point(0, 40, 0);
    for (const x of [-3, 3]) for (const z of [-3, 3]) segment(towers, point(x, 3, z), top);
    for (const y of [15, 27, 36]) {
      const width = 3 * (1 - y / 45);
      segment(towers, point(-width, y, 0), point(width, y, 0));
    }
  }
  for (let i = 1; i < fixed.pylons.length; i++) {
    const a = fixed.pylons[i - 1], b = fixed.pylons[i];
    if (a && b) span(a, b, 36, a.cableDown ? 34 : 9);
  }
  for (const line of fixed.telegraphs) for (let i = 1; i < line.poles.length; i++) {
    const a = line.poles[i - 1], b = line.poles[i];
    if (a && b && a.state !== 'down' && b.state !== 'down') span(a, b, 7, 1.2);
  }
  for (const run of fixed.fences) for (let i = 1; i < run.posts.length; i++) {
    const a = run.posts[i - 1], b = run.posts[i];
    if (a && b) span(a, b, 1.2, .2);
  }
  const group = new THREE.Group();
  for (const [name, points, color] of [['towers', towers, 0x675e54], ['wires', wires, 0x514b42]]) {
    if (!points.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color}));
    lines.name = `Scablands ${name}`;
    group.add(lines);
  }
  return {group, dispose() {
    for (const lines of group.children) { lines.geometry.dispose(); lines.material.dispose(); }
    group.clear();
  }};
}

// One texture and one mesh for all the hand-painted boards. In a headless
// test there is no canvas, but the same boards and post records still exist.
export function createForkSignsView(signs) {
  const group = new THREE.Group();
  if (!signs.length) return {group, dispose() {}};
  let texture = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = signs.length * 128;
    const context = canvas.getContext('2d');
    if (context) {
      for (const [index, sign] of signs.entries()) {
        const top = index * 128;
        context.fillStyle = '#685340'; context.fillRect(0, top, 512, 128);
        context.fillStyle = '#eee1bd'; context.font = 'bold 24px sans-serif';
        const face = Math.atan2(sign.junction.x - sign.x, sign.junction.z - sign.z);
        sign.destinations.slice(0, 4).forEach((destination, row) => {
          const side = (destination.x - sign.junction.x) * Math.cos(face) - (destination.z - sign.junction.z) * Math.sin(face);
          context.fillText(`${side < 0 ? '?' : '?'} ${destination.name.toUpperCase()} ${destination.km} km`, 12, top + 26 + row * 29, 488);
        });
      }
      texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    }
  }
  const positions = [], uvs = [], indices = [];
  for (const [index, sign] of signs.entries()) {
    const heading = Math.atan2(sign.junction.x - sign.x, sign.junction.z - sign.z);
    const c = Math.cos(heading), s = Math.sin(heading), halfWidth = 1.2;
    for (const [across, height] of [[-halfWidth, 1.65], [halfWidth, 1.65], [halfWidth, 2.35], [-halfWidth, 2.35]])
      positions.push(sign.x + across * c, sign.y + height, sign.z - across * s);
    const bottom = 1 - (index + 1) / signs.length, top = 1 - index / signs.length;
    uvs.push(0, bottom, 1, bottom, 1, top, 0, top);
    const base = index * 4; indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({color: texture ? 0xffffff : 0x685340, map: texture, side: THREE.DoubleSide});
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Scablands fork signs';
  group.add(mesh);
  return {group, dispose() { geometry.dispose(); material.dispose(); texture?.dispose(); group.clear(); }};
}

// Create the trial once, and keep its batches for the lifetime of the scene.
export function createRealismThingsView({enabled, seed, jobStarts, halfWidth, halfDepth, heightAt}) {
  if (!enabled) return null;
  const {fixed, loneBoulders} = realismThingsData({enabled, seed, jobStarts, halfWidth, halfDepth});
  const small = createSmallThingsView({seed, jobStarts, heightAt});
  const large = createFixedThingsView(fixed, loneBoulders);
  const lines = createThingsLinesView(fixed);
  const signs = createForkSignsView(fixed.signs);
  const group = new THREE.Group();
  group.name = 'Scablands realism things';
  group.add(small.group, large.group, lines.group, signs.group);
  return {group, fixed, loneBoulders, update: small.update, dispose() {
    small.dispose(); large.dispose(); lines.dispose(); signs.dispose(); group.clear();
  }};
}
