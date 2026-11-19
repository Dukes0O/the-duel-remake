// The world adapter supplies the moving figure and the player's actual position.
export function stepNight2Action(step, state, view) {
  const evidence = view.night2Action;
  const outcome = step.action === 'chase' && view.onFoot && evidence?.contact
    ? 'caught' : evidence?.arrival;
  return {state, complete: Boolean(outcome), events: outcome ? [{type: 'night2Outcome', outcome}] : []};
}
