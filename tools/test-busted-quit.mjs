import assert from 'node:assert/strict';
import {ownTestCourses} from './career-fixture.mjs';
import {readFile} from 'node:fs/promises';
import {App} from '../src/app.js';
import {COURSE,POLICE} from '../src/config.js';
import {PLAYERS_KEY,loadPlayers,activePlayer} from '../src/progression.js';

let checks=0;const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
globalThis.localStorage=storage;
const chase=COURSE.findIndex(stage=>stage.kind==='chase');
function start({credits=2000,cpu='medium',manual=false,stage=0}={}){
  memory.clear();const app=ownTestCourses(new App());app.profile.credits=credits;
  if(stage===chase)app.profile.unlockedCars.push('banshee_muscle');
  app._saveProfile();app.startCampaign({startStage:stage,cpuDifficulty:cpu,difficulty:manual?'pro':'casual'});app.advance(4);
  app.duel.state.traffic=[];app.duel.state.rival=null;return app;
}
function bust(app){const s=app.duel.state;s.speedMph=110;app.duel._ticket({limitMph:55});return s.police.ticket;}
const savedBalance=()=>activePlayer(loadPlayers()).profile.credits;

for(const cpu of ['easy','medium','hard'])for(const manual of [false,true]){
  const app=start({cpu,manual}),s=app.duel.state,t=bust(app);
  eq(s.status,'ticket');eq(t.creditCharge,0,'catch cannot debit banked credits');
  eq(app.profile.credits,2000);eq(savedBalance(),2000,'bank remains intact before acknowledgement or quit');
  eq(t.pendingFine,150);eq(t.pendingFineTotal,150);eq(activePlayer(loadPlayers()).profile.activeRace.pendingPoliceFines,150,'pending fine persists separately from bank');
  app.duel.emit({ticket:t});app.duel._ticket({limitMph:55});eq(app.profile.credits,2000,'duplicate event or catch call cannot accrue again');
  eq(app.profile.activeRace.pendingPoliceFineCount,1,'duplicate event cannot grow pending fines');
  eq(s.racePenaltySec,POLICE.ticketPenaltySec,'duplicate catch cannot add time twice');
  s.score=1200;s.nearMisses=3;
  eq(app.requestNavigation('menu'),true);eq(s.status,'menu','one click leaves the Busted screen immediately');
  eq(app.profile.credits,2000,'immediate quit discards current earnings without touching bank');
  eq(app.pendingNavigation,undefined,'no confirmation state remains');
  eq(app.requestNavigation('menu'),true);app.returnToMenu();app.duel.emit({ticket:t});eq(app.profile.credits,2000,'repeated exit and late ticket cannot change the bank');
  eq(new App().profile.credits,2000,'reload after quit preserves banked credits');
  eq(app.profile.history.length,1,'police fine does not pretend to be an extra race');
  eq(app.profile.history[0].abandoned,true);eq(app.profile.history[0].charge,0);eq(app.profile.history[0].reward,0);eq(app.profile.activeRace,null);
  eq(app.profile.milestones,[]);eq(app.profile.personalBests,{});
  eq(app.leaderboard.entries.length,0);eq(app.ghosts.records.length,0);
}
{
  const app=start(),t=bust(app);app.duel.ackTicket();eq(app.profile.credits,2000,'continuing cannot debit the bank');
  eq(app.requestNavigation('restart'),true);eq(app.duel.state.status,'countdown','one click starts a fresh countdown');eq(app.profile.credits,2000,'restart after a catch discards pending fine and preserves bank');
  eq(app.duel.state.police.ticketCount,0,'new run resets the catch counter');
  app.advance(4);bust(app);eq(app.profile.credits,2000,'catch in a new run still preserves banked credits');
  app._settlePoliceTicket(t,app.duel.state);eq(app.profile.credits,2000,'previous-run ticket cannot fine the new race');
}
{
  const app=start({stage:chase});bust(app);app.duel.ackTicket();bust(app);
  eq(app.duel.state.police.ticketCount,2);eq(app.duel.state.police.pendingFines,300);eq(app.profile.credits,2000,'separate chase catches accrue only against future earnings');
  eq(app.duel.state.racePenaltySec,24,'existing pursuit time penalties remain');
  const restored=new App();eq(restored.profile.credits,2000,'reload discards both pending fines and forfeits interrupted earnings');
  eq(new App().profile.credits,2000,'second reload has no further debit');
  app.duel.ackTicket();bust(app);eq(app.profile.credits,2000,'stale race cannot fine a race already settled on reload');
}
{
  const app=start({stage:chase,cpu:'hard'}),s=app.duel.state,events=[];
  app.duel.onChange((_s,event)=>{if(event.ticket)events.push('ticket');if(event.stageResult)events.push('result');});
  s.stageTimeSec=s.timeLimitSec-1;bust(app);
  eq(events,['ticket','result'],'deadline-causing catch accrues before genuine loss settles');
  eq(s.status,'stage_result');eq(s.results.timeout,true);eq(s.results.policeFineCharge,0);
  eq(s.results.creditCharge,750);eq(app.profile.credits,1250,'deadline catch retains only the existing genuine loss charge');
  app.duel.emit({ticket:s.police.ticket});app.duel.emit({stageResult:s.results});app.returnToMenu();
  eq(app.profile.credits,1250,'result dismissal and duplicate events cannot double-charge');
}
for(const credits of [0,80,150,200]){
  const app=start({credits});bust(app);eq(app.profile.credits,credits);
  eq(app.duel.state.police.ticket.creditCharge,0);
  eq(app.requestNavigation('menu'),true);eq(app.duel.state.status,'menu');eq(app.profile.credits,credits,'quit and pending fine never reduce the bank');
  eq(new App().profile.credits,credits);
}
{
  const app=start(),s=app.duel.state;s.police.pursuit=app.duel._newPursuit(10);s.speedMph=0;app.duel._police(1/120);
  eq(s.status,'ticket','physical pursuit catch uses the same settlement path');eq(app.profile.credits,2000);
  const ticket=s.police.ticket;app.returnToMenu();const originalPlayer=app.player.id;app.addPlayer('Another driver');
  app._settlePoliceTicket(ticket,s);eq(app.profile.credits,0,'late tickets cannot debit another player');
  app.selectPlayer(originalPlayer);eq(app.profile.credits,2000,'original driver keeps all banked credits');
}
{
  const app=start();globalThis.localStorage={getItem:storage.getItem,setItem(){throw Error('storage full');}};
  bust(app);eq(app.profile.credits,2000);eq(app.profileSaved,false,'failed persistence is exposed as session-only');
  app.duel.emit({ticket:app.duel.state.police.ticket});eq(app.profile.credits,2000);
  eq(app.requestNavigation('menu'),true);eq(app.duel.state.status,'menu');eq(app.profile.credits,2000,'session-only quit preserves banked credits');
  globalThis.localStorage=storage;
}

