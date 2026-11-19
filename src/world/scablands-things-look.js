// How the things that stand on the Scablands are drawn (SCABLANDS-LAND, realism trial step 3). Everything here is shaped in
// code: no model files. `src/world/scablands-things.js` decides where a thing stands and how large it is, and
// `src/world/scablands-things-view.js` batches them; this file gives each kind its shape and its surface.
//
// Two rules keep these from reading as toys. A shape is never a clean solid: stones are lumps with a buried flat side,
// plants are leaning blades, wood is tapered and split, steel is dented and bent. And a surface is never one colour: every
// corner carries its own colour (dark and damp where it meets the ground, dusty and bleached on top), and rock wears the
// same photographs as the ground it lies on.
//
// Small things (stone, scrub, brush, bone, can, scrap, salt, stump) are shaped about the origin within one unit, as the
// view scales them: half a unit up and down, and the view sinks them a little into the ground. Standing things
// (telegraph, telegraph-down, fence-post, sign-post, pylon-foot, dead-tree, snag, boulder) are shaped inside a cube of one unit that the
// view stretches to the thing's own width, height and depth, so each is written here in metres over those sizes.
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {makeRng} from '../rng.js';

const colour = hex => new THREE.Color(hex);
const mix = (a, b, t) => a.clone().lerp(b, Math.max(0, Math.min(1, t)));

// A repeatable lumpiness for a point in space: three sines that never line up. Shared corners of a shape get the same
// value, so a displaced shape stays closed.
function lump(x, y, z, seed = 0) {
  return (Math.sin(x * 3.1 + y * 1.7 + seed * 5.3) + Math.sin(y * 4.3 - z * 2.9 + seed * 2.1) + Math.sin(z * 3.7 + x * 2.3 - seed * 3.9)) / 3;
}

// Gives every corner of a shape a colour from a function of its position and its normal.
function paint(geometry, shade) {
  const position = geometry.attributes.position, normal = geometry.attributes.normal, colours = new Float32Array(position.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i); n.fromBufferAttribute(normal, i);
    const c = shade(p, n, i);
    colours[i * 3] = c.r; colours[i * 3 + 1] = c.g; colours[i * 3 + 2] = c.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

// Texture coordinates for a lump of rock: each face is laid flat along the axis it faces most, so a photograph of rock
// wraps it without a seam at one side and without stretching. `metres` is the size of one repeat in the shape's own units.
function wrapRock(geometry, metres) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.attributes.position, uv = new Float32Array(position.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), face = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i); b.fromBufferAttribute(position, i + 1); c.fromBufferAttribute(position, i + 2);
    face.subVectors(b, a).cross(c.clone().sub(a));
    const ax = Math.abs(face.x), ay = Math.abs(face.y), az = Math.abs(face.z);
    for (let k = 0; k < 3; k++) {
      const p = k === 0 ? a : k === 1 ? b : c;
      const [u, v] = ay >= ax && ay >= az ? [p.x, p.z] : ax >= az ? [p.z, p.y] : [p.x, p.y];
      uv[(i + k) * 2] = u / metres; uv[(i + k) * 2 + 1] = v / metres;
    }
  }
  flat.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return flat;
}

