import {TOWN_DEED_BY_ID, TOWN_DEED_TERRITORY_BY_ID, TOWN_DEEDS, TOWN_DEED_TERRITORIES} from './content/deeds.js';
import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';

const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const amount=value=>typeof value==='bigint'&&value>=0n?value:Number.isSafeInteger(value)&&value>=0?BigInt(value):null;
const monthKey=calendar=>`${calendar.year}-${String(calendar.month).padStart(2,'0')}`;

function stateFor(town) {
  if(!record(town.deeds)||town.deeds.version!==1) town.deeds={version:1,items:{},reports:[],nextReport:1,settledMissions:[],pendingReceipts:0n,pendingCosts:0n};
  const state=town.deeds;
  for(const deed of TOWN_DEEDS) if(!record(state.items[deed.id]))
    state.items[deed.id]={ownerId:null,guarded:false,unguardedMonths:0,bid:null};
  if(!Array.isArray(state.reports)) state.reports=[];
  if(!Array.isArray(state.settledMissions)) state.settledMissions=[];
  if(!Number.isSafeInteger(state.nextReport)||state.nextReport<1) state.nextReport=1;
  if(amount(state.pendingReceipts)===null) state.pendingReceipts=0n;
  if(amount(state.pendingCosts)===null) state.pendingCosts=0n;
  return state;
}

function report(state,type,deed,detail) {
  if(state.reports.some(row=>row.type===type&&row.deedId===deed.id&&row.unanswered)) return;
  state.reports.push({id:`deed-report-${state.nextReport++}`,type,deedId:deed.id,
    text:detail,createdMonth:null,unanswered:true});
}

function holdsSet(state,territoryId) {
  return TOWN_DEEDS.filter(deed=>deed.territoryId===territoryId)
    .every(deed=>state.items[deed.id]?.ownerId==='player');
}

export function townDeedState(town) {
  const state=stateFor(town);
  return TOWN_DEEDS.map(deed=>({...deed,...state.items[deed.id],setHeld:holdsSet(state,deed.territoryId)}));
}

export function townDeedReports(town) { return stateFor(town).reports.map(row=>({...row})); }

export function hasTownDeedPerk(town,perkId) {
  const state=stateFor(town);
  return TOWN_DEED_TERRITORIES.some(territory=>territory.perk.id===perkId&&holdsSet(state,territory.id));
}

function ownsTerritory(profile,territoryId) {
  return profile?.wasteland?.territories?.[territoryId]?.claimed===true;
}

export function buyTownDeed(town,deedId,{profile}={}) {
  const deed=TOWN_DEED_BY_ID.get(deedId),state=stateFor(town);
  if(!deed) return {ok:false,message:'Choose a deed from the list.'};
  if(!ownsTerritory(profile,deed.territoryId)) return {ok:false,message:`Beat ${deed.territoryName} before buying its deeds.`};
  const item=state.items[deedId];
  if(item.ownerId==='player') return {ok:false,message:'You already own that deed.'};
  if(item.ownerId==='vane'||item.bid) return {ok:false,message:'Beat the current bid before buying that deed.'};
  if(typeof town.till!=='bigint'||town.till<BigInt(deed.purchasePrice)) return {ok:false,message:'The town till does not have enough scrap.'};
  if(!postMoney(town,'deed-purchases','cash',BigInt(deed.purchasePrice),'deed-purchase',town.calendar))
    return {ok:false,message:'The town Ledger is not ready to record this purchase.'};
  item.ownerId='player';item.unguardedMonths=0;
  return {ok:true,message:`You bought ${deed.name} for ${deed.purchasePrice} scrap.`};
}

export function guardTownDeed(town,deedId,guarded=true) {
  const deed=TOWN_DEED_BY_ID.get(deedId),state=stateFor(town);
  if(!deed||typeof guarded!=='boolean') return {ok:false,message:'Choose a deed and whether to guard it.'};
  const item=state.items[deedId];
  if(item.ownerId!=='player') return {ok:false,message:'You can guard only a deed you own.'};
  item.guarded=guarded;
  if(guarded) item.unguardedMonths=0;
  return {ok:true,message:guarded?`${deed.name} has a guard.`:`${deed.name} has no guard.`};
}

export function recordTownRoadPassage(town,deedId,carrier='town') {
  const deed=TOWN_DEED_BY_ID.get(deedId),state=stateFor(town);
  if(!deed||deed.kind!=='road'||!['town','other'].includes(carrier))
    return {ok:false,message:'Choose a road deed and a truck owner.'};
  const owner=state.items[deedId].ownerId;
  if(carrier==='town'&&owner&&owner!=='player'&&!hasTownDeedPerk(town,'truck-tolls')) state.pendingCosts+=BigInt(deed.tollPerTrip);
  if(carrier==='other'&&owner==='player') state.pendingReceipts+=BigInt(deed.tollPerTrip)*(holdsSet(state,deed.territoryId)?2n:1n);
  return {ok:true,toll:owner==='player'?deed.tollPerTrip:0};
}

