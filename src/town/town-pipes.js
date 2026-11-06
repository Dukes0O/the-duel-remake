import {registerTownSystem} from './town-sim.js';
import {TOWN_REGIONS} from './town-world-data.js';

const PIPE_SIZES = Object.freeze({50:0.05,100:0.1,200:0.2});
const MIN_PERSON_WATER_LITRES_DAY = 15;
const PERSON_WATER_LITRES_DAY = 50;
const TAP_LITRES_MINUTE = 7.5;
const LATrine_FILL_DAYS = 730;
const finite = Number.isFinite;
const pointKey = point => `${point.x},${point.z}`;
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);

function ensureUtilityState(town) {
  if (!town.utilities || typeof town.utilities !== 'object') town.utilities = {};
  const utilities = town.utilities;
  if (!Array.isArray(utilities.pipes)) utilities.pipes = [];
  if (!Array.isArray(utilities.sewers)) utilities.sewers = [];
  if (!Array.isArray(utilities.wires)) utilities.wires = [];
  if (!Array.isArray(utilities.sources)) utilities.sources = [];
  if (!Array.isArray(utilities.taps)) utilities.taps = [];
  if (!Array.isArray(utilities.sewage)) utilities.sewage = [];
  return utilities;
}

function validPoint(point, label) {
  if (!point || !finite(point.x) || !finite(point.z)) throw new TypeError(`${label} needs map coordinates.`);
  return {x:point.x,z:point.z};
}

function validPipe(pipe, index) {
  const from=validPoint(pipe?.from,`Pipe ${index+1} start`), to=validPoint(pipe?.to,`Pipe ${index+1} end`);
  const size=Number(pipe?.sizeMm);
  if (!Object.hasOwn(PIPE_SIZES,size)) throw new TypeError(`Pipe ${index+1} must be 50, 100 or 200 mm wide.`);
  const length=distance(from,to);
  if (length<=0) throw new TypeError(`Pipe ${index+1} needs two different points.`);
  return {id:String(pipe.id??`pipe-${index+1}`),from,to,sizeMm:size,length};
}

function graphFor(pipes) {
  const graph=new Map();
  const node=point=>{
    const key=pointKey(point);
    if(!graph.has(key)) graph.set(key,{...point,key,edges:[]});
    return graph.get(key);
  };
  pipes.forEach((raw,index)=>{
    const pipe=validPipe(raw,index), a=node(pipe.from), b=node(pipe.to);
    const edge={id:pipe.id,a,b,sizeMm:pipe.sizeMm,length:pipe.length};
    a.edges.push({node:b,edge}); b.edges.push({node:a,edge});
  });
  return graph;
}

function validateSource(source,index) {
  const point=validPoint(source,`Water source ${index+1}`);
  const elevation=Number(source.elevation??0), litresPerDay=Number(source.litresPerDay??0);
  if(!finite(elevation)||!finite(litresPerDay)||litresPerDay<0) throw new TypeError(`Water source ${index+1} needs a height and a non-negative daily supply.`);
  return {...point,id:String(source.id??`source-${index+1}`),elevation,litresPerDay,kind:source.kind??'source',quality:source.quality??{turbidity:10,stage:'raw'}};
}

function validateDemand(demand,index) {
  const point=validPoint(demand,`Water tap ${index+1}`);
  const elevation=Number(demand.elevation??0), litresPerDay=Number(demand.litresPerDay??0);
  if(!finite(elevation)||!finite(litresPerDay)||litresPerDay<0) throw new TypeError(`Water tap ${index+1} needs a height and a non-negative daily need.`);
  return {...point,id:String(demand.id??`tap-${index+1}`),elevation,litresPerDay,kind:demand.kind??'tap'};
}

