// Private memory-only Scrapdome journey through the real UI (docs/SCRAPDOME.md):
// a player who found the gate goes from the main menu's WASTELAND button to the
// yard, opens SCRAPDOME, picks the field, fights, sees results, rematches, and
// returns to the yard. The only fixtures are the discovery flag and a clock
// jump to reach the whistle; everything else is the production UI and sim.
const entry = '/tools/menu-check.html';
const ready = `document.readyState === 'complete' &&
  !!document.querySelector('#stage.in-menu') &&
  document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

async function click(context, selector) {
  const point = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing visible control ${selector}');
    b.scrollIntoView({block:'center'});
    const r=b.getBoundingClientRect();
    if(r.width<1||r.height<1||r.left<0||r.top<0||r.right>innerWidth||r.bottom>innerHeight)
      throw Error('Control ${selector} is outside the viewport: '+JSON.stringify(r.toJSON()));
    const x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
    if(!b.contains(top))throw Error('Control ${selector} is covered by '+top?.tagName+'.'+top?.className);
    return{x,y};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}

async function sampleFrames(context) {
  return context.evaluate(`(async()=>{
    let prior=0;const deltas=[];
    for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(prior&&i>=30)deltas.push(t-prior);prior=t;}
    const sorted=[...deltas].sort((a,b)=>a-b);
    return{mean:+(deltas.reduce((a,b)=>a+b,0)/deltas.length).toFixed(2),p95:+sorted[Math.floor(sorted.length*.95)].toFixed(2),
      drawCalls:window.__render.renderer.info.render.calls};
  })()`);
}

async function runQuality(context, quality) {
  await context.navigate(`${entry}?flags=scrapdome&harness=${quality}`);
  await context.waitFor(ready, `${quality} QA menu`, 60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.audio.setMuted(true);
    // The QA page's own test panels would cover the yard; keep them out of the way.
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    const select=document.querySelector('#graphics-quality');select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile())throw Error('Discovery fixture could not be saved in temporary storage');
    app.onFrame?.(app.duel.state,0);
  })()`);
  await context.waitFor(`!document.querySelector('#wasteland-visit')?.hidden`, `${quality} WASTELAND button`);
  await click(context, '#wasteland-visit');
  await context.waitFor(`window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-yard-panel="home"]')`, `${quality} yard`, 30_000);
  await click(context, '[data-action="yard-scrapdome"]');
  await context.waitFor(`!!document.querySelector('[data-yard-panel="scrapdome"]')`, `${quality} SCRAPDOME panel`);
  await click(context, '[data-arena-opponents="3"]');
  await context.screenshot(`yard-scrapdome-${quality}`);
  await click(context, '[data-action="arena-start"]');
  await context.waitFor(`window.__qaApp.duel.state.arena?.phase==='fight' && window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden`, `${quality} fight`, 30_000);
  await new Promise(done => setTimeout(done, 4000));
  const fight = await context.evaluate(`(() => {
    const s=window.__qaApp.duel.state;
    return {board:document.querySelector('#arena-board')?.hidden===false,
      rows:document.querySelectorAll('#arena-board-rows li.arena-board-row').length,
      label:document.querySelector('#race-time-label')?.textContent,
      placing:document.querySelector('#gap-label')?.textContent,
      gravel:document.querySelector('#callout-text')?.textContent==='GRAVEL TRACK'&&!document.querySelector('#race-callout').hidden,
      names:[...document.querySelectorAll('.combat-marker-heading')].map(n=>n.textContent),
      rendererError:!document.querySelector('#renderer-error').hidden,
      cars:s.opponents.map(o=>Math.round(o.speedMph))};
  })()`);
  if (!fight.board || fight.rows !== 4 || fight.label !== 'TIME LEFT' || fight.placing !== 'PLACING' || fight.gravel || fight.rendererError)
    throw Error(`${quality}: arena display wrong: ${JSON.stringify(fight)}`);
  if (!fight.names.some(name => /GASKET|RIVET|SPROCKET/.test(name))) throw Error(`${quality}: opponent names missing: ${JSON.stringify(fight.names)}`);
  await context.screenshot(`fight-${quality}`);
  const frames = await sampleFrames(context);
  // Reach the whistle quickly: the only clock fixture in this journey.
  await context.evaluate(`(()=>{const a=window.__qaApp.duel.state.arena;a.participants[0].wrecks=a.participants.reduce((m,p)=>Math.max(m,p.wrecks),0)+1;a.clockSec=a.timeLimitSec-.2;})()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='arena_result' && !!document.querySelector('[data-action="arena-rematch"]')`, `${quality} results`, 15_000);
  await context.screenshot(`results-${quality}`);
  await click(context, '[data-action="arena-rematch"]');
  await context.waitFor(`window.__qaApp.duel.state.arena?.phase==='fight' && window.__qaApp.duel.state.arena.clockSec<5`, `${quality} rematch`, 20_000);
  await context.command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await context.command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await context.waitFor(`window.__qaApp.duel.state.paused && !!document.querySelector('[data-action="arena-yard"]')`, `${quality} pause`);
  await context.screenshot(`pause-${quality}`);
  await click(context, '[data-action="arena-yard"]');
  await context.waitFor(`window.__qaApp.isYardHomeActive()`, `${quality} back in the yard`, 30_000);
  const settled = await context.evaluate(`(()=>{const p=window.__qaApp.profile;return{history:p.history.length,activeRace:p.activeRace};})()`);
  if (settled.history !== 0 || settled.activeRace) throw Error(`${quality}: an arena round touched race records: ${JSON.stringify(settled)}`);
  console.log(`${quality}: yard → Scrapdome (3 cars) → fight ${JSON.stringify(fight.cars)} mph, frames mean ${frames.mean} ms p95 ${frames.p95} ms, ${frames.drawCalls} draw calls → results → rematch → pause → yard`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  for (const quality of ['high', 'performance']) await runQuality(context, quality);
}
