// WATER-SCREENS and WATER-FINISH: the Water Road in the real game, one picture at each moment. Memory-only saves,
// private port, 1280x720, no frame timing. A new player who has found the Rustwall gate: the menu's Story button and
// Hollis's note, "Race on Sal's road" filling the setup, the real START, the race driven by the game's own autopilot on
// Easy (retried up to three times), the results tick; then the yard, its Next up and Story Wall at chapters 1, 2, 5 and
// 8 (the career is moved on by hand between them), a fight button that really starts the fight, the water works at
// stages 0, 4 and 8, a finished player's yard visit with Hollis's end lines, then chapter 9 (WARLORD-NINE): the Story
// Wall's button starts Magnus the Magnet's fight, and beating him ends the road. Run:
//   node tools/browser-harness.mjs scenario water-road
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';

const FLAGS = 'water-road,warlord-nine';
const ready = `document.readyState==='complete' && !!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'
  && !document.querySelector('#start-engine')?.disabled`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const LADDER = ['sal', 'dustmonger', 'mirage', 'gunn', 'kettle', 'vultures', 'tollkeeper', 'blackiron'];

const textCheck = `(() => {
  const text = document.body.innerText;
  const out = [];
  if (/\\u2014/.test(text)) out.push('em dash on screen');
  const dev = text.match(/undefined|NaN|\\bnull\\b|\\[object|story\\.water|water-road|pacific-canyon|=>|\\bTODO\\b/i);
  if (dev) out.push('developer word on screen: ' + dev[0]);
  const root = document.scrollingElement;
  if (root.scrollWidth > innerWidth + 2) out.push('page scrolls sideways ' + root.scrollWidth);
  return {out, text: text.slice(0, 1500)};
})()`;