// A lump of rock: a ball pushed in and out and then broken by flat cuts, flat and sunk on the side that lies in the
// ground. `detail` sets how many faces (1: 32, 2: 72); `rough` how far it is pushed; `cuts` how many faces it broke along.
function rockShape({seed, detail = 1, rough = .3, squat = 1, cuts = 6, base = -.34, tile = 1, wide = 1, sink = 0}) {
  let geometry = mergeVertices(new THREE.OctahedronGeometry(.62, detail).deleteAttribute('uv').deleteAttribute('normal'));
  const position = geometry.attributes.position, p = new THREE.Vector3(), rng = makeRng(seed * 977 + 13);
  // Rock breaks along flat faces: the ball is cut by planes at odd angles, which leaves facets with hard edges between them.
  const planes = Array.from({length: cuts}, () => {
    const turn = rng.range(0, Math.PI * 2), tilt = rng.range(-.35, 1);
    return {normal: new THREE.Vector3(Math.sin(turn) * Math.sqrt(1 - tilt * tilt), tilt, Math.cos(turn) * Math.sqrt(1 - tilt * tilt)), far: rng.range(.3, .46)};
  });
  for (let i = 0; i < position.count; i++) {
    p.fromBufferAttribute(position, i); p.x *= wide; p.z /= Math.sqrt(wide);
    p.multiplyScalar(1 + rough * lump(p.x * 2.2, p.y * 2.2, p.z * 2.2, seed));
    for (const plane of planes) { const over = p.dot(plane.normal) - plane.far; if (over > 0) p.addScaledVector(plane.normal, -over * .94); }
    p.multiplyScalar(1 + rough * .16 * lump(p.x * 7.1, p.y * 7.1, p.z * 7.1, seed + 7)); p.y *= squat;
    if (p.y < base) p.y = base + (p.y - base) * .12;
    position.setXYZ(i, p.x, p.y - sink, p.z);
  }
  geometry.computeVertexNormals();
  const dark = colour(0x2c2722), body = colour(0x736a60), dust = colour(0x8c806b);
  paint(geometry, (q, n) => {
    const low = 1 - Math.max(0, Math.min(1, (q.y + sink - base) / .28)), top = Math.max(0, n.y) ** 2;
    const grain = .5 + .5 * lump(q.x * 9, q.y * 9, q.z * 9, seed + 3);
    return mix(mix(body, dust, top * .75), dark, low * .7).multiplyScalar(.82 + .3 * grain);
  });
  geometry = wrapRock(geometry, tile);
  geometry.computeBoundingSphere();
  return geometry;
}

