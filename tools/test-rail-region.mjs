import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from '../src/world/scablands.js';
import {scablandsNaturalHeightAt,scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {REGIONS,regionAt,regionNaturalHeightAt,placeToWorld} from '../src/world/regions.js';
import {applySaltStormFog,saltStormActive,THE_WHITES_NODES,createTheWhitesScene} from '../src/world/the-whites-scene.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};
function originalScablandsHeightAt(x,z){
  const nx=x/SCABLANDS_LAYOUT.halfWidth,nz=z/SCABLANDS_LAYOUT.halfDepth,edge=Math.hypot(nx,nz);
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  let height=rolling+ridge+wall;
  for(const place of SCABLANDS_PLACES){
    const distance=Math.hypot(x-place.x,z-place.z),weight=1-smooth((distance-place.flatRadius)/18);
    height+=(place.height-height)*weight;
  }
  return height;
}
const openMarks=new Set(['branch-open']);
const whites=REGIONS.find(region=>region.id==='the-whites');
const check=(condition,message)=>assert.ok(condition,message);
const near=(actual,expected,tolerance,message)=>assert.ok(Math.abs(actual-expected)<=tolerance,
  `${message}: ${actual} vs ${expected} (tolerance ${tolerance})`);

let closedSamples=0;
for(let iz=0;iz<50;iz++)for(let ix=0;ix<70;ix++){
  const x=-1250+ix*40,z=-900+iz*37;
  assert.equal(scablandsNaturalHeightAt(x,z),originalScablandsHeightAt(x,z),
    `closed Scablands height is unchanged at ${x}, ${z}`);
  closedSamples++;
}
check(closedSamples>=3000,'the closed-world grid covers several thousand samples');
check(regionAt(whites.origin.x,whites.origin.z,[])===null,'the Whites stays closed without branch-open');
check(regionAt(whites.origin.x,whites.origin.z,openMarks)===whites,'branch-open exposes the Whites region');
near(scablandsSurfaceHeightAt(whites.origin.x,whites.origin.z,undefined,openMarks),
  whites.heightAt(0,0),.001,'course ground receives open marks as explicit data');
check(regionNaturalHeightAt(whites.origin.x,whites.origin.z,[])===
  originalScablandsHeightAt(whites.origin.x,whites.origin.z),'closed region lookup preserves Scablands height');

const foot=whites.heightAt(-480,0),top=whites.heightAt(20,0);
near((top-foot)/500,1/30,.02/30+1e-12,'bank grade is within two percent of 1 in 30');
near(top-foot,17,.01,'bank top is 17 m above the foot');
let plateauLow=Infinity,plateauHigh=-Infinity;
for(let x=30;x<=400;x+=20)for(let z=-100;z<=100;z+=20){
  const height=whites.heightAt(x,z);
  plateauLow=Math.min(plateauLow,height);
  plateauHigh=Math.max(plateauHigh,height);
}
check(plateauHigh-plateauLow<.2,'the salt plateau remains near flat');
for(let z=-440;z<=440;z+=20){
  const joined=whites.heightAt(-500,z);
  const scablands=originalScablandsHeightAt(whites.origin.x-500,whites.origin.z+z);
  near(joined,scablands,.15,`west bank join has no height step at z=${z}`);
}
near(whites.heightAt(500,0),originalScablandsHeightAt(whites.origin.x+500,whites.origin.z),.15,
  'east region edge blends into Scablands ground');

const namedPlaces=[
  {id:'bank-foot',region:'the-whites',position:{x:-480,y:0,z:0}},
  {id:'bank-top',region:'the-whites',position:{x:20,y:17,z:0}},
  {id:'the-2-15',region:'the-whites',position:{x:120,y:17,z:10}},
  {id:'far-works-platform',region:'the-whites',position:{x:300,y:17,z:0}},
];
for(const place of namedPlaces){
  const world=placeToWorld(place);
  near(world.position.y,whites.heightAt(place.position.x,place.position.z),.5,`${place.id} lies on the ground`);
  assert.equal(world.region,place.region,`${place.id} keeps its region id`);
}
const ordinaryPlace={id:'unchanged',position:{x:1,y:2,z:3}};
assert.equal(placeToWorld(ordinaryPlace),ordinaryPlace,'places without a region are returned unchanged');

let closedLoads=0;
assert.equal(createTheWhitesScene({openMarks:[],loadAsset:()=>{closedLoads++;}}),null,
  'no Whites scene is created while its mark is closed');
assert.equal(closedLoads,0,'no Whites art loads before branch-open');
const model=new THREE.Group();
for(const name of THE_WHITES_NODES){const node=new THREE.Group();node.name=name;model.add(node);}
const view=createTheWhitesScene({openMarks,loadAsset:async()=>({scene:model})});
check(view,'branch-open creates the Whites scene');
check(await view.ready,'the opened Whites scene loads its model');
for(const name of THE_WHITES_NODES)check(view.group.getObjectByName(name),`the scene places named art node ${name}`);
view.dispose();

check(saltStormActive(openMarks),'salt-storm starts while the 2:15 has not come off the bank');
check(!saltStormActive(new Set(['rail-2-15-off-bank'])),'salt-storm clears for good after the off-bank mark');
const runs=[0,1].map(()=>({tick:0,position:{x:120,y:17,z:10},speed:0}));
const before=runs.map(state=>structuredClone(state));
for(const [index,state] of runs.entries()){
  const scene={fog:{near:80,far:500,color:new THREE.Color(0xaaaaaa)}};
  applySaltStormFog(scene,index===0?'salt-storm':null,1/60);
}
assert.deepEqual(runs,before,'view-only salt fog never changes simulation state');
assert.deepEqual(runs[0],runs[1],'storm-on runs keep identical simulation state');
const clearFog={fog:{near:80,far:500,color:new THREE.Color(0xaaaaaa)}};
assert.equal(applySaltStormFog(clearFog,'salt-storm',1/60,['rail-2-15-off-bank']),false,
  'the cleared story mark suppresses salt-storm fog');
assert.equal(clearFog.fog.near,80,'cleared weather leaves the view fog unchanged');

console.log(`PASS rail region: ${closedSamples} exact closed-world samples, bank, join, places, view loading and storm isolation`);
