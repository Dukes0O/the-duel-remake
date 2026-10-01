import {Group} from 'three';

/** Presentation owns the supplied GLTF and never owns valve or race state. */
export function createTankerModel({loadAsset} = {}) {
  const group = new Group();
  group.name = 'convoy-tanker';
  let disposed = false;
  let native = null;
  let lamps = [];
  let broken = false;
  const released = new Set();

  function release(scene) {
    scene?.traverse(node => {
      if (!node.isMesh) return;
      const resources = [node.geometry];
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        resources.push(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.push(value);
      }
      for (const resource of resources) {
        if (!resource || released.has(resource)) continue;
        released.add(resource);
        resource.dispose();
      }
    });
    scene?.removeFromParent();
  }

  function updateLamps() {
    for (const material of lamps) {
      material.emissive.setHex(broken ? 0xff6610 : 0);
      material.emissiveIntensity = broken ? 6 : 0;
    }
  }

  const ready = Promise.resolve().then(() => {
    if (typeof loadAsset !== 'function') throw new TypeError('A native tanker asset loader is required');
    return loadAsset();
  }).then(asset => {
    const scene = asset?.scene;
    if (!scene?.isObject3D) throw new TypeError('The tanker loader must return a native GLTF scene');
    if (disposed) {
      release(scene);
      return false;
    }
    native = scene;
    scene.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.name.startsWith('tanker-warning-lamp-')) {
        lamps.push(...(Array.isArray(node.material) ? node.material : [node.material]));
      }
    });
    lamps = [...new Set(lamps)];
    updateLamps();
    group.add(scene);
    return true;
  });

  return {
    group,
    ready,
    setValveHealth(health) {
      if (disposed) return;
      broken = Array.isArray(health) && health.length === 3 &&
        health.every(value => Number.isFinite(value) && value <= 0);
      updateLamps();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(native);
      native = null;
      lamps = [];
      group.clear();
    },
  };
}
