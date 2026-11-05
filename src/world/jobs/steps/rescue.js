const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepRescue(step, state, view, dt) {
  let rescued = state.rescued ?? 0, wait = state.wait ?? 0;
  const target = step.people?.[rescued];
  const beside = target && distance(view.player?.position, target.position) <= (step.radius ?? 5) && (view.player?.speed ?? 0) <= (step.stopSpeed ?? 0.5);
  if (beside && rescued < (step.seats ?? 2)) wait += dt;
  else wait = 0;
  const events = [];
  if (target && wait >= (step.boardSeconds ?? 2)) { events.push({ type: 'rescued', id: target.id }); rescued++; wait = 0; }
  const complete = rescued >= Math.min(step.people?.length ?? 0, step.seats ?? 2) && distance(view.player?.position, step.home?.position ?? step.home) <= (step.homeRadius ?? 6);
  return { state: { rescued, wait }, complete, events, requests: [{ type: 'marker', place: target ? target.position : step.home }] };
}
