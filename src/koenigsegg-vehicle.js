import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// Original editable geometry inspired by the manufacturer's Jesko Absolut
// photographs. No imported model, texture or trademark graphic is embedded.
// Metres; +Z forward. The elongated tail and twin fins are authored here, not
// a paint preset of an existing car. Shared helpers only construct small parts.
export const KOENIGSEGG_VEHICLE_DIMENSIONS = Object.freeze({
  koenigsegg_jesko: Object.freeze({ width: 2.10, length: 4.95, height: 1.25, wheelRadius: .36 }),
});
const { materials, batch, sculpt, panel, cylinder, cockpit, wheels, exhaust, fitSurfacePatch } = originalVehicleParts;

export function createKoenigseggVehicle({ key = 'koenigsegg_jesko', color = 0xe4e8e5, accent = 0x26ccb0 } = {}) {
  if (!Object.hasOwn(KOENIGSEGG_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  m.paint.name = 'Jesko pearl body'; m.paint.roughness = .24; m.paint.metalness = .48;
  m.accent.name = 'Jesko teal inlay'; m.glass.color.setHex(0x233e43); m.glass.opacity = .64;
  m.carbon.color.setHex(0x111b21); m.carbon.roughness = .37;
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...KOENIGSEGG_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, designFeatures: Object.freeze(['long-tail', 'twin-vertical-fins', 'wraparound-canopy', 'rear-aero-discs']),
    damageSpace: { scale: [.90, .78, 1.04], offset: [0, 0, 0], frontGlassZ: .57, rearGlassZ: -.94 },
  });

  // Wide shoulders, deep waist and a low elongated tail. Open wheel arches and
  // a cut-out beneath the transparent canopy prevent the body crossing a driver.
  sculpt(b, m.paint, [
    [-2.45, .77, .26, .56, .63, .62], [-2.13, .94, .23, .66, .70, .72],
    [-1.72, 1.015, .20, .80, .86, .80], [-1.29, 1.02, .19, .82, .87, .81],
    [-.78, .935, .18, .70, .79, .70], [-.10, .90, .18, .65, .76, .64],
    [.63, .95, .18, .68, .78, .69], [1.38, 1.02, .19, .79, .83, .79],
    [1.84, .95, .21, .67, .74, .74], [2.20, .87, .24, .50, .57, .65],
    [2.45, .69, .25, .40, .45, .51],
  ], [1.42, -1.31], .36, .36, { width: .60, y: .55, back: -1.16, front: .66 });
  b.box(m.carbon, [1.20, .05, 1.58], [0, .34, -.19], [0, 0, 0], .012);
  buildCanopy(b, m);

  // The Absolut has no horizontal high wing. Two thin swept fins rise from
  // the tail shoulders, leaving the tapered rear deck and engine visible.
  for (const side of [-1, 1]) {
    fin(b, m.carbon, side);
    b.tube(m.accent, [[side * .65, .715, -2.32], [side * .66, 1.075, -1.65], [side * .66, .94, -1.34]], .012, 12);
    b.box(m.carbon, [.07, .055, 2.10], [side * .971, .218, -.14], [0, 0, 0], .017);
    b.tube(m.accent, [[side * .98, .251, .79], [side * .993, .242, -.36], [side * .93, .262, -1.11]], .011, 12);
    // Small swept stalk mirrors stay inside the physics footprint.
    b.tube(m.carbon, [[side * .64, .91, .46], [side * .82, .91, .47], [side * .95, .94, .39]], .016, 8);
    b.box(m.paint, [.18, .075, .20], [side * .95, .965, .36], [0, side * -.12, 0], .032);
    b.box(m.alloy, [.145, .048, .009], [side * .95, .969, .259], [0, side * -.12, 0], .012);
    // Recessed headlamp cluster and separate three-strip running lights.
    const head = [[side * .67, .59, 2.19], [side * .87, .67, 1.95], [side * .79, .744, 1.64], [side * .61, .715, 1.79]];
    panel(b, m.carbon, side > 0 ? head.reverse() : head);
    b.tube(m.headlight, [[side * .657, .609, 2.16], [side * .807, .677, 1.96], [side * .735, .734, 1.75]], .013, 12);
    for (let i = 0; i < 3; i++) b.box(m.headlight, [.071, .018, .040], [side * (.688 + i * .031), .706 + i * .009, 1.845 + i * .037], [-.18, side * .30, 0], .004);
    // Tail lamps are a long narrow outline, with visible light depth beneath.
    b.box(m.carbon, [.69, .11, .045], [side * .46, .563, -2.434], [0, side * -.06, 0], .037);
    b.tube(m.brake, [[side * .14, .598, -2.463], [side * .55, .596, -2.452], [side * .755, .560, -2.423], [side * .52, .538, -2.46], [side * .17, .540, -2.466]], .012, 24);
    b.box(m.plate, [.065, .019, .009], [side * .28, .565, -2.469], [0, 0, 0], .003);
  }
  // Splitter, central intake, raised nose crease, and a deep rear diffuser.
  b.box(m.carbon, [1.79, .040, .30], [0, .195, 2.27], [0, 0, 0], .023);
  b.tube(m.accent, [[-.84, .225, 2.25], [-.68, .221, 2.44], [0, .220, 2.466], [.68, .221, 2.44], [.84, .225, 2.25]], .008, 24);
  b.box(m.carbon, [1.28, .14, .037], [0, .341, 2.446], [-.13, 0, 0], .038);
  for (const x of [-.52, -.36, -.20, .20, .36, .52]) b.box(m.darkAlloy, [.013, .097, .012], [x, .347, 2.468], [0, 0, 0], .002);
  b.box(m.paint, [.070, .13, .045], [0, .342, 2.438], [-.15, 0, 0], .012);
  b.box(m.carbon, [1.42, .10, .045], [0, .421, -2.412], [.1, 0, 0], .020);
  for (let i = -3; i <= 3; i++) b.box(m.carbon, [.025, .143, .43], [i * .21, .260, -2.208], [.13, 0, 0], .002);
  b.box(m.carbon, [1.43, .024, .33], [0, .179, -2.246], [.12, 0, 0], .010);
  // Engine cover and louvers are fitted after batching, so their actual surface
  // stays visible above the curved rear deck instead of being buried inside it.
  cockpit(vehicle, b, m, [.285, .06, -.18], .83);
  wheels(vehicle, m, { radius: .36, width: .28, track: .90, axles: [1.42, -1.31], spokes: 5, roadSmooth: true, broadSpokes: true });
  rearAeroDiscs(vehicle, m);
  exhaust(vehicle, b, m, [[-.105, .385, -2.338], [.105, .385, -2.338]], .063);
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// Continuously curved side glass surrounds a small painted roof. This is not
// the square four-panel cabin used by the classic road cars.
const canopySections = [
  [-1.30, .39, .79, .86], [-.98, .57, .80, 1.055], [-.60, .64, .80, 1.207],
  [-.18, .65, .80, 1.245], [.17, .61, .80, 1.215], [.48, .52, .785, 1.04], [.83, .37, .76, .793],
];
function canopyPoint(z, angle, lift = 0) {
  const last = canopySections.length - 1;
  let i = canopySections.findIndex(p => p[0] >= z); if (i <= 0) i = 1; if (z >= canopySections[last][0]) i = last;
  const a = canopySections[i - 1], b = canopySections[i], t = THREE.MathUtils.clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t), width = THREE.MathUtils.lerp(a[1], b[1], smooth), base = THREE.MathUtils.lerp(a[2], b[2], t), top = THREE.MathUtils.lerp(a[3], b[3], smooth);
  return [Math.cos(angle) * (width + lift), base + Math.sin(angle) * (top - base + lift), z];
}
function canopySheet(b, material, start, end, minAngle, maxAngle, lift = 0) {
  const positions = [], indices = [], rows = 36, columns = 24;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) positions.push(...canopyPoint(THREE.MathUtils.lerp(start, end, i / rows), THREE.MathUtils.lerp(minAngle, maxAngle, j / columns), lift));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) { const a = i * (columns + 1) + j, c = a + columns + 1; indices.push(a, c + 1, c, a, a + 1, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); b.add(g, material); g.dispose();
}
function buildCanopy(b, m) {
  canopySheet(b, m.glass, -1.30, .83, 0, Math.PI);
  canopySheet(b, m.carbon, -.69, .24, Math.PI * .20, Math.PI * .80, .008);
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 28; i++) sill.push(canopyPoint(-1.3 + 2.13 * i / 28, angle, .01));
    b.tube(m.carbon, sill, .019, 28);
  }
  for (const z of [-.63, .19]) {
    const hoop = []; for (let i = 0; i <= 24; i++) hoop.push(canopyPoint(z, Math.PI * i / 24, .008));
    b.tube(m.carbon, hoop, .016, 24);
  }
  // Wiper follows the curved front windshield, below the roof outline.
  b.tube(m.carbon, [canopyPoint(.70, 1.20, .009), canopyPoint(.34, 1.46, .009), canopyPoint(.30, 1.83, .009)], .008, 8);
}

