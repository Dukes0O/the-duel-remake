// TOWN-HAUL-LOAD-LOOK: how a haul's pieces look, on the flatbed's bed and on the ground where they fell. Drawn in code: each
// kind of piece the haul step names (src/world/jobs/steps/haul.js, HAUL_PIECES) has its own shape, so a wing rib is a wing
// rib and a pallet of plate is a pallet of plate, with wear drawn over plain colours as src/world/scrap-look.js does it.
// View only: it reads pieces and never changes race state. Its own randomness is seeded from each piece's id, so one piece
// looks the same every frame and in every replay.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeRng} from '../../rng.js';
import {scrapNoise} from '../../world/scrap-look.js';

// Colours as they should read in the Scablands' hard light, which lifts every sunlit face (docs/ART_LINE.md).
const C = Object.freeze({
  alu:0x6f7478, aluDark:0x4b4f52, primer:0x474f2e, primerPale:0x5a6140, paint:0x9c998c, stripe:0x27405f, stripeRed:0x6a2a20,
  chrome:0xb9bec3, legPaint:0x8d8b82, dark:0x1b1b1b, strap:0x3d3427, fabric:0x2c3340, pan:0x5f6263,
  scale:0x2c3035, steel:0x565a5e, bright:0x8f9396, rust:0x5a3018, rustDark:0x3c2416, timber:0x5b4830,
});
const UP = new THREE.Vector3(0, 1, 0);
const idSeed = id => [...String(id)].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);

// Every part is a plain triangle list with a colour at each corner, so that a piece is one mesh and one draw.
function paint(geometry, colour) {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  if (part !== geometry) geometry.dispose();
  part.deleteAttribute('uv');
  const count = part.attributes.position.count, data = new Float32Array(count * 3);
  const normal = part.attributes.normal, position = part.attributes.position, tone = new THREE.Color(), n = new THREE.Vector3(), p = new THREE.Vector3();
  for (let index = 0; index < count; index++) {
    const hex = typeof colour === 'function' ? colour(n.fromBufferAttribute(normal, index), p.fromBufferAttribute(position, index)) : colour;
    tone.set(hex);
    data[index * 3] = tone.r; data[index * 3 + 1] = tone.g; data[index * 3 + 2] = tone.b;
  }
  part.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return part;
}
function box(lx, ly, lz, x, y, z, colour, {yaw = 0, pitch = 0} = {}) {
  const part = new THREE.BoxGeometry(lx, ly, lz);
  if (pitch) part.rotateZ(pitch);
  if (yaw) part.rotateY(yaw);
  part.translate(x, y, z);
  return paint(part, colour);
}
function tube(a, b, radius, colour, sides = 6) {
  const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), along = to.clone().sub(from), length = along.length();
  const part = new THREE.CylinderGeometry(radius, radius, length, sides, 1, false);
  part.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, along.normalize()));
  part.translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2);
  return paint(part, colour);
}
// A flat shape with holes, `depth` thick, drawn in x and y and then laid down: its y runs along -z and its thickness is up.
function plate(shape, depth, colour, {flat = true} = {}) {
  const part = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled:false, curveSegments:8});
  if (flat) part.rotateX(-Math.PI / 2);
  return paint(part, colour);
}
const circle = (x, y, radius) => new THREE.Path().absarc(x, y, radius, 0, Math.PI * 2, true);
// A thin wire or strap round a bundle: four thin sides at `x`, from y0 to y1 and z0 to z1.
function band(x, y0, y1, z0, z1, colour = C.dark, wide = .035) {
  const t = .012;
  return [box(wide, t, z1 - z0 + t, x, y0, (z0 + z1) / 2, colour), box(wide, t, z1 - z0 + t, x, y1, (z0 + z1) / 2, colour),
    box(wide, y1 - y0, t, x, (y0 + y1) / 2, z0, colour), box(wide, y1 - y0, t, x, (y0 + y1) / 2, z1, colour)];
}
function moved(parts, {x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0} = {}) {
  const turn = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(roll, yaw, pitch, 'YZX')).setPosition(x, y, z);
  for (const part of parts) part.applyMatrix4(turn);
  return parts;
}
// Bring a group of parts down so that its lowest point is at 0 (used before a group is stacked on another).
function floor(parts) {
  let low = Infinity;
  for (const part of parts) { part.computeBoundingBox(); low = Math.min(low, part.boundingBox.min.y); }
  for (const part of parts) part.translate(0, -low, 0);
  return parts;
}

