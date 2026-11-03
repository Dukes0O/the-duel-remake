// SKIN-VIEW: how Kestrel One wears a skin (docs/HELI_WILDLIFE.md sections 5, 6, 7 and 12).
// Drawing only: it reads the session's view (view.skins and view.survey) and
// never changes flight, mission or save state.
//
//  - Paint: the seven paints of palettes.json on paint_white (body), paint_navy
//    (lower and tail) and paint_red (stripe). The wildlife camouflage and the grime
//    are projected from the model's own axes (triplanar), because Kestrel One has
//    no painted UV layout. The TV skin carries the Barely News logo on both flanks.
//  - Gear: each piece of the worn skin's gear is fitted at its mount point.
//  - Grime: the four dirt levels (dust, mud, soot, salt; their sum is at most 100)
//    laid over the paint as streaks that grow with the level, lowest first.
//  - The heat camera's small inset (warm people and, in a count, warm animals).
//
// Stock paint with no grime (and the switch off) leaves the model's own
// materials untouched. Paint and grime run on copies of the three paint
// materials, shared by every mesh; textures load once, the first time a skin or
// a level of dirt needs one.
import {SKINS} from './heli-skins.js';
import {DIRT_KINDS, DIRT_MAX} from './heli-save.js';

const SKIN_FOLDER = '/assets/heli/skins/', GEAR_FOLDER = '/assets/heli/gear/', RESCUE_FOLDER = '/assets/heli/rescue/';
export const LOGO_URL = '/assets/heli/barely-news.svg';
// A change of coat takes 1.5 seconds; a wash takes the same.
export const FADE_SECONDS = 1.5;

// ---- the paints (palettes.json is the recipe's own table; the tests keep the two equal) ----

// body = paint_white, lower = paint_navy, stripe = paint_red, as sRGB hex. The
// wildlife skin's body and lower are camouflage: camo marks them, and the hex is
// the pattern's average colour (what a change of coat fades through).
export const PAINTS = Object.freeze({
  stock: Object.freeze({body: '#e7e7e4', lower: '#283654', stripe: '#b0312a', camo: false, decal: false}),
  fire: Object.freeze({body: '#a8261c', lower: '#e2a51c', stripe: '#ecebe5', camo: false, decal: false}),
  medevac: Object.freeze({body: '#ededea', lower: '#ededea', stripe: '#b3231c', camo: false, decal: false}),
  rescue: Object.freeze({body: '#e9b512', lower: '#b3231c', stripe: '#161616', camo: false, decal: false}),
  wildlife: Object.freeze({body: '#5a5e3a', lower: '#5a5e3a', stripe: '#2c3a22', camo: true, decal: false}),
  supply: Object.freeze({body: '#d9671b', lower: '#ededea', stripe: '#161616', camo: false, decal: false}),
  tv: Object.freeze({body: '#141516', lower: '#141516', stripe: '#b8902e', camo: false, decal: true}),
});
export const PAINT_MATERIALS = Object.freeze({paint_white: 'body', paint_navy: 'lower', paint_red: 'stripe'});
const ROLE_NAMES = Object.freeze(['body', 'lower', 'stripe']);
// The paint a skin shows, or null for a coat this file does not paint (the rank coats are the logbook's).
export const paintOf = skin => typeof skin === 'string' && Object.hasOwn(PAINTS, skin) ? PAINTS[skin] : null;

// The logo goes on both flanks of the hull behind the cabin windows, 0.5 m across.
// y and z are where the middle sits on the hull (metres in the model's axes); the
// patch is built by casting rays at the hull, so it follows the curve.
export const LOGO = Object.freeze({size: 0.5, y: 1.42, z: -0.12, sides: Object.freeze([1, -1]), lift: 0.004});

// ---- the gear (section 5.3) ----

