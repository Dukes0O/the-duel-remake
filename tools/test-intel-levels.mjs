import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeIntel,intelLevel,recordIntelLap,recordIntelFinish,purchaseIntel,INTEL_PRICES} from '../src/intel-levels.js';
const id='panorama-ridge',owned={owned:true};
const profile=()=>({version:2,credits:1500,other:{keep:'exact'}});
const lap=(runId,n)=>({runId,lap:n,valid:true});
const finish=(position,extra={})=>({mode:'grandprix',completed:true,position,fieldSize:8,timeSec:100,laps:3,...extra});
const freeze=value=>{Object.freeze(value);for(const item of Object.values(value))if(item&&typeof item==='object')freeze(item);return value;};

test('ownership grants the map without adding any field to old profiles',()=>{
 const p=freeze(profile()),bytes=JSON.stringify(p);
 assert.equal(intelLevel(p,id,owned),1);assert.equal(intelLevel(p,id),0);
 assert.equal(JSON.stringify(p),bytes);assert.equal(Object.hasOwn(p,'intel'),false);
 assert.deepEqual(normalizeIntel(),{version:1,events:{}});
});
test('three distinct valid native laps earn notes per event and profile, idempotently',()=>{
 const first=freeze(profile());let p=recordIntelLap(first,id,lap('run-a',1),owned);
 assert.equal(p.intel.events[id].laps,1);assert.equal(intelLevel(p,id,owned),1);
 assert.equal(recordIntelLap(p,id,lap('run-a',1),owned),p);
 p=recordIntelLap(p,id,lap('run-a',2),owned);p=recordIntelLap(p,id,lap('run-b',1),owned);
 assert.equal(intelLevel(p,id,owned),2);assert.equal(p.intel.events[id].laps,3);
 assert.equal(recordIntelLap(p,id,lap('run-c',1),owned),p,'saturated progress needs no growing receipt history');
 assert.equal(intelLevel(first,id,owned),1);assert.equal(intelLevel(p,'harbour-lights',owned),1);
 assert.equal(intelLevel(profile(),id,owned),1);
 for(const receipt of [{},lap('',1),lap('run-x',0),{...lap('run-x',1),valid:false}])assert.equal(recordIntelLap(first,id,receipt,owned),first);
 assert.equal(recordIntelLap(first,id,lap('run-x',1)),first,'unowned tracks earn nothing');
});
test('only validated completed explicit positions earn telemetry or the reference ghost',()=>{
 const p=freeze(profile());
 for(const [position,level] of [[8,1],[6,1],[5,3],[4,3],[3,4],[2,4],[1,4]]){
  const next=recordIntelFinish(p,id,finish(position),{...owned,validated:true});
  assert.equal(intelLevel(next,id,owned),level);
  assert.equal(recordIntelFinish(next,id,finish(position),{...owned,validated:true}),next);
 }
 for(const bad of [finish(0),finish(9),finish(1,{completed:false}),finish(1,{timeSec:0}),finish(1,{laps:0}),finish(1,{mode:'timetrial'}),finish(undefined)])
  assert.equal(recordIntelFinish(p,id,bad,{...owned,validated:true}),p);
 assert.equal(recordIntelFinish(p,id,finish(1),owned),p,'structural result alone bypasses no native finish validation');
});
test('stated purchases debit once, include lower levels and never consume other player data',()=>{
 assert.deepEqual(INTEL_PRICES,{3:400,4:800});const p=freeze(profile());
 const bought=purchaseIntel(p,id,3,owned);assert.ok(bought.ok&&bought.changed);assert.equal(bought.cost,400);assert.equal(bought.profile.credits,1100);assert.equal(intelLevel(bought.profile,id,owned),3);
 assert.equal(bought.profile.other,p.other);assert.equal(p.credits,1500);
 const again=purchaseIntel(bought.profile,id,3,owned);assert.ok(again.ok&&!again.changed);assert.equal(again.cost,0);assert.equal(again.profile,bought.profile);
 const ghost=purchaseIntel(p,id,4,owned);assert.equal(ghost.cost,800);assert.equal(ghost.profile.credits,700);assert.equal(intelLevel(ghost.profile,id,owned),4);
 assert.equal(purchaseIntel(ghost.profile,id,3,owned).cost,0);
 const earned=recordIntelFinish(p,id,finish(1),{...owned,validated:true});assert.equal(purchaseIntel(earned,id,4,owned).cost,0);
});
test('invalid purchases and insufficient wallets are exact no-ops',()=>{
 for(const [p,event,level,options] of [[profile(),id,2,owned],[profile(),id,5,owned],[profile(),'__proto__',3,owned],[profile(),id,3,{}],[{...profile(),credits:399},id,3,owned],[{...profile(),credits:799},id,4,owned],[{...profile(),credits:NaN},id,3,owned]]){
  freeze(p);const r=purchaseIntel(p,event,level,options);assert.equal(r.ok,false);assert.equal(r.cost,0);assert.equal(r.profile,p);
 }
});
test('normalization and each update preserve additive fields and future versions',()=>{
 const p=freeze({...profile(),intel:{version:1,extra:{keep:1},events:{[id]:{level:3,laps:1,lapKeys:['old'],extra:'keep'},'future-event':{level:4,laps:3,unknown:'exact'}}}});
 const n=normalizeIntel(p.intel);assert.deepEqual(n.extra,{keep:1});assert.equal(n.events[id].extra,'keep');assert.deepEqual(n.events['future-event'],p.intel.events['future-event']);
 const next=recordIntelLap(p,id,lap('run',1),owned);assert.equal(next.intel.events[id].extra,'keep');assert.equal(next.intel.events['future-event'],p.intel.events['future-event']);
 const future=freeze({...profile(),intel:{version:7,opaque:[1,2,3]}});assert.equal(normalizeIntel(future.intel),future.intel);
 assert.equal(recordIntelLap(future,id,lap('run',1),owned),future);assert.equal(recordIntelFinish(future,id,finish(1),{...owned,validated:true}),future);assert.equal(purchaseIntel(future,id,4,owned).profile,future);
});


