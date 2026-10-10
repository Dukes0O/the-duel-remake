// A private, memory-only three-opponent Wasteland scene for front-spike rams.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function pass(context, quality) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`, `${quality} memory-only menu`, 60_000);
  await context.evaluate(`(() => {
    const selector = document.querySelector('#graphics-quality');
    selector.value = ${JSON.stringify(quality)};
    selector.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value === ${JSON.stringify(quality)} &&
    !document.querySelector('#start-engine')?.disabled`, `${quality} renderer ready`, 60_000);

  const setup = await context.evaluate(`(async () => {
    const app = window.__qaApp;
    // The disposable QA player may start with only the two free cars.
    app.profile.unlockedCars=[...new Set([...app.profile.unlockedCars,'titan_monster'])];
    app._saveProfile();
    const placeQuietField = state => {
      Object.assign(state,{status:'racing',countdown:0,s:500,prevS:500,
        lateral:0,prevLateral:0,speedMph:0,traffic:[],invulnerableSec:0});
      state.opponents.forEach((actor,index) => Object.assign(actor,{
        s:600+index*80,prevS:600+index*80,lateral:0,prevLateral:0,speedMph:0}));
      if(state.combat){state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;}
    };
    const ready = async () => {
      const deadline=performance.now()+30000;
      while(performance.now()<deadline){
        const warmup=document.querySelector('#view3d').dataset.warmupStatus;
        if(app.visualReady && ['ready','fallback','off','unsupported-fallback'].includes(warmup))return;
        await new Promise(resolve=>setTimeout(resolve,40));
      }
      throw Error('Race view did not warm up');
    };
    const sample = async () => {
      await ready();
      await new Promise(resolve=>setTimeout(resolve,500));
      const intervals=[];
      await new Promise(resolve=>{
        let previous=performance.now();
        const tick=now=>{
          intervals.push(now-previous);previous=now;
          if(intervals.length<120)requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      intervals.sort((a,b)=>a-b);
      const at=fraction=>+intervals[Math.ceil(intervals.length*fraction)-1].toFixed(2);
      return {frames:intervals.length,p50:at(.5),p95:at(.95),max:at(1),
        over33ms:intervals.filter(ms=>ms>33).length};
    };
    if (!app.startCampaign({mode:'duel',startStage:0,car:'titan_monster',
      opponentCount:3,seed:1989})) throw Error('Ordinary comparison race did not start');
    placeQuietField(app.duel.state);
    const ordinary=await sample();
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
    app._saveProfile();
    if (!app.startCampaign({mode:'wasteland',startStage:0,car:'titan_monster',
      opponentCount:3,seed:1989})) throw Error('Three-opponent combat race did not start');
    const duel = app.duel, state = duel.state;
    if(state.wastelandGateDiscovered!==true)
      throw Error('combat-ramming fixture launched without gate discovery');
    if (state.opponents.length !== 3 || state.car !== 'titan_monster' ||
        !Number.isFinite(state.armor))
      throw Error('Armored field is missing');
    placeQuietField(state);
    const steady=await sample();
    app.stop();
    window.__combatRamEvents = [];
    duel.onChange((_,event) => {
      if (event.combatRamHit || event.combatWreck) window.__combatRamEvents.push(event);
    });
    document.querySelectorAll('details').forEach(panel => {
      const title=panel.querySelector('summary')?.textContent || '';
      if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
        panel.hidden=true;
    });
    return {ordinary,steady,
      memoryOnlySaves:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
      opponents:state.opponents.length};
  })()`);
  if (!setup.memoryOnlySaves || setup.opponents !== 3 ||
      setup.ordinary.frames !== 120 || setup.steady.frames !== 120)
    throw Error(`${quality} invalid combat setup: ${JSON.stringify(setup)}`);

  const shove = await context.evaluate(`(() => {
    const app=window.__qaApp,duel=app.duel,state=duel.state,target=state.opponents[1];
    const place = (actor, s, lateral) => Object.assign(actor, {
      s, prevS: s, lateral, prevLateral: lateral,
      knock: null, pushVelocity: 0, headingError: 0, slipAngle: 0,
      airborne: false, airHeight: 0, prevAirHeight: 0, impactTimer: 0,
      contactCooldown: 0, damageCooldown: 0,
    });
    const lateralSpeed = () => {
      const heading = duel.course.at(target.s).heading;
      const knock = target.knock;
      return knock ? knock.vx * Math.cos(heading) - knock.vz * Math.sin(heading) : 0;
    };
    state.opponents[0].s=state.opponents[0].prevS=540;
    state.opponents[2].s=state.opponents[2].prevS=560;
    target.car='viper_proto';
    place(state,502,3.5);state.prevS=498;state.speedMph=130;
    place(target,504,4.2);target.speedMph=20;
    state.input.steer=1;
    if (!duel._vehicleContact(state,target,'rival')) throw Error('Front ram missed');
    const hit=window.__combatRamEvents.find(event=>event.combatRamHit &&
      event.attackerIndex===-1 && event.victimIndex===1);
    const launch = target.knock?.vy;
    if (!hit?.spiked || !(hit.armorRemoved > 0) || !(lateralSpeed() > 0) ||
        !(launch > 0)) throw Error('Spiked shove failed: ' + JSON.stringify({
          spiked: hit?.spiked ?? null, armorRemoved: hit?.armorRemoved ?? null,
          lateralSpeed: lateralSpeed(), launch: launch ?? null,
        }));
    // Let the accepted impulse play out through the same 60 Hz CPU motion
    // used by the race, rather than posing the struck car beside the road.
    for (let tick=0;tick<24;tick++) duel._rival(1/60,target);
    const point=duel.course.groundAt(target.s,target.lateral);
    app.inspectionCamera={position:[point.x+16,point.y+7,point.z+14],
      target:[point.x,point.y+2,point.z]};
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.renderFrame();
    const playerBumper=window.__render.scene.getObjectByName('combat-bumper-0');
    if (!playerBumper || playerBumper.children.filter(child=>child.visible).length<6)
      throw Error('Equipped player spikes are not visible');
    state.combatBumperSpikes=false;
    window.__render.renderFrame();
    if (playerBumper.children.filter(child=>child.visible).length!==1)
      throw Error('Disabled spikes remain visible');
    state.combatBumperSpikes=true;
    window.__render.renderFrame();
    const surface = duel._surface(target.s, target.lateral);
    return {targetS: target.s, targetLateral: target.lateral,
      offRoad: !surface.mainRoad, cachedOffRoad: target.offRoad,
      roadHalfWidth: surface.roadHalfWidth,
      surface: {road: surface.road, mainRoad: surface.mainRoad, shortcutId: surface.shortcutId},
      tumbling: !!target.tumble, combatWrecking: !!target.combatWrecking,
      height:target.airHeight,push:lateralSpeed(),launch,
      targetArmor:target.armor,playerArmor:state.armor,
      crashSlots:state.stageCrashes,hit};
  })()`);
  // This early airborne frame can still be over the widened passing lane.
  // The separate shoulder contact below checks that a real ram leaves it.
  if (!(shove.targetLateral>4.2) || !(shove.push>0) ||
      !(shove.height>0) || shove.crashSlots!==0)
    throw Error(`${quality} shove did not leave a playable race: ${JSON.stringify(shove)}`);
  await context.screenshot(`combat-ram-shove-${quality}`);

  const wreck = await context.evaluate(`(() => {
    const app=window.__qaApp,duel=app.duel,state=duel.state,target=state.opponents[1];
    state.s=state.prevS=500;target.s=target.prevS=560;
    if (duel._vehicleContact(state,target,'rival'))
      throw Error('Separated pair did not clear its incident');
    Object.assign(state, {
      s: 502, prevS: 498, lateral: 3.5, prevLateral: 3.5,
      speedMph: 130, knock: null, airborne: false, airHeight: 0, prevAirHeight: 0,
    });
    Object.assign(target, {
      s: 504, prevS: 504, lateral: 4.2, prevLateral: 4.2,
      speedMph: 20, knock: null, pushVelocity: 0, airborne: false, airHeight: 0,
      prevAirHeight: 0, armor: 5,
    });
    if (!duel._vehicleContact(state,target,'rival') || !target.combatWrecking)
      throw Error('Later CPU did not enter local armor wreck');
    const hit=window.__combatRamEvents.filter(event=>event.combatRamHit &&
      event.attackerIndex===-1 && event.victimIndex===1).at(-1);
    if (hit?.armorRemoved!==5) throw Error('Overkill did not report actual armor removed');
    const point=duel.course.groundAt(target.s,target.lateral);
    app.inspectionCamera={position:[point.x+16,point.y+7,point.z+14],
      target:[point.x,point.y+2,point.z]};
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    state.paused=true;
    const frame=window.__render.renderFrame();
    return {armor:target.armor,hit,wrecks:window.__combatRamEvents.filter(
      event=>event.combatWreck && event.opponentIndex===1).length,
      drawCalls:frame.drawCalls,crashSlots:state.stageCrashes};
  })()`);
  if (wreck.armor!==0 || wreck.wrecks!==1 || wreck.crashSlots!==0 ||
      !(wreck.drawCalls>0)) throw Error(`${quality} invalid later-CPU wreck: ${JSON.stringify(wreck)}`);
  await context.screenshot(`combat-ram-wreck-${quality}`);

  const recovery=await context.evaluate(`(() => {
    const app=window.__qaApp,duel=app.duel,state=duel.state,target=state.opponents[1];
    state.paused=false;
    for (let tick=0;tick<216;tick++) duel.step(1/60);
    if (target.combatWrecking || Math.abs(target.armor-target.maxArmor*.6)>1e-6)
      throw Error('Later CPU did not recover with 60% armor');
    app.onFrame?.(state);
    window.__render.renderFrame();
    return {armor:target.armor,maxArmor:target.maxArmor,status:state.status,
      crashSlots:state.stageCrashes};
  })()`);
  if (recovery.status!=='racing' || recovery.crashSlots!==0)
    throw Error(`${quality} recovery lost the race: ${JSON.stringify(recovery)}`);
  await context.screenshot(`combat-ram-recovered-${quality}`);

  const shoulder=await context.evaluate(`(() => {
    const app=window.__qaApp,duel=app.duel,state=duel.state,target=state.opponents[2];
    target.car='viper_proto';
    const targetS=504,playerS=502;
    const halfWidth=duel._vehicleSpec(target).halfWidth;
    const roadHalfWidth=duel.course.roadHalfWidthAt(targetS);
    // Begin with the whole target on the road, one tenth of a metre inside
    // the shoulder. Only the native collision and CPU steps move it out.
    const targetLateral=roadHalfWidth-halfWidth-.1;
    const place=(actor,s,lateral,speedMph)=>Object.assign(actor,{
      s,prevS:s,lateral,prevLateral:lateral,speedMph,
      groundHeight:duel.course.groundAt(s,lateral).y,
      prevGroundHeight:duel.course.groundAt(s,lateral).y,
      knock:null,pushVelocity:0,headingError:0,slipAngle:0,yawVelocity:0,
      airborne:false,airHeight:0,prevAirHeight:0,_verticalSpeed:0,
      impactTimer:0,contactCooldown:0,damageCooldown:0,
    });
    place(state,500,0,0);
    place(target,560,0,0);
    if(duel._vehicleContact(state,target,'rival'))
      throw Error('Separated shoulder pair did not clear its incident');
    place(state,playerS,targetLateral-.7,130);
    place(target,targetS,targetLateral,20);
    state.prevS=498;
    state.invulnerableSec=0;
    state.input.steer=1;
    const startSurface=duel._surface(target.s,target.lateral);
    if(!startSurface.mainRoad||target.lateral+halfWidth>startSurface.roadHalfWidth||
        !duel._surface(state.s,state.lateral).mainRoad||target.combatWrecking)
      throw Error('Shoulder contact did not begin with two playable cars on the road');
    const beforeArmor=target.armor,eventStart=window.__combatRamEvents.length;
    if(!duel._vehicleContact(state,target,'rival')){
      const pose=actor=>({s:actor.s,prevS:actor.prevS,lateral:actor.lateral,
        prevLateral:actor.prevLateral,groundHeight:actor.groundHeight,
        nativeGroundHeight:duel.course.groundAt(actor.s,actor.lateral).y,
        airborne:actor.airborne,airHeight:actor.airHeight,tumble:!!actor.tumble,
        combatWrecking:!!actor.combatWrecking,crushed:!!actor.crushed,
        wrecked:!!actor.wrecked,roadsideMotion:!!actor.roadsideMotion,
        contactExempt:!!actor.contactExempt,spec:duel._vehicleSpec(actor)});
      throw Error('Shoulder ram missed: '+JSON.stringify({player:pose(state),target:pose(target)}));
    }
    const hits=window.__combatRamEvents.slice(eventStart).filter(event=>
      event.combatRamHit&&event.attackerIndex===-1&&event.victimIndex===2);
    const launch=target.knock?.vy;
    if(hits.length!==1||!hits[0].spiked||!(hits[0].armorRemoved>0)||
        hits[0].armorRemoved!==beforeArmor-target.armor||!(launch>0))
      throw Error('Shoulder ram lost its indexed native damage or launch');
    for(let tick=0;tick<24;tick++)duel._rival(1/60,target);
    const surface=duel._surface(target.s,target.lateral);
    const heading=duel.course.at(target.s).heading;
    const push=target.knock?target.knock.vx*Math.cos(heading)-
      target.knock.vz*Math.sin(heading):0;
    const point=duel.course.groundAt(target.s,target.lateral);
    app.inspectionCamera={position:[point.x+16,point.y+7,point.z+14],
      target:[point.x,point.y+2,point.z]};
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const frame=window.__render.renderFrame();
    return {start:{s:targetS,lateral:targetLateral,halfWidth,roadHalfWidth},
      targetS:target.s,targetLateral:target.lateral,roadHalfWidth:surface.roadHalfWidth,
      offRoad:!surface.mainRoad,height:target.airHeight,airborne:target.airborne,
      push,launch,hit:hits[0],identity:state.opponents[2]===target,
      crashSlots:state.stageCrashes,status:state.status,drawCalls:frame.drawCalls};
  })()`);
  if(!shoulder.offRoad||!(shoulder.targetLateral>shoulder.start.lateral)||
      !(shoulder.height>0)||!shoulder.airborne||!(shoulder.push>0)||
      !shoulder.identity||shoulder.crashSlots!==0||shoulder.status!=='racing'||
      !(shoulder.drawCalls>0))
    throw Error(`${quality} shoulder ram did not leave the road airborne: ${JSON.stringify(shoulder)}`);
  await context.screenshot(`combat-ram-shoulder-${quality}`);
  console.log(`${quality} three-car ram: ${JSON.stringify({setup,shove,wreck,recovery,shoulder})}`);
  return {quality,setup,shove,wreck,recovery,shoulder};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const reports=[];
  for (const quality of ['high','performance']) reports.push(await pass(context,quality));
  await writeFile(join(context.outputDir,'combat-ramming.json'),
    JSON.stringify({reports},null,2)+'\n');
}
