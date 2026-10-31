// Brian's face for the classroom panel, rendered once from his Lab model (tools/blender/lab-brian.py),
// so the tutor and the man in the room are the same person. No new art file.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

let portrait = null;
export function brianPortrait(doc, size = 256) {
  portrait ??= new GLTFLoader().loadAsync('/assets/models/lab/brian.glb').then(gltf => {
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = size;
    const scene = new THREE.Scene(), root = gltf.scene;
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: true});
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene.add(root, new THREE.HemisphereLight(0xfff1dc, 0x2b3134, 1.7));
      const key = new THREE.DirectionalLight(0xfff4e6, 2.4); key.position.set(.7, 2.4, 1.8); scene.add(key);
      const rim = new THREE.DirectionalLight(0x9fc4ff, 1.1); rim.position.set(-1.2, 2, -1); scene.add(rim);
      const top = new THREE.Box3().setFromObject(root).max.y;
      const camera = new THREE.PerspectiveCamera(20, 1, .05, 10);
      camera.position.set(.16, top - .16, .95); camera.lookAt(0, top - .19, 0);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    } finally {
      root.traverse(node => { node.geometry?.dispose(); for (const m of [].concat(node.material ?? [])) { for (const v of Object.values(m)) if (v?.isTexture) v.dispose(); m.dispose(); } });
      renderer?.dispose(); renderer?.forceContextLoss();
    }
  }).catch(() => null);
  return portrait;
}
