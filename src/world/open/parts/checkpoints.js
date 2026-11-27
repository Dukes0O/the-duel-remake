// OPEN-CHECKPOINTS: a crossing, the one encounter it may bring, and the way home from a wreck.
import {isHeld} from '../holds.js';
import {isTrue} from '../facts.js';
import {OPEN_CHECKPOINTS, drawCheckpoint, friendlyCamps, gap, isArmed} from '../checkpoint-rule.js';
import {startEncounter, stepEncounter, stepRecovery} from '../encounter-rule.js';
import {haulerStop, haulerMarked} from '../content/stranded-hauler-places.js';
import hauler from '../../../story/threads/content/stranded-hauler.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';

// The `later` rows Sump's rider says at a checkpoint, each asking only facts of the land.
const RIDER_ROWS = [burnedCamp].flatMap(thread => (thread.later ?? []).filter(row => row.by === 'sumps-rider')
  .map(row => ({thread, row})));

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
    const {world, holds, view, events = []} = context;
    if (view.checkpointsEnabled !== true) return;
    const point = view.carPosition;
    const inside = !view.onFoot && point ? OPEN_CHECKPOINTS.find(row => gap(row.position, point) <= row.radius) : null;
    const next = {...state, inside: inside?.id ?? null, interact: view.interact === true};
    const held = isHeld(holds, 'checkpoints');
    const banked = hearthBanked(world, view.jobEvents);
    const current = {...context, view: {...view, player: view.player?.position ?? view.player,
      recoveryPaid: view.recoveryPaid || events.some(event => event.type === 'threadMissionRecoveryPaid'),
      interactWasHeld: state.interact, hearthBanked:banked}};
    const choices = [], requests = [];
    // A player taken to a pen after a lost fight is not towed home (OPEN-BURNED-PEN).
    const missionLoss = events.find(event => event.type === 'threadMissionTaken' || event.type === 'threadMissionOutcome' &&
      event.id.startsWith(hauler.id + '/') && ['lost', 'caught', 'car-wrecked'].includes(event.outcome));
    if (missionLoss) next.missionLossPaid = true;
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
    if (!held && !missionLoss && (state.recovery || view.combatWrecking && !view.deferCheckpointRecovery)) {
      if (!state.recovery) next.recoveries = recoveryNumber(world, state.recoveries);
      const out = stepRecovery(state.recovery, current, view.combatWrecking && !state.recovery ? camps() : [], next.recoveries);
      if (next.missionLossPaid) out.choices = out.choices?.map(choice => ({...choice,
        effects: choice.effects.filter(effect => effect.type !== 'scrap')}));
      next.recovery = out.recovery;
      if (!view.combatWrecking && !out.recovery) next.missionLossPaid = false;
      choices.push(...(out.choices ?? []));
      requests.push(...(out.requests ?? []));
      return {state: next, choices, requests};
    }
    if (held || banked || encounter || !inside || inside.id === state.inside) return {state: next, choices, requests};
    const haulerRecord = world.open.threads[hauler.id];
    if (haulerRecord && !haulerRecord.end && !['between', 'gate'].includes(haulerRecord.beat) &&
        haulerStop(world)?.checkpoint === inside.id) return {state: next, choices, requests};
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
      if (draw.group === 'road-rats' && haulerMarked(world, 'paid-the-trap') && !haulerMarked(world, 'said/rats-remember-the-payer')) {
        requests.push({type: 'say', lineId: 'open/hauler/remembered-payer',
          text: "Sump's rider: " + hauler.later.find(row => row.id === 'rats-remember-the-payer').lines[0].words});
        effects.push({type: 'mark', id: hauler.id + '/said/rats-remember-the-payer'});
      } else if (draw.group === 'road-rats') {
        // Other storylines' ties back that Sump's rider says when the Road Rats are next met at a checkpoint.
        const said = RIDER_ROWS.find(({thread, row}) => isTrue(row.when, world) &&
          !world.ledger.marks.includes(thread.id + '/said/' + row.id));
        if (said) {
          requests.push({type: 'say', lineId: 'open/' + said.thread.id + '/' + said.row.id,
            text: "Sump's rider: " + said.row.lines[0].words});
          effects.push({type: 'mark', id: said.thread.id + '/said/' + said.row.id});
        }
      }
    }
    choices.push({id: 'checkpoint/' + inside.id + '/crossing-' + number, effects});
    return {state: next, choices, requests};
  },
};
