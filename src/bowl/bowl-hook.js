// Fixed-step geometry shared by the tow fight, the wall pass and the read-only view.
import {BOOST} from '../config.js';

export const EYE_Z = Object.freeze([-2.90, -.22, 2.56]);
export const TOW_LENGTH = 15;
export const signedAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export const wrap = (value, length) => ((value % length) + length) % length;
export const along = (a, b, length) => wrap(a - b + length / 2, length) - length / 2;

export function rexAnchor(fight, course) {
  const at = course.groundAt(fight.s, fight.places.rail);
  return {...at, heading: at.heading + (fight.direction < 0 ? Math.PI : 0)};
}
export function modelPoint(frame, x, y, z) {
  const c = Math.cos(frame.heading), s = Math.sin(frame.heading);
  return {x: frame.x + c * x + s * z, y: frame.y + y, z: frame.z - s * x + c * z};
}
export function eyePoint(fight, course, index) {
  return modelPoint(rexAnchor(fight, course), 0, fight.low ? 6.52 : 10.52, EYE_Z[index]);
}

// The visible model has two separated feet, two haunches, a ribcage, a neck,
// a deep skull and a tapered tail. Heights are metres above its rail.
export function fallPose(fight){
  const roll=fight.phase==='fallen' ? -Math.min(1.42,fight.t*.95) : 0;
  return {roll,lift:-2.9*Math.sin(roll)};
}
export function rexSolids(fight, course) {
  const frame = rexAnchor(fight, course), low = fight.low;
  const parts = [];
  const {roll,lift}=fallPose(fight);
  function part(id, x, z, width, length, bottom, top) {
    if(roll){
      const c=Math.cos(roll),s=Math.sin(roll), cy=(bottom+top)/2, height=top-bottom;
      const cx=c*x-s*cy, y=s*x+c*cy+lift;
      const extent=(Math.abs(s)*width+c*height)/2;
      width=c*width+Math.abs(s)*height;x=cx;bottom=y-extent;top=y+extent;
    }
    const p = modelPoint(frame, x, 0, z);
    parts.push({...p, id: 'rex-' + id, heading: frame.heading, halfX: width / 2, halfZ: length / 2,
      minY: p.y + bottom, maxY: p.y + top, verticalClearance: true, arenaWall: true, rexPart: true});
  }
  for (const side of [-1, 1]) {
    part('shin'+side, side*1.94, -1.5+side*.65, 1.48, 3, 0, low ? 2.25 : 4.45);
    part('thigh'+side, side*1.85, -1.15+side*.25, 2.55, 3.55, low ? 1.7 : 3.7, low ? 4.3 : 8.6);
  }
  part('bogie',0,-1.4,3.9,4.2,0,.56);
  part('ribs',0,-.1,5.4,7.0,low ? .77 : 4.77,low ? 5.5 : 9.5);
  part('neck',0,low ? 4.4 : 3.7,2.8,3.0,low ? 2.3 : 6.4,low ? 5.4 : 10.3);
  part('skull',0,low ? 6.25 : 6.32,2.8,3.55,low ? 0 : 7.7,low ? 3.65 : 11.58);
  for (let i=0;i<5;i++) {
    const share=i/4;
    const dz=-.9-2.05*i, yaw=fight.tailYaw||0;
    part('tail'+i,Math.sin(yaw)*dz,-2.6+Math.cos(yaw)*dz,3.55-3.05*share,2.25,
      low ? Math.max(0,1.45-1.6*share) : 5.25-.26*share,
      low ? 4.47-4.0*share : 8.38-2.78*share);
  }
  for(let i=0;i<EYE_Z.length;i++) if (!fight.boxes[i]) {
    part('cell'+i,0,EYE_Z[i],1.68,1.18,low ? 5.3 : 9.3,low ? 6.86 : 10.86);
  }
  return parts;
}

export function truckPoint(course, truck) {
  const point = course.groundAt(truck.s, truck.lateral);
  return {...point,y:(truck.groundHeight ?? point.y)+(truck.airHeight || 0)+1.15,
    heading:point.heading+(truck.headingError || 0)};
}
export function hookMarker(fight, truck, course) {
  const box=fight.low && fight.phase!=='fallen' ? fight.boxes.indexOf(false) : -1;
  if(box<0)return null;
  const eye=eyePoint(fight,course,box), from=truckPoint(course,truck);
  const dx=eye.x-from.x, dz=eye.z-from.z;
  const distance=Math.hypot(dx,eye.y-from.y,dz);
  const angle=signedAngle(Math.atan2(dx,dz)-from.heading);
  return {...eye,box,distance,angle,canBite:distance<=25 && Math.abs(angle)<=Math.PI/3};
}

export function newHook() {
  return {phase:'idle', held:false, box:-1, time:0, tight:false, length:TOW_LENGTH, pulls:[0,0,0], drag:null};
}
export function releaseHook(hook, events) {
  if(hook.phase!=='idle')events.push({type:'letgo'});
  Object.assign(hook,{phase:'idle',box:-1,time:0,tight:false,pulling:false,arrivalSpeed:0,stalled:0,length:TOW_LENGTH,drag:null,tip:null});
}
function linePoint(a,b,t) {
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};
}
// Slab intersection of the flying hook with each oriented solid.
function hitsShell(a,b,shapes) {
  for(const o of shapes) {
    const c=Math.cos(o.heading), s=Math.sin(o.heading);
    const local=p=>[(p.x-o.x)*c-(p.z-o.z)*s,p.y,(p.x-o.x)*s+(p.z-o.z)*c];
    const from=local(a), to=local(b), min=[-o.halfX,o.minY,-o.halfZ], max=[o.halfX,o.maxY,o.halfZ];
    let near=0,far=1;
    for(let k=0;k<3;k++) {
      const d=to[k]-from[k];
      if(Math.abs(d)<1e-8){if(from[k]<min[k]||from[k]>max[k])far=-1;continue;}
      const x=(min[k]-from[k])/d,y=(max[k]-from[k])/d;
      near=Math.max(near,Math.min(x,y));far=Math.min(far,Math.max(x,y));
    }
    if(near<=far)return true;
  }
  return false;
}