function finish(app){const s=app.duel.state;Object.assign(s,{status:'racing',stageTimeSec:30,s:app.duel.raceLength,completedLaps:s.lapsTotal,lap:s.lapsTotal,currentLap:s.lapsTotal,lapTimes:[15,15],lateral:0});s.police.pursuit=null;app.duel._finishStage();return s.results;}
{
  const app=start(),s=app.duel.state;bust(app);app.duel.ackTicket();const result=finish(app);
  eq(result.won,true,'actual post-ticket finish is valid');eq(result.policeFineCharge,150);eq(result.creditReward,1050,'Medium clean first-win earnings less pending fine');
  eq(app.profile.credits,3050);eq(savedBalance(),3050);eq(app.profile.activeRace,null);eq(app.profile.history[0].policeFineCharge,150);
  app.duel.emit({stageResult:result});eq(app.profile.credits,3050,'duplicate finish cannot debit fine or award earnings again');
  const savedBests=JSON.stringify(app.profile.personalBests),savedMilestones=JSON.stringify(app.profile.milestones);
  app.duel.nextStage();app.advance(4);bust(app);eq(s.stageIndex,1,'real campaign transition starts next circuit');eq(app.profile.credits,3050,'next-stage catch cannot touch completed-stage earnings');
  eq(app.requestNavigation('menu'),true);eq(s.status,'menu');eq(app.profile.credits,3050,'quitting a later stage preserves the previous completed-stage reward');
  eq(JSON.stringify(app.profile.personalBests),savedBests);eq(JSON.stringify(app.profile.milestones),savedMilestones);eq(app.leaderboard.entries.length,1);eq(new App().profile.credits,3050);
}
for(const action of ['menu','restart'])for(const resumeFirst of [false,true]){
  const app=start(),s=app.duel.state;bust(app);app.duel.ackTicket();app.togglePause();eq(s.paused,true);
  if(resumeFirst){app.resume();eq(s.paused,false);}
  eq(app.requestNavigation(action),true);eq(s.status,action==='menu'?'menu':'countdown','paused or resumed navigation completes in one action');
  eq(s.paused,false,'navigation never leaves a stale pause over the next screen');eq(app.profile.credits,2000,'paused and resumed navigation preserves the bank');
  eq(app.profile.history.at(-1).abandoned,true);eq(app.profile.activeRace,null,'pending fine is discarded with the abandoned stage');
}
{
  const app=start(),s=app.duel.state;s.lives=1;bust(app);eq(s.lives,1,'ticket itself does not consume last life');app.duel.ackTicket();app.duel._crash('rock',0,160);
  eq(s.status,'gameover');eq(s.results.creditCharge,500,'genuine last-life loss keeps existing loss rule');eq(s.results.policeFineCharge,0,'unpaid fine cannot deepen genuine loss');eq(app.profile.credits,1500);
  app.requestNavigation('menu');eq(app.profile.credits,1500,'dismissing an already settled loss has no additional cost');eq(new App().profile.credits,1500);
}

