// LAB-ART: the Lab's bench models, part two: bending rig, nail jars, turning arm,
// map table, wind tunnel, launcher ramp, snow trays. See lab-benches.mjs.
import * as THREE from 'three';
import { C, Part, fbm, lerpColor, noise, surface, tools, worn } from './lab-kit.mjs';
import { BRASS, IRON, STEEL, WOOD, YELLOW, gauge, needle } from './lab-common.mjs';

const hazard = (T, x, y, z, w, h, d, n = 4) => { for (let i = 0; i < n; i++) T.box([w, h / n * .98, d], [x, y - h / 2 + (i + .5) * h / n, z], i % 2 ? 0x1d1d1d : YELLOW, { dirt: .4, chip: .12 }); };

function bendingRig() {
  const main = new Part('rig'), T = tools(main, 700);
  // Two floor rails, two posts with hazard bands, a crossbeam, a pump with a long handle and a hose.
  for (const z of [-.55, .55]) T.box([3.2, .14, .22], [0, .07, z], 0x2b2f31, { rust: .45, dirt: .35, oil: 1.2 });
  for (const s of [-1, 1]) {
    T.box([.2, 1.95, .5], [s * 1.3, .98, 0], STEEL, { rust: .45, dirt: .3, chip: .07 });
    hazard(T, s * 1.3, .3, .26, .2, .5, .02, 5);
    T.bar([s * 1.3, .1, .4], [s * 1.0, 1.5, .25], .035, STEEL, { rust: .5 }, true);
  }
  T.box([2.9, .3, .45], [0, 1.95, 0], STEEL, { rust: .4, dirt: .3, chip: .07 });
  for (const s of [-1, 1]) T.box([.6, .1, .5], [s * .9, .6, 0], 0x2b2f31, { rust: .5, dirt: .3 }), T.box([.36, .22, .3], [s * .9, .5, 0], 0x464e52, { rust: .5, dirt: .35 });
  // The bars: three of the same weight laid across the supports, one shown at a time.
  const bars = [['bar-aluminium', 0xb9bcbe, 'alu'], ['bar-steel', 0x4b5256, 'steel'], ['bar-carbon', 0x15171a, 'carbon']];
  const parts = [main];
  for (const [name, hex, kind] of bars) {
    const bar = new Part(name, [0, .66, 0]);
    bar.add('solid', new THREE.BoxGeometry(2.0, kind === 'alu' ? .1 : kind === 'steel' ? .06 : .08, kind === 'alu' ? .1 : kind === 'steel' ? .07 : .09), [0, .66, 0], [0, 0, 0], [1, 1, 1], (p, n) => {
      let c = C(hex);
      if (kind === 'carbon') { const weave = ((Math.floor(p.x * 60) + Math.floor(p.z * 60 + p.y * 60)) & 1) ? .75 : 1.15; c.multiplyScalar(weave); }
      else c.multiplyScalar(.8 + fbm(p, 14, 703) * .5);
      if (kind === 'steel' && fbm(p, 9, 704) > .72) c = lerpColor(c, C(0x6e3b1b), .6);
      return c;
    });
    parts.push(bar);
  }
  // The ram: a hydraulic cylinder and a pressing head (own part, moves down the posts).
  const ram = new Part('ram', [0, 1.8, 0]), R = tools(ram, 710);
  R.cyl(.1, .1, .5, [0, 1.62, 0], 0x6a6e70, { rust: .4, dirt: .3, oil: 1 }, [0, 0, 0], 14);
  R.cyl(.04, .04, .55, [0, 1.1, 0], 0xb9bcbe, { dirt: .3, oil: .8 }, [0, 0, 0], 10);
  R.box([.3, .09, .16], [0, .78, 0], 0x2b2f31, { rust: .4, dirt: .3 }); R.box([.05, .05, .15], [0, .72, 0], 0x6a6e70, { rust: .3 });
  parts.push(ram);
  // A pump with a long handle and the hose to the ram; a load dial on the right post.
  T.box([.5, .45, .45], [2.0, .22, .2], 0x9a2a22, { dirt: .4, chip: .15, oil: 1, rust: .3 });
  T.bar([2.1, .5, .2], [2.55, 1.15, .2], .022, 0x2a2a2a, { rust: .4 }); T.geo(new THREE.SphereGeometry(.05, 8, 6), [2.55, 1.15, .2], 0x2a2a2a, {});
  T.tube([[1.85, .3, .2], [1.5, .15, .5], [.6, .1, .55], [.1, 1.5, .35], [0, 1.78, .1]], .018, 0x1d1d1d, { dirt: .3 }, 28);
  T.box([.34, .34, .08], [1.3, 1.45, .29], 0x2b2f31, { rust: .35, dirt: .3 });
  gauge(main, { x: 1.3, y: 1.45, z: .34, r: .14 });
  parts.push(needle('load-needle', 1.3, 1.45, .34, .12));
  // Spare bars in a rack by the wall.
  for (let i = 0; i < 3; i++) T.bar([-2.05, 0, -.4 + i * .1], [-1.95, 1.6, -.4 + i * .1], .035, [0xb9bcbe, 0x4b5256, 0x15171a][i], { dirt: .3 });
  return parts;
}

