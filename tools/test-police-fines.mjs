import assert from 'node:assert/strict';
import {COURSE,POLICE} from '../src/config.js';
import {PROFILE_KEY,PLAYERS_KEY,createProfile,normalizeProfile,createPlayerRegistry,createPlayer,activePlayer,replacePlayerProfile,loadProfile,saveProfile,loadPlayers,savePlayers,settlePoliceFine,settleRace,bestKey} from '../src/progression.js';
const memory=new Map(),storage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)};
const stageIndex=COURSE.findIndex(stage=>!stage.kind),otherStage=COURSE.findIndex((stage,index)=>index!==stageIndex&&!stage.kind);
const ticket={runId:'police-test',stageIndex,ticketIndex:1};
const activeRace=(context=ticket)=>({key:`${context.runId}:${context.stageIndex}`,runId:context.runId,stageIndex:context.stageIndex,car:'falcone_f42',cpuDifficulty:'medium',pendingPoliceFineCount:0,pendingPoliceFines:0});
const funded=(credits,context=ticket)=>({...createProfile(),credits,activeRace:activeRace(context)});
const finish=(extra={})=>({runId:ticket.runId,stageIndex,car:'falcone_f42',mode:'duel',difficulty:'casual',cpuDifficulty:'easy',seed:1989,completed:true,won:true,timeSec:180,laps:COURSE[stageIndex].laps||2,...extra});
let checks=0;const eq=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
eq(POLICE.ticketBaseFine,150);
for(const balance of [0,1,80,149,150,151,5000]){
  const p=funded(balance),before=JSON.stringify(p),r=settlePoliceFine(p,ticket);
  eq(r.accrued,true);eq(r.charge,0,'catch never charges the bank');eq(r.pendingFine,150);eq(r.pendingFineTotal,150);
  eq(r.profile.credits,balance,'catch preserves every bank balance');eq(r.profile.activeRace.pendingPoliceFineCount,1);
  eq(r.profile.settledPoliceFines,[`${ticket.runId}:${stageIndex}:1`]);eq(JSON.stringify(p),before,'pure accrual');
  eq(settlePoliceFine(r.profile,ticket).accrued,false);eq(settlePoliceFine(r.profile,ticket).profile,r.profile);
}
for(const fine of [undefined,0,-1,1,999999,NaN,Infinity,'150']){
  const r=settlePoliceFine(funded(5000),{...ticket,fine,difficulty:'pro',cpuDifficulty:'hard'});
  eq(r.pendingFine,150,'payload fine, CPU and transmission cannot change configured price');eq(r.profile.credits,5000);
}
let profile=settlePoliceFine(funded(5000),ticket).profile;
profile=settlePoliceFine(profile,{...ticket,ticketIndex:2}).profile;
eq(profile.credits,5000);eq(profile.activeRace.pendingPoliceFines,300);
eq(settlePoliceFine(profile,{...ticket,stageIndex:otherStage}).accrued,false);eq(settlePoliceFine(profile,{...ticket,runId:'other-run'}).accrued,false);
eq(settlePoliceFine({...profile,activeRace:null},ticket).accrued,false,'no active race means no pending debt');
for(const context of [{...ticket,stageIndex:otherStage},{...ticket,runId:'next-run'}]){
  const r=settlePoliceFine({...profile,activeRace:activeRace(context)},context);eq(r.accrued,true);eq(r.pendingFineTotal,150,'new stage or run does not inherit fines');
}
const fined=settlePoliceFine(funded(5000),ticket).profile,win=settleRace(fined,finish());
eq(win.reward,450,'600 earned less 150 fine');eq(win.profile.credits,5450);eq(win.policeFineCharge,150);eq(win.breakdown.policeFines,-150);eq(win.profile.activeRace,null);
eq(settlePoliceFine(win.profile,{...ticket,ticketIndex:2}).accrued,false);eq(settleRace(win.profile,finish()).awarded,false);
eq(settleRace(fined,finish({difficulty:'pro'})).reward,1050,'Manual doubles earnings but not fines');
let heavy=funded(5000);for(let ticketIndex=1;ticketIndex<=10;ticketIndex++)heavy=settlePoliceFine(heavy,{...ticket,ticketIndex}).profile;
const capped=settleRace(heavy,finish());eq(capped.policeFineCharge,600);eq(capped.reward,0);eq(capped.profile.credits,5000,'excess fines cannot touch bank');eq(capped.profile.activeRace,null,'no carry-forward debt');
const loss=finish({cpuDifficulty:'medium',won:false,completed:false});
for(const context of [{},{completed:true}]){const r=settleRace(fined,{...loss,...context});eq(r.charge,500,'genuine loss unchanged');eq(r.policeFineCharge,0,'fine cannot deepen loss');eq(r.profile.credits,4500);}
const improved=finish({cpuDifficulty:'medium',difficulty:'pro',won:false,timeSec:170}),losingBest=settleRace({...fined,personalBests:{[bestKey(improved)]:180}},improved);
eq(losingBest.charge,500);eq(losingBest.policeFineCharge,50,'only positive net race reward funds fines');eq(losingBest.profile.credits,5000);
for(const result of [finish({abandoned:true}),{...loss,abandoned:true},finish({abandoned:true,difficulty:'pro',clean:true,policeEscapes:3})]){
  const r=settleRace({...fined,winStreak:4},result);
  eq(r.reward,0);eq(r.charge,0);eq(r.policeFineCharge,0);eq(r.profile.credits,5000,'quit preserves bank despite claimed completed win');eq(r.profile.activeRace,null);
  eq(r.profile.personalBests,{});eq(r.profile.milestones,[]);eq(r.profile.winStreak,0);eq(r.profile.history.at(-1).abandoned,true);eq(settleRace(r.profile,finish()).awarded,false,'stale finish cannot collect forfeited earnings');
}
for(const invalid of [null,{}, {...ticket,runId:''},{...ticket,runId:1},{...ticket,runId:'x'.repeat(129)},{...ticket,stageIndex:-1},{...ticket,stageIndex:COURSE.length},{...ticket,stageIndex:stageIndex+.5},{...ticket,stageIndex:String(stageIndex)},{...ticket,ticketIndex:0},{...ticket,ticketIndex:-1},{...ticket,ticketIndex:.5},{...ticket,ticketIndex:'1'},{...ticket,ticketIndex:NaN},{...ticket,ticketIndex:Infinity},{...ticket,ticketIndex:Number.MAX_SAFE_INTEGER+1}]){
  const p=funded(5000),r=settlePoliceFine(p,invalid);eq(r.accrued,false);eq(r.charge,0);eq(r.profile,p);
}
memory.clear();eq(saveProfile(profile,storage),true);const restored=loadProfile(storage);
eq(restored.credits,5000);eq(restored.activeRace.pendingPoliceFineCount,2);eq(restored.activeRace.pendingPoliceFines,300);eq(restored.settledPoliceFines,profile.settledPoliceFines);eq(settlePoliceFine(restored,ticket).accrued,false);
eq(JSON.parse(memory.get(PLAYERS_KEY)).players[0].profile.activeRace.pendingPoliceFines,300);
eq(normalizeProfile({...profile,settledPoliceFines:[...profile.settledPoliceFines,...profile.settledPoliceFines,'',null,1,'x'.repeat(181)]}).settledPoliceFines,profile.settledPoliceFines);
eq(normalizeProfile({...profile,activeRace:{...profile.activeRace,pendingPoliceFines:999999}}).activeRace.pendingPoliceFines,300,'count controls amount');
const oldProfile={...funded(4350),unlockedCars:['falcone_f42','stuttgart_959s','aurora_gt'],upgrades:{aurora_gt:{engine:2,tires:1}},personalBests:{'legacy-comparison':140},milestones:['clean_debut'],winStreak:3};
delete oldProfile.settledPoliceFines;delete oldProfile.activeRace.pendingPoliceFineCount;delete oldProfile.activeRace.pendingPoliceFines;
for(const version of [1,2]){
  memory.clear();memory.set(PROFILE_KEY,JSON.stringify({...oldProfile,version}));const p=loadProfile(storage);
  eq(p.credits,4350);eq(p.personalBests,oldProfile.personalBests);eq(p.upgrades.aurora_gt.engine,2);eq(p.milestones,['clean_debut']);eq(p.activeRace.pendingPoliceFines,0);
  eq(saveProfile(settlePoliceFine(p,ticket).profile,storage),true);eq(settlePoliceFine(loadProfile(storage),ticket).accrued,false);
}
const alreadyPaid=normalizeProfile({...oldProfile,settledPoliceFines:[`${ticket.runId}:${stageIndex}:1`]});
eq(alreadyPaid.activeRace.pendingPoliceFines,0,'old paid IDs never create new debt');eq(settlePoliceFine(alreadyPaid,ticket).accrued,false);eq(settleRace(alreadyPaid,finish()).reward,720,'old fine is not deducted from the base and existing streak reward');
let registry=createPlayerRegistry(funded(1000));const firstId=activePlayer(registry).id;
registry=replacePlayerProfile(registry,firstId,settlePoliceFine(activePlayer(registry).profile,ticket).profile);
registry=createPlayer(registry,'Second Driver').registry;const secondId=activePlayer(registry).id;registry=replacePlayerProfile(registry,secondId,funded(1000));
const secondFine=settlePoliceFine(activePlayer(registry).profile,ticket);eq(secondFine.accrued,true);
registry=replacePlayerProfile(registry,secondId,secondFine.profile);eq(savePlayers(registry,storage),true);const players=loadPlayers(storage).players;
eq(players.every(p=>p.profile.credits===1000),true,'player banks isolated');eq(players.every(p=>settlePoliceFine(p.profile,ticket).accrued===false),true,'player ledgers isolated');
console.log(`Police fines: ${checks} pending-earnings, bank-safety, duplicate, and persistence checks passed.`);
