import assert from 'node:assert/strict';
import * as THREE from 'three';
import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from '../src/world/scablands.js';
import {getScablandsOpenMarks,resetScablandsGroundEdit,scablandsGroundEdit,scablandsNaturalHeightAt,
  scablandsSurfaceAt,scablandsSurfaceHeightAt,setScablandsOpenMarks} from '../src/world/scablands-ground.js';
import {CUTS,REGIONS,WHITES_BASE,regionAt,regionNaturalHeightAt,placeToWorld} from '../src/world/regions.js';
import {Duel} from '../src/game.js';
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
const branchPlaces=[
  {id:'rail-east-run',x:560,z:-120},{id:'branch-post-1',x:610,z:-190},
  {id:'branch-post-2',x:650,z:-225},{id:'drift-foot',x:690,z:-250},
  {id:'bank-foot',x:1020,z:0},{id:'bank-top',x:1520,z:0},
];
const heightsByMarks={};
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
near(foot,1,0.1,'bank foot starts at the Scablands floor');
near(top-foot,17,.34,'bank top is 17 m above the foot within two percent');
check(foot<25&&top<25,'the bank stays below 25 m');
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
check(CUTS.length===2&&CUTS[0].floorHalfWidth===12&&CUTS[0].shoulder===45,
  'the branch and Whites have authored 12 m floors and 45 m shoulders');
check(CUTS[1].floorHalfWidth===12&&CUTS[1].shoulder===45,'both cut shoulders keep the specified width');
check(CUTS[0].opensWith==='branch-points'&&CUTS[1].opensWith==='branch-open',
  'each cutting opens at its story mark');
assert.deepEqual(CUTS[0].points.map(({x,z})=>[x,z]),[[560,-120],[610,-190],[650,-225],[690,-250]],
  'branch-cut follows the rail and branch story places');
assert.deepEqual(CUTS[1].points.map(({x,z})=>[x,z]),[[690,-250],[1020,0]],
  'whites-cut runs from drift-foot to bank-foot');
near(CUTS[0].floorHeight,WHITES_BASE,.001,'branch-cut grades to the Whites base');
near(CUTS[1].floorHeight,WHITES_BASE,.001,'whites-cut uses the Whites base as its floor');
assert.match(whites.join.roadStatus,/whites-cut/,'the road join names its cutting');
check(whites.heightAt(0,500)>100,'the natural wall remains around the pale plateau');
const ordinaryPlace={id:'unchanged',position:{x:1,y:2,z:3}};
assert.equal(placeToWorld(ordinaryPlace),ordinaryPlace,'places without a region are returned unchanged');

setScablandsOpenMarks(['branch-points']);
assert.deepEqual([...getScablandsOpenMarks()],['branch-points'],'open marks are kept by the ground');
check(regionAt(1020,0,getScablandsOpenMarks())===null,'branch-points alone do not open the Whites');
near(scablandsSurfaceHeightAt(1020,0),originalScablandsHeightAt(1020,0),.001,
  'the wall remains untouched past drift-foot until branch-open');
heightsByMarks.branchPoints=branchPlaces.map(place=>scablandsSurfaceHeightAt(place.x,place.z));
setScablandsOpenMarks(['branch-points','branch-open']);
heightsByMarks.both=branchPlaces.map(place=>scablandsSurfaceHeightAt(place.x,place.z));
check(regionAt(1020,0,getScablandsOpenMarks())===whites,'both marks open the Whites');
assert.equal(scablandsSurfaceAt(1500,0).gripKind,'salt','the Whites use a salt surface');
assert.equal(scablandsSurfaceAt(850,-125).gripKind,'salt','the whites-cut uses a salt surface');
check(scablandsSurfaceAt(850,-125).road,'the whites-cut is the road and rail join');
check(scablandsSurfaceAt(650,-225).road,'the opened branch-cut carries the road too');
near(WHITES_BASE,scablandsSurfaceHeightAt(560,-120),.1,'the bank uses the rail-east-run ground height');

