// LAB-ART round 2: the lived-in part of the hangar. Workbenches with drawers, vices
// and a pegboard wall, rolling tool chests, a spare rotor blade on wall brackets, a
// tyre rack, drums, a coffee corner, cable runs, floor wear and tyre marks, and a
// warm work lamp over each bench station. Placed to keep the walkways clear.
import * as THREE from 'three';
import { C, fbm, lerpColor, noise, rng } from './lab-kit.mjs';
import { RED, STEEL, WOOD, YELLOW } from './lab-common.mjs';

// Work lamps: where each hangs (x, z) and how high the shade is. Every bench gets
// one over it; the weighing pad and the wind tunnel get two.
export const LAMPS = Object.freeze([
  [-2.2, 2.6], [2.2, 2.6], [-6.2, 6.4], [-9.7, -1.0], [-11.6, 4.6], [-5.4, -4.7], [-10.9, -7.6], [-6.3, -6.9], [-1.6, -6.1],
  [1.7, -5.9], [-7.3, 3.0], [7.2, -5.2], [11.8, -5.2], [13.4, 7.2], [-14.1, -6.2], [-14.1, -4.6],
]);

export function floorWear(part, t) {
  const random = rng(1201);
  // Oil spots with a crisp edge, bigger and darker under the benches, and fresh drips.
  for (let i = 0; i < 46; i++) {
    const x = (random() * 2 - 1) * 13.5, z = -8 + random() * 15, r = .08 + random() * random() * .55;
    if (Math.abs(x) < 3.2 && z > -1.5 && z < 6.5 && random() > .3) continue;
    t.geo(new THREE.CircleGeometry(r, 10), [x, .0095, z], 0x1c1a16, { dirt: 0 }, [-Math.PI / 2, 0, random() * 6], [1, 1, .55 + random() * .6]);
    if (r > .25) t.geo(new THREE.CircleGeometry(r * .45, 8), [x + r * .1, .0105, z], 0x0f0e0c, { dirt: 0 }, [-Math.PI / 2, 0, random() * 6]);
  }
  // Patched concrete: lighter rectangles where the slab was repaired.
  for (const [x, z, w, d] of [[-8, 2.4, 1.6, 1.0], [6.2, -2.0, 1.2, 1.8], [-2.8, -5.0, 1.0, 1.4], [12.0, 3.4, 1.4, .9]]) t.box([w, .006, d], [x, .006, z], 0x8e8b83, { dirt: .3 });
  // Scuffs and rust-brown stains from dripping drums.
  for (let i = 0; i < 18; i++) t.geo(new THREE.CircleGeometry(.12 + random() * .18, 8), [-12 + random() * 3, .0098, 7.5 + random() * 1.2], 0x6a4a2a, { dirt: .4 }, [-Math.PI / 2, 0, random() * 6], [1.6, 1, .6]);
  // Tyre marks: pairs of black ribbons curving from the open door toward the weighing pad and the benches.
  const ribbon = (points, width, hex, seed) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, .011, z)), false, 'centripetal'), n = 60, positions = [], indices = [];
    for (let i = 0; i <= n; i++) { const u = i / n, p = curve.getPoint(u), tan = curve.getTangent(u), nx = -tan.z, nz = tan.x; positions.push(p.x + nx * width / 2, .011, p.z + nz * width / 2, p.x - nx * width / 2, .011, p.z - nz * width / 2); }
    for (let i = 0; i < n; i++) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); g.setIndex(indices); g.computeVertexNormals();
    part.add('solid', g, [0, 0, 0], [0, 0, 0], [1, 1, 1], (p) => lerpColor(C(hex), C(0x6f6c66), Math.max(0, noise(p.x * 3, 0, p.z * 3, seed) - .38) * 1.6));
  };
  ribbon([[-4.0, 11.5], [-3.4, 8.6], [-3.6, 5.4], [-4.8, 2.4]], .2, 0x1a1816, 1301); ribbon([[-3.3, 11.5], [-2.7, 8.6], [-2.9, 5.4], [-4.1, 2.4]], .2, 0x1a1816, 1302);
  ribbon([[5.5, 11.5], [5.0, 8.4], [6.4, 5.2], [7.8, 1.2]], .22, 0x1a1816, 1303); ribbon([[6.3, 11.5], [5.8, 8.4], [7.2, 5.2], [8.6, 1.2]], .22, 0x1a1816, 1304);
  ribbon([[1.2, 10.8], [.4, 8.0], [-1.2, 6.0], [-2.0, 3.0]], .18, 0x222018, 1305); ribbon([[2.0, 10.8], [1.2, 8.0], [-.4, 6.0], [-1.2, 3.0]], .18, 0x222018, 1306);
  ribbon([[10.0, 9.8], [8.6, 8.2], [6.8, 8.4], [4.6, 9.2]], .2, 0x1a1816, 1307);
}

