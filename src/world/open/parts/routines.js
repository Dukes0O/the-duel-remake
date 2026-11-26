import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {firstHearthTalk, hearthTalk, learnerTalk, morningLine, mossTalk, routineOffer, ROUTINE_CUES,
  shortStoreLine} from '../../../story/scenes/routine-offer.js';
import {GAS_ROUTINE, learnerOf} from '../content/routines.js';
import {answerRoutine, mayOfferRoutine, morningDelivery, routineFor, setRoutineRunning, shortAfterLoss,
  showRoutineOffer, takeHandRun} from '../routine-run-rule.js';
import {isHeld} from '../holds.js';
import {favoursOf} from '../open-record.js';

const prefix = 'open/routine/';
const range = 2.5;
const near = (a, b) => a && b && Math.hypot(a.x - b.x, a.z - b.z) <= range;
const request = (kind, speaker, scene) => ({
  type: 'talk', id: prefix + kind, speaker, scene, asked: [], ...(['bank', 'offer', 'morning', 'short'].includes(kind) ? {at: NIGHT_2_SITES.hearthFront.position} : {}),
});
const simple = line => ({lines: [line], choices: [], autoAdvance: true});

export const routinesPart = {
  id: 'routines',
  step(previous, {world, view, holds, leave}) {
    if (!view.openRoam || view.dayClock !== true || leave) return;
    const state = {...previous, held: !!view.interact};
    const requests = [], choices = [], events = [];
    const {partOfDay, jobEvents = [], people = []} = view;
    const feet = view.onFoot ? view.fighter?.position : null;
    const atHearth = near(feet, NIGHT_2_SITES.hearthFront.position);
    const evening = partOfDay === 'dusk' || partOfDay === 'dark';
    const interact = feet && state.held && !previous.held;
    const record = routineFor(world), person = learnerOf(GAS_ROUTINE, record.learner);
    const canRun = world.routineRoads?.length && record.deliveredNight !== world.ledger.night &&
      (view.outingAvailable || record.handNight === world.ledger.night);

    const change = (id, after, effects = []) => {
      const updated = routineFor(after);
      if (after !== world) choices.push({id: prefix + id, effects: [
        {type: 'routine', id: GAS_ROUTINE.id, record: updated}, ...effects,
      ]});
    };
    const talk = (kind, speaker, scene) => {
      state.talk = prefix + kind;
      requests.push(request(kind, speaker, scene));
      events.push({type: 'routineInteraction'});
    };

    if (state.talk) {
      if (jobEvents.some(event => event.type === 'openTalkSkipped' && event.scene === state.talk)) {
        if (state.talk === prefix + 'offer') state.offerThisVisit = false;
        if (state.talk === prefix + 'morning') state.morning = false;
        if (state.talk === prefix + 'short') state.short = false;
        state.talk = null;
        return {state};
      }
      const outcome = jobEvents.find(event => event.type === 'talkChoice' && event.scene === state.talk);
      const closed = jobEvents.some(event => event.type === 'openTalkClosed' && event.scene === state.talk);
      if (outcome) {
        const kind = state.talk.slice(prefix.length), {id} = outcome;
        state.talk = null;
        if (kind === 'bank' && id === 'bank' && atHearth && evening && world.ledger.night > 2 && !view.missionActive)
          return {state, leave: {to: 'hearth-bank', night: world.ledger.night}};
        if (kind === 'offer') {
          const learner = id.startsWith('teach/') && learnerOf(GAS_ROUTINE, id.slice(6));
          const owes = learner?.of && learner.id !== record.learner && favoursOf(world, learner.of) > 0;
          change(id, answerRoutine(world, learner ? learner.id : id),
            owes ? [{type: 'favour', person: learner.of, by: -1}] : []);
        }
        if (kind === 'learner' && (id === 'start' || id === 'stop'))
          change(id, setRoutineRunning(world, id === 'start'));
        if (kind === 'moss' && id === 'wash') events.push({type: 'askMossForWash'});
        if (kind === 'moss' && canRun && !view.missionActive && ['long', 'boneyard', 'teach-long'].includes(id)) {
          change('take-bess', takeHandRun(world, {teach: id === 'teach-long'}), [{type: 'outing'}]);
          return {state, choices, leave: {to: 'gas-run', road: id === 'boneyard' ? id : 'long'}};
        }
      } else if (closed) {
        if (state.talk === prefix + 'offer') change('offer', showRoutineOffer(world));
        state.talk = null;
      }
      return {state, choices, events};
    }
    if (!feet || isHeld(holds, 'routines') || view.missionActive) return {state};

    const arrival = morningDelivery(world);
    if (atHearth && partOfDay === 'dawn' && person && arrival && !state.morning) {
      state.morning = true;
      talk('morning', 'cinder', simple(morningLine(person, arrival)));
      events.push({type: 'threadCue', id: 'routine-home', cue: ROUTINE_CUES.home});
    } else if (atHearth && (interact || (evening && !state.offerThisVisit && record.offeredNight !== world.ledger.night)) &&
        mayOfferRoutine(world)) {
      state.offerThisVisit = true;
      talk('offer', 'cinder', routineOffer(world, view.playerName ?? 'Driver'));
    } else if (atHearth && (evening || interact) && person && record.running && shortAfterLoss(world) && !state.short) {
      state.short = true;
      talk('short', 'cinder', simple(shortStoreLine(person)));
    } else if (interact && atHearth && evening) {
      talk('bank', 'auntie-solder', world.ledger.night > 2 ? hearthTalk : firstHearthTalk);
    } else if (interact && person && record.share !== null &&
        near(feet, people.find(row => row.id === person.id)?.position)) {
      talk('learner', person.id, learnerTalk(record));
    } else if (interact && canRun && near(feet, people.find(row => row.id === 'moss')?.position)) {
      talk('moss', 'moss', mossTalk(world));
    }
    return {state, requests, events, choices};
  },
};
