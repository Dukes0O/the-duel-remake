import assert from 'node:assert/strict';
import {kitConstructionAccepted,kitDeliveredAccepted} from './scenarios/track-kits.mjs';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {ALL_CIRCUITS} from '../src/circuits/index.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {bindTrackKits,trackKitsOf} from '../src/track-kits.js';
import {disposeTree} from '../src/world.js';
import {registerSceneSystem} from '../src/scene-systems.js';
import {Course} from '../src/course.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {COURSE} from '../src/config.js';
import {terrainGeometry,farTerrainGeometry} from '../src/world-surfaces.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {createRendererReadiness} from '../src/screen-readiness.js';
import {createTrackKits, normalizeKitPlacements, TRACK_KIT_IDS} from '../src/track-kits.js';
import {beechTreePlacements} from '../src/vegetation.js';

// Claude check-in7: kit thresholds are total construction and delivered p95.
assert.equal(kitConstructionAccepted(999.999),true);
assert.equal(kitConstructionAccepted(1000),false,'construction must be under1s');
assert.equal(kitDeliveredAccepted(18.5),true,'delivered cap includes18.5ms');
assert.equal(kitDeliveredAccepted(18.500001),false,'over-cap delivered fails');
for(const value of [-1,NaN,Infinity,null,undefined,'18']){
  assert.equal(kitConstructionAccepted(value),false,'construction must be finite measured time');
  assert.equal(kitDeliveredAccepted(value),false,'delivered must be finite measured time');
}

if (process.argv[2] === '--validate-circuit') {
  assert.equal(process.argv.length,4,'Usage: test-track-kits.mjs --validate-circuit <tracked src/circuits/module.js>');
  const modulePath = resolve(process.argv[3]);
  assert.match(modulePath.replaceAll('\\','/'),/\/src\/circuits\/[a-z0-9-]+\.js$/,
    'Validate only an actual repository circuit source module.');
  const moduleRoot = dirname(dirname(dirname(modulePath)));
  const verified = spawnSync('git',['-C',moduleRoot,'ls-files','--error-unmatch',relative(moduleRoot,modulePath)],
    {encoding:'utf8',windowsHide:true});
  assert.equal(verified.status,0,'Circuit source must be a tracked repository file.');
  const exported = await import(pathToFileURL(modulePath).href);
  const definitions = [...new Set(Object.values(exported))].filter(def =>
    def?.id && Array.isArray(def.kitPlacements) && def.kitPlacements.length);
  assert.equal(definitions.length,1,'Module must name one authored circuit with actual kit placements.');
  await validateCircuitKits(definitions[0]);
  process.exit(0);
}

if (process.argv.includes('--culling-only')) {
  await kitCullingChecks();
  process.exit(0);
}

const course = {
  length: 1000, def: {}, samples: [], features: {surfacePatches: [],shortcuts: []},
  at: s => ({s, x: 0, y: s * .02, z: s, heading: 0}),
  groundAt: (s, lateral) => ({x: lateral, y: s * .02, z: s, heading: 0}),
  nearest: (x, z) => ({s: z, lateral: x}), roadHalfWidthAt: () => 7,
};
const originalKitIds = TRACK_KIT_IDS.slice(0, 35);
assert.equal(TRACK_KIT_IDS.length, 40);
assert.deepEqual(TRACK_KIT_IDS.slice(35), ['stone-stream-bridge', 'forest-footbridge', 'forest-timing-tower', 'ardennes-beech', 'summit-finish']);
assert.deepEqual(originalKitIds, [
  'start-gantry','pit-garage','pit-wall','grandstand','armco','concrete-wall',
  'catch-fence','tyre-wall','braking-board-150','braking-board-100','braking-board-50',
  'marshal-post','lantern-tower','shopfront-a','shopfront-b','neon-sign','lantern-string',
  'harbour-boat','ski-lodge','chairlift-tower','chairlift-cable','chairlift-chair',
  'wooden-dock','autumn-tree','autumn-tree-golden','autumn-tree-copper','snow-pine',
  'snow-ground','snow-rock','plough-bank','gallery','summit-hut','observatory','snowman','yeti',
], 'the original 35 IDs and order remain exact');
for (const bad of [null, {}, [{id:'unknown',s:0,lateral:20}],
  [{id:'armco',s:NaN,lateral:20}], [{id:'armco',s:-1,lateral:20}],
  [{id:'armco',s:100,lateral:20,scale:0}], [{id:'armco',s:100,lateral:20,heading:Infinity}]])
  assert.throws(() => normalizeKitPlacements(course,bad), /kit/i);
const authored = [{id:'armco',s:100,lateral:20,heading:.2,scale:[2,1,1]}];
const frozen = normalizeKitPlacements(course,authored);
authored[0].scale[0] = 9;
assert.equal(frozen[0].scale[0],2); assert.ok(Object.isFrozen(frozen[0]));
let calls = 0;
const empty = createTrackKits(course,{loadAsset: () => {calls++;}});
assert.equal(await empty.ready,true); assert.equal(calls,0); assert.equal(empty.group.children.length,0);
empty.dispose(); empty.dispose();
const fake = () => {
  const geometry = new THREE.BoxGeometry(1,3,1); geometry.translate(0,1.5,0);
  const material = new THREE.MeshStandardMaterial({color:0x777777});
  const scene = new THREE.Group(); scene.add(new THREE.Mesh(geometry,material));
  return {scene,animations:[]};
};
const resources = [], loads = [];
const load = async path => {
  loads.push(path); const asset = fake();
  asset.scene.traverse(node => {if(node.isMesh) for(const resource of [node.geometry,node.material]) {
    const count={resource,disposed:0};resource.addEventListener('dispose',()=>count.disposed++); resources.push(count);
  }}); return asset;
};
const entries = [{id:'armco',s:100,lateral:20},{id:'armco',s:150,lateral:20}];
const snapshot=JSON.stringify(course);
const owner=createTrackKits(course,{placements:entries,loadAsset:load});
assert.equal(await owner.ready,true); assert.equal(owner.status,'ready'); assert.equal(loads.length,2);
assert.equal(JSON.stringify(course),snapshot);
assert.equal(owner.group.children.filter(node=>node.isInstancedMesh).length,2,'one batch per quality');
owner.update({high:true,position:{x:20,z:100},state:{status:'racing'}});
assert.equal(owner.stats.high,2); assert.equal(owner.stats.low,0);
owner.update({high:false,position:{x:20,z:100},state:{status:'racing'}});
assert.equal(owner.stats.high,0); assert.equal(owner.stats.low,2);
owner.update({high:true,position:{x:20,z:900},state:{status:'racing'}});
assert.equal(owner.stats.low,2,'High uses distant approved LOD');
const matrix=new THREE.Matrix4().makeTranslation(21,5,100);
assert.equal(owner.setPlacementPose(0,matrix),true); matrix.elements[12]=999;
assert.equal(owner.getPlacementPose(0).elements[12],21,'pose input copied');
owner.dispose(); owner.dispose();
assert.equal(owner.status,'retired'); assert.equal(owner.group.children.length,0);
assert.ok(resources.every(row=>row.disposed===1),'every shared source resource released once');
assert.equal(owner.setPlacementPose(0,new THREE.Matrix4()),false);
const badClearance=createTrackKits(course,{placements:[{id:'armco',s:100,lateral:0}],loadAsset:load});
assert.equal(await badClearance.ready,false); assert.equal(badClearance.status,'error');
assert.match(badClearance.error.message,/clearance/i); badClearance.dispose();
const failure=createTrackKits(course,{placements:entries,loadAsset:async()=>{throw Error('missing GLB');}});
assert.equal(await failure.ready,false);assert.equal(failure.status,'error');assert.equal(failure.group.children.length,0);
failure.dispose();
let release;
const late=createTrackKits(course,{placements:entries,loadAsset:()=>new Promise(resolve=>{release??=[];release.push(resolve);})});
await Promise.resolve();late.dispose();const lateRows=[];
for(const resolve of release){const asset=fake();asset.scene.traverse(node=>{if(node.isMesh)
  for(const resource of [node.geometry,node.material]){const row={disposed:0};resource.addEventListener('dispose',()=>row.disposed++);lateRows.push(row);}});resolve(asset);}
