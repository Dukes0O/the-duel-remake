import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createTown,stepTown} from '../src/town/index.js';
import {createTownStore,readTownPointer,saveTown} from '../src/town/town-store.js';

const source=async path=>readFile(new URL(path,import.meta.url),'utf8');
const router=await source('../src/screen-router.js'),entry=await source('../src/town/town-entry.js');
const home=enabled=>yardHomeScreen({profile:{wasteland:{}},playerName:'QA',escapeHTML:String,
  featureFlags:{enabled:name=>name==='wasteland-town'&&enabled}});
assert.doesNotMatch(home(false),/THE TOWN|yard-the-town/,'the town button is hidden while its switch is off');
assert.match(home(true),/data-action="yard-the-town">THE TOWN/,'the town button appears when enabled');
assert.match(router,/import\('\.\/town\/town-entry\.js'\)/,'the router loads town code dynamically after its switch check');
assert.doesNotMatch(router,/^import .*town\//m,'the router has no static town imports');
assert.match(entry,/catch\(error\).*message=error\?\.message/,'a failed save is shown as a plain status and does not stop the loop');
assert.match(entry,/cancelAnimationFrame\(raf\).*sceneView\?\.dispose\(\).*renderer\?\.dispose\(\)/,'leaving cancels the loop and frees scene and renderer resources');

const storageData=new Map(),storage={getItem:key=>storageData.get(key)??null,setItem:(key,value)=>storageData.set(key,value),removeItem:key=>storageData.delete(key)};
const memory={},store=createTownStore({memoryOnly:true,memory,storage});
const town=createTown(814,'Tin Flat',[]);town.mayors=[];
await saveTown(town,{store,storage,reason:'first visit'});
assert.deepEqual(readTownPointer(storage),[town.id],'the first visit records its town pointer');
const firstLoad=await store.load(readTownPointer(storage)[0]);
assert.equal(firstLoad.town.name,'Tin Flat','the first visit saves the named town');
const placed=stepTown(firstLoad.town,{type:'placeBuilding',buildingId:'road-dirt',x:20,z:20})[0];
assert.equal(placed.ok,true,'the first visit can place a road');
await saveTown(firstLoad.town,{store,storage,reason:'leaving'});
const secondLoad=await store.load(readTownPointer(storage)[0]);
assert.equal(secondLoad.town.buildings[0].buildingId,'road-dirt','returning loads the saved road');

const failingStore={save:async()=>{throw new Error('Town storage could not be saved.');}};
const running=secondLoad.town,startingTick=BigInt(secondLoad.town.tick);let shown='';
try{await saveTown(running,{store:failingStore,storage});}catch(error){shown=error.message;}
stepTown(running);assert.equal(running.tick,startingTick+1n,'the town simulation keeps stepping after a rejected save');
assert.equal(shown,'Town storage could not be saved.','the store sentence is preserved for the screen');
console.log('TOWN-HOOKS passed: switch-gated route, first save, return load, leaving save and failed-save continuation.');
