import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from './scene-systems.js';

const ASSET_PATH = '/assets/models/wasteland/scrapdome/yard.glb';
const WATER_PATH = '/assets/models/wasteland/scrapdome/water-works.glb';
// The Water Road's water works stand on open ground between the gate and the first wreck banks (WATER-YARD-ART).
const WATER_PLACE = Object.freeze({x: -4, y: 0, z: 31});
// BOWL-REX-FIGHT: the beaten Scrapasaurus lies on its side in the yard's car park, on open ground across from the
// water works, with its three battery boxes smashed (docs/WASTELAND_WORLD.md section 7).
const REX_PATH = '/assets/models/wasteland/bowl/scrapasaurus.glb';
const REX_PLACE = Object.freeze({x: 17, z: 28, heading: -1.1, roll: 1.35});

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
  loadWaterWorks = () => new GLTFLoader().loadAsync(WATER_PATH),
  loadRex = () => new GLTFLoader().loadAsync(REX_PATH)
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
  // The Scrapasaurus loads only once night five is won; until then nothing here runs.
  const rex = {status: 'none', root: null, shown: false};
  group.userData.rexOrnament = rex;
  group.userData.setRexOrnament = setRexOrnament;
  function setRexOrnament(shown) {
    if (retired || !road) return;
    rex.shown = shown === true;
    if (rex.root) rex.root.visible = rex.shown;
    if (!rex.shown || rex.status !== 'none') return;
    rex.status = 'loading';
    ready.then(placed => placed ? loadRex() : null).then(asset => {
      if (!asset?.scene || retired || !placementGroup) { if (asset) releaseUnattached(asset); rex.status = retired ? 'disabled' : 'failed'; return; }
      const model = asset.scene;
      model.traverse(node => {
        if (/^battery-box-\d-whole$/.test(node.name)) node.visible = false;
        if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
      });
      // On its side: rolled about its length, then stood on the ground where it lies.
      const holder = new THREE.Group();
      holder.name = 'Beaten Scrapasaurus';
      model.rotation.z = REX_PLACE.roll;
      holder.add(model);
      holder.rotation.y = REX_PLACE.heading;
      holder.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(holder);
      holder.position.set(REX_PLACE.x, -bounds.min.y, REX_PLACE.z);
      holder.visible = rex.shown;
      placementGroup.add(holder);
      rex.root = holder; rex.status = 'ready';
    }).catch(error => {
      if (!retired) { group.userData.loadErrors.push(String(error?.message || error)); rex.status = 'failed'; }
    });
  }

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

  return {group, ready, dispose, setHomeVisible, homeCamera, setWaterStage, setRexOrnament};
}
