// Real production UI with disposable in-memory careers. Never import this
// entry from production; it cannot read or modify the origin's saved players.
import {createMemoryBackupStore,installIsolatedStorage} from './qa-storage.js';
import {installPerformanceReview} from './performance-review.js';
import archiveFixtureText from './fixtures/saves/07-records-and-ghosts.json?raw';
installIsolatedStorage();
window.__qaPhysicalStorage=window.localStorage;
const qaParams=new URLSearchParams(window.location.search);
if(qaParams.get('memory-backups')==='1'){
  window.__duelQaBackupStore=createMemoryBackupStore(window);
}
if(qaParams.has('career-archive')||qaParams.has('career-archive-missing')){
  // Seed only the disposable QA store before production startup migrates it.
  const fixture=JSON.parse(archiveFixtureText);
  for(const [key,value] of Object.entries(fixture.storage))localStorage.setItem(key,JSON.stringify(value));
  if(qaParams.has('career-archive-missing'))localStorage.setItem('the-duel-archive-pointer-v1',JSON.stringify({version:1,id:'archive-missing'}));
}
if(qaParams.has('career-backup-failure')){
  // Synthetic legacy data and blocked IndexedDB for the startup recovery check.
  // This page's localStorage has already been replaced with an in-memory store.
  localStorage.setItem('the-duel-profile-v1',JSON.stringify({version:1,credits:734,awardedWins:['synthetic-win']}));
  Object.defineProperty(window,'indexedDB',{value:undefined});
}
if(qaParams.has('career-origin-missing')){
  localStorage.setItem('__the_duel_origin_pointer_v1',JSON.stringify({version:1,id:'origin-primary-v1'}));
}
if(qaParams.get('p4-kits-native')==='1'){
  const [{Group,Box3,Vector3,AnimationMixer,Raycaster,LoopOnce},{GLTFLoader}]=await Promise.all([
    import('three'),import('three/addons/loaders/GLTFLoader.js'),
  ]);
  window.P4KitsQa=Object.freeze({Group,Box3,Vector3,AnimationMixer,Raycaster,LoopOnce,GLTFLoader});
}
const {app,refreshRaceSetup}=await import('../src/main.js');
window.__qaApp=app;
if (qaParams.has('night-2-surround-review')) {
  const {startWashSurroundReview, placeWashSurroundReview} = await import('./night-2-wash-review.js');
  window.__qaNight2Surround = Object.freeze({
    start: () => startWashSurroundReview(app), place: () => placeWashSurroundReview(app.duel),
  });
}

