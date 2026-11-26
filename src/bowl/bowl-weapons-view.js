import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SHOW_WEAPONS} from './bowl-weapons.js';
import {createFlameMaterial, createScrapWear, createSmokeMaterial, createSparks, scrapNoise} from '../world/scrap-look.js';
import {createSpray} from './bowl-fx.js';

// BOWL-WEAPONS-LOOK: the show weapons bolted on the trucks in Last Truck Rolling (the hammer, the saw and the
// launcher), each rival's own bolt-ons, and the damage a truck shows. Drawing only: it reads each truck's
// `bowlWeapon`, `armor`, `damageZones` and `bowlFlight` (src/bowl/bowl-weapons.js) and never writes the race state.
// The one thing it changes on a truck model is a rival's paint, so that each rival is known at a glance.
// Metres in the show truck's own frame: +Z forward, +Y up, +X the driver's left, the ground at y = 0, the nose at
// z = 2.15, the bonnet's top at y = 2.3 and the cab's roof at y = 3.3 (titan_monster in src/unlock-vehicles.js).

const D = THREE.MathUtils.degToRad;
const clamp01 = value => Math.min(1, Math.max(0, value));
const smooth = t => { t = clamp01(t); return t * t * (3 - 2 * t); };
const easeOut = t => 1 - (1 - clamp01(t)) ** 3;
const easeIn = t => clamp01(t) ** 2;
const mix = (a, b, t) => a + (b - a) * t;

// Each moment's own clock, in seconds after the rule's state changes (ART_LINE: a moment keeps one clock). The rests
// themselves come from the rules (SHOW_WEAPONS); these are only how the drawn parts move inside them.
export const WEAPON_LOOK = Object.freeze({
  // The arm's angle above the truck's forward line: lying back over the cab, raised (the tell), on a truck's body
  // (a hit) and in the dirt (a miss).
  hammer: Object.freeze({rest: D(165), raised: D(112), hit: D(-4), miss: D(-53.5), slam: .12, holdHit: .3, holdMiss: .5, back: 1.2}),
  // The plate's angle: down along the dirt, and snapped up.
  launcher: Object.freeze({down: D(-21), up: D(62), snap: .08, hold: .18, lower: .6, empty: .15}),
  saw: Object.freeze({spinUp: .45, spinDown: 1.4, turnsPerSecond: 7}),
  horn: Object.freeze({dip: .3}),
  // Health at which a truck shows its damage: a loose panel, smoke, and fire. BOWL-LOOK-FIX: the smoke is thick and
  // dark (puffs a second, how big they grow, how dark), and a wreck burns with tongues taller than the cab.
  damage: Object.freeze({panel: 3 / 5, smoke: 1 / 5, smokeRate: 11, wreckSmokeRate: 15, smokeTo: 4.6, wreckSmokeTo: 6.4,
    smokeColour: 0x1d1a17, wreckSmokeColour: 0x0d0b0a, flame: 2.4}),
});

// What each rival carries and how it is painted, so that each is known at a glance (BOWL-SHOW-2 section 9).
export const RIVAL_LOOKS = Object.freeze({
  'rust-rhino': Object.freeze({paint: 0x7b3b22, body: ['horn', 'plough'], weapon: 'horn'}),
  'big-kettle': Object.freeze({paint: 0x2f3431, body: ['boiler'], weapon: 'hammer'}),
  'tin-lizard': Object.freeze({paint: 0x7c876b, body: ['tail'], weapon: 'saw'}),
  'old-bess': Object.freeze({paint: 0x6f8996, body: ['spare', 'cage'], weapon: 'launcher'}),
  'dragon-wagon': Object.freeze({paint: 0x5c1b15, body: ['stacks', 'snout'], weapon: 'fire'}),
});

// ---- Parts -------------------------------------------------------------------------------------------------

function materials(wear, paint = 0x6b4a33) {
  const standard = (color, roughness, metalness, extra = {}) => wear.apply(new THREE.MeshStandardMaterial({color, roughness, metalness, ...extra}));
  return {
    steel: standard(0x575c5f, .68, .45),
    dark: standard(0x26221f, .85, .35),
    rust: standard(0x6b4129, .92, .25),
    worn: standard(0x878b8b, .48, .6),
    rod: new THREE.MeshStandardMaterial({color: 0xc9ced2, roughness: .22, metalness: 1}),
    rubber: new THREE.MeshStandardMaterial({color: 0x1b1a19, roughness: .95, metalness: 0}),
    hose: new THREE.MeshStandardMaterial({color: 0x161514, roughness: .8, metalness: .05}),
    copper: standard(0x7f5434, .5, .8),
    brass: standard(0x8c7038, .45, .85),
    paint: standard(paint, .78, .3),
    blade: new THREE.MeshStandardMaterial({color: 0x9aa0a3, roughness: .32, metalness: .95, emissive: 0x000000}),
    glow: new THREE.MeshBasicMaterial({color: 0xffa040, toneMapped: false}),
  };
}

// Parts that never move against each other are merged into one mesh for each material.
function batch() {
  const lists = new Map();
  const at = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const add = (material, geometry, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
    let g = geometry.index ? geometry.toNonIndexed() : geometry;
    if (g !== geometry) geometry.dispose();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    g.applyMatrix4(at.compose(p.set(...position), q.setFromEuler(e.set(...rotation, 'YXZ')), s.set(...scale)));
    if (!lists.has(material)) lists.set(material, []);
    lists.get(material).push(g);
  };
  return {
    add,
    box: (material, size, position, rotation, radius = .03) => add(material,
      new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 2 - .001)), position, rotation),
    cyl: (material, top, bottom, height, position, rotation, segments = 14, open = false) =>
      add(material, new THREE.CylinderGeometry(top, bottom, height, segments, 1, open), position, rotation),
    tube: (material, points, radius, segments = 12, radial = 8) =>
      add(material, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v))), segments, radius, radial)),
    // Bolt heads standing out of a plate; `rotation` turns the bolt's own up (+Y) to point out of the plate.
    bolts: (material, places, rotation, size = .035) => places.forEach(place => add(material,
      new THREE.CylinderGeometry(size, size, size * 1.1, 6), place, rotation)),
    finish(parent, name, shadows = true) {
      for (const [material, list] of lists) {
        const mesh = new THREE.Mesh(mergeGeometries(list), material);
        list.forEach(g => g.dispose());
        mesh.name = `${name} (${material.name || 'part'})`;
        mesh.castShadow = shadows;
        parent.add(mesh);
      }
      lists.clear();
      return parent;
    },
  };
}

// A flat shape in the (forward, up) plane, cut out to `depth` across the truck and centred on x = 0.
function plateGeometry(shape, depth) {
  const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: false, curveSegments: 10});
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(depth / 2, 0, 0);
  return geometry;
}

