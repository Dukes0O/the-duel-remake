// LAB-ART: the wind tunnel and the launcher (round 2 builds), split out of
// lab-benches2.mjs. See lab-benches.mjs for the conventions.
import * as THREE from 'three';
import { C, Part, duct, fbm, lerpColor, thick, tools, worn } from './lab-kit.mjs';
import { YELLOW, gauge, needle } from './lab-common.mjs';

function windTunnel() {
  const main = new Part('tunnel'), T = tools(main, 850);
  const CY = 1.35, XS0 = -3.8, XS1 = 2.8, XC = (XS0 + XS1) / 2;     // the test section runs from XS0 to XS1
  const shell = (rings, hex, seed, wall = .14) => main.add('solid', duct(rings, wall, 40), [0, 0, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(hex, p, n, { rust: .35, dirt: .32, oil: .7, seed, chip: .07 }));
  const flange = (x, rz, ry, seed) => {
    main.add('solid', new THREE.TorusGeometry(1, .07 / Math.max(rz, ry), 6, 40).rotateY(Math.PI / 2), [x, CY, 0], [0, 0, 0], [1, ry, rz], (p, n) => worn(0x3c4448, p, n, { rust: .55, dirt: .3, seed }));
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; T.cyl(.035, .035, .05, [x, CY + Math.sin(a) * ry, Math.cos(a) * rz], 0x8a8d90, { rust: .5, dirt: .3 }, [0, 0, Math.PI / 2], 6); }
  };
  // A heavy plinth under everything.
  T.box([10.6, .3, 4.0], [.05, .15, 0], 0x3f474b, { rust: .4, dirt: .35, oil: 1.2, chip: .06 });
  // The bellmouth intake: a flared, rolled lip, thick, with a honeycomb screen across its face.
  const bell = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, rz = 1.62 + .62 * Math.pow(1 - t, 2.4) + (t < .1 ? .1 * Math.sin(t / .1 * Math.PI / 2) : 0);
    bell.push({ x: -5.2 + 1.4 * t, cy: CY, rz, ry: rz * .64 });
  }
  shell(bell, 0x56646d, 851, .16);
  main.add('solid', new THREE.TorusGeometry(1, .09 / 2.36, 8, 40).rotateY(Math.PI / 2), [-5.2, CY, 0], [0, 0, 0], [1, .64 * 2.36, 2.36], (p, n) => worn(0x6a757b, p, n, { rust: .4, dirt: .3, seed: 852, chip: .08 }));
  for (let i = -8; i <= 8; i++) T.box([.03, 1.9, .03], [-5.05, CY, i * .26], 0x2b2f31, { rust: .5 });
  for (let i = -3; i <= 3; i++) T.box([.03, .03, 4.4], [-5.05, CY + i * .27, 0], 0x2b2f31, { rust: .5 });
  flange(-3.8, 1.72, 1.15, 853);
  // The test section: a thick steel frame with big glass windows and a ceiling, a rolling road below.
  for (const s of [-1, 1]) {
    T.box([XS1 - XS0, .5, .22], [XC, .55, s * 1.72], 0x56646d, { rust: .4, dirt: .32, chip: .07, oil: .6 });
    T.box([XS1 - XS0, .34, .24], [XC, 2.55, s * 1.72], 0x56646d, { rust: .4, dirt: .32, chip: .07 });
    for (const x of [XS0 + .05, XC, XS1 - .05]) T.box([.28, 2.4, .26], [x, 1.5, s * 1.72], 0x56646d, { rust: .45, dirt: .3, chip: .07 });
    for (const x of [XS0 + (XC - XS0) / 2, XC + (XS1 - XC) / 2]) T.glass(new THREE.BoxGeometry(2.9, 1.5, .04), [x, 1.55, s * 1.72], 0xcfe0e4);
  }
  T.box([XS1 - XS0, .12, 3.5], [XC, 2.72, 0], 0x4b585f, { rust: .4, dirt: .35, chip: .06 });
  for (let i = 0; i < 6; i++) T.box([.14, .16, 3.5], [XS0 + .6 + i * 1.1, 2.82, 0], 0x3c4448, { rust: .5, dirt: .3 });
  flange(XS1, 1.72, 1.15, 854);
  // The diffuser, the fan housing with a caged fan, and the motor pod behind it.
  shell([{ x: XS1, cy: CY, rz: 1.62, ry: 1.08 }, { x: XS1 + .7, cy: CY, rz: 1.66, ry: 1.2 }, { x: XS1 + 1.4, cy: CY, rz: 1.7, ry: 1.36 }], 0x56646d, 855, .16);
  flange(XS1 + 1.4, 1.7, 1.36, 856);
  shell([{ x: XS1 + 1.4, cy: CY, rz: 1.7, ry: 1.36 }, { x: XS1 + 2.4, cy: CY, rz: 1.7, ry: 1.36 }], 0x464e52, 857, .16);
  flange(XS1 + 2.4, 1.7, 1.36, 858);
  for (const r of [.55, 1.0, 1.4]) main.add('solid', new THREE.TorusGeometry(r, .03, 6, 36).rotateY(Math.PI / 2), [XS1 + 2.55, CY, 0], [0, 0, 0], [1, 1, 1], (p, n) => worn(0x2b2f31, p, n, { rust: .5, seed: 859 }));
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; T.bar([XS1 + 2.55, CY, 0], [XS1 + 2.55, CY + Math.sin(a) * 1.55, Math.cos(a) * 1.55], .018, 0x2b2f31, { rust: .5 }); }
  T.cyl(.4, .5, .9, [XS1 + 3.1, CY, 0], 0x3c4448, { rust: .5, dirt: .35, oil: .7 }, [0, 0, Math.PI / 2], 16);
  for (const z of [-1.6, 1.6]) T.bar([XS1 + 1.9, .3, z], [XS1 + 1.9, 1.0, z * .85], .09, 0x3c4448, { rust: .5 }, true);
  // Saddles under the ducts.
  for (const x of [-4.6, -1.5, 1.5, 4.9]) T.box([.4, .4, 3.2], [x, .5, 0], 0x3c4448, { rust: .5, dirt: .35 });
  // The rolling road: a belt with cleats between two drums; four platform scales under the wheels.
  const belt = new Part('belt', [XC, .34, 0]);
  belt.add('solid', new THREE.BoxGeometry(5.6, .025, 2.2), [XC, .345, 0], [0, 0, 0], [1, 1, 1], (p) => { const band = Math.floor((p.x + 9) * 6) & 1; return lerpColor(C(band ? 0x1c1f20 : 0x2b2f31), C(0x424a4c), fbm(p, 8, 860) * .6); });
  const B = tools(belt, 861);
  for (const s of [-1, 1]) B.cyl(.18, .18, 2.3, [XC + s * 2.8, .34, 0], 0x6a6e70, { rust: .4, dirt: .3, oil: .8 }, [Math.PI / 2, 0, 0], 12);
  for (const s of [-1, 1]) B.box([5.6, .07, .07], [XC, .36, s * 1.14], YELLOW, { dirt: .4, chip: .1 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { T.box([.7, .02, .42], [XC + sx * 1.3, .36, sz * .88], 0xc2c6c8, { dirt: .3, chip: .08, oil: .8 }); T.glow(new THREE.PlaneGeometry(.22, .06), [XC + sx * 1.3, .5, sz * 1.84], 0x9bd36a); }
  // Restraint struts that hold the car in place, one at each side.
  for (const s of [-1, 1]) { T.bar([XC, .36, s * 1.6], [XC, .6, s * 1.1], .035, 0x56646d, { rust: .4 }, true); T.box([.2, .07, .16], [XC, .62, s * 1.05], 0x2a2a2a, {}); }
  const parts = [main, belt];
  // The fan: nine blades on a hub inside the housing (own part, spins about the tunnel axis).
  const fan = new Part('fan', [XS1 + 2.0, CY, 0]), F = tools(fan, 862);
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; F.box([.12, 1.1, .36], [XS1 + 2.0, CY + Math.cos(a) * .85, Math.sin(a) * .85], 0x8d9396, { rust: .35, dirt: .3, chip: .1, oil: .4 }, [a, 0, .5]); }
  F.cyl(.34, .34, .34, [XS1 + 2.0, CY, 0], 0x464e52, { rust: .4, dirt: .3, oil: .5 }, [0, 0, Math.PI / 2], 14); F.geo(new THREE.SphereGeometry(.34, 12, 8, 0, Math.PI), [XS1 + 1.84, CY, 0], 0x6a6e70, { rust: .3 }, [0, -Math.PI / 2, 0]);
  parts.push(fan);
  // The smoke rake in the bellmouth: a manifold and nine nozzles (own part), a hose to the generator.
  const rake = new Part('smoke-rake', [-4.6, .9, 0]), S = tools(rake, 870);
  S.bar([-4.6, .5, 0], [-4.6, 2.2, 0], .035, 0x3c4448, { rust: .5 });
  for (let i = 0; i < 9; i++) S.cyl(.012, .012, .26, [-4.46, .62 + i * .16, 0], 0x8a8d90, { rust: .3 }, [0, 0, Math.PI / 2], 6);
  parts.push(rake);
  T.box([.6, .7, .6], [-5.0, .65, -2.3], 0x4a6a8a, { dirt: .4, chip: .15, rust: .3, oil: .8 }); T.cyl(.18, .18, .4, [-5.0, 1.2, -2.3], 0x6a6e70, { rust: .4 }, [0, 0, 0], 12);
  T.tube([[-5.0, 1.0, -2.0], [-5.0, .5, -1.2], [-4.8, .5, -.3], [-4.6, .8, 0]], .03, 0x1d1d1d, { dirt: .3 }, 20);
  // The control desk on the near side: a fan dial, a speed readout, a stop button and the REVERSE switch.
  const DX = XC;
  T.box([2.0, .9, .7], [DX, .5, 2.55], 0x464e52, { rust: .4, dirt: .35, chip: .08, oil: .7 });
  T.box([1.9, .08, .66], [DX, .99, 2.55], 0x2b2f31, { rust: .3, dirt: .3 });
  T.box([1.9, .5, .06], [DX, 1.35, 2.82], 0x2b2f31, { rust: .3, dirt: .3, chip: .1 }, [-.35, 0, 0]);
  gauge(main, { x: DX - .5, y: 1.36, z: 2.76, r: .22, yaw: 0, ticks: 16 });
  parts.push(needle('fan-dial-needle', DX - .5, 1.36, 2.76, .2));
  T.glow(new THREE.PlaneGeometry(.5, .14), [DX + .2, 1.42, 2.73], 0x9bd36a);
  T.geo(new THREE.CylinderGeometry(.07, .07, .05, 14).rotateX(Math.PI / 2 - .35), [DX + .75, 1.22, 2.76], 0xa02a22, { dirt: .3 });
  T.geo(new THREE.CylinderGeometry(.04, .04, .05, 10).rotateX(Math.PI / 2), [DX + .52, 1.3, 2.78], 0x3a7a3a, { dirt: .3 });
  // REVERSE: a guarded toggle, its own part so it can be hidden until the secret opens.
  const rev = new Part('reverse-switch', [DX + .1, 1.2, 2.76]), Rv = tools(rev, 880);
  Rv.box([.18, .12, .1], [DX + .1, 1.28, 2.76], 0x2b2f31, { dirt: .2, chip: .1 }); Rv.cyl(.012, .012, .12, [DX + .1, 1.36, 2.76], 0xb9bcbe, {}, [-.2, 0, 0], 6); Rv.geo(new THREE.SphereGeometry(.022, 8, 6), [DX + .1, 1.43, 2.74], 0xa02a22, {});
  Rv.box([.2, .014, .12], [DX + .1, 1.4, 2.7], 0xc9a227, { chip: .15 }, [.5, 0, 0]);
  parts.push(rev);
  return parts;
}