// A plant is three upright cards crossed through one root, each wearing a picture of the plant with the gaps between its
// twigs cut out. Seen from a moving car that reads as a bush; a plant shaped from a dozen flat blades reads as a toy.
// One unit tall and a little wider. The normals lean toward the sky so that the cards are lit evenly, as real brush is.
function plantShape(wide = 1.15) {
  const position = [], normal = [], uv = [], index = [];
  for (let card = 0; card < 3; card++) {
    const turn = card * Math.PI / 3 + .2, x = Math.sin(turn) * wide / 2, z = Math.cos(turn) * wide / 2;
    // Two faces to a card, front and back, both with normals that lean toward the sky: a two-sided surface would turn
    // the back face's normal toward the ground and draw half of every bush black.
    for (const back of [0, 1]) {
      const first = position.length / 3;
      position.push(-x, -.5, -z, x, -.5, z, x, .5, z, -x, .5, -z); uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      index.push(...(back ? [first, first + 2, first + 1, first, first + 3, first + 2] : [first, first + 1, first + 2, first, first + 2, first + 3]));
      for (const side of [-1, 1, 1, -1]) normal.push(side * x * .5, .85, side * z * .5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(index); geometry.normalizeNormals(); geometry.computeBoundingSphere();
  return geometry;
}

// The picture a plant's cards wear. Scrub: a low dome of fine grey twigs from one root, with small dusty leaves bunched
// at their ends. Dead brush: fewer, barer, greyer sticks that fork. Drawn once on a canvas; with no screen there is none.
export function plantPicture(kind, documentLike = typeof document === 'undefined' ? null : document) {
  if (!documentLike) return null;
  const size = 256, canvas = documentLike.createElement('canvas'); canvas.width = canvas.height = size;
  const pen = canvas.getContext('2d'), rng = makeRng(kind === 'scrub' ? 301 : 409), dead = kind !== 'scrub';
  pen.clearRect(0, 0, size, size); pen.lineCap = 'round';
  const root = {x: size / 2, y: size - 3};
  const twig = (x0, y0, turn, long, wide, depth) => {
    const bend = rng.range(-.35, .35), x1 = x0 + Math.sin(turn) * long, y1 = y0 - Math.cos(turn) * long;
    const shade = rng.range(.75, 1.1), tone = dead ? [112, 100, 84] : [98, 88, 70];
    pen.strokeStyle = `rgb(${tone.map(v => Math.round(v * shade * (depth ? 1.08 : .8))).join(',')})`; pen.lineWidth = wide;
    pen.beginPath(); pen.moveTo(x0, y0); pen.quadraticCurveTo(x0 + Math.sin(turn + bend) * long * .55, y0 - Math.cos(turn + bend) * long * .55, x1, y1); pen.stroke();
    if (depth < (dead ? 2 : 3)) {
      const forks = dead ? rng.int(1, 2) : rng.int(2, 3);
      for (let fork = 0; fork < forks; fork++) twig(x1, y1, turn + rng.range(-.7, .7), long * rng.range(.45, .7), Math.max(1, wide * .62), depth + 1);
    } else if (!dead) {
      // A bunch of small leaves: dusty sage, a few gone to straw.
      for (let leaf = 0; leaf < 11; leaf++) {
        const straw = rng.chance(.22), c = straw ? [132, 122, 88] : rng.pick([[92, 102, 78], [108, 116, 90], [78, 90, 68]]), tint = rng.range(.82, 1.12);
        pen.fillStyle = `rgb(${c.map(v => Math.round(v * tint)).join(',')})`;
        pen.beginPath(); pen.ellipse(x1 + rng.range(-11, 11), y1 + rng.range(-11, 8), rng.range(2.4, 5), rng.range(1.5, 2.8), rng.range(0, 3.1), 0, Math.PI * 2); pen.fill();
      }
    }
  };
  const stems = dead ? 9 : 15;
  for (let stem = 0; stem < stems; stem++) {
    const turn = (stem / (stems - 1) - .5) * (dead ? 2.1 : 2.5) + rng.range(-.08, .08);
    twig(root.x + rng.range(-6, 6), root.y, turn, size * rng.range(.3, .44) * (1 - Math.abs(turn) * (dead ? .12 : .2)), dead ? 4.2 : 3.4, 0);
  }
  // The picture is kept inside a rounded outline with a ragged rim. Twigs that ran to the picture's edges gave every far
  // bush the outline of its square card.
  pen.globalCompositeOperation = 'destination-in';
  pen.beginPath(); pen.ellipse(size / 2, size * .63, size * (dead ? .4 : .44), size * (dead ? .5 : .54), 0, 0, Math.PI * 2); pen.fill();
  pen.globalCompositeOperation = 'destination-out';
  for (let notch = 0; notch < 46; notch++) {
    const turn = rng.range(-Math.PI * .98, Math.PI * .02), reach = rng.range(.93, 1.06);
    pen.beginPath();
    pen.arc(size / 2 + Math.cos(turn) * size * (dead ? .4 : .44) * reach, size * .63 + Math.sin(turn) * size * (dead ? .5 : .54) * reach, rng.range(5, 15), 0, Math.PI * 2);
    pen.fill();
  }
  pen.globalCompositeOperation = 'source-over';
  const texture = new THREE.CanvasTexture(canvas);
  // No smaller copies of the picture: their averaged gaps would turn a far bush into a pale square.
  texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Welds the pieces of one thing and paints it by height and by which way a face looks.
function solid(parts, shade) {
  const geometry = mergeGeometries(parts.map(part => { const g = part.index ? part.toNonIndexed() : part; g.deleteAttribute('uv'); return g; }));
  geometry.computeBoundingSphere();
  return paint(geometry, shade);
}

// A long bone lying on the ground: a shaft with a knuckle at each end. One unit long, along z.
function boneShape() {
  const shaft = new THREE.CylinderGeometry(.045, .06, .8, 6, 1, true).rotateX(Math.PI / 2).deleteAttribute('uv');
  const knuckle = (z, size) => { const g = mergeVertices(new THREE.OctahedronGeometry(size, 0).deleteAttribute('uv').deleteAttribute('normal')); g.computeVertexNormals(); return g.scale(1.25, .8, 1).translate(0, 0, z); };
  const white = colour(0xb3aa92), stain = colour(0x736650);
  return solid([shaft, knuckle(-.43, .1), knuckle(.43, .085), knuckle(.37, .07).translate(.07, 0, 0)],
    (p, n) => mix(white, stain, .55 * (1 - Math.max(0, n.y)) + .25 * Math.abs(lump(p.x * 30, p.y * 30, p.z * 9, 4))));
}

// A rusted can, dented, lying tipped. About 0.7 of a unit long.
function canShape() {
  const body = new THREE.CylinderGeometry(.3, .3, .7, 9, 2, true), lid = new THREE.CircleGeometry(.3, 9).rotateX(Math.PI / 2).translate(0, -.35, 0);
  const position = body.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i), dent = Math.max(0, 1 - Math.hypot(x - .3, y * 2.2) * 1.6);
    position.setXYZ(i, x * (1 - dent * .45), y, z * (1 + dent * .12));
  }
  body.computeVertexNormals();
  const rust = colour(0x65432e), deep = colour(0x33251c), paintLeft = colour(0x77765f);
  const can = solid([body, lid], (p, n) => {
    const band = Math.abs(p.y) < .16 ? .55 : 0, grain = .5 + .5 * lump(p.x * 14, p.y * 14, p.z * 14, 2);
    return mix(mix(rust, paintLeft, band * grain), deep, .5 * (1 - grain) + .25 * Math.max(0, -n.y));
  });
  return can.rotateZ(Math.PI / 2 - .2).rotateY(.4);
}

// A torn sheet of corrugated iron, bent, lying nearly flat. One unit by 0.65.
function scrapShape() {
  const sheet = new THREE.PlaneGeometry(1, .65, 12, 2).rotateX(-Math.PI / 2), position = sheet.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), z = position.getZ(i);
    position.setY(i, .028 * Math.sin(x * 38) + .22 * Math.max(0, x - .1) ** 1.5 + .05 * lump(x * 3, 0, z * 3, 6) - (x > .43 && z > .12 ? .06 : 0));
  }
  sheet.computeVertexNormals();
  const zinc = colour(0x7c807d), rust = colour(0x6f4126), dirt = colour(0x4d3b2b);
  return solid([sheet], (p, n) => {
    const patch = .5 + .5 * lump(p.x * 5, 1, p.z * 6, 9);
    return mix(mix(zinc, rust, patch * 1.25), dirt, .45 * (1 - Math.abs(Math.sin(p.x * 38))) * (1 - patch));
  });
}