test('escaped lap receipt IDs cannot lose their duplicate guard on normalize or repeat',()=>{
 const p=freeze(profile()),receipt=lap('"'.repeat(70),1);
 const once=recordIntelLap(p,id,receipt,owned);assert.equal(once.intel.events[id].laps,1);
 assert.equal(recordIntelLap(once,id,receipt,owned),once);
 const loaded={...once,intel:normalizeIntel(once.intel)};
 assert.equal(recordIntelLap(loaded,id,receipt,owned),loaded);
 const oversized=lap('"'.repeat(100),1);
 assert.equal(recordIntelLap(p,id,oversized,owned),p,'an unretainable encoded key never counts');
});
test('native ownership and finish validation require explicit boolean proof',()=>{
 const p=freeze(profile());for(const proof of ['false','true',1,{},null]){
  assert.equal(intelLevel(p,id,{owned:proof}),0);
  assert.equal(recordIntelLap(p,id,lap('run',1),{owned:proof}),p);
  assert.equal(recordIntelFinish(p,id,finish(1),{owned:proof,validated:true}),p);
  assert.equal(recordIntelFinish(p,id,finish(1),{owned:true,validated:proof}),p);
  assert.equal(purchaseIntel(p,id,3,{owned:proof}).profile,p);
 }
});


test('profile normalization validates only present intel and native settlement grants prospective GP levels once',async()=>{
 const {createProfile,normalizeProfile,settleRace}=await import('../src/progression.js');
 const old=createProfile();assert.equal(Object.hasOwn(normalizeProfile(old),'intel'),false);
 const bad=normalizeProfile({...old,intel:{version:1,events:{'pacific-canyon':{laps:99,level:99,lapKeys:['a','a']}}}});
 assert.equal(bad.intel.events['pacific-canyon'].laps,3);assert.equal(bad.intel.events['pacific-canyon'].level,4);
 const base={runId:'intel-native-gp',stageIndex:0,mode:'grandprix',grandPrixCareerEnabled:true,intelEnabled:true,completed:true,won:false,
  position:5,fieldSize:8,laps:3,seed:1989,timeSec:300,car:'falcone_f42',driverId:'club',difficulty:'casual',cpuDifficulty:'medium',clean:false};
 const earned=settleRace(old,base);assert.ok(earned.awarded);assert.equal(intelLevel(earned.profile,'pacific-canyon',{owned:true}),3);
 assert.equal(settleRace(earned.profile,base).profile,earned.profile);
 for(const extra of [{intelEnabled:false},{mode:'duel',won:true},{qualifying:true},{position:9}]){
  const r=settleRace(old,{...base,...extra});assert.equal(Object.hasOwn(r.profile,'intel'),false);
 }
 const podium=settleRace(old,{...base,position:3});assert.equal(intelLevel(podium.profile,'pacific-canyon',{owned:true}),4);
});

