// DEEP-SIRENA-VIEW: the Sirena story in the real game on the private QA page
// (memory-only storage, the-deep switch for this tab only). A dive on Pacific
// Canyon, the badge, a sonar ping, one bagged part, the Drop-off lip, and the
// garage sheet. The kit and the raised Sirena for the garage step are set on the
// disposable career; every raise and pay happens through the game's own rules.
// No frame timing (this card's frame check is the laptop's).
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const STAND = `(window.__deepQa={
  wrap:a=>Math.atan2(Math.sin(a),Math.cos(a)),
  // Stop the car on the sea floor at a world point, facing a heading (radians).
  park(x,z,heading){const d=window.__qaApp.duel,s=d.state,near=d.course.nearest(x,z,s.s);
    Object.assign(s,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,speedMph:0,yawVelocity:0,pushVelocity:0,
      airborne:false,airHeight:0,_jumpY:null});
    if(Number.isFinite(heading))s.headingError=this.wrap(heading-d.course.at(s.s).heading);},
  find(id){return window.__qaApp.duel.deepStory?.sirena.finds.find(f=>f.id===id);},
})`;

async function key(context, code, type) {
  await context.command('Input.dispatchKeyEvent', {type, code, key: code.replace('Key', '').toLowerCase(),
    windowsVirtualKeyCode: code.charCodeAt(3)});
}

