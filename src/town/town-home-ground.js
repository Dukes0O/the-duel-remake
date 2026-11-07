import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';
import {cellIsReserved, ensureTownRegion, getTownChunk, TOWN_REGIONS} from './town-world-data.js';
import {TOWN_HOME_TYPES} from './content/homes.js';
import {stockpileAt, takeGood} from './town-goods.js';
import {raiseTownReport} from './town-reports.js';

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
  const canClear=plot=>plot.tier===0&&!plot.household&&!plot.progressDays&&!plot.building&&!plot.burning;
  const cleared=plots.filter(plot=>remove.has(plotKey(plot))&&canClear(plot)).length;
  const blocked=plots.filter(plot=>remove.has(plotKey(plot))&&!canClear(plot)).length;
  town.homePlots=plots.filter(plot=>!remove.has(plotKey(plot))||!canClear(plot));
  if(blocked) return {ok:cleared>0,message:`Cleared ${cleared} empty ${cleared===1?'plot':'plots'}. ${blocked===1
    ?'1 plot could not be cleared because it has a home, is burning or is under construction.'
    :`${blocked} plots could not be cleared because they have homes, are burning or are under construction.`}`};
  return {ok:cleared>0,message:cleared?`Cleared ${cleared} empty plot${cleared===1?'':'s'}.`:'Only an empty plot can be cleared. Cleared 0 plots.'};
});
function storeCell(town,plot) {
  const stores=Object.entries(town.goods?.stockpiles||{}).map(([key,stock])=>({key,stock,parts:key.split(':')}))
    .map(item=>({...item,regionId:item.parts[0],x:Number(item.parts[1]),z:Number(item.parts[2])}))
    .filter(item=>item.regionId===plot.regionId)
    .sort((a,b)=>Math.abs(a.x-plot.x)+Math.abs(a.z-plot.z)-Math.abs(b.x-plot.x)-Math.abs(b.z-plot.z));
  return stores.find(item=>Object.entries(item.stock?.goods||{}).every(([good,amount])=>(amount||0)>=(TOWN_HOME_TYPES[plot.tier+1]?.goods?.[good]||0)))||stores[0]||null;
}
function homeGroundIndexes(town,plots) {
  const peopleByFamily=new Map(),canvasFamilies=[],canvasFamilySet=new Set();
  for(const person of town.people||[]) {
    if(!peopleByFamily.has(person.family)) peopleByFamily.set(person.family,[]);
    peopleByFamily.get(person.family).push(person);
    if(String(person.homeType||'canvas').toLowerCase().includes('canvas')&&!canvasFamilySet.has(person.family)) {
      canvasFamilySet.add(person.family);
      canvasFamilies.push({family:person.family});
    }
  }
  return {peopleByFamily,canvasFamilies,assignedFamilies:new Set(plots.map(plot=>plot.household).filter(Boolean))};
}
function nextHousehold(indexes,cursor) {
  while(cursor.index<indexes.canvasFamilies.length&&indexes.assignedFamilies.has(indexes.canvasFamilies[cursor.index].family)) cursor.index++;
  return indexes.canvasFamilies[cursor.index]||null;
}
function startConstruction(town,plot,next,family,peopleByFamily) {
  const store=storeCell(town,plot);
  if(!store){plot.waitingGood=Object.keys(next.goods)[0]||null;return;}
  for(const [good,amount] of Object.entries(next.goods)) if((stockpileAt(town,{regionId:store.regionId,x:store.x,z:store.z})[good]||0)<amount) {
    plot.waitingGood=good;return;
  }
  for(const [good,amount] of Object.entries(next.goods)) takeGood(town,{regionId:store.regionId,x:store.x,z:store.z},good,amount);
  plot.household=family; plot.family=family; plot.progressDays=0; plot.building=true; plot.waitingGood=null;plot.burnt=false;
  for(const person of peopleByFamily.get(family)||[]) {person.home=plot.id;person.homeType='Under construction';}
}
export function stepTownHomeGround({town}) {
  const plots=ensureHomeGround(town),indexes=homeGroundIndexes(town,plots),cursor={index:0};
  const shortages=new Map();
  for(const plot of plots) {
    if(plot.burning) continue;
    if(!plot.household) {
      const family=nextHousehold(indexes,cursor);
      if(family) {
        const homeType=TOWN_HOME_TYPES[plot.tier+1];
        startConstruction(town,plot,homeType,family.family,indexes.peopleByFamily);
        if(!plot.household&&plot.waitingGood) shortages.set(plot.waitingGood,(shortages.get(plot.waitingGood)||0)+1);
        if(plot.household) indexes.assignedFamilies.add(family.family);
      }
      continue;
    }
    const next=TOWN_HOME_TYPES[plot.tier+1]; if(!next) continue;
    if(plot.building) plot.progressDays++;
    else {
      const household=indexes.peopleByFamily.get(plot.family)||[];
      const supported=household.length&&household.every(person=>person.mood>=50&&person.needs?.shelter!==false&&person.needs?.waterLitres>=person.needs?.waterNeedLitres&&person.needs?.foodCalories>=2100);
      plot.goodDays=supported?(plot.goodDays||0)+1:0;
      if(plot.goodDays>=180) {plot.goodDays=0;startConstruction(town,plot,next,plot.household,indexes.peopleByFamily);}
      continue;
    }
    if(plot.progressDays>=next.days) {
      plot.tier++;
      for(const person of indexes.peopleByFamily.get(plot.family)||[]) {
        person.home=plot.id;person.homeType=next.label;person.homeTier=plot.tier;
      }
      plot.progressDays=0; plot.building=false; plot.waitingGood=null;
    }
  }
  for(const [good,count] of shortages) {
    const type=TOWN_HOME_TYPES.find(item=>item.goods?.[good])||TOWN_HOME_TYPES[1];
    const label=type.label.endsWith('s')?type.label:`${type.label}s`;
    const where=`Home plots: ${good}`;
    for(const report of town.reports||[]) if(report.unanswered&&report.eventId==='home-goods-shortage'
      &&report.where!==where&&(report.facts?.good===good||String(report.facts?.detail||'').includes(`Short of ${good}.`))) {
      report.unanswered=false;report.outcome='This shortage is now included in the town-wide report.';report.answeredTick=BigInt(town.tick);
    }
    raiseTownReport(town,'home-goods-shortage',{homeGoodsShortage:true,good,where,
      detail:`${label} going up, ${count} of ${plots.length}. Short of ${good}.`});
  }
}
registerTownSystem('home-ground',11,24,stepTownHomeGround);