export function stepHook(fight, truck, dt, course, events) {
  const h=fight.hook, from=truckPoint(course,truck), down=!!truck.input?.interact;
  const press=down && !h.held;
  h.held=down; h.origin=from;
  if (press && fight.phase!=='fallen') {
    if(h.phase==='dragging' && h.drag)fight.dropped[h.box]={...h.drag};
    if(h.phase!=='idle') { releaseHook(h,events);return; }
    const marker=fight.marker;
    h.box=marker?.canBite ? marker.box : -1;
    h.phase='flying';h.time=0;h.start=from;h.tip=from;
    h.target=h.box>=0 ? {...marker} : modelPoint(from,0,0,15);
    events.push({type:'hookFire'});
    if(!marker)events.push({type:'noBox'});
  }
  if(h.phase==='flying') {
    h.time+=dt;
    const tip=linePoint(h.start,h.target,Math.min(1,h.time/.3));
    const clang=h.box<0 && hitsShell(h.tip,tip,rexSolids(fight,course));
    h.tip=tip;
    if(clang || h.time+.0000001>=.3){
      if(h.box>=0 && fight.marker?.box===h.box){
        h.phase='attached';h.tight=false;h.length=TOW_LENGTH;
        events.push({type:'bite',box:h.box});
      }else{h.phase='returning';h.start=tip;h.time=0;if(clang)events.push({type:'clang'});}
    }
  }
  if(h.phase==='returning'){
    h.time+=dt;h.tip=linePoint(h.start,from,Math.min(1,h.time/1.5));
    h.tip.y=Math.max(course.groundAt(truck.s,truck.lateral).y+.08,h.tip.y-2*Math.sin(Math.PI*Math.min(1,h.time/1.5)));
    if(h.time>=1.5){h.phase='idle';h.tip=null;}
  }
  if(h.phase==='dragging'){
    h.time+=dt;
    h.drag=modelPoint(from,0,0,-5.2);
    h.drag.y=course.groundAt(truck.s,truck.lateral).y+.36+.30*Math.abs(Math.sin(h.time*8))*Math.min(1,Math.abs(truck.speedMph)/12);
    h.tip={...h.drag,y:h.drag.y+.66};return;
  }
  if(h.phase!=='attached')return;
  h.tip=eyePoint(fight,course,h.box);
  const dx=from.x-h.tip.x,dz=from.z-h.tip.z;
  const distance=Math.hypot(dx,from.y-h.tip.y,dz);
  const tight=distance>=h.length-.12;
  const away=(dx*Math.sin(from.heading)+dz*Math.cos(from.heading))/Math.max(.01,Math.hypot(dx,dz));
  const pulling=tight && truck.input?.throttle>0 && away>=-.05;
  if(tight && !h.tight){
    events.push({type:'tight',box:h.box});
    if(Math.max(truck.speedMph,h.arrivalSpeed||0)>=20 && away>0){h.pulls[h.box]+=1;events.push({type:'jerk',box:h.box});}
  }
  h.arrivalSpeed=0;h.tight=tight;h.pulling=!!pulling;
  if(!tight && truck.input?.throttle>0 && !fight.hints.slack)events.push({type:'slack'});
  if(!pulling)h.stalled=0;
  if(pulling){
    // The cable can hold the truck below the road nitro speed. Spend the same
    // tank charge on this loaded pull, without accelerating through the cable.
    let nitro=truck.boosting ? 1 : 0;
    if(!nitro && truck.input?.boost && truck.boost>0 && truck.speedMph<BOOST.minSpeedMph){
      const charge=BOOST.drainPerSec*dt / ((1+.25*(truck.upgrades?.tank||0))*(1+.14*(truck.upgrades?.nitro||0)));
      nitro=Math.min(1,truck.boost/charge);
      truck.boost=Math.max(0,truck.boost-charge);
    }
    if(nitro)h.stalled=0;
    if(h.box===1 && h.pulls[1]>=1 && !nitro){
      if(!fight.braced){fight.braced=true;events.push({type:'brace'});}
      h.length=Math.max(8,h.length-2*dt);
      h.stalled=(h.stalled||0)+dt;
      if(h.stalled+1e-8>=2 && !fight.hints.braceStall)events.push({type:'braceStall'});
      return;
    }
    h.pulls[h.box]+=dt*(nitro && h.box===1 && h.pulls[1]>=1 ? 2*nitro : 1+nitro);
  }
}

// Enforce cable length on the proposed truck position before the wall sweep.
// Tangential motion survives, so a driver can steer along the cable's arc.
export function constrainTow(fight,course,truck,end){
  const h=fight.hook;
  if(h.phase!=='attached')return end;
  const eye=eyePoint(fight,course,h.box), from=truckPoint(course,truck);
  const dx=end.x-eye.x,dz=end.z-eye.z,r=Math.hypot(dx,dz);
  const allowed=Math.sqrt(Math.max(0,h.length*h.length-(from.y-eye.y)**2));
  if(r<=allowed || r<.001)return end;
  return {...end,x:eye.x+dx*allowed/r,z:eye.z+dz*allowed/r};
}

