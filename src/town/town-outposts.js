import {TOWN_NEIGHBOURS, OUTPOST_CHAPTERS} from './content/neighbours.js';
import {raiseTownReport} from './town-reports.js';
import {takeGood, storeGood} from './town-goods.js';
import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';

const byId = new Map(TOWN_NEIGHBOURS.map(neighbour=>[neighbour.id, neighbour]));
const clampStanding = value => Math.max(-100, Math.min(100, value));

function stateFor(town, neighbourId) {
  const definition=byId.get(neighbourId);
  if(!definition) return null;
  town.outposts ||= {};
  let state=town.outposts[neighbourId];
  if(!state) state=town.outposts[neighbourId]={standing:definition.standing, tradeRuns:0, protected:false, lastReportMonth:null, trucks:[], nextTruckNumber:1};
  if(!Array.isArray(state.trucks)) state.trucks=[];
  state.trucks=state.trucks.filter(truck=>truck?.status==='on-road');
  if(!Number.isSafeInteger(state.nextTruckNumber)||state.nextTruckNumber<1) state.nextTruckNumber=1;
  if(!Number.isFinite(state.standing)) state.standing=definition.standing;
  state.standing=clampStanding(state.standing);
  return state;
}

export function townNeighbourStanding(town, neighbourId) {
  const state=stateFor(town,neighbourId);
  return state ? state.standing : null;
}

export function changeTownNeighbourStanding(town, neighbourId, change) {
  const state=stateFor(town,neighbourId);
  if(!state || !Number.isFinite(change)) return {ok:false,message:'Choose a known neighbour and a real standing change.'};
  const before=state.standing;
  state.standing=clampStanding(before+change);
  return {ok:true,standing:state.standing,change:state.standing-before};
}

export function completeTownNeighbourTrade(town, neighbourId, {good, amount, stockpile, delivered=true}={}) {
  const definition=byId.get(neighbourId), state=stateFor(town,neighbourId);
  if(!definition || !state) return {ok:false,message:'Choose a known neighbour.'};
  if(typeof good!=='string' || !Number.isFinite(amount) || amount<=0) return {ok:false,message:'Choose a good and an amount above zero.'};
  if(good!==definition.tradeGood || amount!==definition.tradeAmount || !stockpile)
    return {ok:false,message:`This delivery needs ${definition.tradeAmount} ${definition.tradeGood} from a stockpile.`};
  const loaded=takeGood(town,stockpile,good,definition.tradeAmount);
  if(!loaded.ok) return loaded;
  if(!delivered) {
    storeGood(town,stockpile,good,definition.tradeAmount);
    changeTownNeighbourStanding(town,neighbourId,-25);
    return {ok:false,message:`The trade with ${definition.name} was not delivered.`};
  }
  const truck={id:`${neighbourId}-truck-${state.nextTruckNumber++}`,vehicle:'flatbed',from:'town',to:neighbourId,
    good:definition.tradeGood,amount:definition.tradeAmount,sourceCell:{...stockpile},routeKm:definition.routeKm,
    speedKmh:30,travelledKm:0,status:'on-road',startedTick:BigInt(town.tick)};
  state.trucks.push(truck);
  return {ok:true,standing:state.standing,truck,rewardGood:definition.rewardGood,rewardAmount:definition.rewardAmount,
    message:`A flatbed is carrying ${amount} ${good} to ${definition.name}.`};
}

export function setTownOutpostProtection(town, neighbourId, protectedPlace=true) {
  const definition=byId.get(neighbourId), state=stateFor(town,neighbourId);
  if(!definition || !state) return {ok:false,message:'Choose a known neighbour.'};
  if(typeof protectedPlace!=='boolean') return {ok:false,message:'Choose whether the outpost is protected.'};
  if(protectedPlace&&!state.protected) changeTownNeighbourStanding(town,neighbourId,20);
  state.protected=protectedPlace;
  return {ok:true,standing:state.standing,monthlyProtection:protectedPlace?definition.monthlyProtection:0};
}

export function townOutpostProtectionIncome(town) {
  let total=0;
  for(const neighbour of TOWN_NEIGHBOURS) {
    const state=stateFor(town,neighbour.id);
    if(state.protected && state.standing>=0) total+=neighbour.monthlyProtection;
  }
  return total;
}

export function townOutpostChapters() { return OUTPOST_CHAPTERS; }

function updateOutposts({town, calendar}) {
  for(const neighbour of TOWN_NEIGHBOURS) {
    const state=stateFor(town,neighbour.id);
    const activeTrucks=[];
    for(const truck of state.trucks) {
      if(truck.status!=='on-road') continue;
      truck.travelledKm=Math.min(truck.routeKm,truck.travelledKm+truck.speedKmh);
      if(truck.travelledKm>=truck.routeKm) {
        truck.status='delivered';
        truck.arrivedTick=BigInt(town.tick);
        state.tradeRuns++;
        changeTownNeighbourStanding(town,neighbour.id,10);
        const multiplier=state.standing>30?1.2:1;
        truck.rewardGood=neighbour.rewardGood;
        truck.rewardAmount=Math.floor(neighbour.rewardAmount*multiplier);
        storeGood(town,truck.sourceCell,truck.rewardGood,truck.rewardAmount);
      } else activeTrucks.push(truck);
    }
    state.trucks=activeTrucks;
  }
  for(const report of town.reports||[]) {
    if(report.facts?.outpostId && report.unanswered===false && !report.outpostSettled) {
      if(report.answerId==='accept-deal') {
        const state=stateFor(town,report.facts.outpostId);
        if(state) {
          state.tradeRuns++;
          changeTownNeighbourStanding(town,report.facts.outpostId,10);
        }
      }
      report.outpostSettled=true;
    }
  }
  for(const neighbour of TOWN_NEIGHBOURS) {
    const state=stateFor(town,neighbour.id);
    // Standing drifts one point toward neutral each town year (12 months).
    if(calendar.month===1 && calendar.day===1 && calendar.hour===0 && calendar.year>1) {
      if(state.standing>0) state.standing--;
      else if(state.standing<0) state.standing++;
    }
    if(calendar.year<neighbour.opensYear || calendar.day!==1 || calendar.hour!==0) continue;
    const monthKey=`${calendar.year}-${calendar.month}`;
    if(state.lastReportMonth===monthKey) continue;
    const existing=(town.reports||[]).some(report=>report.unanswered && report.facts?.outpostId===neighbour.id);
    if(existing) continue;
    const result=raiseTownReport(town,'trader-deal',{traderDeal:true,outpostId:neighbour.id,where:neighbour.place,detail:`${neighbour.name} has repeat work on the trade road.`});
    if(result.ok) state.lastReportMonth=monthKey;
  }
}

registerTownCommand('neighbourTrade',(town,command)=>completeTownNeighbourTrade(town,command.neighbourId,command));
registerTownCommand('neighbourProtection',(town,command)=>setTownOutpostProtection(town,command.neighbourId,command.protected));
registerTownCommand('neighbourRaid',(town,command)=>changeTownNeighbourStanding(town,command.neighbourId,-25));
registerTownCommand('neighbourHelpEnemy',(town,command)=>changeTownNeighbourStanding(town,command.neighbourId,5));
registerTownSystem('town-outposts',60,1,updateOutposts);