// A saw or sprocket outline: hooked teeth round a circle, with round holes to lighten it.
function toothedShape(radius, teeth, depth, holes = 0, holeRadius = 0) {
  const shape = new THREE.Shape(), step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step, root = radius - depth;
    const points = [[root, a], [radius, a + step * .42], [radius - depth * .25, a + step * .55], [root, a + step * .62]];
    points.forEach(([r, angle], index) => {
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      if (i === 0 && index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  for (let i = 0; i < holes; i++) {
    const a = i * Math.PI * 2 / holes, hole = new THREE.Path();
    hole.absarc(Math.cos(a) * radius * .52, Math.sin(a) * radius * .52, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

// A hydraulic or air ram between two points that move: a barrel at the `from` end and a polished rod to `to`.
function createRam(parent, barrelMaterial, rodMaterial, radius, barrelLength) {
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), barrelMaterial);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius * .45, radius * .45, 1, 10), rodMaterial);
  barrel.castShadow = rod.castShadow = true;
  parent.add(barrel, rod);
  const up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
  return {set(from, to) {
    direction.subVectors(to, from);
    const length = direction.length() || 1;
    direction.divideScalar(length);
    const barrelLong = Math.min(barrelLength, length * .9), rodLong = Math.max(.05, length - barrelLong * .85);
    barrel.quaternion.setFromUnitVectors(up, direction); rod.quaternion.copy(barrel.quaternion);
    barrel.scale.set(1, barrelLong, 1); rod.scale.set(1, rodLong, 1);
    barrel.position.copy(from).addScaledVector(direction, barrelLong / 2);
    rod.position.copy(to).addScaledVector(direction, -rodLong / 2);
  }};
}

// ---- Effects in the world: dust, smoke and air, rings, sparks -----------------------------------------------

function createPuffs(count = 96) {
  const group = new THREE.Group(); group.name = 'Bowl weapon dust and smoke';
  const material = createSmokeMaterial(0x8a7458), card = new THREE.PlaneGeometry(1, 1), puffs = [];
  let next = 0;
  for (let index = 0; index < count; index++) {
    const mesh = new THREE.Mesh(card, material);
    mesh.name = 'Bowl weapon puff'; mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 3;
    const puff = {mesh, age: 0, life: 0, velocity: new THREE.Vector3(), color: new THREE.Color(), alpha: 0, from: 1, to: 1, fade: 0, rise: 0};
    mesh.onBeforeRender = () => {
      material.uniforms.uFade.value = puff.fade; material.uniforms.uSeed.value = index * .37;
      material.uniforms.uColor.value.copy(puff.color); material.uniformsNeedUpdate = true;
    };
    group.add(mesh); puffs.push(puff);
  }
  return {group, material, card,
    emit(at, {velocity = [0, 1, 0], life = 1, from = .8, to = 3, alpha = .5, color = 0x8a7458, rise = 0} = {}) {
      const puff = puffs[next]; next = (next + 1) % count;
      puff.mesh.position.copy(at); puff.velocity.set(...velocity); puff.color.setHex(color);
      Object.assign(puff, {age: 0, life, from, to, alpha, rise});
      puff.mesh.visible = true; puff.fade = 0;
    },
    step(dt) {
      for (const puff of puffs) {
        if (!puff.mesh.visible) continue;
        puff.age += dt;
        const t = puff.age / puff.life;
        if (t >= 1) { puff.mesh.visible = false; continue; }
        puff.velocity.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
        puff.velocity.y += puff.rise * dt;
        puff.mesh.position.addScaledVector(puff.velocity, dt);
        const size = mix(puff.from, puff.to, Math.sqrt(t));
        puff.mesh.scale.set(size, size, 1);
        puff.fade = puff.alpha * Math.min(1, t / .1) * (1 - t) ** 1.3;
      }
    },
    clear() { for (const puff of puffs) puff.mesh.visible = false; },
  };
}

function createRings(count = 8) {
  const group = new THREE.Group(); group.name = 'Bowl weapon dust rings';
  const geometry = new THREE.RingGeometry(.7, 1, 48).rotateX(-Math.PI / 2), rings = [];
  for (let index = 0; index < count; index++) {
    const material = new THREE.MeshBasicMaterial({color: 0x9c8462, transparent: true, opacity: 0, depthWrite: false});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Bowl weapon dust ring'; mesh.visible = false; mesh.renderOrder = 2;
    group.add(mesh); rings.push({mesh, age: 0, life: .6, from: 1, to: 5, alpha: .6});
  }
  let next = 0;
  return {group, geometry, rings,
    emit(at, {life = .6, from = .8, to = 5, alpha = .6, color = 0x9c8462} = {}) {
      const ring = rings[next]; next = (next + 1) % count;
      ring.mesh.position.copy(at); ring.mesh.material.color.setHex(color);
      Object.assign(ring, {age: 0, life, from, to, alpha}); ring.mesh.visible = true;
    },
    step(dt) {
      for (const ring of rings) {
        if (!ring.mesh.visible) continue;
        ring.age += dt;
        const t = ring.age / ring.life;
        if (t >= 1) { ring.mesh.visible = false; continue; }
        const size = mix(ring.from, ring.to, easeOut(t));
        ring.mesh.scale.set(size, 1, size);
        ring.mesh.material.opacity = ring.alpha * (1 - t) ** 1.5;
      }
    },
    clear() { for (const ring of rings) ring.mesh.visible = false; },
  };
}

// ---- The weapons ---------------------------------------------------------------------------------------------

// The hammer: a welded mast on the bonnet, a chain-driven I-beam arm and a head of stacked plate with a studded face.
// The arm lies back over the cab, rises for the tell, swings over the cab and comes down in front of the nose.
const HAMMER_PIVOT = [0, 3.35, 1.85], HAMMER_REACH = 3.6;
function buildHammer(root, m) {
  const fixed = batch(), [px, py, pz] = HAMMER_PIVOT;
  fixed.box(m.dark, [1.0, .07, .9], [0, 2.33, 1.72]);
  for (const side of [-1, 1]) {
    // Two cheek plates carry the pin; gussets run back to the cab's front corners.
    const cheek = new THREE.Shape();
    cheek.moveTo(-.42, 0); cheek.lineTo(.36, 0); cheek.lineTo(.16, 1.02); cheek.lineTo(-.12, 1.1); cheek.closePath();
    fixed.add(m.dark, plateGeometry(cheek, .06), [side * .3, 2.36, pz]);
    fixed.box(m.rust, [.07, .5, .42], [side * .33, 2.62, pz - .05], [0, 0, 0], .015);
    fixed.tube(m.dark, [[side * .3, 3.1, pz - .1], [side * .55, 2.75, 1.15], [side * .72, 2.45, .95]], .045, 6, 6);
    fixed.bolts(m.worn, [[side * .34, 2.55, pz - .25], [side * .34, 2.55, pz + .2], [side * .34, 2.9, pz]], [0, 0, side * Math.PI / 2], .03);
  }
  fixed.cyl(m.worn, .09, .09, .78, [px, py, pz], [0, 0, Math.PI / 2], 12);
  // The drive: a motor on the left cheek and a chain up to the arm's sprocket.
  fixed.box(m.dark, [.3, .34, .46], [.55, 2.62, pz - .05], [0, 0, 0], .05);
  fixed.cyl(m.steel, .1, .1, .12, [.42, 2.62, pz - .05], [0, 0, Math.PI / 2], 10);
  fixed.tube(m.dark, [[.42, 2.72, pz - .12], [.42, 3.3, pz - .3], [.42, 3.55, pz], [.42, 3.3, pz + .3], [.42, 2.72, pz + .02]], .022, 24, 5);
  fixed.tube(m.hose, [[.62, 2.5, pz - .25], [.85, 2.4, 1.2], [.9, 2.35, .9]], .03, 8, 6);
  fixed.finish(root, 'Hammer mast');

  const pivot = new THREE.Group(); pivot.name = 'Hammer arm'; pivot.position.set(px, py, pz); root.add(pivot);
  const arm = batch(), L = HAMMER_REACH;
  // An I-beam from the hub to the head, with a doubler plate welded at its root.
  arm.box(m.steel, [.36, .05, L - .3], [0, .17, (L - .3) / 2 + .1], [0, 0, 0], .012);
  arm.box(m.steel, [.36, .05, L - .3], [0, -.17, (L - .3) / 2 + .1], [0, 0, 0], .012);
  arm.box(m.rust, [.05, .34, L - .3], [0, 0, (L - .3) / 2 + .1], [0, 0, 0], .01);
  arm.box(m.dark, [.4, .42, .7], [0, 0, .45], [0, 0, 0], .03);
  arm.cyl(m.dark, .2, .2, .5, [0, 0, 0], [0, 0, Math.PI / 2], 16);
  arm.add(m.dark, plateGeometry(toothedShape(.3, 18, .06), .04), [.42, 0, 0]);
  for (let i = 1; i < 5; i++) arm.box(m.dark, [.04, .3, .04], [0, 0, i * .7 + .3]);
  // The head: a war hammer's block, a broad striking face on the side it swings towards (-Y here), a spike on the
  // back, rusted cheek plates bolted on each side, and a collar where the arm goes in.
  arm.box(m.dark, [.7, 1.15, .7], [0, -.1, L], [0, 0, 0], .06);
  arm.box(m.worn, [.88, .16, .88], [0, -.74, L], [0, 0, 0], .04);
  arm.box(m.dark, [.78, .1, .78], [0, -.63, L], [0, 0, 0], .02);
  for (const x of [-.28, 0, .28]) for (const z of [-.28, 0, .28]) arm.cyl(m.worn, .06, .085, .11, [x, -.86, L + z], [0, 0, 0], 8);
  arm.cyl(m.worn, .02, .2, .62, [0, .78, L], [0, 0, 0], 10);
  arm.box(m.dark, [.46, .5, .26], [0, 0, L - .48], [0, 0, 0], .03);
  for (const side of [-1, 1]) {
    arm.box(m.rust, [.06, .86, .6], [side * .37, -.12, L], [0, 0, 0], .02);
    arm.bolts(m.worn, [[side * .41, -.42, L - .2], [side * .41, -.42, L + .2], [side * .41, .18, L - .2], [side * .41, .18, L + .2]], [0, 0, Math.PI / 2], .04);
  }
  pivot.rotation.order = 'YXZ';
  arm.finish(pivot, 'Hammer arm');
  return {pivot};
}

// The angle of the hammer's arm, from the rule's state alone (and the length of this tell, remembered).
export function hammerAngle(weapon, memory, heldStill = 0) {
  const look = WEAPON_LOOK.hammer, rest = SHOW_WEAPONS.hammer.rest;
  if (!weapon || weapon.phase === 'ready' || !weapon.kind) return look.rest;
  if (weapon.phase === 'tell') {
    memory.tellTotal = Math.max(memory.tellTotal || 0, weapon.time, 1e-3);
    return mix(look.rest, look.raised, easeOut(1 - weapon.time / memory.tellTotal));
  }
  const elapsed = rest - weapon.time;
  if (memory.lastPhase !== 'rest') memory.missed = heldStill > 0;
  const end = memory.missed ? look.miss : look.hit, hold = memory.missed ? look.holdMiss : look.holdHit;
  if (elapsed < look.slam) return mix(look.raised, end, easeIn(elapsed / look.slam));
  // A hit bounces the head a little off the truck it lands on.
  if (elapsed < hold) return end + (memory.missed ? 0 : D(6) * Math.sin(Math.PI * (elapsed - look.slam) / (hold - look.slam)));
  return mix(end, look.rest, smooth((elapsed - hold) / look.back));
}

// The saw: a toothed disc on an axle ahead of the bumper, carried by two cheeks, with a guard over its top and back
// and a motor beside the hub. It spins while F is held, throws sparks where it cuts, and glows when it must cool.
// BOWL-LOOK-FIX: from the chase camera the cab hid the disc, so it rides on a raised arm: two box beams from a pivot
// block on the bonnet, lifted by a ram, carry the hub high enough that the guard and the disc's top stand over the cab.
const SAW_CENTRE = [0, 3.0, 2.75], SAW_RADIUS = .62, SAW_PIVOT = [0, 2.5, 1.15];
function buildSaw(root, m) {
  const fixed = batch(), [, cy, cz] = SAW_CENTRE, [, py, pz] = SAW_PIVOT;
  const rise = Math.atan2(cy - py, cz - pz), length = Math.hypot(cy - py, cz - pz) + .3;
  // The pivot block bolted through the bonnet, and the pin across it.
  fixed.box(m.dark, [.62, .2, .56], [0, 2.38, pz], [0, 0, 0], .04);
  fixed.bolts(m.worn, [[-.22, 2.49, pz - .18], [.22, 2.49, pz - .18], [-.22, 2.49, pz + .18], [.22, 2.49, pz + .18]], [0, 0, 0], .03);
  fixed.cyl(m.worn, .07, .07, .5, [0, py, pz], [0, 0, Math.PI / 2], 12);
  // The two beams, with a cross tube between them half way up.
  for (const side of [-1, 1]) {
    fixed.box(m.steel, [.09, .18, length], [side * .15, (py + cy) / 2, (pz + cz) / 2], [-rise, 0, 0], .025);
    fixed.bolts(m.worn, [[side * .2, cy - .04, cz - .05], [side * .2, cy + .07, cz - .22]], [0, 0, Math.PI / 2], .028);
  }
  fixed.cyl(m.dark, .045, .045, .34, [0, (py + cy) / 2 + .02, (pz + cz) / 2], [0, 0, Math.PI / 2], 8);
  // The ram that holds the arm up, from the bonnet to under the beams.
  fixed.tube(m.dark, [[0, 2.36, 1.78], [0, 2.56, 2.0], [0, 2.74, 2.26]], .06, 6, 8);
  fixed.tube(m.rod, [[0, 2.72, 2.24], [0, 2.8, 2.36]], .032, 2, 6);
  fixed.cyl(m.worn, .05, .05, .32, [0, cy, cz], [0, 0, Math.PI / 2], 10);
  // The guard: a curved plate over the disc's top and back, open at the front and below where it cuts. Wide, so that
  // its arc reads from behind the truck.
  const guard = new THREE.Shape();
  guard.absarc(0, 0, SAW_RADIUS + .13, D(55), D(215), false);
  guard.absarc(0, 0, SAW_RADIUS + .05, D(215), D(55), true);
  fixed.add(m.rust, plateGeometry(guard, .24), [0, cy, cz]);
  fixed.cyl(m.dark, .16, .16, .34, [.3, cy, cz], [0, 0, Math.PI / 2], 14);
  fixed.box(m.dark, [.12, .36, .36], [.47, cy, cz], [0, 0, 0], .03);
  fixed.tube(m.hose, [[.47, cy + .18, cz], [.52, cy + .05, cz - .7], [.42, 2.45, 1.5]], .028, 8, 6);
  fixed.finish(root, 'Saw mount');

  const spinner = new THREE.Group(); spinner.name = 'Saw disc'; spinner.position.set(...SAW_CENTRE); root.add(spinner);
  const disc = batch();
  disc.add(m.blade, plateGeometry(toothedShape(SAW_RADIUS, 26, .075, 5, .075), .035));
  disc.cyl(m.dark, .14, .14, .1, [0, 0, 0], [0, 0, Math.PI / 2], 14);
  disc.bolts(m.worn, [0, 1, 2, 3, 4].map(i => [.06, Math.sin(i * 1.2566) * .09, Math.cos(i * 1.2566) * .09]), [0, 0, Math.PI / 2], .02);
  disc.finish(spinner, 'Saw disc');
  // The blur of a disc spinning faster than the eye can follow, on both faces.
  const blurMaterial = new THREE.ShaderMaterial({
    uniforms: {uSpin: {value: 0}, uHeat: {value: 0}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform float uSpin;uniform float uHeat;varying vec2 vUv;
      void main(){float r=length(vUv-.5)*2.0;
        float teeth=smoothstep(.84,.88,r)*(1.0-smoothstep(.97,1.0,r));
        float face=(1.0-smoothstep(.86,.9,r))*smoothstep(.22,.26,r)*(.35+.25*sin(r*40.0));
        float a=uSpin*(teeth*.75+face*.35);
        vec3 c=mix(vec3(.55,.57,.59),vec3(1.0,.24,.03),uHeat*smoothstep(.35,1.0,r));
        gl_FragColor=vec4(c*(1.0+uHeat*1.8),a);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const blurGeometry = new THREE.CircleGeometry(SAW_RADIUS, 40).rotateY(Math.PI / 2);
  const blurs = [-.03, .03].map(x => {
    const blur = new THREE.Mesh(blurGeometry, blurMaterial);
    blur.name = 'Saw blur'; blur.position.set(x, cy, cz); blur.renderOrder = 4; blur.visible = false; root.add(blur);
    return blur;
  });
  return {spinner, blurMaterial, blurGeometry, blurs};
}

// The launcher: a wide steel wedge hinged ahead of the front tyres, thrown up by two air rams, with an air tank on the
// bed and a gauge on the tank that faces the driver's camera.
const LAUNCH_HINGE = [0, .62, 2.62], LAUNCH_LENGTH = 1.35;
function buildLauncher(root, m) {
  const fixed = batch();
  fixed.box(m.dark, [1.3, .22, .3], [0, 1.38, 1.95], [0, 0, 0], .04);
  for (const side of [-1, 1]) fixed.box(m.steel, [.08, .7, .3], [side * .55, 1.0, 2.35], [D(-25), 0, 0], .02);
  // The tank: a riveted drum lying across the bed, two straps, and the gauge on a stalk at its back.
  fixed.cyl(m.steel, .31, .31, 1.3, [0, 2.78, -1.55], [0, 0, Math.PI / 2], 18);
  for (const side of [-1, 1]) {
    fixed.add(m.steel, new THREE.SphereGeometry(.31, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), [side * .65, 2.78, -1.55], [0, 0, side * -Math.PI / 2], [1, .35, 1]);
    fixed.add(m.dark, new THREE.TorusGeometry(.315, .025, 6, 24), [side * .38, 2.78, -1.55], [0, Math.PI / 2, 0]);
    fixed.box(m.dark, [.12, .2, .4], [side * .38, 2.5, -1.55], [0, 0, 0], .02);
  }
  fixed.cyl(m.dark, .035, .035, .5, [.42, 3.2, -1.72], [0, 0, 0], 6);
  fixed.cyl(m.brass, .07, .07, .1, [-.35, 3.12, -1.55], [0, 0, 0], 8);
  fixed.tube(m.hose, [[-.55, 2.6, -1.4], [-.98, 2.3, -.4], [-.98, 2.05, 1.2], [-.55, 1.45, 1.9]], .035, 20, 6);
  fixed.finish(root, 'Launcher frame and tank');

  const gauge = new THREE.Group(); gauge.name = 'Launcher air gauge'; gauge.position.set(.42, 3.5, -1.75); gauge.rotation.y = Math.PI; gauge.scale.setScalar(1.4);
  const face = new THREE.Mesh(new THREE.CircleGeometry(.17, 32), new THREE.MeshBasicMaterial({map: gaugeFace(), color: 0xd8d2c0}));
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(.175, .025, 8, 32), m.brass);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(.018, .14, .012).translate(0, .06, .012), new THREE.MeshBasicMaterial({color: 0x1a1410}));
  needle.name = 'Launcher gauge needle';
  gauge.add(face, bezel, needle); root.add(gauge);

  const pivot = new THREE.Group(); pivot.name = 'Launcher plate'; pivot.position.set(...LAUNCH_HINGE); root.add(pivot);
  const plate = batch(), Lp = LAUNCH_LENGTH;
  plate.cyl(m.dark, .09, .09, 2.2, [0, 0, 0], [0, 0, Math.PI / 2], 12);
  const top = new THREE.Shape();
  top.moveTo(-1.15, 0); top.lineTo(1.15, 0); top.lineTo(1.2, Lp - .1); top.lineTo(1.05, Lp); top.lineTo(-1.05, Lp); top.lineTo(-1.2, Lp - .1); top.closePath();
  const deck = new THREE.ExtrudeGeometry(top, {depth: .06, bevelEnabled: false}).rotateX(Math.PI / 2).translate(0, .06, 0);
  plate.add(m.steel, deck);
  for (const x of [-.8, 0, .8]) {
    const rib = new THREE.Shape(); rib.moveTo(0, 0); rib.lineTo(Lp - .15, 0); rib.lineTo(0, -.2); rib.closePath();
    const g = new THREE.ExtrudeGeometry(rib, {depth: .05, bevelEnabled: false}).rotateY(-Math.PI / 2).translate(x + .025, 0, 0);
    plate.add(m.steel, g);
  }
  plate.box(m.worn, [2.3, .07, .12], [0, -.01, Lp - .04], [0, 0, 0], .02);
  plate.bolts(m.worn, [-.9, -.45, 0, .45, .9].map(x => [x, .085, .25]), [0, 0, 0], .03);
  plate.bolts(m.worn, [-.9, -.45, 0, .45, .9].map(x => [x, .085, Lp - .25]), [0, 0, 0], .03);
  plate.finish(pivot, 'Launcher plate');
  const rams = [-.45, .45].map(() => createRam(root, m.dark, m.rod, .07, .72));
  return {pivot, rams, needle, gauge, gaugeMaterial: face.material};
}

function gaugeFace() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = '#e4ddc8'; c.fillRect(0, 0, 128, 128);
  const arc = (from, to, colour) => { c.strokeStyle = colour; c.lineWidth = 12; c.beginPath(); c.arc(64, 64, 46, from, to); c.stroke(); };
  // The needle sweeps from lower left (empty) over the top to lower right (full).
  arc(D(135), D(200), '#b0321e'); arc(D(200), D(320), '#c89a2a'); arc(D(320), D(405), '#3f8a3a');
  c.strokeStyle = '#1c1712'; c.lineWidth = 3;
  for (let i = 0; i <= 9; i++) { const a = D(135 + i * 30); c.beginPath(); c.moveTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34); c.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); c.stroke(); }
  c.fillStyle = '#1c1712'; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText('AIR', 64, 98);
  // Grime round the rim.
  const grime = c.createRadialGradient(64, 64, 30, 64, 64, 66); grime.addColorStop(0, 'rgba(60,45,30,0)'); grime.addColorStop(1, 'rgba(60,45,30,.55)');
  c.fillStyle = grime; c.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The launcher's plate angle and the gauge's fill (0 to 1), from the rule's state alone.
export function launcherPose(weapon, seconds = 0) {
  const look = WEAPON_LOOK.launcher, rest = SHOW_WEAPONS.launcher.rest;
  if (!weapon?.kind || weapon.phase === 'ready') return {angle: look.down, fill: 1};
  if (weapon.phase === 'tell') return {angle: look.down + D(2.5) * Math.sin(seconds * 70), fill: 1};
  const elapsed = rest - weapon.time;
  const fill = elapsed < look.empty ? 1 - elapsed / look.empty : clamp01((elapsed - look.empty) / (rest - look.empty));
  let angle = look.down;
  if (elapsed < look.snap) angle = mix(look.down, look.up, easeOut(elapsed / look.snap));
  else if (elapsed < look.snap + look.hold) angle = look.up;
  else angle = mix(look.up, look.down, smooth((elapsed - look.snap - look.hold) / look.lower));
  return {angle, fill};
}

// ---- The rivals' own bolt-ons --------------------------------------------------------------------------------

// A horn bent forward and up out of a riveted nose plate. Its tip carries the charge's tell: it dips.
function buildHorn(root, m) {
  const fixed = batch();
  const nose = new THREE.Shape(); nose.moveTo(0, -.3); nose.lineTo(.42, -.18); nose.lineTo(.5, .32); nose.lineTo(0, .42); nose.closePath();
  fixed.add(m.rust, plateGeometry(nose, 1.7), [0, 1.95, 1.86]);
  fixed.bolts(m.worn, [-.7, -.35, 0, .35, .7].map(x => [x, 2.2, 2.32]), [D(80), 0, 0], .035);
  fixed.finish(root, 'Rhino nose plate');
  const pivot = new THREE.Group(); pivot.name = 'Rhino horn'; pivot.position.set(0, 2.15, 2.3); root.add(pivot);
  const horn = batch();
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, .05, 1.0), new THREE.Vector3(0, .9, 1.55));
  const g = new THREE.TubeGeometry(curve, 16, .3, 12);
  // Taper the tube to a point along its length.
  const position = g.attributes.position, point = new THREE.Vector3(), centre = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    const ring = Math.floor(i / 13), t = ring / 16;
    curve.getPoint(t, centre); point.fromBufferAttribute(position, i).sub(centre).multiplyScalar(1 - t * .93);
    position.setXYZ(i, centre.x + point.x, centre.y + point.y, centre.z + point.z);
  }
  g.computeVertexNormals();
  horn.add(m.worn, g);
  for (let i = 0; i < 4; i++) horn.add(m.dark, new THREE.TorusGeometry(.3 * (1 - i * .19 * .93) + .01, .025, 6, 16), curve.getPoint(i * .19).toArray(), [D(-6 - i * 12), 0, 0]);
  horn.finish(pivot, 'Rhino horn');
  for (const side of [-1, 1]) {
    const small = batch();
    small.cyl(m.worn, .01, .12, .55, [side * .62, 2.42, 2.3], [D(70), 0, side * D(-18)], 8);
    small.finish(root, 'Rhino side horn');
  }
  return {pivot};
}

