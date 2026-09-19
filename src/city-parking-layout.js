// Course placement uses only math helpers; mesh construction remains in the lazy renderer.
// The package's monolithic entry is also used by the lazy renderer. Importing
// it here would pull that full shared module into Vite's eager App chunk.
import {Vector3} from 'three/src/math/Vector3.js';
import {Matrix4} from 'three/src/math/Matrix4.js';
import {Quaternion} from 'three/src/math/Quaternion.js';
import {makeRng} from './rng.js';

export const PARKED_CAR_SIZE=Object.freeze({halfX:1.06,halfZ:2.35,height:1.65});
const COLORS=[0x899b9a,0x9a9588,0x4c606e,0x714c45,0x525e4d,0xb6b4a8,0x494e55];
const TAU=Math.PI*2;
const gap=(course,a,b)=>Math.abs(Math.atan2(Math.sin((a-b)/course.length*TAU),Math.cos((a-b)/course.length*TAU))*course.length/TAU);
function hullsOverlap(a,b,margin=0){
  const dx=b.x-a.x,dz=b.z-a.z;
  for(const heading of[a.heading||0,b.heading||0])for(const axis of[0,Math.PI/2]){
    const x=Math.cos(heading+axis),z=-Math.sin(heading+axis),extent=h=>(h.halfX+margin)*Math.abs(x*Math.cos(h.heading||0)-z*Math.sin(h.heading||0))+(h.halfZ+margin)*Math.abs(x*Math.sin(h.heading||0)+z*Math.cos(h.heading||0));
    if(Math.abs(dx*x+dz*z)>extent(a)+extent(b))return false;
  }
  return true;
}
function groundAtWorld(course,x,z){const p=course.nearest(x,z);return course.groundAt(p.s,p.lateral).y;}
function planePose(course,s,off,heading){
  const center=course.groundAt(s,off),c=Math.cos(heading),sn=Math.sin(heading),samples=[];
  for(const x of[-.89,.89])for(const z of[-1.43,1.43])samples.push({x,z,y:groundAtWorld(course,center.x+c*x+sn*z,center.z-sn*x+c*z)});
  const base=samples.reduce((sum,p)=>sum+p.y/4,0),sx=samples.reduce((sum,p)=>sum+Math.sign(p.x)*p.y,0)/(4*.89),sz=samples.reduce((sum,p)=>sum+Math.sign(p.z)*p.y,0)/(4*1.43);
  if(Math.abs(sx)>.018||Math.abs(sz)>.035)return null;
  const right=new Vector3(c,sx,-sn).normalize(),forward=new Vector3(sn,sz,c),up=forward.clone().cross(right).normalize();forward.crossVectors(right,up).normalize();
  const rotation=new Matrix4().makeBasis(right,up,forward),quaternion=new Quaternion().setFromRotationMatrix(rotation),matrix=rotation.clone().setPosition(center.x,base+.025,center.z);
  let minimum=Infinity,maximum=-Infinity;const p=new Vector3();
  for(const x of[-1.06,-.89,0,.89,1.06])for(const z of[-2.35,-1.43,0,1.43,2.35]){
    p.set(x,0,z).applyMatrix4(matrix);const ground=groundAtWorld(course,p.x,p.z);
    if(Math.abs(p.y-.025-ground)>.006)return null;
    minimum=Math.min(minimum,ground);maximum=Math.max(maximum,ground);
  }
  if(maximum-minimum>.14)return null;
  const minY=minimum-.006;
  // Enclose the entire tilted sedan, including bumpers and mirrors, in the
  // same upright heading box used by every actor's collision sweep.
  for(const x of[-1.028,1.028])for(const y of[0,1.48])for(const z of[-2.285,2.285]){
    p.set(x,y,z).applyMatrix4(matrix);const dx=p.x-center.x,dz=p.z-center.z;
    if(Math.abs(dx*c-dz*sn)>PARKED_CAR_SIZE.halfX||Math.abs(dx*sn+dz*c)>PARKED_CAR_SIZE.halfZ||p.y<minY||p.y>minY+PARKED_CAR_SIZE.height)return null;
  }
  return{x:center.x,y:minY,z:center.z,bodyY:base+.025,quaternion:quaternion.toArray(),groundRange:maximum-minimum};
}
function clearRoadside(course,s,off,halfX=1.45,halfZ=6.5){
  const p=course.groundAt(s,off),c=Math.cos(p.heading),sn=Math.sin(p.heading);
  for(const x of[-halfX,0,halfX])for(const z of[-halfZ,-halfZ*.5,0,halfZ*.5,halfZ]){
    const n=course.nearest(p.x+c*x+sn*z,p.z-sn*x+c*z),width=course.roadHalfWidthAt(n.s);
    if(course.themeAt(n.s)!=='city'||Math.abs(n.lateral)<width+5.55||Math.abs(n.lateral)>76)return false;
    if(course.features.stations.some(station=>gap(course,n.s,station.s)<35))return false;
    if(course.features.tunnels.some(t=>n.s>t.start-30&&n.s<t.end+30))return false;
    if(course.features.shortcuts.some(cut=>n.s>cut.start-30&&n.s<cut.end+30&&(n.s<cut.start+28||n.s>cut.end-28||Math.abs(n.lateral-course.shortcutOffset(cut,n.s))<cut.halfWidth+3)))return false;
  }
  return true;
}

