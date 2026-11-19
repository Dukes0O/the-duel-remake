// The concrete chain: crusher, belt, piles, loader, batch plant, mixer truck and forms.
// Every stored kilogram moves through TOWN-GOODS, so the same rules run against a
// yard ledger or a real town. No DOM, no renderer and no save access here.
import {storeGood, stockpileAt, takeGood} from '../town/town-goods.js';
import {createMachineState, stepMachine} from './machine.js';
import {machineLoadMassKg} from './tools.js';
import {machineDefinition} from './content/machines.js';
import {CONCRETE_KG_PER_M3, CONCRETE_MIX_KG_PER_M3, PLANT_CONTENT, PLANT_YARD} from './content/plant.js';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const finite = Number.isFinite;
const EPS = 1e-9;
const INGREDIENTS = Object.keys(CONCRETE_MIX_KG_PER_M3);
const HOPPER_GOOD = Object.freeze({rock:'stone', gravel:'gravel'});

/** A place in this plant's region, in the shape TOWN-GOODS stores stock under. */
const cellOf = (layout, place) => ({regionId:layout.regionId ?? 'scablands', x:place.x, z:place.z});

/** Turn a point given relative to a placed thing into a world point. */
export function placeLocal(place, localX, localZ) {
  const heading = place.heading ?? 0, c = Math.cos(heading), s = Math.sin(heading);
  return {x:place.x + localX * c + localZ * s, z:place.z - localX * s + localZ * c};
}

/** A ledger is anything TOWN-GOODS can store goods in: a real town, or the yard's own. */
export function createPlantLedger() { return {goods:{stockpiles:{}, prices:{}}}; }

/**
 * Make a plant at a layout. Stock is stored through TOWN-GOODS; the water tank is the plant's own.
 * Only a plant with its own new ledger starts with the layout's stock, so a town is never stocked twice.
 */
export function createPlant({ledger = null, layout = PLANT_YARD, stock = ledger ? null : layout.stock ?? null} = {}) {
  ledger ??= createPlantLedger();
  if (!ledger || typeof ledger !== 'object') throw new TypeError('A plant needs a goods ledger or a town.');
  const cells = {hopper:cellOf(layout, layout.hopper), gravelPile:cellOf(layout, layout.gravelPile),
    sandPile:cellOf(layout, layout.sandPile), bins:cellOf(layout, layout.batchPlant),
    silo:cellOf(layout, {x:layout.batchPlant.x, z:layout.batchPlant.z - 9})};
  if (stock?.sandKg > 0) storeGood(ledger, cells.sandPile, 'sand', stock.sandKg);
  if (stock?.cementKg > 0) storeGood(ledger, cells.silo, 'cement', stock.cementKg);
  return {ledger, layout, cells, clock:0, waterLitres:stock?.waterLitres ?? 0,
    pendingKg:0, pendingSeconds:0, belt:[], crushing:false,
    forms:layout.forms.map(form => ({...form, kg:0, set:0, setAnnounced:false})),
    spills:[], spilledKg:0, screenedM3:0,
    loader:{machine:createMachineState(machineDefinition('loader'), layout.loader), bucket:{material:null, kg:0}, lift:0.35},
    mixer:{machine:createMachineState(machineDefinition('mixer'), layout.mixer),
      drum:Object.fromEntries(INGREDIENTS.map(id => [id, 0])), chute:0, drumTurns:0, action:null}};
}

const stock = (plant, cell, good) => Math.max(0, stockpileAt(plant.ledger, cell)[good] || 0);
const take = (plant, cell, good, kg) => {
  if (kg <= 0) return 0;
  const amount = Math.min(kg, stock(plant, cell, good));
  if (amount <= 0) return 0;
  const result = takeGood(plant.ledger, cell, good, amount);
  if (!result.ok) throw new Error(result.message);
  return amount;
};
const store = (plant, cell, good, kg) => {
  if (kg <= 0) return;
  const result = storeGood(plant.ledger, cell, good, kg);
  if (!result.ok) throw new Error(result.message);
};

