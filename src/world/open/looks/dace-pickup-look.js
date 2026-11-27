// Moss's old pickup and its key (OPEN-LOOK-DACE, round 1), drawn in code. A long-bed work truck from before the fall: green paint
// that the sun has chalked, primer and rust showing through, rust round the arches and along the sills, one door from another
// truck, cream wheels, a canvas cover tied over the bed on the driver's side and hanging loose on the other, an aerial on the
// right wing with Rell's red blanket tied to it, and a bonnet that opens on the engine and the radiator.
//
// The truck's own metres: x across (the driver sits at +x), y up from the ground, z along it with the nose at +z. The spot the
// rules give the pickup (`pickup` in dace-goes-looking-places.js) lies in the bed (`PICKUP.shift` behind these metres' origin), where
// Dace sits on the cover, with the front wing beside the spot `radiator` and the tail beside the spot `spare`.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLASS, MARK, createKit, createMaterials, finish, finishThing, mulberry, palette, rgb, shade, smooth, span} from './dace-look-kit.js';

export const PICKUP = Object.freeze({wheel: .37, track: .8, frontAxle: 1.92, rearAxle: -1.18, arch: .5, sill: .58, belt: 1.36, roof: 1.88,
  cabBack: .18, cabFront: 1.4, cabHalf: .87, bedFront: .12, bedBack: -2.4, bedFloor: .9, bedTop: 1.38, bedHalf: .93,
  hinge: Object.freeze({y: 1.3, z: 1.42}), nose: 2.62, aerial: Object.freeze({x: -.88, z: 1.5, foot: 1.24, top: 2.42}),
  // Where the dropped cover lies and how far the bonnet swings up.
  dropped: Object.freeze({x: 1.75, z: -1.3}), bonnetOpen: -1.02,
  // The whole truck is drawn this far forward of its spot, so that its tail clears the forge shed behind the spot.
  shift: .55});
// The wind blows towards the east-south-east, as Tin Town's chimney smoke does.
const WIND = Object.freeze({x: .94, z: .34});
// The lamps' light is a sheet a hand's breadth above the ground, clear of a road's mat, which lies some centimetres over the
// land it crosses.
const POOL_LIFT = .22;
const T = PICKUP;

// A flat outline in the truck's side view (z along the truck, y up), given its thickness across the truck from x0 to x1.
function slab(outline, x0, x1, bevel = .025) {
  const shape = new THREE.Shape();
  outline.forEach(([z, y], index) => index ? shape.lineTo(z, y) : shape.moveTo(z, y));
  shape.closePath();
  const depth = Math.max(.002, x1 - x0 - bevel * 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 2});
  geometry.translate(0, 0, -depth / 2);
  geometry.rotateY(-Math.PI / 2);
  geometry.translate((x0 + x1) / 2, 0, 0);
  return geometry;
}
const arc = (z, y, radius, from, to, steps = 10) => Array.from({length: steps + 1}, (_, index) => {
  const angle = from + (to - from) * index / steps; return [z + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
});
// The part of a wheel arch that is above the sill, from its front to its back.
function archCut(axle) {
  const open = Math.asin((T.sill - T.wheel) / T.arch);
  return arc(axle, T.wheel, T.arch, open, Math.PI - open, 12);
}
const rounded = (w, h, d, radius = .04) => new RoundedBoxGeometry(w, h, d, 2, radius);
const quad = (a, b, c, d) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...d], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return geometry;
};
function colourBy(geometry, colour) {
  const points = geometry.attributes.position, colours = new Float32Array(points.count * 3);
  for (let index = 0; index < points.count; index++) { const c = colour(points.getX(index), points.getY(index), points.getZ(index)); colours.set([c.r, c.g, c.b], index * 3); }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  return geometry;
}

