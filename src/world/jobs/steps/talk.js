import {actOnTalk, startTalk, talkScreen} from '../../../story/talk.js';

// A chapter can supply a different set of known facts at each scene's entrance.
// A selected answer is returned to the rules; the HUD receives only the screen.
export function stepTalk(step, state, view) {
  const facts = view.talkFacts ?? step.facts ?? [];
  const previous = state.talk;
  const current = previous ?? startTalk(step.scene);
  const outcome = actOnTalk(step.scene, current, view.talkAction, facts);
  if (outcome.choice) return {state, complete: true, events: [{type: 'talkChoice', ...outcome.choice}]};
  if (previous === outcome.state) return {state};
  const screen = talkScreen(step.scene, outcome.state, facts);
  return {state: {...state, talk: outcome.state, screen}};
}

export function activeTalkStep(state) {
  const job = state.status === 'racing' && state.arena?.worldJob?.job;
  const step = job?.steps?.[job.stepIndex];
  return step?.kind === 'talk' ? step : null;
}
