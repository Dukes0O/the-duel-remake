import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { createAtmosphericSky, SUN_OFFSET } from './atmosphere.js';
import { resolveLightingSettings } from './lighting-moods.js';
import { createLocalLighting } from './local-lighting.js';

// One owner for scene lights, the sky and environment targets. The renderer
// owns the composer passes and decides when pending GPU work permits disposal.
export function createSceneLighting({ scene, renderer, bloom, host }, {
  createPMREM = () => new THREE.PMREMGenerator(renderer),
  createRoom = () => new RoomEnvironment(),
  loadEnvironment = (loaded, failed) => new RGBELoader().load('/assets/textures/sunset-lighting.hdr', loaded, undefined, failed),
} = {}) {
  let stopped = false, disposed = false, course, naturalEnvironment, pmremReleased = false;
  const pmrem = createPMREM(), room = createRoom();
  const releasePMREM = () => { if (!pmremReleased) { pmremReleased = true; pmrem.dispose(); } };
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  scene.environmentIntensity = .82;
  room.dispose();
  // The studio and our 1024x512 HDR both use cube size 256. Retain the
  // prefilter's scratch target, blur program and LOD planes for the HDR instead
  // of disposing and rebuilding them; the output targets remain independent.
  loadEnvironment(texture => {
    if (stopped || pmremReleased) { texture.dispose(); releasePMREM(); return; }
    try {
      naturalEnvironment = pmrem.fromEquirectangular(texture);
      if (course?.def.theme !== 'city') scene.environment = naturalEnvironment.texture;
      host.dataset.environment = 'sunset-hdri';
    } catch {
      if (!stopped) host.dataset.environment = 'studio-fallback';
    } finally { texture.dispose(); releasePMREM(); }
  }, () => { releasePMREM(); if (!stopped) host.dataset.environment = 'studio-fallback'; });

  const hemi = new THREE.HemisphereLight(0xb2cde0, 0x714226, 1.65);
  const sun = new THREE.DirectionalLight(0xffddac, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 240 });
  sun.shadow.bias = -.00035;
  sun.shadow.normalBias = .03;
  scene.add(hemi, sun, sun.target);
  const atmosphere = createAtmosphericSky(), sky = atmosphere.sky;
  scene.add(sky);
  const localLighting = createLocalLighting(scene);
  const headlights = [-1, 1].map(side => {
    const light = new THREE.SpotLight(0xe3edff, 0, 95, .43, .55, 1.2);
    scene.add(light, light.target);
    return { light, side };
  });
  const lightColor = new THREE.Color();
  const sunOffset = new THREE.Vector3(SUN_OFFSET.x, SUN_OFFSET.y, SUN_OFFSET.z);
  const targetSun = new THREE.Vector3();

  return {
    sun,
    apply({ course: next, theme = next.def.theme, mood, blend = 1, tunnel = false }) {
      if (stopped) return;
      course = next;
      const night = theme === 'city' || course.def.timeOfDay === 'night';
      const settings = resolveLightingSettings(theme, { mood, night, tunnel });
      if (!scene.fog) scene.fog = new THREE.Fog(settings.fog, 260, 1650);
      scene.fog.color.lerp(lightColor.set(settings.fog), blend);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, settings.fogNear, blend);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, settings.fogFar, blend);
      const uniforms = sky.material.uniforms;
      uniforms.top.value.lerp(lightColor.set(settings.top), blend);
      uniforms.horizon.value.lerp(lightColor.set(settings.horizon), blend);
      uniforms.sunStrength.value = THREE.MathUtils.lerp(uniforms.sunStrength.value, settings.sunStrength, blend);
      sunOffset.lerp(targetSun.set(settings.sunOffset.x, settings.sunOffset.y, settings.sunOffset.z), blend);
      uniforms.sunDir.value.copy(sunOffset).normalize();
      uniforms.cloudCover.value = THREE.MathUtils.lerp(uniforms.cloudCover.value, settings.cloudCover, blend);
      uniforms.cloudTint.value.lerp(lightColor.setRGB(...settings.cloudTint), blend);
      hemi.groundColor.lerp(lightColor.set(settings.ground), blend);
      hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, settings.hemi, blend);
      sun.intensity = THREE.MathUtils.lerp(sun.intensity, settings.sun, blend);
      sun.color.lerp(lightColor.set(settings.sunColor), blend);
      scene.environment = night ? environment.texture : naturalEnvironment?.texture || environment.texture;
      scene.environmentIntensity = THREE.MathUtils.lerp(scene.environmentIntensity, settings.env, blend);
      renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, settings.exposure, blend);
      bloom.strength = settings.bloom;
      host.dataset.theme = theme;
      host.dataset.tunnel = String(tunnel);
      host.dataset.lightingMood = night ? 'night' : mood || 'clear';
    },
    followCamera(camera, position, seconds) {
      if (stopped) return;
      sky.position.copy(camera.position);
      atmosphere.update(seconds);
      sun.position.set(position.x + sunOffset.x, position.y + sunOffset.y, position.z + sunOffset.z);
      sun.target.position.set(position.x, position.y, position.z);
      sun.target.updateMatrixWorld();
    },
    updateVehicles({ course: current, position, player, police, distance, tall, now, high, menu }) {
      if (stopped) return;
      for (const { light, side } of headlights) {
        const heading = player.rotation.y, c = Math.cos(heading), sn = Math.sin(heading);
        light.intensity = current.tunnelAt(distance) ? 125 : current.def.timeOfDay === 'night' || current.themeAt(distance) === 'city' ? 78 : 0;
        light.position.set(position.x + c * side * .65 + sn * 1.8, position.y + (tall ? 2.2 : .72), position.z - sn * side * .65 + c * 1.8);
        light.target.position.set(position.x + sn * 40, position.y - 1, position.z + c * 40);
        light.target.updateMatrixWorld();
      }
      localLighting.update({ course: current, position, police, now, night: current.def.timeOfDay === 'night' || current.themeAt(distance) === 'city', high, menu });
    },
    // Invalidate asynchronous callbacks immediately, without releasing targets
    // that an in-flight shader compilation may still reference.
    stop() { stopped = true; },
    dispose() {
      if (disposed) return;
      stopped = disposed = true;
      releasePMREM();
      atmosphere.dispose();
      localLighting.dispose();
      scene.remove(sky, hemi, sun, sun.target);
      sky.geometry.dispose();
      sky.material.dispose();
      hemi.dispose();
      sun.dispose();
      for (const { light } of headlights) {
        scene.remove(light, light.target);
        light.dispose();
      }
      if (scene.environment === environment.texture || scene.environment === naturalEnvironment?.texture) scene.environment = null;
      environment.dispose();
      naturalEnvironment?.dispose();
    },
  };
}