/** Put a finished pipe, sewer or wire route on its own saved utility layer. */
export function completeTownUtilityRoute(town,route,sizeMm,workOrder) {
  if(!town||typeof town!=='object'||!route||typeof route.id!=='string'||!Array.isArray(route.points)||route.points.length<2)
    throw new TypeError('Choose an agreed utility route with at least two points.');
  if(!workOrder||workOrder.status!=='finished'||workOrder.targetKind!=='route'||workOrder.targetId!==route.id)
    return {ok:false,message:'Finish the route work before the utility can carry anything.'};
  const kind=route.kind??workOrder.kind;
  if(!['pipe','sewer','wire'].includes(kind)) throw new TypeError('Choose a pipe, sewer or wire route.');
  if(kind==='pipe'&&!Object.hasOwn(PIPE_SIZES,Number(sizeMm))) throw new TypeError('Pipe size must be 50, 100 or 200 mm.');
  const utilities=ensureUtilityState(town),layer=kind==='pipe'?utilities.pipes:kind==='sewer'?utilities.sewers:utilities.wires;
  if(layer.some(item=>item.routeId===route.id)) return {ok:false,message:'That route is already connected.'};
  const segments=[];
  for(let i=1;i<route.points.length;i++){
    const from=validPoint(route.points[i-1],`Route point ${i}`),to=validPoint(route.points[i],`Route point ${i+1}`);
    if(distance(from,to)===0) continue;
    segments.push({id:`${route.id}:${i}`,routeId:route.id,from,to,...(kind==='pipe'?{sizeMm:Number(sizeMm)}:{})});
  }
  if(!segments.length) throw new TypeError('The route needs points in different places.');
  layer.push(...segments);
  return {ok:true,segments:segments.length,message:'The finished route is connected.'};
}

function edgeLoss(edge, flowLitresPerSecond) {
  const diameter=PIPE_SIZES[edge.sizeMm];
  // Darcy-Weisbach's form keeps the expected relationship: loss grows with
  // length and flow, and falls sharply as the pipe gets wider.
  const area=Math.PI*diameter*diameter/4;
  const velocity=(flowLitresPerSecond/1000)/area;
  return 0.025*(edge.length/diameter)*(velocity*velocity)/(2*9.80665);
}

function shortestSupply(graph,sources,target,flow) {
  const best=new Map();
  const queue=[];
  for(const source of sources){
    const key=pointKey(source),node=graph.get(key);
    if(node){const cost=0;best.set(key,{cost,source,previous:null,edge:null});queue.push({node,cost});}
  }
  while(queue.length){
    queue.sort((a,b)=>a.cost-b.cost||a.node.key.localeCompare(b.node.key));
    const current=queue.shift(),known=best.get(current.node.key);
    if(!known||known.cost!==current.cost) continue;
    if(current.node.key===pointKey(target)){
      const edges=[];let cursor=known;
      while(cursor?.edge){edges.push(cursor.edge);cursor=cursor.previous;}
      return {source:known.source,edges,loss:known.cost};
    }
    for(const link of current.node.edges){
      const cost=current.cost+edgeLoss(link.edge,flow),existing=best.get(link.node.key);
      if(!existing||cost<existing.cost){best.set(link.node.key,{cost,source:known.source,previous:known,edge:link.edge});queue.push({node:link.node,cost});}
    }
  }
  return null;
}

