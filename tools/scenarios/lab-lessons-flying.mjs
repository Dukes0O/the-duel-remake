// Real Lab navigation and machine inputs, on the harness's memory-only origin.
import * as projectile from '../../src/lab/lessons/projectile-lesson.js';
import * as fire from '../../src/lab/lessons/fire-lesson.js';
import * as pendulum from '../../src/lab/lessons/pendulum-lesson.js';
import * as altitude from '../../src/lab/lessons/altitude-lesson.js';

export async function run(c) {
  const onlyLessons = (process.env.LAB_FLYING_LESSON ?? '').split(',').filter(Boolean);
  if (onlyLessons.some(id => !['projectile', 'fire', 'pendulum', 'altitude'].includes(id))) throw Error('Unknown Flying lesson filter.');
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-2,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Flying QA'); a.profile = {...a.profile, heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}}; a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, text = `document.querySelector('.lab-teaching')?.textContent`;
  const click = async action => {
    try {
      await c.waitFor(`!!document.querySelector('[data-teach="${action}"]') && !document.querySelector('[data-teach="${action}"]').disabled`, action, 12_000);
      await c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
    } catch (e) { await c.screenshot('blocked-action'); throw Error(e.message + ': ' + await c.evaluate(`document.querySelector('.lab-teaching')?.textContent`)); }
  };
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: code === 'KeyE' ? 'e' : code.slice(3).toLowerCase()});
  async function walk(code, expression) {
    await c.evaluate(`${canvas}.focus()`); await key(code, 'keyDown');
    try {
      // Stop on the browser's next frame, rather than after a delayed CDP
      // round trip. All movement still comes from real held walk keys.
      await c.evaluate(`new Promise((resolve, reject) => { const until = performance.now() + 18000; function step() { if (${expression}) { document.dispatchEvent(new KeyboardEvent('keyup', {code: '${code}', bubbles: true})); resolve(true); } else if (performance.now() > until) reject(Error('Walk blocked at ' + ${canvas}.dataset.labWalkPosition)); else requestAnimationFrame(step); } step(); })`);
    } catch (e) { await c.screenshot('blocked-walk'); throw Error(e.message + ' ' + expression + ' at ' + await c.evaluate(`${canvas}.dataset.labWalkPosition`)); } finally { await key(code, 'keyUp'); }
    await new Promise(r => setTimeout(r, 500));
  }
  const pos = axis => `JSON.parse(${canvas}.dataset.labWalkPosition)[${axis}]`;
  const ready = () => c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'next step', 45_000);
  async function touch(control) {
    await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').some(p => p.id === '${control}')`, 'machine part');
    const point = await c.evaluate(`(() => { const el = ${canvas}, b = el.getBoundingClientRect(), p = JSON.parse(el.dataset.labLessonControls).find(p => p.id === '${control}'); return {x: b.left + p.x, y: b.top + p.y}; })()`);
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...point});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...point});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 1100, y: 125});
  }
  let scaleIntroductions = 0;
  for (const p of [projectile, fire, pendulum, altitude]) {
    if (onlyLessons.length && !onlyLessons.includes(p.definition.id)) continue;
    const id = p.definition.id;
    await c.evaluate(`window.__qaApp.openLab()`);
    await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
    await walk('KeyW', `${pos(2)} < -3.95`);
    if (id === 'fire') {
      await walk('KeyA', `${pos(0)} < -14`); await walk('KeyS', `${pos(2)} > 4.2`); await walk('KeyD', `${pos(0)} > -12.4`);
    } else await walk('KeyA', `${pos(0)} < ${id === 'projectile' ? -11.5 : id === 'pendulum' ? -6.7 : -2.7}`);
    await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the ${p.definition.id === 'projectile' ? 'Projectile' : id === 'fire' ? 'Fire' : id === 'pendulum' ? 'Pendulum' : 'Air'}')`, `${id} machine`);
    await key('KeyE', 'keyDown'); await key('KeyE', 'keyUp');
    await c.waitFor(`${text}?.includes('Wonder')`, `${id} wonder`);
    await new Promise(r => setTimeout(r, 3000));
    if (await c.evaluate(`${text}?.includes('This is a model, one tenth the size.')`)) scaleIntroductions++;
    await c.screenshot(`${id}-wonder`); await click('next');
    for (const w of p.definition.words) {
      await c.waitFor(`document.querySelector('.lab-teaching h4')?.textContent === ${JSON.stringify(w.word)}`, w.word);
      await new Promise(r => setTimeout(r, 1200)); await c.screenshot(`${id}-word-${w.animation}`); await click('next');
    }
    for (let n = 0; n < p.definition.worked.length; n++) {
      // Show the actual experiment in motion, then still require the full
      // worked example to finish before proceeding.
      await new Promise(r => setTimeout(r, id === 'fire' ? 600 : id === 'pendulum' ? 2500 : id === 'projectile' ? 3600 : 1200));
      await c.screenshot(`${id}-watch-${n}`); await ready(); await click('next');
    }
    await c.screenshot(`${id}-prediction`);
    if (!(await c.evaluate(`[...document.querySelectorAll('.lab-lift-overlay .lab-lift-force')].every(el => el.hidden)`))) throw Error('Prediction captions are visible.');
    for (let i = 0; i < 3; i++) {
      if (id === 'projectile') {
        // Turn the actual flag on the sand once. The initial 24 m flag is
        // intentionally past this splash, so the first run exercises help.
        if (i === 0) {
          await click('answer:hit');
          await touch('flagM'); await click('run');
          await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'flag miss'); await c.screenshot('projectile-hint'); await click('retry');
        }
        if (i === 1) await click('control:speedMs');
        if (i === 2) await click('control:heightM');
        await click('answer:hit'); // Fold the prediction cards before touching the low flag handle.
        await c.waitFor(`JSON.parse(${canvas}.dataset.labFlyingDrawing).input.${i === 1 ? 'speedMs' : 'heightM'} === ${i === 1 ? 11 : i === 2 ? 35 : 30}`, 'rendered drop setting');
        await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').some(p => p.id === 'flagM')`, 'rendered flag handle');
        const state = await c.evaluate(`JSON.parse(${canvas}.dataset.labFlyingDrawing)`);
        const flag = await c.evaluate(`(() => { const el = ${canvas}, b = el.getBoundingClientRect(), p = JSON.parse(el.dataset.labLessonControls).find(p => p.id === 'flagM'); return {x: b.left + p.x, y: b.top + p.y}; })()`);
        const delta = (Math.round(state.reading.water.distanceM) - state.reading.flagM) / 80 * 180;
        await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...flag});
        await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', button: 'left', buttons: 1, x: flag.x, y: flag.y - delta});
        await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, x: flag.x, y: flag.y - delta});
        await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 1100, y: 125});
      } else if (id === 'fire') {
        await click(`answer:${['heat', 'air', 'fuel'][i]}`);
        if (i === 0) await touch('water'); else await click(`control:${['water', 'sand', 'rake'][i]}`);
        if (i === 2) await click('control:spray');
      } else if (id === 'pendulum') {
        await click(`answer:${i === 2 ? 'slower' : 'same'}`);
        if (i === 0) await touch('pull'); // release the first pull; put it back with the named handle
        if (i === 0) await click('control:pull');
        if (i === 1) await click('control:weightKg');
        if (i === 2) await click('control:lengthM');
      } else {
        await click(`answer:${i < 2 ? 'up' : 'down'}`);
        if (i === 0) { await touch('siteIndex'); await click('control:siteIndex'); await click('control:siteIndex'); }
        if (i === 1) await click('control:loadKg');
      }
      await click('run'); await c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, `${id} try ${i}`, 40_000);
      await c.screenshot(`${id}-try-${i}`); await click('next');
    }
    for (let i = 0; i < p.definition.checks.length; i++) {
      const q = p.definition.checks[i]; await c.screenshot(`${id}-check-${i}`);
      await click(`answer:${i === 0 ? q.answers.find(a => a.id !== q.correct).id : q.correct}`);
      if (i === 0) await c.waitFor(`${text}?.includes('Watch the highlighted picture')`, 'wrong answer replay');
      await click('next');
    }
    if (!(await c.evaluate(`!window.__qaApp.profile.lab.done['${id}'] && ${JSON.stringify(p.definition.words.map(w => w.id))}.every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
    await c.screenshot(`${id}-key-idea`);
    await click('challenge');
    await c.waitFor(`window.__qaApp.heliSession?.view().challenge?.id === '${id}' && !document.querySelector('.lab-key-idea').hidden`, 'existing flying challenge', 60_000);
    await c.waitFor(`window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden && document.querySelector('#view3d canvas')?.style.visibility !== 'hidden'`, 'presented challenge world', 120_000);
    await new Promise(r => setTimeout(r, 1200));
    if (!(await c.evaluate(`(() => {
      const card = document.querySelector('.lab-key-idea').getBoundingClientRect();
      return [...document.querySelectorAll('button,input,select,a[href]')].every(el => {
        const r = el.getBoundingClientRect();
        return !r.width || !r.height || r.right <= card.left || r.left >= card.right || r.bottom <= card.top || r.top >= card.bottom;
      });
    })()`))) throw Error('The key-idea card overlaps an interactive control.');
    await c.screenshot(`${id}-challenge`);
    await c.evaluate(`window.__qaApp.returnToMenu()`);
  }
  if (scaleIntroductions !== 1) throw Error('Brian must explain the model scale exactly once.');
}
