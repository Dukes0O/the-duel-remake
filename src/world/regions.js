import {scablandsHeightAt} from './scablands-height.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};
const WHITES_ORIGIN=Object.freeze({x:1500,z:0});
const WHITES_BOUNDS=Object.freeze({minX:-500,maxX:500,minZ:-500,maxZ:500});
export const WHITES_BASE=scablandsHeightAt(560,-120);
const WHITES_FOOT_X=-480;
const WHITES_TOP_X=20;
const WHITES_HEIGHT=17;

function isOpen(openMarks,mark){
  if(openMarks instanceof Set)return openMarks.has(mark);
  if(Array.isArray(openMarks))return openMarks.includes(mark);
  return openMarks?.[mark]===true;
}

function withinBounds(x,z,bounds){
  return x>=bounds.minX&&x<=bounds.maxX&&z>=bounds.minZ&&z<=bounds.maxZ;
}

function distanceToSegment(x,z,a,b){
  const dx=b.x-a.x,dz=b.z-a.z,lengthSquared=dx*dx+dz*dz;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(lengthSquared||1));
  return {distance:Math.hypot(x-a.x-dx*t,z-a.z-dz*t),t};
}

function distanceAlongPolyline(point,points){
  let best={distance:Infinity,along:0};
  let travelled=0;
  for(let index=1;index<points.length;index++){
    const a=points[index-1],b=points[index],length=Math.hypot(b.x-a.x,b.z-a.z);
    const nearest=distanceToSegment(point.x,point.z,a,b);
    if(nearest.distance<best.distance)best={distance:nearest.distance,along:travelled+length*nearest.t};
    travelled+=length;
  }
  return {...best,total:travelled};
}

const branchPoints=Object.freeze([
  Object.freeze({x:560,z:-120}),Object.freeze({x:610,z:-190}),
  Object.freeze({x:650,z:-225}),Object.freeze({x:690,z:-250}),
]);
const whitesPoints=Object.freeze([branchPoints.at(-1),Object.freeze({x:1020,z:0})]);

export const CUTS=Object.freeze([
  Object.freeze({id:'branch-cut',points:branchPoints,floorAtStart:scablandsHeightAt(560,-120),
    floorHeight:WHITES_BASE,floorHalfWidth:12,shoulder:45,opensWith:'branch-points',grade:true}),
  Object.freeze({id:'whites-cut',points:whitesPoints,floorHeight:WHITES_BASE,
    floorHalfWidth:12,shoulder:45,opensWith:'branch-open'}),
]);

function cutHeight(height,x,z,openMarks){
  for(const cut of CUTS){
    if(!isOpen(openMarks,cut.opensWith))continue;
    const nearest=distanceAlongPolyline({x,z},cut.points);
    const weight=1-smooth((nearest.distance-cut.floorHalfWidth)/cut.shoulder);
    if(weight<=0)continue;
    const floor=cut.grade?cut.floorAtStart+(cut.floorHeight-cut.floorAtStart)*nearest.along/nearest.total:cut.floorHeight;
    height+=(floor-height)*weight;
  }
  return height;
}

export function cutAt(worldX,worldZ,openMarks=[]){
  for(const cut of CUTS){
    if(!isOpen(openMarks,cut.opensWith))continue;
    if(distanceAlongPolyline({x:worldX,z:worldZ},cut.points).distance<=cut.floorHalfWidth+cut.shoulder)
      return cut;
  }
  return null;
}

function whitesHeightAt(x,z){
  const bankDistance=clamp((x-WHITES_FOOT_X)/(WHITES_TOP_X-WHITES_FOOT_X))*500;
  const bank=bankDistance<=65?0:(bankDistance-65)*WHITES_HEIGHT/(500-65);
  const ripple=x>WHITES_TOP_X?0.035*Math.sin(x*.031+z*.017)*Math.cos(z*.027):0;
  const edgeDistance=Math.min(z-WHITES_BOUNDS.minZ,WHITES_BOUNDS.maxZ-z);
  const edgeBlend=Math.min(smooth(edgeDistance/55),smooth((x-WHITES_BOUNDS.minX)/20),
    smooth((WHITES_BOUNDS.maxX-x)/80));
  const natural=scablandsHeightAt(WHITES_ORIGIN.x+x,WHITES_ORIGIN.z+z);
  const profile=WHITES_BASE+bank+ripple;
  return profile+(natural-profile)*(1-edgeBlend);
}

export const REGIONS=Object.freeze([
  Object.freeze({id:'the-whites',origin:WHITES_ORIGIN,bounds:WHITES_BOUNDS,
    opensWith:'branch-open',heightAt:whitesHeightAt,
    join:Object.freeze({id:'whites-west-mesa-join',kind:'road-and-rail',from:'scablands-east-mesa',
      to:'the-whites-bank-foot',opensWith:'branch-open',roadStatus:'open through the whites-cut alongside the rail'})}),
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
  const height=region?region.heightAt(worldX-region.origin.x,worldZ-region.origin.z):scablandsHeightAt(worldX,worldZ);
  return cutHeight(height,worldX,worldZ,openMarks);
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
