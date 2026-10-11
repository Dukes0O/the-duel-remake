import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {Duel} from '../src/game.js';
import {COURSE} from '../src/config.js';
import {winterRanges,gripFor,SURFACES} from '../src/race-surfaces.js';
import {snowWorldPlacements,snowPineIds,winterWeight,applySnowTerrain,
  snowSceneryPose,createSnowWorld,SNOW_LIMITS,winterTerrainMaterial} from '../src/snow-world.js';
const def={id:'winter-qa',stage:90,name:'Winter QA',theme:'alpine',closed:true,laps:3,
  hasRival:true,hasRadar:false,noTraffic:true,airborne:true,layoutVersion:1,
  scenery:{trees:80,rocks:20,mountains:false},script:[
    ['straight',500,{name:'Lodge',width:16,surface:'snow',walls:'none'}],
    ['turn','L',180,80,{walls:'none'}],
    ['straight',500,{name:'Ridge',width:16,surface:'snow',walls:'none'}],
    ['turn','L',180,80,{walls:'none'}]],
  surfacePatches:[{id:'forest-ice',kind:'ice',s0:520,s1:555,shaded:true}],
  snowWorld:{ranges:[{from:0,to:750}],exposed:[{from:520,to:700}],ponds:[{s:180,lateral:32,radiusX:9,radiusZ:5}]}};
const course=new Course(def,1989),dry=new Course({...def,snowWorld:undefined},1989);
assert.deepEqual(winterRanges(course.script,undefined),[]);
assert.throws(()=>winterRanges(course.script,{ranges:[{from:5,to:4}]}));
assert.throws(()=>winterRanges(course.script,{ranges:[{from:0,to:20},{from:10,to:30}]}));
assert.equal(winterWeight(course,200),1);assert.equal(winterWeight(course,1000),0);
assert.ok(winterWeight(course,745)<1);assert.equal(winterWeight(dry,200),0);
const patch=course.features.surfacePatches.find(row=>row.snowBank&&row.from>0);
assert.equal(course.gripKindAt((patch.s0+patch.s1)/2,(patch.from+patch.to)/2),'deep-snow');
assert.equal(dry.gripKindAt(200,9),'asphalt');
assert.equal(SURFACES['deep-snow'].topSpeedMph,45);
assert.ok(gripFor('deep-snow','winter').grip>gripFor('deep-snow','summer').grip);
// Physics owns the verge surface and decelerates a genuine input-driven car.
COURSE.push(def);
try{
  const duel=new Duel({seed:1989});duel.startCampaign({startStage:COURSE.length-1,
    car:'falcone_f42',mode:'timetrial',difficulty:'casual',tyre:'winter'});
  const lane=duel.course.features.surfacePatches.find(row=>row.snowBank&&row.from>0),state=duel.state;
  Object.assign(state,{s:40,lateral:(lane.from+lane.to)/2,status:'racing',speedMph:90,gear:2});
  duel.setInput({throttle:1,brake:0,steer:0,boost:false});
  for(let i=0;i<240;i++)duel._drive(1/120);
  assert.equal(duel.course.gripKindAt(state.s,state.lateral),'deep-snow');
  assert.ok(state.speedMph<=45.05,'real deep-snow driving settles at or below 45 mph');
  assert.ok(state.s>40,'the bank is a driving surface, not a visible-only overlay');
}finally{COURSE.pop();}
const before=JSON.stringify(course.features),placements=snowWorldPlacements(course);
const seededControl=new Course(def,1989);
assert.equal(course.rng.float(),seededControl.rng.float(),'presentation never consumes course RNG');
assert.ok(placements.length);assert.equal(JSON.stringify(course.features),before);
assert.deepEqual(placements,snowWorldPlacements(new Course(def,1989)),'separate seeded presentation repeats');
assert.ok(placements.every(Object.isFrozen));
for(const placement of placements.filter(row=>row.id==='plough-bank')){
  assert.ok(course.features.surfacePatches.includes(placement.physicalPatch));
  assert.ok(placement.s>=placement.physicalPatch.s0&&placement.s<=placement.physicalPatch.s1);
}
assert.equal(snowPineIds(course).size,placements.filter(row=>row.id==='snow-pine').length);
assert.deepEqual(snowWorldPlacements(dry),[]);
const geom=new THREE.BufferGeometry();
const a=course.groundAt(200,20),b=course.groundAt(1100,20);
geom.setAttribute('position',new THREE.Float32BufferAttribute([a.x,a.y,a.z,b.x,b.y,b.z],3));
applySnowTerrain(geom,course);
assert.equal(geom.attributes.winterWeight.getX(0),1);assert.equal(geom.attributes.winterWeight.getX(1),0);
const tree=course.features.trees.find(row=>snowPineIds(course).has(row.id));assert.ok(tree);
const upright=snowSceneryPose(tree,[],0),fallen=snowSceneryPose(tree,[{kind:'tree',id:tree.id,
  atTime:0,directionX:1,directionZ:0,outcome:'knock'}],1);
