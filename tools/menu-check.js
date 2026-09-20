// Real production UI with disposable in-memory careers. Never import this
// entry from production; it cannot read or modify the origin's saved players.
import {installIsolatedStorage} from './qa-storage.js';
import {installPerformanceReview} from './performance-review.js';
installIsolatedStorage();
const {app,refreshRaceSetup}=await import('../src/main.js');
const {CARS}=await import('../src/config.js');
const {UPGRADE_TYPES}=await import('../src/progression.js');
const panel=document.createElement('details');panel.open=true;
panel.style.cssText='position:fixed;left:12px;top:76px;z-index:999;padding:8px 12px;background:#10212cf0;color:white;font:12px/1.5 system-ui;border:1px solid #7198a0;max-width:330px';
const summary=document.createElement('summary');summary.textContent='MENU QA · TEMPORARY SAVES';panel.append(summary);
const note=document.createElement('p');note.textContent='Real menu and garage. Reload clears these test players, purchases and settings.';panel.append(note);
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
