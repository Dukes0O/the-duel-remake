// HOME-GROUND-LOOK-1: the first living things of Home Ground, drawn before step 2 gives them rules (docs/HOME_GROUND.md,
// sections 5 to 7). Two Tin Town Brown hens, a nest box made from an old crate, the first coop in tin and a brown egg,
// in the look of step 1's tin fence (src/world/open/looks/home-ground-look.js). Nothing here reads or writes a rule or a
// save, and no game file imports it yet: step 2 places these parts and gives the hens their laying. Until then the QA
// page's look stand (tools/open-look-stand.js, behind the switch `home-ground`) stands them on his ground.
//
// The hen is the wildlife line's chicken (public/assets/wildlife/chicken.glb, a thin black village hen) made into a
// brown laying hen in code: her body is widened, her comb and wattles enlarged, and her coat baked afresh onto the
// model's own texture from the colours of real brown laying hybrids (Lohmann Brown). Her poses are the model's own
// clips (Idle looks about and pecks twice, Walk) and two drawn here (scratch, sit). Everything else is drawn in code
// on canvases: the crate's weathered boards and stencil, the straw, the coop's galvanised sheet and its rust, the egg.
//
// Parts and their names (HOME_HENS_PARTS): createHen -> 'home-hen', createNestBox -> 'home-nest-box',
// createTinCoop -> 'home-coop', createEgg -> 'home-egg'. buildHomeHens stands one of each for the look stand.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createGroundShade} from '../../scrap-look.js';

export const HOME_HEN_MODEL = '/assets/wildlife/chicken.glb';

// What each part may cost when drawn once. `triangles` counts every instance of an instanced mesh.
export const HOME_HENS_PARTS = Object.freeze({
  hen: Object.freeze({name: 'home-hen', draws: 3, triangles: 2200}),
  nestBox: Object.freeze({name: 'home-nest-box', draws: 5, triangles: 4200}),
  coop: Object.freeze({name: 'home-coop', draws: 8, triangles: 16000}),
  egg: Object.freeze({name: 'home-egg', draws: 1, triangles: 400}),
});
// The look stand's whole scene: a coop, a nest box, two hens and two eggs.
export const HOME_HENS_BUDGET = Object.freeze({draws: 24, triangles: 30000});

// Sizes in metres, from real ones: a hen about 40 cm tall, a garden-shed coop, a fruit crate on its side, a large egg.
export const HOME_HEN_HEIGHT = Object.freeze({least: .36, most: .46});
export const HOME_COOP_SIZE = Object.freeze({length: 2, depth: 1.5, eave: 1.3, ridge: 1.8});
export const HOME_NEST_SIZE = Object.freeze({width: .44, height: .34, depth: .36, lift: .19});
export const HOME_EGG_SIZE = Object.freeze({length: .058, width: .044});
export const HOME_HEN_POSES = Object.freeze(['stand', 'peck', 'scratch', 'walk', 'sit']);
// The leg band's colours. He can change a hen's band later; blue and yellow tell the first two apart.
export const HOME_HEN_BANDS = Object.freeze({blue: 0x2c64c8, yellow: 0xe2b21c, red: 0xc8281e, green: 0x2f9a44, white: 0xe8e6de});
export const HOME_HENS_STAGES = Object.freeze(['day', 'laid']);

// Where the stand puts things, in metres from the stand's middle (x east, z south). The coop's front faces west, to
// the lane from his gate. Hen A scratches in front of it; hen B sits in the nest box, or stands beside it once she has
// laid. The second egg is one he has carried out and set down by the ramp.
// Until step 2 places them, the look stand puts them this far from his ground's north-west corner (HOME_CORNER), in
// metres east and south: east of the lane from his gate, near the middle of the ground.
export const HOME_HENS_STAND = Object.freeze({x: 30, z: 14});
export const HOME_HENS_LAYOUT = Object.freeze({
  radius: 5,
  coop: Object.freeze({x: 0, z: 0, yaw: -Math.PI / 2}),
  nest: Object.freeze({x: -1.15, z: 1.75, yaw: -Math.PI / 2}),
  henA: Object.freeze({x: -2.35, z: .35, yaw: 2.6}),
  henB: Object.freeze({x: -1.45, z: 2.45, yaw: -2.6}),
  eggDown: Object.freeze({x: -1.75, z: -.42}),
  spots: Object.freeze({}),
});

const painting = () => typeof document !== 'undefined';
const smooth = t => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c); };
const mix = (a, b, t) => a.map((value, index) => value + (b[index] - value) * t);
function seeded(seed) {
  let value = seed % 2147483647 || 1;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
}
// A repeatable hash of whole numbers to 0..1.
function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483587);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
// Smooth value noise in two dimensions, 0..1.
function noise(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x, y, seed) => noise(x, y, seed) * .55 + noise(x * 2.1, y * 2.1, seed + 1) * .3 + noise(x * 4.3, y * 4.3, seed + 2) * .15;

// Pictures are painted once and shared by every part that wears them; they are small and are never disposed.
const painted = new Map();
function canvasTexture(width, height, paint, {repeat = false, key = null} = {}) {
  if (!painting()) return null;
  if (key && painted.has(key)) return painted.get(key);
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (key) painted.set(key, texture);
  return texture;
}
const material = (name, color, extra = {}) => new THREE.MeshStandardMaterial({name, color, roughness: .88, metalness: 0, ...extra});

// ---- Canvas pictures --------------------------------------------------------------------------------------------

// Galvanised sheet as step 1 paints it (grey #8c8a82, runs from the top edge, rust gathered at the foot), with more of
// what a sheet that has stood for years shows: dull spangle, rows of rusting nail heads with runs below them, patches
// of rust where the zinc has gone, and a foot eaten through to dark holes. The foot of the sheet is the canvas's foot.
function coopTinTexture() {
  return canvasTexture(512, 512, (draw, w, h) => {
    const random = seeded(31);
    draw.fillStyle = '#7a766c'; draw.fillRect(0, 0, w, h);
    // Spangle: soft lighter and darker blotches of the zinc.
    for (let n = 0; n < 260; n++) {
      const x = random() * w, y = random() * h, r = 6 + random() * 22;
      draw.fillStyle = `rgba(${random() < .5 ? '170,168,160' : '96,94,88'},${.05 + random() * .08})`;
      draw.beginPath(); draw.ellipse(x, y, r, r * (.5 + random()), random() * 3, 0, Math.PI * 2); draw.fill();
    }
    // Rust where the zinc has worn through, in ragged patches that follow a noise field, browner where it is thick.
    const image = draw.getImageData(0, 0, w, h), data = image.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const field = fbm(x / 70, y / 55, 13) * .8 + fbm(x / 14, y / 14, 17) * .2;
      const rust = smooth((field - .56) / .1) * (.55 + .45 * smooth(y / h * 1.6));
      if (rust <= 0) continue;
      const deep = fbm(x / 9, y / 9, 19), at = (y * w + x) * 4;
      const colour = mix([112, 60, 32], [64, 36, 22], deep);
      for (let k = 0; k < 3; k++) data[at + k] = data[at + k] + (colour[k] - data[at + k]) * rust * .85;
    }
    draw.putImageData(image, 0, 0);
    // Runs from the top edge, as on the fence.
    for (let n = 0; n < 90; n++) {
      const x = random() * w, length = 30 + random() * 220;
      draw.fillStyle = `rgba(${92 + random() * 30},${52 + random() * 16},${28 + random() * 12},${.1 + random() * .22})`;
      draw.fillRect(x, 0, 1.5 + random() * 4, length);
    }
    // Two rows of nail heads (the purlins behind), each with a rust run down from it.
    for (const row of [.1, .56]) {
      for (let x = 14; x < w; x += 42 + random() * 8) {
        const y = row * h + (random() - .5) * 4;
        draw.fillStyle = `rgba(120,64,30,${.25 + random() * .3})`;
        draw.fillRect(x - 1.5, y, 3 + random() * 2, 18 + random() * 70);
        draw.fillStyle = '#4a3a2e'; draw.beginPath(); draw.arc(x, y, 3.2, 0, Math.PI * 2); draw.fill();
        draw.fillStyle = 'rgba(190,150,110,.5)'; draw.beginPath(); draw.arc(x - .8, y - .8, 1.2, 0, Math.PI * 2); draw.fill();
      }
    }
    // The foot: rust rising up the sheet in an uneven tide, darkest at the ground, then holes eaten through.
    for (let x = 0; x < w; x += 2) {
      const top = h * (.74 + .1 * noise(x / 40, 3, 5) + .05 * noise(x / 9, 7, 6));
      const run = draw.createLinearGradient(0, h, 0, top);
      run.addColorStop(0, 'rgba(52,30,18,.95)'); run.addColorStop(.35, 'rgba(96,52,28,.85)'); run.addColorStop(1, 'rgba(104,58,32,0)');
      draw.fillStyle = run; draw.fillRect(x, top, 2, h - top);
    }
    for (let n = 0; n < 40; n++) {
      const x = random() * w, y = h - 2 - random() * 26;
      draw.fillStyle = `rgba(24,16,12,${.55 + random() * .35})`;
      draw.beginPath(); draw.ellipse(x, y, 2 + random() * 7, 1.5 + random() * 4, random() * 3, 0, Math.PI * 2); draw.fill();
    }
    // Fine grit and speckle over everything.
    for (let n = 0; n < 2600; n++) {
      draw.fillStyle = `rgba(${random() < .5 ? '60,45,35' : '178,172,158'},${.08 + random() * .16})`;
      draw.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
    }
  }, {repeat: true, key: 'tin'});
}

