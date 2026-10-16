import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Earned car 3 (EARN-CAR-3, docs/EARNED_CARS.md section 4): original editable
// geometry inspired by public photographs of the Bugatti Bolide. No imported
// model, texture, badge or trademark graphic is embedded. Metres; +Z forward.
// Its character: a track car barely a metre tall and very wide, a blue upper
// body over bare carbon, a small cockpit bubble with an air scoop on its roof,
// a fin running back from the scoop to a tall rear wing on swan-neck pylons,
// a central horseshoe-shaped intake in a low nose, X-shaped lamps front and
// rear, and a deep open diffuser. Shared helpers only construct small parts.
export const BOLIDE_VEHICLE_DIMENSIONS = Object.freeze({
  bugatti_bolide: Object.freeze({ width: 2.06, length: 4.82, height: 1.18, wheelRadius: .36 }),
});
const { materials, batch, sculpt, panel, cylinder, cockpit, wheels, exhaust, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.42, -1.33]);

export function createBolideVehicle({ key = 'bugatti_bolide', color = 0x1f4fa8, accent = 0x111316 } = {}) {
  if (!Object.hasOwn(BOLIDE_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Bolide blue body'; m.paint.roughness = .3; m.paint.metalness = .32;
  m.accent.name = 'Bolide black trim'; m.glass.color.setHex(0x1b2428); m.glass.opacity = .6;
  m.carbon.name = 'Bare carbon'; m.carbon.color.setHex(0x15171a); m.carbon.roughness = .38; m.carbon.metalness = .3;
  // Dark titanium wheels, as on the real track car, not bright silver.
  m.alloy.color.setHex(0x55595e); m.alloy.roughness = .34;
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...BOLIDE_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, designFeatures: Object.freeze(['horseshoe-intake', 'cockpit-bubble', 'roof-scoop', 'spine-fin',
      'swan-neck-wing', 'x-lamps', 'carbon-lower-body', 'open-diffuser']),
    damageSpace: { scale: [.92, .78, 1.0], offset: [0, 0, 0], frontGlassZ: .70, rearGlassZ: -.64 },
  });

  // Stations: [z, half width, floor, shoulder, crown, crown half width]. Low
  // everywhere; over the front wheels the shoulders rise either side of a
  // lower central channel, and behind the cockpit the deck climbs high and
  // stays high to a tall, square tail.
  sculpt(b, m.paint, [
    [-2.38, .88, .30, .66, .71, .70], [-2.22, .99, .25, .74, .79, .74],
    [-1.85, 1.02, .21, .80, .84, .66], [-1.33, 1.03, .19, .81, .83, .58],
    [-.85, .99, .18, .73, .80, .50], [-.30, .93, .17, .62, .66, .52],
    [.40, .92, .17, .60, .60, .54], [.95, .98, .17, .72, .50, .46],
    [1.42, 1.02, .17, .81, .44, .40], [1.85, .99, .16, .73, .38, .34],
    [2.20, .88, .16, .50, .36, .28], [2.38, .58, .17, .40, .37, .24],
  ], AXLES, .36, .36, { width: .52, y: .52, back: -.76, front: .82 });
  b.box(m.carbon, [1.10, .05, 1.54], [0, .32, .03], [0, 0, 0], .012);
  buildCanopy(b, m);

  for (const side of [-1, 1]) {
    // Bare carbon lower body: a deep sill and the lower edge of each flank.
    b.box(m.carbon, [.07, .13, 2.02], [side * .965, .25, .04], [0, 0, 0], .025);
    // Mirrors on short carbon stalks at the cockpit's front corners.
    b.tube(m.carbon, [[side * .46, .70, .66], [side * .56, .76, .64], [side * .62, .79, .60]], .01, 8);
    b.box(m.paint, [.09, .045, .11], [side * .64, .80, .55], [0, side * -.12, 0], .02);
    b.box(m.carbon, [.072, .028, .006], [side * .64, .802, .493], [0, side * -.12, 0], .006);
    // Big intakes at the nose corners, under the raised fenders.
    panel(b, m.carbon, side > 0
      ? [[.34, .19, 2.31], [.80, .20, 2.10], [.78, .40, 2.08], [.36, .32, 2.29]]
      : [[-.36, .32, 2.29], [-.78, .40, 2.08], [-.80, .20, 2.10], [-.34, .19, 2.31]]);
    for (let i = 0; i < 3; i++) b.box(m.darkAlloy, [.012, .16, .02], [side * (.46 + i * .11), .29, 2.24 - i * .055], [0, side * -.40, 0], .002);
    // Swan-neck pylons: up from the deck and over to hang the wing from above.
    b.tube(m.carbon, [[side * .34, .80, -1.80], [side * .34, .96, -1.86], [side * .34, 1.10, -1.98], [side * .34, 1.13, -2.08]], .026, 10);
    // Wing end plates.
    b.box(m.carbon, [.02, .19, .40], [side * .90, 1.06, -2.12], [0, 0, 0], .01);
    // Rear lamps either side of the X: a slim bar along the tail's top edge.
    b.box(m.brake, [.24, .02, .02], [side * .52, .63, -2.392], [0, 0, side * .05], .008);
  }
  // The tall rear wing on its pylons, slightly tilted.
  b.box(m.carbon, [1.80, .03, .34], [0, 1.115, -2.12], [-.10, 0, 0], .01);
  b.box(m.carbon, [1.80, .02, .10], [0, 1.15, -2.29], [-.55, 0, 0], .006);

  // The nose: a wide carbon splitter and the central horseshoe intake.
  b.box(m.carbon, [1.62, .04, .20], [0, .175, 2.18], [0, 0, 0], .02);
  panel(b, m.darkAlloy, [[-.10, .19, 2.382], [.10, .19, 2.382], [.10, .30, 2.378], [-.10, .30, 2.378]]);
  {
    const shoe = new THREE.TorusGeometry(.10, .016, 8, 26, Math.PI);
    b.add(shoe, m.alloy, [0, .27, 2.384]); shoe.dispose();
    for (const side of [-1, 1]) b.box(m.alloy, [.03, .08, .03], [side * .10, .23, 2.384], [0, 0, 0], .01);
  }

  // The tail: a dark rear panel with the X-shaped lamp, the plate below it,
  // and a deep diffuser with tall strakes under the bumper.
  b.box(m.carbon, [1.50, .26, .04], [0, .53, -2.37], [0, 0, 0], .02);
  for (const tilt of [-.40, .40]) b.box(m.brake, [.46, .026, .02], [0, .54, -2.395], [0, 0, tilt], .008);
  b.box(m.plate, [.46, .10, .01], [0, .37, -2.386], [0, 0, 0], .004);
  for (let i = -3; i <= 3; i++) b.box(m.carbon, [.022, .17, .34], [i * .2, .27, -2.13], [.14, 0, 0], .002);
  b.box(m.carbon, [1.46, .024, .30], [0, .19, -2.15], [.14, 0, 0], .01);

  // Seated a little inboard and smaller so the helmet stays under the bubble.
  cockpit(vehicle, b, m, [.19, -.075, -.02], .76);
  wheels(vehicle, m, { radius: .36, width: .30, track: .88, axles: AXLES, spokes: 10, roadSmooth: true });
  exhaust(vehicle, b, m, [[-.20, .36, -2.30], [-.08, .36, -2.30], [.08, .36, -2.30], [.20, .36, -2.30]], .045);
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// A small cockpit bubble set mid-car: glass all round a short painted roof,
// [z, half width, base, top].
const canopySections = [
  [-.84, .34, .72, .80], [-.58, .48, .66, .95], [-.22, .54, .62, 1.03],
  [.14, .55, .61, 1.05], [.44, .52, .61, .99], [.68, .44, .61, .83], [.86, .32, .60, .65],
];
function canopyPoint(z, angle, lift = 0) {
  const last = canopySections.length - 1;
  let i = canopySections.findIndex(p => p[0] >= z); if (i <= 0) i = 1; if (z >= canopySections[last][0]) i = last;
  const a = canopySections[i - 1], b = canopySections[i], t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t), width = THREE.MathUtils.lerp(a[1], b[1], smooth), base = THREE.MathUtils.lerp(a[2], b[2], t), top = THREE.MathUtils.lerp(a[3], b[3], smooth);
  return [Math.cos(angle) * (width + lift), base + Math.sin(angle) * (top - base + lift), z];
}
function canopySheet(b, material, start, end, minAngle, maxAngle, lift = 0) {
  const positions = [], indices = [], rows = 30, columns = 22;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++)
    positions.push(...canopyPoint(THREE.MathUtils.lerp(start, end, i / rows), THREE.MathUtils.lerp(minAngle, maxAngle, j / columns), lift));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) { const a = i * (columns + 1) + j, c = a + columns + 1; indices.push(a, c + 1, c, a, a + 1, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function buildCanopy(b, m) {
  canopySheet(b, m.glass, -.84, .86, 0, Math.PI);
  // The painted roof between the side windows.
  canopySheet(b, m.paint, -.58, .20, Math.PI * .24, Math.PI * .76, .007);
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 24; i++) sill.push(canopyPoint(-.84 + 1.70 * i / 24, angle, .01));
    b.tube(m.carbon, sill, .018, 24);
  }
  for (const z of [-.58, .20]) {
    const hoop = []; for (let i = 0; i <= 22; i++) hoop.push(canopyPoint(z, Math.PI * i / 22, .008));
    b.tube(m.carbon, hoop, .015, 22);
  }
  // The roof scoop: a raised intake on the roof's back half, open to the front.
  const [, top] = canopyPoint(-.10, Math.PI / 2, .006);
  b.box(m.paint, [.18, .04, .30], [0, top + .004, -.20], [-.10, 0, 0], .018);
  panel(b, m.darkAlloy, [[-.075, top - .006, -.052], [.075, top - .006, -.052], [.075, top + .02, -.055], [-.075, top + .02, -.055]]);
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004, minSide = .64) => fitSurfacePatch(skins, b, material, corners, axis, side, minSide, lift);
  const ray = new THREE.Raycaster();
  const surfaceY = (x, z) => {
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(skins, false)[0]; return hit ? hit.point.y : null;
  };
  for (const side of [-1, 1]) {
    // Bare carbon on the lower third, the Bolide's two-tone: a band along the
    // bottom of each flank, deeper at the nose and tail.
    patch([[.15, 2.42], [.15, -2.42], [.48, -2.42], [.47, -1.95], [.41, -1.10], [.40, 1.00], [.44, 1.95], [.46, 2.42]], 'side', side, m.carbon, .005, .5);
    // The side channel: a long dark scoop from behind the front wheel to the
    // rear intake, cut into the blue flank above the carbon.
    patch([[.44, .88], [.42, .30], [.45, -.55], [.56, -.92], [.66, -.88], [.58, -.40], [.54, .30], [.56, .86]], 'side', side);
    patch([[.46, .80], [.45, .30], [.48, -.50], [.56, -.82], [.61, -.80], [.54, -.40], [.51, .30], [.53, .78]], 'side', side, m.darkAlloy, .008);
    // Louvres over the front wheels.
    // Headlamps fitted to the nose corners, facing out along the surface: a
    // dark bezel and an X of two slim lit bars.
    ray.set(new THREE.Vector3(side * .64, .35, 5), new THREE.Vector3(0, 0, -1));
    const face = ray.intersectObjects(skins, false)[0];
    if (face) {
      const normal = face.face.normal.clone().transformDirection(face.object.matrixWorld);
      const holder = new THREE.Object3D();
      holder.position.copy(face.point).addScaledVector(normal, .008);
      holder.lookAt(holder.position.clone().add(normal));
      b.box(m.carbon, [.26, .09, .03], holder.position.toArray(), holder.rotation.toArray().slice(0, 3), .02);
      for (const tilt of [-.40, .40]) {
        const bar = holder.clone();
        bar.rotateZ(tilt);
        bar.position.addScaledVector(normal, .018);
        b.box(m.headlight, [.20, .014, .01], bar.position.toArray(), bar.rotation.toArray().slice(0, 3), .004);
      }
    }
  }
  // The nose and tail in bare carbon below the lamps, with open intakes at
  // the nose corners either side of the horseshoe.
  patch([[-1.1, .14], [1.1, .14], [1.1, .30], [-1.1, .30]], 'front', 1, m.carbon, .005, 0);
  for (const side of [-1, 1]) patch([[side * .16, .17], [side * .54, .17], [side * .58, .29], [side * .18, .29]], 'front', 1, m.darkAlloy, .012, 0);
  patch([[-1.1, .14], [1.1, .14], [1.1, .41], [-1.1, .41]], 'front', -1, m.carbon, .005, 0);
  // Dark mesh vents across the back of the deck, behind the wing pylons.
  patch([[-.78, -1.92], [.78, -1.92], [.74, -2.26], [-.74, -2.26]], 'top', 1, m.darkAlloy, .006);
  // The fin: from the roof scoop down the spine of the engine deck to the wing.
  const fin = [];
  for (let i = 0; i <= 10; i++) {
    const z = -.86 - i * .13, y = surfaceY(0, z);
    if (y !== null) fin.push([z, y]);
  }
  for (let i = 0; i < fin.length - 1; i++) {
    const [z0, y0] = fin[i], [z1, y1] = fin[i + 1], h0 = .085 - .05 * i / fin.length, h1 = .085 - .05 * (i + 1) / fin.length;
    const quad = [[0, y0 - .01, z0], [0, y1 - .01, z1], [0, y1 + h1, z1], [0, y0 + h0, z0]];
    panel(b, m.paint, quad); panel(b, m.paint, [...quad].reverse()); // both faces
  }
  // Engine deck vents either side of the fin.
  for (const side of [-1, 1]) patch([[side * .16, -.98], [side * .48, -.98], [side * .46, -1.62], [side * .18, -1.62]], 'top');
  b.finish(vehicle.userData);
}
