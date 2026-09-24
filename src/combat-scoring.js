import {COMBAT_TUNING} from './wasteland-tuning.js';

const T = COMBAT_TUNING.scoring;
const RESULT_FIELDS = ['hitsLanded', 'wrecksCaused', 'wrecksTaken',
  'knockdowns', 'damageDealt', 'bestCombo', 'combatStyleScore'];

export function initializeCombatScoring(duel) {
  duel.state.combat.scoring = {
    hitsLanded: 0, wrecksCaused: 0, wrecksTaken: 0,
    knockdowns: 0, damageDealt: 0, bestCombo: 0, combatStyleScore: 0,
    combo: 0, comboUntil: 0,
  };
}

function awardStyle(duel, points) {
  const earned = points * duel.scoreMultiplier;
  const state = duel.state;
  state.combat.scoring.combatStyleScore += earned;
  state.stageStyleScore += earned;
  state.score += earned;
}

export function tickCombatScoring(duel) {
  const scoring = duel.state.combat?.scoring;
  if (scoring && duel.state.stageTimeSec >= scoring.comboUntil) scoring.combo = 0;
}

export function recordCombatHit(duel, victim, removed, owner) {
  const state = duel.state, scoring = state.combat?.scoring;
  if (!scoring || owner !== 'player' || !state.opponents.includes(victim) ||
      !(removed > 0)) return;
  if (state.stageTimeSec >= scoring.comboUntil) scoring.combo = 0;
  scoring.combo = Math.min(T.maximumCombo, scoring.combo + 1);
  scoring.comboUntil = state.stageTimeSec + T.comboWindowSeconds;
  scoring.bestCombo = Math.max(scoring.bestCombo, scoring.combo);
  scoring.hitsLanded++;
  scoring.damageDealt += removed;
  awardStyle(duel, T.hitStylePoints * scoring.combo);
}

export function recordCombatWreck(duel, victim, owner) {
  const state = duel.state, scoring = state.combat?.scoring;
  if (!scoring) return;
  if (victim === state) {
    scoring.wrecksTaken++;
  } else if (owner === 'player' && state.opponents.includes(victim)) {
    scoring.wrecksCaused++;
    awardStyle(duel, T.wreckStylePoints);
  }
}

export function combatResultSnapshot(duel) {
  const scoring = duel.state.combat?.scoring;
  if (!scoring) return {};
  const snapshot = Object.fromEntries(RESULT_FIELDS.map(key => [key, scoring[key]]));
  const events = duel.state.combat.notorietyEvents;
  if (Array.isArray(events) && events.length) snapshot.notorietyEvents = events.slice(0, 256);
  return snapshot;
}
