import assert from 'node:assert/strict';
import {advanceWork, bucketWaterCost, checkTownLatrine, completeTownUtilityRoute, createTown, createWorkOrder, deserializeTown, registeredTownSystems, runTownTreatment, serializeTown, solveTownPower, solveTownWater, stepTown, treatTownWater, solveTownSewers} from '../src/town/index.js';

const water=(sizeMm,length)=>solveTownWater({
  pipes:[{id:`pipe-${sizeMm}`,from:{x:0,z:0},to:{x:length,z:0},sizeMm}],
  sources:[{id:'tower',kind:'water-road',x:0,z:0,elevation:12,litresPerDay:100_000}],
  taps:[{id:'tap',x:length,z:0,elevation:0,litresPerDay:100_000}],groundAt:()=>0,waterLimitLitresPerDay:10_000,
});

const wide=water(200,1000),thin=water(50,1000);
assert.equal(wide.delivered,10_000,'the Water Road tap cannot draw more than its daily limit');
assert.ok(thin.taps[0].pressureMetres<wide.taps[0].pressureMetres,'a long thin pipe loses more pressure');
assert.equal(wide.taps[0].queueMinutes,10_000/7.5,'the tap queue uses its real 7.5 litre minute rate');
assert.deepEqual(wide.overlay[0],{id:'tap',x:1000,z:0,pressureMetres:wide.taps[0].pressureMetres,litresPerDay:10_000,shortfallLitresPerDay:90_000},'water shortfalls include the map cell to show');
const localWell=solveTownWater({pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100}],sources:[{kind:'well',x:0,z:0,elevation:12,litresPerDay:1000}],taps:[{x:10,z:0,elevation:0,litresPerDay:1000}],groundAt:()=>0,waterLimitLitresPerDay:0});
assert.equal(localWell.delivered,1000,'the Water Road limit does not cap a local well');
const dryBranch=solveTownWater({pipes:[{from:{x:10,z:0},to:{x:20,z:0},sizeMm:100}],sources:[{id:'remote',x:0,z:0,elevation:12,litresPerDay:1000},{id:'dry',x:10,z:0,elevation:12,litresPerDay:0}],
  taps:[{x:20,z:0,litresPerDay:500}],groundAt:()=>0});
assert.equal(dryBranch.delivered,0,'an unrelated full source cannot supply a tap connected only to a dry source');
const pooledSources=solveTownWater({pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100},{from:{x:10,z:0},to:{x:20,z:0},sizeMm:100},{from:{x:20,z:0},to:{x:30,z:0},sizeMm:100}],
  sources:[{id:'north-well',x:0,z:0,elevation:12,litresPerDay:100},{id:'south-well',x:20,z:0,elevation:12,litresPerDay:100}],
  taps:[{id:'shared-tap',x:30,z:0,litresPerDay:200}],groundAt:()=>0});
assert.equal(pooledSources.delivered,200,'one tap draws enough from multiple connected sources to meet its demand');
assert.deepEqual([...pooledSources.taps[0].sourceIds].sort(),['north-well','south-well'],'the tap reports every source that supplied it');
const drySource=solveTownWater({pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100}],sources:[{id:'dry-well',x:0,z:0,elevation:12,litresPerDay:0}],
  taps:[{id:'dry-tap',x:10,z:0,elevation:0,litresPerDay:500}],groundAt:()=>0});
assert.equal(drySource.taps[0].message,'dry-tap has no water available.','a connected but empty source is not reported as a pressure problem');
const highTap=solveTownWater({
  pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100}],sources:[{x:0,z:0,elevation:12,litresPerDay:1000}],
  taps:[{id:'high tap',x:10,z:0,elevation:13,litresPerDay:1000}],groundAt:()=>13,
});
assert.equal(highTap.delivered,0,'a tap above its tower gets no water');
assert.equal(highTap.taps[0].message,'high tap is higher than its water tower.','a source with water but too little head is reported as a pressure problem');
assert.equal(solveTownWater({pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100}],sources:[{id:'tower',kind:'water-tower',x:0,z:0,litresPerDay:1000}],
  taps:[{x:10,z:0,litresPerDay:1000}],groundAt:()=>5}).taps[0].pressureMetres>11,true,'a 12 metre tower adds real head above local ground');

