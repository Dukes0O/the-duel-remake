import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE} from '../src/config.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {buildTrackScript} from '../src/track-script.js';
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
  const curves=buildTrackScript(SUMMIT_RUN).pieces;
  equal([curves[38].radius,curves[40].radius],[120,120],'accepted Gallery curves remain unchanged');
  equal([curves[38].degrees,curves[40].degrees],[40.5,40],'Gallery angles are unchanged');
  equal([curves[38].width,curves[40].width],[10,10],'both Gallery curves retain their designed ten-metre width');
  equal(SUMMIT_RUN.galleries[0].end,10800,'Gallery shed ends before the open rejoin');
  equal(SUMMIT_RUN.surfacePatches.map(row=>row.id),['snowfield-ice-1','snowfield-ice-2','snowfield-ice-3'],
    'both retired Gallery ice proposals are absent and all original snowfield rows remain');
  const moves=SUMMIT_RUN.kitPlacements[0].nodeTranslations;
  equal(moves,{'gallery-concrete-pillar':[-10.541,0,0],
    'gallery-concrete-pillar.001':[-12.799,0,0]},'only the two approved entrance posts receive measured local outward translations');
  check(Object.isFrozen(moves)&&Object.values(moves).every(Object.isFrozen),'authored name/vector descriptor is deeply frozen');
  check(SUMMIT_RUN.kitPlacements.filter(row=>row.id==='gallery').slice(1).every(row=>!row.nodeTranslations),
    'all other thirty-four Gallery tiles keep original placements');
  const duel=game(),event=duel.state.avalanche;
  const open=duel.course.features.shortcuts.find(row=>row.id==='summit-open-road');
  equal(duel.course.gripKindAt(10500,-18),open.gripKind,'actual authored clear branch kind reaches Course');
  equal(duel._drivingSurface(10500,-18,duel.car,true,'winter').gripKind,open.gripKind,'player reads the authored clear branch');
  equal(duel._drivingSurface(10500,-18,duel.state.opponents[0].car??duel.car,true,'winter').gripKind,open.gripKind,'shared CPU query reads the same branch');
  equal(duel.course.gripKindAt(10500,0),duel.course.script.surfaceAt(10500),'protected Gallery surface is unchanged');
  for(let at=10100;at<=10900;at+=10)equal(duel.course.gripKindAt(at,0),duel.course.script.surfaceAt(at),'main road stays exact through the whole branch overlap');
  equal(duel.course.gripKindAt(10500,-40),'asphalt','outside branch retains ordinary verge query');
  const gallerySolids=duel.course.features.obstacles.filter(row=>row.sourceBounds?.startsWith('gallery-'));
  check(gallerySolids.every(row=>row.s+Math.hypot(row.halfX,row.halfZ)<=10800),'all actual Gallery roofs, walls and pillars finish by 10.80 km');
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
  // Cross in the last waiting step: next-step tell must not change the choice.
  for(const mode of ['duel','grandprix'])for(const knocked of [false,true]){
    const crossing=game(true,mode),cpu=crossing.state.opponents[0],e=crossing.state.avalanche;
    crossing.state.stageTimeSec=2;pose(crossing.state,9900,0);pose(cpu,9949.95,-2,50);
    if(mode==='duel')cpu.driverId='jules_reyes';else cpu.field.traits={...cpu.field.traits,aggression:.95};
    Object.assign(e,{crossedAt:0,tellAt:2+1/120+.001,slideAt:5+1/120+.001,endAt:7.5+1/120+.001});
    if(knocked){const body=actorBody(crossing,cpu);startKnock(cpu,{vx:body.vx,vz:body.vz,spin:0,severity:'nudge',heading:body.heading});}
    crossing.step(1/120);check(cpu.s>=9950,'fixture crosses actual decision point');
    equal(e.phase,'waiting');equal(cpu.summitRoute,'summit-open-road',mode+' commits actual '+(knocked?'knock':'normal')+' crossing phase');
    crossing.step(1/120);equal(e.phase,'tell');equal(cpu.summitRoute,'summit-open-road','following tell retains the crossing choice');
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


if(process.argv.includes('--drive')){
  const {App}=await import('../src/app.js');
  const {useRacingLine}=await import('./track-script-drive.mjs');
  const {steerForYaw}=await import('../src/config.js');
  const {makeRng}=await import('../src/rng.js');
  const {execFileSync}=await import('node:child_process');
  const {sweepObstacle}=await import('../src/collision.js');
  const source=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  // Claude's road comparison fixes its condition once at native race start.
  // Normal play and the controlled event tests retain the seeded clock.
  const reference={seed:1989,delay:makeRng(1989^0x4156414c).range(6,12)};
  const seeds={clear:reference,drift:reference};
  const results=[],savedLength=COURSE.length;
  if(!COURSE.some(def=>def.id==='summit-run'))COURSE.push(SUMMIT_RUN);
  const stage=COURSE.findIndex(def=>def.id==='summit-run');
  const angle=(a,b=0)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  const smooth=value=>{value=clamp(value,0,1);return value*value*(3-2*value);};
  try{
    for(const condition of ['clear','drift'])for(const route of ['gallery','summit-open-road']){
      const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
      const cancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
      const memory=new Map();let app;
      try{
        globalThis.localStorage={get length(){return memory.size;},key:i=>[...memory.keys()][i]??null,
          getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
        globalThis.cancelAnimationFrame??=()=>{};
        app=new App();app._refreshPlayer();
        app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'summit-run':true,'grand-prix':false}});
        const selected=seeds[condition];
        // Same direct native start as driveCircuit: no shop fixture or saved race state.
        app.duel.startCampaign({startStage:stage,seed:selected.seed,mode:'duel',opponentCount:0,
          car:'falcone_f42',driverId:'club',difficulty:'casual',cpuDifficulty:'medium',tyre:'winter',playerId:app.player.id,upgrades:{}});
        app.autopilot=true;app._scriptedCrashDone=true;useRacingLine(app,.95);
        const duel=app.duel,state=duel.state,course=duel.course,line=course.racingLine;
        assert.equal(state.opponents.length,0);assert.equal(state.tyre,'winter');
        assert.equal(state.avalanche.delaySec,selected.delay,'native controller uses the original isolated delay');
        // Test-only initialization in this --drive tool; no Game/App option is
        // exposed to normal races and no event clock is changed during driving.
        Object.assign(state.avalanche,condition==='clear'
          ? {phase:'waiting',crossedAt:Infinity,tellAt:Infinity,slideAt:Infinity,endAt:Infinity}
          : {phase:'after',crossedAt:0,tellAt:-5.5,slideAt:-2.5,endAt:0});
        const cut=course.features.shortcuts.find(row=>row.id==='summit-open-road');
        const begin=AVALANCHE.trigger,end=cut.end+140;
        const offsetAt=s=>s<cut.start?line.offsetAt(s)*(1-smooth((s-begin)/(cut.start-begin))):
          s<=cut.end?course.shortcutOffset(cut,s):line.offsetAt(s)*smooth((s-cut.end)/(end-cut.end));
        // Native reference-line corner, brake and acceleration arithmetic, on
        // the actual branch points. The immutable course/line is never edited.
        const count=Math.ceil((end-begin)/line.step),step=(end-begin)/count,dynamics=line.dynamics;
        const points=Array.from({length:count+1},(_,i)=>course.worldAt(begin+i*step,offsetAt(begin+i*step)));
        const speeds=[],gaps=[];
        for(let i=0;i<=count;i++){
          const a=points[Math.max(0,i-1)],b=points[i],c=points[Math.min(count,i+1)];
          const abx=b.x-a.x,abz=b.z-a.z,bcx=c.x-b.x,bcz=c.z-b.z,acx=c.x-a.x,acz=c.z-a.z;
          const lab=Math.hypot(abx,abz),lbc=Math.hypot(bcx,bcz),lac=Math.hypot(acx,acz);
          const curvature=lab*lbc*lac>1e-9?2*Math.abs(abx*bcz-abz*bcx)/(lab*lbc*lac):0;
          speeds[i]=Math.min(dynamics.topSpeed,Math.sqrt(dynamics.lateralAccel/Math.max(curvature,1e-6)),(dynamics.yawRate??Infinity)/Math.max(curvature,1e-6));
          gaps[i]=Math.max(.01,lbc);
        }
        speeds[0]=Math.min(speeds[0],line.speedAt(begin));speeds[count]=Math.min(speeds[count],line.speedAt(end));
        for(let i=count-1;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i+1]**2+2*dynamics.brake*gaps[i]));
        for(let i=1;i<=count;i++)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i-1]**2+2*dynamics.accel*gaps[i-1]));
        const referenceSpeed=s=>{const position=clamp((s-begin)/step,0,count),i=Math.min(count-1,Math.floor(position));return speeds[i]+(speeds[i+1]-speeds[i])*(position-i);};
        const originalDrive=app._driveAutopilot;
        if(route==='summit-open-road')app._driveAutopilot=function(){
          originalDrive.call(this);
          if(state.status!=='racing'||state.s<begin||state.s>end||state.impactTimer>0)return;
          const v=Math.max(0,state.speedMph)*DRIVE.mphToWorld,look=state.s+Math.max(12,v*.45);
          const at=clamp(state.s+v*.18,begin,end),before=course.worldAt(at-.75,offsetAt(at-.75)),after=course.worldAt(at+.75,offsetAt(at+.75));
          const tangent=Math.atan2(after.x-before.x,after.z-before.z);
          const farther=course.worldAt(at+1.5,offsetAt(at+1.5));
          const curvature=angle(Math.atan2(farther.x-after.x,farther.z-after.z),tangent)/Math.max(.01,Math.hypot(farther.x-before.x,farther.z-before.z)*.5);
          const wanted=angle(tangent,course.at(at).heading)+Math.atan((offsetAt(clamp(look,begin,end))-state.lateral)*2.5/Math.max(15,v));
          const yaw=curvature*v+(wanted-state.headingError)*6,surface=duel._drivingSurface(state.s,state.lateral);
          const target=Math.min(surface.speedLimit,duel.car.topSpeed*.97,referenceSpeed(state.s)*.95*Math.sqrt(duel.car.grip/.82*(surface.traction||1))/DRIVE.mphToWorld);
          const brake=state.speedMph>target+3?Math.min(1,(state.speedMph-target)/14):0;
          duel.setInput({throttle:state.speedMph<target?1:0,brake,steer:steerForYaw(yaw,{speedMph:state.speedMph,grip:duel.car.grip,traction:surface.traction,car:duel.car,brake:brake,tyreSlip:state.tyreSlipRules===true&&!state.airborne&&state.speedMph>=0}),boost:false});
        };
        const events=[],strip=[],phases=[];let entry=null,exit=null,crashes=0,resets=0,finite=true,firstCrash=null,firstScrape=null;
        const contactWitness=()=>{
          const ground=course.groundAt(state.s,state.lateral),surface=duel._drivingSurface(state.s,state.lateral);
          const point={...ground,y:(state.groundHeight??ground.y)+(state.airHeight??0)};
          const heading=course.at(state.s).heading+(state.headingError??0)+(state.slipAngle??0),dimensions=duel._vehicleSpec(state);
          const solids=duel._obstacles(state.s-5,state.s+5).map(obstacle=>{
            const hit=sweepObstacle(point,point,obstacle,heading,dimensions);
            return {id:obstacle.id,kind:obstacle.kind,s:obstacle.s,off:obstacle.off,x:obstacle.x,y:obstacle.y,z:obstacle.z,
              halfX:obstacle.halfX,halfZ:obstacle.halfZ,height:obstacle.height,minY:obstacle.minY,maxY:obstacle.maxY,
              heading:obstacle.heading,verticalClearance:obstacle.verticalClearance===true,
              overlap:hit?{inside:hit.inside,t:hit.t,nx:hit.nx,nz:hit.nz,penetration:hit.penetration}:null};
          });
          return {t:state.stageTimeSec,s:state.s,lateral:state.lateral,mph:state.speedMph,heading:state.headingError,slipAngle:state.slipAngle,
            gear:state.gear,input:{...state.input},phase:state.avalanche.phase,ground,point,dimensions,surface,solids};
        };
        duel.onChange((s,event)=>{
          if(event.crash){crashes++;firstCrash??={event:{...event},...contactWitness()};}
          if(event.scrape)firstScrape??={event:{...event},...contactWitness()};
          if(event.boundaryReset||event.checkpointReset)resets++;
          if(event.summitAvalanche)events.push({t:s.stageTimeSec,...event.summitAvalanche});
        });
        const observe=()=>({s:state.s,t:state.stageTimeSec,lateral:state.lateral,mph:state.speedMph,heading:state.headingError,tyre:state.tyre,phase:state.avalanche.phase});
        const crossing=(a,b,at)=>{const f=(at-a.s)/(b.s-a.s);return {s:at,t:a.t+(b.t-a.t)*f,lateral:a.lateral+(b.lateral-a.lateral)*f,mph:a.mph+(b.mph-a.mph)*f,heading:a.heading+(b.heading-a.heading)*f,tyre:b.tyre,phase:b.phase};};
        for(let tick=0;tick<120*900&&['countdown','racing'].includes(state.status);tick++){
          const before=observe();app.advance(1/120,1/120);const after=observe();
          assert.equal(after.phase,condition==='clear'?'waiting':'after','test-only condition stays fixed without a runtime override');
          finite&&=[after.s,after.t,after.lateral,after.mph,after.heading].every(Number.isFinite);
          if(phases.at(-1)?.phase!==after.phase)phases.push({phase:after.phase,t:after.t,s:after.s});
          if(entry===null&&before.s<begin&&after.s>=begin)entry=crossing(before,after,begin);
          if(exit===null&&before.s<AVALANCHE.rejoin&&after.s>=AVALANCHE.rejoin)exit=crossing(before,after,AVALANCHE.rejoin);
          if(after.s>=AVALANCHE.from&&after.s<=AVALANCHE.to){const surface=duel._drivingSurface(after.s,after.lateral),ground=course.groundAt(after.s,after.lateral);
            strip.push({...after,shortcutId:surface.shortcutId??null,kind:surface.gripKind,road:surface.road,
              speedLimit:surface.speedLimit,grip:surface.grip,x:ground.x,y:ground.y,z:ground.z});}
        }
        const facts={source,condition,route,seed:selected.seed,delaySec:selected.delay,skill:.95,car:'falcone_f42',tyre:state.tyre,solo:state.opponents.length===0,
          preparation:'test-only fixed event condition at race start',entry,exit,seconds:entry&&exit?exit.t-entry.t:null,phases,strip,events,hits:state.avalanche.hits,
          crashes,resets,finite,firstCrash,firstScrape,terminal:contactWitness(),status:state.status,completed:state.results?.completed===true,laps:state.completedLaps,endS:state.s};
        results.push(facts);console.log(JSON.stringify({nativeAvalanche:facts}));
      }finally{
        try{app?.dispose();}finally{
          if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;
          if(cancel)Object.defineProperty(globalThis,'cancelAnimationFrame',cancel);else delete globalThis.cancelAnimationFrame;
        }
      }
    }
    for(const row of results){
      assert.ok(row.completed&&row.laps===1,`${row.condition} ${row.route} completes the actual native race`);
      assert.ok(row.finite&&row.solo&&row.tyre==='winter'&&row.crashes===0&&row.resets===0,`${row.condition} ${row.route} has no collision/reset or invalid setup`);
      assert.ok(row.entry&&row.exit&&row.strip.length,`${row.condition} ${row.route} supplies actual segment witnesses`);
      assert.equal(row.hits.length,0,'route difference excludes active-slide knock');
      if(row.route==='summit-open-road'){
        assert.ok(row.strip.every(s=>s.road&&s.shortcutId==='summit-open-road'),'native car stays on the actual Open corridor');
        assert.ok(row.strip.every(s=>row.condition==='drift'?s.phase==='after'&&s.kind==='deep-snow'&&s.speedLimit===45:s.kind!=='deep-snow'&&!['slide','after'].includes(s.phase)),`${row.condition} is witnessed throughout the actual strip`);
      }else assert.ok(row.strip.every(s=>s.road&&s.shortcutId!=='summit-open-road'&&s.kind!=='deep-snow'),'Gallery stays on its actual protected road');
    }
    const galleryTime=results.find(row=>row.condition==='clear'&&row.route==='gallery').seconds;
    console.log(JSON.stringify({nativeGalleryGeometryTimes:{gallerySeconds:galleryTime,
      galleryDriftSeconds:results.find(row=>row.condition==='drift'&&row.route==='gallery').seconds,
      clearOpenSeconds:results.find(row=>row.condition==='clear'&&row.route==='summit-open-road').seconds,
      driftOpenSeconds:results.find(row=>row.condition==='drift'&&row.route==='summit-open-road').seconds}}));
    for(const condition of ['clear','drift']){
      const [gallery,open]=results.filter(row=>row.condition===condition);
      for(const key of ['mph','lateral','heading'])assert.ok(Math.abs(gallery.entry[key]-open.entry[key])<1e-8,'both routes have equal actual entry '+key);
      const difference=open.seconds-gallery.seconds;
      console.log(JSON.stringify({nativeAvalancheComparison:{condition,seed:open.seed,openSeconds:open.seconds,gallerySeconds:gallery.seconds,difference}}));
      assert.ok(condition==='clear'?difference<0:difference>=3.5&&difference<=6.5,`${condition} actual route difference is ${difference.toFixed(6)} s`);
    }

  }finally{COURSE.splice(savedLength);}
}
