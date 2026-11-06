import {SCABLANDS_LAYOUT,SCABLANDS_PLACES} from './scablands.js';
import {createGroundEdit} from './ground-edit.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=value=>{value=clamp(value);return value*value*(3-2*value);};
const {halfWidth,halfDepth,frameRadiusX:rx,frameRadiusZ:rz,roadHalfWidth}=SCABLANDS_LAYOUT;

function ellipseClosest(x,z){
  let angle=Math.atan2(z/rz,x/rx);
  for(let i=0;i<5;i++){
    const c=Math.cos(angle),s=Math.sin(angle),px=rx*c,pz=rz*s;
    const dx=-rx*s,dz=rz*c;
    const step=((x-px)*dx+(z-pz)*dz)/(dx*dx+dz*dz);
    angle+=clamp(step,-.22,.22);
  }
  const px=rx*Math.cos(angle),pz=rz*Math.sin(angle);
  return {distance:Math.hypot(x-px,z-pz),x:px,z:pz,angle};
}

function naturalHeight(x,z){
  const nx=x/halfWidth,nz=z/halfDepth,edge=Math.hypot(nx,nz);
  const rolling=2.1*Math.sin(x*.007+z*.002)*Math.cos(z*.009-x*.003);
  const ridge=smooth((edge-SCABLANDS_LAYOUT.ridgeStart)/.1)*
    (1-smooth((edge-SCABLANDS_LAYOUT.ridgeCrest)/.16))*108;
  const wall=smooth((edge-SCABLANDS_LAYOUT.wallStart)/.035)*175;
  return rolling+ridge+wall;
}

export function scablandsNaturalHeightAt(x,z){
  let height=naturalHeight(x,z);
  for(const place of SCABLANDS_PLACES){
    const distance=Math.hypot(x-place.x,z-place.z),weight=1-smooth((distance-place.flatRadius)/18);
    height+=(place.height-height)*weight;
  }
  return height;
}

// Physics and scenery share this sparse layer. It allocates nothing until a
// cut or fill touches a sample, so the untouched Scablands stays unchanged.
const createScablandsGroundEdit=()=>createGroundEdit({region:{id:'scablands',editable:true},
  naturalHeight:scablandsNaturalHeightAt});

export let scablandsGroundEdit=createScablandsGroundEdit();
let scablandsTownLayout=null;

export function setScablandsTownLayout(layout){
  if(!layout||!Array.isArray(layout.solids)||!Array.isArray(layout.roads)||!Array.isArray(layout.walkers))
    throw new TypeError('A Scablands town layout needs solids, roads and walkers.');
  scablandsTownLayout=layout;
  return scablandsTownLayout;
}

export function clearScablandsTownLayout(){scablandsTownLayout=null;return null;}
export function getScablandsTownLayout(){return scablandsTownLayout;}

export function setScablandsGroundEdit(groundEdit){
  if(!groundEdit||typeof groundEdit.heightAt!=='function')throw new TypeError('Scablands ground edits need a heightAt function.');
  scablandsGroundEdit=groundEdit;
  return scablandsGroundEdit;
}

export function resetScablandsGroundEdit(){
  return setScablandsGroundEdit(createScablandsGroundEdit());
}

export function scablandsSurfaceHeightAt(x,z,groundEdit=scablandsGroundEdit){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Scablands ground coordinates must be finite.');
  return groundEdit.heightAt(x,z);
}

export function scablandsSurfaceAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Scablands surface coordinates must be finite.');
  let townRoad=false;
  for(const segment of scablandsTownLayout?.roads??[]){
    const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z;
    const t=clamp(((x-segment.a.x)*dx+(z-segment.a.z)*dz)/(dx*dx+dz*dz||1));
    if(Math.hypot(x-segment.a.x-t*dx,z-segment.a.z-t*dz)<=segment.halfWidth){townRoad=true;break;}
  }
  const nearest=ellipseClosest(x,z),road=nearest.distance<=roadHalfWidth||townRoad;
  return {road,mainRoad:false,shortcutId:null,roadHalfWidth,
    preparedGravel:road,mud:0,waterDepth:0,gripKind:'gravel'};
}

export function scablandsRoadPoint(placeIndex){
  if(!Number.isInteger(placeIndex)||placeIndex<0||placeIndex>=SCABLANDS_PLACES.length)
    throw new RangeError('Scablands place index is out of range.');
  return SCABLANDS_PLACES[placeIndex];
}

export function scablandsRoadDistance(x,z){return ellipseClosest(x,z).distance;}
