// WW-SCREENS browser review: memory-only save, private QA tab, 1280x720.
// Claude runs this after WW-HOOKS and WW-SAVE are integrated. It checks the
// Story choice, its single next action, the yard's next job,
// Next up, the Story Wall, notice board and job result tick.
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';

const FLAGS = 'story-everburn,scablands';
const ready = `document.readyState==='complete' && !!window.__qaApp && !document.querySelector('#start-engine')?.disabled`;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export async function run(context) {
  const report = {frames: [], facts: []}, failures = [];
  const fact = (value, label) => { report.facts.push({ok: !!value, label}); if (!value) failures.push(label); };
  const app = expr => context.evaluate(`(() => { const app = window.__qaApp; return ${expr}; })()`);
  const click = async selector => {
    const p = await context.evaluate(`(() => { const n=document.querySelector(${JSON.stringify(selector)}); if(!n||n.hidden||n.disabled) throw Error('Unavailable: '+${JSON.stringify(selector)});
      n.scrollIntoView({block:'center'}); const r=n.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
    for (const type of ['mousePressed','mouseReleased']) await context.command('Input.dispatchMouseEvent', {type, button:'left', clickCount:1, ...p});
  };
  const shot = async name => { await wait(300); await context.screenshot(name); report.frames.push(name); };
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=' + FLAGS);
  await context.waitFor(ready, 'the Everburn menu', 90_000);
  await app(`(() => { app.audio.setMuted?.(true); app.addPlayer('Everburn QA'); const w=structuredClone(app.profile.wasteland); w.discoveredGate=true; app.profile={...app.profile,wasteland:w}; app._saveProfile(); return true; })()`);
  await context.reload();
  await context.waitFor(ready, 'the menu with a memory-only player', 90_000);
  fact(await app(`app.storyProps('ember')?.available === true`), 'the Everburn Story is available');
  await context.waitFor(`!document.querySelector('#story-visit')?.hidden`, 'the Story button', 20_000);
  await click('#story-visit');
  if (await context.evaluate(`!!document.querySelector('[data-story-choose="ember"]')`)) await click('[data-story-choose="ember"]');
  await context.waitFor(`!!document.querySelector('.story-card [data-story-step="hot-delivery"]')`, 'Hot Delivery on the Story card', 15_000);
  fact(await context.evaluate(`document.querySelectorAll('.story-card [data-story-step]').length === 1`), 'the Story card has one next job button');
  await shot('everburn-story-card');
  await click('.story-card [data-story-step="hot-delivery"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, 'the yard after choosing the back gate', 120_000);
  fact(await context.evaluate(`/Next up: Hot Delivery/.test(document.body.innerText)`), 'the yard names Hot Delivery as Next up');
  await shot('everburn-yard-next-up');
  // The QA panel on the test page sits over the yard's buttons, and a real click would land on it.
  await context.evaluate(`(() => { for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false; return true; })()`);
  await click('.yard-next-button[data-ember-step="hot-delivery"]');
  await context.waitFor(`window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'everburn-hot-delivery'`, 'yard Next up starts Hot Delivery', 60000);
  fact(await app(`app.duel.state.arena?.worldJob?.definition.id === 'everburn-hot-delivery'`), 'the yard Next up button starts the next story job');
  await app(`app.returnToMenu()`);
  await context.waitFor(ready, 'menu after leaving Hot Delivery', 60000);
  await click('[data-action="wasteland-visit"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, 'return to the yard', 120000);
  await context.evaluate(`(() => { for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false; return true; })()`);
  await click('[data-action="yard-cards"]');
  await context.waitFor(`!!document.querySelector('.ember-wall')`, 'the Everburn Story Wall', 15_000);
  fact(await context.evaluate(`document.querySelectorAll('.ember-wall [data-ember-step]').length === 1`), 'the Story Wall has one next job button');
  await shot('everburn-story-wall');
  await app(`(() => { const p=structuredClone(app.profile); p.story={...p.story,ember:{read:true,jobs:['hot-delivery','get-out-and-walk']}}; app.profile=p; app._saveProfile(); return true; })()`);
  await context.reload();
  await context.waitFor(ready, 'the menu after story progress', 90_000);
  await click('[data-action="wasteland-visit"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, 'the yard after story progress', 120_000);
  await context.evaluate(`(() => { for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false; return true; })()`);
  await click('[data-action="yard-cards"]');
  await context.waitFor(`!!document.querySelector('.ember-wall')`, 'the Story Wall after story progress', 15_000);
  // Only jobs 1 to 4 are remade (REMADE_EVERBURN_JOBS), and no side job is: the board opens with job 2 and says its jobs are being made.
  fact(await context.evaluate(`/TIN TOWN NOTICE BOARD/.test(document.body.innerText)`), 'job 2 opens the notice board');
  fact(await context.evaluate(`!document.querySelector('.ember-notice-board [data-ember-side-job]') && !/Lost Prospector|Survey Flags|Hot Soup/.test(document.querySelector('.ember-notice-board').textContent) && /The next job is being made\./.test(document.querySelector('.ember-notice-board').textContent)`), 'the notice board lists no side job that is not yet remade and says the next job is being made');
  fact(await context.evaluate(`document.querySelectorAll('.ember-wall [data-ember-step]').length === 1 && !!document.querySelector('.ember-wall [data-ember-step="run-him-down"]')`), 'with jobs 1 and 2 done, job 3 is the one open job');
  await shot('everburn-notice-board');
  // Jobs 1 to 4 done: job 5 is not remade, so the wall says so and offers no button for it.
  await app(`(() => { const p=structuredClone(app.profile); p.story={...p.story,ember:{read:true,jobs:['hot-delivery','get-out-and-walk','run-him-down','slow-ride']}}; app.profile=p; app._saveProfile(); return true; })()`);
  await context.reload();
  await context.waitFor(ready, 'the menu after jobs 1 to 4', 90_000);
  await click('[data-action="wasteland-visit"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, 'the yard after jobs 1 to 4', 120_000);
  await context.evaluate(`(() => { for(const panel of document.querySelectorAll('details'))if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false; return true; })()`);
  await click('[data-action="yard-cards"]');
  await context.waitFor(`!!document.querySelector('.ember-wall')`, 'the Story Wall after jobs 1 to 4', 15_000);
  fact(await context.evaluate(`/The next job is being made\./.test(document.querySelector('[data-ember-job="key-under-the-mall"]')?.textContent || '') && !document.querySelector('.ember-wall [data-ember-step]')`), 'job 5 reads "The next job is being made" and has no button');
  await shot('everburn-job-5-waiting');
  await writeFile(join(context.outputDir, 'everburn.json'), JSON.stringify(report, null, 2) + '\n');
  if (failures.length) throw Error('Everburn screen facts failed: ' + failures.join(' | '));
}