// One wheel about its own middle: a tyre with lugs, and a steel wheel that was cream once. `out` is +1 or -1: which way its face looks.
function drawTyre(kit) {
  const P = palette(), profile = [[.215, -.095], [.25, -.118], [.33, -.122], [.36, -.1], [.37, -.06], [.37, .06], [.36, .1], [.33, .122], [.25, .118], [.215, .095]];
  const tyre = new THREE.LatheGeometry(profile.map(([radius, along]) => new THREE.Vector2(radius, along)), 22);
  colourBy(tyre, (x, y, z) => Math.hypot(x, z) > .352 ? P.rubberDusty : P.rubber);
  tyre.rotateZ(Math.PI / 2);
  kit.keep('plain', tyre, null);
  for (let lug = 0; lug < 20; lug++) {
    const angle = lug / 20 * Math.PI * 2;
    kit.box('plain', .1, .024, .055, P.rubberDusty, (lug % 2 ? 1 : -1) * .055, Math.cos(angle) * .372, Math.sin(angle) * .372, [angle, 0, 0]);
  }
}
function drawRim(kit, out) {
  const P = palette(), across = [0, 0, Math.PI / 2];
  kit.cylinder('hard', .212, .19, P.iron, 0, 0, 0, across, 14);
  kit.cylinder('hard', .22, .04, P.wheel, out * .085, 0, 0, across, 16);
  kit.cylinder('hard', .135, .03, shade(P.wheel, .7), out * .1, 0, 0, across, 14);
  kit.cylinder('hard', .07, .07, P.galv, out * .11, 0, 0, across, 10);
  for (let nut = 0; nut < 5; nut++) {
    const angle = nut / 5 * Math.PI * 2 + .3;
    kit.cylinder('hard', .014, .03, P.rust, out * .115, Math.cos(angle) * .1, Math.sin(angle) * .1, across, 6);
  }
}

