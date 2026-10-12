// Mediterranean dressing for the buildings beside a night street: shutters and small balconies on the
// upper floors, a cornice and a parapet at the roof, awnings and lit shop windows at street level.
// A circuit asks for it with `facades.dress` in its definition; a circuit that does not ask gets
// nothing. The buildings are the course's own (course.features.buildings); the dressing goes on the
// face that looks at the road, and is cheap: boxes in a few instanced draws, one pair per 200 m.
// Drawing only: nothing here changes race state.
import * as THREE from 'three';
import { makeRng } from './rng.js';
import { applyNightWash } from './night-wash.js';

const SHUTTERS = [0x2f5b4a, 0x2c5560, 0x2a3f66, 0x6b4a2a, 0x8a3f2c, 0x3d6b4f];
const AWNINGS = [0x8e2f2f, 0x2d5a4a, 0x1f3556, 0xc89a3a, 0x7a3b52];
const WALLS = [0xf1e3c4, 0xe3b96e, 0xe2a99c, 0xd98a6c, 0xbcd0b0];
const PANES = [0xffd08a, 0xffe9c0, 0xffb878, 0xfff0d8];

export function addStreetFacades(group, course) {
  const facades = course.def.facades;
  if (!facades) return null;
  // The warehouse walls (src/scenery-detail.js) share one material: wash it in street light near the ground.
  if (facades.wash) {
    const washed = new Set();
    for (const mesh of group.children) {
      const material = mesh.userData?.harborCell?.kind === 'walls' ? mesh.material : null;
      if (material && !washed.has(material)) { washed.add(material); applyNightWash(material, { ...facades.wash, base: 'unit', tint: 0 }); }
    }
  }
  const dress = facades.dress;
  if (!dress) return null;
  const rng = makeRng(0x7a11 ^ (course.def.stage * 613)), buildings = course.features.buildings ?? [];
  const reach = dress.reach ?? 45, floors = dress.floors ?? 4;
  const cells = new Map();
  const frame = new THREE.Matrix4(), local = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let faces = 0, parts = 0;

  for (const b of buildings) {
    const near = course.nearest(b.x, b.z);
    if (Math.abs(near.lateral) > reach || b.height < 9) continue;
    const road = course.worldAt(near.s, 0), toRoad = [road.x - b.x, road.z - b.z], norm = Math.hypot(...toRoad) || 1;
    const cos = Math.cos(b.heading || 0), sin = Math.sin(b.heading || 0);
    // The faces, as local outward normals; the world normal is the local one turned by the building's heading.
    const candidates = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([nx, nz]) => ({ nx, nz, dot: ((nx * cos + nz * sin) * toRoad[0] + (-nx * sin + nz * cos) * toRoad[1]) / norm }))
      .sort((a, c) => c.dot - a.dot).filter((item, i) => i === 0 || (item.dot > .55 && i === 1));
    const cell = `${Math.floor(b.x / 200)}:${Math.floor(b.z / 200)}`;
    if (!cells.has(cell)) cells.set(cell, { paint: [], panes: [] });
    const { paint, panes } = cells.get(cell);
    frame.compose(new THREE.Vector3(b.x, b.y, b.z), quaternion.setFromAxisAngle(up, b.heading || 0), new THREE.Vector3(1, 1, 1));
    const shutter = rng.pick(SHUTTERS), awning = rng.pick(AWNINGS), trim = rng.pick(WALLS);
    for (const { nx, nz } of candidates) {
      const width = nz ? b.halfX : b.halfZ, depth = nz ? b.halfZ : b.halfX, yaw = Math.atan2(nx, nz);
      // A part on this face: `u` metres along it (in the building's own axes), `y` up, `out` metres off the wall.
      const put = (list, size, u, y, out, colour, pitch = 0) => {
        quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'));
        const position = new THREE.Vector3(nz ? u : nx * (depth + out), y, nz ? nz * (depth + out) : u);
        local.compose(position, quaternion, new THREE.Vector3(...size)).premultiply(frame);
        list.push({ matrix: local.clone(), colour });
        parts++;
      };
      // Roof edge: a cornice with a parapet above it.
      put(paint, [width * 2 + .5, .32, .5], 0, b.height - .22, .22, trim);
      put(paint, [width * 2 + .1, .55, .2], 0, b.height + .25, .06, trim);
      // Upper floors: shutters beside the existing windows and small balconies. The windows
      // (src/world-props.js addHarbor) stand every 2.6 m on the long faces and every 3.1 m on the short ones.
      const first = nz ? 6 : 5, rise = nz ? 3.1 : 3.5, pitchU = nz ? 2.6 : 3.1, start = nz ? -width + 1.6 : -width + 2, half = nz ? 1.0 : 1.15;
      let floor = 0;
      for (let y = first; y < b.height - 1 && floor < floors; y += rise, floor++) {
        let column = 0;
        for (let u = start; u < width - 1; u += pitchU, column++) {
          for (const side of [-1, 1]) put(paint, [.5, 1.28, .08], u + side * half, y, .1, shutter);
          if (floor % 2 === 1 && column % 2 === 0) {
            put(paint, [1.9, .13, .85], u, y - .62, .42, trim);
            put(paint, [1.9, .85, .04], u, y - .15, .82, 0x1a1e20);
            for (const side of [-1, 1]) put(paint, [.04, .85, .8], u + side * .93, y - .15, .42, 0x1a1e20);
          }
        }
      }
      // Street level: lit shop windows either side of the door, each with an awning.
      for (const side of [-1, 1]) for (let x = 4.0; x < width - 1.4; x += 3.5) {
        const at = side * x;
        put(panes, [2.5, 2.3, .05], at, 1.9, .12, rng.pick(PANES));
        put(paint, [2.9, .08, 1.3], at, 3.75, .7, awning, .42);
      }
      faces++;
    }
  }

  const paintMaterial = new THREE.MeshStandardMaterial({ name: 'Facade dressing', color: 0xffffff, roughness: .85 });
  applyNightWash(paintMaterial, { ...(course.def.facades.wash ?? {}), height: 1, floor: course.def.facades.wash?.floor ?? .25, tint: 0 });
  const paneMaterial = new THREE.MeshBasicMaterial({ name: 'Shopfront glow', color: 0xffffff });
  const cube = new THREE.BoxGeometry(1, 1, 1), colour = new THREE.Color(), dressing = new THREE.Group();
  dressing.name = 'Street facades';
  let draws = 0;
  for (const [cell, lists] of cells) for (const [kind, list] of Object.entries(lists)) {
    if (!list.length) continue;
    const mesh = new THREE.InstancedMesh(cube, kind === 'paint' ? paintMaterial : paneMaterial, list.length);
    mesh.name = `Facade ${kind} ${cell}`;
    list.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, colour.set(item.colour)); });
    if (kind === 'panes') mesh.instanceColor.array.forEach((value, i, array) => { array[i] = value * .8; });
    mesh.castShadow = false; mesh.receiveShadow = kind === 'paint';
    mesh.computeBoundingSphere(); mesh.boundingSphere.radius += 1;
    mesh.userData.excludeAmbientOcclusion = true; mesh.userData.facadeCell = cell;
    dressing.add(mesh); draws++;
  }
  group.add(dressing);
  dressing.userData.streetFacades = { faces, parts, draws };
  return dressing.userData.streetFacades;
}
