import { resolveLightingSettings } from './lighting-moods.js';

// Authored course data only. No clock, race writes, renderer objects or RNG.
const COLOURS = ['fog', 'top', 'horizon', 'ground', 'sunColor', 'cloudTint'];
const SCALARS = ['sun', 'hemi', 'env', 'fogNear', 'fogFar', 'exposure', 'bloom',
  'sunStrength', 'cloudCover', 'stars', 'moon', 'nightAmount', 'lightLevel'];
const AXES = ['x', 'y', 'z'];
const BIOMES = new Set(['desert', 'alpine', 'coast', 'arena']);
const LOOKS = new Set(['day', 'golden', 'dusk', 'night']);
const lookCache = new Map(), pathCache = new WeakMap();
const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, amount) => amount === 0 ? a : amount === 1 ? b : a + (b - a) * amount;
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const linear = channel => channel < .04045 ? channel * .0773993808 : Math.pow(channel * .9478672986 + .0521327014, 2.4);
function rgb(value) {
  const hex = typeof value === 'string' ? Number.parseInt(value.slice(1), 16) : value;
  return [linear((hex >>> 16 & 255) / 255), linear((hex >>> 8 & 255) / 255), linear((hex & 255) / 255)];
}

// Each theme retains its existing day/golden palette. A daytime city uses the
// coastal palette; the legacy city-night lookup itself is never changed.
export function lightPathLook(look, theme = 'desert', palette) {
  if (!LOOKS.has(look)) return null;
  const biome = theme === 'city' ? 'coast' : BIOMES.has(theme) ? theme : 'desert';
  const key = biome+':'+look+':'+(palette||'default');
  if (lookCache.has(key)) return lookCache.get(key);
  let value = {...resolveLightingSettings(biome, {mood: look === 'golden' ? 'golden' : 'clear'}),
    stars: 0, moon: 0, nightAmount: 0, lightLevel: look === 'golden' ? .7 : 1};
  if (look === 'dusk') value = {...value, fog: 0x505365, top: '#202944', horizon: '#b47869',
    ground: 0x303b49, sunColor: 0xefab88, sun: 0, hemi: .62, env: .08,
    fogNear: 210, fogFar: 1450, exposure: 1.06, bloom: .18, sunStrength: 0,
    sunOffset: {x: -105, y: 7, z: 73}, cloudCover: .65, cloudTint: [.39, .34, .40],
    stars: .18, moon: .3, nightAmount: .55, lightLevel: .3};
  if (look === 'night') value = {...value, fog: 0x172538, top: '#061024', horizon: '#14263d',
    ground: 0x243342, sunColor: 0xa8c2e5, sun: 0, hemi: .82, env: 0,
    fogNear: 170, fogFar: 1300, exposure: 1.02, bloom: .16, sunStrength: 0,
    sunOffset: {x: -65, y: 76, z: -90}, cloudCover: .2, cloudTint: [.12, .16, .23],
    stars: 1, moon: 1, nightAmount: 1, lightLevel: .1};
  if(palette==='mountain-sunset'&&look==='golden') value={...value,
    sunOffset:{x:-100,y:21,z:73},sunColor:0xffb86f,ground:0x797450,
    horizon:'#efb98a',hemi:1.6,env:.78};
  if(palette==='mountain-sunset'&&look==='dusk') value={...value,
    fog:0x8c808e,top:'#675278',horizon:'#df9170',ground:0x736981,
    hemi:1.35,env:.48,exposure:1.12,cloudTint:[.59,.44,.52]};
  if (palette === 'forest-morning' && look === 'golden') value = {...value,
    sunOffset: {x: -105, y: 38, z: 62}, sunColor: 0xf8ddbb,
    fog: 0xc3cecd, fogNear: 90, fogFar: 1050, top: '#7195ad', horizon: '#d9e1da',
    ground: 0x4c5945, sun: 1.45, hemi: 1.35, env: .42, exposure: 1.12, bloom: .08,
    cloudCover: .72, cloudTint: [.82, .87, .87], lightLevel: .8};
  if (palette === 'forest-morning' && look === 'day') value = {...value,
    sunOffset: {x: -76, y: 94, z: 42}, sunColor: 0xfff2dc,
    fog: 0xc3d8df, fogNear: 360, fogFar: 2400, top: '#427fa9', horizon: '#d7e4dd',
    ground: 0x4b6843, sun: 2.25, hemi: 1.45, env: .5, exposure: 1.1, bloom: .06,
    cloudCover: .28, cloudTint: [.93, .96, 1], lightLevel: 1};
  for (const field of COLOURS) value[field] = Object.freeze(field === 'cloudTint' ? [...value[field]] : rgb(value[field]));
  value.sunOffset = Object.freeze({...value.sunOffset});
  Object.freeze(value);
  lookCache.set(key, value);
  return value;
}

