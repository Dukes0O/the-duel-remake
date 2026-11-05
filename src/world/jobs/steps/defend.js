export function stepDefend(step, state, view) {
  const health = view.places?.[step.placeId]?.health ?? view.placeHealth ?? step.health ?? 100;
  const events = [];
  let wave = state.wave ?? 0;
  if (health <= 0) {
    events.push({ type: 'waveRestarted', wave });
    return { state: { wave, restarting: true }, restart: true, events,
      requests: [{ type: 'say', lineId: step.restartLineId }, { type: 'spawnWave', n: step.waves?.[wave]?.count ?? step.waveSize ?? 1, at: step.place }] };
  }
  if (state.restarting) events.push({ type: 'waveStarted', wave });
  const cleared = (view.waveCleared ?? []).includes?.(wave) || view.waveCleared === wave || view.waveCleared === true;
  if (cleared) { events.push({ type: 'waveCleared', wave }); wave++; }
  return { state: { wave, restarting: false }, complete: wave >= (step.waves?.length ?? step.waveCount ?? 1), events,
    requests: wave < (step.waves?.length ?? step.waveCount ?? 1) ? [{ type: 'spawnWave', n: step.waves?.[wave]?.count ?? step.waveSize ?? 1, at: step.place }] : [] };
}
