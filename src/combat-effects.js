import * as THREE from 'three';
import {flipbookFrameUV} from './combat-vfx-atlas.js';

const PATHS = Object.freeze({
  fire: '/assets/textures/fire-flipbook.png',
  explosion: '/assets/textures/explosion-flipbook.png',
  smoke: '/assets/textures/smoke-flipbook.png',
  muzzle: '/assets/textures/muzzle-dust.png',
});
const BURST_LIMIT = 32;
const PROJECTILE_LIMIT = 40;
const WRECK_LIMIT = 4; // Player and up to three CPU cars.
const PLANE_UV = [0, 1, 1, 1, 0, 0, 1, 0];

function selectFrame(slot, frame) {
  if (frame === slot.frame) return;
  slot.frame = frame;
  const {offset, repeat} = flipbookFrameUV(frame, slot.grid);
  const uv = slot.mesh.geometry.getAttribute('uv');
  for (let index = 0; index < 4; index++) {
    uv.setXY(index, offset.x + PLANE_UV[index * 2] * repeat.x,
      offset.y + PLANE_UV[index * 2 + 1] * repeat.y);
  }
  uv.needsUpdate = true;
}

function makeSlot(group, resources, texture, name, grid) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 1, depthWrite: false,
    side: THREE.DoubleSide, toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.visible = false;
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  // Every plane faces the active camera, including the rear-view pass.
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.quaternion.copy(camera.quaternion);
    mesh.updateMatrixWorld();
  };
  group.add(mesh);
  resources.geometries.push(geometry);
  resources.materials.push(material);
  return {mesh, grid, frame: -1};
}

function show(slot, position, {age = 0, duration = 1, size = 1,
  startFrame = 0, frameCount = 64, alpha = 1, rise = 0} = {}) {
  const phase = Math.max(0, Math.min(1, age / duration));
  const frame = Math.min(frameCount - 1,
    startFrame + Math.floor(phase * (frameCount - startFrame)));
  selectFrame(slot, frame);
  const mesh = slot.mesh;
  mesh.visible = true;
  mesh.position.set(position.x, position.y + rise, position.z);
  mesh.scale.setScalar(size);
  mesh.material.opacity = alpha * Math.min(1, (1 - phase) * 3);
}

function hide(slot) {
  slot.mesh.visible = false;
}

