// LAB-ART: the hangar itself (docs/LAB.md section 2): a working hangar beside the
// home helipad, 30 x 18 m inside, concrete floor with oil stains, corrugated
// steel, trusses, strip lights, a big door open onto the pad on its +Z side,
// steel workbenches under a pegboard of tools, shelves, drums, tyres. The benches
// themselves are separate models placed by HANGAR_LAYOUT.
import * as THREE from 'three';
import { C, Part, addSurface, corrugated, fbm, lerpColor, noise, rng, smooth, surface, thick, tools } from './lab-kit.mjs';
import { YELLOW } from './lab-common.mjs';
import { LAMPS, floorWear, lamps, workshop } from './lab-dressing.mjs';

export const HALL = Object.freeze({ halfWidth: 15, halfDepth: 9, eaves: 6.4, ridge: 8.4, doorHalfWidth: 9, doorHeight: 5.8 });

// Where each bench model stands in the hangar (model origin on the floor, +Z of
// the model facing the door side unless a yaw turns it).
export const HANGAR_LAYOUT = Object.freeze({
  'weighing-pad': { x: 0, z: 2.6, yaw: 0 },
  'weights-and-cans': { x: -6.2, z: 6.4, yaw: 0 },
  'drop-tower': { x: -11.4, z: -1.2, yaw: 0 },
  'fire-pit': { x: -11.6, z: 4.6, yaw: 0 },
  'pendulum-frame': { x: -5.4, z: -3.4, yaw: 0 },
  'nail-jars': { x: -10.9, z: -8.4, yaw: 0 },
  'bending-rig': { x: -6.3, z: -7.6, yaw: 0 },
  'rotor-stand': { x: -1.6, z: -7.3, yaw: 0 },
  'launcher-ramp': { x: 1.7, z: -6.5, yaw: 0 },
  'snow-trays': { x: -7.3, z: 3.0, yaw: Math.PI / 2 },
  'wind-tunnel': { x: 8.6, z: -6.3, yaw: 0 },
  'turning-arm': { x: 9.9, z: 2.0, yaw: 0 },
  'map-table': { x: 13.4, z: 7.2, yaw: 0 },
});

// Benches whose parts swing beyond their footprint: the swept circle's radius in metres about the model origin.
export const HANGAR_SWEEP = Object.freeze({ 'turning-arm': 4.8 });

const STEEL_BLUE = 0x56646d, WALL = 0xa3a597, ROOF = 0x7f8279;

