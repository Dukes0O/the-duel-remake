// BOWL-REX-FIGHT: night five's Scrapasaurus in the production UI, memory-only saves. A memory-only
// player who has won nights one to four opens night five on Easy, goes straight to the fight, and
// the pictures show the tell (the cone on the floor before any fire), the fire filling that cone,
// and the rest with a battery box open. Then a child-pace driver in the page plays the fight to the
// end; the results name the yard, the purse is paid once, and the yard has its Scrapasaurus.
// Claude runs it on the laptop; pictures go to the evidence folder for the look.
import assert from 'node:assert/strict';

// Each page expression is self-contained and can be checked without a browser.
export const page = {
  ready: `(() => !!window.__qaApp && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:'))()`,
  enter: `(() => { const app = window.__qaApp; app.stop();
    if (!app.addPlayer('Scrapasaurus test').ok) throw Error('Could not create the memory-only player');
    // This memory-only player has won nights one to four.
    const bowl = app.profile.bowl || {};
    app.profile.bowl = {...bowl, version: 1, nightsWon: [1, 2, 3, 4], settledNights: ['night:1', 'night:2', 'night:3', 'night:4'],
      trophies: ['show-night-1', 'show-night-2', 'show-night-3', 'show-night-4']};
    window.__rexCues = [];
    const play = app._showNightCue.bind(app);
    app._showNightCue = id => { window.__rexCues.push(id); return play(id); };
    app.advance(1); app.onFrame?.(app.duel.state); return true; })()`,
  menuButton: `(() => { const button = document.querySelector('#show-night-visit'); return !!button && !button.hidden; })()`,
  frame: `(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))()`,
  openPicker: `(() => { document.querySelector('#show-night-visit').click(); return true; })()`,
  picker: `(() => !!document.querySelector('.bowl-panel [data-action="show-night-start"][data-night="5"]'))()`,
  noRexYet: `(() => window.__qaApp.bowlRexInYard() === false)()`,
  easy: `(() => { document.querySelector('[data-action="show-night-level"][data-level="easy"]').click(); return true; })()`,
  start: `(() => { window.__qaApp.start(); document.querySelector('[data-action="show-night-start"][data-night="5"]').click(); return true; })()`,
  onNightFive: `(() => window.__qaApp.duel.state.bowlNight?.night === 5 && window.__qaApp.duel.state.status !== 'menu')()`,
  // Straight to the night's third event, the fight (the Car Crush and Freestyle are BOWL-HOOKS' own scenario).
  toFight: `(() => { const duel = window.__qaApp.duel, night = duel.state.bowlNight;
    night.show.eventIndex = 2; night.phase = 'result'; return duel.continueBowlNight(); })()`,
  hud: `(() => { const hud = document.querySelector('.bowl-hud'); return !!hud && !hud.hidden && hud.textContent.includes('THE SCRAPASAURUS'); })()`,
  phase: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase ?? null)()`,
  tell: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'tell')()`,
  fire: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'fire')()`,
  rest: `(() => window.__qaApp.duel.state.bowlNight?.event?.rex?.phase === 'rest')()`,
  restGoal: `(() => document.querySelector('.bowl-hud-goal')?.textContent.includes('drive fast up the junk car'))()`,
  coneDrawn: `(() => { const scene = window.__render?.scene; return !!scene?.getObjectByName('Scrapasaurus fire cone')?.visible && !!scene.getObjectByName('Scrapasaurus chest glow')?.visible && !scene.getObjectByName('Scrapasaurus fire')?.visible; })()`,
  // A child-pace driver in the page: round inside the rails, out of the cone and waiting back while fire is
  // coming, and on to the rails for the dropped junk car once a box is open (tools/test-bowl-rex.mjs).
  driver: `(() => { const app = window.__qaApp;
    app._driveAutopilot = function () {
      const duel = this.duel, s = duel.state, fight = s.bowlNight?.event?.rex;
      if (s.status !== 'racing' || !fight) return;
      const places = fight.places, L = places.length, wrap = v => ((v % L) + L) % L;
      const toCar = wrap(s.s - places.car.s + L / 2) - L / 2, fire = fight.phase === 'tell' || fight.phase === 'fire';
      if (fight.phase === 'rest' && toCar > -34 && toCar < -12) this.__rexGoing = true;
      if (toCar > 25 || toCar < -45) this.__rexGoing = false;
      let target = this.__rexGoing ? places.car.lateral : places.rail - places.side * 11;
      if (!this.__rexGoing && fire && toCar > -30 && toCar < 20) target = places.rail - places.side * 12.5;
      const waiting = fire && toCar > -90 && toCar < -35;
      duel.setInput({throttle: s.speedMph < (waiting ? 18 : 37) ? 1 : 0, brake: waiting && s.speedMph > 22 ? .4 : 0, boost: false,
        steer: Math.max(-1, Math.min(1, (s.lateral - target) * .35 + (s.headingError || 0) * 1.6))});
    };
    app.autopilot = true; return true; })()`,
  manual: `(() => { window.__qaApp.autopilot = false; return true; })()`,
  card: `(() => window.__qaApp.duel.state.status === 'bowl_break' && !!document.querySelector('.bowl-result [data-action="show-night-next"]'))()`,
  cardWon: `(() => document.querySelector('.bowl-result')?.dataset.bowlResult === 'won' && document.querySelector('.bowl-result').textContent.includes('all three of its battery boxes'))()`,
  nightDone: `(() => window.__qaApp.duel.state.bowlNight?.phase === 'complete' && !!document.querySelector('[data-bowl-result="night"]'))()`,
  nightYard: `(() => document.querySelector('[data-bowl-result="night"]').textContent.includes('stand in your yard'))()`,
  scrap: `(() => window.__qaApp.profile.wasteland?.scrap ?? 0)()`,
  rexInYard: `(() => window.__qaApp.bowlRexInYard() === true)()`,
  cues: `(() => JSON.stringify(window.__rexCues))()`,
  leave: `(() => { document.querySelector('[data-action="show-night-leave"][data-to="menu"]').click(); return true; })()`,
  menu: `(() => window.__qaApp.duel.state.status === 'menu' && !window.__qaApp.duel.state.bowlNight)()`,
};

const picture = async (context, name) => { await context.evaluate(page.frame); await context.screenshot(name); };

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
  await context.waitFor(page.ready, 'isolated test game', 60000);
  await context.evaluate(page.enter);
  await context.waitFor(page.menuButton, 'SHOW NIGHT on the main menu', 30000);
  assert.ok(await context.evaluate(page.noRexYet), 'before night five the yard has no Scrapasaurus');
  await context.evaluate(page.openPicker);
  await context.waitFor(page.picker, 'the picker offers night five to a player who has won night four', 10000);
  await context.evaluate(page.easy);
  await picture(context, 'bowl-rex-picker');

  await context.evaluate(page.start);
  await context.waitFor(page.onNightFive, 'night five starts', 60000);
  assert.ok(await context.evaluate(page.toFight), 'the night goes on to its third event');
  await context.waitFor(page.hud, 'the HUD names the Scrapasaurus', 60000);
  await picture(context, 'bowl-rex-start');
  // The truck waits by the start line while the Scrapasaurus walks to where it rests.
  await context.waitFor(page.tell, 'its tell where it rests', 60000);
  await picture(context, 'bowl-rex-tell-cone-on-floor');
  assert.equal(await context.evaluate(page.coneDrawn), true, 'the cone is on the floor and its chest glows during the tell, before any fire');
  await context.waitFor(page.fire, 'the fire', 10000);
  await picture(context, 'bowl-rex-fire');
  await context.waitFor(page.rest, 'its rest with a battery box open', 10000);
  assert.ok(await context.evaluate(page.restGoal), 'the HUD says to drive up the junk car now');
  await picture(context, 'bowl-rex-rest-box-open');

  const scrapBefore = await context.evaluate(page.scrap);
  await context.evaluate(page.driver);
  try { await context.waitFor(page.card, 'the fight ends', 300000); }
  finally { await context.evaluate(page.manual); }
  await picture(context, 'bowl-rex-card');
  assert.ok(await context.evaluate(page.cardWon), 'the child-pace driver wins on Easy, all three boxes smashed');
  await context.evaluate(`(() => { document.querySelector('[data-action="show-night-next"]')?.click(); return true; })()`);
  await context.waitFor(page.nightDone, 'night five reaches its results', 30000);
  await picture(context, 'bowl-rex-night-results');
  assert.ok(await context.evaluate(page.nightYard), 'the results say the Scrapasaurus goes to the yard');
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 600, 'night five\'s purse is paid once');
  assert.ok(await context.evaluate(page.rexInYard), 'the yard now has its Scrapasaurus');
  const cues = JSON.parse(await context.evaluate(page.cues));
  for (const cue of ['bowl.rex.roar', 'bowl.rex.fire', 'bowl.rex.box.open', 'bowl.rex.box.smash', 'bowl.rex.fall'])
    assert.ok(cues.includes(cue), `the ${cue} cue played`);
  await context.evaluate(page.leave);
  await context.waitFor(page.menu, 'back on the main menu', 10000);
  assert.equal(await context.evaluate(page.scrap), scrapBefore + 600, 'leaving pays nothing more');
}