// A lump of salt crust: two broken crystals grown together, with faces left sharp.
function saltShape() {
  const crystal = (size, x, z, turn) => new THREE.OctahedronGeometry(size, 0).scale(1, .62, .8).rotateY(turn).rotateZ(.25).translate(x, -.2, z);
  const white = colour(0xe9e2d6), grey = colour(0xa39a8c), rose = colour(0xd9c4b4);
  const flat = mergeGeometries([crystal(.5, 0, 0, .3), crystal(.3, .32, .14, 1.4), crystal(.22, -.3, -.2, 2.2)]);
  flat.deleteAttribute('uv'); flat.computeVertexNormals();
  return paint(flat, (p, n) => mix(mix(white, rose, .5 + .5 * lump(p.x * 4, p.y * 4, p.z * 4, 1)), grey, .75 * Math.max(0, .1 - p.y) * 3 + .2 * Math.max(0, -n.y)));
}

// A burnt stump: roots that spread, a trunk that narrows, a top snapped off unevenly and hollowed by fire.
function stumpShape(seed) {
  const rng = makeRng(seed), sides = 8, rings = [[-.5, .43], [-.36, .3], [.05, .24]];
  const position = [], index = [];
  const heights = Array.from({length: sides}, () => rng.range(.12, .5));
  for (const [y, radius] of rings) for (let s = 0; s < sides; s++) {
    const turn = s / sides * Math.PI * 2, r = radius * (1 + .22 * Math.sin(turn * 3 + seed) * (y < -.4 ? 1 : .3));
    position.push(Math.sin(turn) * r, y, Math.cos(turn) * r);
  }
  for (let s = 0; s < sides; s++) { const turn = s / sides * Math.PI * 2; position.push(Math.sin(turn) * .2, heights[s], Math.cos(turn) * .2); }
  position.push(0, .02, 0);
  const centre = sides * 4;
  for (let ring = 0; ring < 3; ring++) for (let s = 0; s < sides; s++) {
    const a = ring * sides + s, b = ring * sides + (s + 1) % sides, c = a + sides, d = b + sides;
    index.push(a, b, d, a, d, c);
  }
  for (let s = 0; s < sides; s++) index.push(3 * sides + s, 3 * sides + (s + 1) % sides, centre);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setIndex(index); geometry.computeVertexNormals();
  const char = colour(0x1b1815), ash = colour(0x77726a), earth = colour(0x4a3d30);
  return paint(geometry.toNonIndexed(), (p, n) => {
    const crack = .5 + .5 * lump(p.x * 16, p.y * 5, p.z * 16, seed);
    return mix(mix(char, ash, crack * crack * .7 + Math.max(0, n.y) * .35), earth, Math.max(0, (-.38 - p.y) * 6));
  });
}

