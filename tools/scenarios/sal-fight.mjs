// Private, memory-only visual review of the production Sal move dispatcher.
// Discovery, hold and car positions are labelled fixtures; tell/counter/phase
// transitions below run through Duel.step and existing game methods, never art overrides.
async function ready(context, label) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.waitFor(`(() => {window.__qaApp?.onFrame?.(window.__qaApp.duel.state,0);
    window.__render?.renderFrame();return !!window.__qaApp?.visualReady&&!!window.__render&&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
    ['ready','fallback','off','unsupported-fallback'].includes(document.querySelector('#view3d')?.dataset.warmupStatus)&&
    document.querySelector('#renderer-loading')?.hidden;
  })()`, label, 60000);
}

async function capture(context, quality, stage, label = stage) {
  await context.evaluate(`(() => {const app=window.__qaApp,d=app.duel,a=d.state.opponents[0];
    const at=d.course.worldAt(a.s,a.lateral),height=(a.groundHeight??at.y)+(a.airHeight||0);
    // Follow the real airborne height and frame above the car so its projected
    // production nameplate sits below the fixed timer and callout text.
    app.inspectionCamera={position:[at.x+10,height+4.5,at.z+7],target:[at.x,height+4,at.z]};
  })()`);
  await ready(context, `${quality} ${stage} assets`);
  // The shipped camera eases toward a new pose. Wait for that real easing,
  // then repaint the HUD projection against the settled camera.
  await context.waitFor(`(() => {window.__render.renderFrame();
    const p=window.__render.camera.position,target=window.__qaApp.inspectionCamera.position;
    return Math.hypot(p.x-target[0],p.y-target[1],p.z-target[2])<.05;})()`,
    `${quality} ${label} camera settled`, 10000);
  await context.evaluate(`(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state,0);
    window.__render.renderFrame();a.onFrame?.(a.duel.state,0);})()`);
  const result = await context.evaluate(`(() => {
    const app=window.__qaApp,s=app.duel.state,a=s.opponents[0],render=window.__render;
    const found=[];let chargeFlares=0;
    render.scene.traverse(n=>{if(n.name==='kit-sal-saws'&&n.visible)found.push(n);
      if(n.name==='Arena charge tell'&&n.visible)chargeFlares++;});
    const callout=document.querySelector('#race-callout'),calloutText=document.querySelector('#callout-text'),
      marker=document.querySelector('.combat-opponent-marker');
    const textRect=calloutText?.getBoundingClientRect(),markerRect=marker?.getBoundingClientRect();
    const hudOccluded=!!textRect&&!!markerRect&&textRect.left<markerRect.right&&
      textRect.right>markerRect.left&&textRect.top<markerRect.bottom&&textRect.bottom>markerRect.top;
    const rig=found[0],left=rig?.getObjectByName('kit-sal-saw-left'),
      right=rig?.getObjectByName('kit-sal-saw-right'),sparks=rig?.getObjectByName('kit-sal-sparks'),
      tellSparks=rig?.getObjectByName('kit-sal-tell-sparks');
    return {quality:${JSON.stringify(quality)},stage:a.salSaw.stage,phase:a.salSaw.phase,
      sinceSec:a.salSaw.sinceSec,time:s.stageTimeSec,callout:s.callout,
      warlordPhase:s.arena.warlordPhase,tellSec:a.arenaTellSec,chargeFlares,
      hudCallout:calloutText?.textContent,hudVisible:!!callout&&!callout.hidden,hudOccluded,
      hudRects:[textRect?.toJSON(),markerRect?.toJSON()],airHeight:a.airHeight,groundHeight:a.groundHeight,
      visible:!!rig,left:!!left,right:!!right,sparks:!!sparks?.visible,tellSparks:!!tellSparks?.visible,
      rotations:[left?.rotation.x,right?.rotation.x],armor:a.maxArmor,kit:a.combatArmorKit??null,
      presentationKit:a.armorKit,playerArmor:s.armor,
      contact:window.__salFightEvents.filter(e=>e.combatRamHit&&e.attackerIndex===0&&e.victim==='player').at(-1),memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
        window.name.startsWith('__duel_qa_tab_v2:'),events:window.__salFightEvents};
  })()`);
  if (!result.memoryOnly || !result.visible || !result.left || !result.right || result.stage !== stage)
    throw Error(`Sal ${quality}/${stage} presentation: ${JSON.stringify(result)}`);
  if (stage === 'window' && (!result.sparks || result.callout !== 'SHE MISSED. HIT HER NOW!'))
    throw Error('Miss must show its sparks and counterattack callout');
  if (stage === 'tell' && (!result.events.some(e=>e.salSaw?.position) || !result.tellSparks))
    throw Error('Production tell must emit the positional saw scream and show tell sparks');
  if (stage === 'charge-tell' && (result.warlordPhase !== 2 || !(result.tellSec > 0) ||
      result.chargeFlares !== 2 || !result.events.some(e=>e.arenaTell?.position)))
    throw Error('Phase-two Charge must show both flashing headlights and emit its positional roar');
  if (['tell','sweep'].includes(stage) && result.rotations.some(v=>!Number.isFinite(v)||Math.abs(v)<.2))
    throw Error('Production tell and sweep must spin the shipped blades');
  if (label === 'sweep-hit' && (result.callout !== 'SAW SWEEP!' ||
      !(result.contact?.armorRemoved>0) || result.contact.victim !== 'player'))
    throw Error('Actual damaging sweep must report its hit and callout');
  if ((stage === 'window' || label === 'sweep-hit') &&
      (!result.hudVisible || result.hudCallout !== result.callout || result.hudOccluded)) {
    await context.screenshot(`${quality}-${label}-hud-failure`);
    throw Error('Production move callout must be displayed clear of the nameplate in the labelled review camera: '+JSON.stringify(result));
  }
  await context.screenshot(`${quality}-${label}`);
  return result;
}