assert.equal(await late.ready,false);assert.equal(late.group.children.length,0);
assert.ok(lateRows.every(row=>row.disposed===1),'late resources released once without attachment');


// Transform composition uses the terrain anchor, authored yaw and all scale axes.
const transformed=createTrackKits(course,{placements:[{id:'armco',s:100,lateral:20,
  heading:Math.PI/2,scale:[2,3,4],scenery:{kind:'tree',id:'pine-1'}}],loadAsset:async()=>fake()});
assert.equal(await transformed.ready,true);
const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
transformed.getPlacementPose(0).decompose(position,rotation,scale);
assert.deepEqual(position.toArray(),[20,2,100]);assert.deepEqual(scale.toArray(),[2,3,4]);
assert.ok(new THREE.Vector3(0,0,1).applyQuaternion(rotation).distanceTo(new THREE.Vector3(1,0,0))<1e-10);
assert.ok(Object.isFrozen(transformed.placements[0].scenery));transformed.dispose();

// FIX-ROAD-SEAM: pins remain escape-only, copied, and subject to real triangle clearance.
{
  const escaped = {...course, escapeRoads: [{origin: {x: 0, z: 0}, forward: {x: 0, z: 1}, left: {x: 1, z: 0},
    side: 1, inner: -2, outer: 8, run: 120, tyreDepth: 1.8}]};
  const pin = {x: 8.74, z: 100}, authoredPin = {id: 'catch-fence', s: 100, lateral: 20, worldPosition: pin};
  const normalized = normalizeKitPlacements(escaped, [authoredPin])[0];
  assert.deepEqual(normalized.worldPosition, pin); assert.ok(Object.isFrozen(normalized.worldPosition));
  assert.notEqual(normalized.worldPosition, pin); pin.x = 99; assert.equal(normalized.worldPosition.x, 8.74);
  for (const worldPosition of [null, {}, {x: NaN, z: 100}, {x: 8, z: Infinity}, {x: 99, z: 100}])
    assert.throws(() => normalizeKitPlacements(escaped, [{...authoredPin, worldPosition}]), /world position/i);
  assert.throws(() => normalizeKitPlacements(escaped, [{id: 'shopfront-a', s: 100, lateral: 20,
    worldPosition: {x: 8, z: 100}}]), /world position/i);
  assert.throws(() => normalizeKitPlacements(course, [{...authoredPin, worldPosition: {x: 8, z: 100}}]), /world position/i);
  const pinned = createTrackKits(escaped, {placements: [{...authoredPin, worldPosition: {x: 8.74, z: 100}}], loadAsset: async () => fake()});
  try {
    assert.equal(await pinned.ready, true, pinned.error?.message);
    assert.equal(pinned.getPlacementPose(0).elements[12], 8.74, 'transform keeps actual world x');
    assert.equal(pinned.getPlacementPose(0).elements[14], 100, 'transform keeps actual world z');
    assert.equal(pinned.getPlacementPose(0).elements[13], 2, 'height still comes from actual ground');
  } finally {pinned.dispose();}
  const onRoad = createTrackKits(escaped, {placements: [{...authoredPin, worldPosition: {x: 0, z: 100}}], loadAsset: async () => fake()});
  try {assert.equal(await onRoad.ready, false); assert.match(onRoad.error.message, /clearance/i);} finally {onRoad.dispose();}
}

// Lift is above the rendered terrain anchor and never waives road headroom.
const raised=createTrackKits(course,{placements:[{id:'lantern-string',s:100,lateral:0,lift:5}],
  loadAsset:async()=>fake()});
assert.equal(await raised.ready,true,raised.error?.message);
assert.equal(raised.getPlacementPose(0).elements[13],7);
assert.equal(raised.placements[0].lift,5);
raised.dispose();
assert.equal(normalizeKitPlacements(course,[{id:'armco',s:100,lateral:20}])[0].lift,0);
for(const lift of [-1,NaN,Infinity,'5'])
  assert.throws(()=>normalizeKitPlacements(course,[{id:'armco',s:100,lateral:20,lift}]),/kit/i);
const flatCourse={...course,samples:[],
  at:s=>({...course.at(s),y:0}),groundAt:(s,lateral)=>({...course.groundAt(s,lateral),y:0})};
for(const [lift,expected] of [[4.5,true],[4.499,false]]){
  const threshold=createTrackKits(flatCourse,{placements:[{id:'neon-sign',s:100,lateral:0,lift}],
    loadAsset:async()=>fake()});
  assert.equal(await threshold.ready,expected,threshold.error?.message);
  if(!expected)assert.match(threshold.error.message,/clearance/);
  threshold.dispose();
}
const lowTooLow=createTrackKits(flatCourse,{placements:[{id:'neon-sign',s:100,lateral:0,lift:4.5}],
  loadAsset:async path=>{
    const asset=fake();
    if(path.includes('-lod'))asset.scene.children[0].geometry.translate(0,-1,0);
    return asset;
  }});
assert.equal(await lowTooLow.ready,false);
assert.match(lowTooLow.error.message,/clearance/);
lowTooLow.dispose();

