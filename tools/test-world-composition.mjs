import {loadWorldSignatures} from './course-fixtures.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {CIRCUIT_MANIFESTS} from '../src/circuit-manifests.js';
import {buildEnvironment,disposeTree} from '../src/world.js';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createTrackKits} from '../src/track-kits.js';

// Reviewed scene composition after spatial scenery batching and harbor detail.
// Metric road-sign lettering changes only canvas texture commands. Restoring
// the old labels reproduced all sixteen prior complete-scene hashes exactly.
// Instance parity and bounded harbor changes have separate focused tests.
// UUIDs, allocation counters, callbacks and wall-clock values are not scene data.
const baseline=loadWorldSignatures();
// First signatures for explicitly reviewed new dev scenes. Existing enabled
// coverage and comparisons still run; this never invents placeholder baselines.
const captureNewArg=process.argv.find(arg=>arg.startsWith('--capture-new='));
const captureNewIds=captureNewArg?captureNewArg.slice('--capture-new='.length).split(','):[];
if(new Set(captureNewIds).size!==captureNewIds.length)throw Error('Duplicate initial scene capture id.');
const captureNew=captureNewIds.map(id=>{
  const def=ALL_CIRCUITS.find(row=>row.id===id),manifest=CIRCUIT_MANIFESTS.find(row=>row.id===id);
  if(!def||manifest?.state!=='dev'||COURSE.some(row=>row.id===id)||Object.hasOwn(baseline,id))
    throw Error('Initial scene capture requires a known disabled dev event with no existing baseline: '+id);
  return def;
});
let checks=0;
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytes=array=>createHash('sha256').update(Buffer.from(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
const oldLoad=THREE.TextureLoader.prototype.load,oldDocument=globalThis.document;
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.image={src:url};return texture;};
globalThis.document={createElement(){
  const commands=createHash('sha256'),canvas={width:0,height:0};
  const record=(...args)=>commands.update(JSON.stringify(args));
  const context=new Proxy({
    createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
    putImageData:(image,...args)=>record('putImageData',bytes(image.data),args),
    measureText:()=>({width:40}),
    createLinearGradient:(...args)=>{record('gradient',args);return {addColorStop:(...stop)=>record('colorStop',stop)};},
    // Authored circuits paint pebble textures with radial gradients; the older scenes never call this.
    createRadialGradient:(...args)=>{record('radialGradient',args);return {addColorStop:(...stop)=>record('colorStop',stop)};},
  },{get:(target,key)=>target[key]??((...args)=>record(key,args)),set:(target,key,value)=>{record('set',key,value);target[key]=value;return true;}});
  canvas.getContext=()=>context;canvas.commandDigest=()=>commands.copy().digest('hex');return canvas;
}};
function textureData(texture){
  const image=texture.image;
  return {type:texture.type,mapping:texture.mapping,channel:texture.channel,wrapS:texture.wrapS,wrapT:texture.wrapT,
    magFilter:texture.magFilter,minFilter:texture.minFilter,anisotropy:texture.anisotropy,format:texture.format,internalFormat:texture.internalFormat,
    offset:texture.offset.toArray(),repeat:texture.repeat.toArray(),center:texture.center.toArray(),rotation:texture.rotation,matrix:texture.matrix.toArray(),matrixAutoUpdate:texture.matrixAutoUpdate,
    generateMipmaps:texture.generateMipmaps,premultiplyAlpha:texture.premultiplyAlpha,flipY:texture.flipY,unpackAlignment:texture.unpackAlignment,colorSpace:texture.colorSpace,
    image:image?.src?{src:image.src}:image?.data?{width:image.width,height:image.height,data:bytes(image.data)}:image?{width:image.width,height:image.height,commands:image.commandDigest?.()}:null};
}
function sceneSignature(world){
  const geometries=new Map(),materials=new Map(),textures=new Map();
  const attribute=value=>value?{itemSize:value.itemSize,count:value.count,normalized:value.normalized,type:value.array.constructor.name,data:bytes(value.array)}:null;
  const bounds=value=>value?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,item?.toArray?item.toArray():item])):null;
  const geometry=g=>{
    if(!geometries.has(g))geometries.set(g,{id:geometries.size,data:digest({type:g.type,attributes:Object.fromEntries(Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>[key,attribute(value)])),index:attribute(g.index),groups:g.groups,drawRange:g.drawRange,boundingBox:bounds(g.boundingBox),boundingSphere:bounds(g.boundingSphere)})});
    return geometries.get(g);
  };
  function value(item){
    if(item?.isTexture){if(!textures.has(item))textures.set(item,{id:textures.size,data:textureData(item)});return textures.get(item);}
    if(item?.toArray)return item.toArray();
    if(Array.isArray(item))return item.map(value);
    if(item&&typeof item==='object')return Object.fromEntries(Object.keys(item).sort().filter(key=>typeof item[key]!=='function').map(key=>[key,value(item[key])]));
    return item;
  }
  const material=m=>{
    if(!materials.has(m)){
      const data=Object.fromEntries(Object.keys(m).sort().filter(key=>!['uuid','id','version','userData','_listeners'].includes(key)&&typeof m[key]!=='function').map(key=>[key,value(m[key])]));
      materials.set(m,{id:materials.size,data:digest(data)});
    }
    return materials.get(m);
  };
  let nodes=0,meshes=0,instances=0;
  const visit=object=>{
    nodes++;if(object.isMesh)meshes++;if(object.isInstancedMesh)instances+=object.count;
    return {type:object.type,name:object.name,position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),matrix:object.matrix.toArray(),matrixAutoUpdate:object.matrixAutoUpdate,
      visible:object.visible,castShadow:object.castShadow,receiveShadow:object.receiveShadow,frustumCulled:object.frustumCulled,renderOrder:object.renderOrder,layers:object.layers.mask,
      geometry:object.geometry?geometry(object.geometry):null,material:object.material?(Array.isArray(object.material)?object.material.map(material):material(object.material)):null,
      count:object.count,instanceMatrix:attribute(object.instanceMatrix),instanceColor:attribute(object.instanceColor),boundingBox:bounds(object.boundingBox),boundingSphere:bounds(object.boundingSphere),
      children:object.children.map(visit)};
  };
  const hash=digest(visit(world));
  return {hash,nodes,meshes,instances,geometries:geometries.size,materials:materials.size,textures:textures.size};
}
try{
  // Explicit capture records real newly enabled scenes before their first baseline exists.
  if(!process.argv.includes('--capture'))
  equal(COURSE.length,Object.keys(baseline).filter(id=>COURSE.some(def=>def.id===id)).length,'every enabled event scene has its reviewed baseline');
  for(const def of [...COURSE,...captureNew]){
    const course=new Course(def,1989),before=JSON.stringify(course.features);
    let trackKits;
    if(def.id==='ardennes-forest'&&def.beech){
      const parser=new GLTFLoader();
      parser.register(()=>({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
      trackKits=createTrackKits(course,{loadAsset:async path=>{
        const bytes=await readFile(new URL('../public'+path,import.meta.url));
        return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
      }});
      if(!await trackKits.ready){const error=trackKits.error;trackKits.dispose();throw error??Error('Ardennes original kits not ready');}
    }
    try {
    const world=buildEnvironment(course,trackKits?{trackKits}:undefined),signature=sceneSignature(world);
    equal(JSON.stringify(course.features),before,`${def.id}: scene assembly never changes physical feature placement`);
    if(process.argv.includes('--capture')||captureNewIds.includes(def.id))console.log(`  '${def.id}':${JSON.stringify(signature)},`);
    else equal(signature,baseline[def.id],`${def.id}: exact geometry, materials, textures, transforms, resource sharing and child order`);
    disposeTree(world);
    }finally{trackKits?.dispose();}
  }
}finally{THREE.TextureLoader.prototype.load=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
console.log(`World composition: ${checks} immutable-feature and exact complete-scene checks passed across twenty events.`);