function drawBody(kit) {
  const P = palette(), random = mulberry(0xdace1);
  // ---- Under the body: the frame, the axles, the springs and the pipe.
  for (const x of [-.42, .42]) kit.box('hard', .08, .14, 4.9, P.iron, x, .5, .05);
  kit.cylinder('hard', .06, 1.5, P.iron, 0, T.wheel, T.rearAxle, [0, 0, Math.PI / 2], 8);
  kit.keep('hard', kit.place(new THREE.SphereGeometry(.17, 8, 6), 0, T.wheel, T.rearAxle), P.rustDark);
  kit.box('hard', 1.5, .07, .08, P.iron, 0, T.wheel - .03, T.frontAxle);
  for (const x of [-.5, .5]) for (const axle of [T.rearAxle, T.frontAxle]) kit.box('hard', .06, .05, 1.1, P.rustDark, x, T.wheel + .1, axle);
  kit.tube('hard', [-.3, .42, 1.3], [-.3, .4, -1.9], .03, P.rust, 6);
  kit.cylinder('hard', .09, .55, P.rustDark, -.3, .41, -.3, [Math.PI / 2, 0, 0], 8);
  kit.tube('hard', [-.3, .4, -1.9], [-.55, .43, -2.46], .03, P.rust, 6);
  for (const x of [-T.track, T.track]) kit.box('plain', .3, .34, .012, P.rubber, x, .44, T.rearAxle - .56, [.12, 0, 0]);

  // ---- The front: two wings with their arches, the apron inside each, the grille, the lamps and the bumper.
  const wing = [[T.cabFront - .04, 1.26], [1.9, 1.27], [2.4, 1.2], [2.56, 1.1], [T.nose, .92], [2.6, .7], [2.5, T.sill], ...archCut(T.frontAxle), [T.cabFront - .04, T.sill]];
  for (const side of [-1, 1]) {
    kit.keep('paint', slab(wing, side > 0 ? .6 : -.96, side > 0 ? .96 : -.6, .05), P.truck);
    kit.box('hard', .04, .62, 1.2, P.black, side * .58, .89, 1.97);
    // A headlamp in each wing, and a small amber lamp under it.
    kit.cylinder('hard', .108, .07, P.chrome, side * .78, .99, T.nose - .015, [Math.PI / 2, 0, 0], 14);
    kit.keep('lamp', kit.place(new THREE.CircleGeometry(.088, 14), side * .78, .99, T.nose + .022), shade(P.chrome, .55));
    kit.keep('glass', kit.place(new THREE.CircleGeometry(.035, 8), side * .78, .8, T.nose - .005), GLASS.amber);
  }
  kit.box('hard', 1.2, .5, .03, P.black, 0, .86, 2.555);
  kit.box('hard', 1.0, .46, .06, P.rustDark, 0, .86, 2.5);
  for (let bar = 0; bar < 7; bar++) kit.box('hard', 1.17, .03, .03, P.chrome, 0, .66 + bar * .068, 2.585);
  kit.box('hard', .05, .5, .035, P.chrome, 0, .86, 2.59);
  for (const [w, h, x, y] of [[1.24, .05, 0, 1.115], [1.24, .05, 0, .61], [.05, .5, -.6, .86], [.05, .5, .6, .86]]) kit.box('paint', w, h, .06, P.truck, x, y, 2.575);
  kit.keep('hard', kit.place(rounded(2.02, .15, .1, .035), 0, .58, 2.73), P.chrome);
  for (const x of [-.42, .42]) kit.box('hard', .06, .08, .22, P.iron, x, .56, 2.62);
  // The engine, seen when the bonnet is up: the block and its rocker cover, the air cleaner, the radiator with its hose, a battery.
  kit.box('hard', 1.12, .03, 1.16, P.black, 0, .6, 1.98);
  kit.box('hard', .5, .44, .64, P.iron, 0, .86, 1.93);
  kit.keep('hard', kit.place(rounded(.3, .1, .56, .03), 0, 1.12, 1.93), rockerRed());
  kit.cylinder('hard', .17, .09, P.rustDark, 0, 1.21, 1.84, null, 14);
  kit.cylinder('hard', .05, .06, P.galv, 0, 1.28, 1.84, null, 8);
  kit.box('hard', 1.02, .5, .07, P.rustDark, 0, .9, 2.47);
  kit.box('hard', 1.04, .07, .09, P.brass, 0, 1.165, 2.47);
  kit.cylinder('hard', .035, .03, P.galv, .3, 1.21, 2.47, null, 8);
  kit.rope('plain', [[-.14, 1.14, 2.44], [-.16, 1.2, 2.36], [-.15, 1.17, 2.24], [-.12, 1.08, 2.2]], .028, P.rubber, 6);
  kit.box('hard', .26, .19, .17, P.black, .4, .98, 1.58);
  for (const x of [.33, .47]) kit.cylinder('hard', .014, .03, P.galv, x, 1.085, 1.58, null, 6);
  kit.rope('hard', [[.33, 1.1, 1.58], [.25, 1.14, 1.7], [.18, 1.02, 1.8]], .01, P.rust, 4);

  // ---- The cab: the lower body, the door gaps and handles, one door from another truck, the pillars, the roof and the glass.
  kit.keep('paint', kit.place(rounded(T.cabHalf * 2, T.belt - T.sill, T.cabFront - T.cabBack, .05), 0, (T.belt + T.sill) / 2, (T.cabFront + T.cabBack) / 2), P.truck);
  kit.keep('paint', kit.place(rounded(1.62, .075, .9, .035), 0, T.roof - .04, .63), P.truck);
  // The back of the cab above the belt, round its window.
  for (const [w, h, x, y] of [[.36, .5, -.63, 1.6], [.36, .5, .63, 1.6], [.92, .1, 0, 1.8], [.92, .12, 0, 1.42]]) kit.box('paint', w, h, .05, P.truck, x, y, T.cabBack + .03);
  kit.keep('glass', kit.place(new THREE.PlaneGeometry(.92, .28), 0, 1.62, T.cabBack + .03, [0, Math.PI, 0]), GLASS.dusty);
  for (const side of [-1, 1]) {
    const x = side * .82;
    kit.box('paint', .05, .5, .13, P.truck, x, 1.6, T.cabBack + .07);
    kit.batten('paint', [side * .81, T.belt - .01, T.cabFront - .03], [side * .79, T.roof - .05, 1.06], .05, .06, P.truck);
    kit.batten('hard', [side * .825, T.belt, 1.04], [side * .825, T.roof - .06, 1.04], .02, .025, P.black);
    // The door's window: dusty glass from the back pillar to the screen pillar.
    kit.keep('glass', quad([x, T.belt, .32], [x, T.belt, T.cabFront - .06], [x, T.roof - .07, 1.08], [x, T.roof - .07, .32]), GLASS.dusty);
    // The door gap, the handle and a mirror on its arm.
    const skin = side * (T.cabHalf + .002);
    for (const z of [.3, 1.3]) kit.box('hard', .008, T.belt - T.sill - .08, .014, P.black, skin, (T.belt + T.sill) / 2 + .02, z);
    kit.box('hard', .008, .014, 1.0, P.black, skin, T.sill + .06, .8);
    kit.box('hard', .02, .028, .11, P.chrome, side * (T.cabHalf + .014), 1.2, .43);
    kit.tube('hard', [side * .86, 1.42, 1.22], [side * 1.04, 1.52, 1.26], .009, P.iron, 4);
    kit.keep('hard', kit.place(rounded(.02, .17, .11, .008), side * 1.05, 1.56, 1.26), P.iron);
  }
  // The driver's door came from another truck: cream, and no better kept.
  kit.keep('paint', kit.place(rounded(.012, T.belt - T.sill - .1, .98, .005), T.cabHalf + .003, (T.belt + T.sill) / 2 + .02, .8), P.door);
  // The screen in two panes with a bar between, wipers parked.
  for (const side of [-1, 1]) {
    const inner = side * .015, outer = side * .76;
    kit.keep('glass', quad([inner, T.belt + .02, T.cabFront - .03], [outer, T.belt + .02, T.cabFront - .03], [side * .74, T.roof - .07, 1.07], [inner, T.roof - .07, 1.07]), GLASS.window);
    kit.tube('hard', [side * .5, T.belt + .03, T.cabFront - .015], [side * .14, T.belt + .09, T.cabFront - .055], .007, P.black, 4);
  }
  kit.batten('paint', [0, T.belt, T.cabFront - .03], [0, T.roof - .06, 1.07], .035, .03, P.truck);
  // Inside: a dark floor at the belt, the bench, the dash and the wheel.
  kit.box('hard', 1.62, .02, 1.1, P.black, 0, T.belt + .012, .8);
  kit.keep('hard', kit.place(rounded(1.5, .5, .16, .05), 0, 1.47, .47, [-.12, 0, 0]), P.seat);
  kit.box('hard', 1.6, .1, .2, P.black, 0, T.belt + .06, 1.26);
  kit.keep('hard', kit.place(new THREE.TorusGeometry(.19, .014, 5, 16), .4, 1.52, 1.08, [-.5, 0, 0]), P.black);
  kit.tube('hard', [.4, 1.52, 1.08], [.4, 1.4, 1.26], .015, P.black, 5);

  // ---- The bed: two sides with their arches, the floor of planks, the front wall, the tailgate, the wheel tubs and the bumper.
  const sideOutline = [[T.bedBack, T.sill + .04], [T.bedBack, T.bedTop], [T.bedFront, T.bedTop], [T.bedFront, T.sill], ...archCut(T.rearAxle), [T.bedBack + .25, T.sill]];
  for (const side of [-1, 1]) {
    kit.keep('paint', slab(sideOutline, side > 0 ? .87 : -T.bedHalf - .02, side > 0 ? T.bedHalf + .02 : -.87, .02), P.truck);
    kit.keep('paint', kit.place(rounded(.11, .045, T.bedFront - T.bedBack, .015), side * .905, T.bedTop + .01, (T.bedFront + T.bedBack) / 2), P.truckDeep);
    kit.box('hard', .26, .44, 1.06, P.black, side * .74, .8, T.rearAxle);
    // A pressed line along each side, and a tail lamp.
    kit.box('paint', .012, .05, 2.3, P.truckDeep, side * (T.bedHalf + .022), 1.12, (T.bedFront + T.bedBack) / 2);
    kit.keep('glass', kit.place(new THREE.PlaneGeometry(.07, .17), side * .9, 1.05, T.bedBack - .012, [0, Math.PI, 0]), GLASS.red);
  }
  for (let plank = 0; plank < 8; plank++) kit.box('plain', .212, .04, T.bedFront - T.bedBack - .04, shade(P.greyTimber, .75 + random() * .45), -.76 + plank * .217, T.bedFloor - .02, (T.bedFront + T.bedBack) / 2);
  kit.box('paint', 1.84, T.bedTop - T.sill, .04, P.truck, 0, (T.bedTop + T.sill) / 2, T.bedFront - .02);
  kit.keep('paint', kit.place(rounded(1.74, T.bedTop - T.sill - .06, .05, .015), 0, (T.bedTop + T.sill) / 2 + .01, T.bedBack + .01), P.truck);
  kit.box('paint', 1.3, .36, .012, P.truckDeep, 0, 1.02, T.bedBack - .018);
  for (const side of [-1, 1]) kit.tube('hard', [side * .84, 1.34, T.bedBack + .02], [side * .86, 1.02, T.bedBack + .3], .008, P.rust, 4);
  kit.box('hard', 1.9, .12, .13, P.rust, 0, .55, T.bedBack - .1);
  // What Moss carries: a spare wheel flat on the planks, a jerrycan, a coil of rope, a plank and a box of tools.
  kit.within(-.42, T.bedFloor + .12, -1.75, [0, .4, Math.PI / 2], () => { drawTyre(kit); drawRim(kit, 1); });
  kit.keep('hard', kit.place(rounded(.17, .44, .34, .03), .55, T.bedFloor + .22, -.2), shade(P.rustPale, .9));
  kit.cylinder('hard', .02, .05, P.iron, .55, T.bedFloor + .46, -.1, null, 6);
  kit.keep('hard', kit.place(new THREE.TorusGeometry(.17, .035, 5, 14), .45, T.bedFloor + .04, -.95, [Math.PI / 2, 0, 0]), P.rope);
  kit.keep('hard', kit.place(new THREE.TorusGeometry(.14, .03, 5, 14), .47, T.bedFloor + .1, -.94, [Math.PI / 2, 0, 0]), shade(P.rope, .85));
  kit.box('plain', .2, .035, 1.9, P.paleTimber, .1, T.bedFloor + .02, -1.2, [0, .06, 0]);
  kit.keep('hard', kit.place(rounded(.5, .2, .24, .02), -.3, T.bedFloor + .1, -.45, [0, .2, 0]), P.rustDark);

  // ---- The aerial on the right wing, a little bent.
  const A = T.aerial;
  kit.cylinder('hard', .018, .05, P.chrome, A.x, A.foot + .02, A.z, null, 6);
  kit.rope('hard', [[A.x, A.foot, A.z], [A.x, A.foot + .5, A.z - .01], [A.x - .01, A.foot + .9, A.z - .04], [A.x - .02, A.top, A.z - .1]], .006, P.iron, 4, 8);
}
// The rocker cover: a red that has gone to rust.
function rockerRed() { const P = palette(); return P.rust.clone().lerp(P.blanket, .25); }