function fin(b, material, side) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape([
    new THREE.Vector2(-2.34, .685), new THREE.Vector2(-1.72, 1.08),
    new THREE.Vector2(-1.54, 1.10), new THREE.Vector2(-1.32, .875), new THREE.Vector2(-1.61, .784),
  ]), { depth: .020, bevelEnabled: false });
  // Shape x is vehicle z; shape y is world y. Keep outward-facing normals.
  g.rotateY(-Math.PI / 2); b.add(g, material, [side * .66 + .010, 0, 0]); g.dispose();
}

function rearAeroDiscs(vehicle, m) {
  for (const pivot of vehicle.userData.wheelPivots.filter(p => !p.userData.front)) {
    const side = Math.sign(pivot.position.x), spin = pivot.children[0], b = batch(spin), x = side * .129;
    cylinder(b, m.carbon, .236, .014, [x, 0, 0], [0, 0, Math.PI / 2], 48);
    const ring = new THREE.TorusGeometry(.211, .007, 6, 48).rotateY(Math.PI / 2);
    b.add(ring, m.accent, [x + side * .009, 0, 0]); ring.dispose();
    cylinder(b, m.alloy, .052, .017, [x + side * .016, 0, 0], [0, 0, Math.PI / 2], 16);
    for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5; b.box(m.darkAlloy, [.014, .068, .022], [x + side * .010, Math.cos(a) * .11, Math.sin(a) * .11], [a, 0, 0], .004); }
    b.finish();
  }
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004) => fitSurfacePatch(skins, b, material, corners, axis, side, .64, lift);
  for (const side of [-1, 1]) {
    patch([[side * .60, 2.13], [side * .82, 2.06], [side * .90, 1.89], [side * .81, 1.59], [side * .65, 1.72]], 'top');
    patch([[side * .64, 2.11], [side * .81, 2.02], [side * .85, 1.89], [side * .78, 1.70], [side * .765, 1.735], [side * .818, 1.89], [side * .788, 1.995], [side * .633, 2.09]], 'top', 1, m.headlight, .011);
    // Carbon teardrop intakes curve up into the rear shoulders rather than
    // reading as the prototype's rectangular sidepods.
    patch([[.28, -.71], [.32, -.30], [.43, .35], [.58, .51], [.65, .37], [.60, -.12], [.59, -.77], [.68, -1.02], [.53, -.94]], 'side', side);
    patch([[.31, -.72], [.35, -.27], [.47, .33], [.49, .35], [.39, -.31], [.35, -.74]], 'side', side, m.accent, .008);
    patch([[side * .50, .81], [side * .60, 1.02], [side * .68, 1.59], [side * .62, 1.83], [side * .57, 1.55]], 'top');
    patch([[side * .51, -1.10], [side * .59, -1.02], [side * .69, -1.69], [side * .64, -2.16], [side * .55, -1.96]], 'top');
    patch([[side * .030, .82], [side * .045, .82], [side * .061, 2.23], [side * .046, 2.24]], 'top', 1, m.accent);
    // Door seam rays stay fitted to the sculpted skin as they sweep around the
    // prominent intake. No floating outline at oblique showroom angles.
    fittedSeam(b, m.carbon, skins, [[.68, .65], [.55, .52], [.31, .20], [.26, -.55], [.44, -.86], [.64, -.93]], side);
  }
  patch([[-.43, -1.17], [.43, -1.17], [.34, -2.10], [-.34, -2.10]], 'top');
  patch([[-.33, -1.27], [.33, -1.27], [.25, -1.96], [-.25, -1.96]], 'top', 1, m.glass, .011);
  patch([[-.73, .255], [.73, .255], [.71, .507], [-.71, .507]], 'front', -1);
  const ray = new THREE.Raycaster();
  for (const side of [-1, 1]) for (let i = 0; i < 7; i++) {
    const z = -1.32 - i * .092, x = side * .45;
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0));
    const hit = ray.intersectObjects(skins, false)[0];
    if (hit) b.box(m.carbon, [.20, .017, .039], [x, hit.point.y + .014, z], [.10, 0, 0], .004);
    const engineX = side * .14, engineZ = -1.34 - i * .077;
    ray.set(new THREE.Vector3(engineX, 3, engineZ), new THREE.Vector3(0, -1, 0));
    const engineHit = ray.intersectObjects(skins, false)[0];
    if (engineHit) b.box(m.darkAlloy, [.14, .013, .022], [engineX, engineHit.point.y + .020, engineZ], [.10, 0, 0], .003);
  }
  for (const side of [-1, 1]) b.tube(m.accent, [canopyPoint(-.64, Math.PI * (.5 + side * .022), .019), canopyPoint(-.18, Math.PI * (.5 + side * .022), .019), canopyPoint(.19, Math.PI * (.5 + side * .022), .019)], .005, 18);
  b.finish(vehicle.userData);
}

function fittedSeam(b, material, skins, corners, side) {
  const ray = new THREE.Raycaster(), points = [];
  for (let j = 1; j < corners.length; j++) for (let i = 0; i <= 6; i++) {
    const y = THREE.MathUtils.lerp(corners[j - 1][0], corners[j][0], i / 6), z = THREE.MathUtils.lerp(corners[j - 1][1], corners[j][1], i / 6);
    ray.set(new THREE.Vector3(side * 3, y, z), new THREE.Vector3(-side, 0, 0));
    const hit = ray.intersectObjects(skins, false)[0];
    if (hit && hit.point.x * side > .65) points.push(hit.point.addScaledVector(hit.face.normal, .009).toArray());
  }
  if (points.length > 1) b.tube(material, points, .0045, points.length);
}