test('native menu intel purchase uses current named owner and cannot debit during a race',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');const {createFeatureFlags}=await import('../src/feature-flags.js');
 await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true}});
  app.profile={...app.profile,credits:1500};app._saveProfile();
  const first=app.buyIntel('pacific-canyon',3);assert.ok(first.ok);assert.equal(first.cost,400);assert.equal(app.profile.credits,1100);
  assert.equal(app.buyIntel('pacific-canyon',3).cost,0);assert.equal(app.profile.credits,1100);
  assert.equal(app.buyIntel('panorama-ridge',4).ok,false,'unowned course cannot charge');
  assert.ok(app.startCampaign({startStage:0,car:'falcone_f42',mode:'timetrial',seed:1989}));
  assert.equal(app.buyIntel('pacific-canyon',4).ok,false);assert.equal(app.profile.credits,1100);
  app.returnToMenu();assert.ok(app.addPlayer('Intel second player').ok);assert.equal(app.getIntelLevel('pacific-canyon'),1);
 });
});

test('actual native three-lap GP earns distinct laps and its real placing without replay credits',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');const {createFeatureFlags}=await import('../src/feature-flags.js');
 const {COURSE}=await import('../src/config.js');const {useRacingLine}=await import('./track-script-drive.mjs');
 await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true,'grand-prix-career':true}});
  app.profile={...app.profile,credits:50000};app._saveProfile();assert.ok(app.purchaseCourse('panorama-ridge').ok);
  assert.ok(app.startCampaign({startStage:COURSE.findIndex(c=>c.id==='panorama-ridge'),car:'stuttgart_959s',mode:'grandprix',fieldSize:7,fieldSeed:1000,seed:1989,cpuDifficulty:'easy'}));
  app.autopilot=true;useRacingLine(app,.95);let ticks=0;
  while(!['stage_result','gameover','complete'].includes(app.duel.state.status)&&ticks++<120*420)app.advance(1/120);
  const s=app.duel.state;assert.ok(s.results.completed,'real native GP finishes');assert.equal(s.completedLaps,3);
  const row=app.profile.intel.events['panorama-ridge'];assert.equal(row.laps,3);assert.equal(row.lapKeys.length,3);
  assert.equal(app.getIntelLevel('panorama-ridge'),s.results.position<=3?4:s.results.position<=5?3:2);
  const before=JSON.stringify(app.profile);app._recordIntelLap({lapCompleted:3,lapTimeSec:s.lapTimes.at(-1),assisted:false},s);
  assert.equal(JSON.stringify(app.profile),before,'duplicate receipt and completed-state callback cannot write');
 });
});

test('Team Room intel gates hide notes and sector data while keeping the actual map and prices',async()=>{
 const screen=await import('../src/screen-team-room.js');
 const {Course}=await import('../src/course.js');
 const {COURSE}=await import('../src/config.js');
 const {referenceLap}=await import('../src/reference-laps.js');
 const {buildTrackDossier}=await import('../src/track-analysis.js');
 const reference=referenceLap(id,'fixed');
 const dossier=buildTrackDossier(new Course(COURSE.find(c=>c.id===id),reference.seed),{route:'fixed',reference});
 const before=JSON.stringify(dossier);
 const one=screen.teamRoomMarkup({...dossier,intelLevel:1,canBuyIntel:true});
 assert.match(one,/Track map/);assert.match(one,/Drive 3 laps/);
 assert.doesNotMatch(one,/SECTOR 1/);
 assert.match(one,/data-team-buy="3"[^>]*>[^<]*400 credits/);
 assert.match(one,/data-team-buy="4"[^>]*>[^<]*800 credits/);
 assert.equal(typeof screen.engineerMarkup,'function');
 const secret={kind:'corner',engineer:{brakeBoard:150,gear:3,targetKph:88,line:'secret line',note:'secret advice'}};
 const locked=screen.engineerMarkup(secret,{intelLevel:1});
 assert.doesNotMatch(locked,/secret|150 m|88 km/);
 assert.match(screen.engineerMarkup(secret,{intelLevel:2}),/secret line/);
 assert.match(screen.telemetryMarkup({...dossier,intelLevel:2}),/Finish in the top 5/);
 assert.doesNotMatch(screen.teamRoomMarkup({...dossier,intelLevel:3}),/data-team-buy="3"/);
 assert.match(screen.teamRoomMarkup({...dossier,intelLevel:3}),/SECTOR 1/);
 assert.doesNotMatch(screen.teamRoomMarkup({...dossier,intelLevel:4}),/data-team-buy=/);
 assert.equal(JSON.stringify(dossier),before,'rendering never mutates track/reference data');
});
test('Team Room purchases are disabled outside the menu and feedback is escaped',async()=>{
 const {teamRoomMarkup}=await import('../src/screen-team-room.js');
 const {Course}=await import('../src/course.js');const {COURSE}=await import('../src/config.js');
 const {referenceLap}=await import('../src/reference-laps.js');const {buildTrackDossier}=await import('../src/track-analysis.js');
 const reference=referenceLap(id,'fixed'),dossier=buildTrackDossier(new Course(COURSE.find(c=>c.id===id),reference.seed),{route:'fixed',reference});
 const html=teamRoomMarkup({...dossier,intelLevel:1,canBuyIntel:false,intelMessage:'<img src=x onerror=bad>'});
 assert.match(html,/data-team-buy="3"[^>]*disabled/);assert.match(html,/Return to the menu/);
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
});

