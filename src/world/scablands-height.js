import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {riseHeightAt,riverDepthAt} from './scablands-regions.js';
import {scarpHeightAt} from './scablands-scarps.js';
import {LAND} from './scablands-names.js';
import {makeRng} from '../rng.js';
import {ROAD_NET, distanceToRoad} from './scablands-road.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};

// Hill centres follow named places. Their shoulders stand clear of the existing roads.
export function hillsFor(land=LAND,seed=1989){
  const rng=makeRng(seed);
  // Rows run east to west, with a seeded stagger across the Ships' open sand.
  // Select against the fixed land's roads so moving a named place moves its field together.
  const duneRng=makeRng(seed ^ 0x53414e44), dunes=[];
  for(let row=-3;row<=3 && dunes.length<14;row++) for(let column=-3;column<=3 && dunes.length<14;column++){
    const dx=column*260+(row%2)*100+duneRng.range(-22,22), dz=row*260+duneRng.range(-22,22);
    const radius=duneRng.range(105,130), height=duneRng.range(8,Math.min(15,radius*.079));
    const reference=LAND.at('ships-in-sand',dx,dz);
    if(Math.hypot(dx,dz)<radius+LAND.place('ships-in-sand').flatRadius+18) continue;
    if(ROAD_NET.roads.some(road=>distanceToRoad(reference.x,reference.z,road.points)<=radius+road.halfWidth+10)) continue;
    if(dunes.some(hill=>Math.hypot(hill.dx-dx,hill.dz-dz)<hill.radius+radius+10)) continue;
    dunes.push({dx,dz,radius,height});
  }
  const hills=[
    ...dunes.map(({dx,dz,radius,height})=>Object.freeze({...land.at('ships-in-sand',dx,dz),kind:'dune',height,radius})),
    Object.freeze({...land.at('dead-mall',-1500,-2300),kind:'breaks',height:58,radius:360}),
    Object.freeze({...land.at('dead-mall',-2000,-1800),kind:'breaks',height:72,radius:360}),
    Object.freeze({...land.at('dead-mall',-1500,-1300),kind:'breaks',height:48,radius:360}),
    Object.freeze({...land.at('ridge',-1200,900),kind:'lookout',height:45,radius:320,topRadius:60}),
    Object.freeze({...land.at('ridge'),kind:'ridge-top',height:45,radius:850,topRadius:160}),
    Object.freeze({...land.at('ridge',-750,-550),kind:'foothill',height:22,radius:300}),
    Object.freeze({...land.at('ridge',550,-600),kind:'foothill',height:26,radius:320}),
    Object.freeze({...land.between('yard','tin-town',.4,0,-800),kind:'mesa',height:20,radius:200,face:40,ramp:150,rampAngle:Math.PI}),
    Object.freeze({...land.between('yard','tin-town',.7,500,800),kind:'mesa',height:18,radius:200,face:40,ramp:150,rampAngle:0}),
  ];
  return Object.freeze(hills.map(hill=>{
    if(hill.kind==='lookout'||hill.kind==='ridge-top'||hill.kind==='mesa') return hill;
    return Object.freeze({...hill,spurs:rng.int(3,5),spurAngle:rng.range(0,Math.PI*2)});
  }));
}
export const HILLS=hillsFor();
// Build once. Keep table order inside each cell because mesas and flat tops blend in order.
const HILL_CELL_SIZE=500;
function indexHills(hills){
  const columns=new Map();
  for(const hill of hills){
    const reach=hill.radius+(hill.kind==='mesa'?hill.ramp:0);
    for(let x=Math.floor((hill.x-reach)/HILL_CELL_SIZE);x<=Math.floor((hill.x+reach)/HILL_CELL_SIZE);x++){
      let column=columns.get(x);
      if(!column) columns.set(x,column=new Map());
      for(let z=Math.floor((hill.z-reach)/HILL_CELL_SIZE);z<=Math.floor((hill.z+reach)/HILL_CELL_SIZE);z++){
        let cell=column.get(z);
        if(!cell) column.set(z,cell=[]);
        cell.push(hill);
      }
    }
  }
  return columns;
}
const HILL_INDEX=indexHills(HILLS), NO_HILLS=Object.freeze([]);
function nearbyHills(x,z,hills){
  if(hills!==HILLS) return hills;
  return HILL_INDEX.get(Math.floor(x/HILL_CELL_SIZE))?.get(Math.floor(z/HILL_CELL_SIZE))??NO_HILLS;
}
export function hillHeightAt(x,z,hills=HILLS){
  let height=0;
  for(const hill of nearbyHills(x,z,hills)){
    if(hill.kind==='lookout'||hill.kind==='mesa'||hill.kind==='ridge-top') continue;
    const distance=Math.hypot(x-hill.x,z-hill.z);
    if(distance>=hill.radius) continue;
    // The nominal radius is the outer bound, so shoulders cannot spill onto a cleared road.
    const angle=Math.atan2(z-hill.z,x-hill.x);
    const radius=hill.spurs ? hill.radius*(.875+.125*Math.sin(hill.spurs*angle+hill.spurAngle)) : hill.radius;
    if(distance<radius) height=Math.max(height,hill.height*(1-smooth(distance/radius)));
  }
  return height;
}

