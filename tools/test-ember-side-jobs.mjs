// EVERBURN go-live (13 November 2026): the Tin Town notice board's "Take job" starts Lost Prospector, Survey Flags and Hot Soup in a real App,
// exactly as the Story Wall starts a story job. Memory-only profile. The three jobs start in the Scablands as world jobs at their start place,
// pay the one world-job amount when finished, write nothing to the story save, and can be taken again; a refused start changes nothing.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {arenaResultsScreen} from '../src/screen-arena.js';
import {EMBER_JOBS, markEmberJob, markEmberRead} from '../src/story/ember-save.js';
import {emberWallMarkup} from '../src/story/ember-ui.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS, sideJobKey, sideJobOf} from '../src/world/jobs/everburn.js';
import '../src/story/ember-lines.js';

let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const same = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const values = new Map();
globalThis.localStorage = {getItem: key => values.get(String(key)) ?? null, setItem: (key, value) => values.set(String(key), String(value)), removeItem: key => values.delete(String(key))};
globalThis.cancelAnimationFrame ??= () => {};
const metric = (label, value) => `<m>${label}:${value}</m>`, action = (label, verb, primary = false) => `<button data-action="${verb}"${primary ? ' data-primary="true"' : ''}>${label}</button>`;
const KEYS = ['lost-prospector', 'survey-flags', 'hot-soup'];

// An App in the yard with `jobs` story jobs won (and the note read unless `read` is false).
function yard({jobs = 2, read = true, on = ['story-everburn']} = {}) {
  values.clear();
  const app = new App(); app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: {'story-everburn': false, 'scablands-runs': false, ...Object.fromEntries([...['hidden-road', 'arsenal', 'arsenal-wave3', 'warlord-cards'], ...on].map(name => [name, true]))}});
  let profile = {...app.profile, wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true}};
  if (read) profile = markEmberRead(profile).profile;
  for (const id of EMBER_JOBS.slice(0, jobs)) profile = markEmberJob(profile, id).profile;
  app.profile = profile;
  assert.equal(app._saveProfile(), true); checks++;
  const state = app.duel.state; state.status = 'exploring'; state.playerId = app.player.id;
  state.hiddenRoadJourney = {id: 'test-yard', phase: 'arrived', departed: true}; state.wastelandGateDiscovered = true;
  assert.equal(app.isYardHomeActive(), true); checks++;
  return app;
}
const finish = (app, reason = 'job-complete', winner = 'player') => {
  const worldJob = app.duel.state.arena.worldJob;
  if (winner === 'player') { worldJob.job.stepIndex = worldJob.job.steps.length; worldJob.job.done = true; }
  finishArenaEvent(app.duel, reason, winner);
  return app.duel.state.arena.result;
};
// The save's shape: every field name, and each value's kind. A list's contents are not part of the shape (the settlement adds its run id to
// wasteland.settledResults for every finished world job, the six included).
const shapeOf = value => value === null ? 'null' : Array.isArray(value) ? 'list' : typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(name => [name, shapeOf(value[name])])) : typeof value;

