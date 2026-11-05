export function stepEscort(step, state, view) {
  const actors = view.actors ?? [];
  const truck = actors.find(actor => actor.id === step.actorId);
  if (truck && (truck.health ?? 1) <= 0) {
    if (!state.rested) return { state: { rested: true }, events: [{ type: 'rest', actorId: step.actorId }], requests: [{ type: 'say', lineId: step.restLineId }, { type: 'follow', path: step.path, speed: 0 }] };
    return { state: {}, restart: true, events: [{ type: 'restarted', actorId: step.actorId }], requests: [{ type: 'follow', path: step.path, speed: step.speed }, { type: 'marker', place: step.path?.[0] }] };
  }
  // A missing truck is still being spawned. Never let an absent objective
  // count as a successful escort.
  if (!truck) return {state, complete: false,
    requests: [{type: 'follow', path: step.path, speed: step.speed}, {type: 'marker', place: step.destination}]};
  return { state, complete: truck.atDestination === true || truck.pathProgress >= 1,
    requests: [{ type: 'follow', path: step.path, speed: step.speed }, { type: 'marker', place: step.destination }] };
}
