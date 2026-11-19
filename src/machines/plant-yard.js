// The concrete plant in the machine yard. The yard holds no town and no save:
// its stock lives in a yard-only goods ledger kept for the page's lifetime.
import {binsKg, createPlant, drumM3, formCapacityKg, formM3, hopperKg, mixerChuteTip, mixerUnderPlant, pileKg,
  siloKg, stepPlant, tipIntoHopper} from './plant.js';
import {machineToolPosition} from './machine.js';
import {machineDefinition} from './content/machines.js';
import {CONCRETE_KG_PER_M3, PLANT_CONTENT, PLANT_YARD} from './content/plant.js';

export const PLANT_MACHINE_IDS = Object.freeze(['loader', 'mixer']);
export const isPlantMachine = id => PLANT_MACHINE_IDS.includes(id);

/** Drop a blasted-rock heap for the excavator, on a new yard ground only. */
export function fillYardRockHeap(ground, heap = PLANT_YARD.rockHeap) {
  for (const [radius, volume] of heap.layers) ground.fill({x:heap.x, z:heap.z, radius}, 'rock', volume);
}

/** The yard's plant for this player, kept for the page's lifetime as its road work is. */
export function createYardPlant({playerId = 'player', remember = true} = {}) {
  if (!remember) return createPlant();
  const memory = globalThis.__theDigPlantMemory ??= {};
  return memory[playerId] ??= createPlant();
}

function rememberPlant(playerId, plant) {
  if (playerId) (globalThis.__theDigPlantMemory ??= {})[playerId] = plant;
}

const copyPlant = plant => ({...structuredClone({...plant, layout:null}), layout:plant.layout});

/** The keyboard for the two plant machines. W, A, S and D always drive the loader. */
export function plantYardControls(id, keys = {}, mode = 'drive') {
  const forward = Number(!!keys.KeyW || !!keys.ArrowUp) - Number(!!keys.KeyS || !!keys.ArrowDown);
  const steer = Number(!!keys.KeyD || !!keys.ArrowRight) - Number(!!keys.KeyA || !!keys.ArrowLeft);
  if (id === 'loader') return {forward, steer, scoop:!!keys.Space, tip:!!keys.KeyE};
  if (mode === 'work') return {chute:Number(!!keys.KeyD || !!keys.ArrowRight) - Number(!!keys.KeyA || !!keys.ArrowLeft), pour:!!keys.Space};
  return {forward, steer};
}

/** Advance the plant once per yard step. Its messages become the yard's message line. */
export function stepYardPlant(sim, input = {}, dtSeconds = 0) {
  const plant = copyPlant(sim.plant);
  const active = isPlantMachine(sim.activeMachine) ? sim.activeMachine : null;
  const events = stepPlant(plant, {active, controls:active ? input.controls ?? {} : {}, mode:sim.mode}, dtSeconds);
  if (!sim.plantSupplied) rememberPlant(sim.playerId, plant);
  return {plant, events, message:events.findLast(event => event.message)?.message ?? ''};
}

/** While the bed is raised over the hopper, the load goes to the crusher instead of the ground. */
export function tipTruckIntoHopper(sim, truck, dtSeconds) {
  if (!sim.plant) return {handled:false};
  const rear = machineToolPosition(machineDefinition('dumpTruck'), truck, 'bed');
  const hopper = sim.plant.layout.hopper;
  if (Math.hypot(rear.x - hopper.x, rear.z - hopper.z) > PLANT_CONTENT.crusher.hopperReachM) return {handled:false};
  const plant = copyPlant(sim.plant);
  const result = tipIntoHopper(plant, truck.load, PLANT_CONTENT.crusher.dischargeM3PerSecond * dtSeconds);
  let screened = false;
  for (const [material, volume] of Object.entries(result.screened)) {
    const spot = plant.layout.screenings;
    const filled = sim.ground.fill({x:spot.x, z:spot.z, radius:1.2}, material, volume);
    // A refused fill would lose the dirt, so it stays in the bed instead.
    if (!filled.ok) {
      result.load[material] = (result.load[material] ?? 0) + volume;
      result.events.push({type:'plant-refused', cue:'plant.refuse', message:'The screened dirt has nowhere to go. Tip this load somewhere else.'});
    } else {
      screened = true;
      plant.screenedM3 += volume;
    }
  }
  if (!sim.plantSupplied) rememberPlant(sim.playerId, plant);
  const emptied = Object.values(result.load).reduce((sum, volume) => sum + volume, 0) < 1e-5;
  const message = result.events.findLast(event => event.message)?.message ?? (emptied && result.acceptedKg > 0 ? 'The load is in the hopper. The crusher is working.' : '');
  return {handled:true, plant, truck:{...truck, load:result.load}, events:[...result.events,
    ...(screened ? [{type:'tip', x:plant.layout.screenings.x, y:0, z:plant.layout.screenings.z, volumeM3:0.1}] : [])],
  message, dirty:screened};
}

const tonnes = kg => `${(kg / 1000).toFixed(1)} t`;

/** The yard's two lines for a plant machine: what it holds, and what to do next. */
export function plantYardWords(sim) {
  if (!sim.plant || !isPlantMachine(sim.activeMachine)) return null;
  const plant = sim.plant;
  const works = `Crusher hopper ${tonnes(hopperKg(plant))}. Gravel pile ${tonnes(pileKg(plant, 'gravel'))}. Sand pile ${tonnes(pileKg(plant, 'sand'))}.`;
  if (sim.activeMachine === 'loader') {
    const {bucket, lift} = plant.loader;
    const load = bucket.kg > 0 ? `${tonnes(bucket.kg)} of ${bucket.material} in the bucket.` : 'The bucket is empty.';
    const hint = bucket.kg > 0 ? (lift >= 0.9 ? 'Hold E over the batch plant bins to tip the bucket.' : 'Drive to the batch plant bins and hold E to lift and tip.')
      : 'Hold Space and drive into the gravel or sand pile to fill the bucket.';
    return {load:`${load} Bins: ${tonnes(binsKg(plant, 'gravel'))} gravel, ${tonnes(binsKg(plant, 'sand'))} sand. ${works}`, hint};
  }
  const forms = plant.forms.map(form => `The ${form.name} holds ${formM3(form).toFixed(1)} of ${(formCapacityKg(form) / CONCRETE_KG_PER_M3).toFixed(1)} cubic metres${form.kg > 0 ? `, ${form.set >= 1 ? 'set hard' : `${Math.round(form.set * 100)} percent set`}` : ''}.`).join(' ');
  const load = `${drumM3(plant).toFixed(2)} cubic metres of concrete in the drum. Cement ${tonnes(siloKg(plant))}, water ${Math.round(plant.waterLitres)} litres, gravel ${tonnes(binsKg(plant, 'gravel'))} and sand ${tonnes(binsKg(plant, 'sand'))} at the plant. ${forms}`;
  let hint;
  if (sim.mode !== 'work') hint = drumM3(plant) > 0.01 ? 'Back the truck up to a form, then press Tab to work the chute.' : 'Back the truck under the batch plant, then press Tab.';
  else if (mixerUnderPlant(plant)) hint = 'Hold Space to fill the drum. Press Tab to drive.';
  else {
    const tip = mixerChuteTip(plant);
    const form = plant.forms.find(item => Math.abs(tip.x - item.x) <= item.halfM && Math.abs(tip.z - item.z) <= item.halfM);
    hint = form ? `The chute is over the ${form.name}. Hold Space to pour.` : 'Use A and D to swing the chute over a form, then hold Space to pour.';
  }
  return {load, hint};
}
