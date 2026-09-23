// Inspect real scene objects and pooled debris in memory-only High and
// Performance races. The renderer reads the scripted state without changing it.
async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    `${quality} memory-only roadside menu`, 60_000);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`,
    `${quality} renderer ready`, 60_000);

  await context.evaluate(`(async () => {
    const app=window.__qaApp;
    if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel=app.duel,state=duel.state,render=window.__render;
    if(!duel.roadsideKnockAwayEnabled())throw Error('Flagged knock-away is off');
    Object.assign(state,{status:'racing',paused:false,opponents:[],traffic:[],invulnerableSec:0});
    app.onFrame?.(state);
    if(!document.querySelector('#menu-screen')?.hidden)
      throw Error('Roadside inspection still has the garage overlay');
    document.querySelectorAll('details').forEach(panel => {
      const title=panel.querySelector('summary')?.textContent||'';
      if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))
        panel.hidden=true;
    });
    const present=async () => {
      for(let attempt=0;attempt<400;attempt++){
        render.renderer.info.reset();
        const started=performance.now();
        const drawn=render.renderFrame();
        const renderMs=performance.now()-started;
        const warmupStatus=document.querySelector('#view3d').dataset.warmupStatus;
        if(['ready','fallback','off','unsupported-fallback'].includes(warmupStatus)&&
          drawn.drawCalls>0)return {renderMs,drawCalls:drawn.drawCalls,warmupStatus};
        await new Promise(resolve=>setTimeout(resolve,50));
      }
      throw Error('Roadside inspection never received a presented renderer frame');
    };
    window.__roadsideQA={app,duel,state,render,present,async frame(s,lateral){
      const point=duel.course.groundAt(s,lateral);
      app.inspectionCamera={position:[point.x+14,point.y+8,point.z+15],
        target:[point.x,point.y+1,point.z]};
      render.camera.position.fromArray(app.inspectionCamera.position);
      await present();
      return point;
    }};
    await present();
  })()`);

  const low=await context.evaluate(`(async () => {
    const {duel,state,render,frame}=window.__roadsideQA;
    const speed=duel.car.topSpeed*.3,armor=state.armor;
    Object.assign(state,{s:107,prevS:100,lateral:0,prevLateral:0,speedMph:speed});
    const actor={alive:true,s:110,prevS:110,lateral:.6,prevLateral:.6,
      speedMph:0,dir:1,headingError:0,pushVelocity:0};
    state.traffic=[actor];
    if(!duel._vehicleContact(state,actor,'traffic'))throw Error('Low traffic contact missed');
    for(let i=0;i<120;i++)duel._traffic(1/120);
    const point=await frame(actor.s,actor.lateral);
    const mesh=render.scene.children.find(item=>item.visible&&item.userData?.size&&
      Math.hypot(item.position.x-point.x,item.position.z-point.z)<1.5);
    if(!mesh)throw Error('Displaced traffic has no visible car mesh');
    window.__roadsideQA.trafficMesh=mesh;
    return {lateral:actor.lateral,visible:mesh.visible,
      speed:state.speedMph,entrySpeed:speed,armorDelta:armor-state.armor,
      crashes:state.stageCrashes};
  })()`);
  if(!(low.lateral>2.6&&low.visible&&low.speed<low.entrySpeed&&
       low.armorDelta===0&&low.crashes===0))
    throw Error(`${quality} low traffic knock-away failed: ${JSON.stringify(low)}`);
  await context.screenshot(`roadside-traffic-knock-${quality}`);

  const high=await context.evaluate(`(async () => {
    const {duel,state,render,frame,present,trafficMesh}=window.__roadsideQA;
    const speed=duel.car.topSpeed*.7,armor=state.armor;
    Object.assign(state,{s:127,prevS:120,lateral:0,prevLateral:0,
      speedMph:speed,stageTimeSec:10});
    const actor={alive:true,s:130,prevS:130,lateral:.6,prevLateral:.6,
      speedMph:0,dir:1,headingError:0,pushVelocity:0};
    state.traffic=[actor];
    await frame(actor.s,actor.lateral);
    const {renderMs:baselineRenderMs,drawCalls:baselineDrawCalls}=await present();
    if(!duel._vehicleContact(state,actor,'traffic'))throw Error('High traffic contact missed');
    const {renderMs:firstBurstRenderMs,drawCalls:burstDrawCalls}=await present();
    const pool=render.scene.children.find(item=>item.name==='Roadside debris pool');
    const burstNow=pool?.children.some(item=>item.visible);
    const carNow=trafficMesh.visible;
    for(let i=0;i<36;i++)duel._traffic(1/120);
    state.stageTimeSec+=.3;
    await frame(actor.s,actor.lateral);
    return {burstNow,carNow,carAfter:trafficMesh.visible,
      burstAfter:pool?.children.some(item=>item.visible),
      armorDelta:armor-state.armor,crashes:state.stageCrashes,
      baselineRenderMs,firstBurstRenderMs,baselineDrawCalls,burstDrawCalls};
  })()`);
  if(!high.burstNow||!high.carNow||high.carAfter||!high.burstAfter||
      high.armorDelta!==0||high.crashes!==0)
    throw Error(`${quality} high traffic burst/removal failed: ${JSON.stringify(high)}`);
  await context.screenshot(`roadside-traffic-debris-${quality}`);

  const sign=await context.evaluate(`(async () => {
    const {duel,state,render,frame}=window.__roadsideQA;
    state.traffic=[];
    const posts=duel.course.features.obstacles.filter(item=>item.signSupport&&
      item.id?.startsWith('road-sign-'));
    if(posts.length<2)throw Error('Need two real road signs');
    const findHit=(speed,avoidId)=>{
      for(const post of posts){
        const id=post.id.split('-post-')[0];
        if(id===avoidId||state.brokenScenery.some(item=>item.id===id))continue;
        const prior=state.brokenScenery.length;
        Object.assign(state,{prevS:post.s-3,s:post.s+3,
          prevLateral:post.off,lateral:post.off,speedMph:speed});
        duel._staticContacts(state,true);
        const hit=state.brokenScenery.slice(prior).find(item=>item.id===id);
        if(hit)return {id,hit,post};
      }
      throw Error('No swept road-sign contact found');
    };
    state.stageTimeSec=20;
    const low=findHit(duel.car.topSpeed*.3);
    state.stageTimeSec=low.hit.atTime+.7;
    await frame(low.post.s,low.post.off);
    let lowGroup;
    render.scene.traverse(item=>{if(item.userData?.roadSignId===low.id)lowGroup=item;});
    const lowShift=Math.hypot(lowGroup.position.x-low.post.x,
      lowGroup.position.z-low.post.z);
    state.stageTimeSec=30;
    const high=findHit(duel.car.topSpeed*.7,low.id);
    await frame(high.post.s,high.post.off);
    let highGroup;
    render.scene.traverse(item=>{if(item.userData?.roadSignId===high.id)highGroup=item;});
    const visibleNow=highGroup.visible;
    state.stageTimeSec+=.3;
    await frame(high.post.s,high.post.off);
    const hiddenAfter=!highGroup.visible;
    const pool=render.scene.children.find(item=>item.name==='Roadside debris pool');
    return {lowId:low.id,lowShift,highId:high.id,
      visibleNow,hiddenAfter,debrisVisible:pool?.children.some(item=>item.visible)};
  })()`);
  if(!(sign.lowShift>1&&sign.visibleNow&&sign.hiddenAfter&&sign.debrisVisible))
    throw Error(`${quality} road-sign mesh/debris failed: ${JSON.stringify(sign)}`);
  await context.screenshot(`roadside-sign-debris-${quality}`);
  console.log(`${quality}: traffic knocked ${low.lateral.toFixed(1)} m clear; `+
    `high traffic and ${sign.highId} removed after pooled debris; `+
    `${sign.lowId} shifted ${sign.lowShift.toFixed(1)} m; `+
    `nearby render ${high.baselineRenderMs.toFixed(2)} ms, `+
    `first debris render ${high.firstBurstRenderMs.toFixed(2)} ms.`);
}

export async function run(context) {
  for(const quality of ['high','performance'])await qualityPass(context,quality);
}
