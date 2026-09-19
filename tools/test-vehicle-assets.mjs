import assert from 'node:assert/strict';
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
for(const key of Object.keys(CARS).filter(key=>key!=='aurora_gt')){
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
same(loadCalls,0,'selecting any of the six originals never downloads the former shared concept body');
for(const key of['unknown','toString','__proto__']){same(assets.status(key),'error');same(assets.create(key),null,'unknown models never fall back to an old coupe');}
same(assets.status('aurora_gt'),'idle');same(assets.create('aurora_gt'),null,'cold Aurora has no placeholder');
const first=assets.load('aurora_gt'),second=assets.load('aurora_gt');same(first,second,'simultaneous player/ghost requests share one download');
await Promise.resolve();same(loadCalls,1);same(assets.status('aurora_gt'),'loading');same(assets.create('aurora_gt'),null,'pending import cannot create an earlier iteration');
waiting.resolve(options=>{importOptions.push(options);return new THREE.Group();});check(await first,'import reports ready');same(assets.status('aurora_gt'),'ready');
assets.create('aurora_gt');assets.create('aurora_gt',{color:0xbfcace,accent:0x142a36});assets.create('aurora_gt');
check(importOptions.every(options=>options.kind==='gt'&&options.key==='aurora_gt'),'player, rival and ghost all keep Aurora trim instead of defaulting to Falcone');
same(importOptions[1].color,0xbfcace);same(await assets.load('aurora_gt'),true);same(loadCalls,1,'ready Aurora reuses its loaded source');

let attempts=0;
const retry=createVehicleAssets({loadHero:()=>{attempts++;if(attempts===1)throw Error('offline');return options=>new THREE.Group();}});
same(await retry.load('aurora_gt'),false);same(retry.status('aurora_gt'),'error');same(retry.create('aurora_gt'),null,'failed import cannot substitute the old sport factory');
same(await retry.load('aurora_gt'),false);same(attempts,1,'render polling does not spam failed requests');
check(retry.create('falcone_f42').isGroup,'another original model remains usable after Aurora failure');
same(await retry.load('aurora_gt',{retry:true}),true);same(attempts,2);same(retry.status('aurora_gt'),'ready');

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
console.log(`Vehicle asset routing: ${checks} synchronous model, shared import, no-placeholder, retry and loading-clock checks passed.`);
