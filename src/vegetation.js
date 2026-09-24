import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { renderedGroundHeight } from './rendered-ground.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

export const VEGETATION_CELL_SIZE = 200;

// Keep source indices stable: cactus shape, height and tint must not change
// when a cell boundary splits the original feature list.
export function vegetationCells(features, size = VEGETATION_CELL_SIZE) {
  const cells = new Map();
  features.forEach((feature, index) => {
    const key = `${Math.floor(feature.x / size)}:${Math.floor(feature.z / size)}`;
    if (!cells.has(key)) cells.set(key, { key, entries: [] });
    cells.get(key).entries.push({ feature, index });
  });
  return [...cells.values()];
}

export function finishVegetationCell(mesh, key, entries) {
  mesh.castShadow = mesh.receiveShadow = true;
  // Bounds include the full transformed crown/arms, not just feature centers.
  // The small padding avoids clipping foliage on a numerical frustum boundary.
  mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.02);
  mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .02;
  mesh.userData.vegetationCell = { key, size: VEGETATION_CELL_SIZE, entries };
  return mesh;
}

export function addPineTrees(group, trees, course) {
  if (!trees.length) return;
  const assets = pineTreeAssets(), object = new THREE.Object3D();
  const instances = new Map(), active = new Set(), seen = new Set(), changed = new Set();
  const axis = new THREE.Vector3(), fall = new THREE.Quaternion(), yaw = new THREE.Quaternion(),
    rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4();
  for (const { key, entries } of vegetationCells(trees)) {
    const trunks = new THREE.InstancedMesh(assets.trunk, assets.bark, entries.length);
    const leaves = new THREE.InstancedMesh(assets.crown, assets.needles, entries.length);
    trunks.name = `Pine trunks ${key}`; leaves.name = `Pine crowns ${key}`;
    entries.forEach(({ feature: tree }, i) => {
      const groundY=course?.def.expansion?renderedGroundHeight(course,tree):tree.y;
      object.position.set(tree.x, groundY - .24, tree.z); object.rotation.set(0, tree.heading, 0); object.scale.setScalar(tree.scale); object.updateMatrix();
      trunks.setMatrixAt(i, object.matrix); leaves.setMatrixAt(i, object.matrix);
      instances.set(tree.id, {tree, index:i, meshes:[trunks,leaves], root:object.position.clone(), upright:object.matrix.clone(), progress:null});
    });
    group.add(finishVegetationCell(trunks, key, entries), finishVegetationCell(leaves, key, entries));
  }
  return state => {
    seen.clear(); changed.clear();
    const now = Number.isFinite(state?.stageTimeSec) ? state.stageTimeSec : 0;
    const events = state?.status === 'menu' ? [] : state?.brokenScenery || [];
    for (const event of events) {
      if (event.kind !== 'tree' || seen.has(event.id)) continue;
      const item = instances.get(event.id), length = Math.hypot(event.directionX, event.directionZ);
      if (!item || !Number.isFinite(event.atTime) || !Number.isFinite(length) || length < 1e-6) continue;
      seen.add(event.id); active.add(item);
      const progress = THREE.MathUtils.clamp((now - event.atTime) / .72, 0, 1);
      const hidden = event.outcome === 'obliterate' &&
        now - event.atTime >= COMBAT_TUNING.roadside.sceneryVisibleSeconds;
      const key = `${progress}:${event.outcome || ''}:${hidden}`;
      if (key === item.progress) continue;
      item.progress = key;
      const eased = progress * progress * (3 - 2 * progress);
      axis.set(event.directionZ / length, 0, -event.directionX / length);
      fall.setFromAxisAngle(axis, eased * 1.38);
      yaw.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, item.tree.heading);
      rotation.multiplyQuaternions(fall, yaw);
      const distance = event.outcome === 'knock' ?
        COMBAT_TUNING.roadside.sceneryKnockDistance * eased : 0;
      object.position.copy(item.root);
      object.position.x += (event.directionX || 0) * distance;
      object.position.z += (event.directionZ || 0) * distance;
      matrix.compose(object.position, rotation, object.scale.setScalar(hidden ? 0 : item.tree.scale));
      for (const mesh of item.meshes) { mesh.setMatrixAt(item.index, matrix); changed.add(mesh); }
    }
    for (const item of active) if (!seen.has(item.tree.id)) {
      for (const mesh of item.meshes) { mesh.setMatrixAt(item.index, item.upright); changed.add(mesh); }
      item.progress = null; active.delete(item);
    }
    for (const mesh of changed) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.02);
      mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .02;
    }
  };
}

// Image-generated needle sprays form a full radial crown; roots are placed by
// course.groundAt so the same terrain surface supports every tree.
export function pineTreeAssets() {
  const parts=[];
  for(let tier=0;tier<12;tier++)for(let arm=0;arm<9;arm++){
    const reach=(2.65-tier*.205)*(1+.19*Math.sin(arm*4.1+tier*1.7)),angle=arm*Math.PI*2/9+tier*.81+.17*Math.sin(arm*3.1+tier);
    for(const tilt of [0,1.57,.8]){
      const g=new THREE.PlaneGeometry(reach,reach*.68);
      g.translate(reach*.46,0,0);g.rotateX(-Math.PI/2+tilt);g.rotateZ(-.12);
      g.rotateY(angle);g.translate(0,1.05+tier*.43+.09*Math.sin(arm*3+tier),0);parts.push(g);
    }
  }
  const crown=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const map=new THREE.TextureLoader().load('/assets/textures/pine-bough.png');
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const barkMap=new THREE.TextureLoader().load('/assets/textures/pine-bark.png');
  barkMap.colorSpace=THREE.SRGBColorSpace;barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;barkMap.repeat.set(1,3);barkMap.anisotropy=8;
  const needles=new THREE.MeshStandardMaterial({map,color:0x91b69b,roughness:.95,alphaTest:.48,side:THREE.DoubleSide});
  needles.onBeforeCompile=shader=>{
    shader.uniforms.pineCrownBias={value:.82};shader.uniforms.pineLowerShade={value:.80};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nuniform float pineCrownBias;\nvarying float vPineHeight;')
      .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
vPineHeight=clamp(position.y/5.9,0.0,1.0);
vec3 pineCrownNormal=normalize(vec3(position.x*.55,.75+vPineHeight*.35,position.z*.55));
objectNormal=normalize(mix(objectNormal,pineCrownNormal,pineCrownBias));`);
    // Smooth radial foliage lighting retains the crown's volume. Three's
    // normal transform still handles each tree, and both card faces receive
    // the same lighting rather than flashing pale on their reverse side.
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform float pineLowerShade;\nvarying float vPineHeight;')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(pineLowerShade,1.0,smoothstep(.1,.8,vPineHeight));')
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
#if defined(DOUBLE_SIDED) && !defined(FLAT_SHADED)
normal*=faceDirection;
nonPerturbedNormal=normal;
#endif`);
  };
  return {
    trunk:new THREE.CylinderGeometry(.06,.23,5.9,9).translate(0,2.95,0),
    crown,
    bark:new THREE.MeshStandardMaterial({map:barkMap,bumpMap:barkMap,bumpScale:.025,color:0xc8c5be,roughness:1}),
    needles,
  };
}