// A private stream and a pure return value keep unrelated scenery and all
// moving traffic unchanged. Failed bays are simply left empty.
export function buildCityParking(course){
  const sections=course.sections.filter(section=>section.theme==='city');if(!sections.length)return[];
  const cityLength=sections.reduce((sum,section)=>sum+section.end-section.start,0),target=Math.min(28,Math.max(2,Math.round(cityLength/310)*2));
  const rng=makeRng((course.seed^0x6ca7d21b^Math.imul((course.def.stage||0)+1,0x491b))>>>0),candidates=[];
  for(const section of sections)for(let s=section.start+125;s<section.end-65;s+=31)candidates.push({s:s+rng.range(-5,5),side:rng.chance(.5)?1:-1,order:rng.float()});
  candidates.sort((a,b)=>a.order-b.order);const cars=[],bays=[];
  const obstacles=course.features.obstacles.filter(obstacle=>!obstacle.parkedCar);
  for(const candidate of candidates){
    if(cars.length>=target)break;
    const s=candidate.s;if(bays.some(bay=>gap(course,bay.s,s)<115))continue;
    let accepted=false;
    for(const side of[candidate.side,-candidate.side])for(const distance of[7.8,9.5,11.5]){
      if(accepted)continue;const off=side*(course.roadHalfWidthAt(s)+distance);
      if(!clearRoadside(course,s,off))continue;
      const frame=course.groundAt(s,off),bay={...frame,s,off,halfX:1.45,halfZ:6.5};
      if(obstacles.some(obstacle=>hullsOverlap(bay,obstacle,.45))||cars.some(car=>hullsOverlap(bay,car,.5)))continue;
      if(course.features.flocks.some(flock=>{const p=course.groundAt(flock.s,flock.off);return Math.hypot(p.x-bay.x,p.z-bay.z)<flock.radius+7.5;}))continue;
      const pair=[];
      for(const ds of[-3.15,3.15]){
        const at=s+ds,frame=course.groundAt(at,off),heading=frame.heading+(side<0?Math.PI:0),pose=planePose(course,at,off,heading);
        if(!pose)break;
        const car={id:`parked-${cars.length+pair.length}`,kind:'prop',shape:'box',parkedCar:true,theme:'city',s:at,off,heading,...PARKED_CAR_SIZE,...pose,bayId:`parking-${bays.length}`,bayS:s,bayOff:off,color:COLORS[rng.int(0,COLORS.length-1)]};
        if(obstacles.some(obstacle=>hullsOverlap(car,obstacle,.5))||cars.some(other=>hullsOverlap(car,other,.5)))break;
        pair.push(car);
      }
      if(pair.length===2){cars.push(...pair);bays.push(bay);accepted=true;}
    }
  }
  return cars;
}
