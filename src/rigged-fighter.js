import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createOnFootFigures, MAX_FIGHTER_FIGURES} from './onfoot-figures.js';

const ASSET_URL = '/assets/models/wasteland/test-fighter.glb';
const CLIPS = ['idle', 'walk', 'knockdown'];
const EMPTY = Object.freeze([]);
const DEFAULT_OPTIONS = Object.freeze({active: false, enabled: false, time: 0});

function releaseAsset(asset) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), skeletons = new Set();
  asset?.scene?.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    if (node.skeleton) skeletons.add(node.skeleton);
    for (const material of [].concat(node.material || [])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  for (const item of [...skeletons, ...textures, ...materials, ...geometries]) item.dispose();
}

function validateAsset(asset) {
  let skins = 0;
  asset?.scene?.traverse(node => { if (node.isSkinnedMesh) skins++; });
  if (!skins || !CLIPS.every(name => asset.animations?.some(clip => clip.name === name)))
    throw new Error('Fighter asset needs a bound skin and idle, walk and knockdown clips.');
}

function validEntry(entry) {
  const fighter = entry?.fighter || entry;
  return Number.isFinite(fighter?.x) && Number.isFinite(fighter?.y) &&
    Number.isFinite(fighter?.z) && Number.isFinite(fighter?.yaw);
}

// Clip selection and animation time both come from the simulation snapshot.
// The fallback remains available until the complete fixed rig pool is ready.
export function createRiggedFighterFigures({
  loadAsset = () => new GLTFLoader().loadAsync(ASSET_URL),
} = {}) {
  const group = new THREE.Group();
  group.name = 'Rigged on-foot fighters';
  const fallback = createOnFootFigures();
  group.add(fallback.group);
  const figures = [];
  const roster = new Array(MAX_FIGHTER_FIGURES);
  const fallbackOptions = {active: false};
  const eye = new THREE.Vector3();
  let asset = null, attempted = false, disposed = false;
  group.userData.assetStatus = 'unrequested';
  group.userData.loadErrors = [];

  function releaseFigures() {
    for (let index = 0; index < figures.length; index++) {
      const figure = figures[index];
      figure.mixer.stopAllAction();
      figure.mixer.uncacheRoot(figure.model);
      figure.model.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
      figure.root.removeFromParent();
    }
    figures.length = 0;
  }

  function loadOnce() {
    if (attempted) return;
    attempted = true;
    group.userData.assetStatus = 'loading';
    Promise.resolve().then(loadAsset).then(loaded => {
      if (disposed) { releaseAsset(loaded); return; }
      try {
        validateAsset(loaded);
        // Prepare all skeletons and actions once, outside the update loop.
        for (let index = 0; index < MAX_FIGHTER_FIGURES; index++) makeFigure(index, loaded);
      } catch (error) {
        releaseFigures();
        releaseAsset(loaded);
        throw error;
      }
      asset = loaded;
      group.userData.assetStatus = 'ready';
    }).catch(error => {
      if (disposed) return;
      group.userData.assetStatus = 'failed';
      group.userData.loadErrors.push(String(error?.message || error));
    });
  }

  function makeFigure(index, loaded) {
    const root = new THREE.Group();
    root.name = 'rigged-fighter-' + index;
    root.visible = false;
    const model = cloneSkeleton(loaded.scene);
    root.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(loaded.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    const figure = {root, model, mixer, actions, fighter: null, local: false, clip: null};
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const range = {...mesh.geometry.drawRange};
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        const fighter = figure.fighter;
        const hidden = figure.local && fighter && camera.position.distanceToSquared(
          eye.set(fighter.x, fighter.y + 1.62, fighter.z)) < .7 ** 2;
        mesh.geometry.setDrawRange(range.start, hidden ? 0 : range.count);
      };
      mesh.onAfterRender = () => mesh.geometry.setDrawRange(range.start, range.count);
    });
    figures.push(figure);
  }

  function pose(figure, entry, time) {
    const fighter = entry.fighter || entry;
    const moving = Number.isFinite(fighter.speed) && fighter.speed > .01;
    const clip = fighter.knockedDown ? 'knockdown' : moving ? 'walk' : 'idle';
    if (figure.clip !== clip) {
      figure.mixer.stopAllAction();
      const action = figure.actions[clip];
      action.reset();
      action.setLoop(clip === 'knockdown' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = clip === 'knockdown';
      action.play();
      figure.clip = clip;
    }
    const action = figure.actions[clip];
    const clipTime = clip === 'knockdown'
      ? Math.min(action.getClip().duration, Math.max(0,
        Number.isFinite(fighter.knockdownRemaining) ? 3 - fighter.knockdownRemaining : time))
      : time;
    action.paused = false;
    action.enabled = true;
    figure.mixer.setTime(clipTime);
    figure.root.position.set(fighter.x, fighter.y, fighter.z);
    figure.root.rotation.set(0, fighter.yaw, 0);
    figure.root.visible = true;
    figure.root.userData.clip = clip;
    figure.root.userData.clipTime = clipTime;
    figure.fighter = fighter;
    figure.local = entry.local === true;
    if (!figure.root.parent) group.add(figure.root);
    figure.root.updateMatrixWorld(true);
  }

  function update(fighters = EMPTY, options = DEFAULT_OPTIONS) {
    if (disposed) return 0;
    const active = options.active === true, enabled = options.enabled === true;
    const time = Number.isFinite(options.time) ? Math.max(0, options.time) : 0;
    const entries = Array.isArray(fighters) ? fighters : EMPTY;
    let local = null, count = 0;
    // Reserve the final slot for the local fighter without temporary arrays.
    if (active) {
      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index];
        if (entry?.local && validEntry(entry)) { local = entry; break; }
      }
      const capacity = MAX_FIGHTER_FIGURES - (local ? 1 : 0);
      for (let index = 0; index < entries.length && count < capacity; index++) {
        const entry = entries[index];
        if (!entry?.local && validEntry(entry)) roster[count++] = entry;
      }
      if (local) roster[count++] = local;
    }
    for (let index = count; index < MAX_FIGHTER_FIGURES; index++) roster[index] = null;
    const show = count > 0;
    group.visible = show;
    if (show && enabled) loadOnce();
    const useRig = show && enabled && asset !== null;
    for (let index = 0; index < figures.length; index++) figures[index].root.visible = false;
    if (useRig) {
      fallback.group.visible = false;
      for (let index = 0; index < count; index++) pose(figures[index], roster[index], time);
    } else if (show) {
      fallbackOptions.active = true;
      fallback.update(roster, fallbackOptions);
    } else {
      fallback.group.visible = false;
    }
    return count;
  }

  return {group, update, dispose() {
    if (disposed) return;
    disposed = true;
    fallback.dispose();
    releaseFigures();
    releaseAsset(asset);
    group.removeFromParent();
    group.clear();
  }};
}