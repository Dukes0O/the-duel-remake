// The drawing kit for Dace Goes Looking's things (OPEN-LOOK-DACE, round 1). Everything is drawn in code: pieces are gathered by
// kind, each with its own colour in its vertices, and each kind is merged into one mesh. The kinds wear `createScrapWear`, and the
// pickup's paint wears `createPaintWear` below (sun-chalked tops, primer showing through, rust round the arches and along the sills).
// Nothing here changes race state, reads a save or reads the clock of the wall.
import * as THREE from 'three';
import {mergeGeometries, mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createScrapWear, scrapNoise} from '../../scrap-look.js';

export const KINDS = Object.freeze({
  paint: {name: 'paint'}, hard: {name: 'iron'}, timber: {name: 'timber'}, tin: {name: 'tin'}, cloth: {name: 'cloth'}, plain: {name: 'stone and rubber'},
  sieve: {name: 'punched drum', uv: true}, glass: {name: 'glass', alpha: true}, ground: {name: 'marks on the ground', alpha: true},
  wet: {name: 'wet gravel', alpha: true}, lamp: {name: 'lamps'},
});

export const mulberry = seed => () => {
  seed = seed + 0x6d2b79f5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
export const clamp01 = value => Math.max(0, Math.min(1, value));
export const smooth = (from, to, value) => { const t = clamp01((value - from) / (to - from)); return t * t * (3 - 2 * t); };
export const span = count => Array.from({length: count + 1}, (_, index) => index / count);
export const tone = (r, g, b, k = .84) => new THREE.Color().setRGB(r * k, g * k, b * k);
export const shade = (colour, by) => colour.clone().multiplyScalar(by);
export const rgb = colour => [colour.r, colour.g, colour.b];
// Smooth noise along a line, the same on every run: for marks that come and go over metres.
export function noiseAlong(seed) {
  const random = mulberry(seed), values = Array.from({length: 64}, random);
  return at => { const i = Math.floor(at), t = at - i, s = t * t * (3 - 2 * t); return values[(i % 64 + 64) % 64] * (1 - s) + values[((i + 1) % 64 + 64) % 64] * s; };
}

// The colours, a third or so of what they read as on the screen: the open land is lit hard (docs/ART_LINE.md).
let PALETTE = null;
export function palette() {
  if (PALETTE) return PALETTE;
  const tin = tone(.1, .098, .092), rust = tone(.058, .03, .017);
  PALETTE = {
    tin, rust, rustDark: tone(.034, .02, .014), rustPale: tone(.09, .05, .028), dust: tone(.085, .066, .042), iron: tone(.032, .031, .03, 1), black: tone(.012, .012, .012, 1), galv: tone(.095, .095, .092),
    chrome: tone(.13, .13, .125), timber: tone(.05, .044, .037), paleTimber: tone(.085, .078, .066), darkTimber: tone(.03, .026, .022), greyTimber: tone(.06, .057, .052),
    // Moss's pickup: a green that the sun has taken most of the way to grey, one door from another truck, wheels once cream.
    truck: tone(.062, .092, .078), truckDeep: tone(.04, .07, .058), door: tone(.125, .11, .082), wheel: tone(.12, .11, .09), seat: tone(.05, .032, .022),
    rubber: tone(.024, .023, .023, 1), rubberDusty: tone(.05, .044, .036), canvas: tone(.075, .074, .064), canvasDark: tone(.045, .045, .04), canvasPale: tone(.11, .105, .09), rope: tone(.14, .12, .075),
    blanket: tone(.2, .022, .018), blanketBand: tone(.035, .012, .011), blanketPale: tone(.2, .15, .1), tag: tone(.2, .03, .022), brass: tone(.16, .12, .05),
    stonePale: tone(.095, .088, .076), stoneGrey: tone(.06, .056, .05), stone: tone(.045, .036, .028), stoneDark: tone(.02, .017, .015), basalt: tone(.014, .013, .012),
    concrete: tone(.036, .035, .032), sheets: [tone(.085, .083, .078), tone(.06, .042, .03), tone(.062, .068, .07), tone(.1, .095, .086), tone(.045, .034, .027), tone(.08, .066, .05)],
    drum: tone(.05, .075, .09), wing: tone(.11, .108, .1), wingStripe: tone(.12, .025, .02), green: tone(.016, .05, .012), greenDry: tone(.045, .06, .02), crow: tone(.014, .014, .017, 1),
  };
  return PALETTE;
}
// Glass and ground marks carry how solid they are with their colour: red, green, blue and alpha.
export const GLASS = Object.freeze({window: [.2, .22, .21, .42], dusty: [.3, .27, .22, .62], red: [.3, .03, .02, .9], amber: [.36, .17, .03, .9]});
export const MARK = Object.freeze({rut: [.05, .04, .03], berm: [.2, .16, .115], shadow: [.012, .011, .01], scuff: [.075, .058, .044], oil: [.012, .011, .01],
  wet: [.03, .026, .022], damp: [.05, .042, .034], water: [.014, .017, .017], slab: [.12, .115, .1], crack: [.035, .03, .026]});

export function createKit(heightAt = () => 0) {
  const lists = Object.fromEntries(Object.keys(KINDS).map(kind => [kind, []]));
  const base = new THREE.Matrix4(), local = new THREE.Matrix4(), saved = [], quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1), spot = new THREE.Vector3(), from = new THREE.Vector3(), to = new THREE.Vector3(), way = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  let triangles = 0;
  function keep(kind, geometry, colour) {
    const size = KINDS[kind].alpha ? 4 : 3;
    if (!KINDS[kind].uv && geometry.hasAttribute('uv')) geometry.deleteAttribute('uv');
    if (geometry.hasAttribute('uv1')) geometry.deleteAttribute('uv1');
    if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, index) => index));
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals();
    const count = geometry.attributes.position.count;
    if (!geometry.hasAttribute('color')) {
      const colours = new Float32Array(count * size), values = colour.isColor ? [colour.r, colour.g, colour.b, 1] : colour;
      for (let index = 0; index < count; index++) for (let part = 0; part < size; part++) colours[index * size + part] = values[part] ?? 1;
      geometry.setAttribute('color', new THREE.BufferAttribute(colours, size));
    } else if (geometry.attributes.color.itemSize !== size) throw Error(`A piece has the wrong kind of colour for "${kind}".`);
    geometry.applyMatrix4(base);
    triangles += geometry.index.count / 3;
    lists[kind].push(geometry);
    return geometry;
  }
  function place(geometry, x, y, z, turn) {
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    geometry.applyMatrix4(local.compose(spot.set(x, y, z), quaternion, one));
    return geometry;
  }
  function within(x, y, z, turn, draw) {
    saved.push(base.clone());
    if (turn) quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2], 'YXZ')); else quaternion.identity();
    base.multiply(local.compose(spot.set(x, y, z), quaternion, one));
    try { return draw(); } finally { base.copy(saved.pop()); }
  }
  const ground = (x, z) => heightAt(x, z);
  const stand = (x, z, heading, draw) => within(x, ground(x, z), z, [0, heading, 0], draw);
  const box = (kind, w, h, d, colour, x, y, z, turn) => keep(kind, place(new THREE.BoxGeometry(w, h, d), x, y, z, turn), colour);
  const cylinder = (kind, radius, high, colour, x, y, z, turn, sides = 10, top = radius, open = false) =>
    keep(kind, place(new THREE.CylinderGeometry(top, radius, high, sides, 1, open), x, y, z, turn), colour);
  function tube(kind, a, b, radius, colour, sides = 6, endRadius = radius) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.CylinderGeometry(endRadius, radius, length, sides, 1);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  // A square-sided length of timber or iron from one point to another.
  function batten(kind, a, b, wide, thick, colour, roll = 0) {
    from.set(a[0], a[1], a[2]); to.set(b[0], b[1], b[2]); way.subVectors(to, from);
    const length = way.length();
    if (length < 1e-4) return;
    const geometry = new THREE.BoxGeometry(wide, length, thick);
    if (roll) geometry.rotateY(roll);
    geometry.applyMatrix4(local.compose(spot.addVectors(from, to).multiplyScalar(.5), quaternion.setFromUnitVectors(up, way.divideScalar(length)), one));
    keep(kind, geometry, colour);
  }
  function rope(kind, points, radius, colour, sides = 4, pieces = points.length * 3) {
    const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(point[0], point[1], point[2])));
    keep(kind, new THREE.TubeGeometry(curve, pieces, radius, sides, false), colour);
  }
  // A sheet through a grid of points. `colour(u, v)` gives each point its own colour (and alpha, for the kinds that carry it).
  function sheet(kind, us, vs, point, colour, uv = false) {
    const positions = [], colours = [], uvs = [], indices = [], size = KINDS[kind].alpha ? 4 : 3, columns = us.length;
    for (const v of vs) for (const u of us) {
      const at = point(u, v);
      positions.push(at[0], at[1], at[2]);
      if (uv) uvs.push(u, v);
      if (colour) { const c = colour(u, v); for (let part = 0; part < size; part++) colours.push(c[part] ?? 1); }
    }
    for (let j = 0; j < vs.length - 1; j++) for (let i = 0; i < columns - 1; i++) {
      const a = j * columns + i;
      indices.push(a, a + 1, a + columns, a + 1, a + columns + 1, a + columns);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    if (uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (colour) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, size));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }
  return {lists, ground, keep, place, within, stand, box, cylinder, tube, batten, rope, sheet, get triangles() { return triangles; }};
}

