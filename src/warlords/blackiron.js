import {SAL_FIGHT, resetSawSweep, thinkSawSweep} from './sal.js';
import {DUSTMONGER_FIGHT, resetDustmonger} from './dustmonger.js';
import {MIRAGE_FIGHT, resetMirage} from './mirage.js';
import {GUNN_FIGHT, resetGunn} from './gunn.js';
import {ARSENAL_WEAPONS, WEAPON_IDS} from '../weapon-upgrades.js';
import {startNitroRam, NITRO_RULES} from '../arsenal/nitro-ram.js';
import {carEffect} from '../arsenal/car-effects.js';
import {arenaActor, outOfPlay} from '../combat-teams.js';
import {worldPose} from '../arena/arena-floor.js';
import {arenaCarSpec} from '../arena/arena-pilot.js';
import {arenaFloorSpeed} from '../arena/venues.js';

export const BLACKIRON_RULES = Object.freeze({
  cycle: Object.freeze(['saw', 'dust', 'mirage', 'barrage']),
  cooldownSec: Object.freeze({easy: 8, medium: 7, hard: 6}),
  phaseTwoTellShare: .8,
  nitroWindowSec: 2.5, nitroWindowSpeedShare: .5, nitroWindowDamageShare: 1.5,
  armor: 120,
});
const EPS = 1e-9;
const MOVES = Object.freeze({saw: SAL_FIGHT, dust: DUSTMONGER_FIGHT,
  mirage: MIRAGE_FIGHT, barrage: GUNN_FIGHT});
const data = (actor, name) => ({saw: actor.salSaw, dust: actor.dustVeil,
  mirage: actor.mirage, barrage: actor.gunnBarrage})[name];
const cooldown = duel => BLACKIRON_RULES.cooldownSec[duel.state.cpuDifficulty] ?? 7;

export function resetBlackiron(duel, actor) {
  const old = actor.blackiron;
  if (actor.mirage) resetMirage(duel, actor);
  for (const key of ['salSaw', 'dustVeil', 'mirage', 'gunnBarrage']) delete actor[key];
  actor.blackiron = {index: old?.index ?? 0, move: null, started: false,
    nextSec: Math.max(duel.state.stageTimeSec + cooldown(duel), old?.nextSec ?? 0),
    pairSecond: false};
  actor.weaponLoadout = [...WEAPON_IDS, ...Object.keys(ARSENAL_WEAPONS)];
  actor.combatRoofLook = 'chrome-crown';
  actor.maxArmor = BLACKIRON_RULES.armor; actor.armor = actor.maxArmor;
  actor.arenaTellSec = 0;
  actor.arenaNitroSpentSec = 0; actor.arenaNitroTellSec = 0;
}

function startMove(duel, actor) {
  const sequence = actor.blackiron, now = duel.state.stageTimeSec;
  const cycle = duel.state.arena.warlordPhase === 2
    ? [...BLACKIRON_RULES.cycle, 'nitro'] : BLACKIRON_RULES.cycle;
  sequence.move = cycle[sequence.index % cycle.length];
  sequence.started = false;
  sequence.nextSec = now + cooldown(duel);
  if (sequence.move === 'saw') {resetSawSweep(duel, actor); actor.salSaw.nextSweepSec = now;}
  if (sequence.move === 'dust') {resetDustmonger(duel, actor); actor.dustVeil.nextVeilSec = now;}
  if (sequence.move === 'mirage') {resetMirage(duel, actor); actor.mirage.nextSplitSec = now;}
  if (sequence.move === 'barrage') {
    resetGunn(duel, actor); actor.gunnBarrage.nextBarrageSec = now;
    actor.gunnBarrage.nextSingleSec = Infinity;
  }
}

function finishMove(duel, actor) {
  const sequence = actor.blackiron;
  const phaseTwo = duel.state.arena.warlordPhase === 2;
  if (sequence.move === 'mirage') resetMirage(duel, actor);
  for (const key of ['salSaw', 'dustVeil', 'mirage', 'gunnBarrage']) delete actor[key];
  sequence.index++; sequence.move = null; sequence.started = false;
  actor.arenaTellSec = 0;
  actor.arenaNitroSpentSec = 0; actor.arenaNitroTellSec = 0;
  if (phaseTwo && !sequence.pairSecond) {
    sequence.pairSecond = true;
    sequence.nextSec = duel.state.stageTimeSec;
  } else {
    sequence.pairSecond = false;
    sequence.nextSec = Math.max(sequence.nextSec, duel.state.stageTimeSec);
  }
}

