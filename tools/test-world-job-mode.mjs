import assert from 'node:assert/strict';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {canLeaveCar} from '../src/onfoot-transition.js';
import {finishArenaEvent} from '../src/arena/arena-event.js';
import {loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {worldHudModel} from '../src/world/world-hud.js';
import {arenaHud, arenaResultsScreen} from '../src/screen-arena.js';
import {EVERBURN_JOBS, EVERBURN_SIDE_JOBS, REMADE_EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {stepWorldJob} from '../src/arena/modes/world-job.js';
import {BRAND_RULE} from '../src/world/jobs/brand-rule.js';

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
  // EVERBURN-REMAKE job 1 (16 November 2026): the job starts by sending the car to Cinder for the pot, and to Tin Town once the pot is on.
  const guide=()=>worldHudModel({worldJob:app.duel.state.arena.worldJob,
    player:app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral)}).target.id;
  assert.equal(guide(),'cinder','the Scablands map guidance carries the first marker of the job, Cinder with the pot');
  {
    const job=app.duel.state.arena.worldJob.job;
    job.stepState={...job.stepState,loaded:true,ember:job.steps[0].ember.start};
    app.advance(.1);
    assert.equal(guide(),'cold-forge','and the job destination marker once the pot is on the car');
  }
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
  // The checked evening now offers job 2 as the next primary action.
  assert.match(wonScreen.actions,/NEXT JOB: LIGHT THE TOWN/,'first win names the remade next job');
  assert.match(wonScreen.actions,/data-action="ember-next-job" data-primary="true"/,'next job is the primary wired action');
  // Keep proving that an unremade job cannot be offered.
  const remadeIndex=REMADE_EVERBURN_JOBS.indexOf(EVERBURN_JOBS[1].id);
  REMADE_EVERBURN_JOBS.splice(remadeIndex,1);
  try {
    const lockedScreen=arenaResultsScreen(app.duel.state,{metric:()=>'',action:label=>label,escapeHTML:String});
    assert.doesNotMatch(lockedScreen.actions,/NEXT JOB/,'an unremade next job stays locked');
  } finally { REMADE_EVERBURN_JOBS.splice(remadeIndex,0,EVERBURN_JOBS[1].id); }
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

// Light the Town: rule snapshots exercise the real arena adapter, not a walk.
{
  const place = (id, x, z) => ({id, position: {x, y: 0, z}});
  const hearth = place('hearth', 0, 0);
  const lamps = [place('pump', 20, 0), place('tower', 40, 0), place('far', 60, 0)];
  const job = {id: 'test-town-brand', steps: [{kind: 'onfoot', brand: true, hearth, farWalk:[place('hearth-front',0,2.8)],
    places: lamps, auntie: place('town-auntie-solder', 5, 5), ashEntries: [place('west', -100, 0), place('east', 100, 0)]}]};
  const {app} = start({job});
  const duel = app.duel, state = duel.state, worldJob = state.arena.worldJob;
  assert.equal(worldJob.solidGrid.brandLamps.length, 3, 'The arena installs the three solid lamp posts.');
  assert.equal(worldJob.solidGrid.brandLamps[0].x, lamps[0].position.x);
  assert.equal(worldJob.solidGrid.people[0].id, 'town-auntie-solder');
  assert.equal(worldJob.solidGrid.people[0].x, 5);
  const ashTells = [];
  const originalEmit = duel.emit.bind(duel);
  duel.emit = event => { if (event.arenaTell) ashTells.push(event.arenaTell); originalEmit(event); };
  worldJob.job.stepState = {brandsUsed: 1, brandSeconds: 90, lamps: {pump: true}};
  state.onFoot = true;
  state.fighter = {x: 20, y: 0, z: 0, speed: 0, s: state.s,
    maxHealth: 100, health: 100, respawns: 0, yaw: 0, pitch: 0};
  const originalZones = state.raids?.zones.length ?? 0;
  stepWorldJob(duel, 0);
  const ash = worldJob.actors.find(actor => actor.brandAsh);
  assert(ash, 'the arena creates the first Ash Man from the existing factory');
  assert.equal(ash.x, -100, 'he starts at the farthest wall');
  assert.equal(state.raids?.zones.length ?? 0, originalZones, 'he has no roadside rocket zone');
  stepWorldJob(duel, 0);
  assert.deepEqual(ash.brandAlley.goal,lamps[0].position,'the rule still targets the lit lamp');
  assert(Math.hypot(ash.approachTarget.x-lamps[0].position.x,ash.approachTarget.z-lamps[0].position.z)<BRAND_RULE.smotherRadius,
    'the route stops beside the solid lamp within its unchanged smothering radius');
  const before = ash.x;
  stepWorldJob(duel, .1);
  assert(ash.x > before, 'the ordinary foot mover carries out the request');
  assert(ash.x - before <= BRAND_RULE.ashWalkMps * .1 + 1e-8);
  Object.assign(ash, {x: 20, y: 0, z: 1, approachTarget: null});
  state.footWeapons.selected = 'wrench'; state.fighterInput.fire = true;
  stepWorldJob(duel, 0);
  assert.equal(worldJob.job.stepState.brandAsh.men[ash.id].fleeing, true,
    'the existing on-foot attack key drives him off without damage');
  assert.equal(ash.health, ash.maxHealth);
  Object.assign(ash,worldJob.job.stepState.brandAsh.men[ash.id].wall.position);
  stepWorldJob(duel, 0);
  assert(!worldJob.actors.includes(ash), 'a fleeing man is removed at the wall');
  // One swing per press; holding fire while changing range is no extra swing.
  worldJob.job.stepState.lamps.tower = true;
  stepWorldJob(duel, 0);
  const thrower = worldJob.actors.find(actor => actor.brandAsh);
  Object.assign(thrower, {x: 20, y: 0, z: 1, approachTarget: null});
  stepWorldJob(duel, 0);
  assert.equal(worldJob.job.stepState.brandAsh.men[thrower.id].fleeing, undefined);
  assert.equal(ashTells.filter(tell => tell.cue === 'world.ash.throw').length, 1);
  assert.equal(ashTells.find(tell => tell.cue === 'world.ash.throw').position.x, state.fighter.x);
  state.footWeapons.selected = 'hand-flamer'; state.fighter.flaming = true;
  Object.assign(thrower, {x: 20, y: 0, z: -1});
  stepWorldJob(duel, 0);
  assert.equal(worldJob.job.stepState.brandAsh.men[thrower.id].fleeing, undefined,
    'flame aimed away cannot drive an opponent off');
  Object.assign(thrower, {x: 20, y: 0, z: 6, approachTarget: null});
  stepWorldJob(duel, 0);
  assert.equal(worldJob.job.stepState.brandAsh.men[thrower.id].fleeing, true,
    'the existing Hand Flamer cone drives an opponent off at six metres');
  assert.equal(thrower.health, thrower.maxHealth);
  state.fighterInput.fire = false;
  Object.assign(state.fighter, {knockedDown: true, health: 0});
  worldJob.job.stepState.lastLamp = 'pump'; state.cpuDifficulty = 'easy';
  stepWorldJob(duel, 0);
  assert.equal(state.fighter.knockedDown, false);
  assert.equal(state.fighter.health, 100);
  assert.equal(state.fighter.respawns, 1);
  assert.equal(state.fighter.x, lamps[0].position.x);
  assert.equal(state.fighter.z, lamps[0].position.z + BRAND_RULE.recoveryLampMetres);
  assert.equal(worldJob.job.stepState.brandSeconds, 0);
  assert.equal(ashTells.at(-1).cue, 'world.brand.out');
  assert.equal(worldJob.job.stepState.lamps.pump, true);
  stepWorldJob(duel, 0);
  assert.equal(state.fighter.respawns, 1, 'recovery happens once');
  assert.equal(worldJob.job.stepState.brandSeconds, BRAND_RULE.burnSeconds);
  assert.equal(ashTells.at(-1).cue, 'world.brand.catch');
  state.cpuDifficulty = 'medium'; state.fighter.knockedDown = true;
  stepWorldJob(duel, 0);
  assert.equal(state.fighter.x, hearth.position.x);
  assert.equal(state.fighter.z, hearth.position.z + 2.8);
  assert.equal(worldJob.job.stepState.lamps.pump, true);
  app.returnToMenu(); app.dispose?.();
}

// The town's ending uses the arena hold path even while the player is on foot.
// These are rule snapshots, not a second scripted walk through the job.
{
  const place = (id, x) => ({id, position: {x, y: 0, z: 0}});
  const lamps = [place('pump', 20), place('tower', 40), place('far', 60)];
  const {app} = start({job: {id: 'test-brand-ending', captions: {
    'brand.awake': 'Auntie Solder: Three lamps. Now we can see how bad it is.',
    'brand.thief': "Auntie Solder: Thief! He's got my bellows!",
  }, steps: [{kind: 'onfoot', brand: true, townEnding: true,
    hearth: place('hearth', 0), places: lamps}]}});
  const duel = app.duel, state = duel.state, worldJob = state.arena.worldJob;
  const tells = [], captions = [];
  const emit = duel.emit.bind(duel), callout = duel._storyCallout.bind(duel);
  duel.emit = event => { if (event.arenaTell) tells.push(event.arenaTell); emit(event); };
  duel._storyCallout = (...args) => { captions.push(args[0]); callout(...args); };
  state.onFoot = true;
  state.fighter = {x: 0, y: 0, z: 0, speed: 0, s: state.s,
    maxHealth: 100, health: 100, yaw: 0, pitch: 0};
  stepWorldJob(duel, 0);
  assert.equal(tells.at(-1).cue, 'world.brand.catch');
  state.fighter.x = 10;
  worldJob.job.stepState.brandSeconds = .1;
  stepWorldJob(duel, .1);
  assert.equal(tells.at(-1).cue, 'world.brand.out');
  state.fighter.x = 0;
  stepWorldJob(duel, 0);
  assert.equal(tells.at(-1).cue, 'world.brand.catch');
  state.fighter.x = 60;
  worldJob.job.stepState.lamps = {pump: true, tower: true};
  stepWorldJob(duel, 2);
  assert.equal(worldJob.job.stepState.townEnding, true);
  assert.deepEqual(tells.slice(-2).map(tell => tell.cue), ['world.brand.catch', 'world.town.wake']);
  assert.equal(tells.at(-2).position.x, 60, 'the lamp catches at its own position');
  const held = {x: state.fighter.x, y: state.fighter.y, z: state.fighter.z, s: state.s, lateral: state.lateral};
  state.fighter.speed = 4; state.fighter.flaming = true;
  duel.setInput({throttle: 1, interact: true});
  state.fighterInput.fire = true;
  for (let tick = 0; tick < 1081 && state.status === 'racing'; tick++) duel.step(dt);
  assert.equal(state.status, 'arena_result');
  assert.deepEqual({x: state.fighter.x, y: state.fighter.y, z: state.fighter.z,
    s: state.s, lateral: state.lateral}, held, 'holding movement and F cannot leave the ending');
  assert.equal(state.fighter.flaming, false);
  assert.equal(state.onFoot, true);
  assert.equal(worldJob.brandResult.brandsUsed, 2);
  assert.equal(worldJob.brandResult.pay, 70);
  assert.equal(worldJob.brandResult.sentence, 'You lit the town with two brands.');
  assert.equal(captions.filter(text => text.includes('Three lamps.')).length, 1);
  assert.equal(captions.filter(text => text.includes('Thief!')).length, 1);
  assert.equal(tells.filter(tell => tell.cue === 'world.town.wake').length, 1);
  app.returnToMenu(); app.dispose?.();
}

console.log('PASS world-job: real Duel inputs, fire, F out/in, saved loadout cleanup, town Ash Men, sound cues and ending hold');
