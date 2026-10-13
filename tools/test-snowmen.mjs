import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {TREMBLANT_SNOW, SNOWMAN_SPOTS} from '../src/circuits/tremblant-snow.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {createProfile,settleRace,DRIVING_MILESTONES} from '../src/progression.js';
import {snowmanResult,snowmanPlacements} from '../src/snowmen.js';
import {finishQualifying} from '../src/qualifying.js';
import {sweepObstacle} from '../src/collision.js';
import {createTrackKits} from '../src/track-kits.js';
import {createSnowmenView} from '../src/snowmen-view.js';
import {EngineAudio} from '../src/audio.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createResultsScreen} from '../src/screen-results.js';
let checks=0;
const placementFaults=[];
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const check=(value,message)=>{assert.ok(value,message);checks++;};
equal(SUMMIT_RUN.snowmen?.length,12,'Summit authors twelve actual off-line snowmen');
equal(TREMBLANT_SNOW.snowmen?.length,8,'Tremblant exposes its eight existing authored spots');
equal(TREMBLANT_SNOW.snowmen.map(({s,lateral})=>({s,lateral})),SNOWMAN_SPOTS);
equal(SNOWMAN_SPOTS,[[100,18],[130,25],[165,18],[200,20],[230,18],[260,28],[285,18],[310,25]].map(([s,lateral])=>({s,lateral})),'only the three reviewed snowman-only positions differ');
equal(FEATURE_STATES.snowmen,'dev');
const flags=on=>createFeatureFlags({storage:null,overrides:{snowmen:on,'grand-prix':true,'grand-prix-career':true}});
const originalLength=COURSE.length;
if(!COURSE.some(def=>def.id==='summit-run'))COURSE.push(SUMMIT_RUN);
const summit=COURSE.findIndex(def=>def.id==='summit-run'), tremblant=COURSE.findIndex(def=>def.id==='tremblant-snow');
const game=(on=true,stage=summit,mode='duel',seed=1989)=>{
  const duel=new Duel({seed,featureFlags:flags(on)});
  duel.startCampaign({startStage:stage,mode,car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium'});
  duel.state.status='racing';return duel;
};
try{
  for(const seed of [1989,1000,6])for(const stage of [summit,tremblant]){
    const on=game(true,stage,'duel',seed),off=game(false,stage,'duel',seed),course=on.course;
    equal(course.features.snowmen.length,stage===summit?12:8);
    equal(course.features.obstacles.filter(o=>!o.snowmanId),off.course.features.obstacles,'all old scenery and collider bytes remain exact');
    equal(course.features.trees,off.course.features.trees,'seeded trees stay exact');
    for(const obstacle of course.features.snowmen){
      check(Math.abs(obstacle.off)>course.roadHalfWidthAt(obstacle.s)+3,'not on the road or racing line');
      if(stage===summit && course.script.pieceAt(obstacle.s).kind==='turn')check(Math.sign(obstacle.off)===-course.script.pieceAt(obstacle.s).dir,'hairpin/bend placement is on its outside');
      const p=course.worldAt(obstacle.s,obstacle.off);
      const overlaps=off.course.features.obstacles.filter(o=>sweepObstacle(p,p,o,obstacle.heading,{halfWidth:1.02,halfLength:2.35,height:1.35}));
      if(overlaps.length)placementFaults.push({seed,id:obstacle.id,s:obstacle.s,off:obstacle.off,overlaps:overlaps.map(({id,kind,x,z,s,off,halfX,halfZ,heading})=>({id,kind,x,z,s,off,halfX,halfZ,heading}))});
      let reachable=false;
      for(let shift=-240;shift<=240&&!reachable;shift+=10){
        const start=course.worldAt(Math.max(0,Math.min(course.length,obstacle.s+shift)),0);
        reachable=!off.course.features.obstacles.some(o=>sweepObstacle(start,p,o,Math.atan2(p.x-start.x,p.z-start.z),{halfWidth:1.02,halfLength:2.35,height:1.35}));
        if(reachable)for(let step=0;step<=20;step++){
          const x=start.x+(p.x-start.x)*step/20,z=start.z+(p.z-start.z)*step/20,near=course.nearest(x,z,obstacle.s);
          const height=renderedGroundHeight(course,{x,z,s:near.s,off:near.lateral},{requireSurface:true});
          if(!Number.isFinite(height)){reachable=false;break;}
        }
      }
      if(!reachable)placementFaults.push({seed,id:obstacle.id,unreachable:true});
    }
  }
  console.log('Actual placement findings:',JSON.stringify(placementFaults));
  const duel=game(),s=duel.state,o=duel.course.features.snowmen[0],events=[];
  duel.onChange((state,event)=>{if(event.snowmanHit)events.push(event.snowmanHit);});
  const move=(actor,obstacle)=>Object.assign(actor,{prevS:obstacle.s-5,s:obstacle.s+5,prevLateral:obstacle.off,lateral:obstacle.off,speedMph:100,headingError:0,slipAngle:0});
  move(s,o);
  const before={speed:s.speedMph,lives:s.lives,damage:{...s.damageZones},crashes:s.stageCrashes,score:s.stageStyleScore,combo:s.combo};
  duel._staticContacts(s,true);
  equal(s.snowmen,1,'actual player static contact counts');equal(events.length,1);
  equal({speed:s.speedMph,lives:s.lives,damage:s.damageZones,crashes:s.stageCrashes,score:s.stageStyleScore,combo:s.combo},before,'soft snow has no speed, armor, crash, score or combo penalty');
  move(s,o);duel._staticContacts(s,true);equal(s.snowmen,1,'same id breaks only once');equal(events.length,1);
  const cpu=s.opponents[0],second=duel.course.features.snowmen[1];move(cpu,second);duel._staticContacts(cpu,false);
  equal(s.snowmen,1,'CPU earns no player credits');equal(events.length,2,'CPU emits its real burst');
  move(s,second);duel._staticContacts(s,true);equal(s.snowmen,1,'CPU-broken placement cannot pay later');
  const third=duel.course.features.snowmen[2];move(s,third);s.prevS=s.s=third.s;duel._staticContacts(s,true);equal(s.snowmen,1,'stationary overlap does not break');
  move(s,third);s.airborne=true;s.airHeight=s.prevAirHeight=8;duel._staticContacts(s,true);equal(s.snowmen,1,'high overflight clears the actual model');s.airborne=false;s.airHeight=s.prevAirHeight=0;
  equal(snowmanResult(duel),{snowmenEnabled:true,snowmen:1});
  s.qualifying={phase:'driving'};equal(snowmanResult(duel),{},'qualifying emits no pay capability');delete s.qualifying;
  duel._loadStage(summit);equal(s.snowmen,0);equal(s.snowmanBursts,[]);equal(duel._brokenSnowmanIds.size,0,'reload resets all broken ids');
  const wallGame=game(),ws=wallGame.state,first=wallGame.course.features.snowmen[0];
  const point=wallGame.course.groundAt(first.s+8,first.off),wall={id:'controlled-wall-behind-snowman',kind:'prop',shape:'box',barrier:true,
    s:first.s+8,off:first.off,x:point.x,y:point.y,z:point.z,heading:point.heading,halfX:5,halfZ:.5,height:2};
  wallGame.course.features.obstacles.push(wall);
  for(let bucket=Math.floor((wall.s-30)/64);bucket<=Math.floor((wall.s+30)/64);bucket++){
    const key=(bucket+wallGame.course.bucketCount)%wallGame.course.bucketCount;
    if(!wallGame.course.obstacleBuckets.has(key))wallGame.course.obstacleBuckets.set(key,[]);
    wallGame.course.obstacleBuckets.get(key).push(wall);
  }
  move(ws,first);ws.s=first.s+12;wallGame._staticContacts(ws,true);equal(ws.snowmen,1);
  check(ws.lives<5 || ws.speedMph<100,'soft snow does not mask the actual solid contact behind it');
  const qualifying=game(true,tremblant,'grandprix');
  qualifying.startCampaign({startStage:tremblant,mode:'grandprix',qualifying:true,car:'falcone_f42'});
  const qs=qualifying.state;equal(qs.qualifying.phase,'driving');
  qs.status='racing';move(qs,qualifying.course.features.snowmen[0]);qualifying._staticContacts(qs,true);equal(qs.snowmen,1);
  equal(snowmanResult(qualifying),{});qs.qualifying.timing='timed';qs.completedLaps=2;qs.lapTimes=[100,101];qs.assistedLaps=[false,false];
  check(finishQualifying(qualifying));equal(qs.snowmen,0,'actual qualifying-to-race reload erases hit pay');equal(qs.snowmanBursts,[]);
  for(const mode of ['duel','timetrial','grandprix'])for(const enabled of [false,true]){
    const finished=game(enabled,summit,mode),fs=finished.state;
    fs.s=finished.raceLength;fs.completedLaps=fs.lapsTotal;fs.lapTimes=[300];fs.assistedLaps=[false];fs.stageTimeSec=fs.lapStartedAt=300;
    if(enabled){const placed=finished.course.features.snowmen[0];move(fs,placed);finished._staticContacts(fs,true);fs.s=finished.raceLength;equal(fs.snowmen,1);} 
    check(finished._finishStage(),'real successful result producer completes');
    if(enabled)equal({snowmenEnabled:fs.results.snowmenEnabled,snowmen:fs.results.snowmen},{snowmenEnabled:true,snowmen:1});
    else check(!Object.hasOwn(fs.results,'snowmen')&&!Object.hasOwn(fs.results,'snowmenEnabled'),'off result fields remain absent');
  }
  const off=game(false);check(!Object.hasOwn(off.state,'snowmen'));equal(snowmanResult(off),{});check(!off.course.features.snowmen);
  off.startCampaign({startStage:0});check(!Object.hasOwn(off.state,'snowmenEnabled'),'unrelated course stays unchanged');
  const profile=()=>({...createProfile(),credits:5000,milestones:Object.keys(DRIVING_MILESTONES)});
  const payload=(extra={})=>({runId:'snowmen-test',stageIndex:summit,mode:'duel',completed:true,won:true,laps:1,seed:1989,timeSec:300,car:'falcone_f42',driverId:'club',difficulty:'casual',cpuDifficulty:'medium',...extra});
  for(const mode of ['duel','timetrial'])for(const difficulty of ['casual','pro'])for(const hits of [0,1,8,10,12]){
    const before=profile(),base=settleRace(before,payload({mode,difficulty})),result=payload({mode,difficulty,snowmenEnabled:true,snowmen:hits}),paid=settleRace(before,result);
    equal(paid.reward-base.reward,Math.min(hits,10)*25,'fixed pay is outside distance and Pro doubling');
    equal(paid.breakdown.manual,base.breakdown.manual,'Pro bonus stays exact');
    const duplicate=settleRace(paid.profile,result);equal(duplicate.reward,0);equal(duplicate.profile,paid.profile);
  }
  for(const extra of [{snowmen:-1},{snowmen:1.5},{snowmen:'12'},{snowmen:NaN},{snowmen:Infinity},{snowmen:Number.MAX_SAFE_INTEGER+1},{snowmen:13},{practice:true},
    {snowmenEnabled:false},{snowmenEnabled:1},{qualifying:true},{completed:false},{abandoned:true},{timeout:true},{laps:0},{timeSec:0},{stageIndex:0,laps:2}]){
    const result=payload({snowmenEnabled:true,snowmen:12,...extra}),base={...result};delete base.snowmen;delete base.snowmenEnabled;
    equal(settleRace(profile(),result).reward,settleRace(profile(),base).reward,'invalid/off/incomplete/non-snow earns no snowman bonus');
  }
  const loss=payload({won:false,snowmenEnabled:true,snowmen:2});equal(settleRace(profile(),loss).reward-settleRace(profile(),{...loss,snowmenEnabled:false}).reward,50,'completed loss preserves charge and earns only fixed hit bonus');
  const gp=payload({mode:'grandprix',grandPrixCareerEnabled:true,position:1,fieldSize:6,snowmen:12});equal(settleRace(profile(),gp).breakdown.snowmen,250,'approved GP helper stays exact');
  const loader=new GLTFLoader();loader.register(()=>({name:'P4_HEADLESS_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const loaded=[];
  const load=async path=>{const bytes=readFileSync(new URL('../public'+path,import.meta.url));const model=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');loaded.push(model);return model;};
  const course=new Course(SUMMIT_RUN,1989),kits=createTrackKits(course,{placements:[],extraPlacements:snowmanPlacements(course),loadAsset:load});
  check(await kits.ready,kits.error?.message);
  for(const model of loaded){model.scene.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(model.scene).getSize(new THREE.Vector3());
    check(Math.abs(size.x-1.55)<.00001 && Math.abs(size.y-2.1)<.00001 && Math.abs(size.z-1)<.00001,'contact envelope agrees with both actual approved GLBs');}
  for(const high of [true,false])for(const name of ['hat','carrot'])check(kits.snowmanPart(name,high)?.geometry.attributes.position.count>3,'real approved part geometry');
  const view=createSnowmenView(kits),hit=events[0],state={status:'racing',snowmenEnabled:true,stageTimeSec:hit.atTime+.2,snowmanBursts:[hit]};
  const snapshot=JSON.stringify(state),colliders=JSON.stringify(course.features.obstacles);
  kits.update({state,high:true,position:new THREE.Vector3(hit.x,hit.y,hit.z)});
  check(kits.group.children.every(mesh=>!mesh.userData.trackKitDrawnPlacementIndices?.includes(0)),'broken instance excluded from actual draw batches');
  view.update(state,true);equal(view.group.children.length,1);
  const hat=view.group.getObjectByName('hat'),firstMatrix=hat.matrix.clone();check(hat?.geometry.attributes.position.count>3);
  view.update({...state,stageTimeSec:hit.atTime+.6},true);check(!hat.matrix.equals(firstMatrix),'real hat moves from hit time');
  view.update(state,false);check(view.group.getObjectByName('carrot')?.isMesh,'Performance uses real approved carrot');
  equal(JSON.stringify(state),snapshot);equal(JSON.stringify(course.features.obstacles),colliders,'render never changes contacts');
  view.update({...state,stageTimeSec:hit.atTime+3},true);equal(view.group.children.length,0,'bursts expire');view.dispose();kits.dispose();
  const app={duel:{state:{...s,status:'stage_result',stageIndex:summit,mode:'duel',results:{...payload(),snowmenEnabled:true,snowmen:12,creditReward:250,creditBreakdown:{snowmen:250}}}},profileSaved:true};
  const screen=createResultsScreen({app,profile,credits:String,escapeHTML:String,time:String,arrow:''});
  const html=screen(app.duel.state);check(html.includes('SNOWMEN</span><b>12</b>') && html.includes('SNOWMEN +250'),'ordinary screen shows actual twelve hits and capped 250 CR');
  app.duel.state.results={...app.duel.state.results,snowmenEnabled:false,creditBreakdown:{}};check(!screen(app.duel.state).includes('SNOWMEN'),'off ordinary metric stays absent');
  const audio=Object.create(EngineAudio.prototype),requested=[];let enabled=false;
  Object.assign(audio,{flags:{enabled:name=>name==='snowmen'&&enabled},cueBuffers:{},context:{decodeAudioData:async()=>({}),state:'running'},muted:false,paused:false});
  const fetchBefore=globalThis.fetch;globalThis.fetch=async url=>{requested.push(url);return{ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};};
  try{
    await audio._loadCueBuffers();check(!requested.some(path=>path.endsWith('snowman-burst.ogg')),'off cue not admitted');requested.length=0;enabled=true;
    await audio._loadCueBuffers();equal(requested,['/assets/audio/p4/snowman-burst.ogg'],'late ordinary activation loads only snowman cue');
  }finally{globalThis.fetch=fetchBefore;}
  const played=[];
  Object.assign(audio,{_syncMixer(){},_runCue(id){played.push(id);return{};},fightVoices:{event(){}},_grandPrixEvent(){},_spatialOutput(){return{level:{},disconnect(){}};}});
  audio._playCue('snowman.burst');equal(played,['snowman.burst'],'Snowmen admits its existing cue without GP');audio._playCue('race.start.light');equal(played.length,1,'unrelated GP cue stays off');
  played.length=0;audio.event({snowmanHit:hit},state,course);audio.event({snowmanHit:hit},state,course);equal(played,['snowman.burst'],'real hit cue consumed once');
  const pendingHit={...hit,id:'late-hit'};delete audio.cueBuffers['snowman.burst'];
  let finishLoad;audio._loadCueBuffers=()=>new Promise(resolve=>{finishLoad=resolve;});
  audio.event({snowmanHit:pendingHit},state,course);audio._snowmanAudioStage=(audio._snowmanAudioStage ?? 0)+1;audio._snowmanAudioHits=new Set();audio.cueBuffers['snowman.burst']={};finishLoad();await Promise.resolve();equal(played.length,1,'stage reset cancels a pending late cue');
  enabled=false;audio._playCue('snowman.burst');equal(played.length,1,'disabled cue remains rejected');
  check(SOUND_BANK['snowman.burst'].file==='p4/snowman-burst.ogg');
}finally{COURSE.splice(originalLength);}
equal(placementFaults,[],'every placement must remain clear and reachable; inherited faults are not waived');
console.log(`Snowmen: ${checks} checks passed; only controlled Node geometry/contact/money/audio fixtures, no native drive or art acceptance.`);