// The loader is intentionally dedicated to this pool. Asset failures never
// dispose a texture owned by another renderer, and no hit requests a sheet.
export function createCombatEffects({loadTexture} = {}) {
  const group = new THREE.Group();
  group.name = 'Wasteland atlas effects';
  const resources = {textures: {}, geometries: [], materials: [],
    available: true, ready: !!loadTexture};
  const loader = loadTexture || ((url, onLoaded, onError) =>
    new THREE.TextureLoader().load(url, onLoaded, undefined, onError));
  let pending = loadTexture ? 0 : Object.keys(PATHS).length;
  for (const [kind, url] of Object.entries(PATHS)) {
    const texture = loader(url, () => {
      pending--;
      if (pending === 0) resources.ready = true;
    }, () => {
      resources.available = false;
      pending--;
      if (pending === 0) resources.ready = true;
    });
    if (!texture) resources.available = false;
    else {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
    }
    resources.textures[kind] = texture || null;
  }

  const grid8 = {columns: 8, rows: 8};
  const grid2 = {columns: 2, rows: 2};
  const bursts = Array.from({length: BURST_LIMIT}, (_, index) => ({
    explosion: makeSlot(group, resources, resources.textures.explosion,
      `combat-vfx-burst-${index}-explosion`, grid8),
    smoke: makeSlot(group, resources, resources.textures.smoke,
      `combat-vfx-burst-${index}-smoke`, grid8),
    impact: makeSlot(group, resources, resources.textures.muzzle,
      `combat-vfx-burst-${index}-impact`, grid2),
  }));
  const muzzles = Array.from({length: PROJECTILE_LIMIT}, (_, index) =>
    makeSlot(group, resources, resources.textures.muzzle,
      `combat-vfx-muzzle-${index}`, grid2));
  const wrecks = Array.from({length: WRECK_LIMIT}, (_, index) => ({
    fire: makeSlot(group, resources, resources.textures.fire,
      `combat-vfx-wreck-${index}-fire`, grid8),
    explosion: makeSlot(group, resources, resources.textures.explosion,
      `combat-vfx-wreck-${index}-explosion`, grid8),
    smoke: makeSlot(group, resources, resources.textures.smoke,
      `combat-vfx-wreck-${index}-smoke`, grid8),
    age: 0,
    active: false,
  }));
  const everySlot = [...bursts.flatMap(entry => Object.values(entry)),
    ...muzzles, ...wrecks.flatMap(entry => [entry.fire, entry.explosion,
      entry.smoke])];
  let disposed = false;
  let texturesWarm = false;
  let meshesWarm = false;

  function prewarmTextures(renderer) {
    if (disposed || !resources.available || !resources.ready) return false;
    if (!texturesWarm) {
      for (const texture of Object.values(resources.textures)) {
        renderer.initTexture(texture);
      }
      texturesWarm = true;
    }
    return true;
  }

  function prewarm(renderer, camera) {
    if (!prewarmTextures(renderer)) return false;
    if (meshesWarm) return true;
    // A real draw prepares each fixed mesh/material binding before the first
    // visible hit. Compile alone does not upload geometry to WebGL.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: false, stencilBuffer: false,
    });
    const warmScene = new THREE.Scene();
    const parent = group.parent;
    const priorTarget = renderer.getRenderTarget();
    try {
      withWarmupVisibility(() => {
        warmScene.add(group);
        renderer.setRenderTarget(target);
        renderer.render(warmScene, camera);
      });
      meshesWarm = true;
    } finally {
      if (parent) parent.add(group);
      else warmScene.remove(group);
      renderer.setRenderTarget(priorTarget);
      target.dispose();
    }
    return true;
  }

  function update({state, course, dt = 0}) {
    const enabled = resources.available && resources.ready &&
      state?.mode === 'wasteland' && !!state.combat && state.status !== 'menu';
    group.visible = !!enabled;
    if (!enabled) {
      everySlot.forEach(hide);
      wrecks.forEach(entry => { entry.active = false; entry.age = 0; });
      return;
    }
    const combat = state.combat;
    bursts.forEach((entry, index) => {
      const burst = combat.bursts[index];
      const age = burst?.age ?? Infinity;
      if (!burst || !['blast', 'spark'].includes(burst.kind) ||
          age >= (burst.kind === 'spark' ? .35 : 1.4)) {
        hide(entry.explosion);
        hide(entry.smoke);
        hide(entry.impact);
        return;
      }
      if (burst.kind === 'spark') {
        hide(entry.explosion);
        hide(entry.smoke);
        show(entry.impact, burst, {age, duration: .35, size: 3.5,
          startFrame: 3, frameCount: 4});
      } else {
        hide(entry.impact);
        show(entry.explosion, burst, {age, duration: 1.4,
          size: 7 + Math.min(age, 1) * 8, startFrame: 5});
        if (age > .12) show(entry.smoke, burst, {age: age - .12,
          duration: 1.28, size: 8 + Math.min(age, 1) * 7, rise: 2 + age * 2,
          alpha: .7});
        else hide(entry.smoke);
      }
    });
    muzzles.forEach((slot, index) => {
      const projectile = combat.projectiles[index];
      if (!projectile || projectile.age >= .14) {
        hide(slot);
        return;
      }
      show(slot, projectile, {age: projectile.age, duration: .14,
        size: projectile.kind === 'bomb' ? 3 : 2.2,
        startFrame: projectile.age < .05 ? 0 : 1, frameCount: 2});
    });
    const actors = [state, ...(state.opponents || [])];
    wrecks.forEach((entry, index) => {
      const actor = actors[index];
      if (!actor?.combatWrecking) {
        entry.active = false;
        entry.age = 0;
        hide(entry.fire);
        hide(entry.explosion);
        hide(entry.smoke);
        return;
      }
      if (!entry.active) { entry.active = true; entry.age = 0; }
      else if (dt > 0 && !state.paused) entry.age += Math.min(dt, .06);
      const site = actor.combatWreckSite || actor;
      const ground = course.groundAt(site.s, site.lateral);
      const age = entry.age;
      show(entry.fire, ground, {age, duration: 3.5, size: 8,
        startFrame: 8, rise: 2});
      if (age < 1.4) show(entry.explosion, ground, {age,
        duration: 1.4, size: 10 + age * 7, startFrame: 5, rise: 2});
      else hide(entry.explosion);
      if (age > .2) show(entry.smoke, ground, {age: age - .2,
        duration: 3.3, size: 9 + Math.min(age, 2) * 4,
        rise: 3 + Math.min(age, 2) * 2, alpha: .8});
      else hide(entry.smoke);
    });
  }

  function withWarmupVisibility(callback) {
    const priorGroup = group.visible;
    const prior = everySlot.map(slot => slot.mesh.visible);
    group.visible = true;
    everySlot.forEach(slot => { slot.mesh.visible = true; });
    try { return callback(); }
    finally {
      everySlot.forEach((slot, index) => {
        slot.mesh.visible = prior[index];
      });
      group.visible = priorGroup;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    resources.geometries.forEach(geometry => geometry.dispose());
    resources.materials.forEach(material => material.dispose());
    Object.values(resources.textures).forEach(texture => texture?.dispose());
    group.removeFromParent();
    group.clear();
  }

  return {group, resources, update, prewarmTextures, prewarm,
    withWarmupVisibility, dispose,
    get available() { return resources.available && resources.ready; }};
}
