import * as THREE from 'three';
import {applyNightWash} from './night-wash.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { renderedGroundHeight } from './rendered-ground.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';

export const VEGETATION_CELL_SIZE = 200;
// Far-band firs (ARDENNES-FAR-FOREST-LIGHT) are drawn in bigger cells: they are small and many, so fewer, larger draws.
export const FAR_PINE_CELL_SIZE = 400;

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

// Presentation-only replacement of existing Ardennes trees; never draws simulation RNG.
export function beechTreePlacements(course) {
  const spec=course?.def?.id==='ardennes-forest' ? course.def.beech : null;
  if (!spec) return [];
  if (!Array.isArray(spec.groves) || !spec.groves.length || spec.groves.some(grove =>
      ![grove.s,grove.reach].every(Number.isFinite) || grove.s<0 || grove.s>=course.length || grove.reach<=0) ||
      !Array.isArray(spec.scales) || spec.scales.length!==3 || spec.scales.some(scale=>!Number.isFinite(scale)||scale<=0))
    throw Error('Ardennes beech needs finite authored groves and three scale variants.');
  if (spec.setback!==undefined && !(Number.isFinite(spec.setback)&&spec.setback>=0))
    throw Error('Ardennes beech setback must be a finite distance beyond the road edge.');
  const rows=[];
  for (const tree of course.features.trees) {
    // Far-band trees (ARDENNES-FAR-FOREST) are never beeches: the beech set stays the accepted one.
    if (tree.farForest) continue;
    if (!spec.groves.some(grove=>Math.abs(tree.s-grove.s)<=grove.reach) ||
        Math.abs(tree.off)<course.roadHalfWidthAt(tree.s)+Math.max(course.def.scenery.forest.from,spec.setback??0)) continue;
    let hash=2166136261;
    for (let i=0;i<tree.id.length;i++) hash=Math.imul(hash^tree.id.charCodeAt(i),16777619)>>>0;
    if (hash%3===0) continue; // Keep actual firs interleaved inside each group.
    rows.push(Object.freeze({id:'ardennes-beech',s:tree.s,lateral:tree.off,
      heading:tree.heading-course.at(tree.s).heading,scale:tree.scale*spec.scales[Math.floor(hash/3)%3],
      scenery:Object.freeze({kind:'tree',id:tree.id})}));
  }
  return rows;
}