// All controls below exist in the built game. No /src imports or QA dispatcher.
async function startFight(context) {
  await context.evaluate(`(() => {const app=window.__qaApp;
    if(!app.startWarlordFight('sal')||!app.beginWarlordFight())throw Error('Production Sal entry failed');
    for(let i=0;i<362;i++)app.duel.step(1/120);
    if(app.duel.state.status!=='racing')throw Error('Production countdown failed');
  })()`);
  await ready(context, 'Sal fight assets');
}

async function alongsideFixture(context) {
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,a=s.opponents[0],site=s.arena.spawnSlots[0].s;
    // One matched pose in a clear spawn area. After this, real physics advances
    // both cars for every tell, sweep and counter tick.
    Object.assign(s,{s:site,prevS:site,lateral:-4,prevLateral:-4,headingError:0,speedMph:35});
    Object.assign(a,{s:site,prevS:site,lateral:4,prevLateral:4,headingError:0,speedMph:35});
    // Low throttle holds an Easy full-tell approach alongside instead of escaping it.
    d.setInput({throttle:.15,brake:0,steer:0,boost:false});
  })()`);
}

async function advanceTo(context, stage, minimumAge = .05, maximumSeconds = 5) {
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,a=s.opponents[0];
    for(let tick=0;tick<${Math.ceil(maximumSeconds * 120)};tick++){
      if(a.salSaw?.stage===${JSON.stringify(stage)}&&
          s.stageTimeSec-a.salSaw.sinceSec>=${minimumAge}-1e-9)return true;
      if(s.status!=='racing')throw Error('Sal review left the running fight');
      d.step(1/120);
    }
    throw Error('Production Sal stage did not arrive: '+JSON.stringify(a.salSaw));
  })()`);
}

