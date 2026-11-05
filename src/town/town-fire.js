import {buildingById} from './content/registry.js';
import {registerTownSystem} from './town-sim.js';

const HOURS_PER_YEAR = 360 * 24;
const BUILDING_FUEL = Object.freeze({timber:24, canvas:8, fuel:1});
const SEASON_WIND = Object.freeze({Spring:1, Summer:0.65, Autumn:0.85, Winter:0.9});

function fuelHours(building) {
  const row=buildingById.get(building.buildingId);
  if(!row) return 0;
  return Object.entries(row.materials).reduce((total,[material,amount])=>
    total+(BUILDING_FUEL[material]||0)*(amount>0?1:0),0);
}

function protectedFromFire(building,tick) {
  return typeof building.fireProtectedUntilTick==='bigint' && tick<=building.fireProtectedUntilTick
    || Number.isSafeInteger(building.fireProtectedUntilTick) && tick<=BigInt(building.fireProtectedUntilTick);
}

function canBurn(building,tick) {
  return building.state==='finished' && fuelHours(building)>0 && !protectedFromFire(building,tick)
    && !building.fireStage && !building.fireOut;
}

export function igniteTownFire(town,buildingId) {
  const tick=BigInt(town.tick);
  const building=town.buildings.find(item=>item.id===buildingId);
  if(!building || !canBurn(building,tick)) return false;
  building.fireStage=1;
  building.fireStartedTick=tick;
  return true;
}

// Reports the amount one hose can deliver in the current game hour. It does
// not alter the town; callers decide how to apply the water and spend it.
export function hoseFire(town,buildingId,litres) {
  if(!Number.isFinite(litres)||litres<=0) return {ok:false,litres:0,message:'Use more than zero litres of water.'};
  const fire=town.buildings.find(item=>item.id===buildingId);
  if(!fire?.fireStage) return {ok:false,litres:0,message:'That building is not burning.'};
  const hydrants=town.buildings.filter(item=>item.buildingId==='hydrant'||item.buildingId==='fire-hydrant');
  const hydrant=hydrants.find(item=>item.regionId===fire.regionId&&item.x===fire.x&&item.z===fire.z);
  const flow=Number.isFinite(hydrant?.flowLitresPerMinute)?Math.max(0,hydrant.flowLitresPerMinute):0;
  const used=fire.fireWaterTick===BigInt(town.tick)?(fire.fireWaterThisHour||0):0;
  const delivered=Math.min(litres,Math.max(0,flow*60-used));
  return {ok:delivered>0,litres:delivered,message:delivered>0?'The hose is putting water on the fire.':'No water is reaching this hydrant.'};
}

export function applyHoseFire(town,buildingId,litres) {
  const result=hoseFire(town,buildingId,litres);
  if(!result.ok) return result;
  const fire=town.buildings.find(item=>item.id===buildingId);
  if(fire.fireWaterTick!==BigInt(town.tick)) fire.fireWaterThisHour=0;
  fire.fireWaterTick=BigInt(town.tick);
  fire.fireWaterThisHour+=result.litres;
  fire.fireWaterLitres=(fire.fireWaterLitres||0)+result.litres;
  // Section 14 gives the truck's pump as 1,000 L/min, so one pump-minute is
  // the water budget for knocking down one burning building at this stage.
  const required=1000;
  if(fire.fireWaterLitres>=required) {
    delete fire.fireStage;
    delete fire.fireStartedTick;
    delete fire.fireWaterLitres;
    delete fire.fireWaterThisHour;
    delete fire.fireWaterTick;
    fire.fireOut=true;
  }
  return result;
}

export function stepTownFire({town,rng,tick,calendar}) {
  const active=town.buildings.filter(building=>building.fireStage);
  if(active.length) {
    const wind=SEASON_WIND[calendar.season]||0.8;
    const day=(calendar.year-1)*360+(calendar.month-1)*30+calendar.day;
    if(town.fireWindDay!==day) {
      town.fireWindDay=day;
      town.fireWindDirection=rng.int(0,3);
    }
    const direction=town.fireWindDirection;
    const offsets=[[1,0],[0,1],[-1,0],[0,-1]];
    const [wx,wz]=offsets[direction];
    for(const fire of active) {
      const targetStage=fire.fireStage+1;
      const hours=fuelHours(fire);
      if(targetStage>hours) {
        fire.state=`burnt-${targetStage-1}`;
        delete fire.fireStage;
        continue;
      }
      fire.fireStage=targetStage;
      const target=town.buildings.find(building=>building.regionId===fire.regionId
        && building.x===fire.x+wx && building.z===fire.z+wz && canBurn(building,tick));
      if(target && rng.chance(Math.min(0.8,0.2*wind))) {
        target.fireStage=1;
        target.fireStartedTick=tick;
      }
    }
    return;
  }

  // One expected accidental ignition per town-year. The player can still
  // start the chapter's first fire explicitly with igniteTownFire.
  const chance=1/HOURS_PER_YEAR;
  if(!rng.chance(chance)) return;
  const candidates=town.buildings.filter(building=>canBurn(building,tick));
  if(candidates.length) igniteTownFire(town,candidates[rng.int(0,candidates.length-1)].id);
}

registerTownSystem('fire',20,1,stepTownFire);
