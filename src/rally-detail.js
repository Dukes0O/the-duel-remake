import * as THREE from 'three';
import { makeRng } from './rng.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Small race furniture and vegetation are kept outside the legal driving
// corridors. Ruts are translucent surface detail, never collision geometry.
export function addRallyDetail(world, course) {
  if (!course.def.offroad) return null;
  const group = new THREE.Group(); group.name = 'Rally trail dressing';
  const rng = makeRng(course.seed ^ 0x6d927b), placements = [];
  const mats = {
    wood: new THREE.MeshStandardMaterial({ color: 0x716044, roughness: 1 }),
    endgrain: new THREE.MeshStandardMaterial({ color: 0xaa9168, roughness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdbcfa8, roughness: .84, side: THREE.DoubleSide }),
    orange: new THREE.MeshStandardMaterial({ color: 0xba7333, roughness: .86, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: 0x293229, roughness: .9, side: THREE.DoubleSide }),
    fern: new THREE.MeshStandardMaterial({ color: 0x829161, roughness: .97, vertexColors: true, side: THREE.DoubleSide }),
    rut: new THREE.MeshStandardMaterial({ color: 0x514332, roughness: .97, transparent: true, opacity: .36, vertexColors: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
  };
  const batch = instances(group, mats), rutGeometries = [];
  const clear = (s, off, radius, margin = 1.15) => {
    const p = course.groundAt(s, off), reach = radius + margin;
    for (const tunnel of course.features.tunnels) if (course.phase(s) > tunnel.start - reach - 14 && course.phase(s) < tunnel.end + reach + 14 && Math.abs(off) < 42 + reach) return false;
    for (let i = 0; i < 9; i++) {
      const a = i / 8 * Math.PI * 2, x = p.x + (i === 8 ? 0 : Math.cos(a) * reach), z = p.z + (i === 8 ? 0 : Math.sin(a) * reach), n = course.nearest(x, z);
      if (course.surfaceAt(n.s, n.lateral).road) return false;
    }
    for (const obstacle of course.obstaclesNear(s - reach, s + reach)) {
      if (obstacle.kind === 'tree') continue;
      const c = Math.cos(obstacle.heading), sn = Math.sin(obstacle.heading), dx = p.x - obstacle.x, dz = p.z - obstacle.z;
      const x = Math.abs(dx * c - dz * sn), z = Math.abs(dx * sn + dz * c);
      if (x < obstacle.halfX + radius + .3 && z < obstacle.halfZ + radius + .3) return false;
    }
    return true;
  };
  const record = (kind, s, off, radius) => { const p = course.groundAt(s, off); placements.push({ kind, s, off, radius, x: p.x, y: p.y, z: p.z }); return p; };

  // A low opacity, feathered strip marks where tires have moved loose gravel.
  // Its lane wanders gently and the alpha fades repeatedly along the route.
  for (const side of [-1, 1]) rutGeometries.push(rut(course, 0, course.length, s => side * 1.15 + Math.sin(s * .013) * .29 + Math.sin(s * .039 + 2) * .13, .046, side));
  for (const cut of course.features.shortcuts) for (const side of [-1, 1]) rutGeometries.push(rut(course, cut.start, cut.end, s => course.shortcutOffset(cut, s) + side * 1.02 + Math.sin(s * .031) * .12, .078, side + 3, true));
  const rutMesh = new THREE.Mesh(mergeGeometries(rutGeometries), mats.rut); rutGeometries.forEach(g => g.dispose());
  rutMesh.name = 'Rally soft tire ruts'; rutMesh.receiveShadow = true; group.add(rutMesh);

  let lastArrow = -200;
  for (let s = 85; s < course.length - 45; s += 24) {
    const bend = course.at(s + 28).curvature;
    if (Math.abs(bend) < .0018 || s - lastArrow < 150) continue;
    const turn = Math.sign(bend), off = -turn * (course.roadHalfWidthAt(s) + 2.65);
    if (!clear(s, off, .48)) continue;
    const p = record('arrow stake', s, off, .48); lastArrow = s;
    batch.put('wood', 'box', p, [.055, 1.22, .055], [0, .57, 0]);
    batch.put('white', 'box', p, [.74, .35, .028], [0, 1.03, 0]);
    batch.put('dark', turn > 0 ? 'arrow-left' : 'arrow-right', p, [1, 1, 1], [0, 1.03, -.019]);
  }
  const gates = [30, ...course.features.lapGates.map(g => g.s), ...course.sections.slice(1).map(s => s.start + 22)];
  for (const [index, s] of gates.entries()) for (const side of [-1, 1]) {
    const off = side * (course.roadHalfWidthAt(s) + 2.65);
    if (!clear(s, off, .78)) continue;
    const p = record('timing flag', s, off, .78);
    batch.put('wood', 'pole', p, [.063, 2.05, .063], [0, .995, 0]);
    batch.put('orange', 'flag', p, [side, 1, 1], [side * .34, 1.59, 0]);
    for (let row = 0; row < 4; row++) for (let column = 0; column < 3; column++) batch.put((row + column + index) % 2 ? 'dark' : 'white', 'box', p, [.155, .155, .008], [side * (.15 + column * .155), 1.79 - row * .155, -.055]);
  }

  const clusters = Math.ceil(course.length / 31);
  for (let i = 0; i < clusters; i++) {
    const s = (i + rng.range(.1, .9)) * course.length / clusters;
    if (course.themeAt(s) !== 'alpine') continue;
    const side = i % 2 ? -1 : 1, off = side * (course.roadHalfWidthAt(s) + rng.range(4.8, 11));
    for (let j = 0; j < 4; j++) {
      const ss = s + rng.range(-2.8, 2.8), oo = off + rng.range(-1.6, 1.6), scale = rng.range(.65, 1.15), radius = .74 * scale;
      if (!clear(ss, oo, radius)) continue;
      const p = record('fern', ss, oo, radius); p.heading = rng.range(0, Math.PI * 2);
      batch.put('fern', 'fern', p, [scale, scale, scale], [0, -.018, 0], rng.range(.7, 1.13));
    }
  }
  for (let i = 0; i < Math.ceil(course.length / 70); i++) {
    const s = (i + rng.range(.1, .9)) * 70, side = i % 2 ? 1 : -1, off = side * (course.roadHalfWidthAt(s) + rng.range(5.8, 12.5));
    const length = rng.range(.7, 1.55), radius = rng.range(.035, .063);
    if (s >= course.length || !clear(s, off, length * .65 + .25)) continue;
    record('thin deadfall', s, off, length * .65 + .25);
    const angle = rng.range(-1.2, 1.2), ds = Math.cos(angle) * length / 2, dx = Math.sin(angle) * length / 2;
    const a = course.groundAt(s - ds, off - dx), b = course.groundAt(s + ds, off + dx);
    a.y += radius * .4; b.y += radius * .4; batch.beam('wood', a, b, radius);
    for (const p of [a, b]) batch.beam('endgrain', p, { x: p.x + (b.x - a.x) * .004, y: p.y + (b.y - a.y) * .004, z: p.z + (b.z - a.z) * .004 }, radius * .76);
    if (i % 2 === 0) {
      const p = course.groundAt(s, off), q = course.groundAt(s + .30, off + side * .42);
      p.y += radius * .6; q.y += radius * .45; batch.beam('wood', p, q, radius * .45);
    }
  }
  batch.finish();
  group.userData.rallyDetail = { placements, draws: group.children.length, rutLift: { main: .046, shortcut: .078 } };
  world.add(group); return group;
}

function rut(course, start, end, center, lift, seed, branch = false) {
  const positions = [], colors = [], indices = [], steps = Math.ceil((end - start) / 2), cross = [-1, -.5, .5, 1];
  for (let i = 0; i <= steps; i++) {
    const s = start + (end - start) * i / steps, width = .30 + .12 * Math.sin(s * .021 + seed) ** 2;
    const variation = Math.max(0, Math.sin(s * .017 + seed) * .52 + .40) * (.32 + .44 * Math.sin(s * .037 + 1) ** 2);
    const join = branch ? Math.min(1, (s - start) / 24, (end - s) / 24) : Math.min(1, (s - start) / 10, (end - s) / 10);
    for (let j = 0; j < cross.length; j++) {
      const off = center(s) + cross[j] * width, p = course.groundAt(s, off);
      // Shortcut surfaces sit 3 cm above the main trail at their joins.
      // Carry the continuing tire marks over that visible top surface too.
      const overBranch=!branch&&course.features.shortcuts.some(cut=>s>=cut.start&&s<=cut.end&&Math.abs(off-course.shortcutOffset(cut,s))<=cut.halfWidth);
      positions.push(p.x, p.y + lift + (overBranch?.03:0), p.z); colors.push(1, 1, 1, (j === 0 || j === 3 ? 0 : variation) * Math.max(0, join));
      if (i && j) { const a = i * 4 + j; indices.push(a - 5, a - 1, a - 4, a - 4, a - 1, a); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

function fernGeometry() {
  const positions = [], colors = [];
  const triangle = (a, b, c, light) => { for (const p of [a, b, c]) { positions.push(...p); colors.push(.49 * light, .63 * light, .31 * light); } };
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond * Math.PI * 2 / 7, forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)), across = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle));
    const point = t => forward.clone().multiplyScalar(t * .67).add(new THREE.Vector3(0, .01 + Math.sin(t * Math.PI * .85) * .46, 0));
    for (let segment = 0; segment < 8; segment++) {
      const a = point(segment / 8), b = point((segment + 1) / 8), aa = a.clone().addScaledVector(across, .006), bb = b.clone().addScaledVector(across, .004);
      triangle(a.toArray(), aa.toArray(), b.toArray(), .85); triangle(aa.toArray(), bb.toArray(), b.toArray(), .85);
    }
    for (let node = 1; node <= 7; node++) {
      const t = node / 8, stem = point(t), next = point(t + .065), reach = .145 * Math.sin(t * Math.PI) + .015;
      for (const side of [-1, 1]) {
        const leaf = stem.clone().addScaledVector(across, reach * side).addScaledVector(forward, .09), shoulder = stem.clone().addScaledVector(across, reach * side * .68).addScaledVector(forward, .035);
        leaf.y -= .035; triangle(stem.toArray(), shoulder.toArray(), leaf.toArray(), .8 + t * .25); triangle(stem.toArray(), leaf.toArray(), next.toArray(), .8 + t * .25);
      }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals(); return g;
}

function arrowGeometry(direction) {
  const shape = new THREE.Shape(); [[-.28,-.062],[.02,-.062],[.02,-.14],[.28,0],[.02,.14],[.02,.062],[-.28,.062]].forEach(([x,y],i) => i ? shape.lineTo(x * direction, y) : shape.moveTo(x * direction, y)); shape.closePath(); return new THREE.ShapeGeometry(shape);
}
function flagGeometry() {
  const g = new THREE.PlaneGeometry(.65, .82, 8, 4), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9 + p.getY(i) * 3) * .032); g.computeVertexNormals(); return g;
}
function instances(group, materials) {
  const geometries = { box: new THREE.BoxGeometry(1, 1, 1), pole: new THREE.CylinderGeometry(.42, .5, 1, 7), branch: new THREE.CylinderGeometry(.35, .5, 1, 7), fern: fernGeometry(), 'arrow-left': arrowGeometry(1), 'arrow-right': arrowGeometry(-1), flag: flagGeometry() };
  const buckets = new Map(), add = (mat, shape, matrix, tint = 1) => { const key = `${mat}:${shape}`; if (!buckets.has(key)) buckets.set(key, { mat, shape, entries: [] }); buckets.get(key).entries.push({ matrix, tint }); };
  return { put(mat, shape, frame, size, offset = [0, 0, 0], tint = 1) {
    const c = Math.cos(frame.heading), sn = Math.sin(frame.heading), p = new THREE.Vector3(frame.x + c * offset[0] + sn * offset[2], frame.y + offset[1], frame.z - sn * offset[0] + c * offset[2]);
    add(mat, shape, new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), frame.heading), new THREE.Vector3(...size)), tint);
  }, beam(mat, a, b, radius) {
    const p = new THREE.Vector3(a.x, a.y, a.z), q = new THREE.Vector3(b.x, b.y, b.z), delta = q.clone().sub(p);
    add(mat, 'branch', new THREE.Matrix4().compose(p.add(q).multiplyScalar(.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()), new THREE.Vector3(radius * 2, delta.length(), radius * 2)));
  }, finish() {
    const used = new Set(), usedMaterials = new Set();
    for (const { mat, shape, entries } of buckets.values()) {
      used.add(shape); usedMaterials.add(mat); const mesh = new THREE.InstancedMesh(geometries[shape], materials[mat], entries.length); mesh.name = `Rally ${mat} ${shape}`;
      const tint = new THREE.Color(); entries.forEach((entry, i) => { mesh.setMatrixAt(i, entry.matrix); mesh.setColorAt(i, tint.setRGB(entry.tint, entry.tint, entry.tint)); });
      mesh.receiveShadow = true; mesh.castShadow = !['fern', 'endgrain'].includes(mat); mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const [key, geometry] of Object.entries(geometries)) if (!used.has(key)) geometry.dispose();
    for (const [key, material] of Object.entries(materials)) if (key !== 'rut' && !usedMaterials.has(key)) material.dispose();
  } };
}
