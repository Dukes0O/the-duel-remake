// Shared shader code that makes anything look like it is under water.
//
//  * Daylight loses its red first, then its green, the deeper a thing sits.
//  * Colour is lost with distance from the eye, per colour, and replaced by the
//    colour of the water itself: soft exponential haze, never a wall.
//  * Sunlight ripples (caustics) fall on lit surfaces, strong in the shallows
//    and gone in the deep. Headlights keep their own colour at any depth.
//
// Standard lit materials get this through patchWaterMaterial(); the ceiling,
// light shafts, fish and specks write their own shaders with WATER_GLSL.
import * as THREE from 'three';
import { DAYLIGHT_FADE, FAR_FADE_END, FAR_FADE_START, SIGHT_FADE, SURFACE_WATER } from './depth-colour.js';

// One set of values shared by every material, updated once per frame.
export function createWaterUniforms() {
  return {
    uUwTime: { value: 0 },
    uUwCam: { value: new THREE.Matrix4() },
    uUwKd: { value: new THREE.Vector3(...DAYLIGHT_FADE) },
    uUwExt: { value: new THREE.Vector3(...SIGHT_FADE) },
    uUwWater: { value: new THREE.Vector3(...SURFACE_WATER) },
    uUwSun: { value: new THREE.Vector3(0.26, 0.92, 0.30).normalize() },
    uUwExposure: { value: 1 },
    uUwCaustic: { value: 1 },
    // Colour cast of the water here, for example olive-green under a kelp canopy.
    uUwTint: { value: new THREE.Vector3(1, 1, 1) },
  };
}

// Declarations and helpers, written into fragment shaders.
export const WATER_GLSL = /* glsl */`
uniform float uUwTime;
uniform mat4 uUwCam;
uniform vec3 uUwKd;
uniform vec3 uUwExt;
uniform vec3 uUwWater;
uniform vec3 uUwSun;
uniform float uUwExposure;
uniform float uUwCaustic;
uniform vec3 uUwTint;

float uwHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float uwNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(uwHash(i), uwHash(i + vec2(1.0, 0.0)), f.x),
             mix(uwHash(i + vec2(0.0, 1.0)), uwHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float uwHash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.x + p.y) * p.z);
}
float uwNoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(uwHash3(i), uwHash3(i + vec3(1,0,0)), f.x), mix(uwHash3(i + vec3(0,1,0)), uwHash3(i + vec3(1,1,0)), f.x), f.y);
  float b = mix(mix(uwHash3(i + vec3(0,0,1)), uwHash3(i + vec3(1,0,1)), f.x), mix(uwHash3(i + vec3(0,1,1)), uwHash3(i + vec3(1,1,1)), f.x), f.y);
  return mix(a, b, f.z);
}

// Share of each colour of daylight left at world height y (the surface is y = 0).
vec3 uwLight(float y) { return exp(-uUwKd * max(-y, 0.0)) * uUwTint; }

// Colour of the water seen looking sideways at height y.
vec3 uwWaterAt(float y) { return uUwWater * uwLight(y); }

// Haze: an object lit to 'lit' at height y, seen from the camera dist metres away.
vec3 uwHaze(vec3 lit, float dist, float y) {
  float camY = uUwCam[3].y;
  // Shallow water is clear (uUwExt is the haze rate for the eye's depth), but past a
  // set distance everything melts into the water, so no far edge of the ground shows.
  vec3 keep = exp(-uUwExt * dist) * (1.0 - smoothstep(${FAR_FADE_START.toFixed(1)}, ${FAR_FADE_END.toFixed(1)}, dist));
  // The haze is the water along the ray, up to about 45 m of it: the same
  // colour the open-water background shows in that direction, so far things
  // melt into it with no visible edge.
  float rise = (y - camY) / max(dist, 0.001);
  return lit * keep + uwWaterAt(camY + rise * min(dist, 45.0)) * (vec3(1.0) - keep);
}

// The colour of open water in a direction, as the background and the far
// edge of everything fade into it. About 45 m of sight along the ray.
vec3 uwWaterDome(vec3 dir) {
  float camY = uUwCam[3].y;
  float d = clamp(-camY - dir.y * 45.0, 0.0, 60.0);
  return uUwWater * exp(-uUwKd * d) * uUwTint;
}

// Rippling sunlight pattern, repeating; bright lines on a darker field.
float uwCausticPattern(vec2 uv, float t, const int steps) {
  vec2 p = mod(uv * 6.28318530718, 6.28318530718) - 250.0;
  vec2 i = p;
  float c = 1.0;
  const float inten = 0.005;
  for (int n = 0; n < steps; n++) {
    float tt = t * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
  }
  c /= float(steps);
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.5);
}

// Strength of caustics at a world position and the pattern, as a light multiplier.
float uwSunCaustic(vec3 pos) {
  float depth = max(-pos.y, 0.0);
  float amount = exp(-depth * 0.17) * (1.0 - smoothstep(16.0, 28.0, depth)) * uUwCaustic;
  if (amount < 0.01) return 1.0;
  // Follow the slanting sunlight up to the surface so the pattern holds still on the floor.
  vec2 uv = pos.xz + uUwSun.xz / max(uUwSun.y, 0.25) * depth;
  // Fine network of bright lines, finer in the shallows where the surface is close.
  float scale = mix(1.05, 0.55, smoothstep(2.0, 14.0, depth));
  float a = uwCausticPattern(uv * scale, uUwTime * 0.55, 4);
  float b = uwCausticPattern(uv * scale * 0.73 + vec2(3.7, 1.9), uUwTime * 0.47 + 2.0, 3);
  // Thin bright filaments on a darker field, strong in the shallows.
  float c = clamp(sqrt(a * b) * 2.6 + (a + b) * 0.45, 0.0, 3.2);
  return mix(1.0, 0.12 + 2.9 * c, amount);
}
`;

