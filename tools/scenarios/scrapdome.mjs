// Private memory-only check that a Scrapdome arena event draws and plays in
// the real renderer (docs/SCRAPDOME.md). The yard entry and arena HUD are
// ARENA-01-UI; until then this starts the event through the Duel directly.
const entry = '/tools/menu-check.html';
const ready = `document.readyState === 'complete' &&
  !!document.querySelector('#stage.in-menu') &&
  document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

async function runQuality(context, quality) {
  await context.navigate(`${entry}?flags=scrapdome&harness=${quality}`);
  await context.waitFor(ready, `${quality} QA menu`, 60_000);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
  })()`);
  const started = await context.evaluate(`(() => {
    const app=window.__qaApp;app.audio.setMuted(true);
    return app.duel.startArenaEvent({car:'banshee_muscle',cpuDifficulty:'medium',seed:1989,
      opponents:[{car:'dusthawk_rally'},{car:'aurora_gt'},{car:'stuttgart_959s'}]});
  })()`);
  if (!started) throw Error(`${quality}: startArenaEvent refused with the QA scrapdome switch on.`);
  await context.waitFor(`window.__qaApp.duel.state.arena?.phase==='fight' && window.__qaApp.visualReady`, `${quality} arena fight`, 30_000);
  await new Promise(done => setTimeout(done, 5000));
  const view = await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,r=window.__render;
    return {status:s.status,phase:s.arena.phase,clock:+s.arena.clockSec.toFixed(1),venue:d.course.def.id,
      cars:[s,...s.opponents].map(a=>({s:+a.s.toFixed(1),lateral:+a.lateral.toFixed(1),mph:Math.round(a.speedMph)})),
      drawCalls:r?.renderer?.info.render.calls||0,
      rendererError:!document.querySelector('#renderer-error').hidden};
  })()`);
  if (view.venue !== 'scrapdome' || view.phase === 'countdown' || view.rendererError || !(view.drawCalls > 0))
    throw Error(`${quality}: arena did not render: ${JSON.stringify(view)}`);
  if (!view.cars.slice(1).some(car => Math.abs(car.mph) > 5)) throw Error(`${quality}: computer cars are not driving: ${JSON.stringify(view)}`);
  await context.screenshot(`arena-${quality}`);
  await context.evaluate(`window.__render.camera && (window.__qaApp.cameraMode='chase')`);
  console.log(`${quality}: Scrapdome fight at ${view.clock}s, ${view.drawCalls} draw calls, cars ${JSON.stringify(view.cars)}`);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await runQuality(context, quality);
}
