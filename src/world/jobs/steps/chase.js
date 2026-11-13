const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepChase(step, state, view, dt = 0) {
  const target = (view.actors ?? []).find(actor => actor.id === step.targetId);
  // Not spawned yet: keep leading the player to the path, and nothing counts as caught.
  if (!target) return { state, complete: false, events: [], requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: step.path?.[0] }] };
  const gap = distance(view.player?.position, target?.position);
  const events = [];
  // A catch stays a catch: a step that holds for a closing line lets the thief roll on, and that must not undo it.
  if (state.caught === true) return { state, complete: true, events, requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: target?.position ?? step.path?.at(-1) }] };
  const startGap = state.startGap ?? gap;
  const chaseElapsed = (state.chaseElapsed ?? 0) + dt;
  const warned = state.warned ?? false;
  const losing = !warned && chaseElapsed >= 8 && gap >= startGap + 20;
  if (losing && step.leashLineId) events.push({ type: 'say', lineId: step.leashLineId });
  const nextState = { ...state, startGap, chaseElapsed, warned: warned || losing };
  if (gap > (step.leashDistance ?? Infinity)) {
    return { state: nextState, restart: true, events, requests: [{ type: 'marker', place: step.path?.[0] }, { type: 'follow', path: step.path, speed: step.targetSpeed }] };
  }
  const caught = (target.health ?? 1) <= 0 || (gap <= (step.contactRadius ?? 3) && (view.player?.contact === step.targetId || view.contact === step.targetId));
  return { state: caught ? { ...nextState, caught: true } : nextState, complete: caught, events, requests: [{ type: 'follow', path: step.path, speed: step.targetSpeed }, { type: 'marker', place: target?.position ?? step.path?.at(-1) }] };
}