// ---- Standing things, each inside a cube of one unit that is stretched to the thing's own size -----------------------------------------------
// `size` is the thing's width, height and depth in metres (what the view stretches the cube to), so lengths below are
// written in metres and divided through.

// Weathered timber: grey, darker where it meets the ground and where the tar was, split by long cracks.
const timber = (height, tar = 0) => (p, n) => {
  const up = p.y + .5, crack = .5 + .5 * lump(p.x * 40, p.y * 3, p.z * 40, 5);
  const grey = colour(0x6f6455), dark = colour(0x2f2820), bleached = colour(0x8a7e6c);
  return mix(mix(grey, bleached, crack * .6), dark, Math.max(Math.max(0, 1 - up * height / .5) * .8, tar && up * height < tar ? .7 : 0) + (1 - crack) * .15);
};

// A telegraph pole standing: a tapered trunk, two cross arms with their glass insulators, an iron brace.
function poleShape([width, height, depth]) {
  const sx = 1 / width, sy = 1 / height, sz = 1 / depth;
  const trunk = new THREE.CylinderGeometry(.085, .13, height, 6, 1).scale(sx, sy, sz);
  const arm = (y, long) => new THREE.BoxGeometry(long, .09, .1).translate(0, y - height / 2, .12).scale(sx, sy, sz);
  const pin = (x, y) => new THREE.CylinderGeometry(.035, .05, .16, 4, 1, true).translate(x, y - height / 2 + .12, .12).scale(sx, sy, sz);
  const pins = [];
  for (const x of [-.85, -.45, .45, .85]) pins.push(pin(x, height - .55));
  for (const x of [-.65, .65]) pins.push(pin(x, height - 1.25));
  const glass = colour(0x6f8f86), dull = colour(0x3d4a45);
  const geometry = mergeGeometries([solid([trunk, arm(height - .55, 1.9), arm(height - 1.25, 1.5)], timber(height, 1.6)), solid(pins, (p, n) => mix(dull, glass, Math.max(0, n.y) * .6 + .4))]);
  geometry.computeBoundingSphere();
  return geometry;
}

// A telegraph pole that has come down: the same trunk lying along the cube's depth, one arm still on it.
function poleDownShape([width, height, depth]) {
  const sx = 1 / width, sy = 1 / height, sz = 1 / depth;
  const trunk = new THREE.CylinderGeometry(.085, .13, depth, 7, 3).rotateX(Math.PI / 2).translate(0, .13 - height / 2, 0).scale(sx, sy, sz);
  const arm = new THREE.BoxGeometry(1.9, .09, .1).rotateZ(.5).translate(.1, .42 - height / 2, depth / 2 - .7).scale(sx, sy, sz);
  const wood = timber(.5);
  return solid([trunk, arm], (p, n) => wood(new THREE.Vector3(p.x, .2, p.z), n));
}

// A fence post: a split stake, narrower at the top, standing a little out of true.
function fencePostShape([width, height, depth]) {
  const sx = 1 / width, sy = 1 / height, sz = 1 / depth;
  const stake = new THREE.CylinderGeometry(.045, .07, height, 5, 2).rotateZ(.05).rotateX(-.04).scale(sx, sy, sz);
  return solid([stake], timber(height));
}

// A sign's post: squared timber. The board is drawn by the view, with its words.
function signPostShape([width, height, depth]) {
  const post = new THREE.BoxGeometry(.1, height, .1).scale(1 / width, 1 / height, 1 / depth);
  return solid([post], timber(height));
}

// A pylon's foot: a block of weathered concrete with the first metres of the steel leg standing in it.
function pylonFootShape([width, height, depth]) {
  const sx = 1 / width, sy = 1 / height, sz = 1 / depth;
  const block = new THREE.BoxGeometry(width, .55, depth, 1, 1, 1).translate(0, .275 - height / 2, 0).scale(sx, sy, sz);
  const leg = new THREE.BoxGeometry(.14, height - .5, .14).translate(0, .25, 0).scale(sx, sy, sz);
  const concrete = colour(0x7d796f), stain = colour(0x5a4737), steel = colour(0x5e5a55), rust = colour(0x6d4630);
  return solid([block, leg], (p, n) => {
    const up = (p.y + .5) * height, grain = .5 + .5 * lump(p.x * 9, p.y * 9, p.z * 9, 8);
    if (up > .56) return mix(steel, rust, grain * .9);
    return mix(concrete, stain, Math.max(0, 1 - up / .3) * .7 + (1 - grain) * .25);
  });
}

