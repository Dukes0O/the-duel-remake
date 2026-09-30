// Actual yard UI and actual engine interactions. Only temporary profile/poses
// and a whistle jump are fixtures. No simulated pickup, delivery or result.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contactFixture} from './warlord-reward.mjs';
import {PLAYERS_KEY} from '../../src/progression.js';

async function click(c, selector) {
  const point = await c.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.hidden||b.disabled)throw Error('Missing visible Fuel control');
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;
    if(!b.contains(document.elementFromPoint(x,y)))throw Error('Fuel control is covered');
    return{x,y};})()`);
  for(const type of ['mousePressed','mouseReleased'])
    await c.command('Input.dispatchMouseEvent',{type,button:'left',clickCount:1,...point});
}
async function ready(c, name) {
  await c.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    return a?.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`,name,60_000);
}
async function key(c, code, seconds) {
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:code==='KeyF'?'f':'w',code,
    windowsVirtualKeyCode:code==='KeyF'?70:87});
  await c.evaluate('window.__qaApp.advance('+seconds+')');
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:code==='KeyF'?'f':'w',code,
    windowsVirtualKeyCode:code==='KeyF'?70:87});
  await c.evaluate('window.__qaApp.advance(1/120)');
}
const helpers = `(()=>{
  const a=window.__qaApp;
  const tick=n=>{for(let i=0;i<n;i++)a.duel.step(1/120);};
  const participant=id=>a.duel.state.arena.participants.find(p=>p.id===id);
  const actor=id=>id==='player'?a.duel.state:a.duel.state.opponents.find(p=>p.arenaId===id);
  const pose=(id,p)=>Object.assign(actor(id),{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,
    speedMph:0,headingError:0,yawVelocity:0,pushVelocity:0,knock:null,tumble:null,
    airborne:false,airHeight:0,groundHeight:null});
  const hold=(except='player')=>{for(const p of a.duel.state.arena.participants)if(p.id!==except){
    Object.assign(actor(p.id),{combatWrecking:true,combatWreckTimer:100000});p.wreckCounted=true;}};
  const pick=(id='player',index=0)=>{const pad=a.duel.state.arena.fuelRun.pads[index];
    if(!pad.canisterId)throw Error('Fuel pad empty');const item=pad.canisterId;
    pose(id,pad);tick(1);if(participant(id).fuelCanisterId!==item)throw Error('Real Fuel pickup failed');return item;};
  const deliver=(id='player')=>{const p=participant(id),before=p.fuelDelivered;
    const depot=a.duel.state.arena.fuelRun.depots.find(x=>x.participantId===id);
    pose(id,depot);tick(1);if(p.fuelDelivered!==before+1)throw Error('Real Fuel delivery failed');};
  const foot=p=>{const f=a.duel.state.fighter,at=a.duel.course.groundAt(p.s,p.lateral);
    Object.assign(f,{s:p.s,lateral:p.lateral,x:at.x,y:at.y,z:at.z,groundY:at.y,yaw:at.heading,
      airHeight:0,verticalSpeed:0});};
  const paint=()=>{a.onFrame?.(a.duel.state,0);window.__render.renderFrame();};
  window.__fuel={tick,participant,actor,pose,hold,pick,deliver,foot,paint};
  return true;
})()`;

