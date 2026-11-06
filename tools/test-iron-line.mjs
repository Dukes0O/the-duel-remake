import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {stepArenaEvent} from '../src/arena/arena-event.js';
import {createFighter} from '../src/onfoot.js';
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
const reboard=stepBoard(board,{stage:'ground',index:1},{onFoot:true,grapple:true,fighter:{position:{x:0,y:0,z:0}},train:{id:'iron-mule',position:{x:0,y:0,z:0},roofPlates:[{id:'wagon-2',position:{x:0,y:0,z:0}},{id:'wagon-1',position:{x:10,y:0,z:0},radius:1}]}},1/60);
assert.equal(reboard.state.stage,'roof');
assert.equal(reboard.state.index,1,'boarding after a fall resumes at the last reached plate');

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
for(const [id,progress,metres] of [['p1',.3,149],['p2',.4,199]]) {
  const pickup={...gateStep,crushOnTrack:[{id,progress}]},without={...pickup,crushOnTrack:[]};
  const before=tick(without,{metres,speed:10},{throttle:1},.1);
  const after=tick(pickup,{metres,speed:10},{throttle:1},.1);
  assert.equal(before.state.speed-after.state.speed,2,`${id} takes exactly 2 m/s`);
  assert.deepEqual(after.events.map(event=>event.id),[id]);
}
const captionRun=createJob({id:'caption-motion',steps:[{kind:'drivetrain',path,sayAt:[{progress:.00000001,lineId:'moving'}]}]});
const captionTick=stepJob(captionRun,{controls:{throttle:1}},1/60);
assert(captionTick.stepState.metres>0,'a train continues moving during sayAt captions');
assert(captionTick.requests.some(request=>request.lineId==='moving'));
const carryPath=createJob({id:'carry-caption',steps:[{kind:'carry',startLineId:'carry-start',origin:p('origin'),destination:p('destination',500),safePoints:[p('safe',0)]}]});
const carryTick=stepJob(carryPath,{player:{position:{x:0,y:0,z:0}}},1/60);
assert.equal(carryTick.stepState.safeIndex,1,'a carry step continues during its caption');
assert(carryTick.requests.some(request=>request.lineId==='carry-start'));
const pickupsStep={...gateStep,gate:{place:gate,speed:20},crushOnTrack:[{id:'p1',progress:.3},{id:'p2',progress:.4}]};
let pickupState={},pickupEvents=[];
for(let i=0;i<6000&&!pickupEvents.some(event=>event.type==='gateBounced');i++) {
  const result=tick(pickupsStep,pickupState,{throttle:1});pickupState=result.state;pickupEvents.push(...result.events);
}
assert.equal(pickupEvents.filter(event=>event.type==='pickupCrushed').length,2,'both track pickups crush before the gate');
assert.equal(pickupState.speed,0,'two pickups each take 2 m/s from the train');
assert.equal(pickupEvents.filter(event=>event.type==='gateBounced').length,1);
for(let i=0;i<6000&&!pickupEvents.some(event=>event.type==='gateBroken');i++) {
  const result=tick(pickupsStep,pickupState,{throttle:1});pickupState=result.state;pickupEvents.push(...result.events);
}
assert(pickupEvents.some(event=>event.type==='gateBroken'),'the train can retry after the bounce');
assert.equal(pickupEvents.filter(event=>event.type==='pickupCrushed').length,2,'a bounce and retry do not crush either pickup twice');
let captionJob=createJob({id:'captions',steps:[{kind:'drivetrain',path,opening:['one','two'],maxSpeed:10}]});
captionJob=stepJob(captionJob,{controls:{throttle:1}},1/60);
assert.equal(captionJob.stepState.metres,0,'opening captions create the train without moving it');
assert(captionJob.requests.some(request=>request.type==='train'),'the train actor is requested when opening captions begin');
assert.equal(captionJob.requests.find(request=>request.type==='say')?.lineId,'one');
captionJob=stepJob(captionJob,{controls:{throttle:1,whistle:true}},1/60);
assert.equal(captionJob.requests.find(request=>request.type==='say')?.lineId,'two','Space advances the caption sequence');
let sequence=createJob({id:'line-sequence',steps:[{kind:'reach',startLineId:'start',afterStartLineId:'next',opening:['open'],place:p('far',500)}]});
sequence=stepJob(sequence,{player:{position:{x:0,y:0,z:0}}},1/60);
assert.equal(sequence.requests.find(request=>request.type==='say')?.lineId,'start');
sequence=stepJob(sequence,{controls:{whistle:true},player:{position:{x:0,y:0,z:0}}},2.21);
assert.equal(sequence.requests.find(request=>request.type==='say')?.lineId,'next');
sequence=stepJob(sequence,{controls:{whistle:true},player:{position:{x:0,y:0,z:0}}},2.21);
assert.equal(sequence.requests.find(request=>request.type==='say')?.lineId,'open');

