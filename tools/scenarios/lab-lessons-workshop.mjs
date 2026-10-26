// Real lesson frame and machine controls in a fresh memory-only career.
import * as strength from '../../src/lab/lessons/strength-lesson.js';
import * as rust from '../../src/lab/lessons/rust-lesson.js';
import * as gforce from '../../src/lab/lessons/gforce-lesson.js';
import * as headings from '../../src/lab/lessons/headings-lesson.js';
import {MAP_LEGS} from '../../src/lab/lessons/headings-animation.js';

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-2');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Workshop QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}},
      heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, text = `document.querySelector('.lab-teaching')?.textContent`;
  const click = action => c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  async function ready() { await c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'step ready', 45_000); }
  async function target(id) {
    await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').some(p => p.id === '${id}')`, `control ${id}`);
    return c.evaluate(`(() => { const el = ${canvas}, b = el.getBoundingClientRect(), p = JSON.parse(el.dataset.labLessonControls).find(p => p.id === '${id}'); return {x: b.left + p.x, y: b.top + p.y}; })()`);
  }
  async function touch(id) {
    const p = await target(id);
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', button: 'left', clickCount: 1, ...p});
  }
  async function drag(id, before, value, min, max) {
    const p = await target(id), y = p.y - (value - before) / (max - min) * 180;
    await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', button: 'left', clickCount: 1, ...p});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: p.x, y, button: 'left', buttons: 1});
    await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: p.x, y, button: 'left', clickCount: 1});
  }
  async function open(id) {
    await c.evaluate(`window.__qaApp.closeLab()`);
    await c.waitFor(`!${canvas}`, 'previous room disposed');
    await c.evaluate(`window.__qaApp.openLab()`);
    await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
    const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: code.slice(3).toLowerCase()});
    async function walk(code, expression) {
      await key(code, 'keyDown'); try { await c.waitFor(expression, code, 15_000); } finally { await key(code, 'keyUp'); }
      await new Promise(r => setTimeout(r, 500));
    }
    const [x, z] = {strength: [3, -4.1], rust: [7, -5.5], gforce: [8, 1.9], headings: [12, -4.5]}[id];
    await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < ${id === 'rust' ? -4.3 : 3.6}`);
    if (id === 'rust') {
      // Stop in the narrow aisle between the bending rig and the turning arm.
      // Short inputs remove long-walk coasting before crossing the room.
      for (let n = 0; n < 50; n++) {
        const at = await c.evaluate(`JSON.parse(${canvas}.dataset.labWalkPosition)[2]`);
        if (Math.abs(at + 5.05) < .08) break;
        const code = at > -5.05 ? 'KeyW' : 'KeyS';
        await key(code, 'keyDown'); await new Promise(r => setTimeout(r, 100));
        await key(code, 'keyUp'); await new Promise(r => setTimeout(r, 250));
      }
      if (!(await c.evaluate(`Math.abs(JSON.parse(${canvas}.dataset.labWalkPosition)[2] + 5.05) < .08`))) throw Error('Could not align with the workshop aisle.');
    }
    await walk('KeyD', `JSON.parse(${canvas}.dataset.labWalkPosition)[0] > ${x - .1}`);
    await walk('KeyW', `JSON.parse(${canvas}.dataset.labWalkPosition)[2] < ${z}`);
    await c.waitFor(`document.querySelector('.lab-walk-prompt')?.textContent.includes('E: use the')`, 'machine prompt');
    await c.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
    await c.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69});
    // A single-lesson machine opens directly; multi-lesson machines show a choice.
    if (await c.evaluate(`!!document.querySelector('[data-lab-lesson="start:${id}"]')`)) await c.evaluate(`document.querySelector('[data-lab-lesson="start:${id}"]').click()`);
    await c.waitFor(`${canvas}.dataset.workshopDrawing && !document.querySelector('.lab-teaching').hidden`, `${id} lesson`);
    if (await c.evaluate(`!!document.querySelector('.lab-bench')`)) throw Error('Old panel remains during teaching.');
    if (await c.evaluate(`!document.querySelector('.lab-key-idea').hidden`)) throw Error('A previous challenge card leaked into this lesson.');
  }
  // A bounded continuation may name only the unfinished lessons; the normal
  // scenario always runs all four. Earlier green lessons keep their evidence.
  const selected = process.env.WORKSHOP_QA_LESSONS?.split(',');
  if (selected?.some(id => !['strength', 'rust', 'gforce', 'headings'].includes(id))) throw Error('Unknown workshop lesson filter.');
  for (const packet of [strength, rust, gforce, headings].filter(p => !selected || selected.includes(p.definition.id))) {
    const d = packet.definition, id = d.id;
    await open(id);
    await new Promise(r => setTimeout(r, 1800)); await c.screenshot(`${id}-wonder`); await click('next');
    for (const row of d.words) {
      await c.waitFor(`document.querySelector('.lab-teaching h4')?.textContent === ${JSON.stringify(row.word)}`, row.word);
      await new Promise(r => setTimeout(r, 600));
      await c.screenshot(`${id}-word-${row.animation}`); await click('next');
    }
    for (let i = 0; i < d.worked.length; i++) {
      await ready(); await c.screenshot(`${id}-watch-${i}`); await click('next');
    }
    await c.waitFor(`!!document.querySelector('[data-teach="answer:${d.tries[0].prediction.correct}"]')`, 'prediction');
    await c.screenshot(`${id}-prediction`);
    if (await c.evaluate(`[...document.querySelectorAll('[data-workshop] > div')].some(el => !el.hidden)`)) throw Error('Floating captions on prediction.');
    // One deliberate mismatch proves the first useful hint in the real UI.
    const wrong = id === 'rust' ? 'clean' : id === 'gforce' ? 'more' : id === 'strength' ? 'holds' : 'pad';
    await click(`answer:${wrong}`); await click('run');
    await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'failed try and help', 35_000);
    await c.screenshot(`${id}-hint`); await click('retry');
    for (let index = 0; index < 3; index++) {
      const wanted = id === 'gforce' ? ['more', 'less', 'same'][index] : id === 'rust' ? 'clean' : id === 'strength' ? 'holds' : 'pad';
      await click(`answer:${wanted}`);
      if (id === 'strength') {
        await touch('part'); await touch('materialDial'); await drag('thicknessMm', 30, 50, 5, 120);
        await c.waitFor(`JSON.parse(${canvas}.dataset.workshopDrawing).input.material === 'carbon fibre' && Math.abs(JSON.parse(${canvas}.dataset.workshopDrawing).input.thicknessMm - 50) < .01`, 'real material dial and thickness handle');
      } else if (id === 'rust') {
        await touch('coatDial'); await touch('coatDial');
        await c.waitFor(`JSON.parse(${canvas}.dataset.workshopDrawing).input.protection === 'zinc'`, 'real zinc dial');
      } else if (id === 'gforce') {
        const turns = [2, 3, 0][index];
        for (let j = 0; j < turns; j++) await touch('speedMph');
        await c.waitFor(`JSON.parse(${canvas}.dataset.workshopDrawing).actual === '${wanted}'`, 'speed crank');
      } else {
        await c.waitFor(`${canvas}.dataset.workshopToy === 'ready'`, 'real toy helicopter');
        const leg = MAP_LEGS[index];
        const heading = Math.round(leg.truth.headingDeg), ruler = Math.round(leg.truth.distanceUnits * 10) / 10;
        await drag('headingDeg', 270, heading, 0, 359); await drag('rulerUnits', 4, ruler, .1, 20);
        await c.waitFor(`JSON.parse(${canvas}.dataset.workshopDrawing).actual === 'pad'`, 'compass and ruler');
      }
      await click('run'); await ready();
      await c.screenshot(`${id}-try-${index}`); await click('next');
    }
    for (let index = 0; index < d.checks.length; index++) {
      const q = d.checks[index];
      await click(`answer:${q.answers.find(a => a.id !== q.correct).id}`);
      await c.waitFor(`${text}.includes('Watch the highlighted picture.')`, 'wrong check replays right answer');
      await c.screenshot(`${id}-check-${index}`); await click('next');
    }
    if (!(await c.evaluate(`${text}.includes(${JSON.stringify(d.challenge.text)}) && !window.__qaApp.profile.lab?.done?.['${id}']`))) throw Error('Challenge card or reward isolation failed.');
    // Do not leave the pointer over prose that appears when the machine closes:
    // hovering a learned word deliberately opens its meaning and hides the card.
    await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 2, y: 2});
    await click('challenge');
    if (id === 'strength') {
      await c.waitFor(`${text}.includes('Challenge') && !!document.querySelector('[data-teach="answer:holds"]')`, 'inline challenge');
      await click('answer:holds'); await touch('part'); await touch('materialDial'); await drag('thicknessMm', 30, 50, 5, 120);
      await click('run'); await c.waitFor(`!!document.querySelector('[data-teach="finish"]')`, 'bench goal');
      await c.screenshot(`${id}-challenge`); await click('finish');
      await c.waitFor(`window.__qaApp.profile.lab.done.strength === true`, 'existing strength challenge awarded');
    } else if (id === 'rust') {
      try { await c.waitFor(`!!document.querySelector('[data-lab-protect="underbody"]') && !document.querySelector('.lab-key-idea').hidden`, 'real protection challenge'); }
      catch (error) { await c.screenshot('rust-handoff-failure'); throw Error(`${error.message} ${await c.evaluate(`JSON.stringify({panel: document.querySelector('.lab-teaching')?.textContent, card: document.querySelector('.lab-key-idea')?.outerHTML, side: document.querySelector('.lab-side')?.textContent})`)}`); }
      await c.screenshot(`${id}-challenge`);
      await c.evaluate(`(() => { for (const [part, value] of Object.entries({underbody:'zinc', exhaust:'bare', armour:'zinc'})) { const el = document.querySelector('[data-lab-protect="'+part+'"]'); el.value = value; el.dispatchEvent(new Event('change', {bubbles:true})); } document.querySelector('[data-lab="protect-check"]').click(); })()`);
      await c.waitFor(`window.__qaApp.profile.lab.done.rust === true`, 'real rust challenge awarded');
    } else if (id === 'gforce') {
      await c.waitFor(`!window.__qaApp.labOpen && !!window.__qaApp.labLap.waiting`, 'real G-force lap handoff'); await c.screenshot(`${id}-challenge`);
    } else {
      await c.waitFor(`window.__qaApp.heliSession?.view().challenge?.id === 'headings' && !document.querySelector('.lab-key-idea').hidden`, 'real navigation challenge', 60_000);
      await c.screenshot(`${id}-challenge`);
    }
    await c.evaluate(`window.__qaApp.returnToMenu()`);
  }
  await c.evaluate(`window.__qaApp.closeLab()`);
}
