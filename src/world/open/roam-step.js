// The step `roam` (docs/story/open-scablands.md, section 14): being out in the open with no mission. It has no goal,
// shows no line and never completes by itself. The open land's parts run beside it (src/world/open/open-land.js), and
// it ends only when one of them asks to leave: the player went to a marker and began what is there, or banked the
// hearth. A job of this one step holds nothing (src/world/open/holds.js).
export function stepRoam(step, state, view) {
  const leave = view.open?.leave ?? null;
  return {state, complete: leave !== null, events: leave ? [{...leave, type: 'roamLeft'}] : [], requests: []};
}