// ---- Salvage: parts of the Boneyard's airliners. Each lies with its length along x. ----

// A wing rib: the wing's own section cut from plate, with lightening holes, a flange round its edge and stiffeners.
function rib() {
  const chord = 3.1, thick = .17, steps = 14, parts = [];
  const half = t => 5 * thick * chord * (.2969 * Math.sqrt(t) - .126 * t - .3516 * t * t + .2843 * t ** 3 - .1015 * t ** 4);
  const camber = t => .05 * chord * 4 * t * (1 - t) * .5;
  const top = t => camber(t) + half(t), bottom = t => camber(t) - half(t) * .7;
  const at = index => index / steps * .92, outline = [];
  for (let index = 0; index <= steps; index++) outline.push([at(index) * chord, top(at(index))]);
  for (let index = steps; index >= 1; index--) outline.push([at(index) * chord, bottom(at(index))]);
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
  const holes = [.11, .25, .40, .55, .69, .81];
  for (const t of holes) shape.holes.push(circle(t * chord, (top(t) + bottom(t)) / 2, (top(t) - bottom(t)) * .33));
  parts.push(plate(shape, .018, C.primer).translate(0, .036, 0));
  // The flange: a strip of the same sheet turned up all round the edge.
  for (let index = 0; index < outline.length; index++) {
    const [x0, y0] = outline[index], [x1, y1] = outline[(index + 1) % outline.length], length = Math.hypot(x1 - x0, y1 - y0);
    parts.push(box(length + .01, .09, .014, (x0 + x1) / 2, .045, -(y0 + y1) / 2, C.alu, {yaw:Math.atan2(y1 - y0, x1 - x0)}));
  }
  for (let index = 0; index < holes.length - 1; index++) {
    const t = (holes[index] + holes[index + 1]) / 2;
    parts.push(box(.016, .05, (top(t) - bottom(t)) * .92, t * chord, .075, -(top(t) + bottom(t)) / 2, C.primerPale));
  }
  return parts;
}

// A floor beam: an I-beam with round holes through its web and a stiffener between each pair.
function beam() {
  const length = 3.0, deep = .2, parts = [];
  const shape = new THREE.Shape([[0, 0], [length, 0], [length, deep], [0, deep]].map(([x, y]) => new THREE.Vector2(x, y)));
  for (let x = .32; x < length - .2; x += .47) shape.holes.push(circle(x, deep / 2, .058));
  parts.push(plate(shape, .014, C.primer, {flat:false}).translate(0, .014, -.007));
  parts.push(box(length, .014, .13, length / 2, .007, 0, C.alu), box(length, .014, .13, length / 2, deep + .021, 0, C.alu));
  for (let x = .085; x < length; x += .47) parts.push(box(.012, deep, .11, x, deep / 2 + .014, 0, C.primerPale));
  return parts;
}