// Where each piece of gear is fitted: the model file, the node it hangs from, a turn
// about the vertical axis (radians) and a nudge (metres, along the mount's own axes).
// The winch is built with its arm along +X and the side-right mount has no rotation,
// so it turns half a turn there and its arm reaches outward (SKIN-ART-GEAR part 2).
// The searchlight shares the belly with the heat camera, so it sits half a metre aft.
export const GEAR_VIEW = Object.freeze({
  'drop-sight': Object.freeze({file: GEAR_FOLDER + 'drop-sight.glb', mount: 'mount_belly', turn: 0, offset: Object.freeze([0, 0, 0])}),
  'heat-camera': Object.freeze({file: GEAR_FOLDER + 'heat-camera.glb', mount: 'mount_belly', turn: 0, offset: Object.freeze([0, 0, 0])}),
  'zoom-camera': Object.freeze({file: GEAR_FOLDER + 'zoom-camera.glb', mount: 'mount_belly', turn: 0, offset: Object.freeze([0, 0, 0])}),
  'nose-camera': Object.freeze({file: GEAR_FOLDER + 'nose-camera.glb', mount: 'mount_nose', turn: 0, offset: Object.freeze([0, 0, 0])}),
  winch: Object.freeze({file: RESCUE_FOLDER + 'winch.glb', mount: 'mount_side_right', turn: Math.PI, offset: Object.freeze([0, 0, 0])}),
  searchlight: Object.freeze({file: RESCUE_FOLDER + 'searchlight.glb', mount: 'mount_belly', turn: 0, offset: Object.freeze([0, 0, -0.5])}),
  'cargo-net': Object.freeze({file: GEAR_FOLDER + 'cargo-net.glb', mount: 'cable_hook', turn: 0, offset: Object.freeze([0, 0, 0])}),
  // The quieter rotor takes the place of the main rotor's own blades, on the same hub.
  'quiet-tips': Object.freeze({file: GEAR_FOLDER + 'main-rotor-quiet.glb', mount: 'main_rotor', turn: 0, offset: Object.freeze([0, 0, 0]), replaces: true}),
});
// Gear with no model of its own: the water gauge is a number on the panel, the stretcher
// is drawn on the rescue line, and the stronger hook is the heavy hook of the cargo net's model.
export const GEAR_WITHOUT_MODEL = Object.freeze(['water-gauge', 'stretcher', 'strong-hook']);

// The pieces to draw for a skin, in the gear table's order. Unknown coats show none.
export function gearPiecesFor(skin) {
  if (!Object.hasOwn(SKINS, skin)) return [];
  return SKINS[skin].gear.filter(id => Object.hasOwn(GEAR_VIEW, id)).map(id => ({id, ...GEAR_VIEW[id]}));
}

// ---- the grime (section 6) ----

// Each kind's colour (palettes.json) and how thickly it lies where it lands.
export const GRIME_COLOURS = Object.freeze({dust: '#8a7a5e', mud: '#3e3020', soot: '#1c1a18', salt: '#d8d6cc'});
export const GRIME_MASKS = Object.freeze({dust: 'grime-dust.jpg', mud: 'grime-mud.jpg', soot: 'grime-soot.jpg', salt: 'grime-salt.jpg'});
const hexToRgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const GRIME_RGB = Object.freeze(Object.fromEntries(DIRT_KINDS.map(kind => [kind, Object.freeze(hexToRgb(GRIME_COLOURS[kind]))])));
// The dull film all four lay over the whole coat at full grime; the streaks sit on top of it.
export const GRIME_FILM = 0.22;

// What the four dirt levels (each 0 to 100, together at most 100) look like: strength 0 to 1,
// each kind's cover 0 to 1 (its share of the whole), and the colour of the four mixed by their
// shares (sRGB, 0 to 1; null when clean). A dirt that adds up to more than 100 is scaled down.
export function grimeLook(dirt) {
  const level = kind => Number.isFinite(dirt?.[kind]) ? Math.max(0, Math.min(DIRT_MAX, dirt[kind])) : 0;
  const levels = DIRT_KINDS.map(level), sum = levels.reduce((a, b) => a + b, 0);
  const scale = sum > DIRT_MAX ? DIRT_MAX / sum : 1;
  const cover = levels.map(value => value * scale / DIRT_MAX);
  const strength = Math.min(1, sum / DIRT_MAX);
  let colour = null;
  if (sum > 0) colour = [0, 1, 2].map(channel => DIRT_KINDS.reduce((total, kind, i) => total + GRIME_RGB[kind][channel] * levels[i] / sum, 0));
  return {strength, cover, colour};
}

// ---- the heat camera's picture (docs/HELI_WILDLIFE.md sections 5.3 and 7) ----