const DT=1/120,flags={'hidden-road':true,arsenal:true,'arsenal-wave3':true,'warlord-cards':true,'crew-gear':true};
const place=(id,x,z,y=0,radius=8)=>({id,position:{x,y,z},radius});
const halt=place('rail-halt',-600,0,0,16),northCut=place('rail-north-cut',-590,-130,1.6),
  damJunction=place('rail-dam-junction',-500,-245,-2.8),bedWest=place('rail-bed-west',-300,-335,.4),
  bedMid=place('rail-bed-mid',-120,-335,1.9),bridge=place('rail-bridge',300,-335,-1.5),
  eastCut=place('rail-east-cut',330,-200,-1.9),eastRun=place('rail-east-run',560,-120,1),
  tinSiding=place('rail-tin-town',650,-60,0,14),loopWest=place('rail-loop-west',-60,-325,1.7),
  loopSouth=place('rail-loop-south',0,-310,1.1),loopEast=place('rail-loop-east',40,-325,.8),
  loopNorth=place('rail-loop-north',0,-350,-2),railGate=place('dam-rail-gate',-445,-345,-3,10),
  fillingShed=place('dam-filling-shed',-462,-368,-3,10);
const route=(...places)=>places;
const coupling={kind:'board',path:route(bridge,eastCut,eastRun,tinSiding),speed:8,actor:{id:'iron-mule'},
  roofWalk:['tank-wagon-2','tank-wagon-1'],startLineId:'story.iron.4.start',lentCrew:'jax',
  boardUnderKmh:90,coupling:'cab-coupling',plantSeconds:1,roofGuards:1,easyRoofGuards:0,
  clearDistance:15,roofLineId:'story.iron.4.nell',walkLineId:'story.iron.4.walk',
  guardLineId:'story.iron.4.guard',fallLineId:'story.iron.4.fall',plantedLineId:'story.iron.4.planted',
  wonLineId:'story.iron.4.won'};
