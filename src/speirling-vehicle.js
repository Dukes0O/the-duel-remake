import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// The McMurtry Spéirling (LAB-FAN-ART, docs/LAB.md section 6): original editable
// geometry built from the real car's public photographs (supplied by Kyle) as a
// viewing reference only. No imported model, texture, badge or maker graphic is
// embedded (the maker's name lives in the config, as for the other real cars).
// Metres; +Z forward. A very low, wide fan car like a small Le Mans prototype:
// a narrow central bubble canopy of brown-tinted clear glass, set down in a low
// tub between two tall sculpted front fenders (a deep channel on each side of the
// canopy, a small light on each fender tip), a wide flat black nose intake with a
// bat-wing top edge and a white light strip at each outer corner, big muscular
// rear haunches with a dark intake behind each door and, between them, a tall dark
// central spine with a mesh grille either side of it (the fans hide behind), mirrors
// on thin stalks, a large black wing on two swan-neck mounts over a black diffuser,
// big dark multi-spoke slicks with their lower halves showing, and a black skirt
// tucked inside the floor edge.
// Metallic blue-grey over a black lower body, with a little track grime low down.
export const SPEIRLING_VEHICLE_DIMENSIONS = Object.freeze({
  mcmurtry_speirling: Object.freeze({ width: 1.64, length: 3.47, height: 1.24, wheelRadius: .33 }),
});
const { materials, batch, panel, cockpit, wheels, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.04, -1.06]);
const TRACK = .58, WHEEL_WIDTH = .27, AXLE_Y = .33;
const GRILLE_X = .27, GRILLE_Y = .37, GRILLE_W = .24, GRILLE_H = .26, TAIL_Z = -1.65;   // the two mesh grilles either side of the spine
const HAUNCH = { sx: .20, sy: .62, sz: .60 };                                        // the rear haunches

// The central tub. Stations: [z, half width, floor, shoulder, rim height, rim half width].
// Low and narrow between the fenders; the nose is a wide flat low front; the tail swells.
export const SPEIRLING_SECTIONS = [
  [-1.65, .42, .17, .36, .44, .30], [-1.35, .44, .15, .38, .46, .32],
  [-.85, .42, .13, .42, .50, .32], [-.25, .40, .12, .46, .54, .32],
  [.30, .38, .12, .44, .50, .30], [.85, .42, .12, .40, .46, .32],
  [1.25, .48, .12, .34, .40, .36], [1.52, .52, .13, .30, .35, .40],
  [1.65, .50, .14, .27, .31, .40],
];

