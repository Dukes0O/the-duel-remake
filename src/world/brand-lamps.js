// The three lamps of "Light the Town" (EVERBURN-REMAKE, job 2), each the town lamp drawn by src/world/town-lamp-look.js
// with a light of its own for the ground and walls around it. Presentation reads the job, never steps it.
import * as THREE from 'three';
import {GAS_LOAD_RULE} from './jobs/gas-load-rule.js';
import {BRAND_RULE} from './jobs/brand-rule.js';
import {NIGHT_2_SITES} from './jobs/night-2-sites.js';
import {createTownLamp} from './town-lamp-look.js';

// `surface` is the scrap surface the scene already has (or a function that answers it), so that three lamps do not
// make three pictures of their own.
export const BRAND_LAMP_GLOW = Object.freeze({metres: 3.4, opacity: .6});
const NIGHT_2_LAMPS = [...NIGHT_2_SITES.lamps, ...NIGHT_2_SITES.chaseLamps];
const ALLEY_LAMPS = new Set(NIGHT_2_SITES.chaseLamps.map(place => place.id));
export function createBrandLamps({surface = null} = {}) {
  const group = new THREE.Group();
  group.name = 'Light the Town lamps';
  group.visible = false;
  const lamps = [];
  // One flat quad per dark lamp. The shader fades both sides of the ring, without a texture or extra draw calls.
  const ringShape = new THREE.PlaneGeometry(BRAND_RULE.lampRadius * 2, BRAND_RULE.lampRadius * 2).rotateX(-Math.PI / 2);
  const ringMaterial = new THREE.ShaderMaterial({
    uniforms: {radius: {value: BRAND_RULE.lampRadius}, width: {value: BRAND_RULE.lampRingWidth},
      opacity: {value: BRAND_RULE.lampRingOpacity}},
    vertexShader: `varying vec2 vGround; void main() { vGround=position.xz;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vGround; uniform float radius; uniform float width; uniform float opacity;
      void main() { float edge=abs(length(vGround)-(radius-width*.5))/(width*.5);
        gl_FragColor=vec4(1.0,.74,.34,opacity*(1.0-smoothstep(0.0,1.0,edge))); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  });
  let places = null, seconds = 0;
  // A lit lamp is seen from across the town by the glow round its lantern: one soft round patch that always faces the
  // view, added to what is behind it (the ending is watched from 80 m, where the lantern itself is a few pixels).
  const glowMap = (() => {
    const size = 32, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const away = Math.min(1, Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1)), value = Math.pow(1 - away, 2.4), index = (y * size + x) * 4;
      data[index] = data[index + 1] = data[index + 2] = Math.round(value * 255); data[index + 3] = 255;
    }
    const map = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    map.magFilter = map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
    return map;
  })();
  const glowMaterials = [];
  function clear() {
    for (const lamp of lamps) lamp.look.dispose();
    for (const material of glowMaterials.splice(0)) material.dispose();
    lamps.length = 0;
    group.clear();
  }
  return {group,
    update(worldJob) {
      const step = worldJob?.job?.steps?.[worldJob.job.stepIndex];
      const chapter = worldJob?.night2;
      group.visible = Boolean(chapter || step?.brand || step?.gasLoad);
      if (!group.visible) return;
      const sites = chapter ? NIGHT_2_LAMPS : step.gasLoad ? step.gasLamps : step.places;
      if (places !== sites) {
        clear();
        places = sites;
        (places ?? []).forEach((place, index) => {
          const lamp = new THREE.Group();
          lamp.name = `Town lamp: ${place.id}`;
          lamp.position.set(place.position.x, place.position.y, place.position.z);
          // Each lamp's arm points a different way, as lamps put up by hand over the years would.
          const turn = index * 2.1 + .4;
          const look = createTownLamp({seed: index + 1, surface: typeof surface === 'function' ? surface() : surface});
          look.group.rotation.y = turn;
          lamp.add(look.group);
          const glow = new THREE.PointLight(0xffa64a, 0, BRAND_RULE.lanternLightRadius);
          glow.position.set(look.lantern.x * Math.cos(turn) + look.lantern.z * Math.sin(turn), look.lantern.y,
            look.lantern.z * Math.cos(turn) - look.lantern.x * Math.sin(turn));
          lamp.add(glow);
          const haloMaterial = new THREE.SpriteMaterial({map: glowMap, color: 0xffa24a, blending: THREE.AdditiveBlending,
            transparent: true, opacity: 0, depthWrite: false, fog: false});
          glowMaterials.push(haloMaterial);
          const halo = new THREE.Sprite(haloMaterial);
          halo.name = `Glow of the town lamp: ${place.id}`;
          halo.position.copy(glow.position);
          halo.scale.setScalar(BRAND_LAMP_GLOW.metres);
          halo.visible = false;
          lamp.add(halo);
          const ring = new THREE.Mesh(ringShape, ringMaterial);
          ring.name = `Lighting circle: ${place.id}`;
          ring.position.y = BRAND_RULE.lampRingLift;
          ring.visible = false;
          lamp.add(ring);
          group.add(lamp);
          lamps.push({id: place.id, look, glow, halo, ring, lit: false});
        });
      }
      for (const lamp of lamps) {
        const alleyLamp = chapter?.night && ALLEY_LAMPS.has(lamp.id);
        const watchLamp = chapter?.night && chapter.answer === 'watch' && lamp.id === 'pump';
        lamp.lit = step?.gasLoad || alleyLamp || watchLamp || chapter?.lamps[lamp.id] || worldJob.job.stepState.lamps?.[lamp.id] === true;
        lamp.brightness = step?.gasLoad ? GAS_LOAD_RULE.lampBeforeGasShare + (1 - GAS_LOAD_RULE.lampBeforeGasShare) * (worldJob.forgeGasShare ?? 0) : 1;
        lamp.look.setLit(lamp.lit, seconds, lamp.brightness);
        lamp.glow.intensity = lamp.lit ? (alleyLamp ? 120 : chapter ? 155 : 10) * lamp.brightness : 0;
        lamp.glow.distance = alleyLamp ? 32 : chapter ? 34 : BRAND_RULE.lanternLightRadius;
        lamp.halo.visible = lamp.lit;
        lamp.ring.visible = step?.brand === true && (!chapter || step.places.some(place => place.id === lamp.id)) && !lamp.lit && worldJob.job.stepState.brandSeconds > 0 && !worldJob.job.stepState.townEnding;
        lamp.halo.material.opacity = lamp.lit ? BRAND_LAMP_GLOW.opacity * lamp.brightness : 0;
      }
    },
    // The scene's own clock: the flame's flicker and the half second a lamp takes to come up.
    animate(now) {
      seconds = now;
      if (group.visible) for (const lamp of lamps) lamp.look.setLit(lamp.lit, now, lamp.brightness);
    },
    dispose() { clear(); glowMap.dispose(); ringShape.dispose(); ringMaterial.dispose(); },
  };
}
