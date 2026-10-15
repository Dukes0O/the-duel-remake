// Light paths reuse prepared materials. Only circuit water's initial night
// look changes built geometry colours and its shader, so retain that choice.
export function environmentKey(course) {
  const source = course.def;
  let definition = source;
  if (source && Object.hasOwn(source, 'lightPath')) {
    definition = {...source};
    delete definition.lightPath;
  }
  const marker = course.hiddenRoad ? 'hidden-road-v1' : course.muddyHollow ? 'muddy-hollow-v1' : null;
  let key = JSON.stringify(marker ? [course.seed, definition, marker] : [course.seed, definition]);
  const waterNight = source?.water && source.basins?.length && source.timeOfDay !== 'night' &&
    source.lightPath?.keyframes?.[0]?.look === 'night';
  if (waterNight) key += ':circuit-water-night-v1';
  return course.deepRamp ? key + ':deep-ramp-v1:' + course.deepRamp.atDistance : key;
}