export function hopperKg(plant) { return stock(plant, plant.cells.hopper, 'stone') + stock(plant, plant.cells.hopper, 'gravel'); }
export function pileKg(plant, material) {
  return stock(plant, material === 'sand' ? plant.cells.sandPile : plant.cells.gravelPile, material);
}
export function binsKg(plant, material) { return stock(plant, plant.cells.bins, material); }
export function siloKg(plant) { return stock(plant, plant.cells.silo, 'cement'); }
export function beltKg(plant) { return plant.pendingKg + plant.belt.reduce((sum, parcel) => sum + parcel.kg, 0); }
export function drumKg(plant) { return INGREDIENTS.reduce((sum, id) => sum + plant.mixer.drum[id], 0); }
export function drumM3(plant) { return drumKg(plant) / CONCRETE_KG_PER_M3; }
export function formCapacityKg(form) { return (2 * form.halfM) ** 2 * form.depthM * CONCRETE_KG_PER_M3; }
export function formM3(form) { return form.kg / CONCRETE_KG_PER_M3; }

/** Every kilogram the plant holds, for checking that nothing appears or vanishes. */
export function plantMassKg(plant) {
  let goods = 0;
  for (const cell of Object.values(plant.cells))
    for (const kg of Object.values(stockpileAt(plant.ledger, cell))) goods += kg;
  return goods + beltKg(plant) + plant.loader.bucket.kg + drumKg(plant) + plant.waterLitres +
    plant.forms.reduce((sum, form) => sum + form.kg, 0) + plant.spilledKg;
}

/** Cone radius of a loose pile at its natural slope. */
export function pileRadiusM(kg, looseKgPerM3 = 1_600) {
  if (kg <= 0) return 0;
  return Math.cbrt(3 * kg / looseKgPerM3 / (Math.PI * Math.tan(PLANT_CONTENT.pileReposeRadians)));
}

/**
 * Tip part of a truck bed into the hopper. Rock and gravel go to the jaw, by the mass
 * the truck carried; topsoil and clay are screened out and returned for the ground.
 */
export function tipIntoHopper(plant, load, volumeM3) {
  if (!load || typeof load !== 'object' || !finite(volumeM3) || volumeM3 < 0)
    throw new TypeError('Tipping needs a load and a volume of zero or more.');
  const {crusher} = PLANT_CONTENT;
  const remaining = {...load};
  const total = Object.values(remaining).reduce((sum, value) => sum + value, 0);
  const events = [];
  if (total <= EPS || volumeM3 <= 0) return {load:remaining, acceptedKg:0, screened:{}, events};
  let moved = Math.min(volumeM3, total);
  const kgFor = (material, volume) => machineLoadMassKg({load:{[material]:volume}});
  const acceptedKgFor = amount => Object.entries(remaining).reduce((sum, [material, volume]) =>
    sum + (crusher.accepts.includes(material) ? kgFor(material, volume * amount / total) : 0), 0);
  const room = Math.max(0, crusher.hopperCapacityKg - hopperKg(plant));
  const wanted = acceptedKgFor(moved);
  if (wanted > room + EPS) moved *= room / wanted;
  if (moved <= EPS) {
    events.push({type:'plant-refused', cue:'plant.refuse', message:'The hopper is full. Wait while the crusher works through it.'});
    return {load:remaining, acceptedKg:0, screened:{}, events};
  }
  let acceptedKg = 0;
  const screened = {};
  for (const [material, volume] of Object.entries(load)) {
    const part = volume * moved / total;
    remaining[material] = volume - part;
    if (remaining[material] < 1e-12) delete remaining[material];
    if (crusher.accepts.includes(material)) {
      const kg = kgFor(material, part);
      store(plant, plant.cells.hopper, HOPPER_GOOD[material], kg);
      acceptedKg += kg;
    } else {
      screened[material] = (screened[material] ?? 0) + part;
    }
  }
  if (acceptedKg > 0) events.push({type:'hopper-tip', cue:'plant.hopper', kg:acceptedKg});
  if (Object.keys(screened).length)
    events.push({type:'screened', cue:'plant.refuse', message:'The screen threw out the dirt. Only rock and gravel go through the crusher.'});
  return {load:remaining, acceptedKg, screened, events};
}