// The crate's boards, one picture holding every board (see WOOD): pine gone silver-grey on its faces and brown where it
// was sheltered, with grain, knots, splits, rusting nail heads and stencils. The end boards carry the crate's stencil.
const WOOD = Object.freeze({
  end: Object.freeze({x: 0, y: 0, w: 256, h: 192}),
  slats: [0, 1, 2, 3, 4, 5].map(n => Object.freeze({x: 256, y: n * 42, w: 256, h: 40})),
  lip: Object.freeze({x: 0, y: 200, w: 256, h: 44}),
  plank: Object.freeze({x: 0, y: 256, w: 512, h: 56}),
  batten: Object.freeze({x: 0, y: 320, w: 512, h: 24}),
  pole: Object.freeze({x: 0, y: 352, w: 512, h: 32}),
  block: Object.freeze({x: 0, y: 392, w: 256, h: 120}),
});
function grain(draw, rect, {seed, tone = [104, 98, 88], sheltered = .25, knots = 1}) {
  const random = seeded(seed);
  const {x, y, w, h} = rect;
  draw.fillStyle = `rgb(${tone.join(',')})`; draw.fillRect(x, y, w, h);
  // Brown underneath showing through the grey, strongest along the edges where the weather reached less.
  for (let row = 0; row < h; row++) {
    const edge = Math.min(row, h - 1 - row) / h;
    const brown = sheltered * (1 - smooth(edge * 6)) + .18 * noise(row / 3, seed, 1);
    draw.fillStyle = `rgba(112,82,52,${brown})`; draw.fillRect(x, y + row, w, 1);
  }
  // Grain: long wavy lines.
  for (let n = 0; n < h * .9; n++) {
    const y0 = y + random() * h, dark = random() < .6;
    draw.strokeStyle = dark ? `rgba(70,62,52,${.12 + random() * .25})` : `rgba(196,190,176,${.08 + random() * .16})`;
    draw.lineWidth = .6 + random() * 1.2;
    draw.beginPath();
    for (let step = 0; step <= w; step += 8) {
      const wave = Math.sin(step / (30 + random() * 3) + n) * 1.4 + (noise(step / 50, n, seed) - .5) * 4;
      if (step === 0) draw.moveTo(x, y0 + wave); else draw.lineTo(x + step, Math.min(y + h - .5, Math.max(y + .5, y0 + wave)));
    }
    draw.stroke();
  }
  // Knots, with the grain swirling dark round them.
  for (let n = 0; n < knots; n++) {
    const kx = x + 20 + random() * (w - 40), ky = y + h * (.25 + random() * .5), r = 3 + random() * 5;
    for (let ring = 4; ring >= 0; ring--) {
      draw.strokeStyle = `rgba(60,44,30,${.18 + ring * .05})`; draw.lineWidth = 1;
      draw.beginPath(); draw.ellipse(kx, ky, r + ring * 3.5, r * .6 + ring * 1.2, 0, 0, Math.PI * 2); draw.stroke();
    }
    draw.fillStyle = 'rgba(52,36,24,.85)'; draw.beginPath(); draw.ellipse(kx, ky, r, r * .6, 0, 0, Math.PI * 2); draw.fill();
  }
  // A split running in from one end.
  if (random() < .7) {
    const sy = y + h * (.3 + random() * .4), from = random() < .5 ? x : x + w, length = 30 + random() * 70;
    draw.strokeStyle = 'rgba(30,24,20,.8)'; draw.lineWidth = 1.3;
    draw.beginPath(); draw.moveTo(from, sy); draw.lineTo(from + (from === x ? length : -length), sy + (random() - .5) * 4); draw.stroke();
  }
  // Dirt and grit.
  for (let n = 0; n < w * h / 60; n++) {
    draw.fillStyle = `rgba(${random() < .5 ? '58,48,38' : '170,160,140'},${.08 + random() * .14})`;
    draw.fillRect(x + random() * w, y + random() * h, 1 + random() * 2, 1 + random() * 2);
  }
}
function nail(draw, nx, ny, run = 14) {
  draw.fillStyle = 'rgba(118,60,28,.45)'; draw.fillRect(nx - 1.5, ny, 3, run);
  draw.fillStyle = '#3c3028'; draw.beginPath(); draw.arc(nx, ny, 2.6, 0, Math.PI * 2); draw.fill();
  draw.fillStyle = 'rgba(170,120,80,.6)'; draw.beginPath(); draw.arc(nx - .7, ny - .7, 1, 0, Math.PI * 2); draw.fill();
}
// Stencilled letters with the bridges a stencil leaves and paint worn off in patches.
function stencil(draw, text, cx, cy, size, {angle = 0, alpha = .78, seed = 3, width} = {}) {
  const random = seeded(seed);
  draw.save(); draw.translate(cx, cy); draw.rotate(angle);
  draw.font = `bold ${size}px Impact, "Arial Black", sans-serif`; draw.textAlign = 'center'; draw.textBaseline = 'middle';
  if (width) { const measured = draw.measureText(text).width; if (measured > width) draw.scale(width / measured, 1); }
  draw.globalAlpha = alpha; draw.fillStyle = '#1e1a16'; draw.fillText(text, 0, 0);
  // The stencil's bridges: thin upright gaps through each letter.
  draw.globalCompositeOperation = 'destination-out';
  const across = draw.measureText(text).width;
  for (let x = -across / 2; x < across / 2; x += size * .52) draw.fillRect(x + size * .2, -size * .08, size * .07, size * .16);
  // Worn patches.
  for (let n = 0; n < 40; n++) {
    draw.globalAlpha = .3 + random() * .6;
    draw.beginPath(); draw.ellipse((random() - .5) * across, (random() - .5) * size, 2 + random() * size * .25, 1 + random() * size * .12, random() * 3, 0, Math.PI * 2); draw.fill();
  }
  draw.restore();
}
function crateWoodTexture() {
  return canvasTexture(512, 512, draw => {
    // The end board: two planks one above the other, a hand-hole, the stencil, a nail at each corner.
    const end = WOOD.end;
    grain(draw, {...end, h: end.h / 2}, {seed: 11, knots: 1});
    grain(draw, {...end, y: end.y + end.h / 2, h: end.h / 2}, {seed: 12, knots: 1, tone: [98, 92, 82]});
    draw.fillStyle = 'rgba(26,20,16,.85)'; draw.fillRect(end.x, end.y + end.h / 2 - 1, end.w, 2);
    draw.fillStyle = '#17120e';
    draw.beginPath(); draw.ellipse(end.x + end.w / 2, end.y + 28, 34, 10, 0, 0, Math.PI * 2); draw.fill();
    draw.fillStyle = 'rgba(150,120,90,.35)'; draw.fillRect(end.x + end.w / 2 - 34, end.y + 37, 68, 2);
    stencil(draw, 'TIN TOWN STORES', end.x + end.w / 2, end.y + 84, 30, {width: 226, seed: 5});
    stencil(draw, 'No 4', end.x + end.w / 2 + 50, end.y + 136, 34, {seed: 6, alpha: .7});
    stencil(draw, 'KEEP DRY', end.x + end.w / 2 - 54, end.y + 168, 18, {seed: 7, alpha: .55});
    for (const [nx, ny] of [[10, 12], [end.w - 10, 12], [10, end.h - 16], [end.w - 10, end.h - 16], [10, end.h / 2 + 10], [end.w - 10, end.h / 2 + 10]])
      nail(draw, end.x + nx, end.y + ny, 10);
    // Six slats, two of them with the crate's side stencil running through.
    WOOD.slats.forEach((rect, index) => {
      grain(draw, rect, {seed: 20 + index, knots: index % 2, tone: index % 3 === 2 ? [92, 86, 76] : [106, 100, 90]});
      if (index === 1) stencil(draw, 'THIS WAY UP', rect.x + rect.w * .42, rect.y + rect.h / 2, 24, {seed: 9, width: 160});
      if (index === 4) stencil(draw, '↑ ↑', rect.x + rect.w * .8, rect.y + rect.h / 2, 26, {seed: 10, alpha: .6});
      for (const nx of [8, rect.w - 8]) nail(draw, rect.x + nx, rect.y + rect.h * .3, 8);
    });
    // The lip board, nailed on afterwards: paler, newer pine with saw marks.
    grain(draw, WOOD.lip, {seed: 40, tone: [136, 114, 84], sheltered: .1, knots: 1});
    for (let n = 0; n < 30; n++) { draw.strokeStyle = 'rgba(110,84,56,.18)'; draw.beginPath(); const sx = n * 9; draw.arc(sx, WOOD.lip.y - 60, 90, 1.2, 1.9); draw.stroke(); }
    for (const nx of [9, WOOD.lip.w - 9]) nail(draw, WOOD.lip.x + nx, WOOD.lip.y + 14, 6);
    // A long plank (the coop's ramp), battens and a pole (the perch), and a concrete block.
    grain(draw, WOOD.plank, {seed: 50, knots: 2, tone: [96, 90, 80], sheltered: .35});
    grain(draw, WOOD.batten, {seed: 51, knots: 1, tone: [104, 96, 84]});
    grain(draw, WOOD.pole, {seed: 52, knots: 0, tone: [120, 96, 70], sheltered: .5});
    const block = WOOD.block, random = seeded(60);
    draw.fillStyle = '#5c5a54'; draw.fillRect(block.x, block.y, block.w, block.h);
    for (let n = 0; n < 2400; n++) {
      draw.fillStyle = `rgba(${random() < .5 ? '52,50,46' : '150,148,140'},${.12 + random() * .3})`;
      draw.fillRect(block.x + random() * block.w, block.y + random() * block.h, 1 + random() * 3, 1 + random() * 3);
    }
    for (let n = 0; n < 6; n++) {
      draw.strokeStyle = 'rgba(40,38,34,.6)'; draw.lineWidth = 1; draw.beginPath();
      let px = block.x + random() * block.w, py = block.y + random() * block.h; draw.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (random() - .5) * 24; py += random() * 14; draw.lineTo(px, py); }
      draw.stroke();
    }
    const mud = draw.createLinearGradient(0, block.y + block.h, 0, block.y + block.h * .55);
    mud.addColorStop(0, 'rgba(54,40,28,.85)'); mud.addColorStop(1, 'rgba(70,50,34,0)');
    draw.fillStyle = mud; draw.fillRect(block.x, block.y, block.w, block.h);
  }, {key: 'wood'});
}

