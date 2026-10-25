import * as THREE from 'three';
import { originalVehicleParts } from './unlock-vehicles.js';
import { prepareVehicleDamage } from './vehicles.js';

// The McMurtry Spéirling (LAB-FAN-ART, docs/LAB.md section 6): original editable
// geometry built from what is publicly known of the real car. No imported model,
// texture, badge or maker graphic is embedded (the maker's name lives in the
// config, as for the other real cars). Metres; +Z forward. A tiny closed
// single-seat coupe: a smooth teardrop in side view with a low short nose and a
// small splitter, a dark tinted canopy blended into the body like a fighter jet's
// (the roof peaks over the driver's head), and a cut-off vertical tail whose face
// holds two round fan exits side by side. The fans themselves are hidden inside.
// A black skirt runs all round the floor, almost touching the ground, which is
// what lets the fans pull the car down. Black wheels on slick tyres, their top
// halves covered by pods on the body, no exposed suspension. Matte charcoal with a
// thin green line along the side.
export const SPEIRLING_VEHICLE_DIMENSIONS = Object.freeze({
  mcmurtry_speirling: Object.freeze({ width: 1.48, length: 3.36, height: 1.21, wheelRadius: .33 }),
});
const { materials, batch, cockpit, wheels, fitSurfacePatch } = originalVehicleParts;
const AXLES = Object.freeze([1.02, -1.04]);
const TRACK = .54, WHEEL_WIDTH = .27;
const EXIT_X = .245, EXIT_Y = .38, TAIL_Z = -1.60;               // the two round fan exits on the tail's face

// Stations: [z, half width, floor, shoulder, crown, crown half width]. A teardrop:
// the roof peaks over the driver's head at z = .1 and sweeps down to the tail.
export const SPEIRLING_SECTIONS = [
  [-1.60, .50, .17, .56, .70, .36], [-1.40, .53, .15, .58, .78, .38],
  [-.95, .52, .13, .56, .94, .40], [-.40, .54, .12, .54, 1.10, .38],
  [.10, .53, .12, .52, 1.19, .34], [.55, .52, .12, .50, 1.04, .32],
  [1.00, .49, .12, .45, .76, .32], [1.30, .45, .12, .40, .58, .30],
  [1.50, .38, .13, .35, .48, .26], [1.62, .27, .14, .30, .40, .20],
  [1.68, .15, .15, .26, .33, .12],
];

export function createSpeirlingVehicle({ key = 'mcmurtry_speirling', color = 0x3d4144, accent = 0x35c46a } = {}) {
  if (!Object.hasOwn(SPEIRLING_VEHICLE_DIMENSIONS, key)) return null;
  const vehicle = new THREE.Group(); vehicle.name = key;
  const m = materials(color, accent), data = vehicle.userData, b = batch(vehicle);
  // Matte charcoal, a thin green accent, black wheels, a nearly opaque dark canopy.
  m.paint.name = 'Speirling charcoal body'; m.paint.roughness = .74; m.paint.metalness = .08; m.paint.clearcoat = 0;
  m.accent.name = 'Speirling green line'; m.accent.roughness = .5; m.accent.clearcoat = 0;
  m.glass.color.setHex(0x05080a); m.glass.opacity = .93; m.glass.roughness = .3; m.glass.metalness = 0; m.glass.clearcoat = 0; m.glass.side = THREE.FrontSide;
  m.carbon.name = 'Bare carbon'; m.carbon.color.setHex(0x121417); m.carbon.roughness = .5; m.carbon.metalness = .22;
  m.alloy.color.setHex(0x1c1e20); m.alloy.metalness = .5; m.alloy.roughness = .5;
  m.darkAlloy.color.setHex(0x111214);
  m.skirt = new THREE.MeshStandardMaterial({ name: 'Rubber skirt', color: 0x0a0b0c, roughness: .96 });
  m.grime = m.skirt;                                                    // road grime shares the skirt's rubber (one draw less)
  Object.assign(data, {
    paint: m.paint, originalColor: m.paint.color.clone(), wheels: [], wheelPivots: [],
    brakeLights: [], boostFlames: [], damageMeshes: [], size: { ...SPEIRLING_VEHICLE_DIMENSIONS[key] },
    ultimateKey: key, fans: [],
    designFeatures: Object.freeze(['teardrop-coupe', 'jet-canopy', 'twin-round-fan-exits', 'floor-skirt', 'wheel-pods', 'low-nose', 'cut-off-tail']),
    damageSpace: { scale: [.9, .80, 1.0], offset: [0, 0, 0], frontGlassZ: .50, rearGlassZ: -.18 },
  });

  teardrop(b, m);
  skirt(b, m);
  tail(vehicle, b, m);
  for (const z of AXLES) for (const side of [-1, 1]) pod(b, m, side * TRACK, z);
  frontEnd(b, m);

  // The driver sits low and central under the canopy, barely visible through the tint.
  cockpit(vehicle, b, m, [0, .02, .10], .76, false);
  wheels(vehicle, m, { radius: .33, width: WHEEL_WIDTH, track: TRACK, axles: AXLES, spokes: 8, roadSmooth: true, broadSpokes: true });
  b.finish(data);
  fittedDetails(vehicle, m);
  prepareVehicleDamage(vehicle);
  vehicle.updateMatrixWorld(true);
  return vehicle;
}

