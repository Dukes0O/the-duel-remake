import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {canLeaveCar} from '../src/onfoot-transition.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {arenaHud, arenaResultsScreen} from '../src/screen-arena.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS} from '../src/world/jobs/everburn.js';

const dt = 1 / 120;
for (const job of [...EVERBURN_JOBS, ...EVERBURN_SIDE_JOBS]) for (const step of job.steps)
  assert.match(step.what, /^[A-Z].*[.!?]$/, `${job.id} has a whole-sentence step line`);
const flags = {'hidden-road': true, 'story-everburn': true, arsenal: true, 'arsenal-wave3': true};
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(String(key)) ?? null,
  setItem: (key, value) => values.set(String(key), String(value)),
  removeItem: key => values.delete(String(key)),
};
globalThis.cancelAnimationFrame ??= () => {};

// The Everburn action must respect saved story order, then launch through the
// same App arena path used by the yard and Story card.
{
  values.clear();
  const app=new App();app.audio.unlock=()=>{};
  app.duel.featureFlags=createFeatureFlags({storage:null,overrides:flags});
  app.profile={...app.profile,wasteland:{...app.profile.wasteland,version:1,discoveredGate:true}};
  assert.equal(app._saveProfile(),true);
  const state=app.duel.state;state.status='exploring';state.playerId=app.player.id;
  state.hiddenRoadJourney={id:'test-yard',phase:'arrived',departed:true};state.wastelandGateDiscovered=true;
  assert.equal(app.isYardHomeActive(),true,'fixture is the real arrived yard state');
  assert.equal(app.everburnStep('read'),true,'Hollis\'s note starts the story');
  assert.equal(app.everburnStep('get-out-and-walk'),false,'locked job refuses direct App action');
  assert.equal(app.everburnStep('hot-delivery'),true,'open job starts through the App arena action');
  assert.equal(app.duel.state.arena.mode,'world-job');
  assert.equal(app.duel.state.arena.venueId,'scablands');
  assert.equal(app.duel.state.arena.worldJob.definition.id,'everburn-hot-delivery');
  const jobHud=arenaHud(app.duel.state);
  assert.equal(jobHud.modeLabel,'Hot Delivery');
  assert.match(jobHud.scoreText,/Cinder's ember pot/);
  assert(Number.isFinite(jobHud.remainingSec),'job HUD shows finite elapsed time');
  assert.deepEqual(jobHud.rows,[],'world jobs do not show an arena table');
  assert.equal(worldHudModel({worldJob:app.duel.state.arena.worldJob,
    player:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral)}).target.id,'tin-town',
    'the Scablands map guidance carries the job destination marker');
  const arena=app.duel.state.arena,worldJob=arena.worldJob;
  worldJob.job.stepIndex=worldJob.job.steps.length;worldJob.job.done=true;
  finishArenaEvent(app.duel,'job-complete','player');
  const result=arena.result,paid=app.profile.wasteland.scrap;
  assert.equal(result.settlementSaved,true,'finished job settles through the shared Wasteland save helper');
  assert.equal(result.emberJob,'hot-delivery','finished job records the WW-SAVE story mark');
  assert.equal(app.profile.story.ember.jobs.includes('hot-delivery'),true);
  const wonScreen=arenaResultsScreen(app.duel.state,{metric:(label,value)=>`<m>${label}:${value}</m>`,action:(label,verb,primary=false)=>`<button data-action="${verb}"${primary?' data-primary="true"':''}>${label}</button>`,escapeHTML:String});
  assert.equal(wonScreen.eyebrow,'THE EVERBURN','won job results identify the story');
  assert.equal(wonScreen.title,'HOT DELIVERY','won job results use the job name');
  assert.match(wonScreen.description,/A live ember\./,'results use the existing story completion line');
  assert.match(wonScreen.metrics,/SCRAP EARNED/,'won job results show scrap');
  assert.doesNotMatch(wonScreen.metrics,/HOLD|WRECKS|PLACE/,'world job results omit arena metrics');
  assert.match(wonScreen.actions,/NEXT JOB: GET OUT AND WALK/,'first win names the next job');
  assert.match(wonScreen.actions,/data-action="ember-next-job" data-primary="true"/,'next job is the primary wired action');
  const failedScreen=arenaResultsScreen({...app.duel.state,arena:{...arena,result:{winnerId:'raiders',reason:'job-failed'},worldJob:arena.worldJob}},
    {metric:(label,value)=>`<m>${label}:${value}</m>`,action:(label,verb,primary=false)=>`<button data-action="${verb}"${primary?' data-primary="true"':''}>${label}</button>`,escapeHTML:String});
  assert.match(failedScreen.actions,/TRY AGAIN/,'failed job offers a retry');
  assert.doesNotMatch(failedScreen.metrics,/SCRAP EARNED|FOUND/,'failed job shows no reward');
  assert.match(failedScreen.actions,/world-job-retry/,'retry action is wired to the same job');
  assert.match(failedScreen.actions,/BACK TO THE YARD.*MAIN MENU/,'failed result keeps yard and menu actions');
  const quitScreen=arenaResultsScreen({...app.duel.state,arena:{...arena,result:{winnerId:'raiders',reason:'job-quit'},worldJob:arena.worldJob}},
    {metric:(label,value)=>`<m>${label}:${value}</m>`,action:(label,verb,primary=false)=>`<button data-action="${verb}"${primary?' data-primary="true"':''}>${label}</button>`,escapeHTML:String});
  assert.match(quitScreen.description,/left the job unfinished/,'quitting explains that the job did not finish');
  assert.match(quitScreen.actions,/TRY AGAIN/,'quit job offers a retry');
  assert.doesNotMatch(quitScreen.metrics,/SCRAP EARNED|FOUND/,'quit job shows no reward');
  assert.equal(app._settleArenaResult({result},app.duel.state),false,'duplicate result cannot award twice');
  assert.equal(app.profile.wasteland.scrap,paid,'duplicate result leaves the reward unchanged');
  app.returnToMenu();app.dispose?.();
}

