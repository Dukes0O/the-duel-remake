// The things of the realism trial, in batches. The scene owns the switch. Where each thing stands comes from
// scablands-things.js; its shape and surface from scablands-things-look.js (Claude's drawing).
import * as THREE from 'three';
import {smallThingsInCell, thingSolids, realismThingsData, THINGS_CELL, THINGS_RANGE} from './scablands-things.js';
import {nearGroundHeightAt} from './near-ground.js';
import {scablandsRegionAt} from './scablands-regions.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {makeRng} from '../rng.js';
import {SMALL_THING_KINDS, smallThingShape, standingThingShape, thingSurface, pylonShape, pylonSurface} from './scablands-things-look.js';

// The small kinds that stand tall enough for their shadow to show.
const SHADOWED = new Set(['scrub', 'brush', 'stump']);
// How far off each small kind is drawn, in metres (a stone the size of a fist is a speck at 60 m; a bush is not), and how
// much larger than its placed size a plant is drawn (the placing gives sizes for stones).
const SMALL_WITHIN = {stone: 70, bone: 55, can: 55, scrap: 60, salt: 70, scrub: THINGS_RANGE, brush: THINGS_RANGE, stump: THINGS_RANGE};
const DRAWN_LARGER = {scrub: 2.2, brush: 1.8, stump: 2};
// A stone is the rock of the ground it lies on: black on the scab plates and the burn, pale on the salt.
const STONE_TINT = {'scab-plates': .3, burn: .32, 'salt-pan': 1.3, 'river-bed': .7, sand: .85};
// On every other ground a stone is drawn at this share of its own colour: in the land's strong light the full colour draws as chalk.
const STONE_PLAIN = .62;
const fadeWithin = (distance, range) => Math.max(0, Math.min(1, (range - distance) / (range * .2)));
const STONE_WIDE = [1, 1.35, .75], STONE_HIGH = [.65, .45, 1];
// How far off each standing kind is drawn, in metres, and the most of one kind drawn at once.
const DRAWN_WITHIN = {'pylon-foot': 900, telegraph: 1500, 'telegraph-down': 600, 'fence-post': 500, 'sign-post': 400, boulder: 800, 'dead-tree': 1500, snag: 1500};
const STANDING_AT_ONCE = 400;
const CELL_RADIUS = Math.ceil(THINGS_RANGE / THINGS_CELL) + 1;
const CAPACITY = (CELL_RADIUS * 2 + 1) ** 2 * 12;

// The caller must supply every job start and create this only with the switch on.
export function createSmallThingsView({seed, jobStarts, heightAt = scablandsSurfaceHeightAt, drawnHeightAt = null, photos = null}) {
  if (!Array.isArray(jobStarts)) throw new TypeError('Job starts are required');
  const group = new THREE.Group(), batches = new Map();
  for (const kind of SMALL_THING_KINDS) {
    const mesh = new THREE.InstancedMesh(smallThingShape(kind), thingSurface(kind, photos), CAPACITY);
    mesh.name = `Scablands ${kind}`;
    mesh.castShadow = SHADOWED.has(kind); mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.userData.groundAnchorOffsets = new Float64Array(CAPACITY);
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    batches.set(kind, {mesh, items: []});
  }
  let centreI = NaN, centreJ = NaN, filledX = NaN, filledZ = NaN;
  let cells = new Map();
  const object = new THREE.Object3D(), tint = new THREE.Color();
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
          for (const item of items) {
            item.drawY = drawnHeightAt?.(item.x, item.z) ?? nearGroundHeightAt(item.x, item.z, heightAt);
            item.tint = item.kind === 'stone' ? STONE_TINT[scablandsRegionAt(item.x, item.z)] ?? STONE_PLAIN : 1;
          }
        }
        nextCells.set(key, items);
        for (const item of items) {
          batches.get(item.kind).items.push(item);
        }
      }
      cells = nextCells; filledX = NaN;
    }
    // The fade changes over metres, not centimetres: fill the matrices again after 1.5 m of travel.
    if (Math.hypot(x - filledX, z - filledZ) < 1.5) return;
    filledX = x; filledZ = z;
    for (const [kind, {mesh, items}] of batches) {
      let count = 0;
      for (const item of items) {
        const amount = fadeWithin(Math.hypot(item.x - x, item.z - z), SMALL_WITHIN[kind]);
        if (!amount) continue;
        const size = item.size * amount * (DRAWN_LARGER[kind] ?? 1);
        // Three proportions give stones distinct silhouettes within one batch.
        const wide = kind === 'stone' ? STONE_WIDE[item.shape] : 1;
        const high = kind === 'stone' ? STONE_HIGH[item.shape] : 1;
        object.position.set(item.x, item.drawY + size * high * .35, item.z);
        object.rotation.set(0, item.heading, 0);
        object.scale.set(size * wide, size * high, size);
        object.updateMatrix();
        if (kind === 'stone') mesh.setColorAt(count, tint.setScalar(item.tint));
        mesh.userData.groundAnchorOffsets[count] = size * high * .35;
        mesh.setMatrixAt(count++, object.matrix);
      }
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  function dispose() {
    for (const {mesh} of batches.values()) { mesh.geometry.dispose(); if (mesh.material.userData.thingFamily === 'plant') mesh.material.map?.dispose(); mesh.material.dispose(); mesh.dispose(); }
    cells.clear();
    group.clear();
  }
  return {group, update, dispose};
}