export function hangar({ roof = true } = {}) {
  const part = new Part('hangar'); const t = tools(part, 100);
  const W = HALL.halfWidth, D = HALL.halfDepth;

  // ---- the floor: a concrete slab, joints, cracks, oil, tyre marks, safety lines ----
  addSurface(part, surface(-W - .4, W + .4, -D - .4, D + .4, 96, 58, (x, z) => -.004 * Math.sin(x * .7) * Math.cos(z * .5), (p) => {
    const x = p.x, z = p.z, big = fbm(p, .45, 301), grain = fbm(p, 6, 302);
    let c = lerpColor(C(0x6f6c66), C(0x8b8880), big * 1.2 + grain * .25);
    // Oil: a few soft pools that gather under the benches and along the helicopter's line,
    // each with a darker core, and drips round the edges.
    const pool = noise(x * .32, 0, z * .32, 304) * .7 + noise(x * .8, 0, z * .8, 309) * .3 + Math.exp(-((x * x) / 18 + ((z - 2) * (z - 2)) / 30)) * .14;
    if (pool > .60) c = lerpColor(c, C(0x25221d), Math.min(.65, (pool - .60) * 4));
    if (pool > .68) c = lerpColor(c, C(0x14120f), Math.min(.5, (pool - .68) * 5));
    for (const [lx, lz] of LAMPS) { const d = Math.hypot(x - lx, z - lz); if (d < 2.4) c = lerpColor(c, C(0xcfa468), (1 - d / 2.4) ** 2 * .22); }
    const dust = fbm(p, 3, 308); c = lerpColor(c, C(0x8d8a82), Math.max(0, dust - .55) * 1.2);
    // Rubber marks from the door to the pad.
    const mark = Math.abs(Math.sin((x + noise(z * .5, 0, 0, 306) * 2) * 2.6)); if (z > 0 && mark > .985 && noise(x, 0, z, 307) > .45) c = lerpColor(c, C(0x211f1c), .5);
    return c;
  }));

  // Expansion joints every 5 m in x and 6 m in z, and the yellow safety lines round the weighing pad and along the door, as thin strips on the slab.
  for (let x = -12.5; x <= 12.5; x += 5) t.box([.035, .006, 2 * D + .6], [x, .003, 0], 0x24221f, { dirt: 0 });
  for (const z of [-6, 0, 6]) t.box([2 * W + .6, .006, .035], [0, .003, z], 0x24221f, { dirt: 0 });
  for (const x of [-4.4, 4.4]) t.box([.1, .008, 9.2], [x, .004, 2.4], YELLOW, { dirt: .45, chip: .2, oil: 1 });
  for (const z of [-2.2, 7.0]) t.box([8.8, .008, .1], [0, .004, z], YELLOW, { dirt: .45, chip: .2, oil: 1 });
  t.box([2 * HALL.doorHalfWidth, .008, .12], [0, .004, 8.3], YELLOW, { dirt: .45, chip: .2, oil: 1 });

  // ---- walls: corrugated steel, rust streaking from the bottom and the joints ----
  const wallColor = (seed, rustBias = 0) => (p, n) => {
    const streak = noise(p.x * 9 + p.z * 9, p.y * .45, 0, seed), low = 1 - smooth(0, 2.2, p.y);
    let c = lerpColor(C(WALL), C(0x7c7e70), fbm(p, .8, seed + 1) * 1.1);
    c.multiplyScalar(1 - (.14 + low * .28) * (.6 + fbm(p, 4, seed + 2)));
    if (streak > .70 - rustBias) c = lerpColor(c, C(0x6e4528), Math.min(.9, (streak - .70 + rustBias) * 4));
    return c;
  };
  const sheet = (width, height, pos, rot, seed, rows = 3) => part.add('solid', thick(corrugated(width, height, .3, .04, rows), .035), pos, rot, [1, 1, 1], wallColor(seed));
  sheet(2 * W + .8, HALL.eaves, [0, 0, -D - .05], [0, 0, 0], 311);                 // back wall, facing +Z (inside)
  sheet(2 * D + .6, HALL.eaves, [-W - .05, 0, 0], [0, Math.PI / 2, 0], 312);       // left wall, faces +X
  sheet(2 * D + .6, HALL.eaves, [W + .05, 0, 0], [0, -Math.PI / 2, 0], 313);       // right wall, faces -X
  // Front: two fixed wall bays and the lintel round the 18 m opening; door leaves stacked at the sides.
  for (const side of [-1, 1]) {
    sheet(W - HALL.doorHalfWidth, HALL.eaves, [side * (W + HALL.doorHalfWidth) / 2, 0, D + .05], [0, Math.PI, 0], 314 + side);
    sheet(4.4, HALL.doorHeight - .2, [side * (HALL.doorHalfWidth + 2.4), .1, D + .32], [0, Math.PI, 0], 316 + side, 3);
    sheet(4.4, HALL.doorHeight - .2, [side * (HALL.doorHalfWidth + 4.6), .1, D + .62], [0, Math.PI, 0], 318 + side, 3);
  }
  sheet(2 * HALL.doorHalfWidth, HALL.eaves - HALL.doorHeight, [0, HALL.doorHeight, D + .05], [0, Math.PI, 0], 320, 2);
  // Gable triangles above the eaves on the back and front walls.
  if (roof) for (const [z, flip] of [[-D - .06, 0], [D + .06, Math.PI]]) {
    const shape = new THREE.Shape(); shape.moveTo(-W - .4, 0); shape.lineTo(W + .4, 0); shape.lineTo(0, HALL.ridge - HALL.eaves + .15); shape.closePath();
    const g = new THREE.ShapeGeometry(shape); g.computeVertexNormals();
    part.add('solid', thick(g, .03), [0, HALL.eaves, z], [0, flip, 0], [1, 1, 1], wallColor(330 + flip, .1));
  }
  // Steel columns along the side walls and the door posts, chipped blue-grey paint.
  for (let z = -D + .6; z <= D - .5; z += 3) for (const side of [-1, 1]) t.box([.34, HALL.eaves, .34], [side * (W - .15), HALL.eaves / 2, z], STEEL_BLUE, { dirt: .3, rust: .5, chip: .06 });
  for (let x = -W + 2; x <= W - 1.9; x += 3) t.box([.34, HALL.eaves, .34], [x, HALL.eaves / 2, -D + .17], STEEL_BLUE, { dirt: .3, rust: .5, chip: .06 });
  for (const side of [-1, 1]) t.box([.5, HALL.eaves, .5], [side * HALL.doorHalfWidth, HALL.eaves / 2, D - .1], STEEL_BLUE, { dirt: .3, rust: .6, chip: .08 });
  t.box([2 * HALL.doorHalfWidth + .6, .55, .4], [0, HALL.doorHeight + .1, D - .05], STEEL_BLUE, { dirt: .3, rust: .5, chip: .06 }); // door header beam
  for (const side of [-1, 1]) t.box([6.8, .18, .12], [side * (HALL.doorHalfWidth + 3.5), HALL.doorHeight + .55, D + .2], 0x3a3d3f, { rust: .7 }); // the door rail

  // ---- roof: portal frames, purlins, corrugated sheets ----
  const slope = Math.atan2(HALL.ridge - HALL.eaves, W);
  const frameZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  if (roof) for (const z of frameZ) {
    for (const side of [-1, 1]) {
      t.bar([side * (W - .1), HALL.eaves, z], [0, HALL.ridge - .2, z], .17, STEEL_BLUE, { dirt: .3, rust: .45, chip: .05 }, true);          // rafter
      t.bar([side * (W - .1), HALL.eaves - .6, z], [0, HALL.eaves - .5, z], .1, STEEL_BLUE, { dirt: .3, rust: .45 }, true);                  // bottom chord
      for (let i = 0; i < 4; i++) {
        const x0 = side * (W - .1 - i * (W / 4)), x1 = side * (W - .1 - (i + .5) * (W / 4)), y0 = HALL.eaves - .6 + (i * .02), y1 = HALL.eaves + (HALL.ridge - HALL.eaves) * (i + .5) / 4 - .15;
        t.bar([x0, y0, z], [x1, y1, z], .05, STEEL_BLUE, { rust: .5 });
        t.bar([x1, y1, z], [side * (W - .1 - (i + 1) * (W / 4)), HALL.eaves - .5, z], .05, STEEL_BLUE, { rust: .5 });
      }
    }
    t.box([.3, .9, .3], [0, HALL.ridge - .75, z], STEEL_BLUE, { rust: .4 });
  }
  if (roof) for (const side of [-1, 1]) for (let i = 1; i <= 5; i++) {
    const x = side * (W - i * W / 5.5), y = HALL.eaves + (W - Math.abs(x)) * Math.tan(slope) * -1 + (HALL.ridge - HALL.eaves);
    t.box([.1, .14, 2 * D], [x, y - .1, 0], 0x4d5155, { rust: .6 });
  }
  if (roof) for (const side of [-1, 1]) {
    // The sheet's local X runs along the hangar, local Y up the slope, local Z out of the roof.
    const length = Math.hypot(W + .3, HALL.ridge - HALL.eaves), g = thick(corrugated(2 * D + .8, length, .3, .05, 2), .04);
    const ex = new THREE.Vector3(0, 0, -side), ey = new THREE.Vector3(-side * Math.cos(slope), Math.sin(slope), 0), ez = new THREE.Vector3().crossVectors(ex, ey);
    const matrix = new THREE.Matrix4().makeBasis(ex, ey, ez).setPosition(side * (W + .3), HALL.eaves - .05, 0);
    const geometry = g.clone().applyMatrix4(matrix), p = geometry.attributes.position, colors = new Float32Array(p.count * 3), q = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      q.fromBufferAttribute(p, i);
      const f = fbm(q, 1.4, 340 + side), c = lerpColor(C(ROOF), C(0x5d4a39), smooth(.55, .9, fbm(q, 2.2, 345)) * .7 + f * .1).multiplyScalar(.92 - f * .25);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    part.pieces.solid.push(geometry);
  }

  // ---- strip lights hung from the frames ----
  if (roof) for (const z of frameZ) for (const x of [-7.5, 7.5]) {
    t.bar([x - .6, HALL.eaves - .5, z], [x - .6, 5.55, z], .012, 0x2a2a2a); t.bar([x + .6, HALL.eaves - .5, z], [x + .6, 5.55, z], .012, 0x2a2a2a);
    t.box([1.7, .1, .28], [x, 5.5, z], 0x3b3e40, { dirt: .3, rust: .2 });
    for (const dz of [-.07, .07]) t.glow(new THREE.CylinderGeometry(.02, .02, 1.6, 8), [x, 5.43, z + dz], 0xfff2d2, [0, 0, Math.PI / 2]);
  }

  dressing(part, t);
  workshop(part, t);
  floorWear(part, t);
  if (roof) lamps(part, t);
  return [part];
}

