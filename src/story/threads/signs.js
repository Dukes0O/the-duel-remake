import {isHeld, NO_HOLDS} from '../../world/open/holds.js';
import {sees} from '../../world/scablands-ways.js';
import {distanceBetween} from './cast.js';
import {firstBeat} from './thread-rule.js';

export const SMOKE_HEIGHT = 95;
export const isFresh = (thread, record, night) => night - record.began < (thread.sign.lastsNights ?? (thread.sign.kind === 'thing' ? Infinity : 1));
export function signRecord(thread, record, world) {
  if (!thread.sign.again) return record;
  const latest = world.open.journal.findLast(row => row.type === 'thread' && row.key === thread.id && row.after?.beat === firstBeat(thread));
  return latest ? {...record, began: latest.night} : record;
}
export function isSignAlive(thread, record, night) {
  if (!isFresh(thread, record, night)) return false;
  if (thread.sign.kind === 'smoke') return true;
  return !record.end && record.beat === firstBeat(thread);
}

export function liveSigns(threads, {world, holds = NO_HOLDS, view = {}, placeAt,
  phase = () => view.partOfDay ?? 'day', contextCall = () => undefined}) {
  if (isHeld(holds, 'signs')) return [];
  return threads.flatMap(thread => {
    const record = world.open.threads[thread.id], {sign} = thread;
    if (!record || !isSignAlive(thread, signRecord(thread, record, world), world.ledger.night) || (sign.part && sign.part !== phase(thread))) return [];
    const at = placeAt(sign.at, record.cast);
    const call = contextCall(thread, world);
    return [{id: thread.id, sign, at, ...(call ? {call} : {})}];
  });
}

export function witnessSign(entry, view, elapsed, dt) {
  if (!entry) return {seconds: 0, witnessed: false};
  const {id, sign, at} = entry;
  const player = view.player?.position ?? view.player;
  if (sign.kind === 'words') return {seconds: 0, witnessed: (view.jobEvents ?? []).some(event =>
    event.type === 'talkChoice' && event.id === `${id}/heard-sign`)};
  const inRange = !at || distanceBetween(player, at) <= (sign.seenWithin ?? Infinity);
  if (sign.kind === 'call') return witnessCall(entry, view, inRange);
  if (sign.kind === 'thing') return witnessThing(entry, view, elapsed, dt);
  if (sign.kind !== 'smoke' || !at || !player || !inRange) return {seconds: 0, witnessed: false};
  const visible = sees(player, at, {heightAt: view.missionHeightAt, eye: view.onFoot ? 1.6 : 2.5, target: SMOKE_HEIGHT * .7});
  const seconds = visible ? elapsed + dt : 0;
  return {seconds, witnessed: seconds >= 3 - 1e-9};
}

export function witnessThing({sign, at}, view, elapsed, dt) {
  const player = view.player?.position ?? view.player;
  const visible = player && at && distanceBetween(player, at) <= (sign.seenWithin ?? Infinity) &&
    sees(player, at, {eye: view.onFoot ? 1.6 : 2.5, target: sign.at?.checkpoint ? 2.8 : 24, heightAt: view.signHeightAt ?? view.missionHeightAt});
  const seconds = visible ? elapsed + dt : 0;
  return {seconds, witnessed: seconds >= 3 - 1e-9};
}

function witnessCall({at, call}, view, inRange) {
  if (!call) return {seconds: 0, witnessed: inRange};
  const car = view.carPosition;
  const witnessed = !!car && !view.onFoot && (call.anywhere || view.onRoad === true && !!at &&
    distanceBetween(at, car) <= call.range && sees(at, car, {
      heightAt: view.signHeightAt ?? view.missionHeightAt, eye: 5, target: 2.5, step: 12,
    }));
  return {seconds: 0, witnessed};
}
