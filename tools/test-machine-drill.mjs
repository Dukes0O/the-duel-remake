import assert from 'node:assert/strict';
import {createDrillState, createDrillRigState, DRILL_FEED_RATES_MPS, drillMaterialAt, drillSite, drillYardControls, stepDrill, stepDrillRig} from '../src/machines/drill.js';
import {createTown, deserializeTown, dispatchTownCommand, serializeTown, stepTown} from '../src/town/index.js';
import {groundWaterFieldAt} from '../src/town/town-ground.js';
import * as THREE from 'three';
import {createDrillSounds, createYardWellheadView, createDrillCuttingsView} from '../src/machines/drill-view.js';

const site=drillSite(4312,4,7);
assert.deepEqual(site,drillSite(4312,4,7));
assert.notEqual(site.depth,drillSite(4312,5,7).depth);
assert.equal(site.depth,groundWaterFieldAt(4312,4,7).depth);
assert.ok(site.depth>=4 && site.depth<=22);
assert.equal(drillMaterialAt(site,0),'clay');
assert.equal(drillMaterialAt(site,site.clayEnd),'gravel');
assert.equal(drillMaterialAt(site,site.gravelEnd),'rock');
assert.equal(drillMaterialAt(site,site.depth),'wet');
let state=createDrillState(4312,4,7);
assert.equal(stepDrill(state,{feed:1},10).state.depth,0);
state={...state,depth:site.gravelEnd};
let result=stepDrill(state,{mastDown:true,feed:1},1);
assert.equal(result.state.jammed,true);
result=stepDrill(result.state,{mastDown:true,feed:-1},1);
assert.equal(result.state.jammed,false);
result=stepDrill(result.state,{mastDown:true,feed:0.5},1000);
assert.equal(result.state.struckWater,true);
assert.equal(result.state.depth,site.depth);
function drillFromStart(x,z) {
  let hole=createDrillState(4312,x,z);
  const layers=[];
  while (!hole.struckWater) {
    const material=drillMaterialAt(hole.site,hole.depth);
    if (layers.at(-1)!==material) layers.push(material);
    hole=stepDrill(hole,{mastDown:true,feed:0.5},1).state;
  }
  layers.push(drillMaterialAt(hole.site,hole.depth));
  const drilledTown=createTown(4312,'Repeat Town');
  assert.equal(dispatchTownCommand(drilledTown,{type:'drillWell',x,z}).ok,true);
  return {layers,depth:hole.depth,well:drilledTown.regions.scablands.groundWater.wells[`${x}:${z}`]};
}
const firstHole=drillFromStart(4,7);
assert.deepEqual(firstHole,drillFromStart(4,7),'Drilling the same place repeats the whole result.');
assert.deepEqual(firstHole.layers,['clay','gravel','rock','wet']);
assert.notEqual(firstHole.depth,drillFromStart(5,7).depth,'A second place has a different water depth.');
assert.notDeepEqual(firstHole.well,drillFromStart(5,7).well);
const workingTown=createTown(4312,'Working Pit');
assert.equal(dispatchTownCommand(workingTown,{type:'digTestPit',x:4,z:7}).ok,true);
const workingPit=structuredClone(workingTown.regions.scablands.groundWater.pits['4:7']);
assert.equal(dispatchTownCommand(workingTown,{type:'drillWell',x:4,z:7}).ok,true);
assert.deepEqual(workingTown.regions.scablands.groundWater.pits['4:7'],workingPit,'Drilling preserves a working pit and its start time.');

