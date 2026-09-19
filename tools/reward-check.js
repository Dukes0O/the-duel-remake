// Developer-only fixture. Replace storage before importing the real UI so no
// career, wallet, leaderboard, preferences or interrupted-race record is touched.
import {installIsolatedStorage} from './qa-storage.js';
const memory=installIsolatedStorage();
const {app,refreshRaceSetup}=await import('../src/main.js');
const controls=document.createElement('details');controls.open=true;
controls.style.cssText='position:fixed;left:12px;bottom:8px;z-index:999;max-width:calc(100vw - 24px);padding:8px;background:#0c151a;color:white';
const summary=document.createElement('summary');summary.textContent='Test fixtures · temporary data';summary.style.cursor='pointer';controls.append(summary);
const nav=document.createElement('nav');
nav.style.cssText='display:flex;gap:6px;padding:8px;background:#0c151a;color:white;flex-wrap:wrap';
nav.setAttribute('aria-label','Temporary reward review');
const label=document.createElement('span');label.textContent='TEST ONLY · no saved data';nav.append(label);
function finish({manual=false,hits=0,time=110,escape=true}={}){
  app.returnToMenu();app.startCampaign({car:'falcone_f42',startStage:0,cpuDifficulty:'medium',difficulty:manual?'pro':'casual',mode:'timetrial',seed:1989});
  app.onFrame(app.duel.state);
  const s=app.duel.state;
  Object.assign(s,{status:'racing',rival:null,traffic:[],stageTimeSec:time,s:app.duel.raceLength,completedLaps:2,lap:2,currentLap:2,lapTimes:[time/2,time/2],majorCrashes:hits,stageCrashes:hits,lives:5-hits,damageZones:{front:hits,rear:0,left:0,right:0}});
  s.police.pursuit=escape?{active:true,caught:false}:null;
  app.duel._finishStage();
  app.onFrame(app.duel.state);
}
function busted(){
  app.returnToMenu();app.profile.credits=2000;app._saveProfile();
  app.startCampaign({car:'falcone_f42',startStage:0,cpuDifficulty:'medium',difficulty:'casual'});
  app.onFrame(app.duel.state);
  const s=app.duel.state;Object.assign(s,{status:'racing',stageTimeSec:10,speedMph:110,traffic:[],rival:null});
  app._markActiveRace(s);app.duel._ticket({limitMph:55});app.onFrame(s);
}
function playerSettingsFixture(){
  app.returnToMenu();
  for(const[name,settings,route,lighting,ghost]of[
    ['Alpine Manual',{startStage:1,car:'stuttgart_959s',mode:'timetrial',difficulty:'pro',cpuDifficulty:'medium'},'route_b','golden',false],
    ['Harbor Auto',{startStage:2,car:'falcone_f42',mode:'duel',difficulty:'casual',cpuDifficulty:'hard'},'route_c','overcast',true],
  ]){const player=app.players.players.find(p=>p.name===name);if(player)app.selectPlayer(player.id);else app.addPlayer(name);app.setRaceSettings(settings);app.setRouteVariant(route);app.setLightingMood(lighting);app.setGhostEnabled(ghost);}
  app.selectPlayer(app.players.players.find(p=>p.name==='Alpine Manual').id);refreshRaceSetup();
}
function heritagePurchaseFixture(){
  app.returnToMenu();app.profile={...app.profile,credits:2000};app._saveProfile();
  app.setRaceSettings({startStage:0,car:'falcone_f42',mode:'timetrial',difficulty:'casual',cpuDifficulty:'medium'});refreshRaceSetup();
}
for(const [name,callback]of[
  ['Medium baseline',()=>finish()],['Medium improvement',()=>finish({time:100})],
  ['Manual clean escape',()=>finish({manual:true})],['Manual damaged win',()=>finish({manual:true,hits:3,time:100})],
  ['Busted · 2,000 CR fixture',()=>busted()],
  ['Two player setups',()=>playerSettingsFixture()],
  ['Heritage purchase · 2,000 CR',()=>heritagePurchaseFixture()],
  ['Return to menu',()=>app.returnToMenu()],
]){const button=document.createElement('button');button.textContent=name;button.onclick=()=>{controls.open=false;callback();};button.style.cssText='padding:8px;background:#263941;color:white;border:1px solid #7e969d;cursor:pointer';nav.append(button);}
controls.append(nav);document.body.append(controls);
