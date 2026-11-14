import assert from 'node:assert/strict';
import {RouteMap, worldJobMapData} from '../src/route-map.js';
import {createHudScreen} from '../src/screen-hud.js';
import {Duel} from '../src/game.js';
import {gasRunJob} from '../src/world/jobs/gas-run.js';
import {createJob} from '../src/world/jobs/job-engine.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }
const course = {worldAt: (s, lateral) => ({x: s, z: lateral})};
const definition = gasRunJob({road: 'boneyard'});
const worldJob = {definition, job: createJob(definition), actors: []};
const state = {s: 10, lateral: 20, arena: {mode: 'world-job', worldJob}};
const data = () => worldJobMapData(course, state);
const before = JSON.stringify(state);
data();
check(JSON.stringify(state) === before, 'map data does not change job state');
const marks = kind => data().marks.filter(mark => mark.kind === kind);
check(JSON.stringify(data().path) === JSON.stringify(worldJob.job.steps[0].path.map(p => p.position)), 'road is the current step path');
check(data().destination.name === 'TIN TOWN', 'destination named');
check(data().jobName === 'GAS RUN' && data().roadName === 'BONEYARD ROAD', 'headings');
check(marks('player').length === 1, 'player present');
const cachedPath = data().path;
check(data().path === cachedPath, 'step path is reused');
check(data().start.name === 'EVERBURN', 'start place is named');
state.onFoot = true; state.fighter = {x: 77, z: 88};
check(marks('player')[0].position === state.fighter, 'on-foot player uses fighter position');
state.onFoot = false;
for (const kind of ['escort', 'hunter', 'rider']) check(marks(kind).length === 0, `${kind} absent`);
worldJob.actors.push({id: 'big-bess', position: {x: 2, z: 3}}, {id: 'old-smoke-furnace', furnace: {}, position: {x: 4, z: 5}},
  {id: 'ambush:1:0', ambushKey: 'ambush:1', x: 6, z: 7}, {id: 'ambush:1:1', ambushKey: 'ambush:1', x: 8, z: 9});
check(marks('escort').length === 1, 'escort present');
check(marks('hunter').length === 1, 'hunter present');
check(marks('rider').length === 2, 'each rider present');
worldJob.actors.splice(0);
for (const kind of ['escort', 'hunter', 'rider']) check(marks(kind).length === 0, `${kind} removed`);
worldJob.job.steps[0].path = undefined;
check(data() !== null && data().margin === 120, 'job without path keeps a local map');

const place = (id,x,z) => ({id,position:{x,y:0,z}});
function mapFor(step) {
  const definition={name:'Test job',steps:[step]}, job=createJob(definition);
  return worldJobMapData(course,{s:10,lateral:20,arena:{mode:'world-job',worldJob:{definition,job,actors:[]}}});
}
const a=place('start',0,0), b=place('middle',20,30), c=place('end',90,100);
const byPath=mapFor({kind:'carry',path:[a,b],origin:a,safePoints:[b],destination:c});
check(byPath.path.length === 2 && byPath.path[1].x === 20 && byPath.destination.name === 'MIDDLE', 'rule 1 takes and names the end of the path');
const byCarry=mapFor({kind:'carry',origin:a,safePoints:[b],destination:c,returnPath:[c,a]});
check(byCarry.path.map(point=>point.x).join(',') === '0,20,90', 'rule 2 joins origin, safe points and destination');
const byReturn=mapFor({kind:'heist',returnPath:[c,b,a],zone:b});
check(byReturn.path.map(point=>point.x).join(',') === '90,20,0', 'rule 3 uses the return path');
const byPlaces=mapFor({kind:'heist',place:a,places:[b],zone:c,carPlace:place('car',40,50),escapePlace:place('escape',60,70)});
check(byPlaces.margin >= 120 && byPlaces.places.map(p=>p.name).join(',') === 'START,MIDDLE,END,CAR,ESCAPE', 'rule 4 fits and names every place with a 120 m margin');
check(byPlaces.destination.name === 'START', 'the main place is named as the destination');
for (const definition of EVERBURN_JOBS) {
  const job=createJob(definition), jobState={s:0,lateral:0,arena:{mode:'world-job',worldJob:{definition,job,actors:[]}}};
  const map=worldJobMapData(course,jobState);
  check(map && map.path.length >= 1 && map.path.every(point=>Number.isFinite(point.x)&&Number.isFinite(point.z)) && map.roadName === 'THE SCABLANDS', `Everburn job ${definition.number} has ground`);
}
const defend = EVERBURN_JOBS[5], defender={x:-430,z:300}, defenceJob=createJob(defend);
const defenceState={s:0,lateral:0,arena:{mode:'world-job',worldJob:{definition:defend,job:defenceJob,actors:[defender],waveZones:{'0:0':{raiders:[defender]}}}}};
check(worldJobMapData(course,defenceState).marks.some(mark=>mark.kind==='rider'&&mark.position.x===-430), 'positioned defence raider has a mark');
defenceJob.stepIndex=defenceJob.steps.length;
check(worldJobMapData(course,defenceState)?.destination.name === 'CURRENT POSITION', 'finished job with raiders keeps a safe local map');