export function addPineTrees(group, trees, course, {kits} = {}) {
  if (!trees.length) return;
  const selected=beechTreePlacements(course), ids=new Set(selected.map(row=>row.scenery.id));
  if (selected.length && kits?.status!=='ready') throw Error('Ardennes beech needs its prepared original track-kit owner.');
  const allPines=selected.length?trees.filter(tree=>!ids.has(tree.id)):trees;
  // Far-band firs (60 m and more from every road) are drawn by their own light meshes below; the first band's cells
  // are exactly what they were before the far band existed.
  const farPines=allPines.filter(tree=>tree.farForest), pines=farPines.length?allPines.filter(tree=>!tree.farForest):allPines;
  const baseAssets = allPines.length?pineTreeAssets():null;
  let assets = baseAssets;
  if (assets && course?.def.scenery?.lampWash) {
    assets = {...assets, bark: assets.bark.clone(), needles: assets.needles.clone()};
    for (const [material, original] of [[assets.bark, baseAssets.bark], [assets.needles, baseAssets.needles]]) {
      material.onBeforeCompile = original.onBeforeCompile;
      material.customProgramCacheKey = original.customProgramCacheKey.bind(original);
      material.userData.sharedAsset = false;
      applyNightWash(material, course.def.scenery.lampWash);
    }
    // Texture objects remain owned by the live clones. Retire unused sources.
    baseAssets.bark.dispose();
    if (!farPines.length) baseAssets.needles.dispose();
  }
  const object = new THREE.Object3D();
  const instances = new Map(), active = new Set(), seen = new Set(), changed = new Set();
  const axis = new THREE.Vector3(), fall = new THREE.Quaternion(), yaw = new THREE.Quaternion(),
    rotation = new THREE.Quaternion(), matrix = new THREE.Matrix4();
  for (const { key, entries } of vegetationCells(pines)) {
    const trunks = new THREE.InstancedMesh(assets.trunk, assets.bark, entries.length);
    const leaves = new THREE.InstancedMesh(assets.crown, assets.needles, entries.length);
    trunks.name = `Pine trunks ${key}`; leaves.name = `Pine crowns ${key}`;
    // A tree with a `tint` (autumn colours, track-script-course.js) has its crown
    // coloured by it; the others in the cell stay white, which the shader reads as none.
    if (entries.some(({ feature }) => feature.tint)) {
      leaves.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(entries.length * 3).fill(1), 3);
      entries.forEach(({ feature }, i) => { if (feature.tint) leaves.instanceColor.setXYZ(i, ...feature.tint); });
    }
    entries.forEach(({ feature: tree }, i) => {
      const groundY=course?.def.expansion||course?.def.ridgeLandform?renderedGroundHeight(course,tree):tree.y;
      object.position.set(tree.x, groundY - .24, tree.z); object.rotation.set(0, tree.heading, 0); object.scale.setScalar(tree.scale); object.updateMatrix();
      trunks.setMatrixAt(i, object.matrix); leaves.setMatrixAt(i, object.matrix);
      instances.set(tree.id, {tree, index:i, meshes:[trunks,leaves], root:object.position.clone(), upright:object.matrix.clone(), progress:null});
    });
    group.add(finishVegetationCell(trunks, key, entries), finishVegetationCell(leaves, key, entries));
  }
  if (farPines.length) {
    const crown = farPineCrown();
    for (const { key, entries } of vegetationCells(farPines, FAR_PINE_CELL_SIZE)) {
      const crowns = new THREE.InstancedMesh(crown, baseAssets.needles, entries.length);
      crowns.name = `Far pine crowns ${key}`;
      if (entries.some(({ feature }) => feature.tint)) {
        crowns.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(entries.length * 3).fill(1), 3);
        entries.forEach(({ feature }, i) => { if (feature.tint) crowns.instanceColor.setXYZ(i, ...feature.tint); });
      }
      entries.forEach(({ feature: tree }, i) => {
        object.position.set(tree.x, tree.y - .24, tree.z); object.rotation.set(0, tree.heading, 0); object.scale.setScalar(tree.scale); object.updateMatrix();
        crowns.setMatrixAt(i, object.matrix);
        instances.set(tree.id, {tree, index:i, meshes:[crowns], root:object.position.clone(), upright:object.matrix.clone(), progress:null});
      });
      finishVegetationCell(crowns, key, entries);
      // Nothing out here is inside the sun's shadow box (45 m round the car), so the far firs neither cast a shadow
      // nor need the shadow-map draw; the material and its shadow lookups stay the near firs' own program.
      crowns.castShadow = false; crowns.userData.vegetationCell.size = FAR_PINE_CELL_SIZE;
      group.add(crowns);
    }
  }
  if (selected.length) {
    const byId=new Map(trees.map(tree=>[tree.id,tree]));
    for (const [index,row] of kits.placements.entries()) if (row.id==='ardennes-beech' && ids.has(row.scenery?.id)) {
      const tree=byId.get(row.scenery.id), upright=kits.getPlacementPose(index);
      if (!tree || !upright || instances.has(tree.id)) throw Error('Ardennes beech binding is absent or duplicated.');
      instances.set(tree.id,{tree,index,kit:true,meshes:[],root:new THREE.Vector3().setFromMatrixPosition(upright),
        upright,drawScale:row.scale[0],progress:null});
    }
    if (selected.some(row=>!instances.has(row.scenery.id))) throw Error('Ardennes beech binding is incomplete.');
  }
  return state => {
    let changedKits=false;
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
      matrix.compose(object.position, rotation, object.scale.setScalar(hidden ? 0 : item.drawScale ?? item.tree.scale));
      for (const mesh of item.meshes) { mesh.setMatrixAt(item.index, matrix); changed.add(mesh); }
      if (item.kit) {kits.setPlacementPose(item.index,matrix,false);changedKits=true;}
    }
    for (const item of active) if (!seen.has(item.tree.id)) {
      for (const mesh of item.meshes) { mesh.setMatrixAt(item.index, item.upright); changed.add(mesh); }
      if (item.kit) {kits.setPlacementPose(item.index,item.upright,false);changedKits=true;}
      item.progress = null; active.delete(item);
    }
    for (const mesh of changed) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.02);
      mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .02;
    }
    if (changedKits) kits.refresh();
  };
}

// A far fir (ARDENNES-FAR-FOREST-LIGHT): the near fir's crown built from 7 tiers of 7 arms with two cards each (98
// cards, 196 triangles) instead of 324 cards (648 triangles), same bough texture, same height and spread, no trunk
// (from 60 m its bare foot is a few pixels). Cards are cut larger so the crown fills the same outline.
export function farPineCrown() {
  const parts=[];
  for(let tier=0;tier<7;tier++){
    const mid=tier*1.7+.5;
    for(let arm=0;arm<7;arm++){
      const reach=(2.65-mid*.205)*(1+.19*Math.sin(arm*4.1+mid*1.7))*1.18,angle=arm*Math.PI*2/7+mid*.81+.17*Math.sin(arm*3.1+mid);
      for(const tilt of [.8,1.57]){
        const g=new THREE.PlaneGeometry(reach,reach*.68);
        g.translate(reach*.46,0,0);g.rotateX(-Math.PI/2+tilt);g.rotateZ(-.12);
        g.rotateY(angle);g.translate(0,.85+mid*.43+.09*Math.sin(arm*3+mid),0);parts.push(g);
      }
    }
  }
  const crown=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  return crown;
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
      .replace('#include <color_fragment>',`#include <color_fragment>
diffuseColor.rgb*=mix(pineLowerShade,1.0,smoothstep(.1,.8,vPineHeight));
#ifdef USE_INSTANCING_COLOR
// An autumn tree has an instance colour that is not white: its leaves keep their light and shade but take the tint.
float pineLeaf=dot(diffuseColor.rgb/max(vColor,vec3(.05)),vec3(.2126,.7152,.0722));
diffuseColor.rgb=mix(diffuseColor.rgb,vColor*(pineLeaf*10.0+.12),1.0-step(.999,min(vColor.r,min(vColor.g,vColor.b))));
#endif`)
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