test('reference ghost poses retain only the selected actual lap and reject absent native pose fields',async()=>{
 const recipe=await import('./build-reference-laps.mjs');
 assert.equal(typeof recipe.referencePoseSamples,'function');
 const length=100,trace=Array.from({length:61},(_,i)=>{const s=i*5,lap=Math.min(2,Math.floor(s/100));
  return {s,t:s<=100?s/10:s<=200?10+(s-100)*.08:18+(s-200)*.09,mph:40,
   lateral:s/100,heading:.2,airHeight:0,groundHeight:-3+s/100,terrainPitch:.01,terrainRoll:-.02,tumble:false};});
 const run={length,trace,lapTimes:[10,8,9],completedLaps:3,assistedLaps:[false,false,false]};
 const selected=recipe.selectReferenceLap(run),before=JSON.stringify(run);
 const samples=recipe.referencePoseSamples(selected,trace);
 assert.equal(samples[0][0],0);assert.equal(samples.at(-1)[0],8000);
 assert.equal(samples[0][1],0);assert.equal(samples.at(-1)[1],10000);
 assert.equal(samples[0][2],100);assert.equal(samples.at(-1)[2],200);
 assert.equal(samples[0][7],-200);assert.equal(samples.at(-1)[7],-100);
 assert.ok(samples.every(r=>r.length===11&&r[3]===2000&&r[8]===100&&r[9]===-200));
 assert.equal(JSON.stringify(run),before);
 assert.throws(()=>recipe.referencePoseSamples(selected,trace.map(r=>({...r,lateral:undefined}))),/native pose/i);
});
test('adding reference poses never replaces the stored lap or attaches a different timing or trace',async()=>{
 const recipe=await import('./build-reference-laps.mjs');
 assert.equal(typeof recipe.retainReferencePoses,'function');
 const old={eventId:id,route:'fixed',seed:1989,car:'stuttgart_959s',driver:'club',cpu:'medium',fixtureVersion:1,
  courseFingerprint:'actual-fingerprint',lapMs:8000,sectorMs:[2000,3000,3000],trace:[[0,80],[100,80]],corners:[],extra:{keep:1}};
 const poses=Array.from({length:12},(_,i)=>[Math.round(i*8000/11),Math.round(i*10000/11),0,0,0,400,0,-200,0,0,7]);
 const rebuilt={...old,poseSamples:poses},before=JSON.stringify(old);
 const accepted=recipe.retainReferencePoses(old,rebuilt);
 assert.ok(accepted.attached);assert.deepEqual(accepted.record,{...old,poseSamples:poses});assert.equal(JSON.stringify(old),before);
 for(const change of [{lapMs:8001},{courseFingerprint:'changed'},{trace:[[0,81],[100,80]]},{seed:42},{poseSamples:undefined}]){
  const result=recipe.retainReferencePoses(old,{...rebuilt,...change});
  assert.equal(result.attached,false);assert.equal(result.record,old);
 }
});

