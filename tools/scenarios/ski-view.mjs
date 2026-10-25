// SKI-VIEW: heli-skiing in the real game on the private QA page (memory-only storage, the switches for this tab only).
// The ski drop is taken on the helicopter panel's ski box, the helicopter is flown to Devils Playground by a scripted
// pilot through the session's own step, the slalom is chosen on the run menu, and a scripted skier (the session tests'
// driver, fed the zone's planned line) skis it in the game's own loop to the result card and the pickup. Screenshots for
// the look sheet: the run menu, the top of the run looking down it (the backdrop's seam), the three cameras, the result.
// No frame timing (rule 9: the moguls frame check waits for go-live).
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {skiZone} from '../../src/ski/runs/summit-zones.js';
import {SKI_PADS} from '../../src/ski/ski-session.js';
import {GUIDE} from '../../src/ski/ski-guide.js';

const FLAGS = 'helicopter,forest-fire,rescue,summit-run,heli-skiing';

// Page helpers: a pilot and a skier, both as the session's own tests drive them. The ground under the helicopter is read
// from the course the way the helicopter's ground falls back to it.
const HELPERS = (line, pickup, pads, guide) => `(window.__skiQa={
  clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v)),wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),
  ground(x,z){const c=window.__qaApp.duel.course,n=c.nearest(x,z);return c.groundAt(n.s,n.lateral).y;},
  highest(x,z){let top=-Infinity;for(const [dx,dz] of [[0,0],[10,0],[-10,0],[0,10],[0,-10]])top=Math.max(top,this.ground(x+dx,z+dz));return top;},
  pilot(view,target,{speed=12,sink=4}={}){const h=view.heli,fx=Math.sin(h.heading),fz=Math.cos(h.heading),rx=-fz,rz=fx;
    const dx=target.x-h.x,dz=target.z-h.z,d=Math.hypot(dx,dz),want=Math.min(speed,d*.4),wx=d>.01?dx/d*want:0,wz=d>.01?dz/d*want:0,ex=wx-h.vx,ez=wz-h.vz,c=v=>this.clamp(v,-1,1);
    return {pitch:c((ex*fx+ez*fz)*.25),roll:c((ex*rx+ez*rz)*.25),lift:c(Math.max(-sink,Math.min(sink,target.y-h.y))*.3-h.vy*.3),yaw:0};},
  fly(seconds,controls,until){const s=window.__qaApp.heliSession;
    for(let i=0;i<Math.round(seconds*120);i++){const events=s.step(controls(s.view()));window.__qaApp._heliEvents(events);
      if(events.some(e=>e.type==='crashed'))throw Error('crashed');if(until(s.view()))return true;}
    throw Error('the flight took too long');},
  toSummit(){const s=window.__qaApp.heliSession;
    this.fly(120,v=>this.pilot(v,{x:v.heli.x-300,z:v.heli.z+300,y:100},{speed:30,sink:8}),v=>v.cruiseOffered);
    if(!s.acceptCruise())throw Error('no cruise');
    this.fly(10,()=>({lift:0}),v=>v.phase==='flying'&&v.courseId==='summit-run');},
  toPad(name){const pad=${JSON.stringify(pads)}[name];
    this.fly(900,v=>{const h=v.heli,d=Math.hypot(pad.x-h.x,pad.z-h.z)||1,ux=(pad.x-h.x)/d,uz=(pad.z-h.z)/d;let top=-Infinity;
      for(let k=0;k<=16;k++)top=Math.max(top,this.highest(h.x+ux*k*25,h.z+uz*k*25));
      const y=d>150?Math.min(top+110,this.ground(h.x,h.z)+285):pad.y+40;
      if(h.y<y-12)return this.pilot(v,{x:h.x,z:h.z,y},{speed:1,sink:8});return this.pilot(v,{x:pad.x,z:pad.z,y},{speed:18,sink:8});},
      v=>Math.hypot(v.heli.x-pad.x,v.heli.z-pad.z)<3&&Math.hypot(v.heli.vx,v.heli.vz)<.6);
    this.fly(120,v=>this.pilot(v,{x:pad.x,z:pad.z,y:pad.y-2},{speed:2,sink:2.5}),v=>v.heli.onGround);},
  // The skier: steer for the planned line a little ahead, tuck where it runs straight, then skid to a stop in the pickup.
  skier(){const line=${JSON.stringify(line)},pickup=${JSON.stringify(pickup)},g=${JSON.stringify(guide)},cum=[0];
    for(let i=1;i<line.length;i++)cum.push(cum[i-1]+Math.hypot(line[i].x-line[i-1].x,line[i].z-line[i-1].z));
    let progress=0;const at=d=>{d=this.clamp(d,0,cum.at(-1));let i=1;while(i<cum.length-1&&cum[i]<d)i++;const k=(d-cum[i-1])/(cum[i]-cum[i-1]||1);
      return {x:line[i-1].x+(line[i].x-line[i-1].x)*k,z:line[i-1].z+(line[i].z-line[i-1].z)*k};};
    return s=>{let best=Infinity;for(let i=1;i<line.length;i++){if(cum[i]<progress-1)continue;if(cum[i-1]>progress+80)break;
        const ax=line[i-1].x,az=line[i-1].z,bx=line[i].x,bz=line[i].z,span=cum[i]-cum[i-1]||1;
        const k=this.clamp(((s.x-ax)*(bx-ax)+(s.z-az)*(bz-az))/(span*span),0,1),side=Math.hypot(s.x-(ax+(bx-ax)*k),s.z-(az+(bz-az)*k));
        if(side<best){best=side;progress=Math.max(progress,cum[i-1]+k*span);}}
      const end=progress>=cum.at(-1)-1,goal=end?pickup:at(progress+this.clamp(g.lookAheadMin+g.lookAheadPerSpeed*s.speed,g.lookAheadMin,g.lookAheadMax));
      const error=this.wrap(Math.atan2(goal.x-s.x,goal.z-s.z)-s.heading),toPickup=Math.hypot(pickup.x-s.x,pickup.z-s.z),stop=end&&toPickup<11;
      return {turn:s.grounded&&!stop?this.clamp(-error/g.turnFullAt,-1,1):0,tuck:!end&&Math.abs(error)<g.tuckBelow,skate:!stop,
        skid:stop||(end&&s.speed*s.speed/7>toPickup-4)};};},
})`;