/** Solve one town's water pressure and daily delivery from plain saved arrays. */
export function solveTownWater({pipes=[],sources=[],taps=[],treatments=[],groundAt=()=>0,waterLimitLitresPerDay=Infinity,minutesAvailable=24*60}) {
  if(!Array.isArray(pipes)||!Array.isArray(sources)||!Array.isArray(taps)) throw new TypeError('Water pipes, sources and taps must be lists.');
  if(!Array.isArray(treatments)) throw new TypeError('Water treatment plants must be a list.');
  if(typeof groundAt!=='function') throw new TypeError('Water needs a ground height function.');
  if(!finite(minutesAvailable)||minutesAvailable<0) throw new TypeError('Water time must be zero or more minutes.');
  if((finite(waterLimitLitresPerDay)&&waterLimitLitresPerDay<0)||Number.isNaN(waterLimitLitresPerDay)) throw new TypeError('The Water Road limit must be zero or more litres a day.');
  const graph=graphFor(pipes),availableSources=sources.map(source=>{
    const height=source?.elevation??groundAt(source.x,source.z)+(source?.kind==='water-tower'?(source.towerHeight??12):0);
    return validateSource({...source,elevation:height});
  }).map(source=>source.kind==='water-road'
    ? {...source,litresPerDay:Math.min(source.litresPerDay,waterLimitLitresPerDay)}:source),
    demands=taps.map(tap=>validateDemand({...tap,elevation:tap?.elevation??groundAt(tap.x,tap.z)}));
  const treatmentState=treatments.map((item,index)=>{
    const point=validPoint(item,`Treatment plant ${index+1}`),capacity=Number(item.capacityLitresPerDay??200_000),stages=item.stages??[];
    if(!finite(capacity)||capacity<0||!Array.isArray(stages)) throw new TypeError(`Treatment plant ${index+1} needs a non-negative capacity and treatment stages.`);
    return {...point,id:String(item.id??`treatment-${index+1}`),capacity,remaining:capacity,stages,processed:0,quality:null};
  });
  const sourceLimit=availableSources.reduce((sum,source)=>sum+source.litresPerDay,0);
  const remainingBySource=new Map(availableSources.map(source=>[source,source.litresPerDay]));
  let totalDelivered=0;
  const networkFlowLitresPerSecond=Math.min(sourceLimit,demands.reduce((sum,tap)=>sum+tap.litresPerDay,0))/86_400;
  const results=demands.map(tap=>{
    const ground=groundAt(tap.x,tap.z);
    if(!finite(ground)) throw new TypeError('Ground heights must be finite numbers.');
    const queueLitres=Math.min(tap.litresPerDay,TAP_LITRES_MINUTE*minutesAvailable);
    const allocations=[];
    let delivered=0,pressure=0;
    while(delivered<queueLitres){
      const paths=availableSources.filter(source=>(remainingBySource.get(source)??0)>0)
        .map(source=>shortestSupply(graph,[source],tap,networkFlowLitresPerSecond))
        .filter(path=>path&&path.source.elevation-ground-path.loss>0)
        .sort((a,b)=>a.loss-b.loss||a.source.id.localeCompare(b.source.id));
      const path=paths[0];
      if(!path) break;
      const head=path.source.elevation-ground-path.loss,pressureFactor=Math.min(1,head/10);
      const amount=Math.min(queueLitres-delivered,(remainingBySource.get(path.source)??0)*pressureFactor);
      if(amount<=0) break;
      remainingBySource.set(path.source,Math.max(0,(remainingBySource.get(path.source)??0)-amount/pressureFactor));
      allocations.push({path,amount,head});
      delivered+=amount;
      pressure=Math.max(pressure,head);
    }
    totalDelivered+=delivered;
    let qualityTurbidity=0,qualityVolume=0,tapTreatedLitres=0;
    const qualityStages=[];
    const treatmentIds=new Set();
    for(const allocation of allocations){
      let sourceQuality=allocation.path.source.quality??null;
      if(sourceQuality){
        let allocationTreated=0,currentKey=pointKey(allocation.path.source);
        const routeKeys=[currentKey];
        for(const edge of allocation.path.edges.slice().reverse()){
          currentKey=edge.a.key===currentKey?edge.b.key:edge.a.key;
          routeKeys.push(currentKey);
        }
        const routeOrder=new Map(routeKeys.map((key,index)=>[key,index]));
        const routePlants=treatmentState.filter(plant=>routeOrder.has(pointKey(plant)))
          .sort((a,b)=>routeOrder.get(pointKey(a))-routeOrder.get(pointKey(b))||a.id.localeCompare(b.id));
        for(const plant of routePlants){
          const processed=Math.min(allocation.amount,plant.remaining);
          if(processed<=0) continue;
          const treatedQuality=treatTownWater(sourceQuality,plant.stages);
          sourceQuality=processed<allocation.amount
            ? {...treatedQuality,turbidity:Number(((treatedQuality.turbidity*processed+sourceQuality.turbidity*(allocation.amount-processed))/allocation.amount).toFixed(3)),stage:'mixed'}
            : treatedQuality;
          plant.remaining-=processed;plant.processed+=processed;plant.quality=treatedQuality;
          treatmentIds.add(plant.id);allocationTreated=Math.max(allocationTreated,processed);
        }
        tapTreatedLitres+=allocationTreated;
        qualityTurbidity+=sourceQuality.turbidity*allocation.amount;
        qualityVolume+=allocation.amount;
        qualityStages.push(sourceQuality.stage??'raw');
      }
    }
    const primary=allocations[0];
    const reachable=availableSources.map(source=>shortestSupply(graph,[source],tap,networkFlowLitresPerSecond)).filter(Boolean);
    const hasPath=reachable.length>0,hasHead=reachable.some(path=>path.source.elevation-ground-path.loss>0);
    const hasSupply=reachable.some(path=>(remainingBySource.get(path.source)??0)>0);
    return {id:tap.id,x:tap.x,z:tap.z,pressureMetres:finite(pressure)?pressure:0,litresPerDay:Math.floor(delivered),queueMinutes:delivered/TAP_LITRES_MINUTE,connected:hasPath,sourceId:primary?.path.source.id??null,sourceIds:[...new Set(allocations.map(item=>item.path.source.id))],quality:qualityVolume?{turbidity:Number((qualityTurbidity/qualityVolume).toFixed(3)),stage:qualityStages.length===1?qualityStages[0]:'mixed'}:null,
      treatmentIds:[...treatmentIds],treatedLitresPerDay:Math.floor(tapTreatedLitres),
      message:delivered>0?`${tap.id} gets ${Math.floor(delivered)} litres a day.`:!hasPath?`${tap.id} has no connected water pipe.`:!hasSupply?`${tap.id} has no water available.`:!hasHead?`${tap.id} is higher than its water tower.`:`${tap.id} gets no water today.`};
  });
  const pipeResults=pipes.map((pipe,index)=>{
    const checked=validPipe(pipe,index);
    const use=results.some(result=>result.connected&&shortestSupply(graph,availableSources,demands.find(d=>d.id===result.id),TAP_LITRES_MINUTE/60)?.edges.includes(checked));
    return {id:checked.id,sizeMm:checked.sizeMm,lengthMetres:checked.length,connected:use};
  });
  const demand=demands.reduce((sum,tap)=>sum+tap.litresPerDay,0);
  return {sources:availableSources.length,demand,delivered:Math.floor(totalDelivered),shortfall:Math.max(0,Math.ceil(demand-totalDelivered)),pipes:pipeResults,taps:results,
    treatments:treatmentState.map(({id,processed,quality,capacity})=>({id,processedLitresPerDay:Math.floor(processed),capacityLitresPerDay:capacity,quality})),
    overlay:results.map(({id,x,z,pressureMetres,litresPerDay})=>({id,x,z,pressureMetres,litresPerDay,shortfallLitresPerDay:Math.max(0,demands.find(tap=>tap.id===id).litresPerDay-litresPerDay)}))};
}

