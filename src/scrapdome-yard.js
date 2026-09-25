import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from './scene-systems.js';

const ASSET_PATH = '/assets/models/wasteland/scrapdome/yard.glb';

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
  loadAsset = () => new GLTFLoader().loadAsync(ASSET_PATH)
} = {}) {
  const road = course.hiddenRoad;
  const group = new THREE.Group();
  group.name = 'Scrapdome yard';
  group.visible = !!road;
  group.userData.assetStatus = road ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false, homeActive = false;
  const released = new Set();
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

  function setHomeVisible(active) {
    homeActive = !retired && active === true;
  }

  function homeCamera(aspect = 16 / 9) {
    if (!homeActive || retired || group.userData.assetStatus !== 'ready') return null;
    const portrait = Number.isFinite(aspect) && aspect < .85;
    const local = (x, y, z) => ({
      x: pose.x + x * Math.cos(pose.heading) + z * Math.sin(pose.heading),
      y: pose.y + y,
      z: pose.z - x * Math.sin(pose.heading) + z * Math.cos(pose.heading)
    });
    return {
      position: local(0, 4, 0),
      target: portrait ? local(0, 10, 60) : local(8, 2, 60),
      fov: portrait ? 80 : 55
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
    group.userData.assetStatus = 'ready';
    return true;
  }).catch(error => {
    if (!retired) {
      group.userData.loadErrors.push(String(error?.message || error));
      group.userData.assetStatus = 'failed';
    }
    return false;
  }) : Promise.resolve(false);

  return {group, ready, dispose, setHomeVisible, homeCamera};
}
