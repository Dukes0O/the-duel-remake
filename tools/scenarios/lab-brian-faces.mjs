// LAB-LOOK: Brian's painted faces in the classroom, and lesson titles that are never broken into word buttons. The pilot has
// learned every classroom word, so a title such as "Lift and weight" would show the fault if it were still there.
// Saves are memory-only (the harness's private origin). Run:  node tools/browser-harness.mjs scenario lab-brian-faces
import {CLASSROOM_LESSONS} from '../../src/lab/classroom/classroom-lessons.js';

const WORDS = [...new Set(Object.values(CLASSROOM_LESSONS).flatMap(lesson => (lesson.words ?? []).map(word => word.id)))];

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Faces QA');
    a.profile = {...a.profile, credits: 20000, lab: {...(a.profile.lab ?? {}), version: 1, notebook: ${JSON.stringify(WORDS)}},
      heli: {...a.profile.heli, version: 1, fuelKg: 400, lessons: {liftoff: true, hover: true, landing: true, carry: true}}};
    a._saveProfile(); document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);

  // The door board, the shop and Ask Brian: every title and name is one piece.
  const brokenTitles = `[...document.querySelectorAll('.lab-side [data-name] .lab-word, .lab-side [data-name].lab-word, .lab-side h3 .lab-word, .lab-side h4 .lab-word')].map(e => e.textContent)`;
  await c.evaluate(`document.querySelector('[data-go="board"]').click()`);
  await c.waitFor(`!!document.querySelector('.lab-door-board li')`, 'door board', 20_000);
  await new Promise(r => setTimeout(r, 600));
  if (!(await c.evaluate(`document.querySelector('.lab-door-board li b').textContent.includes('Lift and weight')`))) throw Error('The door board lost its first lesson.');
  let broken = await c.evaluate(brokenTitles);
  if (broken.length) throw Error('The door board broke up titles: ' + broken.join(', '));
  await c.screenshot('door-board');
  await c.evaluate(`document.querySelector('[data-lab="walk-back"]').click()`);

  await c.evaluate(`document.querySelector('[data-lab-tab="shop"]').click()`);
  await c.waitFor(`!!document.querySelector('.lab-shop-list li')`, 'shop', 20_000);
  await new Promise(r => setTimeout(r, 600));
  broken = await c.evaluate(brokenTitles);
  if (broken.length) throw Error('The shop broke up titles: ' + broken.join(', '));
  await c.screenshot('shop');
  await c.evaluate(`document.querySelector('[data-lab-tab="lessons"]').click()`);

  await c.evaluate(`document.querySelector('[data-go="brian"]').click()`);
  await c.waitFor(`!!document.querySelector('.lab-brian')`, 'ask Brian', 60_000);
  await c.evaluate(`document.querySelector('[data-lab="brian-next"]').click()`);
  await c.waitFor(`document.querySelector('.lab-brian [role="status"]')?.textContent.includes('Try Lift and weight')`, 'Brian suggests a lesson');
  await new Promise(r => setTimeout(r, 600));
  broken = await c.evaluate(`[...document.querySelectorAll('.lab-brian [data-name] .lab-word, .lab-brian h3 .lab-word')].map(e => e.textContent)`);
  if (broken.length) throw Error('Ask Brian broke up a name: ' + broken.join(', '));
  await c.screenshot('ask-brian');
  await c.evaluate(`document.querySelector('[data-lab="walk-back"]').click()`);

  // The classroom: four faces asked for at once, 132 pixels square with a 14 pixel corner, one shown, fading in 150 ms.
  await c.evaluate(`document.querySelector('[data-go="weighing-pad"]').click()`);
  await c.waitFor(`JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')?.step === 'wonder'`, 'Lift classroom', 60_000);
  await c.waitFor(`document.querySelectorAll('.lc-face.ready').length === 4`, 'all four faces loaded', 20_000);
  await c.waitFor(`getComputedStyle(document.querySelector('.lc-face[data-face="' + document.querySelector('.lc-portrait').dataset.mood + '"]')).opacity === '1'`, 'the face for the mood has faded in', 20_000);
  const look = await c.evaluate(`(() => { const p = document.querySelector('.lc-portrait'), r = p.getBoundingClientRect(), s = getComputedStyle(p);
    const faces = [...p.querySelectorAll('.lc-face')].map(f => ({mood: f.dataset.face, width: f.naturalWidth, opacity: getComputedStyle(f).opacity, fade: getComputedStyle(f).transitionDuration}));
    return {width: r.width, height: r.height, radius: s.borderTopLeftRadius, mood: p.dataset.mood, faces}; })()`);
  if (look.width !== 132 || look.height !== 132 || look.radius !== '14px') throw Error('Brian’s portrait is not 132 pixels square with a 14 pixel corner: ' + JSON.stringify(look));
  if (look.faces.length !== 4 || look.faces.some(f => f.width !== 512 || f.fade !== '0.15s')) throw Error('The four faces are not all 512 pixels wide and fading in 150 ms: ' + JSON.stringify(look.faces));
  if (look.faces.filter(f => f.opacity === '1').map(f => f.mood).join() !== look.mood) throw Error('The face shown does not match the mood: ' + JSON.stringify(look));
  await c.screenshot('classroom');
}