function start({complete = false, seed = 1989, job: suppliedJob = null} = {}) {
  values.clear();
  const app = new App();
  app.audio.unlock = () => {};
  app.duel.featureFlags = createFeatureFlags({storage: null, overrides: flags});
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
    discoveredGate: true, loadout: ['bomb', 'crossbow', 'ufo', 'star']}};
  assert.equal(app._saveProfile(), true, 'the baseline player profile is saved through the normal path');
  const savedLoadoutBytes = Buffer.from(JSON.stringify(app.profile.wasteland.loadout));
  const job = suppliedJob ?? {id: 'test-job', seed, lend: ['flamethrower'], captions: {start: 'GO TO THE YARD'},
    steps: [{kind: 'reach', lineId: 'start', place: {position: {x: 500, z: 500}}, radius: complete ? 5000 : 1}]};
  app.runId = `world-job-${seed}`;
  app._runPlayerId = app.player.id;
  app.duel.state.wastelandGateDiscovered = true;
  assert.equal(app.duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42',
    playerId: app.player.id, seed, opponents: [], weaponLoadout: app.profile.wasteland.loadout, job}), true);
  assert.equal(app.duel.state.arena.mode, 'world-job');
  assert.equal(app.duel.state.objective, null, 'the world job leaves the race objective inactive');
  if (job.lend?.[0] === 'flamethrower' || job.steps[0].lentWeapon === 'flamethrower')
    assert.equal(app.duel.state.weaponLoadout[3], 'flamethrower', 'the run lends the Flamethrower in the fourth key slot');
  app.duel.state.countdown = 0;
  app.duel.step(dt);
  assert.equal(app.duel.state.status, 'racing');
  return {app, savedLoadoutBytes, job};
}

// The real mode refills only after a cleared wave, and a nearby raider can
// wear down the defend place until the current wave restarts.
{
  const place = {position: {x: 0, y: 0, z: 0}};
  const job = {id: 'test-defend', seed: 307, lend: ['flamethrower'], steps: [{kind: 'defend', place,
    placeId: 'test-well', health: .1, waveCount: 2, waves: [{count: 1}, {count: 1}],
    raiderEntry: place, refill: {place, crateId: 'hollis-test-crate',
      carWeapon: 'flamethrower', footAmmo: 'rpg'}}]};
  const {app} = start({job});
  const worldJob = app.duel.state.arena.worldJob;
  const hud = () => worldHudModel({worldJob:app.duel.state.arena.worldJob,
    player:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral)});
  assert.match(hud().line,/^Defend /,'live defend job tells the player what to do');
  assert.equal(hud().well.max,.1,'live HUD receives the actual defend place health');
  assert.equal(hud().wave.max,2,'live HUD receives the actual wave count');
  app.duel.state.combat.cooldowns.flamethrower = 7;
  app.duel.state.footWeapons = {ammo: 1};
  app.duel.state.footGear = {name: 'LONGHORN RPG', ammo: 1};
  for (let n = 0; n < 3; n++) app.duel.step(dt);
  assert(app.duel.state.combat.cooldowns.flamethrower > 0 &&
    app.duel.state.combat.cooldowns.flamethrower < 7,
  'car weapon cooldown continues naturally instead of being reset during a wave');
  assert.equal(app.duel.state.footWeapons.ammo, 1, 'RPG ammo stays unchanged during a wave');
  const raider = worldJob.actors.find(actor => Number.isFinite(actor.x) && Number.isFinite(actor.z));
  assert(raider, 'the real mode spawned the defend wave');
  const firstWave = worldJob.waveZones['0:0'];
  raider.x = place.position.x; raider.z = place.position.z;
  for (let n = 0; n < 180; n++) app.duel.step(dt);
  assert.notEqual(worldJob.waveZones['0:0'], firstWave,
    'the real mode replaces the current wave after nearby raiders wear down the well');
  assert(worldJob.places['test-well'].health > 0,
    'the real mode restores the well when it restarts the wave');
  assert.equal(worldJob.job.stepState.restarting, false, 'the real mode resumed the same wave');
  assert(app.duel.state.combat.cooldowns.flamethrower > 0,
    'a restart does not refill during the wave');
  app.duel.state.combat.cooldowns.flamethrower = 9;
  app.duel.state.footWeapons.ammo = 1;
  const currentRaider = worldJob.waveZones['0:0'].raiders[0];
  currentRaider.knockedDown = true;
  app.duel.step(dt);
  assert.equal(app.duel.state.combat.cooldowns.flamethrower, 0,
    'the cleared wave refills the car weapon at the crate');
  assert.equal(app.duel.state.footWeapons.ammo, 3,
    'the cleared wave refills RPG ammo at the crate');
  assert.equal(worldJob.refillCrate.id, 'hollis-test-crate');
  app.duel.state.combat.cooldowns.flamethrower = 6;
  app.duel.state.footWeapons.ammo = 2;
  app.duel.step(dt);
  assert(app.duel.state.combat.cooldowns.flamethrower > 0,
    'the next wave does not repeat the refill');
  assert.equal(app.duel.state.footWeapons.ammo, 2,
    'the next wave does not repeat the RPG refill');
  app.returnToMenu(); app.dispose?.();
}

