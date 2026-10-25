// The tunnel roof is an elliptical arch above 3.6 m vertical side walls.
// Apply this after camera damping as well as to its target: otherwise a tall
// camera can interpolate through the roof on the first frame inside a portal.
export function constrainTunnelCamera(course,position,referenceS){
  if(!course.features.tunnels.length)return false;
  const frame=course.nearest(position.x,position.z,referenceS),tunnel=course.tunnelAt(frame.s,frame.lateral);
  if(!tunnel)return false;
  const ratio=Math.min(.995,Math.abs(frame.lateral)/tunnel.width);
  const floor=tunnel.flatRoof?course.groundAt(frame.s,0).y:course.at(frame.s).y;
  // The accepted Gallery retains its visible arched lining beneath the kit.
  // Keep the camera below both roofs without changing ordinary arch arithmetic.
  const ceiling=tunnel.flatRoof
    ?Math.min(floor+tunnel.height,course.at(frame.s).y+3.6+(tunnel.height-3.6)*Math.sqrt(1-ratio*ratio))-.45
    :floor+(3.6+(tunnel.height-3.6)*Math.sqrt(1-ratio*ratio))-.45;
  if(position.y<=ceiling)return false;
  position.y=ceiling;return true;
}

// Return a new chase-camera position with the actual target in clear view.
// Simulation obstacle bounds are read only; the renderer wires this after damping.
function sightlineHit(start,end,box) {
  const cs=Math.cos(box.heading||0),sn=Math.sin(box.heading||0);
  const local=p=>({x:(p.x-box.x)*cs-(p.z-box.z)*sn,y:p.y,z:(p.x-box.x)*sn+(p.z-box.z)*cs});
  const a=local(start),b=local(end),low=box.minY??box.y,high=box.maxY??(box.y+box.height);
  if(![box.halfX,box.halfZ,low,high].every(Number.isFinite))return false;
  let enter=0,leave=1;
  for(const[key,min,max]of[['x',-box.halfX,box.halfX],['y',low,high],['z',-box.halfZ,box.halfZ]]){
    const delta=b[key]-a[key];
    if(Math.abs(delta)<1e-9){if(a[key]<min||a[key]>max)return false;continue;}
    let near=(min-a[key])/delta,far=(max-a[key])/delta;
    if(near>far)[near,far]=[far,near];
    enter=Math.max(enter,near);leave=Math.min(leave,far);
    if(enter>leave)return false;
  }
  return leave>1e-6&&enter<1-1e-6;
}
export function clearCameraSightline(course,position,target,referenceS) {
  const original={...position};
  const blockers=(course.features?.obstacles??[]).filter(row=>row.barrier||row.tunnelWall||row.kitSolid||row.trackWall);
  const blocked=p=>blockers.some(row=>sightlineHit(target,p,row));
  if(!blocked(original))return original;
  const rise=Math.max(1,Math.hypot(position.x-target.x,position.z-target.z)*.25);
  for(let step=1;step<=20;step++){
    const share=1-step/20;
    const candidate={...position,x:target.x+(position.x-target.x)*share,
      z:target.z+(position.z-target.z)*share,y:position.y+rise*(1-share)};
    if(course.features?.tunnels?.length)constrainTunnelCamera(course,candidate,referenceS);
    if(!blocked(candidate))return candidate;
  }
  throw new Error('Camera target has no clear sightline through solid bounds.');
}

// Keep the forward aim unless the actual body falls outside the native frustum.
// Return an existing input; projection and both targets remain read only.
export function selectCameraAim(projected,forward,body) {
  const inside=[projected.x,projected.y,projected.z].every(Number.isFinite)&&
    Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&projected.z>=-1&&projected.z<=1;
  return inside?forward:body;
}
