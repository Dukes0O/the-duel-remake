// Colour of sunlight and water at a given depth. Pure numbers, no graphics:
// the underwater look reads these, and the tests check them in Node.
//
// Depth is metres below the surface. Colours are linear red, green, blue.
// Water takes red out of daylight first, then yellow and green, which is why
// a diver's warm shallows turn blue-green and then plain blue with depth.

// How quickly each colour of daylight fades per metre of depth (clear coastal water).
export const DAYLIGHT_FADE = Object.freeze([0.115, 0.070, 0.036]);
// How quickly an object's colour is lost per metre of water between it and the eye.
// Red is mostly gone by about 30 m of water; blue lasts about 85 m.
export const SIGHT_FADE = Object.freeze([0.095, 0.058, 0.035]);
// The colour of the water itself just under the surface, lit by full daylight.
export const SURFACE_WATER = Object.freeze([0.030, 0.170, 0.160]);
// Sunlight just under the surface: warm white.
export const SUN_COLOUR = Object.freeze([1.0, 0.90, 0.74]);

// DEEP-SHALLOWS-FIX (Kyle, 28 October 2026: the shallows were incredibly hard to steer in).
// Shallow water is bright and clear: the haze that eats colour with distance is only
// SHALLOW_CLARITY of its usual strength at the eye's depth of 6 m or less, and grows back
// to full strength by 24 m, where the dark, murky water of the drop-off is as designed.
// Past FAR_FADE_START metres everything melts into the water whatever the clarity, so
// the far edge of the sea floor never shows as a line.
export const SHALLOW_CLARITY = 0.3;
export const CLEAR_UNTIL_DEPTH = 6;
export const CLOUDY_FROM_DEPTH = 24;
export const FAR_FADE_START = 70;
export const FAR_FADE_END = 140;

export const MAX_DEPTH = 40;
export const CAUSTIC_RATE = 0.17;
export const CAUSTIC_GONE_DEPTH = 28;
export const RAY_RATE = 0.06;

const clampDepth = depth => Number.isFinite(depth) ? Math.min(MAX_DEPTH, Math.max(0, depth)) : 0;
const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Share of each colour of daylight still left at this depth (1 at the surface).
export function daylightAt(depth, fade = DAYLIGHT_FADE) {
  const d = clampDepth(depth);
  return fade.map(rate => Math.exp(-rate * d));
}

// Colour of the water you see looking sideways at this depth.
export function waterColourAt(depth) {
  const light = daylightAt(depth);
  return SURFACE_WATER.map((value, i) => value * light[i]);
}

// Sunlight colour reaching this depth.
export function sunlightAt(depth) {
  const light = daylightAt(depth);
  return SUN_COLOUR.map((value, i) => value * light[i]);
}

const luminance = rgb => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

// A diver's eye (and a camera) adapts: the deep stays readable, but never as
// bright as the shallows. Returns a gain from 1 at the surface upward.
export function exposureAt(depth) {
  const light = luminance(daylightAt(depth));
  return Math.pow(1 / Math.max(light, 0.08), 0.28);
}

// How strongly sunlight ripples (caustics) dance on the floor and the car.
// Strong in the shallows, gone in the deep.
export function causticStrengthAt(depth) {
  const d = clampDepth(depth);
  return Math.exp(-CAUSTIC_RATE * d) * (1 - smoothstep(CAUSTIC_GONE_DEPTH - 12, CAUSTIC_GONE_DEPTH, d));
}

// How visible the slanting shafts of light are at this depth.
export function lightShaftStrengthAt(depth) {
  const d = clampDepth(depth);
  return Math.exp(-RAY_RATE * d) * (1 - smoothstep(24, 40, d));
}

// How much of the usual haze there is at the eye's depth: SHALLOW_CLARITY in the
// shallows, rising smoothly to 1 (the original, murky water) in the deep.
export function clarityAt(depth) {
  const t = smoothstep(CLEAR_UNTIL_DEPTH, CLOUDY_FROM_DEPTH, clampDepth(depth));
  return SHALLOW_CLARITY + (1 - SHALLOW_CLARITY) * t;
}

// The haze rates the shaders use when the eye is at this depth, per colour.
// Pass out to reuse one array every frame.
export function sightFadeAt(depth, out = [0, 0, 0]) {
  const clarity = clarityAt(depth);
  for (let i = 0; i < 3; i++) out[i] = SIGHT_FADE[i] * clarity;
  return out;
}

// Share of an object's own colour still showing at this distance, per colour,
// when the eye is at this depth. The shader does the same sum.
export function colourKeptAt(distance, depth) {
  const far = 1 - smoothstep(FAR_FADE_START, FAR_FADE_END, Math.max(0, distance));
  return sightFadeAt(depth).map(rate => Math.exp(-rate * Math.max(0, distance)) * far);
}

// How far you can see (metres) before the water is 95% of what you see, per colour.
export function sightRange(fade = SIGHT_FADE) {
  return fade.map(rate => 3 / rate);
}

// A light view of the whole table at a set of depths, for notes and tests.
export function depthTable(depths = [0, 5, 10, 20, 30]) {
  return depths.map(depth => ({
    depth,
    daylight: daylightAt(depth),
    water: waterColourAt(depth),
    caustics: causticStrengthAt(depth),
    shafts: lightShaftStrengthAt(depth),
    exposure: exposureAt(depth),
  }));
}
