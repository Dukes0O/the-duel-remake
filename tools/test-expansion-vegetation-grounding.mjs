import assert from 'node:assert/strict';
import * as THREE from 'three';
import { COURSE } from '../src/config.js';
import { Course } from '../src/course.js';
import { addPineTrees, vegetationCells } from '../src/vegetation.js';
import { terrainGeometry, farTerrainGeometry } from '../src/world-surfaces.js';

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
  for(const def of COURSE.filter(def=>!def.expansion)){
    const course=new Course(def,1989),features=course.features.trees.filter(tree=>tree.theme!=='desert'),group=new THREE.Group();
    course.groundAt=()=>{throw new Error('Legacy pine construction must not resample or move roots');};addPineTrees(group,features,course);
    for(const mesh of group.children)for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);const tree=mesh.userData.vegetationCell.entries[i].feature;
      check(matrix.elements[13]===Math.fround(tree.y-.24),`${def.id}: legacy visual root remains bit-identical`);}
  }
  check(trees>2500&&farRoots>400,'exercise all expansion pine biomes and hundreds of actual far-only roots');
}finally{THREE.TextureLoader.prototype.load=originalLoad;material.dispose();}
console.log(`Expansion vegetation grounding: ${checks} checks, ${trees} exact rendered roots (${farRoots} far-only); ${groundReads} cached construction ground reads, no added per-frame work.`);