// A lump of stone, the same on every run: a ball with each corner pulled in or out by its own amount, shared corners kept
// together so that it is shaded as weathered rock and not as a cut gem. `colour(y)` may shade it by height (0 foot, 1 top).
export function stone(kit, random, size, colour, x, y, z, {squash = .62, detail = size > .14 ? 1 : 0, wide = 1, deep = 1, kind = 'plain', turn = random() * 6.28, tilt = 0, rough = .46} = {}) {
  const ball = new THREE.IcosahedronGeometry(1, detail);
  ball.deleteAttribute('normal'); ball.deleteAttribute('uv');
  const rock = mergeVertices(ball), points = rock.attributes.position, colours = new Float32Array(points.count * 3);
  ball.dispose();
  const tint = .82 + random() * .36;
  for (let index = 0; index < points.count; index++) {
    const pull = (.97 - rough / 2 + random() * rough) * size, top = points.getY(index), flat = top < -.3 ? .55 : 1;
    const c = typeof colour === 'function' ? colour((top + 1) / 2) : colour, grain = tint * (.88 + random() * .24);
    colours.set([c.r * grain, c.g * grain, c.b * grain], index * 3);
    points.setXYZ(index, points.getX(index) * pull * wide, top * pull * squash * flat, points.getZ(index) * pull * deep);
  }
  rock.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  rock.computeVertexNormals();
  kit.keep(kind, kit.place(rock, x, y + size * squash * .55, z, [tilt, turn, tilt * .6]), null);
  return size * squash * 1.55;
}

