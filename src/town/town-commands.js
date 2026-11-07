import {BUILDINGS, GOODS, buildingById, validateTownContent} from './content/registry.js';
import {cellIsReserved, ensureTownRegion, getTownChunk, TOWN_REGIONS} from './town-world-data.js';

const handlers = new Map();
export const TOWN_WORK_STATES=Object.freeze(['plan','foundation','frame','finished','ruined']);
export function registerTownCommand(name, handler) {
  if (typeof name !== 'string' || !name || typeof handler !== 'function') throw new TypeError('A town command needs a name and a handler.');
  if (handlers.has(name)) throw new Error(`The town command ${name} is already registered.`);
  handlers.set(name, handler);
  return () => handlers.delete(name);
}

function result(ok, message) { return {ok, message}; }
const PAINTED_HOME_MESSAGE='That ground is painted for homes. Clear the plot first.';
function commandDraft(root, journal) {
  const cache=new WeakMap(), rawByProxy=new WeakMap();
  function wrap(target) {
    if(!target||typeof target!=='object') return target;
    if(cache.has(target)) return cache.get(target);
    const proxy=new Proxy(target,{
      get(object,key){return wrap(Reflect.get(object,key));},
      set(object,key,value){
        const had=Object.prototype.hasOwnProperty.call(object,key), previous=object[key], oldLength=Array.isArray(object)?object.length:null, raw=rawByProxy.get(value)||value;
        journal.push(()=>{if(had)Reflect.set(object,key,previous);else Reflect.deleteProperty(object,key);if(oldLength!==null)object.length=oldLength;});
        return Reflect.set(object,key,raw);
      },
      deleteProperty(object,key){
        if(Object.prototype.hasOwnProperty.call(object,key)){const previous=object[key];journal.push(()=>Reflect.set(object,key,previous));}
        return Reflect.deleteProperty(object,key);
      },
      defineProperty(object,key,descriptor){
        const previous=Object.getOwnPropertyDescriptor(object,key);
        journal.push(()=>previous?Object.defineProperty(object,key,previous):Reflect.deleteProperty(object,key));
        return Reflect.defineProperty(object,key,descriptor);
      },
    });
    cache.set(target,proxy);rawByProxy.set(proxy,target);return proxy;
  }
  return wrap(root);
}
function placeBuilding(town, command, options) {
  const row = command.building && typeof command.building === 'object' ? command.building : (options.buildings || BUILDINGS).find(item => item.id === command.buildingId);
  if (!row) return result(false, 'That building is not in the plans.');
  validateTownContent({buildings:[row],goods:options.goods||GOODS});
  const regionId = command.regionId || 'scablands', region = TOWN_REGIONS.get(regionId), regionState=ensureTownRegion(town,regionId);
  if (!region || !Number.isSafeInteger(command.x) || !Number.isSafeInteger(command.z)) return result(false, 'Choose a place on the map first.');
  if (cellIsReserved(regionId, command.x, command.z, row.width, row.depth)) return result(false, 'That ground is kept clear.');
  for (let dx=0; dx<row.width; dx++) for (let dz=0; dz<row.depth; dz++) {
    if((town.homePlots||[]).some(plot=>plot.regionId===regionId&&plot.x===command.x+dx&&plot.z===command.z+dz))
      return result(false,PAINTED_HOME_MESSAGE);
    const found=getTownChunk(regionState,command.x+dx,command.z+dz);
    if (found?.cell.buildingId||found?.cell.roadId) return result(false, 'Something is already built there.');
  }
  let id=command.id;
  if (!id) {
    let number=Number.isSafeInteger(town.nextBuildingNumber)&&town.nextBuildingNumber>0?town.nextBuildingNumber:1;
    while (town.buildings.some(building=>building.id===`building-${number}`)) number++;
    id=`building-${number}`;
    town.nextBuildingNumber=number+1;
  }
  if (town.buildings.some(building => building.id === id)) return result(false, 'That building already has a name.');
  const isRoad=row.id.startsWith('road-');
  const building={id,buildingId:row.id,regionId,x:command.x,z:command.z,width:row.width,depth:row.depth,state:'plan',
    groundY:region.groundHeightAt((command.x+row.width/2)*8,(command.z+row.depth/2)*8)};
  town.buildings.push(building);
  for (let dx=0; dx<row.width; dx++) for (let dz=0; dz<row.depth; dz++) {
    const cell=getTownChunk(regionState,command.x+dx,command.z+dz,true).cell;
    if(isRoad) {cell.roadId=id;cell.roadState='plan';} else cell.buildingId=id;
  }
  return result(true, `Placed ${row.id.replaceAll('-',' ')}.`);
}

registerTownCommand('placeBuilding', placeBuilding);
registerTownCommand('renameTown', (town, command) => {
  if (typeof command.name !== 'string' || !command.name.trim()) return result(false, 'Give the town a name.');
  town.name=command.name.trim();
  return result(true, 'The town name has changed.');
});
registerTownCommand('removeBuilding', (town, command) => {
  const index=town.buildings.findIndex(building => building.id===command.id);
  if (index<0) return result(false, 'There is no building by that name.');
  const [removed]=town.buildings.splice(index,1);
  for (let dx=0; dx<removed.width; dx++) for (let dz=0; dz<removed.depth; dz++) {
    const found=getTownChunk(town.regions[removed.regionId],removed.x+dx,removed.z+dz);
    if (found?.cell.buildingId===removed.id) found.cell.buildingId=null;
    if (found?.cell.roadId===removed.id) {found.cell.roadId=null;delete found.cell.roadState;}
  }
  return result(true, 'The building site is clear.');
});

export function dispatchTownCommand(town, command, options={}) {
  if (!command || typeof command !== 'object' || typeof command.type !== 'string') return result(false, 'That town action is not clear.');
  const handler=handlers.get(command.type);
  if (!handler) return result(false, 'The town does not know how to do that yet.');
  const journal=[],draft=commandDraft(town,journal);
  try {
    const answer=handler(draft,command,options);
    if (!answer || typeof answer.ok !== 'boolean' || typeof answer.message !== 'string') throw new TypeError('Town commands must return a simple answer.');
    if(!answer.ok) for(let i=journal.length-1;i>=0;i--) journal[i]();
    return answer;
  } catch (error) {
    for(let i=journal.length-1;i>=0;i--) journal[i]();
    if (error instanceof RangeError || error instanceof TypeError) return result(false, error.message);
    throw error;
  }
}

export function townBuildingCatalog() { return BUILDINGS.map(row => buildingById.get(row.id)); }
