// The underwater look in one place: sunlight and skylight, soft haze that
// matches the water, colour that changes with depth, slanting light shafts,
// the rippling surface seen from below, drifting specks, and the reflections
// that make a car's paint and silver fish read as real.
//
// It is generic: nothing here names a place. A scene creates one, calls
// update(camera, seconds) every frame, and passes materials through patch().
// Nothing here touches race state.
import * as THREE from 'three';
import { causticStrengthAt, exposureAt, lightShaftStrengthAt, sightFadeAt } from './depth-colour.js';
import { lookQuality } from './look-quality.js';
import { createLightShafts } from './light-shafts.js';
import { createMarineSnow } from './marine-snow.js';
import { createWaterDome, createWaterSurface } from './water-surface.js';
import { createWaterUniforms, patchWaterMaterial } from './water-shader.js';

// A soft underwater sky for reflections: bright window overhead, water-coloured
// around, dark below. Built once, small.
function buildEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(10, 24, 16);
  const colours = [];
  const pos = geometry.attributes.position, c = new THREE.Color();
  const top = new THREE.Color(2.6, 3.0, 3.2), mid = new THREE.Color(0.10, 0.40, 0.46), low = new THREE.Color(0.03, 0.06, 0.06);
  for (let i = 0; i < pos.count; i++) {
    const h = pos.getY(i) / 10;
    if (h > 0) c.copy(mid).lerp(top, Math.pow(h, 2.2)); else c.copy(mid).lerp(low, Math.min(1, -h * 1.4));
    colours.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(scene, 0.04);
  pmrem.dispose();
  geometry.dispose();
  return target;
}

// Sunlit ripples on glossy paint: the clear coat reflects more than it scatters,
// so the caustic pattern is added to the paint colour directly.
export const CAUSTIC_ON_PAINT = `
  {
    vec3 uwPaintN = inverseTransformDirection(normal, viewMatrix);
    float uwFacing = max(dot(uwPaintN, uUwSun), 0.0);
    outgoingLight += diffuseColor.rgb * (uwSunCaustic(vUwPos) - 1.0) * uwFacing * 0.85;
  }`;

export function createUnderwaterLook({ renderer, scene, quality = 'high', sunDirection = [0.38, 0.86, 0.34] } = {}) {
  const profile = lookQuality(quality);
  const uniforms = createWaterUniforms();
  uniforms.uUwSun.value.set(...sunDirection).normalize();

  // Light: the sun (warm, casts shadows) and skylight scattered by the water.
  const sun = new THREE.DirectionalLight(0xffe2b4, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 140 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  const skylight = new THREE.HemisphereLight(0x8fc4d8, 0x6b5a3c, 0.8);
  scene.add(sun, sun.target, skylight);
  // The scene may be the circuit's own: remember what it had, to put it back.
  const before = { background: scene.background, environment: scene.environment, environmentIntensity: scene.environmentIntensity };
  scene.background = null;

  const environment = buildEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.55;

  const dome = createWaterDome(uniforms);
  const surface = createWaterSurface(uniforms);
  const shafts = createLightShafts(uniforms, { count: profile.lightShafts, direct: profile.pipeline === 'direct' });
  const snow = createMarineSnow(uniforms, { count: profile.snowSpecks });
  scene.add(dome.mesh, surface.mesh, shafts.mesh, snow.mesh);

  const patched = new WeakSet();
  const size = new THREE.Vector2();

  return {
    uniforms, sun, skylight, shafts, snow, surface, profile,
    // Make a lit material live under water. Safe to call twice on one material.
    patch(material, options) {
      if (patched.has(material)) return material;
      patched.add(material);
      patchWaterMaterial(material, uniforms, options);
      material.needsUpdate = true;
      return material;
    },
    // Patch every standard material under an object (a car, for instance).
    applyTo(object, options = {}) {
      object.traverse(child => {
        const list = Array.isArray(child.material) ? child.material : [child.material];
        for (const material of list) {
          if (material && material.isMeshStandardMaterial && !patched.has(material)) {
            this.patch(material, { key: `car:${material.type}`, ...options });
          }
        }
      });
    },
    // A colour cast on the water where the camera is (olive under kelp).
    setTint(rgb) { uniforms.uUwTint.value.set(rgb[0], rgb[1], rgb[2]); },
    // Keep the sun's shadows around the thing you are looking at.
    focusSun(point) {
      sun.target.position.copy(point);
      sun.position.copy(point).addScaledVector(uniforms.uUwSun.value, 90);
      sun.target.updateMatrixWorld();
    },
    update(camera, seconds) {
      camera.updateMatrixWorld();
      uniforms.uUwTime.value = seconds;
      uniforms.uUwCam.value.copy(camera.matrixWorld);
      const depth = Math.max(0, -camera.position.y);
      uniforms.uUwExposure.value = exposureAt(depth);
      uniforms.uUwExt.value.set(...sightFadeAt(depth)); // DEEP-SHALLOWS-FIX: clear water in the shallows
      uniforms.uUwCaustic.value = 1;
      surface.update(camera);
      shafts.setStrength(depth < 44 ? 1 : 0);
      shafts.update(camera);
      renderer.getDrawingBufferSize(size);
      snow.update(camera, size.y);
    },
    // Numbers a page can show.
    readout(camera) {
      const depth = Math.max(0, -camera.position.y);
      return { depth, caustics: causticStrengthAt(depth), shafts: lightShaftStrengthAt(depth), exposure: exposureAt(depth) };
    },
    dispose() {
      environment.dispose(); dome.dispose(); surface.dispose(); shafts.dispose(); snow.dispose();
      scene.remove(sun, sun.target, skylight, dome.mesh, surface.mesh, shafts.mesh, snow.mesh);
      Object.assign(scene, before);
    },
  };
}
