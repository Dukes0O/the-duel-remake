import assert from 'node:assert/strict';
import {CONCRETE_KG_PER_M3, CONCRETE_MIX_KG_PER_M3, PLANT_CONTENT, PLANT_YARD} from '../src/machines/content/plant.js';
import {binsKg, createPlant, createPlantLedger, drumKg, drumM3, formCapacityKg, hopperKg, loaderBucketPoint,
  mixerChuteTip, mixerUnderPlant, pileKg, pileRadiusM, placeLocal, plantMassKg, siloKg, stepCrusher, stepLoader,
  stepMixer, stepPlant, stepSetting, tipIntoHopper} from '../src/machines/plant.js';
import {machineLoadMassKg} from '../src/machines/tools.js';
import {stockpileAt, priceForGood} from '../src/town/town-goods.js';
import {GOODS} from '../src/town/content/goods.js';
import {createTown, deserializeTown, serializeTown} from '../src/town/index.js';
import {closeDigSandbox, createDigSandbox, digSandboxMachineState, stepDigSandbox, switchDigMachine} from '../src/machines/dig-sandbox.js';
import {plantYardControls, plantYardWords} from '../src/machines/plant-yard.js';
import {machineDefinition} from '../src/machines/content/machines.js';
import {machineToolPosition} from '../src/machines/machine.js';

