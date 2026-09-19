import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {COURSE,CPU_DIFFICULTY,CARS} from '../src/config.js';
import {PLAYERS_KEY,upgradedCar,bestKey,createProfile} from '../src/progression.js';
import {loadLeaderboard,saveLeaderboard} from '../src/leaderboard.js';
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const normal=COURSE.findIndex(stage=>!stage.kind),other=COURSE.findIndex((stage,i)=>i!==normal&&!stage.kind),arena=COURSE.findIndex(stage=>stage.arena);
const app=new App();let count=0;const check=(value,message)=>{assert(value,message);count++;};
function finish({won=true,time=180,jumps=0,crushes=0}={}){const s=app.duel.state;s.status='racing';s.stageTimeSec=time;s.racePenaltySec=0;s.s=app.duel.raceLength;s.completedLaps=s.lapsTotal;s.lap=s.currentLap=s.lapsTotal;s.lapTimes=Array(s.lapsTotal).fill(time/s.lapsTotal);s.lateral=0;s.jumps=jumps;s.crushCount=crushes;s.crushScore=crushes*150;if(s.rival)s.rival.finishTime=won?null:1;app.duel._finishStage();return s.results;}
app.startCampaign({startStage:normal,cpuDifficulty:'easy'});let r=finish();check(r.won,'fixture wins after two laps');check(r.creditReward===760,'base plus clean and first clean milestone rewards');check(app.profile.credits===760,'credits persist to active player');check(app.leaderboard.entries.length===1,'valid finish enters board');
app.duel.emit({stageResult:r});check(app.profile.credits===760,'duplicate finish does not pay');check(new App().profile.credits===760,'new App restores active wallet');app.returnToMenu();check(app.purchaseUpgrade('falcone_f42','engine').ok,'garage purchase');check(app.profile.credits===410,'correct purchase debit');
app.startCampaign({startStage:other,cpuDifficulty:'hard'});check(app.duel.state.cpuDifficulty==='hard','CPU reaches simulation');check(app.duel.state.playerId===app.player.id,'player identity reaches race');check(app.duel.state.upgrades.engine===1,'upgrade snapshot reaches race');check(app.duel.car.topSpeed===CARS.falcone_f42.topSpeed*1.035,'physics gets tuned speed');check(!app.purchaseUpgrade('falcone_f42','tank').ok,'cannot upgrade active race');app.profile.upgrades.falcone_f42.engine=3;check(app.duel.state.upgrades.engine===1,'physics snapshot stays fixed');
r=finish({won:false});check(r.won===false,'fixture loses');check(r.creditReward===-410,'loss debit floors at zero');check(app.profile.credits===0,'wallet never goes negative');app.duel.emit({stageResult:r});check(app.profile.credits===0,'duplicate loss not charged');
app.returnToMenu();check(!app.startCampaign({startStage:arena,car:'titan_monster'}),'locked arena blocked');check(app.duel.state.status==='menu','blocked challenge stays in menu');
const first=app.player.id;check(app.addPlayer('Riley').ok,'new named player');check(app.profile.credits===0,'new player starts fresh');check(!app.addPlayer('riley').ok,'duplicate name rejected');app.startCampaign({startStage:normal,cpuDifficulty:'medium'});r=finish();check(app.profile.credits===1200,'second player owns earnings');check(app.leaderboard.entries.filter(row=>row.eventId===COURSE[normal].id).length===2,'shared board includes both players');app.returnToMenu();app.selectPlayer(first);check(app.profile.credits===0,'first wallet remains separate');check(app.profile.history.length===2,'first history remains separate');
app.profile.credits=20000;app._saveProfile();check(app.unlockCar('titan_monster').ok,'monster can be earned');check(app.startCampaign({startStage:arena,car:'falcone_f42',cpuDifficulty:'easy'}),'owned arena starts');check(app.duel.state.car==='titan_monster','arena enforces required vehicle');const arenaBalance=app.profile.credits;app.duel.emit({propCrushed:{id:'rival-junk',byPlayer:false,strength:.7}});check(app.profile.credits===arenaBalance,'rival crushing cannot change the player wallet');app.duel.emit({propCrushed:{id:'player-junk',byPlayer:true,strength:.7}});check(app.profile.credits===arenaBalance,'player crushing pays only after the event finishes');r=finish({jumps:10,crushes:6});check(r.creditBreakdown.jumps===180,'arena jump reward capped30percent');check(r.creditBreakdown.crush===120,'arena player-crush reward capped20percent');const earnedArena=app.profile.credits;app.duel.emit({stageResult:r});check(app.profile.credits===earnedArena,'duplicate result cannot repeat arena crush credits');
app.returnToMenu();app.startCampaign({startStage:normal,cpuDifficulty:'easy'});app.duel.state.status='racing';app.duel.state.stageTimeSec=8;const balance=app.profile.credits;app.returnToMenu();check(app.profile.credits===balance,'leaving a started race forfeits only unbanked earnings');const settled=app.profile.credits;app.returnToMenu();check(app.profile.credits===settled,'leaving twice does not charge again');
memory.clear();const interrupted=new App();interrupted.profile.credits=1000;interrupted._saveProfile();interrupted.startCampaign({startStage:normal,cpuDifficulty:'easy'});interrupted.advance(4);check(!!interrupted.profile.activeRace,'GO persists an active race marker');
const restored=new App();check(restored.profile.credits===1000,'reload forfeits interrupted earnings without debiting bank');check(!restored.profile.activeRace,'interrupted marker clears');check(new App().profile.credits===1000,'second reload cannot debit twice');const stale=interrupted.duel.state;interrupted._settleResult({completed:true,won:true,timeSec:180,laps:2},stale);check(interrupted.profile.credits===1000,'stale old race cannot reclaim rewards after interruption');
restored.startCampaign({startStage:normal,cpuDifficulty:'easy'});restored.advance(4);
const activeRun=restored.runId,activeSettings=structuredClone(restored.profile.raceSettings),historyBeforeRestart=restored.profile.history.length;
check(restored.requestNavigation('restart')===true,'active restart needs only one action');check(restored.duel.state.status==='countdown'&&!restored.duel.state.paused,'active restart immediately reaches an unpaused countdown');
check(restored.runId!==activeRun,'restart owns a new race identity');check(restored.profile.credits===1000,'restart cannot debit banked credits');
check(restored.profile.history.length===historyBeforeRestart+1&&restored.profile.history.at(-1).abandoned,'active restart settles the abandoned stage exactly once');
check(JSON.stringify(restored.profile.raceSettings)===JSON.stringify(activeSettings),'restart preserves the saved race setup');
check(restored.profile.activeRace===null,'new countdown has no earned or pending credit claim');
check(!('pendingNavigation' in restored)&&typeof restored.confirmNavigation==='undefined'&&typeof restored.cancelNavigation==='undefined','removed confirmation API cannot block navigation');
const beforeInvalid={runId:restored.runId,profile:JSON.stringify(restored.profile),status:restored.duel.state.status};
check(restored.requestNavigation('invalid')===false,'unknown actions are rejected');check(restored.runId===beforeInvalid.runId&&JSON.stringify(restored.profile)===beforeInvalid.profile&&restored.duel.state.status===beforeInvalid.status,'invalid navigation has no side effects');
check(restored.requestNavigation('menu'),'one action leaves a fresh countdown');check(restored.duel.state.status==='menu','countdown exit reaches the menu immediately');
const historyAfterExit=restored.profile.history.length;check(restored.requestNavigation('menu'),'repeated menu action is harmless');check(restored.profile.history.length===historyAfterExit&&restored.profile.credits===1000,'repeated exit cannot create another abandonment or charge');
restored.startCampaign({startStage:normal});check(restored.requestNavigation('restart'),'countdown restart is immediate');check(restored.profile.history.length===historyAfterExit&&restored.profile.credits===1000,'countdown restart forfeits nothing and costs nothing');
restored.duel.state.countdown=.001;restored.advance(1/120);check(restored.duel.state.stageTimeSec===0,'GO boundary begins at zero race time');
check(restored.requestNavigation('menu'),'one action leaves at the GO boundary before the first driving step');check(restored.duel.state.status==='menu','GO boundary exit reaches the menu immediately');
check(restored.profile.history.length===historyAfterExit+1&&restored.profile.history.at(-1).abandoned,'GO marker still settles the started attempt');check(restored.profile.credits===1000,'GO boundary abandonment keeps banked credits');
const chase=COURSE.findIndex(stage=>stage.kind==='chase');restored.profile.credits=10000;restored._saveProfile();check(restored.unlockCar('banshee_muscle').ok,'chase vehicle can be unlocked');check(restored.startCampaign({startStage:chase,car:'falcone_f42',mode:'timetrial',cpuDifficulty:'easy'}),'owned chase starts');check(restored.duel.state.car==='banshee_muscle'&&restored.duel.state.mode==='duel','chase forces its car and pursuit mode');restored.advance(4);const beforeDeadline=restored.profile.credits,rowsBefore=restored.leaderboard.entries.length;restored.duel.state.stageTimeSec=restored.duel.state.timeLimitSec;restored.duel._deadline();check(restored.duel.state.results.timeout,'chase deadline returns a timeout');check(restored.profile.credits===beforeDeadline-300,'timeout charges one loss');check(restored.leaderboard.entries.length===rowsBefore,'timeout cannot enter the leaderboard');restored.duel.emit({stageResult:restored.duel.state.results});check(restored.profile.credits===beforeDeadline-300,'timeout result cannot charge twice');
restored.returnToMenu();const oldRaceState={...restored.duel.state},oldResults={...restored.duel.state.results,completed:true,won:true,timeSec:100,laps:2};restored.addPlayer('Late event recipient');restored._settleResult(oldResults,oldRaceState);check(restored.profile.credits===0&&restored.profile.history.length===0,'a late result cannot pay a different player');
memory.clear();const owner=new App();owner.profile.credits=2000;owner._saveProfile();const staleMenu=new App(),ownerId=owner.player.id;owner.profile.credits=2500;owner._saveProfile();check(staleMenu.addPlayer('Fresh Menu Player').ok,'stale menu creates a new player');check(staleMenu.players.players.find(player=>player.id===ownerId).profile.credits===2500,'adding a player preserves newer saved wallets');owner.profile.credits=2600;owner._saveProfile();staleMenu.selectPlayer(ownerId);check(staleMenu.profile.credits===2600,'switching players refreshes the latest saved wallet');owner.startCampaign({startStage:normal,cpuDifficulty:'easy'});owner.advance(4);staleMenu.selectPlayer(ownerId);check(staleMenu.profile.credits===2600&&!staleMenu.profile.activeRace,'selecting an interrupted profile forfeits the active attempt, not its bank');staleMenu.selectPlayer(ownerId);check(staleMenu.profile.credits===2600,'reselecting an interrupted profile cannot charge twice');
const availableStorage=globalThis.localStorage;globalThis.localStorage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};const session=new App(),sessionFirst=session.player.id;session.profile.credits=1000;session._saveProfile();session.addPlayer('Offline player');session.profile.credits=200;session._saveProfile();session.selectPlayer(sessionFirst);check(session.profile.credits===1000,'storage failure preserves other session-only player wallets');globalThis.localStorage=availableStorage;
check(memory.has(PLAYERS_KEY),'v2 registry saved');
// Reproduce the reported Medium car-best case through the real App settlement.
// A CPU change creates a baseline; a second matching finish must pay the bonus.
memory.clear();const mediumApp=new App();
function finishBonus(instance,time=180){const s=instance.duel.state;s.status='racing';s.stageTimeSec=time;s.racePenaltySec=0;s.s=instance.duel.raceLength;s.completedLaps=s.lapsTotal;s.lapTimes=Array(s.lapsTotal).fill(time/s.lapsTotal);s.lateral=0;if(s.rival)s.rival.finishTime=null;instance.duel._finishStage();return s.results;}
mediumApp.startCampaign({startStage:normal,cpuDifficulty:'easy',difficulty:'casual'});finishBonus(mediumApp,200);mediumApp.returnToMenu();
mediumApp.startCampaign({startStage:normal,cpuDifficulty:'medium',difficulty:'casual'});let mediumResult=finishBonus(mediumApp,190);
check(mediumResult.previousBest===null&&mediumResult.creditBreakdown.personalBest===0,'first Medium finish uses a new baseline even with an Easy best');
check(mediumResult.personalBestStatus==='baseline','App explains a first Medium baseline');
mediumApp.returnToMenu();mediumApp.startCampaign({startStage:normal,cpuDifficulty:'medium',difficulty:'casual'});mediumResult=finishBonus(mediumApp,185);
check(mediumResult.previousBest===190&&mediumResult.best===185&&mediumResult.creditBreakdown.personalBest===200,'a faster matching Medium finish pays the 200-credit car-best bonus');
check(mediumResult.personalBestStatus==='improved','App reports the matching improvement status');
const firstStageWallet=mediumApp.profile.credits;mediumApp.duel.emit({stageResult:mediumResult});check(mediumApp.profile.credits===firstStageWallet,'duplicate Medium finish cannot pay another car-best bonus');
const nextBestKey=bestKey({...mediumApp.duel.state,stageIndex:other,laps:2});mediumApp.profile.personalBests[nextBestKey]=200;mediumApp._saveProfile();mediumApp.duel.nextStage();mediumResult=finishBonus(mediumApp,185);
check(mediumResult.creditBreakdown.personalBest===200,'another improved Medium stage in the same campaign also pays its car-best bonus');
const secondStageWallet=mediumApp.profile.credits;mediumApp.duel.emit({stageResult:mediumResult});check(mediumApp.profile.credits===secondStageWallet,'later-stage duplicate cannot repeat the bonus');
mediumApp.returnToMenu();mediumApp.profile=createProfile();mediumApp._saveProfile();mediumApp.startCampaign({startStage:normal,cpuDifficulty:'medium',difficulty:'pro'});const manualResult=finishBonus(mediumApp);
check(manualResult.creditReward===2300&&manualResult.creditBreakdown.manual===1100,'a clean first Medium Manual win earns 2,300 credits including the separate milestone');
check(manualResult.creditBreakdown.milestones===100,'Manual does not double one-time Clean debut');
check(mediumApp.profile.history.at(-1).breakdown.manual===1100,'Manual breakdown survives normalized saved history');
const manualWallet=mediumApp.profile.credits;mediumApp.duel.emit({stageResult:manualResult});check(mediumApp.profile.credits===manualWallet,'duplicate Manual result cannot repeat doubled earnings');
mediumApp.returnToMenu();mediumApp.startCampaign({startStage:normal,cpuDifficulty:'medium',difficulty:'pro'});mediumApp.advance(4);mediumApp.returnToMenu();check(mediumApp.profile.credits===manualWallet,'abandoning Manual preserves all banked credits');
// Finishing both laps is insufficient for a stunt record. Reproduce both the
// former invalid-baseline path and a faster invalid attempt after a real best.
memory.clear();const stuntApp=new App(),stuntIndex=COURSE.findIndex(stage=>stage.stuntTrial);stuntApp.profile.credits=20000;stuntApp._saveProfile();stuntApp.unlockCar('titan_monster');
function finishStunt(time,jumps=0,crushCount=0){stuntApp.startCampaign({startStage:stuntIndex,cpuDifficulty:'hard',difficulty:'pro'});Object.assign(stuntApp.duel.state,{jumps,crushCount,policeEscapes:jumps===0?3:0});return finishBonus(stuntApp,time);}
let stuntResult=finishStunt(50);
check(stuntResult.completed&&!stuntResult.won&&stuntResult.objectiveMissed,'real Hard stunt two-lap finish can miss its jump/crush goals');
check(stuntResult.personalBestStatus==='ineligible'&&!stuntResult.personalBest&&Object.keys(stuntApp.profile.personalBests).length===0,'failed stunt objectives cannot establish a car-best baseline');
check(stuntApp.leaderboard.entries.length===0&&loadLeaderboard().entries.length===0,'failed stunt objectives cannot enter or persist on the board');
check(stuntResult.creditReward===-750&&stuntResult.creditBreakdown.police===0&&stuntResult.creditBreakdown.manual===0,'failed stunt goals earn no police or Manual credits and retain normal loss charge');
stuntApp.returnToMenu();stuntResult=finishStunt(55,4,4);
check(stuntResult.won&&stuntResult.personalBest&&stuntApp.leaderboard.entries.length===1,'valid stunt objectives still save the baseline and board');
check(loadLeaderboard().entries[0].jumps===4&&loadLeaderboard().entries[0].crushCount===4,'new stunt board entries retain their required objective evidence');
const stuntRecord=stuntApp.leaderboard.entries[0],stuntBests=JSON.stringify(stuntApp.profile.personalBests);stuntApp.returnToMenu();stuntResult=finishStunt(45);
check(!stuntResult.personalBest&&stuntResult.creditBreakdown.personalBest===0&&stuntResult.creditBreakdown.milestones===0,'faster failed stunt cannot earn car-best or milestone credits');
check(JSON.stringify(stuntApp.profile.personalBests)===stuntBests&&stuntApp.leaderboard.entries[0].timeSec===55,'faster failed stunt preserves the existing valid record');
check(saveLeaderboard({version:1,entries:[{...stuntRecord,jumps:0}]}),'evidence validation can normalize a saved board');check(loadLeaderboard().entries.length===0,'invalid stunt evidence is rejected during reload');