function nailJars() {
  const main = new Part('shelf'), T = tools(main, 730);
  // A steel shelving unit with a calendar board, a salt bag, a tin of zinc paint and a nail box.
  for (const x of [-1.2, 1.2]) for (const z of [-.3, .3]) T.box([.05, 1.6, .05], [x, .8, z], STEEL, { rust: .5, dirt: .3 });
  for (const y of [.35, .95]) T.box([2.5, .035, .7], [0, y, 0], 0x5a666d, { rust: .5, dirt: .35, chip: .06 });
  T.box([2.5, .035, .7], [0, 1.6, 0], 0x5a666d, { rust: .5, dirt: .35, chip: .06 });
  T.box([2.45, 1.2, .03], [0, .95, -.34], 0x6b5f4c, { dirt: .4 });
  T.box([1.0, .5, .03], [.9, 1.25, -.32], 0xe3dcc6, { dirt: .5, chip: .08 });
  for (let i = 0; i < 7; i++) T.box([.12, .1, .005], [.52 + i * .13, 1.35, -.3], i === 6 ? 0xa83a2a : 0x2a2a2a, { dirt: 0 });
  T.box([.34, .2, .22], [-.9, .46, .0], 0xc9b88a, { dirt: .5 });
  T.cyl(.1, .1, .18, [-.45, .45, .05], 0x9a9a8a, { dirt: .5, rust: .3 }, [0, 0, 0], 12); T.cyl(.1, .1, .02, [-.45, .55, .05], 0x4a4a42, { dirt: .5 });
  T.box([.3, .22, .2], [-1.0, 1.06, .0], 0xe3dcc6, { dirt: .5, chip: .1 }); T.box([.3, .06, .2], [-1.0, 1.0, .0], 0x2f5f86, { dirt: .4 });
  // Four jars on the top shelf (each its own part): dry air, fresh water, salt water, salt water with a zinc coat.
  const parts = [main], y0 = 1.62;
  const jars = [
    ['jar-dry', -.9, 0xcfd4d6, 0x93979a, 0, null],
    ['jar-fresh', -.3, 0xa8c8d0, 0xa05a2a, .5, 'clear'],
    ['jar-salt', .3, 0x9aa890, 0x6e3414, 1, 'murky'],
    ['jar-zinc', .9, 0x9aa890, 0x9a9c9a, .1, 'murky'],
  ];
  for (const [name, x, liquid, nail, rustAmount, kind] of jars) {
    const jar = new Part(name, [x, y0, .02]), J = tools(jar, 740 + x * 10);
    jar.add('glass', new THREE.CylinderGeometry(.1, .1, .26, 20, 1, true), [x, y0 + .13, .02], [0, 0, 0], [1, 1, 1], () => C(0xdde7e8));
    jar.add('glass', new THREE.CircleGeometry(.1, 20).rotateX(-Math.PI / 2), [x, y0 + .006, .02], [0, 0, 0], [1, 1, 1], () => C(0xdde7e8));
    if (kind) jar.add('glass', new THREE.CylinderGeometry(.094, .094, .19, 20, 1, false), [x, y0 + .1, .02], [0, 0, 0], [1, 1, 1], () => C(liquid));
    if (name === 'jar-dry') { J.cyl(.104, .104, .03, [x, y0 + .27, .02], 0x6a6e70, { rust: .3, dirt: .3 }, [0, 0, 0], 20); J.box([.07, .02, .05], [x + .03, y0 + .03, .06], 0xe3dcc6, { dirt: .3 }); }
    if (kind === 'murky') jar.add('solid', new THREE.CylinderGeometry(.09, .09, .02, 18), [x, y0 + .02, .02], [0, 0, 0], [1, 1, 1], () => C(0x5a3a1c));
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05, rx = x + Math.cos(a) * .045, rz = .02 + Math.sin(a) * .045, lean = (i - 2.5) * .12;
      const rusty = (p) => { const f = fbm(p, 60, 750 + i); return lerpColor(C(nail), C(0x5e2a12), Math.max(0, f - .4) * rustAmount * 2.5); };
      jar.add('solid', new THREE.CylinderGeometry(.0035, .0035, .12, 6), [rx, y0 + .07, rz], [lean * .4, 0, lean], [1, 1, 1], rusty);
      jar.add('solid', new THREE.CylinderGeometry(.0085, .0085, .004, 8), [rx - lean * .06, y0 + .13, rz], [lean * .4, 0, lean], [1, 1, 1], rusty);
    }
    // A paper tag on the shelf edge with a coloured dot.
    J.box([.14, .09, .004], [x, y0 - .025, .39], 0xe8e2cf, { dirt: .4 }); J.box([.03, .03, .003], [x - .04, y0 - .025, .393], [0x9a9a8a, 0x3a7aa0, 0x2f5a80, 0x7a7a7a][parts.length - 1], { dirt: 0 });
    parts.push(jar);
  }
  return parts;
}

