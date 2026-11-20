// WEAPON-WATER-CANNON: the car's water cannon in the browser, memory-only, for the Director. A named player's town finishes a
// Fire Station; the Armory then offers the water cannon in plain sentences; it is bought and fitted to slot 1. In a Mad Max
// Duel the stream is drawn from the nose to the rival, shoves it down the stream and takes no armor; a rival spraying fire at
// the player has its flame put out by the water. Pictures in High and Performance. The fire truck's stream on flames is
// tools/scenarios/town-fire-save.mjs (TOWN-FIRE-JOB); on a car it is proved without a browser by tools/test-water-cannon.mjs.
const DT = 1 / 120;
const entry = '/tools/menu-check.html?flags=arsenal,water-cannon,wasteland-town';

async function townWithFireStation(context, name) {
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);
    if(!app.addPlayer(${JSON.stringify(name)}).ok)throw Error('Named review player creation failed');
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,scrap:2000}};
    if(!app._saveProfile())throw Error('The career did not save');
    if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`, 'the yard', 30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`, 'Hollis note', 30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Water QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`, 'the town view', 30_000);
  // Before the Fire Station: the Armory must not offer the cannon yet.
  const before = await context.evaluate(`window.__qaApp._townGearOptions().townBuildings.includes('fire-station')`);
  if (before) throw new Error('A new town already counts as having a Fire Station.');
  // The Fire Station goes on the first plot the town itself accepts, nearest its middle: the town keeps some ground clear
  // (the outposts, Vane's pitches, its art plan), and a refused placement changes nothing.
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry'),town=host.__town;
    let placed=null,tried=0;
    for(let ring=0;ring<=40&&!placed?.ok;ring++)for(let dx=-ring;dx<=ring&&!placed?.ok;dx++)for(let dz=-ring;dz<=ring&&!placed?.ok;dz++){
      if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;
      tried++;placed=host.__townCommand({type:'placeBuilding',buildingId:'fire-station',x:dx,z:dz})[0];}
    if(!placed?.ok)throw Error('No free plot for a Fire Station in '+tried+' tries: '+placed?.message);
    for(const building of town.buildings)if(building.buildingId==='fire-station')building.state='finished';
    document.querySelector('[data-town-action="yard"]').click();})()`);
  await context.waitFor(`!document.querySelector('.town-entry')&&window.__qaApp._townGearOptions().townBuildings.includes('fire-station')`,
    'the saved town to tell the Armory about its Fire Station', 30_000);
}

