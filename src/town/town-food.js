import {FARM_CONTENT} from './content/farm.js';
import {runTownRecipe,stockpileAt,takeGood,storeGood} from './town-goods.js';
import {registerTownSystem} from './town-sim.js';

const DAY_TICKS=24;
const farmBuildings=new Set(Object.keys(FARM_CONTENT.buildings));
const dayNumber=calendar=>(BigInt(calendar.year)-1n)*360n+BigInt((calendar.month-1)*30+calendar.day);
const complete=building=>building.state==='finished'||building.state==='complete';
const stockpileKey=building=>`${building.regionId||'scablands'}:${building.x}:${building.z}`;

function ensureFarm(town) {
  town.farm||={};
  town.farm.lastDay??=null;
  town.farm.lots||={};
  return town.farm;
}

function ageFood(town,farm) {
  const goods=town.goods?.stockpiles||{};
  for(const [key,stock] of Object.entries(goods)) for(const good of Object.keys(FARM_CONTENT.shelfLifeDays)) {
    const shelf=FARM_CONTENT.shelfLifeDays[good];
    let lots=farm.lots[key]?.[good];
    const amount=Math.max(0,Number(stock.goods?.[good]||0));
    if(!lots) {
      if(amount>0) {
        farm.lots[key]||={};
        lots=farm.lots[key][good]=[{age:0,amount}];
      }
    }
    if(!lots) continue;
    const tracked=lots.reduce((sum,lot)=>sum+lot.amount,0);
    if(amount>tracked) lots.push({age:0,amount:amount-tracked});
    else if(amount<tracked) {
      let removed=tracked-amount;
      lots.sort((a,b)=>b.age-a.age);
      for(const lot of lots) {
        const take=Math.min(lot.amount,removed);
        lot.amount-=take;
        removed-=take;
        if(removed<=1e-9) break;
      }
      lots=lots.filter(lot=>lot.amount>1e-9);
    }
    for(const lot of lots) lot.age++;
    const expired=lots.filter(lot=>lot.age>=shelf).reduce((sum,lot)=>sum+lot.amount,0);
    if(expired>0) stock.goods[good]=Math.max(0,(stock.goods[good]||0)-expired);
    const kept=lots.filter(lot=>lot.age<shelf);
    if(kept.length) farm.lots[key][good]=kept; else delete farm.lots[key][good];
  }
}

function addFoodLot(farm,key,good,amount) {
  if(!FARM_CONTENT.shelfLifeDays[good]||amount<=0) return;
  farm.lots[key]||={};
  farm.lots[key][good]||=[];
  farm.lots[key][good].push({age:0,amount});
}

function consumeLots(farm,key,good,amount) {
  const lots=farm.lots[key]?.[good];
  if(!lots) return;
  let remaining=amount;
  lots.sort((a,b)=>b.age-a.age);
  for(const lot of lots) {
    const used=Math.min(lot.amount,remaining);
    lot.amount-=used;
    remaining-=used;
    if(remaining<=1e-9) break;
  }
  farm.lots[key][good]=lots.filter(lot=>lot.amount>1e-9);
}

function waterFor(town,building) {
  const tapId=`farm-water:${building.id}`;
  const tap=town.utilities?.waterResult?.taps?.find(item=>item.id===tapId);
  return tap?Math.min(1,tap.litresPerDay/(building.farmWaterDemand||1)):0;
}

function staffCare(town,building,required) {
  if(!required) return 1;
  const staff=(town.people||[]).filter(person=>person.jobBuildingId===building.id).length;
  return Math.min(1,staff/required);
}

