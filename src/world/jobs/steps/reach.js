const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepReach(step, state, view) {
  const reached = (!step.onFoot || view.onFoot) && distance(view.player?.position, step.place?.position ?? step.position) <= (step.radius ?? 5);
  return { state, complete: reached, requests: [{ type: 'marker', place: step.place?.id ?? step.place ?? step.position }] };
}