/** Real queue and bucket carrying costs for one person's daily water. */
// 20 L is a common drinking-water jerrycan size (WHO communicable-disease field guidance).
export function bucketWaterCost({people,litresPerPersonDay=PERSON_WATER_LITRES_DAY,tapLitresPerMinute=TAP_LITRES_MINUTE,distanceMetres=0,walkingMetresPerMinute=80,bucketLitres=20}) {
  for(const [name,value] of Object.entries({people,litresPerPersonDay,tapLitresPerMinute,walkingMetresPerMinute,bucketLitres}))
    if(!finite(value)||value<0||(name!=='people'&&value===0)) throw new TypeError(`${name} must be a usable non-negative number.`);
  if(litresPerPersonDay<MIN_PERSON_WATER_LITRES_DAY||litresPerPersonDay>PERSON_WATER_LITRES_DAY) throw new RangeError('A person needs 15 to 50 litres of water a day.');
  const litres=people*litresPerPersonDay,queueMinutes=litres/tapLitresPerMinute;
  const trips=litres===0?0:Math.ceil(litres/bucketLitres),carryMinutes=trips*2*distanceMetres/walkingMetresPerMinute;
  return {litresPerDay:litres,queueMinutesPerDay:queueMinutes,carryTripsPerDay:trips,carryMinutesPerDay:carryMinutes,totalHoursPerDay:(queueMinutes+carryMinutes)/60};
}

/** Test the settled real-world latrine placement and capacity rules. */
export function checkTownLatrine({x,z,elevation=0,well,people,ageDays=0,capacity=20}) {
  const latrine=validPoint({x,z},'Latrine');
  if(!well||!finite(well.x)||!finite(well.z)||!finite(well.elevation)||!finite(elevation)||!Number.isSafeInteger(people)||people<0||!finite(ageDays)||ageDays<0)
    throw new TypeError('Latrines need a well, height, people and age.');
  const metres=distance(latrine,well);
  const downhill=elevation<well.elevation;
  const peopleServed=Math.min(people,capacity);
  return {distanceMetres:metres,downhill,meetsRule:metres>=30&&downhill,peopleServed,peopleWithoutLatrine:Math.max(0,people-capacity),filled:ageDays>=LATrine_FILL_DAYS,
    message:metres<30?'The latrine must be at least 30 metres from the well.':!downhill?'The latrine must be downhill from the well.':people>capacity?'One latrine serves up to 20 people.':'The latrine is downhill and far enough from the well.'};
}