// A plough blade low on the rhino's nose, scraped bright along its edge.
function buildPlough(root, m) {
  const b = batch();
  const blade = new THREE.Shape(); blade.moveTo(0, 0); blade.quadraticCurveTo(.35, .1, .42, .62); blade.lineTo(.3, .64); blade.quadraticCurveTo(.22, .2, -.05, .1); blade.closePath();
  b.add(m.rust, plateGeometry(blade, 2.5), [0, .75, 2.66]);
  b.box(m.worn, [2.5, .06, .08], [0, .76, 2.66], [0, 0, 0], .02);
  for (const side of [-1, 1]) b.tube(m.dark, [[side * .6, 1.5, 1.95], [side * .7, 1.1, 2.5], [side * .75, 1.0, 2.75]], .06, 6, 6);
  return b.finish(root, 'Rhino plough');
}

// Big Kettle's boiler: a riveted drum lying along the bed, a domed end with a fire door, a chimney and a valve.
function buildBoiler(root, m) {
  const b = batch(), y = 3.0;
  b.cyl(m.copper, .56, .56, 1.15, [0, y, -1.575], [D(90), 0, 0], 20);
  b.add(m.copper, new THREE.SphereGeometry(.56, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), [0, y, -2.15], [D(-90), 0, 0], [1, .45, 1]);
  b.add(m.dark, new THREE.CylinderGeometry(.5, .5, .06, 20), [0, y, -1.0], [D(90), 0, 0]);
  for (const z of [-2.05, -1.75, -1.4, -1.08]) b.add(m.dark, new THREE.TorusGeometry(.57, .03, 6, 28), [0, y, z]);
  for (let i = 0; i < 6; i++) for (const a of [0, D(55), D(-55)])
    b.bolts(m.dark, [[Math.sin(a) * .575, y + Math.cos(a) * .575, -1.95 + i * .17]], [0, 0, -a], .022);
  b.box(m.dark, [.36, .3, .06], [0, y - .05, -2.42], [0, 0, 0], .02);
  b.cyl(m.glow, .07, .07, .02, [0, y - .05, -2.46], [D(90), 0, 0], 10);
  for (const side of [-1, 1]) b.box(m.dark, [.14, .5, .9], [side * .38, 2.62, -1.5], [0, 0, 0], .03);
  // The chimney stands on the bed beside the boiler, clear of the hammer's arm, joined to it by an elbow.
  b.cyl(m.dark, .15, .17, 2.1, [-.74, 3.55, -1.95], [0, 0, 0], 14);
  b.cyl(m.dark, .24, .15, .22, [-.74, 4.68, -1.95], [0, 0, 0], 14, true);
  b.tube(m.dark, [[-.35, y + .2, -1.95], [-.6, y + .3, -1.95], [-.74, y + .45, -1.95]], .11, 6, 10);
  b.cyl(m.brass, .05, .05, .3, [.3, y + .62, -1.6], [0, 0, 0], 8);
  b.cyl(m.brass, .09, .09, .06, [.3, y + .78, -1.6], [0, 0, 0], 10);
  b.tube(m.copper, [[.45, y - .2, -1.05], [.8, 2.6, -.7], [.85, 2.2, .6]], .04, 8, 6);
  return b.finish(root, 'Kettle boiler');
}