const {CARS}=await import('../src/config.js');
const {UPGRADE_TYPES}=await import('../src/progression.js');
// The box closes when anything outside it is pressed, so that it never lies over a menu button the tester wants.
const panel=document.createElement('details');panel.className='qa-temporary-saves';panel.open=true;
document.addEventListener('pointerdown',event=>{if(panel.open&&!panel.contains(event.target))panel.open=false;},true);
panel.style.cssText='position:fixed;left:12px;top:76px;z-index:999;padding:8px 12px;background:#10212cf0;color:white;font:12px/1.5 system-ui;border:1px solid #7198a0;max-width:330px';
const summary=document.createElement('summary');summary.textContent='MENU QA · TEMPORARY SAVES';panel.append(summary);
const note=document.createElement('p');note.textContent='Real menu and garage. Test saves stay in this private tab across reloads and disappear when the tab closes.';panel.append(note);
const fund=document.createElement('button');fund.textContent='Create funded temporary player';fund.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.addPlayer('Menu QA');app.profile={...app.profile,credits:50000};app._saveProfile();
  refreshRaceSetup();fund.disabled=true;panel.open=false;
};panel.append(fund);
const completion=document.createElement('button');completion.textContent='Create one-upgrade-left temporary player';completion.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.addPlayer('Garage Master QA');
  const prerequisites=Object.keys(CARS).filter(key=>!CARS[key].unlockRequirement);
  const upgrades=Object.fromEntries(prerequisites.map(key=>[key,Object.fromEntries(Object.keys(UPGRADE_TYPES).map(type=>[type,3]))]));
  upgrades.titan_monster.tank=2;
  app.profile={...app.profile,credits:50000,unlockedCars:prerequisites,upgrades};app._saveProfile();
  refreshRaceSetup();completion.disabled=true;panel.open=false;
};panel.append(completion);
// For a try by hand of things kept behind switches in the wasteland (Hot Delivery, the Dig): a temporary player who has
// already found the gate, so the menu offers the visit to the Scrapdome.
const gateFound=document.createElement('button');gateFound.textContent='Create temporary player who has found the wasteland';gateFound.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.addPlayer('Wasteland QA');
  app.profile={...app.profile,credits:50000,wasteland:{...app.profile.wasteland,version:1,discoveredGate:true}};app._saveProfile();
  refreshRaceSetup();gateFound.disabled=true;panel.open=false;
};panel.append(gateFound);
// Every course open, the secret ones found from the air included (the reverse and night courses), for a try by hand.
const {COURSE_PRICES}=await import('../src/course-access.js');
const {SECRET_IDS}=await import('../src/heli/map-secrets.js');
const {mapRecordOf,writeMapRecord}=await import('../src/heli/heli-save.js');
const allCourses=document.createElement('button');allCourses.textContent='Create temporary player with every course open';allCourses.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.addPlayer('Every Course QA');
  const map=mapRecordOf(app.profile);
  const written=writeMapRecord({...app.profile,credits:50000,courses:{version:1,unlocked:Object.keys(COURSE_PRICES)}},
    {...map,found:[...new Set([...map.found,...SECRET_IDS])]});
  app.profile=written.profile;app._saveProfile();
  refreshRaceSetup();allCourses.disabled=true;panel.open=false;
};panel.append(allCourses);
if (qaParams.has('road-riders-review')) {
  gateFound.dataset.washPlayer='';
  const {washRiderJob}=await import('../src/world/jobs/wash-riders.js');
  let cancelArrival;
  const encounters=['easy','medium','hard'].map(difficulty=>({id:difficulty,difficulty,label:'Fight at the Wash · '+difficulty}));
  encounters.push({id:'roadblock',difficulty:'easy',label:'Escape the five-car Wash roadblock · easy',count:5,boxIn:true});
  for (const encounter of encounters) {
    const button=document.createElement('button');
    button.dataset.washFight=encounter.id;
    button.textContent=encounter.label;
    button.onclick=()=>{
      cancelArrival?.();
      cancelArrival=null;
      const begin=()=>{
        app.cpuDifficulty=encounter.difficulty;
        const job=washRiderJob({count:encounter.count,boxIn:encounter.boxIn});
        const started=app._startArenaFight({venueId:'scablands',mode:'world-job',opponents:0,job});
        if (started) panel.open=false;
        else note.textContent='Enter the Wasteland yard with the road-riders and story-everburn switches, then choose a fight.';
      };
      if (app.duel.state.status==='menu') {
        if (!gateFound.disabled) gateFound.click();
        app.visitWasteland();
      }
      if (app.isYardHomeActive() || app.duel.state.arena || !app.duel.state.hiddenRoadVisit) return begin();
      // The menu visit plays its normal arrival. Start after its simulation tick has finished.
      cancelArrival=app.duel.onChange(state=>{
        if (app.isYardHomeActive()) {
          cancelArrival?.(); cancelArrival=null;
          queueMicrotask(begin);
        } else if (state.status==='menu') {
          cancelArrival?.(); cancelArrival=null;
        }
      });
    };
    panel.append(button);
  }
}
// For a try by hand of a later job of the Everburn: a temporary player who has found the wasteland, read Hollis's note and
// finished the jobs before it, so the Story Wall offers that job at once.
const night2 = document.createElement('button');
night2.textContent = 'Create temporary player ready for Night 2';
night2.hidden = !app.duel.featureFlags.enabled('story-choices');
night2.onclick = () => {
  if (app.duel.state.status !== 'menu') return;
  let suffix = 1;
  while (app.players.players.some(player => player.name === 'Night 2 QA ' + suffix)) suffix++;
  if (!app.addPlayer('Night 2 QA ' + suffix).ok) return;
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
  app._saveProfile();
  refreshRaceSetup();
  night2.disabled = true;
  panel.open = false;
};
panel.append(night2);
const {EMBER_JOBS}=await import('../src/story/ember-save.js');
const {EMBER_JOB_NAMES}=await import('../src/story/ember-road.js');
for(const index of [1,2,3]){
  const ready=document.createElement('button');ready.textContent=`Create temporary player ready for job ${index+1}: ${EMBER_JOB_NAMES[index]}`;ready.onclick=()=>{
    if(app.duel.state.status!=='menu')return;
    app.addPlayer(`Everburn ${index+1} QA`);
    app.profile={...app.profile,credits:50000,wasteland:{...app.profile.wasteland,version:1,discoveredGate:true},
      story:{version:1,...app.profile.story,ember:{read:true,jobs:EMBER_JOBS.slice(0,index)}}};app._saveProfile();
    refreshRaceSetup();ready.disabled=true;panel.open=false;
  };panel.append(ready);
}
let frozenPaint=0;
const mirror=document.createElement('button');mirror.textContent='Freeze rear-view traffic sample';mirror.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.startCampaign({car:app.getRaceChoices().car,startStage:0,mode:'timetrial',difficulty:'casual'});app.stop();
  const state=app.duel.state,traffic=state.traffic[0];
  Object.assign(state,{status:'racing',paused:false,s:180,prevS:180,lateral:0,speedMph:60,countdown:0,rival:null});
  if(traffic)Object.assign(traffic,{s:168,lateral:2.5,dir:1,speedMph:0});
  state.traffic=traffic?[traffic]:[];state.police.pursuit=null;panel.open=false;
  const paint=()=>{if(app.running||app.duel.state!==state)return;app.onFrame?.(state);frozenPaint=requestAnimationFrame(paint);};
  cancelAnimationFrame(frozenPaint);frozenPaint=requestAnimationFrame(paint);
};panel.append(mirror);
const resume=document.createElement('button');resume.textContent='Return to menu and resume test';resume.onclick=()=>{cancelAnimationFrame(frozenPaint);app.returnToMenu();app.start();refreshRaceSetup();};panel.append(resume);
const drive=document.createElement('button');drive.textContent='Start driving performance sample';drive.onclick=()=>{
  if(app.duel.state.status!=='menu')return;
  app.startCampaign({car:app.getRaceChoices().car,startStage:0,mode:'timetrial',difficulty:'casual'});
  app.autopilot=true;app._scriptedCrashDone=true;app.start();panel.open=false;
};panel.append(drive);
const performanceReview=installPerformanceReview(app,document.querySelector('#view3d'),panel,{hudSource:'production HUD with active rear-view mirror'});
if(import.meta.hot)import.meta.hot.dispose(()=>performanceReview.dispose());
document.body.append(panel);
