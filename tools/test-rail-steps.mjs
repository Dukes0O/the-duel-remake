import assert from 'node:assert/strict';
import {createJob,stepJob} from '../src/world/jobs/job-engine.js';
import {ironLineLength} from '../src/world/iron-line.js';
import {Duel} from '../src/game.js';

const point=(id,x,y=0,z=0)=>({id,position:{x,y,z}});
const line=[point('top',0,17),point('bottom',500,0)];
const tick=(job,view={},dt=1/60)=>stepJob(job,view,dt);
function run(job,view,dt=1/60,limit=10000){
  for(let i=0;i<limit&&!job.done;i++)job=tick(job,view,dt);
  return job;
}

// Bank braking follows force, mass and grade on the story's 260 tonne consist.
function bankRun(startSpeed){
  const step={kind:'drivetrain',path:line,massTonnes:260,tractiveKn:110,brakeKn:140,maxSpeed:22,
    stopAtEnd:true,grade:{from:line[0],to:line[1],ratio:-1/30},sandDrag:{place:line[1],overMs:3,backTo:line[0]}};
  let job=createJob({steps:[step]});job.stepState={metres:0,speed:startSpeed};
  let distance=0,last=0;
  for(let i=0;i<10000;i++){
    const before=job.stepState.metres??0;job=tick(job,{controls:{brake:1}},1/120);
    const now=job.stepState.metres??0;
    if(now<before){assert(job.requests.some(item=>item.type==='sandDrag'),'fast train reaches sand drag');return {job,distance};}
    distance=Math.max(distance,now);
    if(job.stepState.speed<=0.001)return {job,distance};
    last=now;
  }
  assert.fail(`train did not stop or reach sand drag (last ${last})`);
}
const slow=bankRun(9);
assert(Math.abs(slow.distance-191.25)<1,`9 m/s stopping distance was ${slow.distance.toFixed(2)} m`);
const fast=bankRun(15);
assert.equal(fast.job.stepState.speed,0,'15 m/s run ends safely stopped in the sand drag');
assert.equal(fast.job.stepState.metres,0,'sand drag returns the train to the top of the bank');

// Contact conserves momentum when soft and separates on a hard hit.
const runawayStep={kind:'runaway',path:[point('a',0),point('b',100)],massTonnes:70,softMs:2,
  wagons:{count:2,tonnes:30,gainMs2:0,maxSpeed:11},sandDrag:point('sand',100)};
let soft=createJob({steps:[runawayStep]});soft.stepState={metres:20,speed:5,wagonMetres:20,wagonSpeed:4};
soft=tick(soft,{},0);
assert(soft.events.some(event=>event.type==='coupled'),'a soft contact couples');
assert.equal(soft.stepState.speed,(70*5+60*4)/130,'coupling uses combined mass');
let hard=createJob({steps:[runawayStep]});hard.stepState={metres:20,speed:8,wagonMetres:20,wagonSpeed:4};
hard=tick(hard,{},0);
assert(hard.events.some(event=>event.type==='bounced'),'a hard contact bounces');
assert.equal(hard.stepState.coupled,false);

// Token, hoop and the saved stop mark are driven by ordinary job controls.
const tokenStep={kind:'drivetrain',path:[point('a',0),point('loop',50),point('b',100)],massTonnes:70,tractiveKn:80,
  tokenSwap:{place:point('loop',50),seconds:1,noTokenLineId:'no-token',swapLineId:'swap'}};
let token=createJob({steps:[tokenStep]});token.stepState={metres:50,speed:0};
token=tick(token,{hasToken:false,controls:{throttle:1}},.1);
assert.equal(token.stepState.speed,0,'throttle is locked without the token');
assert(token.requests.some(request=>request.lineId==='no-token'));
const otherStep={kind:'drivetrain',path:[point('a',0),point('loop',50),point('b',100)],massTonnes:70,
  tokenSwap:{place:point('loop',50),seconds:1,noTokenLineId:'no-token',swapLineId:'swap'},
  otherTrain:{id:'wednesday',model:'missing-model',speed:10,path:[point('b',100),point('loop',50),point('a',0)]}};
let other=createJob({steps:[otherStep]});other=tick(other,{},10);
assert.equal(other.stepState.otherTrainMetres,50,'other train reaches the loop and waits without a token');
assert(other.requests.some(request=>request.type==='train'&&request.actorId==='wednesday'));
const hoopStep={kind:'drivetrain',path:[point('a',0),point('hoop',50),point('b',100)],massTonnes:70,
  tokenHoop:{place:point('hoop',50),kmh:40,windowMetres:20,backMetres:300,missLineId:'miss',fastLineId:'fast'}};
let hoop=createJob({steps:[hoopStep]});hoop.stepState={metres:61,speed:12};
hoop=tick(hoop,{controls:{}},1/60);
assert.equal(hoop.stepState.metres,0,'missed hoop backs the train by the configured distance');
assert.equal(hoop.stepState.speed,0);
assert(hoop.requests.some(request=>request.lineId==='fast'));
const markStep={kind:'drivetrain',path:[point('mark',0),point('end',10)],massTonnes:70,stopAtEnd:true,
  stopMark:{place:point('mark',0),bands:[.5,3,20],lineIds:['perfect','close','far','past']}};