// The warm things the camera shows, plotted from above with the helicopter's nose up: a
// spot for each person (view.skins.heat) and each animal of a count (view.survey.heat), at
// right and ahead as a share of the camera's range (-1 to 1; more than that is not shown).
// Fills `out` and reuses the spots already in it, so a steady frame makes none.
export function heatBlips(view, out = []) {
  const h = view?.heli, range = view?.skins?.gear?.heatRange;
  let n = 0;
  if (h && range > 0) {
    n = plot(out, n, 'person', view.skins.heat, h, range);
    if (view.skins.gear.heatAnimals === true) n = plot(out, n, 'animal', view.survey?.heat, h, range);
  }
  out.length = n;
  return out;
}
function plot(out, n, kind, things, h, range) {
  if (!things) return n;
  const sin = Math.sin(h.heading), cos = Math.cos(h.heading);
  for (let i = 0; i < things.length; i++) {
    const dx = things[i].x - h.x, dz = things[i].z - h.z;
    const ahead = (dx * sin + dz * cos) / range, right = (dz * sin - dx * cos) / range;
    if (ahead * ahead + right * right > 1) continue;
    const spot = out[n] ??= {kind: '', right: 0, ahead: 0};
    spot.kind = kind; spot.right = right; spot.ahead = ahead;
    n++;
  }
  return n;
}

// The inset itself: a small thermal screen in the corner of the panel, drawn on a 2D canvas. The
// background is made once; a frame draws it, the range rings and a hot spot for each blip.
const HEAT_SIZE = 168;
export function createHeatInset({doc, host}) {
  const wrap = doc.createElement('div'), canvas = doc.createElement('canvas');
  wrap.className = 'heli-heat';
  wrap.hidden = true;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Heat camera');
  canvas.width = canvas.height = HEAT_SIZE;
  wrap.append(canvas);
  host.append(wrap);
  const ctx = canvas.getContext?.('2d') ?? null;
  const spots = [];
  let backdrop = null, sprite = null, lastLabel = '';
  // Made on the first frame it is shown.
  function build() {
    backdrop = doc.createElement('canvas'); backdrop.width = backdrop.height = HEAT_SIZE;
    const b = backdrop.getContext('2d'), c = HEAT_SIZE / 2;
    const ground = b.createRadialGradient(c, c, 8, c, c, c);
    ground.addColorStop(0, '#16201c'); ground.addColorStop(1, '#070a09');
    b.fillStyle = ground; b.fillRect(0, 0, HEAT_SIZE, HEAT_SIZE);
    // Cold-ground grain, the same every time (a small fixed generator, never the game's).
    let seed = 20261103;
    for (let i = 0; i < 900; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const x = (seed & 0xffff) / 0xffff * HEAT_SIZE, y = (seed >>> 16) / 0xffff * HEAT_SIZE, a = 0.03 + ((seed >>> 8) & 7) * 0.008;
      b.fillStyle = `rgba(150,190,170,${a.toFixed(3)})`; b.fillRect(x, y, 1 + (seed & 1), 1);
    }
    b.strokeStyle = 'rgba(140,200,170,.22)'; b.lineWidth = 1;
    for (const share of [1 / 3, 2 / 3, 1]) { b.beginPath(); b.arc(c, c, share * (c - 6), 0, Math.PI * 2); b.stroke(); }
    b.beginPath(); b.moveTo(c, 6); b.lineTo(c, HEAT_SIZE - 6); b.moveTo(6, c); b.lineTo(HEAT_SIZE - 6, c); b.stroke();
    // The helicopter at the middle, nose up.
    b.fillStyle = 'rgba(190,230,205,.8)'; b.beginPath(); b.moveTo(c, c - 6); b.lineTo(c + 4, c + 5); b.lineTo(c - 4, c + 5); b.closePath(); b.fill();
    b.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < HEAT_SIZE; y += 3) b.fillRect(0, y, HEAT_SIZE, 1);
    sprite = doc.createElement('canvas'); sprite.width = sprite.height = 48;
    const s = sprite.getContext('2d'), glow = s.createRadialGradient(24, 24, 1, 24, 24, 24);
    glow.addColorStop(0, 'rgba(255,255,235,1)'); glow.addColorStop(.25, 'rgba(255,214,120,.95)');
    glow.addColorStop(.6, 'rgba(235,96,40,.5)'); glow.addColorStop(1, 'rgba(120,30,20,0)');
    s.fillStyle = glow; s.fillRect(0, 0, 48, 48);
  }
  return {
    wrap, canvas,
    // The view the panel was given, or null when the camera is not worn.
    update(view) {
      const on = !!view && view.skins?.gear?.heatRange > 0 && !!view.heli;
      wrap.hidden = !on;
      if (!on || !ctx) return 0;
      if (!backdrop) build();
      const blips = heatBlips(view, spots), c = HEAT_SIZE / 2, reach = c - 6;
      ctx.drawImage(backdrop, 0, 0);
      for (let i = 0; i < blips.length; i++) {
        const spot = blips[i], radius = spot.kind === 'person' ? 13 : 9;
        ctx.drawImage(sprite, c + spot.right * reach - radius, c - spot.ahead * reach - radius, radius * 2, radius * 2);
      }
      ctx.fillStyle = 'rgba(170,230,195,.85)'; ctx.font = '600 10px system-ui, sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText('HEAT', 8, 7);
      const label = `${blips.length} WARM`;
      ctx.textAlign = 'right'; ctx.fillText(label, HEAT_SIZE - 8, 7);
      ctx.textBaseline = 'bottom'; ctx.fillText(`${Math.round(view.skins.gear.heatRange)} M`, HEAT_SIZE - 8, HEAT_SIZE - 7);
      ctx.textAlign = 'left';
      if (!blips.length) { ctx.fillStyle = 'rgba(170,230,195,.4)'; ctx.fillText('NOTHING WARM', 8, HEAT_SIZE - 7); }
      lastLabel = label;
      return blips.length;
    },
    get label() { return lastLabel; },
    dispose() { wrap.remove(); backdrop = sprite = null; },
  };
}