// A dead cottonwood, of the kind that lines a river long after its water has gone: a crooked leaning trunk with a spread
// foot, heavy limbs that reach out and fork, crooked branches and a crown of bare twigs, every end snapped off. Bleached
// silver where the bark has fallen, dark in the forks and at the ground. `limbs` is how many times the wood forks (3 a
// tree, 1 a broken snag). About 420 triangles a tree, 60 a snag.
function deadTreeShape([width, height, depth], seed, limbs = 3) {
  const rng = makeRng(seed), parts = [], up = new THREE.Vector3(0, 1, 0);
  const tube = (a, b, r0, r1, sides) => {
    const along = b.clone().sub(a), length = along.length();
    return new THREE.CylinderGeometry(Math.max(r1, .024), Math.max(r0, .034), length, sides, 1, true).translate(0, length / 2, 0)
      .applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, along.normalize())).translate(a.x, a.y, a.z);
  };
  // One length of wood in `pieces` crooked pieces, then its forks. `forks` counts down to the twigs (0).
  const grow = (from, heading, length, radius, forks, pieces) => {
    const sides = forks >= 2 ? 5 : forks === 1 ? 4 : 3, crook = forks >= 2 ? .22 : .42, joints = [from.clone()];
    let at = from.clone(), way = heading.clone(), thick = radius;
    const taper = forks ? .82 : .45;
    for (let piece = 0; piece < pieces; piece++) {
      const next = at.clone().addScaledVector(way, length / pieces);
      parts.push(tube(at, next, thick, thick * taper, sides));
      at = next; thick *= taper; joints.push(at.clone());
      way = way.clone().add(new THREE.Vector3(rng.range(-crook, crook), rng.range(-.12, .22), rng.range(-crook, crook))).normalize();
    }
    if (!forks) return;
    for (let i = 0; i < 3; i++) {
      const turn = rng.range(0, Math.PI * 2), lift = forks === limbs ? rng.range(.25, .7) : rng.range(.05, .65);
      const out = new THREE.Vector3(Math.sin(turn), lift, Math.cos(turn)).normalize();
      const where = i === 0 ? at : joints[1 + Math.floor(rng.range(0, joints.length - 1.001))];
      grow(where, way.clone().multiplyScalar(i === 0 ? .7 : .25).add(out).normalize(), length * rng.range(.5, .78), thick * (i === 0 ? .8 : .62), forks - 1, forks - 1 >= 1 ? 2 : 1);
    }
  };
  const lean = new THREE.Vector3(rng.range(-.2, .2), 1, rng.range(-.2, .2)).normalize();
  parts.push(tube(new THREE.Vector3(0, -.35, 0), new THREE.Vector3(0, .5, 0), .52, .33, 6));
  grow(new THREE.Vector3(0, .45, 0), lean, limbs > 1 ? 3.4 : 2.6, .32, limbs, 3);
  const merged = mergeGeometries(parts.map(part => { const g = part.toNonIndexed(); g.deleteAttribute('uv'); return g; }));
  // Fitted to the thing's own size: the foot at the middle of the cube's floor, the highest twig at its top.
  merged.computeBoundingBox();
  const box = merged.boundingBox, reach = Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z, .01);
  const fit = Math.min(height / box.max.y, width / 2 / reach, depth / 2 / reach);
  merged.scale(fit / width, fit / height, fit / depth).translate(0, -.5, 0);
  merged.computeVertexNormals(); merged.computeBoundingSphere();
  const silver = colour(0x8d8576), grey = colour(0x625a4d), dark = colour(0x2c2620), bark = colour(0x4a3f33);
  return paint(merged, (p, n) => {
    const metres = (p.y + .5) * height, grain = .5 + .5 * lump(p.x * width * 5, p.y * height * 1.3, p.z * depth * 5, seed);
    const wood = mix(mix(grey, silver, grain * .8 + Math.max(0, n.y) * .3), bark, (1 - grain) * (1 - grain) * .9 * Math.max(0, 1 - metres / (height * .45)));
    return mix(wood, dark, Math.max(0, 1 - metres / .7) * .75 + Math.max(0, -n.y) * .3);
  });
}