// Straw: dry gold stalks crossing every way over darker, older straw and shadow.
function strawTexture() {
  return canvasTexture(256, 256, (draw, w, h) => {
    const random = seeded(71);
    draw.fillStyle = '#463820'; draw.fillRect(0, 0, w, h);
    for (let n = 0; n < 900; n++) {
      const x = random() * w, y = random() * h, angle = random() * Math.PI, length = 10 + random() * 46;
      const light = random();
      draw.strokeStyle = light > .9 ? `rgba(200,172,112,${.7 + random() * .3})` : light > .4 ? `rgba(${150 + random() * 26},${120 + random() * 20},${66 + random() * 16},.85)`
        : `rgba(${100 + random() * 20},${80 + random() * 14},${46 + random() * 10},.8)`;
      draw.lineWidth = .8 + random() * 1.6;
      draw.beginPath(); draw.moveTo(x, y); draw.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length); draw.stroke();
    }
  }, {repeat: true, key: 'straw'});
}

// Hardware cloth: 13 mm square welded wire, galvanised, on a clear ground.
function wireTexture() {
  return canvasTexture(128, 128, (draw, w, h) => {
    draw.clearRect(0, 0, w, h);
    draw.strokeStyle = 'rgba(150,148,140,1)'; draw.lineWidth = 1.6;
    for (let n = 0; n <= 8; n++) {
      const at = n * w / 8;
      draw.beginPath(); draw.moveTo(at, 0); draw.lineTo(at, h); draw.stroke();
      draw.beginPath(); draw.moveTo(0, at); draw.lineTo(w, at); draw.stroke();
    }
    draw.fillStyle = 'rgba(120,70,40,.7)';
    for (let n = 0; n < 9; n++) for (let m = 0; m < 9; m++) if ((n * 7 + m * 3) % 5 === 0) draw.fillRect(n * 16 - 1.5, m * 16 - 1.5, 3, 3);
  }, {repeat: true, key: 'wire'});
}

// A brown egg's shell: warm brown, a little darker at the broad end, with fine freckles and a chalky bloom.
function eggTexture() {
  return canvasTexture(128, 64, (draw, w, h) => {
    const random = seeded(81);
    const shade = draw.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, '#8a4c2a'); shade.addColorStop(1, '#a0643e');
    draw.fillStyle = shade; draw.fillRect(0, 0, w, h);
    for (let n = 0; n < 380; n++) {
      draw.fillStyle = random() < .7 ? `rgba(92,48,26,${.15 + random() * .3})` : `rgba(214,170,130,${.12 + random() * .2})`;
      draw.beginPath(); draw.arc(random() * w, random() * h, .4 + random() * 1.2, 0, Math.PI * 2); draw.fill();
    }
  }, {key: 'egg'});
}

// ---- Geometry helpers -------------------------------------------------------------------------------------------

// A box whose faces wear one rect of a picture, with the picture's long side along each face's long side.
function board(sx, sy, sz, rect, size = 512) {
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  const uv = geometry.attributes.uv;
  // Faces in order +x, -x, +y, -y, +z, -z; each face's u and v run along these axes.
  const axes = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let face = 0; face < 6; face++) {
    const [along, across] = axes[face], swap = along < across;
    for (let corner = 0; corner < 4; corner++) {
      const index = face * 4 + corner;
      let u = uv.getX(index), v = uv.getY(index);
      if (swap) [u, v] = [v, u];
      uv.setXY(index, (rect.x + u * rect.w) / size, 1 - (rect.y + (1 - v) * rect.h) / size);
    }
  }
  return geometry;
}

