// Absent ramps retain the exact ordinary, Hidden Road and Muddy Hollow keys.
export function environmentKey(course) {
  const marker=course.hiddenRoad?'hidden-road-v1':course.muddyHollow?'muddy-hollow-v1':null;
  const key=JSON.stringify(marker?[course.seed,course.def,marker]:[course.seed,course.def]);
  return course.deepRamp?key+':deep-ramp-v1:'+course.deepRamp.atDistance:key;
}