async function qualityRun(c, quality) {
  await c.evaluate('window.name=""');
  await c.navigate('/tools/menu-check.html?flags=fuel-run&harness=arena-fuel-'+quality);
  await c.waitFor('window.__qaApp?.duel.state.status==="menu"','memory Fuel menu',60_000);
  await c.evaluate(`(()=>{
    const a=window.__qaApp;a.stop();a.setGraphicsQuality(${JSON.stringify(quality)});
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Memory-only store missing');
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    const owner=a.player.id;if(!a.addPlayer('Fuel spectator').ok||!a.selectPlayer(owner))throw Error('Named player fixture failed');
    a.cpuDifficulty='medium';a.profile.wasteland.discoveredGate=true;
    a.profile.wasteland.xp=2500;a.profile.wasteland.rank=5;
    if(!a._saveProfile())throw Error('Temporary rank fixture failed');
    window.__fuelProbe={events:[],cues:[],fail:false,writes:0,
      other:JSON.stringify(a.players.players.find(p=>p.id!==owner).profile),owner};
    const store=Object.getOwnPropertyDescriptor(window,'localStorage').value,set=store.setItem.bind(store);
    window.__fuelProbe.externalSet=set;
    store.setItem=(k,v)=>{if(window.__fuelProbe.fail)throw Error('Synthetic Fuel save failure');
      window.__fuelProbe.writes++;set(k,v);};
    const play=a.audio._playCue.bind(a.audio);
    a.audio._playCue=(cue,...args)=>{window.__fuelProbe.cues.push(cue);return play(cue,...args);};
    a.duel.onChange((_s,event)=>{if(event.fuelPickup||event.fuelDrop||event.fuelDelivery||event.arenaResult)
      window.__fuelProbe.events.push(structuredClone(event));});
    a.onFrame?.(a.duel.state,0);return true;
  })()`);
  await ready(c,'Fuel menu presentation');
  await click(c,'[data-cpu-difficulty="medium"]');
  await click(c,'#wasteland-visit');await ready(c,'Fuel yard transition');
  await c.evaluate('window.__qaApp.advance(8)');
  await ready(c,'rank5 yard');await click(c,'[data-action="yard-scrapdome"]');
  if(await c.evaluate('!!document.querySelector("[data-arena-mode=fuel-run]")'))throw Error('Rank5 advertised locked Fuel mode');
  await c.evaluate(`(()=>{const a=window.__qaApp;a.returnToMenu();a.profile.wasteland.xp=3500;a.profile.wasteland.rank=6;
    if(!a._saveProfile())throw Error('Rank6 fixture failed');a.onFrame?.(a.duel.state,0);})()`);
  await click(c,'#wasteland-visit');await ready(c,'rank6 yard transition');
  await c.evaluate('window.__qaApp.advance(8)');await ready(c,'rank6 yard');
  await click(c,'[data-action="yard-scrapdome"]');
  await click(c,'[data-arena-mode="fuel-run"]');await click(c,'[data-arena-opponents="3"]');
  await c.screenshot(quality+'-yard-fuel-rules');
  await click(c,'[data-action="arena-start"]');await ready(c,'Fuel field assets');
  await c.evaluate('window.__qaApp.advance(3.1)');
  await c.waitFor('window.__qaApp.duel.state.arena?.mode==="fuel-run"&&window.__qaApp.duel.state.arena.phase==="fight"','actual Fuel fight');
  await c.evaluate(helpers);
  await ready(c,'Fuel floor and HUD');
  const frames = await c.evaluate(`(async()=>{
    const a=window.__qaApp;a.start();const times=[];let last=0;
    for(let i=0;i<150;i++){const t=await new Promise(requestAnimationFrame);if(last&&i>30)times.push(t-last);last=t;}
    a.stop();const sorted=[...times].sort((a,b)=>a-b);
    return{mean:times.reduce((x,y)=>x+y,0)/times.length,p95:sorted[Math.floor(sorted.length*.95)],
      draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};
  })()`);
  await c.evaluate(`(()=>{const q=window.__fuelProbe,f=window.__fuel,a=window.__qaApp;
    // New rematch avoids cargo accumulated during the unrestricted pacing sample.
    if(!a.restart())throw Error('Fuel rematch failed');f.hold();f.tick(374);
    f.pick();f.paint();return true;})()`);
  await ready(c,'roof Fuel cargo');await c.screenshot(quality+'-roof-canister');
  const heavy = await c.evaluate(`(()=>{
    const a=window.__qaApp,f=window.__fuel,contact=${contactFixture};
    const carry=f.participant('player').fuelCanisterId;
    for(const actor of [a.duel.state,a.duel.state.opponents[0]]){actor.maxArmor=1000;actor.armor=1000;}
    const before=a.duel.state.armor;contact(null,60);
    if(before-a.duel.state.armor<=25||f.participant('player').fuelCanisterId)throw Error('Real heavy contact did not drop cargo');
    const dropped=a.duel.state.arena.fuelRun.canisters.find(x=>x.id===carry);
    if(dropped.carriedBy!==null)throw Error('Heavy hit still has carrier');
    f.paint();return{removed:before-a.duel.state.armor,id:carry,s:dropped.s,lateral:dropped.lateral};
  })()`);
  await c.screenshot(quality+'-heavy-hit-drop');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel,dropped=a.duel.state.arena.fuelRun.canisters.find(x=>x.id===${JSON.stringify(heavy.id)});
    const enemy=f.actor('cpu-1');Object.assign(enemy,{combatWrecking:false,combatWreckTimer:0});
    f.participant('cpu-1').wreckCounted=false;
    f.pose('player',{s:dropped.s+20,lateral:0});f.pose('cpu-1',dropped);f.tick(1);
    if(f.participant('cpu-1').fuelCanisterId!==dropped.id)throw Error('Enemy failed to recover dropped Fuel');
    f.hold();f.paint();})()`);
  await c.screenshot(quality+'-enemy-recovers-fuel');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel,contact=${contactFixture};f.pick('player',1);
    const item=f.participant('player').fuelCanisterId;contact('player',35);f.hold();f.tick(1);
    if(!a.duel.state.combatWrecking||f.participant('player').fuelCanisterId||
      a.duel.state.arena.fuelRun.canisters.find(x=>x.id===item)?.carriedBy)throw Error('Real wreck failed to drop Fuel');
    f.paint();})()`);
  await c.screenshot(quality+'-wreck-drops-fuel');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel;f.hold();f.tick(500);
    if(a.duel.state.combatWrecking)throw Error('Real arena respawn failed');
    const depot=a.duel.state.arena.fuelRun.depots[0];f.pose('player',{s:depot.s+20,lateral:depot.lateral});
    a.setFootCamera('overhead');f.paint();})()`);
  await key(c,'KeyF',.5);
  if(!await c.evaluate('window.__qaApp.duel.state.onFoot'))throw Error('Actual F exit failed');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel,pad=a.duel.state.arena.fuelRun.pads[2],id=pad.canisterId;f.foot(pad);f.tick(1);
    if(f.participant('player').fuelCanisterId!==id)throw Error('Foot Fuel pickup failed');
    if(!f.participant('player').fuelCanisterId)throw Error('Foot has no Fuel');f.paint();})()`);
  await ready(c,'fighter cargo');await c.screenshot(quality+'-fighter-carries-fuel');
  const walking = await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel;
    const beforeDelivered=f.participant('player').fuelDelivered;
    const car={s:a.duel.state.s,lateral:a.duel.state.lateral},fighter=a.duel.state.fighter,from={x:fighter.x,z:fighter.z};
    a.duel.setFighterInput({forward:true});f.tick(24);a.duel.setFighterInput({forward:false});
    const walked=Math.hypot(fighter.x-from.x,fighter.z-from.z);
    if(Math.abs(walked-.63)>.005||a.duel.state.s!==car.s||a.duel.state.lateral!==car.lateral)
      throw Error('Loaded walking/parked car wrong '+walked);
    const depot=a.duel.state.arena.fuelRun.depots[0];f.foot(depot);f.tick(1);
    if(f.participant('player').fuelDelivered!==beforeDelivered+1)throw Error('Actual foot delivery failed');f.paint();return{walked,car};
  })()`);
  await c.screenshot(quality+'-fighter-delivery');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel;f.foot({s:a.duel.state.s,lateral:a.duel.state.lateral+2.5});})()`);
  await key(c,'KeyF',.7);
  if(await c.evaluate('window.__qaApp.duel.state.onFoot'))throw Error('Actual F return failed');
  const refill=await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel,pad=a.duel.state.arena.fuelRun.pads[0];
    f.pose('player',a.duel.state.arena.fuelRun.depots[0]);
    while(!pad.canisterId)f.tick(1);f.pick();const taken=pad.refillSec;
    f.pose('player',a.duel.state.arena.fuelRun.depots[0]);f.tick(599);
    if(pad.canisterId)throw Error('Fuel refilled early');f.tick(1);if(!pad.canisterId)throw Error('Fuel failed five second refill');
    f.paint();return{taken,refilled:pad.canisterId};})()`);
  await c.screenshot(quality+'-five-second-refill');
  // Fresh actual rematch: a tied whistle must ask for delivery rather than wreck.
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel;if(!a.restart())throw Error('Fuel rematch failed');
    f.hold();f.tick(374);f.pick();a.duel.state.arena.clockSec=180-1/240;f.tick(1);
    if(a.duel.state.arena.phase!=='sudden-death')throw Error('Fuel tie failed');f.paint();})()`);
  await c.screenshot(quality+'-delivery-sudden-death');
  await c.evaluate(`(()=>{const a=window.__qaApp,f=window.__fuel,q=window.__fuelProbe;
    q.before=JSON.stringify(a.profile);q.saved=window.name;q.writes=0;q.fail=true;
    f.deliver();q.fail=false;f.paint();
    if(a.duel.state.status!=='arena_result'||a.duel.state.arena.result.scrapEarned!==0||
      !a.duel.state.arena.result.settlementRetryable||q.before!==JSON.stringify(a.profile)||q.saved!==window.name)
      throw Error('Failed Fuel persistence changed owner or reported payment');})()`);
  await c.screenshot(quality+'-retry-save');
  // A separate tab's progress is a raw write to this disposable memory store.
  // It bypasses only the App-write counter, not storage or actual Retry behavior.
  await c.evaluate(`(()=>{const a=window.__qaApp,q=window.__fuelProbe;
    const registry=JSON.parse(localStorage.getItem(${JSON.stringify(PLAYERS_KEY)}));
    const owner=registry.players.find(p=>p.id===q.owner),car=a.duel.state.car;
    owner.profile.credits=2000;owner.profile.wasteland.scrap=100;
    owner.profile.upgrades[car]={...owner.profile.upgrades[car],engine:1};
    owner.profile.wasteland.territories.kettle.hold=10;
    owner.profile.otherTabFuelField={kept:true};
    q.externalSet(${JSON.stringify(PLAYERS_KEY)},JSON.stringify(registry));q.freshOwnerCar=car;
  })()`);
  await click(c,'[data-action="warlord-retry-save"]');
  const saved=await c.evaluate(`(()=>{const a=window.__qaApp,q=window.__fuelProbe,r=a.duel.state.arena.result;
    if(!r.settlementSaved||r.scrapEarned!==240||r.holdAdded!==25||q.writes!==1)
      throw Error('Actual Fuel retry did not bank Medium pay once '+JSON.stringify(r));
    if(a.profile.credits!==2000||a.profile.wasteland.scrap!==340||
      a.profile.upgrades[q.freshOwnerCar]?.engine!==1||a.profile.wasteland.territories.kettle.hold!==35||
      a.profile.otherTabFuelField?.kept!==true)throw Error('Fuel Retry erased newer durable owner progress');
    if(a._settleArenaResult({result:r},a.duel.state)||q.writes!==1)throw Error('Fuel duplicate settlement paid twice');
    if(JSON.stringify(a.players.players.find(p=>p.id!==q.owner).profile)!==q.other)throw Error('Fuel changed other named player');
    window.__fuel.paint();return{...r,durableOwner:{credits:a.profile.credits,scrap:a.profile.wasteland.scrap,
      engine:a.profile.upgrades[q.freshOwnerCar].engine,hold:a.profile.wasteland.territories.kettle.hold},
      cues:[...q.cues],events:structuredClone(q.events)};})()`);
  await ready(c,'saved Fuel result');await c.screenshot(quality+'-saved-result');
  for(const cue of ['interface.bonus','vehicle.landing','interface.go','interface.win'])
    if(!saved.cues.includes(cue))throw Error('Authored Fuel cue missing '+cue);
  await click(c,'[data-action="arena-yard"]');await ready(c,'returned Fuel yard');
  await c.evaluate('window.__qaApp.advance(8)');await ready(c,'Fuel yard home');
  console.log(quality+': actual rank-gated yard, roof/foot fuel, heavy-hit/wreck drops, enemy recovery, 5s refill, delivery sudden death, atomic retry240/hold25; '+JSON.stringify(frames));
  return{quality,frames,heavy,walking,refill,saved};
}
export async function run(context) {
  if(process.env.DUEL_FUEL_PLAYER_FALLBACK_ONLY==='1'){
    const {checkFuelPlayerModeFallback}=await import('../test-arena-fuel-run.mjs');
    await checkFuelPlayerModeFallback(context);
    await context.screenshot('rank5-named-player-last-car-rolling');
    return;
  }
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await qualityRun(context,quality));
  await writeFile(join(context.outputDir,'fuel-verdict.json'),JSON.stringify(reports,null,2)+'\n');
}
// Rebuildable headless feel sample. Uses real input/limits and complete rounds,
// with a simple fuel-seeking player rather than controlled delivery teleports.
export async function measureFuelRounds({seeds = [1989, 77123]} = {}) {
  const [{Duel}, {fuelGoal}, {arenaCarSpec}, {arenaFloorSpeed},
    {createHash}] = await Promise.all([
    import('../../src/game.js'), import('../../src/arena/modes/fuel-run.js'),
    import('../../src/arena/arena-pilot.js'), import('../../src/arena/venues.js'),
    import('node:crypto'),
  ]);
  const clamp = value => Math.max(-1, Math.min(1, value));
  const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
  const rounds = [];
  for (const difficulty of ['easy', 'medium', 'hard']) for (const seed of seeds) {
    const duel = new Duel({seed, featureFlags: {wasteland2:true, scrapdome:true, 'fuel-run':true}});
    if (!duel.startArenaEvent({mode:'fuel-run',seed,car:'falcone_f42',cpuDifficulty:difficulty,
      opponents:[{car:'dusthawk_rally',brain:'collector'},{car:'aurora_gt',brain:'rammer'},
        {car:'stuttgart_959s',brain:'hunter'}]})) throw Error('Fuel sample failed to launch');
    const events = {pickups:0,drops:0,deliveries:0,wallHits:0};
    const traces = [];
    duel.onChange((_s,event) => {
      if(event.fuelPickup)events.pickups++;
      if(event.fuelDrop)events.drops++;
      if(event.fuelDelivery)events.deliveries++;
      if(event.arenaWallHit)events.wallHits++;
    });
    for(let n=0;n<120*300 && duel.state.status!=='arena_result';n++) {
      const s=duel.state, p=s.arena.participants[0];
      if(s.status==='racing'&&!s.combatWrecking) {
        const spec=arenaCarSpec(duel,s), top=arenaFloorSpeed(duel.course.def.scrapdome,spec.topSpeed);
        const goal=fuelGoal(duel,p,s,top*.8), at=duel.course.worldAt(s.s,s.lateral);
        const desired=Math.atan2(goal.x-at.x,goal.z-at.z);
        const error=wrap(desired-duel.course.at(s.s).heading-(s.headingError||0));
        const target=Math.abs(error)>1 ? 17 : Math.min(goal.speedMph,45);
        duel.setInput({throttle:s.speedMph<target?1:0,brake:s.speedMph>target+3?.5:0,
          steer:clamp(-error/.55),boost:false});
      } else duel.setInput({throttle:0,brake:0,steer:0,boost:false});
      duel.step(1/120);
      if(n%120===119)traces.push({s:s.s,lateral:s.lateral,clock:s.arena.clockSec,
        phase:s.arena.phase,scores:s.arena.participants.map(p=>[p.fuelDelivered,p.fuelCanisterId,p.wrecks,p.wrecked]),
        actors:[s,...s.opponents].map(a=>[a.s,a.lateral,a.speedMph,a.armor])});
    }
    const arena=duel.state.arena;
    rounds.push({seed,difficulty,seconds:duel.state.stageTimeSec,phase:arena.phase,result:arena.result,
      scores:arena.participants.map(p=>({id:p.id,brain:p.brain,delivered:p.fuelDelivered,
        wrecks:p.wrecks,wrecked:p.wrecked})),events,
      fingerprint:createHash('sha256').update(JSON.stringify(traces)).digest('hex')});
  }
  return {script:'arena-fuel-run.measureFuelRounds',dt:1/120,seeds,rounds};
}