// A corrugated sheet in its own plane: ribs run up (y), across x, the face looking along +z. The foot is at y 0.
// `top(x)` gives the height of the top edge at x (a gable is cut on a slant); `holes` are openings {x0, x1, y0, y1};
// `dents` are {x, y, r, depth}; `u` is the range of the picture across the sheet, so that sheets differ.
function corrugated(width, height, {top = () => height, holes = [], dents = [], u = [0, 1], pitch = .076, depth = .018, rows = 6, seed = 1} = {}) {
  const columns = Math.round(width / (pitch / 4));
  const breaks = new Set(); for (let r = 0; r <= rows; r++) breaks.add(r / rows);
  for (const hole of holes) { breaks.add(hole.y0 / height); breaks.add(hole.y1 / height); }
  const levels = [...breaks].filter(level => level >= 0 && level <= 1).sort((a, b) => a - b);
  const positions = [], uv = [], indices = [];
  for (let c = 0; c <= columns; c++) {
    const x = -width / 2 + width * c / columns, topAt = top(x);
    for (const level of levels) {
      const y = level * topAt;
      let z = Math.sin(2 * Math.PI * (x + width / 2) / pitch) * depth / 2;
      for (const dent of dents) z -= dent.depth * Math.exp(-((x - dent.x) ** 2 + (y - dent.y) ** 2) / (dent.r * dent.r));
      // A sheet is never quite flat: a slow wave across it.
      z += (noise(x * 1.3, y * 1.3, seed) - .5) * .012;
      positions.push(x, y, z);
      uv.push(u[0] + (u[1] - u[0]) * c / columns, y / height);
    }
  }
  const per = levels.length;
  for (let c = 0; c < columns; c++) for (let r = 0; r < per - 1; r++) {
    const cx = -width / 2 + width * (c + .5) / columns, cy = (levels[r] + levels[r + 1]) / 2 * top(cx);
    if (holes.some(hole => cx > hole.x0 && cx < hole.x1 && cy > hole.y0 && cy < hole.y1)) continue;
    const a = c * per + r, b = a + per;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}
const placed = (geometry, {x = 0, y = 0, z = 0, yaw = 0, pitch = 0, roll = 0} = {}) =>
  geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ')), new THREE.Vector3(1, 1, 1)));
// Merge geometries that may differ in their attributes, keeping position, normal and uv.
function merged(list) {
  const clean = list.map(geometry => {
    const plain = geometry.index ? geometry.toNonIndexed() : geometry;
    if (!plain.attributes.normal) plain.computeVertexNormals();
    for (const name of Object.keys(plain.attributes)) if (!['position', 'normal', 'uv'].includes(name)) plain.deleteAttribute(name);
    return plain;
  });
  return mergeGeometries(clean, false);
}
const triangles = geometry => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
function costOf(root) {
  let draws = 0, count = 0;
  root.traverse(node => {
    if (!(node.isMesh || node.isLine || node.isPoints)) return;
    draws++; count += triangles(node.geometry) * (node.isInstancedMesh ? node.count : 1);
  });
  return {draws, triangles: Math.round(count)};
}
function disposeOf(root) {
  const seen = new Set();
  root.traverse(node => {
    if (node.userData.shared) return;
    if (node.geometry && !seen.has(node.geometry)) { seen.add(node.geometry); node.geometry.dispose(); }
    for (const m of [node.material].flat().filter(Boolean)) if (!seen.has(m)) { seen.add(m); m.dispose(); }
  });
}

// ---- The egg ----------------------------------------------------------------------------------------------------

// The egg's long axis along x, its middle at the origin; lying on its side its centre is HOME_EGG_SIZE.width / 2 up.
// The narrow end is towards +x.
export function createEgg({name = HOME_HENS_PARTS.egg.name} = {}) {
  const a = HOME_EGG_SIZE.length / 2, b = HOME_EGG_SIZE.width / 2, points = [];
  for (let n = 0; n <= 12; n++) {
    const t = -Math.cos(Math.PI * n / 12), r = b * Math.sqrt(Math.max(0, 1 - t * t)) * (1 - .12 * t);
    points.push(new THREE.Vector2(r, t * a));
  }
  const geometry = new THREE.LatheGeometry(points, 14).rotateZ(-Math.PI / 2);
  const shell = material('home egg shell', 0xffffff, {map: eggTexture(), roughness: .62});
  if (!shell.map) shell.color.setHex(0xa8683c);
  const egg = new THREE.Mesh(geometry, shell);
  egg.name = name; egg.castShadow = true; egg.receiveShadow = true;
  egg.userData.rest = b;
  return egg;
}

// ---- The nest box -----------------------------------------------------------------------------------------------

// An old fruit crate stood on its side with its open top to the front (+z), on two concrete blocks: its solid end
// boards at the sides with the crate's stencil, its slatted sides as floor and roof, its slatted bottom as the back,
// a fresher board nailed across the front foot to hold the straw in, and a bed of straw with a cup in the middle.
// `userData.setEgg(shown)` shows the egg; `userData.seat` is where a sitting hen's feet go, in the box's own metres.
export function createNestBox({name = HOME_HENS_PARTS.nestBox.name, egg = false} = {}) {
  const {width: W, height: H, depth: D, lift} = HOME_NEST_SIZE, T = .016;
  const box = new THREE.Group(); box.name = name;
  const wood = material('home crate wood', 0xffffff, {map: crateWoodTexture(), roughness: .92});
  if (!wood.map) wood.color.setHex(0x827a6c);
  const parts = [];
  // End boards.
  for (const side of [-1, 1]) parts.push(placed(board(T, H, D, WOOD.end), {x: side * (W / 2 - T / 2), y: lift + H / 2}));
  // Floor and roof: three slats each, running between the end boards, with gaps.
  const slat = .1, gap = (D - 3 * slat) / 2;
  for (let n = 0; n < 3; n++) {
    const z = -D / 2 + slat / 2 + n * (slat + gap);
    parts.push(placed(board(W - 2 * T, .012, slat, WOOD.slats[n]), {y: lift + .006, z}));
    parts.push(placed(board(W - 2 * T, .012, slat, WOOD.slats[3 + n]), {y: lift + H - .006, z, roll: (n - 1) * .004}));
  }
  // The back: three slats stacked, the crate's bottom.
  const backGap = (H - 3 * slat) / 2;
  for (let n = 0; n < 3; n++)
    parts.push(placed(board(W - 2 * T, slat, .012, WOOD.slats[(n + 2) % 6]), {y: lift + slat / 2 + n * (slat + backGap), z: -D / 2 + .006}));
  // Inside corner battens that hold the crate together.
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    parts.push(placed(board(.022, H - .03, .022, WOOD.batten), {x: sx * (W / 2 - T - .011), y: lift + H / 2, z: sz * (D / 2 - .011 - (sz > 0 ? .012 : 0))}));
  // The lip board across the front, a little proud and not quite level.
  parts.push(placed(board(W + .02, .09, .016, WOOD.lip), {y: lift + .055, z: D / 2 + .008, roll: .012}));
  const crate = new THREE.Mesh(merged(parts), wood); crate.name = name + '-crate';
  crate.castShadow = crate.receiveShadow = true; box.add(crate);

  // Two concrete blocks under the ends, front to back.
  const blockMaterial = wood;
  const blocks = merged([-1, 1].map(side => placed(board(.19, lift, .39, WOOD.block), {x: side * (W / 2 - .1), y: lift / 2, z: (side > 0 ? .01 : -.015)})));
  const blockMesh = new THREE.Mesh(blocks, blockMaterial); blockMesh.name = name + '-blocks';
  blockMesh.castShadow = blockMesh.receiveShadow = true; box.add(blockMesh);

  // The straw bed: high round the walls, a cup in the middle, spilling up to the lip at the front.
  const straw = strawTexture();
  const strawMaterial = material('home straw', 0xffffff, {map: straw, roughness: 1});
  if (!straw) strawMaterial.color.setHex(0x9c7e48);
  const bedW = W - 2 * T - .004, bedD = D - .03;
  const bed = new THREE.PlaneGeometry(bedW, bedD, 14, 12).rotateX(-Math.PI / 2);
  const cup = {x: 0, z: .02};
  const bedPositions = bed.attributes.position;
  for (let n = 0; n < bedPositions.count; n++) {
    const x = bedPositions.getX(n), z = bedPositions.getZ(n);
    const toWall = Math.min(bedW / 2 - Math.abs(x), bedD / 2 - Math.abs(z));
    const inCup = Math.hypot((x - cup.x) / .11, (z - cup.z) / .1);
    let y = .07 + .04 * (1 - smooth(toWall / .06)) - .035 * (1 - smooth(inCup)) + (noise(x * 40, z * 40, 3) - .5) * .02;
    if (z > bedD / 2 - .05) y = Math.max(y, .08);
    bedPositions.setY(n, y);
  }
  bed.computeVertexNormals();
  bed.attributes.uv.array.forEach((value, index, array) => { array[index] = value * 2; });
  const bedMesh = new THREE.Mesh(placed(bed, {y: lift + .012, z: -.004}), strawMaterial);
  bedMesh.name = name + '-straw'; bedMesh.receiveShadow = true; box.add(bedMesh);

  // Loose stalks: lying on the bed, poking over the lip and dropped on the ground in front.
  const stalk = new THREE.BoxGeometry(.1, .0022, .0032).translate(.05, 0, 0);
  const stalkMaterial = material('home straw stalks', 0x7a6640, {roughness: 1});
  const stalks = new THREE.InstancedMesh(stalk, stalkMaterial, 150);
  stalks.name = name + '-stalks';
  const random = seeded(97), matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  for (let n = 0; n < stalks.count; n++) {
    let x, y, z, tilt;
    if (n < 90) {
      // Round the cup, not over it, so that an egg in it shows.
      do { x = (random() - .5) * bedW * .9; z = (random() - .5) * bedD * .85; } while (Math.hypot((x - cup.x) / .1, (z - cup.z) / .09) < 1);
      y = lift + .012 + .07 + random() * .03; tilt = (random() - .5) * .5;
    }
    else if (n < 125) { x = (random() - .5) * W * .9; z = D / 2 - .02 + random() * .03; y = lift + .1 + random() * .02; tilt = -.3 - random() * .9; }
    else { x = (random() - .5) * W * 1.6; z = D / 2 + .05 + random() * .45; y = .004; tilt = (random() - .5) * .1; }
    euler.set(0, random() * Math.PI * 2, tilt, 'YXZ');
    if (n >= 90 && n < 125) euler.set(0, Math.PI / 2 + (random() - .5) * 1.2, tilt, 'YXZ');
    matrix.compose(new THREE.Vector3(x, y, z), quaternion.setFromEuler(euler), new THREE.Vector3(.6 + random() * .8, 1, 1));
    stalks.setMatrixAt(n, matrix);
  }
  stalks.castShadow = true; box.add(stalks);

  const laid = createEgg();
  laid.position.set(cup.x - .015, lift + .012 + .07 - .035 + laid.userData.rest + .002, cup.z + .01);
  laid.rotation.set(.12, .5, .05);
  laid.visible = egg; box.add(laid);
  box.userData = {
    egg: laid, seat: {x: cup.x, y: lift + .012 + .05, z: cup.z},
    setEgg(shown) { laid.visible = !!shown; },
  };
  return box;
}

// ---- The coop ---------------------------------------------------------------------------------------------------

// Level 1, in tin: a garden-shed-sized house, its ridge along x and its front (+z) facing his lane. The front has the
// hens' pop door with its sliding hatch held up and a cleated ramp down to the ground, and a window covered in wire;
// the east end has a door for him, braced with battens. Inside, a perch across the length and a floor of old straw.
// The sheets are galvanised, rusting at the foot and the eaves, a little dented.
export function createTinCoop({name = HOME_HENS_PARTS.coop.name} = {}) {
  const {length: L, depth: D, eave: E, ridge: R} = HOME_COOP_SIZE;
  const coop = new THREE.Group(); coop.name = name;
  const tinMap = coopTinTexture();
  const tin = material('home coop tin', 0xffffff, {map: tinMap, roughness: .8, metalness: .18, side: THREE.DoubleSide});
  if (!tinMap) tin.color.setHex(0x8c8a82);
  const wood = material('home coop wood', 0xffffff, {map: crateWoodTexture(), roughness: .92});
  if (!wood.map) wood.color.setHex(0x7a705e);
  const iron = material('home coop iron', 0x3e342c, {roughness: .85, metalness: .25});
  const wire = material('home coop wire', 0xffffff, {map: wireTexture(), transparent: true, alphaTest: .25, side: THREE.DoubleSide, roughness: .6, metalness: .3});
  const floor = material('home coop floor', 0x4a3c28, {roughness: 1});

  const pop = {x0: -.72, x1: -.42, y0: .2, y1: .56};
  const pane = {x0: .2, x1: .66, y0: .66, y1: 1};
  const sheets = [];
  // The front and back walls, each two overlapping sheets so that the picture changes at the lap.
  const halves = [[-L / 4 - .02, L / 2 + .08, [0, .5], 0], [L / 4 + .02, L / 2 + .08, [.45, .95], .007]];
  for (const [x, width, u, lap] of halves) {
    const shift = hole => ({x0: hole.x0 - x, x1: hole.x1 - x, y0: hole.y0, y1: hole.y1});
    sheets.push(placed(corrugated(width, E, {holes: [pop, pane].map(shift), u, seed: 3 + x * 10,
      dents: x < 0 ? [{x: .2, y: .35, r: .14, depth: .025}] : [{x: -.1, y: .9, r: .1, depth: .015}]}), {x, z: D / 2 + lap}));
    sheets.push(placed(corrugated(width, E, {u: [u[0] + .05, u[1] + .05], seed: 9 + x * 10,
      dents: x > 0 ? [{x: .05, y: .4, r: .18, depth: .03}] : []}), {x, z: -D / 2 - lap, yaw: Math.PI}));
  }
  // The gable ends.
  const gable = x => E + (R - E) * (1 - Math.abs(x) / (D / 2));
  for (const side of [-1, 1]) sheets.push(placed(corrugated(D, R, {top: gable, rows: 8, u: [.1 + side * .05, .9], seed: 20 + side}),
    {x: side * L / 2, yaw: side * Math.PI / 2}));
  // The roof: two sheets a side, ribs down the slope, overhanging the walls.
  const slope = Math.atan2(R - E, D / 2), over = .14, run = Math.hypot(D / 2, R - E) + over;
  for (const side of [-1, 1]) for (const [x, u] of [[-L / 4 - .04, [0, .55]], [L / 4 + .04, [.4, .95]]]) {
    const sheetGeometry = corrugated(L / 2 + .22, run, {rows: 4, u, seed: 30 + side * 3 + x,
      dents: side > 0 && x > 0 ? [{x: .1, y: .5, r: .2, depth: .02}] : []});
    // Lay the sheet back so that its foot is the eave and its top meets the ridge.
    const pitch = side * -(Math.PI / 2 - slope);
    const foot = {y: E - over * Math.sin(slope) + .03, z: side * (D / 2 + over * Math.cos(slope))};
    sheets.push(placed(sheetGeometry, {x, y: foot.y, z: foot.z, yaw: side > 0 ? 0 : Math.PI, pitch: side > 0 ? pitch : -pitch}));
  }
  // The ridge cap: a strip bent over the ridge, lying on each slope.
  for (const side of [-1, 1]) sheets.push(placed(new THREE.PlaneGeometry(L + .32, .16, 1, 1).translate(0, -.08, 0),
    {y: R + .045, z: 0, yaw: side > 0 ? 0 : Math.PI, pitch: -(Math.PI / 2 - slope)}));
  // His door on the east gable: a separate sheet standing proud of the wall.
  sheets.push(placed(corrugated(.62, 1.12, {u: [.6, .9], seed: 44, dents: [{x: .1, y: .5, r: .12, depth: .015}]}), {x: L / 2 + .035, z: .1, yaw: Math.PI / 2}));
  // The pop door's hatch, held up above the opening in its guides.
  sheets.push(placed(corrugated(.36, .42, {rows: 2, u: [.2, .4], seed: 50}), {x: (pop.x0 + pop.x1) / 2, y: pop.y1 - .08, z: D / 2 + .03}));
  const tinMesh = new THREE.Mesh(merged(sheets), tin); tinMesh.name = name + '-tin';
  tinMesh.castShadow = tinMesh.receiveShadow = true; coop.add(tinMesh);

  // Iron: corner angles, the hatch's guides and its wire, the door's hinges and bolt, a strap under the eaves.
  const irons = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    irons.push(placed(new THREE.BoxGeometry(.05, E + .02, .006), {x: sx * (L / 2 - .02), y: E / 2 + .01, z: sz * (D / 2 + .016)}));
    irons.push(placed(new THREE.BoxGeometry(.006, E + .02, .05), {x: sx * (L / 2 + .016), y: E / 2 + .01, z: sz * (D / 2 - .02)}));
  }
  for (const x of [pop.x0 - .025, pop.x1 + .025]) irons.push(placed(new THREE.BoxGeometry(.03, .92, .02), {x, y: pop.y0 + .44, z: D / 2 + .03}));
  irons.push(placed(new THREE.CylinderGeometry(.002, .002, .42, 4), {x: (pop.x0 + pop.x1) / 2, y: pop.y1 + .55, z: D / 2 + .035}));
  irons.push(placed(new THREE.CylinderGeometry(.012, .012, .03, 8).rotateX(Math.PI / 2), {x: (pop.x0 + pop.x1) / 2, y: pop.y1 + .78, z: D / 2 + .04}));
  for (const y of [.18, .98]) irons.push(placed(new THREE.BoxGeometry(.02, .035, .22), {x: L / 2 + .06, y, z: -.1}));
  irons.push(placed(new THREE.BoxGeometry(.02, .03, .12), {x: L / 2 + .06, y: .62, z: .37}));
  const ironMesh = new THREE.Mesh(merged(irons), iron); ironMesh.name = name + '-iron';
  ironMesh.castShadow = true; coop.add(ironMesh);

  // Timber: the ramp and its cleats, the window's frame and sill, the door's ledges and brace, the perch and its rests.
  const timber = [];
  const rampFoot = {y: 0, z: D / 2 + .78}, rampTop = {y: pop.y0 - .01, z: D / 2 + .04};
  const rampLength = Math.hypot(rampFoot.z - rampTop.z, rampTop.y), rampAngle = Math.atan2(rampTop.y, rampFoot.z - rampTop.z);
  const rampX = (pop.x0 + pop.x1) / 2;
  const ramp = new THREE.Group(); ramp.position.set(rampX, (rampTop.y + rampFoot.y) / 2 + .012, (rampTop.z + rampFoot.z) / 2); ramp.rotation.x = rampAngle;
  ramp.updateMatrix();
  timber.push(board(.28, .022, rampLength, WOOD.plank).applyMatrix4(ramp.matrix));
  for (let n = 0; n < 6; n++) timber.push(board(.24, .016, .02, WOOD.batten).translate(0, .019, -rampLength / 2 + .09 + n * (rampLength - .18) / 5).applyMatrix4(ramp.matrix));
  const frame = (x0, x1, y0, y1, z, wide = .045) => [
    placed(board(x1 - x0 + 2 * wide, wide, .025, WOOD.batten), {x: (x0 + x1) / 2, y: y1 + wide / 2, z}),
    placed(board(x1 - x0 + 2 * wide, wide, .025, WOOD.batten), {x: (x0 + x1) / 2, y: y0 - wide / 2, z}),
    placed(board(wide, y1 - y0, .025, WOOD.batten), {x: x0 - wide / 2, y: (y0 + y1) / 2, z}),
    placed(board(wide, y1 - y0, .025, WOOD.batten), {x: x1 + wide / 2, y: (y0 + y1) / 2, z})];
  timber.push(...frame(pane.x0, pane.x1, pane.y0, pane.y1, D / 2 + .03));
  timber.push(placed(board(pane.x1 - pane.x0 + .16, .025, .07, WOOD.batten), {x: (pane.x0 + pane.x1) / 2, y: pane.y0 - .05, z: D / 2 + .05}));
  for (const y of [.2, .62, 1.04]) timber.push(placed(board(.025, .07, .6, WOOD.batten), {x: L / 2 + .06, y, z: .1}));
  timber.push(placed(board(.025, .07, .95, WOOD.batten), {x: L / 2 + .06, y: .41, z: .1, pitch: Math.atan2(.42, .52)}));
  timber.push(placed(new THREE.CylinderGeometry(.024, .026, L - .12, 10).rotateZ(Math.PI / 2), {y: .62, z: -.2}));
  for (const side of [-1, 1]) timber.push(placed(board(.05, .05, .12, WOOD.batten), {x: side * (L / 2 - .05), y: .58, z: -.2}));
  const timberMesh = new THREE.Mesh(merged(timber), wood); timberMesh.name = name + '-timber';
  timberMesh.castShadow = timberMesh.receiveShadow = true; coop.add(timberMesh);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pane.x1 - pane.x0, pane.y1 - pane.y0), wire);
  mesh.position.set((pane.x0 + pane.x1) / 2, (pane.y0 + pane.y1) / 2, D / 2 + .022);
  const wireUv = mesh.geometry.attributes.uv;
  for (let n = 0; n < wireUv.count; n++) wireUv.setXY(n, wireUv.getX(n) * (pane.x1 - pane.x0) / .104, wireUv.getY(n) * (pane.y1 - pane.y0) / .104);
  mesh.name = name + '-wire'; coop.add(mesh);
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(L - .04, D - .04).rotateX(-Math.PI / 2).translate(0, .015, 0), floor);
  const floorUv = inside.geometry.attributes.uv;
  for (let n = 0; n < floorUv.count; n++) floorUv.setXY(n, floorUv.getX(n) * 3, floorUv.getY(n) * 2);
  floor.map = strawTexture(); if (floor.map) floor.color.setHex(0x6a5a46);
  inside.name = name + '-floor'; inside.receiveShadow = true; coop.add(inside);
  coop.userData = {popDoor: {x: (pop.x0 + pop.x1) / 2, y: pop.y0, z: D / 2}, rampFoot: {x: rampX, z: rampFoot.z}, perch: {y: .62, z: -.2}};
  return coop;
}

