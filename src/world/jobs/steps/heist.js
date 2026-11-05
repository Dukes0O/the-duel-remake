const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
function sees(lamp, player, cone) {
  const dx = player.x - lamp.position.x, dz = player.z - lamp.position.z;
  const length = Math.hypot(dx, dz);
  if (!length || length > (lamp.range ?? 12)) return false;
  const facing = lamp.direction ?? { x: 0, z: 1 };
  const dot = (dx * facing.x + dz * facing.z) / length / Math.hypot(facing.x, facing.z);
  return dot >= Math.cos((cone ?? lamp.coneDegrees ?? 55) * Math.PI / 360);
}
export function stepHeist(step, state, view) {
  const events = [];
  const requests = [];
  const player = view.fighter?.position ?? view.player?.position ?? {};
  const seen = view.onFoot && (view.lamps ?? []).some(lamp => sees(lamp, player, step.coneDegrees));
  const alarm = Boolean(state.alarm || seen);
  if (seen && !state.alarm) { events.push({ type: 'alarm' }); requests.push({ type: 'spawnWave', n: step.alarmWaveSize ?? 3, at: player }, { type: 'say', lineId: step.alarmLineId }); }
  if ((state.phase ?? 'infiltrate') === 'infiltrate' && view.onFoot && distance(player, step.zone?.position ?? step.zone) <= (step.zone?.radius ?? step.zoneRadius ?? 8) && (view.thingsHit ?? []).some(hit => hit.id === step.takeId || hit.kind === 'take')) {
    events.push({ type: 'taken', id: step.takeId });
    return { state: { phase: 'return', alarm }, events, requests: [{ type: 'lend', weaponId: step.weaponId }, { type: 'marker', place: step.carPlace }] };
  }
  if ((state.phase ?? 'infiltrate') === 'return') {
    const carried = view.carrying === step.takeId || view.inventory?.includes?.(step.takeId);
    if (carried && view.onFoot) return { state: { phase: 'return', alarm }, events, requests: [{ type: 'marker', place: step.carPlace }, { type: 'follow', path: step.returnPath, speed: (step.walkSpeed ?? 1) * 0.7 }] };
    if (carried && !view.onFoot && state.phase === 'return' && distance(view.player?.position, step.carPlace?.position ?? step.carPlace) <= (step.carRadius ?? 6)) return { state: { phase: 'escape', alarm }, events, requests: [{ type: 'marker', place: step.escapePlace }] };
  }
  if (!view.onFoot && state.phase === 'escape' && distance(view.player?.position, step.escapePlace?.position ?? step.escapePlace) <= (step.escapeRadius ?? 6)) return { state: { alarm }, complete: true, events, requests };
  const place = state.phase === 'return' ? step.carPlace :
    state.phase === 'escape' ? step.escapePlace : step.zone;
  return { state: { phase: state.phase ?? 'infiltrate', alarm }, events,
    requests: [{ type: 'marker', place }] };
}
