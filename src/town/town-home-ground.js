import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';
import {cellIsReserved, ensureTownRegion, getTownChunk, TOWN_REGIONS} from './town-world-data.js';
import {TOWN_HOME_TYPES} from './content/homes.js';
import {stockpileAt, takeGood} from './town-goods.js';
import {raiseTownReport} from './town-reports.js';

const DAY = 24;
export function ensureHomeGround(town) { if (!Array.isArray(town.homePlots)) town.homePlots=[]; return town.homePlots; }
function plotKey(plot) { return `${plot.regionId}:${plot.x}:${plot.z}`; }
function validCell(cell) { return cell && Number.isSafeInteger(cell.x) && Number.isSafeInteger(cell.z); }
function occupied(town,regionId,x,z) {
  if(cellIsReserved(regionId,x,z,1,1)) return true;
  const region=ensureTownRegion(town,regionId), found=getTownChunk(region,x,z);
  return Boolean(found?.cell.buildingId||found?.cell.roadId||found?.cell.pipeId||found?.cell.sewerId||found?.cell.wireId);
}
registerTownCommand('paintHomeGround',(town,command)=>{
  const plots=ensureHomeGround(town),regionId=command.regionId||'scablands';
  if(!TOWN_REGIONS.has(regionId)||!Array.isArray(command.cells)||!command.cells.length) return {ok:false,message:'Drag across clear ground to paint home plots.'};
  const fresh=[];
  for(const cell of command.cells) {
    if(!validCell(cell)||occupied(town,regionId,cell.x,cell.z)||plots.some(p=>p.regionId===regionId&&p.x===cell.x&&p.z===cell.z))
      return {ok:false,message:'Plots need clear ground. Roads, pipes and buildings must stay clear.'};
    fresh.push({id:`plot-${regionId}-${cell.x}-${cell.z}`,regionId,x:cell.x,z:cell.z,groundY:TOWN_REGIONS.get(regionId).groundHeightAt((cell.x+.5)*8,(cell.z+.5)*8),tier:0,progressDays:0,household:null,burning:false,waitingGood:null});
  }
  plots.push(...fresh);
  return {ok:true,message:`Painted ${fresh.length} home ${fresh.length===1?'plot':'plots'}.`};
});
registerTownCommand('clearHomeGround',(town,command)=>{
  const plots=ensureHomeGround(town), cells=Array.isArray(command.cells)?command.cells:[];
  const remove=new Set(cells.filter(validCell).map(cell=>`${command.regionId||'scablands'}:${cell.x}:${cell.z}`));
  const kept=plots.filter(plot=>!remove.has(plotKey(plot))||plot.tier>0||plot.household||plot.progressDays>0||plot.burning);
  const count=plots.length-kept.length;town.homePlots=kept;
  return {ok:count>0,message:count?`Cleared ${count} empty plot${count===1?'':'s'}.`:'Only an empty plot can be cleared.'};
});
function storeCell(town,plot) {
  const stores=Object.entries(town.goods?.stockpiles||{}).map(([key,stock])=>({key,stock,parts:key.split(':')}))
    .map(item=>({...item,regionId:item.parts[0],x:Number(item.parts[1]),z:Number(item.parts[2])}))
    .filter(item=>item.regionId===plot.regionId)
    .sort((a,b)=>Math.abs(a.x-plot.x)+Math.abs(a.z-plot.z)-Math.abs(b.x-plot.x)-Math.abs(b.z-plot.z));
  return stores.find(item=>Object.entries(item.stock?.goods||{}).every(([good,amount])=>(amount||0)>=(TOWN_HOME_TYPES[plot.tier+1]?.goods?.[good]||0)))||stores[0]||null;
}
function findHousehold(town,plot) {
  const families=new Map();
  for(const person of town.people||[]) if(String(person.homeType||'canvas').toLowerCase().includes('canvas')) {
    const list=families.get(person.family)||[];list.push(person);families.set(person.family,list);
  }
  return [...families.entries()].find(([family])=>!town.homePlots.some(p=>p.household===family))||null;
}
function startConstruction(town,plot,next,family) {
  const store=storeCell(town,plot);
  if(!store){plot.waitingGood=Object.keys(next.goods)[0]||null;reportShortage(town,plot,next);return;}
  for(const [good,amount] of Object.entries(next.goods)) if((stockpileAt(town,{regionId:store.regionId,x:store.x,z:store.z})[good]||0)<amount) {
    plot.waitingGood=good;reportShortage(town,plot,next);return;
  }
  for(const [good,amount] of Object.entries(next.goods)) takeGood(town,{regionId:store.regionId,x:store.x,z:store.z},good,amount);
  plot.household=family; plot.family=family; plot.progressDays=0; plot.building=true; plot.waitingGood=null;
  for(const person of town.people) if(person.family===plot.family) {person.home=plot.id;person.homeType='Under construction';}
}
function reportShortage(town,plot,type) {
  const count=(town.homePlots||[]).filter(item=>item.tier===plot.tier&&item.waitingGood).length;
  const label=type.label.endsWith('s')?type.label:`${type.label}s`;
  raiseTownReport(town,'home-goods-shortage',{homeGoodsShortage:true,where:`${plot.regionId} ${plot.x}, ${plot.z}`,
    detail:`${label} going up, ${count} of ${(town.homePlots||[]).length}. Short of ${plot.waitingGood}.`});
}
export function stepTownHomeGround({town,tick}) {
  const plots=ensureHomeGround(town); if(BigInt(tick)%BigInt(DAY)!==0n) return;
  for(const plot of plots) {
    if(plot.burning) continue;
    if(!plot.household) {const family=findHousehold(town,plot);if(family)startConstruction(town,plot,TOWN_HOME_TYPES[plot.tier+1],family[0]);continue;}
    const next=TOWN_HOME_TYPES[plot.tier+1]; if(!next) continue;
    if(plot.building) plot.progressDays++;
    else {
      const household=(town.people||[]).filter(person=>person.family===plot.family);
      const supported=household.length&&household.every(person=>person.mood>=50&&person.needs?.shelter!==false&&person.needs?.waterLitres>=person.needs?.waterNeedLitres&&person.needs?.foodCalories>=2100);
      plot.goodDays=supported?(plot.goodDays||0)+1:0;
      if(plot.goodDays>=180) {plot.goodDays=0;startConstruction(town,plot,next,plot.household);}
      continue;
    }
    if(plot.progressDays>=next.days) {
      plot.tier++;
      for(const person of town.people) if(person.family===plot.family) {
        person.home=plot.id;person.homeType=next.label;person.homeTier=plot.tier;
      }
      plot.progressDays=0; plot.building=false; plot.waitingGood=null;
    }
  }
}
registerTownSystem('home-ground',11,1,stepTownHomeGround);