// ---- the shader: camouflage and grime on the paint materials ----

const VERTEX_DECLARE = '#include <common>\nvarying vec3 vSkinPos;\nvarying vec3 vSkinNrm;';
const VERTEX_SET = '#include <begin_vertex>\nvSkinPos = position;\nvSkinNrm = objectNormal;';
const FRAGMENT_DECLARE = `#include <common>
uniform vec4 uCover;
uniform vec4 uFilm;
uniform vec3 uGrimeColour[4];
uniform float uCamo;
uniform sampler2D uMaskDust;
uniform sampler2D uMaskMud;
uniform sampler2D uMaskSoot;
uniform sampler2D uMaskSalt;
uniform sampler2D uCamoMap;
varying vec3 vSkinPos;
varying vec3 vSkinNrm;
float skinDirt = 0.0;
vec4 skinTri(sampler2D tex, vec3 p, vec3 w, float s) {
  return texture2D(tex, p.zy * s) * w.x + texture2D(tex, p.xz * s) * w.y + texture2D(tex, p.xy * s) * w.z;
}
// A kind of dirt: it shows first where its mask is strongest and spreads as its cover grows,
// lying thicker low on the hull, so a little grime is a few streaks and a lot is a coat.
void skinLayer(inout vec3 rgb, float cover, float mask, vec3 tint, float low, float thick) {
  float edge = 1.0 - cover * 1.25 - low * cover * 0.35;
  float c = smoothstep(edge - 0.06, edge + 0.06, mask);
  float a = c * thick * (0.4 + 0.6 * mask);
  rgb = mix(rgb, tint * (0.78 + 0.44 * mask), a);
  skinDirt = max(skinDirt, a);
}`;
const FRAGMENT_PAINT = `#include <color_fragment>
{
  vec3 skinW = pow(abs(normalize(vSkinNrm)), vec3(4.0));
  skinW /= (skinW.x + skinW.y + skinW.z);
  if (uCamo > 0.001) diffuseColor.rgb = mix(diffuseColor.rgb, skinTri(uCamoMap, vSkinPos, skinW, 0.34).rgb, uCamo);
  float skinLow = 1.0 - smoothstep(0.35, 2.3, vSkinPos.y);
  if (uFilm.w > 0.001) {
    float film = uFilm.w * (0.55 + 0.45 * skinLow);
    diffuseColor.rgb = mix(diffuseColor.rgb, uFilm.rgb, film);
    skinDirt = film;
  }
  if (uCover.x > 0.001) skinLayer(diffuseColor.rgb, uCover.x, skinTri(uMaskDust, vSkinPos, skinW, 0.33).r, uGrimeColour[0], skinLow, 0.78);
  if (uCover.w > 0.001) skinLayer(diffuseColor.rgb, uCover.w, skinTri(uMaskSalt, vSkinPos, skinW, 0.40).r, uGrimeColour[3], skinLow, 0.80);
  if (uCover.y > 0.001) skinLayer(diffuseColor.rgb, uCover.y, skinTri(uMaskMud, vSkinPos, skinW, 0.50).r, uGrimeColour[1], skinLow, 0.92);
  if (uCover.z > 0.001) skinLayer(diffuseColor.rgb, uCover.z, skinTri(uMaskSoot, vSkinPos, skinW, 0.30).r, uGrimeColour[2], skinLow, 0.86);
}`;
const FRAGMENT_ROUGH = '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.93, clamp(skinDirt * 1.2, 0.0, 1.0));';
const FRAGMENT_COAT = '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\nmaterial.clearcoat *= 1.0 - clamp(skinDirt, 0.0, 1.0);\n#endif';