// The shell, with a conservative opening under the canopy (every triangle whose
// three corners lie inside it is dropped), and the canopy itself: dark glass fitted
// over the same surface, clipped to a jet-fighter outline, so glass and body are
// one smooth shape and the driver shows only faintly through the tint.
const opening = (y, z) => z > -.40 && z < .92 && y > .76 + .55 * Math.pow((z - .25) / .75, 2);
const CANOPY_TOP = [[0, .98], [.15, .88], [.26, .62], [.31, .2], [.29, -.15], [.2, -.36], [0, -.43], [-.2, -.36], [-.29, -.15], [-.31, .2], [-.26, .62], [-.15, .88]];
const CANOPY_SIDE = [[.74, .78], [.72, .3], [.72, -.1], [.78, -.32], [.98, -.4], [1.1, -.3], [1.17, -.1], [1.15, .3], [1.0, .62], [.86, .84]];
// The body shell: a smooth loft through the stations with a 48-point cross-section,
// rounded at the top and squarer at the floor, widest at the shoulder, so there are
// no facets where the nose meets the sides or over the roof. Closed at both ends.
function smoothShell(sections, step = .06, ring = 32) {
  // Shape-preserving cubic interpolation of one column of the stations at z.
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
      const upper = s2 >= 0, n = upper ? 2.5 : 7;
      positions.push(power(c, n) * hw, upper ? shoulder + (crown - shoulder) * power(s2, n) : shoulder - (shoulder - floor) * -power(s2, n), z);
    }
  }
  for (let i = 0; i < zs.length - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b2 = i * ring + (j + 1) % ring, c = a + ring, d = b2 + ring;
    indices.push(a, b2, c, b2, d, c);
  }
  // The two ends: a fan from a centre point to each ring.
  const cap = (k, forward) => {
    const centre = positions.length / 3; let cy = 0; for (let j = 0; j < ring; j++) cy += positions[(k * ring + j) * 3 + 1];
    positions.push(0, cy / ring, positions[(k * ring) * 3 + 2]);
    for (let j = 0; j < ring; j++) { const a = k * ring + j, b2 = k * ring + (j + 1) % ring; if (forward) indices.push(centre, b2, a); else indices.push(centre, a, b2); }
  };
  cap(0, true); cap(zs.length - 1, false);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
  return g;
}

