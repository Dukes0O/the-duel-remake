// Bundled production App/UI only. QA storage is installed by menu-check.
// Controlled poses and low armor make three actual contact wrecks repeatable;
// the real event credits them and emits its own completed result.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function click(context, selector) {
  const point = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing control ${selector}');
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(r.width<1||r.height<1||!b.contains(document.elementFromPoint(x,y)))throw Error('Covered control ${selector}');
    return{x,y};})()`);
  for(const type of ['mousePressed','mouseReleased'])
    await context.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});
}

async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    const c=document.querySelector('#view3d');return a?.visualReady&&!!window.__render&&
      c?.dataset.vehicleAsset==='ready'&&['ready','fallback','off','unsupported-fallback'].includes(c?.dataset.warmupStatus)&&
      document.querySelector('#renderer-loading')?.hidden;})()`,label,60_000);
}

async function yard(context) {
  await context.evaluate('window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()','reward yard');
  await ready(context,'reward yard presentation');
}

async function begin(context, rematch=false) {
  if(rematch) await click(context,'[data-action="arena-rematch"]');
  else {
    await click(context,'[data-action="yard-territory"]');
    await click(context,'[data-warlord="sal"]');
  }
  await context.waitFor(`window.__qaApp.duel.state.status==='warlord_intro'`,'Sal reward intro');
  await ready(context,'Sal reward intro presentation');
  await click(context,'[data-action="warlord-begin"]');
  await context.evaluate('window.__qaApp.advance(3.1)');
  await context.waitFor(`window.__qaApp.duel.state.arena.phase==='fight'`,'real Sal reward fight');
  await ready(context,'Sal reward fight presentation');
}

