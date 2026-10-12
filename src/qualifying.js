// Optional two-lap Grand Prix session. Uses normal controls and lap gates.
// The completed session stays on state for the Team Room's practice accounting.
import { DRIVE, LIVES } from './config.js';
import { racingLineFor } from './race-lines.js';
import { freshDamageZones } from './sim-common.js';
import { runtimeOf } from './race-field-driver.js';
import { gridPose, updateOrder } from './race-field.js';

export function qualifyingGrid(bestLapSec, computerTimes) {
  const rows = computerTimes.map(row => ({...row, you: false}));
  rows.push({id: 'player', name: 'YOU', you: true, timeSec: bestLapSec});
  rows.sort((a,b) => a.timeSec - b.timeSec || Number(a.you) - Number(b.you) || a.id.localeCompare(b.id));
  return rows.map((row,slot) => ({...row, slot}));
}

export function beginQualifying(duel) {
  const s = duel.state;
  if (s.qualifying?.phase !== 'pending' || !s.field) return false;
  const computerTimes = s.opponents.map(racer => {
    const {profile} = runtimeOf(duel, racer);
    let timeSec = 0;
    for (const mph of profile.mph) timeSec += profile.step / (Math.max(1, mph) * DRIVE.mphToWorld);
    return {id: racer.id, name: racer.name, timeSec: +timeSec.toFixed(3)};
  });
  s.qualifying = {phase: 'driving', computerTimes, defaultSlot: s.field.playerSlot,
    fieldSize: s.opponents.length, lapTimes: [], practiceLaps: 0, bestLapSec: null, grid: null};
  s.opponents = [];
  duel.rivalSpec = null;
  delete s.field;
  s.lapsTotal = 2;
  const exit = duel.course.pitLane?.exit;
  // Claude 11 October: circuits without pits start on the racing line at
  // 80 km/h. Spawn just before it so a native crossing arms the clock.
  const hasPit = Number.isFinite(exit);
  const startS = hasPit ? exit : duel.course.length - 6;
  const line = racingLineFor(duel.course);
  s.s = s.prevS = startS;
  s.lateral = s.prevLateral = hasPit ? 0 : line.offsetAt(startS);
  s.headingError = hasPit ? 0 : line.relHeadingAt(startS);
  s.nextLapGate = duel._lapGates.filter(gate => gate <= Math.max(0, startS)).length;
  s.speedMph = 80 / 1.609344;
  s.gear = duel.car.gears.findIndex(limit => limit > s.speedMph);
  if (s.gear < 0) s.gear = duel.car.gears.length - 1;
  s.revs = s.speedMph / duel.car.gears[s.gear];
  s.qualifying.timing = 'approach';
  s.countdown = 0;
  s.status = 'racing';
  s.practice = true;
  s.timeLimitSec = s.timeRemaining = s.parTimeSec = null;
  duel._callout('QUALIFYING / CROSS THE LINE / TWO FLYING LAPS', 6);
  return true;
}

export function applyQualifyingGrid(duel) {
  const s = duel.state, q = s.qualifying;
  if (q?.phase !== 'complete' || !s.field || !q.grid) return false;
  const gridSetback = duel.course.def.gridSetback ?? 0;
  for (const row of q.grid) {
    const actor = row.you ? s : s.opponents.find(racer => racer.id === row.id);
    if (!actor) continue;
    const pose = gridPose(row.slot);
    actor.s = actor.prevS = pose.s + gridSetback;
    actor.lateral = actor.prevLateral = pose.lateral;
    if (row.you) s.field.playerSlot = row.slot;
    else actor.field.slot = row.slot;
  }
  updateOrder(duel);
  s.field.lastPosition = s.field.position;
  return true;
}

export function finishQualifying(duel) {
  const s = duel.state, q = s.qualifying;
  if (q?.phase !== 'driving' || q.timing !== 'timed' || s.completedLaps < 2) return false;
  const lapTimes = s.lapTimes.slice(0,2);
  const valid = lapTimes.filter((time,index) => Number.isFinite(time) && time > 0 && !s.assistedLaps[index]);
  q.phase = 'complete';
  q.lapTimes = lapTimes;
  q.assistedLaps = s.assistedLaps.slice(0,2);
  q.practiceLaps = Math.min(2, s.completedLaps);
  q.bestLapSec = valid.length ? Math.min(...valid) : null;
  q.grid = q.bestLapSec == null ? null : qualifyingGrid(q.bestLapSec, q.computerTimes);
  q.playerSlot = q.grid?.find(row=>row.you).slot ?? q.defaultSlot;
  // Carry no practice damage, elapsed time or style points into the race.
  s.lives = LIVES.start;
  s.majorCrashes = 0;
  s.catastrophic = false;
  s.damageZones = freshDamageZones();
  s.boundaryResets = s.score = s.nearMisses = s.totalTimeSec = s.penaltySec = 0;
  s.opponentCount = q.fieldSize;
  duel._loadStage(s.stageIndex);
  duel._callout(q.bestLapSec == null ? 'QUALIFYING / NO VALID LAP / DEFAULT GRID'
    : `QUALIFYING / ${q.bestLapSec.toFixed(3)} SEC / GRID ${q.playerSlot + 1}`, 8);
  duel.emit({qualifyingComplete: {lapTimes: [...q.lapTimes], bestLapSec: q.bestLapSec,
    practiceLaps: q.practiceLaps, gridSlot: q.playerSlot}});
  return true;
}

// The short trip from pit exit to the line does not count as a practice lap.
// Native gates validate that crossing; the same timer then measures full laps.
export function qualifyingLapEvent(duel, event) {
  const s = duel.state, q = s.qualifying;
  if (q?.phase !== 'driving' || event.lapCompleted == null) return event;
  if (q.timing === 'approach') {
    q.timing = 'timed';
    s.s -= duel.course.length;
    s.prevS -= duel.course.length;
    s.completedLaps = 0;
    s.lap = s.currentLap = 1;
    s.lapTimes = [];
    s.assistedLaps = [];
    duel._callout('QUALIFYING / TIMED LAP 1 OF 2', 3);
    return {qualifyingFlyingStart: true};
  }
  q.practiceLaps = s.completedLaps;
  if (s.completedLaps < 2) duel._callout('QUALIFYING / TIMED LAP 2 OF 2', 3);
  return {...event, qualifyingLap: true, practiceLap: true};
}
