// TOWN-HAUL-JOB: the town's first drive in the browser, from the mission card to the town's pile, and the save after it.
// The truck is put beside the pile and beside the drop (the drive itself is proved by tools/test-town-haul-job.mjs), so
// the pictures show the card, the stack growing on the bed, a piece knocked off and lying on the ground, the unload and
// the results line; then the town is opened again and must hold the salvage and have moved on to Chapter 4.
const entry='/tools/menu-check.html?flags=wasteland-town';

async function picture(context,name){
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.screenshot(name);
}
// Put the truck at a world point, stopped, facing along `heading` (radians, as the World Job's poses are).
const place=(x,z,heading=0)=>`(() => {const duel=window.__qaApp.duel,state=duel.state,pose=duel.course.nearest(${x},${z});
  state.s=state.prevS=pose.s;state.lateral=state.prevLateral=pose.lateral;state.speedMph=0;state.pushVelocity=0;state.yawVelocity=0;
  state.headingError=${heading}-duel.course.at(pose.s).heading;return true;})()`;
const job=`window.__qaApp.duel.state.arena?.worldJob`;

export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Haul QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'Hollis note',30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Haul QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town view',30_000);
  // Chapter 3 opens once the well is dug (Chapter 2).
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry');host.__town.story={facts:{pitsDug:true,wellBuilt:true},completed:{'town.act1.twelve':true,'town.act1.water':true}};host.__townCommand({type:'setSpeed',speed:1});})()`);
  await context.waitFor(`!!document.querySelector('.town-mission-card [data-town-mission-go]')`,'the mission card',15_000);
  const card=await context.evaluate(`document.querySelector('.town-mission-card').textContent`);
  if(!/WHAT WE CAN FIND/.test(card)||!/GO YOURSELF/.test(card)||!/NOT NOW/.test(card))throw new Error(`The mission card is not right: ${card}`);
  await picture(context,'haul-card');
  await context.evaluate(`document.querySelector('[data-town-mission-go]').click()`);
  await context.waitFor(`${job}?.definition?.kind==='town-job'&&window.__qaApp.duel.state.status==='racing'`,'the haul to start',60_000);
  await picture(context,'haul-truck-bay');
  const step=await context.evaluate(`JSON.stringify(${job}.definition.steps[0])`).then(JSON.parse);
  // At the pile: hold still for ten seconds while the gang loads.
  await context.evaluate(place(step.pile.position.x+6,step.pile.position.z,Math.PI/2));
  await context.evaluate(`window.__qaApp.advance(10)`);
  const loading=await context.evaluate(`({phase:${job}.job.stepState.phase,kg:${job}.job.stepState.loadKg,truck:${job}.vehicle.loadKg})`);
  if(loading.phase!=='loading'||!(loading.kg>0)||loading.truck!==loading.kg)throw new Error(`Loading did not start or the truck does not carry it: ${JSON.stringify(loading)}`);
  await picture(context,'haul-stack-on-bed');
  await context.evaluate(`window.__qaApp.advance(12)`);
  await picture(context,'haul-stack-taller');
  // Drive off (the truck is moved clear of the pile at 30 km/h), then a hard knock: the speed drops from 60 km/h to nothing in a
  // step, as a hit on a wreck does.
  await context.evaluate(place(step.pile.position.x+60,step.pile.position.z,Math.PI/2));
  await context.evaluate(`(() => {window.__qaApp.duel.state.speedMph=19;window.__qaApp.advance(.1);return true;})()`);
  await context.evaluate(`(() => {const w=${job};w.lastKmh=60;window.__qaApp.duel.state.speedMph=0;window.__qaApp.advance(1/60);return true;})()`);
  const knocked=await context.evaluate(`({phase:${job}.job.stepState.phase,shed:${job}.job.stepState.shedKg})`);
  if(knocked.phase!=='carry'||!(knocked.shed>0))throw new Error(`A hard knock threw nothing off: ${JSON.stringify(knocked)}`);
  await picture(context,'haul-piece-fallen');
  // At the drop: hold still while they take it off, then the results.
  await context.evaluate(place(step.drop.position.x,step.drop.position.z+4,Math.PI));
  await context.evaluate(`window.__qaApp.advance(40)`);
  await context.waitFor(`window.__qaApp.duel.state.status==='arena_result'`,'the haul results',60_000);
  await picture(context,'haul-results');
  const result=await context.evaluate(`(() => {const r=${job}.haulResult;return {...r,text:document.body.textContent};})()`);
  if(!(result.deliveredKg>0)||!result.text.includes(result.sentence))throw new Error(`The results do not say what was delivered: ${JSON.stringify(result.sentence)}`);
  // The town was saved after the haul: open it again and find the salvage on its pile and Chapter 4 next.
  await context.evaluate(`(() => {const app=window.__qaApp;if(!app.returnToYard())throw Error('Could not return to the yard.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard after the haul',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town after the haul',30_000);
  const town=await context.evaluate(`(() => {const t=document.querySelector('.town-entry').__town,piles=Object.values(t.goods?.stockpiles||{});
    return {salvage:piles.reduce((sum,pile)=>sum+(pile.goods?.salvage||0),0),done:t.story?.completed?.['town.act1.salvage']===true,settled:t.missions?.settled?.length??0,
      next:document.querySelector('.town-next')?.textContent??''};})()`);
  if(town.salvage!==result.deliveredKg||!town.done||town.settled!==1)throw new Error(`The saved town does not hold the haul: ${JSON.stringify(town)}`);
  await picture(context,'haul-town-after');
}
