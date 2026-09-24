import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {createOnFootFigures, MAX_FIGHTER_FIGURES} from './onfoot-figures.js';
import {selectFighterPresentation} from './fighter-presentation.js';

const CREW = new Set(['rook', 'nell', 'jax', 'odessa', 'cinder', 'dune', 'wren', 'tusk']);
const REQUIRED_CLIPS = ['idle', 'walk', 'knockdown'];
const ONCE = new Set(['jump', 'knockdown', 'get-up', 'fire', 'reload', 'enter', 'exit']);
const EMPTY = Object.freeze([]);
const DEFAULT_OPTIONS = Object.freeze({active: false, enabled: false, time: 0});
const crewOf = entry => {
  const id = (entry?.fighter || entry)?.crewId;
  return CREW.has(id) ? id : 'rook';
};

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
  if (!skins || !REQUIRED_CLIPS.every(name => asset.animations?.some(clip => clip.name === name)))
    throw new Error('Fighter asset needs a bound skin and idle, walk and knockdown clips.');
}

function validEntry(entry) {
  const fighter = entry?.fighter || entry;
  return Number.isFinite(fighter?.x) && Number.isFinite(fighter?.y) &&
    Number.isFinite(fighter?.z) && Number.isFinite(fighter?.yaw);
}

function detailOf(mesh) {
  for (let node = mesh; node; node = node.parent) {
    const label = String(node.userData?.lod || node.name).toLowerCase();
    if (/(^|[-_ ])near($|[-_ ])/.test(label)) return 'near';
    if (/(^|[-_ ])far($|[-_ ])/.test(label)) return 'far';
  }
  return null; // GFX-00 injected assets have a single unlabelled level.
}