const STEP = 1 / 60;
const close = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`);
let checks = 0;
const check = (...args) => { close(...args); checks++; };

// The mix is real: 2,375 kg a cubic metre, water to cement 0.5.
assert.equal(CONCRETE_KG_PER_M3, 2_375);
assert.equal(CONCRETE_MIX_KG_PER_M3.water / CONCRETE_MIX_KG_PER_M3.cement, 0.5);
assert.ok(GOODS.some(good => good.id === 'cement' && good.unit === 'kg'), 'cement is a town good');

// The yard's stock is stored through TOWN-GOODS.
let plant = createPlant();
assert.equal(stockpileAt(plant.ledger, plant.cells.sandPile).sand, PLANT_YARD.stock.sandKg);
assert.equal(siloKg(plant), PLANT_YARD.stock.cementKg);
assert.equal(plant.waterLitres, PLANT_YARD.stock.waterLitres);
const startMass = plantMassKg(plant);

// Slice 1: the hopper takes the mass the truck carried, and the screen throws out dirt.
let tip = tipIntoHopper(plant, {rock:1.6, topsoil:0.2}, 2);
check(tip.acceptedKg, machineLoadMassKg({load:{rock:1.6}}), 1e-9, 'the hopper takes the rock the truck carried');
check(tip.screened.topsoil, 0.2, 1e-12, 'the topsoil is screened out for the ground');
assert.deepEqual(tip.load, {}, 'the bed is empty');
check(plantMassKg(plant), startMass + tip.acceptedKg, 1e-6, 'mass in equals mass held after a tip');
// A tip that would overfill the hopper stops, and the rest stays in the bed in proportion.
const big = createPlant();
tip = tipIntoHopper(big, {rock:12, gravel:4}, 16);
check(hopperKg(big), PLANT_CONTENT.crusher.hopperCapacityKg, 1e-6, 'the hopper fills to its capacity');
check(tip.load.rock / tip.load.gravel, 3, 1e-9, 'what stays in the bed keeps its mix');
check(machineLoadMassKg({load:{rock:12, gravel:4}}) - machineLoadMassKg({load:tip.load}), tip.acceptedKg, 1e-6, 'nothing is lost at a full hopper');
assert.match(tipIntoHopper(big, tip.load, 1).events[0].message, /hopper is full/);

// The jaw crushes 200 t an hour, the belt takes 20 m at 1.5 m/s, and every kilogram reaches the pile.
const rockKg = hopperKg(plant);
let firstLanding = null;
for (let i = 0; i < 60 * 100; i++) {
  const before = plantMassKg(plant);
  const events = stepCrusher(plant, STEP);
  check(plantMassKg(plant), before, 1e-6, 'the crusher and belt neither make nor lose gravel');
  if (firstLanding === null && events.some(event => event.type === 'gravel-landed')) firstLanding = (i + 1) * STEP;
}
check(firstLanding, PLANT_CONTENT.belt.lengthM / PLANT_CONTENT.belt.speedMps, 0.3, 'gravel takes the length of the belt to arrive');
check(pileKg(plant, 'gravel'), rockKg, 1e-6, 'all the rock became gravel on the pile');
assert.equal(hopperKg(plant), 0);
assert.equal(plant.belt.length, 0);
const rate = createPlant();
tipIntoHopper(rate, {rock:8}, 8);
const full = hopperKg(rate);
for (let i = 0; i < 600; i++) stepCrusher(rate, STEP);
check(full - hopperKg(rate), PLANT_CONTENT.crusher.crushKgPerSecond * 10, 1e-6, 'the jaw crushes at its rated speed');
check(pileRadiusM(1_600 * Math.PI / 3 * Math.tan(PLANT_CONTENT.pileReposeRadians)), 1, 1e-9, 'a pile is a cone at its natural slope');

// Slice 2: the loader scoops by pushing into a pile and tips into the bins, kilogram for kilogram.
const pile = PLANT_YARD.gravelPile;
const setMachine = (machine, x, z, heading) => ({...machine, x, z, heading, speedMps:0});
plant.loader.machine = setMachine(plant.loader.machine, pile.x + PLANT_CONTENT.loader.reachM + 0.5, pile.z, -Math.PI / 2);
let gravelBefore = pileKg(plant, 'gravel');
for (let i = 0; i < 60 * 6; i++) {
  const before = plantMassKg(plant);
  stepLoader(plant, {scoop:true, forward:i < 60 ? 0 : 0.01}, STEP);
  plant.loader.machine = setMachine(plant.loader.machine, pile.x + PLANT_CONTENT.loader.reachM + 0.5, pile.z, -Math.PI / 2);
  check(plantMassKg(plant), before, 1e-6, 'scooping moves gravel from the pile into the bucket');
}
check(plant.loader.bucket.kg, PLANT_CONTENT.loader.bucketM3 * PLANT_CONTENT.looseKgPerM3.gravel, 1e-6, 'a full bucket holds 2 m3 of gravel');
check(gravelBefore - pileKg(plant, 'gravel'), plant.loader.bucket.kg, 1e-6, 'the pile lost what the bucket holds');
plant.loader.machine = setMachine(plant.loader.machine, 0, 0, 0);
assert.match(stepLoader(plant, {tip:true}, 3).find(event => event.message)?.message ?? '', /bins/, 'tipping away from the bins is refused');
assert.ok(plant.loader.bucket.kg > 0, 'a refused tip keeps the load');
const bins = placeLocal(PLANT_YARD.batchPlant, 0, 0);
const parkAtBins = () => { plant.loader.machine = setMachine(plant.loader.machine, PLANT_YARD.batchPlant.x + PLANT_YARD.batchPlant.bins.maxX + 3, bins.z, -Math.PI / 2); };
parkAtBins();
for (let i = 0; i < 60 * 5; i++) {
  const before = plantMassKg(plant);
  stepLoader(plant, {tip:true}, STEP); parkAtBins();
  check(plantMassKg(plant), before, 1e-6, 'tipping moves gravel from the bucket into the bins');
}
check(binsKg(plant, 'gravel'), PLANT_CONTENT.loader.bucketM3 * PLANT_CONTENT.looseKgPerM3.gravel, 1e-6, 'the bucket emptied into the gravel bin');
assert.equal(plant.loader.bucket.material, null);
// Sand comes from its own pile the same way.
const sand = PLANT_YARD.sandPile;
const parkAtSand = () => { plant.loader.machine = setMachine(plant.loader.machine, sand.x + pileRadiusM(pileKg(plant, 'sand')) + PLANT_CONTENT.loader.reachM, sand.z, -Math.PI / 2); };
parkAtSand();
for (let i = 0; i < 60 * 4; i++) { stepLoader(plant, {scoop:true, forward:0.01}, STEP); parkAtSand(); }
assert.equal(plant.loader.bucket.material, 'sand');
parkAtBins();
for (let i = 0; i < 60 * 5; i++) { stepLoader(plant, {tip:true}, STEP); parkAtBins(); }
check(binsKg(plant, 'sand'), 3_200, 1e-6, 'a bucket of sand is in the sand bin');

// Slice 3: the batch plant mixes 2 m3 a minute in the mix's proportions, under the plant only.
const place = PLANT_YARD.batchPlant, charge = placeLocal(place, place.charge.x, place.charge.z);
const backUnder = () => { plant.mixer.machine = setMachine(plant.mixer.machine, charge.x, charge.z - PLANT_CONTENT.mixer.chutePivotZ, 0); };
backUnder();
assert.ok(mixerUnderPlant(plant), 'the truck is backed under the plant');
for (let i = 0; i < 60 * 30; i++) {
  const before = plantMassKg(plant);
  stepMixer(plant, {pour:true}, 'work', STEP);
  check(plantMassKg(plant), before, 1e-6, 'charging moves the ingredients into the drum');
}
check(drumM3(plant), 1, 1e-6, 'thirty seconds under the plant gives one cubic metre');
for (const [id, kg] of Object.entries(CONCRETE_MIX_KG_PER_M3)) check(plant.mixer.drum[id], kg, 1e-6, `the drum holds the mix's ${id}`);
assert.ok(plant.mixer.drumTurns > 0, 'the drum turns while it is charged');
// Charging stops when the gravel runs out, and says so.
let refusal;
for (let i = 0; i < 60 * 120 && !refusal; i++) refusal = stepMixer(plant, {pour:true}, 'work', STEP).events.find(event => event.type === 'plant-refused');
assert.match(refusal.message, /gravel bin is empty/);
check(plant.mixer.drum.gravel, 3_200, 1e-6, 'all the bin gravel went in and no more');
check(plant.mixer.drum.cement / plant.mixer.drum.gravel, 350 / 1_100, 1e-12, 'the proportions hold to the last kilogram');
// Driving mode moves the truck; work mode holds it still.
const parked = {...plant.mixer.machine};
stepMixer(plant, {forward:1}, 'work', 1);
assert.equal(plant.mixer.machine.x, parked.x);
assert.equal(plant.mixer.machine.z, parked.z);

