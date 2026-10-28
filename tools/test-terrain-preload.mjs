// SUMMIT-TERRAIN-PRELOAD: the preload makes exactly the ground the build would have made itself.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {buildEnvironment,terrainGeometry,farTerrainGeometry} from '../src/world.js';
import {applySnowTerrain} from '../src/snow-world.js';
import {createTrackKits} from '../src/track-kits.js';
import {createTerrainPreload} from '../src/terrain-preload.js';
import {ARENA_VENUES} from '../src/arena/venues.js';

const oldLoad=THREE.TextureLoader.prototype.load,oldDocument=globalThis.document;
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.image={src:url};return texture;};
const noop=()=>{};
globalThis.document={createElement(){
  const context=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:noop,measureText:()=>({width:40}),
    createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},
  {get:(target,key)=>target[key]??noop,set:(target,key,value)=>{target[key]=value;return true;}});
  return {width:0,height:0,getContext:()=>context};
}};
let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const same=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const course=id=>new Course(COURSE.find(row=>row.id===id),1989);
const bytes=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
function sameGeometry(a,b,label){
  same(Object.keys(a.attributes).sort(),Object.keys(b.attributes).sort(),label+': same attributes');
  for(const name of Object.keys(a.attributes)){
    ok(a.attributes[name].array.constructor===b.attributes[name].array.constructor,label+' '+name+': same array type');
    ok(Buffer.compare(bytes(a.attributes[name].array),bytes(b.attributes[name].array))===0,label+' '+name+': same values');
  }
  ok(Buffer.compare(bytes(a.index.array),bytes(b.index.array))===0,label+': same triangles');
  same(a.groups,b.groups,label+': same material groups');
}
// Run to the end in the smallest slices (each advance does one step), as a page would in many frames, and count them.
function runSliced(preload,limit=1000000){
  let slices=0;
  while(!preload.done&&slices<limit){preload.advance(0);slices++;}
  return slices;
}