// The bank exception is tied to the exact actual patch, including its footprint.
const patch={kind:'deep-snow',s0:90,s1:110,from:10,to:30};
const snowy={...course,features:{surfacePatches:[patch]}};
const bank={id:'plough-bank',s:100,lateral:20,physicalPatch:patch};
assert.throws(()=>normalizeKitPlacements(snowy,[{...bank,physicalPatch:{...patch}}]),/actual/);
assert.throws(()=>normalizeKitPlacements(snowy,[{...bank,id:'armco'}]),/actual/);
const safeBank=createTrackKits(snowy,{extraPlacements:[bank],loadAsset:async()=>fake()});
assert.equal(await safeBank.ready,true);assert.equal(safeBank.placements[0].physicalPatch,patch);safeBank.dispose();
const wideBank=createTrackKits(snowy,{extraPlacements:[{...bank,scale:30}],loadAsset:async()=>fake()});
assert.equal(await wideBank.ready,false);assert.match(wideBank.error.message,/footprint/);wideBank.dispose();
const flat=()=>{const asset=fake();asset.scene.children[0].geometry.scale(1,.1,1);return asset;};
const ground=createTrackKits(course,{placements:[{id:'snow-ground',s:100,lateral:0}],loadAsset:async()=>flat()});
assert.equal(await ground.ready,true);ground.dispose();
const tallGround=createTrackKits(course,{placements:[{id:'snow-ground',s:100,lateral:0}],loadAsset:async()=>fake()});
assert.equal(await tallGround.ready,false);assert.match(tallGround.error.message,/clearance/);tallGround.dispose();

// Each genuine countdown lamp gets private material; no state or source write.
const gantryAssets=[];
const gantry=()=>{const scene=new THREE.Group();
  for(let i=1;i<=5;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({emissive:0xff0000,emissiveIntensity:2}));
    mesh.name='lamp-'+i;mesh.position.set(i-3,6,0);scene.add(mesh);}
  const model={scene};gantryAssets.push(model);return model;};
const lamps=createTrackKits(course,{placements:[{id:'start-gantry',s:100,lateral:20}],loadAsset:async()=>gantry()});
assert.equal(await lamps.ready,true);
const countdown={mode:'grandprix',status:'countdown',field:{start:{lights:3}}};
const immutableState=JSON.stringify(countdown);lamps.update({high:true,position:{x:20,z:100},state:countdown});
for(const root of lamps.group.children)for(let i=1;i<=5;i++)
  assert.equal(root.getObjectByName('lamp-'+i).material.emissiveIntensity,i<=3?2:0);
assert.equal(JSON.stringify(countdown),immutableState);
for(const asset of gantryAssets)asset.scene.traverse(mesh=>{if(mesh.isMesh)assert.equal(mesh.material.emissiveIntensity,2);});
lamps.sync({mode:'grandprix',status:'racing',field:{start:{lights:5}}});
for(const root of lamps.group.children)for(let i=1;i<=5;i++)assert.equal(root.getObjectByName('lamp-'+i).material.emissiveIntensity,0);
const privateCounts=[];lamps.group.traverse(mesh=>{if(mesh.isMesh){const count={disposed:0};
  mesh.material.addEventListener('dispose',()=>count.disposed++);privateCounts.push(count);}});
const world=new THREE.Group();bindTrackKits(world,lamps);registerSceneSystem(world,{dispose:lamps.dispose});
assert.equal(trackKitsOf(world),lamps);disposeTree(world);disposeTree(world);lamps.dispose();
assert.ok(privateCounts.every(count=>count.disposed===1),'world disposal releases private lamp materials once');

// Ready waits for every asset and required extra id, with no partial attachment.
let finishSlow;
const delayed=createTrackKits(course,{placements:entries,requiredIds:['snow-rock'],
  loadAsset:path=>path.includes('snow-rock-lod')?new Promise(resolve=>{finishSlow=()=>resolve(fake());}):Promise.resolve(fake())});
await Promise.resolve();await Promise.resolve();assert.equal(delayed.status,'loading');assert.equal(delayed.group.children.length,0);
finishSlow();assert.equal(await delayed.ready,true);delayed.dispose();

// Readiness uses the existing status host and retry action, with memory-only App data.
const errorNodes={strong:{textContent:''},span:{textContent:''},button:{textContent:''}};
const ui={view3d:{dataset:{vehicleAsset:'ready',trackKitAsset:'loading'},classList:{add(){}}},
  'renderer-loading':{hidden:true,lastChild:{textContent:''}},
  'renderer-error':{hidden:true,querySelector:key=>errorNodes[key]},'start-engine':{disabled:false}};
const app={profile:{},visualReady:false,duel:{state:{status:'menu'}},menuStage:0};
const readiness=createRendererReadiness({ui,app,choices:{car:'falcone_f42',startStage:0},profile:()=>app.profile,
  isDisposed:()=>false,importRenderer:async()=>({attachRenderer:()=>({prepareVehicle(){},retryTrackKits(){},dispose(){}})}),reportError:()=>{}});
await readiness.ensureRenderer();readiness.syncRendererReadiness(app.duel.state);
assert.equal(ui['start-engine'].disabled,true);assert.match(ui['renderer-loading'].lastChild.textContent,/TRACK SCENERY/);
ui.view3d.dataset.trackKitAsset='error';readiness.syncRendererReadiness(app.duel.state);
assert.equal(ui['renderer-error'].hidden,false);assert.equal(ui['renderer-loading'].hidden,true);
assert.match(errorNodes.strong.textContent,/track scenery/);assert.match(errorNodes.button.textContent,/RETRY TRACK/);readiness.dispose();