export function createSpeirlingVehicle({ key = 'mcmurtry_speirling', color = 0x5b6e82, accent = 0xf1f3f5 } = {}) {
  if (!Object.hasOwn(SPEIRLING_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  // Metallic blue-grey paint, black lower body, clear brown-tinted glass, dark wheels.
  m.paint.name = 'Speirling blue-grey body'; m.paint.roughness = .38; m.paint.metalness = .55; m.paint.clearcoat = .5; m.paint.clearcoatRoughness = .25;
  m.glass.color.setHex(0x5a4630); m.glass.opacity = .30; m.glass.roughness = .06;
  m.carbon.name = 'Black bodywork'; m.carbon.color.setHex(0x0f1113); m.carbon.roughness = .55; m.carbon.metalness = .2;
  m.alloy.color.setHex(0x3b4046); m.alloy.metalness = .6; m.alloy.roughness = .4;
  m.darkAlloy.color.setHex(0x121316);
  m.skirt = new THREE.MeshStandardMaterial({ name: 'Rubber skirt', color: 0x0a0b0c, roughness: .96 });
  m.grime = m.skirt;                                                      // track grime shares the skirt's rubber (one draw less)
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SPEIRLING_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, fans: [],
    designFeatures: Object.freeze(['low-wide-stance', 'bubble-canopy', 'tall-front-fenders', 'bat-wing-intake', 'rear-haunch-intakes', 'central-spine', 'rear-mesh-grilles', 'swan-neck-wing', 'floor-skirt']),
    damageSpace: { scale: [.9, .66, 1.0], offset: [0, 0, 0], frontGlassZ: .55, rearGlassZ: -.18 },
  });

  tub(b, m);
  canopy(b, m);
  for (const side of [-1, 1]) {
    pod(b, m, side * (TRACK + .02), AXLES[0], { sx: .19, sy: .57, sz: .62, zc: AXLES[0] + .02 });      // the tall front fenders
    pod(b, m, side * (TRACK + .02), AXLES[1], { ...HAUNCH, zc: AXLES[1] });       // the muscular rear haunches
  }
  frontEnd(b, m);
  rearEnd(vehicle, b, m);
  skirt(b, m);

  // The driver sits low and central in the bubble.
  cockpit(vehicle, b, m, [0, -.07, .12], .70, false);
  wheels(vehicle, m, { radius: .33, width: WHEEL_WIDTH, track: TRACK, axles: AXLES, spokes: 6, roadSmooth: true, broadSpokes: true });
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// The tub: a smooth loft through the stations, closed at both ends, with the cockpit
// opened in its top so the seat and driver show through the canopy's glass.
function smoothShell(sections, step = .06, ring = 32) {
  const at = (column, z) => {
    let i = sections.findIndex(row => row[0] >= z); if (i < 1) i = 1;
    const tangent = k => {
      if (k === 0 || k === sections.length - 1) return 0;
      const a = (sections[k][column] - sections[k - 1][column]) / (sections[k][0] - sections[k - 1][0]), c = (sections[k + 1][column] - sections[k][column]) / (sections[k + 1][0] - sections[k][0]);
      return a * c <= 0 ? 0 : 2 * a * c / (a + c);
    };
    const p0 = sections[i - 1], p1 = sections[i], h = p1[0] - p0[0], t = THREE.MathUtils.clamp((z - p0[0]) / h, 0, 1), t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p0[column] + (t3 - 2 * t2 + t) * h * tangent(i - 1) + (-2 * t3 + 3 * t2) * p1[column] + (t3 - t2) * h * tangent(i);
  };
  const zs = []; for (let z = sections[0][0]; z < sections.at(-1)[0] - 1e-6; z += step) zs.push(z); zs.push(sections.at(-1)[0]);
  const positions = [], indices = [], power = (v, n) => Math.sign(v) * Math.pow(Math.abs(v), 2 / n);
  for (const z of zs) {
    const hw = at(1, z), floor = at(2, z), shoulder = at(3, z), crown = Math.max(at(4, z), shoulder + .02);
    for (let j = 0; j < ring; j++) {
      const a = j / ring * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a);
      const upper = s2 >= 0, n = upper ? 3.2 : 7;
      positions.push(power(c, n) * hw, upper ? shoulder + (crown - shoulder) * power(s2, n) : shoulder - (shoulder - floor) * -power(s2, n), z);
    }
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b2 = i * ring + (j + 1) % ring, c = a + ring, d = b2 + ring;
    indices.push(a, b2, c, b2, d, c);
  }
  const cap = (k, forward) => {
    const centre = positions.length / 3; let cy = 0; for (let j = 0; j < ring; j++) cy += positions[(k * ring + j) * 3 + 1];
    positions.push(0, cy / ring, positions[(k * ring) * 3 + 2]);
    for (let j = 0; j < ring; j++) { const a = k * ring + j, b2 = k * ring + (j + 1) % ring; if (forward) indices.push(centre, b2, a); else indices.push(centre, a, b2); }
  };
  cap(0, true); cap(zs.length - 1, false);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}
const cockpitOpening = (x, y, z) => Math.abs(x) < .30 && y > .44 && z > -.48 && z < 1.02;
function tub(b, m) {
  const shell = smoothShell(SPEIRLING_SECTIONS), p = shell.attributes.position, index = shell.index, kept = [];
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (ids.every(k => cockpitOpening(p.getX(k), p.getY(k), p.getZ(k)))) continue;
    kept.push(...ids);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', p.clone()); g.setIndex(kept); g.computeVertexNormals();
  b.add(g, m.paint); g.dispose(); shell.dispose();
  b.box(m.carbon, [.60, .04, 1.5], [0, .13, .28], [0, 0, 0], 0);          // the cockpit floor, so the tub reads as a tub
  b.box(m.carbon, [.34, .22, .36], [0, .24, -.55], [0, 0, 0], 0);         // the seat back's bulkhead
}

