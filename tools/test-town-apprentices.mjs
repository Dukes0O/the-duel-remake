import assert from 'node:assert/strict';
import {advanceWork, advanceDelegatedWork, canDelegate, createTown, createWorkOrder, finishTeachingSession, startTeachingSession, updateTeachingSession} from '../src/town/index.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

const town = createTown(1905, 'Apprentice Test');
town.people = [{id:'person-bo', name:'Bo'}, {id:'person-ada', name:'Ada'}];
const demo = {machineId:'trencher', elapsedSeconds:0};
const teaching = startTeachingSession(town, {personId:'person-bo', kind:'trench', machineId:'trencher', requiredSeconds:60});
check(!canDelegate(town, 'person-bo', 'trench'), 'a job cannot be delegated before it is taught');
demo.elapsedSeconds = 30;
check(updateTeachingSession(town, teaching.id, demo).progress === 0.5, 'the teaching bar follows recorded machine work');
assert.throws(() => finishTeachingSession(town, teaching.id, {machineId:'trencher', metrics:{averageSpeedMps:1, accuracy:1, spillFraction:0}}), /full teaching session/); checks++;
demo.elapsedSeconds = 60;
check(updateTeachingSession(town, teaching.id, demo).complete, 'the teaching bar fills at the required work time');
const sloppy = finishTeachingSession(town, teaching.id, {machineId:'trencher', metrics:{averageSpeedMps:1, accuracy:0.45, spillFraction:0.2}});
const taughtAccuracy = sloppy.accuracy;
check(canDelegate(town, 'person-bo', 'trench'), 'the demonstrated job can be delegated');
check(Math.abs(sloppy.accuracy - 0.36) < 1e-9, 'the apprentice inherits the measured accuracy and spill');
check(town.book[0].text === 'Bo learned trench from You.', 'the Book records who taught the apprentice');

const easyTown = createTown(1906, 'Easy Apprentice Test');
easyTown.people = [{id:'person-easy', name:'Easy'}];
const easyDemo = {machineId:'trencher', elapsedSeconds:60};
const easySession = startTeachingSession(easyTown, {personId:'person-easy', kind:'trench', machineId:'trencher', requiredSeconds:60});
updateTeachingSession(easyTown, easySession.id, easyDemo);
const easySkill = finishTeachingSession(easyTown, easySession.id, {machineId:'trencher', metrics:{averageSpeedMps:0.1, accuracy:0.1, spillFraction:0.5}}, {easy:true});
check(easySkill.rate >= 0.65 && easySkill.accuracy >= 0.5, 'Easy keeps a safe floor for rate and accuracy');

const order = createWorkOrder({id:'long-trench', stages:[{kind:'trench', amount:600, workHours:1800, ingredients:{}}]});
advanceWork(order, 0, 250);
const handedOver = advanceDelegatedWork(town, order, 'person-bo', 8, {}, {steps:8});
check(handedOver.ok && handedOver.advanced > 0 && handedOver.edits.length > 1, 'delegated work advances in separate ground-edit steps');
check(handedOver.edits.every(edit => Math.abs(edit.accuracy - taughtAccuracy) < 1e-9), 'ground edits carry the accuracy measured before this work improved it');
check(order.status === 'finished', 'a started long trench finishes near its promised work time');
check(sloppy.rate > 1 && sloppy.uses === 1, 'using the apprentice improves their rate');
assert.throws(() => startTeachingSession(town, {personId:'person-ada', kind:'trench', machineId:'trencher', teacherId:'person-bo'}), /well enough to teach/); checks++;
for (let index = 0; index < 55; index++) {
  const practice = createWorkOrder({id:`practice-${index}`, stages:[{kind:'trench', amount:1, workHours:1, ingredients:{}}]});
  advanceDelegatedWork(town, practice, 'person-bo', 1);
}
check(sloppy.skill >= 0.8, 'repeated work builds enough skill to teach');
const taughtByBo = startTeachingSession(town, {personId:'person-ada', kind:'trench', machineId:'trencher', teacherId:'person-bo', requiredSeconds:60});
const secondDemo = {machineId:'trencher', elapsedSeconds:60};
updateTeachingSession(town, taughtByBo.id, secondDemo);
finishTeachingSession(town, taughtByBo.id, {machineId:'trencher', metrics:{averageSpeedMps:1, accuracy:0.9, spillFraction:0.05}});
check(town.book.at(-1).text === 'Ada learned trench from Bo.', 'a skilled apprentice can teach and is named in the Book');

const untrainedOrder = createWorkOrder({id:'untrained-trench', stages:[{kind:'bore', amount:20, workHours:20, ingredients:{}}]});
const refused = advanceDelegatedWork(town, untrainedOrder, 'person-bo', 10);
check(!refused.ok && untrainedOrder.stages[0].completed === 0, 'an apprentice cannot take an untaught kind of work');

console.log(`TOWN-APPRENTICES: ${checks} checks passed.`);