// Slice 4: the chute pours 2 m3 a minute into the form under it; misses and overflow are counted.
const form = plant.forms[0];
const overForm = () => {
  plant.mixer.machine = setMachine(plant.mixer.machine, form.x, form.z - PLANT_CONTENT.mixer.chutePivotZ + PLANT_CONTENT.mixer.chuteLengthM, 0);
};
overForm();
const chute = mixerChuteTip(plant);
check(chute.x, form.x, 1e-9, 'the chute is over the form');
check(chute.z, form.z, 1e-9, 'the chute is over the form');
const drumBefore = drumKg(plant);
for (let i = 0; i < 60 * 15; i++) {
  const before = plantMassKg(plant);
  stepPlant(plant, {active:'mixer', controls:{pour:true}, mode:'work'}, STEP); overForm();
  check(plantMassKg(plant), before, 1e-6, 'pouring moves concrete from the drum into the form');
}
check(drumBefore - drumKg(plant), PLANT_CONTENT.mixer.pourM3PerSecond * 15 * CONCRETE_KG_PER_M3, 1e-6, 'the chute pours at its rate');
check(form.kg, drumBefore - drumKg(plant), 1e-6, 'it all went into the form');
assert.equal(plant.spilledKg, 0);
assert.equal(form.set, 0, 'concrete being poured stays fresh');
// A pour off the forms goes on the ground and is counted.
plant.mixer.machine = setMachine(plant.mixer.machine, -10, -10, 0);
stepMixer(plant, {pour:true}, 'work', 1);
check(plant.spilledKg, PLANT_CONTENT.mixer.pourM3PerSecond * CONCRETE_KG_PER_M3, 1e-6, 'a miss is spilled');