// ---- What the view asks for -------------------------------------------------------------------------------------------------------------------
const SMALL = {
  stone: () => rockShape({seed: 11, detail: 1, rough: .3, cuts: 5, base: -.3, tile: .9}),
  scrub: () => plantShape(1.25),
  brush: () => plantShape(1.1),
  bone: () => boneShape(),
  can: () => canShape(),
  scrap: () => scrapShape(),
  salt: () => saltShape(),
  stump: () => stumpShape(41),
};
const STANDING = {
  telegraph: size => poleShape(size),
  'telegraph-down': size => poleDownShape(size),
  'fence-post': size => fencePostShape(size),
  'sign-post': size => signPostShape(size),
  'pylon-foot': size => pylonFootShape(size),
  'dead-tree': size => deadTreeShape(size, 71, 3),
  snag: size => deadTreeShape(size, 83, 1),
  boulder: () => rockShape({seed: 51, detail: 2, rough: .3, squat: .8, cuts: 11, base: -.26, tile: .55, wide: 1.25, sink: .2}),
};
// Which surface each kind wears: rock wears the ground's photographs, a plant its drawn picture, and sheet iron is seen from both sides.
const FAMILY = {stone: 'rock', boulder: 'rock', scrub: 'plant', brush: 'plant', scrap: 'sheet'};

export const SMALL_THING_KINDS = Object.freeze(Object.keys(SMALL));
export const STANDING_THING_KINDS = Object.freeze(Object.keys(STANDING));

// The shape of a small thing, about the origin, within one unit.
export function smallThingShape(kind) {
  const make = SMALL[kind];
  if (!make) throw new RangeError(`No small thing is called ${JSON.stringify(kind)}.`);
  return make();
}

// The shape of a standing thing inside a cube of one unit; `size` is the width, height and depth in metres that the
// cube is stretched to.
export function standingThingShape(kind, size = [1, 1, 1]) {
  const make = STANDING[kind];
  if (!make) throw new RangeError(`No standing thing is called ${JSON.stringify(kind)}.`);
  return make(size);
}

// The surface for a kind. `photos` is what `loadGroundPhotos` returns (src/world/scablands-ground-look.js); with none,
// rock is drawn from its corner colours alone, which is how a test with no screen makes it.
export function thingSurface(kind, photos = null) {
  const family = FAMILY[kind] ?? 'solid', rock = photos?.plates ?? null;
  if (family === 'plant') {
    const picture = plantPicture(kind);
    // In the land's own light a bush draws paler than its picture, so the picture is taken down and warmed a little.
    const plant = new THREE.MeshStandardMaterial({map: picture, color: picture ? 0xa89f8c : (kind === 'scrub' ? 0x5c6148 : 0x6f6455), alphaTest: .38, side: THREE.FrontSide, roughness: 1, metalness: 0});
    plant.userData.thingFamily = family;
    return plant;
  }
  const material = new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0,
    side: family === 'sheet' ? THREE.DoubleSide : THREE.FrontSide});
  if (family === 'rock' && rock) {
    // The photograph's own colour is divided out by its average, so the corner colours still set light and dark.
    material.map = rock.map; material.normalMap = rock.normal; material.normalScale = new THREE.Vector2(1.1, 1.1);
    material.color.setRGB(1 / rock.mean.r, 1 / rock.mean.g, 1 / rock.mean.b);
  }
  material.userData.thingFamily = family;
  return material;
}

// ---- A dead power pylon -----------------------------------------------------------------------------------------------------------------------
// A lattice tower is four flat faces of angle iron, so it is drawn as flat faces that wear a picture of the lattice with
// the gaps cut out: 44 triangles a tower, and true from near and far. Heights are metres above the feet; the feet stand
// 3 m either side of the middle, as the placing has them.
export const PYLON = Object.freeze({height: 40, foot: 3, waist: 26, waistHalf: .9, topHalf: .55, arms: Object.freeze([[28.5, 7.2], [33, 6.2], [37.5, 5.2]])});