// A sheet of corrugated tin standing up, in its own metres: `wide` across (x), `high` up (y), the ribs running up it, bowing out
// of its face (+z) by `bow` at the middle. Its colour runs to rust low down and in streaks.
export function corrugated(kit, wide, high, colour, {bow = 0, rust = .4, sag = 0, pitch = .076, depth = .017, curl = 0} = {}) {
  const P = palette(), ribs = Math.max(2, Math.round(wide / pitch)), us = Array.from({length: ribs * 2 + 1}, (_, index) => index / (ribs * 2)), vs = span(high > 1.4 ? 4 : 2);
  return kit.sheet('tin', us, vs, (u, v) => {
    const wave = (Math.round(u * ribs * 2) % 2 ? 1 : -1) * depth / 2, middle = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
    return [(u - .5) * wide, v * high - sag * middle, wave + bow * middle + curl * v * v * (u - .3)];
  }, (u, v) => {
    const low = 1 - smooth(0, .35, v), streak = .5 + .5 * Math.sin(u * 37.1 + rust * 11) * Math.sin(u * 13.3 + 2);
    return rgb(colour.clone().lerp(P.rust, clamp01(rust * .3 + low * .3 * rust + streak * .22 * rust)).lerp(P.rustDark, low * .15));
  });
}

// A mark laid on the ground: an oval that follows the land, strongest in the middle. Strength is in the alpha (docs/ART_LINE.md).
export function groundPatch(kit, kind, x, z, radiusX, radiusZ, colour, strength, {turn = 0, random = null, rings = 4, sides = 20, lift = .035, hard = .45} = {}) {
  const cos = Math.cos(turn), sin = Math.sin(turn), ragged = Array.from({length: sides}, () => random ? .78 + random() * .44 : 1);
  kit.keep(kind, kit.sheet(kind, span(sides), span(rings), (u, v) => {
    const a = u * Math.PI * 2, r = v * ragged[Math.round(u * sides) % sides], lx = Math.cos(a) * radiusX * r, lz = Math.sin(a) * radiusZ * r;
    const px = x + lx * cos + lz * sin, pz = z - lx * sin + lz * cos;
    return [px, kit.ground(px, pz) + lift, pz];
  }, (u, v) => [colour[0], colour[1], colour[2], strength * (1 - smooth(hard, 1, v))]), null);
}