/** Carry water quality through settling, sand filtering and disinfection. */
export function treatTownWater(quality, stages=[]) {
  if(!quality||!finite(quality.turbidity)||quality.turbidity<0||!Array.isArray(stages)) throw new TypeError('Water quality needs a turbidity number and treatment stages.');
  let turbidity=quality.turbidity;const done=[];
  for(const stage of stages){
    // Baseline teaching values: 50% settling and 90% sand-filter reduction.
    // Boiling and chlorine disinfect; they do not remove suspended particles.
    if(stage==='settling') turbidity*=0.5;
    else if(stage==='sand-filter') turbidity*=0.1;
    else if(stage!=='boil'&&stage!=='chlorine') throw new TypeError(`Unknown water treatment stage: ${stage}.`);
    done.push(stage);
  }
  return {turbidity:Number(turbidity.toFixed(3)),stage:done.at(-1)??quality.stage??'raw',stages:done};
}

/** Sewer routes flow only toward lower ground; reed beds report treated load. */
export function solveTownSewers({sewers=[],loads=[],groundAt=()=>0,reedBeds=[]}) {
  if(!Array.isArray(sewers)||!Array.isArray(loads)||!Array.isArray(reedBeds)||typeof groundAt!=='function') throw new TypeError('Sewers, loads and reed beds must be lists.');
  const valid=sewers.map((sewer,index)=>{
    const from=validPoint(sewer?.from,`Sewer ${index+1} start`),to=validPoint(sewer?.to,`Sewer ${index+1} end`),rise=groundAt(to.x,to.z)-groundAt(from.x,from.z);
    if(!finite(rise)) throw new TypeError('Ground heights must be finite numbers.');
    return {id:String(sewer.id??`sewer-${index+1}`),from,to,fallMetres:-rise,flows:rise<0};
  });
  let cleaned=0;
  const remainingCapacity=new Map(reedBeds.map((bed,index)=>[bed,Number(bed.capacityLitresPerDay??0)]));
  const treatedLoads=[];
  for(const load of loads){
    const origin=validPoint(load,`Sewage load ${load.id??''}`),amount=Number(load.litresPerDay??0);
    if(!finite(amount)||amount<0) throw new TypeError('Sewage loads must be non-negative litres per day.');
    let current=valid.find(sewer=>sewer.flows&&distance(sewer.from,origin)<=1),outlet=origin;
    const chain=[],visited=new Set();
    while(current&&!visited.has(current.id)){
      visited.add(current.id);chain.push(current);outlet=current.to;
      current=valid.find(sewer=>sewer.flows&&!visited.has(sewer.id)&&distance(sewer.from,outlet)<=1);
    }
    const fall=groundAt(outlet.x,outlet.z)-groundAt(origin.x,origin.z),flows=chain.length>0&&fall<0;
    const bed=flows?reedBeds.find(item=>distance(item,outlet)<=30):null;
    const treated=bed?Math.min(amount,remainingCapacity.get(bed)??0):0;
    cleaned+=treated;
    if(bed) remainingCapacity.set(bed,(remainingCapacity.get(bed)??0)-treated);
    treatedLoads.push({id:String(load.id??`sewage-${treatedLoads.length+1}`),litresPerDay:amount,treatedLitresPerDay:treated,outlet,fallMetres:-fall,flows,reedBedId:bed?.id??null});
  }
  return {sewers:valid,loads:treatedLoads,cleanedLitresPerDay:cleaned,untreatedLitresPerDay:loads.reduce((sum,load)=>sum+Number(load.litresPerDay??0),0)-cleaned};
}

registerTownSystem('water-network',35,24,({town})=>{
  const utilities=ensureUtilityState(town);
  const region=TOWN_REGIONS.get(utilities.regionId??'scablands');
  if(!region) return;
  const groundAt=(x,z)=>region.groundHeightAt(x,z);
  const sources=utilities.sources.map(source=>({...source,elevation:source.elevation??groundAt(source.x,source.z)+(source.kind==='water-tower'?(source.towerHeight??12):0)}));
  const taps=utilities.taps.map(tap=>({...tap,elevation:tap.elevation??groundAt(tap.x,tap.z)}));
  utilities.waterResult=solveTownWater({pipes:utilities.pipes,sources,taps,treatments:utilities.treatmentPlants??[],groundAt,
    waterLimitLitresPerDay:utilities.waterRoadLimitLitresPerDay??10_000});
  town.water={in:utilities.waterResult.delivered,out:utilities.waterResult.demand,shortfall:utilities.waterResult.shortfall,overlay:utilities.waterResult.overlay};
  utilities.sewerResult=solveTownSewers({sewers:utilities.sewers,loads:utilities.sewage,groundAt,reedBeds:utilities.reedBeds??[]});
});

export {ensureUtilityState, MIN_PERSON_WATER_LITRES_DAY, PIPE_SIZES, PERSON_WATER_LITRES_DAY, TAP_LITRES_MINUTE};