// Tin Lizard's tail: plates on a spine from the back bumper, sweeping side to side, ending in a spike.
const TAIL_SEGMENTS = 7;
function buildTail(root, m) {
  const segments = [];
  let parent = root;
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const link = new THREE.Group(); link.name = `Lizard tail ${i + 1}`;
    if (i === 0) link.position.set(0, 1.85, -2.15); else link.position.set(0, -.07, -.42);
    parent.add(link);
    const b = batch(), w = .6 * (1 - i / TAIL_SEGMENTS) + .12, h = .32 * (1 - i / TAIL_SEGMENTS) + .08;
    b.box(i % 2 ? m.paint : m.rust, [w, h, .46], [0, 0, -.21], [0, 0, 0], .03);
    const fin = new THREE.Shape(); fin.moveTo(-.2, 0); fin.lineTo(.18, 0); fin.lineTo(-.12, .22 * (1 - i / 9)); fin.closePath();
    b.add(m.worn, plateGeometry(fin, .03), [0, h / 2, -.2]);
    b.cyl(m.dark, .05, .05, w + .06, [0, 0, 0], [0, 0, Math.PI / 2], 8);
    if (i === TAIL_SEGMENTS - 1) b.cyl(m.worn, .005, .12, .55, [0, 0, -.65], [D(-90), 0, 0], 8);
    b.finish(link, `Lizard tail ${i + 1}`);
    segments.push(link); parent = link;
  }
  return {segments};
}

