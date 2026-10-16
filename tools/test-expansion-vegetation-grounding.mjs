import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { beechTreePlacements, addPineTrees, vegetationCells } from '../src/vegetation.js';
import { terrainGeometry, farTerrainGeometry } from '../src/world-surfaces.js';
import {createTrackKits} from '../src/track-kits.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {readFile} from 'node:fs/promises';

let checks=0,trees=0,farRoots=0,groundReads=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const originalLoad=THREE.TextureLoader.prototype.load;
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),matrix=new THREE.Matrix4();
try{
  for(const def of COURSE.filter(def=>def.expansion)){
    const course=new Course(def,1989),features=course.features.trees.filter(tree=>tree.theme!=='desert'),before=JSON.stringify(course.features);
    const terrain=[new THREE.Mesh(terrainGeometry(course),material),new THREE.Mesh(farTerrainGeometry(course),material)],group=new THREE.Group();
    const originalGround=course.groundAt;let reads=0;course.groundAt=function(...args){reads++;return originalGround.apply(this,args);};
    addPineTrees(group,features,course);groundReads+=reads;
    check(group.children.length===vegetationCells(features).length*2,`${def.id}: grounding preserves exactly two pine draws per existing cell`);
    for(const mesh of group.children.filter(mesh=>mesh.name.startsWith('Pine trunks'))){
      check(mesh.boundingBox&&mesh.boundingSphere,`${def.id}: moved instances recompute their culling bounds`);
      for(let i=0;i<mesh.count;i++){
        const tree=mesh.userData.vegetationCell.entries[i].feature;mesh.getMatrixAt(i,matrix);
        check(matrix.elements[12]===Math.fround(tree.x)&&matrix.elements[14]===Math.fround(tree.z),`${def.id}: visual rooting preserves physical X/Z placement exactly at instance precision`);
        ray.set(new THREE.Vector3(tree.x,tree.y+50,tree.z),down);const hit=ray.intersectObjects(terrain,false)[0];
        check(!!hit,`${def.id}/${tree.id}: a visible near or far triangle supports the root`);
        check(Math.abs(hit.point.y-matrix.elements[13]-.24)<.001,`${def.id}/${tree.id}: root is buried exactly24cm, never floating or over-buried`);
        const root=new THREE.Vector3().setFromMatrixPosition(matrix);check(mesh.boundingBox.containsPoint(root),`${def.id}: root remains inside instance bounds`);
        if(Math.abs(tree.off)>65)farRoots++;trees++;
      }
    }
    const cached=new THREE.Group(),beforeCached=reads;addPineTrees(cached,features,course);
    check(reads===beforeCached,`${def.id}: repeated construction reuses terrain rows and far vertices without new ground evaluation`);
    check(JSON.stringify(course.features)===before,`${def.id}: grounding never edits feature heights, collision hulls, scenery RNG or placements`);
    for(const surface of terrain)surface.geometry.dispose();
    for(const root of[group,cached]){const geometries=new Set(),materials=new Set();root.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)materials.add(object.material);});for(const geometry of geometries)geometry.dispose();for(const mat of materials){mat.map?.dispose();mat.dispose();}}
  }
  // Ridge-landform courses (Panorama Ridge) root their trees on the drawn mountain, like expansion courses, so they are not legacy; test-circuit-panorama checks their roots.
  for(const def of COURSE.filter(def=>!def.expansion&&!def.ridgeLandform)){
    const course=new Course(def,1989),features=course.features.trees.filter(tree=>tree.theme!=='desert'),group=new THREE.Group();
    const before=JSON.stringify(course.features),selected=beechTreePlacements(course),selectedIds=new Set(selected.map(row=>row.scenery.id));
    let kits=null;const terrain=[];
    if(selected.length){
      // Production gives the pine/bound-beech renderer its prepared original owner.
      // Keep real GLB geometry; headless image decoding follows test-track-kits.
      const parser=new GLTFLoader();parser.register(()=>({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
      kits=createTrackKits(course,{placements:selected,loadAsset:async assetPath=>{
        const bytes=await readFile(new URL('../public'+assetPath,import.meta.url));
        return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      }});
      check(await kits.ready===true,def.id+': real original beech High/LOD owner is ready');
      check(kits.placements.length===selected.length,def.id+': every selected beech has one prepared placement');
      terrain.push(new THREE.Mesh(terrainGeometry(course),material),new THREE.Mesh(farTerrainGeometry(course),material));
    }
    try{
      course.groundAt=()=>{throw new Error('Legacy pine construction must not resample or move roots');};addPineTrees(group,features,course,{kits});
      for(const mesh of group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const tree=mesh.userData.vegetationCell.entries[i].feature;
        check(matrix.elements[13]===Math.fround(tree.y-.24),def.id+': legacy visual root remains bit-identical');}
      const pines=features.filter(tree=>!selectedIds.has(tree.id));
      check(group.children.length===vegetationCells(pines).length*2,def.id+': every remaining legacy pine cell keeps exactly two draws');
      const drawn=new Set();
      for(const mesh of group.children.filter(mesh=>mesh.name.startsWith('Pine trunks ')))for(const row of mesh.userData.vegetationCell.entries){
        check(!selectedIds.has(row.feature.id)&&!drawn.has(row.feature.id),def.id+': no bound beech or duplicate is drawn as a pine');drawn.add(row.feature.id);
      }
      const byId=new Map(features.map(tree=>[tree.id,tree])),bound=new Set();
      for(const [index,row] of (kits?.placements||[]).entries()){
        const tree=byId.get(row.scenery.id),pose=kits.getPlacementPose(index);
        check(!!tree&&!!pose&&!bound.has(tree.id)&&selectedIds.has(tree.id),def.id+': each original beech is bound exactly once');bound.add(tree.id);
        check(pose.elements[12]===tree.x&&pose.elements[14]===tree.z,def.id+': beech root keeps exact physical X/Z');
        ray.set(new THREE.Vector3(tree.x,tree.y+50,tree.z),down);const hit=ray.intersectObjects(terrain,false)[0];
        check(!!hit,def.id+'/'+tree.id+': an actual drawn terrain triangle supports the original beech');
        check(Math.abs(hit.point.y-pose.elements[13])<.001,def.id+'/'+tree.id+': original beech root meets the drawn triangle within the existing1mm tolerance');
      }
      check(drawn.size+bound.size===features.length&&bound.size===selected.length,def.id+': every original tree is conserved across pines and bound beeches');
      check(JSON.stringify(course.features)===before,def.id+': owner binding never changes feature heights, colliders, RNG or placement');
    }finally{kits?.dispose();for(const surface of terrain)surface.geometry.dispose();}
  }
  check(trees>2500&&farRoots>400,'exercise all expansion pine biomes and hundreds of actual far-only roots');
}finally{THREE.TextureLoader.prototype.load=originalLoad;material.dispose();}
console.log(`Expansion vegetation grounding: ${checks} checks, ${trees} exact rendered roots (${farRoots} far-only); ${groundReads} cached construction ground reads, no added per-frame work.`);