export function placeTownDeedBid(town,deedId,offer) {
  const deed=TOWN_DEED_BY_ID.get(deedId),state=stateFor(town),bid=amount(offer);
  if(!deed||bid===null) return {ok:false,message:'Choose a deed and a whole scrap offer.'};
  const item=state.items[deedId];
  const outbidsVane=item.ownerId==='player'&&item.bid;
  const buysFromVane=item.ownerId==='vane';
  if(!outbidsVane&&!buysFromVane) return {ok:false,message:'That deed has no open bid to answer.'};
  const asking=outbidsVane?BigInt(item.bid.amount):BigInt(Math.ceil(deed.purchasePrice*1.5));
  if(bid<=asking) return {ok:false,message:`Offer more than ${asking} scrap.`};
  if(typeof town.till!=='bigint'||town.till<bid) return {ok:false,message:'The town till does not have enough scrap.'};
  if(!postMoney(town,'deed-purchases','cash',bid,'deed-bid-won',town.calendar))
    return {ok:false,message:'The town Ledger is not ready to record this bid.'};
  item.ownerId='player';item.bid=null;item.guarded=false;item.unguardedMonths=0;
  return {ok:true,message:`You paid ${bid} scrap and won ${deed.name} back.`};
}

// Mission results are settled once per run so retries cannot award a deed twice.
export function missionResult(town,{runId,deedId,territoryId,won}={}) {
  const state=stateFor(town),deed=TOWN_DEED_BY_ID.get(deedId);
  const target=deed||TOWN_DEEDS.find(row=>row.territoryId===territoryId);
  if(!target||typeof runId!=='string'||!runId||typeof won!=='boolean') return {ok:false,message:'That road fight result is not clear.'};
  if(state.settledMissions.includes(runId)) return {ok:true,settled:false,message:'That road fight already has a result.'};
  state.settledMissions.push(runId);
  if(won) {state.items[target.id].ownerId='player';state.items[target.id].bid=null;state.items[target.id].unguardedMonths=0;}
  return {ok:true,settled:true,message:won?`You won ${target.name} back.`:'The deed stays with its current owner.'};
}

function postTolls(town,state,calendar) {
  const receipts=amount(state.pendingReceipts)||0n,costs=amount(state.pendingCosts)||0n;
  if(receipts&&!postMoney(town,'cash','toll-income',receipts,'deed-toll-receipt',calendar)) return;
  if(costs&&!postMoney(town,'toll-expense','cash',costs,'deed-toll-payment',calendar)) return;
  state.pendingReceipts=0n;state.pendingCosts=0n;
}

function postMoney(town,debit,credit,value,kind,calendar) {
  if(!record(town.money?.balances)||!Array.isArray(town.money.entries)||!record(town.money.months)||!record(town.money.years)||
    typeof town.till!=='bigint'||!Number.isSafeInteger(calendar?.year)||!Number.isSafeInteger(calendar?.month)) return false;
  for(const name of [debit,credit]) town.money.balances[name]||={debit:0n,credit:0n};
  town.money.balances[debit].debit+=value;town.money.balances[credit].credit+=value;
  if(debit==='cash') town.till+=value;
  if(credit==='cash') town.till-=value;
  const key=monthKey(calendar),year=String(calendar.year);
  town.money.entries.push({debit,credit,amount:value,kind,year:calendar.year,month:calendar.month});
  for(const bucket of [town.money.months[key]||(town.money.months[key]={income:0n,expense:0n}),
    town.money.years[year]||(town.money.years[year]={income:0n,expense:0n})]) {
    if(debit==='cash'&&credit.endsWith('income')) bucket.income+=value;
    if(debit.endsWith('expense')) bucket.expense+=value;
  }
  return true;
}

function updateDeeds({town,calendar,rng}) {
  const state=stateFor(town);
  if(calendar.day!==1||calendar.hour!==0) return;
  postTolls(town,state,calendar);
  for(const deed of TOWN_DEEDS) {
    const item=state.items[deed.id];
    if(item.bid) {
      if(calendar.month!==item.bid.closesMonth||calendar.year!==item.bid.closesYear) continue;
      if(!postMoney(town,'cash','deed-sale-income',BigInt(item.bid.amount),'vane-deed-purchase',calendar)) continue;
      item.ownerId='vane';item.bid=null;
      report(state,'lost-bid',deed,`Mrs Vane bought ${deed.name}. Your trucks now pay her toll on that road.`);
    } else if(item.ownerId==='player'&&!item.guarded) {
      item.unguardedMonths++;
      if(item.unguardedMonths>=6) {
        item.ownerId='raiders';item.unguardedMonths=0;
        report(state,'raid',deed,`Somebody raided ${deed.name}. You can buy it back or win it back on the road.`);
      }
    }
  }
  if(calendar.month%4!==0) return;
  const candidates=TOWN_DEEDS.filter(deed=>state.items[deed.id].ownerId==='player'&&!state.items[deed.id].bid);
  if(!candidates.length) return;
  const deed=rng.pick(candidates),item=state.items[deed.id];
  const closeMonth=calendar.month+2;
  item.bid={amount:Math.ceil(deed.purchasePrice*1.5),closesMonth:(closeMonth-1)%12+1,
    closesYear:calendar.year+Math.floor((closeMonth-1)/12)};
  report(state,'bid',deed,`Mrs Vane bid ${item.bid.amount} scrap on ${deed.name}. Beat her bid before the end of the month.`);
}

registerTownCommand('buyDeed',(town,command,options)=>buyTownDeed(town,command.deedId,options));
registerTownCommand('guardDeed',(town,command)=>guardTownDeed(town,command.deedId,command.guarded));
registerTownCommand('deedRoadPassage',(town,command)=>recordTownRoadPassage(town,command.deedId,command.carrier));
registerTownCommand('deedBid',(town,command)=>placeTownDeedBid(town,command.deedId,command.offer));
registerTownSystem('town-deeds',81,1,updateDeeds);

export {TOWN_DEED_BY_ID,TOWN_DEEDS,TOWN_DEED_TERRITORIES};
