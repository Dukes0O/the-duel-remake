import {makeRng} from './rng.js';
import {CARS} from './config.js';
import {sweepObstacle} from './collision.js';
import {bodyHeading} from './vehicle-knock.js';

export const validYetiSeed=seed=>Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff;
export const isYetiGrandPrixInput=record=>record?.mode==='grandprix'&&record.stageId==='summit-run'&&validYetiSeed(record.yetiSeed);
export function hash32(baseSeed,runId){
  let hash=(2166136261^(baseSeed>>>0))>>>0;
  for(let index=0;index<runId.length;index++)hash=Math.imul(hash^runId.charCodeAt(index),16777619);
  return hash>>>0;
}
export const YETI=Object.freeze({eye:1.2,chest:1.8,distance:60,angle:75*Math.PI/180,rayStep:2});
export const yetiEnabled=duel=>duel.course?.def.id==='summit-run' &&
  duel.featureFlags?.enabled('summit-run')===true && duel.featureFlags?.enabled('yeti')===true;
const ownsCar=(profile,car)=>Object.hasOwn(CARS,car) &&
  (!CARS[car].price&&!CARS[car].unlockRequirement || profile?.unlockedCars?.includes(car));
export function normalizeYeti(value,profile) {
  if(!value || typeof value!=='object' || Array.isArray(value))return {};
  const result={};
  if(Object.hasOwn(value,'sightings'))result.sightings=Number.isSafeInteger(value.sightings)?Math.max(0,Math.min(1000000,value.sightings)):0;
  if(Object.hasOwn(value,'settled'))result.settled=[...new Set((Array.isArray(value.settled)?value.settled:[])
    .filter(key=>typeof key==='string' && key.length>0 && key.length<=180).reverse())].reverse().slice(-96);
  if(Object.hasOwn(value,'roof'))result.roof=Object.fromEntries(Object.entries(value.roof&&typeof value.roof==='object'?value.roof:{})
    .filter(([car,look])=>ownsCar(profile,car) && look==='yeti' && result.sightings>=3 && profile.wasteland?.kits?.[car]?.equipped!=='turret-look'));
  return result;
}
export const yetiRewards=profile=>({roof:Number.isSafeInteger(profile?.yeti?.sightings)&&profile.yeti.sightings>=3,
  frost:Number.isSafeInteger(profile?.yeti?.sightings)&&profile.yeti.sightings>=5});
// The caller supplies the existing actual-finish validator, never a new pay path.
export function countYetiFinish(profile,result,eligible) {
  const ignored={profile,counted:false};
  if(!eligible || result.yetiEnabled!==true || result.yetiSeen!==true ||
    typeof result.ownerPlayerId!=='string' || !result.ownerPlayerId || result.ownerPlayerId.length>128 || result.ownerPlayerId.trim()!==result.ownerPlayerId || /[\u0000-\u001f\u007f]/.test(result.ownerPlayerId) ||
    result.playerId!==result.ownerPlayerId || !['duel','timetrial','timeattack','grandprix'].includes(result.mode) ||
    result.qualifying===true || result.practice===true || result.abandoned===true || result.timeout===true || !ownsCar(profile,result.car))return ignored;
  const key=result.runId+':summit-run',old=normalizeYeti(profile.yeti,profile);
  if(old.sightings>=1000000 || old.settled?.includes(key))return ignored;
  return {profile:{...profile,yeti:{...old,sightings:Math.min(1000000,(old.sightings??0)+1),
    settled:[...(old.settled??[]),key].slice(-96)}},counted:true};
}
export function yetiSites(course){
  const staircase=course.script.pieces.find(piece=>piece.name==="Devil's Staircase"),summit=course.script.pieces.find(piece=>piece.name==='Summit Finish');
  return [{s:staircase.s0+170,lateral:30},{s:staircase.s0+300,lateral:-35},{s:summit.s0+190,lateral:28}];
}
export function initializeYeti(duel) {
  if(!yetiEnabled(duel))return;
  const rng=makeRng((validYetiSeed(duel.state.yetiSeed)?duel.state.yetiSeed:duel.seed)^0x59455449),appears=rng.chance(1/3);
  const sites=yetiSites(duel.course);
  const site=sites[rng.int(0,sites.length-1)];
  duel.state.yeti={appears,site:{...site},seen:false,seenAt:null};
}
export function yetiVisible(duel) {
  const s=duel.state,yeti=s.yeti;
  if(!yeti?.appears)return false;
  const eye=duel.course.groundAt(s.s,s.lateral),target=duel.course.groundAt(yeti.site.s,yeti.site.lateral);
  eye.y+=YETI.eye+(s.airHeight??0);target.y+=YETI.chest;
  const dx=target.x-eye.x,dz=target.z-eye.z,dy=target.y-eye.y,distance=Math.hypot(dx,dy,dz);
  if(distance>YETI.distance)return false;
  const heading=bodyHeading(duel,s);
  if(Math.abs(Math.atan2(Math.sin(Math.atan2(dx,dz)-heading),Math.cos(Math.atan2(dx,dz)-heading)))>YETI.angle)return false;
  for(let at=YETI.rayStep;at<distance;at+=YETI.rayStep){
    const share=at/distance,x=eye.x+dx*share,z=eye.z+dz*share;
    const near=duel.course.nearest(x,z,s.s+(yeti.site.s-s.s)*share);
    if(duel.course.groundAt(near.s,near.lateral).y>=eye.y+dy*share)return false;
  }
  return !duel.course.features.obstacles.some(obstacle=>
    !obstacle.soft && sweepObstacle(eye,target,obstacle,0,{halfWidth:0,halfLength:0,height:0,useModelBounds:false}));
}
export function stepYeti(duel) {
  if(!yetiEnabled(duel) || duel.state.status!=='racing' || duel.state.paused)return;
  const yeti=duel.state.yeti;
  if(!yeti || yeti.seen || !yetiVisible(duel))return;
  yeti.seen=true;yeti.seenAt=duel.state.stageTimeSec;
  duel._callout('YETI!',3);
  const point=duel.course.groundAt(yeti.site.s,yeti.site.lateral);
  duel.emit({yetiSighting:{id:'yeti-'+duel.seed,cue:'yeti.roar',point}});
}
export function yetiResult(duel) {
  return yetiEnabled(duel) && !duel.course.def.practice && !duel.state.qualifying
    ? {yetiEnabled:true,yetiSeen:duel.state.yeti?.seen===true,
      ...(validYetiSeed(duel.state.yetiSeed)?{yetiSeed:duel.state.yetiSeed}:{})} : {};
}