// Draw exactly the footprints supplied to the collision index. The caller
// owns the trial switch and supplies the same cleared records to both users.
export function createFixedThingsView(fixed, loneBoulders = [], photos = null, groundAt = null) {
  const solids = thingSolids(fixed, loneBoulders);
  const group = new THREE.Group();
  const object = new THREE.Object3D();
  const drawnAs = part => part.kind === 'telegraph' && part.size[1] < 1 ? 'telegraph-down' : part.kind;
  const batches = [];
  const groundOffset = part => groundAt ? groundAt(part.x, part.z) - scablandsSurfaceHeightAt(part.x, part.z) : 0;
  for (const kind of ['pylon-foot', 'telegraph', 'telegraph-down', 'fence-post', 'sign-post', 'boulder', 'dead-tree', 'snag']) {
    const parts = solids.filter(part => drawnAs(part) === kind).map(part => ({...part, drawOffset: groundOffset(part)}));
    if (!parts.length) continue;
    const range = DRAWN_WITHIN[kind];
    const tree = kind === 'dead-tree' || kind === 'snag';
    const shapeSize = tree ? Array(3).fill(parts[0].height) : parts[0].size;
    const mesh = new THREE.InstancedMesh(standingThingShape(kind, shapeSize), thingSurface(kind, photos), Math.min(parts.length, STANDING_AT_ONCE));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `Scablands ${kind}`;
    mesh.count = 0; mesh.frustumCulled = false;
    mesh.userData.solidIds = parts.map(part => part.id);
    mesh.userData.groundAnchorOffsets = new Float64Array(mesh.instanceMatrix.count);
    group.add(mesh); batches.push({mesh, parts, range, tinted: kind === 'boulder'});
  }
  // A thing is drawn within its range of the player, growing from nothing over the range's last tenth so that it does
  // not appear all at once. The batches are filled again after 60 m of travel.
  let filledX = NaN, filledZ = NaN;
  let fallen = new Set(), fallenCount = 0;
  const tint = new THREE.Color();
  function update(x, z) {
    if (Math.hypot(x - filledX, z - filledZ) < 60) return;
    filledX = x; filledZ = z;
    for (const {mesh, parts, range, tinted} of batches) {
      let count = 0;
      for (const part of parts) {
        const away = Math.hypot(part.x - x, part.z - z);
        if (away > range || count >= mesh.instanceMatrix.count) continue;
        const grown = Math.min(1, (range - away) / (range * .1) + .35);
        object.position.set(part.center[0], part.center[1] + part.drawOffset - part.size[1] * (1 - grown) / 2, part.center[2]);
        object.rotation.set(0, part.heading, 0);
        if (part.kind === 'fence-post' && fallen.has(part.id)) {
          object.position.y = part.center[1] + part.drawOffset - part.size[1] / 2 + part.size[0] / 2;
          object.rotation.z = Math.PI / 2;
        }
        const tree = part.kind === 'dead-tree' || part.kind === 'snag';
        object.scale.set((tree ? part.height : part.size[0]) * grown, part.size[1] * grown, (tree ? part.height : part.size[2]) * grown);
        object.updateMatrix();
        if (tinted) mesh.setColorAt(count, tint.setScalar(part.tint ??= STONE_TINT[scablandsRegionAt(part.x, part.z)] ?? STONE_PLAIN));
        mesh.userData.groundAnchorOffsets[count] = part.kind === 'fence-post' && fallen.has(part.id)
          ? part.size[0] / 2 : part.size[1] * grown / 2;
        mesh.setMatrixAt(count++, object.matrix);
      }
      mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }
  function dispose() {
    for (const mesh of group.children) { mesh.geometry.dispose(); mesh.material.dispose(); mesh.dispose(); }
    group.clear();
  }
  function setFallen(ids) {
    if (ids === fallen && ids.size === fallenCount) return;
    fallen = ids; fallenCount = ids.size; filledX = NaN; filledZ = NaN;
  }
  return {group, update, setFallen, dispose};
}

// A separate batch for the parts above the collision footprints. Missing
// supports deliberately break a span rather than drawing wire across a gap.
export function createThingsLinesView(fixed, groundAt = null) {
  const drawnY = item => groundAt ? groundAt(item.x, item.z) : item.y;
  const wires = [], fenceSpans = [];
  const segment = (out, a, b) => out.push(...a, ...b);
  const span = (a, b, height, sag) => {
    const start = [a.x, drawnY(a) + height, a.z], end = [b.x, drawnY(b) + height, b.z];
    let previous = start;
    for (let i = 1; i <= 8; i++) {
      const t = i / 8;
      const y = start[1] * (1 - t) + end[1] * t - 4 * t * (1 - t) * sag;
      const point = [a.x * (1 - t) + b.x * t, y, a.z * (1 - t) + b.z * t];
      segment(wires, previous, point);
      previous = point;
    }
  };
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
    if (a && b) {
      const start = wires.length; span(a, b, 1.2, .2);
      fenceSpans.push({a: a.id, b: b.id, start, end: wires.length});
    }
  }
  const group = new THREE.Group();
  const standing = fixed.pylons.filter(Boolean);
  if (standing.length) {
    const towers = new THREE.InstancedMesh(pylonShape(), pylonSurface(), standing.length), object = new THREE.Object3D();
    towers.name = 'Scablands pylons'; towers.castShadow = true;
    towers.userData.groundAnchorOffsets = new Float64Array(standing.length);
    for (const [index, pylon] of standing.entries()) {
      object.position.set(pylon.x, drawnY(pylon), pylon.z); object.rotation.set(0, pylon.heading, 0); object.updateMatrix();
      towers.setMatrixAt(index, object.matrix);
    }
    towers.computeBoundingSphere();
    group.add(towers);
  }
  let wirePosition = null;
  for (const [name, points, color] of [['wires', wires, 0x2f2b26]]) {
    if (!points.length) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    wirePosition = geometry.getAttribute('position');
    const lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color}));
    lines.name = `Scablands ${name}`;
    group.add(lines);
  }
  let fallenCount = 0, fallen = null;
  function setFallen(ids) {
    if (!wirePosition || ids === fallen && ids.size === fallenCount) return;
    fallen = ids; fallenCount = ids.size;
    for (const span of fenceSpans) for (let i = span.start; i < span.end; i++) {
      wirePosition.array[i] = wires[i];
      if (i % 3 === 1 && (ids.has(span.a) || ids.has(span.b))) wirePosition.array[i] -= 1.1;
    }
    wirePosition.needsUpdate = true;
  }
  return {group, setFallen, dispose() {
    for (const child of group.children) { child.geometry.dispose(); child.material.map?.dispose(); child.material.dispose(); child.dispose?.(); }
    group.clear();
  }};
}

