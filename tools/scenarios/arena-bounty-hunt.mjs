import {contactFixture} from './warlord-reward.mjs';

// Real yard controls and native contact credit; all careers are memory-only.
// Poses, low armor and the final clock jump make the journey short and repeatable.
async function click(context, selector) {
  const point = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing Bounty control');
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(r.width<1||!b.contains(document.elementFromPoint(x,y)))throw Error('Covered Bounty control');
    return{x,y};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}

async function ready(context, label) {
  await context.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    return a?.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`, label, 60_000);
}

async function journey(context, quality, venueId) {
  await context.evaluate('window.name=""');
  await context.navigate('/tools/menu-check.html?flags=bounty-hunt,salt-flats&harness=bounty-'+quality+'-'+venueId);
  await context.waitFor('!!window.__qaApp', 'Bounty memory-only menu', 60_000);
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.setGraphicsQuality(${JSON.stringify(quality)});
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Memory-only Bounty storage is missing');
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    a.cpuDifficulty='medium';a.profile.wasteland.discoveredGate=true;
    a.profile.wasteland.xp=7400;if(!a._saveProfile())throw Error('Rank-nine fixture failed');
    a.onFrame?.(a.duel.state,0);})()`);
  await ready(context, 'Bounty menu assets');
  await click(context, '#wasteland-visit');
  await ready(context, 'Bounty yard transition');
  await context.evaluate('window.__qaApp.advance(8)');
  await ready(context, 'Bounty yard');
  await click(context, '[data-action="yard-scrapdome"]');
  await click(context, '[data-arena-mode="bounty-hunt"]');
  await click(context, `[data-arena-venue="${venueId}"]`);
  await click(context, '[data-arena-opponents="3"]');
  await context.screenshot(quality+'-'+venueId+'-bounty-yard');
  await click(context, '[data-action="arena-start"]');
  await ready(context, 'Bounty field assets');
  await context.evaluate('window.__qaApp.advance(3.1)');
  await ready(context, 'Bounty fight');
  const view = await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,b=s.arena.bountyHunt,
    before=JSON.stringify(s.arena);a.onFrame?.(s,0);window.__render.renderFrame();
    const beacon=window.__render.scene.getObjectByName('Bounty vehicle beacon');
    if(!beacon?.visible||beacon.userData.markedId!==b.markedId||!beacon.children.some(node=>node.isMesh))
      throw Error('Real marked vehicle beacon missing');
    const arrow=document.querySelector('.bounty-screen-arrow');
    if(!arrow||arrow.hidden||!/BOUNTY/.test(arrow.textContent))throw Error('Bounty screen arrow missing');
    if(!/POINTS/.test(document.querySelector('#arena-board-rows').textContent))throw Error('Bounty scoreboard missing');
    if(JSON.stringify(s.arena)!==before)throw Error('Bounty presentation changed simulation');
    if(s.arena.venueId!==${JSON.stringify(venueId)}||a.duel.course.def.id!==${JSON.stringify(venueId)})
      throw Error('Selected Bounty venue was replaced');
    const observer=new MutationObserver(()=>{});
    observer.observe(arrow,{attributes:true,attributeFilter:['hidden','style'],subtree:true});
    for(let i=0;i<144;i++)a.onFrame?.(s,0);
    const repeatedWrites=observer.takeRecords().length;observer.disconnect();
    if(repeatedWrites!==0)throw Error('Unchanged Bounty arrow rewrote '+repeatedWrites+' DOM attributes');
    const actualQuality=a.ambientOcclusionEnabled?'high':'performance';
    if(actualQuality!==${JSON.stringify(quality)})throw Error('Bounty quality did not apply');
    return{markedId:b.markedId,quality:actualQuality};})()`);
  await context.screenshot(quality+'-'+venueId+'-bounty-beacon');
  const nativeContact = contactFixture.replace('b=s.opponents[0]',
    'b=s.opponents.find(actor=>actor.arenaId===s.arena.bountyHunt.markedId)');
  await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,contact=${nativeContact};
    const before=a.profile.wasteland.scrap;contact(s.arena.bountyHunt.markedId,35);a.duel.step(1/120);
    if(s.arena.bountyHunt.markedId!=='player'||s.arena.participants[0].bountyPoints!==20)
      throw Error('Native contact did not award the Bounty');
    for(const p of s.arena.participants)p.protectedSec=10000;
    a.advance(1.1);if(s.arena.participants[0].bountyPoints<21)throw Error('Native survival point missing');
    a.onFrame?.(s,0);window.__render.renderFrame();
    const beacon=window.__render.scene.getObjectByName('Bounty vehicle beacon'),
      arrow=document.querySelector('.bounty-screen-arrow');
    if(!beacon?.visible||beacon.userData.markedId!=='player'||
      !arrow?.textContent.includes('YOU CARRY THE BOUNTY'))throw Error('Native mark handover did not update the view');
    const observer=new MutationObserver(()=>{});
    observer.observe(arrow,{attributes:true,attributeFilter:['hidden','style'],subtree:true});
    for(let i=0;i<144;i++)a.onFrame?.(s,0);
    const repeatedWrites=observer.takeRecords().length;observer.disconnect();
    if(repeatedWrites!==0)throw Error('Unchanged player Bounty arrow rewrote DOM attributes');
    s.paused=true;const frozen=JSON.stringify(s.arena);a.advance(1);
    if(JSON.stringify(s.arena)!==frozen)throw Error('Paused Bounty changed');s.paused=false;
    s.arena.clockSec=180-1/240;a.duel.step(1/120);
    if(s.status!=='arena_result'||s.arena.result.winnerId!=='player'||!s.arena.result.settlementSaved||
      a.profile.wasteland.scrap<=before)throw Error('Native Bounty result did not pay');
    const paid=a.profile.wasteland.scrap;
    if(a._settleArenaResult({result:s.arena.result},s)||a.profile.wasteland.scrap!==paid)
      throw Error('Duplicate Bounty result paid twice');a.onFrame?.(s,0);})()`);
  await context.screenshot(quality+'-'+venueId+'-bounty-result');
  await click(context, '[data-action="arena-rematch"]');
  await ready(context, 'Bounty rematch');
  await context.evaluate('window.__qaApp.advance(3.1);window.__qaApp.duel.state.paused=true;window.__qaApp.onFrame?.(window.__qaApp.duel.state,0)');
  await click(context, '[data-action="arena-yard"]');
  await ready(context, 'Bounty return transition');
  await context.evaluate('window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()', 'Bounty returned to yard');
  console.log(quality+' '+venueId+': Bounty native UI/contact/pay journey '+JSON.stringify(view));
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  for (const quality of ['high', 'performance'])
    for (const venueId of ['scrapdome', 'salt-flats']) await journey(context, quality, venueId);
}