// The bonnet about its hinge: crowned, its edges turned down, the nose a little lower than the scuttle.
function drawBonnet(kit) {
  const P = palette(), us = [-1, 0, .125, .25, .375, .5, .625, .75, .875, 1, 2], vs = [0, .17, .34, .5, .67, .84, 1, 2];
  kit.keep('paint', kit.sheet('paint', us, vs, (u, v) => {
    const across = Math.min(1, Math.max(0, u)), along = Math.min(1, Math.max(0, v));
    let y = .045 * (1 - (2 * across - 1) ** 2) * (1 - .3 * along) - .1 * along ** 1.6, z = along * 1.19;
    if (u < 0 || u > 1) y -= .065;
    if (v > 1) { y -= .1; z += .02; }
    return [(.5 - across) * 1.2, y, z];
  }, null), P.truck);
  // A strip of bright metal down the middle, and the catch.
  kit.box('paint', .02, .012, 1.0, P.chrome, 0, .028, .62, [.07, 0, 0]);
  kit.box('paint', .06, .05, .03, P.iron, 0, -.19, 1.17);
}

// The canvas cover over the bed. Tied down on the driver's side; on the other it has come off its hooks and hangs to the sill,
// lowest at the back corner. Under it at the back is a load; at the front it sags, where a boy can sit.
function coverPoint(u, v) {
  const z = T.bedFront + .04 - v * (T.bedFront - T.bedBack + .1), load = smooth(-.5, -1.4, z), ripple = .012 * Math.sin(u * 23 + z * 4) + .01 * Math.sin(z * 13 + u * 5);
  if (u < .1) { const t = u / .1; return [.985 - .03 * t, 1.16 + (T.bedTop + .05 - 1.16) * t, z]; }
  if (u <= .72) {
    const t = (u - .1) / .62, x = .955 - 1.91 * t, k = x / .955;
    return [x, T.bedTop + .05 + .2 * load * (1 - k ** 4) + .05 * load * Math.sin(z * 4.3 + 1) * (1 - k * k) - .22 * (1 - load) * (1 - k * k) + ripple * (1 - k * k), z];
  }
  const t = (u - .72) / .28, hem = 1.0 - .1 * Math.sin(v * 9 + .5) - .34 * smooth(.55, 1, v);
  return [-.955 - .07 * Math.sin(t * Math.PI) - .035 * t + .02 * Math.sin(v * 17) * t, T.bedTop + .05 + (hem - T.bedTop - .05) * t, z + .03 * Math.sin(v * 11) * t];
}
// Canvas: weathered in patches, with a paler hem, seams where its widths were sewn and a patch or two.
function clothColour(base, dark, pale = null) {
  return (u, v) => {
    const c = base.clone().lerp(dark, .5 + .5 * Math.sin(u * 13 + v * 5) * Math.sin(v * 9 + u * 3)).multiplyScalar(.9 + .1 * Math.sin(v * 31));
    if (pale) {
      const hem = Math.max(smooth(.93, .99, u), smooth(.07, .01, u), smooth(.94, .99, v), smooth(.06, .01, v)), seam = Math.abs(v * 4 % 1 - .5) > .46 ? 1 : 0;
      c.lerp(pale, .7 * hem).lerp(dark, .6 * seam * (1 - hem));
      if (u > .8 && u < .92 && v > .36 && v < .46) c.lerp(pale, .55);
    }
    return rgb(c);
  };
}
function drawCover(kit) {
  const P = palette(), us = span(24), vs = span(28);
  kit.keep('cloth', kit.sheet('cloth', us, vs, coverPoint, clothColour(P.canvas, P.canvasDark, P.canvasPale)), null);
  // Cords from its eyelets to the hooks under the rail, on the side that is still tied.
  for (const v of [.06, .3, .54, .78, .96]) {
    const at = coverPoint(0, v);
    kit.tube('cloth', at, [.955, 1.02, at[2] - .06], .006, P.rope, 4);
  }
  // On the loose side the cords hang from the hem.
  for (const v of [.3, .78]) { const at = coverPoint(1, v); kit.tube('cloth', at, [at[0] + .01, at[1] - .22, at[2] + .02], .006, P.rope, 4); }
  return us.length * vs.length;
}
// The same cover pulled off and dropped beside the truck: a heap of folds.
function drawDropped(kit) {
  const P = palette(), us = span(22), vs = span(18);
  kit.keep('cloth', kit.sheet('cloth', us, vs, (u, v) => {
    const a = (u - .5) * 2, b = (v - .5) * 2, edge = Math.max(0, 1 - (a * a * .9 + b * b) ** 1.4), ragged = 1 + .12 * Math.sin(u * 17 + v * 3) + .1 * Math.sin(v * 13);
    const fold = Math.abs(Math.sin(a * 6.1 + Math.sin(b * 3) * 1.6)) ** .6, crease = Math.abs(Math.sin(b * 8.3 + a * 2.4)) ** .7;
    return [a * .66 * ragged, .012 + edge * (.03 + .19 * fold + .09 * crease), b * .52 * ragged];
  }, clothColour(P.canvas, P.canvasDark)), null);
}

