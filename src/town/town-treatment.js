import {registerTownSystem} from './town-sim.js';
import {treatTownWater, solveTownSewers} from './town-pipes.js';
import {TOWN_REGIONS} from './town-world-data.js';
import {ensureUtilityState} from './town-pipes.js';

const CAPACITY_PER_PERSON_LITRES_DAY=50;

/** Run each real treatment stage in order and keep its turbidity with the water. */
export function runTownTreatment({water,plants=[],reedBeds=[],sewers=[],sewage=[],groundAt=()=>0,waterNetwork=null}) {
  if(!water||!Array.isArray(plants)||!Array.isArray(reedBeds)) throw new TypeError('Treatment needs water, plants and reed beds.');
  let supply=Number(water.litresPerDay??0),quality=water.quality??{turbidity:10,stage:'raw'};
  if(!Number.isFinite(supply)||supply<0) throw new TypeError('Treatment water must be non-negative litres per day.');
  const results=plants.map((plant,index)=>{
    const id=String(plant.id??`treatment-${index+1}`),stages=Array.isArray(plant.stages)?plant.stages:[];
    const solved=waterNetwork?.treatments?.find(item=>item.id===id);
    if(waterNetwork) return {id,processedLitresPerDay:solved?.processedLitresPerDay??0,remainingLitresPerDay:Math.max(0,supply-(solved?.processedLitresPerDay??0)),quality:solved?.quality??quality,clean:Boolean(solved?.processedLitresPerDay&&(stages.includes('boil')||stages.includes('chlorine')))};
    const capacity=Number(plant.capacityLitresPerDay??200_000),processed=Math.min(supply,capacity),treated=treatTownWater(quality,stages);
    supply-=processed;
    return {id,processedLitresPerDay:processed,remainingLitresPerDay:Math.max(0,supply),quality:treated,clean:stages.includes('boil')||stages.includes('chlorine')};
  });
  const sewer=solveTownSewers({sewers,loads:sewage,groundAt,reedBeds:reedBeds.map(bed=>({...bed,capacityLitresPerDay:bed.capacityLitresPerDay??(bed.people??200)*CAPACITY_PER_PERSON_LITRES_DAY}))});
  return {plants:results,treatedLitresPerDay:results.reduce((sum,item)=>sum+item.processedLitresPerDay,0),cleanLitresPerDay:results.filter(item=>item.clean).reduce((sum,item)=>sum+item.processedLitresPerDay,0),sewer};
}

registerTownSystem('water-treatment',37,24,({town})=>{
  const utilities=ensureUtilityState(town),region=TOWN_REGIONS.get(utilities.regionId??'scablands');
  const groundAt=region?((x,z)=>region.groundHeightAt(x,z)):(()=>0);
  const water=utilities.waterResult?.delivered??0;
  const quality=utilities.waterResult?.taps?.find(tap=>tap.litresPerDay>0)?.quality??utilities.quality??{turbidity:10,stage:'raw'};
  town.treatment=runTownTreatment({water:{litresPerDay:water,quality},waterNetwork:utilities.waterResult,
    plants:utilities.treatmentPlants??[],reedBeds:utilities.reedBeds??[],sewers:utilities.sewers,sewage:utilities.sewage,groundAt});
});