assert.deepEqual(bucketWaterCost({people:20,distanceMetres:40}),{
  litresPerDay:1000,queueMinutesPerDay:1000/7.5,carryTripsPerDay:50,carryMinutesPerDay:50,totalHoursPerDay:(1000/7.5+50)/60,
},'people carry buckets until they have a tap, including queue and walking time');
assert.equal(bucketWaterCost({people:20,litresPerPersonDay:15}).litresPerDay,300,'15 litres per person is the lower daily need');
assert.throws(()=>bucketWaterCost({people:20,litresPerPersonDay:14}),/15 to 50 litres/,'water need stays inside the real 15 to 50 litre range');
const latrine=checkTownLatrine({x:40,z:0,elevation:2,well:{x:0,z:0,elevation:5},people:42,ageDays:730});
assert.equal(latrine.meetsRule,true,'the latrine is 40 metres away and downhill');
assert.equal(latrine.peopleServed,20,'one latrine serves 20 people');
assert.equal(latrine.peopleWithoutLatrine,22,'extra people need another latrine');
assert.equal(latrine.filled,true,'the pit fills after about two years');

assert.deepEqual(treatTownWater({turbidity:10,stage:'raw'},['settling','sand-filter','chlorine']).turbidity,0.5,'settling and a sand filter lower turbidity while chlorine carries that number through');
const sewage=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{id:'homes',x:0,z:0,litresPerDay:500}],groundAt:(x)=>-x,reedBeds:[{id:'bed',x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(sewage.cleanedLitresPerDay,500,'a downhill sewer carries waste to a reed bed');
assert.equal(sewage.sewers[0].flows,true,'the sewer falls toward its outlet');
const chainedSewer=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}},{from:{x:10,z:0},to:{x:20,z:0}}],loads:[{x:0,z:0,litresPerDay:500}],groundAt:(x)=>-x,reedBeds:[{x:20,z:0,capacityLitresPerDay:1000}]});
assert.equal(chainedSewer.cleanedLitresPerDay,500,'sewage follows connected sewer segments to the downstream reed bed');
const uphillSewerSegment=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}},{from:{x:10,z:0},to:{x:20,z:0}}],loads:[{x:0,z:0,litresPerDay:500}],
  groundAt:(x)=>x===10?5:x===20?-10:0,reedBeds:[{x:20,z:0,capacityLitresPerDay:1000}]});
