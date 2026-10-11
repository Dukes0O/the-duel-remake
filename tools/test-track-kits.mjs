import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {bindTrackKits,trackKitsOf} from '../src/track-kits.js';
import {disposeTree} from '../src/world.js';
import {registerSceneSystem} from '../src/scene-systems.js';
import {Course} from '../src/course.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {COURSE} from '../src/config.js';
import {terrainGeometry,farTerrainGeometry} from '../src/world-surfaces.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {createRendererReadiness} from '../src/screen-readiness.js';
import {createTrackKits, normalizeKitPlacements, TRACK_KIT_IDS} from '../src/track-kits.js';

const course = {
  length: 1000, def: {}, samples: [], features: {surfacePatches: [],shortcuts: []},
  at: s => ({s, x: 0, y: s * .02, z: s, heading: 0}),
  groundAt: (s, lateral) => ({x: lateral, y: s * .02, z: s, heading: 0}),
  nearest: (x, z) => ({s: z, lateral: x}), roadHalfWidthAt: () => 7,
};
assert.equal(TRACK_KIT_IDS.length, 35);
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
const real=createTrackKits(nativeCourse,{placements:TRACK_KIT_IDS.map((id,index)=>id==='start-gantry'?{id,s:15,lateral:0}:
  id==='gallery'?{id,s:65,lateral:0,scale:[1.8,1.3,1]}:
  {id,s:120+Math.floor(index/4)*35,lateral:40+(index%4)*25}),
  loadAsset:async path=>{const bytes=await readFile(new URL('../public'+path,import.meta.url));
    return parser.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');}});
assert.equal(await real.ready,true,real.error?.message);
assert.equal(real.placements.length,35);real.update({high:false,position:{x:nativeCourse.groundAt(100,80).x,z:nativeCourse.groundAt(100,80).z},state:{status:'menu'}});
assert.equal(real.stats.low,35);assert.ok(real.group.children.some(node=>node.isInstancedMesh));
assert.ok(real.group.children.some(node=>node.name==='yeti low'));real.dispose();
console.log('Track kits: 70 real assets, metadata, transforms, quality, countdown, clearance, readiness and exact lifetime passed.');

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
