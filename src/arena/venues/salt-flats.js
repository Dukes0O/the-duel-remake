// Private native Salt Flats source stage. The venue registry and game wiring
// are separate, ungranted hooks. This module cannot launch an event or save.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from '../../scene-systems.js';

export const SALT_FLATS_NATIVE_ASSET = '/assets/models/wasteland/salt-flats/venue.glb';

function resourcesOf(root) {
  const resources = new Set();
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

export function createSaltFlatsScene(course, {loadAsset = () =>
  new GLTFLoader().loadAsync(SALT_FLATS_NATIVE_ASSET)} = {}) {
  const group = new THREE.Group();
  group.name = 'Salt Flats';
  const enabled = course?.def?.id === 'salt-flats';
  group.userData.assetStatus = enabled ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false;
  const released = new Set();

  function release(root) {
    for (const resource of resourcesOf(root)) {
      if (released.has(resource) || resource.userData?.sharedAsset) continue;
      released.add(resource);
      resource.dispose();
    }
  }

  function dispose() {
    if (retired) return;
    retired = true;
    group.visible = false;
    group.userData.assetStatus = 'retired';
    // This native graph owns its resources. Clear after release so a caller's
    // enclosing disposeTree does not traverse and release them a second time.
    release(group);
    group.clear();
  }
  registerSceneSystem(group, {dispose});

  const ready = enabled ? (async () => {
    let asset;
    try {
      asset = await loadAsset();
      if (retired) {release(asset?.scene); return false;}
      if (!asset?.scene) throw Error('Salt Flats native asset has no scene.');
      const ground = asset.scene.getObjectByName('salt-flats-ground');
      if (!ground?.isMesh || !ground.geometry?.attributes.position)
        throw Error('Salt Flats asset needs its actual salt ground.');
      asset.scene.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(ground);
      const size = bounds.getSize(new THREE.Vector3());
      if (Math.abs(size.x - 300) > .01 || Math.abs(size.z - 200) > .01)
        throw Error('Salt Flats asset does not have its prepared 300 by 200 metre ground.');
      asset.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        if (!mesh.geometry?.attributes.position) throw Error('Salt Flats native mesh has no positions.');
        mesh.castShadow = mesh !== ground;
        mesh.receiveShadow = true;
      });
      group.add(asset.scene);
      group.userData.assetStatus = 'ready';
      return true;
    } catch (error) {
      release(asset?.scene);
      if (!retired) {
        group.userData.loadErrors.push(String(error?.message || error));
        group.userData.assetStatus = 'failed';
      }
      return false;
    }
  })() : Promise.resolve(false);
  return {group, ready, dispose};
}
