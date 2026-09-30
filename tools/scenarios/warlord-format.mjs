// Memory-only territory → Sal intro → fight → loss → rematch → yard.
// Fixture only discovery/hold and three controlled wrecks. All navigation
// uses the production buttons and real event simulation.
async function click(context, selector) {
  const point = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing control ${selector}');
    b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(r.width<1||r.height<1||!b.contains(document.elementFromPoint(x,y)))
      throw Error('Covered control ${selector}');
    return{x,y};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}

// Let the renderer observe each transition before checking its state/course gate.
// Asset load alone does not mean the submitted shader warmup has settled.
async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)&&
    document.querySelector('#renderer-loading')?.hidden`, label, 60_000);
}

async function runQuality(context, quality) {
  await context.navigate(`/tools/menu-check.html?flags=scrapdome,warlords&harness=${quality}`);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated menu`, 60_000);
  await ready(context, `${quality} initial menu presentation`);
  const before = await context.evaluate(`(()=>{
    const a=window.__qaApp;a.audio.setMuted(true);
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    a.setGraphicsQuality(${JSON.stringify(quality)});
    a.profile={...a.profile,wasteland:{...a.profile.wasteland,discoveredGate:true,
      territories:{...a.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
    if(!a._saveProfile())throw Error('Temporary discovery fixture failed');
    a.onFrame?.(a.duel.state,0);
    return{credits:a.profile.credits,scrap:a.profile.wasteland.scrap,
      history:a.profile.history,settledResults:a.profile.settledResults};})()`);
  await ready(context, `${quality} selected quality presentation`);
  await click(context, '#wasteland-visit');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, `${quality} yard`, 30_000);
  await ready(context, `${quality} yard presentation`);
  await click(context, '[data-action="yard-territory"]');
  await click(context, '[data-warlord="sal"]');
  await context.waitFor(`window.__qaApp.duel.state.status==='warlord_intro'&&
    document.querySelector('[data-action="warlord-begin"]')`, `${quality} Sal intro`);
  await ready(context, `${quality} intro presentation`);
  const intro = await context.evaluate(`(()=>{
    const s=window.__qaApp.duel.state;
    return{clock:s.arena.clockSec,name:document.querySelector('#modal-layer').textContent,
      car:s.opponents[0].car,actors:s.arena.participants.length};})()`);
  if (intro.clock !== 0 || intro.actors !== 2 || intro.car !== 'banshee_muscle' ||
      !/SAWTOOTH SAL/.test(intro.name) || !/BANSHEE MUSCLE/.test(intro.name))
    throw Error(`${quality} intro wrong: ${JSON.stringify(intro)}`);
  await context.screenshot(`intro-${quality}`);
  await click(context, '[data-action="warlord-begin"]');
  await context.waitFor(`window.__qaApp.duel.state.status==='racing'&&
    window.__qaApp.duel.state.arena.phase==='fight'&&window.__qaApp.visualReady`, `${quality} fight`, 30_000);
  if (await context.evaluate(`document.querySelector('#lap-number')?.textContent!=='FIRST TO THREE WRECKS'`))
    throw Error(`${quality} fight HUD names the wrong format`);
  await context.screenshot(`fight-${quality}`);
  await context.evaluate(`(()=>{
    const a=window.__qaApp,s=a.duel.state;
    for(let i=0;i<3;i++){
      const p=s.arena.participants[0];p.wreckCounted=false;p.protectedSec=0;
      p.lastHitBy='cpu-1';p.lastHitAt=s.stageTimeSec;
      s.combatWrecking=true;s.combatWreckTimer=4;
      a.duel.step(1/120);
    }
    a.onFrame?.(s,0);
    if(s.arena.result?.winnerId!=='cpu-1')throw Error('Controlled loss did not settle');
  })()`);
  await context.waitFor(`!!document.querySelector('[data-action="arena-rematch"]')`, `${quality} loss result`);
  await ready(context, `${quality} loss presentation`);
  await context.screenshot(`loss-${quality}`);
  await click(context, '[data-action="arena-rematch"]');
  await context.waitFor(`window.__qaApp.duel.state.status==='warlord_intro'&&
    window.__qaApp.duel.state.arena.warlordId==='sal'&&
    window.__qaApp.duel.state.arena.participants.length===2&&
    window.__qaApp.duel.state.arena.participants.every(p=>p.wrecks===0)`, `${quality} same-boss rematch`);
  await ready(context, `${quality} rematch intro presentation`);
  await click(context, '[data-action="arena-yard"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()&&
    !window.__qaApp.duel.state.arena`, `${quality} yard return`, 30_000);
  await ready(context, `${quality} yard return presentation`);
  const after = await context.evaluate(`(()=>{
    const p=window.__qaApp.profile;return{credits:p.credits,scrap:p.wasteland.scrap,
      history:p.history,settledResults:p.settledResults};})()`);
  if (JSON.stringify(before)!==JSON.stringify(after))
    throw Error(`${quality} loss/navigation changed saved bank or racing records`);
  console.log(`${quality}: territory FIGHT → frozen Sal intro → countdown/fight → free loss → Sal rematch → yard; unchanged wallet and racing records`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  for (const quality of ['high', 'performance']) await runQuality(context, quality);
}