// Parse all 70 unchanged actual GLBs through the same loader. Only headless image
// decoding is stubbed here; the private native scenario checks actual textures.
const parser=new GLTFLoader();parser.register(()=>({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const nativeCourse=new Course(COURSE[0],1989);
const real=createTrackKits(nativeCourse,{placements:originalKitIds.map((id,index)=>id==='start-gantry'?{id,s:15,lateral:0}:
  id==='gallery'?{id,s:65,lateral:0,scale:[1.8,1.3,1]}:
  {id,s:120+Math.floor(index/4)*35,lateral:40+(index%4)*25}),
  loadAsset:async path=>{const bytes=await readFile(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});
assert.equal(await real.ready,true,real.error?.message);
assert.equal(real.placements.length,35);real.update({high:false,position:{x:nativeCourse.groundAt(100,80).x,z:nativeCourse.groundAt(100,80).z},state:{status:'menu'}});
assert.equal(real.stats.low,35);assert.ok(real.group.children.some(node=>node.isInstancedMesh));
assert.ok(real.group.children.some(node=>node.name==='yeti low'));real.dispose();
console.log('Track kits: 70 real assets, metadata, transforms, quality, countdown, clearance, readiness and exact lifetime passed.');


// Real named entrance variants retain original anchors, donors and all other faces.
{
  const rows=SUMMIT_RUN.kitPlacements.filter(row=>row.id==='gallery');
  const oldRows=rows.map(({nodeTranslations,...row})=>row);
  const base=new Course({...SUMMIT_RUN,kitPlacements:oldRows},1989),moved=new Course(SUMMIT_RUN,1989);
  const normalized=normalizeKitPlacements(moved,rows);
  assert.ok(Object.isFrozen(normalized[0].nodeTranslations));
  assert.ok(Object.values(normalized[0].nodeTranslations).every(Object.isFrozen));
  assert.notEqual(normalized[0].nodeTranslations,rows[0].nodeTranslations);
  for(const nodeTranslations of [{unknown:[1,0,0]},{'gallery-concrete-pillar':[NaN,0,0]},
      {'gallery-concrete-pillar':[1,0]},null])
    assert.throws(()=>normalizeKitPlacements(moved,[{...rows[0],nodeTranslations}]),/translation/i);
  assert.throws(()=>normalizeKitPlacements(moved,[{...rows[1],nodeTranslations:rows[0].nodeTranslations}]),/entrance/i);
  const parser=new GLTFLoader();
  parser.register(()=>({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const raw=new Map(),sourceCounts=new Map(),snapshots=new Map();
  const snapshot=model=>{
    const nodes=[];model.scene.traverse(node=>{if(node.isMesh)nodes.push({name:node.userData.name??node.name,
      position:node.position.toArray(),matrix:node.matrix.toArray(),geometryUserData:node.geometry.userData,
      attributes:Object.fromEntries(Object.entries(node.geometry.attributes).map(([key,value])=>[key,Array.from(value.array)])),
      materials:[].concat(node.material).map(material=>({colour:material.color?.toArray(),roughness:material.roughness,
        metalness:material.metalness,emissive:material.emissive?.toArray(),intensity:material.emissiveIntensity,userData:material.userData}))});});
    return JSON.stringify(nodes);
  };
  const load=async path=>{
    const bytes=await readFile(new URL('../public'+path,import.meta.url));
    const model=await parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    model.scene.updateMatrixWorld(true);return model;
  };
  const baseline=createTrackKits(base,{placements:oldRows,loadAsset:load});
  const translated=createTrackKits(moved,{placements:rows,loadAsset:async path=>{
    const model=await load(path);raw.set(path,model);snapshots.set(path,snapshot(model));
    model.scene.traverse(node=>{if(node.isMesh)for(const resource of [node.geometry,...[].concat(node.material)]){
      if(!sourceCounts.has(resource)){const count={disposed:0};resource.addEventListener('dispose',()=>count.disposed++);sourceCounts.set(resource,count);}
    }});return model;
  }});
  assert.equal(await baseline.ready,true,baseline.error?.message);
  assert.equal(await translated.ready,true,translated.error?.message);
  for(let index=0;index<rows.length;index++)assert.deepEqual(translated.getPlacementPose(index).elements,baseline.getPlacementPose(index).elements,
    'expanded post bounds never move the original whole-tile anchor, including all other34 tiles');
  const defaultSolids=new Map(base.features.obstacles.filter(row=>row.sourceBounds?.startsWith('gallery-')).map(row=>[row.id,row]));
  const targeted=new Set(Object.keys(rows[0].nodeTranslations));
  for(const solid of moved.features.obstacles.filter(row=>row.sourceBounds?.startsWith('gallery-'))){
    const original=defaultSolids.get(solid.id);
    if(solid.kitS!==10176||!targeted.has(solid.sourceBounds))assert.deepEqual(solid,original,'all non-target roof/back/inside and other-tile physical poses remain exact');
    else{
      const delta=rows[0].nodeTranslations[solid.sourceBounds],frame=moved.groundAt(10176,0);
      assert.ok(Math.abs(solid.x-original.x-Math.cos(frame.heading)*delta[0]*rows[0].scale[0])<1e-8);
      assert.ok(Math.abs(solid.z-original.z+Math.sin(frame.heading)*delta[0]*rows[0].scale[0])<1e-8);
      for(const key of ['minY','maxY','height','halfX','halfZ'])assert.equal(solid[key],original[key],'original High bounds and grounding retain the same envelope');
    }
  }
  const frame=moved.groundAt(10176,0),cs=Math.cos(frame.heading),sn=Math.sin(frame.heading),cut=moved.features.shortcuts.find(row=>row.id==='summit-open-road');
  const parts=version=>translated.group.children.filter(mesh=>mesh.isInstancedMesh&&mesh.userData.trackKitVersion===version&&mesh.userData.trackKitPlacementIndices.includes(0));
  const checkEdgeMinimum=(rectangle,label)=>{
    const distance=s=>{
      const p=moved.worldAt(s,moved.shortcutOffset(cut,s)-cut.halfWidth);
      const x=(p.x-frame.x)*cs-(p.z-frame.z)*sn,z=(p.x-frame.x)*sn+(p.z-frame.z)*cs;
      return Math.hypot(Math.max(rectangle.minX-x,0,x-rectangle.maxX),Math.max(rectangle.minZ-z,0,z-rectangle.maxZ));
    };
    for(let s=10168;s<=10183;s+=.25)assert.ok(distance(s)>=1.5,label+' clears the actual Open edge by 1.5 m');
    let lo=10168,hi=10183;
    for(let i=0;i<100;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(distance(a)<distance(b))hi=b;else lo=a;}
    assert.ok(Math.min(distance(10168),distance(10183),distance((lo+hi)/2))>=1.5,
      label+' continuous edge minimum retains the exact 1.5 m requirement');
  };
  const rectangleFromWorld=points=>{
    const rectangle={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
    for(const point of points){
      const x=(point.x-frame.x)*cs-(point.z-frame.z)*sn,z=(point.x-frame.x)*sn+(point.z-frame.z)*cs;
      rectangle.minX=Math.min(rectangle.minX,x);rectangle.maxX=Math.max(rectangle.maxX,x);
      rectangle.minZ=Math.min(rectangle.minZ,z);rectangle.maxZ=Math.max(rectangle.maxZ,z);
    }
    assert.ok(Object.values(rectangle).every(Number.isFinite),'the real post has finite transformed vertices');
    return rectangle;
  };
  for(const solid of moved.features.obstacles.filter(row=>row.kitS===10176&&targeted.has(row.sourceBounds))){
    const cosine=Math.cos(solid.heading),sine=Math.sin(solid.heading),points=[];
    for(const x of [-solid.halfX,solid.halfX])for(const z of [-solid.halfZ,solid.halfZ])
      points.push({x:solid.x+cosine*x+sine*z,z:solid.z-sine*x+cosine*z});
    checkEdgeMinimum(rectangleFromWorld(points),'double-precision collision '+solid.sourceBounds);
  }
  for(const version of ['high','low']){
    translated.update({high:version==='high',position:frame,state:{status:'menu'}});
    translated.group.updateMatrixWorld(true);
    const model=raw.get('/assets/models/circuits/kits/gallery'+(version==='low'?'-lod':'')+'.glb');
    const vertices=new Set();
    for(const mesh of parts(version)){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++)vertices.add([p.getX(i),p.getY(i),p.getZ(i)].join('|'));}
    model.scene.traverse(node=>{if(!node.isMesh)return;
      const name=node.userData.name??node.name,delta=rows[0].nodeTranslations[name]??[0,0,0],p=node.geometry.attributes.position;
      const expectedPost=new Set();
      for(let i=0;i<p.count;i++){
        const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(node.matrixWorld);
        const expected=[Math.fround(v.x+delta[0]),Math.fround(v.y+delta[1]),Math.fround(v.z+delta[2])];
        assert.ok(vertices.has(expected.join('|')),'actual '+version+' drawn vertices match only the named move; every roof/back/inside vertex remains exact');
        expectedPost.add(expected.join('|'));
      }
      if(!targeted.has(name))return;
      const box=new THREE.Box3().setFromBufferAttribute(p).applyMatrix4(node.matrixWorld);
      const rectangle={minX:Math.min((box.min.x+delta[0])*rows[0].scale[0],Math.fround(box.min.x+delta[0])*rows[0].scale[0]),
        maxX:Math.max((box.max.x+delta[0])*rows[0].scale[0],Math.fround(box.max.x+delta[0])*rows[0].scale[0]),
        minZ:box.min.z*rows[0].scale[2],maxZ:box.max.z*rows[0].scale[2]};
      checkEdgeMinimum(rectangle,'source '+version+' '+name);
      const drawn=[];
      for(const mesh of parts(version)){
        const slot=mesh.userData.trackKitDrawnPlacementIndices.indexOf(0);
        assert.ok(mesh.visible&&slot>=0&&slot<mesh.count,'the actual entrance instance is submitted in '+version);
        assert.equal(mesh.instanceMatrix.array.constructor,Float32Array,'draw matrices have actual Float32 storage');
        const instance=new THREE.Matrix4();mesh.getMatrixAt(slot,instance);
        const positions=mesh.geometry.attributes.position;
        assert.equal(positions.array.constructor,Float32Array,'merged draw geometry has actual Float32 storage');
        for(let i=0;i<positions.count;i++){
          const v=new THREE.Vector3(positions.getX(i),positions.getY(i),positions.getZ(i));
          if(expectedPost.has(v.toArray().join('|')))drawn.push(v.applyMatrix4(instance).applyMatrix4(mesh.matrixWorld));
        }
      }
      assert.ok(drawn.length>0,'actual '+version+' draw contains the named post vertices');
      checkEdgeMinimum(rectangleFromWorld(drawn),'final Float32 '+version+' '+name);
    });
  }
  // Each untouched tile must also retain the final uploaded matrices and geometry.
  for(const version of ['high','low'])for(let index=1;index<rows.length;index++){
    const position=moved.groundAt(rows[index].s,rows[index].lateral);
    for(const runtime of [baseline,translated]){
      runtime.update({high:version==='high',position,state:{status:'menu'}});
      runtime.group.updateMatrixWorld(true);
    }
    const drawn=runtime=>runtime.group.children.filter(mesh=>mesh.isInstancedMesh&&mesh.visible&&
      mesh.userData.trackKitVersion===version&&mesh.userData.trackKitDrawnPlacementIndices.includes(index));
    const original=drawn(baseline),current=drawn(translated);
    assert.ok(original.length>0,'untouched tile '+index+' has actual '+version+' draws');
    assert.equal(current.length,original.length,'untouched tile keeps the original draw parts');
    for(let part=0;part<original.length;part++){
      const before=original[part],after=current[part],a=new THREE.Matrix4(),b=new THREE.Matrix4();
      before.getMatrixAt(before.userData.trackKitDrawnPlacementIndices.indexOf(index),a);
      after.getMatrixAt(after.userData.trackKitDrawnPlacementIndices.indexOf(index),b);
      assert.deepEqual(b.elements,a.elements,'every untouched tile retains its final Float32 draw matrix');
      assert.deepEqual(after.matrixWorld.elements,before.matrixWorld.elements,'untouched draw parent poses stay exact');
      assert.deepEqual(Array.from(after.geometry.attributes.position.array),Array.from(before.geometry.attributes.position.array),
        'every untouched tile retains its original drawn geometry');
    }
  }
  for(const [path,model] of raw)assert.equal(snapshot(model),snapshots.get(path),'cached actual source geometry/materials/names stay immutable');
  assert.ok([...sourceCounts.values()].every(row=>row.disposed===0),'variants never retire the raw donor while the owner is live');
  const privateCounts=new Map();translated.group.traverse(mesh=>{if(mesh.isMesh)for(const resource of [mesh.geometry,...[].concat(mesh.material)]){
    if(!privateCounts.has(resource)){const count={disposed:0};resource.addEventListener('dispose',()=>count.disposed++);privateCounts.set(resource,count);}
  }});
  translated.dispose();translated.dispose();baseline.dispose();
  assert.ok([...sourceCounts.values()].every(row=>row.disposed===1),'each actual loaded donor resource is retired once');
  assert.ok([...privateCounts.values()].every(row=>row.disposed===1),'owned batched variant geometry/materials retire once');
  const missing=createTrackKits(moved,{placements:[rows[0]],loadAsset:async path=>{
    const model=await load(path);if(path.includes('-lod'))model.scene.traverse(node=>{
      if((node.userData.name??node.name)==='gallery-concrete-pillar.001'){node.userData.name='missing-in-this-controlled-source';node.name='missing-in-this-controlled-source';}
    });return model;
  }});
  assert.equal(await missing.ready,false,'a missing actual LOD named mesh cannot silently leave an unmoved post');
  assert.match(missing.error.message,/unique actual mesh/);missing.dispose();
}
// Actual model matrices must meet the same nine footprint samples as the ground report.
{
  const harbour=new Course(HARBOUR_LIGHTS,1989),before=JSON.stringify(harbour.features);
  const rows=[1160,1780,2140].map(s=>HARBOUR_LIGHTS.kitPlacements.filter(row=>
    row.id==='concrete-wall'||row.id==='catch-fence').reduce((best,row)=>Math.abs(row.s-s)<Math.abs(best.s-s)?row:best));
  for (const id of ['concrete-wall', 'catch-fence', 'tyre-wall']) {
    const pin = HARBOUR_LIGHTS.kitPlacements.find(row => row.id === id && row.worldPosition);
    assert.ok(pin, 'actual escape lining has a world-position witness'); rows.push(pin);
  }
  const assets=new Map(),seated=createTrackKits(harbour,{placements:rows,loadAsset:async path=>{
    const bytes=await readFile(new URL('../public'+path,import.meta.url));
    const asset=await parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
    assets.set(path,new THREE.Box3().setFromObject(asset.scene));return asset;
  }});
  try{
    assert.equal(await seated.ready,true,seated.error?.message);
    for(let i=0;i<rows.length;i++){
      const row=rows[i],matrix=seated.getPlacementPose(i),bounds=assets.get('/assets/models/circuits/kits/'+row.id+'.glb');
      assert.ok(bounds,'actual High model bounds exist');
      for(const x of [bounds.min.x,(bounds.min.x+bounds.max.x)/2,bounds.max.x])
        for(const z of [bounds.min.z,(bounds.min.z+bounds.max.z)/2,bounds.max.z]){
          const base=new THREE.Vector3(x,bounds.min.y,z).applyMatrix4(matrix),at=harbour.nearest(base.x,base.z,row.s);
          const ground=renderedGroundHeight(harbour,{...harbour.groundAt(at.s,at.lateral),
            ...(row.worldPosition ? {x:base.x,z:base.z} : {}),s:at.s,off:at.lateral},{requireSurface:true});
          assert.ok(Number.isFinite(ground),'actual drawn ground exists');
          assert.ok(base.y-ground<=.45,'actual model base float retains .45 m bound');
          assert.ok(ground-base.y<=1.5,'actual model base sink retains 1.5 m bound');
        }
    }
    assert.equal(JSON.stringify(harbour.features),before,'seating cannot alter physical geometry');
  }finally{seated.dispose();}
}


// Compare against the actual Float32 indexed triangles, independently of the
// grounding helper. The far witness lies beyond the authored 64 m ribbon.
const authoredCourse=new Course(PANORAMA_RIDGE,1989);
const surfaceMaterial=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const nearMesh=new THREE.Mesh(terrainGeometry(authoredCourse),surfaceMaterial);
const farMesh=new THREE.Mesh(farTerrainGeometry(authoredCourse),surfaceMaterial);
const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
let nearWitness=null,farWitness=null;
for(let s=120;s<authoredCourse.length-120&&(!nearWitness||!farWitness);s+=31){
  for(const off of [22,100,130]){
    const point={...authoredCourse.groundAt(s,off),s,off};
    ray.set(new THREE.Vector3(point.x,2000,point.z),down);
    const hit=ray.intersectObjects([nearMesh,farMesh],false)[0];
    if(!hit)continue;
    if(off===22&&!nearWitness)nearWitness={point,hit};
    if(off>64&&hit.object===farMesh&&!farWitness)farWitness={point,hit};
  }
}
for(const s of [100,500,1500,2300,3000,3900])for(const off of [60,68,76,84,92,100,-60,-68,-76,-84,-92,-100]){
  const point={...authoredCourse.groundAt(s,off),s,off};
  ray.set(new THREE.Vector3(point.x,2000,point.z),down);
  const hit=ray.intersectObjects([nearMesh,farMesh],false)[0];
  assert.ok(hit,`authored ribbon/far-grid join must cover s=${s},off=${off}`);
  assert.ok(Math.abs(renderedGroundHeight(authoredCourse,point,{requireSurface:true})-hit.point.y)<1e-4,
    `drawn upper terrain triangle must match helper at s=${s},off=${off}`);
}
assert.ok(nearWitness&&farWitness,'actual authored near and far terrain witnesses exist');
for(const {point,hit} of [nearWitness,farWitness]){
  assert.ok(Math.abs(renderedGroundHeight(authoredCourse,point,{requireSurface:true})-hit.point.y)<1e-4);
  const grounded=createTrackKits(authoredCourse,{placements:[{id:'armco',s:point.s,lateral:point.off}],loadAsset:async()=>fake()});
  assert.equal(await grounded.ready,true,grounded.error?.message);
  assert.ok(Math.abs(grounded.getPlacementPose(0).elements[13]-hit.point.y)<1e-4,'kit base matches actual rendered triangle');
  grounded.dispose();
}
assert.equal(renderedGroundHeight(authoredCourse,{x:1e7,z:1e7,s:100,off:1e7},{requireSurface:true}),null);
nearMesh.geometry.dispose();farMesh.geometry.dispose();surfaceMaterial.dispose();
console.log('Track kits: authored near/far bases match actual Float32 terrain triangles.');


// A small source-only regression set; no browser, timing or real-asset parsing.
async function kitCullingChecks() {
  let projections = 0;
  const flatCourse = {
    length: 1000, def: {}, samples: [], features: {surfacePatches: [],shortcuts: []},
    at: s => ({s, x: 0, y: 0, z: s, heading: 0}),
    groundAt: (s, lateral) => ({x: lateral, y: 0, z: s, heading: 0}),
    nearest: (x, z) => { projections++; return {s: z, lateral: x}; },
    roadHalfWidthAt: () => 7,
  };
  const asset = () => {
    const geometry = new THREE.BoxGeometry(1, 3, 1);
    geometry.translate(0, 1.5, 0);
    const scene = new THREE.Group();
    scene.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    return {scene, animations: []};
  };
  const rows = [20, 70, 130, 880].map(s => ({id: 'armco', s, lateral: 20}));
  const runtime = createTrackKits(flatCourse, {
    placements: rows, validateClearance: false, loadAsset: async () => asset(),
  });
  assert.equal(await runtime.ready, true, runtime.error?.message);
  assert.equal(projections, 0, 'explicit runtime trust avoids geometric triangle projection');
  runtime.update({high: true, position: {x: 20, y: 0, z: 40}});
  const meshes = runtime.group.children.filter(node => node.isInstancedMesh);
  assert.equal(new Set(meshes.map(mesh => mesh.userData.trackKitChunk)).size, 3,
    'placements occupy their actual roughly100m chunks');
  assert.equal(meshes.reduce((sum, mesh) => sum + mesh.count, 0), 4,
    'only one real version per placement is submitted');
  const actual = new THREE.Matrix4(), actualScale = new THREE.Vector3();
  for (const mesh of meshes) for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, actual);
    actualScale.setFromMatrixScale(actual);
    assert.ok(actualScale.toArray().every(value => value > 0), 'no zero-scale hidden draw');
  }
  const camera = new THREE.PerspectiveCamera(60, 1.6, .1, 500);
  camera.position.set(20, 8, 40); camera.lookAt(20, 4, 150);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  runtime.update({high: true, position: camera.position, camera});
  assert.equal(runtime.stats.high, 2, 'main packs only the two in-frustum nearby pieces');
  assert.equal(runtime.stats.low, 0, 'far piece outside the actual camera is not submitted');
  const before = meshes.map(mesh => ({mesh, count: mesh.count, visible: mesh.visible,
    matrices: Array.from(mesh.instanceMatrix.array)}));
  const beforeStats = JSON.stringify(runtime.stats);
  const untouched = meshes.filter(mesh => mesh.userData.trackKitChunk === 8)
    .map(mesh => ({mesh, version:mesh.instanceMatrix.version}));
  assert.ok(untouched.length, 'actual distant batches remain outside both views');
  assert.throws(() => runtime.withRearView({position: camera.position,
    forward: new THREE.Vector3(0, 0, -1)}, () => {
    assert.equal(runtime.stats.high, 0, 'rear never submits detailed instances');
    assert.equal(runtime.stats.low, 1, 'rear submits only the nearby piece behind the car');
    throw Error('deliberate rear draw failure');
  }), /deliberate rear/);
  for (const saved of before) {
    assert.equal(saved.mesh.count, saved.count);
    assert.equal(saved.mesh.visible, saved.visible);
    assert.deepEqual(Array.from(saved.mesh.instanceMatrix.array), saved.matrices);
  }
  assert.equal(JSON.stringify(runtime.stats), beforeStats, 'throw restores exact main statistics');
  for (const saved of untouched) assert.equal(saved.mesh.instanceMatrix.version,saved.version,
    'a rear scope must not re-upload untouched distant matrix buffers');
  assert.equal(runtime.withRearView({position:camera.position,
    forward:new THREE.Vector3(0,0,-1)},()=> 'actual draw return'),'actual draw return');
  assert.equal(JSON.stringify(runtime.stats),beforeStats,'successful scope restores main statistics');
  const moved = new THREE.Matrix4().makeTranslation(20,0,25);
  assert.equal(runtime.setPlacementPose(1,moved),true);
  assert.equal(runtime.stats.high,1,'a real mutable pose leaves the main frustum');
  runtime.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,-1)},()=> {
    assert.equal(runtime.stats.low,2,'rear includes the actual moved pose');
    runtime.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,1)},()=> {
      assert.equal(runtime.stats.high,0);
      assert.equal(runtime.stats.low,1,'nested rear scope follows its actual orientation');
    });
    assert.equal(runtime.stats.low,2,'nested scope restores its caller');
  });
  assert.equal(runtime.stats.high,1,'pose and main count survive the rear scope');
  runtime.dispose();

  // Claude's genuine layer colour contract must follow the selected row, not
  // the old full-route buffer slot, through main and nested rear packing.
  const paintedRows = rows.map((row,index) => ({...row,id:'tyre-wall',
    ...(index===2?{}:{bands:[[index/3,0,1-index/3],[0,index/3,1-index/3]]})}));
  const painted = createTrackKits(flatCourse,{placements:paintedRows,validateClearance:false,
    loadAsset:async()=>{
      const scene=new THREE.Group();
      for(let layer=1;layer<=2;layer++){
        const geometry=new THREE.BoxGeometry(1,3,1);geometry.translate(0,1.5,0);
        geometry.userData.fixtureLayer=layer-1;
        const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
        mesh.name='layer-'+layer;scene.add(mesh);
      }
      return {scene,animations:[]};
    }});
  assert.equal(await painted.ready,true,painted.error?.message);
  assert.ok(Object.isFrozen(painted.placements[0].bands[0]),'layer colours remain immutable');
  const actualPaint=new THREE.Color();
  function assertPaintedPrefix(){
    for(const mesh of painted.group.children){
      if(!mesh.visible||!mesh.count)continue;
      const layer=mesh.geometry.userData.fixtureLayer;
      mesh.userData.trackKitDrawnPlacementIndices.forEach((index,slot)=>{
        const expected=paintedRows[index].bands?.[layer]??[1,1,1];
        if(mesh.instanceColor)mesh.getColorAt(slot,actualPaint);else actualPaint.setRGB(1,1,1);
        assert.ok(actualPaint.toArray().every((value,axis)=>Math.abs(value-expected[axis])<1e-6),
          'actual selected layer colour follows its packed placement index');
      });
    }
  }
  painted.update({high:true,position:camera.position,camera});assertPaintedPrefix();
  const paintedBefore=painted.group.children.map(mesh=>({mesh,visible:mesh.visible,count:mesh.count,
    matrices:Array.from(mesh.instanceMatrix.array),colours:mesh.instanceColor?Array.from(mesh.instanceColor.array):null,
    colourVersion:mesh.instanceColor?.version}));
  painted.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,-1)},()=>{
    assertPaintedPrefix();
    painted.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,1)},assertPaintedPrefix);
    assertPaintedPrefix();
  });
  for(const saved of paintedBefore){
    assert.equal(saved.mesh.visible,saved.visible);assert.equal(saved.mesh.count,saved.count);
    assert.deepEqual(Array.from(saved.mesh.instanceMatrix.array),saved.matrices);
    assert.deepEqual(saved.mesh.instanceColor?Array.from(saved.mesh.instanceColor.array):null,saved.colours,
      'rear restores exact original layer colour buffers');
    if(saved.mesh.userData.trackKitChunk===8)
      assert.equal(saved.mesh.instanceColor?.version,saved.colourVersion,'untouched distant colour buffers never upload');
  }
  assertPaintedPrefix();painted.dispose();
  assert.throws(()=>normalizeKitPlacements(flatCourse,[{...paintedRows[0],bands:[[0,NaN,1]]}]),/bands/);

  const illegal = createTrackKits(flatCourse, {placements: [{id:'armco',s:100,lateral:0}],
    loadAsset: async () => asset()});
  assert.equal(await illegal.ready, false, 'default full validation still rejects the actual road intrusion');
  assert.match(illegal.error.message, /clearance/i); illegal.dispose();
  const malformed = createTrackKits(flatCourse, {placements: [{id:'armco',s:100,lateral:20,lift:NaN}],
    validateClearance: false, loadAsset: async () => asset()});
  assert.equal(await malformed.ready, false, 'runtime trust preserves metadata/lift checks');
  malformed.dispose();

  // Independent straight road boxes: outside pieces avoid triangles; nearby,
  // spanning and physical-patch pieces retain the original complete guard.
  const sampled = {...flatCourse,samples:[{s:0,x:0,z:0},{s:1000,x:0,z:1000}]};
  projections=0;
  const far = createTrackKits(sampled,{placements:[{id:'armco',s:100,lateral:20}],
    loadAsset:async()=>asset()});
  assert.equal(await far.ready,true,far.error?.message);
  assert.equal(projections,0,'conservative broad phase proves an outside box clear');
  assert.equal(far.stats.clearance.broadPhaseSkipped,2);far.dispose();
  projections=0;
  const close = createTrackKits(sampled,{placements:[{id:'armco',s:100,lateral:0,lift:5}],
    loadAsset:async()=>asset()});
  assert.equal(await close.ready,true,close.error?.message);
  assert.ok(projections>0,'nearby lifted pieces keep triangle headroom validation');
  assert.equal(close.stats.clearance.trianglePlacements,2);close.dispose();
  const spanning = createTrackKits(sampled,{placements:[{id:'armco',s:100,lateral:20,scale:[50,1,1]}],
    loadAsset:async()=>asset()});
  assert.equal(await spanning.ready,false,'a model box spanning the road cannot be skipped');
  assert.match(spanning.error.message,/clearance/i);spanning.dispose();
  const patch={kind:'deep-snow',s0:90,s1:110,from:19,to:21};
  const winter={...sampled,features:{...sampled.features,surfacePatches:[patch]}};
  projections=0;
  const bank=createTrackKits(winter,{placements:[{id:'plough-bank',s:100,lateral:20,physicalPatch:patch}],
    loadAsset:async()=>asset()});
  assert.equal(await bank.ready,true,bank.error?.message);
  assert.ok(projections>0,'physical bank footprint checks never use the broad-phase exemption');
  bank.dispose();
  const outsideBank=createTrackKits(winter,{placements:[{id:'plough-bank',s:100,lateral:20,scale:[3,1,1],physicalPatch:patch}],
    loadAsset:async()=>asset()});
  assert.equal(await outsideBank.ready,false);
  assert.match(outsideBank.error.message,/physical patch/i);outsideBank.dispose();

  let releases=0;
  const retiring=createTrackKits(flatCourse,{placements:rows,validateClearance:false,
    loadAsset:async()=>{const model=asset();model.scene.traverse(node=>{
      node.geometry?.addEventListener('dispose',()=>releases++);
      node.material?.addEventListener('dispose',()=>releases++);
    });return model;}});
  assert.equal(await retiring.ready,true);retiring.update({high:true,position:camera.position,camera});
  retiring.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,-1)},()=>retiring.dispose());
  assert.equal(retiring.status,'retired');assert.equal(retiring.group.children.length,0);
  assert.equal(releases,4,'rear retirement releases the two actual source pairs once');
  retiring.dispose();assert.equal(releases,4);
  assert.equal(retiring.withRearView({position:camera.position,forward:new THREE.Vector3(0,0,-1)},()=>17),17);
  assert.equal(retiring.group.children.length,0,'retired scope never restores a world into the scene');
  let allowLoad;
  const loadingGate=new Promise(resolve=>{allowLoad=resolve;});
  const timed=createTrackKits(flatCourse,{placements:rows,validateClearance:false,
    loadAsset:async()=>{await loadingGate;return asset();}});
  assert.equal(timed.stats.presentation.constructionMs,null,'pending assets never claim completed construction');
  await new Promise(resolve=>setTimeout(resolve,20));allowLoad();
  assert.equal(await timed.ready,true);
  assert.ok(timed.stats.presentation.constructionMs>=timed.stats.presentation.activeCpuMs+10,
    'actual construction includes the genuine asset wait, without subtracting it');
  timed.dispose();
  const failedTiming=createTrackKits(flatCourse,{placements:[{id:'bad-kit',s:0,lateral:0}]});
  assert.equal(await failedTiming.ready,false);assert.equal(failedTiming.stats.presentation.constructionMs,null);
  failedTiming.dispose();
  console.log('Track kit runtime trust, packed chunks, culling and exact rear restoration passed.');
}