// Draw the real place-only map: every named place is labelled and no fake road is stroked.
globalThis.Path2D = class {moveTo(){} lineTo(){}};
const labels=[], strokes=[];
const context=new Proxy({measureText:text=>({width:String(text).length*6}), fillText:text=>labels.push(text), stroke:()=>strokes.push(true)},
  {get:(target,key)=>target[key] ?? (()=>{}),set:(target,key,value)=>(target[key]=value,true)});
const canvas={width:400,height:280,getContext:()=>context,setAttribute(){}};
const visualJob={name:'Places',steps:[{kind:'heist',place:a,places:[b],zone:c}]};
const visualState={s:0,lateral:0,arena:{mode:'world-job',worldJob:{definition:visualJob,job:createJob(visualJob),actors:[]}}};
new RouteMap(canvas).update({...course,samples:[{}]},visualState,0);
check(['START','MIDDLE','END'].every(label=>labels.includes(label)), 'place-only drawing labels each place');
check(strokes.length === 1, 'place-only drawing has no fake connecting road'); // only the player dot outline

const duel=new Duel({seed:1,featureFlags:{'hidden-road':true,arsenal:true}});
duel.state.wastelandGateDiscovered=true;
check(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:1,opponents:[],job:EVERBURN_JOBS[5]}), 'defence HUD starts a real job');
const heading={textContent:'CIRCUIT / LIVE'},positionPanel={hidden:false};
const node=()=>({hidden:false,textContent:'',dataset:{},style:{},firstChild:{textContent:''},lastChild:{textContent:''},classList:{toggle(){}},setAttribute(){}});
// The notice-board jobs: a rescue's people and home and an exploration's finds are drawn as the job's own places (go-live round); Hot Soup has a road.
{
  const sides = Object.fromEntries(EVERBURN_SIDE_JOBS.map(job => [job.id, mapFor(job.steps[0])]));
  const rescue = sides['everburn-lost-prospector'], explore = sides['everburn-survey-flags'], soup = sides['everburn-hot-soup'];
  check(rescue.places.map(item => item.name).join('|') === 'PROSPECTOR 1|PROSPECTOR 2|TIN TOWN' && rescue.destination.name === 'TIN TOWN', 'a rescue shows its two people and Tin Town');
  check(explore.places.length === 5 && explore.places[0].name === 'SURVEY FLAG 1', 'an exploration shows its five finds');
  check(soup.path.length === 5 && soup.start.name === 'AUNTIE KITCHEN' && soup.destination.name === 'EVERBURN', 'Hot Soup has a road from the kitchen by three safe points to the Everburn well');
  check(![rescue, explore, soup].some(item => item.start.name === 'CURRENT POSITION' || item.destination.name === 'CURRENT POSITION'), 'none of the three falls back to CURRENT POSITION');
}
const ui=new Proxy({}, {get:(target,key)=>target[key] ??= node()});
ui['race-position'].closest=()=>positionPanel;
ui['route-section'].closest=()=>({querySelector:()=>heading});
const app={duel,player:{name:'Test'},cameraMode:'chase'};
const update=createHudScreen({app,ui,text:(id,value)=>{ui[id].textContent=String(value);},time:String,credits:String,clamp:value=>Math.max(0,Math.min(1,value)),routeMap:{update(){}}});
update(duel.state);
check(heading.textContent === 'THE EVERBURN' && ui['route-section'].textContent === 'THE SCABLANDS', 'defence HUD names the job and region');
check(ui['route-lap'].textContent === '' && positionPanel.hidden, 'defence HUD hides arena and placing');

check(worldJobMapData(course, {s: 0, arena: null}) === null, 'race uses ordinary map');
check(worldJobMapData(course, {s: 0, arena: {mode: 'fuel-run', worldJob}}) === null, 'Scrapdome uses ordinary map');
console.log(`scablands job map: ${checks} checks passed`);