// ---- The hen ----------------------------------------------------------------------------------------------------

export async function loadHenModel(url = HOME_HEN_MODEL) {
  const {GLTFLoader} = await import('three/addons/loaders/GLTFLoader.js');
  return new GLTFLoader().loadAsync(url);
}

// A Lohmann Brown's coat, in sRGB, at a point of the model in its own metres (x forward, y up, z across). `part`
// is the bone the point rides on.
const COAT = Object.freeze({
  chestnut: [90, 36, 15], gold: [134, 68, 26], dark: [42, 18, 9], buff: [150, 102, 58], tail: [40, 22, 14],
  cream: [196, 172, 128], red: [168, 24, 22], horn: [196, 166, 98], leg: [188, 154, 78], eye: [190, 108, 32],
});
function coatAt(x, y, z, part) {
  if (part === 'leg') {
    const scale = .85 + .15 * noise(y * 260, x * 260, 4);
    return COAT.leg.map(value => value * scale);
  }
  const lateral = Math.abs(z);
  // Small feathers lapping from the head back, their edges only a little darker, the rows broken up by noise so that
  // the coat reads as feathers and not as scales. Broad patches of lighter and darker chestnut over it.
  const wobble = (noise(x * 90, y * 90, 5) - .5) * .7;
  const fu = x / .011 + wobble, fv = y / .008 + lateral / .013;
  const row = Math.floor(fv), cell = Math.floor(fu + (row & 1) * .5);
  const lu = fu + (row & 1) * .5 - cell - .5, lv = fv - row;
  const edge = smooth((Math.hypot(lu, lv - .3) - .36) / .22);
  const tone = .9 + .2 * hash(cell, row, 9);
  const patch = fbm(x * 22, y * 22 + z * 22, 3);
  // Each feather dark chestnut in the middle with a paler golden fringe, as on the photographed Lohmann Browns.
  let colour = mix(COAT.chestnut, COAT.gold, .1 + .3 * patch);
  colour = mix(colour, COAT.dark, (1 - edge) * smooth(lv) * .25);
  colour = mix(colour, COAT.gold, edge * .38).map(value => value * tone);
  // A golden sheen over the back and shoulders.
  colour = mix(colour, COAT.gold, .25 * smooth((y - .255) / .03) * smooth((.07 - x) / .05));
  // The hackles: long golden feathers with darker shafts falling from the head over the shoulders.
  const hackle = smooth((y - .27) / .035) * smooth((x - .03) / .05);
  if (hackle > 0) {
    const streak = .5 + .5 * Math.sin((z * 1.0 + x * .5) * 380 + noise(y * 80, z * 80, 2) * 5);
    colour = mix(colour, mix(COAT.gold, COAT.chestnut, .2 + streak * .6), hackle);
  }
  // The wings: coverts lapped like the body, and towards the tail darker flight feathers, a few with pale edges.
  const wing = smooth((lateral - .05) / .012) * smooth((y - .2) / .02) * smooth((.27 - y) / .02);
  if (wing > 0) {
    const tips = smooth((-.04 - x) / .05), bar = Math.sin(x * 300 - y * 140);
    const flight = mix(COAT.chestnut, COAT.dark, .4).map(value => value * (.88 + .18 * hash(Math.floor(x * 70), 3)));
    colour = mix(colour, bar > .9 && hash(Math.floor(x * 70), 5) > .5 ? mix(flight, COAT.cream, .55) : flight, wing * tips);
  }
  // The tail: dark brown feathers laced with chestnut.
  if (part === 'tail' || x < -.1) {
    const lace = .5 + .5 * Math.sin((y + x * .3) * 300 + noise(x * 60, y * 60, 8) * 3);
    const tail = mix(COAT.tail, COAT.chestnut, .25 + lace * .5);
    colour = mix(colour, tail, smooth((-.09 - x) / .035));
  }
  // The underside and the fluff round the thighs are paler, buff.
  colour = mix(colour, COAT.buff, .7 * smooth((.18 - y) / .04) * smooth((x + .1) / .06));
  // A little dust low down.
  return mix(colour, [150, 124, 96], .25 * smooth((.16 - y) / .06));
}

