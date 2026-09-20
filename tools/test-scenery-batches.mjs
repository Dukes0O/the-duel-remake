import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {addSceneryDetail} from '../src/scenery-detail.js';
import {disposeTree} from '../src/world.js';
import {resolveLightingSettings} from '../src/lighting-moods.js';

let checks=0,instances=0;
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const bytes=array=>hash(Buffer.from(array.buffer,array.byteOffset,array.byteLength).toString('base64'));

// Frozen pre-cell builder. Only assembly grouping/scratch math changes in the
// candidate; run all real station/warehouse recipes through both builders.
function legacyBuilder(group, materials) {
  const geometries = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(.5, .5, 1, 12),
    ring: new THREE.TorusGeometry(.43, .035, 6, 20).rotateX(Math.PI / 2),
  };
  const buckets = new Map(), matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const add = (feature, material, size, position, euler = [0, 0, 0], shape = 'box', tint = 0xffffff) => {
    const key = `${material}:${shape}`;
    if (!buckets.has(key)) buckets.set(key, { material: materials[material], shape, items: [] });
    rotation.setFromEuler(new THREE.Euler(...euler));
    matrix.compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(...size)).premultiply(frameMatrix(feature));
    buckets.get(key).items.push({ matrix: matrix.clone(), tint });
  };
  return { add, finish() {
    const used = new Set();
    for (const { material, shape, items } of buckets.values()) {
      const mesh = new THREE.InstancedMesh(geometries[shape], material, items.length); used.add(shape);
      mesh.name = `Architectural ${shape} details`;
      const color = new THREE.Color();
      items.forEach((item, i) => { mesh.setMatrixAt(i, item.matrix); mesh.setColorAt(i, color.set(item.tint)); });
      mesh.castShadow = material !== materials.paint && material !== materials.lamp && material !== materials.nightLamp;
      mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const [shape, geometry] of Object.entries(geometries)) if (!used.has(shape)) geometry.dispose();
    const usedMaterials = new Set([...buckets.values()].map(b => b.material));
    for (const [key, material] of Object.entries(materials)) if (key !== 'decal' && !usedMaterials.has(material)) material.dispose();
  } };
}

const source=readFileSync(new URL('../src/scenery-detail.js',import.meta.url),'utf8');
const start=source.indexOf('function instancedBuilder('),end=source.indexOf('\nfunction stationDetail(',start);
check(start>0&&end>start,'test isolates the production builder without replacing detail recipes');
const beforeSource=source.slice(0,start)+legacyBuilder.toString().replace('legacyBuilder','instancedBuilder')+'\n'+source.slice(end);
const loadSource=text=>import('data:text/javascript;base64,'+Buffer.from(text
  .replace("from 'three'",`from '${import.meta.resolve('three')}'`)
  .replace("from './rng.js'",`from '${new URL('../src/rng.js',import.meta.url).href}'`)
  +'\nexport {instancedBuilder as testBuilder};').toString('base64'));
const baseline=await loadSource(beforeSource),candidate=await loadSource(source);

const previousDocument=globalThis.document;
globalThis.document={createElement(){
  const canvas={width:0,height:0},commands=createHash('sha256');
  const record=(...args)=>commands.update(JSON.stringify(args));
  const context=new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:(image,...args)=>record('image',bytes(image.data),args),
    measureText:()=>({width:40}),
    createLinearGradient:(...args)=>{record('gradient',args);return {addColorStop:(...stop)=>record('stop',stop)};},
  },{get:(target,key)=>target[key]??((...args)=>record(key,args)),set:(target,key,value)=>{record(key,value);target[key]=value;return true;}});
  canvas.getContext=()=>context;canvas.commandDigest=()=>commands.copy().digest('hex');return canvas;
}};

