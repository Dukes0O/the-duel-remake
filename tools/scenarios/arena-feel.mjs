// ARENA-FEEL review (private, memory-only): a real Scrapdome fight through the
// production UI, advanced by the fixed-step sim until a computer car tells a
// charge and until a car respawns; each is framed and captured.
const entry = '/tools/menu-check.html';
const ready = `document.readyState === 'complete' &&
  !!document.querySelector('#stage.in-menu') &&
  document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

async function click(context, selector) {
  const point = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing visible control ${selector}');
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();
    return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}

// Advance until the event appears, then frame the car it names from ahead.
async function captureMoment(context, eventName, label) {
  const result = await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel;
    let seen=null;const off=d.onChange((_s,e)=>{if(e.${eventName}&&!seen)seen=e.${eventName};});
    for(let i=0;i<120*90&&!seen;i++)app.advance(1/120);
    off?.();
    if(!seen)throw Error('No ${eventName} within 90 seconds');
    const s=d.state,participant=s.arena.participants.find(p=>p.id===seen.id);
    const actor=participant.id==='player'?s:s.opponents[s.arena.participants.filter(p=>p.kind==='cpu').indexOf(participant)];
    const g=d.course.groundAt(actor.s,actor.lateral),h=g.heading+(actor.headingError||0);
    app.inspectionCamera={position:[g.x+Math.sin(h)*11+Math.cos(h)*3,g.y+3.2,g.z+Math.cos(h)*11-Math.sin(h)*3],
      target:[g.x,g.y+.8,g.z]};
    app.onFrame?.(s);window.__render.renderFrame();
    const flares=[],halo=[];let allFlares=0;
    window.__render.scene.traverse(o=>{if(o.name==='Arena charge tell')allFlares++;if(o.name==='Arena charge tell'&&o.visible)flares.push(o.name);
      if(o.name==='Arena respawn shimmer'&&o.visible)halo.push(o.name);});
    return {id:seen.id,tellSec:actor.arenaTellSec||0,shimmerSec:actor.arenaShimmerSec||0,
      visibleFlares:flares.length,visibleHalo:halo.length,allFlares};
  })()`);
  await context.screenshot(label);
  return result;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(`${entry}?flags=scrapdome`);
  await context.waitFor(ready, 'QA menu', 60_000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;app.audio.setMuted(true);
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    if(!app._saveProfile())throw Error('Discovery fixture could not be saved in temporary storage');
    app.onFrame?.(app.duel.state,0);
  })()`);
  await context.waitFor(`!document.querySelector('#wasteland-visit')?.hidden`, 'WASTELAND button');
  await click(context, '#wasteland-visit');
  await context.waitFor(`window.__qaApp.isYardHomeActive() && !!document.querySelector('[data-yard-panel="home"]')`, 'yard', 30_000);
  await click(context, '[data-action="yard-scrapdome"]');
  await context.waitFor(`!!document.querySelector('[data-yard-panel="scrapdome"]')`, 'SCRAPDOME panel');
  await click(context, '[data-arena-opponents="3"]');
  await click(context, '[data-action="arena-start"]');
  await context.waitFor(`window.__qaApp.duel.state.arena?.phase==='fight' && window.__qaApp.visualReady && document.querySelector('#renderer-loading')?.hidden`, 'fight', 30_000);
  await context.evaluate(`window.__qaApp.stop()`);
  const tell = await captureMoment(context, 'arenaTell', 'arena-tell');
  if (!(tell.tellSec > 0) || tell.visibleFlares < 1)
    throw Error(`Charge tell not shown: ${JSON.stringify(tell)}`);
  const respawn = await captureMoment(context, 'arenaRespawn', 'arena-respawn');
  if (!(respawn.shimmerSec > 0) || respawn.visibleHalo < 1)
    throw Error(`Respawn shimmer not shown: ${JSON.stringify(respawn)}`);
  console.log(`Arena feel: tell by ${tell.id} (${tell.visibleFlares} flares), respawn of ${respawn.id} with halo.`);
}
