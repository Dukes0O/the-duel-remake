import {makeRng} from '../rng.js';
import {townCalendarAt} from './town-calendar.js';
import {dispatchTownCommand} from './town-commands.js';

const systems=[];
export function registerTownSystem(name, order, everyTicks, fn) {
  if (typeof name!=='string' || !name || !Number.isFinite(order) || !Number.isSafeInteger(everyTicks) || everyTicks<1 || typeof fn!=='function')
    throw new TypeError('A town system needs a name, order, interval and function.');
  if (systems.some(system=>system.name===name)) throw new Error(`The town system ${name} is already registered.`);
  const system={name,order,everyTicks,fn}; systems.push(system); systems.sort((a,b)=>a.order-b.order || a.name.localeCompare(b.name));
  return () => { const index=systems.indexOf(system); if(index>=0) systems.splice(index,1); };
}

function townRng(town) {
  let draws=0;
  const rng=makeRng(town.rngState);
  return {rng, finish(){town.rngState=(town.rngState + Math.imul(draws,0x6D2B79F5))>>>0;},
    get draws(){return draws;},
    random:{float(){draws++;return rng.float();},int(min,max){draws++;return rng.int(min,max);},chance(p){draws++;return rng.chance(p);},pick(items){draws++;return rng.pick(items);},range(min,max){draws++;return rng.range(min,max);}}};
}

export function stepTown(town, commands=[]) {
  const inputs=Array.isArray(commands)?commands:(commands==null?[]:[commands]);
  const answers=inputs.map(command=>dispatchTownCommand(town,command));
  town.tick++;
  town.calendar=townCalendarAt(town.tick);
  for (const system of systems) if (town.tick % system.everyTicks === 0) {
    const source=townRng(town);
    system.fn({town,rng:source.random,tick:town.tick,calendar:town.calendar});
    source.finish();
  }
  return answers;
}

export function registeredTownSystems() { return systems.map(({name,order,everyTicks})=>({name,order,everyTicks})); }
