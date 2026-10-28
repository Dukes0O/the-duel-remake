// P4-SUMMIT-ATTACK: existing APIs, isolated memory saves, optional one native run.
import assert from 'node:assert/strict';
import test from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,relative,isAbsolute,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {App} from '../src/app.js';
import {Duel} from '../src/game.js';
import {CARS,COURSE} from '../src/config.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {SUMMIT_TIME_ATTACK,manifest} from '../src/circuits/summit-time-attack.js';
import {SUMMIT_ATTACK_ID,isSummitAttack,summitAttackTargets,summitAttackMedal} from '../src/summit-attack.js';
import {CIRCUIT_ENTRIES,circuitDefinitions} from '../src/circuit-manifests.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createProfile,normalizeProfile,settleRace,bestKey,isValidFinish} from '../src/progression.js';
import {isCourseUnlocked,purchaseCourse,normalizeCourseAccess} from '../src/course-access.js';
import {bestSummitAttackTime} from '../src/course-access-ui.js';
import {createLeaderboard,recordFinish,mergeLeaderboards} from '../src/leaderboard.js';
import {GhostRecorder,createGhostStore,storeGhost,findGhost} from '../src/ghost.js';
import {DRIVERS} from '../src/drivers.js';
import {hash32} from '../src/yeti.js';
import {useRacingLine} from './track-script-drive.mjs';

const flags=(grandPrix=false)=>createFeatureFlags({storage:null,search:'',qa:true,
  overrides:{'summit-run':true,yeti:true,'grand-prix':grandPrix,'grand-prix-career':false}});
const upgrades={engine:0,nitro:0,handling:0,tires:0,brakes:0,suspension:0,tank:0};
function withCatalog(action) {
  const old=[...COURSE];
  for(const def of [SUMMIT_RUN,SUMMIT_TIME_ATTACK])if(!COURSE.some(row=>row.id===def.id))COURSE.push(def);
  try{return action();}finally{COURSE.splice(0,COURSE.length,...old);}
}
function memoryScope(action) {
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const cancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame'),rows=new Map(),apps=[];
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,
    getItem:key=>rows.get(key)??null,setItem:(key,value)=>rows.set(key,String(value)),removeItem:key=>rows.delete(key)}});
  globalThis.cancelAnimationFrame??=()=>{};
  const app=()=>{const value=new App();value.duel.featureFlags=flags();apps.push(value);return value;};
  try{return action({app,rows});}finally{
    for(const value of apps)value.dispose();
    if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;
    if(cancel)Object.defineProperty(globalThis,'cancelAnimationFrame',cancel);else delete globalThis.cancelAnimationFrame;
  }
}
const attackIndex=()=>COURSE.findIndex(def=>def.id===SUMMIT_ATTACK_ID);
const parentIndex=()=>COURSE.findIndex(def=>def.id==='summit-run');
const ownedProfile=()=>purchaseCourse({...createProfile(),credits:20000},'summit-run').profile;
const payload=(extra={})=>({runId:'attack-finish',stageIndex:attackIndex(),mode:'timetrial',car:'falcone_f42',driverId:'club',
  completed:true,won:false,timeSec:SUMMIT_TIME_ATTACK.attackTimes.bronze+1,laps:1,seed:1989,
  difficulty:'casual',cpuDifficulty:'medium',upgrades:{...upgrades},...extra});
