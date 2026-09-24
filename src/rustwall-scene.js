import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {registerSceneSystem} from './scene-systems.js';

const GATE_LIFT = 7.25;

export function clampGateOpen(value) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function resourcesOf(root, resources = new Set()) {
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  return resources;
}

export function createRustwallScene(course, {loadAsset = kind =>
  new GLTFLoader().loadAsync(`/assets/models/wasteland/rustwall/${kind}.glb`)} = {}) {
  const group = new THREE.Group();
  group.name = 'Rustwall';
  group.userData.assetStatus = course.hiddenRoad ? 'loading' : 'disabled';
  group.userData.loadErrors = [];
  let retired = false, fraction = 0, panel = null, panelBaseY = 0;
  const released = new Set(), unattached = new Set();

  function releaseUnused(asset) {
    const attached = resourcesOf(group);
    for (const resource of resourcesOf(asset?.scene)) {
      if (attached.has(resource) || released.has(resource) || resource.userData?.sharedAsset) continue;
      released.add(resource);
      resource.dispose();
    }
  }

  function setGateOpen(value) {
    if (retired) return fraction;
    fraction = clampGateOpen(value);
    if (panel) panel.position.y = panelBaseY + GATE_LIFT * fraction;
    return fraction;
  }

  function dispose() {
    if (retired) return;
    retired = true;
    group.visible = false;
    // disposeTree owns the attached graph. Remember these identities so a
    // delayed GLTF sharing its resources cannot release them for a second time.
    resourcesOf(group, released);
    for (const asset of unattached) releaseUnused(asset);
    unattached.clear();
  }
  registerSceneSystem(group, {dispose});
  group.userData.setGateOpen = setGateOpen;

  function prepareWall(asset) {
    const gate = asset.scene.getObjectByName('gate-panel');
    if (!gate) throw Error('Rustwall asset needs its movable gate-panel.');
    const pose = course.hiddenRoad.poseAt(course.hiddenRoad.length);
    const placement = new THREE.Group();
    placement.name = 'Rustwall gate placement';
    placement.position.set(pose.x, pose.y, pose.z);
    placement.rotation.y = pose.heading;
    asset.scene.traverse(mesh => {
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    placement.add(asset.scene);
    group.add(placement);
    panel = gate;
    panelBaseY = panel.position.y;
    setGateOpen(fraction);
  }

  function prepareWash(asset) {
    const meshes = [], identity = new THREE.Matrix4();
    asset.scene.updateMatrixWorld(true);
    asset.scene.traverse(node => { if (node.isMesh) meshes.push(node); });
    if (!meshes.length || meshes.length > 2) throw Error('Wash asset needs one or two prepared mesh primitives.');
    let draws = 0, triangles = 0;
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      if (!geometry?.attributes.position || mesh.matrixWorld.elements.some((value, i) =>
        Math.abs(value - identity.elements[i]) > 1e-6)) throw Error('Wash transforms must be baked into normalized geometry.');
      geometry.computeBoundingBox();
      const {min, max} = geometry.boundingBox;
      if (min.x < -1.00001 || min.y < -.00001 || min.z < -1.00001 ||
          max.x > 1.00001 || max.y > 1.00001 || max.z > 1.00001)
        throw Error('Wash geometry leaves its normalized collision envelope.');
      draws += Array.isArray(mesh.material) ? geometry.groups.length : 1;
      triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
    }
    const walls = course.hiddenRoad.walls;
    if (draws > 2 || triangles * walls.length > 30000) throw Error('Wash asset exceeds its prepared instance budget.');
    const wash = new THREE.Group(), transform = new THREE.Object3D();
    wash.name = 'Rustwall wash';
    for (const mesh of meshes) {
      const banks = new THREE.InstancedMesh(mesh.geometry, mesh.material, walls.length);
      banks.name = 'Blender wash banks';
      banks.castShadow = true;
      banks.receiveShadow = true;
      for (let index = 0; index < walls.length; index++) {
        const wall = walls[index];
        transform.position.set(wall.x, wall.y, wall.z);
        // Stable bank order varies the two asymmetric faces without consuming
        // simulation randomness or changing the normalized collision envelope.
        const halfTurn = (Math.imul(index + 1, 0x9e3779b1) >>> 30) & 1;
        transform.rotation.set(0, wall.heading + halfTurn * Math.PI, 0);
        transform.scale.set(wall.halfX, wall.height, wall.halfZ);
        transform.updateMatrix();
        banks.setMatrixAt(index, transform.matrix);
      }
      banks.instanceMatrix.needsUpdate = true;
      banks.computeBoundingBox();
      banks.computeBoundingSphere();
      wash.add(banks);
    }
    group.add(wash);
  }

  async function request(kind) {
    let asset;
    try {
      asset = await loadAsset(kind);
      if (retired) { releaseUnused(asset); return false; }
      if (!asset?.scene) throw Error('Local Rustwall asset has no scene.');
      unattached.add(asset);
      if (kind === 'wall') prepareWall(asset); else prepareWash(asset);
      unattached.delete(asset);
      return true;
    } catch (error) {
      if (!retired) group.userData.loadErrors.push(`${kind}: ${String(error?.message || error)}`);
      return false;
    }
  }

  const ready = course.hiddenRoad ? Promise.all([request('wall'), request('wash')]).then(results => {
    for (const asset of unattached) releaseUnused(asset);
    unattached.clear();
    const loaded = !retired && results.every(Boolean);
    if (!retired) group.userData.assetStatus = loaded ? 'ready' : 'failed';
    return loaded;
  }) : Promise.resolve(false);
  return {group, ready, setGateOpen, dispose};
}
