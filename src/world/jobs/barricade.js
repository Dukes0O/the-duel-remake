// Dimensions and orientation of the standing job barricade, shared by its drawing and flame target.
export const BARRICADE_LENGTH = 12;
// Both deliveries use the same flame contacts and burn event. A zero duration
// keeps Hot Delivery's existing immediate burn.
export function burnBarricades(barriers, state, hits, dt = 0, seconds = 0) {
  const burnt = new Set(state.burntBarricades ?? []);
  const heat = {...state.barrierHeat}, events = [];
  for (const barrier of barriers ?? []) {
    if (burnt.has(barrier.id)) continue;
    const flame = hits.some(hit => hit.id === barrier.id && hit.kind === 'barricade' && hit.burnable && hit.flame);
    if (!flame) continue;
    heat[barrier.id] = (heat[barrier.id] ?? 0) + Math.max(0, dt);
    if (heat[barrier.id] >= seconds) {
      burnt.add(barrier.id);
      events.push({type: 'burn', id: barrier.id});
    }
  }
  return {burntBarricades: [...burnt], barrierHeat: heat, events};
}
export function barricadeEnds(position, heading) {
  const x = Math.cos(heading) * BARRICADE_LENGTH / 2;
  const z = -Math.sin(heading) * BARRICADE_LENGTH / 2;
  return [{x: position.x - x, z: position.z - z}, {x: position.x + x, z: position.z + z}];
}
