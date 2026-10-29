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
  m.accent.name = 'F1 charcoal trim'; m.glass.color.setHex(0x17242a); m.glass.opacity = .82;
  m.glass.roughness = .085; m.glass.metalness = .3;
  m.headlight.color.setHex(0xb6c0bd); m.headlight.emissive.setHex(0x7c928e); m.headlight.emissiveIntensity = .28;
  m.carbon.color.setHex(0x171b1e); m.seat.color.setHex(0x34373b);
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...MCLAREN_F1_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key,
    // The shared projector's side-window centre is canonical y=1.275. Map it
    // to the actual bounded pane at .867 m, below the opaque roof's side rail.
    damageSpace: { scale: [.9, .68, .93], offset: [0, 0, 0], frontGlassZ: .85, rearGlassZ: -.97 },
  });

  // A smooth teardrop: a wide rounded nose over high front wings, a roof that
  // runs back into a tall, full engine deck (the haunches stand higher than the
  // doors), then a short rounded tail. Unlike a racing wedge, the bonnet stays
  // full across its centre. The cabin opening removes the deck beneath all
  // three seats before the shell is batched.
  sculpt(b, m.paint, [
    [-2.12, .78, .30, .62, .66, .60], [-1.99, .90, .22, .74, .73, .64],
    [-1.65, .98, .19, .82, .80, .66], [-1.30, .995, .18, .86, .86, .66],
    [-.90, .98, .17, .78, .80, .66], [-.35, .94, .16, .70, .66, .68],
    [.35, .93, .16, .68, .64, .67], [.90, .98, .17, .76, .68, .66],
    [1.23, 1.0, .18, .82, .74, .62], [1.64, .96, .19, .74, .70, .60],
    [1.94, .88, .21, .62, .60, .54], [2.12, .70, .25, .46, .45, .42],
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
    // Compact mirrors grow from the base of the framed windscreen.
    b.tube(m.carbon, [[side * .60, .71, .74], [side * .69, .75, .72], [side * .75, .765, .69]], .009, 8);
    b.box(m.paint, [.115, .045, .11], [side * .76, .775, .68], [0, side * -.12, 0], .019);
    b.box(m.alloy, [.085, .028, .007], [side * .76, .775, .623], [0, side * -.12, 0], .007);
    // Four round rear lamps sit outside the rear cap, facing rearward.
    for (const x of [.48, .70]) {
      cylinder(b, m.carbon, .083, .045, [side * x, .525, -2.115], [Math.PI / 2, 0, 0], 24);
      cylinder(b, m.brake, .064, .012, [side * x, .525, -2.137], [Math.PI / 2, 0, 0], 24);
      const ring = new THREE.TorusGeometry(.065, .005, 6, 24);
      b.add(ring, m.alloy, [side * x, .525, -2.14]); ring.dispose();
    }
  }
  // Restrained front mouth and thin splitter follow the road car's rounded lip.
  b.box(m.carbon, [1.12, .07, .026], [0, .335, 2.12], [-.08, 0, 0], .03);
  b.box(m.carbon, [1.34, .022, .12], [0, .225, 2.06], [0, 0, 0], .012);
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

// The three-seat cabin is a solid painted roof with four bounded glass panes.
// The old continuous bubble shell is removed: no glazing remains under the roof.
const CABIN = [
  [-1.02, .34, .78, .84], [-.80, .55, .72, .98], [-.46, .66, .66, 1.06],
  [-.12, .70, .65, 1.08], [.23, .69, .65, 1.07], [.57, .62, .65, .97], [.90, .45, .65, .68],
];
const ROOF_EDGE = Math.PI * .18, ROOF_BACK = -.64, ROOF_FRONT = .30;
function cabinPoint(z, angle, lift = 0) {
  let i = CABIN.findIndex(section => section[0] >= z);
  i = THREE.MathUtils.clamp(i < 0 ? CABIN.length - 1 : i, 1, CABIN.length - 1);
  const a = CABIN[i - 1], c = CABIN[i], t = THREE.MathUtils.clamp((z - a[0]) / (c[0] - a[0]), 0, 1), s = t * t * (3 - 2 * t);
  const width = THREE.MathUtils.lerp(a[1], c[1], s), low = THREE.MathUtils.lerp(a[2], c[2], t), high = THREE.MathUtils.lerp(a[3], c[3], s);
  // A flatter crown with rounded shoulders reads as a stamped road-car roof.
  return [Math.cos(angle) * (width + lift), low + Math.pow(Math.sin(angle), .58) * (high - low + lift), z];
}
function cabinSheet(b, material, back, front, left, right, lift = 0) {
  const positions = [], indices = [], rows = 24, columns = 20;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const angle = THREE.MathUtils.lerp(left, right, col / columns);
    const z0 = typeof back === 'function' ? back(angle) : back, z1 = typeof front === 'function' ? front(angle) : front;
    positions.push(...cabinPoint(THREE.MathUtils.lerp(z0, z1, row / rows), angle, lift));
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, c = a + columns + 1;
    indices.push(a, c + 1, c, a, a + 1, c + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function buildCabin(b, m) {
  const edgeShare = angle => Math.min(1, Math.min(angle, Math.PI - angle) / ROOF_EDGE);
  const frontFrame = angle => THREE.MathUtils.lerp(.82, ROOF_FRONT, edgeShare(angle));
  const rearFrame = angle => THREE.MathUtils.lerp(-.90, ROOF_BACK, edgeShare(angle));
  // Each pane ends at its real painted boundary; there is no hidden roof glass.
  cabinSheet(b, m.glass, frontFrame, .90, 0, Math.PI);
  cabinSheet(b, m.glass, -1.02, rearFrame, 0, Math.PI);
  cabinSheet(b, m.glass, rearFrame, frontFrame, 0, ROOF_EDGE);
  cabinSheet(b, m.glass, rearFrame, frontFrame, Math.PI - ROOF_EDGE, Math.PI);
  cabinSheet(b, m.paint, ROOF_BACK, ROOF_FRONT, ROOF_EDGE, Math.PI - ROOF_EDGE, .006);
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 24; i++) sill.push(cabinPoint(-1.02 + i * 1.92 / 24, angle, .007));
    b.tube(m.carbon, sill, .014, 24);
  }
  for (const boundary of [frontFrame, rearFrame]) {
    const frame = []; for (let i = 0; i <= 30; i++) {
      const angle = Math.PI * i / 30;
      frame.push(cabinPoint(boundary(angle), angle, .008));
    }
    b.tube(m.paint, frame, .025, 30);
  }
  for (const angle of [ROOF_EDGE, Math.PI - ROOF_EDGE]) {
    const rail = []; for (let i = 0; i <= 20; i++) rail.push(cabinPoint(THREE.MathUtils.lerp(ROOF_BACK, ROOF_FRONT, i / 20), angle, .009));
    b.tube(m.paint, rail, .021, 20);
  }
  // The centred snorkel stands above the solid roof. Its front opening is on
  // the outside of the shell, not a dark decal under a painted cap.
  sculpt(b, m.paint, [
    [-.60, .055, 1.055, 1.065, 1.075, .045],
    [-.34, .12, 1.05, 1.105, 1.115, .10],
    [.12, .14, 1.05, 1.105, 1.115, .115],
  ], [], 0, 0);
  b.box(m.carbon, [.20, .042, .012], [0, 1.106, .13], [0, 0, 0], .006);
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
    // Small dark corner clusters contain restrained, tinted optical lenses.
    patch([[side * .48, 1.92], [side * .73, 1.90], [side * .82, 1.74], [side * .77, 1.60], [side * .49, 1.65]], 'top');
    for (const [x, z] of [[.52, 1.78], [.72, 1.73]]) {
      const y = surfaceY(side * x, z);
      if (y === undefined) continue;
      const rotation = [.78, 0, 0], center = [side * x, y + .018, z];
      cylinder(b, m.darkAlloy, .046, .016, center, rotation, 24);
      cylinder(b, m.headlight, .029, .010, [side * x, y + .030, z + .013], rotation, 24);
    }
    // Triangular lower side intake and an inset mesh-like secondary triangle.
    patch([[.31, -.48], [.31, -1.04], [.56, -.95]], 'side', side);
    patch([[.34, -.55], [.34, -.97], [.49, -.92]], 'side', side, m.darkAlloy, .009);
    // Door outlines are projected onto the actual curved side, avoiding floating
    // black lines. Their lower corner follows the diagonal intake leading edge.
    for (const points of [
      [[.31, .76], [.45, .80], [.64, .70]],
      [[.31, .76], [.30, .24], [.30, -.48]],
      [[.30, -.48], [.42, -.62], [.64, -.64]],
      [[.64, -.64], [.65, -.20], [.65, .34], [.64, .70]],
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
