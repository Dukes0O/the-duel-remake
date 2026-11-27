// Game days are supplied by the town clock. Opening a log never advances that clock.
export function stepDispatch(step, state, view) {
  const day = Math.max(state.day ?? 0, Number.isFinite(view.elapsedGameDays) ? view.elapsedGameDays : 0);
  const sent = new Set(state.sent ?? []), requests = [], events = [];
  for (const log of step.logs) if (day >= log.day && !sent.has(log.lineId)) {
    sent.add(log.lineId);
    requests.push({type:'say', lineId:log.lineId});
    events.push({type:'dispatchLog', day:log.day, lineId:log.lineId, cue:'heli.radio.click'});
  }
  return {state:{day, sent:[...sent]}, complete:day >= step.days, requests, events};
}