function assertSavedLoadout(app, expectedBytes, exit) {
  const raw = values.get(PLAYERS_KEY);
  assert.equal(typeof raw, 'string', `${exit}: game wrote its player registry`);
  const saved = loadPlayers().players.find(player => player.id === app.player.id)?.profile;
  assert(saved, `${exit}: the saved player profile can be read back`);
  const afterBytes = Buffer.from(JSON.stringify(saved.wasteland.loadout));
  assert.deepEqual(afterBytes, expectedBytes, `${exit}: saved loadout bytes are identical`);
  assert(!saved.wasteland.loadout.includes('flamethrower'), `${exit}: the loan is absent from the saved profile`);
  assert.deepEqual(app.duel.state.weaponLoadout, saved.wasteland.loadout,
    `${exit}: run loadout is restored to the saved loadout`);
}

// The real arena mode accepts no CPU driver, and the combat action accepts the
// lent weapon. F steps out and back in through the normal fixed-step transition.
{
  const {app} = start();
  assert.match(worldHudModel({worldJob:app.duel.state.arena.worldJob,
    player:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral)}).line,/^Drive to /,
  'live reach job tells the player where to go');
  assert.equal(canLeaveCar(app.duel), true);
  assert.equal(app.duel.fireWeapon('flamethrower'), true);
  app.duel.setInput({interact: true});
  for (let n = 0; n < 75; n++) app.duel.step(dt);
  assert.equal(app.duel.state.onFoot, true, 'holding F steps out');
  app.duel.setInput({interact: false}); app.duel.step(dt);
  app.duel.setInput({interact: true});
  for (let n = 0; n < 75; n++) app.duel.step(dt);
  assert.equal(app.duel.state.onFoot, false, 'holding F beside the car gets back in');
  app.returnToMenu();
  app.dispose?.();
}

// A Hand Flamer loan selects Cinder's on-foot signature gear and leaves the
// car weapon bar alone; the regular F transition exposes it in the field.
{
  const {app} = start({job:{id:'cinders-loan-test', steps:[{kind:'onfoot', lentWeapon:'cinders-hand-flamer',
    places:[{id:'lamp',position:{x:999,z:999}}], returnToCar:{position:{x:0,z:0}}, requiresExit:true}]}});
  assert.equal(app.duel.state.crewId,'cinder');
  assert.equal(app.duel.state.crewGear.id,'hand-flamer');
  assert.equal(app.duel.state.footWeapons.selected,'hand-flamer');
  app.duel.setInput({interact:true});
  for(let n=0;n<75;n++)app.duel.step(dt);
  assert.equal(app.duel.state.onFoot,true,'Cinder loan works after holding F to get out');
  assert.equal(app.duel.state.footGear.name,'HAND FLAMER');
  app.returnToMenu();app.dispose?.();
  assert.equal(app.duel.state.crewId,'rook','the loaned crew identity is restored after the job');
  assert.equal(app.duel.state.footWeapons.selected,'rpg','the loaned Hand Flamer selection is restored after the job');
}

for (const exit of ['win', 'fail', 'quit to menu', 'leave during pause']) {
  const {app, savedLoadoutBytes} = start({complete: exit === 'win', seed: 1990 + exit.length});
  if (exit === 'win') {
    app.duel.step(dt);
    assert.equal(app.duel.state.status, 'arena_result', 'the job completes through the real job engine');
    assert.equal(app.duel.state.arena.result.reason, 'job-complete');
  } else if (exit === 'fail') {
    finishArenaEvent(app.duel, 'job-failed', 'cpu-1');
    assert.equal(app.duel.state.arena.result.winnerId, 'cpu-1', 'the arena uses its ordinary failure result path');
  } else {
    if (exit === 'leave during pause') app.togglePause();
    assert.equal(app.duel.state.paused, exit === 'leave during pause');
    app.returnToMenu();
    assert.equal(app.duel.state.status, 'menu');
  }
  assertSavedLoadout(app, savedLoadoutBytes, exit);
  app.dispose?.();
}

console.log('PASS world-job: real Duel inputs, fire, F out/in, and saved loadout cleanup on win, fail, menu quit, and paused exit');
