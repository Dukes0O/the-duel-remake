import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {riseHeightAt,riverDepthAt} from './scablands-regions.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};

export function scablandsTerrainHeightAt(x,z){
  const nx=x/SCABLANDS_LAYOUT.halfWidth,nz=z/SCABLANDS_LAYOUT.halfDepth;
  // 1 is the edge of the land. The ridge and the wall are the same size in metres as on the old, small land (see SCABLANDS_LAYOUT).
  const edge=1+(Math.hypot(nx,nz)-1)*SCABLANDS_LAYOUT.edgeScale;
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  // The rises that hide each place from the last (src/world/scablands-regions.js): height only, gentle enough to drive over.
  return rolling+ridge+wall+riseHeightAt(x,z);
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
