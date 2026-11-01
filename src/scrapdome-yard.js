import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from './scene-systems.js';

const ASSET_PATH = '/assets/models/wasteland/scrapdome/yard.glb';
const WATER_PATH = '/assets/models/wasteland/scrapdome/water-works.glb';
// The Water Road's water works stand on open ground between the gate and the first wreck banks (WATER-YARD-ART).
const WATER_PLACE = Object.freeze({x: -4, y: 0, z: 31});

// Which part of the water works shows at a stage (the number of Water Road chapters done, 0 to 8). Parts not named
// here always show. The tower holds one water level at a time: level n after chapter n.
const WATER_PARTS = Object.freeze({
  'pipe-cut': stage => stage < 1, 'pipe-patched': stage => stage >= 1, 'pump-fuel': stage => stage >= 2,
  'valve-missing': stage => stage < 3, valve: stage => stage >= 3, 'pump-house-roof': stage => stage >= 4,
  'boiler-cold': stage => stage < 5, 'boiler-lit': stage => stage >= 5, 'water-truck': stage => stage >= 6,
  'well-water': stage => stage >= 8, 'tap-running': stage => stage >= 8,
  ...Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map(level => [`tower-water-${level}`, stage => stage === level])),
});
export const waterWorksPartVisible = (name, stage) => WATER_PARTS[name] ? WATER_PARTS[name](stage) : true;

function resourcesOf(scene, into = new Set()) {
  scene?.traverse(node => {
    if (node.geometry) into.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      into.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) into.add(value);
    }
  });
  return into;
}

/** The physical yard is visible through the gate; only its home camera is gated. */
export function createScrapdomeYard(course, {
  loadAsset = () => new GLTFLoader().loadAsync(ASSET_PATH),
  loadWaterWorks = () => new GLTFLoader().loadAsync(WATER_PATH)
} = {}) {
  const road = course.hiddenRoad;
  const group = new THREE.Group();
  group.name = 'Scrapdome yard';
  group.visible = !!road;
  group.userData.assetStatus = road ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false, homeActive = false, placementGroup = null;
  const released = new Set();
  // The water works load only when the Water Road first asks for a stage; with its switch off nothing here runs.
  const water = {status: 'none', root: null, stage: null};
  group.userData.waterWorks = water;
  const pose = road?.poseAt(road.length);

  function releaseUnattached(asset) {
    for (const resource of resourcesOf(asset?.scene)) {
      if (released.has(resource) || resource.userData?.sharedAsset) continue;
      released.add(resource);
      resource.dispose();
    }
  }

  function dispose() {
    if (retired) return;
    retired = true;
    homeActive = false;
    group.visible = false;
    // Attached resources remain in disposeTree's ownership.
    resourcesOf(group, released);
  }
  registerSceneSystem(group, {dispose});
  group.userData.setHomeVisible = setHomeVisible;
  group.userData.homeCamera = homeCamera;
  group.userData.setWaterStage = setWaterStage;

  function applyWaterStage() {
    if (!water.root) return;
    water.root.visible = water.stage !== null;
    if (water.stage === null) return;
    for (const name of Object.keys(WATER_PARTS)) {
      const part = water.root.getObjectByName(name);
      if (part) part.visible = waterWorksPartVisible(name, water.stage);
    }
  }
  // `stage`: chapters done (0 to 8), or null to hide the water works. Presentation only.
  function setWaterStage(stage) {
    if (retired || !road) return;
    const next = Number.isInteger(stage) ? Math.max(0, Math.min(8, stage)) : null;
    if (next === water.stage && water.status !== 'none') return;
    water.stage = next;
    if (next !== null && water.status === 'none') {
      water.status = 'loading';
      ready.then(placed => placed ? loadWaterWorks() : null).then(asset => {
        if (!asset?.scene || retired || !placementGroup) { if (asset) releaseUnattached(asset); water.status = retired ? 'disabled' : 'failed'; return; }
        water.root = asset.scene;
        water.root.name = 'Water works';
        water.root.position.set(WATER_PLACE.x, WATER_PLACE.y, WATER_PLACE.z);
        water.root.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
        placementGroup.add(water.root);
        water.status = 'ready';
        applyWaterStage();
      }).catch(error => {
        if (!retired) { group.userData.loadErrors.push(String(error?.message || error)); water.status = 'failed'; }
      });
    }
    applyWaterStage();
  }

  function setHomeVisible(active) {
    homeActive = !retired && active === true;
  }

  function homeCamera() {
    if (!homeActive || retired || group.userData.assetStatus !== 'ready') return null;
    const local = (x, y, z) => ({
      x: pose.x + x * Math.cos(pose.heading) + z * Math.sin(pose.heading),
      y: pose.y + y,
      z: pose.z - x * Math.sin(pose.heading) + z * Math.cos(pose.heading)
    });
    return {
      position: local(0, 4, 0),
      target: local(8, 2, 60),
      fov: 55
    };
  }

  const ready = road ? Promise.resolve().then(() => loadAsset()).then(asset => {
    if (retired) { releaseUnattached(asset); return false; }
    if (!asset?.scene) throw Error('Local Scrapdome asset has no scene.');
    const placement = new THREE.Group();
    placement.name = 'Scrapdome gate placement';
    placement.position.set(pose.x, pose.y, pose.z);
    placement.rotation.y = pose.heading;
    asset.scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = node.name !== 'Dirt loop and strata';
      node.receiveShadow = true;
    });
    placement.add(asset.scene);
    group.add(placement);
    placementGroup = placement;
    group.userData.assetStatus = 'ready';
    return true;
  }).catch(error => {
    if (!retired) {
      group.userData.loadErrors.push(String(error?.message || error));
      group.userData.assetStatus = 'failed';
    }
    return false;
  }) : Promise.resolve(false);

  return {group, ready, dispose, setHomeVisible, homeCamera, setWaterStage};
}
