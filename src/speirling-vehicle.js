import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// The McMurtry Spéirling (LAB-FAN-ART, docs/LAB.md section 6): original editable
// geometry built from what is publicly visible of the real car. No imported
// model, texture, badge or maker graphic is embedded (the maker's name lives in
// the config, as for the other real cars). Metres; +Z forward. A tiny single-seat
// electric fan car, about 3.2 m long and very wide for it: a short body with a
// raised nose and a small front wing, a closed glass canopy over one central
// seat with a roll hoop behind it, a skirt all round the floor edge that seals
// the low pressure under the car, and two big round fan housings at the rear
// that suck the air out from under the floor. Slick tyres on open wheels.
export const SPEIRLING_VEHICLE_DIMENSIONS = Object.freeze({
  mcmurtry_speirling: Object.freeze({ width: 2.08, length: 3.34, height: 1.05, wheelRadius: .33 }),
});
const { materials, batch, sculpt, cockpit, wheels, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.08, -1.10]);
const FAN_X = .46, FAN_Y = .66, FAN_Z = -1.30;                  // the two fan housings' axes

export function createSpeirlingVehicle({ key = 'mcmurtry_speirling', color = 0xe6e4dc, accent = 0xe2631c } = {}) {
  if (!Object.hasOwn(SPEIRLING_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Speirling pearl body'; m.paint.roughness = .32; m.paint.metalness = .18; m.paint.clearcoat = .7;
  m.accent.name = 'Speirling orange trim'; m.glass.color.setHex(0x1a2226); m.glass.opacity = .55;
  m.carbon.name = 'Bare carbon'; m.carbon.color.setHex(0x14171a); m.carbon.roughness = .4; m.carbon.metalness = .28;
  m.skirt = new THREE.MeshStandardMaterial({ name: 'Rubber skirt', color: 0x0e1011, roughness: .95 });
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SPEIRLING_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, fans: [],
    designFeatures: Object.freeze(['closed-canopy', 'roll-hoop', 'twin-rear-fans', 'floor-skirt', 'raised-nose', 'front-wing', 'slick-tyres']),
    damageSpace: { scale: [.90, .60, 1.0], offset: [0, 0, 0], frontGlassZ: .72, rearGlassZ: -.50 },
  });

  // Stations: [z, half width, floor, shoulder, crown, crown half width]. Short
  // and wide: the nose lifts clear of the splitter, the cockpit sits low between
  // the wheels, and the deck swells over the fans at the back.
  sculpt(b, m.paint, [
    [-1.52, .70, .22, .56, .62, .46], [-1.34, .84, .20, .66, .72, .56],
    [-.95, .94, .17, .66, .70, .52], [-.40, .93, .15, .56, .58, .44],
    [.20, .91, .15, .52, .52, .40], [.70, .92, .15, .54, .54, .40],
    [1.08, .93, .16, .62, .60, .44], [1.34, .84, .19, .64, .64, .42],
    [1.52, .66, .23, .56, .62, .32], [1.66, .44, .28, .46, .56, .20],
  ], AXLES, .33, .33, { width: .46, y: .44, back: -.60, front: .98 });
  b.box(m.carbon, [1.30, .05, 2.5], [0, .13, -.02], [0, 0, 0], .012);          // the flat floor between the skirts
  canopy(b, m);
  skirt(b, m);
  rearFans(vehicle, b, m);
  frontEnd(b, m);

  // The driver sits low and central under the canopy.
  cockpit(vehicle, b, m, [0, -.10, .08], .74, false);
  wheels(vehicle, m, { radius: .33, width: .34, track: .87, axles: AXLES, spokes: 10, roadSmooth: true });
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// The canopy: a closed glass bubble over the seat, a painted roof strip, slim sills.
// [z, half width, base, top].
const canopySections = [
  [-.62, .26, .58, .76], [-.34, .40, .55, .93], [.06, .46, .53, 1.00],
  [.44, .44, .53, .95], [.74, .36, .53, .80], [.96, .24, .55, .64],
];
function canopyPoint(z, angle, lift = 0) {
  const last = canopySections.length - 1;
  let i = canopySections.findIndex(p => p[0] >= z); if (i <= 0) i = 1; if (z >= canopySections[last][0]) i = last;
  const a = canopySections[i - 1], c = canopySections[i], t = THREE.MathUtils.clamp((z - a[0]) / (c[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t), width = THREE.MathUtils.lerp(a[1], c[1], smooth), base = THREE.MathUtils.lerp(a[2], c[2], t), top = THREE.MathUtils.lerp(a[3], c[3], smooth);
  return [Math.cos(angle) * (width + lift), base + Math.sin(angle) * (top - base + lift), z];
}
function canopySheet(b, material, start, end, minAngle, maxAngle, lift = 0) {
  const positions = [], indices = [], rows = 28, columns = 22;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++)
    positions.push(...canopyPoint(THREE.MathUtils.lerp(start, end, i / rows), THREE.MathUtils.lerp(minAngle, maxAngle, j / columns), lift));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) { const a = i * (columns + 1) + j, c = a + columns + 1; indices.push(a, c + 1, c, a, a + 1, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function canopy(b, m) {
  canopySheet(b, m.glass, -.62, .96, 0, Math.PI);
  canopySheet(b, m.paint, -.52, .02, Math.PI * .30, Math.PI * .70, .008);           // the roof strip
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 22; i++) sill.push(canopyPoint(-.62 + 1.58 * i / 22, angle, .012));
    b.tube(m.carbon, sill, .018, 22);
  }
  for (const z of [-.52, .80]) {                                                 // the frame hoops
    const hoop = []; for (let i = 0; i <= 20; i++) hoop.push(canopyPoint(z, Math.PI * i / 20, .01));
    b.tube(m.carbon, hoop, .009, 20);
  }
  // The roll hoop: two tubes up from the deck behind the driver, meeting over the seat's back.
  for (const side of [-1, 1]) b.tube(m.carbon, [[side * .30, .60, -.64], [side * .27, .86, -.70], [side * .12, 1.00, -.78], [0, 1.03, -.82]], .016, 12);
  b.box(m.accent, [.10, .03, .30], [0, 1.02, -.88], [-.08, 0, 0], .01);               // the airbox behind the hoop
}

// The skirt: a flexible rubber curtain round the whole floor edge, a little proud
// of the sills, with a fringe of tabs, and the straight ends across nose and tail.
function skirt(b, m) {
  for (const side of [-1, 1]) {
    b.box(m.skirt, [.035, .085, 2.82], [side * .955, .105, -.02], [0, 0, 0], 0);
    b.box(m.carbon, [.06, .035, 2.7], [side * .93, .16, -.02], [0, 0, 0], 0);
  }
  b.box(m.skirt, [1.82, .08, .035], [0, .105, 1.42], [0, 0, 0], 0);
  b.box(m.skirt, [1.58, .08, .035], [0, .10, -1.50], [0, 0, 0], 0);
}

// Two big round fan housings at the rear: a tapered shroud, a round outlet ring, and
// the fan itself (a hub with ten blades) in its own group so a viewer can spin it.
function rearFans(vehicle, b, m) {
  for (const side of [-1, 1]) {
    const x = side * FAN_X;
    const shroud = new THREE.CylinderGeometry(.31, .35, .58, 28, 1, true).rotateX(Math.PI / 2);
    b.add(shroud, m.paint, [x, FAN_Y, FAN_Z - .02]); shroud.dispose();
    const inner = new THREE.CylinderGeometry(.285, .325, .56, 28, 1, true).rotateX(Math.PI / 2).scale(-1, 1, 1);
    b.add(inner, m.carbon, [x, FAN_Y, FAN_Z - .02]); inner.dispose();
    const lip = new THREE.TorusGeometry(.31, .026, 8, 32);
    b.add(lip, m.accent, [x, FAN_Y, -1.585]); lip.dispose();                                  // the orange outlet ring
    const intake = new THREE.TorusGeometry(.35, .024, 8, 32);
    b.add(intake, m.carbon, [x, FAN_Y, -1.02]); intake.dispose();
    for (let i = 0; i < 8; i++) {                                                                // the guard grille behind the blades
      const a = i * Math.PI / 4; b.box(m.carbon, [.010, .60, .010], [x, FAN_Y, -1.575], [0, 0, a], 0);
    }
    // The fan: ten blades and a hub, a group of its own at the housing's axis.
    const fan = new THREE.Group(); fan.name = `Fan ${side > 0 ? 'left' : 'right'}`; fan.position.set(x, FAN_Y, FAN_Z);
    const fb = batch(fan);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; fb.box(m.carbon, [.10, .24, .012], [Math.sin(a) * .17, Math.cos(a) * .17, 0], [0, 0, -a], 0); }
    fb.box(m.alloy, [.10, .10, .08], [0, 0, 0], [0, 0, 0], .02);
    fb.finish();
    vehicle.add(fan); vehicle.userData.fans.push(fan);
    // The nitro flame: a cool blue plume from each outlet.
    const material = new THREE.MeshBasicMaterial({ name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.16, .8, 14).rotateX(-Math.PI / 2).translate(0, 0, -.4), material);
    flame.name = 'Nitro exhaust flame'; flame.position.set(x, FAN_Y, -1.60); flame.visible = false;
    vehicle.add(flame); vehicle.userData.boostFlames.push(flame);
  }
  // Tail: a dark panel between the fan outlets with the brake light bar and the plate.
  b.box(m.carbon, [.34, .30, .04], [0, .55, -1.55], [0, 0, 0], .02);
  b.box(m.brake, [.28, .03, .02], [0, .62, -1.575], [0, 0, 0], .01);
  b.box(m.brake, [.28, .03, .02], [0, .50, -1.575], [0, 0, 0], .01);
  b.box(m.plate, [.30, .08, .01], [0, .40, -1.572], [0, 0, 0], .004);
  for (let i = -3; i <= 3; i++) b.box(m.carbon, [.02, .14, .30], [i * .17, .24, -1.38], [.14, 0, 0], 0);   // the diffuser strakes
}

// The short high nose: a front wing with end plates, a splitter, slim lamp slits.
function frontEnd(b, m) {
  b.box(m.carbon, [1.74, .04, .34], [0, .19, 1.53], [0, 0, 0], .02);
  b.box(m.accent, [1.74, .018, .12], [0, .215, 1.64], [-.06, 0, 0], .008);
  for (const side of [-1, 1]) {
    b.box(m.carbon, [.025, .20, .46], [side * .88, .26, 1.50], [0, 0, 0], .01);
    b.box(m.headlight, [.20, .02, .02], [side * .36, .52, 1.57], [0, side * .35, 0], .006);
    b.tube(m.carbon, [[side * .45, .60, .86], [side * .56, .66, .84], [side * .62, .68, .80]], .01, 8);
    b.box(m.paint, [.08, .045, .10], [side * .64, .68, .78], [0, side * -.12, 0], .02);
  }
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004, minSide = .6) => fitSurfacePatch(skins, b, material, corners, axis, side, minSide, lift);
  for (const side of [-1, 1]) {
    // A dark carbon band down the lower flank, and the orange stripe above it.
    patch([[.17, 1.58], [.17, -1.55], [.30, -1.55], [.32, -1.0], [.29, 1.0], [.31, 1.58]], 'side', side, m.carbon, .005, .5);
    patch([[.40, 1.0], [.40, -.95], [.43, -.95], [.43, 1.0]], 'side', side, m.accent, .006, .5);
    // Side intakes for the cooling, behind each front wheel.
    patch([[.30, -.30], [.46, -.30], [.46, -.72], [.30, -.72]], 'side', side, m.carbon, .008, .5);
  }
  // A long orange centre stripe over the nose and cowl.
  patch([[-.05, 1.55], [.05, 1.55], [.05, .90], [-.05, .90]], 'top', 1, m.accent, .005);
  // Vents over the fan intakes and a dark panel on the deck between them.
  patch([[-.28, -.62], [.28, -.62], [.28, -.95], [-.28, -.95]], 'top', 1, m.carbon, .006);
  b.finish(vehicle.userData);
}
