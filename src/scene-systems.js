// A world's visual systems have two clocks: ambient presentation time (wind,
// water) and simulation state (crushed props, fallen cacti, checkpoint lights).
// Neither phase may write to the race state. Geometry remains owned by the
// scene graph; optional dispose hooks release non-graph resources only.
const worlds = new WeakMap();

export function registerSceneSystem(world, system) {
  if (!world || !system || !['animate', 'sync', 'dispose'].some(key => typeof system[key] === 'function')) {
    throw new TypeError('A scene system needs a world and an animate, sync or dispose callback.');
  }
  let lifecycle = worlds.get(world);
  if (!lifecycle) {
    lifecycle = { systems: new Set(), disposed: false };
    worlds.set(world, lifecycle);
  }
  // A late shader/asset callback must not resurrect a retired world.
  if (!lifecycle.disposed) lifecycle.systems.add(system);
}

export function animateScene(world, seconds) {
  const lifecycle = worlds.get(world);
  if (!lifecycle || lifecycle.disposed) return;
  for (const system of lifecycle.systems) system.animate?.(seconds);
}

export function syncScene(world, state, dt = 0) {
  const lifecycle = worlds.get(world);
  if (!lifecycle || lifecycle.disposed) return;
  for (const system of lifecycle.systems) system.sync?.(state, dt);
}

export function disposeSceneSystems(world) {
  const lifecycle = worlds.get(world);
  if (!lifecycle) {
    worlds.set(world, {systems: new Set(), disposed: true});
    return;
  }
  if (lifecycle.disposed) return;
  lifecycle.disposed = true;
  const errors = [];
  for (const system of [...lifecycle.systems].reverse()) {
    try { system.dispose?.(); } catch (error) { errors.push(error); }
  }
  lifecycle.systems.clear();
  if (errors.length) throw new AggregateError(errors, 'Scene system cleanup failed.');
}