// The pickup's paint. `arches` is each wheel arch as z, y and radius in the truck's own metres; `sill` is the height of the
// body's lower edge. The grime rides with the truck: `follow(root)` once a frame after it has moved.
export function createPaintWear({arches, sill, dust = 0x6a5a44}) {
  const uniforms = {uPaintInverse: {value: new THREE.Matrix4()}, uPaintNoise: {value: scrapNoise()}, uPaintDust: {value: new THREE.Color(dust)},
    uPaintArch: {value: arches.map(arch => new THREE.Vector3(arch[0], arch[1], arch[2]))}, uPaintSill: {value: sill}};
  function apply(material) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uPaintInverse;\nvarying vec3 vPaintPos;\nvarying vec3 vPaintNormal;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vPaintPos=(uPaintInverse*modelMatrix*vec4(transformed,1.0)).xyz;
          vPaintNormal=mat3(uPaintInverse)*mat3(modelMatrix)*objectNormal;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uPaintNoise;uniform vec3 uPaintDust;uniform vec3 uPaintArch[${arches.length}];uniform float uPaintSill;
          varying vec3 vPaintPos;varying vec3 vPaintNormal;
          float paintRust=0.0;
          vec3 paintTri(vec3 p,vec3 w,float s){
            return texture2D(uPaintNoise,p.zy*s).rgb*w.x+texture2D(uPaintNoise,p.xz*s).rgb*w.y+texture2D(uPaintNoise,p.xy*s).rgb*w.z;}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 paintN=normalize(vPaintNormal);
          if(!gl_FrontFacing)paintN=-paintN;
          vec3 paintW=pow(abs(paintN),vec3(4.0));paintW/=paintW.x+paintW.y+paintW.z;
          vec3 paintBig=paintTri(vPaintPos,paintW,.12);
          vec3 paintMid=paintTri(vPaintPos+5.1,paintW,.41);
          vec3 paintFine=paintTri(vPaintPos,paintW,1.9);
          vec3 paintC=diffuseColor.rgb;
          float paintLum=dot(paintC,vec3(.3,.6,.1));
          // The sun has chalked the paint where it faces up: paler, greyer, in blotches.
          float paintSun=smoothstep(.15,.9,paintN.y)*(.45+.55*paintBig.r);
          paintC=mix(paintC,vec3(paintLum)*1.7+vec3(.014,.012,.008),paintSun*.62);
          // Worn through to the grey primer in patches.
          float paintPrimer=smoothstep(.57,.63,paintBig.b*.55+paintMid.r*.45);
          paintC=mix(paintC,vec3(.07,.064,.058)*(.8+.5*paintFine.g),paintPrimer*.75);
          // Rust: round the wheel arches, along the sills, and in scabs where the noise is thickest.
          float paintSide=smoothstep(.45,.7,abs(vPaintPos.x));
          float paintArch=9.0;
          for(int i=0;i<${arches.length};i++)paintArch=min(paintArch,length(vPaintPos.zy-uPaintArch[i].xy)-uPaintArch[i].z);
          float paintRim=(1.0-smoothstep(0.0,.1+.2*paintMid.b,paintArch))*paintSide;
          float paintLow=1.0-smoothstep(0.0,.08+.2*paintMid.g,vPaintPos.y-uPaintSill);
          float paintScab=smoothstep(.7,.76,paintBig.r*.6+paintMid.b*.4);
          paintRust=smoothstep(.22,.5,max(max(paintRim,paintLow*.9)*(.55+.75*paintMid.r),paintScab*.8));
          // Rust runs down from the scabs on upright faces.
          float paintWall=1.0-abs(paintN.y);
          float paintRun=texture2D(uPaintNoise,vec2((vPaintPos.x+vPaintPos.z)*1.3,vPaintPos.y*.09)).b;
          paintC=mix(paintC,vec3(.05,.026,.014),.3*smoothstep(.58,.76,paintRun)*paintWall);
          paintC=mix(paintC,mix(vec3(.062,.027,.013),vec3(.022,.012,.008),paintFine.g),paintRust);
          paintC*=.8+.38*paintFine.g;
          // Road dust thrown over the lower body, and dust settled on what faces up.
          float paintDusty=(1.0-smoothstep(.3,1.25,vPaintPos.y))*(.45+.55*paintMid.g);
          paintC=mix(paintC,uPaintDust*(.8+.4*paintFine.g),paintDusty*.55);
          paintC=mix(paintC,uPaintDust,max(paintN.y,0.0)*.22*(.4+paintMid.g));
          diffuseColor.rgb=paintC;`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor=clamp(mix(roughnessFactor+.25*paintFine.g,1.0,paintRust),0.0,1.0);`);
    };
    material.customProgramCacheKey = () => 'dace-pickup-paint-1-' + arches.length;
    return material;
  }
  function follow(root) { root.updateWorldMatrix(true, false); uniforms.uPaintInverse.value.copy(root.matrixWorld).invert(); }
  return {apply, follow, uniforms};
}

