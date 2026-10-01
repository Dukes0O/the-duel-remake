import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,isAbsolute} from 'node:path';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {buildEnvironment,disposeTree} from '../src/world.js';
import {animateScene,syncScene} from '../src/scene-systems.js';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {SALT_FLATS_VENUE,SCRAPDOME_VENUE} from '../src/arena/venues.js';
import {createFeatureFlags} from '../src/feature-flags.js';

// Headless canvas labels and image decode only. Course, buildEnvironment,
// native GLB geometry/materials, scene registry and disposal are production.
const context=new Proxy({measureText:text=>({width:String(text).length*8}),
  createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),
  getImageData:()=>({data:new Uint8ClampedArray(4)}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(target,key)=>key in target?target[key]:()=>{}});
const originalDocument=globalThis.document,originalLoad=THREE.TextureLoader.prototype.load;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
THREE.TextureLoader.prototype.load=function(){return new THREE.Texture();};
const root=resolve(import.meta.dirname,'..');
const candidate=resolve(process.env.SALT_FLATS_RENDER_ASSET||resolve(root,'.evidence/ARENA-06/render-candidate/venue.glb'));
const local=relative(root,candidate);
assert(!isAbsolute(local)&&!local.startsWith('..')&&/^(?:\.evidence|\.qa-dist)[\\/]/.test(local),'private lane asset only');
const bytes=readFileSync(candidate),sha=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha,'6cd41757ee903b3924ddd760f66533e1295ba96d96d863a8689361db74d35bdc','approved native Source freeze');
async function asset(){const loader=new GLTFLoader();loader.register(()=>({name:'PRIVATE_HEADLESS_IMAGES',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  return loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}
const flush=()=>new Promise(done=>setImmediate(done));
const stats={checks:0,failed:0,candidateSha256:sha,fixture:'Actual native Course/world with headless image/canvas decoding; no public flag/UI claim.'};
async function check(name,fn){stats.checks++;try{await fn();console.log('PASS '+name);}catch(error){stats.failed++;console.error('FAIL '+name+'\n'+error.stack);}}
function saltRoot(world){const child=world.getObjectByName('Salt Flats');assert(child,'actual buildEnvironment must route Salt to its native presenter');assert.equal(child.parent,world,'native presenter belongs to production world');return child;}
function resources(root){const found=new Set();root.traverse(node=>{if(node.geometry)found.add(node.geometry);for(const m of [].concat(node.material||[])){found.add(m);for(const value of Object.values(m))if(value?.isTexture)found.add(value);}});return found;}
function watched(asset){const counts=new Map();for(const resource of resources(asset.scene)){counts.set(resource,0);resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));}return counts;}
function exactlyOnce(counts){assert(counts.size>0);for(const [resource,count]of counts)assert.equal(count,resource.userData.sharedAsset?0:1,'private native resource releases once; shared resources survive');}
const makeCourse=()=>new Course(SALT_FLATS_VENUE,1989);
try{
  await check('real environment routes and loads the complete native Salt graph',async()=>{const gltf=await asset();let calls=0;const world=buildEnvironment(makeCourse(),{saltFlats:{loadAsset:async()=>{calls++;return gltf;}}});
    try{const native=saltRoot(world);await flush();assert.equal(calls,1);assert.equal(native.userData.assetStatus,'ready');assert.deepEqual(native.userData.loadErrors,[]);
      assert.equal(native.getObjectByName('salt-flats-ground'),gltf.scene.getObjectByName('salt-flats-ground'));let triangles=0,meshes=0;native.traverse(n=>{if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;}});assert.equal(meshes,171);assert.equal(triangles,152180);
    }finally{disposeTree(world);}});
  await check('world disposal retires success graph and releases every owned resource exactly once',async()=>{const gltf=await asset(),counts=watched(gltf);const world=buildEnvironment(makeCourse(),{saltFlats:{loadAsset:async()=>gltf}});
    try{const native=saltRoot(world);await flush();assert.equal(native.userData.assetStatus,'ready');disposeTree(world);disposeTree(world);assert.equal(native.userData.assetStatus,'retired');assert.equal(native.children.length,0);exactlyOnce(counts);}finally{disposeTree(world);}});
  await check('retired actual world rejects and disposes an asset arriving late',async()=>{const gltf=await asset(),counts=watched(gltf);let complete;const pending=new Promise(done=>complete=done);
    const world=buildEnvironment(makeCourse(),{saltFlats:{loadAsset:()=>pending}});try{const native=saltRoot(world);assert.equal(native.userData.assetStatus,'loading');disposeTree(world);complete(gltf);await flush();assert.equal(native.userData.assetStatus,'retired');assert.equal(native.children.length,0);exactlyOnce(counts);}finally{complete(gltf);disposeTree(world);}});
  await check('failed native load records the real error without a substitute graph',async()=>{const world=buildEnvironment(makeCourse(),{saltFlats:{loadAsset:async()=>{throw Error('owned acceptance: missing native Salt asset');}}});
    try{const native=saltRoot(world);await flush();assert.equal(native.userData.assetStatus,'failed');assert.equal(native.children.length,0);assert.deepEqual(native.userData.loadErrors,['owned acceptance: missing native Salt asset']);}finally{disposeTree(world);}});
  await check('invalid real GLB ground releases rejected geometry once',async()=>{const gltf=await asset(),counts=watched(gltf);gltf.scene.getObjectByName('salt-flats-ground').name='invalid-private-ground';
    const world=buildEnvironment(makeCourse(),{saltFlats:{loadAsset:async()=>gltf}});try{const native=saltRoot(world);await flush();assert.equal(native.userData.assetStatus,'failed');assert.match(native.userData.loadErrors.join('\n'),/actual salt ground/);assert.equal(native.children.length,0);exactlyOnce(counts);disposeTree(world);exactlyOnce(counts);}finally{disposeTree(world);}});
  await check('presentation clocks leave actual native Duel state, Course and RNG untouched',async()=>{const duel=new Duel({seed:1989,featureFlags:createFeatureFlags({storage:null,qa:true,search:'?flags=scrapdome,wasteland2'})});assert(duel.startArenaEvent({venueId:'salt-flats',car:'falcone_f42',seed:1989,opponents:[{car:'dusthawk_rally'}]}));
    const before=JSON.stringify(duel.state),features=JSON.stringify(duel.course.features);const gltf=await asset();const world=buildEnvironment(duel.course,{saltFlats:{loadAsset:async()=>gltf}});
    try{saltRoot(world);await flush();for(let i=0;i<120;i++){animateScene(world,i/60);syncScene(world,duel.state,1/60);}assert.equal(JSON.stringify(duel.state),before);assert.equal(JSON.stringify(duel.course.features),features);
      const reference=new Course(SALT_FLATS_VENUE,1989);assert.equal(duel.course.rng.float(),reference.rng.float(),'world never consumes seeded Course RNG');}finally{disposeTree(world);}});
  for(const definition of [SCRAPDOME_VENUE,COURSE[0]])await check(definition.id+': normal world does not load Salt or mutate existing geometry',async()=>{const course=new Course(definition,1989),before=JSON.stringify(course.features);let called=0;const world=buildEnvironment(course,{saltFlats:{loadAsset:async()=>{called++;throw Error('must not load on ordinary course');}}});
    try{await flush();assert.equal(called,0);assert.equal(world.getObjectByName('Salt Flats'),undefined);assert.equal(JSON.stringify(course.features),before);assert(world.children.length>0);const reference=new Course(definition,1989);assert.equal(course.rng.float(),reference.rng.float());}finally{disposeTree(world);}});
}finally{THREE.TextureLoader.prototype.load=originalLoad;if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
console.log(JSON.stringify(stats));if(stats.failed)process.exitCode=1;

// Additional effects are part of the default native renderer acceptance. The
// original eight cases above and their asset/count/lifecycle assertions stay exact.
await import('./test-salt-flats-effects.mjs');
