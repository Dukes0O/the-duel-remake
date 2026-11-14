// Go-live round (13 November 2026): the Tin Town notice board's three jobs, taken from the Story Wall's "Take job" button in the real game.
// Each starts as a world job at its start place and takes one picture; back in the yard the wall offers the job again.
// Memory-only storage.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const click = (c, selector) => c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});if(!b||b.hidden||b.disabled)throw Error('Missing '+${JSON.stringify(selector)});b.click();return true})()`);
const TWO = `['hot-delivery','get-out-and-walk']`;
const BOARD = [
  {key: 'lost-prospector', name: 'LOST PROSPECTOR', start: [543, 192]},
  {key: 'survey-flags', name: 'SURVEY FLAGS', start: [543, 192]},
  {key: 'hot-soup', name: 'HOT SOUP', start: [624, -2]},
];

export async function run(c) {
  await c.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-side-jobs');
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"', 'memory-only menu', 90000);
  const ember = `a.profile={...a.profile,wasteland:{...a.profile.wasteland,version:1,discoveredGate:true},story:{...a.profile.story,ember:{...(a.profile.story?.ember||{}),read:true,jobs:${TWO}}}};a.cpuDifficulty='medium';a._saveProfile();`;
  await c.evaluate(`(()=>{const a=window.__qaApp;if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('memory-only storage missing');${ember}})()`);
  await c.waitFor(`!!document.querySelector('#wasteland-visit')&&!document.querySelector('#wasteland-visit').hidden`, 'WASTELAND button', 60000);
  await click(c, '#wasteland-visit');
  await c.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
  await c.evaluate(`(()=>{const a=window.__qaApp;${ember}})()`);
  const out = {jobs: []};
  for (const job of BOARD) {
    await click(c, '[data-action="yard-cards"]');
    await c.waitFor(`document.querySelector('[data-ember-side-job="${job.key}"]')`, `${job.key} on the notice board`, 30000);
    await click(c, `[data-ember-side-job="${job.key}"]`);
    await c.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job"&&window.__qaApp.duel.state.status==="racing"', `${job.key} racing`, 120000);
    const started = await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,d=s.arena.worldJob.definition,at=a.duel.course.worldAt(s.s,s.lateral);
      if(s.arena.venueId!=='scablands'||d.id!=='everburn-${job.key}')throw Error('Wrong job: '+d.id);
      if(Math.hypot(at.x-(${job.start[0]}),at.z-(${job.start[1]}))>1)throw Error('The car did not start at ${job.start}: '+at.x+', '+at.z);
      const text=document.body.innerText;
      if(!text.toUpperCase().includes(${JSON.stringify(job.name)}))throw Error('The job name is not on the HUD');
      if(/scrapdome|last car rolling/i.test(text)||document.querySelector('.arena-board:not([hidden])'))throw Error('Arena labels leaked into the job HUD');
      return {id:d.id,at:{x:Math.round(at.x),z:Math.round(at.z)},objective:document.querySelector('.world-hud-line')?.innerText||''};})()`);
    await c.screenshot(`side-job-${job.key}`);
    const jobsBefore = await c.evaluate('window.__qaApp.profile.story.ember.jobs.length');
    if (job === BOARD[0]) {
      // The pause screen of a world job: its own words and three buttons, wholly inside the card at two screen sizes; BACK TO THE YARD leaves in one click
      // and the results screen (TRY AGAIN, BACK TO THE YARD) shows at once.
      const press = async () => {
        await c.command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
        await c.command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
      };
      await press();
      await c.waitFor('window.__qaApp.duel.state.paused===true&&document.querySelector(".result-panel")', 'the pause screen', 30000);
      const inside = `(()=>{const p=document.querySelector('.result-panel'),text=p.innerText.replace(/\\s+/g,' ').trim();
        if(!/THE SCABLANDS \\/ PAUSED/.test(text)||!/JOB\\s*ON HOLD/.test(text))throw Error('Not the job pause screen: '+text);
        if(!/RESCUE THE TWO LOST PROSPECTORS/i.test(text)||!/LOST PROSPECTOR/i.test(text))throw Error('The pause screen does not say what the job asks: '+text);
        if(/SCRAPDOME|FIGHT|REMATCH|TIME LEFT|SCORE/.test(text))throw Error('Fight words on the job pause screen: '+text);
        const labels=[...p.querySelectorAll('button')].map(b=>b.innerText.replace(/\\s+/g,' ').trim());
        if(labels.join('|')!=='BACK TO THE JOB|START AGAIN|BACK TO THE YARD')throw Error('Wrong buttons: '+labels);
        if(document.documentElement.scrollWidth>innerWidth)throw Error('The pause screen runs off the right edge (scroll width '+document.documentElement.scrollWidth+' of '+innerWidth+')');
        for(const el of p.querySelectorAll('p,b,h2,h1,button,strong,span')){const r=el.getBoundingClientRect();if(r.width&&r.right>innerWidth-8)throw Error('Something on the pause screen is cut off at the right: '+el.tagName+' '+el.innerText.slice(0,40));}
        return text;})()`;
      await c.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
      out.pauseText = await c.evaluate(inside);
      // The QA page's own test panels are not part of the game: they are hidden for the picture.
      await c.evaluate("document.querySelectorAll('details').forEach(d => { if (/MENU QA/.test(d.innerText)) d.style.display = 'none'; })");
      await c.screenshot('side-job-paused');
      await c.command('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
      await c.evaluate(inside);
      await c.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
      await click(c, '.result-panel [data-action="arena-yard"]');
      await c.waitFor('window.__qaApp.duel.state.status==="arena_result"', 'the job left from the pause', 30000);
      await c.waitFor('document.querySelector(".result-panel [data-action=world-job-retry]")', 'the results screen after one click', 30000);
      out.leftText = await c.evaluate(`(()=>{const a=window.__qaApp,p=document.querySelector('.result-panel'),text=p.innerText.replace(/\\s+/g,' ').trim();
        if(a.duel.state.paused)throw Error('Still paused after one click');
        if(/PAUSED|ON HOLD/.test(text))throw Error('The pause screen is still up: '+text);
        if(!/TRY AGAIN/.test(text)||!/BACK TO THE YARD/.test(text)||!/left the job unfinished/i.test(text))throw Error('Not the left-job results: '+text);
        return text;})()`);
      await c.screenshot('side-job-left');
      await click(c, '.result-panel [data-action="arena-yard"]');
    } else {
      // Back to the yard from the job (the story save is as it was). Finishing each job is proved by tools/test-ember-side-jobs.mjs and by the scripted plays.
      await c.evaluate('window.__qaApp.returnToYard()');
    }
    await c.waitFor('window.__qaApp?.isYardHomeActive?.()', 'yard after ' + job.key, 90000);
    if (await c.evaluate('window.__qaApp.profile.story.ember.jobs.length') !== jobsBefore) throw Error('A notice-board job changed the story jobs');
    out.jobs.push({...job, started});
  }
  // Back in the yard the board still offers all three.
  await click(c, '[data-action="yard-cards"]');
  await c.waitFor('document.querySelector("[data-ember-side-job]")', 'the board again', 30000);
  const again = await c.evaluate(`[...document.querySelectorAll('[data-ember-side-job]')].map(b=>b.dataset.emberSideJob)`);
  if (again.join() !== BOARD.map(job => job.key).join()) throw Error('The board does not offer all three again: ' + again);
  await writeFile(join(c.outputDir, 'everburn-side-jobs.json'), JSON.stringify({screenshots: 5, ...out, again}, null, 1) + '\n');
}
