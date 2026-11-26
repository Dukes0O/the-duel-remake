// Claude runs this on the laptop. The harness supplies memory-only storage.
import {newWorld} from '../../src/world/open/open-record.js';
import {applyEffects} from '../../src/world/open/open-effects.js';
import {FLAG_ID, flagStory} from '../../src/world/open/content/somebody-elses-flag-places.js';
import {placeForThread} from '../../src/story/scenes/burned-camp.js';
import {scablandsSurfaceHeightAt} from '../../src/world/scablands-ground.js';
import {flagPeople} from '../../src/world/open/content/somebody-elses-flag-places.js';
import {LAND} from '../../src/world/scablands-names.js';
import {pageFunctions as scout} from './open-burned-scout.mjs';
import {pageFunctions as camp} from './open-burned-camp.mjs';

export const pageFunctions = {
  memoryMenu: scout.memoryMenu,
  temporaryPlayerReady: scout.temporaryPlayerReady,
  temporaryPlayer: scout.temporaryPlayer,
  actionReady: scout.actionReady,
  click: scout.click,
  roamReady: scout.roamReady,
  loadWorld: scout.loadWorld,
  placeCar: scout.placeCar,
  drive: camp.drive,
  advance: camp.advance,
  walkAt: camp.walkAt,
  seen: () => window.__qaApp.duel.state.arena.worldJob.open.world.ledger.marks.includes('somebody-elses-flag/tower-seen'),
  // A click counts once the game's own talk screen no longer offers it: the buttons on the page are redrawn a frame
  // later, so a button still showing may belong to a screen the game has already left.
  choose: words => {
    const {job} = window.__qaApp.duel.state.arena.worldJob;
    const screen = job.steps[job.stepIndex]?.kind === 'talk' ? job.stepState.screen : null;
    const offered = screen?.phase === 'options' && screen.options.some(row => row.words.includes(words));
    if (window.__flagChose === words) {
      if (offered) return false;
      window.__flagChose = null;
      return true;
    }
    const talk = document.querySelector('.story-talk:not([hidden])');
    const button = offered && [...(talk?.querySelectorAll('.story-options button') ?? [])].find(row => row.textContent.includes(words));
    if (button && !button.disabled) { button.click(); window.__flagChose = words; return false; }
    if (screen?.phase !== 'options') talk?.querySelector('.story-talk-controls button:first-child')?.click();
    return false;
  },
  talking: () => !!document.querySelector('.story-talk:not([hidden])'),
  roaming: () => window.__qaApp.duel.state.arena.worldJob.job.steps[
    window.__qaApp.duel.state.arena.worldJob.job.stepIndex]?.kind === 'roam',
  // What the page shows when a wait runs out: the talk box, the storyline's beat, and where the player and people stand.
  report: (well, people) => {
    const app = window.__qaApp, {duel} = app, state = duel.state, {open, job} = state.arena.worldJob;
    const talk = document.querySelector('.story-talk:not([hidden])');
    const here = state.onFoot && state.fighter ? {x: state.fighter.x, z: state.fighter.z} : duel.course.worldAt(state.s, state.lateral);
    const away = point => Math.round(Math.hypot(point.x - here.x, point.z - here.z));
    return JSON.stringify({
      talk: talk ? {words: talk.querySelector('.story-words')?.textContent,
        options: [...talk.querySelectorAll('.story-options button')].map(row => row.textContent + (row.disabled ? ' (disabled)' : ''))} : null,
      record: open.world.open.threads['somebody-elses-flag'], step: job.steps[job.stepIndex]?.kind, onFoot: state.onFoot,
      player: {x: Math.round(here.x), z: Math.round(here.z)}, toWell: away(well),
      people: people.map(row => ({id: row.id, away: away(row)})),
      marks: open.world.ledger.marks.filter(mark => mark.startsWith('somebody-elses-flag/')),
      events: (state.arena.worldJob.openJobEvents ?? []).slice(-6), input: state.input,
    });
  },
  shared: () => {
    const {open} = window.__qaApp.duel.state.arena.worldJob;
    if (open.world.open.threads['somebody-elses-flag'].end !== 'shared' ||
        !open.world.ledger.marks.includes('somebody-elses-flag/signed') ||
        open.world.open.favours.glasshouse !== 1 || open.world.scrap !== 90)
      throw Error('The schedule did not keep the authored marks, favour and price.');
    return true;
  },
};

