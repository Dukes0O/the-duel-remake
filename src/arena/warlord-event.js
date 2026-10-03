import {WARLORDS, BUILT_WARLORD_IDS} from '../warlords.js';
import {warlordFight} from '../warlords/index.js';

// Shared warlord format (docs/SCRAPDOME.md section 5). All simulation
// decisions stay here; presentation and rewards read the resulting state.
export const WARLORD_RULES = Object.freeze({
  wrecksToWin: 3, timeLimitSec: 240, suddenDeathSec: 30, armorScale: 1.5,
});

export function startWarlordEvent(duel, {warlordId, ...options} = {}) {
  const warlord = WARLORDS[warlordId];
  if (!warlord || !BUILT_WARLORD_IDS.includes(warlordId)) return false;
  // A warlord fights alone, or as a team of cars (`team`), each on its own.
  const team = warlord.team ?? [{car: warlord.car, brain: warlord.brain}];
  if (!duel.startArenaEvent({...options, venueId: 'scrapdome', mode: 'warlord',
      opponents: team.map(({car, brain}) => ({car, brain}))})) return false;
  const state = duel.state, arena = state.arena;
  arena.warlordId = warlordId;
  arena.warlordPhase = 1;
  arena.warlordBossId = 'cpu-1';
  // Only a team warlord records its cars; a lone warlord's arena state is unchanged.
  if (warlord.team) arena.warlordTeamIds = team.map((_, index) => `cpu-${index + 1}`);
  arena.phase = 'intro';
  arena.participants.slice(1).forEach((participant, index) => {
    participant.team = `warlord:${warlordId}`;
    participant.name = (team[index].name ?? warlord.name).toUpperCase();
  });
  for (const actor of state.opponents) {
    actor.warlordId = warlordId;
    actor.maxArmor *= warlord.armorScale ?? WARLORD_RULES.armorScale;
    actor.armor = actor.maxArmor;
    warlordFight(duel, actor)?.reset?.(duel, actor);
  }
  state.status = 'warlord_intro';
  duel.emit({warlordIntro: {warlordId}});
  return true;
}

export function beginWarlordEvent(duel) {
  const state = duel.state, arena = state.arena;
  if (state.status !== 'warlord_intro' || arena?.mode !== 'warlord' ||
      arena.phase !== 'intro') return false;
  arena.phase = 'countdown';
  state.countdown = 3;
  state.status = 'countdown';
  duel.emit({countdown: 3});
  return true;
}

// The sum of a count over a car's whole team, decoy copies excluded.
export function teamTotal(arena, participant, field) {
  return arena.participants.filter(other => !other.decoy && (other.team ?? other.id) === (participant.team ?? participant.id))
    .reduce((sum, other) => sum + (other[field] || 0), 0);
}

// Called once when the arena credits a wreck, before respawning anyone.
export function noteWarlordWreck(duel, victim, credited) {
  const arena = duel.state.arena;
  if (arena.mode !== 'warlord') return null;
  // Phase two starts once the warlord's side has been wrecked enough times
  // (the first wreck by default; a team may need more).
  if ((arena.warlordTeamIds ?? [arena.warlordBossId]).includes(victim.id) && arena.warlordPhase === 1 &&
      teamTotal(arena, victim, 'wrecked') >= (WARLORDS[arena.warlordId]?.phaseTwoWrecks ?? 1)) {
    arena.warlordPhase = 2;
    duel.emit({warlordPhase: {warlordId: arena.warlordId, phase: 2}});
  }
  if (arena.phase === 'sudden-death') {
    const winner = arena.participants.find(participant => !participant.decoy &&
      participant.team !== victim.team);
    return {winnerId: winner.id, reason: 'sudden-death'};
  }
  // Wrecks count for the whole team: either of a pair may score the third.
  if (credited && teamTotal(arena, credited, 'wrecks') >= WARLORD_RULES.wrecksToWin)
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
        teamTotal(arena, participant, 'damageDealt') > teamTotal(arena, best, 'damageDealt') ? participant : best);
      return {winnerId: winner.id, reason: 'damage'};
    }
  }
  return null;
}
