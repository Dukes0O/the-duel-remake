// Private, memory-only review of CRASH-02 in both render quality modes.
async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=crash-physics,crash-effects,wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  `${quality} memory-only crash menu`, 60_000);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`,
  `${quality} renderer ready`, 60_000);

  const setup=await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,
      car:'falcone_f42',seed:1989}))throw Error('Wasteland race did not start');
    app.stop();
    const duel=app.duel,state=duel.state,rival=state.rival,render=window.__render;
    Object.assign(state,{status:'racing',paused:false,s:100,prevS:80,
      lateral:0,prevLateral:0,speedMph:125,invulnerableSec:0,traffic:[]});
    Object.assign(rival,{s:102.5,prevS:102.5,lateral:.6,prevLateral:.6,
      speedMph:25,headingError:0,pushVelocity:0,contactCooldown:0});
    state.input.steer=1;
    state.combat.aiTimer=Infinity;
    state.combat.pickupTimer=Infinity;
    let smash=null;
    const stop=duel.onChange((_state,event)=>{if(event.vehicleSmash)smash=event.vehicleSmash;});
    if(!duel._vehicleContact(state,rival,'rival'))throw Error('Rear ram missed the rival');
    stop();
    if(!smash||smash.actor!==rival||smash.severity!=='launched')
      throw Error('Real collision did not emit the launched crash event');
    if(!rival.knock||!(rival.knock.vy>0)||!(rival.damageZones?.rear>0))
      throw Error('Collision has no live knock, launch or rear crumple state');
    for(let frame=0;frame<24;frame++)duel._rival(1/120);
    // Move the stopped QA cars clear so the exact contact sheet is visible.
    state.s=state.prevS=50;
    rival.s=rival.prevS=140;
    const focus=duel.course.groundAt(rival.s,rival.lateral);
    app.inspectionCamera={position:[smash.point.x+7,focus.y+3.5,smash.point.z+7],
      target:[smash.point.x,focus.y+1.2,smash.point.z]};
    app.onFrame?.(state);
    render.camera.position.fromArray(app.inspectionCamera.position);
    document.querySelectorAll('details').forEach(panel=>{
      const title=panel.querySelector('summary')?.textContent||'';
      if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))
        panel.hidden=true;
    });
    render.renderFrame();
    const sparks=render.scene.getObjectByName('crash-vfx-impact-0-sparks');
    const crumple=render.scene.getObjectByName('crash-vfx-impact-0-crumple');
    const smoke=[0,1].map(index=>render.scene.getObjectByName(
      'crash-vfx-knock-'+index+'-smoke'));
    const contactDistance=sparks?.position
      ?Math.hypot(sparks.position.x-smash.point.x,sparks.position.z-smash.point.z)
      :Infinity;
    if(!sparks?.visible||!crumple?.visible||smoke.some(mesh=>!mesh?.visible)||
      contactDistance>.01)throw Error('Crash sheets are missing or misplaced');
    const samples=[];
    for(let frame=0;frame<60;frame++){
      const started=performance.now();render.renderFrame();
      samples.push(performance.now()-started);
    }
    samples.sort((a,b)=>a-b);
    const percentile=fraction=>samples[Math.min(samples.length-1,
      Math.floor(samples.length*fraction))];
    window.__crashQA={app,duel,state,rival,smash};
    return {quality:${JSON.stringify(quality)},memoryOnly:true,
      severity:smash.severity,dvMph:smash.dvMph,
      contactDistance,rearDamage:rival.damageZones.rear,knockSmoke:smoke.length,
      sparkPosition:sparks.position.toArray(),
      smokePositions:smoke.map(mesh=>mesh.position.toArray()),
      actorPosition:[focus.x,focus.y,focus.z],
      crashRoll:rival.wrecked?.roll||0,drawCalls:render.renderer.info.render.calls,
      textures:render.renderer.info.memory.textures,programs:render.renderer.info.programs?.length||0,
      frameMsP50:percentile(.5),frameMsP95:percentile(.95),
      warmupStatus:document.querySelector('#view3d')?.dataset.warmupStatus,
      effectsStatus:document.querySelector('#view3d')?.dataset.combatEffectsStatus};
  })()`);
  if(!setup.memoryOnly||setup.effectsStatus!=='ready'||setup.knockSmoke!==2||
      !(setup.dvMph>45)||!(setup.rearDamage>0)||setup.contactDistance>.01)
    throw Error(`${quality} crash presentation failed: ${JSON.stringify(setup)}`);
  await context.screenshot(`crash-impact-${quality}`);
  await context.evaluate(`(() => {
    const {app,duel,rival}=window.__crashQA;
    const focus=duel.course.groundAt(rival.s,rival.lateral);
    app.inspectionCamera={position:[focus.x+7,focus.y+3.5,focus.z+7],
      target:[focus.x,focus.y+1,focus.z]};
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.renderFrame();
  })()`);
  await context.screenshot(`crash-knock-smoke-${quality}`);
  console.log(`${quality} crash presentation: ${JSON.stringify(setup)}`);
}

async function flagOffPass(context) {
  await context.navigate('/tools/menu-check.html?flags=crash-physics,wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only crash flag-off menu',60_000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,
      car:'falcone_f42',seed:1989}))throw Error('Flag-off Wasteland race did not start');
    app.stop();app.duel.state.status='racing';
    app.onFrame?.(app.duel.state);window.__render.renderFrame();
    const names=[];window.__render.scene.traverse(object=>{
      if(object.name.startsWith('crash-vfx-'))names.push(object.name);
    });
    return {names,memoryOnly:!!Object.getOwnPropertyDescriptor(window,
      'localStorage')?.value};
  })()`);
  if(!result.memoryOnly||result.names.length)
    throw Error(`Flag-off crash pool exists: ${JSON.stringify(result)}`);
  console.log('flag off: no crash presentation meshes');
}

export async function run(context) {
  for(const quality of ['high','performance'])await qualityPass(context,quality);
  await flagOffPass(context);
  if(context.issues.length||context.warnings.length)
    throw Error('Crash presentation browser issues: '+JSON.stringify({
      issues:context.issues,warnings:context.warnings}));
}
