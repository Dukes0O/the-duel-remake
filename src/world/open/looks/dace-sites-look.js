// What Dace Goes Looking leaves on the land and the three places it can lead to (OPEN-LOOK-DACE, round 1), drawn in code:
// the three Walker stones, the old pickup's tracks, the Deep Sign, the Hangar and the Crow's Step. Design:
// docs/story/open-scablands.md section 16 (the sites table) and docs/story/threads/dace-goes-looking.md.
//
// Each thing is in metres from its own spot: x to the east, z to the south, y up from the ground at the spot. `heightAt(x, z)` is
// how far the ground at a point stands above the ground at the spot, so that feet, posts and marks follow the land. Each site
// keeps its spot clear: the car that finds the place stops there, and the thing itself stands a few metres to the north.
import * as THREE from 'three';
import {MARK, clamp01, corrugated, createKit, createMaterials, finish, finishThing, groundPatch, mulberry, noiseAlong, palette, rgb, shade, smooth, span, stone} from './dace-look-kit.js';

export const DACE_SITE_LAYOUT = Object.freeze({
  stones: Object.freeze({high: 1.9}),
  tracks: Object.freeze({from: -16, to: 28, gauge: 1.6}),
  'deep-sign': Object.freeze({well: Object.freeze({x: -3.7, z: -2.0}), strainer: Object.freeze({x: -2.15, z: -1.7}), roof: Object.freeze({x: -4.4, z: -6.0, long: 5.4, half: 2.5, ridge: 1.3}), sign: Object.freeze({x: .4, z: -3.2})}),
  hangar: Object.freeze({front: -6, bay: 4, arches: 7, half: 8.5, rise: 7.2, fallen: Object.freeze([0, 0, 0, .05, .4, .82, 1])}),
  'crows-step': Object.freeze({lookout: Object.freeze({x: .6, z: -7.2}), deck: 2.5, half: 1.2, cairn: Object.freeze({x: -4.6, z: -3.6})}),
});
const L = DACE_SITE_LAYOUT;

function thing(name, heightAt, draw, update) {
  const materials = createMaterials(), group = new THREE.Group(), kit = createKit(heightAt);
  group.name = name;
  const moving = draw(kit, group);
  finish(kit, group, name, materials);
  return finishThing(group, materials, kit.triangles, update ? seconds => update(seconds, moving) : null);
}

// ---- The Walker stones ----------------------------------------------------------------------------------------------------
// Three stones stacked by a walker's hand on a boulder that was there before, each smaller than the one under it, and across the
// top a flat dark slab wider than the stone it lies on, with a marker stone stood on end. The stack is as tall as a tall man
// (round 2): from a car's seat 40 m off its top third stands above the skyline, dark against the sky, and the slab makes an
// outline that no boulder has. Round it a few small stones, the scuffed ground, and footprints going on.
export function buildWalkerStones({heightAt = () => 0} = {}) {
  return thing('Three Walker stones', heightAt, kit => {
    const P = palette(), random = mulberry(0x57a1c);
    let y = -.04;
    for (const [size, colour, squash, dx, dz] of [[.7, P.stoneGrey, .7, 0, 0], [.52, P.stonePale, .74, .05, -.03], [.38, P.stoneGrey, .8, -.04, .03]]) {
      y += stone(kit, random, size, top => shade(colour, .72 + .5 * top), dx, y, dz, {squash, detail: 1, tilt: (random() - .5) * .12, rough: .7}) - size * .13;
    }
    // The slab across the top and the marker on it: dark stone, so that they stand out against the sky.
    y += stone(kit, random, .46, top => shade(P.stoneDark, .8 + .5 * top), 0, y - .03, 0, {squash: .34, detail: 1, wide: 1.25, deep: .85, turn: .5, rough: .6, tilt: .05}) - .05;
    stone(kit, random, .17, top => shade(P.stoneDark, .9 + .5 * top), .06, y - .04, 0, {squash: 1.2, detail: 0, wide: 1.05, deep: .55, turn: .9, rough: .5, tilt: .1});
    for (let index = 0; index < 7; index++) {
      const angle = index / 7 * 6.28 + random(), out = .75 + random() * .5, size = .07 + random() * .08;
      stone(kit, random, size, index % 3 ? P.stone : P.stoneGrey, Math.cos(angle) * out, kit.ground(Math.cos(angle) * out, Math.sin(angle) * out) - .02, Math.sin(angle) * out);
    }
    groundPatch(kit, 'ground', 0, 0, 1.5, 1.3, MARK.scuff, .5, {random});
    // The walker's own feet, left and right, going off to the north-east.
    for (let step = 0; step < 14; step++) {
      const along = .9 + step * .64, side = step % 2 ? 1 : -1, x = along * .5 + side * .13 + Math.sin(step * 1.3) * .05, z = -along * .87 + side * .07;
      groundPatch(kit, 'ground', x, z, .06, .135, MARK.rut, .55 - step * .02, {turn: .52, rings: 2, sides: 8, lift: .025});
    }
  });
}

