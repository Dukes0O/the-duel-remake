import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createGroundEdit} from '../src/world/ground-edit.js';
import {scablandsGroundEdit,scablandsNaturalHeightAt,scablandsSurfaceHeightAt,resetScablandsGroundEdit} from '../src/world/scablands-ground.js';

const flat = () => 0;
const editable = () => createGroundEdit({region:{editable:true},seed:42,naturalHeight:flat});
const shape = {x:4,z:5,radius:2};
const a = editable(), b = editable();
const cutA = a.cut(shape,-2), cutB = b.cut(shape,-2);
assert.deepEqual(cutA,cutB,'the same edits repeat from the same seed');
assert.ok(cutA.volume > 0);
assert.equal(cutA.looseVolume,cutA.volume*1.25);
assert.equal(a.heightAt(4,5),-2);
assert.deepEqual(cutA.volumes,cutB.volumes,'seeded ground layers give the same materials');
const interpolated = editable();
interpolated.fill({x:1,z:0,radius:.5},'gravel',1);
assert.ok(Math.abs(interpolated.heightAt(.5,0)-.4)<1e-6,'height blends smoothly between edited and unedited 1 m samples');
assert.equal(interpolated.heightAt(31.5,0),0,'interpolation includes an unedited neighboring chunk');
const acrossEdge = editable();
acrossEdge.fill({x:32,z:0,radius:.5},'gravel',1);
assert.ok(Math.abs(acrossEdge.heightAt(31.5,0)-.4)<1e-6,'interpolation reads edited samples across chunk edges');
const sloped = createGroundEdit({region:{editable:true},naturalHeight:(x,z)=>x+2*z});
assert.equal(sloped.heightAt(.25,.75),1.75,'an unedited height is exactly the natural height');

const fill = a.fill(shape,'gravel',25);
assert.equal(fill.volume,20,'fill compacts loose material by the bulking factor');
assert.equal(fill.looseVolume,25);
assert.ok(a.heightAt(4,5)>-2);

const protectedGround = createGroundEdit({region:{editable:false},naturalHeight:flat});
assert.equal(protectedGround.cut(shape,-5).ok,false);
assert.equal(protectedGround.cut(shape,-5).reason,'This region is protected ground.');
const reserved = createGroundEdit({region:{editable:true},naturalHeight:flat,
  reservedShapes:[{x:4,z:5,radius:3,sentence:'Tin Town is protected.'}]});
assert.equal(reserved.fill(shape,'clay',20).reason,'Tin Town is protected.');
assert.throws(()=>a.fill(shape,'constructor',1),TypeError,'inherited material keys are rejected');

const unedited = createGroundEdit({region:{editable:true},seed:42,naturalHeight:scablandsNaturalHeightAt});
for(const [x,z] of [[0,0],[600,0],[-424,304],[39.25,-17.5]])
  assert.equal(scablandsSurfaceHeightAt(x,z),scablandsSurfaceHeightAt(x,z,unedited),'no edits preserve the current Scablands height');
const changed = createGroundEdit({region:{editable:true},seed:42,naturalHeight:scablandsNaturalHeightAt});
const changedTarget=scablandsNaturalHeightAt(4,5)-3; changed.cut(shape,changedTarget);
assert.equal(scablandsSurfaceHeightAt(4,5,changed),changedTarget,'the optional world hook reads edited ground');

const quarry = editable();
quarry.fill({x:0,z:0,radius:250},'gravel',1_000_000);
assert.ok(quarry.chunkCount>=180&&quarry.chunkCount<=220,`quarry allocates about 200 chunks (${quarry.chunkCount})`);
assert.ok(quarry.saveByteLength<2*1024*1024,`typed-array save is under 2 MB (${quarry.saveByteLength})`);
const restored=editable(); restored.loadSave(quarry.toSave());
assert.equal(restored.heightAt(0,0),quarry.heightAt(0,0),'typed-array save restores edited height');
const transactional=editable(); transactional.fill(shape,'clay',10);
const beforeRefusedLoad=transactional.heightAt(4,5),badSave=transactional.toSave();
const incoming={x:20,z:20,delta:new Float32Array(32*32),material:new Uint8Array(32*32)};
incoming.delta[0]=8;
badSave.chunks=[incoming,{x:21,z:21,delta:new Float32Array(32*32),material:new Uint8Array(32*32)}];
badSave.chunks[1].delta[17]=NaN;
assert.throws(()=>transactional.loadSave(badSave),TypeError,'non-finite sample deltas are refused');
assert.equal(transactional.heightAt(4,5),beforeRefusedLoad,'a refused load leaves prior edits untouched');
const badMaterial=transactional.toSave(); badMaterial.chunks[0].material[23]=255;
assert.throws(()=>transactional.loadSave(badMaterial),TypeError,'unknown saved material IDs are refused');
assert.equal(transactional.heightAt(4,5),beforeRefusedLoad,'invalid materials also leave prior edits untouched');

scablandsGroundEdit.fill(shape,'gravel',50);
assert.notEqual(scablandsSurfaceHeightAt(4,5),scablandsNaturalHeightAt(4,5),'Scablands edit hook can hold an edit');
resetScablandsGroundEdit();
for(const [x,z] of [[0,0],[4,5],[640,0],[-424,304]])
  assert.equal(scablandsSurfaceHeightAt(x,z),scablandsNaturalHeightAt(x,z),'reset returns exactly natural Scablands height');

const quick=editable(),started=performance.now();
for(let index=0;index<10_000;index++) quick.cut({x:index%20,z:Math.floor(index/20)%20,radius:.5},-0.1);
const elapsed=performance.now()-started;
assert.ok(elapsed<5000,`10,000 small cuts stay fast (${elapsed.toFixed(1)} ms)`);
console.log(`Ground edits passed; 200-chunk save ${quarry.saveByteLength} bytes; 10,000 cuts ${elapsed.toFixed(1)} ms.`);
