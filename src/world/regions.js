import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};

function scablandsHeightAt(x,z){
  const nx=x/SCABLANDS_LAYOUT.halfWidth,nz=z/SCABLANDS_LAYOUT.halfDepth,edge=Math.hypot(nx,nz);
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  let height=rolling+ridge+wall;
  for(const place of SCABLANDS_PLACES){
    const distance=Math.hypot(x-place.x,z-place.z),weight=1-smooth((distance-place.flatRadius)/18);
    height+=(place.height-height)*weight;
  }
  return height;
}

const WHITES_ORIGIN=Object.freeze({x:1500,z:0});
const WHITES_BOUNDS=Object.freeze({minX:-500,maxX:500,minZ:-500,maxZ:500});
const WHITES_FOOT_X=-480;
const WHITES_TOP_X=20;
const WHITES_HEIGHT=17;
const WHITES_BASE=scablandsHeightAt(WHITES_ORIGIN.x+WHITES_FOOT_X,WHITES_ORIGIN.z);

function isOpen(openMarks,mark){
  if(openMarks instanceof Set)return openMarks.has(mark);
  if(Array.isArray(openMarks))return openMarks.includes(mark);
  return openMarks?.[mark]===true;
}

function withinBounds(x,z,bounds){
  return x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ;
}

function whitesHeightAt(x,z){
  const bank=clamp((x-WHITES_FOOT_X)/(WHITES_TOP_X-WHITES_FOOT_X))*WHITES_HEIGHT;
  const ripple=x>WHITES_TOP_X?0.035*Math.sin(x*.031+z*.017)*Math.cos(z*.027):0;
  const edgeDistance=Math.min(z-WHITES_BOUNDS.minZ,WHITES_BOUNDS.maxZ-z);
  const edgeBlend=Math.min(smooth(edgeDistance/55),smooth((x-WHITES_BOUNDS.minX)/20),
    smooth((WHITES_BOUNDS.maxX-x)/80));
  const natural=scablandsHeightAt(WHITES_ORIGIN.x+x,WHITES_ORIGIN.z+z);
  const profile=WHITES_BASE+bank+ripple;
  return profile+(natural-profile)*(1-edgeBlend);
}

export const REGIONS=Object.freeze([
  Object.freeze({
    id:'the-whites',
    origin:WHITES_ORIGIN,
    bounds:WHITES_BOUNDS,
    opensWith:'branch-open',
    heightAt:whitesHeightAt,
    join:Object.freeze({
      id:'whites-west-mesa-join',
      kind:'road-and-rail',
      from:'scablands-east-mesa',
      to:'the-whites-bank-foot',
      opensWith:'branch-open',
      roadStatus:'named-join-only; ring-road integration belongs to RAIL-JOBS-2',
    }),
  }),
]);

export function regionAt(worldX,worldZ,openMarks=[]){
  for(const region of REGIONS){
    if(!isOpen(openMarks,region.opensWith))continue;
    const x=worldX-region.origin.x,z=worldZ-region.origin.z;
    if(withinBounds(x,z,region.bounds))return region;
  }
  return null;
}

export function regionNaturalHeightAt(worldX,worldZ,openMarks=[]){
  const region=regionAt(worldX,worldZ,openMarks);
  if(!region)return scablandsHeightAt(worldX,worldZ);
  return region.heightAt(worldX-region.origin.x,worldZ-region.origin.z);
}

export function placeToWorld(place){
  if(place?.region!=='the-whites')return place;
  const region=REGIONS.find(item=>item.id===place.region);
  const local=place.position;
  const x=local.x+region.origin.x,z=local.z+region.origin.z;
  return {...place,position:{...local,x,y:region.heightAt(local.x,local.z),z}};
}

export function openMarkSet(...marks){
  return new Set(marks.flat().filter(mark=>typeof mark==='string'));
}
