// TOWN-FIRE-JOB: Chapter 7's fire in the browser, from the mission card to the town's save. The town is given a soup kitchen, a
// well and a chicken run beside the kitchen, and the first winter behind it. The truck is put in front of the fire and beside the
// well (the drive itself is proved by tools/test-town-fire-job.mjs), and H is pressed as a player presses it, so the pictures
// show the card, the flames on the real building, the water's arc, the blue ring at the well filling the tank, the steam as the
// fire goes out and the results; then the town is opened again and must have the kitchen standing and Chapter 8 next.
const entry='/tools/menu-check.html?flags=wasteland-town';

async function picture(context,name){
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.screenshot(name);
}
// Put the truck at a world point, stopped, facing along `heading` (radians, as the World Job's poses are).
const place=(x,z,heading=0)=>`(() => {const duel=window.__qaApp.duel,state=duel.state,pose=duel.course.nearest(${x},${z});
  state.s=state.prevS=pose.s;state.lateral=state.prevLateral=pose.lateral;state.speedMph=0;state.pushVelocity=0;state.yawVelocity=0;
  state.headingError=${heading}-duel.course.at(pose.s).heading;return true;})()`;
const key=(type,code)=>`window.dispatchEvent(new KeyboardEvent('${type}',{code:'${code}',key:'${code==='KeyH'?'h':code}',bubbles:true}))`;
const job=`window.__qaApp.duel.state.arena?.worldJob`;
const fires=`JSON.stringify(${job}.job.stepState.fires)`;

