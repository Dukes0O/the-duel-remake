import assert from 'node:assert/strict';
import {createJob,stepJob} from '../src/world/jobs/job-engine.js';
import {stepBoard} from '../src/world/jobs/steps/board.js';
import {stepDrivetrain} from '../src/world/jobs/steps/drivetrain.js';
import {ironLineLength,sampleIronLine,IRON_LINE,IRON_LOOP_ARCS,IRON_RAIL_GATE_SPUR} from '../src/world/iron-line.js';
import {initializeWorldJob,cleanupWorldJobLoan,createWorldJob} from '../src/arena/modes/world-job.js';

const p=(id,x,z=0)=>({id,position:{x,y:0,z},radius:3});
const path=[p('start',0),p('bend',100,0),p('end',500,0)];
const gate=p('gate',300);
const tick=(step,state,controls,dt=1/120)=>stepDrivetrain(step,state,{controls},dt);
const gateStep={kind:'drivetrain',path,tractiveKn:80,brakeKn:100,massTonnes:100,maxSpeed:26,gate:{place:gate,speed:20}};

assert(IRON_LINE.length>10&&IRON_LOOP_ARCS.north.length===3&&IRON_LOOP_ARCS.south.length===3&&IRON_RAIL_GATE_SPUR.length===3);
const curved=sampleIronLine(path,ironLineLength(path)/2);
assert(Number.isFinite(curved.x)&&Number.isFinite(curved.heading));

let state={}; let broken=false;
for(let i=0;i<6000&&!broken;i++){const result=tick(gateStep,state,{throttle:1});state=result.state;broken=result.events.some(event=>event.type==='gateBroken');}
assert.equal(broken,true,'full throttle clears gate from a standing start');

state={metres:299,speed:1}; let bounced=false;
for(let i=0;i<6000&&!bounced;i++){const result=tick(gateStep,state,{throttle:1});state=result.state;bounced=result.events.some(event=>event.type==='gateBounced');}
assert.equal(bounced,true,'a slow gate approach bounces without failing the step');
for(let i=0;i<4000;i++){const result=tick(gateStep,state,{throttle:1});state=result.state;if(result.events.some(event=>event.type==='gateBroken'))break;}
assert(state.metres>nearest(gateStep.path,gate).metres,'driver can accelerate and try the gate again');

const board={kind:'board',path,speed:0,roofWalk:['wagon-2','wagon-1'],actor:{id:'iron-mule'}};
let fallen=stepBoard(board,{stage:'roof',index:1},{onFoot:true,fighter:{position:{x:100,y:0,z:100}},train:{id:'iron-mule',position:{x:0,y:0,z:0},roofPlates:[]}},1);
assert.equal(fallen.state.index,1,'falling off preserves the last reached plate');

const bufferStep={kind:'drivetrain',path:[p('a',0),p('b',500)],massTonnes:180,tractiveKn:80,brakeKn:100,maxSpeed:18};
state={metres:0,speed:18};
let distance=0;
for(let i=0;i<4800&&state.speed>0.01;i++){
  const before=state.metres??0;const result=tick(bufferStep,state,{brake:1});state=result.state;distance+=Math.max(0,(state.metres??0)-before);
}
assert(Math.abs(18*18/(2*(100/180))-distance)<3,'full train stopping distance is about 295 m');
const buffer={...bufferStep,stopAtEnd:true,path:[p('a',0),p('b',40)]};
state={};
let atBuffer=false;
for(let i=0;i<4000&&!atBuffer;i++){const result=tick(buffer,state,{throttle:1});state=result.state;atBuffer=state.metres>=ironLineLength(buffer.path)-.01;}
assert(state.speed<=1.5,'the train reaches its buffers at walking pace');
for(let i=0;i<1000&&state.speed>.05;i++) state=tick(buffer,state,{brake:1}).state;
assert.equal(tick(buffer,state,{brake:1}).complete,true,'the train stops at its buffers and waits for the next story beat');