/** The jaw takes stone from the hopper; gravel rides the belt and lands on the pile. */
export function stepCrusher(plant, dtSeconds) {
  if (!finite(dtSeconds) || dtSeconds < 0) throw new TypeError('Plant time must be non-negative.');
  const {crusher, belt} = PLANT_CONTENT;
  const events = [];
  const cell = plant.cells.hopper;
  const stone = stock(plant, cell, 'stone'), loose = stock(plant, cell, 'gravel');
  const feed = Math.min(crusher.crushKgPerSecond * dtSeconds, stone + loose);
  plant.crushing = feed > EPS;
  if (plant.crushing) {
    const fromStone = feed * stone / (stone + loose);
    plant.pendingKg += take(plant, cell, 'stone', fromStone) + take(plant, cell, 'gravel', feed - fromStone);
    events.push({type:'crushing', cue:'plant.jaw'});
  }
  plant.pendingSeconds += dtSeconds;
  if (plant.pendingKg > 0 && (plant.pendingSeconds >= belt.parcelSeconds - EPS || !plant.crushing)) {
    plant.belt.push({kg:plant.pendingKg, s:0});
    plant.pendingKg = 0;
    plant.pendingSeconds = 0;
  }
  if (plant.belt.length) {
    events.push({type:'belt-running', cue:'plant.belt'});
    let landed = 0;
    const travelling = [];
    for (const parcel of plant.belt) {
      const s = parcel.s + belt.speedMps * dtSeconds;
      if (s >= belt.lengthM) landed += parcel.kg;
      else travelling.push({kg:parcel.kg, s});
    }
    plant.belt = travelling;
    if (landed > 0) {
      store(plant, plant.cells.gravelPile, 'gravel', landed);
      events.push({type:'gravel-landed', cue:'plant.gravel', kg:landed});
    }
  }
  if (plant.crushing || plant.belt.length) events.push({type:'crusher-running', cue:'plant.crusher'});
  return events;
}

/** Where the loader's bucket edge is, ahead of the machine. */
export function loaderBucketPoint(plant) {
  const {machine} = plant.loader, reach = PLANT_CONTENT.loader.reachM;
  return {x:machine.x + Math.sin(machine.heading) * reach, z:machine.z + Math.cos(machine.heading) * reach};
}

function insideBins(plant, point, margin) {
  const plantPlace = plant.layout.batchPlant, bins = plantPlace.bins;
  const heading = plantPlace.heading ?? 0, c = Math.cos(heading), s = Math.sin(heading);
  const dx = point.x - plantPlace.x, dz = point.z - plantPlace.z;
  const localX = dx * c - dz * s, localZ = dx * s + dz * c;
  return localX >= bins.minX - margin && localX <= bins.maxX + margin && localZ >= bins.minZ - margin && localZ <= bins.maxZ + margin;
}

function pileUnder(plant, point) {
  for (const material of ['gravel', 'sand']) {
    const place = material === 'sand' ? plant.layout.sandPile : plant.layout.gravelPile;
    const kg = pileKg(plant, material);
    if (kg > EPS && Math.hypot(point.x - place.x, point.z - place.z) <= pileRadiusM(kg) + 0.6) return material;
  }
  return null;
}

