export function stepCarry(step, state, view) {
  const events = [];
  const requests = [{ type: 'marker', place: step.destination }];
  if (step.burnable && (view.thingsHit ?? []).some(hit => hit.kind === 'barricade' && hit.burnable)) {
    for (const hit of view.thingsHit.filter(hit => hit.kind === 'barricade' && hit.burnable)) events.push({ type: 'burn', id: hit.id });
  }
  if ((view.crashSize ?? 0) > (step.crashLimit ?? Infinity)) {
    events.push({ type: 'spilled', load: step.load });
    requests.push({ type: 'say', lineId: step.spillLineId }, { type: 'marker', place: step.safePoints?.[state.safeIndex ?? 0] ?? step.origin });
    return { state: { safeIndex: state.safeIndex ?? 0 }, restart: true, events, requests };
  }
  let safeIndex = state.safeIndex ?? 0;
  while (safeIndex < (step.safePoints ?? []).length && Math.hypot((view.player?.position?.x ?? 0) - (step.safePoints[safeIndex].position?.x ?? step.safePoints[safeIndex].x ?? 0), (view.player?.position?.z ?? 0) - (step.safePoints[safeIndex].position?.z ?? step.safePoints[safeIndex].z ?? 0)) <= (step.safePoints[safeIndex].radius ?? 5)) safeIndex++;
  const atDestination = Math.hypot((view.player?.position?.x ?? 0) - (step.destination?.position?.x ?? step.destination?.x ?? 0), (view.player?.position?.z ?? 0) - (step.destination?.position?.z ?? step.destination?.z ?? 0)) <= (step.radius ?? 5);
  return { state: { safeIndex }, complete: atDestination, events, requests };
}