const protectedProfile=profile=>{const {personalBests,settledResults,activeRace,history,...unchanged}=profile;return unchanged;};
function pendingProfile(result) {
  return normalizeProfile({...ownedProfile(),winStreak:3,pbBonusRuns:['existing-paid-run'],
    activeRace:{key:result.runId+':'+result.stageIndex,runId:result.runId,stageIndex:result.stageIndex,
      stageId:SUMMIT_ATTACK_ID,car:result.car,driverId:result.driverId,cpuDifficulty:'medium',yetiSeed:3395618052}});
}
function purchaseParent(app) {
  app.profile={...app.profile,credits:20000};app._saveProfile();
  assert.equal(app.purchaseCourse('summit-run').ok,true);
}
function startRecorded(app,stage=attackIndex(),extra={},runId='yeti-run-0') {
  const previous=Object.getOwnPropertyDescriptor(globalThis.crypto,'randomUUID');
  try {
    Object.defineProperty(globalThis.crypto,'randomUUID',{configurable:true,value:()=>runId});
    return app.startCampaign({startStage:stage,mode:'timetrial',car:'falcone_f42',driverId:'club',difficulty:'casual',
      cpuDifficulty:'medium',seed:1989,tyre:'winter',opponentCount:0,...extra});
  } finally {if(previous)Object.defineProperty(globalThis.crypto,'randomUUID',previous);else delete globalThis.crypto.randomUUID;}
}
function reachGo(app) {
  for(let i=0;i<120*10&&app.duel.state.status==='countdown';i++)app.advance(1/120,1/120);
  assert.equal(app.duel.state.status,'racing');app.advance(1/120,1/120);
}