// ---- The old pickup's tracks ------------------------------------------------------------------------------------------------
// One vehicle's line in the dust: two ruts a pickup's width apart, wandering a little, each with its tread pressed in and a low
// bank of pushed dust on either side. The marks come and go over metres, as tracks do on hard and soft ground. The line runs
// along the group's own z; the look turns the group to the way he drove.
export function buildPickupTracks({heightAt = () => 0} = {}) {
  return thing("The old pickup's tracks", heightAt, kit => {
    const T = L.tracks, soft = noiseAlong(0x7ac5), rows = Math.round((T.to - T.from) / .16);
    const wander = z => .55 * Math.sin(z * .085) + .22 * Math.sin(z * .23 + 1);
    const across = [-.3, -.17, -.085, 0, .085, .17, .3], heights = new Map();
    const ground = (x, z) => { const key = Math.round(z / .64); if (!heights.has(key + ':' + Math.sign(x))) heights.set(key + ':' + Math.sign(x), kit.ground(x, key * .64)); return heights.get(key + ':' + Math.sign(x)); };
    for (const side of [-1, 1]) {
      kit.keep('ground', kit.sheet('ground', span(across.length - 1), span(rows), (u, v) => {
        const z = T.from + v * (T.to - T.from), index = Math.round(u * (across.length - 1)), off = across[index], x = wander(z) + side * T.gauge / 2 + off;
        const a = ground(x, z), b = ground(x, z + .64), t = z / .64 - Math.round(z / .64);
        return [x, a + (b - a) * clamp01(t) + (Math.abs(off) > .1 && Math.abs(off) < .25 ? .045 : .022), z];
      }, (u, v) => {
        const z = T.from + v * (T.to - T.from), off = Math.abs(across[Math.round(u * (across.length - 1))]);
        const ends = smooth(0, .08, v) * smooth(1, .92, v), there = ends * (.1 + .9 * smooth(.3, .62, soft(z * .17 + side * .6)));
        if (off > .25) return [...MARK.berm, 0];
        if (off > .1) return [...MARK.berm, .5 * there];
        // The tread: bars pressed across the rut, a hand's width apart.
        const bar = Math.round(v * rows) % 2 ? 1 : .55;
        return [MARK.rut[0] * bar, MARK.rut[1] * bar, MARK.rut[2] * bar, .78 * there];
      }), null);
    }
  });
}

