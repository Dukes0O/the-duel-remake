import {advanceWork, workStageMinutes} from './town-work.js';

const EASY_RATE_FLOOR = 0.65;
const TEACHER_SKILL = 0.8;
const USE_IMPROVEMENT = 0.01;
const MAX_RATE = 1.5;

function requireTown(town) {
  if (!town || typeof town !== 'object') throw new TypeError('Choose a town.');
  if (!Array.isArray(town.people)) town.people = [];
  if (!Array.isArray(town.apprenticeships)) town.apprenticeships = [];
  if (!Array.isArray(town.teachingSessions)) town.teachingSessions = [];
  if (!Number.isSafeInteger(town.nextTeachingSessionNumber) || town.nextTeachingSessionNumber < 1) town.nextTeachingSessionNumber = 1;
  if (!Array.isArray(town.book)) town.book = [];
  return town;
}

function named(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Give the ${label} a name.`);
  return value.trim();
}

function personIn(town, id) {
  return town.people.find(person => person.id === id) || null;
}

function skillFor(town, personId, kind) {
  return town.apprenticeships.find(record => record.personId === personId && record.kind === kind) || null;
}

function addBookEntry(town, teacherId, person, kind) {
  const teacher = teacherId === 'player' ? 'You' : personIn(town, teacherId)?.name || teacherId;
  const text = `${person.name || person.id} learned ${kind} from ${teacher}.`;
  town.book.push({type:'apprenticeship', personId:person.id, teacherId, kind, tick:town.tick ?? 0n, text});
}

export function startTeachingSession(town, {personId, kind, machineId, teacherId = 'player', requiredSeconds = 60} = {}) {
  requireTown(town);
  personId = named(personId, 'apprentice');
  kind = named(kind, 'job kind');
  machineId = named(machineId, 'machine');
  teacherId = named(teacherId, 'teacher');
  if (!personIn(town, personId)) throw new TypeError('That apprentice is not in town.');
  if (!Number.isFinite(requiredSeconds) || requiredSeconds <= 0) throw new TypeError('Teaching time must be greater than zero.');
  if (teacherId !== 'player') {
    const teacher = skillFor(town, teacherId, kind);
    if (!teacher || teacher.skill < TEACHER_SKILL) throw new TypeError('That person has not learned this job well enough to teach it.');
  }
  const id = `teach-${personId}-${kind}-${town.nextTeachingSessionNumber++}`;
  const session = {id, personId, kind, machineId, teacherId, requiredSeconds, elapsedSeconds:0, progress:0, completed:false};
  town.teachingSessions.push(session);
  return session;
}

/** Update the teaching bar from the live machine demo's measured elapsed time. */
export function updateTeachingSession(town, sessionId, demo) {
  requireTown(town);
  const session = town.teachingSessions.find(item => item.id === sessionId && !item.completed);
  if (!session) throw new TypeError('Choose an open teaching session.');
  if (!demo || demo.machineId !== session.machineId || !Number.isFinite(demo.elapsedSeconds) || demo.elapsedSeconds < session.elapsedSeconds)
    throw new TypeError('The teaching session needs its matching recorded machine demo.');
  session.elapsedSeconds = Math.min(session.requiredSeconds, demo.elapsedSeconds);
  session.progress = Math.min(1, session.elapsedSeconds / session.requiredSeconds);
  return {progress:session.progress, complete:session.progress >= 1};
}

/** Finish only with the measured result returned by finishMachineDemo. */
export function finishTeachingSession(town, sessionId, demonstration, {easy = false} = {}) {
  requireTown(town);
  const session = town.teachingSessions.find(item => item.id === sessionId && !item.completed);
  if (!session || session.progress < 1) throw new TypeError('Work a full teaching session before handing over the job.');
  const metrics = demonstration?.metrics;
  if (demonstration?.machineId !== session.machineId || !metrics || !Number.isFinite(metrics.averageSpeedMps) ||
      !Number.isFinite(metrics.accuracy) || !Number.isFinite(metrics.spillFraction) || metrics.averageSpeedMps < 0)
    throw new TypeError('Finish the matching recorded machine demo first.');
  const person = personIn(town, session.personId);
  const rate = Math.min(MAX_RATE, Math.max(easy ? EASY_RATE_FLOOR : 0, metrics.averageSpeedMps));
  const accuracy = Math.max(easy ? 0.5 : 0, Math.min(1, metrics.accuracy * (1 - metrics.spillFraction)));
  let record = skillFor(town, person.id, session.kind);
  if (!record) {
    record = {personId:person.id, kind:session.kind, machineId:session.machineId, skill:0.25, rate, accuracy,
      taughtBy:session.teacherId, demonstration, uses:0};
    town.apprenticeships.push(record);
    addBookEntry(town, session.teacherId, person, session.kind);
  } else {
    record.machineId = session.machineId;
    record.rate = Math.min(MAX_RATE, (record.rate + rate) / 2);
    record.accuracy = (record.accuracy + accuracy) / 2;
    record.demonstration = demonstration;
    record.taughtBy = session.teacherId;
    addBookEntry(town, session.teacherId, person, session.kind);
  }
  session.completed = true;
  return record;
}

export function canDelegate(town, personId, kind) {
  requireTown(town);
  if (kind === undefined) return town.apprenticeships.some(record => record.kind === personId);
  return Boolean(skillFor(town, personId, kind));
}

/** Advance a delegated stage in short, repeatable pieces and return ground-edit steps. */
export function advanceDelegatedWork(town, order, personId, elapsedMinutes, materials = {}, {steps = 10, easy = false} = {}) {
  requireTown(town);
  if (!Number.isFinite(elapsedMinutes) || elapsedMinutes < 0) throw new TypeError('Work time must be zero or more minutes.');
  if (!Number.isSafeInteger(steps) || steps < 1) throw new TypeError('Work needs at least one step.');
  if (!order || !Array.isArray(order.stages) || order.status === 'finished') throw new TypeError('Choose unfinished work.');
  const stage = order.stages[order.stageIndex];
  const record = stage && skillFor(town, personId, stage.kind);
  if (!stage || !record) return {ok:false, advanced:0, edits:[], message:'That person has not learned this kind of work.'};
  if (elapsedMinutes === 0) return {ok:true, advanced:0, edits:[], status:order.status, message:'No work time has passed.'};
  const rate = easy ? Math.max(EASY_RATE_FLOOR, record.rate) : record.rate;
  const unitsPerMinute = stage.amount / workStageMinutes(stage.workHours) * rate;
  const sliceMinutes = elapsedMinutes / steps;
  const edits = [];
  let advanced = 0;
  for (let index = 0; index < steps && order.status !== 'finished'; index++) {
    const stageIndex = order.stageIndex;
    const before = stage.completed;
    const result = advanceWork(order, order.stageIndex, unitsPerMinute * sliceMinutes, materials, town);
    if (!result.ok) return {...result, advanced, edits};
    advanced += result.advanced;
    if (result.advanced > 0) edits.push({stageIndex,
      from:before, to:before + result.advanced, units:result.advanced, accuracy:record.accuracy});
    if (order.stageIndex !== stageIndex) break;
  }
  if (advanced > 0) {
    record.uses++;
    record.rate = Math.min(MAX_RATE, record.rate + USE_IMPROVEMENT);
    record.accuracy = Math.min(1, record.accuracy + USE_IMPROVEMENT);
    record.skill = Math.min(1, record.skill + USE_IMPROVEMENT);
  }
  return {ok:true, advanced, edits, status:order.status, message:order.status === 'finished' ? 'The work is finished.' : 'The work has moved ahead.'};
}