const geometryHashes=new WeakMap(),materialHashes=new WeakMap();
function geometryHash(geometry){
  if(!geometryHashes.has(geometry))geometryHashes.set(geometry,hash({
    type:geometry.type,index:geometry.index?bytes(geometry.index.array):null,
    attributes:Object.fromEntries(Object.entries(geometry.attributes).map(([name,attribute])=>[name,{count:attribute.count,itemSize:attribute.itemSize,normalized:attribute.normalized,data:bytes(attribute.array)}])),
    groups:geometry.groups,drawRange:geometry.drawRange,
  }));
  return geometryHashes.get(geometry);
}
function value(item){
  if(item?.isTexture){
    const image=item.image;
    return {type:item.type,mapping:item.mapping,channel:item.channel,wrapS:item.wrapS,wrapT:item.wrapT,magFilter:item.magFilter,minFilter:item.minFilter,
      anisotropy:item.anisotropy,format:item.format,colorSpace:item.colorSpace,flipY:item.flipY,premultiplyAlpha:item.premultiplyAlpha,generateMipmaps:item.generateMipmaps,
      repeat:item.repeat.toArray(),offset:item.offset.toArray(),center:item.center.toArray(),rotation:item.rotation,
      image:image?{width:image.width,height:image.height,src:image.src,commands:image.commandDigest?.(),data:image.data?bytes(image.data):null}:null};
  }
  if(item?.toArray)return item.toArray();
  if(Array.isArray(item))return item.map(value);
  if(item&&typeof item==='object')return Object.fromEntries(Object.keys(item).sort().filter(key=>typeof item[key]!=='function').map(key=>[key,value(item[key])]));
  return item;
}
function materialHash(material){
  if(!materialHashes.has(material))materialHashes.set(material,hash(Object.fromEntries(Object.keys(material).sort()
    .filter(key=>!['uuid','id','version','userData','_listeners'].includes(key)&&typeof material[key]!=='function')
    .map(key=>[key,value(material[key])]))));
  return materialHashes.get(material);
}
function meshKey(mesh){return [mesh.name,geometryHash(mesh.geometry),materialHash(mesh.material),mesh.visible,mesh.castShadow,mesh.receiveShadow,mesh.frustumCulled,mesh.renderOrder,mesh.layers.mask].join('|');}
function instanceKey(mesh,index){return meshKey(mesh)+'|'+mesh.instanceMatrix.array.subarray(index*16,index*16+16).join(',')+'|'+mesh.instanceColor.array.subarray(index*3,index*3+3).join(',');}
function resources(group){
  const geometries=new Set(),materials=new Set(),textures=new Set(),meshes=[];
  group.traverse(object=>{if(!object.isMesh)return;meshes.push(object);geometries.add(object.geometry);materials.add(object.material);for(const entry of Object.values(object.material))if(entry?.isTexture)textures.add(entry);});
  return {geometries,materials,textures,meshes};
}
function verify(before,after,label){
  const expected=new Map(),matrix=new THREE.Matrix4(),vertex=new THREE.Vector3(),sphere=new THREE.Sphere();
  for(const mesh of before.children.filter(object=>object.isInstancedMesh))for(let i=0;i<mesh.count;i++){const key=instanceKey(mesh,i);expected.set(key,(expected.get(key)||0)+1);}
  const total=[...expected.values()].reduce((a,b)=>a+b,0),oldResources=resources(before),newResources=resources(after);
  for(const name of ['geometries','materials','textures'])equal(newResources[name].size,oldResources[name].size,`${label}: cells reuse the exact resource budget for ${name}`);
  const materialOwners=new Map(),geometryOwners=new Map();
  for(const mesh of after.children.filter(object=>object.isInstancedMesh)){
    const cell=mesh.userData.sceneryCell;
    equal(cell.size,256,`${label}: bounded cell size`);
    check(mesh.boundingBox.isBox3&&Number.isFinite(mesh.boundingSphere.radius),`${label}: complete finite bounds`);
    for(const [map,key,resource]of [[materialOwners,materialHash(mesh.material),mesh.material],[geometryOwners,geometryHash(mesh.geometry),mesh.geometry]]){
      if(map.has(key))equal(resource,map.get(key),`${label}: no per-cell resource copies`);else map.set(key,resource);
    }
    for(let i=0;i<mesh.count;i++){
      const key=instanceKey(mesh,i),remaining=expected.get(key)||0;
      check(remaining>0,`${label}: exact geometry, material, Float32 transform, tint and draw flags`);
      if(remaining===1)expected.delete(key);else expected.set(key,remaining-1);
      mesh.getMatrixAt(i,matrix);
      let enclosesVertices=true;
      for(let j=0;j<mesh.geometry.attributes.position.count;j++){
        vertex.fromBufferAttribute(mesh.geometry.attributes.position,j).applyMatrix4(matrix);
        if(!mesh.boundingBox.containsPoint(vertex)){enclosesVertices=false;break;}
      }
      check(enclosesVertices,`${label}: cell box encloses every scaled/rotated vertex`);
      sphere.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
      check(mesh.boundingSphere.center.distanceTo(sphere.center)+sphere.radius<=mesh.boundingSphere.radius+1e-5,`${label}: cell sphere cannot clip crossing parts`);
      instances++;
    }
  }
  equal(expected.size,0,`${label}: every original instance survives exactly once`);
  equal(after.children.filter(object=>object.isInstancedMesh).reduce((sum,mesh)=>sum+mesh.count,0),total,`${label}: total instance count is unchanged`);
  const regular=group=>group.children.filter(object=>object.isMesh&&!object.isInstancedMesh).map(mesh=>meshKey(mesh)+'|'+mesh.matrix.toArray().join(','));
  equal(regular(after),regular(before),`${label}: unbatched decals retain exact geometry/material/order`);
  return newResources;
}
function verifyDispose(group,owned,label){
  const entries=[...owned.geometries,...owned.materials,...owned.textures,...owned.meshes.filter(mesh=>mesh.isInstancedMesh)];
  const counts=entries.map(entry=>{let count=0;entry.addEventListener('dispose',()=>count++);return()=>count;});
  disposeTree(group);
  equal(counts.map(count=>count()),entries.map(()=>1),`${label}: shared resources and all instance buffers release once`);
}