export const pageSource = (name, ...values) => '(' + pageFunctions[name] + ')(' + values.map(value => JSON.stringify(value)).join(', ') + ')';

export async function run(context) {
  const world = applyEffects(newWorld({seed: 1234, night: 6, scrap: 90, embers: 3}), {id: 'qa/flag', effects: [
    {type: 'find', site: 'sweet-seep'}, {type: 'find', site: 'glasshouse'},
    {type: 'word', person: 'glasshouse', set: 'Friendly'},
    {type: 'thread', id: FLAG_ID, to: 'sign', cast: {camp: 'glasshouse'}},
  ]}).world;
  const evaluate = (name, ...values) => context.evaluate(pageSource(name, ...values));
  const people = () => flagPeople(world).map(row => ({id: row.id, ...LAND.at(...row.routine.day.at)}));
  const wait = async (name, ...values) => {
    try { return await context.waitFor(pageSource(name, ...values), name, 120000); } catch (error) {
      throw Error(error.message + ' ' + await context.evaluate(pageSource('report', well, people())));
    }
  };
  // On foot F is read as held in each game step, so it is held down across a step, as a player's press is. Sent
  // down and up together, it was often released before any step read it, and no talk opened.
  const use = async () => {
    const key = type => context.command('Input.dispatchKeyEvent', {type, key: 'f', code: 'KeyF', windowsVirtualKeyCode: 70});
    await key('keyDown');
    await evaluate('advance', .2);
    await key('keyUp');
    await evaluate('advance', .1);
  };
  const well = placeForThread('sweet-seep', {}, {landSeed: world.open.landSeed});
  const floor = point => ({...point, y: scablandsSurfaceHeightAt(point.x, point.z)});
  const table = placeForThread(['sweet-seep', 'table'], {}, {landSeed: world.open.landSeed});
  const parking = {...well, z: well.z + 37};
  const start = {...well, z: well.z + 230};
  await context.navigate('/tools/menu-check.html?flags=story-choices,crew-gear&seed=1234&harness=open-somebody-elses-flag');
  await wait('memoryMenu');
  await wait('temporaryPlayerReady');
  await evaluate('temporaryPlayer', world.seed);
  for (const action of ['wasteland-visit', 'yard-cards', 'story-open-roam']) {
    await wait('actionReady', action);
    await evaluate('click', action);
  }
  await wait('roamReady');
  await evaluate('loadWorld', world);
  // Both endpoints are on the open western ground, clear of bridges and decks.
  await evaluate('placeCar', floor(start), parking);
  await evaluate('advance', 3.2);
  await wait('seen');
  await context.screenshot('sweet-seep-white-flag');
  await evaluate('drive', parking, 4, 60);
  await use();
  await evaluate('walkAt', floor(table));
  // Miss Pell's choices open once her questions are all asked (the shared talk part, parts/threads.js), so the driver
  // asks each one, ends the call, and presses F again for the choices.
  const askAll = async beat => {
    for (const question of flagStory.beats[beat].questions) await wait('choose', question.words);
    await wait('choose', 'I will call again if I need you.');
    await wait('roaming');
  };
  await use();
  await wait('talking');
  await context.screenshot('sweet-seep-miss-pell');
  await askAll('site');
  await use();
  await wait('choose', 'Ask Miss Pell what it would take to share the water');
  await wait('roaming');
  await evaluate('advance', .2);
  await use();
  await askAll('schedule');
  await use();
  await wait('choose', 'Sign the form for Tin Town');
  await wait('roaming');
  await evaluate('advance', .2);
  await evaluate('shared');
  await context.screenshot('sweet-seep-signed-schedule');
}
