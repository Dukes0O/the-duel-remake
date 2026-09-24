import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {selectFirstPersonPresentation} from './first-person-presentation.js';

const EMPTY = Object.freeze({});
const REFERENCES = new WeakMap();
const CLIPS = ['idle', 'aim', 'fire', 'reload', 'repair', 'wrench-idle', 'aim-fire', 'aim-reload'];

function releaseAsset(asset) {
  const references = REFERENCES.get(asset) || 1;
  if (references > 1) { REFERENCES.set(asset, references - 1); return; }
  REFERENCES.delete(asset);
  const resources = new Set();
  asset.scene?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    if (node.skeleton) resources.add(node.skeleton);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose();
}

export function createFirstPersonGear({loadAsset = (kind, id) => new GLTFLoader().loadAsync(
  `/assets/models/wasteland/first-person/${kind === 'hands' ? `hands/${id}` : kind}.glb`)} = {}) {
  const group = new THREE.Group();
  group.name = 'First-person hands and gear';
  group.visible = false;
  const motion = new THREE.Group();
  group.add(motion);
  const cache = new Map();
  const clock = {time: 0};
  const presentation = {};
  const records = [];
  const orientation = new THREE.Quaternion();
  let disposed = false, viewCamera = null, shownHands = null, shownTool = null;
  group.userData.assetStatus = 'unrequested';
  group.userData.loadErrors = [];
  group.userData.presentation = presentation;

  function prepare(asset, kind) {
    if (!asset?.scene) throw Error('First-person asset has no scene.');
    if (kind === 'hands' && (!asset.scene.getObjectByProperty('isSkinnedMesh', true) ||
        !CLIPS.every(name => asset.animations?.some(clip => clip.name === name)) ||
        !asset.scene.getObjectByName('rpg-mount') || !asset.scene.getObjectByName('wrench-mount')))
      throw Error('First-person hands need bound skin, action clips and both tool sockets.');
    const model = cloneSkeleton(asset.scene);
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries((asset.animations || []).map(clip => [clip.name, mixer.clipAction(clip)]));
    const record = {asset, model, mixer, actions, clip: null, rockets: [], status: 'ready'};
    model.visible = false;
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 900;
      if (/loaded[-_ ]rocket/i.test(mesh.name)) record.rockets.push(mesh);
      const start = mesh.geometry.drawRange.start, count = mesh.geometry.drawRange.count;
      // Geometry is restored after every pass. Rear-view, shadow and inspection
      // cameras cannot draw a model belonging to the main first-person camera.
      mesh.onBeforeRender = (_renderer, _scene, camera) => {
        mesh.geometry.setDrawRange(start, camera === viewCamera ? count : 0);
      };
      mesh.onAfterRender = () => mesh.geometry.setDrawRange(start, count);
    });
    return record;
  }

  function request(kind, id) {
    const key = kind === 'hands' ? id : kind;
    let record = cache.get(key);
    if (record) return record;
    record = {status: 'loading', model: null};
    cache.set(key, record);
    records.push(record);
    Promise.resolve().then(() => loadAsset(kind, id)).then(asset => {
      REFERENCES.set(asset, (REFERENCES.get(asset) || 0) + 1);
      if (disposed) { releaseAsset(asset); return; }
      try {
        Object.assign(record, prepare(asset, kind));
        if (kind === 'hands') motion.add(record.model);
      } catch (error) { releaseAsset(asset); throw error; }
    }).catch(error => {
      if (disposed) return;
      record.status = 'failed';
      group.userData.loadErrors.push(`${key}: ${String(error?.message || error)}`);
    });
    return record;
  }

  function animate(record, clip, progress, seconds, once) {
    const action = record.actions[clip];
    if (!action) return;
    if (record.clip !== clip) {
      record.mixer.stopAllAction();
      action.reset();
      action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = once;
      action.play();
      record.clip = clip;
    }
    action.paused = false;
    action.enabled = true;
    record.mixer.setTime(once ? progress * action.getClip().duration : seconds);
  }

  function update(entry, options = EMPTY) {
    group.visible = false;
    viewCamera = null;
    if (disposed || options.enabled !== true || options.active !== true ||
        options.firstPerson !== true || !options.camera?.isCamera || !entry?.fighter ||
        entry.fighter.knockedDown) return;
    clock.time = options.time;
    const selected = selectFirstPersonPresentation(entry, clock, presentation);
    const hands = request('hands', selected.crewId);
    const tool = request(selected.weapon);
    if (hands.status !== 'ready' || tool.status !== 'ready') {
      group.userData.assetStatus = hands.status === 'failed' || tool.status === 'failed' ? 'failed' : 'loading';
      return;
    }
    group.userData.assetStatus = 'ready';
    if (shownHands !== hands || shownTool !== tool) {
      if (shownHands) shownHands.model.visible = false;
      if (shownTool) shownTool.model.visible = false;
      hands.model.getObjectByName(`${selected.weapon}-mount`).add(tool.model);
      shownHands = hands;
      shownTool = tool;
    }
    hands.model.visible = true;
    tool.model.visible = true;
    const busy = selected.action !== 'idle';
    const clip = busy ? selected.aim && selected.action !== 'repair'
      ? selected.action === 'fire' ? 'aim-fire' : 'aim-reload' : selected.action
      : selected.weapon === 'wrench' ? 'wrench-idle' : selected.aim ? 'aim' : 'idle';
    animate(hands, clip, selected.actionProgress, selected.motionTime, busy);
    if (selected.action === 'reload') animate(tool, 'reload', selected.actionProgress, 0, true);
    else if (tool.clip) {
      tool.mixer.stopAllAction();
      tool.mixer.setTime(0);
      tool.clip = null;
    }
    for (let index = 0; index < tool.rockets.length; index++) tool.rockets[index].visible =
      selected.loaded && selected.action !== 'fire' &&
      (selected.action !== 'reload' || selected.actionProgress >= .12);
    const moving = selected.locomotion === 'walk' || selected.locomotion === 'sprint';
    const amount = moving ? selected.locomotion === 'sprint' ? .013 : .007 : 0;
    const phase = selected.motionTime * (selected.locomotion === 'sprint' ? 12 : 8);
    motion.position.set(Math.sin(phase) * amount, Math.cos(phase * 2) * amount * .55, 0);
    const camera = options.camera;
    camera.updateWorldMatrix(true, false);
    camera.getWorldPosition(group.position);
    camera.getWorldQuaternion(orientation);
    group.quaternion.copy(orientation);
    viewCamera = camera;
    group.visible = true;
    group.updateMatrixWorld(true);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    group.visible = false;
    viewCamera = null;
    for (const record of records) {
      if (!record.model) continue;
      record.mixer.stopAllAction();
      record.mixer.uncacheRoot(record.model);
      const skeletons = new Set();
      record.model.traverse(node => { if (node.skeleton) skeletons.add(node.skeleton); });
      for (const skeleton of skeletons) skeleton.dispose();
      record.model.removeFromParent();
      releaseAsset(record.asset);
    }
    group.clear();
    cache.clear();
  }

  return {group, update, dispose};
}