function turningArm() {
  const main = new Part('base'), T = tools(main, 760);
  // A floor track ring, a heavy pylon on a plate, a motor box and a control desk with a g-meter.
  T.geo(new THREE.TorusGeometry(3.6, .045, 6, 64).rotateX(Math.PI / 2), [0, .02, 0], 0x3c4448, { rust: .5, dirt: .35, oil: 1 });
  T.geo(new THREE.CylinderGeometry(.9, 1.0, .14, 24), [0, .07, 0], 0x2b2f31, { rust: .45, dirt: .35, oil: 1.2 });
  T.cyl(.3, .4, 1.4, [0, .85, 0], STEEL, { rust: .45, dirt: .3, chip: .07, oil: .8 }, [0, 0, 0], 16);
  T.cyl(.42, .42, .12, [0, 1.56, 0], 0x464e52, { rust: .5, dirt: .3 }, [0, 0, 0], 16);
  T.box([.6, .45, .5], [-1.1, .3, .7], 0x464e52, { rust: .45, dirt: .35, chip: .08, oil: 1 });
  T.box([.1, .9, .1], [-1.5, .45, -.9], 0x3c4448, { rust: .5 }); T.box([.9, .5, .6], [-1.5, 1.1, -.9], 0x2b2f31, { rust: .4, dirt: .35, chip: .1 });
  gauge(main, { x: -1.5, y: 1.2, z: -.58, r: .17 });
  T.glow(new THREE.PlaneGeometry(.4, .1), [-1.5, .92, -.595], 0x9bd36a);
  for (const [dx, hex] of [[-.3, 0x9a2a22], [.3, 0x3a7a3a]]) T.geo(new THREE.CylinderGeometry(.04, .04, .05, 10).rotateX(Math.PI / 2), [-1.5 + dx, 1.0, -.6], hex, { dirt: .3 });
  const parts = [main, needle('g-needle', -1.5, 1.2, -.58, .15)];
  // The arm: a braced beam with a counterweight, and a car-sized cradle at the end (own part, turns about the pylon).
  const arm = new Part('arm', [0, 1.62, 0]), A = tools(arm, 770);
  A.box([5.0, .2, .3], [.7, 1.7, 0], STEEL, { rust: .4, dirt: .3, chip: .07 });
  A.box([5.0, .08, .5], [.7, 1.82, 0], 0x4b585f, { rust: .4, dirt: .3 });
  for (let i = 0; i < 5; i++) { A.bar([-1.4 + i * .95, 1.7, -.1], [-.9 + i * .95, 1.0, 0], .025, STEEL, { rust: .5 }); A.bar([-.9 + i * .95, 1.0, 0], [-.45 + i * .95, 1.7, .1], .025, STEEL, { rust: .5 }); }
  A.box([.8, .7, .5], [-1.6, 1.5, 0], IRON, { rust: .55, dirt: .4, chip: .1, oil: .6 });
  // The cradle: a rectangular frame 4.8 m long (tangent) and 2.2 m across (radial), with tyre rollers and tie-down eyes.
  const cx = 3.0;
  for (const z of [-2.4, 2.4]) A.box([2.2, .14, .16], [cx, .5, z], STEEL, { rust: .45, dirt: .3, chip: .07, oil: .8 });
  for (const s of [-1, 1]) A.box([.16, .14, 4.96], [cx + s * 1.1, .5, 0], STEEL, { rust: .45, dirt: .3, chip: .07, oil: .8 });
  for (const z of [-1.35, 1.35]) for (const s of [-1, 1]) {
    A.box([.7, .1, .2], [cx + s * .55, .56, z], 0x2b2f31, { rust: .5, dirt: .3 });
    A.cyl(.1, .1, .6, [cx + s * .6, .66, z], 0x6a6e70, { rust: .5, dirt: .35 }, [0, 0, Math.PI / 2], 10);
    A.geo(new THREE.TorusGeometry(.05, .012, 5, 10), [cx + s * 1.1, .6, z], YELLOW, { dirt: .3 }, [0, Math.PI / 2, 0]);
  }
  A.bar([cx - .3, .5, -2.4], [.3, 1.62, 0], .035, STEEL, { rust: .5 }, true); A.bar([cx - .3, .5, 2.4], [.3, 1.62, 0], .035, STEEL, { rust: .5 }, true);
  A.bar([cx + 1.1, .5, -2.4], [cx + 1.1, 1.0, -2.4], .02, YELLOW, { chip: .1 }); A.bar([cx + 1.1, .5, 2.4], [cx + 1.1, 1.0, 2.4], .02, YELLOW, { chip: .1 });
  // The g-board on a gantry above the beam: an arc scale with tick marks.
  A.bar([1.9, 1.8, -.3], [1.9, 3.3, -.3], .03, STEEL, { rust: .5 }, true); A.bar([1.9, 1.8, .3], [1.9, 3.3, .3], .03, STEEL, { rust: .5 }, true);
  A.box([.04, 1.0, 1.0], [1.9, 3.2, 0], 0xe3dcc6, { dirt: .5, chip: .1 });
  for (let i = 0; i <= 12; i++) { const a = (-60 + i * 10) * Math.PI / 180; A.box([.01, .06, i % 3 === 0 ? .06 : .035], [1.93, 3.38 - Math.cos(a) * .72 + .0, Math.sin(a) * .72], 0x1a1816, { dirt: 0 }, [-a, 0, 0]); }
  const plumb = new Part('plumb', [1.97, 3.38, 0]), P = tools(plumb, 780);
  P.bar([1.97, 3.38, 0], [1.97, 2.68, 0], .005, 0x2a2a2a, {}); P.geo(new THREE.SphereGeometry(.05, 10, 8), [1.97, 2.63, 0], IRON, { rust: .5, chip: .1 });
  parts.push(arm, plumb);
  return parts;
}

