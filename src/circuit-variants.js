// Course-owned variants keep the parent descriptor and private lazy getters intact.
export function copyCourseDescriptor(parent, changes) {
  const descriptors = Object.getOwnPropertyDescriptors(parent);
  for (const [key, value] of Object.entries(changes))
    descriptors[key] = {value, enumerable: true, writable: false, configurable: false};
  return Object.freeze(Object.defineProperties({}, descriptors));
}

export function lightVariant(parent, parentManifest, {id, name, look, releaseOrder}) {
  if (!['night', 'dusk'].includes(look)) throw Error('A lighting variant needs the existing night or dusk look.');
  const lightPath = Object.freeze({axis: parent.lightPath?.axis ?? 'distance',
    ...(parent.lightPath?.palette ? {palette: parent.lightPath.palette} : {}),
    keyframes: Object.freeze([Object.freeze({at: 0, look})])});
  const definition = copyCourseDescriptor(parent, {id, name, flag: id, defaultMood: 'clear',
    timeOfDay: look === 'night' ? 'night' : undefined, lightPath});
  const manifest = Object.freeze({id, flag: id, state: 'dev', price: 0, grandPrix: true, releaseOrder,
    driver: parentManifest.driver,
    unlock: Object.freeze({kind: 'default-gp-podium', defaultEventId: parent.id})});
  return Object.freeze({definition, manifest});
}