const VERTEX_PARS = /* glsl */`
uniform mat4 uUwCam;
varying vec3 vUwPos;
`;

const FRAGMENT_PARS_VARYING = /* glsl */`
varying vec3 vUwPos;
`;

// Sand ripples: crests with a little wander, height and its slope.
const RIPPLE_GLSL = /* glsl */`
vec3 uwSandRipple(vec2 p) {
  vec2 warp = vec2(sin(p.y * 0.31 + p.x * 0.12) + sin(p.x * 0.23 - p.y * 0.17),
                   cos(p.x * 0.27 + p.y * 0.09) + cos(p.y * 0.21));
  vec2 q = p + warp * 0.55;
  // Spacing wanders with a bounded phase offset (a position-dependent spacing
  // multiplied by a distance of hundreds of metres would alias badly).
  const float f = 9.0;
  float ph = q.y * f + 6.0 * uwNoise(p * 0.22) + 1.8 * sin(q.x * 0.8);
  // Ripples too fine for the pixels to resolve (far away, or seen at a grazing
  // angle) fade out instead of shimmering.
  float resolve = 1.0 - smoothstep(0.45, 1.1, fwidth(ph));
  float h = sin(ph) * 0.85 + sin(ph * 2.0 + 1.0) * 0.15;
  float s = cos(ph) * 0.85 + cos(ph * 2.0 + 1.0) * 0.30;
  return vec3(h, s * 1.8 * 0.8 * cos(q.x * 0.8), s * f) * resolve;
}
`;

