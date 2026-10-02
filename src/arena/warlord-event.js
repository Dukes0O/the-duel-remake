import {WARLORDS, BUILT_WARLORD_IDS} from '../warlords.js';
import {warlordFight} from '../warlords/index.js';

// Shared warlord format (docs/SCRAPDOME.md section 5). All simulation
// decisions stay here; presentation and rewards read the resulting state.
export const WARLORD_RULES = Object.freeze({
  wrecksToWin: 3, timeLimitSec: 240, suddenDeathSec: 30, armorScale: 1.5,
});

export function startWarlordEvent(duel, {warlordId, ...options} = {}) {
  const warlord = WARLORDS[warlordId];
  if (!warlord || !BUILT_WARLORD_IDS.includes(warlordId) ||
      !duel.featureFlags?.enabled('scrapdome') || !duel.featureFlags?.enabled('warlords') ||
      !duel.featureFlags?.enabled('wasteland2')) return false;
  if (!duel.startArenaEvent({...options, venueId: 'scrapdome', mode: 'warlord',
      opponents: [{car: warlord.car, brain: warlord.brain}]})) return false;
  const state = duel.state, arena = state.arena;
  arena.warlordId = warlordId;
  arena.warlordPhase = 1;
  arena.warlordBossId = 'cpu-1';
  arena.phase = 'intro';
  arena.participants.slice(1).forEach(participant => {
    participant.team = `warlord:${warlordId}`;
    participant.name = warlord.name.toUpperCase();
  });
  for (const actor of state.opponents) {
    actor.warlordId = warlordId;
    actor.maxArmor *= WARLORD_RULES.armorScale;
    actor.armor = actor.maxArmor;
    warlordFight(duel, actor)?.reset?.(duel, actor);
  }
  state.status = 'warlord_intro';
  duel.emit({warlordIntro: {warlordId}});
  return true;
}

export function beginWarlordEvent(duel) {
  const state = duel.state, arena = state.arena;
  if (!duel.featureFlags?.enabled('warlords') ||
      state.status !== 'warlord_intro' || arena?.mode !== 'warlord' ||
      arena.phase !== 'intro') return false;
  arena.phase = 'countdown';
  state.countdown = 3;
  state.status = 'countdown';
  duel.emit({countdown: 3});
  return true;
}

// Called once when the arena credits a wreck, before respawning anyone.
export function noteWarlordWreck(duel, victim, credited) {
  const arena = duel.state.arena;
  if (arena.mode !== 'warlord') return null;
  if (victim.id === arena.warlordBossId && arena.warlordPhase === 1) {
    arena.warlordPhase = 2;
    duel.emit({warlordPhase: {warlordId: arena.warlordId, phase: 2}});
  }
  if (arena.phase === 'sudden-death') {
    const winner = arena.participants.find(participant => !participant.decoy &&
      participant.team !== victim.team);
    return {winnerId: winner.id, reason: 'sudden-death'};
  }
  if (credited?.wrecks >= WARLORD_RULES.wrecksToWin)
    return {winnerId: credited.id, reason: 'three-wrecks'};
  return null;
}

export function stepWarlordClock(duel, dt) {
  const arena = duel.state.arena;
  if (arena.phase === 'countdown') {
    arena.phase = 'fight';
    duel.emit({arenaPhase: {phase: 'fight'}});
  }
  if (arena.phase === 'fight') {
    arena.clockSec = Math.min(arena.timeLimitSec, arena.clockSec + dt);
    // Fixed-step sums can land a fraction below the exact deadline.
    if (arena.clockSec + 1e-9 >= arena.timeLimitSec) {
      arena.clockSec = arena.timeLimitSec;
      arena.phase = 'sudden-death';
      duel._callout('SUDDEN DEATH / NEXT WRECK WINS', 3);
      duel.emit({arenaPhase: {phase: 'sudden-death'}});
    }
    return null;
  }
  if (arena.phase === 'sudden-death') {
    arena.suddenDeathSec = Math.min(arena.suddenDeathLimitSec, arena.suddenDeathSec + dt);
    if (arena.suddenDeathSec + 1e-9 >= arena.suddenDeathLimitSec) {
      arena.suddenDeathSec = arena.suddenDeathLimitSec;
      const winner = arena.participants.filter(participant => !participant.decoy).reduce((best, participant) =>
        participant.damageDealt > best.damageDealt ? participant : best);
      return {winnerId: winner.id, reason: 'damage'};
    }
  }
  return null;
}