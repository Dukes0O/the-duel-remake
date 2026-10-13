// Session race length and finishing pay; no storage or race-state mutation.
export const defaultRaceLaps = (stage, mode = 'duel') =>
  mode === 'grandprix' ? stage?.grandPrixLaps ?? 3 : stage?.laps || 2;
export function supportsLapChoice(stage, mode = 'duel') {
  return !!stage && stage.closed !== false && !stage.practice && !stage.arena &&
    !stage.stuntTrial && !['chase','drift','checkpoint'].includes(stage.kind) &&
    ['duel','grandprix'].includes(mode) && (!stage.kind || ['circuit','rally'].includes(stage.kind));
}
export function offeredRaceLaps(stage, mode = 'duel') {
  const initial = defaultRaceLaps(stage, mode);
  return supportsLapChoice(stage, mode) ? [initial, ...[5,10].filter(laps => laps > initial)] : [initial];
}
export function chosenRaceLaps(stage, mode, requested, enabled = false) {
  return enabled && offeredRaceLaps(stage,mode).includes(requested)
    ? requested : defaultRaceLaps(stage,mode);
}
export const validRaceLaps = (stage, mode, laps) =>
  Number.isSafeInteger(laps) && offeredRaceLaps(stage,mode).includes(laps);
export function raceDistance(stage, laps, mode = 'duel') {
  const kilometres = stage.lengthU * laps / 1000;
  return {kilometres, multiplier: supportsLapChoice(stage,mode) ? Math.max(1,kilometres/8) : 1};
}
export function distanceFinishingPay(oldPay, stage, laps, mode, enabled = false) {
  if (!enabled || oldPay <= 0 || !supportsLapChoice(stage,mode) || !validRaceLaps(stage,mode,laps)) return oldPay;
  const {multiplier} = raceDistance(stage,laps,mode);
  return multiplier === 1 ? oldPay : Math.max(oldPay,Math.round(oldPay*multiplier/5)*5);
}
export function raceDistanceLabel(stage, laps, mode) {
  const {kilometres,multiplier} = raceDistance(stage,laps,mode);
  return `${laps} laps · ${kilometres.toFixed(1)} km · x${multiplier.toFixed(2)}`;
}
