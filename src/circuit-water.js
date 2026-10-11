// Water and the wet look of a circuit by night: a flat sheet over each basin the
// circuit sinks into the ground (`basins` on its definition, src/basins.js),
// with a faint swell and a glitter path toward the moon, and soft coloured pools
// on the road under lanterns and neon (`wetRoad`). Drawing only: nothing here
// changes race state, and nothing here is a kit piece (the kit loader owns those).
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';

// The moon of P4-DAYNIGHT (src/atmosphere.js): fixed in the sky, west and low.
const MOON = new THREE.Vector3(-.97, .18, .16).normalize();

function waterMaterial(night) {
  const time = { value: 0 }, moon = { value: MOON };
  const material = new THREE.MeshStandardMaterial({ name: 'Harbour water', color: night ? 0x0b2433 : 0x2b6a7a, roughness: .16, metalness: .55,
    transparent: true, opacity: .93, emissive: night ? 0x04101a : 0x000000 });
  material.customProgramCacheKey = () => 'circuit-water-v1';
  material.onBeforeCompile = shader => {
    shader.uniforms.waterTime = time; shader.uniforms.waterMoon = moon;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWaterWorld;\nuniform float waterTime;\nuniform vec3 waterMoon;')
      .replace('#include <normal_fragment_maps>', `
        vec2 sea=vWaterWorld.xz;
        float a=dot(sea,vec2(.17,.23))-waterTime*.7, b=dot(sea,vec2(.41,-.19))-waterTime*1.1;
        vec2 slope=cos(a)*vec2(.05,.07)+cos(b)*vec2(.04,-.03);
        normal=normalize(mat3(viewMatrix)*normalize(vec3(-slope.x,1.0,-slope.y)));
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 toCamera=normalize(cameraPosition-vWaterWorld);
        vec3 mirror=reflect(-toCamera,normalize(vec3(-slope.x,1.0,-slope.y)));
        float glitter=pow(max(dot(mirror,waterMoon),0.0),90.0);
        totalEmissiveRadiance+=vec3(.55,.68,.9)*glitter*${night ? '1.2' : '0.0'};
      `);
  };
  return { material, time };
}

export function addCircuitWater(group, course) {
  const basins = course.def.basins;
  if (!basins?.length) return null;
  const night = course.def.timeOfDay === 'night' || course.def.lightPath?.keyframes?.[0]?.look === 'night';
  const { material, time } = waterMaterial(night);
  for (const basin of basins) {
    const side = basin.side < 0 ? -1 : 1, near = basin.from + basin.edge * .4, far = basin.to - basin.edge * .2;
    const steps = Math.ceil((basin.s1 - basin.s0) / 10), columns = 6, positions = [], indices = [];
    for (let i = 0; i <= steps; i++) for (let j = 0; j < columns; j++) {
      const p = course.worldAt(basin.s0 + (basin.s1 - basin.s0) * i / steps, side * (near + (far - near) * j / (columns - 1)));
      positions.push(p.x, basin.level, p.z);
      if (i && j) { const a = i * columns + j; indices.push(a - columns - 1, a - 1, a - columns, a - columns, a - 1, a); }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `water-${basin.id}`; mesh.receiveShadow = false; mesh.renderOrder = -1;
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
  for (const placement of course.def.kitPlacements ?? []) {
    const colours = GLOW_COLOURS[placement.id];
    if (!colours) continue;
    const isString = placement.id === 'lantern-string';
    list.push({ s: placement.s, lateral: isString ? 0 : placement.lateral * .45, width: isString ? 10 : 4.5, length: isString ? 12 : 9,
      color: colours[(isString ? string++ : neon++) % colours.length], strength: isString ? .5 : .45 });
  }
  if (!list.length) return null;
  const positions = [], colors = [], uvs = [], indices = [], color = new THREE.Color();
  for (const glow of list) {
    const centre = course.worldAt(glow.s, glow.lateral), heading = centre.heading;
    const l = { x: Math.cos(heading), z: -Math.sin(heading) }, f = { x: Math.sin(heading), z: Math.cos(heading) };
    color.set(glow.color);
    const base = positions.length / 3;
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const x = centre.x + l.x * a * glow.width / 2 + f.x * b * glow.length / 2, z = centre.z + l.z * a * glow.width / 2 + f.z * b * glow.length / 2;
      const n = course.nearest(x, z);
      positions.push(x, course.groundAt(n.s, n.lateral).y + .07, z);
      colors.push(color.r * glow.strength, color.g * glow.strength, color.b * glow.strength); uvs.push(a, b);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setIndex(indices);
  const reduction = { value: 1 };
  const material = new THREE.ShaderMaterial({ name: 'Road glow', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexColors: true, uniforms: { reduction }, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6,
    vertexShader: 'varying vec2 vUv; varying vec3 vColour; void main(){vUv=uv;vColour=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform float reduction; varying vec2 vUv; varying vec3 vColour; void main(){float d=length(vUv*vec2(1.0,.7));float a=smoothstep(1.0,0.0,d);gl_FragColor=vec4(vColour*a*a*reduction,1.0);}' });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'road-glow'; mesh.renderOrder = 3; mesh.frustumCulled = false;
  mesh.onBeforeRender = renderer => { reduction.value = renderer.getRenderTarget() ? 1 : wet.performanceShare ?? .5; };
  group.add(mesh);
  return { pools: list.length };
}