// Setting: 120 seconds from the last pour, visibly in between, announced once.
const fresh = form.set;
for (let i = 0; i < 60 * 60; i++) stepSetting(plant, STEP);
check(form.set, fresh + 0.5, 1e-9, 'halfway set after a minute');
overForm();
const late = stepMixer(plant, {pour:true}, 'work', STEP).events.find(event => event.type === 'plant-refused');
assert.match(late.message, /started to set/, 'a half-set form refuses more concrete');
let announcements = 0;
for (let i = 0; i < 60 * 90; i++) announcements += stepSetting(plant, STEP).filter(event => event.type === 'concrete-set').length;
assert.equal(form.set, 1);
assert.equal(announcements, 1, 'the set is announced once');
// Fresh concrete on top of a young pour keeps the form workable.
const second = plant.forms[1];
second.kg = 1_000; second.set = 0.4;
plant.mixer.drum = {cement:350, water:175, sand:750, gravel:1_100};
plant.mixer.machine = setMachine(plant.mixer.machine, second.x, second.z - PLANT_CONTENT.mixer.chutePivotZ + PLANT_CONTENT.mixer.chuteLengthM, 0);
stepPlant(plant, {active:'mixer', controls:{pour:true}, mode:'work'}, STEP);
assert.equal(second.set, 0);
// Overflow is spilled, not lost.
const overflow = createPlant();
overflow.forms[0].kg = formCapacityKg(overflow.forms[0]) - 10;
overflow.mixer.drum = {cement:350, water:175, sand:750, gravel:1_100};
overflow.mixer.machine = setMachine(overflow.mixer.machine, overflow.forms[0].x, overflow.forms[0].z - PLANT_CONTENT.mixer.chutePivotZ + PLANT_CONTENT.mixer.chuteLengthM, 0);
const overflowMass = plantMassKg(overflow);
stepMixer(overflow, {pour:true}, 'work', 1);
check(overflow.forms[0].kg, formCapacityKg(overflow.forms[0]), 1e-6, 'the form fills to its top');
check(overflow.spilledKg, PLANT_CONTENT.mixer.pourM3PerSecond * CONCRETE_KG_PER_M3 - 10, 1e-6, 'the rest spills over');
check(plantMassKg(overflow), overflowMass, 1e-6, 'overflow is counted');

// The loader's bucket point is ahead of it, and the same inputs repeat the same plant.
const ahead = loaderBucketPoint(createPlant());
check(Math.hypot(ahead.x - PLANT_YARD.loader.x, ahead.z - PLANT_YARD.loader.z), PLANT_CONTENT.loader.reachM, 1e-9, 'the bucket is a reach ahead');
const run = () => {
  const p = createPlant();
  tipIntoHopper(p, {rock:1.6}, 1.6);
  for (let i = 0; i < 60 * 30; i++) stepPlant(p, {active:'loader', controls:{forward:0.4, steer:0.2}}, STEP);
  return JSON.parse(JSON.stringify({belt:p.belt, pile:pileKg(p, 'gravel'), loader:p.loader.machine, hopper:hopperKg(p)}));
};
assert.deepEqual(run(), run(), 'the plant is repeatable from its inputs');

// The town's side: the same rules store real stock in a town's goods, which survives a save.
const town = createTown(4312, 'Plant Town');
const townPlant = createPlant({ledger:town, stock:{sandKg:5_000, cementKg:2_000, waterLitres:1_000}});
assert.equal(town.goods.stockpiles['scablands:-50:6'].goods.sand, 5_000);
createPlant({ledger:town});
assert.equal(town.goods.stockpiles['scablands:-50:6'].goods.sand, 5_000, 'a plant made on a town adds no stock of its own');
tipIntoHopper(townPlant, {rock:2}, 2);
for (let i = 0; i < 60 * 120; i++) stepCrusher(townPlant, STEP);
check(stockpileAt(town, townPlant.cells.gravelPile).gravel, machineLoadMassKg({load:{rock:2}}), 1e-6, 'the town has the crushed gravel');
const loaded = deserializeTown(serializeTown(town));
assert.deepEqual(loaded.goods.stockpiles, town.goods.stockpiles, 'the stock survives a save round trip');
assert.ok(priceForGood(loaded, 'cement') > 0, 'cement has a market price');
const old = deserializeTown(serializeTown(createTown(4312, 'Old Town')));
assert.equal(stockpileAt(old, townPlant.cells.silo).cement, undefined, 'an older town has no cement and loads');
assert.ok(createPlantLedger().goods.stockpiles, 'the yard ledger has the town goods shape');

