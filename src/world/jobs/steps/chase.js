const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepChase(step, state, view) {
  const target = (view.actors ?? []).find(actor => actor.id === step.targetId);
  // Not spawned yet: keep leading the player to the path, and nothing counts as caught.
  if (!target) return { state, complete: false, events: [], requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: step.path?.[0] }] };
  const gap = distance(view.player?.position, target?.position);
  const events = [];
  // A catch stays a catch: a step that holds for a closing line lets the thief roll on, and that must not undo it.
  if (state.caught === true) return { state, complete: true, events, requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: target?.position ?? step.path?.at(-1) }] };
  if (gap > (step.leashDistance ?? Infinity)) {
    const warned = state.warned ?? false;
    if (!warned) events.push({ type: 'say', lineId: step.leashLineId });
    return { state: { warned: true }, restart: true, events, requests: [{ type: 'marker', place: step.path?.[0] }, { type: 'follow', path: step.path, speed: step.targetSpeed }] };
  }
  const caught = (target.health ?? 1) <= 0 || (gap <= (step.contactRadius ?? 3) && (view.player?.contact === step.targetId || view.contact === step.targetId));
  return { state: caught ? { ...state, caught: true } : state, complete: caught, events, requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: target?.position ?? step.path?.at(-1) }] };
}