test('bundled team poses reject incomplete clocks, stale roads and mismatched routes without entering personal storage',async()=>{
 const refs=await import('../src/reference-laps.js');
 assert.equal(typeof refs.validReferencePoses,'function');
 const poses=Array.from({length:12},(_,i)=>[Math.round(i*8000/11),Math.round(i*10000/11),0,0,0,400,0,-200,0,0,7]);
 const ref={eventId:id,route:'fixed',courseFingerprint:'actual-road',lapMs:8000,poseSamples:poses};
 const context={eventId:id,route:'fixed',courseFingerprint:'actual-road',length:100};
 assert.equal(refs.validReferencePoses(ref,context),true);
 for(const patch of [{route:'route_a'},{courseFingerprint:'old-road'},{length:101},{eventId:'harbour-lights'}])
  assert.equal(refs.validReferencePoses(ref,{...context,...patch}),false);
 for(const samples of [poses.slice(1),poses.slice(0,-1),poses.map((r,i)=>i===5?[...r.slice(0,7),NaN,...r.slice(8)]:r),
  poses.map((r,i)=>i===5?[poses[4][0],...r.slice(1)]:r)])
  assert.equal(refs.validReferencePoses({...ref,poseSamples:samples},context),false);
 assert.equal(refs.validReferencePoses({...ref,poseSamples:undefined},context),false);
});

test('team playback uses the retained native pose, repeats per lap, and cannot replace a personal ghost',async()=>{
 const ghosts=await import('../src/ghost.js');
 assert.equal(typeof ghosts.createTeamGhost,'function');assert.equal(typeof ghosts.sampleTeamGhost,'function');
 const samples=Array.from({length:12},(_,i)=>[Math.round(i*8000/11),Math.round(i*10000/11),100,2000,0,400,0,-200,100,-200,7]);
 const ref={eventId:id,route:'fixed',courseFingerprint:'native-road',lapMs:8000,car:'stuttgart_959s',poseSamples:samples};
 const context={eventId:id,route:'fixed',courseFingerprint:'native-road',length:100,laps:2};
 const record=ghosts.createTeamGhost(ref,context);assert.ok(record);
 const first=ghosts.sampleTeamGhost(record,0);assert.equal(first.s,0);assert.equal(first.lateral,1);
 assert.equal(first.headingError,.2);assert.equal(first.groundHeight,-2);assert.equal(first.terrainPitch,.01);
 assert.equal(ghosts.sampleTeamGhost(record,8).s,100);assert.equal(ghosts.sampleTeamGhost(record,16).s,200);
 assert.equal(ghosts.sampleTeamGhost(record,16.001),null);assert.equal(ghosts.sampleTeamGhost(record,-1),null);
 assert.equal(ghosts.createTeamGhost(ref,{...context,route:'route_a'}),null);
 assert.equal(ghosts.createTeamGhost(ref,{...context,courseFingerprint:'stale'}),null);
 const store=ghosts.createGhostStore(),before=JSON.stringify(store);
 assert.equal(ghosts.storeGhost(store,record).saved,false);assert.equal(JSON.stringify(store),before);
 assert.equal(ghosts.sampleGhost(record,1),null,'personal playback never accepts a team record');
});

test('ghost source choice belongs to the named player, defaults to My best and refuses unavailable team or race changes',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');const {createFeatureFlags}=await import('../src/feature-flags.js');
 await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true}});
  assert.equal(typeof app.getGhostChoice,'function');assert.equal(app.getGhostChoice(),'my-best');
  const original=app.player.id,credits=app.profile.credits;
  assert.equal(app.setGhostChoice('off').ok,true);assert.equal(app.getGhostChoice(),'off');
  assert.equal(app.setGhostChoice('team').ok,false,'no fabricated reference ghost');
  assert.equal(app.profile.credits,credits);
  assert.ok(app.addPlayer('Ghost choice second').ok);assert.equal(app.getGhostChoice(),'my-best');
  assert.ok(app.selectPlayer(original));assert.equal(app.getGhostChoice(),'off');
  assert.ok(app.startCampaign({startStage:0,car:'falcone_f42',mode:'timetrial',seed:1989}));
  const before=JSON.stringify(app.profile);assert.equal(app.setGhostChoice('my-best').ok,false);assert.equal(JSON.stringify(app.profile),before);
 });
});

test('the existing personal ghost toggle remains effective after introducing source choice',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');const {createFeatureFlags}=await import('../src/feature-flags.js');
 await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true}});
  app.setGhostEnabled(false);assert.equal(app.getGhostChoice(),'off');
  app.setGhostEnabled(true);assert.equal(app.getGhostChoice(),'my-best');
 });
});

