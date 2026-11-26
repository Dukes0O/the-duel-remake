import {isHeld, NO_HOLDS} from '../../world/open/holds.js';
import {sees} from '../../world/scablands-ways.js';
import {distanceBetween} from './cast.js';
import {firstBeat} from './thread-rule.js';

export const SMOKE_HEIGHT = 95;
export const isFresh = (thread, record, night) => night - record.began < (thread.sign.lastsNights ?? 1);
export function isSignAlive(thread, record, night) {
  if (!isFresh(thread, record, night)) return false;
  if (thread.sign.kind === 'smoke') return true;
  return !record.end && record.beat === firstBeat(thread);
}

export function liveSigns(threads, {world, holds = NO_HOLDS, view = {}, placeAt, signFor = thread => thread.sign}) {
  if (isHeld(holds, 'signs')) return [];
  return threads.flatMap(thread => {
    const record = world.open.threads[thread.id], sign = signFor(thread);
    if (!record || !isSignAlive(thread, record, world.ledger.night) || (sign.part && sign.part !== (view.partOfDay ?? 'day'))) return [];
    const at = placeAt(sign.at, record.cast);
    return [{id: thread.id, sign, at,
      ...(sign.points ? {points: sign.points.map(key => placeAt(thread.id + ':' + key, record.cast)).filter(Boolean)} : {})}];
  });
}

function witnessStranger(entry, view) {
  const player = view.player?.position ?? view.player;
  return !!view.onFoot && (entry.points ?? [entry.at]).some(point =>
    distanceBetween(player, point) <= (entry.sign.seenWithin ?? 2.5));
}

export function witnessSign(entry, view, elapsed, dt) {
  if (!entry) return {seconds: 0, witnessed: false};
  const {id, sign, at} = entry;
  const player = view.player?.position ?? view.player;
  if (sign.kind === 'words') return {seconds: 0, witnessed: (view.jobEvents ?? []).some(event =>
    event.type === 'talkChoice' && event.id === `${id}/heard-sign`)};
  if (sign.kind === 'stranger') return {seconds: 0, witnessed: witnessStranger(entry, view)};
  const inRange = !at || distanceBetween(player, at) <= (sign.seenWithin ?? Infinity);
  if (sign.kind === 'call') return {seconds: 0, witnessed: inRange};
  if (sign.kind !== 'smoke' || !at || !player || !inRange) return {seconds: 0, witnessed: false};
  const visible = sees(player, at, {eye: view.onFoot ? 1.6 : 2.5, target: SMOKE_HEIGHT * .7});
  const seconds = visible ? elapsed + dt : 0;
  return {seconds, witnessed: seconds >= 3 - 1e-9};
}
