// The tunnel roof is an elliptical arch above 3.6 m vertical side walls.
// Apply this after camera damping as well as to its target: otherwise a tall
// camera can interpolate through the roof on the first frame inside a portal.
export function constrainTunnelCamera(course,position,referenceS){
  if(!course.features.tunnels.length)return false;
  const frame=course.nearest(position.x,position.z,referenceS),tunnel=course.tunnelAt(frame.s,frame.lateral);
  if(!tunnel)return false;
  const ratio=Math.min(.995,Math.abs(frame.lateral)/tunnel.width);
  const floor=tunnel.flatRoof?course.groundAt(frame.s,0).y:course.at(frame.s).y;
  const ceiling=floor+(tunnel.flatRoof?tunnel.height:3.6+(tunnel.height-3.6)*Math.sqrt(1-ratio*ratio))-.45;
  if(position.y<=ceiling)return false;
  position.y=ceiling;return true;
}