// ---- the view ----

// THREE, load (a model's URL to its scene, the same loader the helicopter uses) and loadTexture
// (a texture's URL to a texture) are given, so a test can stand in for the page.
export function createSkinView({THREE, load, loadTexture = url => new THREE.TextureLoader().loadAsync(url)}) {
  const paintSlots = [];           // {mesh, index (-1: one material), role, base, clone}
  const nodes = new Map();         // mount names to the model's own nodes
  const textures = {};             // camo, logo, dust, mud, soot, salt: loaded once
  const asked = new Set();
  const scenes = new Map();        // a gear file's URL to the promise of its scene
  let model = null, active = false, clones = false, disposed = false;
  let worn = null, gearFor = null, gearToken = 0, placed = [];
  let doorPatches = null, decalMaterial = null, cone = null, coneOn = false;
  const shared = {
    uCover: {value: new THREE.Vector4()}, uFilm: {value: new THREE.Vector4()},
    uGrimeColour: {value: DIRT_KINDS.map(kind => new THREE.Color(GRIME_COLOURS[kind]))},
    uMaskDust: {value: null}, uMaskMud: {value: null}, uMaskSoot: {value: null}, uMaskSalt: {value: null}, uCamoMap: {value: null},
  };
  // What is drawn now, where it is heading and how far along the fade is.
  const colours = ROLE_NAMES.map(() => ({now: new THREE.Color(), from: new THREE.Color(), to: new THREE.Color()}));
  const camo = {now: 0, from: 0, to: 0}, decal = {now: 0, from: 0, to: 0};
  const cover = {now: [0, 0, 0, 0], to: [0, 0, 0, 0]}, film = {now: 0, to: 0, colour: new THREE.Color(), raw: [0, 0, 0]};
  let fade = 1, lastDirt = [-1, -1, -1, -1], settled = false;
  const tint = new THREE.Color();

  const textureFile = {camo: SKIN_FOLDER + 'camo.jpg', logo: LOGO_URL,
    ...Object.fromEntries(DIRT_KINDS.map(kind => [kind, SKIN_FOLDER + GRIME_MASKS[kind]]))};
  function need(name) {
    if (textures[name] || asked.has(name) || disposed) return;
    asked.add(name);
    loadTexture(textureFile[name]).then(texture => {
      if (disposed) { texture.dispose?.(); return; }
      texture.wrapS = texture.wrapT = name === 'logo' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
      texture.colorSpace = name === 'camo' || name === 'logo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 4;
      textures[name] = texture;
      if (name === 'camo') shared.uCamoMap.value = texture;
      else if (name !== 'logo') shared[`uMask${name[0].toUpperCase()}${name.slice(1)}`].value = texture;
      if (name === 'logo') buildDoorPatches();
      retarget(false);
    }).catch(error => { console.warn(`Kestrel One's ${name} texture did not load: ${String(error?.message || error)}`); });
  }

  // ---- the paint materials ----

  function makeClone(base) {
    const clone = base.clone();
    clone.name = `${base.name}_skin`;
    const uCamo = {value: 0};
    clone.userData.skinCamo = uCamo;
    clone.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, shared, {uCamo});
      shader.vertexShader = shader.vertexShader.replace('#include <common>', VERTEX_DECLARE).replace('#include <begin_vertex>', VERTEX_SET);
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', FRAGMENT_DECLARE)
        .replace('#include <color_fragment>', FRAGMENT_PAINT).replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGH)
        .replace('#include <lights_physical_fragment>', FRAGMENT_COAT);
    };
    clone.customProgramCacheKey = () => 'heli-skin-paint-v1';
    return clone;
  }
  const setMaterial = (slot, material) => {
    if (slot.index < 0) slot.mesh.material = material; else slot.mesh.material[slot.index] = material;
  };
  function useClones(on) {
    if (on === clones) return;
    clones = on;
    for (const slot of paintSlots) setMaterial(slot, on ? slot.clone ??= makeClone(slot.base) : slot.base);
  }
  function pushPaint() {
    for (const slot of paintSlots) {
      if (!slot.clone) continue;
      slot.clone.color.copy(colours[slot.role].now);
      slot.clone.userData.skinCamo.value = slot.role < 2 ? camo.now : 0;
    }
    if (decalMaterial) { decalMaterial.opacity = decal.now; for (const patch of doorPatches) patch.visible = decal.now > 0.01; }
  }
  function pushGrime() {
    const loaded = DIRT_KINDS.map(kind => !!textures[kind]);
    shared.uCover.value.set(loaded[0] ? cover.now[0] : 0, loaded[1] ? cover.now[1] : 0, loaded[2] ? cover.now[2] : 0, loaded[3] ? cover.now[3] : 0);
    shared.uFilm.value.set(film.colour.r, film.colour.g, film.colour.b, film.now);
  }

  // ---- what the skin asks for ----

  // Sets where every fade is heading (from where it is now) for the worn coat and the dirt.
  // `snap` jumps there at once: the first coat drawn, or when the switch comes on.
  function retarget(snap) {
    if (!active || !worn) return;
    const paint = PAINTS[worn];
    if (paint.camo) need('camo');
    if (paint.decal) need('logo');
    const wantCamo = paint.camo && textures.camo ? 1 : 0, wantDecal = paint.decal && doorPatches ? 1 : 0;
    let differs = camo.to !== wantCamo || decal.to !== wantDecal;
    ROLE_NAMES.forEach((role, i) => { tint.set(paint[role]); if (!colours[i].to.equals(tint)) differs = true; });
    if (differs) {
      for (const slot of colours) slot.from.copy(slot.now);
      camo.from = camo.now; decal.from = decal.now;
      ROLE_NAMES.forEach((role, i) => colours[i].to.set(paint[role]));
      camo.to = wantCamo; decal.to = wantDecal;
      fade = 0;
    }
    if (snap) fade = 1;
    settled = false;
    apply(0);
  }
  // Moves every fade on by dt seconds, puts it on the materials and decides which materials are used.
  function apply(dt) {
    const moving = fade < 1;
    if (moving) fade = Math.min(1, fade + dt / FADE_SECONDS);
    const k = fade < 1 ? fade * fade * (3 - 2 * fade) : 1;
    for (const slot of colours) slot.now.lerpColors(slot.from, slot.to, k);
    camo.now = camo.from + (camo.to - camo.from) * k;
    decal.now = decal.from + (decal.to - decal.from) * k;
    let coverMoving = false;
    const step = dt / FADE_SECONDS;
    for (let i = 0; i < 4; i++) {
      const gap = cover.to[i] - cover.now[i];
      if (gap !== 0) { cover.now[i] = Math.abs(gap) <= step ? cover.to[i] : cover.now[i] + Math.sign(gap) * step; coverMoving ||= cover.now[i] !== cover.to[i]; }
    }
    const filmGap = film.to - film.now;
    if (filmGap !== 0) { film.now = Math.abs(filmGap) <= step ? film.to : film.now + Math.sign(filmGap) * step; coverMoving ||= film.now !== film.to; }
    const dirty = cover.now.some(value => value > 0) || film.now > 0;
    useClones(worn !== 'stock' || fade < 1 || dirty);
    pushPaint();
    pushGrime();
    settled = !(fade < 1) && !coverMoving;
  }
  // The stock paint with no dirt left puts the model's own materials back, exactly.
  function setDirt(dirt) {
    const look = grimeLook(dirt);
    cover.to = look.cover;
    film.to = look.strength * GRIME_FILM;
    if (look.colour) film.colour.setRGB(look.colour[0], look.colour[1], look.colour[2], THREE.SRGBColorSpace);
    DIRT_KINDS.forEach((kind, i) => { if (cover.to[i] > 0) need(kind); });
    settled = false;
  }

  // ---- the logo on the doors ----

  const ray = new THREE.Raycaster(), rayFrom = new THREE.Vector3(), rayDir = new THREE.Vector3();
  const GRID = 8;
  // Casts a grid of rays at the hull from outside each flank and builds a patch that lies
  // 4 mm off it. Rays are made in the model's own axes and moved to the world, so the model
  // may be anywhere when this runs.
  function buildDoorPatches() {
    if (doorPatches || !model || !textures.logo || disposed) return;
    model.updateWorldMatrix(true, true);
    const hull = paintSlots.map(slot => slot.mesh);
    const patches = [];
    for (const side of LOGO.sides) {
      const positions = new Float32Array((GRID + 1) * (GRID + 1) * 3), uvs = new Float32Array((GRID + 1) * (GRID + 1) * 2);
      let ok = true;
      for (let row = 0; row <= GRID && ok; row++) for (let col = 0; col <= GRID; col++) {
        const y = LOGO.y + (0.5 - row / GRID) * LOGO.size, z = LOGO.z + (col / GRID - 0.5) * LOGO.size;
        rayFrom.set(side * 3, y, z); rayDir.set(-side, 0, 0);
        model.localToWorld(rayFrom); rayDir.transformDirection(model.matrixWorld);
        ray.set(rayFrom, rayDir);
        const hit = ray.intersectObjects(hull, false)[0];
        if (!hit) { ok = false; break; }
        const point = model.worldToLocal(hit.point.clone()), normal = hit.face.normal;
        const at = (row * (GRID + 1) + col) * 3;
        positions[at] = point.x + normal.x * LOGO.lift; positions[at + 1] = point.y + normal.y * LOGO.lift; positions[at + 2] = point.z + normal.z * LOGO.lift;
        // The logo reads left to right for someone standing outside that flank.
        uvs[(row * (GRID + 1) + col) * 2] = side > 0 ? 1 - col / GRID : col / GRID;
        uvs[(row * (GRID + 1) + col) * 2 + 1] = 1 - row / GRID;
      }
      if (!ok) continue;
      const index = [];
      for (let row = 0; row < GRID; row++) for (let col = 0; col < GRID; col++) {
        const a = row * (GRID + 1) + col, b = a + 1, c = a + GRID + 1, d = c + 1;
        // The two triangles face outward from this flank.
        if (side > 0) index.push(a, b, c, b, d, c); else index.push(a, c, b, b, c, d);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geometry.setIndex(index);
      geometry.computeVertexNormals();
      patches.push(geometry);
    }
    if (!patches.length) return;
    decalMaterial = new THREE.MeshStandardMaterial({map: textures.logo, transparent: true, opacity: 0, roughness: 0.55, metalness: 0,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
    doorPatches = patches.map(geometry => {
      const mesh = new THREE.Mesh(geometry, decalMaterial);
      mesh.name = 'Barely News logo';
      mesh.renderOrder = 2;
      mesh.visible = false;
      model.add(mesh);
      return mesh;
    });
  }

  // ---- the gear ----

  function sceneFor(url) {
    if (!scenes.has(url)) scenes.set(url, Promise.resolve(load(url)));
    return scenes.get(url);
  }
  function clearGear() {
    gearToken++;
    for (const item of placed) {
      item.object.parent?.remove(item.object);
      if (item.replaced) for (const child of item.replaced) child.visible = true;
    }
    placed = [];
    cone?.parent?.remove(cone);
    cone = null; coneOn = false;
  }
  function fitGear(skin) {
    clearGear();
    gearFor = skin;
    const token = gearToken;
    for (const piece of gearPiecesFor(skin)) {
      void sceneFor(piece.file).then(scene => {
        if (disposed || token !== gearToken || !scene) return;
        const mount = nodes.get(piece.mount);
        if (!mount) return;
        scene.position.set(...piece.offset);
        scene.rotation.set(0, piece.turn, 0);
        scene.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
        const item = {object: scene, replaced: null};
        // Replace the mount's own blades: hide them, keep the new ones on the same hub.
        if (piece.replaces) { item.replaced = mount.children.filter(child => child.visible); for (const child of item.replaced) child.visible = false; }
        mount.add(scene);
        placed.push(item);
        if (piece.id === 'searchlight') addCone(scene);
      }).catch(error => console.warn(`Kestrel One's ${piece.id} did not load: ${String(error?.message || error)}`));
    }
  }
  // The searchlight's beam, drawn only while the light is on (view.skins.night.lightOn).
  let coneGeometry = null, coneMaterial = null;
  function addCone(scene) {
    const beam = scene.getObjectByName('beam');
    if (!beam) return;
    if (!coneGeometry) {
      coneGeometry = new THREE.ConeGeometry(9, 40, 20, 1, true);
      coneGeometry.translate(0, -20, 0);
      coneMaterial = new THREE.MeshBasicMaterial({color: 0xfff2cf, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, fog: false});
    }
    cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.name = 'Searchlight beam';
    cone.visible = coneOn;
    beam.add(cone);
  }

  // ---- the frame ----

  function deactivate() {
    if (!active) return;
    active = false; worn = null; gearFor = null; lastDirt = [-1, -1, -1, -1];
    clearGear();
    useClones(false);
    if (doorPatches) for (const patch of doorPatches) patch.visible = false;
  }

  return {
    // The Kestrel One model once it is loaded (the same call the rank paint gets), and the nodes
    // gear hangs from.
    attach(next, {rotor = null, hook = null} = {}) {
      model = next;
      paintSlots.length = 0; nodes.clear(); clones = false;
      nodes.set('main_rotor', rotor ?? next.getObjectByName('main_rotor'));
      nodes.set('cable_hook', hook ?? next.getObjectByName('cable_hook'));
      for (const name of ['mount_nose', 'mount_belly', 'mount_side_right']) nodes.set(name, next.getObjectByName(name));
      next.traverse(object => {
        if (!object.isMesh) return;
        const list = Array.isArray(object.material) ? object.material : [object.material];
        list.forEach((material, index) => {
          const role = ROLE_NAMES.indexOf(PAINT_MATERIALS[material.name]);
          if (role >= 0) paintSlots.push({mesh: object, index: Array.isArray(object.material) ? index : -1, role, base: material, clone: null});
        });
      });
      active = false; worn = null; gearFor = null; placed = [];
    },
    // view.skins for this frame, or null when the switch is off. A coat this file does not paint
    // (the logbook's rank coats) draws nothing here.
    update(skins, dt = 1 / 60) {
      if (!model || disposed) return;
      const next = skins && paintOf(skins.worn) ? skins.worn : null;
      if (!next) { deactivate(); return; }
      const first = !active;
      if (first) { active = true; worn = null; fade = 1; }
      const dirt = skins.dirt;
      let changed = false;
      for (let i = 0; i < 4; i++) {
        const level = dirt?.[DIRT_KINDS[i]] ?? 0;
        if (level !== lastDirt[i]) { changed = true; lastDirt[i] = level; }
      }
      if (changed) setDirt(dirt);
      if (worn !== next) { worn = next; fitGear(next); retarget(first); if (first) { cover.now = cover.to.slice(); film.now = film.to; apply(0); } }
      else if (changed) retarget(false);
      const lit = skins.night?.lightOn === true;
      if (cone && lit !== coneOn) { coneOn = lit; cone.visible = lit; }
      if (!settled) apply(dt);
    },
    // For tests and the look checks: what is drawn right now.
    state() {
      return {active, worn, clones, gear: placed.map(item => item.object.name), settled, fade,
        colours: colours.map(slot => slot.now.getHexString()), camo: camo.now, decal: decal.now,
        cover: [...cover.now], film: film.now, patches: doorPatches?.length ?? 0, textures: Object.keys(textures)};
    },
    paintSlots, nodes,
    dispose() {
      disposed = true;
      deactivate();
      for (const slot of paintSlots) slot.clone?.dispose();
      for (const texture of Object.values(textures)) texture.dispose?.();
      for (const patch of doorPatches ?? []) { patch.parent?.remove(patch); patch.geometry.dispose(); }
      decalMaterial?.dispose(); coneGeometry?.dispose(); coneMaterial?.dispose();
      for (const promise of scenes.values()) void promise.then(scene => scene?.traverse(object => {
        object.geometry?.dispose?.();
        for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) material.dispose?.();
      }), () => {});
      paintSlots.length = 0; nodes.clear(); model = null;
    },
  };
}
