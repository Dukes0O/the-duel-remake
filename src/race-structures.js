import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addCityChaseDetail } from './city-chase-detail.js';
import { addStadiumCrowd, STADIUM_SECTIONS, STADIUM_ROWS } from './stadium-crowd.js';
import { tunnelCoverShape } from './road-furniture.js';
import { createTunnelConcrete, tunnelDetailMaterials, buildTunnelWallDetails } from './tunnel-detail.js';

// The road and all collision hulls remain owned by Course. Architecture follows
// those frames, including road elevation inside tunnels and over arena jumps.
export function addRaceStructures(world, course) {
  const group = new THREE.Group(); group.name = 'Circuit tunnels and stadium';
  const materials = {
    concrete: new THREE.MeshStandardMaterial({ color: 0xaaa89d, roughness: .98, side: THREE.DoubleSide }),
    ...(course.features.tunnels?.length?{lining:createTunnelConcrete(),tunnelConcrete:createTunnelConcrete(true),...tunnelDetailMaterials()}:{}),
    rock: new THREE.MeshStandardMaterial({ color: 0x777c78, roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: 0x192a32, metalness: .58, roughness: .67 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x71848b, metalness: .74, roughness: .5 }),
    roof: new THREE.MeshStandardMaterial({ color: 0x45565f, metalness: .48, roughness: .7, side: THREE.DoubleSide }),
    red: new THREE.MeshStandardMaterial({ color: 0x8b3335, roughness: .73 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x315f7c, roughness: .73 }),
    yellow: new THREE.MeshStandardMaterial({ color: 0xe7b743, roughness: .83, side: THREE.DoubleSide }),
    white: new THREE.MeshStandardMaterial({ color: 0xece8d5, roughness: .83, side: THREE.DoubleSide }),
    dirt: new THREE.MeshStandardMaterial({ color: 0x755135, roughness: 1, side: THREE.DoubleSide }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xf3ede1, emissive: 0xffddac, emissiveIntensity: 2.6, roughness: .2 }),
    green: new THREE.MeshStandardMaterial({ color: 0x57dd9a, emissive: 0x37b77b, emissiveIntensity: .8 }),
  };
  const batch = builder(group, materials);
  for (const tunnel of course.features.tunnels || []) addTunnel(group, batch, course, tunnel, materials);
  if (course.def.arena) {addStadium(batch, course);addStadiumCrowd(group,course);}
  batch.finish();
  group.userData.structures = { tunnels: course.features.tunnels?.length || 0, stadium: !!course.def.arena, ramps: course.features.ramps?.length || 0 };
  world.add(group); addCityChaseDetail(world, course); return group;
}

function frame(course, s, off = 0) { return course.worldAt(s, off); }
function point(course, s, x, y) {
  const p = frame(course, s, x); return new THREE.Vector3(p.x, p.y + y, p.z);
}
function builder(group, materials) {
  const boxes = new Map(), custom = new Map();
  const cube = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(.5, .5, 1, 8);
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), vector = new THREE.Vector3();
  const add = (mat, size, p, rotation = [0, 0, 0], shape = 'box', color = 0xffffff) => {
    const key = `${mat}:${shape}`;
    if (!boxes.has(key)) boxes.set(key, { mat, shape, items: [] });
    quaternion.setFromEuler(new THREE.Euler(...rotation));
    matrix.compose(vector.set(p.x, p.y, p.z), quaternion, new THREE.Vector3(...size));
    boxes.get(key).items.push({ matrix: matrix.clone(), color });
  };
  const local = (course, s, off, y, mat, size, pitch = 0, tint = 0xffffff) => {
    const p = frame(course, s, off); p.y += y; add(mat, size, p, [pitch, p.heading, 0], 'box', tint);
  };
  const beam = (a, b, radius, mat) => {
    const delta = b.clone().sub(a), length = delta.length(), center = a.clone().add(b).multiplyScalar(.5);
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    const key = `${mat}:cylinder`; if (!boxes.has(key)) boxes.set(key, { mat, shape: 'cylinder', items: [] });
    matrix.compose(center, quaternion, new THREE.Vector3(radius * 2, length, radius * 2));
    boxes.get(key).items.push({ matrix: matrix.clone(), color: 0xffffff });
  };
  return { add, local, beam, geometry(mat, geometry) {
    if (!custom.has(mat)) custom.set(mat, []); custom.get(mat).push(geometry);
  }, finish() {
    const used = new Set();
    for (const { mat, shape, items } of boxes.values()) {
      const geometry = shape === 'box' ? cube : cylinder; used.add(shape);
      const mesh = new THREE.InstancedMesh(geometry, materials[mat], items.length); mesh.name = `Circuit ${mat} ${shape}`;
      items.forEach((v, i) => { mesh.setMatrixAt(i, v.matrix); mesh.setColorAt(i, new THREE.Color(v.color)); });
      mesh.castShadow = !['lamp', 'green'].includes(mat); mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const [mat, geometries] of custom) {
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach(g => g.dispose());
      const mesh = new THREE.Mesh(geometry, materials[mat]); mesh.name = `Circuit ${mat} surface`;
      mesh.castShadow = !['white', 'yellow', 'tunnelSeam', 'tunnelPanel', 'tunnelVent'].includes(mat); mesh.receiveShadow = true; group.add(mesh);
    }
    if (!used.has('box')) cube.dispose(); if (!used.has('cylinder')) cylinder.dispose();
    const usedMaterials = new Set([...boxes.values()].map(v => v.mat).concat([...custom.keys()]));
    for (const [key, material] of Object.entries(materials)) if (!usedMaterials.has(key)) material.dispose();
  } };
}

