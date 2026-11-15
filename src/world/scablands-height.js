import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {riseHeightAt,riverDepthAt} from './scablands-regions.js';
import {scarpHeightAt} from './scablands-scarps.js';
import {LAND} from './scablands-names.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};

// The first hills in the hill-country table are dunes around the Ships. Each centre follows the named place.
// Their 220 m shoulders keep the climb gentle, and stand clear of the nearby road.
export function hillsFor(land=LAND){
  return Object.freeze([
    Object.freeze({...land.at('ships-in-sand',-600,-600),height:12,radius:220}),
    Object.freeze({...land.at('ships-in-sand',600,-600),height:14,radius:220}),
    Object.freeze({...land.at('ships-in-sand',-600,600),height:10,radius:220}),
    Object.freeze({...land.at('ships-in-sand',0,900),height:13,radius:220}),
  ]);
}
export const HILLS=hillsFor();
export function hillHeightAt(x,z,hills=HILLS){
  let height=0;
  for(const hill of hills){
    const distance=Math.hypot(x-hill.x,z-hill.z);
    if(distance<hill.radius) height=Math.max(height,hill.height*(1-smooth(distance/hill.radius)));
  }
  return height;
}

export function scablandsTerrainHeightAt(x,z,hills=HILLS){
  const nx=x/SCABLANDS_LAYOUT.halfWidth,nz=z/SCABLANDS_LAYOUT.halfDepth;
  // 1 is the edge of the land. The ridge and the wall are the same size in metres as on the old, small land (see SCABLANDS_LAYOUT).
  const edge=1+(Math.hypot(nx,nz)-1)*SCABLANDS_LAYOUT.edgeScale;
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  // The rises that hide each place from the last (src/world/scablands-regions.js): height only, gentle enough to drive over.
  // The four scarps (src/world/scablands-scarps.js): steep faces of broken rock on the scab plates, near the camp and by the Ridge.
  return rolling+ridge+wall+riseHeightAt(x,z)+scarpHeightAt(x,z)+hillHeightAt(x,z,hills);
}

// The land with its rises and with every place's own flat ground, before the dry river is cut: the plain.
export function scablandsPlainHeightAt(x,z){
  let height=scablandsTerrainHeightAt(x,z);
  for(const place of SCABLANDS_PLACES){
    const distance=Math.hypot(x-place.x,z-place.z),weight=1-smooth((distance-place.flatRadius)/18);
    height+=(place.height-height)*weight;
  }
  return height;
}

// The land as a car drives on it: the plain with the dry river sunk into it (8 m, with banks), and a deck level with the plain over
// the Girder Bridge and the Pipe.
export function scablandsHeightAt(x,z){
  return scablandsPlainHeightAt(x,z)-riverDepthAt(x,z);
}
