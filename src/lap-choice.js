// Session race length and finishing pay; no storage or race-state mutation.
export const defaultRaceLaps = (stage, mode = 'duel') =>
  mode === 'grandprix' ? stage?.grandPrixLaps ?? 3 : stage?.laps || 2;
export function supportsLapChoice(stage, mode = 'duel') {
  return !!stage && stage.closed !== false && !stage.practice && !stage.arena &&
    !stage.stuntTrial && !['chase','drift','checkpoint'].includes(stage.kind) &&
    ['duel','grandprix'].includes(mode) && (!stage.kind || ['circuit','rally'].includes(stage.kind));
}
// Kyle, 13 October 2026: any length from 2 to 6 laps, plus the event's own default.
export const LAP_CHOICES = Object.freeze([2,3,4,5,6]);
export function offeredRaceLaps(stage, mode = 'duel') {
  const initial = defaultRaceLaps(stage, mode);
  return supportsLapChoice(stage, mode) ? [...new Set([...LAP_CHOICES, initial])].sort((a,b) => a-b) : [initial];
}
export function chosenRaceLaps(stage, mode, requested, enabled = false) {
  return enabled && offeredRaceLaps(stage,mode).includes(requested)
    ? requested : defaultRaceLaps(stage,mode);
}
export const validRaceLaps = (stage, mode, laps) =>
  Number.isSafeInteger(laps) && offeredRaceLaps(stage,mode).includes(laps);
// Pay factor: max(1, km / 8) at the default length or longer. A race shorter than the
// default pays the default's factor scaled by laps / default, so fewer laps never pay the same.
export function raceDistance(stage, laps, mode = 'duel') {
  const kilometres = stage.lengthU * laps / 1000;
  if (!supportsLapChoice(stage,mode)) return {kilometres, multiplier: 1};
  const initial = defaultRaceLaps(stage, mode);
  const factor = km => Math.max(1, km/8);
  return {kilometres, multiplier: laps >= initial ? factor(kilometres)
    : factor(stage.lengthU * initial / 1000) * laps / initial};
}
export function distanceFinishingPay(oldPay, stage, laps, mode, enabled = false) {
  if (!enabled || oldPay <= 0 || !supportsLapChoice(stage,mode) || !validRaceLaps(stage,mode,laps)) return oldPay;
  const {multiplier} = raceDistance(stage,laps,mode);
  if (multiplier === 1) return oldPay;
  const pay = Math.round(oldPay*multiplier/5)*5;
  return laps >= defaultRaceLaps(stage,mode) ? Math.max(oldPay,pay) : Math.max(0,pay);
}
export function raceDistanceLabel(stage, laps, mode) {
  const {kilometres,multiplier} = raceDistance(stage,laps,mode);
  return `${laps} ${laps===1?'lap':'laps'} · ${kilometres.toFixed(1)} km · x${multiplier.toFixed(2)}`;
}
