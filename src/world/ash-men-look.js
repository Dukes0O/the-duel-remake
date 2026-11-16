// How the Ash Men's things are drawn (EVERBURN-REMAKE, job 1). Claude's drawing, shaped in code: no model files.
//
// A barricade is what a gang throws across a road in an afternoon: sheets of corrugated iron leant on a timber frame, oil drums
// at the ends, a stack of tyres, and sharpened stakes pointed at whoever is coming. Everything is scorched, because the Ash Men
// carry fire. Burnt, it is the same frame fallen in: black timber, the sheets flat on the ground, the drums split.
//
// `barricadeShape()` fills the box the job's solid shape uses (12 m long, 2 m high, 1.4 m through by default), standing on the
// ground at y 0, its length along x, its front toward +z (the side a car comes from). The stakes and the frame's tops stand a
// little outside that box, as real ones would; the solid shape stays the plain box.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, scrapSheetColours, scrapSteel, yardSheetPicture, yardSurface} from './scablands-yard-look.js';

const hash = (a, b = 0) => Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
const TIMBER = [0x6b5640, 0x7a6248, 0x5a4836], CHAR = [0x161412, 0x1f1b18, 0x262019], TYRE = 0x1b1a19;

export function barricadeShape({length = 12, height = 2, depth = 1.4, seed = 1, burnt = false} = {}) {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0), half = length / 2;
  const sheets = scrapSheetColours(), wood = index => (burnt ? CHAR : TIMBER)[Math.floor(hash(seed, index) * 3)];
  const soot = (hex, share) => new THREE.Color(hex).lerp(new THREE.Color(0x15120f), share).getHex();
  // The frame: a rail along the back at two heights on leaning posts, each post propped from behind.
  const posts = Math.max(3, Math.round(length / 2.4)), step = length / (posts - 1);
  for (let index = 0; index < posts; index++) {
    const x = -half + index * step, lean = (hash(seed + index, 3) - .5) * .3, top = burnt ? .5 + hash(seed, index + 40) * .7 : height + .25 + hash(seed, index + 5) * .35;
    f.strut([x, 0, -depth * .15], [x + lean, top, -depth * .28], .16, wood(index));
    if (!burnt || hash(seed, index + 50) < .5) f.strut([x + lean, top * .8, -depth * .28], [x + lean * .4, 0, -depth * .5], .12, wood(index + 9));
  }
  if (!burnt) for (const y of [height * .42, height * .86]) f.strut([-half, y, -depth * .24], [half, y + (hash(seed, y) - .5) * .2, -depth * .24], .13, wood(y * 10));
  else f.strut([-half * .7, .12, -depth * .1], [half * .5, .3, depth * .2], .14, CHAR[0]);
  // Sheets leant on the frame, overlapping, each scorched from the top; burnt, they lie flat and black.
  const count = Math.round(length / 2.1), wide = length / count + .25;
  for (let index = 0; index < count; index++) {
    const x = -half + (index + .5) * length / count, hex = sheets[Math.floor(hash(seed + index, 11) * sheets.length)];
    if (burnt) {
      if (hash(seed, index + 60) < .7) f.box(wide * .9, .06, 1.7, x + (hash(seed, index + 61) - .5), .05 + index % 2 * .05, depth * .3 + hash(seed, index + 62) * .9, soot(hex, .82), {ribs: true, about: (hash(seed, index + 63) - .5) * .9, slide: hash(seed, index + 64)});
      continue;
    }
    const tall = height * (.86 + .22 * hash(seed + index, 13)), lean = -.16 - .14 * hash(seed + index, 17);
    f.box(wide, tall, .07, x, tall / 2 - .02, .02 + index % 2 * .08, soot(hex, .08 + .2 * hash(seed + index, 19)), {ribs: true, lean, foot: .5, slide: hash(seed + index, 23), about: (hash(seed + index, 29) - .5) * .1});
    // Soot along the top edge, where torches were held to it.
    f.box(wide * .96, tall * .2, .075, x, tall * .9, .0 + index % 2 * .08 - Math.sin(-lean) * tall * .38, soot(hex, .62), {ribs: true, lean, slide: hash(seed + index, 23)});
  }
  // Oil drums at the ends and one in the middle; a few tyres stacked against it.
  const drum = (x, z, tilt, key) => {
    const body = new THREE.CylinderGeometry(.29, .29, .88, 12);
    if (tilt) body.rotateZ(tilt);
    body.translate(x, tilt ? .3 : .44, z);
    f.add(body, burnt ? CHAR[key % 3] : soot([0x8a4630, 0x4a6878, 0x76766a][key % 3], .2), .5);
    if (!tilt) for (const y of [.29, .59]) { const band = new THREE.CylinderGeometry(.3, .3, .04, 12); band.translate(x, y, z); f.add(band, scrapSteel(key, y * 10, .6)); }
  };
  drum(-half + .35, depth * .2, 0, 0); drum(half - .35, depth * .15, 0, 1); drum(half - .98, depth * .3, 0, 2);
  drum(-half * .12, depth * .55, burnt ? 1.57 : 0, 3);
  if (!burnt) { const top = new THREE.CylinderGeometry(.29, .29, .88, 12); top.translate(half - .66, 1.32, depth * .22); f.add(top, soot(0x7c6d3e, .4)); }
  for (let index = 0; index < (burnt ? 2 : 3); index++) {
    const tyre = new THREE.TorusGeometry(.3, .13, 6, 12); tyre.rotateX(Math.PI / 2);
    tyre.translate(-half + 1.5 + (hash(seed, index + 70) - .5) * .12, .13 + index * .25, depth * .45 + (hash(seed, index + 71) - .5) * .1);
    f.add(tyre, TYRE);
  }
  // Stakes, sharpened and pointed up the road at a car's radiator.
  if (!burnt) for (let index = 0; index < Math.round(length / 1.5); index++) {
    const x = -half + .9 + index * (length - 1.8) / Math.max(1, Math.round(length / 1.5) - 1) + (hash(seed, index + 80) - .5) * .3;
    const reach = 1.1 + hash(seed, index + 81) * .5;
    f.strut([x, 0, depth * .1], [x + (hash(seed, index + 82) - .5) * .3, .75 + hash(seed, index + 83) * .35, depth * .1 + reach], .11, TIMBER[index % 3]);
    f.strut([x, .78, depth * .1 + reach * .96], [x, .86, depth * .1 + reach * 1.08], .05, 0xb8a988);
  }
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  return merged;
}

// The same corrugated picture as the yard's wall, so that scrap is scrap everywhere on the land.
export function barricadeSurface(picture = yardSheetPicture()) { return yardSurface(picture); }
