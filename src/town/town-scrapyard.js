import {SCRAPYARD_MACHINES} from './content/machine-parts.js';

const BUILD_MINUTES = 15;
const SOURCES = new Set(['salvage', 'job', 'trader']);
const byId = new Map(SCRAPYARD_MACHINES.map(machine => [machine.id, machine]));

function scrapyardFor(town) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town.');
  town.scrapyard ||= {owned:{flatbed:true}, inventory:{}, build:null, events:[]};
  const yard = town.scrapyard;
  yard.owned ||= {flatbed:true};
  yard.owned.flatbed = true;
  yard.inventory ||= {};
  yard.events ||= [];
  return yard;
}

function machineFor(id) {
  const machine = byId.get(id);
  if (!machine) return null;
  return machine;
}

/** A display-ready list for the scrapyard screen, including each missing part. */
export function scrapyardMachines(town) {
  const yard = scrapyardFor(town);
  return SCRAPYARD_MACHINES.map(machine => {
    const missingParts = machine.parts.map(part => ({
      ...part,
      needed:1,
      have:yard.inventory[part.id]?.count || 0,
    })).filter(part => part.have < part.needed);
    return {
      id:machine.id,
      name:machine.name,
      picture:machine.picture,
      owned:Boolean(yard.owned[machine.id]),
      lockedBy:machine.predecessor && !yard.owned[machine.predecessor] ? machine.predecessor : null,
      missingParts,
      building:yard.build?.machineId === machine.id,
      minutesRemaining:yard.build?.machineId === machine.id ? yard.build.minutesRemaining : 0,
    };
  });
}

/** Record a single part delivered by a salvage find, a job or a trader. */
export function addScrapyardPart(town, {partId, source, reference = null} = {}) {
  const yard = scrapyardFor(town);
  const part = SCRAPYARD_MACHINES.flatMap(machine => machine.parts).find(row => row.id === partId);
  if (!part) return {ok:false, message:'That part is not on a machine list.'};
  if (!SOURCES.has(source)) return {ok:false, message:'Parts come from salvage, jobs or traders.'};
  const stock = yard.inventory[partId] ||= {count:0, arrivals:[]};
  stock.count++;
  stock.arrivals.push({source, reference});
  return {ok:true, count:stock.count, message:`${part.name} is ready at the Scrapyard.`};
}

/** Start the next machine only when its real parts are at the Scrapyard. */
export function beginMachineBuild(town, machineId) {
  const yard = scrapyardFor(town);
  const machine = machineFor(machineId);
  if (!machine) return {ok:false, message:'That machine is not on the Scrapyard list.'};
  if (yard.owned[machine.id]) return {ok:false, message:'The town already has that machine.'};
  if (machine.predecessor && !yard.owned[machine.predecessor])
    return {ok:false, message:`Finish the ${byId.get(machine.predecessor).name.toLowerCase()} first.`};
  if (yard.build) return {ok:false, message:'The Scrapyard is already building a machine.'};
  const missing = machine.parts.filter(part => (yard.inventory[part.id]?.count || 0) < 1);
  if (missing.length) return {ok:false, message:'Find every listed part before building this machine.'};
  for (const part of machine.parts) yard.inventory[part.id].count--;
  yard.build = {machineId, minutesRemaining:BUILD_MINUTES};
  return {ok:true, machineId, minutesRemaining:BUILD_MINUTES, message:`The ${machine.name.toLowerCase()} is taking shape.`};
}

/** Advance the one active build by elapsed game minutes. */
export function advanceScrapyardBuild(town, elapsedMinutes) {
  const yard = scrapyardFor(town);
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0)
    return {ok:false, complete:false, message:'Build time must be zero or more minutes.'};
  if (!yard.build) return {ok:true, complete:false, minutesRemaining:0, message:'Nothing is being built.'};
  yard.build.minutesRemaining = Math.max(0, yard.build.minutesRemaining - elapsedMinutes);
  if (yard.build.minutesRemaining > 0)
    return {ok:true, complete:false, machineId:yard.build.machineId, minutesRemaining:yard.build.minutesRemaining,
      message:`The ${byId.get(yard.build.machineId).name.toLowerCase()} is still being built.`};
  const machine = byId.get(yard.build.machineId);
  yard.owned[machine.id] = true;
  yard.build = null;
  const event = {type:'machine-started', machineId:machine.id, message:`The ${machine.name.toLowerCase()} coughed, shook, then started. The Scrapyard crew cheered.`};
  yard.events.push(event);
  return {ok:true, complete:true, machineId:machine.id, event, message:event.message};
}