await kitCullingChecks();


async function validateCircuitKits(definition) {
  const parser = new GLTFLoader();
  parser.register(() => ({name:'KIT_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const course = new Course(definition,1989);
  const owner = createTrackKits(course, {loadAsset:async path => {
    const bytes = await readFile(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  }});
  try {
    assert.equal(await owner.ready,true,owner.error?.message);
    assert.equal(owner.placements.length,definition.kitPlacements.length+beechTreePlacements(course).length);
    assert.equal(owner.stats.clearance.runtimeSkipped,0,'build validates every real High/LOD placement');
    assert.equal(owner.stats.clearance.trianglePlacements+owner.stats.clearance.broadPhaseSkipped,
      owner.placements.length*2);
    console.log(definition.id+': '+owner.placements.length+' actual High/LOD placements fully validated.');
  } finally {owner.dispose();}
}

for (const definition of ALL_CIRCUITS)
  if (definition.kitPlacements?.length) await validateCircuitKits(definition);

// The actual approved High/LOD signs enlarge only their face and lettering.
{
 const c=new Course(COURSE[0],1989),assets=new Map(),ids=['braking-board-150','braking-board-100','braking-board-50'];
 const owner=createTrackKits(c,{placements:ids.map((id,index)=>({id,s:120+index*30,lateral:80})),validateClearance:false,loadAsset:async path=>{
  const bytes=await readFile(new URL('../public'+path,import.meta.url)),model=await parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assets.set(path,model);return model;
 }});
 try {
  assert.equal(await owner.ready,true,owner.error?.message);
  for(const [index,id]of ids.entries())for(const version of ['high','low']){
   const model=assets.get(`/assets/models/circuits/kits/${id}${version==='low'?'-lod':''}.glb`),panel=model.scene.getObjectByName(id+'-distance-board_1');
   const center=new THREE.Box3().setFromObject(panel).getCenter(new THREE.Vector3());
   const enlargement=new THREE.Matrix4().makeScale(2,2,1).setPosition(-center.x,-center.y,0);
   const placement=owner.getPlacementPose(index);
   for(const node of model.scene.children){
    const mesh=owner.group.children.find(m=>m.isInstancedMesh&&m.geometry===node.geometry),actual=new THREE.Matrix4();assert.ok(mesh,'actual source mesh is submitted');mesh.getMatrixAt(0,actual);
    const isFace=node.name!==id+'-distance-board_0';
    const expected=placement.clone().multiply(isFace?enlargement.clone().multiply(node.matrixWorld):node.matrixWorld);
    for(let k=0;k<16;k++)assert.ok(Math.abs(actual.elements[k]-expected.elements[k])<.0001,`${id}/${version}/${node.name}: face-only matrix`);
    assert.equal(node.scale.x,1);assert.equal(node.scale.y,1,'loaded asset transforms remain read-only');
   }
  }
 }finally{owner.dispose();}
}
