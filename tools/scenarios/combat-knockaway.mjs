// Inspect real scene objects and pooled debris in memory-only High and
// Performance races. The renderer reads the scripted state without changing it.
import {readFile} from 'node:fs/promises';

// The preview serves built assets, so source-module URLs are unavailable.
// Carry the unchanged, dependency-free native geometry module into this
// disposable page rather than adding a runtime export just for inspection.
const collisionSource=await readFile(new URL('../../src/vehicle-collision.js',import.meta.url),'utf8');
const collisionModule=`data:text/javascript;base64,${Buffer.from(collisionSource).toString('base64')}`;

async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html');
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
    app.profile.wasteland.discoveredGate=true;
    app._saveProfile();
    if(!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const duel=app.duel,state=duel.state,render=window.__render;
    if(state.wastelandGateDiscovered!==true||!Number.isFinite(state.armor)||
      !Number.isFinite(state.maxArmor))
      throw Error('Discovered Wasteland race did not initialize armor');
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
    const qa=window.__roadsideQA;
    const {duel,state,render,frame,present,trafficMesh}=qa;
    const {boxContact}=await import(${JSON.stringify(collisionModule)});
    // A real frame first reaches the car's face. Deeply overlapping centres
    // can select a side normal in the rigid-body solver, even at high speed.
    qa.touchTraffic=actor=>{
      const playerSpec=duel._vehicleSpec(state),trafficSpec=duel._vehicleSpec(actor);
      const estimate=actor.s-playerSpec.halfLength-trafficSpec.halfLength;
      const heading=duel.course.at(actor.s).heading;
      const difference=duel.course.at(estimate).heading-heading;
      const playerExtent=playerSpec.halfLength*Math.abs(Math.cos(difference))+
        playerSpec.halfWidth*Math.abs(Math.sin(difference));
      state.s=actor.s-trafficSpec.halfLength-playerExtent+.05;
      state.prevS=state.s-1.1;
      actor.prevS=actor.s+(actor.dir<0?1.1:0);
      const body=item=>{
        const point=duel.course.worldAt(item.s,item.lateral),spec=duel._vehicleSpec(item);
        return {x:point.x,z:point.z,halfLength:spec.halfLength,halfWidth:spec.halfWidth,
          heading:duel.course.at(item.s).heading+(item.headingError||0)+
            (item.dir<0?Math.PI:0)};
      };
      const contact=boxContact(body(state),body(actor));
      const rearNormal=-(contact.normal.x*Math.sin(heading)+
        contact.normal.z*Math.cos(heading));
      const geometry={rearNormal,overlap:contact.overlap,
        playerS:state.s,playerPrevS:state.prevS,trafficS:actor.s,
        trafficPrevS:actor.prevS,playerExtent,trafficHalfLength:trafficSpec.halfLength};
      if(!(rearNormal>.95)||!(contact.overlap>=-.3&&contact.overlap<=.3))
        throw Error('Traffic fixture did not reach the intended face: '+JSON.stringify(geometry));
      return geometry;
    };
    qa.wreckPose=actor=>{
      const point=duel.course.groundAt(actor.s,actor.lateral);
      const smoke=render.scene.getObjectByName('combat-vfx-traffic-wreck-0-smoke');
      const pool=render.scene.children.find(item=>item.name==='Roadside debris pool');
      return {dead:actor.alive===false,physical:actor.wrecked?.physical===true,
        visible:trafficMesh.visible,attached:trafficMesh.parent===render.scene,
        poseError:Math.hypot(trafficMesh.position.x-point.x,trafficMesh.position.z-point.z),
        position:{x:trafficMesh.position.x,z:trafficMesh.position.z},
        smoke:smoke?.visible===true,smokeOpacity:smoke?.material.opacity??0,
        exploded:actor.wrecked?.exploded===true,
        debris:pool?.children.some(item=>item.visible)===true};
    };
    qa.advanceTraffic=steps=>{
      for(let i=0;i<steps;i++){state.stageTimeSec+=1/120;duel._traffic(1/120);}
    };
    qa.contactInputs=(actor,playerSpeed,trafficSpeed,trafficDirection)=>{
      const motion=item=>({speedMph:item.speedMph,dir:item.dir??1,
        knock:item.knock??null,pushVelocity:item.pushVelocity??0,
        headingError:item.headingError??0,slipAngle:item.slipAngle??0,
        yawVelocity:item.yawVelocity??0,airborne:item.airborne===true,
        airHeight:item.airHeight??0,prevAirHeight:item.prevAirHeight??0,
        verticalSpeed:item._verticalSpeed??0});
      const snapshot={player:motion(state),traffic:motion(actor)};
      const clean=item=>item.knock===null&&item.pushVelocity===0&&
        item.headingError===0&&item.slipAngle===0&&item.yawVelocity===0&&
        !item.airborne&&item.airHeight===0&&item.prevAirHeight===0&&item.verticalSpeed===0;
      if(snapshot.player.speedMph!==playerSpeed||snapshot.player.dir!==1||
          snapshot.traffic.speedMph!==trafficSpeed||snapshot.traffic.dir!==trafficDirection||
          !clean(snapshot.player)||!clean(snapshot.traffic))
        throw Error('Scripted contact inputs changed: '+JSON.stringify(snapshot));
      return snapshot;
    };
    const speed=duel.car.topSpeed*.7,armor=state.armor;
    // This is a new straight, grounded contact, not a continuation of the low hit.
    Object.assign(state,{s:127,prevS:120,lateral:0,prevLateral:0,
      speedMph:speed,stageTimeSec:10,knock:null,pushVelocity:0,headingError:0,
      slipAngle:0,yawVelocity:0,airborne:false,airHeight:0,prevAirHeight:0,_verticalSpeed:0});
    const actor={alive:true,s:130,prevS:130,lateral:.6,prevLateral:.6,
      speedMph:0,dir:1,headingError:0,pushVelocity:0,knock:null};
    state.traffic=[actor];
    const geometry=qa.touchTraffic(actor);
    const point=await frame(actor.s,actor.lateral);
    const sameMesh=render.scene.children.find(item=>item.visible&&item.userData?.size&&
      Math.hypot(item.position.x-point.x,item.position.z-point.z)<1.5)===trafficMesh;
    const {renderMs:baselineRenderMs,drawCalls:baselineDrawCalls}=await present();
    const impacts=[];
    duel.onChange((_,event)=>{if(event.roadsideImpact?.actor===actor)impacts.push(event.roadsideImpact);});
    const preContact=qa.contactInputs(actor,speed,0,1);
    if(!duel._vehicleContact(state,actor,'traffic'))throw Error('High traffic contact missed');
    const {renderMs:firstSmashRenderMs,drawCalls:smashDrawCalls}=await present();
    const first=qa.wreckPose(actor);
    qa.advanceTraffic(36);
    await frame(actor.s,actor.lateral);
    const later=qa.wreckPose(actor);
    qa.advanceTraffic(48);
    await frame(actor.s,actor.lateral);
    return {preContact,geometry,sameMesh,first,later,after:qa.wreckPose(actor),
      moved:Math.hypot(later.position.x-first.position.x,later.position.z-first.position.z),
      outcomes:impacts.map(event=>event.outcome),
      armorDelta:armor-state.armor,crashes:state.stageCrashes,
      baselineRenderMs,firstSmashRenderMs,baselineDrawCalls,smashDrawCalls};
  })()`);
  const physicalPose=pose=>pose.dead&&pose.physical&&pose.visible&&pose.attached&&
    Number.isFinite(pose.poseError)&&pose.poseError<=1e-6;
  if(!high.sameMesh||![high.first,high.later,high.after].every(physicalPose)||
      !(high.moved>0)||!high.later.smoke||!(high.later.smokeOpacity>0)||
      [high.first,high.later,high.after].some(pose=>pose.exploded||pose.debris)||
      high.outcomes.length!==1||high.outcomes[0]!=='smash'||
      high.armorDelta!==0||high.crashes!==0)
    throw Error(`${quality} high traffic physical wreck failed: ${JSON.stringify(high)}`);
  await context.screenshot(`roadside-traffic-physical-wreck-${quality}`);

  // The unchanged stationary .7-top-speed case is below the blast threshold.
  // This separate oncoming contact covers the native delayed explosion.
  const blast=await context.evaluate(`(async () => {
    const qa=window.__roadsideQA;
    const {duel,state,render,frame,present,trafficMesh}=qa;
    const armor=state.armor,crashes=state.stageCrashes,penalty=state.racePenaltySec;
    Object.assign(state,{s:100,prevS:80,lateral:0,prevLateral:0,speedMph:130,
      stageTimeSec:12,invulnerableSec:0,impactTimer:0,knock:null,pushVelocity:0,
      headingError:0,slipAngle:0,yawVelocity:0,airborne:false,airHeight:0,
      prevAirHeight:0,_verticalSpeed:0});
    const actor={alive:true,s:105,prevS:115,lateral:.6,prevLateral:.6,
      speedMph:60,dir:-1,headingError:0,pushVelocity:0,knock:null};
    state.traffic=[actor];
    const geometry=qa.touchTraffic(actor);
    const point=await frame(actor.s,actor.lateral);
    const sameMesh=render.scene.children.find(item=>item.visible&&item.userData?.size&&
      Math.hypot(item.position.x-point.x,item.position.z-point.z)<1.5)===trafficMesh;
    const events=[];
    duel.onChange((_,event)=>events.push(event));
    const preContact=qa.contactInputs(actor,130,60,-1);
    if(!duel._vehicleContact(state,actor,'head_on'))throw Error('Oncoming blast contact missed');
    await present();
    const first=qa.wreckPose(actor),firstCallout=state.callout;
    qa.advanceTraffic(36);
    await frame(actor.s,actor.lateral);
    const later=qa.wreckPose(actor);
    qa.advanceTraffic(48);
    const {renderMs:explosionRenderMs,drawCalls:explosionDrawCalls}=await present();
    const impacts=events.filter(event=>event.roadsideImpact).map(event=>event.roadsideImpact);
    return {preContact,geometry,sameMesh,first,later,after:qa.wreckPose(actor),firstCallout,
      finalCallout:state.callout,outcomes:impacts.map(event=>event.outcome),
      actorMatches:impacts.every(event=>event.actor===actor),
      oldWreckEvent:events.some(event=>event.trafficWrecked),
      armorDelta:armor-state.armor,crashDelta:state.stageCrashes-crashes,
      penaltyDelta:state.racePenaltySec-penalty,explosionRenderMs,explosionDrawCalls};
  })()`);
  if(!blast.sameMesh||![blast.first,blast.later,blast.after].every(physicalPose)||
      blast.first.exploded||blast.later.exploded||blast.first.debris||blast.later.debris||
      !blast.later.smoke||!(blast.later.smokeOpacity>0)||
      !blast.after.exploded||!blast.after.debris||!blast.after.smoke||
      blast.outcomes.length!==2||blast.outcomes[0]!=='smash'||blast.outcomes[1]!=='obliterate'||
      !blast.actorMatches||blast.oldWreckEvent||blast.firstCallout!=='TRAFFIC SMASHED'||
      blast.finalCallout!=='TRAFFIC EXPLODED'||blast.armorDelta!==0||blast.crashDelta!==0||
      blast.penaltyDelta!==0||blast.explosionDrawCalls<=0)
    throw Error(`${quality} delayed traffic explosion failed: ${JSON.stringify(blast)}`);
  await context.screenshot(`roadside-traffic-delayed-blast-${quality}`);

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
    `high traffic stayed solid; oncoming wreck exploded; ${sign.highId} removed after pooled debris; `+
    `${sign.lowId} shifted ${sign.lowShift.toFixed(1)} m; `+
    `nearby render ${high.baselineRenderMs.toFixed(2)} ms, `+
    `first smash render ${high.firstSmashRenderMs.toFixed(2)} ms, `+
    `delayed explosion render ${blast.explosionRenderMs.toFixed(2)} ms.`);
}

export async function run(context) {
  for(const quality of ['high','performance'])await qualityPass(context,quality);
}