/** Drive, scoop from a pile by pushing into it, and lift and tip into the bins. */
export function stepLoader(plant, controls = {}, dtSeconds = 0) {
  if (!finite(dtSeconds) || dtSeconds < 0) throw new TypeError('Plant time must be non-negative.');
  const settings = PLANT_CONTENT.loader, loose = PLANT_CONTENT.looseKgPerM3;
  const loader = plant.loader, events = [];
  loader.machine = stepMachine(machineDefinition('loader'), loader.machine,
    {forward:controls.forward ?? 0, steer:controls.steer ?? 0}, dtSeconds);
  const target = controls.tip ? 1 : controls.scoop ? 0 : 0.35;
  loader.lift += clamp(target - loader.lift, -0.7 * dtSeconds, 0.7 * dtSeconds);
  const point = loaderBucketPoint(plant);
  const bucket = loader.bucket;
  if (controls.scoop && !controls.tip) {
    const material = pileUnder(plant, point);
    const capacity = material ? settings.bucketM3 * loose[material] : 0;
    if (!material) {
      if (loader.lift < 0.05) events.push({type:'plant-hint', message:'Drive the bucket into the gravel or sand pile to fill it.'});
    } else if (bucket.material && bucket.material !== material && bucket.kg > EPS) {
      events.push({type:'plant-refused', cue:'plant.refuse', message:`The bucket still holds ${bucket.material}. Tip it into the bins first.`});
    } else if (bucket.kg >= capacity - EPS) {
      events.push({type:'plant-hint', message:'The bucket is full. Hold E at the bins to tip it in.'});
    } else if (loader.lift < 0.05 && (controls.forward ?? 0) > 0) {
      const cell = material === 'sand' ? plant.cells.sandPile : plant.cells.gravelPile;
      const kg = take(plant, cell, material, Math.min(settings.scoopM3PerSecond * loose[material] * dtSeconds, capacity - bucket.kg));
      if (kg > 0) {
        bucket.material = material;
        bucket.kg += kg;
        events.push({type:'scoop', cue:'plant.scoop', material, kg});
      }
    } else if (loader.lift < 0.05) {
      events.push({type:'plant-hint', message:'Push into the pile with W to fill the bucket.'});
    }
  }
  if (controls.tip && bucket.kg > EPS && loader.lift >= 0.9) {
    const kg = Math.min(bucket.kg, settings.tipM3PerSecond * loose[bucket.material] * dtSeconds);
    if (insideBins(plant, point, settings.binsMarginM)) {
      const room = PLANT_CONTENT.batch.binsCapacityKg - binsKg(plant, bucket.material);
      const moved = Math.min(kg, Math.max(0, room));
      if (moved > EPS) {
        store(plant, plant.cells.bins, bucket.material, moved);
        bucket.kg -= moved;
        events.push({type:'bucket-tip', cue:'plant.bucket-tip', material:bucket.material, kg:moved, into:'bins'});
      } else events.push({type:'plant-refused', cue:'plant.refuse', message:`The ${bucket.material} bin is full.`});
    } else if (pileUnder(plant, point) === bucket.material) {
      store(plant, bucket.material === 'sand' ? plant.cells.sandPile : plant.cells.gravelPile, bucket.material, kg);
      bucket.kg -= kg;
      events.push({type:'bucket-tip', cue:'plant.bucket-tip', material:bucket.material, kg, into:'pile'});
    } else {
      events.push({type:'plant-refused', cue:'plant.refuse', message:'Drive up to the batch plant bins before you tip the bucket.'});
    }
    if (bucket.kg < 1e-9) { bucket.kg = 0; bucket.material = null; }
  }
  return events;
}

/** The point the mixer is charged through, at its rear, and the chute's end. */
export function mixerRearPoint(plant) {
  const {machine} = plant.mixer, z = PLANT_CONTENT.mixer.chutePivotZ;
  return {x:machine.x + Math.sin(machine.heading) * z, z:machine.z + Math.cos(machine.heading) * z};
}
export function mixerChuteTip(plant) {
  const {machine, chute} = plant.mixer, settings = PLANT_CONTENT.mixer;
  const rear = mixerRearPoint(plant), heading = machine.heading + Math.PI + chute;
  return {x:rear.x + Math.sin(heading) * settings.chuteLengthM, z:rear.z + Math.cos(heading) * settings.chuteLengthM};
}
export function mixerUnderPlant(plant) {
  const place = plant.layout.batchPlant, charge = placeLocal(place, place.charge.x, place.charge.z);
  const rear = mixerRearPoint(plant);
  return Math.hypot(rear.x - charge.x, rear.z - charge.z) <= PLANT_CONTENT.batch.chargeReachM;
}