export function lamps(part, t) {
  for (const [x, z] of LAMPS) {
    t.bar([x, 6.0, z], [x, 4.6, z], .012, 0x2a2a2a, { dirt: 0 });
    t.geo(new THREE.CylinderGeometry(.07, .36, .3, 14, 1, true), [x, 4.45, z], 0x335a3a, { dirt: .3, chip: .12, rust: .2 });
    t.geo(new THREE.CylinderGeometry(.07, .36, .3, 14, 1, true).scale(-1, 1, 1), [x, 4.45, z], 0xcfc3a0, { dirt: .15 });
    t.glow(new THREE.SphereGeometry(.09, 10, 8), [x, 4.34, z], 0xffc98a);
  }
}

export function workshop(part, t) {
  const W = 15, random = rng(1401);
  // Two long workbenches along the left wall, each 2.6 m of steel frame and plank top with
  // drawers, vices and a lower shelf, under the pegboard.
  for (const [z, kind] of [[-7.55, 'vice'], [-4.95, 'press']]) {
    const x = -W + .55;
    t.box([1.0, .12, 2.6], [x, .98, z], 0x7a5b36, { dirt: .4, oil: 1.4 });
    t.box([1.05, .05, 2.65], [x, 1.05, z], 0x6a4d2c, { dirt: .45, oil: 1.4 });
    for (const dz of [-1.22, 1.22]) for (const dx of [-.45, .45]) t.box([.08, .92, .08], [x + dx, .46, z + dz], 0x4d555a, { rust: .5, dirt: .3 });
    t.box([.94, .05, 2.5], [x, .22, z], 0x4d555a, { rust: .5, dirt: .35, oil: .8 });
    for (let i = 0; i < 3; i++) { t.box([.04, .22, .8], [x + .5, .78 - i * .24, z - .7], 0x56646d, { rust: .3, dirt: .35, chip: .1 }); t.box([.04, .03, .3], [x + .53, .78 - i * .24, z - .7], 0xb9bcbe, { dirt: .2 }); }
    t.box([.86, .7, .86], [x - .02, .4, z - .7], 0x56646d, { rust: .3, dirt: .35, chip: .08 }, [0, 0, 0]);
    if (kind === 'vice') {
      for (const dz of [-.9, .3]) { t.box([.2, .14, .26], [x + .1, 1.16, z + dz], 0x394044, { rust: .5, dirt: .3 }); t.box([.1, .08, .3], [x + .24, 1.16, z + dz], 0x2a2c2d, { rust: .5 }); t.bar([x + .3, 1.16, z + dz], [x + .52, 1.2, z + dz + .1], .012, 0x2a2c2d, { rust: .3 }); }
      t.box([.3, .22, .3], [x - .15, 1.2, z + 1.0], 0x3a6a8a, { dirt: .3, chip: .15 }); t.cyl(.09, .09, .06, [x - .15, 1.34, z + 1.0], 0x6a6e70, { rust: .4 }, [0, 0, 0], 12);   // bench grinder
    } else {
      t.box([.4, .06, .4], [x, 1.1, z + .5], 0x2b2f31, { rust: .4, dirt: .3 }); t.cyl(.04, .04, 1.0, [x, 1.6, z + .5], 0x8a8d90, { rust: .3, oil: .5 }, [0, 0, 0], 8); // drill press column
      t.box([.32, .3, .3], [x, 2.05, z + .5], 0x3a6a8a, { dirt: .3, chip: .15, oil: .6 }); t.cyl(.01, .01, .3, [x, 1.78, z + .5], 0x8a8d90, {}, [0, 0, 0], 6);
      t.box([.3, .24, .4], [x - .1, 1.18, z - .6], 0x9a2a22, { dirt: .3, chip: .12 });
    }
  }
  // A shelf of small parts bins along the foot of the pegboard, a radio and a clock.
  t.box([.3, .04, 5.2], [-W + .2, 1.2, -6.2], 0x56646d, { rust: .5, dirt: .35 });
  for (let i = 0; i < 12; i++) t.box([.22, .12, .3], [-W + .24, 1.3, -8.5 + i * .42], [0xb02a22, 0x2f5f86, 0xc9a227, 0x4a6a3a][i % 4], { dirt: .4, chip: .15 });
  t.box([.2, .16, .34], [-W + .45, 1.2, -3.6], 0x3a3a3a, { dirt: .3, chip: .1 }); t.cyl(.05, .05, .02, [-W + .56, 1.22, -3.6], 0xb9bcbe, {}, [0, 0, Math.PI / 2], 10);
  // Rolling tool chests: a red six-drawer chest by the benches and a blue two-tier one at the back.
  for (const [x, z, hex, tall] of [[-14.2, -2.9, 0x9a2a22, 1.05], [-13.35, -8.45, 0x2f5f86, .85]]) {
    t.box([.55, tall, .7], [x, .1 + tall / 2, z], hex, { dirt: .4, chip: .16, rust: .2, oil: .8 });
    for (let i = 0; i < 5; i++) { t.box([.02, .015, .5], [x + .28, .22 + i * tall / 5.3, z], 0xb9bcbe, { dirt: .3 }); t.box([.005, .004, .62], [x + .281, .13 + (i + 1) * tall / 5.3 - .03, z], 0x1a1816, { dirt: 0 }); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) t.cyl(.05, .05, .04, [x + sx * .22, .05, z + sz * .28], 0x1d1d1d, { dirt: .3 }, [0, 0, Math.PI / 2], 8);
    t.box([.6, .03, .75], [x, .11 + tall, z], 0x3a3d3f, { dirt: .4, rust: .4 });
  }
  // A spare rotor blade on two wall brackets on the back wall above the nail jars, yellow tip.
  for (const x of [-12.0, -9.9]) { t.box([.12, .1, .14], [x, 3.1, -8.93], 0x3c4448, { rust: .5, dirt: .3 }); t.box([.05, .3, .12], [x, 3.0, -8.94], 0x3c4448, { rust: .5, dirt: .3 }); }
  t.box([3.6, .04, .24], [-11.0, 3.19, -8.84], 0x93989a, { dirt: .4, rust: .25, chip: .1 }); t.box([.5, .05, .22], [-12.65, 3.19, -8.84], YELLOW, { dirt: .4, chip: .15 }); t.box([.3, .09, .14], [-9.3, 3.17, -8.84], 0x464e52, { rust: .4, dirt: .3 });
  // A parts rack with tyres on the left wall: three levels, tyres stacked and standing, a few boxes.
  const rx = -W + .5;
  for (const z of [-.6, 1.6]) for (const dx of [-.25, .25]) t.box([.07, 2.1, .07], [rx + dx, 1.05, z], STEEL, { rust: .5, dirt: .3 });
  for (const y of [.35, 1.15, 1.95]) t.box([.7, .05, 2.3], [rx, y, .5], 0x5a666d, { rust: .5, dirt: .35, chip: .06 });
  for (let i = 0; i < 4; i++) t.geo(new THREE.TorusGeometry(.26, .12, 8, 20).rotateX(Math.PI / 2), [rx, .5 + i * .24, 0.1], 0x1d1f20, { dirt: .45 });
  for (let i = 0; i < 3; i++) t.geo(new THREE.TorusGeometry(.26, .12, 8, 20).rotateZ(Math.PI / 2), [rx - .22 + i * .22, 1.35, .6 + (i % 2) * .8], 0x1d1f20, { dirt: .45 });
  for (let i = 0; i < 4; i++) t.box([.36, .22 + (i % 2) * .08, .42], [rx, 2.1 + .1, -.2 + i * .55], [0x9a8460, 0xb09a74, 0x8a7a5a][i % 3], { dirt: .45 });
  // Oil drums by the front-left corner (moved off the right-hand door post), a tyre stack and a hose reel.
  for (const [x, z, hex] of [[-13.5, 8.2, 0x2f5a86], [-12.6, 8.35, 0x8a2a22], [-11.8, 8.15, 0x2f5a86], [-12.9, 7.35, 0x4a5a42]]) {
    t.cyl(.29, .29, .88, [x, .44, z], hex, { rust: .45, dirt: .35, oil: .8, chip: .1 }, [0, 0, 0], 16);
    for (const y of [.18, .44, .70]) t.geo(new THREE.TorusGeometry(.29, .012, 5, 16).rotateX(Math.PI / 2), [x, y, z], hex, { rust: .6, dirt: .3 });
  }
  t.box([.7, .05, .5], [-12.2, .02, 8.3], 0x2a2c2d, { oil: 1.5 });                                  // a drip tray
  for (let i = 0; i < 4; i++) t.geo(new THREE.TorusGeometry(.26, .12, 8, 20).rotateX(Math.PI / 2), [-10.6, .12 + i * .24, 8.2], 0x1d1f20, { dirt: .45 });
  t.cyl(.32, .32, .12, [-9.3, .06, 8.1], 0x3c4448, { rust: .4 }, [0, 0, 0], 14); t.geo(new THREE.TorusGeometry(.3, .045, 6, 18), [-9.3, .35, 8.1], 0x2f5f2a, { dirt: .4 }, [Math.PI / 2, 0, 0]);
  // The coffee corner on the right wall: a fridge, a small table with a kettle, mugs and a tin, a shelf of mugs above.
  const cx = W - .45;
  t.box([.62, 1.55, .66], [cx - .02, .78, 4.75], 0xd6d2c4, { dirt: .45, chip: .12, rust: .15 }); t.box([.03, .5, .04], [cx - .36, 1.1, 4.5], 0x8a8d90, { dirt: .3 }); t.box([.6, .02, .64], [cx - .02, 1.1, 4.75], 0xb9b5a8, { dirt: .5 });
  t.box([.7, .05, .8], [cx - .05, .72, 5.75], WOOD, { dirt: .45, oil: .8 }); for (const dx of [-.3, .3]) for (const dz of [-.35, .35]) t.box([.05, .7, .05], [cx - .05 + dx, .35, 5.75 + dz], 0x4d555a, { rust: .5, dirt: .3 });
  t.cyl(.12, .14, .22, [cx - .1, .86, 5.9], 0x9aa0a4, { dirt: .35, chip: .1 }, [0, 0, 0], 14); t.cyl(.08, .12, .06, [cx - .1, .99, 5.9], 0x9aa0a4, { dirt: .35 }, [0, 0, 0], 12); t.bar([cx - .1, .94, 5.78], [cx - .1, .9, 5.7], .015, 0x2a2a2a, { dirt: .3 });
  t.tube([[cx - .1 + .1, .99, 5.9], [cx - .1 + .18, 1.05, 5.9], [cx - .1 + .18, .88, 5.9]], .012, 0x2a2a2a, { dirt: .3 }, 8, 5);
  for (const [dx, dz, hex] of [[.05, -.1, 0xd6d2c4], [.1, .05, 0x9a2a22], [-.05, .15, 0x2f5f86]]) { t.cyl(.04, .04, .09, [cx + dx - .25, .79, 5.75 + dz], hex, { dirt: .4, chip: .15 }, [0, 0, 0], 10); }
  t.cyl(.07, .07, .12, [cx - .3, .82, 5.5], 0xb09a4a, { dirt: .4, rust: .3, chip: .15 }, [0, 0, 0], 10);
  t.box([.3, .03, .9], [cx + .1, 1.7, 5.75], 0x56646d, { rust: .5, dirt: .3 }); for (let i = 0; i < 4; i++) t.cyl(.04, .04, .09, [cx + .1, 1.77, 5.45 + i * .22], [0xd6d2c4, 0x9a2a22, 0xc9a227, 0x2f5f86][i], { dirt: .4, chip: .15 }, [0, 0, 0], 10);
  // Cable runs on the floor with yellow ramps where they cross the walkways.
  const cable = (points, hex = 0x15130f) => t.tube(points, .022, hex, { dirt: .25 }, 40, 6);
  cable([[4.1, .03, 6.2], [5.5, .03, 6.5], [9.0, .03, 6.2], [12.5, .03, 6.0], [14.8, .03, 5.6]]);
  cable([[-15, .03, -2.1], [-13.8, .03, -2.4], [-10.5, .03, -4.2], [-8.0, .03, -5.0], [-5.8, .03, -5.4]], 0x2a2018);
  cable([[14.9, .03, -3.0], [13.0, .03, -3.5], [11.0, .03, -3.2], [9.2, .03, -2.8]], 0x1c1c18);
  for (const [x, z, w, rot] of [[7.2, 6.3, 1.0, .1], [-11.3, -3.4, .9, .5], [11.9, -3.42, .9, 0]]) t.box([w, .04, .3], [x, .02, z], YELLOW, { dirt: .45, chip: .2, oil: .8 }, [0, rot, 0]);
  t.cyl(.22, .22, .2, [-13.9, .2, -.2], 0xd0782a, { dirt: .4, chip: .15 }, [0, 0, 0], 12); t.cyl(.06, .06, .24, [-13.9, .2, -.2], 0x2a2a2a, {}, [0, 0, 0], 8);
  void random; void fbm; void RED;
}
