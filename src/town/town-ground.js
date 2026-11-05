import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';

const DAY = 24n;
const PIT_TICKS = 3n * DAY;
const hash = value => {
  let h = value >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return (h ^ (h >>> 16)) >>> 0;
};

function fieldAt(seed, x, z) {
  const creek = Math.abs(Math.sin((x * 13 + z * 7 + (seed % 97)) * 0.019));
  const noise = hash((seed ^ Math.imul(x, 0x9e3779b1) ^ Math.imul(z, 0x85ebca77)) >>> 0) / 0xffffffff;
  return {
    depth: Math.round((4 + creek * 10 + noise * 8) * 10) / 10,
    yieldLitresPerDay: Math.round(80 + creek * 240 + noise * 180),
  };
}

function groundState(town, regionId='scablands') {
  const region = town.regions?.[regionId];
  if (!region) return null;
  if (!region.groundWater) region.groundWater = {pits:{}, wells:{}, droughtDays:0};
  return region.groundWater;
}

function reply(ok, message) { return {ok, message}; }
function siteKey(x, z) { return `${x}:${z}`; }
function validSite(command) {
  return Number.isSafeInteger(command.x) && Number.isSafeInteger(command.z);
}

export function groundWaterAt(town, x, z, regionId='scablands') {
  if (!town || !Number.isSafeInteger(x) || !Number.isSafeInteger(z)) throw new TypeError('Choose a whole-number place on the map.');
  const key = siteKey(x,z), state = town.regions?.[regionId]?.groundWater;
  const found = state?.pits?.[key];
  return found?.state==='found' ? {known:true,...found} : {known:false};
}

registerTownCommand('digTestPit', (town, command) => {
  if (!validSite(command)) return reply(false,'Choose a place on the map first.');
  const regionId=command.regionId||'scablands', state=groundState(town,regionId);
  if (!state) return reply(false,'That ground is not ready for digging.');
  const key=siteKey(command.x,command.z);
  if (state.pits[key]) return reply(false,'A test pit has already been dug here.');
  if (Object.values(state.pits).some(pit=>pit.state==='working')) return reply(false,'The workers are already digging a test pit.');
  state.pits[key]={x:command.x,z:command.z,state:'working',startedAt:BigInt(town.tick)};
  return reply(true,'The workers have started a test pit. It will take three days.');
});

registerTownCommand('buildWell', (town, command) => {
  if (!validSite(command)) return reply(false,'Choose a place on the map first.');
  const regionId=command.regionId||'scablands', state=groundState(town,regionId), key=siteKey(command.x,command.z);
  const pit=state?.pits[key];
  if (!pit || pit.state!=='found') return reply(false,'Dig a test pit here before building a well.');
  if (state.wells[key] || state.wellJobs?.[key]) return reply(false,'There is already a well here.');
  if (!state.wellJobs) state.wellJobs={};
  const days=Math.ceil(pit.depth);
  state.wellJobs[key]={x:command.x,z:command.z,depth:pit.depth,yieldLitresPerDay:pit.yieldLitresPerDay,
    startedAt:BigInt(town.tick),finishAt:BigInt(town.tick)+BigInt(days)*DAY};
  return reply(true,`The workers have started the well. It will take ${days} days.`);
});

registerTownCommand('drawWellWater', (town, command) => {
  const state=groundState(town,command.regionId||'scablands'), well=state?.wells?.[siteKey(command.x,command.z)];
  if (!well) return reply(false,'There is no well here.');
  if (!Number.isFinite(command.litres)||command.litres<=0) return reply(false,'Choose how many litres to draw.');
  const amount=Math.min(well.waterLitres,Math.floor(command.litres));
  well.waterLitres-=amount;
  well.drawdownLitres+=amount;
  return reply(true,`The well gives ${amount} litres.`);
});

registerTownSystem('ground-water',20,24,({town})=>{
  for (const region of Object.values(town.regions||{})) {
    const state=region.groundWater;
    if (!state) continue;
    state.droughtDays=(state.droughtDays||0)+1;
    for (const pit of Object.values(state.pits||{})) {
      if (pit.state==='working' && BigInt(town.tick)-BigInt(pit.startedAt)>=PIT_TICKS) {
        const field=fieldAt(town.seed,pit.x,pit.z);
        pit.depth=field.depth;
        pit.yieldLitresPerDay=field.yieldLitresPerDay;
        pit.state='found';
        pit.finishedAt=BigInt(town.tick);
      }
    }
    for (const [key,job] of Object.entries(state.wellJobs||{})) {
      if (BigInt(town.tick)<BigInt(job.finishAt)) continue;
      state.wells[key]={x:job.x,z:job.z,depth:job.depth,yieldLitresPerDay:job.yieldLitresPerDay,
        waterLitres:job.yieldLitresPerDay,drawdownLitres:0};
      delete state.wellJobs[key];
    }
    for (const well of Object.values(state.wells||{})) {
      // Water use draws the local store down. A wet day restores the normal
      // daily yield; a long dry spell lowers the water table and recovery.
      const droughtFactor=Math.max(0.2,1-state.droughtDays/365);
      const recovery=Math.floor(well.yieldLitresPerDay*droughtFactor);
      well.waterLitres=Math.max(0,Math.min(well.yieldLitresPerDay*2,well.waterLitres+recovery));
      well.depth=Math.round((well.depth+(state.droughtDays%30===0?0.1:0))*10)/10;
    }
  }
});
