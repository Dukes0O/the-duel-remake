// Water and the wet look of a circuit by night: a flat sheet over each basin the
// circuit sinks into the ground (`basins` on its definition, src/circuit-hills.js),
// with a faint swell and a glitter path toward the moon, and soft coloured pools
// on the road under lanterns and neon (`wetRoad`). Drawing only: nothing here
// changes race state, and nothing here is a kit piece (the kit loader owns those).
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';
import { lakeGeometry } from './circuit-effects.js';
import { lampLook } from './night-glows.js';
import { planWaterside } from './waterside-scenery.js';

// The moon of P4-DAYNIGHT (src/atmosphere.js): fixed in the sky, west and low.
const MOON = new THREE.Vector3(-.97, .18, .16).normalize();

// `ripple` (default 1) scales the slope of the swell: a small number is a calmer reservoir whose sky reflection is not cut into bands.
function waterMaterial(night, glitter = true, ripple = 1) {
  const time = { value: 0 }, moon = { value: MOON };
  const material = new THREE.MeshStandardMaterial({ name: 'Harbour water', roughness: .16, metalness: .55,
    transparent: true, vertexColors: true, depthWrite: false, side: THREE.DoubleSide, color: 0xffffff, emissive: night ? 0x010306 : 0x000000 });
  material.customProgramCacheKey = () => `circuit-water-v2-${night}-${glitter}` + (ripple === 1 ? '' : `-r${ripple}`);
  material.onBeforeCompile = shader => {
    shader.uniforms.waterTime = time; shader.uniforms.waterMoon = moon;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;\nuniform float waterTime;\nuniform vec3 waterMoon;')
      .replace('#include <normal_fragment_maps>', `
        vec2 sea=vWaterWorld.xz;
        float a=dot(sea,vec2(.17,.23))-waterTime*.7, b=dot(sea,vec2(.41,-.19))-waterTime*1.1;
        vec2 slope=(cos(a)*vec2(.05,.07)+cos(b)*vec2(.04,-.03))*${Number(ripple).toFixed(3)};
        normal=normalize(mat3(viewMatrix)*normalize(vec3(-slope.x,1.0,-slope.y)));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 toCamera=normalize(cameraPosition-vWaterWorld);
        vec3 mirror=reflect(-toCamera,normalize(vec3(-slope.x,1.0,-slope.y)));
        float glitter=pow(max(dot(mirror,waterMoon),0.0),90.0);
        totalEmissiveRadiance+=vec3(.55,.68,.9)*glitter*${night && glitter ? '1.2' : '0.0'};
        ${night ? `// The night sky and the far town mirrored in the water: bluest and brightest where the water lies
        // flat to the eye, with a slow warm shimmer of town lights on it.
        float grazing=pow(1.0-clamp(toCamera.y,0.0,1.0),2.5);
        totalEmissiveRadiance+=vec3(.003,.007,.017)*(.5+grazing*1.4);
        float shimmer=pow(max(sin(sea.x*.8+a*1.4)*sin(sea.y*.5-b*1.2),0.0),8.0);
        totalEmissiveRadiance+=vec3(.9,.55,.26)*shimmer*grazing*.07;` : ''}
      `);
  };
  return { material, time };
}

// Harbour and reservoir water over the circuit's basins (the same ovals that sink the
// ground, src/circuit-hills.js; the shape and level come from circuit-effects.js `lakeGeometry`).
// Only a circuit that asks for it (`water` in its definition) gets this water.
export function addCircuitWater(group, course) {
  const basins = course.def.water ? course.def.basins : null;
  if (!basins?.length) return null;
  const night = course.def.timeOfDay === 'night' || course.def.lightPath?.keyframes?.[0]?.look === 'night';
  const { material, time } = waterMaterial(night, course.def.water.glitter !== false, course.def.water.ripple ?? 1);
  for (const basin of basins) {
    const mesh = new THREE.Mesh(lakeGeometry(course, { ...basin, colour: basin.colour ?? (night ? 0x03070c : 0x1d5c6e), shallow: basin.shallow ?? (night ? 0x07131c : 0x3a8590) }), material);
    mesh.name = `water-${basin.id}`; mesh.receiveShadow = false; mesh.renderOrder = 1;
    group.add(mesh);
  }
  registerSceneSystem(group, { animate: seconds => { time.value = seconds; } });
  return { basins: basins.length };
}

