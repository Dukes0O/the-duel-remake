const distance = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0), (a?.z ?? 0) - (b?.z ?? 0));
export function stepExplore(step, state, view) {
  const finds = step.finds ?? [];
  let index = state.index ?? 0;
  const events = [];
  while (index < finds.length && distance(view.player?.position, finds[index].position) <= (finds[index].radius ?? step.radius ?? 5)) {
    events.push({ type: 'found', id: finds[index].id, lineId: finds[index].lineId });
    index += 1;
  }
  const requests = index < finds.length
    ? [{type:'marker', place:finds[index].place ?? finds[index].position}, {type:'say', lineId:finds[index].hint}] : [];
  if (step.sayFinds) {
    if (state.hintedIndex === index) requests.splice(1, 1);
    requests.unshift(...events.filter(event => event.lineId).map(event => ({type:'say', lineId:event.lineId})));
  }
  return {state:{index, ...(step.sayFinds ? {hintedIndex:index} : {})}, complete:index >= finds.length, events, requests};
}