function validPath(path) {
  if (!path || typeof path !== 'object' || path.palette!==undefined&&path.palette!=='mountain-sunset'&&path.palette!=='forest-morning') return false;
  if (path.wrap !== undefined && (path.axis !== 'distance' || typeof path.wrap !== 'boolean')) return false;
  if (pathCache.has(path)) return pathCache.get(path);
  const frames = path.keyframes;
  let valid = (path.axis === 'distance' || path.axis === 'race-progress') && Array.isArray(frames) && frames.length > 0;
  if (valid) for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame || !Number.isFinite(frame.at) || frame.at < 0 || !LOOKS.has(frame.look) ||
        i > 0 && frame.at <= frames[i - 1].at || path.axis === 'race-progress' && frame.at > 1) { valid = false; break; }
  }
  // Frozen authored paths may be checked once. Mutable editor/test definitions
  // are revalidated so replacing a keyframe cannot retain a stale valid result.
  if (Object.isFrozen(path) && Array.isArray(frames) && Object.isFrozen(frames) && frames.every(Object.isFrozen)) pathCache.set(path, valid);
  return valid;
}

function settingsBuffer(output) {
  if (!output.settings) {
    output.settings = {sunOffset: {x: 0, y: 0, z: 0}};
    for (const key of COLOURS) output.settings[key] = [0, 0, 0];
  }
  return output.settings;
}

// Optional output belongs to the renderer. Its object, colours and vectors are
// reused on every frame. Without output, callers receive a fresh sample.
export function sampleLightPath(path, {distance = 0, raceLength, theme = 'desert', tunnel = false} = {}, output = {}) {
  if (!validPath(path) || !Number.isFinite(distance)) return null;
  if (path.axis === 'race-progress' && !(Number.isFinite(raceLength) && raceLength > 0)) return null;
  const position = path.axis === 'race-progress' ? clamp(distance / raceLength) : Math.max(0, distance);
  return sampleAt(path, position, theme, tunnel, output);
}

function sampleAt(path, position, theme, tunnel, output) {
  const frames = path.keyframes;
  let index = 0;
  while (index < frames.length - 1 && position > frames[index + 1].at) index++;
  const from = frames[index], to = frames[Math.min(index + 1, frames.length - 1)];
  const blend = from === to ? 0 : smooth((position - from.at) / (to.at - from.at));
  const a = lightPathLook(from.look, theme, path.palette), b = lightPathLook(to.look, theme, path.palette), settings = settingsBuffer(output);
  for (const key of SCALARS) settings[key] = mix(a[key], b[key], blend);
  for (const key of COLOURS) for (let i = 0; i < 3; i++) settings[key][i] = mix(a[key][i], b[key][i], blend);
  for (const key of AXES) settings.sunOffset[key] = mix(a.sunOffset[key], b.sunOffset[key], blend);
  // One presentation threshold, with a gentle 0.2-wide transition band.
  output.headlights = tunnel ? 1 : smooth((.45 - settings.lightLevel) / .2);
  if (tunnel) { settings.hemi = .32; settings.sun = .15; settings.env = .28; settings.exposure = 1.3; settings.bloom = .32; }
  return output;
}

// Native owner entry point: s remains unwrapped for race progress. Only a
// closed-road distance path wraps by default. An authored wrap:false keeps
// elapsed distance; an open-road finish keeps its final look.
export function sampleCourseLightPath(course, {distance = 0, raceLength = course?.raceLength, theme = course?.def?.theme,
  tunnel = false, menu = false} = {}, output) {
  const path = course?.def?.lightPath;
  if (!validPath(path) || !Number.isFinite(distance)) return null;
  let at = menu ? 0 : Math.max(0, distance);
  if (path.axis === 'distance') {
    if (!(Number.isFinite(course.length) && course.length > 0)) return null;
    if (path.wrap !== false) at = course.closed === false || course.def.closed === false ? Math.min(at, course.length) : at % course.length;
  }
  if (path.axis === 'race-progress' && !(Number.isFinite(raceLength) && raceLength > 0)) return null;
  const position = path.axis === 'race-progress' ? clamp(at / raceLength) : at;
  return sampleAt(path, position, theme, tunnel, output || {});
}