// Rell's red blanket, knotted round the top of the aerial and blowing: `u` runs away from the knot, `v` down the blanket.
const BLANKET = Object.freeze({long: .78, deep: .52, us: 10, vs: 6});
function blanketPoint(u, v, seconds) {
  const open = smooth(0, .3, u), wave = Math.sin(u * 6.4 - seconds * 4.6 + v * 1.7) * .075 * u + Math.sin(u * 11 - seconds * 7.1) * .02 * u;
  const out = u * BLANKET.long, droop = .16 * u ** 1.4 + .03 * Math.sin(seconds * 1.3) * u;
  return [T.aerial.x - .02 + WIND.x * out - WIND.z * wave, T.aerial.top - .04 - droop - (v - .5 * (1 - open)) * (.05 + BLANKET.deep * open) + .04 * (1 - open),
    T.aerial.z - .1 + WIND.z * out + WIND.x * wave];
}
function drawBlanket(kit) {
  const P = palette();
  kit.keep('cloth', kit.sheet('cloth', span(BLANKET.us), span(BLANKET.vs), (u, v) => blanketPoint(u, v, 0), (u, v) => {
    const band = u > .7 && u < .78 || u > .84 && u < .9, pale = v > .44 && v < .56 && u > .12;
    return rgb(band ? P.blanketBand : pale ? P.blanketPale.clone().lerp(P.blanket, .55) : shade(P.blanket, .82 + .18 * Math.sin(v * 9 + u * 4)));
  }), null);
  kit.keep('cloth', kit.place(new THREE.SphereGeometry(.035, 6, 5), T.aerial.x - .02, T.aerial.top - .04, T.aerial.z - .1), shade(P.blanket, .8));
}

