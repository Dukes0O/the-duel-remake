import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CARS } from '../src/config.js';
import { createVehicleAssets } from '../src/vehicle-assets.js';
import { loadHeroVehicle } from '../src/hero-vehicle.js';
import { App } from '../src/app.js';
import { disposeTree } from '../src/world.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const same=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
let loadCalls=0,importOptions=[];
const waiting=deferred(),assets=createVehicleAssets({loadHero:()=>{loadCalls++;return waiting.promise;}});
const licensedKinds={aurora_gt:'gt',falcone_heritage:'sport'};
same(Object.keys(CARS).length,8,'Eight playable cars retain the six redesigned bodies plus two licensed trims');
for(const key of Object.keys(CARS).filter(key=>!Object.hasOwn(licensedKinds,key))){
  same(assets.status(key),'ready',`${key}: original body needs no async import`);
  same(await assets.load(key),true);
  const player=assets.create(key),rival=assets.create(key,{color:0xbfcace,accent:0x142a36}),ghost=assets.create(key);
  check(player.isGroup&&rival.isGroup&&ghost.isGroup,`${key}: all three racing roles receive an actual vehicle`);
  same([player,rival,ghost].map(vehicle=>vehicle.userData.vehicleKey),[key,key,key],`${key}: player/rival/ghost retain the selected model identity`);
  check(player.userData.paint!==rival.userData.paint&&rival.userData.paint!==ghost.userData.paint,`${key}: race roles do not share private paint`);
  same(rival.userData.paint.color.getHex(),0xbfcace,`${key}: rival appearance is applied to the right model`);
  check(player.userData.wheels.length===4&&rival.userData.wheels.length===4&&ghost.userData.wheels.length===4,`${key}: all model routes preserve articulated wheels`);
  for(const vehicle of[player,rival,ghost])disposeTree(vehicle);
}
same(loadCalls,0,'selecting any of the six redesigned originals never downloads the licensed body');
for(const key of['unknown','toString','__proto__']){same(assets.status(key),'error');same(assets.create(key),null,'unknown models never fall back to an old coupe');}
for(const key of Object.keys(licensedKinds)){same(assets.source(key),'licensed');same(assets.status(key),'idle');same(assets.create(key),null,`${key}: cold import has no substitute body`);}
const first=assets.load('aurora_gt'),second=assets.load('falcone_heritage');same(first,second,'Aurora and Heritage share one source download');
same(assets.load('falcone_heritage'),first,'simultaneous player/ghost requests share the pending import');
await Promise.resolve();same(loadCalls,1);
for(const key of Object.keys(licensedKinds)){same(assets.status(key),'loading');same(assets.create(key),null,`${key}: pending import cannot create a wrong placeholder`);}
waiting.resolve(options=>{importOptions.push(options);return new THREE.Group();});check(await first,'import reports ready');
for(const [key,kind] of Object.entries(licensedKinds)){
  same(assets.status(key),'ready');
  const models=[assets.create(key),assets.create(key,{color:0xbfcace,accent:0x142a36}),assets.create(key)];
  same(models.map(model=>[model.userData.vehicleKey,model.userData.vehicleSource]),Array.from({length:3},()=>[key,'licensed']),`${key}: player, rival and ghost keep their selected identity`);
  check(importOptions.slice(-3).every(options=>options.kind===kind&&options.key===key),`${key}: player, rival and ghost use ${kind} trim`);
  same(importOptions.at(-2).color,0xbfcace);same(await assets.load(key),true);
}
same(loadCalls,1,'both ready licensed trims reuse the shared source');

