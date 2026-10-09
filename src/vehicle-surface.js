export const TIRE_CLEARANCE=.01;

// Match the road builders' surface lifts. Paved main roads use worldAt, while
// gravel/arena roads and all shortcuts follow groundAt. At a branch join the
// visible top surface is the higher of the overlapping meshes.
export function vehicleGroundPoint(course,s,lateral=0){
  const p=course.groundAt(s,lateral),surface=course.surfaceAt(s,lateral),onMain=Math.abs(lateral)<=surface.roadHalfWidth;
  if(onMain)p.y=(course.def.offroad||course.def.arena?p.y:course.at(s).y)+.035;
  if(surface.shortcutId){const branchY=course.groundAt(s,lateral).y+.065;p.y=onMain?Math.max(p.y,branchY):branchY;}
  return p;
}
