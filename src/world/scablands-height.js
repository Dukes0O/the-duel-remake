import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {riseHeightAt,riverDepthAt} from './scablands-regions.js';
import {scarpHeightAt} from './scablands-scarps.js';
import {LAND} from './scablands-names.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};

// Hill centres follow named places. Their shoulders stand clear of the existing roads.
export function hillsFor(land=LAND){
  return Object.freeze([
    Object.freeze({...land.at('ships-in-sand',-600,-600),kind:'dune',height:12,radius:220}),
    Object.freeze({...land.at('ships-in-sand',600,-600),kind:'dune',height:14,radius:220}),
    Object.freeze({...land.at('ships-in-sand',-600,600),kind:'dune',height:10,radius:220}),
    Object.freeze({...land.at('ships-in-sand',0,900),kind:'dune',height:13,radius:220}),
    Object.freeze({...land.at('dead-mall',-1500,-2300),kind:'breaks',height:58,radius:360}),
    Object.freeze({...land.at('dead-mall',-2000,-1800),kind:'breaks',height:72,radius:360}),
    Object.freeze({...land.at('dead-mall',-1500,-1300),kind:'breaks',height:48,radius:360}),
    Object.freeze({...land.at('ridge',-1200,900),kind:'lookout',height:45,radius:320,topRadius:60}),
    Object.freeze({...land.at('ridge'),kind:'ridge-top',height:45,radius:850,topRadius:160}),
    Object.freeze({...land.at('ridge',-750,-550),kind:'foothill',height:22,radius:300}),
    Object.freeze({...land.at('ridge',550,-600),kind:'foothill',height:26,radius:320}),
    Object.freeze({...land.between('yard','tin-town',.4,0,-800),kind:'mesa',height:20,radius:200,face:40,ramp:150,rampAngle:Math.PI}),
    Object.freeze({...land.between('yard','tin-town',.7,500,800),kind:'mesa',height:18,radius:200,face:40,ramp:150,rampAngle:0}),
  ]);
}
export const HILLS=hillsFor();
export function hillHeightAt(x,z,hills=HILLS){
  let height=0;
  for(const hill of hills){
    if(hill.kind==='lookout'||hill.kind==='mesa'||hill.kind==='ridge-top') continue;
    const distance=Math.hypot(x-hill.x,z-hill.z);
    if(distance<hill.radius) height=Math.max(height,hill.height*(1-smooth(distance/hill.radius)));
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
  for(const hill of hills){
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