function mapTable() {
  const main = new Part('table'), T = tools(main, 800);
  // Legs, a plank frame and a sloped top carrying a printed map of the home valley.
  for (const x of [-1.15, 1.15]) for (const z of [-.7, .7]) T.box([.1, .92, .1], [x, .46, z], WOOD, { dirt: .4, oil: .5 });
  T.box([2.4, .1, 1.5], [0, .88, 0], 0x5b4126, { dirt: .45, oil: .6 });
  const tilt = -.21;
  const top = new THREE.Group(); void top;
  const mapSurface = surface(-1.15, 1.15, -.72, .72, 90, 56, () => 0, (p) => {
    const u = (p.x + 1.15) / 2.3, v = (p.z + .72) / 1.44;
    const h = fbm(new THREE.Vector3(u * 3, v * 2, 0), 1, 810), lake = (u - .72) ** 2 * 6 + (v - .35) ** 2 * 9 < .16 && h < .52;
    let c = lerpColor(C(0xdcd2a8), C(0xcab98a), h);
    if (fbm(new THREE.Vector3(u * 6, v * 4, 3), 1, 811) > .56) c = lerpColor(c, C(0x9ba87a), .8);
    if (lake) c = C(0x86a7b6);
    const level = h * 14; if (Math.abs(level - Math.round(level)) < .07 && !lake) c = lerpColor(c, C(0x8a6a44), .55);
    const road = Math.abs(v - (.55 + Math.sin(u * 6) * .08)) < .006; if (road) c = C(0xb9753a);
    if (Math.abs(((u * 8) % 1) - .5) > .492 || Math.abs(((v * 5) % 1) - .5) > .488) c = lerpColor(c, C(0x3a3a3a), .5);
    if (Math.hypot(u - .3, v - .6) < .016) c = C(0xa83a2a);
    if (Math.hypot(u - .74, v - .62) < .016) c = C(0x2a4a8a);
    return c.multiplyScalar(.92 + fbm(p, 30, 812) * .1);
  });
  main.add('solid', mapSurface.geometry, [0, 1.0, 0], [tilt, 0, 0], [1, 1, 1], mapSurface.colorAt);
  for (const [w, d, x, z] of [[2.5, .08, 0, -.74], [2.5, .08, 0, .74], [.08, 1.5, -1.17, 0], [.08, 1.5, 1.17, 0]]) main.add('solid', new THREE.BoxGeometry(w, .06, d), [x, 1.02 + z * .2 * 0, z], [tilt, 0, 0], [1, 1, 1], (p, n) => worn(0x5b4126, p, n));
  // Brass compass rose at one corner with a needle part; dividers, a pencil, a lamp on an arm.
  T.cyl(.15, .15, .03, [-.85, 1.05, .45], BRASS, { dirt: .3, chip: .08 }, [tilt, 0, 0], 20);
  T.glass(new THREE.CylinderGeometry(.14, .14, .01, 20), [-.85, 1.075, .45], 0xdde7e8, [tilt, 0, 0]);
  for (let i = 0; i < 8; i++) T.box([.008, .04, .004], [-.85 + Math.sin(i * .785) * .12, 1.073 + Math.cos(i * .785) * .12 * -.21 - 0, .45 + Math.cos(i * .785) * .12 * .98], 0x1a1816, { dirt: 0 }, [tilt, 0, -i * .785]);
  const parts = [main];
  const compass = new Part('compass-needle', [-.85, 1.08, .45]), Cp = tools(compass, 820);
  Cp.box([.01, .02, .2], [-.85, 1.082, .45], 0xb02a22, {}, [tilt, 0, 0]); Cp.box([.01, .02, .1], [-.85, 1.082, .5], 0xe8e2cf, {}, [tilt, 0, 0]);
  parts.push(compass);
  const ruler = new Part('ruler', [.2, 1.07, .35]), Rl = tools(ruler, 830);
  Rl.box([.9, .008, .06], [.2, 1.07, .35], 0xc9b88a, { dirt: .3 }, [tilt, 0, 0]);
  for (let i = 0; i < 18; i++) Rl.box([.003, .01, i % 5 === 0 ? .03 : .018], [-.2 + i * .05, 1.075, .33], 0x1a1816, { dirt: 0 }, [tilt, 0, 0]);
  parts.push(ruler);
  T.bar([.7, 1.06, .2], [.95, 1.1, .1], .006, 0x8a8d90, { dirt: .3 }); T.bar([.7, 1.06, .2], [.62, 1.1, .12], .006, 0x8a8d90, { dirt: .3 });
  T.bar([-.3, 1.05, .55], [-.15, 1.07, .45], .005, 0xc58a22, { dirt: .3 });
  T.bar([-1.1, .98, -.6], [-1.1, 1.8, -.6], .02, 0x3c4448, { rust: .5 }); T.bar([-1.1, 1.8, -.6], [-.6, 1.65, -.4], .012, 0x3c4448, { rust: .5 });
  T.cyl(.13, .06, .12, [-.58, 1.62, -.38], 0x2f5f2a, { dirt: .3, chip: .1 }, [0, 0, .2], 12); T.glow(new THREE.SphereGeometry(.045, 8, 6), [-.58, 1.56, -.38], 0xfff0c8);
  T.cyl(.19, .19, .04, [1.3, .55, 1.0], 0x2a2a2a, {}, [0, 0, 0], 12); T.cyl(.03, .03, .55, [1.3, .28, 1.0], 0x66686a, { rust: .5 }, [0, 0, 0], 6);
  return parts;
}