async function key(context, code) {
  for (const type of ['keyDown', 'keyUp']) await context.command('Input.dispatchKeyEvent', {type, code, key: code.replace('Key', '').toLowerCase(), windowsVirtualKeyCode: code.charCodeAt(3)});
}
const pause = ms => new Promise(done => setTimeout(done, ms));

export async function run(context) {
  const report = {scope: 'Private QA page, memory-only storage, heli-skiing switches for this tab; no frame timing.', steps: [], captures: []};
  const zone = skiZone('slalom');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(`/tools/menu-check.html?flags=${FLAGS}`);
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:')`,
    'private memory-only QA page', 90000);
  await context.waitFor(`[...document.querySelectorAll('details button')].some(node=>node.textContent==='Create funded temporary player')`, 'temporary career fixture', 90000);
  await context.evaluate(`(()=>{
    const button=[...document.querySelectorAll('details button')].find(node=>node.textContent==='Create funded temporary player');
    if(!button||button.disabled)throw Error('Funded temporary career fixture missing');button.click();
    const a=window.__qaApp;a.audio.setMuted(true);a.heliAudio?.setMuted?.(true);
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    a.profile={...a.profile,courses:{version:1,unlocked:['tremblant-woods','summit-run']},
      heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};a._saveProfile();
    if(!a.visitHeli())throw Error('no helicopter visit');
    ${HELPERS(zone.line, zone.pickup, SKI_PADS, GUIDE)};
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli'&&window.__qaApp.visualReady`, 'at the home pad', 120000);
  // The ski box on the helicopter panel: take the drop.
  await context.waitFor(`!!document.querySelector('[data-ski-board="drop"]')`, 'the ski box at the home pad', 30000);
  report.captures.push(await context.screenshot('ski-board'));
  await context.evaluate(`document.querySelector('[data-ski-board="drop"]').click()`);
  await context.waitFor(`window.__qaApp.heliSession.view().ski?.flight?.kind==='drop'`, 'the drop taken', 10000);
  report.steps.push('drop taken');
  await context.evaluate(`(()=>{window.__skiQa.toSummit();window.__skiQa.toPad('devils');})()`);
  await context.waitFor(`window.__qaApp.duel.course.def.id==='summit-run'&&window.__qaApp.visualReady&&window.__qaApp.heliSession.view().ski.pad==='devils'`,
    'on the Devils Playground pad, the Summit world drawn', 300000);
  report.steps.push('at Devils Playground');
  await context.waitFor(`!!document.querySelector('[data-ski-run="slalom"]')`, 'the run menu', 30000);
  await pause(3000);
  report.captures.push(await context.screenshot('ski-menu'));
  report.menu = await context.evaluate(`document.querySelector('.ski-menu')?.innerText`);
  // The skier skis in the game's own loop: each step the session takes gets the scripted skier's controls.
  await context.evaluate(`(()=>{const s=window.__qaApp.heliSession,step=s.step.bind(s),drive=window.__skiQa.skier();
    s.step=controls=>step(window.__skiGo&&s.phase==='skiing'?drive(s.view().ski.run.skier):controls);
    document.querySelector('[data-ski-run="slalom"]').click();})()`);
  await context.waitFor(`window.__qaApp.heliSession.phase==='skiing'&&!!document.querySelector('.ski-loading')`, 'stepped out: the loading card', 20000);
  await context.waitFor(`!!window.__render?.scene&&document.querySelector('#view3d canvas')`, 'drawing', 20000).catch(() => {});
  await pause(8000);
  report.captures.push(await context.screenshot('ski-top'));
  report.steps.push('stepped out');
  await context.evaluate(`window.__skiGo=true`);
  await context.waitFor(`(window.__qaApp.heliSession.view().ski.run?.t??0)>7`, 'skiing', 300000);
  report.captures.push(await context.screenshot('ski-chase'));
  for (const name of ['ski-low-chase', 'ski-side']) {
    await key(context, 'KeyC');
    await pause(4000);
    report.captures.push(await context.screenshot(name));
  }
  await key(context, 'KeyC');
  await context.waitFor(`!!document.querySelector('.ski-result')`, 'the result card', 600000);
  await pause(1500);
  report.captures.push(await context.screenshot('ski-result'));
  report.result = await context.evaluate(`document.querySelector('.ski-result')?.innerText`);
  await context.waitFor(`window.__qaApp.heliSession.phase==='flying'`, 'the pickup', 300000);
  await pause(2000);
  report.captures.push(await context.screenshot('ski-pickup'));
  report.steps.push('picked up');
  report.log = await context.evaluate(`window.__qaApp.heliLog.filter(e=>String(e.type).startsWith('ski')).map(e=>({type:e.type,medal:e.medal,time:e.time,missed:e.missed,paid:e.paid}))`);
  report.credits = await context.evaluate(`window.__qaApp.profile.credits`);
  await writeFile(join(context.outputDir, 'ski-view.json'), JSON.stringify(report, null, 2) + '\n');
}