try {
  // Each course: the preload's near and far ground equal the straight-through builders, with and without winter coverage.
  const cases=[['summit-run',true],['summit-run',false],['tremblant-woods',false],['midnight-chase',false],['pacific-canyon',false],
    ['ridge-rally',false],['titan-arena',false],['titan-freestyle',false],['harbour-lights',false]];
  for(const [id,winterOn] of cases){
    const direct=course(id),viaPreload=course(id),winter=winterOn&&!!direct.def.snowWorld;
    const terrain=winter?applySnowTerrain(terrainGeometry(direct),direct):terrainGeometry(direct);
    const far=winter?applySnowTerrain(farTerrainGeometry(direct),direct):farTerrainGeometry(direct);
    const preload=createTerrainPreload();
    preload.request(viaPreload,winterOn);
    ok(preload.active&&!preload.done,id+': a request starts work');
    ok(id==='titan-freestyle'||runSliced(preload)>10,id+': the work comes in many slices');
    runSliced(preload);
    ok(preload.done,id+': finished');
    const got=preload.take(viaPreload,winterOn);
    ok(got&&!preload.active,id+': take hands the result over once');
    sameGeometry(got.terrain,terrain,id+' near ground'+(winter?' (winter)':''));
    sameGeometry(got.farTerrain,far,id+' far ground'+(winter?' (winter)':''));
    if(winter)ok(got.terrain.attributes.winterWeight&&got.farTerrain.attributes.winterWeight,id+': winter coverage present');
    else ok(!got.terrain.attributes.winterWeight,id+': no winter coverage when winter is off');
  }

  // Taking early finishes what is left, straight through, with the same result.
  {
    const a=course('tremblant-woods'),b=course('tremblant-woods'),preload=createTerrainPreload();
    preload.request(b,false);preload.advance(0);preload.advance(0);
    const got=preload.take(b,false);
    sameGeometry(got.terrain,terrainGeometry(a),'early take: near ground');
    sameGeometry(got.farTerrain,farTerrainGeometry(a),'early take: far ground');
  }

  // A request for something else is not served, and a new request replaces the old work.
  {
    const a=course('tremblant-woods'),b=course('pacific-canyon'),preload=createTerrainPreload();
    preload.request(a,false);
    same(preload.take(b,false),null,'another course gets nothing');
    ok(preload.active,'a refused take leaves the work alone');
    preload.request(b,false);preload.request(b,false);
    same(preload.take(a,false),null,'the replaced course is gone');
    ok(preload.take(b,false)!==null,'the new request is served');
    ok(!preload.active,'nothing is left after a take');
    preload.request(a,false);preload.dispose();
    ok(!preload.active&&preload.done,'dispose drops the work');
  }

  // Summit's winter flag matters.
  {
    const summit=course('summit-run'),preload=createTerrainPreload();
    preload.request(summit,true);
    same(preload.take(summit,false),null,'winter on and off are different jobs');
    ok(preload.take(summit,true)!==null,'the matching winter setting is served');
  }

  // The pit has no near or far ground in its build; the preload does not start.
  {
    const preload=createTerrainPreload(),pit=new Course(ARENA_VENUES.pit,1989);
    preload.request(pit,false);
    ok(!preload.active&&preload.done,'the pit is not preloaded');
    same(preload.take(pit,false),null,'and has nothing to give');
  }

  // A failure inside the preload is not the preload's to report: it drops the work and the build runs it itself.
  {
    const preload=createTerrainPreload(),broken={def:{id:'broken'},length:100,samples:[]};
    preload.request(broken,false);
    preload.advance(5);
    ok(!preload.active&&preload.done,'a failing preload drops its work');
    same(preload.take(broken,false),null,'and gives nothing');
  }

  // A schedule function is called until the work is done, and not after.
  {
    const queue=[],preload=createTerrainPreload({schedule:run=>queue.push(run),sliceMs:0}),a=course('pacific-canyon');
    preload.request(a,false);
    let runs=0;
    while(queue.length&&runs<1000000){queue.shift()();runs++;}
    ok(preload.done&&runs>10&&!queue.length,'the schedule drives the work to the end');
    ok(preload.take(a,false)!==null,'and the result is there');
  }

  // The whole Summit world, with the real approved kits and snow, is the same with a preload as without.
  {
    const parser=new GLTFLoader();
    parser.register(()=>({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
    const makeKits=async target=>{
      const kits=createTrackKits(target,{loadAsset:async path=>{
        const file=await readFile(new URL('../public'+path,import.meta.url));
        return parser.parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'');
      }});
      if(!await kits.ready)throw kits.error??Error('Summit kits not ready');
      return kits;
    };
    const digest=world=>{
      const hash=createHash('sha256'),add=value=>hash.update(value),array=a=>hash.update(bytes(a));
      let nodes=0;
      world.traverse(object=>{
        nodes++;add(object.type+'|'+object.name+'|');array(new Float64Array(object.matrix.elements));
        if(object.geometry){
          add(object.geometry.type);
          for(const name of Object.keys(object.geometry.attributes).sort()){add(name);array(object.geometry.attributes[name].array);}
          if(object.geometry.index)array(object.geometry.index.array);
          add(JSON.stringify(object.geometry.groups));add(JSON.stringify(object.geometry.drawRange));
        }
        if(object.instanceMatrix)array(object.instanceMatrix.array);
        if(object.instanceColor)array(object.instanceColor.array);
        for(const material of Array.isArray(object.material)?object.material:object.material?[object.material]:[])
          add(material.type+material.color?.getHexString?.()+material.opacity);
      });
      return {nodes,hash:hash.digest('hex')};
    };
    const plain=course('summit-run'),kitsA=await makeKits(plain);
    const without=digest(buildEnvironment(plain,{trackKits:kitsA,snow:true}));
    const loaded=course('summit-run'),kitsB=await makeKits(loaded),preload=createTerrainPreload();
    preload.request(loaded,true);runSliced(preload);
    const withPreload=digest(buildEnvironment(loaded,{trackKits:kitsB,snow:true,preload}));
    ok(!preload.active,'the build took the preload');
    same(withPreload,without,'the whole Summit world is the same with a preload');
    const unprepared=course('summit-run'),kitsC=await makeKits(unprepared),idle=createTerrainPreload();
    same(digest(buildEnvironment(unprepared,{trackKits:kitsC,snow:true,preload:idle})),without,'an idle preload changes nothing');
    kitsA.dispose();kitsB.dispose();kitsC.dispose();
  }
  console.log(`Terrain preload: ${checks} checks passed.`);
} finally {
  THREE.TextureLoader.prototype.load=oldLoad;
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
}
