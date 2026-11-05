const ROAD_SPEED_KMH=Object.freeze({dirt:15,plank:25,paved:40});
const nodeKey=cell=>`${cell.regionId||'scablands'}:${cell.x}:${cell.z}`;
const parseNode=key=>{const [regionId,x,z]=key.split(':');return {regionId,x:Number(x),z:Number(z)};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)*8;

function roadNodes(roads) {
  const nodes=new Map();
  for(const road of roads||[]) {
    if(road.state&&road.state!=='built') continue;
    const key=nodeKey(road), speed=ROAD_SPEED_KMH[road.roadClass||'dirt'];
    if(speed) nodes.set(key,{key,cell:road,speed,edges:[]});
  }
  for(const node of nodes.values()) for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const next=nodes.get(nodeKey({...node.cell,x:node.cell.x+dx,z:node.cell.z+dz}));
    if(next) node.edges.push(next.key);
  }
  return nodes;
}

export function findHaulRoute(roads,from,to) {
  const nodes=roadNodes(roads),start=nodeKey(from),goal=nodeKey(to);
  if(!nodes.has(start)||!nodes.has(goal)) return null;
  const costs=new Map([[start,0]]),previous=new Map(),open=new Set([start]);
  while(open.size) {
    let current=null;
    for(const key of open) if(current===null||costs.get(key)<costs.get(current)) current=key;
    open.delete(current);
    if(current===goal) break;
    const here=nodes.get(current);
    for(const nextKey of here.edges) {
      const next=nodes.get(nextKey), hours=distance(here.cell,next.cell)/(Math.min(here.speed,next.speed)*1000);
      const cost=costs.get(current)+hours;
      if(cost< (costs.get(nextKey)??Infinity)) {costs.set(nextKey,cost);previous.set(nextKey,current);open.add(nextKey);}
    }
  }
  if(!costs.has(goal)) return null;
  const path=[];for(let key=goal;key!==undefined;key=previous.get(key)) path.unshift(parseNode(key));
  return {path,hours:costs.get(goal)};
}

export function createHauler({id,from,to,vehicle='handcart',capacityKg,fuelLitres=0,goods={},roads=[]}) {
  const config=vehicle==='truck'?{capacityKg:Math.min(capacityKg??4000,4000),speedFactor:1,fuelKm:0.25}
    :{capacityKg:Math.min(capacityKg??150,150),speedFactor:0.35,fuelKm:0};
  const route=findHaulRoute(roads,from,to);
  if(!route) return {ok:false,message:'There is no road between those places.'};
  const loadKg=Object.entries(goods).reduce((sum,[id,amount])=>sum+Math.max(0,amount)*(goodDefinition(id)?.kgPerUnit||0),0);
  if(loadKg>config.capacityKg) return {ok:false,message:'That load is too heavy for this vehicle.'};
  return {ok:true,agent:{id,vehicle,capacityKg:config.capacityKg,speedFactor:config.speedFactor,fuelKm:config.fuelKm,
    fuelLitres,goods:{...goods},loadKg,path:route.path,pathIndex:0,position:route.path[0],progress:0,status:'moving',hoursToDestination:route.hours/config.speedFactor}};
}

export function stepHauler(agent,roads) {
  if(!agent||agent.status!=='moving') return {status:agent?.status||'stopped',message:agent?.message||'The vehicle is stopped.'};
  const roadIndex=new Map((roads||[]).map(road=>[nodeKey(road),road]));
  let hours=1;
  while(hours>0&&agent.pathIndex<agent.path.length-1) {
    const here=agent.path[agent.pathIndex],next=agent.path[agent.pathIndex+1];
    const road=roadIndex.get(nodeKey(here));
    const nextRoad=roadIndex.get(nodeKey(next));
    const speed=Math.min(ROAD_SPEED_KMH[road?.roadClass||'dirt'],ROAD_SPEED_KMH[nextRoad?.roadClass||'dirt'])*(agent.speedFactor||1);
    const edgeKm=distance(here,next)/1000;
    const edgeHours=edgeKm/speed;
    const remainingKm=Math.min(edgeKm,hours*speed);
    const fuelNeeded=remainingKm*(agent.fuelKm||0);
    if(fuelNeeded>agent.fuelLitres) {
      agent.status='out-of-fuel';agent.message='The truck has run out of fuel and stopped.';
      return {status:agent.status,message:agent.message};
    }
    agent.fuelLitres-=fuelNeeded;
    if(remainingKm>=edgeKm) {agent.position=next;agent.pathIndex++;hours-=edgeHours;}
    else {agent.progress=(agent.progress||0)+remainingKm/edgeKm;hours=0;}
  }
  if(agent.pathIndex>=agent.path.length-1) agent.status='arrived';
  return {status:agent.status,message:agent.status==='arrived'?'The load has arrived.':'The vehicle is on the road.'};
}

export function dispatchSalvageGang({id='salvage-gang',from,to,roads,capacityKg=2000}) {
  const outbound=createHauler({id,from,to,roads,vehicle:'handcart',capacityKg,goods:{},fuelLitres:0});
  if(!outbound.ok) return outbound;
  const back=createHauler({id,from:to,to:from,roads,vehicle:'handcart',capacityKg,goods:{},fuelLitres:0});
  if(!back.ok) return back;
  return {ok:true,agent:{...outbound.agent,kind:'salvage-gang',returnPath:back.agent.path,salvageCapacityKg:capacityKg}};
}

export function stepSalvageGang(agent,roads,salvageKg=2000) {
  if(agent?.kind!=='salvage-gang') return {status:'stopped',message:'This is not a salvage gang.'};
  if(agent.status==='arrived'&&agent.returnPath) {
    const amount=Math.max(0,Math.min(salvageKg,agent.salvageCapacityKg));
    agent.goods.salvage=amount;agent.loadKg=amount;agent.returnPath=null;
    agent.path=[...agent.path].reverse();agent.pathIndex=0;agent.position=agent.path[0];agent.progress=0;agent.status='moving';
  }
  return stepHauler(agent,roads);
}
import {goodDefinition} from './town-goods.js';