let attempts=0;
const retry=createVehicleAssets({loadHero:()=>{attempts++;if(attempts===1)throw Error('offline');return options=>new THREE.Group();}});
same(await retry.load('falcone_heritage'),false);
for(const key of Object.keys(licensedKinds)){same(retry.status(key),'error');same(retry.create(key),null,`${key}: failed shared import cannot substitute another model`);same(await retry.load(key),false);}
same(attempts,1,'render polling does not spam failed shared-source requests');
for(const key of Object.keys(CARS).filter(key=>!Object.hasOwn(licensedKinds,key))){const model=retry.create(key);check(model.isGroup,`${key}: redesigned originals remain usable after licensed-source failure`);disposeTree(model);}
same(await retry.load('aurora_gt',{retry:true}),true);same(attempts,2);
for(const key of Object.keys(licensedKinds))same(retry.status(key),'ready',`${key}: retry makes the shared source available`);

// Verify the production GLTF promise can recover, rather than only a stubbed
// router retry. A small real mesh drives its actual normalization and batching.
const originalLoad=GLTFLoader.prototype.loadAsync,source=new THREE.Group();
source.add(new THREE.Mesh(new THREE.BoxGeometry(2,1,4),new THREE.MeshStandardMaterial()));
let sourceCalls=0;
try{
  GLTFLoader.prototype.loadAsync=async()=>{if(++sourceCalls===1)throw Error('first download failed');return{scene:source};};
  await assert.rejects(loadHeroVehicle(),/first download failed/);checks++;
  check(typeof await loadHeroVehicle()==='function','production source loader discards rejection and can retry');
  same(sourceCalls,2);
}finally{GLTFLoader.prototype.loadAsync=originalLoad;}

// The real App gate holds countdown, wallet and racing time until presentation.
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const app=new App();app.audio.unlock=()=>{};app.audio.setPaused=()=>{};
app.startCampaign({car:'falcone_f42'});const owner={};app.claimVisualReadiness(owner);
const before=JSON.stringify({state:app.duel.state,profile:app.profile});
app._simulate(4);same(JSON.stringify({state:app.duel.state,profile:app.profile}),before,'model loading consumes no countdown, race time or credits');
check(app.presentVisualFrame(owner,app.duel.state,app.duel.course),'selected model first draw releases loading');
app._simulate(.05);check(app.duel.state.countdown<3,'racing resumes after the selected model is presented');
app.releaseVisualReadiness(owner);

// Exercise the production showroom selection function. A rapid Heritage →
// Aurora → Heritage sequence must not leave both stale and current models in
// the scene when their shared download resolves.
const showroom=await readFile(new URL('./vehicle-art-check.js',import.meta.url),'utf8');
const showSource=showroom.slice(showroom.indexOf('async function show(key)'),showroom.indexOf('\nfunction damage(active)'));
check(showSource.length>0,'Production showroom selection function is available');
const showroomWait=deferred(),shown=new Set(),showroomModels=new Map();let showroomCreates=0;
const review=new Function('scene','assets','models','applyVehiclePaint','damage','view','document',`let vehicle=null,selected='',neutral=false,damaged=false,assetMessage='',showRevision=0;${showSource};return {show,get vehicle(){return vehicle;},get message(){return assetMessage;}};`)(
  {add:model=>shown.add(model),remove:model=>shown.delete(model)},
  {load:key=>key==='falcone_f42'?Promise.resolve(true):showroomWait.promise,create:key=>{showroomCreates++;return{key};}},showroomModels,()=>{},()=>{},()=>{},{querySelectorAll:()=>[]});
await review.show('falcone_f42');same(shown.size,1);same(review.vehicle.key,'falcone_f42');
const showOld=review.show('falcone_heritage'),showMiddle=review.show('aurora_gt'),showCurrent=review.show('falcone_heritage');
same(shown.size,0,'Pending showroom selection hides its previous body');same(review.vehicle,null);
showroomWait.resolve(true);await Promise.all([showOld,showMiddle,showCurrent]);
same(shown.size,1,'Only the latest showroom selection is installed');same(review.vehicle.key,'falcone_heritage');same(showroomCreates,2,'Stale requests do not construct duplicate models');
console.log(`Vehicle asset routing: ${checks} synchronous model, shared import, no-placeholder, retry and loading-clock checks passed.`);