// One texture and one mesh for all the hand-painted boards. In a headless
// test there is no canvas, but the same boards and post records still exist.
export function createForkSignsView(signs, groundAt = null) {
  const group = new THREE.Group();
  if (!signs.length) return {group, dispose() {}};
  let texture = null;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = signs.length * 128;
    const context = canvas.getContext('2d');
    if (context) {
      const rng = makeRng(4107);
      for (const [index, sign] of signs.entries()) {
        const top = index * 128;
        // Four planks, each its own tired brown, with grain, nail heads and a darker lower edge.
        for (let plank = 0; plank < 4; plank++) {
          const y = top + plank * 32, tone = rng.range(.82, 1.08);
          context.fillStyle = `rgb(${[98, 80, 60].map(v => Math.round(v * tone)).join(',')})`; context.fillRect(0, y, 512, 32);
          context.fillStyle = 'rgba(38,28,20,.55)'; context.fillRect(0, y + 30, 512, 2);
          context.strokeStyle = 'rgba(46,35,25,.28)'; context.lineWidth = 1;
          for (let grain = 0; grain < 7; grain++) { const gy = y + rng.range(3, 28); context.beginPath(); context.moveTo(0, gy); context.bezierCurveTo(170, gy + rng.range(-3, 3), 340, gy + rng.range(-3, 3), 512, gy + rng.range(-2, 2)); context.stroke(); }
          context.fillStyle = 'rgba(28,22,18,.8)';
          for (const x of [14, 498]) { context.beginPath(); context.arc(x + rng.range(-2, 2), y + 16 + rng.range(-4, 4), 2.4, 0, Math.PI * 2); context.fill(); }
        }
        const face = Math.atan2(sign.junction.x - sign.x, sign.junction.z - sign.z);
        const rows = sign.destinations.slice(0, 4);
        rows.forEach((destination, row) => {
          const side = (destination.x - sign.junction.x) * Math.cos(face) - (destination.z - sign.junction.z) * Math.sin(face);
          const left = side < 0, y = top + 16 + row * 32 + rng.range(-1.5, 1.5);
          context.save(); context.translate(0, y); context.rotate(rng.range(-.012, .012));
          // The arrow: a painted shaft and head at the end the road leaves by.
          context.fillStyle = context.strokeStyle = `rgba(232,220,188,${rng.range(.8, .95)})`;
          const tip = left ? 30 : 482, tail = left ? 78 : 434, turn = left ? 1 : -1;
          context.lineWidth = 5; context.lineCap = 'round'; context.beginPath(); context.moveTo(tail, 0); context.lineTo(tip + turn * 10, 0); context.stroke();
          context.beginPath(); context.moveTo(tip, 0); context.lineTo(tip + turn * 18, -9); context.lineTo(tip + turn * 18, 9); context.closePath(); context.fill();
          context.font = 'bold 21px "Trebuchet MS", "Segoe UI", sans-serif'; context.textBaseline = 'middle'; context.textAlign = left ? 'left' : 'right';
          context.fillText(`${destination.name.toUpperCase()}  ${destination.km} km`, left ? 92 : 420, 1, 330);
          context.restore();
        });
        // Paint worn away in patches, as sand takes it off.
        context.globalCompositeOperation = 'source-atop';
        for (let scuff = 0; scuff < 26; scuff++) { context.fillStyle = `rgba(98,80,60,${rng.range(.25, .6)})`; context.fillRect(rng.range(0, 500), top + rng.range(0, 124), rng.range(4, 26), rng.range(1, 3)); }
        context.globalCompositeOperation = 'source-over';
      }
      texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
    }
  }
  const positions = [], uvs = [], indices = [];
  for (const [index, sign] of signs.entries()) {
    const heading = Math.atan2(sign.junction.x - sign.x, sign.junction.z - sign.z);
    const c = Math.cos(heading), s = Math.sin(heading), halfWidth = 1.2;
    for (const [across, height] of [[-halfWidth, 1.65], [halfWidth, 1.65], [halfWidth, 2.35], [-halfWidth, 2.35]])
      positions.push(sign.x + across * c, (groundAt ? groundAt(sign.x, sign.z) : sign.y) + height, sign.z - across * s);
    const bottom = 1 - (index + 1) / signs.length, top = 1 - index / signs.length;
    uvs.push(0, bottom, 1, bottom, 1, top, 0, top);
    const base = index * 4; indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({color: texture ? 0xffffff : 0x685340, map: texture, side: THREE.DoubleSide, roughness: 1});
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Scablands fork signs'; mesh.castShadow = true;
  group.add(mesh);
  return {group, dispose() { geometry.dispose(); material.dispose(); texture?.dispose(); group.clear(); }};
}