const camera=new THREE.PerspectiveCamera(60,16/9,.15,2400),sun=new THREE.OrthographicCamera(-45,45,45,-45,1,240);
const projection=new THREE.Matrix4(),frustum=new THREE.Frustum();
function submissions(group,view,shadow=false){
  view.updateMatrixWorld(true);frustum.setFromProjectionMatrix(projection.multiplyMatrices(view.projectionMatrix,view.matrixWorldInverse));
  return group.children.reduce((sum,mesh)=>{
    if(mesh.isMesh&&(!shadow||mesh.castShadow)&&frustum.intersectsObject(mesh)){
      sum.draws++;sum.triangles+=(mesh.geometry.index?.count??mesh.geometry.attributes.position.count)/3*(mesh.isInstancedMesh?mesh.count:1);
    }return sum;
  },{draws:0,triangles:0});
}
function views(course,before,after){
  const section=course.sections.find(part=>part.theme==='city');if(!section)return [];
  return [.15,.40,.70,.9].map(fraction=>{
    const s=section.start+(section.end-section.start)*fraction,p=course.worldAt(s),eye=course.worldAt(s-8.7),aim=course.worldAt(s+26);
    camera.position.set(eye.x,eye.y+3.65,eye.z);camera.lookAt(aim.x,aim.y+1.05,aim.z);
    const offset=resolveLightingSettings(course.themeAt(s),{mood:'clear'}).sunOffset;
    sun.position.set(p.x+offset.x,p.y+offset.y,p.z+offset.z);sun.lookAt(p.x,p.y,p.z);
    return {s:Math.round(s),cameraBefore:submissions(before,camera),cameraAfter:submissions(after,camera),shadowBefore:submissions(before,sun,true),shadowAfter:submissions(after,sun,true)};
  });
}

try{
  const cases=COURSE.map(def=>({def,seed:1989}));
  for(const[id,seed]of[['harbor-highlands',42],['harbor-highlands',17],['midnight-chase',42],['neon-drift-trial',17]])cases.push({def:COURSE.find(def=>def.id===id),seed});
  for(const{def,seed}of cases){
    const course=new Course(def,seed),features=JSON.stringify(course.features),oldWorld=new THREE.Group(),newWorld=new THREE.Group();
    const before=baseline.addSceneryDetail(oldWorld,course),after=addSceneryDetail(newWorld,course),label=`${def.id}/${seed}`;
    equal(JSON.stringify(course.features),features,`${label}: physical features and seeded state remain immutable`);
    before.updateMatrixWorld(true);after.updateMatrixWorld(true);
    const owned=verify(before,after,label);
    check(after.children.length<=before.children.length*45,`${label}: spatial draw allocation remains bounded`);
    if(seed===1989&&['harbor-highlands','midnight-chase','neon-drift-trial'].includes(def.id)){
      const estimates=views(course,before,after);
      check(estimates.every(view=>view.cameraAfter.triangles<view.cameraBefore.triangles),`${label}: every sampled chase view submits fewer triangles`);
      check(estimates.every(view=>view.shadowAfter.triangles<view.shadowBefore.triangles),`${label}: every sampled sun frustum submits fewer triangles`);
      console.log(JSON.stringify({event:def.id,originalDraws:before.children.length,cellDraws:after.children.length,views:estimates}));
    }
    verifyDispose(after,owned,label);disposeTree(before);
  }
  // Explicit cell-edge fixture includes duplicate transforms, negative cells,
  // large parts, nonuniform scale and oblique frames, not just normal roads.
  const builds=[baseline.testBuilder,candidate.testBuilder].map(factory=>{
    const group=new THREE.Group(),materials={steel:new THREE.MeshStandardMaterial({color:0x9ba6a6,roughness:.57,metalness:.72})};
    const batch=factory(group,materials);
    for(const[x,z,heading]of[[255.99,256.01,.73],[-256.01,-255.99,-1.37],[0,0,Math.PI]]){
      const feature={x,y:7.2,z,heading};
      for(const shape of ['box','cylinder','ring'])for(const position of [[0,0,0],[12,18,-5],[0,0,0]])batch.add(feature,'steel',[35,.07,11],position,[.47,.23,-.61],shape,0x778d98);
    }
    batch.finish();return group;
  });
  const owned=verify(builds[0],builds[1],'adversarial cell edges');verifyDispose(builds[1],owned,'adversarial cell edges');disposeTree(builds[0]);
}finally{if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
console.log(`Scenery batches: ${checks} checks; ${instances} exact original instances, full bounds, resource/disposal budgets and frustum estimates verified.`);