function surface(rows, vertexColor = false) {
  const positions = [], colors = [], uv = [], indices = [], width = rows[0].length;
  rows.forEach((row, j) => row.forEach((p, i) => {
    positions.push(p.x, p.y, p.z); uv.push(i / (width - 1), j / (rows.length - 1));
    if (vertexColor) { const n = .82 + .16 * Math.sin(p.x * .79 + p.z * .37) * Math.cos(p.y * .47); colors.push(n, n, n * .96); }
    if (i && j) { const a = j * width + i, b = a - width; indices.push(a - 1, b - 1, a, b - 1, b, a); }
  }));
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (vertexColor) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function archProfile(width, height, thickness = 0) {
  const points = [], spring = 3.6;
  points.push([-width - thickness, -.1], [-width - thickness, spring]);
  for (let i = 1; i <= 20; i++) { const a = Math.PI - i / 20 * Math.PI; points.push([(width + thickness) * Math.cos(a), spring + (height - spring + thickness) * Math.sin(a)]); }
  points.push([width + thickness, -.1]); return points;
}

function addTunnel(group, batch, course, tunnel) {
  const { start, end, width, height } = tunnel, profile = archProfile(width, height), rows = [], rockRows = [];
  const segments = Math.ceil((end - start) / 4);
  for (let j = 0; j <= segments; j++) {
    const t = j / segments, s = start + t * (end - start);
    rows.push(profile.map(([x, y]) => point(course, s, x, y)));
    const {width:rockWidth,height:rockHeight}=tunnelCoverShape(tunnel,s);
    const row = [];
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI - i / 28 * Math.PI, x = rockWidth * Math.cos(a);
      const roughness = i === 0 || i === 28 ? 0 : 1.2 * Math.sin(j * 1.1 + i * 1.7) * Math.sin(a);
      const ground = course.groundAt(s, x).y - frame(course, s).y;
      row.push(point(course, s, x, ground + (rockHeight + roughness) * Math.sin(a)));
    }
    rockRows.push(row);
  }
  batch.geometry('lining', surface(rows)); batch.geometry('rock', surface(rockRows, true));
  for(const[kind,geometry]of Object.entries(buildTunnelWallDetails(course,tunnel)))batch.geometry(kind,geometry);
  for (const s of [start, end]) {
    const inner = archProfile(width, height), outer = archProfile(width, height, .72);
    batch.geometry('tunnelConcrete', surface([inner.map(([x, y]) => point(course, s, x, y)), outer.map(([x, y]) => point(course, s, x, y))]));
    batch.geometry('tunnelConcrete', surface([outer.map(([x, y]) => point(course, s - .7, x, y)), outer.map(([x, y]) => point(course, s + .7, x, y))]));
    // Fill only the space outside the arch; the portal opening stays empty.
    const rock = s === start ? rockRows[0] : rockRows.at(-1), rockBand = [];
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI - i / 28 * Math.PI;
      rockBand.push(point(course, s, (width + .72) * Math.cos(a), 3.6 + (height - 3.6 + .72) * Math.sin(a)));
    }
    batch.geometry('rock', surface([rockBand, rock], true));
    for (const side of [-1, 1]) {
      batch.local(course, s, side * (width + .35), 1.9, 'tunnelConcrete', [.7, 3.8, 1.4]);
      batch.local(course, s - (s === start ? .78 : -.78), side * (width + .35), 1.1, 'yellow', [.64, 1.7, .06]);
      for (let y = .5; y <= 1.8; y += .45) batch.local(course, s - (s === start ? .82 : -.82), side * (width + .35), y, 'dark', [.65, .19, .07]);
    }
    batch.local(course, s, 0, height + 1.07, 'dark', [5.4, .66, .4]);
    for (const x of [-1.7, 1.7]) batch.local(course, s - (s === start ? .24 : -.24), x, height + 1.07, 'green', [.54, .16, .04]);
  }
  for (let s = start + 7; s < end; s += 12) {
    // Narrow interior ribs and cable trays stay behind the collidable wall face.
    for (const side of [-1, 1]) {
      batch.local(course, s, side * (width + .015), 1.15, 'tunnelConcrete', [.05, .12, 11.8]);
      batch.local(course, s, side * (width + .018), 3.05, 'steel', [.04, .14, 11.8]);
      batch.local(course, s, side * (width - .08), 4.15, 'dark', [.20, .32, 1.65]);
      batch.local(course, s, side * (width - .20), 4.12, 'lamp', [.045, .16, 1.42]);
      batch.local(course, s, side * (width - .015), .65, 'green', [.018, .12, .36]);
    }
    const rib = archProfile(width + .025, height + .025);
    for (let i = 2; i < rib.length - 1; i++) batch.beam(point(course, s, ...rib[i - 1]), point(course, s, ...rib[i]), .035, 'steel');
  }
  for (let s = start + 20; s < end; s += 42) {
    const p = point(course, s, 0, 6.5), light = new THREE.PointLight(0xffddb5, 32, 25, 2);
    light.position.copy(p); light.name = 'Tunnel ceiling pool'; group.add(light);
  }
}

