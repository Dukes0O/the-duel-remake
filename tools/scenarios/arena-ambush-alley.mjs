async function click(c, selector) {
  const point = await c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing Ambush control '+${JSON.stringify(selector)});
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(!b.contains(document.elementFromPoint(x,y)))throw Error('Covered Ambush control');return{x,y};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await c.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}
async function ready(c, label) {
  await c.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    const figures=window.__render?.scene.getObjectByName('Rigged on-foot fighters');
    if(figures?.userData.loadErrors?.length)throw Error(figures.userData.loadErrors.join(', '));
    if(a?.duel.state.onFoot){const ids=new Set([a.duel.state.crewId||'rook',
      ...(a.duel.state.raids?.zones||[]).flatMap(z=>z.raiders.map(r=>r.crewId))]);
      if([...ids].some(id=>figures?.userData.crews[id]!=='ready'))return false;}
    if(a?.duel.state.arena?.venueId==='salt-flats'){
      const salt=window.__render?.scene.getObjectByName('Salt Flats');
      if(salt?.userData.loadErrors?.length)throw Error(salt.userData.loadErrors.join(', '));
      if(salt?.userData.assetStatus!=='ready'||!salt.getObjectByName('salt-flats-ground'))return false;
    }
    return a?.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`, label, 60_000);
}
async function journey(c, quality, venueId) {
  await c.evaluate('window.name=""');
  await c.navigate('/tools/menu-check.html?flags=ambush-alley,salt-flats,crew-gear&harness=ambush-'+quality+'-'+venueId);
  await c.waitFor('!!window.__qaApp', 'memory-only Ambush menu', 60_000);
  await c.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.setGraphicsQuality(${JSON.stringify(quality)});
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Memory-only store absent');
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    a.cpuDifficulty='medium';a.profile.wasteland.discoveredGate=true;a.profile.wasteland.xp=20000;
    if(!a._saveProfile())throw Error('Temporary career failed');
    window.__ambushCues=[];const play=a.audio._playCue.bind(a.audio);
    a.audio._playCue=(cue,...args)=>{window.__ambushCues.push(cue);return play(cue,...args);};
    a.onFrame?.(a.duel.state,0);})()`);
  await ready(c, 'menu assets'); await click(c, '[data-cpu-difficulty="medium"]');
  await click(c, '#wasteland-visit');
  await ready(c, 'yard transition'); await c.evaluate('window.__qaApp.advance(8)');
  await ready(c, 'yard'); await click(c, '[data-action="yard-scrapdome"]');
  await click(c, '[data-arena-mode="ambush-alley"]');
  await click(c, `[data-arena-venue="${venueId}"]`);
  await c.screenshot(quality+'-'+venueId+'-yard');
  await click(c, '[data-action="arena-start"]'); await ready(c, 'field assets');
  await c.evaluate('window.__qaApp.advance(3.1)'); await ready(c, 'authored fighters');
  await c.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,before=JSON.stringify(s),
    view=window.__render.scene.getObjectByName('Ambush Alley scrap fort');
    a.onFrame?.(s,0);window.__render.renderFrame();
    if(!s.onFoot||s.arena.mode!=='ambush-alley'||s.arena.venueId!==${JSON.stringify(venueId)})
      throw Error('Wrong native entry '+JSON.stringify({foot:s.onFoot,mode:s.arena?.mode,venue:s.arena?.venueId,status:s.status}));
    if(!view?.visible||view.userData.coverCount!==s.arena.ambushAlley.fort.cover.length||!view.children.length)
      throw Error('Actual fort cover missing');
    const reserve=s.opponents.find(x=>x.arenaRole==='ambush-buggy');
    const buggyMesh=window.__render.scene.children.find(x=>x.userData.vehicleKey===reserve?.car);
    if(!reserve?.finished||reserve.ambushWave||!buggyMesh||buggyMesh.visible)
      throw Error('The real reserve buggy appears before its fourth-wave placement');
    if(JSON.stringify(s)!==before)throw Error('Presentation changed simulation');
    const canvas=window.__render.renderer.domElement,g=window.__render.renderer.getContext(),pixel=new Uint8Array(4);
    g.readPixels(Math.floor(canvas.width/2),Math.floor(canvas.height/2),1,1,g.RGBA,g.UNSIGNED_BYTE,pixel);
    if(pixel[0]+pixel[1]+pixel[2]===0)throw Error('Blank fight canvas');
    const f=s.fighter,from={x:f.x,z:f.z};a.duel.setFighterInput({forward:true});
    for(let n=0;n<12;n++)a.duel.step(1/120);
    a.duel.setFighterInput({forward:false});if(Math.hypot(f.x-from.x,f.z-from.z)<.01)throw Error('Fighter did not move');
    s.paused=true;const frozen=JSON.stringify(s.arena);a.advance(.5);
    if(JSON.stringify(s.arena)!==frozen)throw Error('Paused waves moved');s.paused=false;})()`);
  await c.screenshot(quality+'-'+venueId+'-fort');
  const pacing = await c.evaluate(`(async()=>{const a=window.__qaApp;a.start();const times=[];let previous=0;
    for(let i=0;i<150;i++){const now=await new Promise(requestAnimationFrame);if(i>30)times.push(now-previous);previous=now;}
    a.stop();times.sort((x,y)=>x-y);return{p50:times[Math.floor(times.length*.5)],p95:times[Math.floor(times.length*.95)]};})()`);
  await c.evaluate('(()=>{if(!window.__qaApp.restart())throw Error("Native rematch failed");})()');
  await ready(c, 'rematch assets');
  await c.evaluate('window.__qaApp.advance(3.1)');
  await c.evaluate(`(()=>{const a=window.__qaApp;
    const s=a.duel.state;if(s.status!=='racing')throw Error('Rematch countdown remains '+s.status);
    const contact=${contactFixture.replace('b=s.opponents[0]', "b=s.opponents.find(x=>x.arenaRole==='ambush-buggy'&&!x.finished)")};
    for(let wave=1;wave<=5;wave++){
      // Low-health, close-packed targets shorten real RPG production/flight.
      // The live mode still owns knockdown, wave completion and settlement.
      const f=s.fighter,at=a.duel.course.groundAt(f.s,f.lateral),yaw=f.yaw;
      const target={x:f.x+Math.sin(yaw)*26,z:f.z+Math.cos(yaw)*26};
      const nearest=a.duel.course.nearest(target.x,target.z);
      const ground=a.duel.course.groundAt(nearest.s,nearest.lateral);
      for(const zone of s.raids.zones){zone.nextShotAt=Infinity;for(const r of zone.raiders)
        Object.assign(r,{x:target.x,y:ground.y,z:target.z,s:nearest.s,lateral:nearest.lateral,groundY:ground.y,health:1});}
      f.pitch=Math.atan2(ground.y+.1-f.y-1.62,26);
      s.footWeapons.selected='rpg';s.footWeapons.ammo=3;
      a.duel.setFighterInput({fire:true});a.duel.step(1/120);a.duel.setFighterInput({fire:false});
      for(let n=0;n<78;n++)a.duel.step(1/120);
      if(s.raids.zones.some(z=>z.raiders.some(r=>!r.knockedDown)))throw Error('Actual RPG did not knock down wave '+
        JSON.stringify({wave,foot:s.onFoot,ammo:s.footWeapons.ammo,projectiles:s.combat.projectiles,
          fighter:{x:f.x,y:f.y,z:f.z,yaw:f.yaw,pitch:f.pitch},targets:s.raids.zones.flatMap(z=>z.raiders.map(r=>({x:r.x,y:r.y,z:r.z,health:r.health})))}));
      const buggy=s.opponents.find(x=>x.arenaRole==='ambush-buggy'&&x.ambushWave===wave);
      if(buggy){a.advance(.01);if(s.arena.ambushAlley.completedWaves!==wave-1)throw Error('Live buggy did not hold wave');
        a.onFrame?.(s,0);window.__render.renderFrame();
        const mesh=window.__render.scene.children.find(x=>x.userData.vehicleKey===buggy.car);
        if(!mesh?.visible)throw Error('The real placed wave buggy is hidden');
        contact(buggy.arenaId,35);
        if(!buggy.combatWrecking)throw Error('Actual buggy damage failed');
        a.onFrame?.(s,0);window.__render.renderFrame();
        if(!mesh.visible)throw Error('The actual spawned buggy wreck is hidden');}
      a.advance(.02);if(s.arena.ambushAlley.completedWaves!==wave)throw Error('Native wave did not settle');
      if(wave<5)a.advance(10.02);
    }
    if(s.status!=='arena_result'||!s.arena.result.settlementSaved||s.arena.result.scrapEarned!==540||
      s.arena.result.holdAdded!==25)
      throw Error('Native full-win pay failed '+JSON.stringify({status:s.status,cpu:s.cpuDifficulty,result:s.arena.result}));
    if(!window.__ambushCues.includes('interface.go')||!window.__ambushCues.includes('interface.bonus'))
      throw Error('Wave cues missing');a.onFrame?.(s,0);window.__render.renderFrame();})()`);
  await c.screenshot(quality+'-'+venueId+'-result');
  console.log('Ambush '+quality+' '+venueId+' '+JSON.stringify(pacing));
}
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  for (const quality of ['high', 'performance'])
    for (const venue of ['pit', 'salt-flats']) await journey(c, quality, venue);
}
import {contactFixture} from './warlord-reward.mjs';

