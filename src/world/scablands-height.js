import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {riseHeightAt,riverDepthAt,GROUND_AREAS,polygonMargin,RIVER_LAND,RIVER} from './scablands-regions.js';
import {scarpHeightAt} from './scablands-scarps.js';
import {LAND} from './scablands-names.js';
import {makeRng} from '../rng.js';
import {ROAD_NET, roadNet, roadPointFrom, distanceToRoad} from './scablands-road.js';
import {westScarpTrial} from './scablands-tunnel-trial.js';

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
  const lookout=land.at('ridge',-1200,900);
  const ridgeRoad=(land===LAND?ROAD_NET:roadNet(land)).road('ridge-road');
  let nearestRoad=null, nearestDistance=Infinity;
  for(let i=1;i<ridgeRoad.points.length;i++){
    const a=ridgeRoad.points[i-1],b=ridgeRoad.points[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=clamp(((lookout.x-a.x)*dx+(lookout.z-a.z)*dz)/(dx*dx+dz*dz));
    const x=a.x+t*dx,z=a.z+t*dz,distance=Math.hypot(x-lookout.x,z-lookout.z);
    if(distance<nearestDistance){nearestDistance=distance;nearestRoad={x,z};}
  }
  const roadAngle=Math.atan2(nearestRoad.z-lookout.z,nearestRoad.x-lookout.x);
  // Include the north approach used by the existing drive as well as the road side.
  const rampAngle=-Math.PI/2+Math.atan2(Math.sin(roadAngle+Math.PI/2),Math.cos(roadAngle+Math.PI/2))/2;
  const hills=[
    ...dunes.map(({dx,dz,radius,height})=>Object.freeze({...land.at('ships-in-sand',dx,dz),kind:'dune',height,radius})),
    Object.freeze({...land.at('dead-mall',-719,-1358),kind:'breaks',height:58,radius:360}),
    Object.freeze({...land.at('dead-mall',-439,-1060),kind:'breaks',height:72,radius:360}),
    Object.freeze({...land.at('dead-mall',-880,-813),kind:'breaks',height:48,radius:360}),
    Object.freeze({...lookout,kind:'lookout',height:60,radius:320,topRadius:60,ramp:300,rampAngle}),
    Object.freeze({...land.at('ridge'),kind:'ridge-top',height:45,radius:850,topRadius:160}),
    Object.freeze({...land.at('ridge',-750,-550),kind:'foothill',height:22,radius:300}),
    Object.freeze({...land.at('ridge',550,-600),kind:'foothill',height:26,radius:320}),
    Object.freeze({...land.between('yard','tin-town',.4,-600,350),kind:'mesa',height:35,radius:200,face:30,ramp:220,rampAngle:Math.PI}),
    Object.freeze({...land.between('yard','tin-town',.7,400,1100),kind:'mesa',height:32,radius:200,face:30,ramp:220,rampAngle:0}),
    // A mesa between the furnace and the plates' way gives the shortcut cover.
    Object.freeze({...land.between('yard','tin-town',.7,-1650,125),kind:'mesa',height:35,radius:120,face:30,ramp:220,rampAngle:Math.PI}),
  ];
  // Select the additional plates from the fixed land, then express their
  // centres through the same named-place pair as the original eastern mesa.
  const mesaRng=makeRng(seed ^ 0x4d455341);
  const plates=GROUND_AREAS.polygons.find(area=>area.id==='scab-plates');
  const mesaBase=LAND.between('yard','tin-town',.7);
  const platesWay=[LAND.yard,LAND.at('the-steps'),LAND.at('tin-town')];
  // Keep the long Survey Flags leg open as well as the marked roads. Its
  // endpoints use the same named places as the job's third and fourth flags.
  const surveyLeg=[LAND.between('dead-mall','everburn',.413,-264.94,-117.98),
    LAND.between('ships-in-sand','ridge',.723,-26.43,88.94)];
  const soupReturn=[LAND.at('safe-road'),LAND.at('everburn')];
  const furnaceReturn=[LAND.at('safe-road'),LAND.between('yard','dead-mall',.535),
    LAND.between('dead-mall','everburn',.485,5.62,-18.9),LAND.at('everburn',12,3.5)];
  const boneyardGas=[LAND.at('everburn',12,3.5),LAND.between('dead-mall','everburn',.485,5.62,-18.9),
    LAND.at('dead-mall',0,-60),LAND.between('dead-mall','boneyard',.551,16.19,54.48),LAND.at('boneyard',23,4)];
  // Keep the furnace's descent from the Ridge to the Boneyard open.
  const furnaceDescent=[LAND.at('ridge',-74,104),LAND.between('ridge','boneyard',.599,-74,0)];
  // The chasing car cuts across the plates toward the descending furnace.
  const furnaceApproach=[LAND.at('ridge',-1350,726),furnaceDescent[1]];
  const tunnel=westScarpTrial(()=>0).segment;
  const referenceHills=hills.map((hill,index)=>{
    const anchor=hill.kind==='dune'?'ships-in-sand':hill.kind==='breaks'?'dead-mall':'ridge';
    const share=index===hills.length-3 ? .4 : .7;
    const moved=hill.kind==='mesa'?land.between('yard','tin-town',share):land.at(anchor);
    const fixed=hill.kind==='mesa'?LAND.between('yard','tin-town',share):LAND.at(anchor);
    // Keep the seeded choices stable when the northern mesa moves off the
    // furnace road. The new position is checked against the resulting land.
    const movedMesa=hill.kind==='mesa' && index===hills.length-2;
    return {x:hill.x-(movedMesa?300:0)-moved.x+fixed.x,z:hill.z-(movedMesa?300:0)-moved.z+fixed.z,radius:hill.radius,ramp:hill.ramp??0};
  });
  for(let attempt=0;attempt<120000 && hills.filter(hill=>hill.kind==='mesa').length<6;attempt++){
    const dx=mesaRng.range(-3300,1300),dz=mesaRng.range(-1200,1400);
    const x=mesaBase.x+dx,z=mesaBase.z+dz;
    const radius=mesaRng.range(120,180),requestedHeight=mesaRng.range(30,36),ramp=220,reach=radius+ramp;
    const base=oldTerrainHeightAt(x,z),height=(base+requestedHeight)-base;
    if(polygonMargin(plates.points,x,z)<=reach) continue;
    if(distanceToRoad(x,z,platesWay)<radius+200) continue;
    if(distanceToRoad(x,z,surveyLeg)<reach+60) continue;
    if(distanceToRoad(x,z,soupReturn)<reach+60) continue;
    if(distanceToRoad(x,z,furnaceDescent)<reach+60) continue;
    if(distanceToRoad(x,z,furnaceApproach)<radius+110) continue;
    if([tunnel.start,tunnel.end].some(mouth=>Math.hypot(x-mouth.x,z-mouth.z)<reach+30)) continue;
    if(ROAD_NET.roads.some(road=>distanceToRoad(x,z,road.points)<reach+road.halfWidth+200)) continue;
    if(distanceToRoad(x,z,RIVER_LAND.line.points)<reach+RIVER.lipHalfWidth+150) continue;
    if(LAND.table.some(place=>Math.hypot(x-place.x,z-place.z)<reach+place.flatRadius+200)) continue;
    if(referenceHills.some(hill=>Math.hypot(x-hill.x,z-hill.z)<reach+hill.radius+hill.ramp+30)) continue;
    const rampAngle=mesaRng.range(0,Math.PI*2), top=oldTerrainHeightAt(x,z)+height;
    const rampHeight=d=>{
      const ground=oldTerrainHeightAt(x+Math.cos(rampAngle)*d,z+Math.sin(rampAngle)*d);
      return ground+(top-ground)*(1-smooth((d-radius)/ramp));
    };
    let driveable=true;
    for(let d=radius;d<reach;d+=2){
      if(Math.abs(rampHeight(d+2)-rampHeight(d))/2>.3){driveable=false;break;}
    }
    if(!driveable) continue;
    referenceHills.push({x,z,radius,ramp});
    hills.push(Object.freeze({...land.between('yard','tin-town',.7,dx,dz),kind:'mesa',height,radius,face:30,ramp,rampAngle}));
  }
  // Grow the Breaks from the existing hills, using offsets from the Mall so
  // that the whole group follows that named place when the land is moved.
  const breaksRng=makeRng(seed ^ 0x42524541), mall=LAND.place('dead-mall');
  const breaks=hills.filter(hill=>hill.kind==='breaks').map(hill=>({x:hill.x,z:hill.z,radius:hill.radius}));
  const yard=LAND.yard, burn=LAND.place('everburn');
  const side=(a,b,p)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
  const triangle=[yard,burn,mall];
  const passSites=[];
  for(const [id,share] of [['burn-road',.3],['mall-road',.855],['mall-burn-road',.655]]){
    const road=ROAD_NET.road(id),start=road.points[0];
    const centre=roadPointFrom(road,start.x,start.z,road.length*share);
    const before=roadPointFrom(road,centre.x,centre.z,-5),after=roadPointFrom(road,centre.x,centre.z,5);
    const dx=after.x-before.x,dz=after.z-before.z,length=Math.hypot(dx,dz);
    const offset=id==='mall-burn-road'?300:280;
    for(const side of [-1,1]) passSites.push({x:centre.x-side*offset*dz/length,z:centre.z+side*offset*dx/length});
  }
  const withinCountry=(x,z)=>{
    const point={x,z}, signs=triangle.map((a,i)=>side(a,triangle[(i+1)%3],point));
    if(signs.every(value=>value>=0)||signs.every(value=>value<=0)) return true;
    return triangle.some((a,i)=>distanceToRoad(x,z,[a,triangle[(i+1)%3]])<=600);
  };
  for(let attempt=0;attempt<120000 && breaks.length<16;attempt++){
    const anchor=breaks[breaksRng.int(0,breaks.length-1)];
    const angle=breaksRng.range(0,Math.PI*2), distance=breaksRng.range(500,850);
    const x=anchor.x+Math.cos(angle)*distance, z=anchor.z+Math.sin(angle)*distance;
    const radius=breaksRng.range(260,320), height=breaksRng.range(40,Math.min(70,radius*.17));
    if(z<=0||z>=mall.z||!withinCountry(x,z)||Math.hypot(x-yard.x,z-yard.z)<radius+500) continue;
    if([burn,mall].some(place=>Math.hypot(x-place.x,z-place.z)<radius+place.flatRadius+350)) continue;
    if([surveyLeg,soupReturn,boneyardGas,furnaceReturn].some(leg=>distanceToRoad(x,z,leg)<radius+60)) continue;
    if(passSites.some(site=>Math.hypot(x-site.x,z-site.z)<400)) continue;
    if(ROAD_NET.roads.some(road=>distanceToRoad(x,z,road.points)<radius+road.halfWidth+10)) continue;
    if(LAND.table.some(place=>Math.hypot(x-place.x,z-place.z)<radius+place.flatRadius+30)) continue;
    if(breaks.some(hill=>Math.hypot(x-hill.x,z-hill.z)<400)) continue;
    breaks.push({x,z,radius});
    hills.push(Object.freeze({...land.at('dead-mall',x-mall.x,z-mall.z),kind:'breaks',height,radius}));
  }
  // A pair of shoulders makes a pass on each road, while leaving its centre
  // outside both hill footprints. Derive the positions from the road itself.
  const roads=land===LAND?ROAD_NET:roadNet(land);
  for(const [id,share] of [['burn-road',.3],['mall-road',.855],['mall-burn-road',.655]]){
    const road=roads.road(id), start=road.points[0];
    const centre=roadPointFrom(road,start.x,start.z,road.length*share);
    const before=roadPointFrom(road,centre.x,centre.z,-5), after=roadPointFrom(road,centre.x,centre.z,5);
    const dx=after.x-before.x,dz=after.z-before.z,length=Math.hypot(dx,dz);
    // The Mall-to-Everburn pass also borders the Boneyard gas-run route.
    const offset=id==='mall-burn-road'?300:280;
    for(const side of [-1,1]) hills.push(Object.freeze({
      x:centre.x-side*offset*dz/length,z:centre.z+side*offset*dx/length,
      kind:'breaks',height:40,radius:260,passRoad:id,
    }));
  }
  // The outer foothills are lower than the two near the Ridge. Select their
  // offsets against the fixed land so they follow the Ridge when it moves.
  const foothillRng=makeRng(seed ^ 0x52494447), outer=[];
  const ridge=LAND.place('ridge');
  for(let attempt=0;attempt<1000 && outer.length<4;attempt++){
    const angle=foothillRng.range(Math.PI,2*Math.PI), distance=foothillRng.range(1050,2000);
    const radius=foothillRng.range(230,280), dx=Math.cos(angle)*distance, dz=Math.sin(angle)*distance;
    const x=ridge.x+dx, z=ridge.z+dz;
    if(ROAD_NET.roads.some(road=>distanceToRoad(x,z,road.points)<radius+road.halfWidth+30)) continue;
    if(LAND.table.some(place=>Math.hypot(x-place.x,z-place.z)<radius+place.flatRadius+30)) continue;
    if(hills.some(hill=>Math.hypot(x-hill.x,z-hill.z)<radius+hill.radius+30)) continue;
    if(outer.some(hill=>Math.hypot(dx-hill.dx,dz-hill.dz)<radius+hill.radius+30)) continue;
    outer.push({dx,dz,radius,distance});
  }
  for(const {dx,dz,radius,distance} of outer){
    const height=18+4*(2000-distance)/950;
    hills.push(Object.freeze({...land.at('ridge',dx,dz),kind:'foothill',height,radius}));
  }
  // A small flat-topped butte stands between the furnace and the plates way.
  hills.push(Object.freeze({...land.between('yard','the-steps',.411,10,-120),kind:'butte',height:22,radius:60,face:20,ramp:0,rampAngle:0}));
  hills.push(Object.freeze({...land.between('the-steps','tin-town',.025,9,-120),kind:'butte',height:22,radius:65,face:20,ramp:0,rampAngle:0}));
  return Object.freeze(hills.map(hill=>{
    if(hill.kind==='lookout'||hill.kind==='ridge-top'||hill.kind==='mesa'||hill.kind==='butte') return hill;
    return Object.freeze({...hill,spurs:rng.int(3,5),spurAngle:rng.range(0,Math.PI*2)});
  }));
}
export const HILLS=hillsFor();
// Build once. Keep table order inside each cell because mesas and flat tops blend in order.
const HILL_CELL_SIZE=500;
function indexHills(hills){
  const columns=new Map();
  for(const hill of hills){
    const reach=hill.radius+(hill.kind==='butte'?hill.face:(hill.kind==='mesa'||hill.kind==='lookout')?hill.ramp:0);
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
    if(hill.kind==='lookout'||hill.kind==='mesa'||hill.kind==='butte'||hill.kind==='ridge-top') continue;
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
    if(hill.kind==='mesa'||hill.kind==='butte'){
      const dx=x-hill.x,dz=z-hill.z,distance=Math.hypot(dx,dz);
      if(distance>=hill.radius+(hill.kind==='butte' ? hill.face : hill.ramp)) continue;
      // A broad ramp on one side joins a broken, steep rim around the flat top.
      const angle=Math.atan2(dz,dx), difference=Math.atan2(Math.sin(angle-hill.rampAngle),Math.cos(angle-hill.rampAngle));
      const rampWeight=hill.kind==='butte' ? 0 : 1-smooth((Math.abs(difference)-.18)/.35);
      const rim=hill.kind==='butte' ? hill.radius : hill.radius+8*Math.sin(angle*5)*smooth(Math.abs(difference)/.5);
      const width=hill.face+(hill.ramp-hill.face)*rampWeight;
      const weight=1-smooth((distance-rim)/width);
      const top=oldTerrainHeightAt(hill.x,hill.z)+hill.height;
      height+=(top-height)*weight;
      continue;
    }
    if(hill.kind!=='lookout'&&hill.kind!=='ridge-top') continue;
    const distance=Math.hypot(x-hill.x,z-hill.z);
    if(distance>=hill.radius+(hill.ramp??0)) continue;
    const weight=1-smooth((distance-hill.topRadius)/(hill.radius-hill.topRadius));
    const top=hill.kind==='ridge-top'?hill.height:oldTerrainHeightAt(hill.x,hill.z)+hill.height;
    const natural=height+(top-height)*weight;
    if(hill.kind==='lookout'){
      const angle=Math.atan2(z-hill.z,x-hill.x);
      const difference=Math.atan2(Math.sin(angle-hill.rampAngle),Math.cos(angle-hill.rampAngle));
      const rampWeight=1-smooth((Math.abs(difference)-.7)/.35);
      const rampHeight=Math.max(height,top-Math.max(0,distance-hill.topRadius)*.16);
      height=natural+(rampHeight-natural)*rampWeight;
    } else height=natural;
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