async function buyAndFit(context, quality) {
  await context.evaluate(`(() => {const app=window.__qaApp;app.returnToMenu?.();
    const select=document.querySelector('#graphics-quality');select.value='${quality}';select.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#armory-open').click();})()`);
  await context.waitFor(`!!document.querySelector('[data-arsenal-purchase="water"]')`, 'the water cannon in the Armory', 15_000);
  const offer = await context.evaluate(`document.querySelector('[data-arsenal-purchase="water"]').closest('article').textContent`);
  if (!/WATER CANNON/.test(offer) || !/Your town's Fire Station can fit it\. It sprays the car ahead aside and puts out flames\. It never does damage\./.test(offer))
    throw new Error(`The Armory's offer does not read right: ${offer}`);
  await context.screenshot(`water-cannon-armory-offer-${quality}`);
  await context.evaluate(`(() => {const app=window.__qaApp;document.querySelector('[data-arsenal-purchase="water"]').click();
    const select=document.querySelector('[data-loadout-slot="0"]');select.value='water';select.dispatchEvent(new Event('change',{bubbles:true}));
    if(app.profile.wasteland.loadout[0]!=='water')throw Error('The water cannon did not go in slot 1');
    if(app.profile.wasteland.scrap!==1600)throw Error('The water cannon did not cost 400 scrap');})()`);
  await context.screenshot(`water-cannon-armory-fitted-${quality}`);
  await context.evaluate(`document.querySelector('[data-action="armory-close"]').click()`);
}

async function race(context) {
  await context.evaluate(`(() => {const app=window.__qaApp;
    if(app.duel.state.status!=='menu')app.returnToMenu();
    if(!app.startCampaign({mode:'wasteland',seed:202611,car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',opponentCount:1}))
      throw Error('The race did not start');
    app.stop();
    const duel=app.duel,state=duel.state;
    if(state.weaponLoadout?.[0]!=='water')throw Error('The race has no water cannon in slot 1: '+state.weaponLoadout);
    Object.assign(state,{status:'racing',countdown:0,paused:false,invulnerableSec:0,traffic:[]});
    state.combat.aiTimer=state.combat.pickupTimer=Infinity;
    window.__waterEvents=[];window.__waterDetach?.();
    window.__waterDetach=duel.onChange((_s,event)=>{if(event.arsenalCue||event.weaponFired||event.combatHit)window.__waterEvents.push(event);});
    window.__waterPlace=(actor,s,headingError=0)=>Object.assign(actor,{s,prevS:s,lateral:0,prevLateral:0,speedMph:0,headingError,
      yawVelocity:0,impactTimer:0,airHeight:0,prevAirHeight:0,airborne:false,contactCooldown:0});
    window.__waterPlace(state,500);window.__waterPlace(state.rival,509);
    window.__waterPaint=()=>{const a=duel.course.groundAt(state.s,state.lateral),b=duel.course.groundAt(state.rival.s,state.rival.lateral);
      const dx=b.x-a.x,dz=b.z-a.z,length=Math.max(1,Math.hypot(dx,dz)),sx=dz/length,sz=-dx/length;
      const center={x:(a.x+b.x)/2,y:(a.y+b.y)/2+1.2,z:(a.z+b.z)/2},distance=16;
      app.inspectionCamera={position:[center.x+sx*distance,center.y+distance*.45,center.z+sz*distance],target:[center.x,center.y,center.z]};
      window.__render.camera.position.fromArray(app.inspectionCamera.position);window.__render.camera.lookAt(...app.inspectionCamera.target);
      window.__render.camera.updateMatrixWorld(true);
      const before=JSON.stringify(state);app.onFrame?.(state,0);window.__render.renderFrame();
      if(JSON.stringify(state)!==before)throw Error('Drawing the water changed race state');
      document.querySelectorAll('details').forEach(panel=>{const title=panel.querySelector('summary')?.textContent||'';
        if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.hidden=true;});};
    duel.setInput({throttle:0,brake:0,steer:0,boost:false});window.__waterPaint();})()`);
  await context.waitFor(`(() => {window.__waterPaint();return window.__qaApp.visualReady&&document.querySelector('#view3d canvas')?.style.visibility==='visible';})()`,
    'the painted race', 60_000);
}

export async function run(context) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`, 'the QA game', 90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`, 'the renderer', 60_000);
  await townWithFireStation(context, 'Water QA');
  // The race pictures are taken at a fixed size; the yard and town are opened first at the page's own size, as town-fire-save does.
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
  let bought = false;
  for (const quality of ['high', 'performance']) {
    if (!bought) { await buyAndFit(context, quality); bought = true; }
    else await context.evaluate(`(() => {const select=document.querySelector('#graphics-quality');select.value='${quality}';
      select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await race(context);
    // The stream: drawn, on the rival, shoving it down the stream and never damaging it.
    const stream = await context.evaluate(`(() => {const duel=window.__qaApp.duel,state=duel.state,rival=state.rival,armor=rival.armor;
      const from=duel.course.groundAt(rival.s,rival.lateral);
      if(!duel.fireWeapon('water')||duel.fireWeapon('water'))throw Error('The water cannon did not fire once and then recharge');
      for(let i=0;i<60;i++)duel.step(${DT});
      window.__waterPaint();
      const drawn=window.__render.scene.getObjectByName('arsenal-water-0'),to=duel.course.groundAt(rival.s,rival.lateral);
      return {drawn:!!drawn?.visible,armor:rival.armor-armor,moved:Math.hypot(to.x-from.x,to.z-from.z),
        cue:window.__waterEvents.some(e=>e.arsenalCue==='weapon.water.spray'),hits:window.__waterEvents.filter(e=>e.combatHit).length};})()`);
    if (!stream.drawn || stream.armor !== 0 || stream.hits || !stream.cue || !(stream.moved > .3))
      throw new Error(`The stream is not right: ${JSON.stringify(stream)}`);
    await context.screenshot(`water-cannon-stream-${quality}`);
    // A rival turned to spray fire at the player: the water puts its flame out, with the flame's own end and the hiss.
    await race(context);
    const doused = await context.evaluate(`(() => {const duel=window.__qaApp.duel,state=duel.state;
      window.__waterPlace(state.rival,507,Math.PI);
      state.combat.flameBursts=[{id:++state.combat.serial,ownerId:'cpu:0',level:0,age:0,styledTargets:[]}];
      for(let i=0;i<12;i++)duel.step(${DT});
      window.__waterPaint();
      const lit=state.combat.flameBursts.length;
      if(!duel.fireWeapon('water'))throw Error('The water cannon did not fire at the flame');
      for(let i=0;i<12;i++)duel.step(${DT});
      window.__waterPaint();
      return {lit,left:state.combat.flameBursts.length,hiss:window.__waterEvents.some(e=>e.arsenalCue==='weapon.water.douse'),
        end:window.__waterEvents.some(e=>e.arsenalCue==='weapon.flame.end')};})()`);
    if (doused.lit !== 1 || doused.left !== 0 || !doused.hiss || !doused.end)
      throw new Error(`The water did not put the flame out: ${JSON.stringify(doused)}`);
    await context.screenshot(`water-cannon-flame-out-${quality}`);
  }
  await context.evaluate(`window.__waterDetach?.()`);
}
