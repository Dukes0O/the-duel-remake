import {TOWN_CELL_METRES, TOWN_REGIONS} from './town-world-data.js';

function oldRoads(){
  return TOWN_REGIONS.get('scablands').reservedShapes.filter(shape=>shape.type==='strip')
    .map(shape=>Object.freeze({id:shape.id,a:Object.freeze({x:shape.ax,z:shape.az}),
      b:Object.freeze({x:shape.bx,z:shape.bz}),halfWidth:shape.halfWidth}));
}

function buildingSolid(building, region) {
  const width=building.width??1,depth=building.depth??1;
  const halfX=width*TOWN_CELL_METRES/2,halfZ=depth*TOWN_CELL_METRES/2;
  const x=(building.x+width/2)*TOWN_CELL_METRES, z=(building.z+depth/2)*TOWN_CELL_METRES;
  return Object.freeze({id:building.id,x,y:region.groundHeightAt(x,z),z,heading:0,
    halfX,halfZ,height:TOWN_CELL_METRES,shape:'box'});
}

function buildingRoad(building) {
  const width=building.width??1,depth=building.depth??1;
  return Object.freeze({id:building.id,a:Object.freeze({x:building.x*TOWN_CELL_METRES,z:building.z*TOWN_CELL_METRES}),
    b:Object.freeze({x:(building.x+width)*TOWN_CELL_METRES,z:(building.z+depth)*TOWN_CELL_METRES}),
    halfWidth:Math.min(width,depth)*TOWN_CELL_METRES/2});
}

function walkerPosition(person,index,seed,buildings) {
  if(!buildings.length)return null;
  const building=buildings[(index+seed)%buildings.length];
  const angle=((index*97+seed%360)%360)*Math.PI/180,radius=4+(index%4)*2;
  return Object.freeze({id:person.id??`walker-${index}`,x:building.x+Math.cos(angle)*radius,
    y:building.y,z:building.z+Math.sin(angle)*radius});
}

export function createTownWorld(town) {
  if(!town||typeof town!=='object')throw new TypeError('A saved town is needed to make its world.');
  const ground=TOWN_REGIONS.get('scablands').groundHeightAt;
  const solids=[
    Object.freeze({id:'scrapdome',x:0,y:ground(0,-168.5),z:-168.5,heading:0,halfX:112,halfZ:80,height:8,shape:'ellipse'}),
    Object.freeze({id:'scrapdome-gate',x:0,y:ground(0,-92),z:-92,heading:0,halfX:24,halfZ:12,height:8,shape:'box'}),
  ],roads=oldRoads(),walkers=[];
  for(const building of town.buildings??[]) {
    const region=TOWN_REGIONS.get(building.regionId??'scablands');
    if(!region)continue;
    if(String(building.buildingId??'').startsWith('road-'))roads.push(buildingRoad(building));
    else solids.push(buildingSolid(building,region));
  }
  for(let i=0;i<(town.people??[]).length;i++) {
    const position=walkerPosition(town.people[i],i,town.seed??0,solids);
    if(position)walkers.push(position);
  }
  return Object.freeze({seed:town.seed??0,buildings:Object.freeze((town.buildings??[]).map(building=>Object.freeze({...building}))),roads:Object.freeze(roads),solids:Object.freeze(solids),walkers:Object.freeze(walkers),
    start:Object.freeze({x:0,y:TOWN_REGIONS.get('scablands').groundHeightAt(0,-112),z:-112,heading:0}),
    dome:Object.freeze({x:0,z:0,halfWidth:112,halfDepth:80,height:8}),
    gate:Object.freeze({x:0,z:-92,halfWidth:24,halfDepth:12,height:8,
      prompt:'Drive up to the Scrapdome gate to go inside.'})});
}

export function townWorldRoadAt(layout,x,z) {
  for(const road of layout?.roads??[]) {
    const dx=road.b.x-road.a.x,dz=road.b.z-road.a.z;
    const t=Math.max(0,Math.min(1,((x-road.a.x)*dx+(z-road.a.z)*dz)/(dx*dx+dz*dz||1)));
    if(Math.hypot(x-road.a.x-t*dx,z-road.a.z-t*dz)<=road.halfWidth)return true;
  }
  return false;
}