// The machine yard: the rock heap is rock, a truck tipped at the hopper feeds the crusher,
// and the loader and mixer are in the Q list after Mabel. The yard plant needs the town switch.
assert.equal(createDigSandbox({town:false, playerId:'plant-off'}).plant, null, 'no plant without the town switch');
closeDigSandbox();
let yard = createDigSandbox({town:true, playerId:'plant-yard'});
assert.equal(yard.ground.materialAt(PLANT_YARD.rockHeap.x, yard.ground.heightAt(PLANT_YARD.rockHeap.x, PLANT_YARD.rockHeap.z) - 0.2, PLANT_YARD.rockHeap.z), 'rock');
const bed = machineDefinition('dumpTruck').tools.bed.offset[2];
yard.activeMachine = 'dumpTruck';
yard.mode = 'work';
yard.haul.machines.dumpTruck = {...yard.haul.machines.dumpTruck, x:PLANT_YARD.hopper.x - bed, z:PLANT_YARD.hopper.z, heading:Math.PI / 2, load:{rock:1.5, topsoil:0.1}};
const rear = machineToolPosition(machineDefinition('dumpTruck'), yard.haul.machines.dumpTruck, 'bed');
check(Math.hypot(rear.x - PLANT_YARD.hopper.x, rear.z - PLANT_YARD.hopper.z), 0, 1e-9, 'the bed is over the hopper');
for (let i = 0; i < 60 * 3; i++) yard = stepDigSandbox(yard, {controls:{}, action:'tip'}, STEP);
assert.deepEqual(yard.haul.machines.dumpTruck.load, {}, 'the truck emptied into the hopper');
assert.ok(yard.plant.screenedM3 > 0.099, 'the topsoil was screened out onto the ground');
for (let i = 0; i < 60 * 90; i++) yard = stepDigSandbox(yard, {controls:{}}, STEP);
check(pileKg(yard.plant, 'gravel'), machineLoadMassKg({load:{rock:1.5}}), 1e-6, 'the yard crusher made the gravel pile while the truck stood by');
const order = [];
for (let i = 0; i < 12 && !order.includes('mixer'); i++) { yard = switchDigMachine(yard); order.push(yard.activeMachine); }
assert.deepEqual(order.slice(-3), ['borer', 'loader', 'mixer']);
assert.match(plantYardWords(yard).hint, /batch plant/);
while (yard.activeMachine !== 'loader') yard = switchDigMachine(yard);
assert.equal(yard.activeMachine, 'loader');
const startX = digSandboxMachineState(yard).x;
for (let i = 0; i < 60; i++) yard = stepDigSandbox(yard, {controls:plantYardControls('loader', {KeyW:true})}, STEP);
assert.ok(Math.abs(digSandboxMachineState(yard).x - startX) > 0.5, 'the loader drives in the yard');
assert.deepEqual(plantYardControls('mixer', {KeyA:true, Space:true}, 'work'), {chute:-1, pour:true});
const started = performance.now();
for (let i = 0; i < 600; i++) yard = stepDigSandbox(yard, {controls:{}}, STEP);
const perStep = (performance.now() - started) / 600;
assert.ok(perStep < 1, `a yard step with the plant takes ${perStep.toFixed(3)} ms`);
closeDigSandbox();

console.log(`Machine plant passed ${checks} measured checks: mass is kept at every step, the mix holds, and concrete sets in two minutes.`);
