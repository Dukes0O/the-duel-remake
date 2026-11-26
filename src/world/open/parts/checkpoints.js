// OPEN-CHECKPOINTS: a crossing, the one encounter it may bring, and the way home from a wreck.
import {isHeld} from '../holds.js';
import {isTrue} from '../facts.js';
import {OPEN_CHECKPOINTS, drawCheckpoint, friendlyCamps, gap, isArmed} from '../checkpoint-rule.js';
import {startEncounter, stepEncounter, stepRecovery} from '../encounter-rule.js';

const REST_NIGHT = 'checkpoint/rest-night-';
function hearthBanked(world, events) {
  return events?.some(event => event.type === 'hearthBanked') ||
    world.open.resting.length > 0 && world.ledger.marks.some(mark => mark.startsWith(REST_NIGHT)) &&
    !isTrue({fact: 'mark', id: REST_NIGHT + world.ledger.night}, world);
}

function recoveryNumber(world, previous = 0) {
  const prefix = 'checkpoint/night-' + world.ledger.night + '/recovery-';
  return 1 + world.open.journal.reduce((latest, change) => {
    if (change.type === 'summary' || !change.choiceId.startsWith(prefix)) return latest;
    const number = Number(change.choiceId.slice(prefix.length).split('/')[0]);
    return Math.max(latest, number);
  }, previous);
}

export const checkpointsPart = {
  id: 'checkpoints',
  step(state, context, dt) {
    const {world, holds, view} = context;
    if (view.checkpointsEnabled !== true) return;
    const point = view.carPosition;
    const inside = !view.onFoot && point ? OPEN_CHECKPOINTS.find(row => gap(row.position, point) <= row.radius) : null;
    const next = {...state, inside: inside?.id ?? null, interact: view.interact === true};
    const held = isHeld(holds, 'checkpoints');
    const banked = hearthBanked(world, view.jobEvents);
    const current = {...context, view: {...view, player: view.player?.position ?? view.player,
      recoveryPaid: view.recoveryPaid || (context.events ?? []).some(event => event.type === 'threadMissionRecoveryPaid'),
      interactWasHeld: state.interact, hearthBanked:banked}};
    const choices = [], requests = [];
    if (banked)
      choices.push({id: 'checkpoint/bank/' + world.ledger.night, effects: [{type: 'rest', clear: true}]});
    const camps = () => friendlyCamps(world, view.checkpointSites);
    const encounter = state.encounter ?? view.road?.external;
    if (encounter) {
      const out = stepEncounter(encounter, current, dt, held && !encounter.external);
      next.encounter = out.encounter;
      choices.push(...(out.choices ?? []));
      requests.push(...(out.requests ?? []));
    }
    if (!held && (state.recovery || view.combatWrecking)) {
      if (!state.recovery) next.recoveries = recoveryNumber(world, state.recoveries);
      const out = stepRecovery(state.recovery, current, view.combatWrecking && !state.recovery ? camps() : [], next.recoveries);
      next.recovery = out.recovery;
      choices.push(...(out.choices ?? []));
      requests.push(...(out.requests ?? []));
      return {state: next, choices, requests};
    }
    if (held || banked || encounter || !inside || inside.id === state.inside) return {state: next, choices, requests};
    const friendly = camps();
    if (!isArmed(inside, world, friendly)) return {state: next, choices, requests};
    const number = (world.open.crossings[inside.id] ?? 0) + 1;
    const effects = [{type: 'crossing', checkpoint: inside.id}];
    const draw = drawCheckpoint(inside, world, number, {difficulty: view.difficulty, camps: friendly});
    if (draw) {
      effects.push({type: 'rest', checkpoint: inside.id}, {type:'mark', id:REST_NIGHT + world.ledger.night});
      const {encounter, requests: start} = startEncounter(inside, number, draw, {...point, heading: view.checkpointHeading ?? point.heading});
      next.encounter = encounter;
      requests.push(...start);
    }
    choices.push({id: 'checkpoint/' + inside.id + '/crossing-' + number, effects});
    return {state: next, choices, requests};
  },
};