// ---- The Deep Sign ------------------------------------------------------------------------------------------------------------
// An old pump-house in a hollow, buried to its eaves: only the rusted roof shows. In front of it somebody has opened the well
// head again: a concrete collar, a riser pipe with a pump arm, and under its spout a strainer, an oil drum punched full of holes
// standing on a rusted grille over half a drum. The gravel round it is wet and dark, and green things grow there and nowhere else.
function drawBuriedRoof(kit) {
  const P = palette(), R = L['deep-sign'].roof, random = mulberry(0xdee9), bays = 6, bay = R.long / bays;
  kit.stand(R.x, R.z, 0, () => {
    const eave = -.12, slope = Math.hypot(R.half, R.ridge - eave), pitch = Math.atan2(R.ridge - eave, R.half);
    kit.batten('timber', [-R.long / 2 - .15, R.ridge, 0], [R.long / 2 + .15, R.ridge, 0], .09, .14, P.darkTimber);
    for (let rafter = 0; rafter <= bays; rafter++) for (const side of [-1, 1]) {
      const x = -R.long / 2 + rafter * bay;
      kit.batten('timber', [x, eave, side * R.half], [x, R.ridge - .02, side * .03], .07, .11, shade(P.greyTimber, .7 + random() * .4));
    }
    for (const side of [-1, 1]) for (const up of [.3, .68]) kit.batten('timber', [-R.long / 2, eave + (R.ridge - eave) * up - .02, side * R.half * (1 - up)], [R.long / 2, eave + (R.ridge - eave) * up - .02, side * R.half * (1 - up)], .05, .05, P.timber);
    // The sheets: most still on, some gone, one lifted by the wind.
    for (let index = 0; index < bays; index++) for (const side of [-1, 1]) {
      const gone = (index === 3 && side > 0) || (index === 4 && side < 0), lifted = index === 1 && side > 0;
      if (gone) continue;
      const x = -R.long / 2 + (index + .5) * bay;
      kit.within(x, eave + .07, side * R.half, [0, side > 0 ? Math.PI : 0, 0], () => kit.within(0, 0, 0, [Math.PI / 2 - pitch - (lifted ? .22 : 0), 0, (random() - .5) * .05], () =>
        kit.keep('tin', corrugated(kit, bay + .09, slope + .12, P.sheets[(index * 2 + (side > 0 ? 1 : 0)) % P.sheets.length], {rust: .55 + random() * .4, sag: .04, curl: lifted ? .12 : 0}), null)));
    }
    // The gable that faces the well: grey boards, two gone, and the dark of the pump-house behind them.
    for (let board = 0; board < 13; board++) {
      const z = -R.half + .2 + board * (R.half * 2 - .4) / 12, top = eave + (R.ridge - eave) * (1 - Math.abs(z) / R.half) - .04;
      if (board === 5 || board === 6 || top < .12) continue;
      kit.box('timber', .025, top + .2, .36, shade(P.greyTimber, .65 + random() * .5), R.long / 2 + .02, (top - .2) / 2, z, [0, 0, (random() - .5) * .03]);
    }
    kit.box('hard', .02, 1.0, .8, P.black, R.long / 2 - .05, .45, -.25);
    // The drift that has buried it: lumps of the land's own earth against the far end and the back.
    for (const [x, z, size, high] of [[-R.long / 2 - .3, .2, 2.3, .5], [-R.long / 2 + .6, -R.half - .2, 2.2, .42], [.3, -R.half - .5, 2.0, .36], [1.9, -R.half - .1, 1.6, .3], [-R.long / 2 - .1, R.half * .8, 1.7, .34], [-1.2, R.half + .5, 1.3, .2]])
      stone(kit, random, size, top => shade(P.dust, .7 + .45 * top), x, -.35, z, {squash: high, detail: 2, wide: 1.4, deep: 1.15, rough: .1});
  });
}
function drawWellHead(kit) {
  const P = palette(), D = L['deep-sign'], random = mulberry(0x3e11);
  kit.stand(D.well.x, D.well.z, .2, () => {
    // The collar: a ring of concrete, its inside dark all the way down.
    kit.cylinder('plain', .68, .34, P.concrete, 0, .15, 0, null, 18, .64, true);
    const inner = new THREE.CylinderGeometry(.5, .5, .5, 18, 1, true);
    inner.scale(-1, 1, 1);
    kit.keep('plain', kit.place(inner, 0, .07, 0), shade(P.concrete, .35));
    kit.keep('plain', kit.place(new THREE.RingGeometry(.5, .64, 18), 0, .32, 0, [-Math.PI / 2, 0, 0]), shade(P.concrete, 1.1));
    kit.keep('plain', kit.place(new THREE.CircleGeometry(.5, 18), 0, -.12, 0, [-Math.PI / 2, 0, 0]), P.black);
    // The riser, the pump head and its arm, and the spout over the strainer.
    kit.cylinder('hard', .05, 1.5, P.rust, 0, .55, 0, null, 8);
    kit.cylinder('hard', .085, .3, P.rustDark, 0, 1.36, 0, null, 10);
    kit.batten('hard', [0, 1.46, 0], [-.85, 1.72, .1], .05, .035, P.rust);
    kit.cylinder('timber', .03, .14, P.greyTimber, -.85, 1.72, .1, [0, 0, 1.3], 6);
    kit.tube('hard', [0, 1.3, 0], [.62, 1.26, .1], .04, P.rust, 8);
    kit.tube('hard', [.62, 1.27, .1], [.7, 1.12, .12], .04, P.rustDark, 8);
    kit.batten('timber', [.25, 0, -.32], [.08, 1.2, -.04], .05, .05, P.greyTimber);
    kit.batten('timber', [.2, 0, .36], [.08, 1.15, .04], .05, .05, P.greyTimber);
  });
  kit.stand(D.strainer.x, D.strainer.z, .35, () => {
    // Two blocks, the grille across them, half a drum under it to catch what comes through.
    for (const z of [-.42, .42]) kit.box('plain', .9, .3, .2, shade(P.concrete, .8 + random() * .3), 0, .15, z, [0, (random() - .5) * .1, 0]);
    for (const z of [-.44, .44]) kit.box('hard', 1.0, .04, .05, P.rust, 0, .32, z);
    for (const x of [-.5, .5]) kit.box('hard', .05, .04, .93, P.rust, x, .32, 0);
    for (let bar = 0; bar < 11; bar++) kit.cylinder('hard', .011, .9, bar % 4 ? P.rust : P.rustDark, -.42 + bar * .084, .325, 0, [Math.PI / 2, 0, 0], 5);
    const trough = new THREE.CylinderGeometry(.27, .27, .78, 14, 1, true, Math.PI / 2, Math.PI);
    kit.keep('tin', kit.place(trough, 0, .28, 0, [0, 0, Math.PI / 2]), P.drum.clone().lerp(P.rust, .5));
    kit.keep('wet', kit.place(new THREE.PlaneGeometry(.74, .46), 0, .1, 0, [-Math.PI / 2, 0, 0]), [...MARK.water, .92]);
    // The strainer: a drum with its top cut off and its side and bottom punched.
    const drum = new THREE.CylinderGeometry(.29, .29, .56, 20, 1, true), uv = drum.attributes.uv;
    for (let index = 0; index < uv.count; index++) uv.setXY(index, uv.getX(index) * 9, uv.getY(index) * 3);
    kit.keep('sieve', kit.place(drum, 0, .63, 0), P.drum.clone().lerp(P.rust, .65));
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.29, .014, 5, 20), 0, .91, 0, [Math.PI / 2, 0, 0]), P.rustDark);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.292, .012, 5, 20), 0, .62, 0, [Math.PI / 2, 0, 0]), P.rust);
    kit.keep('hard', kit.place(new THREE.TorusGeometry(.29, .014, 5, 20), 0, .355, 0, [Math.PI / 2, 0, 0]), P.rustDark);
    // A wet rag over its rim, and what the strainer has caught, dumped beside it.
    kit.keep('cloth', kit.sheet('cloth', span(4), span(5), (u, v) => [-.1 + u * .26, .925 - .32 * smooth(.25, 1, v) + .01 * Math.sin(u * 7), .3 * Math.cos((v - .25) * 1.4) + .012 * Math.sin(v * 9 + u * 4)], null), shade(P.canvasDark, .7));
    for (let index = 0; index < 9; index++) stone(kit, random, .05 + random() * .06, P.stoneDark, .75 + random() * .5, 0, -.3 + random() * .7, {squash: .7});
  });
}
function drawWetGround(kit) {
  const P = palette(), D = L['deep-sign'], random = mulberry(0x9a7e), mid = {x: (D.well.x + D.strainer.x) / 2, z: (D.well.z + D.strainer.z) / 2};
  groundPatch(kit, 'ground', mid.x, mid.z + .2, 4.4, 3.5, MARK.damp, .62, {random, rings: 5, hard: .3});
  groundPatch(kit, 'wet', mid.x + .2, mid.z + .1, 2.7, 2.0, MARK.wet, .86, {random, rings: 5, turn: .3});
  // A runnel off to the low side.
  groundPatch(kit, 'wet', D.strainer.x + 1.7, D.strainer.z + 1.5, 2.1, .5, MARK.wet, .8, {random, turn: -.7});
  // Gravel, darker where it is wet.
  for (let index = 0; index < 46; index++) {
    const angle = random() * 6.28, out = Math.sqrt(random()) * 3.4, x = mid.x + Math.cos(angle) * out * 1.2, z = mid.z + .2 + Math.sin(angle) * out * .9;
    if (Math.hypot(x - D.well.x, z - D.well.z) < .75 || Math.hypot(x - D.strainer.x, z - D.strainer.z) < .6) continue;
    stone(kit, random, .035 + random() * .06, out < 2.2 ? P.stoneDark : P.stone, x, kit.ground(x, z) - .02, z, {squash: .6});
  }
  // Green at the edge of the wet: tufts of blades, the only green for a long way.
  for (let tuft = 0; tuft < 16; tuft++) {
    const angle = tuft / 16 * 6.28 + random() * .3, out = 2.6 + random() * 1.5, x = mid.x + Math.cos(angle) * out * 1.15, z = mid.z + .2 + Math.sin(angle) * out * .85, y = kit.ground(x, z);
    if (Math.hypot(x, z) < 2) continue;
    for (let blade = 0; blade < 7; blade++) {
      const lean = random() * 6.28, high = .22 + random() * .38, wide = .02 + random() * .015, bend = .08 + random() * .16, bx = x + (random() - .5) * .16, bz = z + (random() - .5) * .16;
      const cos = Math.cos(lean), sin = Math.sin(lean), green = (random() < .25 ? P.greenDry : P.green).clone().multiplyScalar(.75 + random() * .5), tip = shade(green, 1.5);
      kit.keep('cloth', kit.sheet('cloth', [0, 1], [0, .5, 1], (u, v) => [bx + (u - .5) * wide * (1 - v * .9) * sin + cos * bend * v * v, y + high * v, bz - (u - .5) * wide * (1 - v * .9) * cos + sin * bend * v * v],
        (u, v) => rgb(green.clone().lerp(tip, v))), null);
    }
  }
}
// The sign that gives the place its name: a tin plate on a post, three lines of water daubed on it in pale paint.
function drawDeepSign(kit) {
  const P = palette(), S = L['deep-sign'].sign;
  kit.stand(S.x, S.z, -.5, () => {
    kit.batten('timber', [0, -.3, 0], [.05, 1.72, 0], .09, .09, P.greyTimber);
    kit.within(.03, 1.3, .052, [0, 0, -.06], () => {
      kit.box('hard', .66, .46, .012, P.sheets[2], 0, 0, 0);
      for (const y of [-.12, 0, .12]) kit.rope('cloth', Array.from({length: 9}, (_, index) => [-.26 + index * .065, y + .035 * Math.sin(index * 1.57), .012]), .013, shade(P.stonePale, 1.3), 4, 16);
      for (const [x, y] of [[-.29, .19], [.29, .19], [0, -.19]]) kit.cylinder('hard', .012, .02, P.rust, x, y, .01, [Math.PI / 2, 0, 0], 6);
    });
  });
}
export function buildDeepSign({heightAt = () => 0} = {}) {
  return thing('The Deep Sign', heightAt, kit => { drawWetGround(kit); drawBuriedRoof(kit); drawWellHead(kit); drawDeepSign(kit); });
}

