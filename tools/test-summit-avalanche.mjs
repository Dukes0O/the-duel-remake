import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE} from '../src/config.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {AVALANCHE,stepSummitAvalanche,observeSummitAvalanche,observeSummitRoute,avalancheDriftAt} from '../src/summit-avalanche.js';
import {actorBody,startKnock,stepKnock} from '../src/vehicle-knock.js';
import {solveVehicleImpact} from '../src/vehicle-collision.js';
import {stepFieldRacer} from '../src/race-field-driver.js';
import {NpcRoutePlanner} from '../src/npc-route.js';
import {EngineAudio} from '../src/audio.js';
let checks=0;
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const check=(a,message)=>{assert.ok(a,message);checks++;};
const close=(a,b,message)=>check(Math.abs(a-b)<1e-8,message);
const length=COURSE.length;
if(!COURSE.some(def=>def.id==='summit-run'))COURSE.push(SUMMIT_RUN);
const summit=COURSE.findIndex(def=>def.id==='summit-run');
const game=(on=true,mode='duel',seed=1989,stage=summit)=>{
  const duel=new Duel({seed,featureFlags:createFeatureFlags({storage:null,overrides:{'summit-run':on,'grand-prix':true}})});
  duel.startCampaign({startStage:stage,mode,car:'falcone_f42',cpuDifficulty:'medium'});
  duel.state.status='racing';duel.state.tyre='winter';return duel;
};
const pose=(actor,s,lateral,speed=0)=>Object.assign(actor,{s,prevS:s,lateral,prevLateral:lateral,speedMph:speed,headingError:0,pushVelocity:0});
try{
  const duel=game(),event=duel.state.avalanche;
  equal(event.phase,'waiting','actual Summit initializes the event');
  check(event.delaySec>=6&&event.delaySec<=12,'seeded slide-start delay');
  equal(event.delaySec,game().state.avalanche.delaySec,'same seed repeats');
  check(event.delaySec!==game(true,'duel',6).state.avalanche.delaySec,'different seed has its own delay');
  pose(duel.state,9990,0,60);duel.step(1/120);equal(event.crossedAt,null,'below trigger remains unarmed');
  pose(duel.state.opponents[0],10001,0);duel.step(1/120);
  check(event.crossedAt!==null,'the first actual CPU crossing arms fixed-step state');
  close(event.slideAt-event.crossedAt,event.delaySec);close(event.slideAt-event.tellAt,3);close(event.endAt-event.slideAt,2.5);
  const snapshot=JSON.stringify(event);duel.state.paused=true;duel.step(.05);equal(JSON.stringify(event),snapshot,'pause does not advance');duel.state.paused=false;
  const cues=[];duel.listeners.add((state,ev)=>{if(ev.summitAvalanche)cues.push(ev.summitAvalanche.cue);});
  duel.state.stageTimeSec=event.tellAt-1/120;duel.step(1/120);equal(event.phase,'tell');equal(cues,['avalanche.rumble']);
  check(duel.state.callout.includes('GALLERY'),'player before fork receives arrow');
  duel.state.stageTimeSec=event.slideAt-1/120;duel.step(1/120);equal(event.phase,'slide');equal(cues,['avalanche.rumble','avalanche.slide']);
  duel.state.stageTimeSec=event.endAt-1/120;duel.step(1/120);equal(event.phase,'after');equal(cues.length,2,'no repeated sound event');
  const run=game(),s=run.state,e=s.avalanche;
  pose(s,10500,-18,70);const before=actorBody(run,s),frame=run.course.at(s.s),out={x:-Math.cos(frame.heading),z:Math.sin(frame.heading)};
  const virtual={...before,x:before.x-out.x*before.halfWidth*2,z:before.z-out.z*before.halfWidth*2,vx:out.x*8.94,vz:out.z*8.94,spin:0};
  const expected=solveVehicleImpact(before,virtual,{normal:out,point:{x:before.x-out.x*before.halfWidth,z:before.z-out.z*before.halfWidth}});
  const protectedState=JSON.stringify([s.lives,s.damageZones,s.stageCrashes,s.results,s.penaltySec,s.racePenaltySec,s.score]);
  e.phase='slide';observeSummitAvalanche(run);
  equal(e.hits.length,1);equal(e.hits[0].impact,expected.a,'unchanged actual equal-mass solver output');equal(e.hits[0].mass,virtual.mass);
  equal(s.knock.vx,expected.a.vx);equal(s.knock.vz,expected.a.vz);equal(s.knock.vy,0,'no hop');check(!s.wreck&&!s.crashed,'environmental shove is not a wreck');
  equal(JSON.stringify([s.lives,s.damageZones,s.stageCrashes,s.results,s.penaltySec,s.racePenaltySec,s.score]),protectedState,'no life/damage/crash/pay fields changed');
  observeSummitAvalanche(run);equal(e.hits.length,1,'one shove per actor');
  const oldPose=[s.s,s.lateral];stepKnock(run,s,1/120);check(s.s!==oldPose[0]||s.lateral!==oldPose[1],'normal knock owns actual movement');
  pose(s.opponents[0],10430,0,50);observeSummitAvalanche(run);equal(e.hits.length,1,'Gallery safe');
  pose(s.opponents[0],10410,-18,50);observeSummitAvalanche(run);equal(e.hits.length,1,'before slide strip safe');
  pose(s.opponents[0],10450,-18,50);observeSummitAvalanche(run);equal(e.hits.length,2,'late CPU entrant receives its own shove');
  // No motion shortcut: the ordinary controller owns time; this fixture isolates the easing cap.
  e.crossedAt=0;e.tellAt=0;e.slideAt=0;e.endAt=100;s.stageTimeSec=e.hits[0].atTime+.51;
  stepSummitAvalanche(run);check(s.speedMph<=30,'half-second endpoint is applied even when a step crosses it');
  e.phase='after';check(avalancheDriftAt(run,10500,-18));check(!avalancheDriftAt(run,10500,0));check(!avalancheDriftAt(run,10410,-18));
  for(const tyre of ['winter','summer']){
    const surface=run._drivingSurface(10500,-18,run.car,true,tyre);equal(surface.gripKind,'deep-snow');equal(surface.grip,tyre==='winter'?.55:.55*.75,'unchanged surface times tyre arithmetic');equal(surface.gripTopSpeedMph,45);equal(surface.speedLimit,45);
  }
  const decision=game(),r=decision.state.opponents[0];pose(r,9949,0);equal(observeSummitRoute(decision,r,.95),null);
  pose(r,9950,0);equal(observeSummitRoute(decision,r,.55),'summit-open-road','inclusive observed aggression threshold');
  decision.state.avalanche.phase='tell';equal(observeSummitRoute(decision,r,0),'summit-open-road','past choice retained');
  for(const phase of ['waiting','tell','slide','after']){
    const actor={s:9950,lateral:0};decision.state.avalanche.phase=phase;
    equal(observeSummitRoute(decision,actor,.549),'gallery');
    equal(observeSummitRoute(decision,{s:9950,lateral:0},.9),phase==='waiting'?'summit-open-road':'gallery');
  }
  const planner=new NpcRoutePlanner(run.course,{car:run.car,surfaceAt:(distance,lateral)=>run._drivingSurface(distance,lateral)});
  for(const difficulty of ['easy','medium']){
    const actor={s:10280,lateral:-18,speedMph:50,headingError:0};
    const route=planner.update(actor,{difficulty,lapsTotal:1,summitChoice:'summit-open-road'});
    check(route&&route.targetLateral<-17,'real Open Road path drives outside main-road clamp');
    equal(planner.update({s:10280,lateral:0,speedMph:50},{difficulty,lapsTotal:1,summitChoice:'gallery'}),null);
    equal(planner.update({s:10280,lateral:0,speedMph:50},{difficulty,lapsTotal:1}),null,'legacy Easy/first-lap Medium remains unchanged');
  }
  const gp=game(true,'grandprix'),f=gp.state.opponents[0];pose(f,10500,-18,60);gp.state.avalanche.phase='slide';observeSummitAvalanche(gp);
  const crashes=f.field.crashes,fieldEvents=[];gp.listeners.add((state,ev)=>fieldEvents.push(ev));stepFieldRacer(gp,f,1/120);
  equal(f.field.crashes,crashes,'actual environmental field knock does not increment crashes');check(!fieldEvents.some(ev=>ev.fieldCrash));check(!f.field.knocked,'environmental knock does not mask later collision');
  startKnock(f,{vx:10,vz:10,spin:0,severity:'nudge',heading:gp.course.at(f.s).heading});stepFieldRacer(gp,f,1/120);
  equal(f.field.crashes,crashes+1,'ordinary replacement knock still counts');check(fieldEvents.some(ev=>ev.fieldCrash));
  // Actual CPU consumers use their native traits and move by their normal steering.
  for(const mode of ['duel','grandprix'])for(const difficulty of ['easy','medium']){
    const native=game(true,mode),cpu=native.state.opponents[0];native.state.cpuDifficulty=difficulty;native.state.stageTimeSec=2;
    if(mode==='duel')cpu.driverId='jules_reyes';else cpu.field.traits={...cpu.field.traits,aggression:.95};
    pose(native.state,9900,0);pose(cpu,9950,-2,45);
    native.step(1/120);equal(cpu.summitRoute,'summit-open-road','actual '+mode+' '+difficulty+' aggression product chooses clear road');
    pose(cpu,10280,-16,40);const before=cpu.lateral;native.step(1/120);
    check(cpu.lateral<before,'actual native CPU steering follows the right-hand Open Road');
  }
  const replayA=game(true,'duel',6),replayB=game(true,'duel',6);
  for(const replay of [replayA,replayB]){
    pose(replay.state,10500,-18,55);const e=replay.state.avalanche;
    Object.assign(e,{crossedAt:0,tellAt:0,slideAt:0,endAt:2.5});
    for(let i=0;i<120;i++)replay.step(1/120);
  }
  equal(replayA.state,replayB.state,'actual fixed-step slide and shove replay repeats');
  const off=game(false),plain=game(false);equal(off.state.avalanche,undefined);
  for(let i=0;i<60;i++){off.setInput({throttle:1});plain.setInput({throttle:1});off.step(1/120);plain.step(1/120);}
  equal(off.state,plain.state,'disabled replay repeats without avalanche fields');
  const unrelatedOn=game(true,'duel',6,0),unrelatedOff=game(false,'duel',6,0);
  for(let i=0;i<60;i++){unrelatedOn.step(1/120);unrelatedOff.step(1/120);}equal(unrelatedOn.state,unrelatedOff.state,'unrelated enabled/off state bytes exact');
  run._loadStage(s.stageIndex);equal(run.state.avalanche.hits,[]);equal(run.state.avalanche.phase,'waiting');check(!run.state.knock?.summitAvalanche,'restart clears own knock');
  const {createSummitAvalancheView}=await import('../src/summit-avalanche-view.js');
  const view=createSummitAvalancheView(run.course),stateBytes=JSON.stringify(run.state),features=JSON.stringify(run.course.features);
  for(const phase of ['waiting','tell','slide','after']){const state={...run.state,avalanche:{...run.state.avalanche,phase,slideAt:0},stageTimeSec:1};view.update(state,true);view.update(state,false);}
  equal(JSON.stringify(run.state),stateBytes,'view never changes simulation');equal(JSON.stringify(run.course.features),features,'view adds no physical features');check(view.group.getObjectByName('Gallery / Open Road fork signs'));view.dispose();
  const audio=Object.create(EngineAudio.prototype),requested=[];let enabled=false;
  Object.assign(audio,{flags:{enabled:name=>name==='summit-run'&&enabled},cueBuffers:{},context:{decodeAudioData:async()=>({}),state:'running'},muted:false,paused:false});
  const originalFetch=globalThis.fetch;globalThis.fetch=async url=>{requested.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  try{await audio._loadCueBuffers();requested.length=0;enabled=true;await audio._loadCueBuffers();equal(requested.sort(),['/assets/audio/p4/avalanche-rumble.ogg','/assets/audio/p4/avalanche-slide.ogg']);}finally{globalThis.fetch=originalFetch;}
  const played=[];Object.assign(audio,{_syncMixer(){},_runCue(id){played.push(id);return{};},fightVoices:{event(){}},_grandPrixEvent(){},_spatialOutput(){return{level:{},disconnect(){}};}});
  audio._playCue('race.start.light');equal(played,[],'unrelated GP cue stays off');
  const audioState=game().state,audioCourse=run.course;
  for(const phase of ['tell','slide']){audioState.avalanche.phase=phase;const ev={summitAvalanche:{id:audioState.avalanche.id,phase,cue:'avalanche.'+(phase==='tell'?'rumble':'slide'),point:{x:0,y:0,z:0}}};audio.event(ev,audioState,audioCourse);audio.event(ev,audioState,audioCourse);}
  equal(played,['avalanche.rumble','avalanche.slide'],'existing positional cues each once with GP off');
  played.length=0;delete audio.cueBuffers['avalanche.rumble'];let finish;audio._loadCueBuffers=()=>new Promise(resolve=>finish=resolve);audio._avalancheAudioHits=new Set();audioState.avalanche.phase='tell';
  audio.event({summitAvalanche:{id:audioState.avalanche.id,phase:'tell',cue:'avalanche.rumble',point:{x:0,y:0,z:0}}},audioState,audioCourse);
  audio._snowmanAudioStage=(audio._snowmanAudioStage??0)+1;audio.cueBuffers['avalanche.rumble']={};finish();await Promise.resolve();equal(played,[],'existing pause/mute/restart epoch cancels late decode');
}finally{COURSE.splice(length);}
console.log(`Summit Avalanche: ${checks} controlled simulation, route, view and audio checks passed; native timing deferred.`);