// Soft pools of colour on the road under lanterns and neon, so the wet road seems to
// carry their reflections. One merged mesh drawn additively; the High preset
// draws it in full and the Performance preset at half strength (a preset that
// renders straight to the screen has no render target).
const GLOW_COLOURS = { 'lantern-string': [0xff5a2a, 0xffa02e], 'neon-sign': [0xff3a7a, 0x2fd6ff, 0xffb02e, 0x7dff6a] };

export function addRoadGlow(group, course) {
  const wet = course.def.wetRoad;
  if (!wet) return null;
  const list = [];
  let neon = 0, string = 0;
  const strings = new Set();
  for (const placement of course.def.kitPlacements ?? []) {
    const colours = GLOW_COLOURS[placement.id];
    if (!colours) continue;
    const isString = placement.id === 'lantern-string';
    // A string is several pieces side by side across the road: one pool for the whole string.
    if (isString) { const key = Math.round(placement.s); if (strings.has(key)) continue; strings.add(key); }
    list.push({ s: placement.s, lateral: isString ? 0 : placement.lateral * .45, width: isString ? 8 : 3.6, length: isString ? 9 : 7,
      color: colours[(isString ? string++ : neon++) % colours.length], strength: isString ? .075 : .045 });
  }
  // Pools under the street lamps (`streetLight`, src/night-glows.js `lampLook`): small and soft, so a
  // lamp reads as a pool of light on dark glossy asphalt and not as a coloured road.
  const lamp = course.def.streetLight;
  if (lamp) for (let i = 0, count = Math.floor(course.length / (lamp.every ?? 40)); i < count; i++) {
    const s = i * (lamp.every ?? 40);
    if ((course.themeAt?.(s) || course.def.theme) !== 'city') continue;
    const look = lampLook(lamp, s, i), half = course.roadHalfWidthAt(s);
    for (const side of [-1, 1])
      list.push({ s, lateral: side * Math.max(1, half - 3.3), width: Math.min(half * .8, lamp.poolWidth ?? 6), length: lamp.poolLength ?? 13, color: look.colour, strength: look.pool ?? .1 });
  }
  // Pools under the tall harbour lamps (src/waterside-scenery.js).
  if (course.def.waterside) for (const lamp of planWaterside(course).lamps)
    list.push({ s: lamp.s, lateral: lamp.side * Math.max(1, course.roadHalfWidthAt(lamp.s) - 3.3), width: Math.min(course.roadHalfWidthAt(lamp.s) * .8, 6), length: 13, color: lamp.colour, strength: lamp.pool });
  if (!list.length) return null;
  const positions = [], colors = [], uvs = [], indices = [], color = new THREE.Color();
  for (const glow of list) {
    // A grid that follows the road's own curve and slope (a flat quad would sink into the road on a bend or a climb).
    color.set(glow.color);
    const base = positions.length / 3, across = 4, along = 6;
    for (let j = 0; j <= along; j++) for (let i = 0; i <= across; i++) {
      const a = i / across * 2 - 1, b = j / along * 2 - 1;
      const point = course.groundAt(glow.s + b * glow.length / 2, glow.lateral + a * glow.width / 2);
      positions.push(point.x, point.y + .08, point.z);
      colors.push(color.r * glow.strength, color.g * glow.strength, color.b * glow.strength); uvs.push(a, b);
    }
    for (let j = 0; j < along; j++) for (let i = 0; i < across; i++) {
      const p = base + j * (across + 1) + i, q = p + across + 1;
      indices.push(p, p + 1, q + 1, p, q + 1, q);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  const reduction = { value: 1 };
  const material = new THREE.ShaderMaterial({ name: 'Road glow', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexColors: true, uniforms: { reduction }, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    vertexShader: 'varying vec2 vUv; varying vec3 vColour; void main(){vUv=uv;vColour=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float reduction; varying vec2 vUv; varying vec3 vColour; void main(){float d=length(vUv);float a=exp(-d*d*4.5)*(1.0-smoothstep(.5,1.0,d));gl_FragColor=vec4(vColour*a*reduction,1.0);}' });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'road-glow'; mesh.renderOrder = 3; mesh.frustumCulled = false;
  mesh.onBeforeRender = renderer => { reduction.value = renderer.getRenderTarget() ? 1 : wet.performanceShare ?? .5; };
  group.add(mesh);
  return { pools: list.length };
}