async function runQuality(context, quality) {
  await context.navigate(`/tools/menu-check.html?flags=warlords&harness=sal-fight-${quality}`);
  await context.waitFor('!!window.__qaApp&&!!window.__render', `${quality} private menu`, 60000);
  await ready(context, `${quality} menu`);
  await context.evaluate(`(() => {
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
        !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only review required');
    const app=window.__qaApp;app.stop();app.setGraphicsQuality(${JSON.stringify(quality)});
    // Collapse only the private QA controls; production HUD remains visible.
    for(const panel of document.querySelectorAll('details'))
      if(panel.querySelector('summary')?.textContent.startsWith('MENU QA'))panel.open=false;
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,
      territories:{...app.profile.wasteland.territories,sal:{hold:100,claimed:false}}}};
    if(!app._saveProfile()||!app.visitWasteland())throw Error('Private discovery/hold fixture failed');
    window.__salFightEvents=[];
    app.duel.onChange((_state,event)=>{if(event.salSaw||event.arenaTell||event.warlordPhase||event.combatRamHit)
      window.__salFightEvents.push(event)});
  })()`);
  await ready(context, `${quality} yard approach assets`);
  // Production yard entry includes an approach transition before its hub.
  await context.evaluate('window.__qaApp.advance(8)');
  await context.waitFor('window.__qaApp.isYardHomeActive()', `${quality} yard hub`);
  await ready(context, `${quality} yard`);
  const rows=[];
  await startFight(context);
  await alongsideFixture(context);
  await advanceTo(context,'tell',.2);
  rows.push(await capture(context,quality,'tell'));
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state;
    // A brake-clear position fixture exercises the production counter. Timers
    // still advance solely through Duel.step; the move state is never assigned.
    d.setInput({throttle:0,brake:1,steer:0,boost:false});s.s-=10;
  })()`);
  await advanceTo(context,'window');
  rows.push(await capture(context,quality,'window'));

  // A production rematch supplies a fresh FSM and contact latch.
  await startFight(context);
  await alongsideFixture(context);
  await advanceTo(context,'sweep');
  rows.push(await capture(context,quality,'sweep'));
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,a=s.opponents[0],site=s.arena.spawnSlots[0].s;
    // Labelled swept side-contact fixture; the existing collision method does
    // the damage, contact credit, sparks and hit callout.
    Object.assign(s,{s:site,prevS:site,lateral:-1,prevLateral:-4,headingError:0,
      pushVelocity:10,speedMph:35});
    Object.assign(a,{s:site,prevS:site,lateral:1,prevLateral:4,headingError:0,
      pushVelocity:-10,speedMph:35});
    const before=s.armor;d._vehicleContact(s,a,'rival');
    if(!(s.armor<before)||a.salSaw.hit!==true)throw Error('Real side contact must complete sweep damage');
  })()`);
  rows.push(await capture(context,quality,'sweep','sweep-hit'));

  await startFight(context);
  await context.evaluate(`(() => {
    const d=window.__qaApp.duel,s=d.state,a=s.opponents[0],p=s.arena.participants[1],
      site=s.arena.spawnSlots[0].s;
    // One armor point makes this real contact a controlled first wreck.
    Object.assign(s,{s:site,prevS:site,lateral:-1,prevLateral:-4,headingError:0,
      speedMph:35,pushVelocity:10});
    Object.assign(a,{s:site,prevS:site,lateral:1,prevLateral:4,headingError:0,
      speedMph:35,pushVelocity:-10,armor:1});
    d._vehicleContact(s,a,'rival');d.step(1/120);
    if(s.arena.warlordPhase!==2||!a.combatWrecking)throw Error('Real contact failed phase two');
    d.setInput({throttle:0,brake:1,steer:0,boost:false});
    for(let tick=0;tick<600&&a.combatWrecking;tick++)d.step(1/120);
    if(a.combatWrecking)throw Error('Production timed respawn failed');
    // Set the approach pose just before natural respawn protection expires.
    for(let tick=0;tick<600&&p.protectedSec>1/120+1e-9;tick++)d.step(1/120);
    if(p.protectedSec>1/120+1e-9)throw Error('Production respawn protection did not expire');
    Object.assign(a,{s:s.s+35,lateral:s.lateral,headingError:Math.PI,speedMph:35});
  })()`);
  await advanceTo(context,'charge-tell');
  if(await context.evaluate('window.__qaApp.duel.state.opponents[0].boosting'))
    throw Error('Charge must not boost during its flash/roar tell');
  rows.push(await capture(context,quality,'charge-tell'));
  await advanceTo(context,'charge');
  if(!await context.evaluate('window.__qaApp.duel.state.opponents[0].boosting'))
    throw Error('Production pilot must boost after the full Charge tell');
  rows.push(await capture(context,quality,'charge'));
  console.log(`${quality} Sal move review: ${JSON.stringify(rows)}`);
}

export async function run(context) {
  for(const quality of ['high','performance'])await runQuality(context,quality);
  console.log('Sal review uses memory-only discovery/hold/position/camera fixtures and real Duel methods for all transitions. Audio event checks prove routing, not audibility or fun; those require Claude play-through.');
}
