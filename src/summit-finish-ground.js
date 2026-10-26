// The summit's ploughed arrival terrace. Both the drawn far grid and its
// height reader call this, so helicopter ground queries see the same surface.
export function summitFinishGround(course, x, z, naturalHeight) {
  if (!course.def.finishArea) return naturalHeight;
  const end = course.at(course.length), dx = x-end.x, dz = z-end.z;
  const along = dx*Math.sin(end.heading)+dz*Math.cos(end.heading);
  const across = dx*Math.cos(end.heading)-dz*Math.sin(end.heading);
  const smooth = value => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
  const weight = smooth((along+56)/32)*smooth((190-along)/60)*smooth((88-Math.abs(across))/32);
  if (weight === 0) return naturalHeight;
  const level = course.groundAt(course.length,0).y-.025;
  return naturalHeight+(level-naturalHeight)*weight;
}
