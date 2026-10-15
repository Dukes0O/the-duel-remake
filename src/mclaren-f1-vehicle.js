import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original geometry from the McLaren F1 road car's public photographs, viewed
// only. No maker mesh, texture, badge or logo. Metres; +Z forward, +Y up.
export const MCLAREN_F1_VEHICLE_DIMENSIONS = Object.freeze({
  mclaren_f1: Object.freeze({ width: 2.00, length: 4.28, height: 1.14, wheelRadius: .335 }),
});
const { materials, batch, sculpt, cylinder, cockpit, wheels, exhaust, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.23, -1.30]);

export function createMclarenF1Vehicle({ key = 'mclaren_f1', color = 0xb8bdc2, accent = 0x202329 } = {}) {
  if (!Object.hasOwn(MCLAREN_F1_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'F1 silver body'; m.paint.metalness = .58; m.paint.roughness = .29;
  m.accent.name = 'F1 charcoal trim'; m.glass.color.setHex(0x3e555d); m.glass.opacity = .37;
  m.carbon.color.setHex(0x171b1e); m.seat.color.setHex(0x34373b);
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...MCLAREN_F1_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key,
    damageSpace: { scale: [.9, .80, .93], offset: [0, 0, 0], frontGlassZ: .85, rearGlassZ: -.97 },
  });

  // A wide rounded nose and nearly level shoulders, with a short rounded tail.
  // Unlike a racing wedge, the bonnet stays full across its centre. The cabin
  // opening removes the deck beneath all three seats before the shell is batched.
  sculpt(b, m.paint, [
    [-2.12, .74, .27, .57, .60, .57], [-1.99, .88, .21, .67, .68, .64],
    [-1.65, .97, .19, .72, .73, .68], [-1.30, .995, .18, .75, .75, .69],
    [-.90, .98, .17, .70, .70, .69], [-.35, .94, .16, .65, .65, .68],
    [.35, .93, .16, .64, .64, .67], [.90, .97, .17, .68, .65, .67],
    [1.23, .99, .18, .73, .61, .65], [1.64, .94, .19, .66, .54, .65],
    [1.94, .84, .21, .54, .48, .60], [2.12, .67, .25, .42, .40, .49],
  ], AXLES, .335, .335, { width: .70, y: .48, back: -.94, front: .88 });
  b.box(m.carbon, [1.36, .045, 1.76], [0, .27, -.02], [0, 0, 0], .012);
  buildCabin(b, m);

  // The defining F1 layout: one driver ahead of two rear passenger seats.
  cockpit(vehicle, b, m, [0, -.055, .08], .80, false);
  for (const side of [-1, 1]) {
    const x = side * .405;
    b.box(m.seat, [.34, .085, .38], [x, .385, -.38], [0, 0, 0], .045);
    b.box(m.seat, [.35, .43, .105], [x, .57, -.60], [-.15, 0, 0], .04);
    b.box(m.carbon, [.22, .11, .09], [x, .81, -.64], [0, 0, 0], .025);
    b.box(m.accent, [.025, .32, .01], [x - side * .07, .59, -.535], [-.15, 0, side * -.07], .002);
    b.box(m.carbon, [.055, .07, 1.68], [side * .965, .205, -.04], [0, 0, 0], .018);
    // Small door mirrors on slender stalks, not racing aero devices.
    b.tube(m.carbon, [[side * .66, .73, .65], [side * .77, .78, .65], [side * .84, .80, .62]], .012, 8);
    b.box(m.paint, [.15, .065, .15], [side * .85, .80, .60], [0, side * -.12, 0], .026);
    b.box(m.alloy, [.113, .041, .009], [side * .85, .80, .523], [0, side * -.12, 0], .01);
    // Four round rear lamps sit outside the rear cap, facing rearward.
    for (const x of [.48, .70]) {
      cylinder(b, m.carbon, .083, .045, [side * x, .525, -2.115], [Math.PI / 2, 0, 0], 24);
      cylinder(b, m.brake, .064, .012, [side * x, .525, -2.137], [Math.PI / 2, 0, 0], 24);
      const ring = new THREE.TorusGeometry(.065, .005, 6, 24);
      b.add(ring, m.alloy, [side * x, .525, -2.14]); ring.dispose();
    }
  }
  // Restrained front mouth and thin splitter follow the road car's rounded lip.
  b.box(m.carbon, [1.31, .085, .026], [0, .315, 2.125], [-.08, 0, 0], .025);
  b.box(m.carbon, [1.52, .026, .15], [0, .215, 2.055], [0, 0, 0], .012);
  b.box(m.carbon, [1.32, .17, .018], [0, .435, -2.122], [0, 0, 0], .02);
  b.box(m.plate, [.40, .10, .009], [0, .46, -2.137], [0, 0, 0], .004);
  b.box(m.carbon, [1.48, .035, .24], [0, .20, -1.99], [.06, 0, 0], .01);
  for (const x of [-.55, -.28, .28, .55]) b.box(m.carbon, [.014, .085, .24], [x, .23, -1.98], [.06, 0, 0], 0);
  wheels(vehicle, m, { radius: .335, width: .26, track: .867, axles: AXLES, spokes: 5, roadSmooth: true, broadSpokes: true });
  exhaust(vehicle, b, m, [[-.12, .325, -2.025], [.12, .325, -2.025]], .045);
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// Cross sections of the broad three-seat greenhouse. It narrows into the short
// rear engine deck and curves down into the low front scuttle.
const CABIN = [
  [-1.02, .32, .72, .77], [-.80, .55, .69, .97], [-.46, .66, .66, 1.075],
  [-.12, .70, .65, 1.105], [.23, .69, .65, 1.09], [.57, .62, .65, .97], [.90, .45, .65, .68],
];
function cabinPoint(z, angle, lift = 0) {
  let i = CABIN.findIndex(section => section[0] >= z);
  i = THREE.MathUtils.clamp(i < 0 ? CABIN.length - 1 : i, 1, CABIN.length - 1);
  const a = CABIN[i - 1], c = CABIN[i], t = THREE.MathUtils.clamp((z - a[0]) / (c[0] - a[0]), 0, 1), s = t * t * (3 - 2 * t);
  const width = THREE.MathUtils.lerp(a[1], c[1], s), low = THREE.MathUtils.lerp(a[2], c[2], t), high = THREE.MathUtils.lerp(a[3], c[3], s);
  return [Math.cos(angle) * (width + lift), low + Math.sin(angle) * (high - low + lift), z];
}
function cabinSheet(b, material, back, front, left, right, lift = 0) {
  const positions = [], indices = [], rows = 30, columns = 24;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++)
    positions.push(...cabinPoint(THREE.MathUtils.lerp(back, front, row / rows), THREE.MathUtils.lerp(left, right, col / columns), lift));
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, c = a + columns + 1;
    indices.push(a, c + 1, c, a, a + 1, c + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function buildCabin(b, m) {
  cabinSheet(b, m.glass, -1.02, .90, 0, Math.PI);
  cabinSheet(b, m.paint, -.57, .20, Math.PI * .30, Math.PI * .70, .006);
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 24; i++) sill.push(cabinPoint(-1.02 + i * 1.92 / 24, angle, .007));
    b.tube(m.carbon, sill, .013, 24);
  }
  for (const z of [-.57, .20]) {
    const hoop = []; for (let i = 0; i <= 24; i++) hoop.push(cabinPoint(z, i * Math.PI / 24, .007));
    b.tube(m.paint, hoop, .018, 24);
  }
  // Roof-fed air scoop. The forward dark opening is hollow-looking rather than
  // a black rectangle buried under a body panel; its lip reaches nominal height.
  b.box(m.paint, [.245, .050, .49], [0, 1.112, -.38], [.012, 0, 0], .025);
  b.box(m.carbon, [.185, .033, .014], [0, 1.114, -.131], [0, 0, 0], .009);
  b.tube(m.carbon, [cabinPoint(.80, 1.24, .009), cabinPoint(.63, 1.42, .009), cabinPoint(.54, 1.73, .009)], .007, 8);
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle), ray = new THREE.Raycaster();
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004) => fitSurfacePatch(skins, b, material, corners, axis, side, .58, lift);
  const surfaceY = (x, z) => {
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    return ray.intersectObjects(skins, false)[0]?.point.y;
  };
  for (const side of [-1, 1]) {
    // Two wide dark headlamp wells, each containing two actual optical lenses.
    patch([[side * .37, 1.93], [side * .70, 1.96], [side * .85, 1.70], [side * .79, 1.48], [side * .48, 1.50]], 'top');
    for (const [x, z] of [[.52, 1.78], [.72, 1.73]]) {
      const y = surfaceY(side * x, z);
      if (y === undefined) continue;
      const rotation = [.78, 0, 0], center = [side * x, y + .018, z];
      cylinder(b, m.alloy, .061, .016, center, rotation, 24);
      cylinder(b, m.headlight, .050, .012, [side * x, y + .030, z + .013], rotation, 24);
    }
    // Triangular lower side intake and an inset mesh-like secondary triangle.
    patch([[.27, -.37], [.30, -.91], [.63, -.86]], 'side', side);
    patch([[.30, -.43], [.33, -.84], [.55, -.81]], 'side', side, m.darkAlloy, .009);
    // Door outlines are projected onto the actual curved side, avoiding floating
    // black lines. Their lower corner follows the diagonal intake leading edge.
    for (const points of [
      [[.31, .75], [.30, .28], [.29, -.18], [.28, -.34]],
      [[.28, -.34], [.42, -.54], [.60, -.70]],
      [[.60, -.70], [.64, -.39], [.65, -.05], [.65, .34]],
    ]) {
      const seam = [];
      for (let segment = 0; segment < points.length - 1; segment++) for (let j = 0; j <= 5; j++) {
        const t = j / 5, y = THREE.MathUtils.lerp(points[segment][0], points[segment + 1][0], t), z = THREE.MathUtils.lerp(points[segment][1], points[segment + 1][1], t);
        ray.set(new THREE.Vector3(side * 3, y, z), new THREE.Vector3(-side, 0, 0));
        const hit = ray.intersectObjects(skins, false)[0];
        if (hit && hit.point.x * side > .72) seam.push([hit.point.x + side * .004, y, z]);
      }
      if (seam.length > 1) b.tube(m.carbon, seam, .004, seam.length);
    }
    // Slim rear engine cover louvers, without a wing or a glazed racing deck.
    for (let i = 0; i < 7; i++) {
      const z = -1.14 - i * .105;
      patch([[side * .13, z], [side * .58, z], [side * .58, z - .027], [side * .13, z - .027]], 'top');
    }
  }
  b.finish(vehicle.userData);
}