// Create the trial once, and keep its batches for the lifetime of the scene.
export function createRealismThingsView({enabled, seed, jobStarts, halfWidth, halfDepth, heightAt, drawnHeightAt, photos = null, data = null}) {
  if (!enabled) return null;
  const {fixed, loneBoulders} = data ?? realismThingsData({enabled, seed, jobStarts, halfWidth, halfDepth});
  const small = createSmallThingsView({seed, jobStarts, heightAt, drawnHeightAt, photos});
  const groundAt = (x, z) => drawnHeightAt?.(x, z) ?? nearGroundHeightAt(x, z, heightAt ?? scablandsSurfaceHeightAt);
  const large = createFixedThingsView(fixed, loneBoulders, photos, groundAt);
  const lines = createThingsLinesView(fixed, groundAt);
  const signs = createForkSignsView(fixed.signs, groundAt);
  const group = new THREE.Group();
  group.name = 'Scablands realism things';
  group.add(small.group, large.group, lines.group, signs.group);
  return {group, fixed, loneBoulders, setFallen(ids) { large.setFallen(ids); lines.setFallen(ids); }, update(x, z) { small.update(x, z); large.update(x, z); }, dispose() {
    small.dispose(); large.dispose(); lines.dispose(); signs.dispose(); group.clear();
  }};
}