function oldTerrainHeightAt(x,z){
  const nx=x/SCABLANDS_LAYOUT.halfWidth,nz=z/SCABLANDS_LAYOUT.halfDepth;
  // 1 is the edge of the land. The ridge and the wall are the same size in metres as on the old, small land (see SCABLANDS_LAYOUT).
  const edge=1+(Math.hypot(nx,nz)-1)*SCABLANDS_LAYOUT.edgeScale;
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  // The rises that hide each place from the last (src/world/scablands-regions.js): height only, gentle enough to drive over.
  // The four scarps (src/world/scablands-scarps.js): steep faces of broken rock on the scab plates, near the camp and by the Ridge.
  return rolling+ridge+wall+riseHeightAt(x,z)+scarpHeightAt(x,z);
}

export function scablandsTerrainHeightAt(x,z,hills=HILLS){
  let height=oldTerrainHeightAt(x,z)+hillHeightAt(x,z,hills);
  for(const hill of nearbyHills(x,z,hills)){
    if(hill.kind==='mesa'){
      const dx=x-hill.x,dz=z-hill.z,distance=Math.hypot(dx,dz);
      if(distance>=hill.radius+hill.ramp) continue;
      // A broad ramp on one side joins a broken, steep rim around the flat top.
      const angle=Math.atan2(dz,dx), difference=Math.atan2(Math.sin(angle-hill.rampAngle),Math.cos(angle-hill.rampAngle));
      const rampWeight=1-smooth((Math.abs(difference)-.18)/.35);
      const rim=hill.radius+8*Math.sin(angle*5)*smooth(Math.abs(difference)/.5);
      const width=hill.face+(hill.ramp-hill.face)*rampWeight;
      const weight=1-smooth((distance-rim)/width);
      const top=oldTerrainHeightAt(hill.x,hill.z)+hill.height;
      height+=(top-height)*weight;
      continue;
    }
    if(hill.kind!=='lookout'&&hill.kind!=='ridge-top') continue;
    const distance=Math.hypot(x-hill.x,z-hill.z);
    if(distance>=hill.radius) continue;
    const weight=1-smooth((distance-hill.topRadius)/(hill.radius-hill.topRadius));
    const top=hill.kind==='ridge-top'?hill.height:oldTerrainHeightAt(hill.x,hill.z)+hill.height;
    height+=(top-height)*weight;
  }
  return height;
}

// The land with its rises and with every place's own flat ground, before the dry river is cut: the plain.
export function scablandsPlainHeightAt(x,z){
  let height=scablandsTerrainHeightAt(x,z);
  for(const place of SCABLANDS_PLACES){
    const distance=Math.hypot(x-place.x,z-place.z),weight=1-smooth((distance-place.flatRadius)/18);
    const top=place.id==='ridge'?HILLS.find(hill=>hill.kind==='ridge-top').height:place.height;
    height+=(top-height)*weight;
  }
  return height;
}

// The land as a car drives on it: the plain with the dry river sunk into it (8 m, with banks), and a deck level with the plain over
// the Girder Bridge and the Pipe.
export function scablandsHeightAt(x,z){
  return scablandsPlainHeightAt(x,z)-riverDepthAt(x,z);
}
