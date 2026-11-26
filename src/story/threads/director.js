import {applyEffects} from '../../world/open/open-effects.js';
import {isHeld, NO_HOLDS} from '../../world/open/holds.js';
import {castThread, weightedPick} from './cast.js';
import {firstBeat, mark, threadRule} from './thread-rule.js';
import {isSignAlive} from './signs.js';

const eligibleId = (id, night) => `${id}/director/eligible-${night}`;
const occasionId = (night, occasion) => `threads/director/${night}/${occasion}`;
export const visitId = (id, night) => `threads/visited/${id}/night-${night}`;

export function directThreads(threads, context, occasion) {
  const {world, holds = NO_HOLDS, view = {}, placeAt, allowsCast, startsEffects} = context;
  const {night, marks, stocks} = world.ledger;
  const {lastNight, outingAvailable = true} = view;
  if (isHeld(holds, 'signs') || (Number.isFinite(lastNight) && night >= lastNight) || marks.includes(occasionId(night, occasion))) return [];

  const records = threads.map(thread => ({thread, record: world.open.threads[thread.id]}));
  const started = records.filter(({record}) => record);
  const start = world.open.journal.findLast(row => row.type === 'thread' && row.before === null &&
    started.some(({thread}) => thread.id === row.key));
  const latest = start ? started.find(({thread}) => thread.id === start.key)
    : started.reduce((last, entry) => !last || entry.record.began >= last.record.began ? entry : last, null);
  const full = started.filter(({thread, record}) => isSignAlive(thread, record, night)).length >= 2;
  const inMission = started.some(({thread, record}) => !record.end && thread.beats[record.beat]?.mission);
  const ready = [];
  const effects = [];
  for (const {thread, record} of records) {
    if (record || (Number.isFinite(lastNight) && night + (thread.sign.nightsNeeded ?? 1) > lastNight)) continue;
    const outing = Object.values(thread.beats).some(beat => beat.mission?.outing);
    if (Number.isFinite(lastNight) && outing && (stocks.embers <= 1 || !outingAvailable)) continue;
    const rule = threadRule(thread, context);
    const cast = castThread(thread, world, {ask: rule.ask, placeAt, allows: allowsCast});
    if (!cast || !rule.ask(thread.starts.when, cast)) continue;
    effects.push(mark(eligibleId(thread.id, night)));
    if (full || (inMission && thread.beats[firstBeat(thread)].mission) || thread.kind === latest?.thread.kind ||
      started.some(entry => !entry.record.end && entry.thread.kind === thread.kind)) continue;
    const prefix = `${thread.id}/director/eligible-`;
    ready.push({id: thread.id, thread, cast, weight: 1 + marks.filter(id => id.startsWith(prefix) && id !== eligibleId(thread.id, night)).length});
  }
  const selected = weightedPick(world.seed, `threads/director/night-${night}/${occasion}`, ready, row => row.weight);
  if (selected) {
    const {thread, cast} = selected;
    effects.push({type: 'thread', id: thread.id, to: firstBeat(thread), cast}, ...(startsEffects?.(thread, cast) ?? []));
  }
  if (!effects.length) return [];
  const id = occasionId(night, occasion);
  return [{id, effects: [...effects, mark(id)]}];
}

export function applyThreadDirector(threads, context, occasion) {
  return directThreads(threads, context, occasion).reduce((world, choice) => applyEffects(world, choice).world, context.world);
}