function teardrop(b, m) {
  const shell = smoothShell(SPEIRLING_SECTIONS), p = shell.attributes.position, index = shell.index, kept = [];
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    if (ids.every(k => opening(p.getY(k), p.getZ(k)))) continue;
    kept.push(...ids);
  }
  const paint = new THREE.BufferGeometry(); paint.setAttribute('position', p.clone()); paint.setIndex(kept); paint.computeVertexNormals();
  b.add(paint, m.paint); paint.dispose();
  const surface = [{ geometry: shell }];
  fitSurfacePatch(surface, b, m.glass, CANOPY_TOP, 'top', 1, .0, .006);
  for (const side of [-1, 1]) fitSurfacePatch(surface, b, m.glass, CANOPY_SIDE, 'side', side, .0, .006);
  b.box(m.carbon, [.74, .04, 1.4], [0, .14, .2], [0, 0, 0], 0);       // a dark liner so the tub reads as a cockpit
  shell.dispose();
}

// A flexible black skirt all round the floor edge, almost touching the road, tucked
// inside the body's outline so it shows as a dark band low down, never a plank.
function skirt(b, m) {
  for (const side of [-1, 1]) b.box(m.skirt, [.03, .10, 2.86], [side * .475, .08, -.07], [0, 0, 0], 0);
  b.box(m.skirt, [.84, .10, .03], [0, .08, 1.32], [0, 0, 0], 0);
  b.box(m.skirt, [.90, .10, .03], [0, .08, -1.46], [0, 0, 0], 0);
}

// The tail: a vertical face under a small rear lip with two round fan exits side by
// side (0.4 m each), dark with fine grilles; the fans sit inside, behind them. A
// brake light bar across the face and a plate low down. The fans are nodes of their
// own so a viewer can spin them; each exit also gets a nitro plume.
function tail(vehicle, b, m) {
  b.box(m.paint, [1.0, .03, .09], [0, .715, TAIL_Z - .03], [0, 0, 0], 0);                // the rear lip
  b.box(m.carbon, [.92, .012, .04], [0, .70, TAIL_Z - .065], [-.15, 0, 0], 0);
  for (const side of [-1, 1]) {
    const x = side * EXIT_X;
    const ring = new THREE.TorusGeometry(.205, .016, 8, 32); b.add(ring, m.carbon, [x, EXIT_Y, TAIL_Z - .003]); ring.dispose();
    const dark = new THREE.CircleGeometry(.20, 32); b.add(dark, m.darkAlloy, [x, EXIT_Y, TAIL_Z - .004], [0, Math.PI, 0]); dark.dispose();
    for (const r of [.07, .13, .19]) { const g = new THREE.TorusGeometry(r, .0035, 4, 28); b.add(g, m.carbon, [x, EXIT_Y, TAIL_Z - .012]); g.dispose(); }
    for (let i = 0; i < 8; i++) b.box(m.carbon, [.006, .38, .008], [x, EXIT_Y, TAIL_Z - .012], [0, 0, i * Math.PI / 8], 0);
    // The fan, inside the body behind its exit: ten blades and a hub (a node of its own).
    const fan = new THREE.Group(); fan.name = `Fan ${side > 0 ? 'left' : 'right'}`; fan.position.set(x, EXIT_Y, TAIL_Z + .16);
    const fb = batch(fan);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; fb.box(m.carbon, [.07, .15, .01], [Math.sin(a) * .11, Math.cos(a) * .11, 0], [0, 0, -a], 0); }
    fb.box(m.carbon, [.08, .08, .06], [0, 0, 0], [0, 0, 0], 0);
    fb.finish();
    vehicle.add(fan); vehicle.userData.fans.push(fan);
    const material = new THREE.MeshBasicMaterial({ name: 'Nitro flame', color: 0x82d9ff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.14, .8, 14).rotateX(-Math.PI / 2).translate(0, 0, -.4), material);
    flame.name = 'Nitro exhaust flame'; flame.position.set(x, EXIT_Y, TAIL_Z - .02); flame.visible = false;
    vehicle.add(flame); vehicle.userData.boostFlames.push(flame);
  }
  b.box(m.brake, [.84, .028, .014], [0, .63, TAIL_Z - .016], [0, 0, 0], 0);                  // the brake light bar
  b.box(m.plate, [.28, .07, .008], [0, .21, TAIL_Z - .006], [0, 0, 0], 0);
  b.box(m.carbon, [.9, .04, .05], [0, .19, TAIL_Z - .03], [0, 0, 0], 0);                     // a thin diffuser edge
}