function launcherRamp() {
  const main = new Part('launcher'), T = tools(main, 900);
  // A steel tripod with a hinge head, an angle quadrant, an air tank with a hose and a pressure dial, and a tape.
  const head = [0, 1.3, -1.5];
  for (const [x, z] of [[-1.0, -2.2], [1.0, -2.2], [0, -.35]]) {
    T.bar([x, 0, z], [x * .1, head[1] - .08, head[2] + (z + 1.5) * .12], .05, 0x56646d, { rust: .45, dirt: .3, chip: .07 }, true);
    T.box([.3, .04, .3], [x, .02, z], 0x2b2f31, { rust: .5, dirt: .3 });
  }
  T.bar([-.55, .45, -1.9], [.55, .45, -1.9], .02, 0x56646d, { rust: .5 });
  T.box([.5, .4, .36], head, 0x3c4448, { rust: .45, dirt: .3, chip: .08, oil: .6 });
  T.cyl(.09, .09, .9, head, 0x8a8d90, { rust: .4, dirt: .3, oil: .5 }, [0, 0, Math.PI / 2], 10);
  // The quadrant: a quarter-circle plate on the left of the head, a tick every 5 degrees from 0 to 90.
  const Rq = 1.45, qx = -.34;
  main.add('solid', thick(new THREE.RingGeometry(Rq - .22, Rq, 28, 1, 0, Math.PI / 2).rotateY(-Math.PI / 2), .012), [qx, head[1], head[2]], [0, 0, 0], [1, 1, 1], (p, n) => worn(0xd8d2be, p, n, { dirt: .4, chip: .1, seed: 901 }));
  for (let d = 0; d <= 90; d += 5) { const a = d * Math.PI / 180, major = d % 15 === 0; T.box([.014, major ? .12 : .07, .014], [qx, head[1] + Math.sin(a) * (Rq - .1), head[2] + Math.cos(a) * (Rq - .1)], 0x1a1816, { dirt: 0 }, [-(Math.PI / 2 - a), 0, 0]); }
  T.bar([qx, head[1], head[2]], [qx, head[1], head[2] + Rq], .014, 0x3c4448, { rust: .4 });
  T.bar([qx, head[1], head[2]], [qx, head[1] + Rq, head[2]], .014, 0x3c4448, { rust: .4 });
  // The air tank on a cradle, a hose to the breech, a pressure dial and a red valve.
  T.cyl(.27, .27, 1.1, [1.1, .42, -1.3], 0x4a6a8a, { dirt: .4, rust: .4, chip: .15, oil: .8 }, [Math.PI / 2, 0, 0], 16);
  for (const z of [-1.7, -.9]) T.box([.1, .5, .12], [1.1, .22, z], 0x3c4448, { rust: .5, dirt: .3 });
  T.cyl(.05, .05, .14, [1.1, .72, -1.3], 0x9a7a2a, { rust: .3 }, [0, 0, 0], 8); T.geo(new THREE.TorusGeometry(.07, .014, 5, 14).rotateX(Math.PI / 2), [1.1, .8, -1.3], 0xa02a22, { dirt: .3 });
  T.tube([[1.0, .7, -1.3], [.7, 1.0, -1.35], [.2, 1.25, -1.6], [.0, 1.3, -1.7]], .03, 0x1d1d1d, { dirt: .3 }, 20);
  T.box([.3, .3, .06], [1.1, 1.0, -1.3], 0x2b2f31, { rust: .35, dirt: .3 }); gauge(main, { x: 1.1, y: 1.0, z: -1.26, r: .12 });
  // A 3 m tape measure on the floor from the muzzle end, with cones at one, two and three metres.
  T.box([.06, .008, 3.1], [1.5, .005, 1.95], 0xe3d9a8, { dirt: .5 });
  for (let i = 0; i <= 6; i++) T.box([i % 2 ? .1 : .16, .01, .012], [1.5, .008, .4 + i * .5], 0x1a1816, { dirt: 0 });
  for (const z of [1.0, 2.0, 3.0]) T.cyl(.01, .08, .22, [1.0, .11, z], 0xd9702a, { dirt: .4, chip: .1 }, [0, 0, 0], 10);
  // The barrel: a pneumatic tube with a breech block, a sight rail and a muzzle ring (own part, tilts about the head).
  const arm = new Part('ramp-arm', head), A = tools(arm, 910), tilt = Math.PI / 4, L = 2.4;
  const at = (l, h = 0) => [0, head[1] + Math.sin(tilt) * l + Math.cos(tilt) * h, head[2] + Math.cos(tilt) * l - Math.sin(tilt) * h];
  A.bar(at(-.2), at(L), .085, 0x8d9396, { rust: .35, dirt: .3, chip: .1, oil: .5 });
  A.bar(at(-.2), at(.25), .13, 0x464e52, { rust: .4, dirt: .3, oil: .6 });
  A.bar(at(L - .1), at(L), .105, 0x3c4448, { rust: .4, dirt: .3 });
  A.bar(at(.3, .13), at(L - .2, .13), .018, 0x6a6e70, { rust: .4 });
  for (const l of [.5, 1.2, 1.9]) A.bar(at(l, .09), at(l, .14), .012, 0x6a6e70, { rust: .4 });
  A.geo(new THREE.SphereGeometry(.07, 12, 8), at(L + .08, 0), 0xc9a227, { dirt: .3, chip: .2 });
  return [main, arm];
}

export const BENCHES3 = { 'wind-tunnel': windTunnel, 'launcher-ramp': launcherRamp };
