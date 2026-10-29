import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Earned car 1 (EARN-CAR-1, docs/EARNED_CARS.md section 4): original editable
// geometry inspired by public photographs of the Ferrari Enzo. No imported
// model, texture, badge or trademark graphic is embedded. Metres; +Z forward.
// Its character: a Formula One beak that drops between two raised front
// fenders, a teardrop canopy set well forward, deep side scoops behind the
// doors, a glass engine cover on a high rear deck, four round tail lamps and a
// short tail with an integrated lip. Shared helpers only construct small parts.
export const ENZO_VEHICLE_DIMENSIONS = Object.freeze({
  ferrari_enzo: Object.freeze({ width: 2.04, length: 4.70, height: 1.15, wheelRadius: .35 }),
});
const { materials, batch, sculpt, panel, cylinder, cockpit, wheels, exhaust, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.30, -1.35]);

export function createEnzoVehicle({ key = 'ferrari_enzo', color = 0xa3121b, accent = 0x15161a } = {}) {
  if (!Object.hasOwn(ENZO_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Enzo red body'; m.paint.roughness = .26; m.paint.metalness = .36;
  m.accent.name = 'Enzo black trim'; m.glass.color.setHex(0x1e2a2e); m.glass.opacity = .62;
  m.carbon.color.setHex(0x16181b); m.carbon.roughness = .42;
  m.darkAlloy.color.setHex(0x9aa1a5); m.darkAlloy.roughness = .3; // the real car's silver twin-spoke wheels; dark intakes use carbon
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...ENZO_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, designFeatures: Object.freeze(['beak-nose', 'raised-front-fenders', 'teardrop-canopy', 'side-scoops', 'glass-engine-cover', 'quad-round-tail-lamps']),
    damageSpace: { scale: [.92, .80, 1.0], offset: [0, 0, 0], frontGlassZ: .92, rearGlassZ: -.98 },
  });

  // Stations: [z, half width, floor, shoulder, crown, crown half width]. The
  // wedge is wide and low: high front fenders crest over the wheels either side
  // of a lower centre line, the beak drops steeply to a broad blunt face, the
  // belt stays near .80 along the doors, and behind the cabin two tall rear
  // haunches stand either side of the engine cover and fall to a short tail.
  sculpt(b, m.paint, [
    [-2.35, .90, .26, .62, .64, .70], [-2.20, .97, .22, .70, .70, .70],
    [-1.85, 1.01, .19, .82, .76, .56], [-1.35, 1.015, .19, .86, .78, .52],
    [-.90, 1.00, .18, .82, .80, .62], [-.30, .98, .17, .74, .78, .66],
    [.40, .97, .17, .72, .78, .68], [.95, .99, .17, .80, .80, .62],
    [1.35, 1.01, .17, .85, .80, .54], [1.80, .99, .17, .78, .70, .46],
    [2.15, .90, .19, .62, .54, .36], [2.35, .74, .22, .52, .48, .28],
  ], AXLES, .35, .35, { width: .60, y: .56, back: -.88, front: .94 });
  b.box(m.carbon, [1.18, .05, 1.62], [0, .33, .02], [0, 0, 0], .012);
  buildCanopy(b, m);

  for (const side of [-1, 1]) {
    // Door mirrors on short stalks, inside the physics footprint.
    b.tube(m.accent, [[side * .60, .80, .66], [side * .72, .84, .66], [side * .82, .88, .61]], .013, 8);
    b.box(m.paint, [.13, .06, .15], [side * .84, .905, .585], [0, side * -.10, 0], .026);
    b.box(m.alloy, [.105, .038, .008], [side * .84, .908, .508], [0, side * -.10, 0], .009);
    // Two big black intakes in the broad nose face, either side of the beak.
    panel(b, m.carbon, side > 0
      ? [[.10, .26, 2.352], [.64, .27, 2.352], [.62, .43, 2.352], [.12, .44, 2.352]]
      : [[-.12, .44, 2.352], [-.62, .43, 2.352], [-.64, .27, 2.352], [-.10, .26, 2.352]]);
    // Four round tail lamps, two each side, with the brake glow behind them.
    for (const x of [.54, .78]) {
      cylinder(b, m.carbon, .118, .05, [side * x, .60, -2.33], [Math.PI / 2, 0, 0], 28);
      const lamp = new THREE.TorusGeometry(.086, .02, 8, 30);
      b.add(lamp, m.brake, [side * x, .60, -2.347]); lamp.dispose();
      cylinder(b, m.brake, .056, .012, [side * x, .60, -2.347], [Math.PI / 2, 0, 0], 22);
    }
    // Rocker panel and the lower door crease.
    b.box(m.carbon, [.07, .06, 2.0], [side * .985, .215, -.05], [0, 0, 0], .018);
  }
  // The beak: a narrow nose with its own splitter and a dark centre intake.
  b.box(m.carbon, [1.62, .04, .20], [0, .185, 2.25], [0, 0, 0], .02);
  // Short tail: integrated lip spoiler, a black rear panel and a deep diffuser.
  b.box(m.paint, [1.50, .06, .16], [0, .815, -2.285], [-.18, 0, 0], .02);
  b.box(m.carbon, [1.40, .20, .04], [0, .46, -2.325], [0, 0, 0], .02);
  for (let i = -3; i <= 3; i++) b.box(m.carbon, [.022, .15, .30], [i * .19, .27, -2.12], [.12, 0, 0], .002);
  b.box(m.carbon, [1.42, .024, .26], [0, .19, -2.14], [.12, 0, 0], .01);
  b.box(m.plate, [.50, .11, .01], [0, .44, -2.348], [0, 0, 0], .004);
  cockpit(vehicle, b, m, [.29, -.045, -.04], .80);
  wheels(vehicle, m, { radius: .35, width: .27, track: .86, axles: AXLES, spokes: 5, roadSmooth: true }); // twin five-spoke, as on the real car
  exhaust(vehicle, b, m, [[-.09, .36, -2.26], [.09, .36, -2.26]], .055);
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// A teardrop canopy set forward: glass all round a small painted roof, the
// roof line flowing back into the engine cover. [z, half width, base, top].
const canopySections = [
  [-.98, .42, .80, .86], [-.70, .58, .76, .99], [-.35, .67, .72, 1.10],
  [0, .70, .70, 1.14], [.35, .69, .70, 1.10], [.65, .62, .72, .98], [.94, .48, .74, .84],
];
function canopyPoint(z, angle, lift = 0) {
  const last = canopySections.length - 1;
  let i = canopySections.findIndex(p => p[0] >= z); if (i <= 0) i = 1; if (z >= canopySections[last][0]) i = last;
  const a = canopySections[i - 1], b = canopySections[i], t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t), width = THREE.MathUtils.lerp(a[1], b[1], smooth), base = THREE.MathUtils.lerp(a[2], b[2], t), top = THREE.MathUtils.lerp(a[3], b[3], smooth);
  return [Math.cos(angle) * (width + lift), base + Math.sin(angle) * (top - base + lift), z];
}
function canopySheet(b, material, start, end, minAngle, maxAngle, lift = 0) {
  const positions = [], indices = [], rows = 32, columns = 22;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++)
    positions.push(...canopyPoint(THREE.MathUtils.lerp(start, end, i / rows), THREE.MathUtils.lerp(minAngle, maxAngle, j / columns), lift));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) { const a = i * (columns + 1) + j, c = a + columns + 1; indices.push(a, c + 1, c, a, a + 1, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function buildCanopy(b, m) {
  canopySheet(b, m.glass, -.98, .94, 0, Math.PI);
  // Painted roof panel between the side glass, as on the real car.
  canopySheet(b, m.paint, -.62, .30, Math.PI * .22, Math.PI * .78, .007);
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 26; i++) sill.push(canopyPoint(-.98 + 1.92 * i / 26, angle, .01));
    b.tube(m.carbon, sill, .018, 26);
  }
  for (const z of [-.62, .30]) {
    const hoop = []; for (let i = 0; i <= 22; i++) hoop.push(canopyPoint(z, Math.PI * i / 22, .008));
    b.tube(m.carbon, hoop, .015, 22);
  }
  b.tube(m.carbon, [canopyPoint(.80, 1.25, .009), canopyPoint(.52, 1.48, .009), canopyPoint(.48, 1.82, .009)], .008, 8);
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const ray = new THREE.Raycaster();
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004) => fitSurfacePatch(skins, b, material, corners, axis, side, .64, lift);
  for (const side of [-1, 1]) {
    // Long dark headlamp recesses in the tops of the front fenders; the lamps themselves are built
    // below as real lenses and a running-light strip inside them, not painted shapes.
    patch([[side * .56, 2.10], [side * .74, 2.04], [side * .90, 1.62], [side * .88, 1.38], [side * .74, 1.40], [side * .62, 1.80]], 'top');
    // The side scoops: a deep dark intake behind each door, swept up at the back.
    patch([[.46, -.84], [.44, -.92], [.46, -1.08], [.74, -1.10], [.80, -.92], [.68, -.84]], 'side', side);
    patch([[.48, -.88], [.47, -.95], [.49, -1.04], [.70, -1.06], [.74, -.94], [.65, -.88]], 'side', side, m.carbon, .008);
    // Door outline and sill line, projected onto the curved flank.
    for (const points of [[[.26, .26], [.52, .28], [.74, .24]], [[.26, -.80], [.50, -.82], [.72, -.84]], [[.25, .26], [.25, -.30], [.25, -.80]]]) {
      const seam = [];
      for (let segment = 0; segment < points.length - 1; segment++) for (let j = 0; j <= 5; j++) {
        const t = j / 5, y = THREE.MathUtils.lerp(points[segment][0], points[segment + 1][0], t), z = THREE.MathUtils.lerp(points[segment][1], points[segment + 1][1], t);
        ray.set(new THREE.Vector3(side * 3, y, z), new THREE.Vector3(-side, 0, 0));
        const hit = ray.intersectObjects(skins, false)[0];
        if (hit && hit.point.x * side > .7) seam.push([hit.point.x + side * .004, y, z]);
      }
      if (seam.length > 1) b.tube(m.carbon, seam, .0045, seam.length);
    }
    // Bonnet vents either side of the beak.
    patch([[side * .16, 1.62], [side * .34, 1.60], [side * .32, 1.20], [side * .17, 1.24]], 'top');
  }
  // The glass engine cover over the high rear deck, with a dark frame.
  patch([[-.46, -1.06], [.46, -1.06], [.40, -1.96], [-.40, -1.96]], 'top');
  patch([[-.38, -1.14], [.38, -1.14], [.33, -1.88], [-.33, -1.88]], 'top', 1, m.glass, .011);
  // Engine cover louvres either side, fitted to the curved deck.
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const z = -1.16 - i * .12, x = side * .66;
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(skins, false)[0];
    if (hit) b.box(m.carbon, [.18, .016, .045], [x, hit.point.y + .012, z], [.08, 0, 0], .004);
  }
  const surfaceY = (x, z) => {
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(skins, false)[0]; return hit ? hit.point.y : null;
  };
  for (const side of [-1, 1]) {
    // Headlamps: two round projector lenses in a dark bezel, sitting in the recess and facing forward,
    // with a slim running-light strip along the recess's outer edge.
    for (const [x, z] of [[.71, 1.96], [.79, 1.74]]) {
      const y = surfaceY(side * x, z); if (y === null) continue;
      // Facing straight forward and sunk into the recess: a dark tinted lens with a thin lit ring.
      cylinder(b, m.carbon, .062, .06, [side * x, y - .012, z], [Math.PI / 2, 0, 0], 20);
      cylinder(b, m.glass, .05, .012, [side * x, y - .012, z + .031], [Math.PI / 2, 0, 0], 20);
      const ring = new THREE.TorusGeometry(.046, .006, 6, 24);
      b.add(ring, m.headlight, [side * x, y - .012, z + .036]); ring.dispose();
    }
    const strip = [];
    for (let i = 0; i <= 8; i++) {
      const z = 2.0 - i * .065, x = side * (.74 + .12 * i / 8), y = surfaceY(x, z);
      if (y !== null) strip.push([x, y + .016, z]);
    }
    if (strip.length > 1) b.tube(m.headlight, strip, .0085, strip.length);
    // A waist line: a crease along the doors from the front arch to the scoop, fitted to the side.
    const crease = [];
    for (let i = 0; i <= 16; i++) {
      const z = 1.0 - i * .08, y = .50 + .03 * (i / 16);
      ray.set(new THREE.Vector3(side * 3, y, z), new THREE.Vector3(-side, 0, 0));
      const hit = ray.intersectObjects(skins, false)[0];
      if (hit && hit.point.x * side > .7) crease.push(hit.point.clone().addScaledVector(hit.face.normal, .006).toArray());
    }
    if (crease.length > 1) b.tube(m.carbon, crease, .0055, crease.length);
  }
  b.finish(vehicle.userData);
}
