import assert from 'node:assert/strict';
import {
  TOWN_EVENTS, answerReport, createTown, deserializeTown, raiseTownReport,
  serializeTown, stepTown, townReports,
} from '../src/town/index.js';

let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; }

const town = createTown(481, 'Report Test');
check(TOWN_EVENTS.length === 10, 'the event data includes the ten town report kinds');
for (const event of TOWN_EVENTS) {
  check(event.answers.length <= 3 && event.answers.length > 0, `${event.id} has up to three answers`);
  check(event.answers.every(answer => /[.!?]$/.test(answer.label) && answer.label === answer.outcome), `${event.id} tells what each answer will do`);
  const sample = createTown(900 + checks, `Effect ${event.id}`);
  sample.people = [{id:'sick-1',health:40}];
  sample.goods = {stockpiles:{'scablands:0:0':{goods:{salvage:20}}}};
  sample.buildings = [{id:'site-1',fireDamage:0}];
  const raised = raiseTownReport(sample, event.id, {...Object.fromEntries(Object.entries(event.requires)), siteId:'site-1', personIds:['sick-1'], stockpileKey:'scablands:0:0', good:'salvage'});
  check(raised.ok, `${event.id} can be raised with its event facts`);
  const answer = event.answers.find(row => row.id !== 'leave') || event.answers[0];
  const beforeEffects = sample.reportEffects?.length || 0;
  check(answerReport(sample, raised.report.id, answer.id).ok, `${event.id} answer resolves`);
  check(sample.reportEffects.length === beforeEffects + 1 && raised.report.effect.type === event.id,
    `${event.id} applies and records its promised town effect`);
}
check(!raiseTownReport(town, 'fire-at-site').ok, 'events need their stated facts');
const fire = raiseTownReport(town, 'fire-at-site', {fire: true, where: "Moss's garage"});
check(fire.ok && fire.report.who === 'Odessa' && fire.report.where === "Moss's garage", 'a matching event makes a report with who and where');
check(fire.report.what === 'A fire has started.' && fire.report.unanswered, 'reports include what happened and wait for an answer');
check(!raiseTownReport(town, 'fire-at-site', {fire: true}).ok, 'the same event cannot stack while one report is unanswered');

const quiet = raiseTownReport(town, 'child-drawing', {childDrawing: true});
const sickness = raiseTownReport(town, 'sickness-in-town', {sickness: true});
check(quiet.ok && sickness.ok, 'good and bad reports can arrive together');
check(townReports(town)[0].id === fire.report.id, 'the worst unanswered report sorts first');
const raid = raiseTownReport(town, 'road-rat-raid', {roadRatRaid: true});
const drought = raiseTownReport(town, 'drought-warning', {droughtWarning: true});
check(raid.ok && !drought.ok, 'no more than three unanswered bad reports can wait at once');

check(!answerReport(town, fire.report.id, 'not-an-answer').ok, 'unknown answer ids are refused');
const answered = answerReport(town, fire.report.id, 'send-fire-crew');
check(answered.ok && answered.message === 'The fire crew goes to the fire.', 'answering records the stated outcome');
check(!answerReport(town, fire.report.id, 'leave').ok, 'a report cannot be answered twice');
check(raiseTownReport(town, 'fire-at-site', {fire: true}).ok, 'a new event can arrive after its old report is answered');

const restored = deserializeTown(serializeTown(town));
check(restored.reports.length === town.reports.length && restored.reports[0].createdTick === 0n, 'town reports survive save and load');
const oldTown = deserializeTown({version: 1, id: 'old', name: 'Old Town', seed: 5, rngState: 5, tick: 0, people: [], buildings: [], regions: {}});
check(townReports(oldTown).length === 0, 'an older town starts with no reports');

const ignored = createTown(12, 'Ignored Test');
const ignoredReport = raiseTownReport(ignored, 'fire-at-site', {fire: true});
for (let tick = 0; tick < 24 * 7; tick++) stepTown(ignored);
check(!ignoredReport.report.unanswered && ignoredReport.report.answerId === 'leave', 'an ignored report resolves to its written leave outcome after seven days');
check(ignoredReport.report.outcome === 'The fire spreads to the nearby site.', 'an ignored report plays the outcome it promised');

console.log(`Town reports: ${checks} checks passed.`);
