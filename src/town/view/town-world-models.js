// The town's model families, loaded once each and copied part by part, for the things the town sets down in the Scablands (the
// neighbours' outposts, Mrs Vane's kiosks, fences and billboards). Drawing only: nothing here is read by the job.
import * as THREE from 'three';

const sceneOf = asset => asset?.scene ?? asset;

export function createTownModelKit(loadAsset) {
  if (typeof loadAsset !== 'function') throw new TypeError('The town needs a way to load its models.');
  const families = new Map();
  let disposed = false;
  // One request a file, however many parts are taken from it.
  const family = url => {
    if (!families.has(url)) families.set(url, Promise.resolve().then(() => loadAsset(url)));
    return families.get(url);
  };
  // A copy of one part (a node and everything under it) standing on its own floor: the node's own place in the family is dropped, and
  // `lift` raises it so that its lowest point (a trestle's foot) is at the floor. The copy shares the family's geometry and materials.
  async function part(url, node, {lift = 0} = {}) {
    const source = sceneOf(await family(url))?.getObjectByName(node);
    if (!source) throw new Error(`The model ${url} has no part called ${node}.`);
    const copy = source.clone(true);
    copy.position.set(0, lift, 0);
    copy.quaternion.identity();
    copy.scale.set(1, 1, 1);
    copy.traverse(object => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    const holder = new THREE.Group();
    holder.name = node;
    holder.add(copy);
    return holder;
  }
  // Every file asked for (a shared asset for other views, such as the story cast).
  const load = url => family(url);
  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const request of families.values()) request.then(asset => {
      sceneOf(asset)?.traverse?.(object => {
        object.geometry?.dispose?.();
        for (const material of [].concat(object.material || [])) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
          material.dispose?.();
        }
      });
    }, () => {});
    families.clear();
  }
  return {part, load, dispose, get disposed() { return disposed; }};
}
