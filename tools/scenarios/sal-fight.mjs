// Private, memory-only visual review of the production Sal move dispatcher.
// Discovery, hold and car positions are labelled fixtures; tell/counter/phase
// transitions below run through the real brain or Duel.step, never art overrides.
async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(() => {window.__qaApp?.onFrame?.(window.__qaApp.duel.state,0);
    window.__render?.renderFrame();return !!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus);
  })()`, label, 60000);
}

async function capture(context, quality, stage) {
  await ready(context, `${quality} ${stage} assets`);
  const result = await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state,a=s.opponents[0],render=window.__render;
    const found=[];render.scene.traverse(n=>{if(n.name==='kit-sal-saws'&&n.visible)found.push(n);});
    const rig=found[0],left=rig?.getObjectByName('kit-sal-saw-left'),
      right=rig?.getObjectByName('kit-sal-saw-right'),sparks=rig?.getObjectByName('kit-sal-sparks');
    return {quality:${JSON.stringify(quality)},stage:a.salSaw.stage,phase:a.salSaw.phase,
      sinceSec:a.salSaw.sinceSec,time:s.stageTimeSec,callout:s.callout,
      visible:!!rig,left:!!left,right:!!right,sparks:!!sparks?.visible,
      rotations:[left?.rotation.x,right?.rotation.x],armor:a.maxArmor,kit:a.combatArmorKit??null,
      presentationKit:a.armorKit,memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
        window.name.startsWith('__duel_qa_tab_v2:'),events:window.__salFightEvents};
  })()`);
  if (!result.memoryOnly || !result.visible || !result.left || !result.right || result.stage !== stage)
    throw Error(`Sal ${quality}/${stage} presentation: ${JSON.stringify(result)}`);
  if (stage === 'window' && (!result.sparks || result.callout !== 'SHE MISSED. HIT HER NOW!'))
    throw Error('Miss must show its sparks and counterattack callout');
  if (stage === 'tell' && !result.events.some(e=>e.salSaw?.position))
    throw Error('Production tell must emit the positional saw-scream event');
  await context.screenshot(`${quality}-${stage}`);
  return result;
}

async function runQuality(context, quality) {
  await context.navigate(`/tools/menu-check.html?flags=warlords&harness=sal-fight-${quality}`);
  await context.waitFor('!!window.__qaApp&&!!window.__render', `${quality} private menu`, 60000);
  await ready(context, `${quality} menu`);
  await context.evaluate(`(() => {
    if (!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
        !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only review required');
    const app=window.__qaApp;app.stop();app.setGraphicsQuality(${JSON.stringify(quality)});
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,
      territories:{...app.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
    if(!app._saveProfile()||!app.visitWasteland())throw Error('Private discovery/hold fixture failed');
    window.__salFightEvents=[];
    app.duel.onChange((_state,event)=>{if(event.salSaw||event.arenaTell||event.warlordPhase)
      window.__salFightEvents.push(event)});
  })()`);
  await ready(context, `${quality} yard`);
  await context.evaluate(`(() => {const app=window.__qaApp;
    if(!app.startWarlordFight('sal')||!app.beginWarlordFight())throw Error('Production Sal entry failed');
    for(let i=0;i<362;i++)app.duel.step(1/120);
    if(app.duel.state.status!=='racing')throw Error('Production countdown failed');
  })()`);
  await ready(context, `${quality} fight`);
  await context.evaluate(`(async () => {
    const app=window.__qaApp,d=app.duel,s=d.state,a=s.opponents[0],p=s.arena.participants[1];
    const {resetSalFight}=await import('/src/arena/sal-fight.js');
    const {thinkBrain}=await import('/src/arena/arena-brains.js');
    window.__salFightThink=thinkBrain;
    // Stop both cars in an open, matched alongside pose. The real brain starts
    // the tell, while a fixed review camera makes its shipped art readable.
    const site=d.course.def.scrapdome.ringRadius?0:s.s;
    Object.assign(s,{s:site,prevS:site,lateral:-4,prevLateral:-4,headingError:0,speedMph:35});
    Object.assign(a,{s:site,prevS:site,lateral:4,prevLateral:4,headingError:0,speedMph:35});
    for(const participant of s.arena.participants)participant.protectedSec=0;
    s.invulnerableSec=0;p.targetId='player';p.goal=null;p.reactionSec=0;
    p.tellLeft=0;p.chargeReady=false;resetSalFight(d,a);thinkBrain(d,p,a,0);
    const at=d.course.worldAt(a.s,a.lateral);
    app.inspectionCamera={position:[at.x+7,at.y+3,at.z+5],target:[at.x,at.y+.7,at.z]};
    app.onFrame?.(s,0);window.__render.renderFrame();
  })()`);
  const rows=[];
  await context.evaluate(`(() => {const s=window.__qaApp.duel.state;s.stageTimeSec+=.2;
    window.__salFightThink(window.__qaApp.duel,s.arena.participants[1],s.opponents[0],.2)})()`);
  rows.push(await capture(context,quality,'tell'));
  await context.evaluate(`(() => {
    const app=window.__qaApp,d=app.duel,s=d.state,a=s.opponents[0],p=s.arena.participants[1];
    d.setInput({throttle:0,brake:1,boost:false});s.s-=10;s.speedMph=0;
    s.stageTimeSec=a.salSaw.untilSec;const goal=window.__salFightThink(d,p,a,0);
    if(goal.steeringScale!==.5||goal.boost||a.salSaw.stage!=='window')throw Error('Production miss goal wrong');
  })()`);
  rows.push(await capture(context,quality,'window'));
  await context.evaluate(`(async () => {
    const app=window.__qaApp,d=app.duel,s=d.state,a=s.opponents[0];
    const {applyArmorDamage}=await import('/src/combat-armor.js');
    a.armor=1;applyArmorDamage(d,a,'crossbow',{owner:'player'});d.step(1/120);
    if(s.arena.warlordPhase!==2)throw Error('Real Sal wreck failed phase two');
    a.combatWreckTimer=0;d.step(1/120);s.arena.participants[1].protectedSec=0;
    a.s=s.s+35;a.lateral=s.lateral;a.headingError=Math.PI;a.speedMph=35;
    s.stageTimeSec+=.01;window.__salFightThink(d,s.arena.participants[1],a,.01);
    if(a.salSaw.stage!=='charge-tell'||!(a.arenaTellSec>0))throw Error('Production phase-two charge tell missing');
    const at=d.course.worldAt(a.s,a.lateral);
    app.inspectionCamera={position:[at.x+7,at.y+3,at.z+5],target:[at.x,at.y+.7,at.z]};
  })()`);
  rows.push(await capture(context,quality,'charge-tell'));
  await context.evaluate(`(() => {const d=window.__qaApp.duel,s=d.state,a=s.opponents[0];
    s.stageTimeSec=a.salSaw.untilSec;const goal=window.__salFightThink(d,s.arena.participants[1],a,0);
    if(a.salSaw.stage!=='charge'||goal.boost!==true)throw Error('Full Charge tell failed to release boost');
  })()`);
  rows.push(await capture(context,quality,'charge'));
  console.log(`${quality} Sal move review: ${JSON.stringify(rows)}`);
}

export async function run(context) {
  for (const quality of ['high','performance']) await runQuality(context,quality);
  console.log('Sal review uses stopped memory-only position/camera fixtures and real move transitions. Audio event checks prove routing, not audibility or fun; those require Claude play-through.');
}