function formAt(plant, point) {
  return plant.forms.find(form => Math.abs(point.x - form.x) <= form.halfM && Math.abs(point.z - form.z) <= form.halfM) ?? null;
}

const EMPTY_WORDS = Object.freeze({
  cement:'The cement silo is empty.', water:'The water tank is empty.',
  sand:'The sand bin is empty. Bring sand with the loader.', gravel:'The gravel bin is empty. Bring gravel with the loader.',
});

/** Weigh and mix one step of concrete into the drum, in the mix's proportions. */
function chargeMixer(plant, dtSeconds, events) {
  const mixer = plant.mixer, settings = PLANT_CONTENT;
  const room = settings.mixer.drumM3 - drumM3(plant);
  if (room <= EPS) {
    events.push({type:'plant-hint', message:'The drum is full. Drive to the forms.'});
    return;
  }
  const available = {cement:siloKg(plant), water:plant.waterLitres, sand:binsKg(plant, 'sand'), gravel:binsKg(plant, 'gravel')};
  const limit = Math.min(...INGREDIENTS.map(id => available[id] / CONCRETE_MIX_KG_PER_M3[id]));
  const volume = Math.min(settings.batch.m3PerSecond * dtSeconds, room, limit);
  if (volume <= EPS) {
    const empty = INGREDIENTS.find(id => available[id] / CONCRETE_MIX_KG_PER_M3[id] <= limit + EPS);
    events.push({type:'plant-refused', cue:'plant.refuse', message:EMPTY_WORDS[empty]});
    return;
  }
  const kg = id => volume * CONCRETE_MIX_KG_PER_M3[id];
  mixer.drum.cement += take(plant, plant.cells.silo, 'cement', kg('cement'));
  mixer.drum.sand += take(plant, plant.cells.bins, 'sand', kg('sand'));
  mixer.drum.gravel += take(plant, plant.cells.bins, 'gravel', kg('gravel'));
  plant.waterLitres -= kg('water');
  mixer.drum.water += kg('water');
  mixer.action = 'charging';
  events.push({type:'batching', cue:'plant.batch', m3:volume});
}

/** Reverse the drum and send concrete down the chute, into a form or onto the ground. */
function pourMixer(plant, dtSeconds, events) {
  const mixer = plant.mixer, total = drumKg(plant);
  if (total <= EPS) {
    events.push({type:'plant-hint', message:'The drum is empty. Back the truck under the batch plant to fill it.'});
    return null;
  }
  const tip = mixerChuteTip(plant), form = formAt(plant, tip);
  if (form && form.set >= PLANT_CONTENT.setting.freshUntil) {
    events.push({type:'plant-refused', cue:'plant.refuse', message:`The ${form.name} has started to set. Pour into the other form.`});
    return null;
  }
  const kg = Math.min(total, PLANT_CONTENT.mixer.pourM3PerSecond * CONCRETE_KG_PER_M3 * dtSeconds);
  for (const id of INGREDIENTS) mixer.drum[id] = Math.max(0, mixer.drum[id] - mixer.drum[id] * kg / total);
  const intoForm = form ? Math.min(kg, Math.max(0, formCapacityKg(form) - form.kg)) : 0;
  if (form) { form.kg += intoForm; form.set = 0; form.setAnnounced = false; }
  const spilled = kg - intoForm;
  if (spilled > 0) {
    plant.spilledKg += spilled;
    const near = plant.spills.find(spill => Math.hypot(spill.x - tip.x, spill.z - tip.z) < 0.8);
    if (near) { near.kg += spilled; near.set = 0; }
    else plant.spills.push({x:tip.x, z:tip.z, kg:spilled, set:0});
    events.push({type:'concrete-spill', cue:'plant.pour', message:form ? `The ${form.name} is full. The rest is spilling over.` : 'The chute is not over a form. The concrete is going on the ground.'});
  }
  mixer.action = 'pouring';
  events.push({type:'pouring', cue:'plant.pour', kg, intoForm, form:form?.id ?? null});
  return form;
}