// Grain for timber, stone, concrete and rubber: no face one flat colour, darker blotches, tops bleached by the sun, dust low down.
// The dust is a third of the wear's own dust colour: at full strength it turned every dark rock pale tan.
export function createGrainWear({dust = 0x6a5a44, bleach = .4, blotch = .5, dusty = .35} = {}) {
  const uniforms = {uGrainInverse: {value: new THREE.Matrix4()}, uGrainNoise: {value: scrapNoise()}, uGrainDust: {value: new THREE.Color(dust).multiplyScalar(.35)}, uGrainMix: {value: new THREE.Vector3(bleach, blotch, dusty)}};
  function apply(material) {
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uGrainInverse;\nvarying vec3 vGrainPos;\nvarying vec3 vGrainNormal;')
        .replace('#include <project_vertex>', `#include <project_vertex>
          vGrainPos=(uGrainInverse*modelMatrix*vec4(transformed,1.0)).xyz;
          vGrainNormal=mat3(uGrainInverse)*mat3(modelMatrix)*objectNormal;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uGrainNoise;uniform vec3 uGrainDust;uniform vec3 uGrainMix;
          varying vec3 vGrainPos;varying vec3 vGrainNormal;
          vec3 grainTri(vec3 p,vec3 w,float s){
            return texture2D(uGrainNoise,p.zy*s).rgb*w.x+texture2D(uGrainNoise,p.xz*s).rgb*w.y+texture2D(uGrainNoise,p.xy*s).rgb*w.z;}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          vec3 grainN=normalize(vGrainNormal);
          vec3 grainW=pow(abs(grainN),vec3(4.0));grainW/=grainW.x+grainW.y+grainW.z;
          vec3 grainBig=grainTri(vGrainPos,grainW,.16);
          vec3 grainMid=grainTri(vGrainPos+3.7,grainW,.53);
          vec3 grainFine=grainTri(vGrainPos,grainW,2.6);
          vec3 grainC=diffuseColor.rgb*(.55+.85*grainFine.g);
          grainC=mix(grainC,grainC*.42,smoothstep(.42,.68,grainBig.r*.6+grainMid.b*.4)*uGrainMix.y);
          grainC=mix(grainC,vec3(dot(grainC,vec3(.33)))*1.45,max(grainN.y,0.0)*uGrainMix.x*(.35+.65*grainMid.r));
          grainC=mix(grainC,uGrainDust*(.8+.4*grainFine.g),(1.0-smoothstep(.0,.55,vGrainPos.y))*uGrainMix.z*(.4+.6*grainMid.g));
          diffuseColor.rgb=grainC;`);
    };
    material.customProgramCacheKey = () => 'dace-grain-1';
    return material;
  }
  function follow(root) { root.updateWorldMatrix(true, false); uniforms.uGrainInverse.value.copy(root.matrixWorld).invert(); }
  return {apply, follow, uniforms};
}

