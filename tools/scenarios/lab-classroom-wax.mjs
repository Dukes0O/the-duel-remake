// LAB-CLASSROOM-WAX: the Ski wax classroom played by keyboard (and one mouse click on a tin), from the Lab map's
// click-to-go to the slalom: the helicopter flies to the Devils drop, picks today's wax and steps into the ski
// challenge with the key idea card. Memory-only saves.
import {SKI_PADS} from '../../src/ski/ski-session.js';

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a=window.__qaApp; a.audio.setMuted(true); a.addPlayer('Wax QA');
    a.profile={...a.profile, courses:{version:1,unlocked:['tremblant-woods','summit-run']},
      heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};
    a._saveProfile(); document.querySelectorAll('body > details').forEach(e=>e.hidden=true); a.openLab(); })()`);
  const canvas = `document.querySelector('.lab-canvas')`, state = `JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
  const KEYS = {Enter: ['Enter', 13], Space: [' ', 32], KeyH: ['h', 72], ArrowRight: ['ArrowRight', 39], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51]};
  const shot = name => c.screenshot(name);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const key = (code, type) => c.command('Input.dispatchKeyEvent', {type, code, key: KEYS[code][0], windowsVirtualKeyCode: KEYS[code][1]});
  const press = async (code, times = 1) => { for (let i = 0; i < times; i++) { await key(code, 'keyDown'); await key(code, 'keyUp'); await wait(times > 1 ? 80 : 250); } };
  const at = (step, extra = 'true') => c.waitFor(`${state}?.step === '${step}' && (s => ${extra})(${state})`, `${step} ${extra}`, 40_000);
  const next = async (step, extra = 's.ready') => { await at(step, extra); await press('Enter'); };
  const bubble = () => c.evaluate(`document.querySelector('.lc-bubble').textContent`);
  const toScreen = async (x, y) => c.evaluate(`(() => { const r = document.querySelector('.lc-canvas').getBoundingClientRect(), s = Math.min(r.width / 1000, r.height / 680);
    return {x: r.left + (r.width - 1000 * s) / 2 + ${x} * s, y: r.top + (r.height - 680 * s) / 2 + ${y} * s}; })()`);
  async function clearCard() {
    const collision = await c.evaluate(`(() => {const a=document.querySelector('.lab-key-idea');if(!a||a.hidden)return 'missing key idea';const x=a.getBoundingClientRect();
      for(const e of document.querySelectorAll('button,select,.lab-teaching,.ski-card,.ski-speed,.ski-targets,.ski-keys')) {
        const y=e.getBoundingClientRect();if(!y.width||!y.height||getComputedStyle(e).visibility==='hidden')continue;
        if(x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top){const hit=document.elementFromPoint((Math.max(x.left,y.left)+Math.min(x.right,y.right))/2,(Math.max(x.top,y.top)+Math.min(x.bottom,y.bottom))/2);if(!e.matches('button,select')||e.contains(hit))return e.className||e.textContent;}
      } return '';})()`);
    if (collision) throw Error(`Key idea covers ${collision}`);
  }

  // The Lab map's click-to-go takes the player to the snow trays, as a player's click does.
  await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
  await c.evaluate(`document.querySelector('[data-go="snow-trays"]').click()`);
  await at('wonder');
  if (await c.evaluate(`!!document.querySelector('.lab-teaching:not([hidden])')`)) throw Error('The old lesson panel opened beside the classroom.');
  await wait(5000); await shot('wonder-racing'); await at('wonder', 's.ready'); await shot('wonder');
  await next('wonder');
  // Wax: one mouse click on the medium tin.
  await at('word-wax'); await shot('word-wax');
  const medium = await toScreen(500, 600);
  await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: medium.x, y: medium.y, button: 'left', buttons: 1, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: medium.x, y: medium.y, button: 'left', buttons: 0, clickCount: 1});
  await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: 20, y: 20});
  await at('word-wax', 's.ready'); await shot('word-wax-picked');
  if (!(await bubble()).startsWith('That is medium wax')) throw Error('The click did not pick the medium tin: ' + await bubble());
  await next('word-wax');
  await at('word-glide'); await press('Space'); await wait(4000); await shot('word-glide-running'); await at('word-glide', 's.ready'); await shot('word-glide');
  await next('word-glide');
  await at('word-crystals'); await shot('word-crystals-cold'); await press('ArrowRight', 3); await at('word-crystals', 's.ready'); await shot('word-crystals-warm');
  await next('word-crystals');
  await at('watch'); await wait(5000); await shot('watch-racing'); await at('watch', 's.ready'); await shot('watch');
  await next('watch');
  // Cool snow: the wrong tin first, and Brian says why; then medium.
  await at('try-cool'); await shot('try-cool'); await press('Digit1'); await press('Space'); await at('try-cool', 's.ready'); await shot('try-cool-wrong');
  if (!(await bubble()).startsWith('Hard wax is for snow at -10 °C and colder')) throw Error('The wrong tin did not say why: ' + await bubble());
  await press('Digit2'); await press('Space'); await c.waitFor(`document.querySelector('.lc-bubble').textContent.startsWith('Right! Medium wax')`, 'medium wins', 30_000); await shot('try-cool-right');
  await next('try-cool');
  await at('try-wet'); await press('Digit3'); await press('Space'); await at('try-wet', 's.ready'); await shot('try-wet');
  await next('try-wet');
  // Brian's job: a wrong pick on day one, then the right ones; help climbs to his pointer on day two and Show me picks it.
  await at('alone'); await shot('alone');
  await press('Digit2'); await press('Space'); await at('alone', 's.help === 1'); await shot('alone-wrong');
  await press('Digit1'); await press('Space'); await wait(300); await shot('alone-day-two');
  for (const rung of [1, 2, 3]) { await press('KeyH'); await at('alone', `s.help === ${rung}`); }
  await wait(1200); await shot('alone-show-me');
  await c.waitFor(`document.querySelector('.lc-bubble').textContent.includes("Wet snow, -1 °C")`, 'day three', 10_000);
  await press('Digit3'); await press('Space'); await at('alone', 's.ready'); await shot('alone-done');
  await next('alone');
  for (const [step, answer] of [['check-cold', 'Digit1'], ['check-rule', 'Digit1'], ['check-game', 'Digit1']]) {
    await at(step); await shot(step); await press(answer); await at(step, 's.ready'); await wait(1500); await shot(`${step}-answered`);
    await press('Enter');
  }
  await at('recap'); await wait(1500); await shot('recap');
  if (!(await c.evaluate(`[...document.querySelectorAll('.lc-progress li')].slice(0, 6).every(li => li.classList.contains('done'))`))) throw Error('The progress strip does not tick the finished parts.');
  if (!(await c.evaluate(`!window.__qaApp.profile.lab.done.wax && ['wax-wax', 'wax-glide', 'wax-snow-crystals'].every(id => window.__qaApp.profile.lab.notebook.includes(id))`))) throw Error('Teaching awarded progress or lost words.');
  // The game challenge: Enter goes to the helicopter; fly to the Devils drop and step into the slalom with today's wax.
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && !!window.__qaApp.heliSession`, 'off to the helicopter', 60_000);
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
  await new Promise(r=>setTimeout(r,6000)); await clearCard(); await shot('wax-challenge');
  if(await c.evaluate(`window.__qaApp.profile.lab?.done?.wax===true`)) throw Error('Unfinished run granted wax reward.');
  if (!(await c.evaluate(`document.querySelector('.lab-key-idea')?.textContent.includes('Hard wax for cold, soft wax for warm.')`))) throw Error('The key idea card is not the lesson’s.');
}