// Old Bess: a spare tyre on the bed and a cage over her lamps.
function buildBess(root, m) {
  const b = batch();
  b.add(m.rubber, new THREE.TorusGeometry(.62, .22, 10, 22), [0, 2.3, -2.36]);
  b.cyl(m.rust, .38, .38, .3, [0, 2.3, -2.36], [D(90), 0, 0], 14);
  b.box(m.dark, [.5, .14, .3], [0, 2.3, -2.16], [0, 0, 0], .02);
  for (const side of [-1, 1]) {
    b.tube(m.steel, [[side * .35, 1.98, 2.15], [side * .62, 2.4, 2.3], [side * .9, 2.2, 2.18]], .035, 8, 6);
    b.tube(m.steel, [[side * .45, 1.98, 2.2], [side * .62, 2.36, 2.32]], .025, 3, 5);
  }
  b.tube(m.steel, [[-.95, 1.95, 2.22], [-.6, 2.02, 2.34], [.6, 2.02, 2.34], [.95, 1.95, 2.22]], .055, 12, 8);
  return b.finish(root, 'Bess spare and lamp cage');
}

// Dragon Wagon: a welded snout round a fire nozzle, with teeth and two lamp eyes, and four stacks behind the cab.
function buildSnout(root, m) {
  const b = batch();
  b.box(m.paint, [1.0, .2, .85], [0, 2.32, 2.45], [D(-10), 0, 0], .04);
  b.box(m.dark, [.9, .16, .7], [0, 1.66, 2.42], [D(12), 0, 0], .04);
  for (let i = 0; i < 6; i++) {
    const x = -.38 + i * .152;
    b.cyl(m.worn, .001, .05, .2, [x, 2.13, 2.8], [D(180), 0, 0], 6);
    b.cyl(m.worn, .001, .045, .18, [x, 1.82, 2.74], [0, 0, 0], 6);
  }
  b.cyl(m.brass, .1, .13, .55, [0, 1.98, 2.55], [D(90), 0, 0], 12);
  b.finish(root, 'Dragon snout');
  const eyes = new THREE.MeshBasicMaterial({color: 0xffa23a, toneMapped: false});
  const eyeGeometry = new THREE.SphereGeometry(.07, 10, 8);
  for (const side of [-1, 1]) { const eye = new THREE.Mesh(eyeGeometry, eyes); eye.position.set(side * .32, 2.45, 2.78); eye.name = 'Dragon eye'; root.add(eye); }
  return {eyes, eyeGeometry};
}
const STACKS = [[-.62, -1.45, 4.1], [-.3, -1.2, 4.35], [.3, -1.2, 4.35], [.62, -1.45, 4.1]];
function buildStacks(root, m) {
  const b = batch();
  for (const [x, z, top] of STACKS) {
    b.cyl(m.dark, .1, .12, top - 2.4, [x, (top + 2.4) / 2, z], [0, 0, 0], 12);
    b.cyl(m.rust, .15, .1, .16, [x, top, z], [0, 0, 0], 12, true);
  }
  b.box(m.dark, [1.5, .1, .5], [0, 2.45, -1.32], [0, 0, 0], .03);
  return b.finish(root, 'Dragon stacks');
}

// ---- A truck's rig: its weapon, its bolt-ons, its damage -----------------------------------------------------