// ---- The handler is wired where the other Story Wall buttons are ----------------------------------------------------------------------
{
  const router = readFileSync(new URL('../src/screen-router.js', import.meta.url), 'utf8');
  check(/if\(button\.dataset\.emberSideJob\)\{const ok=app\.everburnSideJob\?\.\(button\.dataset\.emberSideJob\)/.test(router), 'the router handles data-ember-side-job by calling app.everburnSideJob');
  check(/sideJobKey\(definition\)/.test(router) && /app\.everburnSideJob\?\.\(side\)/.test(router), 'TRY AGAIN on a notice-board job starts it again by its board name');
  same(EVERBURN_SIDE_JOBS.map(sideJobKey), KEYS, 'the three board names are the ids the wall prints');
  same(KEYS.map(key => sideJobOf(key)?.id), EVERBURN_SIDE_JOBS.map(job => job.id), 'each board name finds its definition');
  check(sideJobOf('hot-delivery') === null && sideJobKey(EVERBURN_JOBS[0]) === null, 'a story job is not a notice-board job');
}

// ---- Refusals change nothing ----------------------------------------------------------------------------------------------------------
for (const [label, options] of [['before the walk (job 2) is won', {jobs: 1}], ['with no job won', {jobs: 0}], ['with the note unread', {read: false, jobs: 0}], ['with the Everburn switch off', {on: []}]]) {
  const app = yard(options), before = JSON.stringify(app.profile);
  for (const key of KEYS) check(app.everburnSideJob(key) === false, `${key} cannot be taken ${label}`);
  check(app.duel.state.arena == null, `no job was started ${label}`);
  same(JSON.stringify(app.profile), before, `the save is untouched ${label}`);
  app.dispose?.();
}
{
  const app = yard();
  check(app.everburnSideJob('no-such-job') === false && app.everburnSideJob('hot-delivery') === false && app.everburnSideJob(undefined) === false, 'an unknown board name does not start');
  check(app.startArenaEvent({venueId: 'scablands', mode: 'world-job', job: {...EVERBURN_SIDE_JOBS[0]}}) === false, 'a copy of a side job (not the board\'s own definition) is refused');
  check(app.startArenaEvent({venueId: 'scablands', mode: 'world-job', job: {id: 'everburn-made-up', name: 'Made Up', steps: []}}) === false, 'a made-up job is refused');
  check(app.startArenaEvent({venueId: 'scrapdome', mode: 'world-job', job: EVERBURN_SIDE_JOBS[0]}) === false, 'a side job outside the Scablands is refused');
  check(app.duel.state.arena == null, 'none of those started a job');
  app.dispose?.();
}

// ---- The board lists the three jobs, and each starts as a world job at its start place -------------------------------------------------
for (const [index, key] of KEYS.entries()) {
  const app = yard(), job = EVERBURN_SIDE_JOBS[index];
  check(emberWallMarkup(app.storyProps('ember')).includes(`data-ember-side-job="${key}"`), `${key}: the wall has its Take job button`);
  check(app.everburnSideJob(key) === true, `${key}: Take job starts it`);
  const arena = app.duel.state.arena, definition = arena.worldJob.definition, start = job.steps[0].carStart;
  same([arena.mode, arena.venueId, definition.id], ['world-job', 'scablands', job.id], `${key}: a Scablands world job`);
  const at = app.duel.course.worldAt(app.duel.state.s, app.duel.state.lateral);
  check(Math.hypot(at.x - start.x, at.z - start.z) < .05, `${key}: the car starts at (${start.x}, ${start.z})`);
  app.dispose?.();
}

// ---- Finishing pays the one world-job amount, writes nothing to the story save, and the job can be taken again -------------------------
for (const [index, key] of KEYS.entries()) {
  const app = yard(), job = EVERBURN_SIDE_JOBS[index];
  const factor = {easy: 1, medium: 1.2, hard: 1.4}[app.cpuDifficulty], scrap = app.profile.wasteland.scrap, story = JSON.stringify(app.profile.story), shape = shapeOf(app.profile);
  check(app.everburnSideJob(key), `${key}: starts`);
  const result = finish(app);
  same(result.settlementSaved, true, `${key}: the finish settles`);
  same(result.scrapEarned, Math.round(80 * factor), `${key}: pays ${Math.round(80 * factor)} scrap`);
  same(app.profile.wasteland.scrap - scrap, Math.round(80 * factor), `${key}: and the scrap is in the save`);
  same(JSON.stringify(app.profile.story), story, `${key}: the story save is untouched`);
  same(shapeOf(app.profile), shape, `${key}: the save has the same fields as before`);
  same(app.profile.wasteland.settledResults.length, 1, `${key}: the only other change is the settlement's run id in settledResults, as for the six jobs`);
  check(!Object.hasOwn(result, 'emberJob'), `${key}: it is not one of the six jobs`);
  const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
  check(screen.title === job.name.toUpperCase() && screen.description === `${job.name} is done. You made it back to the yard.`, `${key}: the result screen names the job and says it is done`);
  check(screen.metrics.includes('SCRAP EARNED') && screen.actions.includes('arena-yard') && !/NEXT JOB|ember-next-job|world-job-retry/.test(screen.actions), `${key}: scrap shown, BACK TO THE YARD, no next job`);
  const paid = app.profile.wasteland.scrap;
  check(app._settleArenaResult({result}, app.duel.state) === false && app.profile.wasteland.scrap === paid, `${key}: a second settle changes nothing`);
  // The board still offers it.
  check(emberWallMarkup(app.storyProps('ember')).includes(`data-ember-side-job="${key}"`), `${key}: the board offers it again`);
  app.dispose?.();
}
for (const [label, reason, winner] of [['failing', 'job-failed', 'raiders'], ['leaving', 'job-quit', 'raiders']]) {
  for (const [index, key] of KEYS.entries()) {
    const app = yard(), before = JSON.stringify(app.profile);
    check(app.everburnSideJob(key), `${label} ${key}: starts`);
    const result = finish(app, reason, winner);
    same(JSON.stringify(app.profile), before, `${label} ${key}: the save is untouched`);
    const screen = arenaResultsScreen(app.duel.state, {metric, action, escapeHTML: String});
    check(/world-job-retry/.test(screen.actions) && /arena-yard/.test(screen.actions) && result.winnerId !== 'player', `${label} ${key}: offers TRY AGAIN and the yard`);
    check(app.everburnSideJob(key) === true, `${label} ${key}: TRY AGAIN starts it again from the results screen`);
    app.dispose?.();
  }
}

console.log(`test-ember-side-jobs: ${checks} checks passed`);