function addStadium(batch, course) {
  for (const barrier of course.features.barriers.filter(v => v.arenaWall)) {
    batch.add('concrete', [barrier.halfX * 2, 1.8, barrier.halfZ * 2], { x: barrier.x, y: barrier.y + .9, z: barrier.z }, [0, barrier.heading, 0]);
    const side = Math.sign(barrier.off), face = { x: barrier.x - Math.cos(barrier.heading) * side * .507, y: barrier.y + .95, z: barrier.z + Math.sin(barrier.heading) * side * .507 };
    batch.add(Math.floor(barrier.s / 8) % 2 ? 'yellow' : 'dark', [.025, .60, 7.8], face, [0, barrier.heading, 0]);
  }
  // The grandstand faces the outside of the oval. Its foot is 8 m beyond the
  // collision wall, keeping every seat, beam and floodlight out of the arena.
  const sections = STADIUM_SECTIONS, sectionLength = course.length / sections;
  for (let i = 0; i < sections; i++) {
    const s = (i + .5) * sectionLength, standWidth = sectionLength * .86;
    for (let row = 0; row < STADIUM_ROWS; row++) {
      const off = 32 + row * 2.0, y = 1.7 + row * 1.13;
      batch.local(course, s, off, y - .32, 'concrete', [2.1, .48, standWidth]);
      batch.local(course, s, off + .38, y + .19, row % 3 === 0 ? 'red' : 'blue', [.42, .50, standWidth - 1.1]);

    }
    for (const z of [-standWidth * .43, standWidth * .43]) {
      const base = frame(course, s, 49.4), c = Math.cos(base.heading), sn = Math.sin(base.heading);
      const localPoint = (x, y) => new THREE.Vector3(base.x + c * x + sn * z, base.y + y, base.z - sn * x + c * z);
      batch.beam(localPoint(0, 0), localPoint(0, 16.0), .23, 'steel');
      batch.beam(localPoint(0, 15.6), localPoint(-20, 13.3), .14, 'steel');
      batch.beam(localPoint(0, 11.8), localPoint(-13, 14.1), .12, 'steel');
    }
    batch.local(course, s, 40.0, 15.0, 'roof', [22.8, .18, standWidth + .4]);
    batch.local(course, s, 28.75, 14.6, i % 2 ? 'yellow' : 'white', [.18, .62, standWidth + .4]);
    batch.local(course, s, 29.9, .8, 'steel', [.11, 1.4, standWidth]);
    if (i % 3 === 0) {
      const p = frame(course, s, 52.0); p.y += 13.5;
      batch.add('steel', [.7, 27, .7], p, [0, p.heading, 0]);
      batch.local(course, s, 52.0, 27.1, 'dark', [.9, 2.8, 7.5]);
      for (const h of [26.4, 27.8]) for (let k = -2; k <= 2; k++) {
        const f = frame(course, s, 51.48);
        batch.add('lamp', [.10, .98, 1.14], { x: f.x + Math.sin(f.heading) * k * 1.35, y: f.y + h, z: f.z + Math.cos(f.heading) * k * 1.35 }, [0, f.heading, 0]);
      }
    }
  }
  for (const ramp of course.features.ramps) {
    const wallRows = [[], []], segmentCount = 24;
    for (let j = 0; j <= segmentCount; j++) {
      const s = ramp.start + (ramp.end - ramp.start) * j / segmentCount, y = course.jumpAt(s);
      for (const [index, side] of [-1, 1].entries()) wallRows[index].push([point(course, s, side * 15, -.06), point(course, s, side * 15, y)]);
    }
    wallRows.forEach(rows => batch.geometry('dirt', surface(rows)));
    for (const side of [-1, 1]) {
      const edge = [];
      for (let j = 0; j <= 32; j++) {
        const s = ramp.start + (ramp.end - ramp.start) * j / 32;
        edge.push([point(course, s, side * 12.3, course.jumpAt(s) + .024), point(course, s, side * 12.68, course.jumpAt(s) + .024)]);
      }
      batch.geometry('yellow', surface(edge));
    }
    for (let k = 0; k < 3; k++) {
      const s = ramp.start + 8 + k * 3.5;
      for (const side of [-1, 1]) {
        const rows = [];
        for (let j = 0; j <= 8; j++) {
          const off = side * (j / 8) * 3.7, ss = s - Math.abs(off) * .65;
          rows.push([point(course, ss, off, course.jumpAt(ss) + .03), point(course, ss + .40, off, course.jumpAt(ss + .40) + .03)]);
        }
        batch.geometry('white', surface(rows));
      }
    }
  }
}