// ---- The Hangar ---------------------------------------------------------------------------------------------------------------
// A hangar with a curved roof, its open end towards the spot. Seven arched ribs of lattice steel, four metres apart: the front
// three stand, the fourth leans, and from there the roof comes down, until the last rib lies on the ground with its sheets on top
// of it. Many sheets are gone, so the frame shows. Inside, the tail of an aeroplane stands out from under the fallen part.
export function hangarRib(index, angle, heightAt = () => 0) {
  const H = L.hangar, fallen = H.fallen[index], z = H.front - index * H.bay, stand = (1 - fallen) ** 1.15;
  const x = Math.cos(angle) * H.half * (1 + .1 * fallen), lift = Math.sin(angle) ** .85;
  const foot = heightAt(Math.sign(x || 1) * H.half, z), other = heightAt(-Math.sign(x || 1) * H.half, z), base = foot + (other - foot) * (1 - Math.abs(Math.cos(angle))) / 2;
  return [x, base + .12 + H.rise * lift * stand + .28 * fallen * lift, z - H.rise * .92 * lift * fallen ** .8 + .5 * fallen * Math.sin(angle * 3)];
}
function drawHangar(kit) {
  const P = palette(), H = L.hangar, random = mulberry(0x4a96a), steps = 18, depth = .55;
  const rib = (index, t, inset = 0) => {
    const at = hangarRib(index, t * Math.PI, kit.ground);
    if (!inset) return at;
    // The inner chord stands in from the outer one, towards the middle of the floor.
    const middle = [0, at[1] - H.rise * (1 - H.fallen[index]) * Math.sin(t * Math.PI), at[2]], away = Math.hypot(at[0] - middle[0], at[1] - middle[1]) || 1;
    return [at[0] - (at[0] - middle[0]) / away * inset, Math.max(at[1] - (at[1] - middle[1]) / away * inset, at[1] - inset), at[2]];
  };
  for (let index = 0; index < H.arches; index++) {
    const steel = index % 2 ? P.rust : P.rustDark;
    for (let step = 0; step < steps; step++) {
      const a = step / steps, b = (step + 1) / steps;
      kit.batten('hard', rib(index, a), rib(index, b), .09, .09, steel);
      kit.batten('hard', rib(index, a, depth), rib(index, b, depth), .07, .07, steel);
      kit.tube('hard', step % 2 ? rib(index, a) : rib(index, a, depth), step % 2 ? rib(index, b, depth) : rib(index, b), .022, P.rust, 4);
    }
    for (const t of [0, 1]) { const foot = rib(index, t); kit.box('plain', .9, .3, .9, P.concrete, foot[0], foot[1] - .1, foot[2]); }
  }
  // The purlins: lengths of angle from rib to rib. Some have let go at one end.
  const purlins = [.06, .17, .28, .39, .5, .61, .72, .83, .94];
  for (let index = 0; index < H.arches - 1; index++) for (const t of purlins) {
    if (random() < .12 + .3 * H.fallen[index + 1]) continue;
    kit.batten('hard', rib(index, t, .05), rib(index + 1, t, .05), .06, .06, P.rustDark);
  }
  // The sheets, each curved to the roof between two purlins and half a bay wide. Fewer at the top and where the roof came down.
  // Sheets go missing in patches, as a storm takes them, and not one here and one there.
  const bands = 10, patchA = noiseAlong(0x4a1), patchB = noiseAlong(0x4a2);
  for (let index = 0; index < H.arches - 1; index++) for (let half = 0; half < 2; half++) for (let band = 0; band < bands; band++) {
    const top = Math.sin((band + .5) / bands * Math.PI), fallen = (H.fallen[index] + H.fallen[index + 1]) / 2;
    const column = index * 2 + half, patch = patchA(column * .42 + band * .17) * .6 + patchB(band * .46 - column * .23 + 9) * .4;
    if (patch > .72 - .17 * top * top - .12 * fallen + (index === 0 ? .05 : 0) || random() < .04) continue;
    const from = band / bands + .004, to = (band + 1) / bands + .012, f0 = half / 2 - .02, f1 = (half + 1) / 2 + .02, colour = P.sheets[Math.floor(random() * P.sheets.length)], rust = .15 + random() * .6, slip = (random() - .5) * .05;
    const ribs = 13, us = Array.from({length: ribs * 2 + 1}, (_, i) => i / (ribs * 2));
    kit.keep('tin', kit.sheet('tin', us, span(3), (u, v) => {
      const t = clamp01(from + (to - from) * v + slip), f = f0 + (f1 - f0) * u, a = rib(index, t), b = rib(index + 1, t), wave = (Math.round(u * ribs * 2) % 2 ? .035 : 0) + .06;
      const out = [Math.cos(t * Math.PI), Math.sin(t * Math.PI) * (1 - fallen) + fallen];
      return [a[0] + (b[0] - a[0]) * f + out[0] * wave, a[1] + (b[1] - a[1]) * f + out[1] * wave, a[2] + (b[2] - a[2]) * f];
    }, (u, v) => {
      const streak = .5 + .5 * Math.sin(u * 37.1 + rust * 11) * Math.sin(u * 13.3 + 2), edge = 1 - Math.sin(v * Math.PI);
      return rgb(colour.clone().lerp(P.rust, clamp01(rust * .32 + edge * .25 * rust + streak * .24 * rust)).lerp(P.rustDark, edge * .12));
    }), null);
  }
  // One leaf of the great door, off its track and leaning on the first rib.
  const post = rib(0, .9);
  kit.within(post[0] + 1.3, kit.ground(post[0] + 1.3, H.front + 1.2), H.front + 1.2, [-.16, .12, 0], () => {
    kit.keep('tin', corrugated(kit, 3.6, 5.2, P.sheets[3], {rust: .7, bow: .12, pitch: .15, depth: .04}), null);
    for (const y of [.1, 2.6, 5.1]) kit.box('hard', 3.7, .1, .08, P.rustDark, 0, y, -.06);
    for (const x of [-1.8, 1.8]) kit.box('hard', .1, 5.2, .08, P.rustDark, x, 2.6, -.06);
  });
  // The aeroplane: the back of its body, its fin and its tailplane, tail towards the open end, the rest under the fallen roof.
  kit.within(-2.2, kit.ground(-2.2, H.front - 9) + 1.9, H.front - 9, [-.07, .2, .05], () => {
    kit.keep('paint', kit.place(new THREE.CylinderGeometry(.2, 1.02, 7.6, 14, 3), 0, 0, -.3, [Math.PI / 2, 0, 0]), P.wing);
    const fin = new THREE.Shape();
    for (const [z, y, first] of [[.5, .55, true], [3.3, .2], [3.95, 3.0], [3.05, 3.05], [1.6, 1.1]]) first ? fin.moveTo(z, y) : fin.lineTo(z, y);
    const finShape = new THREE.ExtrudeGeometry(fin, {depth: .1, bevelEnabled: false});
    finShape.translate(0, 0, -.05);
    finShape.rotateY(-Math.PI / 2);
    kit.keep('paint', finShape, P.wing);
    kit.box('paint', .12, .42, .95, P.wingStripe, 0, 2.5, 3.32, [.22, 0, 0]);
    kit.box('paint', .12, .16, .8, P.wingStripe, 0, 2.05, 3.1, [.22, 0, 0]);
    kit.keep('paint', kit.place(new THREE.BoxGeometry(5.4, .09, 1.3), 0, .62, 2.85, [0, 0, .05]), P.wing);
    kit.batten('hard', [0, -.1, 2.7], [.1, -1.75, 3.05], .08, .08, P.rustDark);
    kit.cylinder('plain', .2, .12, P.rubber, .1, -1.72, 3.05, [0, 0, Math.PI / 2], 10);
  });
  // What lies about on the floor: sheets that came down, two drums, a length of the frame.
  for (let index = 0; index < 9; index++) {
    const x = (random() - .5) * 13, z = H.front - 3 - random() * 20;
    kit.within(x, kit.ground(x, z) + .05, z, [-Math.PI / 2 + (random() - .5) * .12, random() * 6.28, 0], () => kit.keep('tin', corrugated(kit, 1.9 + random() * .4, .95, P.sheets[index % P.sheets.length], {rust: .8, bow: .05, pitch: .15, depth: .035}), null));
  }
  for (const [x, z, lying] of [[-5.6, H.front - 2.5, false], [-5.0, H.front - 2.1, true], [5.2, H.front - 6.4, false]])
    kit.cylinder('hard', .29, .88, lying ? P.rust : P.drum.clone().lerp(P.rust, .4), x, kit.ground(x, z) + (lying ? .29 : .44), z, lying ? [Math.PI / 2, .6, 0] : null, 14);
  kit.batten('hard', [3.5, kit.ground(3.5, H.front - 20) + .1, H.front - 20], [7.5, kit.ground(7.5, H.front - 22.5) + .08, H.front - 22.5], .09, .09, P.rust);
  // The floor: a slab of old concrete, broken at its edges, cracked across.
  const length = H.bay * (H.arches - 1) + 5, slab = noiseAlong(0x51ab);
  kit.keep('ground', kit.sheet('ground', span(12), span(22), (u, v) => {
    const x = (u - .5) * (H.half * 2 - 1.5), z = H.front + 3 - v * length;
    return [x, kit.ground(x, z) + .04, z];
  }, (u, v) => {
    const edge = smooth(0, .12, u) * smooth(1, .88, u) * smooth(0, .08, v) * smooth(1, .9, v), worn = .45 + .55 * smooth(.2, .7, slab(u * 7 + v * 13) * .6 + slab(v * 9 - u * 5 + 20) * .4);
    return [...MARK.slab, .7 * edge * worn];
  }), null);
  for (const [x0, z0, x1, z1] of [[-6, -3, 5, -6.5], [1, -10, -5.5, -14], [6, -17, -2, -19.5], [-1, -6, 0, -11]]) {
    const points = span(8).map(t => { const x = x0 + (x1 - x0) * t + Math.sin(t * 9) * .35, z = H.front + z0 + (z1 - z0) * t + Math.cos(t * 7) * .3; return [x, z]; });
    for (let index = 0; index < 8; index++) {
      const [ax, az] = points[index], [bx, bz] = points[index + 1], mx = (ax + bx) / 2, mz = (az + bz) / 2;
      groundPatch(kit, 'ground', mx, mz, Math.hypot(bx - ax, bz - az) * .62, .05, MARK.crack, .8, {turn: -Math.atan2(bz - az, bx - ax), rings: 2, sides: 6, lift: .055});
    }
  }
}
export function buildHangar({heightAt = () => 0} = {}) { return thing('The Hangar', heightAt, drawHangar); }

