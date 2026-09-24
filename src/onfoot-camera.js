import {Vector3} from 'three';

const EYE_HEIGHT_METERS = 1.62;
const GROUND_CLEARANCE_METERS = .65;

// Read-only first-person pose. The fighter and terrain are simulation data;
// this module changes neither, and the renderer can use the result directly.
export function onFootCameraPose(course, fighter, mode = 'first-person') {
  if (!course || !fighter) return null;
  if(mode === 'overhead') return overheadPose(course, fighter);
  const near = course.nearest(fighter.x, fighter.z, fighter.s);
  const ground = course.groundAt(near.s, near.lateral);
  const eye = {
    x: fighter.x,
    y: Math.max(fighter.y + EYE_HEIGHT_METERS,
      ground.y + GROUND_CLEARANCE_METERS),
    z: fighter.z,
  };
  const pitch = Math.max(-1.25, Math.min(1.25, fighter.pitch || 0));
  const yaw = fighter.yaw || 0;
  const reach = 8;
  return {
    position: eye,
    target: {
      x: eye.x + Math.sin(yaw) * Math.cos(pitch) * reach,
      y: eye.y + Math.sin(pitch) * reach,
      z: eye.z + Math.cos(yaw) * Math.cos(pitch) * reach,
    },
    fov: 72,
  };
}

// Try a bounded shorter boom if the roof and hillside cannot both clear the eye.
function overheadPose(course, fighter) {
  const yaw=fighter.yaw||0, forwardX=Math.sin(yaw), forwardZ=Math.cos(yaw);
  let position;
  for(const scale of [1,.8,.6,.4,.2,0]) {
    position={x:fighter.x-forwardX*6*scale,y:fighter.y+5,z:fighter.z-forwardZ*6*scale};
    let near=course.nearest(position.x,position.z,fighter.s), tunnel=course.tunnelAt?.(near.s);
    // A shared route coordinate does not put a hillside camera inside a tunnel.
    if(tunnel&&Math.abs(near.lateral)>tunnel.width+.65)tunnel=null;
    if(tunnel) {
      const lateral=Math.max(-tunnel.width+.65,Math.min(tunnel.width-.65,near.lateral));
      const point=course.worldAt(near.s,lateral);position.x=point.x;position.z=point.z;
      near=course.nearest(position.x,position.z,near.s);tunnel=course.tunnelAt?.(near.s);
    }
    const floor=course.groundAt(near.s,near.lateral).y+GROUND_CLEARANCE_METERS;
    let ceiling=Infinity;
    if(tunnel) {
      const ratio=Math.min(.995,Math.abs(near.lateral)/tunnel.width);
      ceiling=course.at(near.s).y+3.6+(tunnel.height-3.6)*Math.sqrt(1-ratio*ratio)-.45;
    }
    position.y=Math.max(floor,Math.min(position.y,ceiling));
    if(floor<=ceiling)break;
  }
  return {position,target:{x:fighter.x+forwardX*4,y:fighter.y+1.1,z:fighter.z+forwardZ*4},fov:60};
}

// Same origin and ray as the existing RPG; this is a visual distance, not a hit.
export function onFootAimPoint(fighter, reach=60) {
  if(!fighter)return null;
  const yaw=fighter.yaw||0,pitch=fighter.pitch||0;
  return {x:fighter.x+Math.sin(yaw)*Math.cos(pitch)*reach,
    y:fighter.y+EYE_HEIGHT_METERS+Math.sin(pitch)*reach,
    z:fighter.z+Math.cos(yaw)*Math.cos(pitch)*reach};
}

export function projectOnFootAim(camera, fighter) {
  if(!camera||!fighter)return null;
  const point=onFootAimPoint(fighter),projected=new Vector3(point.x,point.y,point.z).project(camera);
  const x=(projected.x+1)/2,y=(1-projected.y)/2;
  return {x,y,visible:Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=1&&y>=0&&y<=1&&projected.z>=-1&&projected.z<=1};
}