export function createRiggedFighterFigures({
  loadAsset = id => new GLTFLoader().loadAsync(`/assets/models/wasteland/crew/${id}.glb`),
} = {}) {
  const group = new THREE.Group();
  group.name = 'Rigged on-foot fighters';
  const fallback = createOnFootFigures();
  group.add(fallback.group);
  const assets = new Map();
  const roster = new Array(MAX_FIGHTER_FIGURES);
  const fallbackRoster = new Array(MAX_FIGHTER_FIGURES);
  const fallbackOptions = {active: false};
  const eye = new THREE.Vector3();
  const presentationClock = {time: 0};
  let disposed = false;
  group.userData.assetStatus = 'unrequested';
  group.userData.loadErrors = [];
  group.userData.crews = {};

  function releaseFigures(record) {
    for (const figure of record.figures) {
      figure.mixer.stopAllAction();
      figure.mixer.uncacheRoot(figure.model);
      const skeletons = new Set();
      figure.model.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
      for (const skeleton of skeletons) skeleton.dispose();
      figure.root.removeFromParent();
    }
    record.figures.length = 0;
  }

  function refreshStatus() {
    const states = [...assets.values()].map(record => record.status);
    group.userData.assetStatus = states.includes('loading') ? 'loading'
      : states.includes('ready') ? 'ready' : states.length ? 'failed' : 'unrequested';
  }

  function request(id) {
    if (assets.has(id)) return assets.get(id);
    const record = {asset: null, figures: [], used: 0, status: 'loading'};
    assets.set(id, record);
    group.userData.crews[id] = 'loading';
    refreshStatus();
    Promise.resolve().then(() => loadAsset(id)).then(loaded => {
      if (disposed) { releaseAsset(loaded); return; }
      try {
        validateAsset(loaded);
        // Prepare bounded pools when each asset resolves, never during frames.
        for (let index = 0; index < MAX_FIGHTER_FIGURES; index++)
          record.figures.push(makeFigure(id, index, loaded));
      } catch (error) {
        releaseFigures(record);
        releaseAsset(loaded);
        throw error;
      }
      record.asset = loaded;
      record.status = group.userData.crews[id] = 'ready';
      refreshStatus();
    }).catch(error => {
      if (disposed) return;
      record.status = group.userData.crews[id] = 'failed';
      group.userData.loadErrors.push(`${id}: ${String(error?.message || error)}`);
      refreshStatus();
    });
    return record;
  }

  function makeFigure(id, index, loaded) {
    const root = new THREE.Group();
    root.name = `rigged-fighter-${id}-${index}`;
    root.visible = false;
    const model = cloneSkeleton(loaded.scene);
    root.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = Object.fromEntries(loaded.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
    const figure = {root, model, mixer, actions, meshes: [], fighter: null, local: false, clip: null, presentation: {pose: {}}};
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      figure.meshes.push({mesh, detail: detailOf(mesh)});
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
    return figure;
  }

  function pose(figure, entry, time, options, index) {
    presentationClock.time = time;
    const selected = selectFighterPresentation(entry, presentationClock, figure.presentation);
    // The old injected three-clip pipeline remains a useful loader control.
    const clip = figure.actions[selected.clip] ? selected.clip
      : selected.clip === 'sprint' ? 'walk' : 'idle';
    if (figure.clip !== clip) {
      figure.mixer.stopAllAction();
      const action = figure.actions[clip];
      action.reset();
      action.setLoop(ONCE.has(clip) ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = ONCE.has(clip);
      action.play();
      figure.clip = clip;
    }
    const action = figure.actions[clip];
    const duration = action.getClip().duration;
    const clipTime = selected.clipProgress !== null && selected.clip === clip
      ? Math.max(0, Math.min(1, selected.clipProgress)) * duration
      : ONCE.has(clip) ? Math.min(duration, selected.clipTime) : selected.clipTime;
    action.paused = false;
    action.enabled = true;
    figure.mixer.setTime(clipTime);
    const at = selected.pose;
    figure.root.position.set(at.x, at.y, at.z);
    figure.root.rotation.set(0, at.yaw, 0);
    figure.root.visible = true;
    // Retain the original active-roster names used by the GFX-00 control.
    figure.root.name = `rigged-fighter-${index}`;
    figure.root.userData.clip = clip;
    figure.root.userData.clipTime = clipTime;
    figure.root.userData.crewId = selected.crewId;
    figure.fighter = at;
    figure.local = entry.local === true;
    const viewer = options.cameraPosition || options.viewer;
    const distance = viewer ? Math.hypot(at.x - viewer.x, at.y - viewer.y, at.z - viewer.z) : 0;
    const detail = options.detail === 'near' || options.detail === 'far' ? options.detail
      : distance > (options.farDistance || 28) ? 'far' : 'near';
    for (const item of figure.meshes) item.mesh.visible = !item.detail || item.detail === detail;
    figure.root.userData.detail = detail;
    if (!figure.root.parent) group.add(figure.root);
    figure.root.updateMatrixWorld(true);
  }

  function update(fighters = EMPTY, options = DEFAULT_OPTIONS) {
    if (disposed) return 0;
    const active = options.active === true, enabled = options.enabled === true;
    const time = Number.isFinite(options.time) ? Math.max(0, options.time) : 0;
    const entries = Array.isArray(fighters) ? fighters : EMPTY;
    let local = null, count = 0;
    if (active) {
      for (const entry of entries) if (entry?.local && validEntry(entry)) { local = entry; break; }
      const capacity = MAX_FIGHTER_FIGURES - (local ? 1 : 0);
      for (let index = 0; index < entries.length && count < capacity; index++) {
        const entry = entries[index];
        if (!entry?.local && validEntry(entry)) roster[count++] = entry;
      }
      if (local) roster[count++] = local;
    }
    for (let index = count; index < MAX_FIGHTER_FIGURES; index++) roster[index] = null;
    group.visible = count > 0;
    for (const record of assets.values()) {
      record.used = 0;
      for (const figure of record.figures) figure.root.visible = false;
    }
    let missing = 0;
    for (let index = 0; index < count; index++) {
      const entry = roster[index];
      const record = enabled ? request(crewOf(entry)) : null;
      if (record?.asset) pose(record.figures[record.used++], entry, time, options, index);
      else fallbackRoster[missing++] = entry;
    }
    for (let index = missing; index < MAX_FIGHTER_FIGURES; index++) fallbackRoster[index] = null;
    if (missing) {
      fallbackOptions.active = true;
      fallback.update(fallbackRoster, fallbackOptions);
    } else fallback.group.visible = false;
    return count;
  }

  return {group, update, dispose() {
    if (disposed) return;
    disposed = true;
    fallback.dispose();
    const released = new Set();
    for (const record of assets.values()) {
      releaseFigures(record);
      if (record.asset && !released.has(record.asset)) {
        releaseAsset(record.asset); released.add(record.asset);
      }
    }
    group.removeFromParent();
    group.clear();
  }};
}
