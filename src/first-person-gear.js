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

const easeIn = t => t * t, easeOut = t => 1 - (1 - t) * (1 - t);
// The hammer's turn about the hand, in radians (positive draws the head back toward him), through one blow.
export function hammerSwing(strike) {
  if (strike === null || strike === undefined) return 0;
  if (strike < .55) return .95 * easeOut(strike / .55);
  if (strike < .68) return .95 - 1.55 * easeIn((strike - .55) / .13);
  return -.6 * (1 - easeOut((strike - .68) / .32));
}

// HOME-GROUND-2: a claw hammer in the look of the ground's tin: an ash handle worn dark at the grip and a rusty steel
// head. In the hands' wrench socket its handle runs up the socket's Y, its face forward (-Z) and its claw back.
function hammerAsset() {
  const scene = new THREE.Group();
  scene.name = 'Home Ground claw hammer';
  const wood = new THREE.MeshStandardMaterial({name: 'hammer handle', color: 0x8a6440, roughness: .82, metalness: 0});
  const grip = new THREE.MeshStandardMaterial({name: 'hammer grip', color: 0x3a2e24, roughness: .9, metalness: 0});
  const steel = new THREE.MeshStandardMaterial({name: 'hammer head', color: 0x5f5a52, roughness: .5, metalness: .75});
  const face = new THREE.MeshStandardMaterial({name: 'hammer face', color: 0xa8a49a, roughness: .35, metalness: .9});
  const rust = new THREE.MeshStandardMaterial({name: 'hammer rust', color: 0x7a4a2c, roughness: .9, metalness: .2});
  const add = (geometry, material, x, y, z, rx = 0) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.rotation.x = rx; scene.add(mesh); return mesh;
  };
  add(new THREE.CylinderGeometry(.014, .017, .36, 10), wood, 0, .07, 0);
  add(new THREE.CylinderGeometry(.019, .019, .12, 10), grip, 0, -.06, 0);
  add(new THREE.BoxGeometry(.03, .034, .075), steel, 0, .262, -.012);
  add(new THREE.CylinderGeometry(.019, .021, .03, 12), face, 0, .262, -.062, Math.PI / 2);
  add(new THREE.BoxGeometry(.034, .02, .02), rust, 0, .262, .012);
  for (const side of [-1, 1]) add(new THREE.BoxGeometry(.012, .016, .06), steel, side * .009, .252, .052, -.45);
  return {scene, animations: []};
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
    Promise.resolve().then(() => {
      if(kind === 'hammer') return hammerAsset();
      if(kind !== 'shock-charge') return loadAsset(kind,id);
      const scene=new THREE.Group(), metal=new THREE.MeshStandardMaterial({color:0x252c31,metalness:.8,roughness:.4});
      const coil=new THREE.Mesh(new THREE.TorusGeometry(.055,.014,6,16),metal);
      coil.rotation.x=Math.PI/2; coil.position.set(0,.02,-.08); scene.add(coil);
      const light=new THREE.Mesh(new THREE.IcosahedronGeometry(.035,0),
        new THREE.MeshBasicMaterial({color:0x8ce4ff}));
      light.position.copy(coil.position); scene.add(light);
      scene.name='Vesper handheld Shock Charge'; return {scene,animations:[]};
    }).then(asset => {
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
    const hands = request('hands', selected.crewId === 'vesper' ? 'odessa' : selected.crewId);
    const tool = request(selected.weapon);
    if (hands.status !== 'ready' || tool.status !== 'ready') {
      group.userData.assetStatus = hands.status === 'failed' || tool.status === 'failed' ? 'failed' : 'loading';
      return;
    }
    group.userData.assetStatus = 'ready';
    if (shownHands !== hands || shownTool !== tool) {
      if (shownHands) shownHands.model.visible = false;
      if (shownTool) shownTool.model.visible = false;
      hands.model.getObjectByName(`${['shock-charge', 'hammer'].includes(selected.weapon) ? 'wrench' : selected.weapon}-mount`).add(tool.model);
      shownHands = hands;
      shownTool = tool;
    }
    hands.model.visible = true;
    tool.model.visible = true;
    const busy = selected.action !== 'idle';
    const clip = busy ? selected.aim && selected.action !== 'repair'
      ? selected.action === 'fire' ? 'aim-fire' : 'aim-reload' : selected.action
      : ['wrench', 'hammer'].includes(selected.weapon) ? 'wrench-idle' : selected.aim ? 'aim' : 'idle';
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
    const low = selected.lowered && !busy;
    motion.position.set(Math.sin(phase) * amount, Math.cos(phase * 2) * amount * .55 - (low ? .16 : 0), 0);
    motion.rotation.x = low ? -.22 : 0;
    // HOME-GROUND-2: each blow of the hammer: drawn back, brought down hard on the panel, and lifted again.
    if (selected.weapon === 'hammer') {
      const swing = hammerSwing(selected.strike);
      tool.model.rotation.x = swing;
      motion.rotation.x += swing * .22;
      motion.position.y += Math.min(0, swing) * .05;
    }
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
