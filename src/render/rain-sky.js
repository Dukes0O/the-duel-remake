// FAR-RAIN: the sky closes over. The scene lighting hands its settings for the frame to `apply`, which mixes them toward
// the rain's grey look by how far the rain has come (`amount`, 0 to 1). At 0 it returns the same settings untouched, so a
// place without rain is lit exactly as before. At night the rain's colours are scaled down by how dark the scene already
// is, so rain never lights up a night.
import * as THREE from 'three';
import {RAIN_LOOK} from './rain-look.js';

const COLOURS = ['fog', 'top', 'horizon', 'ground', 'sunColor', 'cloudTint'];
const luminance = colour => colour.r * .2126 + colour.g * .7152 + colour.b * .0722;

export function createRainSky(look = RAIN_LOOK.sky) {
  const from = new THREE.Color(), to = new THREE.Color();
  const read = (colour, value) => Array.isArray(value) ? colour.setRGB(value[0], value[1], value[2]) : colour.set(value);
  const dayFog = luminance(new THREE.Color(look.dayFog));
  const out = {}, mixed = Object.fromEntries(COLOURS.map(key => [key, [0, 0, 0]]));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sky = {
    amount: 0,
    apply(settings) {
      const t = Math.max(0, Math.min(1, sky.amount));
      if (!(t > 0) || !settings) return settings;
      for (const key of Object.keys(out)) delete out[key];
      Object.assign(out, settings);
      const dark = Math.max(.04, Math.min(1, luminance(read(from, settings.fog)) / dayFog));
      for (const key of COLOURS) {
        if (settings[key] == null) continue;
        read(from, settings[key]); read(to, look[key]).multiplyScalar(dark);
        const target = mixed[key];
        target[0] = lerp(from.r, to.r, t); target[1] = lerp(from.g, to.g, t); target[2] = lerp(from.b, to.b, t);
        out[key] = target;
      }
      const scale = (key, share) => { if (Number.isFinite(settings[key])) out[key] = settings[key] * lerp(1, share, t); };
      scale('sun', look.sunShare); scale('hemi', look.hemiShare); scale('env', look.envShare); scale('sunStrength', look.sunStrengthShare);
      if (Number.isFinite(settings.exposure)) out.exposure = lerp(settings.exposure, look.exposure, t);
      if (Number.isFinite(settings.bloom)) out.bloom = lerp(settings.bloom, Math.min(settings.bloom, look.bloom), t);
      if (Number.isFinite(settings.fogNear)) out.fogNear = lerp(settings.fogNear, Math.min(settings.fogNear, look.fogNear), t);
      if (Number.isFinite(settings.fogFar)) out.fogFar = lerp(settings.fogFar, Math.min(settings.fogFar, look.fogFar), t);
      if (Number.isFinite(settings.cloudCover)) out.cloudCover = lerp(settings.cloudCover, Math.max(settings.cloudCover, look.cloudCover), t);
      return out;
    },
  };
  return sky;
}
