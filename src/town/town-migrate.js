import {TOWN_REGIONS, cellIsReserved, getTownChunk} from './town-world-data.js';
import {TOWN_HOME_TYPES} from './content/homes.js';

export const TOWN_SAVE_VERSION = 1;

function migrateLegacyHomePlots(data) {
  if (Array.isArray(data.homePlots)) return data.homePlots;
  const groups=new Map();
  for(const person of data.people||[]) {
    const home=String(person.home||'');
    if(!home||home.toLowerCase().includes('canvas')) continue;
    if(!groups.has(home)) groups.set(home,[]);
    groups.get(home).push(person);
  }
  const plots=[];
  let x=24,z=24;
  for(const [home,people] of groups) {
    while(cellIsReserved('scablands',x,z)
      ||plots.some(plot=>plot.regionId==='scablands'&&plot.x===x&&plot.z===z)
      ||(data.buildings||[]).some(building=>building.regionId==='scablands'&&x>=building.x&&x<building.x+(building.width||1)&&z>=building.z&&z<building.z+(building.depth||1))
      ||Boolean(getTownChunk(data.regions?.scablands||{chunks:{}},x,z)?.cell.buildingId
        ||getTownChunk(data.regions?.scablands||{chunks:{}},x,z)?.cell.roadId
        ||getTownChunk(data.regions?.scablands||{chunks:{}},x,z)?.cell.pipeId
        ||getTownChunk(data.regions?.scablands||{chunks:{}},x,z)?.cell.sewerId
        ||getTownChunk(data.regions?.scablands||{chunks:{}},x,z)?.cell.wireId)) {
      x++;
      if(x>160){x=24;z++;}
    }
    const person=people[0],typeIndex=TOWN_HOME_TYPES.findIndex(item=>item.label.toLowerCase()===String(person.homeType||'').toLowerCase());
    const tier=Math.max(1,Math.min(TOWN_HOME_TYPES.length-1,
      Number.isSafeInteger(person.homeTier)?person.homeTier:(typeIndex>=0?typeIndex:1)));
    const id=`legacy-home-${plots.length+1}`,family=person.family||`legacy-family-${plots.length+1}`;
    plots.push({id,regionId:'scablands',x,z,groundY:TOWN_REGIONS.get('scablands').groundHeightAt((x+.5)*8,(z+.5)*8),
      tier,progressDays:0,household:family,family,burning:false,building:false,waitingGood:null});
    for(const member of people){member.home=id;member.homeTier=tier;member.homeType=TOWN_HOME_TYPES[tier].label;}
    x++;
  }
  const housed=new Set(plots.map(plot=>plot.family));
  const housedCount=(data.people||[]).filter(person=>housed.has(person.family)).length;
  data.homePlots=plots;
  data.campPlaces=Math.max(12,(data.people||[]).length-housedCount);
  return plots;
}

// Keep every old step in this list. A town created by the first public build
// starts at version 1; version 0 is reserved for pre-release development data.
export const TOWN_MIGRATIONS = Object.freeze([
  Object.freeze({version:1, migrate(data) {
    if (!(typeof data.tick==='bigint'&&data.tick>=0n) && (!Number.isSafeInteger(data.tick) || data.tick < 0)) data.tick = 0;
    data.tick=BigInt(data.tick);
    if (!Number.isSafeInteger(data.rngState)) data.rngState = (data.seed >>> 0) || 1;
    if (!data.regions || typeof data.regions !== 'object') data.regions = {};
    for(const id of TOWN_REGIONS.keys()) {
      if (!data.regions[id] || typeof data.regions[id] !== 'object') data.regions[id] = {chunks:{}};
      if (!data.regions[id].chunks || typeof data.regions[id].chunks !== 'object') data.regions[id].chunks = {};
    }
    if (!Array.isArray(data.people)) data.people = [];
    if (!Array.isArray(data.buildings)) data.buildings = [];
    if (!Number.isSafeInteger(data.nextBuildingNumber) || data.nextBuildingNumber < 1) data.nextBuildingNumber = 1;
    data.version = 1;
    return data;
  }}),
]);

export function migrateTownData(input, {clone=true}={}) {
  const data = clone ? JSON.parse(JSON.stringify(input)) : input;
  const version = Number.isSafeInteger(data.version) ? data.version : 0;
  for (const migration of TOWN_MIGRATIONS) if (version < migration.version) migration.migrate(data);
  if (!data.regions || typeof data.regions !== 'object') data.regions={};
  if(!Array.isArray(data.homePlots)&&data.people?.length) migrateLegacyHomePlots(data);
  if(Array.isArray(data.homePlots)&&(!Number.isSafeInteger(data.campPlaces)||data.campPlaces<12)) data.campPlaces=12;
  for(const id of TOWN_REGIONS.keys()) {
    if(!data.regions[id]||typeof data.regions[id]!=='object') data.regions[id]={chunks:{}};
    if(!data.regions[id].chunks||typeof data.regions[id].chunks!=='object') data.regions[id].chunks={};
  }
  // Future fields and versions are kept intact. This build cannot know how to
  // change a future version, but it must not erase information it does not know.
  return data;
}