// Workbenches under a pegboard, shelves, drums, tyres and the odds and ends of a
// hangar that is used.
function dressing(part, t) {
  const W = HALL.halfWidth, D = HALL.halfDepth, random = rng(401);
  // The pegboard: a grid of holes and the tools on their hooks.
  const board = new THREE.BoxGeometry(.04, 2.4, 5.4);
  t.geo(board, [-W + .04, 2.45, -6.1], 0x8c6c44, { dirt: .3, oil: .6 });
  for (let u = -2.65; u <= 2.65; u += .12) for (let v = 1.34; v <= 3.6; v += .12) if (random() > .06) t.geo(new THREE.CircleGeometry(.012, 5).rotateY(Math.PI / 2), [-W + .063, v, -6.1 + u], 0x2b1f14, { dirt: 0 });
  const hook = (v, u, kind) => {
    const x = -W + .09, z = -6.1 + u;
    if (kind === 'wrench') { t.box([.012, .42, .035], [x, v, z], 0x8a8d90, { rust: .5, dirt: .3 }); t.cyl(.04, .04, .012, [x, v + .22, z], 0x8a8d90, { rust: .5 }, [0, 0, Math.PI / 2]); }
    if (kind === 'hammer') { t.box([.03, .34, .03], [x, v, z], 0x7a5230, { dirt: .4 }); t.box([.05, .045, .17], [x, v + .19, z], 0x4a4d50, { rust: .6 }); }
    if (kind === 'saw') { t.box([.008, .18, .62], [x, v, z], 0x9a9c9e, { rust: .7 }); t.box([.03, .1, .1], [x, v, z + .34], 0x7a3a22, { dirt: .3 }); }
    if (kind === 'pliers') { t.box([.012, .22, .028], [x, v, z - .015], 0xb02a24, { rust: .2, dirt: .3 }); t.box([.012, .22, .028], [x, v, z + .015], 0xb02a24, { rust: .2, dirt: .3 }); }
    if (kind === 'driver') { t.cyl(.016, .016, .12, [x, v - .1, z], 0xc58a22, { dirt: .3 }); t.cyl(.005, .005, .2, [x, v + .06, z], 0x909396, { rust: .4 }); }
    if (kind === 'tape') { t.cyl(.06, .06, .035, [x, v, z], 0xd4b02a, { dirt: .4 }, [0, 0, Math.PI / 2]); }
    if (kind === 'clamp') { t.tube([[x, v - .15, z - .08], [x, v - .15, z + .08], [x, v + .12, z + .08], [x, v + .12, z - .08]], .01, 0x6a6e70, { rust: .5 }, 12, 5); }
  };
  const kinds = ['wrench', 'hammer', 'saw', 'pliers', 'driver', 'tape', 'clamp'];
  for (let row = 0; row < 3; row++) for (let i = 0; i < 11; i++) hook(1.78 + row * .7, -2.5 + i * .5 + (row % 2) * .12, kinds[(i + row * 2) % kinds.length]);
  // Shelving unit against the left wall by the door: boxes, cans, rags.
  for (let level = 0; level < 4; level++) t.box([.55, .04, 2.4], [-W + .4, .35 + level * .55, 6.6], 0x5a666d, { rust: .4, dirt: .3 });
  for (const dz of [-1.2, 1.2]) for (const dx of [-.25, .25]) t.box([.05, 2.3, .05], [-W + .4 + dx, 1.15, 6.6 + dz], 0x5a666d, { rust: .4 });
  for (let level = 0; level < 4; level++) for (let i = 0; i < 5; i++) {
    const kind = random();
    if (kind < .4) t.box([.34, .2 + random() * .12, .3], [-W + .4, .46 + level * .55, 5.7 + i * .45], [0xb09a74, 0x9a8460, 0x8a7a5a][i % 3], { dirt: .4 });
    else if (kind < .7) t.cyl(.07, .07, .18, [-W + .4, .46 + level * .55, 5.7 + i * .45], [0xa83a2a, 0x2f5f86, 0x9a9a22][i % 3], { rust: .3, dirt: .3 });
    else t.cyl(.1, .1, .16, [-W + .4, .46 + level * .55, 5.7 + i * .45], 0x6a6a64, { dirt: .5 });
  }
  t.cyl(.07, .07, .42, [W - .2, 1.35, 3.3], 0xaa2822, { dirt: .3, chip: .1 }); t.cyl(.03, .03, .14, [W - .2, 1.62, 3.3], 0x2a2a2a, {});   // an extinguisher on the right wall
  // A wall clock and a first-aid box on the back wall, a rolling stool, a coiled cable drum.
  t.glow(new THREE.CircleGeometry(.24, 20), [4.6, 4.3, -D + .02], 0xf2ecd8); t.cyl(.26, .26, .05, [4.6, 4.3, -D + .035], 0x2a2a2a, {}, [Math.PI / 2, 0, 0]);
  t.box([.4, .28, .12], [8.8, 1.9, -D + .08], 0x2a7a3a, { dirt: .3, chip: .1 });
  t.cyl(.2, .2, .04, [-9.8, .58, -5.4], 0x2a2a2a, {}, [0, 0, 0], 12); t.cyl(.03, .03, .55, [-9.8, .3, -5.4], 0x66686a, { rust: .5 }, [0, 0, 0], 6);
  t.cyl(.45, .45, .08, [-4.6, .55, 8.1], 0x8a6a3a, { dirt: .4 }, [Math.PI / 2, 0, 0], 16); t.cyl(.45, .45, .08, [-4.6, .55, 7.6], 0x8a6a3a, { dirt: .4 }, [Math.PI / 2, 0, 0], 16); t.cyl(.22, .22, .5, [-4.6, .55, 7.85], 0x1d1d1d, { dirt: .3 }, [Math.PI / 2, 0, 0], 12);
  // A cluttered corner: a pallet of boxes and a trolley.
  t.box([1.2, .12, 1.0], [W - 1.2, .06, -2.5], 0x8a6a3a, { dirt: .5 }); for (let i = 0; i < 3; i++) t.box([.55, .35, .45], [W - 1.2 + (i - 1) * .35, .3, -2.5 + (i % 2) * .15], [0x9a8460, 0xb09a74, 0x8a7a5a][i], { dirt: .5 });
}