// Replace chunk text safely: complain loudly in development if three changes.
function replaceOnce(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Underwater shader patch: ${label} not found (three.js changed?)`);
  return source.replace(search, replacement);
}

// Add the caustic ripple to the sun, and keep lamps their own colour at depth.
function patchLightChunk(chunk) {
  let out = '', rest = chunk;
  const call = 'RE_Direct( directLight,';
  for (;;) {
    const at = rest.indexOf(call);
    if (at < 0) { out += rest; break; }
    const before = rest.slice(0, at);
    const lastSun = before.lastIndexOf('getDirectionalLightInfo');
    const lastSpot = before.lastIndexOf('getSpotLightInfo');
    const lastPoint = before.lastIndexOf('getPointLightInfo');
    let extra = '';
    if (lastSun > lastSpot && lastSun > lastPoint) extra = 'directLight.color *= uwSunCaustic(vUwPos);\n';
    else if (lastSpot >= 0 || lastPoint >= 0) extra = 'directLight.color *= uwLampGain();\n';
    out += before + extra + call;
    rest = rest.slice(at + call.length);
  }
  return out;
}

// Make a lit material (MeshStandardMaterial) live under water.
//   key          unique name for this variant (program cache)
//   ripples      sand ripples in the normal and a little grain in the colour
//   rock         mottled, bumpy rock colour from 3D noise
//   vertexSway   GLSL run after begin_vertex (moves 'transformed')
//   vertexPars   GLSL declarations for the vertex shader
//   translucent  light shining through thin leaves (0 = off)
//   fragmentExtra GLSL run on the lit colour (outgoingLight) before depth and haze
export function patchWaterMaterial(material, uniforms, { key = 'plain', ripples = false, rock = false, vertexPars = '', vertexSway = '', translucent = 0, fragmentExtra = '' } = {}) {
  material.fog = false;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    let vs = shader.vertexShader, fs = shader.fragmentShader;
    vs = replaceOnce(vs, '#include <common>', `#include <common>\n${VERTEX_PARS}${vertexPars}`, 'vertex common');
    if (ripples) vs = replaceOnce(vs, '#include <common>', '#include <common>\nattribute float aSand;\nvarying float vSand;', 'vertex sand');
    if (ripples) vs = replaceOnce(vs, '#include <begin_vertex>', '#include <begin_vertex>\nvSand = aSand;', 'vertex sand copy');
    if (vertexSway) vs = replaceOnce(vs, '#include <begin_vertex>', `#include <begin_vertex>\n${vertexSway}`, 'vertex sway');
    vs = replaceOnce(vs, '#include <project_vertex>', '#include <project_vertex>\nvUwPos = (uUwCam * mvPosition).xyz;', 'vertex position');

    const lampGain = `vec3 uwLampGain() { return min(vec3(1.0) / uwLight(vUwPos.y), vec3(400.0)); }`;
    fs = replaceOnce(fs, '#include <common>', `#include <common>\n${FRAGMENT_PARS_VARYING}${WATER_GLSL}\n${lampGain}\n${ripples ? 'varying float vSand;\n' + RIPPLE_GLSL + ' vec3 uwRippleCache;' : ''}`, 'fragment common');
    fs = replaceOnce(fs, '#include <lights_fragment_begin>', patchLightChunk(THREE.ShaderChunk.lights_fragment_begin), 'lights');
    if (ripples) {
      // Detail is only worked out where it can show: near the camera. Far sand
      // takes the colour baked into the mesh.
      fs = replaceOnce(fs, '#include <color_fragment>', `#include <color_fragment>
        uwRippleCache = vec3(0.0);
        float uwSandNear = 1.0 - smoothstep(26.0, 90.0, length(vViewPosition));
        if (uwSandNear > 0.0) {
          vec3 rip = uwSandRipple(vUwPos.xz);
          uwRippleCache = rip;
          float grainFade = 1.0 - smoothstep(0.5, 1.2, fwidth(vUwPos.x * 41.0) + fwidth(vUwPos.z * 41.0));
          float grain = mix(0.5, uwNoise(vUwPos.xz * 41.0), grainFade);
          float mottle = uwNoise(vUwPos.xz * 1.7);
          // Shell grit: sparse pale flecks and dark grains, only where the pixels can show them.
          vec2 cell = floor(vUwPos.xz * 52.0);
          float h1 = uwHash(cell), h2 = uwHash(cell + 17.0);
          float grit = (h1 > 0.972 ? 0.75 : 0.0) - (h2 > 0.965 ? 0.45 : 0.0);
          diffuseColor.rgb *= (0.8 + 0.4 * mottle) * (1.0 + (rip.x * 0.20 + (grain - 0.5) * 0.30 + grit * grainFade) * uwSandNear * vSand);
        }`, 'fragment colour');
      fs = replaceOnce(fs, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (uwSandNear > 0.0) {
          vec3 wn = inverseTransformDirection(normal, viewMatrix);
          wn = normalize(wn + vec3(-uwRippleCache.y, 0.0, -uwRippleCache.z) * 0.050 * uwSandNear * vSand);
          normal = normalize(transformDirection(wn, viewMatrix));
        }`, 'fragment normal');
    }
    if (rock) {
      fs = replaceOnce(fs, '#include <color_fragment>', `#include <color_fragment>
        {
          vec3 wp = vUwPos * 2.6;
          float m = uwNoise3(wp) * 0.5 + uwNoise3(wp * 2.7) * 0.3 + uwNoise3(wp * 7.1) * 0.2;
          float growth = smoothstep(0.35, 0.8, uwNoise3(vUwPos * 0.9 + 4.0));
          diffuseColor.rgb *= 0.55 + 0.9 * m;
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.80, 1.05, 0.62), growth * 0.55);
        }`, 'rock colour');
      fs = replaceOnce(fs, '#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec3 wp = vUwPos * 5.0;
          float n0 = uwNoise3(wp);
          vec3 g = vec3(uwNoise3(wp + vec3(0.4, 0, 0)) - n0, uwNoise3(wp + vec3(0, 0.4, 0)) - n0, uwNoise3(wp + vec3(0, 0, 0.4)) - n0);
          vec3 wn = inverseTransformDirection(normal, viewMatrix);
          wn = normalize(wn - g * 0.9 * (1.0 - smoothstep(10.0, 40.0, length(vViewPosition))));
          normal = normalize(transformDirection(wn, viewMatrix));
        }`, 'rock normal');
    }
    const through = translucent > 0 ? `
        {
          vec3 uwEye = normalize(vUwPos - uUwCam[3].xyz);
          float uwThrough = pow(max(dot(uUwSun, uwEye), 0.0), 2.2) + 0.04;
          outgoingLight += diffuseColor.rgb * vec3(0.95, 0.80, 0.30) * uwThrough * ${translucent.toFixed(2)};
        }` : '';
    fs = replaceOnce(fs, '#include <opaque_fragment>', `${through}
      ${fragmentExtra}
      {
        vec3 uwOwn = totalEmissiveRadiance;
        vec3 uwLit = (outgoingLight - uwOwn) * uwLight(vUwPos.y) + uwOwn;
        outgoingLight = uwHaze(uwLit, length(vViewPosition), vUwPos.y) * uUwExposure;
      }
      #include <opaque_fragment>`, 'fragment finish');
    shader.vertexShader = vs;
    shader.fragmentShader = fs;
  };
  material.customProgramCacheKey = () => `uw:${key}`;
  return material;
}

// Move kelp and grass in a shadow pass the same way as in the picture.
export function patchWaterDepthMaterial(material, uniforms, { key = 'plain', vertexPars = '', vertexSway = '' } = {}) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    let vs = shader.vertexShader;
    vs = replaceOnce(vs, '#include <common>', `#include <common>\n${vertexPars}`, 'depth common');
    vs = replaceOnce(vs, '#include <begin_vertex>', `#include <begin_vertex>\n${vertexSway}`, 'depth sway');
    shader.vertexShader = vs;
  };
  material.customProgramCacheKey = () => `uwd:${key}`;
  return material;
}