const cutRoute=[{x:560,z:-120},...CUTS[0].points.slice(1),...CUTS[1].points.slice(1)];
const sampleRoute=(points,maxSlope,label)=>{
  for(let index=1;index<points.length;index++){
    const a=points[index-1],b=points[index],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/2);
    let previous=scablandsSurfaceHeightAt(a.x,a.z);
    for(let step=1;step<=steps;step++){
      const t=step/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      const height=scablandsSurfaceHeightAt(x,z);
      const slope=Math.abs(height-previous)/Math.hypot(x-(a.x+(b.x-a.x)*(step-1)/steps),
        z-(a.z+(b.z-a.z)*(step-1)/steps));
      check(slope<=maxSlope+1e-8,`${label} slope stays below 1 in ${1/maxSlope}; got ${slope} at ${x.toFixed(1)}, ${z.toFixed(1)}`);
      previous=height;
    }
  }
};
sampleRoute(cutRoute,1/12,'cut');
const bankTop={x:1520,z:0};
sampleRoute([{x:1020,z:0},bankTop,{x:1820,z:0}],1/25,'bank and plateau');
const bankFoot=scablandsSurfaceHeightAt(1020,0),bankTopHeight=scablandsSurfaceHeightAt(bankTop.x,bankTop.z);
near(bankFoot,1,.1,'reachable bank foot height');
near(bankTopHeight-bankFoot,17,.34,'reachable bank rise');
const driftHeight=scablandsSurfaceHeightAt(690,-250);
check(scablandsSurfaceHeightAt(560,-120)<25&&driftHeight<25,'branch route remains below 25 m');

const beforeFill=scablandsGroundEdit.heightAt(560,-120);
scablandsGroundEdit.fill({x:560,z:-120,radius:2},'rock',50);
const filledHeight=scablandsGroundEdit.heightAt(560,-120);
check(filledHeight>beforeFill,'ground edit raises the rail approach');
near(scablandsSurfaceHeightAt(560,-120),filledHeight,.001,'the shared surface reads the edited approach');
setScablandsOpenMarks(['branch-points']);
near(scablandsGroundEdit.heightAt(560,-120)-scablandsNaturalHeightAt(560,-120),filledHeight-beforeFill,.001,
  'changing marks rebuilds natural ground while keeping edits');
setScablandsOpenMarks(['branch-points','branch-open']);
resetScablandsGroundEdit();
assert.deepEqual([...getScablandsOpenMarks()],[],'ground reset clears story marks');
heightsByMarks.none=branchPlaces.map(place=>scablandsSurfaceHeightAt(place.x,place.z));
near(scablandsSurfaceHeightAt(1020,0),originalScablandsHeightAt(1020,0),.001,'reset restores the closed-world wall');
setScablandsOpenMarks(['branch-points','branch-open']);
const race=new Duel({seed:1989,featureFlags:{}});
race.startCampaign({mode:'duel',startStage:0,seed:1989});
assert.deepEqual([...getScablandsOpenMarks()],[],'starting a race clears story marks');
near(scablandsSurfaceHeightAt(1020,0),originalScablandsHeightAt(1020,0),.001,
  'a race starts on the closed-world ground after story marks were set');

console.log('Branch place ground heights (m):');
console.log(`| Place | No marks | branch-points | both marks |`);
console.log(`| --- | ---: | ---: | ---: |`);
branchPlaces.forEach((place,index)=>console.log(`| ${place.id} | ${heightsByMarks.none[index].toFixed(2)} | ${heightsByMarks.branchPoints[index].toFixed(2)} | ${heightsByMarks.both[index].toFixed(2)} |`));
console.log(`Both marks: bank-foot ${bankFoot.toFixed(2)} m, bank-top ${bankTopHeight.toFixed(2)} m, drift-foot ${driftHeight.toFixed(2)} m`);

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