function windTunnel() {
  const main = new Part('tunnel'), T = tools(main, 850);
  const X0 = -3.8, X1 = 3.8, TS0 = -3.0, TS1 = 2.2;
  // A heavy floor, then the test section: steel skirts, big glass windows, a top beam and roof.
  T.box([8.0, .3, 3.5], [0, .15, 0], 0x464e52, { rust: .4, dirt: .35, oil: 1, chip: .06 });
  for (const s of [-1, 1]) {
    T.box([TS1 - TS0, .3, .08], [(TS0 + TS1) / 2, .45, s * 1.6], STEEL, { rust: .4, dirt: .3, chip: .07 });
    T.box([TS1 - TS0, .2, .1], [(TS0 + TS1) / 2, 2.3, s * 1.6], STEEL, { rust: .4, dirt: .3, chip: .07 });
    for (const x of [TS0, TS1, (TS0 + TS1) / 2]) T.box([.14, 2.1, .14], [x, 1.35, s * 1.6], STEEL, { rust: .45, dirt: .3, chip: .07 });
    T.glass(new THREE.BoxGeometry(TS1 - TS0 - .2, 1.6, .03), [(TS0 + TS1) / 2, 1.4, s * 1.6], 0xcfe0e4);
  }
  T.box([TS1 - TS0, .1, 3.3], [(TS0 + TS1) / 2, 2.44, 0], 0x4b585f, { rust: .4, dirt: .35 });
  // Inlet bell and honeycomb, diffuser, fan shroud.
  main.add('solid', new THREE.CylinderGeometry(1.0, 1.75, 1.0, 4, 1, true).rotateZ(Math.PI / 2).rotateX(Math.PI / 4), [TS0 - .5, 1.35, 0], [0, 0, 0], [1, .66, .98], (p, n) => worn(0x56646d, p, n, { rust: .35, dirt: .3, seed: 851 }));
  main.add('solid', new THREE.CylinderGeometry(1.0, 1.75, 1.0, 4, 1, true).rotateZ(Math.PI / 2).rotateX(Math.PI / 4).scale(-1, 1, 1), [TS0 - .5, 1.35, 0], [0, 0, 0], [1, .64, .94], (p) => lerpColor(C(0x23282a), C(0x3a4144), fbm(p, 8, 852)));
  for (let i = -3; i <= 3; i++) T.box([.03, 1.5, .03], [X0 + .05, 1.35, i * .24], 0x2b2f31, { rust: .5 });
  for (let i = 0; i <= 4; i++) T.box([.03, .03, 1.7], [X0 + .05, .9 + i * .24, 0], 0x2b2f31, { rust: .5 });
  main.add('solid', new THREE.CylinderGeometry(1.25, 1.0, 1.0, 4, 1, true).rotateZ(Math.PI / 2).rotateX(Math.PI / 4), [TS1 + .5, 1.3, 0], [0, 0, 0], [1, .7, .97], (p, n) => worn(0x56646d, p, n, { rust: .35, dirt: .3, seed: 853 }));
  main.add('solid', new THREE.CylinderGeometry(1.25, 1.25, .75, 28, 1, true).rotateZ(Math.PI / 2), [X1 - .45, 1.3, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(0x464e52, p, n, { rust: .45, dirt: .35, seed: 854, oil: .6 }));
  main.add('solid', new THREE.TorusGeometry(1.25, .05, 6, 28).rotateY(Math.PI / 2), [X1 - .08, 1.3, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(0x3c4448, p, n, { rust: .5, seed: 855 }));
  T.cyl(.3, .45, .5, [X1 + .1, 1.3, 0], 0x3c4448, { rust: .5, dirt: .35, oil: .7 }, [0, 0, Math.PI / 2], 14);
  for (const z of [-1.0, 1.0]) T.box([.1, 1.3, .1], [X1 - .45, .9, z * 1.2], 0x3c4448, { rust: .5 });
  // The rolling road: a belt with cleats between two drums, and four platform scales under the wheels.
  const belt = new Part('belt', [-.4, .31, 0]);
  belt.add('solid', new THREE.BoxGeometry(5.0, .025, 2.1), [-.4, .312, 0], [0, 0, 0], [1, 1, 1], (p) => { const band = Math.floor((p.x + 5) * 6) & 1; return lerpColor(C(band ? 0x1c1f20 : 0x2b2f31), C(0x424a4c), fbm(p, 8, 856) * .6); });
  const B = tools(belt, 857);
  for (const s of [-1, 1]) B.cyl(.17, .17, 2.2, [-.4 + s * 2.5, .3, 0], 0x6a6e70, { rust: .4, dirt: .3, oil: .8 }, [Math.PI / 2, 0, 0], 12);
  for (const s of [-1, 1]) B.box([5.0, .06, .06], [-.4, .32, s * 1.08], YELLOW, { dirt: .4, chip: .1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { T.box([.7, .02, .42], [-.4 + sx * 1.3, .325, sz * .88], 0xc2c6c8, { dirt: .3, chip: .08, oil: .8 }); T.glow(new THREE.PlaneGeometry(.22, .06), [-.4 + sx * 1.3, .45, sz * 1.64], 0x9bd36a); }
  // Restraint struts that hold the car in place, one at each side.
  for (const s of [-1, 1]) { T.bar([-.2, .32, s * 1.5], [-.2, .52, s * 1.05], .03, STEEL, { rust: .4 }, true); T.box([.18, .06, .14], [-.2, .53, s * 1.0], 0x2a2a2a, {}); }
  const parts = [main, belt];
  // The fan: nine blades on a hub in the shroud (own part, spins about the tunnel axis, X).
  const fan = new Part('fan', [X1 - .45, 1.3, 0]), F = tools(fan, 860);
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;
    F.box([.12, 1.05, .34], [X1 - .45, 1.3 + Math.cos(a) * .72, Math.sin(a) * .72], 0x8d9396, { rust: .35, dirt: .3, chip: .1, oil: .4 }, [a, 0, .5]);
  }
  F.cyl(.3, .3, .3, [X1 - .45, 1.3, 0], 0x464e52, { rust: .4, dirt: .3, oil: .5 }, [0, 0, Math.PI / 2], 14); F.geo(new THREE.SphereGeometry(.3, 12, 8, 0, Math.PI), [X1 - .45 - .1, 1.3, 0], 0x6a6e70, { rust: .3 }, [0, -Math.PI / 2, 0]);
  parts.push(fan);
  // The smoke rake in front of the inlet: a manifold and nine nozzles (own part), a hose to the generator.
  const rake = new Part('smoke-rake', [TS0 - .08, .9, 0]), S = tools(rake, 870);
  S.bar([TS0 - .08, .5, 0], [TS0 - .08, 2.1, 0], .035, 0x3c4448, { rust: .5 });
  for (let i = 0; i < 9; i++) S.cyl(.012, .012, .26, [TS0 + .05, .6 + i * .16, 0], 0x8a8d90, { rust: .3 }, [0, 0, Math.PI / 2], 6);
  parts.push(rake);
  T.box([.6, .7, .6], [TS0 - .6, .65, -2.2], 0x4a6a8a, { dirt: .4, chip: .15, rust: .3, oil: .8 }); T.cyl(.18, .18, .4, [TS0 - .6, 1.2, -2.2], 0x6a6e70, { rust: .4 }, [0, 0, 0], 12);
  T.tube([[TS0 - .6, 1.0, -1.9], [TS0 - .6, .5, -1.0], [TS0 - .2, .5, -.2], [TS0 - .08, .8, 0]], .03, 0x1d1d1d, { dirt: .3 }, 20);
  // The control desk on the player's side: a fan dial, a speed readout, a stop button and the REVERSE switch.
  T.box([2.0, .9, .7], [-.4, .5, 2.35], 0x464e52, { rust: .4, dirt: .35, chip: .08, oil: .7 });
  T.box([1.9, .08, .66], [-.4, .99, 2.35], 0x2b2f31, { rust: .3, dirt: .3 });
  T.box([1.9, .5, .06], [-.4, 1.35, 2.62], 0x2b2f31, { rust: .3, dirt: .3, chip: .1 }, [-.35, 0, 0]);
  gauge(main, { x: -.9, y: 1.36, z: 2.56, r: .22, yaw: 0, ticks: 16 });
  parts.push(needle('fan-dial-needle', -.9, 1.36, 2.56, .2));
  T.glow(new THREE.PlaneGeometry(.5, .14), [-.2, 1.42, 2.53], 0x9bd36a);
  T.geo(new THREE.CylinderGeometry(.07, .07, .05, 14).rotateX(Math.PI / 2 - .35), [.35, 1.22, 2.56], 0xa02a22, { dirt: .3 });
  T.geo(new THREE.CylinderGeometry(.04, .04, .05, 10).rotateX(Math.PI / 2), [.62, 1.3, 2.58], 0x3a7a3a, { dirt: .3 });
  // REVERSE: a guarded toggle, its own part so it can be hidden until the secret opens.
  const rev = new Part('reverse-switch', [.0, 1.2, 2.56]), Rv = tools(rev, 880);
  Rv.box([.18, .12, .1], [.0, 1.28, 2.56], 0x2b2f31, { dirt: .2, chip: .1 }); Rv.cyl(.012, .012, .12, [.0, 1.36, 2.56], 0xb9bcbe, {}, [-.2, 0, 0], 6); Rv.geo(new THREE.SphereGeometry(.022, 8, 6), [.0, 1.43, 2.54], 0xa02a22, {});
  Rv.box([.2, .014, .12], [.0, 1.4, 2.5], 0xc9a227, { chip: .15 }, [.5, 0, 0]);
  parts.push(rev);
  return parts;
}

function launcherRamp() {
  const main = new Part('launcher'), T = tools(main, 900);
  // Two rails on legs, a hinge block at the near end, a protractor arc with a tick every 5 degrees, a spring box.
  for (const s of [-1, 1]) { T.box([.1, .12, 3.4], [s * .5, .5, 0], STEEL, { rust: .45, dirt: .3, chip: .07 }); for (const z of [-1.5, 1.5]) T.box([.08, .5, .08], [s * .5, .25, z], 0x3c4448, { rust: .5 }); }
  for (const z of [-1.5, 0, 1.5]) T.box([1.0, .06, .1], [0, .55, z], 0x3c4448, { rust: .5 });
  T.box([.9, .3, .3], [0, .76, -1.55], 0x2b2f31, { rust: .4, dirt: .3, chip: .1 }); T.cyl(.07, .07, 1.1, [0, .82, -1.55], 0x6a6e70, { rust: .4 }, [0, 0, Math.PI / 2], 10);
  const R = 1.35; // arc from 15 to 75 degrees about the hinge at (0, .82, -1.55)
  for (let d = 15; d <= 75; d += 5) { const a = d * Math.PI / 180, major = d % 15 === 0; T.box([.2, .014, major ? .09 : .05], [-.52, .82 + Math.sin(a) * R, -1.55 + Math.cos(a) * R], major ? 0xe8e2cf : 0xb9b19a, { dirt: .3 }, [-a, 0, 0]); }
  for (const s of [-1, 1]) T.tube(Array.from({ length: 13 }, (_, i) => { const a = (15 + i * 5) * Math.PI / 180; return [s * .55 + (s > 0 ? 0 : 0), .82 + Math.sin(a) * (R - .04), -1.55 + Math.cos(a) * (R - .04)]; }), .012, 0x6a6e70, { rust: .4, dirt: .3 }, 24, 5);
  for (const s of [-1, 1]) T.box([.06, .06, .06], [s * .55, .82 + Math.sin(.26) * R, -1.55 + Math.cos(.26) * R], 0x3c4448, { rust: .5 });
  T.box([.5, .32, .4], [1.0, .3, -1.2], 0x464e52, { rust: .4, dirt: .35, chip: .1, oil: .8 }); T.cyl(.06, .06, .1, [1.0, .5, -1.2], 0xa02a22, { dirt: .3 }, [0, 0, 0], 10);
  // A 4 m tape measure laid out on the floor from the launch end, and cones at one, two and three metres.
  T.box([.06, .008, 4.4], [1.5, .005, 2.6], 0xe3d9a8, { dirt: .5 });
  for (let i = 0; i <= 8; i++) T.box([i % 2 ? .1 : .16, .01, .012], [1.5, .008, .4 + i * .5], 0x1a1816, { dirt: 0 });
  for (const z of [1.4, 2.4, 3.4]) T.cyl(.01, .08, .22, [1.0, .11, z], 0xd9702a, { dirt: .4, chip: .1 }, [0, 0, 0], 10);
  // The arm: a channel with a cradle for the ball (own part, tilts about the hinge, X).
  const arm = new Part('ramp-arm', [0, .82, -1.55]), A = tools(arm, 910), tilt = Math.PI / 4;
  const at = (l, h = 0) => [0, .82 + Math.sin(tilt) * l + Math.cos(tilt) * h, -1.55 + Math.cos(tilt) * l - Math.sin(tilt) * h];
  A.box([.2, .06, 2.5], at(1.25), 0x8d9396, { rust: .35, dirt: .3, chip: .1, oil: .6 }, [-tilt + Math.PI / 2 * 0, 0, 0]);
  for (const s of [-1, 1]) A.box([.03, .06, 2.5], [s * .1, at(1.25)[1] + Math.cos(tilt) * .05, at(1.25)[2] - Math.sin(tilt) * .05], 0x6a6e70, { rust: .4 }, [-tilt, 0, 0]);
  A.geo(new THREE.SphereGeometry(.07, 12, 8), at(2.35, .1), 0xc9a227, { dirt: .3, chip: .2 });
  A.box([.12, .1, .12], at(2.5, .02), 0x2b2f31, { rust: .4 }, [-tilt, 0, 0]);
  return [main, arm];
}

function snowTrays() {
  const main = new Part('table'), T = tools(main, 930);
  // A rolling table with three shallow steel trays of snow, a thermometer by each, a ski rack and wax tins.
  T.box([3.1, .06, .95], [0, .78, 0], 0x7a5b36, { dirt: .45, oil: .5 });
  T.box([3.0, .05, .85], [0, .3, 0], 0x4b585f, { rust: .4, dirt: .3 });
  for (const x of [-1.45, 1.45]) for (const z of [-.4, .4]) { T.box([.06, .75, .06], [x, .4, z], 0x4b585f, { rust: .45, dirt: .3 }); T.cyl(.05, .05, .04, [x, .02, z], 0x1d1d1d, {}, [Math.PI / 2, 0, 0], 8); }
  const parts = [main];
  [['tray-minus15', -1.0, 0x3a5aa0, .95], ['tray-minus5', 0, 0x5a9ab0, .85], ['tray-zero', 1.0, 0x8a8d90, .6]].forEach(([name, x, tag, white], i) => {
    const tray = new Part(name, [x, .81, 0]), K = tools(tray, 940 + i);
    for (const [w, d, dx, dz] of [[.88, .03, 0, -.3], [.88, .03, 0, .3], [.03, .6, -.44, 0], [.03, .6, .44, 0]]) K.box([w, .1, d], [x + dx, .86, dz], 0x8d9396, { rust: .3, dirt: .3, chip: .08 });
    K.box([.86, .02, .58], [x, .815, 0], 0x6a6e70, { rust: .3, dirt: .3 });
    const snow = surface(x - .42, x + .42, -.28, .28, 28, 18, (px, pz) => .84 + (noise(px * 9, 0, pz * 9, 950 + i) - .5) * (i === 2 ? .02 : .05) + (i === 2 ? .0 : .015), (p) => {
      const f = fbm(p, 20, 951 + i); return lerpColor(C(i === 0 ? 0xe9f1f8 : i === 1 ? 0xe4eaee : 0xc9cdcf), C(i === 2 ? 0x8a9296 : 0xb9c6d2), (1 - white) * .6 + f * .3);
    });
    tray.add('solid', snow.geometry, [0, 0, 0], [0, 0, 0], [1, 1, 1], snow.colorAt);
    K.box([.2, .1, .006], [x, .68, .5], tag, { dirt: .3, chip: .1 }); K.box([.22, .12, .004], [x, .68, .497], 0xe8e2cf, { dirt: .4 });
    K.bar([x + .52, .81, .2], [x + .52, 1.15, .2], .008, 0xcfd6d8, { dirt: .2 }); K.bar([x + .52, .85, .2], [x + .52, 1.0 + i * .03, .2], .004, 0xb02a22, {});
    parts.push(tray);
  });
  const skis = new Part('skis', [0, 1.0, -.4]), S = tools(skis, 960);
  for (const dz of [-.12, .12]) {
    S.box([1.6, .012, .075], [0, 1.02, -.4 + dz], 0x2a4a7a, { dirt: .35, chip: .2, rust: .1 });
    S.box([.2, .012, .07], [.85, 1.03, -.4 + dz], 0x2a4a7a, { dirt: .35, chip: .2 }, [0, 0, .25]);
    S.box([.1, .05, .06], [-.1, 1.05, -.4 + dz], 0x1d1d1d, { dirt: .3, chip: .1 });
  }
  parts.push(skis);
  for (const [x, hex] of [[1.15, 0x3a5aa0], [1.3, 0x4ab0a0], [1.45, 0xc9a227]]) T.cyl(.04, .04, .025, [x, .83, -.35], hex, { dirt: .4, chip: .15 }, [0, 0, 0], 12);
  return parts;
}

export const BENCHES2 = {
  'bending-rig': bendingRig,
  'nail-jars': nailJars,
  'turning-arm': turningArm,
  'map-table': mapTable,
  'wind-tunnel': windTunnel,
  'launcher-ramp': launcherRamp,
  'snow-trays': snowTrays,
};