// A picture of punched holes for the drum sieve: where it is dark the drum is cut away.
let holes = null;
function sieveHoles() {
  if (holes) return holes;
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const row = Math.floor(y / 16), cx = (x + (row % 2) * 8) % 16 - 8, cy = y % 16 - 8, solid = Math.hypot(cx, cy) > 4.6 ? 255 : 0;
    data.set([solid, solid, solid, 255], (y * size + x) * 4);
  }
  holes = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  holes.wrapS = holes.wrapT = THREE.RepeatWrapping; holes.magFilter = THREE.LinearFilter; holes.minFilter = THREE.LinearMipmapLinearFilter;
  holes.generateMipmaps = true; holes.needsUpdate = true;
  return holes;
}

// The materials of one thing, made as they are first asked for. `paint` is given only for the pickup.
export function createMaterials({paint = null, dust = 0x6a5a44} = {}) {
  const wear = {hard: createScrapWear({paint: .5, dust}), tin: createScrapWear({paint: .45, dust}), cloth: createScrapWear({paint: .22, dust}),
    timber: createGrainWear({dust, bleach: .5, blotch: .55, dusty: .3}), plain: createGrainWear({dust, bleach: .2, blotch: .45, dusty: .3}),
    sieve: createScrapWear({paint: .8, dust}), paint: paint ? createPaintWear({...paint, dust}) : null};
  const decal = {vertexColors: true, transparent: true, metalness: 0, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4};
  const make = {
    paint: () => (wear.paint ?? wear.hard).apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .6, metalness: .08, side: THREE.DoubleSide})),
    hard: () => wear.hard.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .88, metalness: .12})),
    tin: () => wear.tin.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .8, metalness: .16, side: THREE.DoubleSide})),
    cloth: () => wear.cloth.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide})),
    timber: () => wear.timber.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .95, metalness: 0})),
    plain: () => wear.plain.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .96, metalness: 0})),
    sieve: () => wear.sieve.apply(new THREE.MeshStandardMaterial({vertexColors: true, roughness: .9, metalness: .15, side: THREE.DoubleSide, alphaMap: sieveHoles(), alphaTest: .5})),
    glass: () => new THREE.MeshStandardMaterial({vertexColors: true, transparent: true, roughness: .22, metalness: 0, side: THREE.DoubleSide, forceSinglePass: true, depthWrite: false}),
    ground: () => new THREE.MeshStandardMaterial({...decal, roughness: 1}),
    // Wet gravel is dark and only a little shiny: a smooth ground mirrors the pale sky and reads as mist (docs/ART_LINE.md).
    wet: () => new THREE.MeshStandardMaterial({...decal, roughness: .62}),
    lamp: () => new THREE.MeshStandardMaterial({vertexColors: true, roughness: .3, metalness: 0, emissive: 0xffd9a0, emissiveIntensity: 0}),
  };
  const made = {};
  return {
    get(kind) { made[kind] ??= Object.assign(make[kind](), {name: KINDS[kind].name}); return made[kind]; },
    lamp: () => made.lamp,
    follow(root) { for (const worn of Object.values(wear)) worn?.follow(root); },
    dispose() { for (const material of Object.values(made)) material.dispose(); },
  };
}

// Merges each kind a kit has gathered into one mesh under `group`. Returns the meshes by kind.
export function finish(kit, group, title, materials) {
  const parts = {};
  for (const [kind, list] of Object.entries(kit.lists)) {
    if (!list.length) continue;
    const merged = mergeGeometries(list);
    for (const geometry of list) geometry.dispose();
    const mesh = new THREE.Mesh(merged, materials.get(kind));
    mesh.name = `${title}, ${KINDS[kind].name}`;
    mesh.castShadow = !['glass', 'ground', 'wet'].includes(kind);
    mesh.receiveShadow = true;
    if (kind === 'ground' || kind === 'wet') mesh.renderOrder = 1;
    if (kind === 'glass') mesh.renderOrder = 2;
    group.add(mesh);
    parts[kind] = mesh;
  }
  return parts;
}

// Names every drawn mesh of a finished thing and gives it the same handles as the other looks of the open land.
export function finishThing(group, materials, triangles, update = null) {
  const draws = [];
  group.traverse(node => { if (node.isMesh || node.isLine || node.isPoints) draws.push(node.name); });
  Object.assign(group.userData, {draws, triangles, lights: [],
    update(seconds = 0) { materials.follow(group); update?.(seconds); },
    dispose() { group.traverse(node => { if (node.isMesh) node.geometry.dispose(); }); materials.dispose(); }});
  return group;
}
