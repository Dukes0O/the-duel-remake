import {registerTownSystem} from './town-sim.js';
import {ensureUtilityState} from './town-pipes.js';

const finite=Number.isFinite;
const key=point=>`${point.x},${point.z}`;

function componentAt(point,wires) {
  if(!wires.length) return `cell:${key(point)}`;
  const links=new Map();
  for(const wire of wires){
    if(!wire?.from||!wire?.to) continue;
    const a=key(wire.from),b=key(wire.to);
    if(!links.has(a)) links.set(a,[]);if(!links.has(b)) links.set(b,[]);
    links.get(a).push(b);links.get(b).push(a);
  }
  const start=key(point),seen=new Set([start]),queue=[start];
  while(queue.length){const here=queue.shift();for(const next of links.get(here)||[])if(!seen.has(next)){seen.add(next);queue.push(next);}}
  return `wire:${[...seen].sort()[0]}`;
}

function generatorOutput(generator,{wind,sunlight}) {
  switch(generator.kind){
    case 'windmill': return 5*Math.min(1,wind);
    case 'solar-rack': return 8*Math.min(1,sunlight);
    case 'generator': return generator.fuelLitres===0?0:40;
    case 'pump-house': return 3;
    default: return Math.max(0,Number(generator.kw)||0);
  }
}

/** Match real town generation against live demand; overlay cells stay plain data. */
export function solveTownPower({generators=[],demands=[],wires=[],wind=0.5,sunlight=0.5}) {
  if(!Array.isArray(generators)||!Array.isArray(demands)||!Array.isArray(wires)||!finite(wind)||wind<0||!finite(sunlight)||sunlight<0)
    throw new TypeError('Power needs generator, demand and wire lists with non-negative weather.');
  const generation=generators.map((item,index)=>{
    if(!item||!finite(item.x)||!finite(item.z)) throw new TypeError(`Generator ${index+1} needs map coordinates.`);
    const kw=generatorOutput(item,{wind,sunlight});
    if(!finite(kw)||kw<0) throw new TypeError(`Generator ${index+1} has invalid power.`);
    return {id:String(item.id??`generator-${index+1}`),x:item.x,z:item.z,kw,availableKw:kw,fuelLitres:item.fuelLitres??null,component:componentAt(item,wires)};
  });
  const consumers=demands.map((item,index)=>{
    if(!item||!finite(item.x)||!finite(item.z)||!finite(item.kw)||item.kw<0) throw new TypeError(`Power demand ${index+1} needs map coordinates and non-negative kW.`);
    return {id:String(item.id??`load-${index+1}`),x:item.x,z:item.z,kw:item.kw,component:componentAt(item,wires)};
  });
  const remaining=new Map(),hasGenerator=new Set();
  for(const generator of generation){remaining.set(generator.component,(remaining.get(generator.component)??0)+generator.kw);hasGenerator.add(generator.component);}
  const loads=consumers.map(item=>{
    const available=remaining.get(item.component)??0,supplied=Math.min(item.kw,available),connected=hasGenerator.has(item.component);
    remaining.set(item.component,available-supplied);
    return {...item,connected,suppliedKw:Number(supplied.toFixed(3)),shortfallKw:Number((item.kw-supplied).toFixed(3)),message:supplied>=item.kw?`${item.id} has enough power.`:connected?`${item.id} is short by ${(item.kw-supplied).toFixed(1)} kW.`:`${item.id} has no connected power line.`};
  });
  return {generationKw:Number(generation.reduce((sum,item)=>sum+item.kw,0).toFixed(3)),demandKw:Number(consumers.reduce((sum,item)=>sum+item.kw,0).toFixed(3)),deliveredKw:Number(loads.reduce((sum,item)=>sum+item.suppliedKw,0).toFixed(3)),shortfallKw:Number(loads.reduce((sum,item)=>sum+item.shortfallKw,0).toFixed(3)),generators:generation,loads,
    overlay:loads.map(({id,x,z,suppliedKw,shortfallKw})=>({id,x,z,suppliedKw,shortfallKw}))};
}

registerTownSystem('power-network',36,24,({town})=>{
  const utilities=ensureUtilityState(town);
  const result=solveTownPower({generators:utilities.generators??[],demands:utilities.powerDemands??[],wires:utilities.wires,
    wind:utilities.windFactor??0.5,sunlight:utilities.sunFactor??0.5});
  town.power={...result,in:result.generationKw,out:result.demandKw};
});