export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Fire QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'Hollis note',30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Fire QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town view',30_000);
  // Chapter 7 opens after the first winter, with a soup kitchen to burn. The wind blows east, from the kitchen toward nothing,
  // so the call can be put out by the scenario's few presses; the spread is proved by the test.
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry'),town=host.__town;
    for(const [buildingId,x,z] of [['soup-kitchen',1,-6],['hand-well',-4,-6],['chicken-run',-1,-6]]){
      const placed=host.__townCommand({type:'placeBuilding',buildingId,x,z})[0];if(!placed?.ok)throw Error(buildingId+': '+placed?.message);}
    for(const building of town.buildings)building.state='finished';
    town.weather={...(town.weather||{}),windDirection:0,windSpeedKph:9,windFactor:.5};
    town.story={facts:{pitsDug:true,wellBuilt:true,salvageDelivered:true,soupBuilt:true,latrineBuilt:true,winterPassed:true},
      completed:{'town.act1.twelve':true,'town.act1.water':true,'town.act1.salvage':true,'town.act1.soup':true,'town.act1.smell':true,'town.act1.winter':true}};
    host.__townCommand({type:'setSpeed',speed:1});})()`);
  await context.waitFor(`!!document.querySelector('.town-mission-card [data-town-mission-go]')`,'the fire card',15_000);
  const card=await context.evaluate(`document.querySelector('.town-mission-card').textContent`);
  if(!/FIRST FIRE/.test(card)||!/The soup kitchen is on fire!/.test(card)||!/hold H to spray/.test(card)||!/NOT NOW/.test(card))
    throw new Error(`The fire card is not right: ${card}`);
  await picture(context,'fire-card');
  await context.evaluate(`document.querySelector('[data-town-mission-go]').click()`);
  await context.waitFor(`${job}?.definition?.townJob==='fire'&&window.__qaApp.duel.state.status==='racing'`,'the fire call to start',60_000);
  const truck=await context.evaluate(`({vehicle:${job}.vehicle?.id,context:window.__qaApp.activeInputContext()})`);
  if(truck.vehicle!=='fire-truck'||truck.context!=='firetruck')throw new Error(`The fire truck is not driven with its own keys: ${JSON.stringify(truck)}`);
  await picture(context,'fire-truck-bay');
  const step=await context.evaluate(`JSON.stringify(${job}.definition.steps[0])`).then(JSON.parse);
  const kitchen=step.buildings.find(row=>row.id===step.mainId),well=step.water.find(row=>row.kind==='well');
  // In front of the kitchen, 12 m short of its south side, nose to it; a few seconds for the flames to draw.
  await context.evaluate(place(kitchen.x,kitchen.z-kitchen.halfZ-12,0));
  await context.evaluate(`window.__qaApp.advance(3)`);
  await picture(context,'fire-flames');
  // Hold H: the water arcs onto the flames and the tank goes down.
  await context.evaluate(key('keydown','KeyH'));
  await context.evaluate(`window.__qaApp.advance(20)`);
  const spraying=await context.evaluate(`({spraying:${job}.job.stepState.spraying,target:${job}.job.stepState.targetId,tank:${job}.job.stepState.tankL,truck:${job}.vehicle.tankL})`);
  if(!spraying.spraying||spraying.target!==kitchen.id||!(spraying.tank<2700)||Math.abs(spraying.truck-spraying.tank)>10)
    throw new Error(`Holding H did not spray the kitchen from the tank: ${JSON.stringify(spraying)}`);
  await picture(context,'fire-spraying');
  await context.evaluate(key('keyup','KeyH'));
  // To the well's blue ring: hold still and the tank fills.
  await context.evaluate(place(well.position.x,well.position.z,Math.PI));
  const before=await context.evaluate(`${job}.job.stepState.tankL`);
  await context.evaluate(`window.__qaApp.advance(15)`);
  const filled=await context.evaluate(`({tank:${job}.job.stepState.tankL,filling:${job}.job.stepState.filling,rings:(window.__qaApp.duel.state.arena.markers||[]).filter(m=>String(m.id).startsWith('douse-')).length})`);
  if(!(filled.tank>before)||filled.rings<2)throw new Error(`The well did not fill the tank, or the rings are missing: ${JSON.stringify({before,...filled})}`);
  await picture(context,'fire-filling-at-well');
  // Back to the fire and spray until everything is out.
  await context.evaluate(place(kitchen.x,kitchen.z-kitchen.halfZ-12,0));
  await context.evaluate(key('keydown','KeyH'));
  for(let i=0;i<40;i++){
    const burning=await context.evaluate(`Object.values(${job}?.job?.stepState?.fires||{}).some(fire=>fire.state==='burning')`);
    if(!burning)break;
    await context.evaluate(`window.__qaApp.advance(5)`);
  }
  await context.evaluate(key('keyup','KeyH'));
  await picture(context,'fire-out-steam');
  await context.evaluate(`window.__qaApp.advance(30)`);
  await context.waitFor(`window.__qaApp.duel.state.status==='arena_result'`,'the fire call results',60_000);
  await picture(context,'fire-results');
  const result=await context.evaluate(`(() => {const r=${job}.fireResult;return {...r,text:document.body.textContent};})()`);
  if(!result.mainSaved||!result.text.includes(result.sentence)||!/You saved the soup kitchen from the fire\./.test(result.text))
    throw new Error(`The results do not say what was saved: ${JSON.stringify(result.sentence)} ${await context.evaluate(fires)}`);
  // The town was saved after the call: open it again and find the kitchen standing and Chapter 8 next.
  await context.evaluate(`(() => {const app=window.__qaApp;if(!app.returnToYard())throw Error('Could not return to the yard.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard after the fire',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town after the fire',30_000);
  const town=await context.evaluate(`(() => {const t=document.querySelector('.town-entry').__town,kitchen=t.buildings.find(row=>row.buildingId==='soup-kitchen');
    return {kitchen:kitchen?.state,fire:kitchen?.fireStage??null,done:t.story?.completed?.['town.act1.fire']===true,ash:t.story?.facts?.everburnFromAsh===true,
      settled:t.missions?.settled?.length??0,next:document.querySelector('.town-next')?.textContent??''};})()`);
  if(town.kitchen!=='finished'||town.fire!==null||!town.done||!town.ash||town.settled!==1)throw new Error(`The saved town does not hold the fire call: ${JSON.stringify(town)}`);
  await picture(context,'fire-town-after');
}