// Reshape and repaint the model once; every hen shares the result. In Node (no canvas) only the shape is changed.
function henLook(model) {
  if (model.userData.henLook) return model.userData.henLook;
  let source = null;
  model.scene.traverse(node => { if (node.isSkinnedMesh && !source) source = node; });
  if (!source) throw Error('The chicken model has no skinned mesh.');
  const geometry = source.geometry.clone();
  const names = source.skeleton.bones.map(bone => bone.name);
  const position = geometry.attributes.position, joints = geometry.attributes.skinIndex, weights = geometry.attributes.skinWeight;
  const uv = geometry.attributes.uv;
  const partOf = new Array(position.count);
  for (let n = 0; n < position.count; n++) {
    let best = 0;
    for (let k = 1; k < 4; k++) if (weights.getComponent(n, k) > weights.getComponent(n, best)) best = k;
    partOf[n] = names[joints.getComponent(n, best)];
  }
  // The original picture, read back so that the red skin (comb, wattles, face) and the eye can be found.
  let original = null;
  const image = source.material.map?.image;
  if (painting() && image) {
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const draw = canvas.getContext('2d'); draw.drawImage(image, 0, 0);
    original = {width: canvas.width, height: canvas.height, data: draw.getImageData(0, 0, canvas.width, canvas.height).data};
  }
  // The model's picture is read with flipY off (glTF): v 0 is the picture's first row.
  const flip = source.material.map?.flipY === true;
  const rowOf = (v, height) => flip ? Math.round((1 - v) * height - .5) : Math.round(v * height - .5);
  const sample = (u, v) => {
    if (!original) return null;
    const px = Math.min(original.width - 1, Math.max(0, Math.round(u * original.width - .5)));
    const py = Math.min(original.height - 1, Math.max(0, rowOf(v, original.height)));
    const at = (py * original.width + px) * 4;
    return [original.data[at], original.data[at + 1], original.data[at + 2]];
  };
  const index = geometry.index;
  const triangleCount = index.count / 3;
  const kindOf = new Array(triangleCount);
  const isRed = c => c && c[0] > 70 && c[0] > c[1] * 1.9 && c[0] > c[2] * 1.7;
  for (let t = 0; t < triangleCount; t++) {
    const [a, b, c] = [0, 1, 2].map(k => index.getX(t * 3 + k));
    const u = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, v = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    const colour = sample(u, v);
    const y = (position.getY(a) + position.getY(b) + position.getY(c)) / 3, x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
    const part = partOf[a];
    let kind = 'coat';
    if (/^(shank|foot)/.test(part) || (/^thigh/.test(part) && y < .12)) kind = 'leg';
    else if (isRed(colour)) kind = y > .392 ? 'comb' : y < .37 && x > .14 ? 'wattle' : 'face';
    else if (part === 'head' && x > .152 && colour && colour[0] > 60 && colour[1] > 45) kind = 'bill';
    else if (part === 'head' && colour && colour[0] + colour[1] + colour[2] < 40 && x > .13 && y > .372) kind = 'eye';
    kindOf[t] = kind;
  }
  // The shape: a laying hen is deeper and wider in the body than the village hen, with a big single comb and long
  // wattles. Vertices are moved in the model's bind pose, so the bones carry them as before.
  // `along` pushes a point away from a bone's line by `k`: the line runs from a to b ({x, y}) at the side z.
  const along = (p, a, b, z, k) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const qx = a.x + dx * t, qy = a.y + dy * t;
    p.x = qx + (p.x - qx) * k; p.y = qy + (p.y - qy) * k; p.z = z + (p.z - z) * k;
  };
  const HIP = {x: -.012, y: .2}, HOCK = {x: -.042, y: .104}, FOOT = {x: -.004, y: .014};
  const NECK = {x: .082, y: .25}, HEAD = {x: .124, y: .372};
  const moved = new Uint8Array(position.count), p = {x: 0, y: 0, z: 0};
  for (let t = 0; t < triangleCount; t++) for (let k = 0; k < 3; k++) {
    const n = index.getX(t * 3 + k);
    if (moved[n]) continue;
    moved[n] = 1;
    p.x = position.getX(n); p.y = position.getY(n); p.z = position.getZ(n);
    const part = partOf[n], kind = kindOf[t], side = Math.sign(p.z) * .036;
    if (['body', 'tail', 'neck1'].includes(part) && p.y > .13) {
      // Wider, and deeper in the belly.
      const middle = .225;
      p.z *= 1.32 * (part === 'tail' ? .9 : 1);
      if (p.y < middle) p.y = middle - (middle - p.y) * (1 + .8 * smooth((middle - p.y) / .06));
      // The round, feathery rear of a laying hen behind her legs.
      if (p.x < -.02 && part === 'body') { const back = smooth((-.02 - p.x) / .06); p.x = -.02 + (p.x + .02) * (1 + .12 * back); p.y = middle + (p.y - middle) * (1 + .1 * back); }
    }
    // The tail fans out a little sideways, as a laying hen's does, so that from above it is a wedge and not two spikes.
    if (part === 'tail') {
      p.z *= 1 + 2 * smooth((-.1 - p.x) / .06);
      // Shorter than the village hen's, so that it reads as a laying hen's tail and not as spikes.
      const rx = p.x + .104, ry = p.y - .247;
      if (rx < 0) { p.x = -.104 + rx * .78; p.y = .247 + ry * .78; }
    }
    // The folded wings lie on the flanks: where the widened body narrows towards the back, the wing's upper edge is
    // drawn in to the body so that from above it does not stand out like a flap.
    if (part === 'body' && p.y > .225 && p.x > -.13 && p.x < .08) {
      const body = .064 * 1.32 * Math.sqrt(Math.max(0, 1 - ((p.y - .222) / .075) ** 2)) + .006, out = Math.abs(p.z);
      if (out > body) p.z = Math.sign(p.z) * (body + (out - body) * .3);
    }
    // A full neck of hackles, not a village hen's thin one.
    if (['neck1', 'neck2'].includes(part) || (part === 'body' && p.x > .05 && p.y > .24)) along(p, NECK, HEAD, 0, 1.35);
    // Fluffy thighs down to the hock, and stouter shanks.
    if (/^thigh/.test(part) && kind !== 'leg') {
      const down = Math.min(1, Math.max(0, (HIP.y - p.y) / (HIP.y - HOCK.y)));
      along(p, HIP, HOCK, side, 1.7 + 1.3 * down);
    }
    if (/^shank/.test(part)) along(p, HOCK, FOOT, side, 1.3);
    if (kind === 'comb') { p.y = .392 + (p.y - .392) * 2.8; p.x = .142 + (p.x - .142) * 1.3; }
    if (kind === 'wattle') { p.y = .368 - (.368 - p.y) * 1.9; p.x = .156 + (p.x - .156) * 1.3; p.z *= 1.25; }
    position.setXYZ(n, p.x, p.y, p.z);
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();

  // The coat, baked into the model's own picture triangle by triangle, at the size of the original.
  let map = null;
  if (original) {
    const width = original.width, height = original.height;
    const out = new Uint8ClampedArray(width * height * 4), written = new Uint8Array(width * height);
    const pa = new THREE.Vector3(), pb = new THREE.Vector3(), pc = new THREE.Vector3();
    for (let t = 0; t < triangleCount; t++) {
      const [a, b, c] = [0, 1, 2].map(k => index.getX(t * 3 + k));
      pa.fromBufferAttribute(position, a); pb.fromBufferAttribute(position, b); pc.fromBufferAttribute(position, c);
      const ua = [uv.getX(a) * width, uv.getY(a) * height], ub = [uv.getX(b) * width, uv.getY(b) * height], uc = [uv.getX(c) * width, uv.getY(c) * height];
      const area = (ub[0] - ua[0]) * (uc[1] - ua[1]) - (uc[0] - ua[0]) * (ub[1] - ua[1]);
      if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ua[0], ub[0], uc[0]) - 1)), x1 = Math.min(width - 1, Math.ceil(Math.max(ua[0], ub[0], uc[0]) + 1));
      const y0 = Math.max(0, Math.floor(Math.min(ua[1], ub[1], uc[1]) - 1)), y1 = Math.min(height - 1, Math.ceil(Math.max(ua[1], ub[1], uc[1]) + 1));
      const kind = kindOf[t], part = partOf[a];
      for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
        const sx = px + .5, sy = py + .5;
        const w1 = ((ub[0] - sx) * (uc[1] - sy) - (uc[0] - sx) * (ub[1] - sy)) / area;
        const w2 = ((uc[0] - sx) * (ua[1] - sy) - (ua[0] - sx) * (uc[1] - sy)) / area;
        const w3 = 1 - w1 - w2;
        if (w1 < -.08 || w2 < -.08 || w3 < -.08) continue;
        const x = pa.x * w1 + pb.x * w2 + pc.x * w3, y = pa.y * w1 + pb.y * w2 + pc.y * w3, z = pa.z * w1 + pb.z * w2 + pc.z * w3;
        const was = sample(sx / width, sy / height);
        let colour;
        if (kind === 'comb' || kind === 'wattle' || kind === 'face') {
          const fold = .72 + .28 * noise(x * 600, y * 600, 7);
          colour = COAT.red.map(value => value * fold * (kind === 'face' ? .92 : 1));
        } else if (kind === 'bill') colour = COAT.horn.map((value, i) => value * .7 + (was?.[i] ?? value) * .3);
        else if (kind === 'eye') colour = Math.hypot(y - .381, x - .146) < .0035 ? [20, 14, 10] : COAT.eye;
        else colour = coatAt(x, y, z, kind === 'leg' ? 'leg' : part);
        const at = (flip ? height - 1 - py : py) * width + px;
        // A texel already painted by a triangle that covers it properly keeps its colour.
        const inside = w1 >= 0 && w2 >= 0 && w3 >= 0;
        if (written[at] === 2 && !inside) continue;
        out.set([colour[0], colour[1], colour[2], 255], at * 4);
        written[at] = inside ? 2 : Math.max(written[at], 1);
      }
    }
    // Fill the gaps between islands with the nearest painted colour, so that mipmaps do not bleed black.
    for (let pass = 0; pass < 4; pass++) {
      const next = written.slice();
      for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
        const at = py * width + px;
        if (written[at]) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const qx = px + dx, qy = py + dy;
          if (qx < 0 || qy < 0 || qx >= width || qy >= height || !written[qy * width + qx]) continue;
          out.copyWithin(at * 4, (qy * width + qx) * 4, (qy * width + qx) * 4 + 4); next[at] = 1; break;
        }
      }
      written.set(next);
    }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    canvas.getContext('2d').putImageData(new ImageData(out, width, height), 0, 0);
    map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.flipY = source.material.map.flipY;
    map.anisotropy = 4;
  }
  const coat = material('home hen coat', map ? 0xffffff : 0x74321a, {map, roughness: .86});
  return (model.userData.henLook = {geometry, material: coat});
}

