import {isTrue} from '../../world/open/facts.js';
import {resolveRoles, fillLine} from '../../world/open/roles.js';
import {distanceBetween} from './cast.js';

export const firstBeat = thread => Object.keys(thread.beats)[0];
export const threadMark = (id, kind, key) => `${id}/${kind}/${key}`;
export const mark = id => ({type: 'mark', id});

export function threadRule(thread, context, record = {}, state = {}) {
  const {world, view = {}, seconds = 0, placeAt} = context;
  const night = world.ledger.night;
  const has = (kind, key) => world.ledger.marks.includes(threadMark(thread.id, kind, key + (state.visit ?? '')));
  const reached = beat => world.open.journal.findLast(row => row.type === 'thread' && row.key === thread.id && row.after.beat === beat);
  const player = view.player?.position ?? view.player;
  const ask = (when, cast = record.cast ?? {}, subject = {}) => {
    if (when === undefined) return true;
    if (when === 'sign-seen') return state.signSeen === true;
    if (when.all) return when.all.every(condition => ask(condition, cast, subject));
    if (when.any) return when.any.some(condition => ask(condition, cast, subject));
    if (when.not) return !ask(when.not, cast, subject);
    if (when.reach !== undefined) return distanceBetween(player, placeAt?.(when.reach, cast)) <= (when.within ?? 40);
    if (when.after !== undefined) return [when.after].flat().some(beat => has('entered', beat) && record.beat !== beat);
    if (when.nights !== undefined) {
      const beat = when.since ?? record.beat;
      const began = reached(beat)?.night ?? (beat === firstBeat(thread) ? record.began : undefined);
      return began !== undefined && night - began >= when.nights;
    }
    if (when.seconds !== undefined) {
      const at = state.beatSeconds?.[when.since ?? record.beat];
      return at !== undefined && seconds - at >= when.seconds;
    }
    if (when.part !== undefined) return (view.partOfDay ?? 'day') === when.part;
    if (when.cast !== undefined) return !!cast[when.cast] && (when.is === undefined || cast[when.cast] === when.is);
    if (when.asked !== undefined) return has('asked', when.asked);
    if (when.found !== undefined && !when.site) return has('found', when.found);
    if (when.chose !== undefined) return has('chose', when.chose);
    if (when.ended !== undefined) return record.end === when.ended;
    if (when.due !== undefined) return world.ledger.obligations.some(item => item.type === 'promise' && item.id === when.due && item.due === night);
    return isTrue(resolveRoles(when, cast), world, {...subject, draw: `${thread.id}/night-${night}`});
  };
  const line = text => fillLine(text, record.cast ?? {});
  const effects = (rows = [], cast = record.cast ?? {}) => rows.filter(row => ask(row.when, cast)).map(({when, ...effect}) => {
    const actual = resolveRoles(effect, cast);
    if (actual.text) actual.text = fillLine(actual.text, cast);
    return actual;
  });
  const next = (to, cast) => Array.isArray(to) ? to.find(row => ask(row.when, cast))?.to : to;
  const move = (to, cast) => {
    const destination = next(to, cast);
    if (!destination && !cast) return [];
    return [{type: 'thread', id: thread.id, ...(thread.ends.includes(destination) ? {end: destination} :
      {to: destination ?? record.beat}), ...(cast ? {cast} : {})}];
  };
  return {ask, line, effects, move, has};
}