// Exercise the real bound key handler. A held R key may repeat browser events,
// but must create only one new run and settle the old stage only once.
const previousWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),previousElement=Object.getOwnPropertyDescriptor(globalThis,'Element');
const keyboardWindow=new EventTarget();keyboardWindow.location={search:''};
Object.defineProperty(globalThis,'window',{configurable:true,value:keyboardWindow});
Object.defineProperty(globalThis,'Element',{configurable:true,value:class TestElement {}});
let keyboard;
function key(type,code,repeat=false){const event=new Event(type,{cancelable:true});Object.defineProperties(event,{code:{value:code},repeat:{value:repeat}});keyboardWindow.dispatchEvent(event);}
try{
  memory.clear();keyboard=new App();keyboard.profile.credits=2000;keyboard._saveProfile();
  for(const screen of ['racing','paused','ticket','countdown','go']){
    keyboard.startCampaign({startStage:normal,cpuDifficulty:'medium',difficulty:'casual'});
    if(screen==='go'){keyboard.duel.state.countdown=.001;keyboard.advance(1/120);}
    else if(screen!=='countdown')keyboard.advance(4);
    if(screen==='paused')key('keydown','Escape');
    if(screen==='ticket'){keyboard.duel.state.speedMph=110;keyboard.duel._ticket({limitMph:55});}
    const runId=keyboard.runId,beforeHistory=keyboard.profile.history.length,settings=JSON.stringify(keyboard.profile.raceSettings);
    check(screen!=='paused'||keyboard.duel.state.paused,'Escape uses the real keyboard handler to pause');
    key('keydown','KeyR');
    check(keyboard.runId!==runId&&keyboard.duel.state.status==='countdown'&&!keyboard.duel.state.paused,`${screen}: one R press immediately restarts into countdown`);
    check(keyboard.profile.credits===2000&&keyboard.profile.activeRace===null,`${screen}: keyboard restart preserves the bank and discards pending earnings`);
    check(keyboard.profile.history.length===beforeHistory+(screen==='countdown'?0:1),`${screen}: keyboard restart settles only a stage that reached GO`);
    check(JSON.stringify(keyboard.profile.raceSettings)===settings,`${screen}: keyboard restart preserves the selected setup`);
    const restartedRun=keyboard.runId,settledHistory=keyboard.profile.history.length;
    key('keydown','KeyR',true);key('keydown','KeyR',true);
    check(keyboard.runId===restartedRun&&keyboard.profile.history.length===settledHistory,`${screen}: browser key-repeat cannot repeatedly restart or settle`);
    key('keyup','KeyR');check(keyboard.keys.KeyR===false,'R release clears the held input');
  }
  keyboard.advance(4);const completed=finishBonus(keyboard,180),earned=keyboard.profile.credits,completedBests=JSON.stringify(keyboard.profile.personalBests),completedHistory=keyboard.profile.history.length;
  check(completed.won&&earned>2000,'keyboard dismissal fixture has a real settled winning result');
  keyboard.duel.emit({stageResult:completed});check(keyboard.profile.credits===earned&&keyboard.profile.history.length===completedHistory,'duplicate result within its owning run cannot repeat completed earnings');
  key('keydown','KeyR');check(keyboard.duel.state.status==='countdown'&&keyboard.profile.credits===earned,'R restarts a completed result without reclaiming its earnings');
  key('keyup','KeyR');
  check(JSON.stringify(keyboard.profile.personalBests)===completedBests&&keyboard.profile.history.length===completedHistory,'completed-result restart preserves prior records and settlement');
  check(keyboard.requestNavigation('menu')&&keyboard.duel.state.status==='menu','one-click Exit also works after a keyboard restart');
  const menuRun=keyboard.runId;key('keydown','KeyR');check(keyboard.duel.state.status==='menu'&&keyboard.runId===menuRun,'R at the menu does not launch an unsolicited race');
}finally{
  keyboard?._inputEvents?.abort();
  if(previousWindow)Object.defineProperty(globalThis,'window',previousWindow);else delete globalThis.window;
  if(previousElement)Object.defineProperty(globalThis,'Element',previousElement);else delete globalThis.Element;
}
console.log(`App progression integration: ${count} assertions passed`);