const town=createTown(4312,'Drill Town');
assert.equal(dispatchTownCommand(town,{type:'drillWell',x:4,z:7}).ok,true);
const well=town.regions.scablands.groundWater.wells['4:7'];
assert.deepEqual(well,{x:4,z:7,...groundWaterFieldAt(4312,4,7),waterLitres:site.yieldLitresPerDay,drawdownLitres:0,drilled:true});
assert.equal(dispatchTownCommand(town,{type:'drillWell',x:4,z:7}).ok,false);
assert.deepEqual(deserializeTown(serializeTown(town)).regions.scablands.groundWater.wells['4:7'],well);
const loadedDrilled=deserializeTown(serializeTown(town));
assert.equal(dispatchTownCommand(loadedDrilled,{type:'drawWellWater',x:4,z:7,litres:well.waterLitres}).ok,true);
for(let i=0;i<24;i++) stepTown(loadedDrilled);
assert.equal(loadedDrilled.regions.scablands.groundWater.wells['4:7'].drilled,true);
assert.ok(loadedDrilled.regions.scablands.groundWater.wells['4:7'].waterLitres>0,'A saved drilled well still gives water.');
const oldData={version:1,id:'town-4312',name:'Old Town',seed:4312,rngState:4312,tick:0,
  founders:[],people:[],buildings:[],nextBuildingNumber:1,homePlots:[],campPlaces:12,
  regions:{scablands:{chunks:{},groundWater:{droughtDays:0,
    pits:{'4:7':{x:4,z:7,state:'found',startedAt:0,finishedAt:72,depth:10,yieldLitresPerDay:100}},
    wells:{'4:7':{x:4,z:7,depth:10,yieldLitresPerDay:100,waterLitres:200,drawdownLitres:0}}}}}};
const old=deserializeTown(oldData);
const oldGround=structuredClone(old.regions.scablands.groundWater);
assert.deepEqual(oldGround,oldData.regions.scablands.groundWater,'The old ground data loads unchanged.');
for(let i=0;i<24;i++) stepTown(old);
assert.deepEqual(old.regions.scablands.groundWater.pits,oldGround.pits);
assert.deepEqual(old.regions.scablands.groundWater.wells,oldGround.wells);
assert.ok(Object.values(old.regions.scablands.groundWater.wells).every(item=>!item.drilled));
let rig=createDrillRigState(4312,{x:4,z:7});
rig=stepDrillRig(rig,{forward:1},1).state;
assert.ok(rig.machine.z>7, 'The rig can drive.');
rig=stepDrillRig(rig,{mastDown:true,feed:0.5},0.01).state;
assert.equal(rig.hole,null, 'The rig must stop before it can drill.');
rig=stepDrillRig(rig,{mastDown:true,feed:0.5},1).state;
assert.ok(rig.hole.depth>0, 'The lowered mast can feed the bit.');
rig={...rig,hole:{...rig.hole,depth:rig.hole.site.depth-0.001}};
rig=stepDrillRig(rig,{mastDown:true,feed:0.5},1).state;
assert.equal(rig.wellheads.length,1, 'Striking water leaves a wellhead for the visit.');
assert.deepEqual(createDrillRigState(4312).wellheads,[], 'A new visit starts without yard wellheads.');
const scene=new THREE.Group();
const wellheadView=createYardWellheadView(scene,()=>3);
wellheadView.update(rig.wellheads);
wellheadView.update(rig.wellheads);
assert.equal(scene.children[0].children.length,1, 'A completed well is drawn once.');
assert.equal(scene.children[0].children[0].position.y,3, 'The well sits on the ground.');
wellheadView.dispose();
assert.equal(scene.children.length,0, 'Leaving the yard removes its wellheads.');
const cuttingsView=createDrillCuttingsView(scene,()=>3);
let hole={...createDrillState(4312,4,7),depth:1};
cuttingsView.update(hole);
const heap=scene.getObjectByName('cuttings-4:7');
assert.ok(heap, 'Drilling leaves cuttings beside the hole.');
assert.equal(heap.position.y,3);
const small=heap.scale.x, clay=heap.material.color.getHex();
hole={...hole,depth:hole.site.clayEnd+0.01};
cuttingsView.update(hole);
assert.ok(heap.scale.x>small, 'The heap grows with depth.');
assert.notEqual(heap.material.color.getHex(),clay, 'The heap changes with the layer.');
hole={...hole,depth:hole.site.depth,struckWater:true};
cuttingsView.update(hole);
assert.equal(heap.material.color.getHex(),0x302c27, 'Wet cuttings are dark.');
assert.ok(heap.material.roughness<1, 'Wet cuttings have a damp surface.');
cuttingsView.dispose();
assert.equal(scene.children.length,0, 'Leaving the yard removes its cuttings.');
// MACHINE-YARD-NEXT: a 13 m well is about a minute at the steady feed (Space alone), not two and a half.
{
  const steady = drillYardControls({Space:true}, 'work');
  const wells = [];
  for (let x = -40; x <= 60; x += 3) for (let z = -20; z <= 40; z += 3) {
    const site = drillSite(1, x, z);
    if (Math.abs(site.depth - 13) < 0.6) wells.push(site);
  }
  assert.ok(wells.length >= 20, 'The yard ground has 13 m wells to time.');
  for (const site of wells) {
    let hole = {...createDrillState(1, site.x, site.z)}, seconds = 0;
    const order = [], kinds = new Set();
    while (!hole.struckWater && seconds < 600) {
      const result = stepDrill(hole, steady, 1 / 60);
      for (const event of result.events) kinds.add(event.type);
      const material = drillMaterialAt(hole.site, hole.depth);
      if (order.at(-1) !== material) order.push(material);
      hole = result.state; seconds += 1 / 60;
    }
    assert.deepEqual(order, ['clay', 'gravel', 'rock'], 'The layers come in the same order.');
    assert.ok(seconds >= 45 && seconds <= 75, `A ${site.depth} m well took ${seconds.toFixed(1)} s at the steady feed.`);
    assert.ok(!kinds.has('drill-jammed') && kinds.has('water-struck'), 'The steady feed never jams and reaches water.');
  }
  // The rock is still the slow, tense part: a hard feed there jams the bit at once.
  assert.ok(DRILL_FEED_RATES_MPS.clay > DRILL_FEED_RATES_MPS.gravel && DRILL_FEED_RATES_MPS.gravel > DRILL_FEED_RATES_MPS.rock);
  const inRock = {...createDrillState(1, wells[0].x, wells[0].z), depth:wells[0].gravelEnd + 0.1};
  assert.equal(stepDrill(inRock, drillYardControls({Space:true, KeyW:true}, 'work'), 1 / 60).events[0].type, 'drill-jammed');
  assert.equal(stepDrill({...inRock, depth:0.1}, drillYardControls({Space:true, KeyW:true}, 'work'), 1 / 60).state.jammed, false,
    'A hard feed is safe in clay.');
}
console.log('Drill: repeatable layers and water, jam recovery and town well save passed.');

