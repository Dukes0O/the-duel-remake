// LAB-ART: the Lab's bench models, part one: weighing pad, weights and cans, drop
// tower, fire pit, pendulum frame, rotor test stand. Part two is lab-benches2.mjs.
// Each function returns the model's parts; a part is a node a viewer can move
// (its pivot is where it turns). Model origin on the floor, +Z toward the player.
import * as THREE from 'three';
import { C, Part, addSurface, fbm, lerpColor, noise, rng, surface, tools, worn } from './lab-kit.mjs';
import { IRON, RED, STEEL, YELLOW, gauge, needle } from './lab-common.mjs';

function weighingPad() {
  const main = new Part('pad'), T = tools(main, 500);
  // The weighbridge: a steel plate in a frame, a little proud of the floor, with
  // anti-slip bars, yellow edge stripes and four load cells at the corners.
  T.box([6.4, .06, 8.4], [0, .03, 0], 0x2a2c2d, { dirt: .3, oil: 1.5 });
  T.box([6.2, .1, 8.2], [0, .11, 0], STEEL, { dirt: .3, rust: .3, chip: .08, oil: 1.4 });
  for (let i = -16; i <= 16; i++) T.box([.08, .015, 8.0], [i * .19, .17, 0], 0x4b585f, { dirt: .4, oil: 1.2 });
  for (const [w, d, x, z] of [[6.2, .22, 0, -4.0], [6.2, .22, 0, 4.0], [.22, 8.2, -3.0, 0], [.22, 8.2, 3.0, 0]]) T.box([w, .02, d], [x, .17, z], YELLOW, { dirt: .4, chip: .12, oil: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { T.box([.5, .22, .5], [sx * 3.35, .11, sz * 4.35], 0x3c4448, { rust: .5, dirt: .3 }); T.cyl(.04, .04, .1, [sx * 3.35, .27, sz * 4.35], 0x8a8d90, { rust: .3 }); }
  // Cables in a conduit to the display post.
  T.tube([[3.4, .06, 4.4], [3.9, .05, 4.2], [4.1, .05, 3.8], [4.1, .6, 3.6]], .025, 0x1d1d1d, { dirt: .3 }, 14);
  // The display post and, on two posts, the weight-against-lift board.
  T.box([.14, 1.5, .14], [4.1, .75, 3.6], 0x3c4448, { rust: .5, dirt: .3 });
  T.box([.75, .5, .22], [4.1, 1.7, 3.6], 0x2b2f31, { rust: .3, dirt: .3, chip: .1 });
  T.glow(new THREE.PlaneGeometry(.62, .3), [4.1, 1.72, 3.715], 0x9bd36a);
  for (let i = 0; i < 4; i++) T.box([.1, .2, .01], [3.95 + i * .1, 1.72, 3.72], 0x203018, { dirt: 0 });
  for (const x of [-4.4, -3.1]) T.box([.1, 2.5, .1], [x, 1.25, 3.6], 0x3c4448, { rust: .5, dirt: .3 });
  T.box([1.4, 1.6, .06], [-3.75, 1.7, 3.6], 0xd9d3c0, { dirt: .45, chip: .1 });
  for (const [x, h, hex] of [[-3.95, 1.0, 0xd9a02a], [-3.55, .7, 0x6ab45a]]) {
    T.box([.5, 1.2, .04], [x, 1.7, 3.65], 0x3a4a52, { dirt: .3 });
    T.glow(new THREE.PlaneGeometry(.38, h), [x, 1.1 + h / 2, 3.675], hex);
  }
  T.box([1.5, .06, .12], [-3.75, 2.55, 3.6], 0x3c4448, { rust: .4 });
  return [main];
}

function weightsAndCans() {
  const main = new Part('weights'), T = tools(main, 520);
  // A pallet with cast-iron weights standing and stacked, handles on top.
  T.box([1.3, .1, .9], [0, .05, 0], 0x6a5638, { dirt: .5 });
  for (const x of [-.5, .5]) for (const z of [-.3, .3]) T.box([.1, .1, .1], [x, .15, z], 0x6a5638, { dirt: .5 });
  [[.30, .09], [.26, .07], [.22, .06], [.2, .05], [.16, .04]].forEach(([r, h], i) => {
    const x = -.45 + i * .22, y = .2 + h / 2;
    T.cyl(r * .52, r * .52, h, [x, y, -.15], IRON, { rust: .55, dirt: .4, chip: .1 }, [0, 0, 0], 16);
    T.geo(new THREE.TorusGeometry(r * .3, .014, 5, 12).rotateX(Math.PI / 2), [x, y + h / 2 + .01, -.15], IRON, { rust: .5 });
  });
  T.cyl(.05, .05, .6, [-.5, .5, .25], 0x2a2c2d, { rust: .6 });
  for (let i = 0; i < 6; i++) T.cyl(.18 - i * .016, .18 - i * .016, .07, [-.5, .24 + i * .08, .25], IRON, { rust: .6, dirt: .4, chip: .1 }, [0, 0, 0], 16);
  // Three jerry cans: pressed steel in red, green and yellow, handles and spouts.
  for (const [x, hex] of [[.25, 0xa02a22], [.58, 0x4a6a3a], [.91, 0xc9a227]]) {
    T.box([.34, .46, .16], [x, .38, .22], hex, { dirt: .4, chip: .18, rust: .4, oil: 1 });
    T.box([.3, .1, .14], [x, .66, .22], hex, { dirt: .4, chip: .18, rust: .3 });
    T.tube([[x - .1, .64, .22], [x - .1, .74, .22], [x + .1, .74, .22], [x + .1, .64, .22]], .018, 0x2a2a2a, { rust: .4 }, 8, 5);
    T.cyl(.04, .04, .07, [x + .14, .7, .22], 0x2a2a2a, { rust: .5 }, [0, 0, Math.PI / 4], 8);
  }
  return [main];
}

function dropTower() {
  const main = new Part('tower'), T = tools(main, 540);
  // The sand pit: a timber kerb, raked sand, and a painted target board in it.
  for (const [w, d, x, z] of [[3.2, .16, 0, -1.52], [3.2, .16, 0, 1.52], [.16, 3.2, -1.52, 0], [.16, 3.2, 1.52, 0]]) T.box([w, .34, d], [x, .17, z], 0x6e5230, { dirt: .45, oil: .7 });
  addSurface(main, surface(-1.48, 1.48, -1.48, 1.48, 36, 36, (x, z) => .22 + (noise(x * 3, 0, z * 3, 551) - .5) * .05 + Math.sin(x * 11) * .006 + .05 * Math.exp(-((x + .8) ** 2 + (z - .7) ** 2)),
    (p) => lerpColor(C(0xb69c68), C(0x8a7548), fbm(p, 6, 552) * 1.1 + .1)));
  for (let i = 0; i < 5; i++) T.geo(new THREE.RingGeometry(.16 + i * .17, .16 + i * .17 + .085, 28).rotateX(-Math.PI / 2), [.1, .262, .15], i % 2 ? 0xd9d2c0 : 0xa8322a, { dirt: .5 });
  T.geo(new THREE.CircleGeometry(.16, 20).rotateX(-Math.PI / 2), [.1, .263, .15], 0xd9d2c0, { dirt: .5 });
  // The tower: four tube legs, braced rings and crossed ties, a yellow band every metre.
  const H = 6.0, L = .9, w = y => L - (y / H) * L * .3;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) T.bar([sx * L, 0, sz * L], [sx * L * .7, H, sz * L * .7], .06, STEEL, { rust: .5, dirt: .3, chip: .06 }, true);
  for (let y = 1; y <= 5; y++) T.box([.15, .12, .15], [-w(y), y, -w(y)], YELLOW, { dirt: .4, chip: .1 });
  for (let k = 0; k < 5; k++) {
    const y0 = .3 + k * 1.2, y1 = y0 + 1.2;
    for (const s of [-1, 1]) {
      T.bar([-w(y0), y0, s * w(y0)], [w(y1), y1, s * w(y1)], .02, STEEL, { rust: .6 }); T.bar([w(y0), y0, s * w(y0)], [-w(y1), y1, s * w(y1)], .02, STEEL, { rust: .6 });
      T.bar([s * w(y0), y0, -w(y0)], [s * w(y1), y1, w(y1)], .02, STEEL, { rust: .6 }); T.bar([s * w(y0), y0, w(y0)], [s * w(y1), y1, -w(y1)], .02, STEEL, { rust: .6 });
    }
    T.box([2 * w(y1), .06, .06], [0, y1, -w(y1)], STEEL, { rust: .5 }); T.box([2 * w(y1), .06, .06], [0, y1, w(y1)], STEEL, { rust: .5 });
    T.box([.06, .06, 2 * w(y1)], [-w(y1), y1, 0], STEEL, { rust: .5 }); T.box([.06, .06, 2 * w(y1)], [w(y1), y1, 0], STEEL, { rust: .5 });
  }
  // The head: a winch beam; a crank and a control box at the foot.
  T.box([2.2, .2, .3], [0, H + .1, 0], STEEL, { rust: .5, dirt: .3, chip: .06 });
  T.cyl(.12, .12, .5, [-.8, H + .35, 0], 0x3c4448, { rust: .5 }, [0, 0, Math.PI / 2]);
  T.box([.2, .3, .2], [-1.15, H + .3, 0], 0x3c4448, { rust: .5 });
  T.bar([-1.15, H + .25, .1], [-1.15, 1.2, .1], .012, 0x1d1d1d, { dirt: .3 });
  T.bar([1.7, 0, -.9], [1.7, .6, -.9], .05, 0x2b2f31, { rust: .5 }, true);
  T.box([.5, .6, .3], [1.7, .9, -.9], 0x2b2f31, { rust: .4, dirt: .35, chip: .1 }); T.cyl(.03, .03, .35, [1.7, 1.45, -.9], 0x8a8d90, { rust: .3 }); T.geo(new THREE.SphereGeometry(.055, 8, 6), [1.7, 1.65, -.9], RED, { dirt: .3 });
  T.glow(new THREE.PlaneGeometry(.3, .12), [1.7, 1.0, -.745], 0xd9a02a);
  // The carriage: a trolley with a release arm, its own part so a viewer can slide it down the tower.
  const car = new Part('carriage', [0, 5.4, 0]), K = tools(car, 560);
  K.box([.5, .12, .4], [0, 5.4, 0], 0x3c4448, { rust: .4, dirt: .3 });
  K.box([.12, .5, .12], [0, 5.1, 0], 0x3c4448, { rust: .4 });
  K.box([.5, .06, .1], [0, 4.84, 0], YELLOW, { dirt: .4, chip: .1 });
  for (const x of [-.18, .18]) K.cyl(.07, .07, .08, [x, 5.52, 0], 0x6a6e70, { rust: .5 }, [Math.PI / 2, 0, 0]);
  K.cyl(.09, .09, .12, [0, 4.74, 0], 0x6a6e70, { rust: .4 }, [0, 0, 0], 10);
  return [main, car];
}

function firePit() {
  const main = new Part('pit'), T = tools(main, 580);
  const R = .8, wall = .5;
  // The steel pit: a drum wall with a rolled rim, black inside, ash on the floor.
  main.add('solid', new THREE.CylinderGeometry(R, R, wall, 32, 1, true), [0, wall / 2 + .04, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(0x3e4549, p, n, { dirt: .35, rust: .55, oil: 1, seed: 581, chip: .06 }));
  main.add('solid', new THREE.CylinderGeometry(R - .05, R - .05, wall, 32, 1, true).scale(-1, 1, 1), [0, wall / 2 + .04, 0], [0, 0, 0], [1, 1, 1], (p) => lerpColor(C(0x181716), C(0x37302a), fbm(p, 9, 582)));
  main.add('solid', new THREE.RingGeometry(R - .05, R + .03, 32).rotateX(-Math.PI / 2), [0, wall + .045, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(0x4a5156, p, n, { dirt: .35, rust: .6, seed: 583 }));
  main.add('solid', new THREE.CircleGeometry(R - .05, 28).rotateX(-Math.PI / 2), [0, .09, 0], [0, 0, 0], [1, 1, 1], (p) => lerpColor(C(0x1d1b19), C(0x5b564f), fbm(p, 8, 584)));
  for (let i = 0; i < 4; i++) T.box([.06, .06, 1.44], [0, .22, 0], 0x2a2c2d, { rust: .6 }, [0, i * Math.PI / 4, 0]);
  for (const a of [0, 1, 2, 3]) T.box([.1, .2, .1], [Math.cos(a * Math.PI / 2 + .6) * .66, .1, Math.sin(a * Math.PI / 2 + .6) * .66], 0x3c4448, { rust: .5 });
  // The gas burner: a ring pipe with jets, a supply line out through the wall to a red valve and a bottle.
  T.geo(new THREE.TorusGeometry(.34, .022, 6, 24).rotateX(Math.PI / 2), [0, .13, 0], 0x6b5f3a, { rust: .4, dirt: .3 });
  for (let i = 0; i < 12; i++) T.cyl(.012, .012, .035, [Math.cos(i * Math.PI / 6) * .34, .165, Math.sin(i * Math.PI / 6) * .34], 0x2a2a2a, {}, [0, 0, 0], 5);
  T.tube([[.34, .13, 0], [.7, .13, 0], [.95, .12, .05], [1.25, .12, .2]], .025, 0x6b5f3a, { rust: .4, dirt: .3 }, 14);
  T.cyl(.05, .05, .12, [1.1, .22, .12], 0x6a6e70, { rust: .4 }); T.geo(new THREE.TorusGeometry(.07, .012, 5, 14).rotateX(Math.PI / 2), [1.1, .3, .12], 0xa02a22, { dirt: .3 });
  T.cyl(.16, .16, .8, [1.45, .45, .2], 0x73786a, { dirt: .5, rust: .4, chip: .12, oil: 1 }, [0, 0, 0], 16);
  T.geo(new THREE.SphereGeometry(.16, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), [1.45, .85, .2], 0x73786a, { dirt: .5, rust: .4, chip: .12 });
  T.cyl(.05, .05, .1, [1.45, .96, .2], 0x9a7a2a, { rust: .3 }); T.geo(new THREE.TorusGeometry(.12, .012, 5, 14).rotateX(Math.PI / 2), [1.45, .78, .2], 0x2a2a2a, {});
  // The three switches (gas, wood, lid) on a control post.
  T.box([.1, 1.3, .1], [-1.35, .65, .6], 0x3c4448, { rust: .5, dirt: .3 });
  T.box([.62, .5, .16], [-1.35, 1.45, .6], 0x2b2f31, { rust: .35, dirt: .35, chip: .1 });
  [[-1.5, 0xa02a22], [-1.35, 0x8a5a2a], [-1.2, 0x9aa0a4]].forEach(([x, hex], i) => {
    T.cyl(.04, .04, .1, [x, 1.5, .7], 0x2a2a2a, {}, [Math.PI / 2, 0, 0], 8); T.geo(new THREE.SphereGeometry(.045, 8, 6), [x, 1.5, .77], hex, { dirt: .3 });
    T.glow(new THREE.CircleGeometry(.025, 8), [x, 1.36, .685], i === 0 ? 0xff7a2a : i === 1 ? 0xd9a02a : 0x9ad36a);
  });
  // A sand bucket, a water bucket and a rake leaning on the wall.
  for (const [x, z, hex, sand] of [[-1.1, -1.0, RED, true], [-1.6, -.75, 0x8d9296, false]]) {
    T.cyl(.2, .16, .3, [x, .19, z], hex, { dirt: .4, rust: .35, chip: .15, oil: .5 }, [0, 0, 0], 16);
    T.tube([[x - .2, .34, z], [x, .5, z], [x + .2, .34, z]], .01, 0x2a2a2a, { rust: .5 }, 8, 5);
    if (sand) main.add('solid', new THREE.CircleGeometry(.185, 14).rotateX(-Math.PI / 2), [x, .335, z], [0, 0, 0], [1, 1, 1], (p) => lerpColor(C(0xb69c68), C(0x8a7548), fbm(p, 12, 591)));
    else main.add('glass', new THREE.CircleGeometry(.185, 14).rotateX(-Math.PI / 2), [x, .32, z], [0, 0, 0], [1, 1, 1], () => C(0x4a7a8a));
  }
  T.bar([-2.0, 0, -1.2], [-1.85, 1.5, -1.25], .016, 0x7a5230, { dirt: .4 }); T.box([.5, .02, .04], [-1.84, .08, -1.14], 0x6a6e70, { rust: .6 }, [0, .2, -.1]);
  // The wood: a stack of split logs beside the pit (own part).
  const logs = new Part('logs', [-.2, 0, 1.6]), L = tools(logs, 595), random = rng(596);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 4 - row; i++) {
    const x = -.5 + i * .27 + row * .13, y = .09 + row * .17;
    L.cyl(.085, .09, .6, [x, y, 1.6], 0x7a5a38, { dirt: .45, oil: .3, chip: .02 }, [Math.PI / 2, 0, random() * .2], 10);
    L.geo(new THREE.CircleGeometry(.078, 8), [x, y, 1.6 + .301], 0xb69a6a, { dirt: .2 });
  }
  // The lid: a steel disc on a hinge arm that swings over the pit (own part, hinge at the pivot).
  const lid = new Part('lid', [1.0, .62, -.6]), D = tools(lid, 598);
  D.geo(new THREE.CylinderGeometry(.86, .86, .035, 32), [.15, .62, -.6], 0x464e52, { dirt: .35, rust: .6, chip: .08, oil: .8 });
  D.geo(new THREE.TorusGeometry(.85, .02, 5, 32).rotateX(Math.PI / 2), [.15, .64, -.6], 0x2d3235, { rust: .6 });
  D.bar([.15, .66, -.6], [.15, .75, -.45], .018, 0x2a2a2a, { rust: .5 }); D.bar([.15, .75, -.45], [.15, .75, -.2], .018, 0x2a2a2a, { rust: .5 });
  D.box([.14, .1, .14], [1.0, .6, -.6], 0x3c4448, { rust: .5 });
  return [main, logs, lid];
}

function pendulumFrame() {
  const main = new Part('frame'), T = tools(main, 610), HX = 2.7, H = 5.8;
  // A portal frame: two uprights on base plates with raking braces and a beam.
  for (const s of [-1, 1]) {
    T.box([.16, H, .16], [s * HX, H / 2, 0], STEEL, { rust: .45, dirt: .3, chip: .06 });
    T.box([.7, .05, .7], [s * HX, .025, 0], 0x3c4448, { rust: .5 });
    T.bar([s * HX, .2, .1], [s * (HX - 1.0), 0, 1.0], .045, STEEL, { rust: .5 }, true);
    T.bar([s * HX, .2, -.1], [s * (HX - 1.0), 0, -1.0], .045, STEEL, { rust: .5 }, true);
    T.bar([s * HX, H - .3, 0], [s * (HX - .6), H, 0], .05, STEEL, { rust: .5 }, true);
    for (const z of [-1.1, 1.1]) T.box([.4, .04, .5], [s * (HX - 1.0), .02, z], 0x3c4448, { rust: .5 });
  }
  T.box([2 * HX + .2, .22, .22], [0, H + .05, 0], STEEL, { rust: .4, dirt: .3, chip: .06 });
  for (const x of [-1.6, 0, 1.6]) { T.box([.14, .08, .2], [x, H - .1, 0], 0x2b2f31, { rust: .4 }); T.cyl(.04, .04, .22, [x, H - .12, 0], 0x6a6e70, { rust: .4 }, [Math.PI / 2, 0, 0]); }
  // A distance scale painted on the floor, a tick every half metre.
  T.box([5.0, .01, .12], [0, .006, 1.2], 0xd9d2c0, { dirt: .5 });
  for (let i = -5; i <= 5; i++) T.box([.03, .012, .2], [i * .5, .008, 1.2], 0x1a1816, { dirt: 0 });
  // Three cords of 1, 3 and 5 m (5:15:25 m at a fifth of the size), each its own part with its bob.
  const parts = [main];
  for (const [x, len, name] of [[-1.6, 1.0, 'cord-short'], [0, 3.0, 'cord-medium'], [1.6, 5.0, 'cord-long']]) {
    const part = new Part(name, [x, H - .12, 0]), K = tools(part, 620 + len);
    K.bar([x, H - .12, 0], [x, H - .12 - len, 0], .006, 0x2a2a2a, {});
    K.geo(new THREE.SphereGeometry(.09, 14, 10), [x, H - .12 - len - .09, 0], 0x6a6e70, { rust: .45, dirt: .3, chip: .1, oil: .5 });
    K.cyl(.02, .02, .05, [x, H - .12 - len + .01, 0], 0x2a2a2a, {}); parts.push(part);
  }
  // A heavier weight for the middle cord: a bigger bob on the same 3 m, shown instead of the light one.
  const heavy = new Part('cord-medium-heavy', [0, H - .12, 0]), Hv = tools(heavy, 640);
  Hv.bar([0, H - .12, 0], [0, H - .12 - 3.0, 0], .006, 0x2a2a2a, {});
  Hv.geo(new THREE.SphereGeometry(.17, 16, 12), [0, H - .12 - 3.0 - .17, 0], IRON, { rust: .5, dirt: .35, chip: .1, oil: .5 });
  parts.push(heavy);
  // The stopwatch board on a bracket by the right upright: a big analog face, a digital strip, two buttons.
  const bx = HX - 1.0, bz = -.7;
  T.bar([HX, 2.4, -.05], [bx + .5, 2.6, bz], .035, STEEL, { rust: .4 }, true);
  T.box([1.5, 1.2, .08], [bx, 3.1, bz], 0xd9d3c0, { dirt: .45, chip: .12 });
  T.geo(new THREE.CylinderGeometry(.46, .46, .06, 28).rotateX(Math.PI / 2), [bx - .1, 3.12, bz + .06], 0x2a2c2d, { rust: .4, dirt: .35 });
  T.geo(new THREE.CircleGeometry(.4, 28), [bx - .1, 3.12, bz + .095], 0xe8e2cf, { dirt: .5 });
  for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30, major = i % 5 === 0; T.box([.012, major ? .08 : .04, .004], [bx - .1 + Math.sin(a) * .34, 3.12 + Math.cos(a) * .34, bz + .1], 0x1a1816, { dirt: 0 }, [0, 0, -a]); }
  T.glow(new THREE.PlaneGeometry(.5, .14), [bx + .45, 3.5, bz + .045], 0x9bd36a);
  for (const [dx, hex] of [[.2, 0x9a2a22], [.42, 0x3a7a3a]]) T.geo(new THREE.CylinderGeometry(.045, .045, .06, 12).rotateX(Math.PI / 2), [bx + dx, 2.72, bz + .06], hex, { dirt: .3 });
  const hand = new Part('stopwatch-hand', [bx - .1, 3.12, bz + .1]), Hd = tools(hand, 650);
  Hd.box([.012, .36, .004], [bx - .1, 3.12 + .13, bz + .105], 0xb02a22, {}); Hd.geo(new THREE.CylinderGeometry(.03, .03, .01, 10).rotateX(Math.PI / 2), [bx - .1, 3.12, bz + .105], 0x2a2a2a, {});
  parts.push(hand);
  return parts;
}

function rotorStand() {
  const main = new Part('stand'), T = tools(main, 660);
  // A pedestal on a platform scale, a motor head, a guard ring and a thrust gauge.
  T.box([2.2, .12, 2.2], [0, .06, 0], 0x2b2f31, { rust: .45, dirt: .35, oil: 1.2 });
  T.box([2.0, .05, 2.0], [0, .145, 0], STEEL, { rust: .4, dirt: .3, chip: .08, oil: 1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) T.box([.26, .12, .26], [sx * 1.0, .06, sz * 1.0], 0x3c4448, { rust: .5 });
  T.cyl(.17, .24, 1.35, [0, .85, 0], STEEL, { rust: .45, dirt: .3, chip: .06, oil: .8 }, [0, 0, 0], 14);
  T.cyl(.34, .34, .3, [0, 1.62, 0], 0x464e52, { rust: .45, dirt: .3, chip: .06 }, [0, 0, 0], 16);
  T.cyl(.2, .2, .1, [0, 1.82, 0], 0x2a2c2d, { rust: .4 }, [0, 0, 0], 12);
  for (let i = 0; i < 6; i++) T.box([.02, .26, .04], [Math.cos(i * 1.05) * .34, 1.62, Math.sin(i * 1.05) * .34], 0x2a2c2d, { rust: .5 }, [0, -i * 1.05, 0]);
  // A cage ring round the rotor, on six posts.
  for (const y of [.5, 1.0]) T.geo(new THREE.TorusGeometry(1.15, .025, 6, 36).rotateX(Math.PI / 2), [0, y, 0], YELLOW, { dirt: .4, chip: .12 });
  for (let i = 0; i < 6; i++) T.bar([Math.cos(i * 1.047) * 1.15, 0, Math.sin(i * 1.047) * 1.15], [Math.cos(i * 1.047) * 1.15, 1.0, Math.sin(i * 1.047) * 1.15], .025, YELLOW, { dirt: .4, chip: .12 });
  // The gauge post: a thrust dial and a lit readout.
  T.box([.1, 1.7, .1], [1.55, .85, .8], 0x3c4448, { rust: .5, dirt: .3 });
  T.box([.5, .7, .1], [1.55, 1.65, .8], 0x2b2f31, { rust: .35, dirt: .35, chip: .1 });
  gauge(main, { x: 1.55, y: 1.78, z: .86, r: .17 });
  T.glow(new THREE.PlaneGeometry(.34, .1), [1.55, 1.46, .857], 0x9bd36a);
  const dial = needle('thrust-needle', 1.55, 1.78, .86, .15);
  // The rotor: two tapered blades, a hub and pitch links (own part, spins about Y).
  const rotor = new Part('rotor', [0, 1.88, 0]), R = tools(rotor, 670);
  for (const s of [-1, 1]) {
    R.box([.9, .035, .16], [s * .65, 1.9, 0], 0x93989a, { rust: .35, dirt: .3, chip: .1 }, [0, 0, s * .04]);
    R.box([.5, .03, .12], [s * 1.35, 1.9, 0], 0x8f9496, { rust: .35, dirt: .3, chip: .1 }, [0, 0, s * .05]);
    R.box([.14, .036, .115], [s * 1.62, 1.91, 0], YELLOW, { dirt: .3, chip: .12 });
    R.bar([s * .14, 1.88, 0], [s * .3, 1.93, .08], .012, 0x2a2a2a, { rust: .4 });
  }
  R.cyl(.12, .14, .1, [0, 1.9, 0], 0x464e52, { rust: .4, dirt: .3 }, [0, 0, 0], 12);
  R.geo(new THREE.SphereGeometry(.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, 1.95, 0], 0x2a2c2d, { rust: .3 });
  return [main, dial, rotor];
}

export const BENCHES1 = {
  'weighing-pad': weighingPad,
  'weights-and-cans': weightsAndCans,
  'drop-tower': dropTower,
  'fire-pit': firePit,
  'pendulum-frame': pendulumFrame,
  'rotor-stand': rotorStand,
};
