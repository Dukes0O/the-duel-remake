// Native teaching flow for Launch angles, then its bench challenge, memory-only saves. Ski wax is a classroom now
// (lab-classroom-wax.mjs plays it to the ski challenge).
import * as launch from '../../src/lab/lessons/launch-lesson.js';

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a=window.__qaApp; a.audio.setMuted(true); a.addPlayer('Snow QA');
    a.profile={...a.profile, courses:{version:1,unlocked:['tremblant-woods','summit-run']},
      heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};
    a._saveProfile(); document.querySelectorAll('body > details').forEach(e=>e.hidden=true); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  const click = action => c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  const ready = () => c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'next step', 45_000);
  async function drag(id, from, to, min, max) {
    await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls??'[]').some(p=>p.id==='${id}')`, 'visible dial');
    const p = await c.evaluate(`(() => {const b=${canvas}.getBoundingClientRect(),p=JSON.parse(${canvas}.dataset.labLessonControls).find(p=>p.id==='${id}');return {x:b.left+p.x,y:b.top+p.y};})()`);
    const y = p.y - (to-from)/(max-min)*180;
    await c.command('Input.dispatchMouseEvent', {type:'mousePressed',button:'left',clickCount:1,...p});
    await c.command('Input.dispatchMouseEvent', {type:'mouseMoved',button:'left',buttons:1,x:p.x,y});
    await c.command('Input.dispatchMouseEvent', {type:'mouseReleased',button:'left',clickCount:1,x:p.x,y});
  }
  async function capture(name) {
    await c.command('Input.dispatchMouseEvent', {type:'mouseMoved',x:2,y:2});
    await new Promise(r=>setTimeout(r,350));
    const overlap=await c.evaluate(`(() => {const labels=[...document.querySelectorAll('[data-snow-lesson] > div')].filter(e=>!e.hidden).map(e=>e.getBoundingClientRect());
      return labels.some((a,i)=>labels.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top));})()`);
    if(overlap) { await c.screenshot(`${name}-overlap`); throw Error(`Object captions overlap at ${name}.`); }
    await c.screenshot(name);
  }
  async function clearCard() {
    const collision = await c.evaluate(`(() => {const a=document.querySelector('.lab-key-idea');if(!a||a.hidden)return 'missing key idea';const x=a.getBoundingClientRect();
      for(const e of document.querySelectorAll('button,select,.lab-teaching,.ski-card,.ski-speed,.ski-targets,.ski-keys')) {
        const y=e.getBoundingClientRect();if(!y.width||!y.height||getComputedStyle(e).visibility==='hidden')continue;
        if(x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top){const hit=document.elementFromPoint((Math.max(x.left,y.left)+Math.min(x.right,y.right))/2,(Math.max(x.top,y.top)+Math.min(x.bottom,y.bottom))/2);if(!e.matches('button,select')||e.contains(hit))return e.className||e.textContent;}
      } return '';})()`);
    if (collision) throw Error(`Key idea covers ${collision}`);
  }
  for (const packet of [launch]) {
    const d=packet.definition,id=d.id;
    await c.evaluate(`window.__qaApp.openLab()`);
    await c.waitFor(`${canvas}?.dataset.labWalkReady==='true'`, 'walking Lab', 60_000);
    const machine = 'launcher-ramp';
    await c.evaluate(`document.querySelector('[data-go="${machine}"]').click()`);
    await c.waitFor(`!document.querySelector('.lab-teaching')?.hidden`, 'walked to lesson', 45_000);
    await c.waitFor(`${canvas}.dataset.snowProps==='ready' && !!${canvas}.dataset.snowDrawing`, 'named models loaded');
    if (await c.evaluate(`!!document.querySelector('.lab-bench')`)) throw Error('Old bench panel remains.');
    await capture(`${id}-wonder`); await click('next');
    for (const row of d.words) { await c.waitFor(`document.querySelector('.lab-teaching h4')?.textContent===${JSON.stringify(row.word)}`, row.word); await capture(`${id}-word-${row.animation}`); await click('next'); }
    for (let i=0;i<d.worked.length;i++) { await ready(); await capture(`${id}-watch-${i}`); await click('next'); }
    await capture(`${id}-prediction`);
    if (await c.evaluate(`[...document.querySelectorAll('[data-snow-lesson] > div')].some(e=>!e.hidden)`)) throw Error('Captions visible over predictions.');
    await click('answer:flag'); await click('run');
    await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'specific failure hint', 30_000);
    await capture(`${id}-hint`); await click('retry');
    for (let i=0;i<3;i++) {
      await click('answer:flag');
      await drag('speedMs',20,17,5,24);
      await click('run'); await ready(); await capture(`${id}-try-${i}`); await click('next');
    }
    for(const [i,q] of d.checks.entries()) { await click(`answer:${q.answers.find(a=>a.id!==q.correct).id}`); await capture(`${id}-check-${i}`); await click('next'); }
    if(await c.evaluate(`window.__qaApp.profile.lab?.done?.${id}===true`)) throw Error('Teaching granted an early reward.');
    await click('challenge');
    {
      await click('answer:flag'); await drag('speedMs',20,17,5,24); await click('run');
      await c.waitFor(`!!document.querySelector('[data-teach="finish"]')`, 'real target reached',30_000);
      await clearCard(); await capture('launch-challenge'); await click('finish');
      await c.waitFor(`window.__qaApp.profile.lab?.done?.launch===true`, 'launch rewarded by real bench');
      await c.evaluate(`window.__qaApp.closeLab()`);
    }
  }
  await c.evaluate(`window.__qaApp.returnToMenu()`);
}