const LATERAL = new THREE.Vector3(0, 0, 1), UP = new THREE.Vector3(0, 1, 0);
// Turn a bone about an axis given in the hen's own frame.
function turn(bone, axis, angle, hen) {
  if (!angle) return;
  const parent = bone.parent, frame = new THREE.Quaternion(), local = new THREE.Quaternion();
  hen.updateMatrixWorld(true);
  const henTurn = hen.getWorldQuaternion(new THREE.Quaternion());
  parent.getWorldQuaternion(frame);
  const inParent = axis.clone().applyQuaternion(henTurn).applyQuaternion(frame.invert());
  bone.quaternion.premultiply(local.setFromAxisAngle(inParent.normalize(), angle));
}
// A quick kick out and back over 0..1.
const kick = t => t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * Math.min(1, t * 1.6)) * (t < .62 ? 1 : 1 - (t - .62) / .38);

// One hen. `object` is placed and turned by the caller (her feet at its origin, her beak along its +x); `pose` is one
// of HOME_HEN_POSES; `update(seconds)` draws her at that moment of the pose, the same for the same seconds.
export function createHen(model, {name = HOME_HENS_PARTS.hen.name, band = 'blue', pose = 'peck', phase = 0} = {}) {
  const look = henLook(model);
  const object = new THREE.Group(); object.name = name;
  const body = cloneSkeleton(model.scene);
  object.add(body);
  let mesh = null;
  body.traverse(node => {
    if (node.isSkinnedMesh) { mesh = node; node.geometry = look.geometry; node.material = look.material; node.castShadow = true; node.receiveShadow = true; node.frustumCulled = false; node.userData.shared = true; }
  });
  mesh.name = name + '-body';
  // The loader drops the dots from bone names: 'shank.L' is shankL.
  const bones = Object.fromEntries(mesh.skeleton.bones.map(bone => [bone.name.replace('.', ''), bone]));
  const rest = Object.fromEntries(mesh.skeleton.bones.map(bone => [bone.name.replace('.', ''), {position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone()}]));
  // The leg band: a plastic ring on her left shank.
  const bandMaterial = material('home hen band', HOME_HEN_BANDS[band] ?? HOME_HEN_BANDS.blue, {roughness: .45});
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0105, .013, 10, 1, true), bandMaterial);
  ring.name = name + '-band'; ring.position.set(0, .055, 0); ring.castShadow = true;
  bandMaterial.side = THREE.DoubleSide;
  bones.shankL.add(ring);
  // A soft shade on the ground under her, so that she stands on it.
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(.36, .26).rotateX(-Math.PI / 2), createGroundShade());
  shade.name = name + '-shade'; shade.position.set(-.01, .006, 0); shade.renderOrder = 1; object.add(shade);
  const mixer = new THREE.AnimationMixer(body);
  const clip = id => model.animations.find(item => item.name === id);
  const actions = {idle: mixer.clipAction(clip('Idle'), body), walk: mixer.clipAction(clip('Walk'), body)};
  let current = pose;
  const reset = () => { for (const [id, held] of Object.entries(rest)) { bones[id].position.copy(held.position); bones[id].quaternion.copy(held.quaternion); bones[id].scale.copy(held.scale); } };
  const play = (action, time) => {
    for (const other of Object.values(actions)) if (other !== action) other.stop();
    action.play(); action.time = time % action.getClip().duration; mixer.update(0);
  };
  // A laying hen's neck is shorter and thicker than the village hen's: the upper neck and the head sit lower, into the hackles.
  const shorten = () => { bones.neck2.position.multiplyScalar(.8); bones.head.position.multiplyScalar(.85); };
  function update(seconds = 0) {
    drawPose(seconds); shorten();
  }
  function drawPose(seconds) {
    const t = seconds + phase;
    body.position.y = 0; body.scale.set(1, 1, 1);
    if (current === 'peck') play(actions.idle, t);
    else if (current === 'walk') play(actions.walk, t * 1.1);
    else if (current === 'stand') play(actions.idle, .4);
    else {
      mixer.stopAllAction(); reset();
      if (current === 'scratch') {
        // Two kicks back with the left foot, one with the right, then a look down and a peck at what she turned up.
        const cycle = 2.8, s = ((t % cycle) + cycle) % cycle;
        const left = kick(s / .34) + kick((s - .38) / .34), right = kick((s - .8) / .34);
        const down = smooth((s - 1.2) / .25) * (1 - smooth((s - 2.4) / .3));
        const peck = down * Math.max(0, Math.sin((s - 1.45) * 9)) * (s > 1.45 && s < 2.15 ? 1 : 0);
        turn(bones.body, LATERAL, -.22 - .5 * down, body);
        turn(bones.thighL, LATERAL, -.95 * left + .5 * right, body);
        turn(bones.shankL, LATERAL, .6 * left, body);
        turn(bones.thighR, LATERAL, -.95 * right + .35 * left, body);
        turn(bones.shankR, LATERAL, .6 * right, body);
        turn(bones.neck1, LATERAL, -.3 * down - .35 * peck, body);
        turn(bones.head, LATERAL, -.4 * down - .3 * peck, body);
      } else if (current === 'sit') {
        // Sunk down on the straw with her legs folded under, her head turning slowly as she watches.
        body.position.y = -.135; body.scale.set(1.05, 1, 1.25);
        for (const side of ['L', 'R']) bones['thigh' + side].scale.setScalar(.2);
        turn(bones.body, LATERAL, .1, body);
        turn(bones.neck1, LATERAL, .12, body);
        turn(bones.head, UP, Math.sin(t * .5) * .55, body);
      }
    }
  }
  update(0);
  return {
    object, mesh, bones,
    get pose() { return current; },
    setPose(next) { if (!HOME_HEN_POSES.includes(next)) throw RangeError('No hen pose called ' + next); current = next; },
    setBand(colour) { bandMaterial.color.setHex(HOME_HEN_BANDS[colour] ?? colour); },
    update,
    dispose() { mixer.stopAllAction(); bandMaterial.dispose(); ring.geometry.dispose(); shade.geometry.dispose(); shade.material.dispose(); },
  };
}