async function finish(context, winner) {
  return context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state;
    for(let i=0;i<3;i++){
      window.__rewardContact(${JSON.stringify(winner==='player'?'cpu-1':'player')},35);
      if(s.status==='arena_result')break;
      a.duel.step(1/120);
    }
    a.onFrame?.(s,0);window.__render.renderFrame();
    if(s.arena.result?.winnerId!==${JSON.stringify(winner)})throw Error('Actual contact wrecks failed to finish');
    return {...s.arena.result,runId:a.runId};})()`);
}

async function equip(context, car) {
  await context.evaluate(`(()=>{const select=document.querySelector('[data-kit-car]');
    if(!select)throw Error('Armory car selector missing');select.value=${JSON.stringify(car)};
    select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const before=await context.evaluate(`(()=>{const a=window.__qaApp,b=document.querySelector('[data-kit-tier="side-saws"]');
    if(!b||b.dataset.kitAction!=='equip'||b.disabled||!/EQUIP/.test(b.textContent))throw Error('Earned free equip missing');
    return {scrap:a.profile.wasteland.scrap,credits:a.profile.credits,wins:a.profile.wasteland.warlords.sal.wins};})()`);
  await click(context,'[data-kit-action="equip"][data-kit-tier="side-saws"]');
  const after=await context.evaluate(`(()=>{const a=window.__qaApp;
    if(a.profile.wasteland.kits[${JSON.stringify(car)}]?.equipped!=='side-saws')throw Error('Actual equip action failed');
    return {scrap:a.profile.wasteland.scrap,credits:a.profile.credits,wins:a.profile.wasteland.warlords.sal.wins};})()`);
  if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Earned equip changed bank or wins');
}

async function runQuality(context, quality) {
  await context.evaluate('window.name=""');
  await context.navigate(`/tools/menu-check.html?flags=warlords&harness=reward-${quality}`);
  await context.waitFor(`!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,quality+' memory-only menu',60_000);
  await ready(context,quality+' initial presentation');
  const baseline=await context.evaluate(`(()=>{const a=window.__qaApp;
    if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('QA storage isolation missing');
    a.stop();a.audio.setMuted(true);a.setGraphicsQuality(${JSON.stringify(quality)});
    document.head.insertAdjacentHTML('beforeend','<style>details:not(.weapon-shop){display:none!important}</style>');
    const owner=a.player.id;if(!a.addPlayer('Other Reward QA').ok||!a.selectPlayer(owner))throw Error('Named player fixture failed');
    a.profile={...a.profile,credits:50000,unknownRewardProfile:{keep:17},wasteland:{...a.profile.wasteland,
      discoveredGate:true,unknownRewardCareer:{keep:19},territories:{...a.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
    if(!a._saveProfile())throw Error('Memory-only career fixture failed');
    const store=Object.getOwnPropertyDescriptor(window,'localStorage').value,set=store.setItem.bind(store);
    window.__rewardProbe={fail:false,writes:[],other:JSON.stringify(a.players.players.find(p=>p.id!==owner).profile)};
    store.setItem=(key,value)=>{const q=window.__rewardProbe;if(q.fail)throw Error('Synthetic reward save failure');
      set(key,value);let parsed;try{parsed=JSON.parse(value)}catch{}if(parsed?.players)q.writes.push(parsed);};
    window.__rewardContact=(loserId,speed)=>{
      const d=a.duel,s=d.state,b=s.opponents[0],slot=s.arena.spawnSlots[0];
      for(const p of s.arena.participants){p.protectedSec=0;p.wreckCounted=false;}
      for(const actor of [s,b])Object.assign(actor,{s:slot.s,prevS:slot.s,lateral:slot.lateral,
        prevLateral:slot.lateral,speedMph:0,headingError:0,slipAngle:0,pushVelocity:0,yawVelocity:0,
        dir:1,combatWrecking:false,combatWreckTimer:0,knock:null,tumble:null,airborne:false,
        airHeight:0,prevAirHeight:0,groundHeight:null,damageCooldown:0,contactCooldown:0,armor:actor.maxArmor});
      s.invulnerableSec=0;s.combat.shield=0;s.combat.rivalShield=0;
      // Clear the existing pair through the real separation rule, then sweep both cars inward.
      s.lateral=s.prevLateral=slot.lateral-20;d._vehicleContact(s,b,'rival');
      Object.assign(s,{lateral:slot.lateral-1,prevLateral:slot.lateral-6,pushVelocity:speed*.44704});
      Object.assign(b,{lateral:slot.lateral+1,prevLateral:slot.lateral+6,pushVelocity:-speed*.44704});
      const loser=loserId==='player'?s:b;if(loserId)loser.armor=1;
      const before=b.armor,sparks=s.combat.bursts.filter(x=>x.kind==='spark').length;
      if(!d._vehicleContact(s,b,'rival'))throw Error('Actual swept contact was not reached');
      if(loserId&&!loser.combatWrecking)throw Error('Actual contact did not wreck the controlled low-armor victim');
      return {removed:before-b.armor,newSparks:s.combat.bursts.filter(x=>x.kind==='spark').length-sparks};
    };
    a.onFrame?.(a.duel.state,0);
    return {owner,credits:a.profile.credits,history:JSON.stringify(a.profile.history),raceMarkers:JSON.stringify(a.profile.settledResults)};
  })()`);
  await ready(context,quality+' chosen graphics mode');
  await click(context,'#wasteland-visit');await yard(context);await begin(context);
  await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__rewardProbe;q.before=JSON.stringify(a.profile);
    q.saved=window.name;q.writes=[];q.fail=true;})()`);
  const failed=await finish(context,'player');
  await ready(context,quality+' failed result');
  const failure=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__rewardProbe;
    const text=document.querySelector('#modal-layer').textContent;
    if(JSON.stringify(a.profile)!==q.before||window.name!==q.saved||q.writes.length)throw Error('Failed save changed career/storage');
    if(!document.querySelector('[data-action="warlord-retry-save"]')||!/Could not save this result/.test(text)||
      text.includes('Side Saws unlocked')||text.includes('+150'))throw Error('Failed result advertises an unpaid reward or lacks retry');
    q.fail=false;return{unchanged:true,scrapEarned:a.duel.state.arena.result.scrapEarned};})()`);
  if(failed.settlementSaved!==false||failure.scrapEarned!==0)throw Error('Failure result fields wrong');
  await context.screenshot(`${quality}-retry-save`);
  await click(context,'[data-action="warlord-retry-save"]');
  await ready(context,quality+' saved retry result');
  const saved=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__rewardProbe,p=a.profile,r=a.duel.state.arena.result;
    if(q.writes.length!==1||r.scrapEarned!==150||!r.settlementSaved||r.settlementRetryable||
      p.wasteland.scrap!==150||!p.wasteland.warlords.sal.defeated||!p.wasteland.territories.sal.claimed||
      p.wasteland.kits[a.duel.state.car]?.equipped!=='side-saws'||!p.wasteland.settledResults.includes('warlord:'+a.runId)||
      p.unknownRewardProfile.keep!==17||p.wasteland.unknownRewardCareer.keep!==19)throw Error('Incomplete first-win transaction');
    if(JSON.stringify(a.players.players.find(x=>x.id!==a.player.id).profile)!==q.other)throw Error('Other named player changed');
    if(document.querySelector('[data-action="warlord-retry-save"]')||!/Side Saws unlocked/.test(document.querySelector('#modal-layer').textContent))
      throw Error('Successful retry presentation missing');
    if(a.retryArenaSettlement()||a._settleArenaResult({result:r},a.duel.state)||q.writes.length!==1)throw Error('Duplicate reward paid');
    return {scrap:p.wasteland.scrap,wins:p.wasteland.warlords.sal.wins,oneRegistryWrite:true};})()`);
  await context.screenshot(`${quality}-first-win`);
  await begin(context,true);
  const hit=await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state;
    if(s.combatArmorKit!=='side-saws')throw Error('Rematch did not activate the equipped earned kit');
    const hit=window.__rewardContact(null,17.5);a.onFrame?.(s,0);window.__render.renderFrame();
    const saw=window.__render.scene.getObjectByName('kit-saw-0');let visible=!!saw;
    for(let n=saw;n;n=n.parent)visible=visible&&n.visible;
    if(hit.removed<=0||hit.newSparks<1||!visible)throw Error('Authored earned saws or real contact sparks absent');
    return {...hit,authoredSawVisible:visible};})()`);
  await context.screenshot(`${quality}-earned-saws-hit`);
  const rematch=await finish(context,'player');
  if(rematch.scrapEarned!==25)throw Error('Rematch did not earn exactly 25');
  await ready(context,quality+' rematch win');
  await begin(context,true);const loss=await finish(context,'cpu-1');
  if(loss.scrapEarned!==0||!loss.settlementSaved)throw Error('Loss did not settle for zero scrap');
  await ready(context,quality+' free loss');await context.screenshot(`${quality}-free-loss`);
  await click(context,'[data-action="arena-yard"]');await yard(context);
  await click(context,'[data-action="yard-armory"]');await equip(context,'stuttgart_959s');
  await context.screenshot(`${quality}-current-car-free-equip`);
  await click(context,'[data-action="armory-close"]');
  await click(context,'[data-action="yard-menu"]');
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'`,'menu to buy future car');
  await context.evaluate(`(()=>{const a=window.__qaApp;if(!a.unlockCar('banshee_muscle').ok)throw Error('Future car purchase failed');})()`);
  await click(context,'#armory-open');await equip(context,'banshee_muscle');
  await context.screenshot(`${quality}-future-car-free-equip`);
  await click(context,'[data-action="armory-close"]');
  const final=await context.evaluate(`(()=>{const a=window.__qaApp,p=a.profile;
    if(p.wasteland.scrap!==175||p.wasteland.warlords.sal.wins!==2||p.wasteland.warlords.sal.losses!==1||
      JSON.stringify(p.history)!==${JSON.stringify(baseline.history)}||JSON.stringify(p.settledResults)!==${JSON.stringify(baseline.raceMarkers)})
      throw Error('Reward flow altered race records or paid wrong economy');
    return{scrap:p.wasteland.scrap,wins:2,losses:1,credits:p.credits,currentCar:'stuttgart_959s',futureCar:'banshee_muscle'};})()`);
  // Same-tab reload restores the disposable registry, never the real origin store.
  await context.navigate('/tools/menu-check.html?flags=warlords&harness=reward-reload-'+quality);
  await context.waitFor(`window.__qaApp?.profile?.wasteland?.scrap===175`,'saved reward reload',60_000);
  await ready(context,quality+' reload');
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
    if(a.profile.wasteland.warlords.sal.wins!==2||a.profile.wasteland.kits.banshee_muscle.equipped!=='side-saws')throw Error('Reward reload incomplete');
    const other=a.players.players.find(p=>p.id!==a.player.id);if(!a.selectPlayer(other.id)||
      a.profile.wasteland.warlords.sal.defeated||a.profile.wasteland.scrap!==0||a.equipArmorKit('falcone_f42','side-saws').ok)
      throw Error('Second named player inherited reward');
    if(!a.selectPlayer(${JSON.stringify(baseline.owner)}))throw Error('Reward owner restore failed');})()`);
  await context.navigate('/tools/menu-check.html?harness=reward-released-'+quality);
  await context.waitFor(`window.__qaApp?.profile?.wasteland?.scrap===175`,'released reward owner',60_000);
  await ready(context,quality+' released menu');await click(context,'#armory-open');
  const released=await context.evaluate(`(()=>{const a=window.__qaApp,text=document.querySelector('.garage-panel').textContent;
    if(a.warlordsAvailable()||document.querySelector('[data-kit-tier="side-saws"]')||(/SIDE SAWS/.test(text)||text.includes('1.6')))throw Error('Dev reward advertised in released Armory');
    return{hidden:true,entitlementPreserved:a.profile.wasteland.warlords.sal.defeated};})()`);
  console.log(`${quality}: real retry click saved one complete 150-scrap reward; rematch 25, loss 0; authored saws + real sparks; current/future free equip, reload and named-player/switch isolation`);
  return{quality,failure,saved,hit,rematch:rematch.scrapEarned,loss:loss.scrapEarned,final,released};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await runQuality(context,quality));
  await writeFile(join(context.outputDir,'reward-verdict.json'),JSON.stringify(reports,null,2)+'\n');
}