export function pylonShape() {
  const {height, foot, waist, waistHalf, topHalf, arms} = PYLON, position = [], uv = [], index = [];
  // One face of the tower between two heights: a quad that narrows, its picture running from `v0` to `v1`.
  const quad = (a, b, c, d, u0, u1, v0, v1) => {
    const at = position.length / 3;
    position.push(...a, ...b, ...c, ...d); uv.push(u0, v0, u1, v0, u1, v1, u0, v1); index.push(at, at + 1, at + 2, at, at + 2, at + 3);
  };
  for (let face = 0; face < 4; face++) {
    const turn = face * Math.PI / 2, cos = Math.cos(turn), sin = Math.sin(turn);
    const at = (across, y, half) => [across * half * cos + half * sin, y, -across * half * sin + half * cos];
    quad(at(-1, 0, foot), at(1, 0, foot), at(1, waist, waistHalf), at(-1, waist, waistHalf), 0, .5, 0, .65);
    quad(at(-1, waist, waistHalf), at(1, waist, waistHalf), at(1, height, topHalf), at(-1, height, topHalf), 0, .5, .65, 1);
  }
  // Cross arms: a flat truss either side at each of three heights, seen from front and back.
  for (const [y, reach] of arms) for (const side of [-1, 1]) {
    quad([side * .6, y - .9, 0], [side * reach, y - .1, 0], [side * reach, y + .1, 0], [side * .6, y + .9, 0], .5, 1, 0, .25);
    quad([side * .6, y - .1, -.5], [side * reach, y - .1, 0], [side * reach, y + .1, 0], [side * .6, y - .1, .5], .5, 1, .3, .5);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

// The lattice picture: the left half is a tower face (two legs, level bars and crossed braces, closer together toward the
// top), the right half a cross arm's truss. Galvanised steel gone grey, with rust run down from every joint.
export function pylonPicture(documentLike = typeof document === 'undefined' ? null : document) {
  if (!documentLike) return null;
  const canvas = documentLike.createElement('canvas'); canvas.width = 256; canvas.height = 1024;
  const pen = canvas.getContext('2d'), rng = makeRng(77);
  pen.clearRect(0, 0, 256, 1024); pen.lineCap = 'square';
  const steel = () => `rgb(${[110, 117, 124].map(v => Math.round(v * rng.range(.8, 1.08))).join(',')})`;
  const bar = (x0, y0, x1, y1, wide) => {
    pen.strokeStyle = steel(); pen.lineWidth = wide; pen.beginPath(); pen.moveTo(x0, y0); pen.lineTo(x1, y1); pen.stroke();
    // Rust below the bar's lower end.
    pen.strokeStyle = `rgba(104,62,38,${rng.range(.22, .5)})`; pen.lineWidth = wide * .6; pen.beginPath(); pen.moveTo(x1, y1); pen.lineTo(x1, Math.min(1023, y1 + rng.range(6, 22))); pen.stroke();
  };
  // Tower face: the picture's bottom is the foot. Panels are tall at the foot and short at the top.
  bar(5, 1023, 5, 0, 9); bar(123, 1023, 123, 0, 9);
  let y = 1023, panel = 118;
  while (y > 8) {
    const next = Math.max(0, y - panel);
    bar(5, next, 123, next, 5); bar(5, y, 123, next, 4); bar(123, y, 5, next, 4);
    y = next; panel = Math.max(34, panel * .86);
  }
  // Cross arm truss, in the picture's lower quarter (v 0 to .25) and a plain underside above it (v .3 to .5).
  const arm = (top, bottom) => {
    bar(133, top, 251, (top + bottom) / 2 - 6, 6); bar(133, bottom, 251, (top + bottom) / 2 + 6, 6);
    for (let i = 0; i < 6; i++) { const x = 133 + i * 20, t = i / 6; bar(x, top + (bottom - top) * .5 * t, x + 20, bottom - (bottom - top) * .5 * (t + 1 / 6), 3); bar(x, bottom - (bottom - top) * .5 * t, x + 20, top + (bottom - top) * .5 * (t + 1 / 6), 3); }
  };
  arm(1023 - 250, 1020); arm(1023 - 510, 1023 - 310);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; texture.generateMipmaps = true;
  return texture;
}

export function pylonSurface(picture = pylonPicture()) {
  // Old galvanised steel is dull: no shine, taken down so that the land's strong light does not draw it white, and a little blue so
  // that the same warm light draws it grey and not olive.
  return new THREE.MeshStandardMaterial({map: picture, color: picture ? 0x868a8f : 0x6a6d70, alphaTest: .45, side: THREE.DoubleSide, roughness: 1, metalness: 0});
}