/** Drive mode drives. Work mode stands the truck still, swings the chute, and charges or pours. */
export function stepMixer(plant, controls = {}, mode = 'drive', dtSeconds = 0) {
  if (!finite(dtSeconds) || dtSeconds < 0) throw new TypeError('Plant time must be non-negative.');
  const mixer = plant.mixer, settings = PLANT_CONTENT.mixer, events = [];
  const working = mode === 'work';
  mixer.machine = stepMachine(machineDefinition('mixer'), mixer.machine,
    working ? {forward:0, steer:0} : {forward:controls.forward ?? 0, steer:controls.steer ?? 0}, dtSeconds);
  mixer.action = null;
  let poured = null;
  if (working) {
    mixer.chute = clamp(mixer.chute + clamp(controls.chute ?? 0, -1, 1) * settings.chuteRate * dtSeconds, -settings.chuteLimit, settings.chuteLimit);
    if (controls.pour && Math.abs(mixer.machine.speedMps) > 0.05) events.push({type:'plant-hint', message:'Wait for the truck to stop.'});
    else if (controls.pour && mixerUnderPlant(plant)) chargeMixer(plant, dtSeconds, events);
    else if (controls.pour) poured = pourMixer(plant, dtSeconds, events);
  }
  const rpm = mixer.action === 'charging' ? settings.chargeRpm : mixer.action === 'pouring' ? settings.pourRpm : drumKg(plant) > EPS ? settings.agitateRpm : 0;
  mixer.drumTurns += rpm / 60 * dtSeconds;
  if (rpm) events.push({type:'drum-turning', cue:'plant.drum', rpm});
  return {events, poured};
}

/** Concrete sets from its last pour. Fresh concrete poured on top keeps a form workable. */
export function stepSetting(plant, dtSeconds, pouredForm = null) {
  const events = [], rate = dtSeconds / PLANT_CONTENT.setting.setSeconds;
  for (const form of plant.forms) {
    if (form.kg <= EPS || form === pouredForm) continue;
    form.set = Math.min(1, form.set + rate);
    if (form.set >= 1 && !form.setAnnounced) {
      form.setAnnounced = true;
      const full = form.kg >= formCapacityKg(form) - 1;
      events.push({type:'concrete-set', cue:'plant.set', form:form.id,
        message:full ? `The ${form.name} has set hard. That is a foundation.`
          : `The ${form.name} has set hard, ${formM3(form).toFixed(1)} of ${(formCapacityKg(form) / CONCRETE_KG_PER_M3).toFixed(1)} cubic metres.`});
    }
  }
  for (const spill of plant.spills) spill.set = Math.min(1, spill.set + rate);
  return events;
}

/** Advance the whole plant by one step. Only the active machine takes controls. */
export function stepPlant(plant, {active = null, controls = {}, mode = 'drive'} = {}, dtSeconds = 0) {
  if (!plant?.cells || !finite(dtSeconds) || dtSeconds < 0) throw new TypeError('A plant and non-negative time are required.');
  plant.clock += dtSeconds;
  const events = stepCrusher(plant, dtSeconds);
  if (active === 'loader') events.push(...stepLoader(plant, controls, dtSeconds));
  let poured = null;
  if (active === 'mixer') {
    const result = stepMixer(plant, controls, mode, dtSeconds);
    events.push(...result.events);
    poured = result.poured;
  } else if (drumKg(plant) > EPS) {
    plant.mixer.drumTurns += PLANT_CONTENT.mixer.agitateRpm / 60 * dtSeconds;
  }
  events.push(...stepSetting(plant, dtSeconds, poured));
  return events;
}
