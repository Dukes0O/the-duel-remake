const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepOnFoot(step, state, view) {
  if (!view.onFoot) return { state, requests: [{ type: 'marker', place: step.places?.[state.index ?? 0]?.position }, { type: 'say', lineId: step.exitCarLineId }] };
  if (view.fighter?.knockedDown) {
    const index = state.index ?? 0;
    return { state: { index }, restart: true, events: [{ type: 'knockedDown' }], requests: [{ type: 'marker', place: step.places?.[Math.max(0, index - 1)]?.position }] };
  }
  let index = state.index ?? 0;
  const events = [];
  const places = step.places ?? [];
  while (index < places.length && distance(view.fighter?.position, places[index].position) <= (places[index].radius ?? step.radius ?? 3)) {
    events.push({ type: places[index].action === 'use' ? 'used' : 'lit', id: places[index].id });
    index++;
  }
  return { state: { index }, complete: index >= places.length, events,
    requests: index < places.length ? [{ type: 'marker', place: places[index].position }, { type: 'say', lineId: places[index].hint }] : [] };
}