// ---- The Crow's Step ----------------------------------------------------------------------------------------------------------
// A flat-topped rise with a cairn, and on its rocks a low timber lookout that somebody built and left: four posts, a deck of
// boards a person can stand on, a rail on three sides, a sheet of tin against the wind, and a ladder up the open side.
function drawCrow(kit, x, y, z, heading) {
  const P = palette();
  kit.within(x, y, z, [0, heading, 0], () => {
    const body = new THREE.SphereGeometry(1, 8, 6);
    body.scale(.075, .07, .15);
    kit.keep('plain', kit.place(body, 0, .12, 0, [-.35, 0, 0]), P.crow);
    kit.keep('plain', kit.place(new THREE.SphereGeometry(.05, 7, 5), 0, .21, .13), P.crow);
    kit.keep('plain', kit.place(new THREE.ConeGeometry(.018, .09, 5), 0, .2, .2, [Math.PI / 2 + .25, 0, 0]), shade(P.crow, 1.6));
    kit.box('plain', .09, .012, .19, P.crow, 0, .075, -.2, [.5, 0, 0]);
    for (const side of [-1, 1]) kit.tube('plain', [side * .025, .07, 0], [side * .03, 0, .01], .006, shade(P.crow, 1.6), 4);
  });
}
function drawLookout(kit) {
  const P = palette(), C = L['crows-step'], random = mulberry(0xc705), K = C.lookout, half = C.half;
  // The rocks it stands on and among.
  for (const [x, z, size, squash] of [[-1.5, -.7, 1.5, .6], [1.4, -1.1, 1.25, .7], [.1, -1.9, 1.7, .52], [-2.4, .9, .95, .6], [2.5, .5, 1.05, .55], [-.2, 1.5, .6, .5], [1.5, 2.4, .5, .6], [-3.1, -1.6, .75, .6], [3.2, -2.0, .85, .5]])
    stone(kit, random, size, top => shade(P.basalt, .7 + .6 * top), K.x + x, kit.ground(K.x + x, K.z + z) - size * .2, K.z + z, {squash, detail: 2, wide: 1.1, rough: .62});
  const feet = [[-half, -half], [half, -half], [half, half], [-half, half]].map(([x, z]) => [K.x + x, kit.ground(K.x + x, K.z + z), K.z + z]);
  const deck = Math.max(...feet.map(foot => foot[1])) + C.deck;
  kit.within(K.x, 0, K.z, null, () => {
    const posts = feet.map(([x, y, z]) => [x - K.x, y, z - K.z]);
    for (const [x, y, z] of posts) kit.batten('timber', [x * 1.08, y - .3, z * 1.08], [x, deck + (z < 0 || x < 0 ? 1.08 : .1), z], .14, .14, shade(P.greyTimber, .7 + random() * .4), .05);
    // Joists and the deck boards: grey, uneven, one split.
    for (const z of [-half, 0, half]) kit.batten('timber', [-half - .15, deck - .08, z], [half + .15, deck - .08, z], .07, .14, P.timber);
    for (let board = 0; board < 12; board++) {
      const x = -half - .05 + board * (half * 2 + .1) / 11, short = board === 4 ? .5 : 0;
      kit.box('timber', .19, .035, half * 2 + .3 - short, shade(board % 4 === 1 ? P.paleTimber : P.greyTimber, .7 + random() * .45), x, deck + .018, short / 2 + (random() - .5) * .06, [0, (random() - .5) * .03, 0]);
    }
    // Braces crossed on three sides.
    for (const [a, b] of [[0, 1], [1, 2], [3, 0]]) {
      const [ax, ay, az] = posts[a], [bx, by, bz] = posts[b];
      kit.batten('timber', [ax, ay + .25, az], [bx, deck - .2, bz], .035, .11, P.timber);
      kit.batten('timber', [bx, by + .25, bz], [ax, deck - .2, az], .035, .11, shade(P.timber, .85));
    }
    // The rail: on the back and the two sides. On the east side one length has come away at one end.
    for (const y of [.55, 1.02]) {
      kit.batten('timber', [-half - .1, deck + y, -half], [half + .1, deck + y, -half], .035, .09, P.greyTimber);
      kit.batten('timber', [-half, deck + y, -half - .1], [-half, deck + y, half + .1], .035, .09, P.greyTimber);
      kit.batten('timber', [half, deck + y, -half - .1], [half, deck + (y > 1 ? .2 : y), half + (y > 1 ? -.3 : .1)], .035, .09, P.paleTimber);
    }
    // Tin against the wind on the back rail, and a rag on a pole for whoever looks this way.
    kit.within(-.2, deck + .1, -half - .05, [0, Math.PI, .03], () => kit.keep('tin', corrugated(kit, 1.9, .95, P.sheets[1], {rust: .7, bow: .03}), null));
    kit.batten('timber', [-half, deck + 1.0, -half], [-half - .06, deck + 2.5, -half - .04], .045, .045, P.paleTimber);
    kit.keep('cloth', kit.sheet('cloth', span(6), span(3), (u, v) => [-half - .06 + u * .75, deck + 2.45 - v * .4 - .16 * u * u, -half - .04 + .26 * u + .07 * Math.sin(u * 6 + v)], (u, v) => rgb(shade(P.blanket, .7 + .3 * Math.sin(u * 5 + v * 3)))), null);
    // The ladder up the open (south) side, its foot on the ground a metre out.
    const out = half + 1.15, foot = kit.ground(K.x, K.z + out);
    for (const side of [-1, 1]) kit.batten('timber', [.25 + side * .23, foot - .1, out], [.25 + side * .23, deck + .7, half + .06], .05, .08, P.paleTimber);
    for (let rung = 1; rung <= 8; rung++) {
      const t = rung / 9.6, y = foot - .1 + (deck + .7 - foot + .1) * t, z = out + (half + .06 - out) * t;
      kit.batten('timber', [-.02, y, z], [.52, y + (rung === 5 ? .06 : 0), z], .035, .05, shade(P.greyTimber, .8 + random() * .3));
    }
    // What was left up there: a tin, a folded blanket. And the crows.
    kit.cylinder('hard', .05, .12, P.rustPale, -.7, deck + .095, -.6, null, 8);
    kit.box('cloth', .5, .09, .34, P.canvasDark, .55, deck + .08, -.75, [0, .3, 0]);
    drawCrow(kit, -half + .5, deck + 1.065, -half, 2.6);
    drawCrow(kit, .7, deck + 1.065, -half, 3.5);
  });
}
function drawCairn(kit) {
  const P = palette(), C = L['crows-step'].cairn, random = mulberry(0xca19);
  let y = kit.ground(C.x, C.z) - .05;
  for (const [size, squash] of [[.62, .5], [.5, .5], [.4, .52], [.31, .55], [.22, .62], [.14, .75]])
    y += stone(kit, random, size, top => shade(P.stoneGrey, .6 + .55 * top), C.x + (random() - .5) * .08, y, C.z + (random() - .5) * .08, {squash, detail: 1, tilt: (random() - .5) * .14, rough: .66, wide: 1 + (random() - .5) * .3}) - size * .12;
  for (let index = 0; index < 8; index++) {
    const angle = random() * 6.28, out = .7 + random() * .7, x = C.x + Math.cos(angle) * out, z = C.z + Math.sin(angle) * out;
    stone(kit, random, .1 + random() * .14, P.stone, x, kit.ground(x, z) - .03, z);
  }
  drawCrow(kit, C.x, y + .02, C.z, 1.1);
  // Trodden ground from the spot to the ladder.
  const K = L['crows-step'].lookout;
  for (let step = 0; step < 6; step++) { const t = step / 5, x = K.x * t + .2, z = (K.z + L['crows-step'].half + 1.6) * t; groundPatch(kit, 'ground', x, z, .9, .7, MARK.scuff, .42, {random, rings: 3, sides: 10}); }
}
export function buildCrowsStep({heightAt = () => 0} = {}) { return thing("The Crow's Step", heightAt, kit => { drawLookout(kit); drawCairn(kit); }); }