test('actual App time-trial setup keeps team playback separate from personal recording and storage',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');
 const {createFeatureFlags}=await import('../src/feature-flags.js');
 const {createTeamGhost}=await import('../src/ghost.js');
 await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true}});
  app.profile={...app.profile,credits:1500};app._saveProfile();assert.ok(app.buyIntel('pacific-canyon',4).ok);
  const length=app.getMenuCourse(0).length,lapMs=80000;
  // Synthetic sampler unit data; this is not a generated native reference or a shipped asset.
  const samples=Array.from({length:12},(_,i)=>[Math.round(i*lapMs/11),Math.round(i*length*100/11),0,0,0,400,0,0,0,0,7]);
  const record=createTeamGhost({eventId:'pacific-canyon',route:'route_a',courseFingerprint:'unit-road',lapMs,car:'stuttgart_959s',poseSamples:samples},
   {eventId:'pacific-canyon',route:'route_a',courseFingerprint:'unit-road',length,laps:2});
  assert.ok(record);app.getTeamGhostRecord=()=>record;
  assert.ok(app.setGhostChoice('team',{mode:'timetrial',startStage:0}).ok);
  const before=JSON.stringify(app.ghosts);
  assert.ok(app.startCampaign({startStage:0,car:'falcone_f42',mode:'timetrial',seed:1989}));
  assert.equal(app.ghostRecord,record);assert.ok(app.ghostRecorder,'player recording stays independent');
  app._updateGhost({...app.duel.state,status:'racing',stageTimeSec:1,racePenaltySec:0});
  assert.equal(app.ghostPose.playerId,'team-reference');assert.equal(app.ghostPose.car,'stuttgart_959s');
  assert.equal(JSON.stringify(app.ghosts),before,'team playback never updates personal records or usage timestamps');
 });
});

test('native references without terrain-attitude state keep the existing seven-column pose form',async()=>{
 const recipe=await import('./build-reference-laps.mjs'),refs=await import('../src/reference-laps.js');
 const trace=Array.from({length:61},(_,i)=>({s:i*5,t:i*.5,mph:40,lateral:.25,heading:.1,airHeight:0,
  groundHeight:null,terrainPitch:null,terrainRoll:null,tumble:false}));
 const selected=recipe.selectReferenceLap({length:100,trace,lapTimes:[10,10,10],completedLaps:3,assistedLaps:[]});
 const samples=recipe.referencePoseSamples(selected,trace);
 assert.ok(samples.every(r=>r.length===7),'absent native terrain pose is not fabricated as zero');
 const ref={eventId:id,route:'fixed',courseFingerprint:'native-road',lapMs:10000,poseSamples:samples};
 assert.equal(refs.validReferencePoses(ref,{eventId:id,route:'fixed',courseFingerprint:'native-road',length:100}),true);
});

test('actual bundled team reference starts and advances through App without changing personal ghosts',async()=>{
 const {withReferenceApp}=await import('./build-reference-laps.mjs');
 const {createFeatureFlags}=await import('../src/feature-flags.js');
 const {COURSE}=await import('../src/config.js');
 const {referenceLap}=await import('../src/reference-laps.js');
 for(const eventId of ['pacific-canyon','panorama-ridge'])await withReferenceApp(async app=>{
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true}});
  app.profile={...app.profile,credits:1500,courses:{version:1,unlocked:COURSE.map(course=>course.id)}};app._saveProfile();
  const startStage=COURSE.findIndex(course=>course.id===eventId);assert.ok(startStage>=0);
  const options={startStage,mode:'timetrial',car:'falcone_f42',seed:1989};
  assert.ok(app.buyIntel(eventId,4).ok);assert.equal(app.profile.credits,700);
  const record=app.getTeamGhostRecord(options),ref=referenceLap(eventId,eventId==='pacific-canyon'?'route_a':'fixed');
  assert.ok(record,'actual current road accepts its native bundled reference');
  assert.equal(record.samples,ref.poseSamples);assert.equal(record.timeSec,ref.lapMs/1000);
  assert.ok(app.setGhostChoice('team',options).ok);
  const personal=JSON.stringify(app.ghosts);assert.ok(app.startCampaign(options));
  assert.ok(app.ghostRecord.teamReference);assert.ok(app.ghostRecorder);
  app.autopilot=true;for(let frame=0;frame<300;frame++)app.advance(1/30,1/30);
  assert.equal(app.duel.state.status,'racing');assert.ok(app.duel.state.s>0);
  assert.ok(app.ghostPose);assert.equal(app.ghostPose.playerId,'team-reference');assert.ok(app.ghostPose.s>0);
  assert.equal(JSON.stringify(app.ghosts),personal,'real team playback cannot replace or mark personal recordings used');
  assert.equal(app.profile.credits,700,'playback does not buy intel twice');
 });
});