const train={empty:{massTonnes:100,tractiveKn:80,brakeKn:100},full:{massTonnes:180,tractiveKn:80,brakeKn:100}};
const onTime=[
  {kind:'drivetrain',path:route(halt,northCut,damJunction,bedWest,bedMid,loopWest,loopSouth,loopEast),
    ...train.empty,maxSpeed:26,opening:['story.iron.6.aboard','story.iron.6.token','story.iron.6.controls'],
    sayAt:[{progress:.05,lineId:'story.iron.6.loop'},{progress:.9,lineId:'story.iron.6.imre'}]},
  {kind:'drivetrain',path:route(loopEast,loopNorth,loopWest,bedMid,bedWest,railGate),...train.empty,maxSpeed:26,
    gate:{place:railGate,speed:20,easySpeed:14,tooSlowLineId:'story.iron.6.slow',throughLineId:'story.iron.6.through'},
    crushOnTrack:[{id:'clean-pickup-1',progress:.55},{id:'clean-pickup-2',progress:.7}],
    startLineId:'story.iron.6.flat',sayAt:[{progress:.48,lineId:'story.iron.6.trucks'},
      {progress:.52,lineId:'story.iron.6.keepgoing'}]},
  {kind:'drivetrain',path:route(fillingShed,railGate,bedWest,damJunction,northCut,halt),...train.full,
    maxSpeed:18,stopAtEnd:true,brakeBoardMetres:320,startLineId:'story.iron.6.home',
    opening:['story.iron.6.tanks','story.iron.6.wet','story.iron.6.salt','story.iron.6.lick',
      'story.iron.6.hollis','story.iron.6.hollis2'],wonLineId:'story.iron.6.won',closing:['story.iron.6.jax']},
];
const combined={id:'iron-mule-integration',seed:731,steps:[coupling,...onTime]};
function stepReal(duel,controls={}) {
  const input=duel.state.input;
  input.throttle=controls.throttle??0;input.brake=controls.brake??0;input.boost=controls.boost===true;
  input.interact=controls.interact===true;
  if(duel.state.onFoot&&duel.state.fighter) {
    duel.state.fighterInput={forward:false,back:false,left:false,right:false,turnLeft:false,turnRight:false,
      sprint:false,jump:false,fire:false,aim:false,lookX:0,lookY:0};
  }
  return stepArenaEvent(duel,DT);
}
function walkAt(duel,target,speed=2.5) {
  const fighter=duel.state.fighter,dx=target.x-fighter.x,dz=target.z-fighter.z,gap=Math.hypot(dx,dz);
  if(gap<=speed*DT)return true;
  fighter.x+=dx/gap*speed*DT;fighter.z+=dz/gap*speed*DT;
  return false;
}
function runStory(difficulty) {
  const duel=new Duel({seed:combined.seed,featureFlags:flags});duel.state.wastelandGateDiscovered=true;
  assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:combined.seed,
    cpuDifficulty:difficulty,opponents:[],weaponLoadout:['bomb','crossbow','star'],arsenalRank:9,job:combined}),true,'the actual Iron Mule job starts in Duel');
  for(let i=0;i<600&&duel.state.status!=='racing';i++)duel.step(DT);
  assert.equal(duel.state.status,'racing');
  const boardPath=coupling.path;
  for(let i=0;i<1400;i++)stepReal(duel);
  const trainAtBoard=duel.state.arena.worldJob.actors.find(item=>item.train);
  assert(trainAtBoard&&trainAtBoard.pathProgress>0.1,'the train exists before the player boards');
  duel.state.onFoot=true;
  duel.state.fighter={...createFighter(duel.course,duel.state),x:trainAtBoard.position.x,
    y:trainAtBoard.position.y,z:trainAtBoard.position.z,groundY:trainAtBoard.position.y};
  duel.state.footTransition.needsRelease=true;
  let job=duel.state.arena.worldJob,stepTicks=[0,0,0,0],gateEvents=[],pickupEvents=[],guardSeen=false,carriedWithTrain=false;
  for(let tick=0;tick<15000&&job.job.stepIndex===0;tick++) {
    job=duel.state.arena.worldJob;
    const board=job.job.steps[0],actor=job.actors.find(item=>item.train);
    const index=job.job.stepState.index??0,stage=job.job.stepState.stage??'ground';
    const trainBefore=actor?.position&&{...actor.position};
    let interact=false;
    if(stage==='ground'&&!actor)interact=true;
    else if(stage==='ground'&&actor) {
      const plate=actor.roofPlates?.[index]?.position;
      interact=Math.hypot(duel.state.fighter.x-actor.position.x,duel.state.fighter.z-actor.position.z)<10||
        !!plate&&Math.hypot(duel.state.fighter.x-plate.x,duel.state.fighter.z-plate.z)<10;
    }
    else if(stage==='roof'&&index<board.roofWalk.length) {
      const target=actor?.roofPlates?.[index]?.position;
      if(target)walkAt(duel,target);
    } else if(stage==='roof'&&index>=board.roofWalk.length) {
      const target=actor?.coupling;
      if(target) {
        const planted=job.job.stepState.hold??0;
        interact=Math.hypot(duel.state.fighter.x-target.x,duel.state.fighter.z-target.z)<=1;
        if(!interact)walkAt(duel,target);
        else if(planted<1)interact=true;
      }
    } else if(stage==='clear'&&actor) {
      const dx=duel.state.fighter.x-actor.position.x,dz=duel.state.fighter.z-actor.position.z;
      const gap=Math.hypot(dx,dz),target={x:actor.position.x+(dx/(gap||1))*20,z:actor.position.z+(dz/(gap||1))*20};
      walkAt(duel,target,3);
    }
    const riderBeforeStep={x:duel.state.fighter.x,y:duel.state.fighter.y,z:duel.state.fighter.z};
    stepReal(duel,{interact});job=duel.state.arena.worldJob;stepTicks[0]++;
    if(difficulty==='easy'&&stage==='roof'&&tick>1&&!carriedWithTrain&&trainBefore) {
      const trainAfter=job.actors.find(item=>item.train).position;
      const dx=trainAfter.x-trainBefore.x,dz=trainAfter.z-trainBefore.z;
      const expected=Math.hypot(dx,dz);
      assert(expected>0,'the train is moving while the fighter rides');
      assert(duel.state.fighter.y>trainAfter.y,'the fighter is carried at roof height');
      assert(Math.hypot((duel.state.fighter.x-riderBeforeStep.x)-dx,
        (duel.state.fighter.z-riderBeforeStep.z)-dz)<.1,'the train carries the fighter each tick');
      carriedWithTrain=true;
    }
    guardSeen ||= job.job.stepState.guardPushed===true;
  }
  job=duel.state.arena.worldJob;
  assert.equal(job.job.stepIndex,1,`the driver completes Coupling at stage ${job.job.stepState.stage}`);
  assert.equal(guardSeen,difficulty==='hard','Hard includes the roof guard and Easy omits it');
  duel.state.onFoot=false;duel.state.fighter=null;duel.state.input.interact=false;
  let sawOpeningActor=false,openingStart=null;
  let homeBraking=false,homeStopped=false;
  for(let tick=0;tick<60000&&!job.job.done;tick++) {
    job=duel.state.arena.worldJob;
    const index=job.job.stepIndex,step=job.job.steps[index],state=job.job.stepState;
    const actor=job.actors.find(item=>item.train);
    if(index===1&&state.lineBlocking&&!sawOpeningActor) {
      sawOpeningActor=true;openingStart=step.path[0].position;
      assert(actor,'the train actor exists as the opening caption starts');
      assert.equal(actor.position.x,openingStart.x);assert.equal(actor.position.z,openingStart.z);
      assert.equal(actor.speed,0,'the actor waits at the path start during opening captions');
    }
    const controls={throttle:1,brake:0,boost:state.lineBlocking===true};
    if(index===3) {
      const remaining=ironLineLength(step.path)-(state.metres??0);
      if(remaining<=step.brakeBoardMetres)homeBraking=true;
      if(homeBraking&&!homeStopped) {
        controls.throttle=0;controls.brake=1;
        if(state.speed<=.05)homeStopped=true;
      } else if(homeStopped) {
        const stoppingDistance=(state.speed??0)**2/(2*(step.brakeKn/step.massTonnes));
        if(remaining>0.5&&stoppingDistance<remaining) {controls.throttle=1;controls.brake=0;}
        else {controls.throttle=0;controls.brake=1;}
      }
    }
    const before=index;stepReal(duel,controls);
    job=duel.state.arena.worldJob;
    if(before<4)stepTicks[before]++;
    for(const event of job.job.events??[]) {
      if(event.type==='gateBroken'||event.type==='gateBounced')gateEvents.push(event.type);
      if(event.type==='pickupCrushed')pickupEvents.push(event.id);
    }
  }
  job=duel.state.arena.worldJob;
  assert(sawOpeningActor,'the On Time opening is observed');
  assert.equal(job.job.done,true,`all three On Time steps reach their ends at step ${job.job.stepIndex}`);
  assert(stepTicks.slice(1).every(ticks=>ticks>0),'the three On Time steps run in sequence');
  assert(gateEvents.includes('gateBroken'),`${difficulty} clears the rail gate`);
  assert.deepEqual(pickupEvents.sort(),['clean-pickup-1','clean-pickup-2']);
  assert.equal(duel.state.arena.result?.reason,'job-complete');
  const finalTrain=job.actors.find(item=>item.train);
  assert(Math.hypot(finalTrain.position.x-halt.position.x,finalTrain.position.z-halt.position.z)<.01,
    'the train stops at the Halt');
  assert(finalTrain.speed<=.05);
  if(difficulty==='easy')assert(carriedWithTrain,'the real rider follows the train at roof height');
  return {stepTicks,gateEvents,pickupEvents,guardSeen,openingStart,final:job.job.done,callout:duel.state.callout,
    trainPosition:job.actors.find(item=>item.train)?.position};
}
const easyRun=runStory('easy'),easyRepeat=runStory('easy'),hardRun=runStory('hard');
assert.deepEqual(easyRun,easyRepeat,'two real Easy runs with the same seed and input match');
assert(hardRun.final,'the real Hard run reaches the Halt through the 20 m/s gate');
console.log('test-iron-line: PASS');

function nearest(route,target){let best=Infinity,metres=0,walked=0;for(let i=1;i<route.length;i++){const a=route[i-1].position,b=route[i].position,len=Math.hypot(b.x-a.x,b.z-a.z),t=Math.max(0,Math.min(1,(target.position.x-a.x)/(len||1)));const gap=Math.hypot(target.position.x-a.x-(b.x-a.x)*t,target.position.z-a.z-(b.z-a.z)*t);if(gap<best){best=gap;metres=walked+len*t;}walked+=len;}return {metres};}
