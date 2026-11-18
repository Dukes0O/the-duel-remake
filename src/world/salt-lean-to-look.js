// The salt riders' lean-to on the pan (EVERBURN-REMAKE slice 8), drawn in code from the scrap kit: four pipe posts, a
// roof of sheet crusted white, a windbreak of cut salt blocks on the weather side, sacks, a rake, and the horn on its
// pole that the riders sound when they see the pot. It fills the plan the job's solids use (posts at the four corners
// of a rectangle, the roof above), standing on the ground at y 0, its long side along x.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scrapBuilder, scrapSheetColours, scrapSteel} from './scablands-yard-look.js';

const hash = (a, b = 0) => Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
const SALT = [0xcfc8ba, 0xbdb5a4, 0xd8d2c6, 0xaaa290], SACK = [0x8d7a5c, 0x7c6a50, 0x9a8868], TIMBER = [0x6b5640, 0x5a4836];

// `plan` gives the posts' half spacing (halfX, halfZ), their width and height, and the roof's width, depth and slope.
export function saltLeanToShape({halfX = 4, halfZ = 3, postWidth = .5, height = 3, roofWidth = 9, roofDepth = 7, roofSlope = .08, seed = 3} = {}) {
  const {parts, frame} = scrapBuilder(), f = frame(0, 0, 0, 0), sheets = scrapSheetColours();
  const crust = (hex, share) => new THREE.Color(hex).lerp(new THREE.Color(0xd9d3c7), share).getHex();
  // Posts: lengths of pipe, none quite upright, each in a drum of salt for a foot. The back pair is the taller.
  const tops = {};
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * halfX, z = sz * halfZ, lean = (hash(seed + sx, sz) - .5) * .16, top = height + (sz < 0 ? .25 : -.2);
    f.strut([x, 0, z], [x + lean, top, z + lean * .5], postWidth * .42, scrapSteel(sx + 2, sz + 2, .8));
    const drum = new THREE.CylinderGeometry(postWidth * .62, postWidth * .66, .7, 10); drum.translate(x, .35, z);
    f.add(drum, crust(sheets[(sx + sz + 4) % sheets.length], .35));
    tops[`${sx},${sz}`] = [x + lean, top, z + lean * .5];
  }
  // Two rafters front to back and a ridge rail along the back.
  for (const sx of [-1, 1]) f.strut(tops[`${sx},-1`], tops[`${sx},1`], .14, TIMBER[0]);
  f.strut(tops['-1,-1'], tops['1,-1'], .14, TIMBER[1]);
  f.strut(tops['-1,1'], tops['1,1'], .12, TIMBER[0]);
  // The roof: five sheets side by side, overlapping, sloping to the front, their tops crusted white by the wind.
  const count = 5, wide = roofWidth / count, back = -roofDepth / 2, front = roofDepth / 2;
  for (let index = 0; index < count; index++) {
    const x0 = -roofWidth / 2 + index * wide - .08, x1 = x0 + wide + .16, sag = (hash(seed, index + 7) - .5) * .12;
    const yBack = height + .34 + sag, yFront = height - .28 - roofSlope * roofDepth * .5 + sag * .5;
    f.skin([[x0, yBack, back], [x1, yBack + .02, back], [x1, yFront, front], [x0, yFront - .02, front]],
      crust(sheets[(index * 3 + 1) % sheets.length], .3 + .3 * hash(seed, index)));
  }
  // The windbreak along the back: three courses of cut salt blocks, the top one broken.
  const blockLong = 1.1, blockTall = .42, courses = 3, across = Math.floor((halfX * 2 - .6) / blockLong);
  for (let course = 0; course < courses; course++) for (let index = 0; index < across; index++) {
    if (course === courses - 1 && hash(seed + index, 31) < .35) continue;
    const x = -halfX + .5 + (index + (course % 2 ? .5 : 0)) * blockLong, wobble = (hash(index, course + seed) - .5) * .08;
    if (x + blockLong / 2 > halfX - .2) continue;
    f.box(blockLong - .06, blockTall - .03, .5, x, blockTall * (course + .5), -halfZ - .15 + wobble, SALT[(index + course) % SALT.length], {about: wobble});
  }
  // Sacks of salt stacked under the roof, a pan for boiling brine on stones, and a rake leant on a post.
  for (const [x, y, z, turn] of [[-2.3, .2, -1.6, .2], [-1.5, .2, -1.8, -.3], [-1.9, .58, -1.7, 1.2], [1.9, .2, -1.9, .5]])
    f.box(.9, .38, .55, x, y, z, SACK[Math.floor(hash(x, z) * 3)], {about: turn});
  f.box(1.5, .14, 1.0, 1.2, .46, .6, scrapSteel(5, 6, .55));
  for (const [x, z] of [[.6, .25], [1.8, .25], [.6, .95], [1.8, .95]]) f.box(.26, .34, .26, x, .17, z, 0x6a665e);
  f.box(1.36, .05, .86, 1.2, .5, .6, SALT[2]);
  f.strut([halfX - .5, 0, halfZ - .3], [halfX - .15, 2.3, halfZ - .1], .05, TIMBER[0]);
  f.strut([halfX - .45, 2.28, halfZ - .1], [halfX + .15, 2.34, halfZ - .1], .04, TIMBER[1]);
  // The horn: a long tube on a tall pole at the corner, pointing over the pan, with a flared mouth.
  const pole = [-halfX - .7, 0, halfZ + .4], top = [-halfX - .7, height + 1.9, halfZ + .4];
  f.strut(pole, top, .1, scrapSteel(8, 1, .75));
  f.strut([top[0], top[1] - .1, top[2]], [top[0] + .2, top[1] + .25, top[2] + 1.7], .09, 0x7a5a2c);
  const mouth = new THREE.CylinderGeometry(.3, .07, .55, 10, 1, true);
  mouth.rotateX(Math.PI / 2 - .2); mouth.translate(top[0] + .22, top[1] + .29, top[2] + 1.9);
  f.add(mouth, 0x8a6a34);
  // A rag of flag on the pole, so that the place is seen from far off on a white pan.
  f.skin([[top[0], top[1] + .9, top[2]], [top[0] + 1.3, top[1] + .78, top[2] - .2], [top[0] + 1.25, top[1] + .2, top[2] - .15], [top[0], top[1] + .3, top[2]]], 0x7b2a1e);
  f.strut(top, [top[0], top[1] + .95, top[2]], .06, scrapSteel(9, 1, .75));
  const merged = mergeGeometries(parts);
  merged.computeBoundingSphere();
  return merged;
}