export async function run(context) {
  const report = {scope: 'Private QA page, memory-only storage, the-deep for this tab; no frame timing.', steps: [], captures: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=the-deep');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:')`,
    'private memory-only QA page', 90000);
  await context.waitFor(`[...document.querySelectorAll('details button')].some(node=>node.textContent==='Create funded temporary player')`,
    'temporary career fixture', 90000);
  await context.evaluate(`(()=>{
    const button=[...document.querySelectorAll('details button')].find(node=>node.textContent==='Create funded temporary player');
    if(!button||button.disabled)throw Error('Funded temporary career fixture missing');button.click();
    const a=window.__qaApp;a.audio.setMuted(true);
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    a.profile={...a.profile,deep:{kit:true}};a._saveProfile();
    a.startCampaign({mode:'duel',seed:1989,opponentCount:1,startStage:0});
    ${STAND};
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='countdown'||window.__qaApp.duel.state.status==='racing'`, 'Pacific Canyon race', 60000);
  // Drive onto the old boat ramp below the shoreline, as a player would, and dive.
  await context.evaluate(`(()=>{const d=window.__qaApp.duel,s=d.state,ramp=d.course.deepRamp;
    if(!ramp)throw Error('No Deep ramp on this route');
    Object.assign(s,{status:'racing',countdown:0});
    let point;for(let i=1;i<ramp.points.length;i++){const a=ramp.points[i-1],b=ramp.points[i],p=ramp.shoreline.center.progress-.04;
      if(p>b.progress&&i<ramp.points.length-1)continue;const t=(p-a.progress)/(b.progress-a.progress);
      point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};break;}
    const near=d.course.nearest(point.x,point.z);
    Object.assign(s,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,headingError:window.__deepQa.wrap(ramp.heading-d.course.at(near.s).heading),
      speedMph:30,groundHeight:point.y,airHeight:0,prevAirHeight:0,airborne:false,impactTimer:0,_jumpY:null});})()`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='choice'`, 'the dive choice', 30000);
  await context.evaluate(`window.__qaApp.chooseDeep('dive')`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='underwater'&&!!window.__qaApp.duel.deepStory`, 'under water', 60000);
  report.steps.push('dived');
  // The badge glints in the sand by the foot of the ramp; stopping beside it raises it.
  await context.evaluate(`(()=>{const b=window.__deepQa.find('sirena-badge'),r=window.__qaApp.duel.deepRuntime.ramp;window.__deepQa.park(b.x-Math.sin(r.heading)*5,b.z-Math.cos(r.heading)*5,r.heading);})()`);
  await new Promise(done => setTimeout(done, 2500));
  report.captures.push(await context.screenshot('deep-sirena-badge'));
  await context.evaluate(`(()=>{const b=window.__deepQa.find('sirena-badge');window.__deepQa.park(b.x,b.z);})()`);
  await context.waitFor(`window.__qaApp.profile.deep?.raised?.includes('sirena-badge')`, 'badge raised and paid', 30000);
  report.steps.push('badge');
  // R: one ping, 40 m short of the bonnet, so the blip shows its distance.
  await context.evaluate(`(()=>{const p=window.__deepQa.find('sirena-bonnet'),r=window.__qaApp.duel.deepRuntime.ramp;window.__deepQa.park(p.x-Math.sin(r.heading)*40,p.z-Math.cos(r.heading)*40,r.heading);})()`);
  await new Promise(done => setTimeout(done, 2000));
  await key(context, 'KeyR', 'keyDown'); await key(context, 'KeyR', 'keyUp');
  await context.waitFor(`!document.querySelector('.sirena-sonar')?.hidden`, 'sonar ring', 10000);
  report.sonar = await context.evaluate(`document.querySelector('.sirena-sonar span').textContent`);
  report.captures.push(await context.screenshot('deep-sirena-sonar'));
  // F held beside the bonnet: one bag fills and carries it up.
  await context.evaluate(`(()=>{const p=window.__deepQa.find('sirena-bonnet'),r=window.__qaApp.duel.deepRuntime.ramp;window.__deepQa.park(p.x-Math.sin(r.heading)*3.6,p.z-Math.cos(r.heading)*3.6,r.heading);})()`);
  await key(context, 'KeyF', 'keyDown');
  await context.waitFor(`!!window.__qaApp.duel.deepStory.sirena.lift`, 'the bag starts filling', 15000);
  report.liftTrace = [];
  for (let i = 0; i < 8; i++) {
    report.liftTrace.push(await context.evaluate(`(()=>{const d=window.__qaApp.duel,st=d.deepStory.sirena,p=window.__deepQa.find('sirena-bonnet'),
      c=d.course.worldAt(d.state.s,d.state.lateral);return{lift:st.lift&&{...st.lift},raised:[...st.raised],speed:d.state.speedMph,
      away:Math.hypot(p.x-c.x,p.z-c.z),deepLift:d._deepLift,input:{...d.state.input}};})()`));
    await new Promise(done => setTimeout(done, 500));
  }
  await writeFile(join(context.outputDir, 'deep-sirena-lift.json'), JSON.stringify(report.liftTrace, null, 2) + '\n');
  await new Promise(done => setTimeout(done, 1500));
  report.captures.push(await context.screenshot('deep-sirena-bag'));
  await context.waitFor(`window.__qaApp.profile.deep?.raised?.includes('sirena-bonnet')`, 'bonnet raised and paid', 120000);
  await key(context, 'KeyF', 'keyUp');
  await new Promise(done => setTimeout(done, 1200));
  report.captures.push(await context.screenshot('deep-sirena-rising'));
  report.steps.push('bonnet bagged');
  // The Drop-off lip: face the open sea beside the door.
  await context.evaluate(`(()=>{const p=window.__deepQa.find('sirena-door'),r=window.__qaApp.duel.deepRuntime.ramp;window.__deepQa.park(p.x-Math.sin(r.heading)*8,p.z-Math.cos(r.heading)*8,r.heading);})()`);
  await new Promise(done => setTimeout(done, 3000));
  report.captures.push(await context.screenshot('deep-sirena-drop'));
  report.caption = await context.evaluate(`document.querySelector('.sirena-caption')?.hidden===false?document.querySelector('.sirena-caption span').textContent:null`);
  report.profile = await context.evaluate(`(()=>{const p=window.__qaApp.profile;return{credits:p.credits,deep:p.deep};})()`);
  // The garage: the Sirena under a sheet once she is raised.
  await context.evaluate(`(()=>{const a=window.__qaApp;a.returnToMenu();
    a.profile={...a.profile,deep:{...a.profile.deep,raised:['sirena-badge','sirena-steering-wheel','sirena-wheel','sirena-bonnet','sirena-door','sirena-car']}};a._saveProfile();})()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'`, 'menu', 30000);
  await context.evaluate(`document.querySelector('[data-action="garage"]')?.click()`);
  await context.waitFor(`!!document.querySelector('.sirena-garage[data-sirena="waiting"]')`, 'garage sheet', 20000);
  await context.evaluate(`document.querySelector('.sirena-garage').scrollIntoView({block:'center'})`);
  report.captures.push(await context.screenshot('deep-sirena-garage'));
  report.steps.push('garage sheet');
  await writeFile(join(context.outputDir, 'deep-sirena.json'), JSON.stringify(report, null, 2) + '\n');
}
