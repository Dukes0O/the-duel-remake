import {applyChoice} from '../../story/ledger.js';
import {night2Banked} from '../jobs/night-2.js';
import {GAS_ROUTINE, ROUTINES, learnerOf} from './content/routines.js';
import {isTrue} from './facts.js';
import {routineDraw} from './routine-rule.js';

const GAS_PER_EMBER = 20;
const empty = handRuns => ({handRuns, offered: false, offeredNight: null, refusedNight: null, learner: null,
  lessonPending: false, startAfterLesson: false, share: null, lessonLoad: null, running: false, handNight: null, deliveredNight: null,
  tally: {runs: 0, gas: 0, embers: 0}, lastDelivery: null, trouble: null});

export function routineFor(world, row = GAS_ROUTINE) {
  // An old record can already carry a learner. Leave it intact until the
  // authored opening night has finished.
  if (!night2Banked(world.ledger)) return empty(0);
  const saved = world.open.routines?.[row.id];
  const handRuns = world.legacyHandRuns ?? 0;
  if (!saved) return empty(handRuns);
  // Older open records used an optional example row with a gas-only tally.
  if (typeof saved.tally === 'number') return {...empty(handRuns), ...saved,
    tally: {runs: 0, gas: saved.tally, embers: 0}};
  return saved.handRuns >= handRuns ? saved : {...saved, handRuns};
}

export function keepRoutine(world, record, row = GAS_ROUTINE) {
  if (!night2Banked(world.ledger)) return world;
  return {...world, open: {...world.open, routines: {...world.open.routines, [row.id]: record}}};
}

export function willingLearners(world, row = GAS_ROUTINE) {
  const {learner} = row;
  const known = routineFor(world, row).learner;
  return [...learner.people.filter(person => person.id === known || isTrue(learner.where, world, {of: person.of}) ||
    isTrue({fact: 'word', of: person.id, atLeast: 'Friendly'}, world)), learner.otherwise];
}

// A bank burns fuel but is not a loss to ransom, theft or a raid. The town
// stays short from that loss until the next change to the store outside the bank.
export function shortAfterLoss(world) {
  if (world.ledger.stocks.embers > 1) return false;
  const loss = world.ledger.history.findLast(change => change.type === 'stock' && change.key === 'embers' &&
    typeof change.choiceId === 'string' && !change.choiceId.startsWith('bank/'));
  return !!loss && loss.after < loss.before &&
    /(?:^|[/-])(?:ransom|theft|raid)(?:$|[/-])/.test(loss.choiceId);
}

export function mayOfferRoutine(world, row = GAS_ROUTINE) {
  const kept = routineFor(world, row);
  if (kept.running || kept.lessonPending || kept.handRuns < row.handRunsFirst) return false;
  if (kept.refusedNight !== null) return world.ledger.night - kept.refusedNight >= 3;
  return shortAfterLoss(world) || (!kept.learner && kept.handRuns >= 3);
}

export function answerRoutine(world, id, row = GAS_ROUTINE) {
  if (!mayOfferRoutine(world, row)) return world;
  const record = {...routineFor(world, row), offered: true, offeredNight: world.ledger.night};
  if (id === 'not-yet') return keepRoutine(world, {...record, refusedNight: world.ledger.night}, row);
  const person = willingLearners(world, row).find(learner => learner.id === id);
  if (!person) return world;
  const changedLearner = record.learner !== id;
  return keepRoutine(world, {...record, learner: id, lessonPending: true, startAfterLesson: true, refusedNight: null,
    ...(changedLearner ? {share: null, lessonLoad: null, lastDelivery: null} : {})}, row);
}

export function showRoutineOffer(world, row = GAS_ROUTINE) {
  const record = routineFor(world, row);
  if (!mayOfferRoutine(world, row) || record.offeredNight === world.ledger.night) return world;
  return keepRoutine(world, {...record, offered: true, offeredNight: world.ledger.night}, row);
}

export function takeHandRun(world, {teach = false} = {}, row = GAS_ROUTINE) {
  const record = routineFor(world, row);
  if (record.deliveredNight === world.ledger.night) return world;
  return keepRoutine(world, {...record, handNight: world.ledger.night,
    lessonPending: record.lessonPending || (teach && !!record.learner)}, row);
}

export function setRoutineRunning(world, running, row = GAS_ROUTINE) {
  const record = routineFor(world, row);
  if (record.share === null || record.running === running) return world;
  return keepRoutine(world, {...record, running}, row);
}

// The kiln uses the whole stock, carries the remainder, and posts one net
// change for each stock. The delivery itself is kept whole in the tally.
function kiln(world, gas, choice) {
  const before = world.ledger.stocks.gas;
  const stock = before + gas;
  const embers = Math.floor(stock / GAS_PER_EMBER);
  const remainder = stock % GAS_PER_EMBER;
  const {ledger} = applyChoice(world.ledger, {id: choice, effects: [
    {type: 'stock', stock: 'gas', by: remainder - before},
    {type: 'stock', stock: 'embers', by: embers},
  ]});
  return {world: {...world, ledger}, embers};
}

const learnedLoad = lesson => Math.floor(lesson.lessonLoad * lesson.share);

export function arriveHandRun(world, {load, clean, passenger}, row = GAS_ROUTINE) {
  const record = routineFor(world, row);
  const night = world.ledger.night;
  if (!night2Banked(world.ledger) || record.deliveredNight === night ||
      !Number.isSafeInteger(load) || load < 0 || load > row.fullLoad) return {world};
  const baked = kiln(world, load, 'routine/' + row.id + '/hand');
  let next = {...record, handRuns: record.handRuns + 1, handNight: night, deliveredNight: night};
  if (record.lessonPending && passenger && passenger === record.learner && learnerOf(row, passenger)) {
    const [low, high] = row.share;
    const middle = (low + high) / 2;
    const draw = routineDraw(world.ledger.seed, 'routine/' + row.id + '/' + passenger + '/night-' + night);
    const share = clean ? middle + (high - middle) * draw : low + (middle - low) * draw;
    const lesson = {lessonLoad: load, share};
    const better = record.share === null || learnedLoad(lesson) > learnedLoad(record) ||
      (learnedLoad(lesson) === learnedLoad(record) && load * share > record.lessonLoad * record.share);
    next = {...next, ...(better ? lesson : {}), lessonPending: false, startAfterLesson: false,
      running: record.startAfterLesson === true || record.share === null || record.running};
  }
  return {world: keepRoutine(baked.world, next, row), embers: baked.embers};
}

export function runBankedRoutines(world, {held = false} = {}) {
  if (held || !night2Banked(world.ledger)) return world;
  for (const row of ROUTINES) {
    const record = routineFor(world, row);
    const night = world.ledger.night;
    if (!record.running || record.trouble || record.share === null || record.handNight === night ||
        record.lastDelivery?.night === night) continue;
    const gas = learnedLoad(record);
    const baked = kiln(world, gas, 'routine/' + row.id + '/learner');
    const lastDelivery = {night, gas, embers: baked.embers, byHand: record.lessonLoad,
      handEmbers: Math.floor((world.ledger.stocks.gas + record.lessonLoad) / GAS_PER_EMBER)};
    world = keepRoutine(baked.world, {...record, lastDelivery, tally: {runs: record.tally.runs + 1,
      gas: record.tally.gas + gas, embers: record.tally.embers + baked.embers}}, row);
  }
  return world;
}

export function morningDelivery(world, row = GAS_ROUTINE) {
  const record = routineFor(world, row);
  return record.lastDelivery?.night === world.ledger.night - 1 ? record.lastDelivery : null;
}