export async function run(context) {
  const report = {frames: [], facts: [], notes: [], races: []};
  const fail = [];
  const fact = (ok, label) => { report.facts.push({ok: !!ok, label}); if (!ok) fail.push(label); };
  const shot = async (name, note = '') => {
    await wait(400);
    const check = await context.evaluate(textCheck);
    report.frames.push({name, note, problems: check.out, text: check.text});
    for (const problem of check.out) fail.push(name + ': ' + problem);
    await context.screenshot(name);
  };
  const click = async selector => {
    const point = await context.evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)});
      if (!node || node.disabled || node.hidden) throw Error('Control unavailable: ' + ${JSON.stringify(selector)});
      node.scrollIntoView({block: 'center'});
      const box = node.getBoundingClientRect(), top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      if (!box.width || !box.height || !node.contains(top)) throw Error('Control covered: ' + ${JSON.stringify(selector)} + ' by ' + (top?.className || top?.tagName));
      return {x: box.x + box.width / 2, y: box.y + box.height / 2}; })()`);
    for (const type of ['mousePressed', 'mouseReleased']) await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
  };
  const app = expr => context.evaluate(`(() => { const app = window.__qaApp; return ${expr}; })()`);
  const hidePanels = () => context.evaluate(`for (const el of document.querySelectorAll('body > details')) el.style.display = 'none'`);
  const career = edit => app(`(() => { const w = structuredClone(app.profile.wasteland); (${edit})(w); app.profile = {...app.profile, wasteland: w}; app._saveProfile(); return true; })()`);
  const beat = ids => career(`w => { for (const id of ${JSON.stringify(ids)}) w.warlords[id] = {...w.warlords[id], defeated: true}; }`);
  const toMenu = async () => {
    await app(`app.duel.state.status === 'menu' || app.returnToMenu()`);
    await context.waitFor(`window.__qaApp.duel.state.status === 'menu' && ${ready}`, 'the menu', 60_000);
    await hidePanels();
  };
  const toYard = async () => {
    await toMenu();
    await app(`app.visitWasteland()`);
    await context.waitFor(`window.__qaApp.isYardHomeActive() && !!document.querySelector('.yard-home-panel')`, 'the yard home', 120_000);
    await app(`app.audio.setMuted?.(true)`);
    await hidePanels();
  };

  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});

  // ---- a new player who has found the gate ----------------------------------------------------------------------------
  await context.navigate('/tools/menu-check.html?flags=' + FLAGS);
  await context.waitFor(ready, 'the menu', 90_000);
  await context.evaluate(`(() => { const app = window.__qaApp; app.audio.setMuted?.(true);
    app.addPlayer('Water QA');
    const w = structuredClone(app.profile.wasteland); w.discoveredGate = true;
    app.profile = {...app.profile, wasteland: w}; app.cpuDifficulty = 'easy'; app._saveProfile(); })()`);
  await context.reload();
  await context.waitFor(ready, 'the menu after the profile', 90_000);
  await hidePanels();
  await app(`app.audio.setMuted?.(true)`);
  const start = await app(`app.storyProps('water')`);
  fact(start.available && start.step === 'well' && start.message, 'a new player starts at the dry well, with a message waiting');

  // 1. The Story button with its red dot, and the card with Hollis's note.
  await context.waitFor(`!document.querySelector('#story-visit')?.hidden`, 'the Story button', 20_000);
  fact(await context.evaluate(`!document.querySelector('#story-visit .story-dot')?.hidden`), 'the Story button shows its red dot');
  await shot('01-menu-story-button', 'main menu, Story button with the red dot');
  await click('#story-visit');
  if (await context.evaluate(`!!document.querySelector('[data-story-choose="water"]')`)) await click('[data-story-choose="water"]');
  await context.waitFor(`!!document.querySelector('.story-card [data-story-step="sal"]')`, 'the Water Road card', 10_000);
  await shot('02-story-card-note', 'the Water Road card: Hollis\'s note, chapter 1 open');
  fact(await context.evaluate(`document.querySelectorAll('.story-card [data-story-step]').length === 1`), 'one button on the card');

  // 2. "Race on Sal's road" fills the setup; the player presses START.
  await click('.story-card [data-story-step="sal"]');
  await wait(600);
  const setup = await app(`({stage: app.getRaceChoices().startStage, mode: app.getRaceChoices().mode, pending: app._water?.pending?.mark ?? null})`);
  fact(setup.mode === 'wasteland' && setup.pending === 'sal', 'the setup shows Mad Max Duel on Sal\'s road, waiting for START');
  await shot('03-setup-filled', 'the setup filled: Pacific Canyon, Mad Max Duel');
  // A young driver picks automatic gears; changing them keeps the story job.
  await click('[data-difficulty="casual"]');
  await wait(300);
  fact(await app(`app._water?.pending?.mark === 'sal'`), 'choosing automatic gears keeps the story job');

  // 3. START and the race, driven by the game's autopilot on Easy. Up to three tries.
  let won = false;
  for (let attempt = 1; attempt <= 3 && !won; attempt++) {
    if (attempt > 1) { await toMenu(); await app(`app.waterStep('sal')`); await wait(300); }
    await click('#start-engine');
    await context.waitFor(`window.__qaApp.duel.state.status === 'racing'`, 'GO', 90_000);
    if (attempt === 1) {
      await wait(500);
      fact(await app(`app.storyCaption?.id === 'story.water.job.sal'`), 'Hollis\'s radio line shows at GO');
      await shot('04-race-start-caption', 'the race starts with Hollis on the radio');
    }
    // The game's own autopilot drives (the assisted player of tools/water-easy-driver.mjs wins this race 10 in 10).
    const result = await context.evaluate(`(() => { const a = window.__qaApp; a.stop?.(); a.autopilot = true; a._scriptedCrashDone = true;
      for (let i = 0; i < 60 * 900 && !['stage_result', 'gameover'].includes(a.duel.state.status); i++) a.advance(1 / 60, 1 / 60);
      a.autopilot = false; a.start?.(); const r = a.duel.state.results || {};
      return {status: a.duel.state.status, won: r.won === true, job: r.waterJob ?? null, time: r.timeSec ?? r.stageTimeSec ?? null}; })()`);
    report.races.push(result);
    won = result.won;
  }
  fact(won, 'the autopilot wins Sal\'s road on Easy within three tries');
  await context.waitFor(`!!document.querySelector('.result-panel')`, 'the results', 30_000);
  await hidePanels();
  if (won) {
    fact(await context.evaluate(`!!document.querySelector('.water-road-tick')`), 'the results show the Water Road tick');
    await shot('05-results-tick', 'results: chapter 1 job done, the pipe is patched');
  }

  // ---- the yard ---------------------------------------------------------------------------------------------------------
  await toYard();
  await wait(1500);
  await shot('06-yard-chapter-1', 'the yard: Next up for chapter 1, the dry water works');
  fact(await context.evaluate(`/Next up: Chapter 1/.test(document.querySelector('.yard-home-panel').innerText)`), 'the yard\'s Next up names chapter 1');
  await click('[data-action="yard-cards"]');
  await wait(800);
  await shot('07-story-wall-chapter-1', 'Story Wall: the Water Road chapters');

  // Chapter 2 with Sal beaten and the Dustmonger's hold full: the fight button starts the fight.
  await beat(['sal']);
  await career(`w => { w.territories.dustmonger.hold = 100; }`);
  await toYard();
  await click('[data-action="yard-cards"]');
  await wait(800);
  await shot('08-story-wall-chapter-2', 'Story Wall at chapter 2: one note from V., a button');
  const ch2 = await app(`app.storyProps('water').steps.find(s => s.id === 'dustmonger')`);
  fact(ch2.state === 'open' && !!ch2.button, 'chapter 2 is open with one button: ' + ch2.button);
  if (ch2.action?.type === 'fight') {
    await click('[data-water-step="dustmonger"]');
    await context.waitFor(`window.__qaApp.duel.state.status === 'warlord_intro'`, 'the fight intro', 60_000);
    await shot('09-fight-intro', 'the Dustmonger\'s intro card after the Story Wall button');
    fact(true, 'the fight button starts the fight');
  }

  // Chapters 5 and 8, and the water works filling.
  await beat(LADDER.slice(0, 4));
  await toYard();
  await wait(1500);
  await shot('10-yard-chapter-5', 'the yard at chapter 5: pipe, fuel, valve and roof in place');
  await click('[data-action="yard-cards"]');
  await wait(800);
  await shot('11-story-wall-chapter-5', 'Story Wall at chapter 5');
  await beat(LADDER.slice(0, 7));
  await career(`w => { w.territories.blackiron.hold = 100; }`);
  await toYard();
  await click('[data-action="yard-cards"]');
  await wait(800);
  await shot('12-story-wall-chapter-8', 'Story Wall at chapter 8: the Baron');
  const ch8 = await app(`app.storyProps('water').steps.find(s => s.id === 'blackiron')`);
  fact(ch8.state === 'open' && /Fight Baron Blackiron/.test(ch8.button), 'chapter 8: Fight Baron Blackiron');

  // The finished player: Hollis's end lines on the yard visit, the tower full.
  await beat(LADDER);
  await toYard();
  await wait(1500);
  const end = await app(`({end: app.profile.story?.water?.end === true, cap: app.storyCaption?.id ?? null, stage: app.waterYardStage()})`);
  fact(end.end && end.stage === 8, 'a finished player: the end lines are marked and the water works are full');
  report.endCaption = end.cap;
  await shot('13-yard-finished', 'the yard after the Baron: water runs, Hollis on the radio');
  await click('[data-action="yard-cards"]');
  await wait(800);
  await shot('14-story-wall-chapter-9', 'Story Wall after the Baron: chapter 9 open, the ninth warlord');

  // Chapter 9: Magnus the Magnet, no hold needed. The Story Wall's button starts his fight.
  const ch9 = await app(`app.storyProps('water').steps.find(s => s.id === 'magnus')`);
  fact(ch9?.state === 'open' && ch9.button === 'Fight Magnus the Magnet', 'chapter 9: Fight Magnus the Magnet');
  await click('[data-water-step="magnus"]');
  await context.waitFor(`window.__qaApp.duel.state.status === 'warlord_intro'`, 'Magnus\'s intro', 60_000);
  fact(await context.evaluate(`/Everything metal comes to Magnus/.test(document.body.innerText)`), 'his intro card says his line');
  await shot('15-magnus-intro', 'Magnus the Magnet\'s intro card');
  // The Big Pull in the real fight: the crane, the blue ring and glow, then the red-hot magnet.
  await app(`app.beginWarlordFight()`);
  await context.waitFor(`window.__qaApp.duel.state.status === 'racing'`, 'the fight', 30_000);
  await hidePanels();
  await app(`(() => { const s = app.duel.state, boss = s.opponents[0]; s.s = boss.s + 20; s.lateral = boss.lateral; s.headingError = 0;
    s.speedMph = 0; for (const p of s.arena.participants) p.protectedSec = 0; boss.magnusPull.nextPullSec = s.stageTimeSec; return true; })()`);
  await context.waitFor(`window.__qaApp.duel.state.opponents[0].magnusPull?.stage === 'pull'`, 'the pull', 20_000);
  fact(await app(`app.duel.state.arena.markers.some(m => m.owner === 'magnus' && m.color === 'magnet')`), 'the blue ring shows during the pull');
  await shot('15b-magnus-pull', 'the Big Pull: blue ring, blue magnet');
  await context.waitFor(`window.__qaApp.duel.state.opponents[0].magnusPull?.stage === 'hot'`, 'the red-hot window', 20_000);
  await shot('15c-magnus-hot', 'the red-hot magnet window');
  await beat([...LADDER, 'magnus']);
  await toYard();
  await click('[data-action="yard-cards"]');
  await wait(800);
  fact(await context.evaluate(`/Magnus is back in his scrapyard/.test(document.body.innerText)`), 'beating Magnus ends the road, with a rematch');
  await shot('16-story-wall-finished', 'Story Wall finished: every chapter ticked, Magnus sulking');

  await writeFile(join(context.outputDir, 'water-road.json'), JSON.stringify(report, null, 2) + '\n');
  if (fail.length) throw Error('Water Road facts failed: ' + fail.join(' | '));
}