let mark=createJob({steps:[markStep]});mark.stepState={metres:10,speed:0};mark=tick(mark,{});
assert.equal(mark.storyMarks.stopMarks.mark,10,'best stop error is kept as a number in the additive story marks');
let bo=createJob({steps:[{kind:'drivetrain',path:[point('a',0),point('b',10)],massTonnes:70,maxSpeed:6,stopAtEnd:true,
  rideAlong:{driver:'bo',copiesPlayerStop:true,goodLineId:'good',badLineId:'bad'}}]});
bo.stepState={metres:10,speed:0};bo=tick(bo,{playerStopMetres:10},0);
assert(bo.requests.some(request=>request.lineId==='bad'));assert.equal(bo.stepState.copiedStopMetres,10);

// Dig reduces the pile and emits the buried-model reveal once.
let dig=createJob({steps:[{kind:'dig',tonnes:100,loadTonnes:20,reveals:'buried-engine'}]});
dig=tick(dig,{interact:true},1);assert.equal(dig.stepState.tonnes,80);
dig=tick(dig,{interact:true},1);assert(dig.events.some(event=>event.type==='reveals'&&event.id==='buried-engine'));
assert.equal(dig.events.filter(event=>event.type==='reveals').length,1);
let apprentice=createJob({steps:[{kind:'dig',tonnes:100,loadTonnes:60,apprentice:'bo',handsOverWork:'drift',taughtLineId:'taught'}]});
apprentice=tick(apprentice,{interact:true},1);
assert.equal(apprentice.stepState.handedOver,true,'apprentice takes the remaining work after learning');
apprentice=tick(apprentice,{},1);
assert.equal(apprentice.done,true,'handed over dig work completes without player input');

// Whistle counts separate held calls and starts its silent goat wait after the last.
let whistle=createJob({steps:[{kind:'whistle',count:3,seconds:2,lineIds:['one','two','three'],goats:{seconds:40}}]});
for(let i=0;i<3;i++){whistle=tick(whistle,{controls:{whistle:true}},2);whistle=tick(whistle,{controls:{whistle:false}},1);}
assert.equal(whistle.stepState.count,3);assert.equal(whistle.stepState.goatsWalking,true);
assert.equal(whistle.done,false,'the step waits silently for the goats');

// The ordinary job path stays structurally unchanged when it has no new fields.
const plain=createJob({steps:[{kind:'reach',place:point('target',2),radius:1}]},7);
const before={id:null,seed:7,steps:[{kind:'reach',place:point('target',2),radius:1}],stepIndex:0,
  stepState:{},events:[],requests:[],done:false,failedStep:false,lineId:null};
assert.deepEqual(plain,before);
const plainNext=tick(plain,{player:{position:{x:2,y:0,z:0}}});
assert.equal(plainNext.done,true);assert.equal(Object.hasOwn(plainNext,'storyMarks'),false);

// Exercise the brake input through Duel -> arena event -> world-job -> rail step.
const duel=new Duel({seed:8123});duel.startCampaign();duel.state.wastelandGateDiscovered=true;
const bankStep={kind:'drivetrain',path:line,massTonnes:260,tractiveKn:110,brakeKn:140,maxSpeed:22,stopAtEnd:true,
  grade:{from:line[0],to:line[1],ratio:-1/30},sandDrag:{place:line[1],overMs:3,backTo:line[0]}};
assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'world-job',car:'falcone_f42',seed:8123,opponents:[],job:{id:'rail-input-check',steps:[bankStep]}}),true);
duel.state.status='racing';duel.state.arena.worldJob.job.stepState={metres:0,speed:9};
for(let i=0;i<120*48;i++){duel.setInput({brake:1});duel.step(1/120);}
const realDistance=duel.state.arena.worldJob.job.stepState.metres;
assert(realDistance>180&&realDistance<200,'Duel brake input stops the train about 190 m up the bank');
assert.equal(duel.state.arena.worldJob.job.stepState.speed,0,'Duel brake input stops the train on the bank');

// Consist mass resolves from the loaded job roster: 70 + 160 + 30 tonnes.
let consist=createJob({steps:[{kind:'drivetrain',path:[point('a',0),point('b',100)],tractiveKn:110,
  consist:['iron-mule-cab','the-2-15','wednesday'],maxSpeed:22}]});
consist=tick(consist,{controls:{throttle:1}},1);
assert.equal(consist.stepState.speed,110/260-(100/260*.12),'consist mass adds to 260 tonnes');
assert(Math.abs(ironLineLength(line)-500.289)<.01);
console.log('PASS RAIL-STEPS: grade, sand drag, runaway, token, marks, dig, whistle, ride-along and consist');
