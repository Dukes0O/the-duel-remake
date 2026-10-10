import {Group, LOD, Mesh, Matrix4, Vector3} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

/** Presentation owns the supplied GLTF and never owns valve or race state. */
export function createTankerModel({loadAsset} = {}) {
  const group = new Group();
  group.name = 'convoy-tanker';
  let disposed = false;
  let native = null;
  let distant = null;
  let lamps = [];
  let distantLamps = [];
  let broken = false;
  let signal = null;
  let seconds = 0;
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

  function distantView(scene) {
    const far = new Group();
    far.name = 'convoy-tanker-distant';
    const pieces = [];
    let material = null;
    scene.updateMatrixWorld(true);
    try {
      scene.traverse(node => {
        if (!node.isMesh) return;
        if (node.name.startsWith('tanker-warning-lamp-') ||
            node.name === 'tanker-boarding-plate') {
          const copy = node.clone(false);
          copy.matrixAutoUpdate = false;
          copy.matrix.copy(node.matrixWorld);
          if (node.name.startsWith('tanker-warning-lamp-')) {
            // Enlarge around the native lens centre only in the distant LOD.
            // Separate far emission keeps lenses readable; timing is still native.
            node.geometry.computeBoundingBox();
            const center = node.geometry.boundingBox.getCenter(new Vector3());
            const scale = new Matrix4().makeTranslation(center.x, center.y, center.z)
              .multiply(new Matrix4().makeScale(3, 3, 3))
              .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
            copy.matrix.multiply(scale);
            copy.material = node.material.clone();
            copy.material.toneMapped = false;
            distantLamps.push(copy.material);
          } else {
            copy.material = node.material.clone();
            copy.material.color.setHex(0xffecb5);
            copy.material.emissiveMap = copy.material.map;
            copy.material.emissive.setHex(0xffc766);
            copy.material.emissiveIntensity = 2.5;
            copy.material.toneMapped = false;
          }
          far.add(copy);
          return;
        }
        if (Array.isArray(node.material)) throw Error('Native tanker needs separated atlas primitives');
        if (!material) material = node.material;
        if (node.material.map?.image !== material.map?.image ||
            node.material.map?.flipY !== material.map?.flipY) {
          throw Error('Native tanker distant merge needs the same worn atlas');
        }
        const geometry = node.geometry.clone().applyMatrix4(node.matrixWorld);
        // Only distant shading is shared. The original near attributes, material
        // and hierarchy remain untouched, including glass and rubber finishes.
        for (const name of Object.keys(geometry.attributes)) {
          if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name);
        }
        geometry.clearGroups();
        pieces.push(geometry);
      });
      const geometry = mergeGeometries(pieces, false);
      if (!geometry || !material) throw Error('Native tanker distant geometry could not merge');
      const mesh = new Mesh(geometry, material.clone());
      mesh.name = 'convoy-tanker-distant-body';
      mesh.castShadow = mesh.receiveShadow = true;
      far.add(mesh);
      return far;
    } finally {
      for (const geometry of pieces) geometry.dispose();
    }
  }

  function updateLamps() {
    const flashing = signal && seconds < signal.untilSec;
    const on = flashing ? Math.floor(seconds * 8) % 2 === 0 : broken;
    const color = flashing && signal.kind === 'tell' ? 0xffe8b5 : 0xff8c00;
    for (const material of lamps) {
      material.emissive.setHex(on ? color : 0);
      material.emissiveIntensity = on ? 1.2 : 0;
    }
    for (const material of distantLamps) {
      material.emissive.setHex(on ? color : 0);
      material.emissiveIntensity = on ? 4.5 : 0;
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
    distant = distantView(scene);
    updateLamps();
    const lod = new LOD();
    lod.name = 'convoy-tanker-detail';
    lod.addLevel(scene, 0);
    lod.addLevel(distant, 80, .05);
    group.add(lod);
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
    setLampSignal(value, now) {
      if (disposed) return;
      signal = Number.isFinite(value?.untilSec) ? value : null;
      seconds = Number.isFinite(now) ? now : 0;
      updateLamps();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      release(native);
      release(distant);
      native = null;
      distant = null;
      lamps = [];
      distantLamps = [];
      group.clear();
    },
  };
}
