// Native teaching flow, then the existing ski challenge, memory-only saves.
import * as launch from '../../src/lab/lessons/launch-lesson.js';
import * as wax from '../../src/lab/lessons/wax-lesson.js';
import {SKI_PADS} from '../../src/ski/ski-session.js';

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
    if(overlap) throw Error('Object captions overlap.');
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
  // Continue only unfinished Wax after Launch passed; normal runs check both.
  const waxOnly = process.env.SNOW_QA_WAX_ONLY === '1';
  for (const packet of [launch, wax].filter(p => !waxOnly || p.definition.id === 'wax')) {
    const d=packet.definition,id=d.id;
    await c.evaluate(`window.__qaApp.openLab()`);
    await c.waitFor(`${canvas}?.dataset.labWalkReady==='true'`, 'walking Lab', 60_000);
    const machine = id==='launch'?'launcher-ramp':'snow-trays';
    await c.evaluate(`document.querySelector('[data-go="${machine}"]').click()`);
    await c.waitFor(`!document.querySelector('.lab-teaching')?.hidden`, 'walked to lesson', 45_000);
    await c.waitFor(`${canvas}.dataset.snowProps==='ready' && !!${canvas}.dataset.snowDrawing`, 'named models loaded');
    if (await c.evaluate(`!!document.querySelector('.lab-bench')`)) throw Error('Old bench panel remains.');
    await capture(`${id}-wonder`); await click('next');
    for (const row of d.words) { await c.waitFor(`document.querySelector('.lab-teaching h4')?.textContent===${JSON.stringify(row.word)}`, row.word); await capture(`${id}-word-${row.animation}`); await click('next'); }
    for (let i=0;i<d.worked.length;i++) { await ready(); await capture(`${id}-watch-${i}`); await click('next'); }
    await capture(`${id}-prediction`);
    if (await c.evaluate(`[...document.querySelectorAll('[data-snow-lesson] > div')].some(e=>!e.hidden)`)) throw Error('Captions visible over predictions.');
    await click(`answer:${id==='launch'?'flag':'slow'}`); await click('run');
    await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'specific failure hint', 30_000);
    await capture(`${id}-hint`); await click('retry');
    for (let i=0;i<3;i++) {
      await click(`answer:${id==='launch'?'flag':'fast'}`);
      if(id==='launch') await drag('speedMs',20,17,5,24);
      else for(let n=0;n<i;n++) {
        await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls??'[]').some(p=>p.id==='waxDial')`, 'wax selector');
        const p=await c.evaluate(`(() => {const b=${canvas}.getBoundingClientRect(),p=JSON.parse(${canvas}.dataset.labLessonControls).find(p=>p.id==='waxDial');return {x:b.left+p.x,y:b.top+p.y};})()`);
        await c.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});
        await c.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});
      }
      await click('run'); await ready(); await capture(`${id}-try-${i}`); await click('next');
    }
    for(const [i,q] of d.checks.entries()) { await click(`answer:${q.answers.find(a=>a.id!==q.correct).id}`); await capture(`${id}-check-${i}`); await click('next'); }
    if(await c.evaluate(`window.__qaApp.profile.lab?.done?.${id}===true`)) throw Error('Teaching granted an early reward.');
    await click('challenge');
    if(id==='launch') {
      await click('answer:flag'); await drag('speedMs',20,17,5,24); await click('run');
      await c.waitFor(`!!document.querySelector('[data-teach="finish"]')`, 'real target reached',30_000);
      await clearCard(); await capture('launch-challenge'); await click('finish');
      await c.waitFor(`window.__qaApp.profile.lab?.done?.launch===true`, 'launch rewarded by real bench');
      await c.evaluate(`window.__qaApp.closeLab()`);
    } else {
      await c.waitFor(`window.__qaApp.visualReady && !!document.querySelector('[data-ski-board="drop"]')`, 'loaded helicopter world',120_000);
      await c.evaluate(`document.querySelector('[data-ski-board="drop"]').click()`);
      // The accepted ski-view pilot, through the session's own fixed steps.
      await c.evaluate(`(() => {const a=window.__qaApp,s=a.heliSession,pad=${JSON.stringify(SKI_PADS.devils)};
        const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
        const ground=(x,z)=>{const c=a.duel.course,n=c.nearest(x,z);return c.groundAt(n.s,n.lateral).y;};
        const highest=(x,z)=>Math.max(...[[0,0],[10,0],[-10,0],[0,10],[0,-10]].map(([dx,dz])=>ground(x+dx,z+dz)));
        const pilot=(v,t,speed=12,sink=4)=>{const h=v.heli,fx=Math.sin(h.heading),fz=Math.cos(h.heading),rx=-fz,rz=fx,dx=t.x-h.x,dz=t.z-h.z,d=Math.hypot(dx,dz),want=Math.min(speed,d*.4),ex=(d>.01?dx/d*want:0)-h.vx,ez=(d>.01?dz/d*want:0)-h.vz;
          return {pitch:clamp((ex*fx+ez*fz)*.25,-1,1),roll:clamp((ex*rx+ez*rz)*.25,-1,1),lift:clamp(clamp(t.y-h.y,-sink,sink)*.3-h.vy*.3,-1,1),yaw:0};};
        const fly=(seconds,controls,until)=>{for(let i=0;i<seconds*120;i++){const events=s.step(controls(s.view()));a._heliEvents(events);if(events.some(e=>e.type==='crashed'))throw Error('pilot crashed');if(until(s.view()))return;}throw Error('pilot timed out');};
        fly(120,v=>pilot(v,{x:v.heli.x-300,z:v.heli.z+300,y:100},30,8),v=>v.cruiseOffered);
        if(!s.acceptCruise())throw Error('no cruise');fly(10,()=>({lift:0}),v=>v.phase==='flying'&&v.courseId==='summit-run');
        fly(900,v=>{const h=v.heli,d=Math.hypot(pad.x-h.x,pad.z-h.z)||1,ux=(pad.x-h.x)/d,uz=(pad.z-h.z)/d;let top=-Infinity;for(let k=0;k<=16;k++)top=Math.max(top,highest(h.x+ux*k*25,h.z+uz*k*25));const y=d>150?Math.min(top+110,ground(h.x,h.z)+285):pad.y+40;return h.y<y-12?pilot(v,{x:h.x,z:h.z,y},1,8):pilot(v,{x:pad.x,z:pad.z,y},18,8);},v=>Math.hypot(v.heli.x-pad.x,v.heli.z-pad.z)<3&&Math.hypot(v.heli.vx,v.heli.vz)<.6);
        fly(120,v=>pilot(v,{x:pad.x,z:pad.z,y:pad.y-2},2,2.5),v=>v.heli.onGround);
      })()`);
      await c.waitFor(`window.__qaApp.visualReady && !!document.querySelector('[data-ski-challenge="wax"]')`, 'loaded slalom offer',180_000);
      const snow = await c.evaluate(`window.__qaApp.heliSession.skiOffers().snow.id`);
      const pick = {powder:'hard',cold:'medium',wet:'soft'}[snow];
      await c.evaluate(`document.querySelector('[data-ski-wax="${pick}"]').click()`);
      await c.waitFor(`document.querySelector('[data-ski-challenge="wax"]')?.disabled === false`, 'wax pick applied to challenge button');
      await c.evaluate(`document.querySelector('[data-ski-challenge="wax"]').click()`);
      try {
        await c.waitFor(`window.__qaApp.heliSession.phase==='skiing'`, 'stepped into wax challenge',20_000);
        await c.waitFor(`document.querySelector('#view3d')?.dataset.skiModels==='ready' && window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden`, 'loaded ski challenge',120_000);
      } catch(error) {
        await c.screenshot('wax-challenge-failure');
        throw Error(`${error.message}: ${await c.evaluate(`JSON.stringify({phase:window.__qaApp.heliSession?.phase,paused:window.__qaApp.duel.state.paused,models:document.querySelector('#view3d')?.dataset.skiModels,view:window.__qaApp.heliSession?.view().ski,text:document.querySelector('.heli-panel')?.textContent})`)}`);
      }
      await new Promise(r=>setTimeout(r,6000)); await clearCard(); await capture('wax-challenge');
      if(await c.evaluate(`window.__qaApp.profile.lab?.done?.wax===true`)) throw Error('Unfinished run granted wax reward.');
    }
  }
  await c.evaluate(`window.__qaApp.returnToMenu()`);
}
