import {actOnTalk, startTalk, talkScreen} from '../../../story/talk.js';
import {captionSeconds} from '../../../story/caption-queue.js';

// A chapter can supply a different set of known facts at each scene's entrance.
// A selected answer is returned to the rules; the HUD receives only the screen.
export function stepTalk(step, state, view, dt = 0) {
  const facts = view.talkFacts ?? step.facts ?? [];
  const previous = state.talk;
  const current = previous ?? startTalk(step.scene);
  const timedLine = step.scene.autoAdvance && current.phase === 'lines' && !step.scene.questions?.length &&
    !step.scene.choices?.length;
  const elapsed = timedLine ? (state.lineElapsed ?? 0) + dt : 0;
  const action = view.talkAction ?? (timedLine && elapsed >= captionSeconds(current.history.at(-1).words)
    ? {type: 'advance'} : null);
  const outcome = actOnTalk(step.scene, current, action, facts);
  if (outcome.choice) return {state, complete: true, events: [{type: 'talkChoice', ...outcome.choice}]};
  if (outcome.state.phase === 'done') return {state, complete: true};
  if (previous === outcome.state) return {state: timedLine ? {...state, lineElapsed: elapsed} : state};
  const screen = talkScreen(step.scene, outcome.state, facts);
  return {state: {...state, talk: outcome.state, screen, ...(timedLine ? {lineElapsed: 0} : {})}};
}

export function activeTalkStep(state) {
  const job = state.status === 'racing' && state.arena?.worldJob?.job;
  const step = job?.steps?.[job.stepIndex];
  return step?.kind === 'talk' ? step : null;
}