// Dragon Wagon's breath: a cone of fire laid along the nozzle's line, flickering as it streams out. `uHot` makes the
// inner cone whiter. The cone's narrow end is at the nozzle.
const JET_LENGTH = 5.8;
function createJet(hot) {
  const material = new THREE.ShaderMaterial({
    uniforms: {uNoise: {value: scrapNoise()}, uTime: {value: 0}, uFade: {value: 1}, uHot: {value: hot}},
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `uniform sampler2D uNoise;uniform float uTime;uniform float uFade;uniform float uHot;varying vec2 vUv;
      void main(){float along=vUv.y;
        float n=texture2D(uNoise,vec2(vUv.x*2.0,along*1.2-uTime*2.4)).r*.65+texture2D(uNoise,vec2(vUv.x*5.0+.3,along*2.6-uTime*4.1)).b*.5;
        float body=smoothstep(.45,.8,n+.4-along*(.8-uHot*.2))*(1.0-smoothstep(.82,1.0,along))*smoothstep(0.0,.05,along);
        vec3 c=mix(vec3(.9,.16,.02),vec3(1.0,.55,.1),smoothstep(.2,.7,body));
        c=mix(c,vec3(1.0,.85,.45),uHot*smoothstep(.6,.95,body)*(1.0-along));
        gl_FragColor=vec4(c*body*(.45+.2*uHot)*uFade,body*uFade);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: THREE.FrontSide, blending: THREE.AdditiveBlending,
  });
  const geometry = new THREE.CylinderGeometry(hot ? .75 : 1.35, hot ? .1 : .18, JET_LENGTH, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, JET_LENGTH / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = hot ? 'Dragon breath core' : 'Dragon breath'; mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 7;
  return mesh;
}

function flameTongue(material, name) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, .5, 0), material);
  mesh.name = name; mesh.frustumCulled = false; mesh.renderOrder = 7; mesh.visible = false;
  return mesh;
}

function buildRig(look, mesh) {
  const root = new THREE.Group(); root.name = `Bowl weapons on ${look.name}`;
  root.matrixAutoUpdate = false;
  const wear = createScrapWear({paint: 1, dustTop: 1.6});
  const m = materials(wear, look.paint ?? 0x6b4a33);
  const rig = {root, wear, materials: m, look, memory: {}, built: {}};
  for (const part of look.body) {
    if (part === 'horn') rig.built.horn = buildHorn(root, m);
    if (part === 'plough') buildPlough(root, m);
    if (part === 'boiler') { buildBoiler(root, m); rig.built.kettle = true; }
    if (part === 'tail') rig.built.tail = buildTail(root, m);
    if (part === 'spare' || part === 'cage') { if (!rig.built.bess) rig.built.bess = buildBess(root, m); }
    if (part === 'stacks') buildStacks(root, m);
    if (part === 'snout') rig.built.snout = buildSnout(root, m);
  }
  if (look.weapon === 'hammer') rig.built.hammer = buildHammer(root, m);
  if (look.weapon === 'saw') {
    rig.built.saw = buildSaw(root, m);
    // The sparks fly in the world's own metres, so they live beside the rig (in the view's group), not on the truck.
    rig.sparks = createSpray(120, 'Saw sparks'); rig.sparks.visible = false;
  }
  if (look.weapon === 'launcher') rig.built.launcher = buildLauncher(root, m);
  // Fire: the dragon's breath, and tongues of flame for a burning truck.
  rig.flame = createFlameMaterial();
  rig.breath = look.weapon === 'fire' ? [false, true].map(hot => {
    const jet = createJet(hot ? 1 : 0); jet.position.set(0, 1.98, 2.8); jet.rotation.x = D(-4); root.add(jet); return jet; }) : [];
  rig.burning = [[.45, 2.2, 1.3], [-.4, 2.25, 1.75], [-.5, 2.6, .1], [.55, 2.7, -.5], [.2, 2.4, -1.4]].map((place, i) => {
    const tongue = flameTongue(rig.flame, `Burning truck ${i + 1}`); tongue.position.set(...place); root.add(tongue);
    tongue.onBeforeRender = () => { rig.flame.uniforms.uSeed.value = i * .29; rig.flame.uniformsNeedUpdate = true; };
    return tongue; });
  // The loose panel, hinged at its top front corner, and the dark hole it leaves.
  const panel = new THREE.Group(); panel.name = 'Loose panel'; panel.visible = false;
  rig.panelMaterial = wear.apply(new THREE.MeshStandardMaterial({color: 0x6b4a33, roughness: .8, metalness: .3}));
  const sheet = new THREE.Mesh(new RoundedBoxGeometry(.05, .6, 1.4, 2, .02).translate(0, -.3, -.7), rig.panelMaterial);
  sheet.castShadow = true; panel.add(sheet);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .5), new THREE.MeshStandardMaterial({color: 0x0f0d0c, roughness: 1}));
  hole.name = 'Panel hole'; hole.visible = false;
  root.add(panel, hole);
  Object.assign(rig, {panel, hole});
  // A rival wears its own paint; the show truck keeps the player's.
  if (look.paint != null && mesh.userData.paint) {
    rig.paintBefore = mesh.userData.originalColor?.clone();
    mesh.userData.originalColor?.setHex(look.paint);
    mesh.userData.paint.color.setHex(look.paint);
    mesh.userData.damageKey = null;
  }
  rig.materialList = [...new Set([...Object.values(m), rig.panelMaterial, hole.material])];
  return rig;
}

// The rig leaves the scene and the truck's paint is restored now; the GPU resources go through `retire`, so a warmup
// poll that still holds these materials finds them (Three's compileAsync throws on a disposed one).
function disposeRig(rig, mesh, retire = release => release()) {
  rig.root.removeFromParent();
  if (rig.sparks) rig.sparks.removeFromParent();
  retire(() => {
    const used = new Set(rig.materialList);
    rig.root.traverse(node => { if (node.isMesh) { node.geometry?.dispose?.(); used.add(node.material); } });
    for (const material of used) { material.map?.dispose?.(); material.dispose?.(); }
    rig.flame.dispose();
    rig.built.saw?.blurMaterial.dispose();
    rig.built.snout?.eyes.dispose();
    if (rig.sparks) { rig.sparks.geometry.dispose(); rig.sparks.material.dispose(); }
  });
  if (rig.paintBefore && mesh?.userData.paint) {
    mesh.userData.originalColor.copy(rig.paintBefore); mesh.userData.paint.color.copy(rig.paintBefore); mesh.userData.damageKey = null;
  }
}

// What a truck looks like this event: the player's weapon, or a rival's whole look.
export function truckLook(actor, isPlayer, fight) {
  if (isPlayer) {
    const weapon = fight ? actor?.bowlWeapon?.kind ?? null : null;
    return weapon ? {key: `player:${weapon}`, name: 'the show truck', body: [], weapon} : null;
  }
  const rival = RIVAL_LOOKS[actor?.bowlRival];
  if (!rival) return null;
  // Outside a fight a rival keeps its body and paint but carries no weapon (the horn is its body as well).
  const weapon = fight ? actor.bowlWeapon?.kind ?? rival.weapon : null;
  return {key: `${actor.bowlRival}:${weapon ?? 'none'}`, name: actor.bowlRival, paint: rival.paint, body: rival.body, weapon};
}

// How much health a truck has left, 0 to 1, in a fight; null outside one.
export function healthShare(actor) {
  if (!actor?.bowlWeapon || !Number.isFinite(actor.armor) || !(actor.maxArmor > 0)) return null;
  return clamp01(actor.armor / actor.maxArmor);
}

// A flash where a blow lands, facing the viewer, so that a hit reads even when the arm is seen end on.
function createFlash() {
  const material = new THREE.ShaderMaterial({
    uniforms: {uFade: {value: 0}},
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(0.0,0.0,0.0,1.0);
      mv.xy+=position.xy*vec2(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz));gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float uFade;varying vec2 vUv;
      void main(){vec2 p=(vUv-.5)*2.0;float d=length(p);float a=atan(p.y,p.x);
        float rays=pow(max(0.0,cos(a*4.0)),18.0)*(1.0-smoothstep(.1,1.0,d));
        float core=pow(max(0.0,1.0-d),2.5);float glow=(core+rays*.8)*uFade;
        gl_FragColor=vec4(mix(vec3(1.0,.45,.1),vec3(1.0,.95,.8),core)*glow*2.2,glow);
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = 'Hammer hit flash'; mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 8;
  return mesh;
}

export function createBowlWeaponsView({retire = release => release()} = {}) {
  const group = new THREE.Group(); group.name = 'Bowl weapons and damage';
  const puffs = createPuffs(240), rings = createRings();
  const hitSparks = createSparks(64); hitSparks.name = 'Hammer hit sparks'; hitSparks.visible = false;
  const flash = createFlash();
  group.add(puffs.group, rings.group, hitSparks, flash);
  const rigs = new Map();
  let lastNow = null, hitUntil = 0, hitStart = 0, hitAt = new THREE.Vector3(), hitOut = new THREE.Vector3();
  group.userData.builds = 0;
  const v = new THREE.Vector3(), w = new THREE.Vector3(), forward = new THREE.Vector3(), worldMatrix = new THREE.Matrix4();
  const toWorld = (rig, x, y, z, target = v) => target.set(x, y, z).applyMatrix4(rig.root.matrix);

  function stepHammer(rig, actor, dt, seconds) {
    const built = rig.built.hammer, memory = rig.memory, weapon = rig.weapon;
    const target = hammerAngle(weapon, memory, actor.bowlHeldStill || 0);
    // A tell called off (the target got away) or a wreck lowers the arm over a third of a second, not in one frame.
    const angle = memory.drawn == null || weapon?.phase === 'tell' || weapon?.phase === 'rest' ? target
      : memory.drawn + (target - memory.drawn) * Math.min(1, dt / .1);
    memory.drawn = angle;
    // A slight tremble while it is raised, so that the tell reads even when the arm is seen end on.
    built.pivot.rotation.x = -angle + (weapon?.phase === 'tell' ? D(1.2) * Math.sin(seconds * 55) : 0);
    const lean = weapon?.lean || 0;
    built.pivot.rotation.y = lean;
    if (weapon?.phase === 'rest') {
      const elapsed = SHOW_WEAPONS.hammer.rest - weapon.time;
      if (!memory.landed && elapsed >= WEAPON_LOOK.hammer.slam) {
        memory.landed = true;
        // Where the face lands: on a truck's body for a hit, in the dirt for a miss.
        const end = memory.missed ? WEAPON_LOOK.hammer.miss : WEAPON_LOOK.hammer.hit;
        const [, py, pz] = HAMMER_PIVOT, r = HAMMER_REACH;
        const fy = py + r * Math.sin(end) - .8 * Math.cos(end), fz = pz + r * Math.cos(end) + .8 * Math.sin(end);
        const x = Math.sin(lean) * (fz - pz), z = pz + Math.cos(lean) * (fz - pz);
        toWorld(rig, x, fy, z, hitAt);
        forward.set(Math.sin(lean), 0, Math.cos(lean)).transformDirection(rig.root.matrix);
        if (memory.missed) {
          const ground = toWorld(rig, 0, .05, fz, w);
          rings.emit(ground, {life: .7, from: .6, to: 4.6, alpha: .7});
          for (let i = 0; i < 9; i++) {
            const a = i / 9 * Math.PI * 2;
            puffs.emit(ground, {velocity: [Math.cos(a) * 4.5, 1.2 + (i % 3) * .5, Math.sin(a) * 4.5], life: 1.3, from: .8, to: 3.2, alpha: .55, color: 0x8c7556});
          }
        } else {
          hitStart = seconds; hitUntil = seconds + .55; hitOut.copy(forward);
          rings.emit(toWorld(rig, x, .05, z, w), {life: .45, from: .5, to: 3, alpha: .35});
          // Paint, rust and grit thrown up over the struck truck, high enough to be seen over the cab.
          for (let i = 0; i < 8; i++) {
            const a = i / 8 * Math.PI * 2;
            puffs.emit(hitAt, {velocity: [Math.cos(a) * 2.2, 3 + (i % 3), Math.sin(a) * 2.2], life: 1, from: .5, to: 2.2, alpha: .55,
              color: i % 2 ? 0x3a3029 : 0x6e5a44, rise: -1.5});
          }
        }
      }
    } else memory.landed = false;
    if (weapon?.phase !== 'tell') memory.tellTotal = 0;
    memory.lastPhase = weapon?.phase;
  }

  function stepSaw(rig, actor, dt, seconds) {
    const built = rig.built.saw, memory = rig.memory, weapon = rig.weapon, look = WEAPON_LOOK.saw;
    const held = weapon?.phase === 'tell' || weapon?.phase === 'active';
    memory.spin ??= 0; memory.turn ??= 0; memory.heat ??= 0;
    memory.spin = held ? Math.min(1, memory.spin + dt / look.spinUp) : Math.max(0, memory.spin - dt / look.spinDown);
    memory.turn = (memory.turn + memory.spin * look.turnsPerSecond * Math.PI * 2 * dt) % (Math.PI * 2);
    built.spinner.rotation.x = memory.turn;
    // Heat builds over the four seconds of cutting and goes over the three of cooling.
    const target = weapon?.phase === 'rest' ? clamp01(weapon.time / SHOW_WEAPONS.saw.rest)
      : weapon?.phase === 'active' ? clamp01((weapon.cutSeconds || 0) / 4) : 0;
    memory.heat = target > memory.heat ? target : Math.max(target, memory.heat - dt / 3);
    const heat = memory.heat;
    rig.materials.blade.emissive.setRGB(1, .2, .02).multiplyScalar(heat * heat * 2.4);
    built.blurMaterial.uniforms.uSpin.value = smooth(memory.spin);
    for (const blur of built.blurs) blur.visible = memory.spin > .01;
    built.blurMaterial.uniforms.uHeat.value = heat;
    const sparks = rig.sparks, cutting = !!weapon?.cutting && weapon.phase === 'active';
    // BOWL-LOOK-FIX: seen from behind, the disc is edge on, so its spin is carried by sparks thrown out to both sides
    // over the cab while it turns; where it cuts they become a rooster tail thrown up and back over the bonnet.
    sparks.visible = held && memory.spin > .3 && rig.root.visible;
    if (sparks.visible) {
      const [, cy, cz] = SAW_CENTRE;
      forward.set(0, 0, -1).transformDirection(rig.root.matrix);
      w.set(1, 0, 0).transformDirection(rig.root.matrix);
      const from = toWorld(rig, 0, cy + SAW_RADIUS * .7, cz + SAW_RADIUS * .55);
      if (cutting) sparks.userData.place(seconds, from, forward, w, {reach: 3.4, rise: 3, spread: .7, share: 1});
      else sparks.userData.place(seconds, from, forward, w, {reach: 2.3, rise: 2.4, both: true, share: .35 + .35 * memory.spin, life: 1.7});
    }
    // A cooling disc smokes.
    if (weapon?.phase === 'rest' && rig.root.visible && Math.random() < dt * 9) {
      const [, cy, cz] = SAW_CENTRE;
      puffs.emit(toWorld(rig, 0, cy + .4, cz), {velocity: [0, .8, 0], life: 1.2, from: .25, to: 1.1, alpha: .35, color: 0x9a9894, rise: .6});
    }
  }

  function stepLauncher(rig, actor, dt, seconds) {
    const built = rig.built.launcher, memory = rig.memory, weapon = rig.weapon;
    const pose = launcherPose(weapon, seconds), look = WEAPON_LOOK.launcher;
    // A wreck (or the event's end) in mid throw stops the rule's clock: the plate then falls back under its weight
    // over the rule's lowering time, not in one frame (BOWL-LOOK-FIX, left from BOWL-WEAPONS-LOOK).
    let angle = pose.angle;
    if (!weapon && memory.plate != null && memory.plate > angle)
      angle = Math.max(angle, memory.plate - (look.up - look.down) / look.lower * dt);
    memory.plate = angle;
    built.pivot.rotation.x = -angle;
    built.needle.rotation.z = D(135) - pose.fill * D(270);
    // The rams follow the plate.
    built.pivot.updateMatrix();
    for (const [index, side] of [-.45, .45].entries()) {
      const from = w.set(side, 1.35, 1.95), to = v.set(side, -.1, .75).applyMatrix4(built.pivot.matrix);
      built.rams[index].set(from, to);
    }
    const fired = weapon?.phase === 'rest' && memory.lastPhase !== 'rest';
    if (fired && rig.root.visible) for (let i = 0; i < 8; i++) {
      const side = i % 2 ? 1 : -1;
      puffs.emit(toWorld(rig, side * 1.1, .7, 2.7 + (i >> 1) * .25), {velocity: [0, 1.8, 0], life: .55, from: .4, to: 1.9, alpha: .6, color: 0xc4c6c4});
    }
    // The tell's hiss: a thin jet of air from the tank's relief valve.
    if (weapon?.phase === 'tell' && rig.root.visible && Math.random() < dt * 30)
      puffs.emit(toWorld(rig, -.35, 3.2, -1.55), {velocity: [0, 2.4, 0], life: .45, from: .15, to: .7, alpha: .5, color: 0xd0d2d0});
    memory.lastPhase = weapon?.phase;
  }

  function stepHorn(rig, actor, dt) {
    const built = rig.built.horn, weapon = rig.weapon, memory = rig.memory;
    let dip = 0;
    if (weapon?.phase === 'tell') {
      memory.tellTotal = Math.max(memory.tellTotal || 0, weapon.time, 1e-3);
      dip = easeOut(1 - weapon.time / memory.tellTotal) * WEAPON_LOOK.horn.dip;
      // Snorts from the nose as it lowers its horn to charge.
      if (rig.root.visible && Math.random() < dt * 14) for (const side of [-1, 1])
        puffs.emit(toWorld(rig, side * .45, 1.7, 2.4), {velocity: [side * 1.2, .2, 2], life: .5, from: .3, to: 1.2, alpha: .22, color: 0x9d968a});
    } else {
      memory.tellTotal = 0;
      dip = (memory.dip || 0) * Math.max(0, 1 - dt / .1);
    }
    memory.dip = dip;
    built.pivot.rotation.x = dip;
  }

  function stepFire(rig, actor, dt, seconds) {
    const weapon = rig.weapon, burning = weapon?.phase === 'active', pilot = weapon?.phase === 'tell';
    rig.breath.forEach(jet => {
      jet.visible = (burning || pilot) && rig.root.visible;
      if (!jet.visible) return;
      // The breath reaches six metres; the tell is a pilot flame licking out of the nozzle.
      jet.material.uniforms.uTime.value = seconds;
      const reach = pilot ? .09 + .03 * Math.sin(seconds * 30) : 1;
      jet.scale.set(pilot ? .35 : 1 + .06 * Math.sin(seconds * 13), pilot ? .35 : 1 + .06 * Math.sin(seconds * 11), reach);
    });
    // Soot rolls off the breath, so that the fire stands out against the pale floor.
    if (burning && rig.root.visible && Math.random() < dt * 30) {
      const reach = .3 + Math.random() * .7;
      puffs.emit(toWorld(rig, (Math.random() - .5) * 1.2, 2.4 + reach * 1.2, 2.85 + reach * 5.6), {velocity: [0, 1.8, 0], life: 1.1,
        from: .8, to: 2.6, alpha: .5, color: 0x1a1512, rise: .8});
    }
    rig.built.snout.eyes.color.setHex(pilot || burning ? 0xfff0a0 : 0xff9a30);
    // The stacks breathe black smoke, more as it readies its fire.
    if (rig.root.visible && Math.random() < dt * (pilot || burning ? 22 : 4)) {
      const [x, z, top] = STACKS[Math.floor(Math.random() * STACKS.length)];
      puffs.emit(toWorld(rig, x, top + .15, z), {velocity: [0, 1.6, 0], life: 1.4, from: .3, to: 1.6, alpha: .45, color: 0x1d1a18, rise: .4});
    }
  }

  function stepTail(rig, actor, seconds) {
    const sway = .1 + .25 * clamp01(Math.abs(actor.speedMph || 0) / 35);
    rig.built.tail.segments.forEach((link, i) => {
      link.rotation.y = Math.sin(seconds * 3.1 - i * .7) * sway * (.4 + i * .12);
      link.rotation.x = i ? D(-5) : D(-8);
    });
  }

  // The truck's damage: a loose panel at three fifths, smoke at one fifth, fire at nothing.
  function stepDamage(rig, actor, mesh, dt, seconds) {
    const share = healthShare(actor), memory = rig.memory;
    const wrecked = !!actor.combatWrecking || share === 0;
    const loose = share != null && share <= WEAPON_LOOK.damage.panel + 1e-9;
    if (loose && memory.panelSide == null) {
      const zones = actor.damageZones || {};
      memory.panelSide = (zones.right || 0) > (zones.left || 0) ? -1 : 1;
      rig.panelMaterial.color.copy(mesh.userData.paint?.color ?? rig.panelMaterial.color);
    }
    if (!loose) memory.panelSide = null;
    rig.panel.visible = rig.hole.visible = loose;
    if (loose) {
      const side = memory.panelSide;
      rig.panel.position.set(side * 1.0, 2.25, .75);
      // It hangs out from its one hinge and swings with the truck's motion.
      const swing = Math.sin(seconds * 7.3) * (.08 + .25 * clamp01(Math.abs(actor.speedMph || 0) / 30));
      rig.panel.rotation.set(D(-28) + swing * .6, 0, side * (D(24) + swing), 'ZXY');
      rig.hole.position.set(side * .985, 1.98, .05); rig.hole.rotation.set(0, side * Math.PI / 2, 0);
    }
    const smoking = share != null && share <= WEAPON_LOOK.damage.smoke + 1e-9, look = WEAPON_LOOK.damage;
    memory.smoking = smoking; memory.burning = wrecked && share != null;
    // Thick dark smoke rolling out of the bonnet's seams and up past the cab, and a black column off a wreck.
    if (smoking && rig.root.visible) {
      memory.smokeDue = (memory.smokeDue || 0) + dt * (wrecked ? look.wreckSmokeRate : look.smokeRate);
      for (; memory.smokeDue >= 1; memory.smokeDue--) {
        const vent = Math.random(), x = vent < .6 ? (Math.random() - .5) * .9 : (vent < .8 ? -1 : 1) * .85;
        const at = toWorld(rig, x, 2.4 + Math.random() * .2, wrecked ? .2 + Math.random() * 1.6 : 1.1 + Math.random() * .7);
        puffs.emit(at, {velocity: [(Math.random() - .5) * .8, wrecked ? 2.8 : 2.1, (Math.random() - .5) * .8], life: wrecked ? 3 : 2.4,
          from: wrecked ? 1.4 : 1, to: wrecked ? look.wreckSmokeTo : look.smokeTo, alpha: wrecked ? .88 : .74,
          color: wrecked ? look.wreckSmokeColour : look.smokeColour, rise: .6});
      }
    } else memory.smokeDue = 0;
    rig.flame.uniforms.uTime.value = seconds;
    rig.burning.forEach((tongue, i) => {
      tongue.visible = wrecked && share != null && rig.root.visible;
      if (tongue.visible) { const size = look.flame * (.8 + .14 * i) + .3 * Math.sin(seconds * 6 + i * 1.7); tongue.scale.set(size, size * 1.55, 1); }
    });
    // A thrown truck raises the dust where it lands.
    const flying = !!actor.bowlFlight;
    if (memory.flying && !flying && rig.root.visible) {
      const ground = toWorld(rig, 0, .05, 0);
      rings.emit(ground, {life: .8, from: 1.5, to: 6, alpha: .6});
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2;
        puffs.emit(ground, {velocity: [Math.cos(a) * 3.5, .8, Math.sin(a) * 3.5], life: 1.4, from: 1, to: 3.5, alpha: .55, color: 0x8c7556}); }
    }
    memory.flying = flying;
  }

  return {group, rigs,
    // `trucks` are the drawn trucks in the order of [state, ...state.opponents].
    update(state, trucks, now, enabled) {
      const fightOn = enabled && !!state?.bowlNight && !!trucks;
      const dt = lastNow == null || state?.paused ? 0 : Math.min(.1, Math.max(0, (now - lastNow) * .001));
      lastNow = now;
      const seconds = now * .001, fight = state?.bowlNight?.event?.type === 'lastTruckRolling', running = state?.status === 'racing';
      const actors = fightOn ? [state, ...(state.opponents || [])] : [], live = new Set();
      group.visible = fightOn;
      actors.forEach((actor, index) => {
        const mesh = trucks[index];
        if (!mesh || !actor) return;
        const look = truckLook(actor, index === 0, fight);
        if (!look) return;
        let rig = rigs.get(mesh);
        if (rig && rig.look.key !== look.key) { disposeRig(rig, mesh, retire); rig = null; }
        if (!rig) {
          rig = buildRig(look, mesh); group.add(rig.root); if (rig.sparks) group.add(rig.sparks);
          rigs.set(mesh, rig); group.userData.builds++;
        }
        live.add(mesh);
        rig.root.visible = !!mesh.visible;
        mesh.updateMatrix();
        worldMatrix.copy(mesh.matrix);
        if (mesh.parent && !mesh.parent.isScene) { mesh.parent.updateWorldMatrix(true, false); worldMatrix.premultiply(mesh.parent.matrixWorld); }
        rig.root.matrix.copy(worldMatrix); rig.root.matrixWorldNeedsUpdate = true;
        rig.wear.follow(rig.root);
        // A wrecked truck, or any truck once the event is over, uses no weapon: the rules stop its clock wherever it was.
        rig.weapon = running && !actor.combatWrecking ? actor.bowlWeapon : null;
        if (rig.built.hammer) stepHammer(rig, actor, dt, seconds);
        if (rig.built.saw) stepSaw(rig, actor, dt, seconds);
        if (rig.built.launcher) stepLauncher(rig, actor, dt, seconds);
        if (rig.built.horn) stepHorn(rig, actor, dt);
        if (rig.breath.length) stepFire(rig, actor, dt, seconds);
        if (rig.built.tail) stepTail(rig, actor, seconds);
        // Big Kettle's chimney: steam and soot, thicker while its hammer rises.
        if (rig.built.kettle && rig.root.visible && Math.random() < dt * (rig.weapon?.phase === 'tell' ? 24 : 6))
          puffs.emit(toWorld(rig, -.74, 4.85, -1.95), {velocity: [0, 1.5, 0], life: 1.6, from: .35, to: 1.8, alpha: .4,
            color: Math.random() < .5 ? 0xb8b6b0 : 0x2a2724, rise: .5});
        stepDamage(rig, actor, mesh, dt, seconds);
      });
      for (const [mesh, rig] of rigs) if (!live.has(mesh)) {
        disposeRig(rig, mesh, retire); rigs.delete(mesh);
      }
      hitSparks.visible = flash.visible = fightOn && seconds < hitUntil;
      if (hitSparks.visible) {
        hitSparks.userData.place(seconds * 2.2, hitAt, hitOut, 0);
        const t = (seconds - hitStart) / (hitUntil - hitStart);
        flash.position.copy(hitAt); flash.position.y += .4;
        flash.scale.setScalar(3 + 3.5 * easeOut(t));
        flash.material.uniforms.uFade.value = (1 - t) ** 1.2;
      }
      if (!fightOn) { puffs.clear(); rings.clear(); }
      puffs.step(dt); rings.step(dt);
    },
    dispose() {
      for (const [mesh, rig] of rigs) disposeRig(rig, mesh);
      rigs.clear();
      group.removeFromParent();
      group.traverse(node => { if (node.isPoints) { node.geometry.dispose(); node.material.dispose(); } });
      puffs.material.dispose(); puffs.card.dispose(); rings.geometry.dispose(); flash.geometry.dispose(); flash.material.dispose();
      rings.rings.forEach(ring => ring.mesh.material.dispose());
    },
  };
}

// The choosing card's three pictures, drawn from the weapons as they are built above: side views on scorched dirt,
// the weapon filling the right of the frame.
const frame = (id, body) => `<svg viewBox="0 0 120 80" width="132" height="88" role="img" aria-hidden="true" class="bowl-weapon-picture">
<defs><linearGradient id="bw-sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2723"/><stop offset="1" stop-color="#16130f"/></linearGradient></defs>
<rect width="120" height="80" rx="6" fill="url(#bw-sky-${id})"/><rect y="66" width="120" height="14" fill="#5a4833"/><path d="M0 66h120" stroke="#7a6548" stroke-width="1.5"/>${body}</svg>`;
// The show truck from the side, facing right, its nose at x = 64.
const truck = `<g stroke="#15120f" stroke-width="1.4"><circle cx="18" cy="55" r="11" fill="#1d1b1a"/><circle cx="50" cy="55" r="11" fill="#1d1b1a"/>
<circle cx="18" cy="55" r="4.5" fill="#9bd12c" stroke-width="1"/><circle cx="50" cy="55" r="4.5" fill="#9bd12c" stroke-width="1"/>
<path d="M4 46v-9h16l5 -12h20l6 12h13v9z" fill="#5d3d8e"/><path d="M27 27h16l4 9h-24z" fill="#a8bcc0" opacity=".6"/>
<path d="M6 41h56" stroke="#9bd12c" stroke-width="2"/></g>`;
const sawTeeth = (() => {
  const points = [];
  for (let i = 0; i < 20; i++) {
    const a = i / 20 * Math.PI * 2, b = (i + .55) / 20 * Math.PI * 2;
    points.push(`${(Math.cos(a) * 13).toFixed(1)},${(Math.sin(a) * 13).toFixed(1)}`, `${(Math.cos(b) * 17).toFixed(1)},${(Math.sin(b) * 17).toFixed(1)}`);
  }
  return points.join(' ');
})();
export const WEAPON_PICTURES = Object.freeze({
  hammer: frame('hammer', `${truck}<path d="M58 37l2 -9h6l2 9z" fill="#26221f" stroke="#15120f"/>
<path d="M44 10a40 40 0 0 1 58 30" stroke="#d8c7a4" stroke-width="1.2" fill="none" stroke-dasharray="3 3" opacity=".7"/>
<path d="M63 28l30 26" stroke="#15120f" stroke-width="8" stroke-linecap="round"/><path d="M63 28l30 26" stroke="#7a4a2c" stroke-width="5" stroke-linecap="round"/>
<g transform="rotate(41 96 57)"><rect x="85" y="47" width="22" height="18" rx="2" fill="#2b2622" stroke="#15120f" stroke-width="1.4"/>
<rect x="83" y="62" width="26" height="5" fill="#a6a9a8" stroke="#15120f"/><path d="M92 47l4 -9l4 9z" fill="#a6a9a8" stroke="#15120f"/><rect x="85" y="51" width="22" height="3" fill="#7a4a2c"/></g>
<path d="M78 72c8 -6 26 -6 34 0" stroke="#c9ae7d" stroke-width="2.2" fill="none"/><path d="M73 77c11 -8 35 -8 46 0" stroke="#c9ae7d" stroke-width="1.6" fill="none" opacity=".6"/>`),
  saw: frame('saw', `${truck}<path d="M62 40l16 4v8l-16 2z" fill="#3a3632" stroke="#15120f"/>
<g transform="translate(88 46)"><circle r="20" fill="#ff6a1a" opacity=".25"/><polygon points="${sawTeeth}" fill="#b4b9bb" stroke="#15120f" stroke-width="1"/>
<circle r="12" fill="none" stroke="#e48a3a" stroke-width="2" opacity=".8"/><circle r="4" fill="#26221f"/><circle cx="7" cy="-3" r="2.2" fill="#26221f"/><circle cx="-6" cy="5" r="2.2" fill="#26221f"/>
<path d="M-17 -6a19 19 0 0 1 22 -13" stroke="#7a4a2c" stroke-width="5" fill="none" stroke-linecap="round"/></g>
<g stroke="#ffc35a" stroke-width="2" stroke-linecap="round"><path d="M106 52l11 -7"/><path d="M106 56l13 0"/><path d="M104 47l9 -12"/><path d="M103 60l10 8"/><path d="M108 50l7 -2"/></g>`),
  launcher: frame('launcher', `<g transform="rotate(-28 96 26)"><circle cx="86" cy="32" r="7" fill="#1d1b1a" stroke="#15120f"/><circle cx="108" cy="32" r="7" fill="#1d1b1a" stroke="#15120f"/>
<path d="M76 26v-6h9l4 -8h13l4 8h6v6z" fill="#7b3b22" stroke="#15120f" stroke-width="1.3"/></g>
<path d="M92 46l3 -6M100 50l6 -3M86 42l-1 -6" stroke="#d8c7a4" stroke-width="1.4" stroke-linecap="round"/>
${truck}<path d="M64 62l20 -22" stroke="#15120f" stroke-width="8" stroke-linecap="round"/><path d="M64 62l20 -22" stroke="#8f9496" stroke-width="5" stroke-linecap="round"/>
<path d="M62 50l8 6" stroke="#d2d6d8" stroke-width="3"/><g fill="#d4d6d4" opacity=".75"><circle cx="70" cy="66" r="5"/><circle cx="61" cy="64" r="4"/><circle cx="78" cy="64" r="3.5"/></g>
<circle cx="12" cy="31" r="6" fill="#e4ddc8" stroke="#8c7038" stroke-width="2"/><path d="M12 31l3.5 -3" stroke="#1a1410" stroke-width="1.4"/>`),
});
