import assert from 'node:assert/strict';
import {page} from './bowl-night-pay.mjs';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1282, height: 716, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=titan-bowl');
  await context.waitFor(page.ready, 'isolated memory-only Show Night', 60000);
  const rows = await context.evaluate(`(() => {
    const app = window.__qaApp, results = [];
    if (innerWidth !== 1282 || innerHeight !== 716) throw Error('Unexpected HUD viewport');
    app.stop();
    const textBoxes = node => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()].map(rect => rect.toJSON());
    };
    for (const [night, eventIndex] of [[1,1],[2,1],[3,1],[5,0]]) {
      if (!app.duel.startBowlNight({night,eventIndex,cpuDifficulty:'hard'})) throw Error('Could not start Freestyle Night ' + night);
      const state = app.duel.state;
      Object.assign(state.bowlNight.event, {score:28425, rivalScore:20000, rivalBeaten:true,
        rivalPopup: {trick:'Double barrel roll', points:2475, at:state.bowlNight.clock}});
      app.onFrame?.(state, 0);
      const hud = document.querySelector('.bowl-hud[data-event="freestyle"]');
      if (!hud || !hud.getClientRects().length) throw Error('Freestyle HUD hidden in Night ' + night);
      results.push({night, hud:hud.getBoundingClientRect().toJSON(),
        goal:textBoxes(hud.querySelector('.bowl-hud-goal')), scores:textBoxes(hud.querySelector('.bowl-hud-gap'))});
    }
    return results;
  })()`);
  for (const {night, goal, scores, hud} of rows) {
    assert.equal(goal.length, 1, 'Night ' + night + ' goal fits on one line');
    assert.equal(scores.length, 1, 'Night ' + night + ' scores fit on one line');
    assert.ok(goal[0].bottom <= scores[0].top, 'Night ' + night + ' keeps the goal above the scores');
    for (const box of [goal[0], scores[0]]) {
      assert.ok(box.left >= hud.left && box.right <= hud.right && box.bottom <= hud.bottom,
        'Night ' + night + ' keeps both lines inside the strip');
    }
  }
  console.log('Freestyle at 1282 × 716: separate goal and score lines on Nights 1, 2, 3 and 5.');
}