// The canopy: a narrow central bubble of clear brown-tinted glass with a thin dark frame,
// sitting down in the tub; its sides run down to the tub's sill line.
// [z, half width, base, top].
const canopySections = [
  [-.44, .15, .46, .76], [-.22, .23, .46, .92], [.10, .27, .46, 1.00],
  [.45, .26, .46, .95], [.76, .20, .46, .83], [1.00, .12, .46, .66],
];
function canopyPoint(z, angle, lift = 0) {
  const last = canopySections.length - 1;
  let i = canopySections.findIndex(p => p[0] >= z); if (i <= 0) i = 1; if (z >= canopySections[last][0]) i = last;
  const a = canopySections[i - 1], c = canopySections[i], t = THREE.MathUtils.clamp((z - a[0]) / (c[0] - a[0]), 0, 1);
  const smooth = t * t * (3 - 2 * t), width = THREE.MathUtils.lerp(a[1], c[1], smooth), base = THREE.MathUtils.lerp(a[2], c[2], t), top = THREE.MathUtils.lerp(a[3], c[3], smooth);
  return [Math.cos(angle) * (width + lift), base + Math.sin(angle) * (top - base + lift), z];
}
function canopy(b, m) {
  const positions = [], indices = [], rows = 26, columns = 20;
  for (let i = 0; i <= rows; i++) for (let j = 0; j <= columns; j++) positions.push(...canopyPoint(THREE.MathUtils.lerp(-.44, 1.0, i / rows), Math.PI * j / columns));
  for (let i = 0; i < rows; i++) for (let j = 0; j < columns; j++) { const a = i * (columns + 1) + j, c = a + columns + 1; indices.push(a, c + 1, c, a, a + 1, c + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals(); b.add(g, m.glass); g.dispose();
  for (const angle of [0, Math.PI]) {
    const sill = []; for (let i = 0; i <= 22; i++) sill.push(canopyPoint(-.44 + 1.44 * i / 22, angle, .008));
    b.tube(m.carbon, sill, .011, 22);
  }
  for (const z of [-.30, .12, .62]) { const hoop = []; for (let i = 0; i <= 18; i++) hoop.push(canopyPoint(z, Math.PI * i / 18, .006)); b.tube(m.carbon, hoop, .008, 18); }
}

// A fender or haunch over the top half of a wheel: half an ellipsoid with its rim at the
// axle's height, so the wheel's lower half shows below it.
function pod(b, m, x, z, { sx, sy, sz, zc }) {
  const g = new THREE.SphereGeometry(1, 26, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(g, m.paint, [x, AXLE_Y, zc ?? z], [0, 0, 0], [sx, sy, sz]); g.dispose();
}

// The nose: a wide flat low black intake across the whole front with a bat-wing (shallow
// W) top edge, fine vertical slats, and a thin white light strip at each outer corner;
// a small light on the tip of each front fender and mirrors on thin stalks.
function frontEnd(b, m) {
  const W = [[-.50, .12], [.50, .12], [.50, .25], [.34, .20], [.17, .26], [0, .19], [-.17, .26], [-.34, .20], [-.50, .25]];
  const shape = new THREE.Shape(W.map(([x, y]) => new THREE.Vector2(x, y)));
  const intake = new THREE.ExtrudeGeometry(shape, { depth: .03, bevelEnabled: false });
  b.add(intake, m.carbon, [0, 0, 1.64]); intake.dispose();
  for (let i = -7; i <= 7; i++) b.box(m.darkAlloy, [.008, .09, .01], [i * .062, .17, 1.678], [0, 0, 0], 0);
  b.box(m.carbon, [.56, .02, .12], [0, .105, 1.57], [0, 0, 0], 0);                                   // the shallow splitter
  for (const side of [-1, 1]) {
    b.box(m.headlight, [.022, .14, .014], [side * .55, .21, 1.665], [0, side * .15, 0], 0);          // the white corner strip
    b.box(m.headlight, [.05, .05, .02], [side * (TRACK + .02), .50, AXLES[0] + .02 + .62 - .015], [0, 0, 0], 0);   // the light on the fender tip
    b.tube(m.carbon, [[side * .60, .80, .92], [side * .70, .86, .80], [side * .76, .88, .70]], .008, 8);            // mirror stalk
    b.box(m.carbon, [.075, .045, .04], [side * .78, .885, .66], [0, side * .3, 0], 0);
  }
}

// The rear: behind the cabin the body splits into two tall rounded haunches over the wheels
// with deep tunnels either side of a narrow central spine. The spine is a tall dark pod
// down the middle of the tail, tapering to a point with a red diamond light low at its tip,
// a small blank panel near its top, and a thin fin running back to the wing. Either side
// of it a large rectangular black mesh grille (the fan and radiator exhaust), set deep, with
// the fans behind it (nodes of their own so a viewer can spin them). Two round red ring lights
// one above the other on each haunch's rear face; under it all a black diffuser with vertical
// strakes and a small plate panel; a wide black wing on two swan-neck mounts from the
// haunch tops, standing above the tail.
const SPINE_SECTIONS = [
  [-1.66, .03, .30, .38, .50, .02], [-1.56, .09, .28, .42, .58, .05], [-1.25, .15, .26, .46, .70, .09],
  [-.85, .16, .26, .50, .74, .10], [-.50, .11, .30, .52, .70, .07],
];
function rearEnd(vehicle, b, m) {
  // The spine.
  const shell = smoothShell(SPINE_SECTIONS, .08, 20);
  b.add(shell, m.carbon); shell.dispose();
  b.box(m.plate, [.085, .045, .012], [0, .64, -1.20], [-.42, 0, 0], 0);                          // a small blank panel near the top
  const diamond = new THREE.BoxGeometry(.075, .075, .014); b.add(diamond, m.brake, [0, .33, -1.675], [0, 0, Math.PI / 4]); diamond.dispose();   // the red diamond at the point
  // The thin central fin from the canopy's top back to the wing.
  const fin = [[-.40, .76], [-.9, .88], [-1.3, 1.0], [-1.55, 1.08]], base = [[-.40, .72], [-.9, .76], [-1.3, .66], [-1.55, .58]];
  for (let k = 0; k < fin.length - 1; k++) {
    const quad = [[0, base[k][1], fin[k][0]], [0, base[k + 1][1], fin[k + 1][0]], [0, fin[k + 1][1], fin[k + 1][0]], [0, fin[k][1], fin[k][0]]];
    panel(b, m.carbon, quad); panel(b, m.carbon, [...quad].reverse());
  }
  for (const side of [-1, 1]) {
    const x = side * GRILLE_X;
    // The grille: a black frame round a recessed dark mesh with fine horizontal and vertical bars.
    for (const [w, h, dx, dy] of [[GRILLE_W + .03, .018, 0, GRILLE_H / 2], [GRILLE_W + .03, .018, 0, -GRILLE_H / 2], [.018, GRILLE_H, GRILLE_W / 2, 0], [.018, GRILLE_H, -GRILLE_W / 2, 0]]) b.box(m.carbon, [w, h, .04], [x + dx, GRILLE_Y + dy, TAIL_Z - .012], [0, 0, 0], 0);
    b.box(m.darkAlloy, [GRILLE_W, GRILLE_H, .01], [x, GRILLE_Y, TAIL_Z - .002], [0, 0, 0], 0);
    for (let i = 1; i < 6; i++) b.box(m.carbon, [GRILLE_W, .006, .008], [x, GRILLE_Y - GRILLE_H / 2 + i * GRILLE_H / 6, TAIL_Z - .008], [0, 0, 0], 0);
    for (let i = 1; i < 5; i++) b.box(m.carbon, [.006, GRILLE_H, .008], [x - GRILLE_W / 2 + i * GRILLE_W / 5, GRILLE_Y, TAIL_Z - .008], [0, 0, 0], 0);
    // The fan, inside the tail behind its grille , and a nitro plume through the grille.
    const fan = new THREE.Group(); fan.name = `Fan ${side > 0 ? 'left' : 'right'}`; fan.position.set(x, GRILLE_Y, TAIL_Z + .16);
    const fb = batch(fan);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; fb.box(m.carbon, [.06, .13, .01], [Math.sin(a) * .09, Math.cos(a) * .09, 0], [0, 0, -a], 0); }
    fb.box(m.carbon, [.07, .07, .05], [0, 0, 0], [0, 0, 0], 0);
    fb.finish();
    vehicle.add(fan); vehicle.userData.fans.push(fan);
    const material = new THREE.MeshBasicMaterial({ name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.12, .8, 14).rotateX(-Math.PI / 2).translate(0, 0, -.4), material);
    flame.name = 'Nitro exhaust flame'; flame.position.set(x, GRILLE_Y, TAIL_Z - .02); flame.visible = false;
    vehicle.add(flame); vehicle.userData.boostFlames.push(flame);
    // Two round red ring lights, one above the other, on the haunch's rear face (tilted with the surface).
    for (const [y, tilt] of [[.50, .28], [.74, .70]]) {
      const hx = side * (TRACK + .02), dz = (y - AXLE_Y) / HAUNCH.sy, zc = AXLES[1] - HAUNCH.sz * Math.sqrt(Math.max(0, 1 - dz * dz));
      const ring = new THREE.TorusGeometry(.042, .012, 8, 22); b.add(ring, m.brake, [hx, y, zc - .004], [-tilt, 0, 0]); ring.dispose();
    }
    // A swan-neck mount from the haunch top up and over, and an end plate.
    b.tube(m.carbon, [[side * (TRACK + .02), .93, -1.06], [side * (TRACK + .02), 1.06, -1.30], [side * (TRACK + .02), 1.19, -1.52], [side * (TRACK + .02), 1.19, -1.62]], .022, 12);
    b.box(m.carbon, [.02, .17, .34], [side * .76, 1.13, -1.60], [0, 0, 0], 0);
  }
  b.box(m.carbon, [1.52, .028, .32], [0, 1.18, -1.60], [-.07, 0, 0], 0);                        // the wide black wing
  b.box(m.carbon, [1.52, .02, .1], [0, 1.21, -1.74], [-.5, 0, 0], 0);                           // its flap
  b.box(m.carbon, [1.0, .20, .05], [0, .22, TAIL_Z + .02], [0, 0, 0], 0);                       // the diffuser face
  for (let i = -4; i <= 4; i++) b.box(m.carbon, [.02, .15, .30], [i * .115, .21, TAIL_Z + .16], [.14, 0, 0], 0);   // its vertical strakes
  b.box(m.plate, [.22, .05, .008], [0, .12, TAIL_Z - .006], [0, 0, 0], 0);                      // the plate panel at the bottom centre
}

// A black skirt along the floor edge, tucked inside the outline, almost touching the road.
function skirt(b, m) {
  for (const side of [-1, 1]) b.box(m.skirt, [.03, .10, 2.7], [side * .405, .08, -.05], [0, 0, 0], 0);
  b.box(m.skirt, [.80, .10, .03], [0, .08, 1.45], [0, 0, 0], 0);
  b.box(m.skirt, [.84, .10, .03], [0, .08, -1.55], [0, 0, 0], 0);
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004, minSide = .2) => fitSurfacePatch(skins, b, material, corners, axis, side, minSide, lift);
  for (const side of [-1, 1]) {
    // The black lower body: a deep band down each side of the tub and round the pods' lower rims.
    patch([[.10, 1.68], [.10, -1.68], [.27, -1.68], [.27, 1.68]], 'side', side, m.carbon, .005);
    // The large dark intake in each rear haunch, behind the door: a tall scoop with a deep shadow.
    patch([[.30, -.52], [.62, -.60], [.62, -.98], [.30, -1.0]], 'side', side, m.carbon, .006, .3);
    // A light dusting of track grime low down.
    patch([[.10, 1.5], [.10, -1.5], [.18, -1.5], [.22, -1.0], [.17, -.4], [.22, .3], [.18, .9], [.22, 1.5]], 'side', side, m.grime, .008, .2);
  }
  // Fine black vents over the rear deck behind the canopy.
  patch([[-.26, -.58], [.26, -.58], [.30, -1.05], [-.30, -1.05]], 'top', 1, m.carbon, .006, 0);
  b.finish(vehicle.userData);
}