// A piece of wing spar: a deep girder that tapers, thick caps top and bottom, stiffeners down one face, bolt holes at the root.
function spar() {
  const length = 3.3, rootDeep = .52, tipDeep = .38, parts = [];
  const lower = x => (rootDeep - tipDeep) / 2 * x / length, upper = x => rootDeep - lower(x);
  const shape = new THREE.Shape([[0, lower(0)], [length, lower(length)], [length, upper(length)], [0, upper(0)]].map(([x, y]) => new THREE.Vector2(x, y)));
  parts.push(plate(shape, .024, C.primer).translate(0, .1, 0));
  const slope = Math.atan2(lower(length), length), run = Math.hypot(length, lower(length));
  // Laid flat, the caps stand up along both long edges and the stiffeners run across between them.
  parts.push(box(run, .22, .05, length / 2, .11, -(lower(0) + lower(length)) / 2, C.alu, {yaw:slope}));
  parts.push(box(run, .22, .05, length / 2, .11, -(upper(0) + upper(length)) / 2, C.alu, {yaw:-slope}));
  for (let x = .42; x < length - .1; x += .36) parts.push(box(.016, .08, upper(x) - lower(x) - .08, x, .16, -rootDeep / 2, C.primerPale));
  parts.push(box(.34, .03, rootDeep - .1, .2, .135, -rootDeep / 2, C.aluDark));
  for (const x of [.11, .29]) for (let z = -.1; z > -rootDeep + .08; z -= .085) parts.push(tube([x, .15, z], [x, .168, z], .02, C.dark));
  return parts;
}