// ---- The look stand's scene -------------------------------------------------------------------------------------

// One coop, one nest box, two hens and two eggs, as HOME_HENS_LAYOUT puts them. `heightAt(x, z)` is the ground's
// height at a point in the stand's metres. Stage 'day': hen B sits in the box. Stage 'laid': she stands beside it, her
// egg shows in the straw, and he has set the other egg down by the ramp.
export function buildHomeHens({stage = 'day', heightAt = () => 0, model}) {
  if (!HOME_HENS_STAGES.includes(stage)) throw RangeError('No stage called ' + stage);
  if (!model) throw Error('The hens need the chicken model.');
  const L = HOME_HENS_LAYOUT;
  const group = new THREE.Group(); group.name = 'Home hens';
  const at = (x, z) => heightAt(x, z);
  // The coop sits a couple of centimetres into the ground at its highest corner, so that no gap shows at its foot.
  const coop = createTinCoop();
  const {length, depth} = HOME_COOP_SIZE;
  const corners = [-1, 1].flatMap(a => [-1, 1].map(b => at(L.coop.x + a * depth / 2, L.coop.z + b * length / 2)));
  coop.position.set(L.coop.x, Math.min(...corners) - .02, L.coop.z); coop.rotation.y = L.coop.yaw; group.add(coop);
  const nest = createNestBox({egg: stage === 'laid'});
  nest.position.set(L.nest.x, at(L.nest.x, L.nest.z) - .01, L.nest.z); nest.rotation.y = L.nest.yaw; group.add(nest);
  const henA = createHen(model, {name: 'home-hen-a', band: 'blue', pose: 'scratch'});
  const henB = createHen(model, {name: 'home-hen-b', band: 'yellow', pose: stage === 'laid' ? 'peck' : 'sit', phase: 1.7});
  group.add(henA.object, henB.object);
  const eggDown = createEgg({name: 'home-egg-set-down'});
  eggDown.position.set(L.eggDown.x, at(L.eggDown.x, L.eggDown.z) + eggDown.userData.rest - .003, L.eggDown.z);
  eggDown.rotation.y = .7; eggDown.visible = stage === 'laid'; group.add(eggDown);
  // Hen B's seat in the box, in the stand's metres.
  const seat = new THREE.Vector3(nest.userData.seat.x, nest.userData.seat.y, nest.userData.seat.z);
  nest.updateMatrix(); seat.applyMatrix4(nest.matrix);
  function update(seconds = 0) {
    henA.object.position.set(L.henA.x, at(L.henA.x, L.henA.z), L.henA.z); henA.object.rotation.y = L.henA.yaw;
    if (henB.pose === 'sit') { henB.object.position.copy(seat); henB.object.rotation.y = L.nest.yaw - Math.PI / 2 + .3; }
    else { henB.object.position.set(L.henB.x, at(L.henB.x, L.henB.z), L.henB.z); henB.object.rotation.y = L.henB.yaw; }
    henA.update(seconds); henB.update(seconds);
  }
  update(0);
  const cost = costOf(group);
  group.userData = {
    ...cost, lights: [], hens: [henA, henB], coop, nest, eggs: [nest.userData.egg, eggDown], update,
    parts: {hen: henA.object, nestBox: nest, coop, egg: eggDown},
    dispose() { henA.dispose(); henB.dispose(); disposeOf(group); },
  };
  return group;
}

// What one part costs, for the suite and the stand: {draws, triangles}.
export const partCost = costOf;
