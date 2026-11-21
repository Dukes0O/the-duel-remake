import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {SHOW_WEAPONS} from './bowl-weapons.js';
import {createFlameMaterial, createScrapWear, createSmokeMaterial, createSparks} from '../world/scrap-look.js';

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
  // Health at which a truck shows its damage: a loose panel, smoke, and fire.
  damage: Object.freeze({panel: 3 / 5, smoke: 1 / 5}),
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
// The disc stands high enough that its top half shows over the bonnet from the driver's camera.
const SAW_CENTRE = [0, 1.78, 2.95], SAW_RADIUS = .62;
function buildSaw(root, m) {
  const fixed = batch(), [, cy, cz] = SAW_CENTRE;
  for (const side of [-1, 1]) {
    const cheek = new THREE.Shape();
    cheek.moveTo(-.95, -.12); cheek.lineTo(.08, -.14); cheek.lineTo(.12, .12); cheek.lineTo(-.95, .2); cheek.closePath();
    fixed.add(m.steel, plateGeometry(cheek, .05), [side * .1, cy, cz]);
    fixed.bolts(m.worn, [[side * .13, cy, cz - .7], [side * .13, cy + .05, cz - .45]], [0, 0, Math.PI / 2], .028);
  }
  fixed.box(m.dark, [.5, .28, .55], [0, cy - .02, 2.05], [0, 0, 0], .04);
  for (const side of [-1, 1]) fixed.tube(m.dark, [[side * .45, 1.25, 1.8], [side * .2, cy - .25, 2.25], [side * .1, cy - .1, 2.6]], .05, 6, 6);
  fixed.cyl(m.worn, .05, .05, .32, [0, cy, cz], [0, 0, Math.PI / 2], 10);
  // The guard: a curved plate over the disc's top and back, open at the front and below where it cuts.
  const guard = new THREE.Shape();
  guard.absarc(0, 0, SAW_RADIUS + .12, D(60), D(215), false);
  guard.absarc(0, 0, SAW_RADIUS + .05, D(215), D(60), true);
  fixed.add(m.rust, plateGeometry(guard, .16), [0, cy, cz]);
  fixed.cyl(m.dark, .16, .16, .34, [.3, cy, cz], [0, 0, Math.PI / 2], 14);
  fixed.box(m.dark, [.12, .36, .36], [.47, cy, cz], [0, 0, 0], .03);
  fixed.tube(m.hose, [[.47, cy + .18, cz], [.55, cy + .4, cz - .4], [.6, 2.3, 1.9]], .028, 8, 6);
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
  for (const x of [-.03, .03]) {
    const blur = new THREE.Mesh(blurGeometry, blurMaterial);
    blur.name = 'Saw blur'; blur.position.set(x, cy, cz); blur.renderOrder = 4; root.add(blur);
  }
  return {spinner, blurMaterial, blurGeometry};
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
  if (look.weapon === 'saw') rig.built.saw = buildSaw(root, m);
  if (look.weapon === 'launcher') rig.built.launcher = buildLauncher(root, m);
  // Fire: tongues for the dragon's breath and for a burning truck, sharing one flame picture.
  rig.flame = createFlameMaterial();
  rig.breath = look.weapon === 'fire' ? [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => {
    const tongue = flameTongue(rig.flame, `Dragon breath ${i + 1}`); root.add(tongue); return tongue; }) : [];
  rig.burning = [[.45, 2.2, 1.2], [-.5, 2.3, .1], [.2, 2.4, -1.4]].map((place, i) => {
    const tongue = flameTongue(rig.flame, `Burning truck ${i + 1}`); tongue.position.set(...place); root.add(tongue); return tongue; });
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

function disposeRig(rig, mesh) {
  rig.root.removeFromParent();
  const used = new Set(rig.materialList);
  rig.root.traverse(node => { if (node.isMesh) { node.geometry?.dispose?.(); used.add(node.material); } });
  for (const material of used) { material.map?.dispose?.(); material.dispose?.(); }
  rig.flame.dispose();
  rig.built.saw?.blurMaterial.dispose();
  rig.built.snout?.eyes.dispose();
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

export function createBowlWeaponsView() {
  const group = new THREE.Group(); group.name = 'Bowl weapons and damage';
  const puffs = createPuffs(), rings = createRings(), cutSparks = new Map();
  const hitSparks = createSparks(36); hitSparks.name = 'Hammer hit sparks'; hitSparks.visible = false;
  group.add(puffs.group, rings.group, hitSparks);
  const rigs = new Map();
  let lastNow = null, hitUntil = 0, hitAt = new THREE.Vector3(), hitOut = new THREE.Vector3();
  group.userData.builds = 0;
  const v = new THREE.Vector3(), w = new THREE.Vector3(), forward = new THREE.Vector3(), worldMatrix = new THREE.Matrix4();
  const toWorld = (rig, x, y, z, target = v) => target.set(x, y, z).applyMatrix4(rig.root.matrix);

  function sparksFor(rig) {
    let sparks = cutSparks.get(rig);
    if (!sparks) { sparks = createSparks(54); sparks.name = 'Saw sparks'; sparks.visible = false; group.add(sparks); cutSparks.set(rig, sparks); }
    return sparks;
  }

  function stepHammer(rig, actor, seconds) {
    const built = rig.built.hammer, memory = rig.memory, weapon = actor.bowlWeapon;
    const angle = hammerAngle(weapon, memory, actor.bowlHeldStill || 0);
    // A slight tremble while it is raised, so that the tell reads even when the arm is seen end on.
    built.pivot.rotation.x = -angle + (weapon?.phase === 'tell' ? D(1.2) * Math.sin(seconds * 55) : 0);
    if (weapon?.phase === 'rest') {
      const elapsed = SHOW_WEAPONS.hammer.rest - weapon.time;
      if (!memory.landed && elapsed >= WEAPON_LOOK.hammer.slam) {
        memory.landed = true;
        // Where the face lands: on a truck's body for a hit, in the dirt for a miss.
        const end = memory.missed ? WEAPON_LOOK.hammer.miss : WEAPON_LOOK.hammer.hit;
        const [, py, pz] = HAMMER_PIVOT, r = HAMMER_REACH;
        const fy = py + r * Math.sin(end) - .8 * Math.cos(end), fz = pz + r * Math.cos(end) + .8 * Math.sin(end);
        toWorld(rig, 0, fy, fz, hitAt);
        forward.set(0, 0, 1).transformDirection(rig.root.matrix);
        if (memory.missed) {
          const ground = toWorld(rig, 0, .05, fz, w);
          rings.emit(ground, {life: .7, from: .6, to: 4.6, alpha: .7});
          for (let i = 0; i < 9; i++) {
            const a = i / 9 * Math.PI * 2;
            puffs.emit(ground, {velocity: [Math.cos(a) * 4.5, 1.2 + (i % 3) * .5, Math.sin(a) * 4.5], life: 1.3, from: .8, to: 3.2, alpha: .55, color: 0x8c7556});
          }
        } else {
          hitUntil = seconds + .3; hitOut.copy(forward);
          rings.emit(toWorld(rig, 0, .05, fz, w), {life: .45, from: .5, to: 3, alpha: .35});
          for (let i = 0; i < 4; i++) puffs.emit(hitAt, {velocity: [(i - 1.5) * 1.5, 1.5, 0], life: .8, from: .5, to: 1.6, alpha: .4, color: 0x5e5248});
        }
      }
    } else memory.landed = false;
    if (weapon?.phase !== 'tell') memory.tellTotal = 0;
    memory.lastPhase = weapon?.phase;
  }

  function stepSaw(rig, actor, dt, seconds) {
    const built = rig.built.saw, memory = rig.memory, weapon = actor.bowlWeapon, look = WEAPON_LOOK.saw;
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
    built.blurMaterial.uniforms.uHeat.value = heat;
    const sparks = sparksFor(rig);
    sparks.visible = !!weapon?.cutting && weapon.phase === 'active' && rig.root.visible;
    if (sparks.visible) {
      const [, cy, cz] = SAW_CENTRE;
      forward.set(0, 0, 1).transformDirection(rig.root.matrix);
      sparks.userData.place(seconds, toWorld(rig, 0, cy - .2, cz + SAW_RADIUS * .9), forward, 0);
    }
    // A cooling disc smokes.
    if (weapon?.phase === 'rest' && rig.root.visible && Math.random() < dt * 9) {
      const [, cy, cz] = SAW_CENTRE;
      puffs.emit(toWorld(rig, 0, cy + .4, cz), {velocity: [0, .8, 0], life: 1.2, from: .25, to: 1.1, alpha: .35, color: 0x9a9894, rise: .6});
    }
  }

  function stepLauncher(rig, actor, dt, seconds) {
    const built = rig.built.launcher, memory = rig.memory, weapon = actor.bowlWeapon;
    const pose = launcherPose(weapon, seconds);
    built.pivot.rotation.x = -pose.angle;
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
    const built = rig.built.horn, weapon = actor.bowlWeapon, memory = rig.memory;
    let dip = 0;
    if (weapon?.phase === 'tell') {
      memory.tellTotal = Math.max(memory.tellTotal || 0, weapon.time, 1e-3);
      dip = easeOut(1 - weapon.time / memory.tellTotal) * WEAPON_LOOK.horn.dip;
      // Snorts from the nose as it lowers its horn to charge.
      if (rig.root.visible && Math.random() < dt * 14) for (const side of [-1, 1])
        puffs.emit(toWorld(rig, side * .45, 1.7, 2.4), {velocity: [side * 1.2, .2, 2], life: .5, from: .3, to: 1.2, alpha: .22, color: 0x9d968a});
    } else memory.tellTotal = 0;
    built.pivot.rotation.x = dip;
  }

  function stepFire(rig, actor, dt, seconds) {
    const weapon = actor.bowlWeapon, burning = weapon?.phase === 'active', pilot = weapon?.phase === 'tell';
    rig.flame.uniforms.uTime.value = seconds;
    rig.breath.forEach((tongue, i) => {
      tongue.visible = (burning || pilot && i === 0) && rig.root.visible;
      if (!tongue.visible) return;
      // The breath: tongues laid along the nozzle's line out to six metres, larger as they go.
      const reach = pilot ? .1 : i / (rig.breath.length - 1);
      const size = pilot ? .45 + .1 * Math.sin(seconds * 30) : 1.1 + reach * 2.9;
      tongue.position.set(Math.sin(seconds * 9 + i) * .2 * reach, 1.9 + reach * .5 - size * .4, 2.85 + reach * 5.6);
      tongue.scale.set(size, size * (1.25 + .25 * Math.sin(seconds * 17 + i * 2)), 1);
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
    const smoking = share != null && share <= WEAPON_LOOK.damage.smoke + 1e-9;
    memory.smoking = smoking; memory.burning = wrecked && share != null;
    if (smoking && rig.root.visible && Math.random() < dt * (wrecked ? 26 : 12)) {
      const at = toWorld(rig, (Math.random() - .5) * .8, 2.45, 1.4);
      puffs.emit(at, {velocity: [(Math.random() - .5) * .6, 1.4, (Math.random() - .5) * .6], life: wrecked ? 2.6 : 1.8,
        from: .5, to: wrecked ? 3.6 : 2.4, alpha: wrecked ? .7 : .5, color: wrecked ? 0x141210 : 0x2c2926, rise: .5});
    }
    rig.flame.uniforms.uTime.value = seconds;
    rig.burning.forEach((tongue, i) => {
      tongue.visible = wrecked && share != null && rig.root.visible;
      if (tongue.visible) { const size = 1.5 + .5 * i + .25 * Math.sin(seconds * 6 + i); tongue.scale.set(size, size * 1.5, 1); }
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
      const seconds = now * .001, fight = state?.bowlNight?.event?.type === 'lastTruckRolling';
      const actors = fightOn ? [state, ...(state.opponents || [])] : [], live = new Set();
      group.visible = fightOn;
      actors.forEach((actor, index) => {
        const mesh = trucks[index];
        if (!mesh || !actor) return;
        const look = truckLook(actor, index === 0, fight);
        if (!look) return;
        let rig = rigs.get(mesh);
        if (rig && rig.look.key !== look.key) { disposeRig(rig, mesh); rig = null; }
        if (!rig) { rig = buildRig(look, mesh); group.add(rig.root); rigs.set(mesh, rig); group.userData.builds++; }
        live.add(mesh);
        rig.root.visible = !!mesh.visible;
        mesh.updateMatrix();
        worldMatrix.copy(mesh.matrix);
        if (mesh.parent && !mesh.parent.isScene) { mesh.parent.updateWorldMatrix(true, false); worldMatrix.premultiply(mesh.parent.matrixWorld); }
        rig.root.matrix.copy(worldMatrix); rig.root.matrixWorldNeedsUpdate = true;
        rig.wear.follow(rig.root);
        if (rig.built.hammer) stepHammer(rig, actor, seconds);
        if (rig.built.saw) stepSaw(rig, actor, dt, seconds);
        if (rig.built.launcher) stepLauncher(rig, actor, dt, seconds);
        if (rig.built.horn) stepHorn(rig, actor, dt);
        if (rig.breath.length) stepFire(rig, actor, dt, seconds);
        if (rig.built.tail) stepTail(rig, actor, seconds);
        // Big Kettle's chimney: steam and soot, thicker while its hammer rises.
        if (rig.built.kettle && rig.root.visible && Math.random() < dt * (actor.bowlWeapon?.phase === 'tell' ? 24 : 6))
          puffs.emit(toWorld(rig, -.74, 4.85, -1.95), {velocity: [0, 1.5, 0], life: 1.6, from: .35, to: 1.8, alpha: .4,
            color: Math.random() < .5 ? 0xb8b6b0 : 0x2a2724, rise: .5});
        stepDamage(rig, actor, mesh, dt, seconds);
      });
      for (const [mesh, rig] of rigs) if (!live.has(mesh)) {
        disposeRig(rig, mesh); rigs.delete(mesh);
        cutSparks.get(rig)?.removeFromParent(); cutSparks.delete(rig);
      }
      hitSparks.visible = fightOn && seconds < hitUntil;
      if (hitSparks.visible) hitSparks.userData.place(seconds * 2.2, hitAt, hitOut, 0);
      if (!fightOn) { puffs.clear(); rings.clear(); }
      puffs.step(dt); rings.step(dt);
    },
    dispose() {
      for (const [mesh, rig] of rigs) disposeRig(rig, mesh);
      rigs.clear();
      group.removeFromParent();
      group.traverse(node => { if (node.isPoints) { node.geometry.dispose(); node.material.dispose(); } });
      puffs.material.dispose(); puffs.card.dispose(); rings.geometry.dispose();
      rings.rings.forEach(ring => ring.mesh.material.dispose());
    },
  };
}

// The choosing card's three pictures, drawn from the weapons as they are built above: side views on scorched steel.
const frame = body => `<svg viewBox="0 0 120 80" width="120" height="80" role="img" aria-hidden="true" class="bowl-weapon-picture">
<defs><linearGradient id="bw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2622"/><stop offset="1" stop-color="#141210"/></linearGradient></defs>
<rect width="120" height="80" rx="6" fill="url(#bw-sky)"/><rect y="64" width="120" height="16" fill="#4a3d2e"/><path d="M0 64h120" stroke="#6b5a44" stroke-width="1.5"/>${body}</svg>`;
const truck = `<g><circle cx="26" cy="58" r="9" fill="#1b1a19" stroke="#3a3836" stroke-width="2"/><circle cx="58" cy="58" r="9" fill="#1b1a19" stroke="#3a3836" stroke-width="2"/>
<path d="M14 47h56l4 -6h-14l-4 -9h-20l-4 9h-18z" fill="#5a4a6e" stroke="#2a2420" stroke-width="1.5"/><rect x="34" y="34" width="14" height="7" fill="#9fb3b8" opacity=".55"/></g>`;
export const WEAPON_PICTURES = Object.freeze({
  hammer: frame(`${truck}<path d="M66 40l3 -10h5l2 10z" fill="#5b6064"/><path d="M71 30l26 22" stroke="#5b6064" stroke-width="5" stroke-linecap="round"/>
<path d="M71 30l26 22" stroke="#6b4129" stroke-width="2"/><g transform="rotate(40 99 55)"><rect x="90" y="47" width="18" height="14" rx="2" fill="#26221f" stroke="#8a8f90" stroke-width="1.5"/><rect x="88" y="58" width="22" height="4" fill="#8a8f90"/></g>
<path d="M86 66c6 -5 18 -5 24 0" stroke="#b49a72" stroke-width="2" fill="none" opacity=".8"/><path d="M82 70c9 -7 27 -7 36 0" stroke="#b49a72" stroke-width="1.5" fill="none" opacity=".5"/>`),
  saw: frame(`${truck}<path d="M70 46l12 2v6l-12 2z" fill="#5b6064"/><g transform="translate(90 52)"><circle r="13" fill="#9aa0a3" stroke="#d9dcdc" stroke-width="2" stroke-dasharray="3 2"/>
<circle r="3" fill="#26221f"/><circle cx="6" cy="-4" r="2" fill="#26221f"/><circle cx="-6" cy="3" r="2" fill="#26221f"/><path d="M-12 -8a15 15 0 0 1 20 -7" stroke="#6b4129" stroke-width="4" fill="none"/></g>
<g stroke="#ffb347" stroke-width="1.5" stroke-linecap="round"><path d="M104 56l10 -6"/><path d="M103 60l12 0"/><path d="M104 52l8 -10"/><path d="M101 63l9 6"/></g>`),
  launcher: frame(`<g transform="rotate(-24 92 46)"><circle cx="82" cy="44" r="6" fill="#1b1a19"/><circle cx="104" cy="44" r="6" fill="#1b1a19"/><path d="M74 36h38l2 -5h-9l-3 -6h-14l-3 6h-11z" fill="#7b3b22" stroke="#2a2420" stroke-width="1.2"/></g>
${truck}<path d="M70 60l18 -16" stroke="#6b4129" stroke-width="5" stroke-linecap="round"/><path d="M72 58l-4 -10" stroke="#c9ced2" stroke-width="2.5"/>
<g fill="#c4c6c4" opacity=".7"><circle cx="72" cy="64" r="4"/><circle cx="66" cy="62" r="3"/><circle cx="79" cy="63" r="3"/></g><circle cx="16" cy="33" r="5" fill="#e4ddc8" stroke="#8c7038" stroke-width="1.5"/><path d="M16 33l3 -3" stroke="#1a1410" stroke-width="1.2"/>`),
});