// One fuselage skin panel, outside up: curved as the fuselage was, white paint with a faded stripe through its window row,
// green primer and stringers inside.
function skinSheet({windows, stripe, length = 2.5, width = 1.15}) {
  const radius = 1.9, thick = .012, row = .25, parts = [];
  const face = normal => normal.y > .5 ? C.paint : normal.y < -.5 ? C.primer : C.alu;
  const rowFace = normal => normal.y > .5 ? stripe : normal.y < -.5 ? C.primer : C.alu;
  const shape = new THREE.Shape([[-length / 2, -row], [length / 2, -row], [length / 2, row], [-length / 2, row]].map(([x, y]) => new THREE.Vector2(x, y)));
  if (windows) for (let x = -1; x <= 1.01; x += .5) {
    const w = .125, h = .17, r = .08, hole = new THREE.Path();
    hole.moveTo(x - w + r, -h).lineTo(x + w - r, -h).absarc(x + w - r, -h + r, r, -Math.PI / 2, 0, false)
      .lineTo(x + w, h - r).absarc(x + w - r, h - r, r, 0, Math.PI / 2, false).lineTo(x - w + r, h)
      .absarc(x - w + r, h - r, r, Math.PI / 2, Math.PI, false).lineTo(x - w, -h + r).absarc(x - w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
    shape.holes.push(hole);
  }
  parts.push(plate(shape, thick, rowFace));
  for (const side of [-1, 1]) {
    const z0 = side * row, z1 = side * width / 2, slab = new THREE.BoxGeometry(length, thick, Math.abs(z1 - z0), 1, 1, 4);
    slab.translate(0, thick / 2, (z0 + z1) / 2);
    parts.push(paint(slab, face));
    for (const z of [.36, .5]) parts.push(box(length - .04, .03, .022, 0, -.015, side * z, C.primerPale));
  }
  return bendRound(parts, radius, width);
}
// Bend flat parts round the fuselage's radius, edges down: a part `width` wide keeps its edges at the height they had.
function bendRound(parts, radius, width) {
  const sag = radius * (1 - Math.cos(width / 2 / radius));
  for (const part of parts) {
    const position = part.attributes.position;
    for (let index = 0; index < position.count; index++) {
      const y = position.getY(index), angle = position.getZ(index) / radius;
      position.setY(index, (radius + y) * Math.cos(angle) - radius + sag);
      position.setZ(index, (radius + y) * Math.sin(angle));
    }
    part.computeVertexNormals();
  }
  return parts;
}
// A bundle of skin panels: five sheets nested and strapped; fallen, the strap has gone and they lie fanned out, some face down.
function skin(rng, fallen) {
  const parts = [];
  for (let index = 0; index < 5; index++) {
    const top = index === 4, sheet = skinSheet({windows:top || index % 2 === 0, stripe:index % 2 ? C.stripeRed : C.stripe});
    if (!fallen) parts.push(...moved(sheet, {x:rng.range(-.07, .07), y:.03 + index * .042, z:rng.range(-.03, .03), yaw:rng.range(-.03, .03)}));
    else {
      const over = index % 2 === 1;
      parts.push(...moved(floor(moved(sheet, {roll:over ? Math.PI : 0})),
        {x:rng.range(-.7, .7), y:index * .05, z:(index - 2) * .62 + rng.range(-.15, .15), yaw:rng.range(-.5, .5)}));
    }
  }
  // Two webbing straps over the bundle, following its curve, and down its edges.
  if (!fallen) for (const x of [-.85, .85]) {
    parts.push(...bendRound([paint(new THREE.BoxGeometry(.05, .008, 1.17, 1, 1, 6).translate(x, .218, 0), C.strap)], 1.9, 1.15));
    for (const z of [-.572, .572]) parts.push(box(.05, .2, .008, x, .1, z, C.strap));
  }
  return parts;
}

// One stripped row of three seats, folded flat as the gang stacks them: the backs down on the bare pans, the legs and the
// arm rests laid over, two spreader tubes the width of the row. A few pans and backs still carry a scrap of cloth.
function seatRow(rng) {
  const parts = [];
  for (const z of [.16, -.16]) parts.push(tube([-.76, .03, z], [.76, .03, z], .026, C.alu));
  for (const x of [-.5, 0, .5]) {
    parts.push(box(.44, .028, .44, x, .07, 0, rng.chance(.25) ? C.fabric : C.pan));
    const cloth = rng.chance(.3) ? C.fabric : C.pan;
    parts.push(paint(new THREE.BoxGeometry(.42, .03, .6).translate(x, .105, -.17), normal => normal.y > .5 ? cloth : C.pan));
  }
  for (const x of [-.48, .48]) parts.push(tube([x, .03, .14], [x, .03, .52], .021, C.aluDark), tube([x + .05, .03, -.14], [x + .05, .03, .5], .021, C.aluDark),
    tube([x, .03, .52], [x + .05, .03, .5], .018, C.aluDark));
  for (const x of [-.75, -.25, .25, .75]) parts.push(tube([x, .135, -.44], [x, .135, .2], .02, C.aluDark));
  return parts;
}
// A stack of seat frames: three folded rows laid one on another, turned end for end; fallen, they lie apart, one on its edge.
function seats(rng, fallen) {
  const parts = [];
  for (let index = 0; index < 3; index++) {
    const row = floor(moved(seatRow(rng), {yaw:index % 2 ? Math.PI : 0}));
    if (!fallen) parts.push(...moved(row, {x:rng.range(-.06, .06), y:index * .158, z:rng.range(-.05, .05), yaw:rng.range(-.05, .05)}));
    else parts.push(...moved(index === 1 ? floor(moved(row, {roll:1.15})) : row,
      {x:rng.range(-.4, .4), z:(index - 1) * 1.05 + rng.range(-.1, .1), yaw:rng.range(-.7, .7)}));
  }
  return parts;
}

// A landing-gear leg, stripped of its wheels: the painted cylinder, the bright piston, the axle with its brake flanges,
// the trunnion it swung on, the torque links and the stub of a brace.
function gear() {
  const parts = [], white = C.legPaint;
  parts.push(tube([-.9, 0, 0], [.3, 0, 0], .15, white, 10), tube([-.95, 0, 0], [-.86, 0, 0], .175, C.aluDark, 10), tube([.24, 0, 0], [.32, 0, 0], .17, C.aluDark, 10));
  parts.push(tube([-.85, 0, -.34], [-.85, 0, .34], .085, white, 8), tube([.3, 0, 0], [.96, 0, 0], .085, C.chrome, 10));
  parts.push(tube([.99, 0, -.38], [.99, 0, .38], .075, C.steel, 8));
  for (const z of [-.27, .27]) parts.push(tube([.99, 0, z - .03], [.99, 0, z + .03], .17, C.rust, 10), tube([.99, 0, z - .09], [.99, 0, z + .09], .1, C.rustDark, 8));
  parts.push(box(.44, .13, .04, .44, 0, -.26, white, {yaw:.42}), box(.4, .13, .04, .79, 0, -.25, white, {yaw:-.5}), tube([.62, -.09, -.34], [.62, .09, -.34], .03, C.steel));
  parts.push(tube([-.55, 0, .14], [.0, 0, .4], .05, white), tube([-.8, .165, .03], [.25, .165, .03], .012, C.dark), tube([-.8, .15, -.07], [.25, .15, -.07], .012, C.dark));
  return parts;
}

// ---- Steel: Tin Town's plate, angle, rail and bar. ----

// A pallet of steel plate: four sheets on two timber bearers; fallen, the sheets have slid apart.
function steelPlate(rng, fallen) {
  const parts = [];
  if (!fallen) for (const x of [-.6, .6]) parts.push(box(.1, .09, 1.02, x, .045, 0, C.timber));
  for (let index = 0; index < 4; index++) {
    const sheet = [box(2, .02, 1, 0, .01, 0, C.scale)];
    if (!fallen) parts.push(...moved(sheet, {x:rng.range(-.04, .04), y:.09 + index * .027, z:rng.range(-.03, .03), yaw:rng.range(-.025, .025)}));
    else parts.push(...moved(sheet, {x:rng.range(-.5, .5), y:index * .024, z:(index - 1.5) * .55, yaw:rng.range(-.45, .45)}));
  }
  return parts;
}
// A bundle of angle iron: eight lengths nested in two rows and wired; fallen, the wire has burst.
function angle(rng, fallen) {
  const parts = [];
  for (let index = 0; index < 8; index++) {
    const length = rng.range(2.8, 3.1), iron = [box(length, .009, .075, 0, .0045, 0, C.steel), box(length, .075, .009, 0, .0375, -.033, C.steel)];
    const nest = index % 4, row = Math.floor(index / 4);
    if (!fallen) parts.push(...moved(iron, {x:rng.range(-.06, .06), y:.012 + nest * .021, z:(row - .5) * .16 + nest * .021 - .03}));
    else parts.push(...moved(iron, {x:rng.range(-.3, .3), y:(index % 3) * .03, z:(index - 3.5) * .16, yaw:rng.range(-.3, .3)}));
  }
  if (!fallen) for (const x of [-.95, .95]) parts.push(...band(x, .004, .16, -.16, .17));
  return parts;
}
// A length of old rail: the flat-bottomed section, bright where the wheels ran, with a fishplate still bolted to one end.
function rail() {
  const length = 3.3, section = [[-.075, 0], [.075, 0], [.075, .014], [.012, .03], [.011, .118], [.037, .128], [.037, .165], [-.037, .165], [-.037, .128], [-.011, .118], [-.012, .03], [-.075, .014]];
  const part = new THREE.ExtrudeGeometry(new THREE.Shape(section.map(([x, y]) => new THREE.Vector2(x, y))), {depth:length, bevelEnabled:false});
  part.rotateY(Math.PI / 2); part.translate(-length / 2, 0, 0);
  const parts = [paint(part, (normal, position) => normal.y > .7 && position.y > .15 ? C.bright : C.rust)];
  for (const z of [-.024, .024]) parts.push(box(.52, .075, .02, length / 2 - .3, .075, z, C.rustDark));
  for (const x of [-.18, -.06, .06, .18]) parts.push(tube([length / 2 - .3 + x, .075, -.05], [length / 2 - .3 + x, .075, .05], .017, C.dark));
  return parts;
}
// A bundle of steel bar: fourteen round bars wired together; fallen, they lie like dropped sticks.
function bar(rng, fallen) {
  const parts = [], rows = [5, 4, 5];
  let index = 0;
  for (let row = 0; row < rows.length; row++) for (let n = 0; n < rows[row]; n++, index++) {
    const length = rng.range(2.95, 3.2), tone = rng.chance(.3) ? C.steel : C.rust, shift = rng.range(-.07, .07);
    if (!fallen) parts.push(tube([-length / 2 + shift, .024 + row * .04, (n - (rows[row] - 1) / 2) * .046], [length / 2 + shift, .024 + row * .04, (n - (rows[row] - 1) / 2) * .046], .022, tone, 5));
    else parts.push(...moved([tube([-length / 2, .022, 0], [length / 2, .022, 0], .022, tone, 5)],
      {x:rng.range(-.35, .35), y:(index % 3) * .035, z:(index - 6.5) * .11, yaw:rng.range(-.28, .28)}));
  }
  if (!fallen) for (const x of [-1, 1]) parts.push(...band(x, .002, .13, -.125, .125, C.dark, .03));
  return parts;
}

const BUILDERS = Object.freeze({skin, rib:() => rib(), beam:() => beam(), seats, gear:() => gear(), spar:() => spar(),
  plate:steelPlate, angle, rail:() => rail(), bar});
// The share of a piece's height that the heap grows by: open frames and round legs let what is thrown on them settle in.
const FILL = Object.freeze({seats:.85, gear:.7, skin:.85, beam:.9});
// A kind the haul step may one day name that has no drawing here: a strapped bundle of plain sections, never a bare box.
const unknown = (rng, fallen) => bar(rng, fallen);

// The wear drawn over a piece's plain colours: blotches of grime or rust, scratches along its length, grain, and the land's
// dust on every face that looks up. It is drawn in the piece's own metres, so it stays on the piece as the truck moves.
const WEAR = Object.freeze({
  salvage:{roughness:.6, metalness:.3, grime:[.055, .05, .045], patch:[.5, .5, .5], scratch:[.42, .44, .45], dust:[.19, .13, .085], dustAmount:.42},
  steel:{roughness:.82, metalness:.2, grime:[.2, .075, .025], patch:[.43, .8, .12], scratch:[.3, .3, .31], dust:[.19, .13, .085], dustAmount:.3},
});
function wornMaterial(good, seed) {
  const wear = WEAR[good] ?? WEAR.steel, rng = makeRng(seed);
  const uniforms = {uHaulNoise:{value:scrapNoise()}, uHaulSeed:{value:new THREE.Vector3(rng.range(0, 40), rng.range(0, 40), rng.range(0, 40))},
    uHaulGrime:{value:new THREE.Vector3(...wear.grime)}, uHaulPatch:{value:new THREE.Vector3(...wear.patch)},
    uHaulScratch:{value:new THREE.Vector3(...wear.scratch)}, uHaulDust:{value:new THREE.Vector3(...wear.dust)}, uHaulDustAmount:{value:wear.dustAmount}};
  const material = new THREE.MeshStandardMaterial({vertexColors:true, roughness:wear.roughness, metalness:wear.metalness});
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uHaulSeed;\nvarying vec3 vHaulPos;\nvarying vec3 vHaulOwn;\nvarying vec3 vHaulUp;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHaulPos = position + uHaulSeed; vHaulOwn = normal; vHaulUp = mat3(modelMatrix) * normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uHaulNoise; uniform vec3 uHaulGrime; uniform vec3 uHaulPatch; uniform vec3 uHaulScratch; uniform vec3 uHaulDust; uniform float uHaulDustAmount;
        varying vec3 vHaulPos; varying vec3 vHaulOwn; varying vec3 vHaulUp;
        vec3 haulTri(vec3 p, vec3 w, float s) {
          return texture2D(uHaulNoise, p.zy * s).rgb * w.x + texture2D(uHaulNoise, p.xz * s).rgb * w.y + texture2D(uHaulNoise, p.xy * s).rgb * w.z; }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 haulW = pow(abs(normalize(vHaulOwn)), vec3(4.0)); haulW /= haulW.x + haulW.y + haulW.z;
        vec3 haulBig = haulTri(vHaulPos, haulW, .21), haulFine = haulTri(vHaulPos, haulW, 1.9);
        float haulPatch = smoothstep(uHaulPatch.x, uHaulPatch.x + .14, haulBig.r * .7 + haulFine.g * .3);
        diffuseColor.rgb = mix(diffuseColor.rgb, uHaulGrime * (.55 + .9 * haulFine.g), haulPatch * uHaulPatch.y);
        float haulScratch = texture2D(uHaulNoise, vec2(vHaulPos.x * .3, (vHaulPos.z + vHaulPos.y) * 5.0)).b;
        diffuseColor.rgb = mix(diffuseColor.rgb, uHaulScratch, smoothstep(.64, .8, haulScratch) * uHaulPatch.z);
        diffuseColor.rgb *= .6 + .62 * haulFine.g;
        float haulUp = max(normalize(vHaulUp).y, 0.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, uHaulDust * (.8 + .4 * haulFine.g), haulUp * (.2 + .8 * haulBig.g) * uHaulDustAmount);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (.8 + .35 * haulFine.g) + .12 * haulPatch, 0.0, 1.0);`);
  };
  material.customProgramCacheKey = () => 'haul-load-wear-1';
  return material;
}

/**
 * Where each piece of a load lies on a bed `across` metres wide and `along` metres long. `sizes` are the pieces from the
 * bottom up ({id, length, width, height, fill}). The load is a heap, as a gang throws scrap on: each piece goes where the
 * heap is lowest and settles half way into the hollows under it, tilted where the heap is uneven. A piece's place depends
 * only on the pieces under it, so the heap keeps its shape as pieces are lifted on and thrown off. Each answer is in the
 * bed's own metres from the middle of its deck: {x, y, z, cross, yaw, slope, turned}. `cross` pieces lie across the bed;
 * `slope` is the rise per metre along the piece.
 */
export function stackHaulPieces(sizes, {across, along}) {
  const cell = .1, nx = Math.max(1, Math.round(across / cell)), nz = Math.max(1, Math.round(along / cell));
  const heights = new Float32Array(nx * nz), poses = [];
  // Where a piece comes to rest over a patch of the heap: half way between the patch's mean height and its highest point.
  const restOn = (i0, i1, k0, k1) => {
    let high = 0, total = 0, count = 0;
    for (let i = i0; i <= i1; i++) for (let k = k0; k <= k1; k++) { const h = heights[k * nx + i]; high = Math.max(high, h); total += h; count++; }
    return count ? (high + total / count) / 2 : 0;
  };
  for (const size of sizes) {
    const rng = makeRng(idSeed(size.id)), likesCross = rng.chance(.5);
    let best = null;
    for (const cross of [false, true]) {
      // Long pieces lie along the bed; only a piece that leaves room beside it may lie across.
      if (cross && size.length > across - .2) continue;
      const fx = cross ? size.length : size.width, fz = cross ? size.width : size.length;
      // A piece wider or longer than the bed overhangs it evenly; a shorter one may hang .15 m over the tail.
      const reachX = Math.max(0, (across - fx) / 2), reachZ = Math.max(0, (along - fz) / 2);
      for (let x = -reachX; x <= reachX + 1e-6; x += .1) for (let z = -reachZ; z <= reachZ + .15 + 1e-6; z += .2) {
        const span = cells(x, z, fx, fz);
        const score = restOn(span.i0, span.i1, span.k0, span.k1) + (cross === likesCross ? 0 : .08) + rng.float() * .03 + (z + along / 2) * .015;
        if (!best || score < best.score) best = {score, x, z, cross, fx, fz};
      }
    }
    const span = cells(best.x, best.z, best.fx, best.fz), lengthways = best.cross ? 'i' : 'k';
    const mid = Math.floor(lengthways === 'k' ? (span.k0 + span.k1) / 2 : (span.i0 + span.i1) / 2);
    const low = lengthways === 'k' ? restOn(span.i0, span.i1, span.k0, mid) : restOn(span.i0, mid, span.k0, span.k1);
    const high = lengthways === 'k' ? restOn(span.i0, span.i1, mid + 1, span.k1) : restOn(mid + 1, span.i1, span.k0, span.k1);
    const slope = Math.max(-.3, Math.min(.3, (high - low) / (size.length / 2))), y = (low + high) / 2;
    const centre = lengthways === 'k' ? best.z : best.x;
    const surface = (i, k) => slope * (((lengthways === 'k' ? k - nz / 2 : i - nx / 2) + .5) * cell - centre);
    for (let i = span.i0; i <= span.i1; i++) for (let k = span.k0; k <= span.k1; k++)
      heights[k * nx + i] = Math.max(heights[k * nx + i], y + surface(i, k) + size.height * (size.fill ?? 1));
    poses.push({x:best.x, y, z:best.z, cross:best.cross, slope, yaw:rng.range(-.09, .09), turned:rng.chance(.5)});
  }
  return poses;
  function cells(x, z, fx, fz) {
    const clamp = (value, top) => Math.max(0, Math.min(top - 1, value));
    return {i0:clamp(Math.floor((x - fx / 2) / cell + nx / 2 + .01), nx), i1:clamp(Math.ceil((x + fx / 2) / cell + nx / 2 - .01) - 1, nx),
      k0:clamp(Math.floor((z - fz / 2) / cell + nz / 2 + .01), nz), k1:clamp(Math.ceil((z + fz / 2) / cell + nz / 2 - .01) - 1, nz)};
  }
}

/** The drawing of haul pieces for one view. `piece(piece, good, {fallen})` makes one mesh; `release(mesh)` gives it back. */
export function createHaulLoadLook({layer = null} = {}) {
  const shapes = new Map();
  function shape(kind, fallen, variant) {
    const key = `${kind}:${fallen ? 'fallen' : 'stacked'}:${variant}`;
    if (!shapes.has(key)) {
      const parts = (BUILDERS[kind] ?? unknown)(makeRng(idSeed(key)), fallen), geometry = mergeGeometries(parts, false);
      for (const part of parts) part.dispose();
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox, middle = bounds.getCenter(new THREE.Vector3());
      geometry.translate(-middle.x, -bounds.min.y, -middle.z);
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const size = bounds.getSize(new THREE.Vector3());
      shapes.set(key, {geometry, size:Object.freeze({length:size.x, height:size.y, width:size.z, fill:FILL[kind] ?? 1})});
    }
    return shapes.get(key);
  }
  /** The room a piece of this kind takes on the bed: {length, width, height} in metres. */
  const sizeOf = piece => shape(piece.kind, false, idSeed(piece.id) % 2).size;
  function piece(piece, good, {fallen = false} = {}) {
    const seed = idSeed(piece.id), entry = shape(piece.kind, fallen, seed % 2);
    const mesh = new THREE.Mesh(entry.geometry, wornMaterial(good, seed));
    mesh.name = `haul-piece:${piece.id}`;
    mesh.castShadow = true; mesh.receiveShadow = true;
    if (layer !== null) mesh.layers.set(layer);
    mesh.userData.size = entry.size;
    return mesh;
  }
  function release(mesh) { mesh.removeFromParent(); mesh.material.dispose(); }
  function dispose() { for (const entry of shapes.values()) entry.geometry.dispose(); shapes.clear(); }
  return {piece, sizeOf, release, dispose};
}