assert.notDeepEqual(upright.elements,fallen.elements);
assert.deepEqual(snowSceneryPose(tree,[],1).elements,upright.elements,'reset restores upright kit');
assert.equal(new THREE.Vector3().setFromMatrixScale(snowSceneryPose(tree,[{kind:'tree',id:tree.id,
  atTime:0,directionX:1,directionZ:0,outcome:'obliterate'}],100)).length(),0);
for(const high of [true,false]){
  const owner={placements,getPlacementPose:()=>new THREE.Matrix4(),setPlacementPose(){}};
  const snow=createSnowWorld(course,{kits:owner,high}),state={status:'racing',stageTimeSec:0,s:200,brokenScenery:[],opponents:[]};
  const witness=JSON.stringify(state),camera=new THREE.PerspectiveCamera();camera.position.set(a.x,a.y+3,a.z);
  for(let n=0;n<200;n++)snow.update({state,camera,dt:1/60,high,vehicles:[]});
  assert.equal(JSON.stringify(state),witness,'weather reads native state only');
  const mesh=new THREE.Group();mesh.userData.grounding={wheels:[
    {x:-1,z:-1.4,contactY:0},{x:1,z:-1.4,contactY:0}],contactY:0};
  const actor={s:200,speedMph:30,airHeight:0};
  for(let n=0;n<1200;n++){
    const s=100+(n%300)*.8,p=course.groundAt(s,0);mesh.position.set(p.x,p.y,p.z);mesh.rotation.y=p.heading;
    const frame={...state,s,stageTimeSec:n/60};snow.update({state:frame,camera,dt:1/60,high,vehicles:[{state:actor,mesh}]});
  }
  assert.ok(snow.stats.liveMarks>0,'observed rear wheels leave genuine snow contact tracks');
  assert.ok(snow.stats.liveMarks<=(high?SNOW_LIMITS.high.marks:SNOW_LIMITS.performance.marks));
  for(let n=0;n<100;n++)snow.update({state:{...state,stageTimeSec:25},camera,dt:.1,high,vehicles:[]});
  assert.equal(snow.stats.liveMarks,0,'tracks expire without unbounded scene growth');
  assert.equal(snow.stats.flakes,high?SNOW_LIMITS.high.flakes:SNOW_LIMITS.performance.flakes);
  assert.ok(snow.stats.liveMarks<=(high?SNOW_LIMITS.high.marks:SNOW_LIMITS.performance.marks));
  snow.dispose();snow.dispose();assert.equal(snow.group.children.length,0);
  snow.update({state,camera,dt:1,high,vehicles:[]});assert.equal(snow.group.children.length,0);
}
const malformedRidge=new Course({...def,snowWorld:{...def.snowWorld,exposed:{from:0,to:50}}},1989);
assert.throws(()=>createSnowWorld(malformedRidge),/Exposed ridges/,'invalid ridge metadata fails clearly');
const crossingPond=new Course({...def,snowWorld:{...def.snowWorld,ponds:[{s:748,lateral:32,radiusX:9,radiusZ:5}]}},1989);
assert.throws(()=>createSnowWorld(crossingPond),/frozen pond/i,'the full pond stays inside winter ranges');
const material=new THREE.MeshStandardMaterial();
material.onBeforeCompile=shader=>{shader.uniforms.prior={value:42};};
material.customProgramCacheKey=()=> 'prior-terrain';
const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
winterTerrainMaterial(material).onBeforeCompile(shader);
assert.equal(shader.uniforms.prior.value,42,'snow composes the real terrain shader');
assert.ok(shader.vertexShader.includes('vWinterWeight=winterWeight'));
assert.ok(shader.fragmentShader.includes('clamp(vWinterWeight,0.0,1.0)'));
assert.equal(material.customProgramCacheKey(),'prior-terrain-winter-v1');
material.dispose();geom.dispose();
console.log('Snow ranges, physics bands, kit identity, terrain, poses and bounded read-only lifetime pass.');