if(!process.argv.includes('--drive')) {
  test('Attack is an appended released parent-route solo event with parent-only free access',()=>withCatalog(()=>{
    assert.equal(SUMMIT_ATTACK_ID,'summit-time-attack');assert.ok(isSummitAttack(SUMMIT_ATTACK_ID)&&isSummitAttack(SUMMIT_TIME_ATTACK));
    assert.equal(isSummitAttack(SUMMIT_RUN),false);assert.equal(isSummitAttack(null),false);
    const entry=CIRCUIT_ENTRIES.find(row=>row.manifest.id===SUMMIT_ATTACK_ID);
    assert.equal(entry.definition,SUMMIT_TIME_ATTACK);assert.equal(entry.manifest.releaseOrder,6);
    const at=CIRCUIT_ENTRIES.indexOf(entry);
    assert.ok(at>=0);assert.ok(CIRCUIT_ENTRIES.slice(0,at).every(row=>row.manifest.releaseOrder<6));
    assert.ok(CIRCUIT_ENTRIES.slice(at+1).every(row=>row.manifest.releaseOrder>6),'future appended events retain Attack order');
    assert.equal(manifest.flag,'summit-run');assert.equal(manifest.state,'on');assert.equal(manifest.grandPrix,false);
    assert.equal(manifest.price,0);assert.equal(SUMMIT_TIME_ATTACK.noCombat,true);assert.equal(SUMMIT_TIME_ATTACK.closed,false);
    assert.deepEqual(SUMMIT_TIME_ATTACK.script,SUMMIT_RUN.script);assert.deepEqual(SUMMIT_TIME_ATTACK.galleries,SUMMIT_RUN.galleries);
    assert.equal(SUMMIT_TIME_ATTACK.stage,SUMMIT_RUN.stage);assert.equal(SUMMIT_TIME_ATTACK.lengthU,SUMMIT_RUN.lengthU);
    const off=createFeatureFlags({storage:null,search:'',qa:true,overrides:{'summit-run':false}});
    assert.ok(!circuitDefinitions(off).some(row=>row.id===SUMMIT_ATTACK_ID));
    assert.ok(circuitDefinitions(flags()).some(row=>row.id===SUMMIT_ATTACK_ID));
    const locked=createProfile(),owned=ownedProfile();assert.equal(isCourseUnlocked(locked,SUMMIT_ATTACK_ID),false);
    assert.equal(isCourseUnlocked(owned,SUMMIT_ATTACK_ID),true);assert.equal(owned.grandPrixPodiums?.includes('summit-run')??false,false);
    for(const profile of [locked,owned]){const bought=purchaseCourse(profile,SUMMIT_ATTACK_ID);assert.equal(bought.ok,false);assert.equal(bought.cost,0);assert.equal(bought.profile,profile);}
    assert.ok(!normalizeCourseAccess({version:1,unlocked:[SUMMIT_ATTACK_ID]}).unlocked.includes(SUMMIT_ATTACK_ID),'child cannot forge parent ownership');
    assert.ok(!owned.courses.unlocked.includes(SUMMIT_ATTACK_ID),'no child entitlement is stored');
    assert.ok(Number.isFinite(SUMMIT_TIME_ATTACK.attackBaselineSec)&&SUMMIT_TIME_ATTACK.attackBaselineSec>0,'actual one-run T must land before acceptance');
    assert.deepEqual(SUMMIT_TIME_ATTACK.attackTimes,summitAttackTargets(SUMMIT_TIME_ATTACK.attackBaselineSec));
  }));
  test('pure medal targets round up and inclusive medal boundaries use validated times',()=>{
    const target=summitAttackTargets(100.01);assert.deepEqual(target,{gold:103.1,silver:108.1,bronze:115.1});assert.ok(Object.isFrozen(target));
    for(const invalid of [0,-1,NaN,Infinity,null,undefined,'100'])assert.throws(()=>summitAttackTargets(invalid),RangeError);
    assert.equal(summitAttackMedal(target.gold,target),'gold');assert.equal(summitAttackMedal(target.gold+.01,target),'silver');
    assert.equal(summitAttackMedal(target.silver,target),'silver');assert.equal(summitAttackMedal(target.silver+.01,target),'bronze');
    assert.equal(summitAttackMedal(target.bronze,target),'bronze');assert.equal(summitAttackMedal(target.bronze+.01,target),null);
    for(const time of [0,-1,NaN,Infinity,'90'])assert.equal(summitAttackMedal(time,target),null);
    for(const malformed of [null,{}, {gold:3,silver:2,bronze:4},{gold:0,silver:2,bronze:3}])assert.equal(summitAttackMedal(1,malformed),null);
  });
  test('settings, real App and direct Duel force solo TT and preserve recorded start plus parent GP',()=>withCatalog(()=>memoryScope(({app:newApp})=>{
    const app=newApp();assert.equal(app.startCampaign({startStage:attackIndex()}),false,'locked parent blocks real start');purchaseParent(app);
    for(const mode of ['duel','grandprix','wasteland','timetrial']){
      const settings=normalizeRaceSettings({eventId:SUMMIT_ATTACK_ID,mode,rival:{car:'falcone_f42'}},app.profile);
      assert.equal(settings.mode,'timetrial');assert.equal(settings.rival,undefined);
      const runId='attack-mode-'+mode;
      assert.equal(startRecorded(app,attackIndex(),{mode,laps:6,opponentCount:7,qualifying:true},runId),true);
      const s=app.duel.state;assert.equal(s.mode,'timetrial');assert.equal(s.lapsTotal,1);assert.equal(s.opponents.length,0);
      assert.equal(s.traffic.length,0);assert.ok(!s.field);assert.ok(!s.qualifying||s.qualifying.phase!=='driving');assert.ok(!s.combat);
      assert.equal(s.seed,1989);assert.equal(s.yetiSeed,hash32(1989,runId));
      reachGo(app);assert.equal(app.profile.activeRace.stageId,SUMMIT_ATTACK_ID);assert.equal(app.profile.activeRace.yetiSeed,s.yetiSeed);
      const replay=new Duel({featureFlags:flags()});replay.startCampaign({startStage:attackIndex(),mode:'grandprix',laps:6,qualifying:true,
        opponentCount:7,car:'falcone_f42',seed:s.seed,yetiSeed:s.yetiSeed,tyre:'winter'});
      assert.equal(replay.state.mode,'timetrial');assert.equal(replay.state.lapsTotal,1);assert.equal(replay.state.opponents.length,0);
      assert.deepEqual(replay.state.yeti,s.yeti);assert.deepEqual(replay.state.avalanche,s.avalanche);
      app.returnToMenu();
    }
    const parent=new Duel({featureFlags:flags(true)});parent.startCampaign({startStage:parentIndex(),mode:'grandprix',car:'falcone_f42',seed:1989,fieldSeed:1000});
    assert.equal(parent.state.mode,'grandprix');assert.equal(parent.state.opponents.length,5);assert.equal(parent.state.field.size,6);
  })));
  test('direct Game resolves fractional and clamped stages before Attack-only solo admission',()=>withCatalog(()=>{
    assert.equal(attackIndex(),COURSE.length-1,'the new Attack event is the appended event in this catalogue');
    for(const startStage of [attackIndex()+.5,COURSE.length+20]) {
      const duel=new Duel({featureFlags:flags(true)});
      duel.startCampaign({startStage,mode:'grandprix',laps:9,opponentCount:3,qualifying:true,
        rival:{car:'stuttgart_959s'},car:'falcone_f42',seed:1989,fieldSeed:1000,tyre:'winter'});
      const state=duel.state;
      assert.equal(state.stageIndex,attackIndex());assert.equal(duel.course.def.id,SUMMIT_ATTACK_ID);
      assert.equal(state.mode,'timetrial');assert.equal(state.lapsTotal,1);assert.equal(state.opponents.length,0);
      assert.ok(!state.rival);assert.ok(!state.field);assert.ok(!state.qualifying||state.qualifying.phase!=='driving');
    }
    for(const startStage of [-.5,-200,NaN,Infinity,-Infinity]) {
      const duel=new Duel({featureFlags:flags(true)});
      duel.startCampaign({startStage,mode:'duel',laps:2,opponentCount:0,qualifying:false,car:'falcone_f42',seed:1989});
      assert.equal(duel.state.stageIndex,0);assert.equal(duel.course.def.id,COURSE[0].id);
      assert.equal(duel.state.mode,'duel');assert.equal(duel.state.lapsTotal,COURSE[0].laps);
      assert.equal(isSummitAttack(duel.course.def),false);
    }
  }));
  test('legal over-bronze and medal finishes record without any finance or unrelated progress',()=>withCatalog(()=>{
    for(const [medal,time] of [['gold',SUMMIT_TIME_ATTACK.attackTimes.gold],['silver',SUMMIT_TIME_ATTACK.attackTimes.silver],
      ['bronze',SUMMIT_TIME_ATTACK.attackTimes.bronze],[null,SUMMIT_TIME_ATTACK.attackTimes.bronze+1]]){
      const result=payload({runId:'attack-'+medal,timeSec:time,won:medal!==null,clean:true,manual:true,snowmen:10,snowmenEnabled:true,
        jumps:9,crushCount:9,policeEscapes:9,difficulty:'pro'}),seeded=pendingProfile(result),
        before=normalizeProfile({...seeded,personalBests:{...seeded.personalBests,[bestKey(result)]:time+5}}),settled=settleRace(before,result);
      assert.equal(isValidFinish(result),true);assert.equal(settled.awarded,true);assert.equal(settled.reward,0);
      assert.equal(settled.charge,0);assert.equal(settled.policeFineCharge,0);assert.ok(Object.values(settled.breakdown).every(value=>value===0));
      assert.deepEqual(protectedProfile(settled.profile),protectedProfile(before));assert.equal(settled.profile.activeRace,null);
      assert.equal(settled.personalBestStatus,'improved');assert.equal(before.personalBests[bestKey(result)],time+5);
      assert.equal(settled.profile.personalBests[bestKey(result)],time);assert.equal(settled.profile.history.at(-1).reward,0);
      assert.equal(settled.profile.history.at(-1).charge,0);assert.equal(settled.profile.settledResults.filter(key=>key===result.runId+':'+result.stageIndex).length,1);
      assert.equal(settleRace(settled.profile,result).profile,settled.profile);
      assert.equal(recordFinish(createLeaderboard(),result,{id:'attack-player',name:'Attack Player'}).recorded,true);
    }
    const result=payload();for(const extra of [{timeSec:NaN},{timeSec:0},{laps:2},{qualifying:true},{practice:true},{car:'missing'}]){
      const before=pendingProfile(result),settled=settleRace(before,{...result,...extra});
      assert.equal(settled.reward,0);assert.equal(settled.awarded,false);assert.deepEqual(protectedProfile(settled.profile),protectedProfile(before));
    }
    const parent=settleRace(createProfile(),{...payload(),stageIndex:parentIndex(),mode:'grandprix',grandPrixCareerEnabled:false,position:1,fieldSize:6});
    assert.equal(parent.awarded,false);assert.equal(parent.reward,0,'old parent GP career-off guard remains');
  }));
  test('actual finish classification, duplicate App settlement and interrupted reload stay zero-finance',()=>withCatalog(()=>memoryScope(({app:newApp})=>{
    const app=newApp();purchaseParent(app);assert.ok(startRecorded(app));reachGo(app);
    const s=app.duel.state,before=normalizeProfile(app.profile);s.stageTimeSec=SUMMIT_TIME_ATTACK.attackTimes.bronze+1;
    s.racePenaltySec=0;s.s=app.duel.raceLength;s.completedLaps=1;
    assert.equal(app.duel._finishStage(),true);assert.equal(s.results.completed,true);assert.equal(s.results.won,false);assert.equal(s.results.medal,null);
    assert.equal(s.results.creditReward,0);assert.deepEqual(protectedProfile(app.profile),protectedProfile(before));
    const settled=JSON.stringify(app.profile);app._settleResult(s.results,s);assert.equal(JSON.stringify(app.profile),settled);
    app.returnToMenu();assert.ok(startRecorded(app,attackIndex(),{},'attack-abandon'));reachGo(app);const pending=normalizeProfile(app.profile);
    const restored=newApp();assert.equal(restored.profile.activeRace,null);assert.equal(restored.interruptedRaceCharge,0);
    assert.deepEqual(protectedProfile(restored.profile),protectedProfile(pending));
    const once=JSON.stringify(restored.profile);restored._recoverInterruptedRace();assert.equal(JSON.stringify(restored.profile),once);
  })));
  test('completed Attack sightings reuse the parent key once across normalized reload without finance',()=>withCatalog(()=>{
    const result=payload({runId:'attack-sighting',ownerPlayerId:'attack-player',playerId:'attack-player',yetiEnabled:true,yetiSeen:true}),
      before=normalizeProfile({...pendingProfile(result),yeti:{sightings:2,settled:['prior:summit-run']}}),
      settled=settleRace(before,result);
    assert.equal(settled.awarded,true);assert.equal(settled.yetiAwarded,true);assert.equal(settled.yetiSightings,3);
    assert.equal(settled.profile.yeti.sightings,3);
    assert.deepEqual(settled.profile.yeti.settled,['prior:summit-run','attack-sighting:summit-run']);
    assert.equal(settled.profile.yeti.roof,undefined,'earning a cosmetic does not equip it');
    assert.deepEqual({...protectedProfile(settled.profile),yeti:before.yeti},protectedProfile(before));
    assert.equal(settled.reward,0);assert.equal(settled.charge,0);assert.equal(settled.policeFineCharge,0);
    assert.ok(Object.values(settled.breakdown).every(value=>value===0));
    assert.equal(settleRace(settled.profile,result).profile,settled.profile);
    const loaded=normalizeProfile(JSON.parse(JSON.stringify(settled.profile))),again=settleRace(loaded,result);
    assert.equal(again.profile,loaded);assert.equal(again.yetiAwarded,undefined);
    assert.equal(again.profile.yeti.sightings,3);assert.deepEqual(again.profile.yeti.settled,settled.profile.yeti.settled);
  }));
  test('Attack sighting admission retains completed, practice, owner and owned-car validation',()=>withCatalog(()=>{
    const result=payload({runId:'attack-guard',ownerPlayerId:'attack-player',playerId:'attack-player',yetiEnabled:true,yetiSeen:true}),
      before=normalizeProfile({...pendingProfile(result),yeti:{sightings:2,settled:['prior:summit-run']}}),
      unowned=Object.keys(CARS).find(car=>CARS[car].price>0&&!before.unlockedCars.includes(car));
    assert.ok(unowned,'fixture must select an actual paid, unowned car');
    for(const extra of [{completed:false},{completed:false,abandoned:true},{practice:true},{qualifying:true},{timeout:true},
      {timeSec:NaN},{laps:2},{mode:'duel'},{mode:'grandprix'},{yetiEnabled:false},{yetiSeen:false},
      {ownerPlayerId:'someone-else'},{playerId:'someone-else'},{ownerPlayerId:''},{car:unowned},{car:'missing'}]) {
      const settled=settleRace(before,{...result,...extra});
      assert.equal(settled.yetiAwarded,undefined,JSON.stringify(extra));
      assert.deepEqual(settled.profile.yeti,before.yeti,JSON.stringify(extra));
      assert.equal(settled.reward,0);assert.equal(settled.profile.credits,before.credits);
      assert.deepEqual(protectedProfile(settled.profile),protectedProfile(before));
    }
  }));
  test('actual App Attack finish forwards the owned sighting once; abandonment and recovery never count',()=>withCatalog(()=>memoryScope(({app:newApp})=>{
    const app=newApp();purchaseParent(app);assert.ok(startRecorded(app,attackIndex(),{},'attack-app-sighting'));reachGo(app);
    const state=app.duel.state;state.yeti.seen=true; // Controlled finish fixture, not native encounter evidence.
    state.stageTimeSec=SUMMIT_TIME_ATTACK.attackTimes.bronze+1;state.racePenaltySec=0;
    state.s=app.duel.raceLength;state.completedLaps=1;
    const before=normalizeProfile(app.profile);assert.equal(app.duel._finishStage(),true);
    assert.equal(state.results.yetiSeen,true);assert.equal(state.results.yetiSightings,1);
    assert.equal(app.profile.yeti.sightings,1);assert.deepEqual(app.profile.yeti.settled,['attack-app-sighting:summit-run']);
    assert.equal(state.results.creditReward,0);
    const {yeti,...unchanged}=protectedProfile(app.profile);assert.deepEqual(unchanged,protectedProfile(before));
    const saved=JSON.stringify(app.profile);app._settleResult(state.results,state);assert.equal(JSON.stringify(app.profile),saved);
    const restored=newApp();assert.equal(restored.profile.yeti.sightings,1);assert.deepEqual(restored.profile.yeti.settled,app.profile.yeti.settled);
    app.returnToMenu();assert.ok(startRecorded(app,attackIndex(),{},'attack-seen-abandon'));reachGo(app);
    app.duel.state.yeti.seen=true;app.returnToMenu();assert.equal(app.profile.yeti.sightings,1);
    assert.deepEqual(app.profile.yeti.settled,['attack-app-sighting:summit-run']);
    assert.ok(startRecorded(app,attackIndex(),{},'attack-seen-recovery'));reachGo(app);app.duel.state.yeti.seen=true;
    const recovered=newApp();assert.equal(recovered.profile.activeRace,null);assert.equal(recovered.interruptedRaceCharge,0);
    assert.equal(recovered.profile.yeti.sightings,1);assert.deepEqual(recovered.profile.yeti.settled,['attack-app-sighting:summit-run']);
    const once=JSON.stringify(recovered.profile);recovered._recoverInterruptedRace();assert.equal(JSON.stringify(recovered.profile),once);
  })));
  test('best medal context uses validated named-player TT rows and existing per-event ghost contract',()=>withCatalog(()=>{
    let board=createLeaderboard();const player={id:'attack-player',name:'Attack Player'};
    const otherDriver=Object.keys(DRIVERS).find(id=>id!=='club');assert.ok(otherDriver);
    const slow=payload({timeSec:SUMMIT_TIME_ATTACK.attackTimes.bronze+1}),fast=payload({driverId:otherDriver,timeSec:SUMMIT_TIME_ATTACK.attackTimes.gold});
    for(const result of [slow,fast]){const added=recordFinish(board,result,player);assert.equal(added.recorded,true);board=added.board;}
    assert.equal(bestSummitAttackTime(board,player.id),fast.timeSec);assert.equal(bestSummitAttackTime(board,'another-player'),null);
    const bad={...board.entries[0],timeSec:.001,eventKey:'summit-time-attack|malformed-context'};
    assert.equal(bestSummitAttackTime({...board,entries:[...board.entries,bad]},player.id),fast.timeSec);
    assert.equal(bestSummitAttackTime(mergeLeaderboards(board),player.id),fast.timeSec);
    const context={...slow,playerId:player.id},recorder=new GhostRecorder(context);
    for(let i=0;i<=12;i++)recorder.observe({mode:'timetrial',status:'racing',playerId:player.id,car:'falcone_f42',
      driverId:'club',stageTimeSec:slow.timeSec*i/12,s:SUMMIT_TIME_ATTACK.lengthU*i/12,lateral:0,headingError:0,speedMph:80,airHeight:0},i===0);
    const record=recorder.finish(slow,{mode:'timetrial',playerId:player.id,car:'falcone_f42',driverId:'club',stageTimeSec:slow.timeSec,
      s:SUMMIT_TIME_ATTACK.lengthU,lateral:0,headingError:0,speedMph:80,airHeight:0},player);
    assert.ok(record,'legal over-bronze TT still creates its real per-event ghost');const stored=storeGhost(createGhostStore(),record);
    assert.equal(stored.saved,true);assert.equal(findGhost(stored.store,player.id,context).eventId,SUMMIT_ATTACK_ID);
    assert.equal(findGhost(stored.store,player.id,{...context,stageIndex:parentIndex()}),null,'parent cannot consume Attack ghost');
  }));
} else {
  // One complete native physics run only. Unit fixtures above never execute here.
  withCatalog(()=>memoryScope(({app:newApp})=>{
    const at=process.argv.indexOf('--output-dir');assert.ok(at>=0&&process.argv[at+1],'--drive needs an evidence output directory');
    const root=fileURLToPath(new URL('../',import.meta.url)),output=resolve(root,process.argv[at+1]),inside=relative(resolve(root,'.evidence'),output);
    assert.ok(inside&&!inside.startsWith('..')&&!isAbsolute(inside),'packet must remain inside this lane evidence junction');mkdirSync(output,{recursive:true});
    const source=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(source.status,0,source.stderr);
    const app=newApp(),parent=process.argv.includes('--parent'),stage=parent?parentIndex():attackIndex();purchaseParent(app);
    const packet={source:source.stdout.trim(),memoryOnlySaves:true,parentBenchmark:parent,passed:false,setup:null,events:[],phases:[],samples:[],failures:[]};
    const persist=()=>writeFileSync(join(output,'summit-attack-drive.json'),JSON.stringify(packet,null,2)+'\n');
    try {
      assert.ok(startRecorded(app,stage));app.autopilot=true;app._scriptedCrashDone=true;useRacingLine(app,.95);
      const d=app.duel,s=d.state;packet.setup={courseId:d.course.def.id,seed:s.seed,courseSeed:d.course.seed,yetiSeed:s.yetiSeed,runId:app.runId,
        car:s.car,driverId:s.driverId,upgrades:{...s.upgrades},tyre:s.tyre,difficulty:s.difficulty,cpuDifficulty:s.cpuDifficulty,
        mode:s.mode,laps:s.lapsTotal,opponents:s.opponents.length,traffic:s.traffic.length,pitStrategy:'no service',lineSkill:.95,fps:120};
      assert.equal(s.seed,1989);assert.equal(s.yetiSeed,3395618052);assert.equal(s.car,'falcone_f42');assert.equal(s.driverId,'club');
      assert.equal(s.tyre,'winter');assert.deepEqual(s.upgrades,upgrades);assert.equal(s.mode,'timetrial');assert.equal(s.lapsTotal,1);
      assert.equal(s.opponents.length,0);assert.equal(s.traffic.length,0);assert.ok(!s.field);assert.ok(s.avalanche&&s.yeti);
      packet.pitServices=[];packet.resetEvents={boundary:0,checkpoint:0};const gallery=d.course.def.galleries.find(row=>row.id==='summit-gallery');assert.ok(gallery);
      let previousPhase=null,lastSecond=-1;const off=d.onChange((state,event)=>{
        packet.events.push({time:state.stageTimeSec,s:state.s,event:structuredClone(event)});
        if(event.boundaryReset)packet.resetEvents.boundary++;
        if(event.checkpointReset)packet.resetEvents.checkpoint++;
        if(event.pitCue==='pit.wrench'||event.pitCue==='pit.go')packet.pitServices.push({time:state.stageTimeSec,s:state.s,cue:event.pitCue});
        if(event.crash||event.boundaryReset||event.checkpointReset)packet.failures.push({time:state.stageTimeSec,s:state.s,event:structuredClone(event)});
      });
      try {
        for(let tick=0;tick<120*900&&['countdown','racing'].includes(s.status);tick++) {
          app.advance(1/120,1/120);
          if(!packet.activeRace&&app.profile.activeRace)packet.activeRace=structuredClone(app.profile.activeRace);
          const phase=s.avalanche?.phase;if(phase!==previousPhase){packet.phases.push({phase,time:s.stageTimeSec,s:s.s,event:structuredClone(s.avalanche)});previousPhase=phase;}
          const surface=d.course.surfaceAt(s.s,s.lateral),second=Math.floor(s.stageTimeSec);
          if(![s.s,s.lateral,s.speedMph,s.stageTimeSec].every(Number.isFinite))throw Error('Nonfinite native state');
          if(s.tyre!=='winter'||s.pit?.phase==='servicing'||s.pit?.phase==='ready')throw Error('Native benchmark changed tyre or used pit service');
          if(s.s>=gallery.start&&s.s<=gallery.end&&(!surface.road||surface.shortcutId==='summit-open-road'||!d.course.tunnelAt(s.s,s.lateral)))
            throw Error('Existing line left the actual Gallery road corridor');
          if(second!==lastSecond){packet.samples.push({time:s.stageTimeSec,s:s.s,lateral:s.lateral,speedMph:s.speedMph,
            status:s.status,phase,shortcut:surface.shortcutId??null,tunnel:d.course.tunnelAt(s.s,s.lateral)?.id??null,
            input:{...s.input},pit:structuredClone(s.pit??null),yeti:structuredClone(s.yeti??null)});lastSecond=second;}
        }
      } finally {off();}
      packet.final={status:s.status,completedLaps:s.completedLaps,majorCrashes:s.majorCrashes,stageCrashes:s.stageCrashes,
        boundaryResets:s.boundaryResets,observedBoundaryResets:packet.resetEvents.boundary,observedCheckpointResets:packet.resetEvents.checkpoint,pit:structuredClone(s.pit??null),
        avalanche:structuredClone(s.avalanche),yeti:structuredClone(s.yeti),result:structuredClone(s.results)};
      assert.equal(s.results?.completed,true);assert.equal(s.completedLaps,1);assert.equal(s.stageCrashes,0);assert.equal(s.boundaryResets,0);
      assert.equal(packet.failures.length,0);assert.equal(packet.resetEvents.boundary,0);assert.equal(packet.resetEvents.checkpoint,0);assert.equal(packet.pitServices.length,0);assert.ok(Number.isFinite(s.results.timeSec)&&s.results.timeSec>0);
      assert.equal(packet.activeRace?.yetiSeed,3395618052);packet.baselineSec=s.results.timeSec;packet.passed=true;
        } catch(error){packet.failures.push({error:String(error?.stack??error)});throw error;}finally{
      const state=app.duel.state;
      packet.lastState={status:state.status,s:state.s,lateral:state.lateral,timeSec:state.stageTimeSec,completedLaps:state.completedLaps,
        majorCrashes:state.majorCrashes,stageCrashes:state.stageCrashes,boundaryResets:state.boundaryResets,observedBoundaryResets:packet.resetEvents?.boundary??0,observedCheckpointResets:packet.resetEvents?.checkpoint??0,
        tyre:state.tyre,pit:structuredClone(state.pit??null),avalanche:structuredClone(state.avalanche??null),yeti:structuredClone(state.yeti??null),result:structuredClone(state.results??null)};
      persist();
    }
    console.log(JSON.stringify({passed:packet.passed,source:packet.source,baselineSec:packet.baselineSec,packet:join(output,'summit-attack-drive.json')}));
  }));
}