assert.deepEqual(drillYardControls({KeyW:true},'drive'),{forward:1,steer:0,mastDown:false,feed:0});
assert.deepEqual(drillYardControls({Space:true},'work'),{mastDown:true,feed:0.5});
assert.equal(drillYardControls({Space:true,KeyW:true},'work').feed,1);
assert.equal(drillYardControls({KeyS:true},'work').feed,-1);

const tones=[];
const audioParam={setValueAtTime(){},exponentialRampToValueAtTime(){}};
const audio={master:{},context:{state:'running',currentTime:1,
  createOscillator(){const oscillator={frequency:audioParam,connect(){},disconnect(){},start(){tones.push(this.type);},stop(){}};return oscillator;},
  createGain(){return {gain:audioParam,connect(){},disconnect(){}};}}};
const sounds=createDrillSounds(audio);
for(const cue of ['drill-engine','drill-feed','drill-clay','drill-gravel','drill-rock','drill-jam','drill-reverse','drill-water'])sounds.play(cue);
assert.equal(tones.length,8,'Each drill event has an audible sound.');
sounds.play('drill-clay');
assert.equal(tones.length,8,'Repeated ground sounds are limited.');
audio.muted=true; audio.context.currentTime=2; sounds.play('drill-water');
assert.equal(tones.length,8,'The drill respects mute.');
sounds.dispose();