function nitroGoal(duel, actor, difficulty) {
  const move = actor.blackiron, now = duel.state.stageTimeSec;
  const me = worldPose(duel, actor), target = arenaActor(duel, 'player');
  const at = worldPose(duel, target);
  const pace = arenaFloorSpeed(duel.course.def.scrapdome,
    arenaCarSpec(duel, actor).topSpeed) * difficulty.pace;
  if (!move.started) {
    if (Math.hypot(at.x - me.x, at.z - me.z) > NITRO_RULES.cpuRange) return null;
    move.started = true; move.stage = 'tell';
    move.untilSec = now + difficulty.tellSec * BLACKIRON_RULES.phaseTwoTellShare;
    move.heading = Math.atan2(at.x - me.x, at.z - me.z);
    actor.arenaTellSec = move.untilSec - now;
    actor.arenaNitroTellSec = actor.arenaTellSec;
    duel._callout('NITRO RAM!', actor.arenaTellSec + .4);
    duel.emit({arenaTell: {id: actor.arenaId, targetId: 'player', seconds: actor.arenaTellSec,
      cue: 'warlord.nitroTell',
      position: {x: me.x, y: duel.course.groundAt(actor.s, actor.lateral).y, z: me.z}}});
  }
  if (move.stage === 'tell') {
    actor.arenaTellSec = Math.max(0, move.untilSec - now);
    if (now + EPS >= move.untilSec) {
      startNitroRam(duel, actor);
      move.stage = 'ram'; move.untilSec = now + NITRO_RULES.duration;
      actor.arenaTellSec = 0;
      actor.arenaNitroTellSec = 0;
    }
  } else if (move.stage === 'ram' && (!carEffect(actor, 'nitro') || now + EPS >= move.untilSec)) {
    move.stage = 'window'; move.untilSec = now + BLACKIRON_RULES.nitroWindowSec;
    duel._callout("HE'S OUT OF NITRO. HIT HIM!", BLACKIRON_RULES.nitroWindowSec);
    duel.emit({arsenalCue: 'warlord.nitroSpent', warlordMove: true, actor,
      hitPosition: {x: me.x, y: duel.course.groundAt(actor.s, actor.lateral).y, z: me.z}});
  } else if (move.stage === 'window' && now + EPS >= move.untilSec) {
    finishMove(duel, actor); return null;
  }
  actor.arenaNitroSpentSec = move.stage === 'window' ? Math.max(0, move.untilSec - now) : 0;
  const window = move.stage === 'window';
  return {x: me.x + Math.sin(move.heading) * 40, z: me.z + Math.cos(move.heading) * 40,
    speedMph: pace * (window ? BLACKIRON_RULES.nitroWindowSpeedShare : move.stage === 'tell' ? .6 : 1),
    ...(window ? {speedCapMph: arenaFloorSpeed(duel.course.def.scrapdome,
      arenaCarSpec(duel, actor).topSpeed) * BLACKIRON_RULES.nitroWindowSpeedShare} : {}),
    boost: false};
}

export function thinkBlackiron(duel, participant, actor, difficulty) {
  if (!actor.blackiron) resetBlackiron(duel, actor);
  if (outOfPlay(duel, actor) || outOfPlay(duel, duel.state)) {
    if (actor.blackiron.move === 'mirage') resetMirage(duel, actor);
    for (const key of ['salSaw', 'dustVeil', 'mirage', 'gunnBarrage']) delete actor[key];
    actor.blackiron.move = null;
    actor.arenaTellSec = 0; actor.arenaNitroSpentSec = 0; actor.arenaNitroTellSec = 0;
    return null;
  }
  const sequence = actor.blackiron, now = duel.state.stageTimeSec;
  if (!sequence.move) {
    if (now + EPS < sequence.nextSec) return null;
    startMove(duel, actor);
  }
  if (sequence.move === 'nitro') return nitroGoal(duel, actor, difficulty);
  const move = sequence.move, hooks = MOVES[move];
  const tell = (move === 'dust' || move === 'mirage') && duel.state.arena.warlordPhase === 2
    ? {...difficulty, tellSec: difficulty.tellSec * BLACKIRON_RULES.phaseTwoTellShare} : difficulty;
  const goal = move === 'saw' ? thinkSawSweep(duel, participant, actor, tell, {allowCharge: false})
    : move === 'barrage' ? hooks.think(duel, participant, actor, tell, {cue: 'arena.blackiron-barrage'})
    : hooks.think(duel, participant, actor, tell);
  const stage = data(actor, move)?.stage;
  if (stage !== 'idle') {
    sequence.started = true;
    const state = data(actor, move);
    for (const key of ['nextSweepSec', 'nextVeilSec', 'nextSplitSec', 'nextBarrageSec'])
      if (Object.hasOwn(state, key)) state[key] = Infinity;
  }
  if (sequence.started && stage === 'idle') finishMove(duel, actor);
  return goal;
}

export const BLACKIRON_FIGHT = Object.freeze({featureFlag: 'blackiron', fullArsenal: true,
  reset: resetBlackiron, think: thinkBlackiron,
  tellShare: duel => duel.state.arena.warlordPhase === 2 ? .8 : 1,
  mayFire: (duel, actor) => !['barrage', 'nitro'].includes(actor.blackiron?.move),
  mayUseWeapon: (duel, actor, weapon) => weapon !== 'nitro' &&
    MOVES[actor.blackiron?.move]?.mayUseWeapon?.(duel, actor, weapon) !== false,
  attack: (...args) => args[1].blackiron?.move === 'saw' ? SAL_FIGHT.attack(...args) : null,
  onMoveHit: (...args) => SAL_FIGHT.onMoveHit(...args),
  defense: (duel, actor, face) => actor.blackiron?.move === 'nitro' && actor.blackiron.stage === 'window'
    ? BLACKIRON_RULES.nitroWindowDamageShare : MOVES[actor.blackiron?.move]?.defense?.(duel, actor, face) ?? 1,
});