const guardStep={...board,roofGuards:1,easyRoofGuards:0};
const guarded=stepBoard(guardStep,{stage:'roof',index:0,trainMetres:0},{onFoot:true,difficulty:'medium',fighter:{position:{x:0,y:0,z:0}},train:{id:'iron-mule',position:{x:0,y:0,z:0},roofPlates:[{id:'wagon-2',position:{x:0,y:0,z:0}}]}},1/60);
assert.equal(guarded.state.stage,'ground','a guard can push the player down without hurting or failing the step');
const easyGuard=stepBoard(guardStep,{stage:'roof',index:0,trainMetres:0},{onFoot:true,difficulty:'easy',fighter:{position:{x:0,y:0,z:0}},train:{id:'iron-mule',position:{x:0,y:0,z:0},roofPlates:[{id:'wagon-2',position:{x:0,y:0,z:0}}]}},1/60);
assert.equal(easyGuard.state.index,1,'Easy omits roof guards');

const def={id:'loan-test',steps:[{kind:'reach',place:p('finish',0),lentCrew:'jax'}]};
const profile={crewId:'owned-crew',weaponLoadout:['owned-weapon']};
const duel={seed:9,course:{},state:{arena:{mode:'world-job',worldJob:createWorldJob(def)},weaponLoadout:[...profile.weaponLoadout],crewId:profile.crewId}};
initializeWorldJob(duel,def);
assert.equal(duel.state.crewId,'jax','the step receives its temporary crew loan');
cleanupWorldJobLoan(duel);
assert.equal(duel.state.crewId,'owned-crew','the loan restores the player crew before settlement');
assert.deepEqual(profile,{crewId:'owned-crew',weaponLoadout:['owned-weapon']},'temporary loans do not mutate profile save data');

const deterministic={id:'seeded',steps:[gateStep]};
const run=()=>{let job=createJob(deterministic,41),view={controls:{throttle:1}};for(let i=0;i<120;i++)job=stepJob(job,view,1/60);return job;};
assert.deepEqual(run(),run(),'the same seed and controls produce the same train state');
let captionJob=createJob({id:'captions',steps:[{kind:'drivetrain',path,opening:['one','two'],maxSpeed:10}]});
captionJob=stepJob(captionJob,{controls:{throttle:1}},1/60);
assert.equal(captionJob.stepState.metres,undefined,'opening captions hold the step before train motion');
assert.equal(captionJob.requests[0].lineId,'one');
captionJob=stepJob(captionJob,{controls:{throttle:1,whistle:true}},1/60);
assert.equal(captionJob.requests[0].lineId,'two','Space advances the caption sequence');
let sequence=createJob({id:'line-sequence',steps:[{kind:'reach',startLineId:'start',afterStartLineId:'next',opening:['open'],place:p('far',500)}]});
sequence=stepJob(sequence,{player:{position:{x:0,y:0,z:0}}},1/60);
assert.equal(sequence.requests[0].lineId,'start');
sequence=stepJob(sequence,{controls:{whistle:true},player:{position:{x:0,y:0,z:0}}},1/60);
assert.equal(sequence.requests[0].lineId,'next');
sequence=stepJob(sequence,{controls:{whistle:true},player:{position:{x:0,y:0,z:0}}},1/60);
assert.equal(sequence.requests[0].lineId,'open');
console.log('test-iron-line: PASS');

function nearest(route,target){let best=Infinity,metres=0,walked=0;for(let i=1;i<route.length;i++){const a=route[i-1].position,b=route[i].position,len=Math.hypot(b.x-a.x,b.z-a.z),t=Math.max(0,Math.min(1,(target.position.x-a.x)/(len||1)));const gap=Math.hypot(target.position.x-a.x-(b.x-a.x)*t,target.position.z-a.z-(b.z-a.z)*t);if(gap<best){best=gap;metres=walked+len*t;}walked+=len;}return {metres};}