// Moss's old pickup. The handles in `userData`: `cover`, `folded`, `bonnet`, `aerial`, `blanket` and `wheelPivots` (the front wheel
// on the driver's side, which goes flat), `setFlat`, `setBonnet`, `setLamps`, `groundAt` and `update(seconds)` for the wear, the
// cloth and the lamps' light on the road.
export function buildMossPickup() {
  const P = palette(), materials = createMaterials({paint: {arches: [[T.frontAxle + T.shift, T.wheel, T.arch], [T.rearAxle + T.shift, T.wheel, T.arch]], sill: T.sill}});
  const truck = new THREE.Group();
  truck.name = "Moss's old pickup";
  let triangles = 0;
  const part = (name, draw, parent) => {
    const kit = createKit(), group = new THREE.Group();
    group.name = name;
    const extra = draw(kit);
    finish(kit, group, name, materials);
    triangles += kit.triangles;
    parent.add(group);
    return Object.assign(group, {extra});
  };
  const chassis = new THREE.Group();
  chassis.name = 'Pickup, forward of its spot';
  chassis.position.z = T.shift;
  truck.add(chassis);
  // Everything that rides on the springs is in `body`, which settles towards a flat tyre.
  const body = new THREE.Group();
  body.name = 'Pickup on its springs';
  chassis.add(body);
  part('Pickup body', kit => {
    drawBody(kit);
    for (const [x, z] of [[-T.track, T.frontAxle], [-T.track, T.rearAxle], [T.track, T.rearAxle]]) kit.within(x, T.wheel, z, null, () => { drawTyre(kit); drawRim(kit, Math.sign(x)); });
  }, body);
  const bonnet = part('Pickup bonnet', drawBonnet, body);
  bonnet.position.set(0, T.hinge.y, T.hinge.z);
  // The stay that holds the bonnet up, seen only while it is open.
  const stay = part('Bonnet stay', kit => kit.tube('hard', [.42, 1.14, 2.5], [.42, 1.9, 1.86], .008, P.iron, 4), body);
  const cover = part('Grey pickup cover', drawCover, body);
  const blanket = part("Rell's red blanket", drawBlanket, body);
  // The wheel that goes flat stands on the ground, apart from the body.
  const wheel = new THREE.Group();
  wheel.name = 'Front wheel, driver\'s side';
  wheel.position.set(T.track, 0, T.frontAxle);
  chassis.add(wheel);
  const tyre = part('Front tyre', kit => kit.within(0, T.wheel, 0, null, () => drawTyre(kit)), wheel);
  const rim = part('Front wheel', kit => kit.within(0, T.wheel, 0, null, () => drawRim(kit, 1)), wheel);
  const folded = part('Cover dropped on the ground', drawDropped, chassis);
  folded.position.set(T.dropped.x, 0, T.dropped.z);
  folded.rotation.y = .35;
  // The dark under the truck, and the light its lamps throw on the road.
  const under = part('Under the pickup', kit => kit.keep('ground', kit.sheet('ground', span(16), span(3), (u, v) => {
    const a = u * Math.PI * 2; return [Math.cos(a) * 1.25 * v, .03, .12 + Math.sin(a) * 2.9 * v];
  }, (u, v) => [...MARK.shadow, .62 * (1 - smooth(.5, 1, v))]), null), chassis);
  const light = createKit().sheet('plain', span(20), span(5), (u, v) => {
    const a = u * Math.PI * 2; return [Math.cos(a) * 2.5 * v, POOL_LIFT, T.nose + 4.4 + Math.sin(a) * 4.6 * v];
  }, (u, v) => { const glow = (1 - smooth(.1, 1, v)) ** 1.5; return [1.15 * glow, .82 * glow, .42 * glow]; });
  // The light multiplies what it falls on (the ground times one and the light's colour), so that it reads the same whatever the
  // land's own light: a light that is only added is lost in the open land's hard light (docs/ART_LINE.md).
  const pool = new THREE.Mesh(light, new THREE.MeshBasicMaterial({vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6}));
  pool.name = 'Lamp light on the road';
  // After the land's own ground and the marks on it, which are drawn late and would cover a sheet that writes no depth.
  pool.renderOrder = 3;
  pool.visible = false;
  chassis.add(pool);
  triangles += light.index.count / 3;

  const aerial = new THREE.Group();
  aerial.name = 'Pickup aerial';
  aerial.position.set(T.aerial.x, T.aerial.foot, T.aerial.z);
  body.add(aerial);
  // The cloths that move keep their resting shapes.
  const coverMesh = cover.children[0], coverRest = coverMesh.geometry.attributes.position.array.slice(), coverCount = cover.extra;
  const blanketMesh = blanket.children[0], blanketPoints = blanketMesh.geometry.attributes.position;
  const poolPoints = light.attributes.position, poolRest = poolPoints.array.slice();
  let flat = false;
  function setFlat(on) {
    flat = !!on;
    tyre.scale.set(flat ? 1.14 : 1, flat ? .72 : 1, flat ? 1.05 : 1);
    rim.position.y = flat ? -T.wheel * .28 : 0;
    body.rotation.set(flat ? .024 : 0, 0, flat ? -.05 : 0);
  }
  function setBonnet(open) { bonnet.rotation.x = open ? T.bonnetOpen : 0; stay.visible = !!open; }
  function setLamps(on) { const lamp = materials.lamp(); if (lamp) lamp.emissiveIntensity = on ? 2.4 : 0; pool.visible = !!on; }
  setBonnet(false);
  finishThing(truck, materials, triangles, seconds => {
    if (cover.visible) {
      const points = coverMesh.geometry.attributes.position, array = points.array;
      for (let index = 0; index < coverCount; index++) {
        const x = coverRest[index * 3], y = coverRest[index * 3 + 1], z = coverRest[index * 3 + 2];
        if (x > -.95) continue;
        const loose = smooth(T.bedTop, .85, y);
        array[index * 3] = x - loose * (.03 + .035 * Math.sin(seconds * 2.3 + z * 3.1) + .02 * Math.sin(seconds * 3.7 + z * 7));
      }
      points.needsUpdate = true;
    }
    // The lamps' light lies on the road ahead, which is seldom level with the truck: each point of it is laid on the ground.
    const groundAt = truck.userData.groundAt;
    if (pool.visible && groundAt) {
      for (let index = 0; index < poolPoints.count; index++) poolPoints.setY(index, groundAt(poolRest[index * 3], poolRest[index * 3 + 2] + T.shift) + POOL_LIFT);
      poolPoints.needsUpdate = true;
    }
    if (blanket.visible) {
      let index = 0;
      for (let j = 0; j <= BLANKET.vs; j++) for (let i = 0; i <= BLANKET.us; i++) {
        const at = blanketPoint(i / BLANKET.us, j / BLANKET.vs, seconds);
        blanketPoints.setXYZ(index++, at[0], at[1], at[2]);
      }
      blanketPoints.needsUpdate = true;
      blanketMesh.geometry.computeVertexNormals();
    }
  });
  // `groundAt(x, z)`, when the look gives it, is how far the ground at a point of the truck's own metres stands above its spot.
  Object.assign(truck.userData, {body, cover, folded, bonnet, stay, aerial, blanket, pool, wheelPivots: [wheel], setFlat, setBonnet, setLamps, groundAt: null});
  Object.defineProperty(truck.userData, 'flat', {get: () => flat, enumerable: true});
  const dispose = truck.userData.dispose;
  truck.userData.dispose = () => { dispose(); pool.material.dispose(); };
  return truck;
}