function prepareFarmWater(town,weather,calendar) {
  town.utilities||={};
  town.utilities.taps||=[];
  const desired=new Map();
  for(const building of town.buildings||[]) {
    const content=FARM_CONTENT.buildings[building.buildingId];
    if(!content||!complete(building)) continue;
    const growing=content.seasonalKgPerDay?.Spring!==undefined;
    const demand=(growing&&calendar.season==='Winter'?0:content.waterLitresPerDay)*weather.waterUseFactor;
    building.farmWaterDemand=demand;
    desired.set(`farm-water:${building.id}`,{id:`farm-water:${building.id}`,x:building.x,z:building.z,litresPerDay:demand,kind:'farm'});
  }
  town.utilities.taps=town.utilities.taps.filter(tap=>!String(tap.id).startsWith('farm-water:'));
  town.utilities.taps.push(...desired.values());
}

function produce(town,farm,calendar,weather) {
  const reports=[];
  for(const building of town.buildings||[]) {
    const content=FARM_CONTENT.buildings[building.buildingId];
    if(!content||!complete(building)) continue;
    const water=waterFor(town,building);
    const care=staffCare(town,building,content.staff);
    let base=content.seasonalKgPerDay?.[calendar.season]??content.unitsPerDay??0;
    if(weather.temperatureC>=35) base*=0.8;
    const amount=base*water*care*weather.droughtFactor;
    building.farmWaterRatio=water;
    building.farmCare=care;
    building.farmYield=amount;
    if(amount<=0) {reports.push({buildingId:building.id,water,care,amount:0});continue;}
    const key=stockpileKey(building);
    storeGood(town,{regionId:building.regionId||'scablands',x:building.x,z:building.z},content.good,amount);
    addFoodLot(farm,key,content.good,amount);
    reports.push({buildingId:building.id,water,care,amount});
  }
  return reports;
}

function cookMeals(town,farm) {
  for(const building of town.buildings||[]) {
    if(building.buildingId!=='soup-kitchen'||!complete(building)) continue;
    const staffed=(town.people||[]).some(person=>person.jobBuildingId===building.id);
    if(!staffed) continue;
    const result=runTownRecipe(town,building,'kitchen-meal',{staffPresent:1});
    if(result.ok) addFoodLot(farm,stockpileKey(building),'meal',result.outputs.meal||0);
  }
}

function eatFood(town,farm) {
  const people=town.people||[];
  const target=people.length*2100;
  let calories=0;
  let remaining=target;
  for(const good of FARM_CONTENT.consumptionOrder) {
    if(remaining<=0) break;
    const perUnit=FARM_CONTENT.calories[good];
    for(const [key,stock] of Object.entries(town.goods?.stockpiles||{})) {
      const amount=Math.min(stock.goods?.[good]||0,remaining/perUnit);
      if(amount<=0) continue;
      takeGood(town,parseKey(key),good,amount);
      consumeLots(farm,key,good,amount);
      const eaten=amount*perUnit;
      calories+=eaten;
      remaining-=eaten;
      if(remaining<=0) break;
    }
  }
  town.peopleConditions||={};
  town.peopleConditions.foodCaloriesPerPerson=people.length?calories/people.length:2100;
  town.farm.foodCaloriesServed=calories;
  town.farm.foodShortfallCalories=remaining;
}

function parseKey(key) {
  const last=key.lastIndexOf(':');
  const before=key.lastIndexOf(':',last-1);
  return {regionId:key.slice(0,before),x:Number(key.slice(before+1,last)),z:Number(key.slice(last+1))};
}

export function stepTownFood({town,calendar}) {
  if(!town||!Array.isArray(town.buildings)) return;
  const weather=town.weather||{temperatureC:20,droughtFactor:1,waterUseFactor:1};
  prepareFarmWater(town,weather,calendar);
  const day=dayNumber(calendar);
  const farm=ensureFarm(town);
  if(farm.lastDay===day) return;
  farm.lastDay=day;
  ageFood(town,farm);
  farm.production=produce(town,farm,calendar,weather);
  cookMeals(town,farm);
  eatFood(town,farm);
}

export function townFoodSummary(town) {
  return {caloriesPerPerson:town.peopleConditions?.foodCaloriesPerPerson??null,
    production:[...(town.farm?.production||[])],shortfallCalories:town.farm?.foodShortfallCalories??0};
}

registerTownSystem('town-food',15,DAY_TICKS,stepTownFood);
