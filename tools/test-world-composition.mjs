import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {buildEnvironment,disposeTree} from '../src/world.js';

// Captured before extracting surface/prop modules. Pacific alone was updated
// after the reviewed shoreline/lighthouse pass; see docs/COAST_SHOWCASE.md.
// UUIDs, allocation counters, callbacks and wall-clock values are not scene data.
const baseline={
  'pacific-canyon':{hash:'acbea287a1f4ca9c23ba0ce8a2932be71481758cd4e77137f9d4e52e1ce09a29',nodes:505,meshes:483,instances:11981,geometries:237,materials:102,textures:33},
  'high-country':{hash:'e35dfab3314c16eaf2310f79d7461e7c67696988b7962affb198232c0df66d8d',nodes:690,meshes:660,instances:15698,geometries:358,materials:136,textures:43},
  'harbor-highlands':{hash:'fe566e03af809c4e111090786602889c83283110e47f30db9c53507436b29e98',nodes:909,meshes:866,instances:116321,geometries:395,materials:167,textures:46},
  'titan-arena':{hash:'c41de422a08b1ea2ece04d823beeb28ddca8a81eec892df391745b6d602bb1a7',nodes:158,meshes:120,instances:2096,geometries:112,materials:35,textures:10},
  'midnight-chase':{hash:'19cdbf5301790070955b0a137de2015c40a8cd992b0e5bacb7c585b7e9e6d8f9',nodes:1140,meshes:1093,instances:171474,geometries:427,materials:129,textures:32},
  'ridge-rally':{hash:'077af3729537f970ebcc881e138bb69f0407346d715acb44c691dfa7ca34cf12',nodes:423,meshes:401,instances:14087,geometries:174,materials:101,textures:33},
  'titan-stunt-trial':{hash:'65c3d7f8d7bc8b3a9e525b8b083bae29a144b75af6ab20dac13c6e7e3e6e6f34',nodes:158,meshes:120,instances:2096,geometries:112,materials:35,textures:10},
  'neon-drift-trial':{hash:'4c7dd68148ba37de000c33ef202c29252b1fc8f4337d32e2c93546eae93539e4',nodes:1147,meshes:1101,instances:169154,geometries:425,materials:128,textures:32},
  'timberline-rush':{hash:'29f80c6b2f0eddd37900e39e10701cd1daceedcbfc8456de43f5543c90fe9066',nodes:512,meshes:473,instances:14950,geometries:239,materials:103,textures:31},
};
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
  equal(COURSE.length,9,'all nine event scenes are covered');
  for(const def of COURSE){
    const course=new Course(def,1989),before=JSON.stringify(course.features),world=buildEnvironment(course),signature=sceneSignature(world);
    equal(JSON.stringify(course.features),before,`${def.id}: scene assembly never changes physical feature placement`);
    if(process.argv.includes('--capture'))console.log(`  '${def.id}':${JSON.stringify(signature)},`);
    else equal(signature,baseline[def.id],`${def.id}: exact geometry, materials, textures, transforms, resource sharing and child order`);
    disposeTree(world);
  }
}finally{THREE.TextureLoader.prototype.load=oldLoad;if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;}
console.log(`World composition: ${checks} immutable-feature and exact complete-scene checks passed across nine events.`);