// The pickup's key on its nail: a grey board fixed to the shed's wall, a bent nail, the key on a ring with a scrap of red cloth so
// that it is found. The rules hang the key 1.45 m up, a hand's width out from the forge shed's south wall (`key` in
// dace-goes-looking-places.js); the group's origin is the key, and the board's two fixings run back into the wall.
export const KEY_HEIGHT = 1.45;
export function buildPickupKey() {
  const P = palette(), materials = createMaterials(), key = new THREE.Group(), kit = createKit();
  key.name = 'Pickup key on its nail';
  kit.box('timber', .4, .13, .03, P.greyTimber, 0, .12, -.008, [0, 0, .04]);
  for (const x of [-.15, .15]) kit.box('timber', .05, .05, .4, P.darkTimber, x, .12 + x * .04, -.22);
  for (const x of [-.17, .17]) kit.cylinder('hard', .008, .012, P.rust, x, .12 + x * .04, .01, [Math.PI / 2, 0, 0], 5);
  kit.tube('hard', [0, .09, -.01], [0, .105, .05], .006, P.rust, 5);
  kit.keep('hard', kit.place(new THREE.TorusGeometry(.022, .0035, 4, 10), 0, .075, .04, [0, Math.PI / 2, 0]), P.galv);
  kit.cylinder('hard', .017, .005, P.brass, 0, .035, .04, [Math.PI / 2, 0, 0], 8);
  kit.box('hard', .012, .06, .004, P.brass, 0, 0, .04);
  kit.box('hard', .006, .012, .004, P.brass, .008, -.015, .04);
  kit.keep('cloth', kit.sheet('cloth', span(2), span(3), (u, v) => [.03 + u * .05 + .01 * Math.sin(v * 3), .07 - v * .15, .042 + .012 * Math.sin(v * 4 + u)], null), P.tag);
  finish(kit, key, key.name, materials);
  return finishThing(key, materials, kit.triangles);
}