// Render the production ticket and pause panels, not copied UI logic.
const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const modal=main.slice(main.indexOf('function modalScreen(s) {'),main.indexOf('\nfunction renderState(s) {'));
const app=start(),ticket=bust(app);
const {formatSpeed}=await import('../src/speed-format.js');
const render=new Function('COURSE','app','metric','time','credits','action','profile','escapeHTML','formatSpeed',`let lastEventResult=null;${modal};return modalScreen;`)(
  COURSE,app,(label,value)=>`${label}: ${value}`,String,value=>Number(value||0).toLocaleString('en-US'),label=>label,()=>app.profile,String,formatSpeed);
let html=render(app.duel.state);eq(html.includes('RACE FINE: 150 CR'),true);eq(html.includes('SAVED BALANCE: 2,000 CR'),true);
eq(html.includes("only this race's earnings"),true);eq(html.includes('$150'),false,'ticket and wallet use the same credit unit');
eq(html.includes('MAIN MENU'),true,'Busted keeps its direct Main Menu action');
eq(app.requestNavigation('menu'),true);eq(render(app.duel.state),'','one action closes the modal with no confirmation panel');
eq(JSON.parse(memory.get(PLAYERS_KEY)).players[0].profile.credits,2000);
app.startCampaign();app.advance(4);app.togglePause();html=render(app.duel.state);
eq(html.includes('MAIN MENU'),true);eq(html.includes('RESTART RUN'),true);eq(html.includes('Saved credits are safe.'),true);
eq(app.requestNavigation('restart'),true);eq(render(app.duel.state),'','Restart replaces the pause panel with countdown, not another dialog');
eq(main.includes('confirm-leave'),false,'production UI has no confirmation action');eq(main.includes('keep-racing'),false,'production UI has no obsolete cancel-confirmation action');
console.log(`Busted/quit: ${checks} actual App, physical catch, duplicate, deadline, restart, reload, balance-floor, player-isolation and production UI checks passed.`);
