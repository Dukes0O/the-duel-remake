import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createOnFootFigures, MAX_FIGHTER_FIGURES} from './onfoot-figures.js';

const ASSET_URL = '/assets/models/wasteland/test-fighter.glb';
const CLIPS = ['idle', 'walk', 'knockdown'];

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

// All animation time comes from the simulation snapshot, never the render clock.
// The existing pooled figures remain visible until the complete rig is ready.
export function createRiggedFighterFigures({
  loadAsset = () => new GLTFLoader().loadAsync(ASSET_URL),
} = {}) {
  const group = new THREE.Group();
  group.name = 'Rigged on-foot fighters';
  const fallback = createOnFootFigures();
  group.add(fallback.group);
  const figures = [];
  const eye = new THREE.Vector3();
  let asset = null, attempted = false, disposed = false;
  group.userData.assetStatus = 'unrequested';
  group.userData.loadErrors = [];

  function loadOnce() {
    if (attempted) return;
    attempted = true;
    group.userData.assetStatus = 'loading';
    Promise.resolve().then(loadAsset).then(loaded => {
      if (disposed) { releaseAsset(loaded); return; }
      try { validateAsset(loaded); } catch (error) { releaseAsset(loaded); throw error; }
      asset = loaded;
      group.userData.assetStatus = 'ready';
    }).catch(error => {
      if (disposed) return;
      group.userData.assetStatus = 'failed';
      group.userData.loadErrors.push(String(error?.message || error));
    });
  }

  function makeFigure(index) {
    const root = new THREE.Group();
    root.name = 'rigged-fighter-' + index;
    const model = cloneSkeleton(asset.scene);
    root.add(model);
    group.add(root);
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(asset.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    const figure = {root, model, mixer, actions, fighter: null, local: false, last: null, clip: null};
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // Animated bounds can leave the rest-pose bounds. Twelve bounded figures
      // are cheaper and safer than rebuilding their skinned bounds every frame.
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
    return figure;
  }

  function pose(figure, entry, time) {
    const fighter = entry.fighter || entry;
    const last = figure.last;
    // Position history is sampled once per simulation time, so rendering the
    // same snapshot twice cannot change a walking fighter into an idle fighter.
    const sameActor = last?.fighter === fighter;
    let moving = sameActor && last.time === time ? last.moving : false;
    if (sameActor && time > last.time)
      moving = Math.hypot(fighter.x - last.x, fighter.z - last.z) > .0001;
    if (Number.isFinite(fighter.speed)) moving = Math.abs(fighter.speed) > .01;
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
    // Re-enable a clamped action when replay time moves backwards.
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
    figure.last = {fighter, time, moving, x: fighter.x, z: fighter.z};
    figure.root.updateMatrixWorld(true);
  }

  function update(fighters = [], {active = false, enabled = false, time = 0} = {}) {
    if (disposed) return 0;
    const valid = (Array.isArray(fighters) ? fighters : []).filter(entry => {
      const f = entry?.fighter || entry;
      return ['x', 'y', 'z', 'yaw'].every(key => Number.isFinite(f?.[key]));
    });
    const local = valid.find(entry => entry.local);
    const roster = valid.filter(entry => !entry.local).slice(0, MAX_FIGHTER_FIGURES - (local ? 1 : 0));
    if (local) roster.push(local);
    const show = active && roster.length > 0;
    group.visible = show;
    if (show && enabled) loadOnce();
    const useRig = show && enabled && asset !== null;
    fallback.update(roster, {active: show && !useRig});
    for (const figure of figures) figure.root.visible = false;
    if (useRig) roster.forEach((entry, index) =>
      pose(figures[index] || makeFigure(index), entry, Number.isFinite(time) ? Math.max(0, time) : 0));
    return show ? roster.length : 0;
  }

  return {group, update, dispose() {
    if (disposed) return;
    disposed = true;
    fallback.dispose();
    for (const figure of figures) {
      figure.mixer.stopAllAction();
      figure.mixer.uncacheRoot(figure.model);
      figure.model.traverse(node => { if (node.isSkinnedMesh) node.skeleton.dispose(); });
    }
    releaseAsset(asset);
    group.removeFromParent();
    group.clear();
  }};
}