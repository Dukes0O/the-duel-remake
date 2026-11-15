import {SCABLANDS_PLACES} from './scablands.js';
import {ROAD_HALF_WIDTH,ROAD_NET,distanceToNet} from './scablands-road.js';
import {createGroundEdit} from './ground-edit.js';
import {cutAt,regionAt,regionNaturalHeightAt} from './regions.js';
import {riverDepthAt,riverGorgeDepthAt} from './scablands-regions.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
let scablandsOpenMarks=new Set();
const openMarkListeners=new Set();

export function scablandsNaturalHeightAt(x,z,openMarks=scablandsOpenMarks){
  return regionNaturalHeightAt(x,z,openMarks);
}

// Physics and scenery share this sparse layer. It allocates nothing until a
// cut or fill touches a sample, so the untouched Scablands stays unchanged.
const createScablandsGroundEdit=()=>createGroundEdit({region:{id:'scablands',editable:true},
  naturalHeight:(x,z)=>scablandsNaturalHeightAt(x,z)});

export let scablandsGroundEdit=createScablandsGroundEdit();
let scablandsTownLayout=null;

export function setScablandsOpenMarks(marks){
  const next=marks instanceof Set?new Set(marks):Array.isArray(marks)?new Set(marks):
    marks&&typeof marks==='object'?new Set(Object.keys(marks).filter(mark=>marks[mark]===true)):new Set();
  const changed=next.size!==scablandsOpenMarks.size||[...next].some(mark=>!scablandsOpenMarks.has(mark));
  const saved=scablandsGroundEdit.toSave();
  scablandsOpenMarks=next;
  const edit=createScablandsGroundEdit();
  edit.loadSave(saved);
  scablandsGroundEdit=edit;
  if(changed)for(const listener of openMarkListeners)listener(getScablandsOpenMarks());
  return getScablandsOpenMarks();
}

export function getScablandsOpenMarks(){return new Set(scablandsOpenMarks);}
export function onScablandsOpenMarksChanged(listener){
  if(typeof listener!=='function')throw new TypeError('Open mark listeners must be functions.');
  openMarkListeners.add(listener);
  return ()=>openMarkListeners.delete(listener);
}

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
  setScablandsOpenMarks([]);
  const groundEdit=setScablandsGroundEdit(createScablandsGroundEdit());
  for(const listener of openMarkListeners)listener(getScablandsOpenMarks());
  return groundEdit;
}

export function scablandsSurfaceHeightAt(x,z,groundEdit=scablandsGroundEdit,openMarks=scablandsOpenMarks){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Scablands ground coordinates must be finite.');
  const edited=groundEdit.heightAt(x,z);
  const previousNatural=scablandsNaturalHeightAt(x,z,scablandsOpenMarks);
  const requestedNatural=scablandsNaturalHeightAt(x,z,openMarks);
  return edited-previousNatural+requestedNatural;
}

// Fill caller-owned storage in descending order, without making a list per step.
// The bed is a second floor only where the terrain has been lifted for a deck.
export function scablandsFloorsAt(x,z,floors){
  const surface=scablandsSurfaceHeightAt(x,z);
  const depth=riverDepthAt(x,z), deckLift=riverGorgeDepthAt(x,z)-depth;
  floors[0]=surface;
  if(deckLift>0){
    // The old terrain blends the deck edge down into the bed. The actual
    // deck stays level: do not mistake that blend for a third ramp floor.
    floors[0]=surface+depth;
    floors[1]=surface-deckLift;
    return 2;
  }
  return 1;
}

// An actor without a stored height starts on the top floor. If its feet are
// below all floors, the lowest floor is its support rather than the deck.
export function selectScablandsFloor(floors,count,feet){
  if(!Number.isFinite(feet))return floors[0];
  for(let i=0;i<count;i++)if(floors[i]<=feet+.6)return floors[i];
  return floors[count-1];
}

// Reuse storage for the common height query; no list is allocated per step.
const floorScratch=[];
export function scablandsActorHeightAt(x,z,actorHeight){
  const count=scablandsFloorsAt(x,z,floorScratch);
  return selectScablandsFloor(floorScratch,count,actorHeight);
}

// Only an actor already below the underside meets it from below. An actor
// falling onto the deck must remain free to land on its upper surface.
export function scablandsDeckRoofAt(x,z,feet){
  const count=scablandsFloorsAt(x,z,floorScratch);
  if(count<2||!Number.isFinite(feet))return Infinity;
  const underside=floorScratch[0]-1.2;
  return feet<=underside?underside:Infinity;
}

export function scablandsSurfaceAt(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('Scablands surface coordinates must be finite.');
  let townRoad=false;
  for(const segment of scablandsTownLayout?.roads??[]){
    const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z;
    const t=clamp(((x-segment.a.x)*dx+(z-segment.a.z)*dz)/(dx*dx+dz*dz||1));
    if(Math.hypot(x-segment.a.x-t*dx,z-segment.a.z-t*dz)<=segment.halfWidth){townRoad=true;break;}
  }
  const roadCut=cutAt(x,z,scablandsOpenMarks);
  const whites=regionAt(x,z,scablandsOpenMarks)?.id==='the-whites';
  const saltCut=roadCut?.id==='whites-cut';
  // A road of the net (src/world/scablands-road.js), a town road or the Whites' cut.
  const road=ROAD_NET.nearest(x,z)!==null||townRoad||roadCut!==null;
  return {road,mainRoad:false,shortcutId:null,roadHalfWidth:ROAD_HALF_WIDTH,
    preparedGravel:road&&!whites&&!saltCut,mud:0,waterDepth:0,gripKind:whites||saltCut?'salt':'gravel'};
}

export function scablandsRoadPoint(placeIndex){
  if(!Number.isInteger(placeIndex)||placeIndex<0||placeIndex>=SCABLANDS_PLACES.length)
    throw new RangeError('Scablands place index is out of range.');
  return SCABLANDS_PLACES[placeIndex];
}

// Distance in metres to the nearest road of the net, searched everywhere (for a check, not for a frame).
export function scablandsRoadDistance(x,z){return distanceToNet(x,z);}