// A fender over the top half of a wheel, growing out of the body: a rounded shell
// swept round the axle (curved in plan and in section), its outer face about flush
// with the tyre and its outer lip turning in toward the wheel, tapering into the
// sill at both ends. The wheel's lower half shows below it; no suspension is visible.
function pod(b, m, x, z) {
  const side = Math.sign(x), R = .365, half = WHEEL_WIDTH / 2 + .035;
  // Profile (radius, axial): from inside the body, over the crown, down the outer face and in under the lip.
  const profile = [[R - .015, -.20], [R + .03, -.17], [R + .075, -.11], [R + .092, -.04], [R + .09, .04], [R + .07, .10], [R + .035, .145], [R, half], [R - .055, half + .005], [R - .062, half - .03]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(profile, 26, Math.PI - .25, Math.PI + .5);
  // The ends fold down into the sill: pull the shell toward the lip's radius at both ends.
  const pos = g.attributes.position, tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    const phi = Math.atan2(tmp.x, tmp.z), rel = ((phi - (Math.PI - .25)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / (Math.PI + .5);
    const end = Math.min(rel, 1 - rel), k = THREE.MathUtils.smoothstep(end, 0, .22);
    const r = Math.hypot(tmp.x, tmp.z), target = R - .03 + (r - (R - .03)) * k;
    pos.setXYZ(i, tmp.x * target / r, tmp.y, tmp.z * target / r);
  }
  g.computeVertexNormals();
  g.rotateZ(-Math.PI / 2);
  if (side < 0) g.rotateY(Math.PI);
  b.add(g, m.paint, [x + side * .01, .33, z]); g.dispose();
}

// A shallow black splitter under the nose only (no green on it) and slim lamp slits.
function frontEnd(b, m) {
  b.box(m.carbon, [.50, .02, .10], [0, .108, 1.56], [0, 0, 0], 0);
  for (const side of [-1, 1]) b.box(m.plate, [.16, .014, .01], [side * .17, .31, 1.64], [0, side * .45, 0], 0);
}

function fittedDetails(vehicle, m) {
  vehicle.updateMatrixWorld(true);
  const skins = vehicle.userData.damageMeshes.filter(({ mesh }) => mesh.material === m.paint).map(({ mesh }) => mesh), b = batch(vehicle);
  const patch = (corners, axis, side = 1, material = m.carbon, lift = .004, minSide = .4) => fitSurfacePatch(skins, b, material, corners, axis, side, minSide, lift);
  for (const side of [-1, 1]) {
    // The thin green line along each flank, a little above the floor, and a dark intake behind the canopy.
    patch([[.43, .62], [.43, -.62], [.452, -.62], [.452, .62]], 'side', side, m.accent, .004);
    patch([[.60, -.55], [.74, -.55], [.74, -.95], [.60, -.95]], 'side', side, m.carbon, .006);
    // Road grime low on the flanks: a ragged band and a few splashes.
    patch([[.17, 1.55], [.17, -1.55], [.26, -1.55], [.30, -1.2], [.25, -.8], [.30, -.3], [.24, .2], [.29, .7], [.24, 1.2], [.28, 1.55]], 'side', side, m.grime, .007);
    for (const [y, z, r] of [[.36, -.9, .05], [.34, -.2, .04], [.39, .5, .045], [.33, 1.0, .05]]) patch(Array.from({ length: 8 }, (_, i) => [y + Math.sin(i * .785) * r, z + Math.cos(i * .785) * r * 1.6]), 'side', side, m.grime, .008);
  }
  // Grime splashed up the nose.
  patch([[-.45, .15], [.45, .15], [.4, .26], [.15, .30], [-.1, .25], [-.4, .29]], 'front', 1, m.grime, .006, 0);
  b.finish(vehicle.userData);
}