assert.equal(uphillSewerSegment.cleanedLitresPerDay,0,'a downhill total cannot carry sewage across an uphill segment');
assert.equal(uphillSewerSegment.loads[0].flows,false,'the sewer chain stops when its next segment rises');
const blocked=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{x:0,z:0,litresPerDay:500}],groundAt:(x)=>x,reedBeds:[{x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(blocked.cleanedLitresPerDay,0,'an uphill sewer does not carry waste');
const limitedBed=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{x:0,z:0,litresPerDay:600},{x:0,z:0,litresPerDay:600}],groundAt:(x)=>-x,reedBeds:[{x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(limitedBed.cleanedLitresPerDay,1000,'one reed bed cannot clean more than its daily capacity');
const treatment=runTownTreatment({water:{litresPerDay:1200,quality:{turbidity:10}},plants:[{id:'works',capacityLitresPerDay:1000,stages:['settling','sand-filter','boil']}]});
assert.equal(treatment.cleanLitresPerDay,1000,'the plant only treats its real daily capacity');
assert.equal(treatment.plants[0].quality.turbidity,0.5,'the plant keeps the water quality changes with its output');
const treatedNetwork=solveTownWater({pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100},{from:{x:10,z:0},to:{x:20,z:0},sizeMm:100}],
  sources:[{id:'well',x:0,z:0,elevation:12,litresPerDay:1000,quality:{turbidity:10,stage:'raw'}}],
  taps:[{id:'homes',x:20,z:0,litresPerDay:1000}],treatments:[{id:'works',x:10,z:0,capacityLitresPerDay:800,stages:['settling','sand-filter','chlorine']}],groundAt:()=>0});
assert.equal(treatedNetwork.taps[0].quality.turbidity,2.4,'treatment quality reaches downstream taps with the treated water volume');
assert.equal(treatedNetwork.taps[0].treatedLitresPerDay,800,'a treatment plant cannot pass more than its daily capacity');
assert.equal(treatedNetwork.treatments[0].processedLitresPerDay,800,'the treatment report matches water that passed through its node');
const linkedTreatment=runTownTreatment({water:{litresPerDay:1000,quality:{turbidity:10}},plants:[{id:'works',capacityLitresPerDay:800,stages:['settling','sand-filter','chlorine']}],waterNetwork:treatedNetwork});
assert.equal(linkedTreatment.cleanLitresPerDay,800,'the treatment report uses only treated water on the live network');
const sequentialTreatments={pipes:[{from:{x:5,z:0},to:{x:0,z:0},sizeMm:100},{from:{x:5,z:0},to:{x:10,z:0},sizeMm:100},{from:{x:15,z:0},to:{x:10,z:0},sizeMm:100}],
  sources:[{id:'raw-well',x:0,z:0,elevation:12,litresPerDay:100,quality:{turbidity:10,stage:'raw'}}],taps:[{id:'treated-homes',x:15,z:0,litresPerDay:100}],groundAt:()=>0};
const treatmentStages=[{id:'settling-tank',x:5,z:0,capacityLitresPerDay:100,stages:['settling']},{id:'sand-filter',x:10,z:0,capacityLitresPerDay:100,stages:['sand-filter']}];
const routeOrdered=solveTownWater({...sequentialTreatments,treatments:treatmentStages});
const inputReversed=solveTownWater({...sequentialTreatments,treatments:[...treatmentStages].reverse()});
assert.equal(routeOrdered.taps[0].quality.turbidity,0.5,'treatment stages apply in the order water reaches them');
assert.equal(inputReversed.taps[0].quality.turbidity,0.5,'treatment order follows the route rather than the input array');

const power=solveTownPower({generators:[{id:'wind',kind:'windmill',x:0,z:0},{id:'sun',kind:'solar-rack',x:0,z:0},{id:'engine',kind:'generator',x:0,z:0}],
  demands:[{id:'plant',x:0,z:0,kw:57}],wind:1,sunlight:1});
assert.equal(power.generationKw,53,'wind, sun and an engine give 5, 8 and 40 kW');
assert.equal(power.shortfallKw,4,'the power overlay reports the missing kW');
assert.equal(power.loads[0].message,'plant is short by 4.0 kW.','a power shortfall has a plain sentence');
assert.ok(Array.isArray(power.overlay),'power overlay data is a plain array');
const wired=solveTownPower({generators:[{id:'engine',kind:'generator',x:0,z:0}],wires:[{from:{x:0,z:0},to:{x:10,z:0}}],
  demands:[{id:'wired',x:10,z:0,kw:4},{id:'dark',x:20,z:0,kw:1}]});
assert.equal(wired.loads[0].suppliedKw,4,'a wire carries power to its connected demand');
assert.equal(wired.loads[1].message,'dark has no connected power line.','an unconnected cell has a plain sentence');

const town=createTown(765,'Pipe Town');
assert.ok(['water-network','power-network','water-treatment'].every(name=>registeredTownSystems().some(system=>system.name===name)),'the three town utility systems are registered');
const planned={id:'main-water',kind:'pipe',points:[{x:0,z:0},{x:25,z:0},{x:50,z:0}]};
const routeWork=createWorkOrder({id:'route-main-water',targetId:planned.id,targetKind:'route',stages:[{kind:'survey',amount:1}]});
assert.equal(completeTownUtilityRoute(town,planned,100,routeWork).ok,false,'a pipe is not live before its route work is done');
advanceWork(routeWork,0,1);
assert.equal(completeTownUtilityRoute(town,planned,100,routeWork).segments,2,'a finished route lays its pipe segments along the agreed path');
assert.equal(town.utilities.pipes[0].sizeMm,100,'the pipe keeps its selected size on its own layer');
assert.equal(completeTownUtilityRoute(town,planned,100,routeWork).ok,false,'a finished route cannot be connected twice');
town.utilities={pipes:[{id:'saved-pipe',from:{x:0,z:0},to:{x:1,z:0},sizeMm:100}],
  sources:[{id:'saved-tower',x:0,z:0,elevation:100,litresPerDay:500}],taps:[{id:'saved-tap',x:1,z:0,elevation:100,litresPerDay:500}],
  generators:[{id:'saved-wind',kind:'windmill',x:0,z:0}],powerDemands:[{id:'saved-load',x:0,z:0,kw:2}],windFactor:1,sunFactor:0};
for(let i=0;i<24;i++) stepTown(town);
assert.equal(town.utilities.waterResult.delivered,500,'the daily water system reports its delivered amount');
assert.deepEqual(town.water,{in:500,out:500,shortfall:0,overlay:town.utilities.waterResult.overlay},'the town summary exposes water totals and overlay cells');
// TOWN-FARM's weather now sets the wind each hour; the windmill follows it.
assert.ok(town.utilities.windFactor>0&&town.power.generationKw>0,'the power system runs from saved generators and the wind of the weather');
assert.equal(town.power.generationKw,solveTownPower({generators:town.utilities.generators,demands:town.utilities.powerDemands,wires:town.utilities.wires,wind:town.utilities.windFactor,sunlight:town.utilities.sunFactor}).generationKw,'the windmill makes what the wind of the day gives');
assert.deepEqual([town.power.in,town.power.out],[town.power.generationKw,2],'the town summary shows power in and out');
const loaded=deserializeTown(serializeTown(town));
assert.deepEqual(loaded.utilities,town.utilities,'the utility network and its overlay inputs survive save and load');
assert.deepEqual(loaded.power,town.power,'the power result survives save and load');

console.log('TOWN-PIPES: pipe pressure, water limits, queues, buckets, latrines, treatment, sewers, power and saved overlays passed.');
