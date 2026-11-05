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
assert.equal(solveTownWater({
  pipes:[{from:{x:0,z:0},to:{x:10,z:0},sizeMm:100}],sources:[{x:0,z:0,elevation:12,litresPerDay:1000}],
  taps:[{id:'high tap',x:10,z:0,elevation:13,litresPerDay:1000}],groundAt:()=>13,
}).delivered,0,'a tap above its tower gets no water');
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
const sewage=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{id:'homes',x:10,z:0,litresPerDay:500}],groundAt:(x)=>-x,reedBeds:[{x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(sewage.cleanedLitresPerDay,500,'a downhill sewer carries waste to a reed bed');
assert.equal(sewage.sewers[0].flows,true,'the sewer falls toward its outlet');
const blocked=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{x:10,z:0,litresPerDay:500}],groundAt:(x)=>x,reedBeds:[{x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(blocked.cleanedLitresPerDay,0,'an uphill sewer does not carry waste');
const limitedBed=solveTownSewers({sewers:[{from:{x:0,z:0},to:{x:10,z:0}}],loads:[{x:10,z:0,litresPerDay:600},{x:10,z:0,litresPerDay:600}],groundAt:(x)=>-x,reedBeds:[{x:10,z:0,capacityLitresPerDay:1000}]});
assert.equal(limitedBed.cleanedLitresPerDay,1000,'one reed bed cannot clean more than its daily capacity');
const treatment=runTownTreatment({water:{litresPerDay:1200,quality:{turbidity:10}},plants:[{id:'works',capacityLitresPerDay:1000,stages:['settling','sand-filter','boil']}]});
assert.equal(treatment.cleanLitresPerDay,1000,'the plant only treats its real daily capacity');
assert.equal(treatment.plants[0].quality.turbidity,0.5,'the plant keeps the water quality changes with its output');

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
assert.equal(town.power.generationKw,5,'the power system runs from saved utility inputs');
assert.deepEqual([town.power.in,town.power.out],[5,2],'the town summary shows power in and out');
const loaded=deserializeTown(serializeTown(town));
assert.deepEqual(loaded.utilities,town.utilities,'the utility network and its overlay inputs survive save and load');
assert.deepEqual(loaded.power,town.power,'the power result survives save and load');

console.log('TOWN-PIPES: pipe pressure, water limits, queues, buckets, latrines, treatment, sewers, power and saved overlays passed.');
