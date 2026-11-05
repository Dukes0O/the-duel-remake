export function stepDefend(step, state, view) {
  const health = view.places?.[step.placeId]?.health ?? view.placeHealth ?? step.health ?? 100;
  const events = [];
  const waves = view.difficulty === 'easy' && step.easyWaves ? step.easyWaves : step.waves;
  let wave = state.wave ?? 0;
  if (health <= 0) {
    events.push({ type: 'waveRestarted', wave });
    return { state: { wave, restarting: true }, restart: true, events,
      requests: [{ type: 'say', lineId: step.restartLineId }, { type: 'spawnWave', ...waves?.[wave],
        n: waves?.[wave]?.count ?? step.waveSize ?? 1, at: step.place,
        from: waves?.[wave]?.from ?? step.raiderEntry, approachSpeed: step.approachSpeed,
        hold: step.raiderHold, stopDistance: step.defendStopDistance }] };
  }
  if (state.restarting) events.push({ type: 'waveStarted', wave });
  const cleared = (view.waveCleared ?? []).includes?.(wave) || view.waveCleared === wave || view.waveCleared === true;
  if (cleared) { events.push({ type: 'waveCleared', wave }); wave++; }
  const waveCount = waves?.length ?? step.waveCount ?? 1;
  const requests = cleared && wave < waveCount
    ? [{ type: 'refill', ...step.refill }, { type: 'spawnWave', ...waves?.[wave],
      n: waves?.[wave]?.count ?? step.waveSize ?? 1, at: step.place,
      from: waves?.[wave]?.from ?? step.raiderEntry, approachSpeed: step.approachSpeed,
      hold: step.raiderHold, stopDistance: step.defendStopDistance }]
    : !cleared && !state.started && wave < waveCount
      ? [{ type: 'spawnWave', ...waves?.[wave], n: waves?.[wave]?.count ?? step.waveSize ?? 1,
        at: step.place, from: waves?.[wave]?.from ?? step.raiderEntry,
        approachSpeed: step.approachSpeed, hold: step.raiderHold,
        stopDistance: step.defendStopDistance }]
      : [];
  return { state: { wave, restarting: false, started: true }, complete: wave >= waveCount, events, requests };
}
