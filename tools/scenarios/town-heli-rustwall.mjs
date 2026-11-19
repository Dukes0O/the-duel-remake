// HELI-RUSTWALL: Kestrel One over the wall, in the browser. Memory-only saves (the QA page). Opens the town, finishes a
// Helipad by hand (no card yet moves a building to finished; docs/board/questions/HELI-RUSTWALL.md item 4), starts the Ridge
// fire, presses FLY, and takes pictures from the helicopter: on the pad, over the land, at the dip tank and over the Ridge.
// It flies with the autopilot only where the rules give it a goal (the bucket to the water and to the fire), so the
// pictures show what a player meets. Claude judges the pictures and the flying by hand.
const entry = '/tools/menu-check.html?flags=wasteland-town,helicopter,forestFire';

async function picture(context, name) {
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.screenshot(name);
}
const advance = (context, seconds) => context.evaluate(`window.__qaApp.advance(${seconds})`);

export async function run(context) {
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`, 'the QA game', 90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`, 'the yard renderer', 60_000);
  // A trained pilot with fuel and credits, who has found the gate.
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Rustwall QA');
    app.profile={...app.profile,credits:6000,wasteland:{...app.profile.wasteland,discoveredGate:true},
      heli:{...(app.profile.heli||{version:1}),version:1,fuelKg:400,refuels:2,lessons:{liftoff:true,hover:true,landing:true,carry:true}}};
    app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`, 'the yard', 30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`, 'Hollis note', 30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Rustwall QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`, 'the town view', 30_000);
  // Year 6 and a finished Helipad east of the Dome: the fire comes on the next day, and FLY appears.
  const placed = await context.evaluate(`(() => {const h=document.querySelector('.town-entry'),t=h.__town;
    const answer=h.__townCommand({type:'placeBuilding',buildingId:'helipad',x:30,z:-12})[0];
    if(!answer?.ok)return answer?.message||'not placed';
    t.buildings.find(b=>b.buildingId==='helipad').state='finished';
    t.tick=BigInt(5*8640-24);return 'ok';})()`);
  if (placed !== 'ok') throw new Error(`The Helipad could not be placed: ${placed}`);
  await context.evaluate(`document.querySelector('[data-town-speed="4"]')?.click()`);
  await context.waitFor(`document.querySelector('.town-entry').__town.heli?.ridgeFire?.state==='burning'`, 'the fire on the Ridge', 60_000);
  await context.evaluate(`document.querySelector('[data-town-speed="0"]')?.click()`);
  await context.waitFor(`!!document.querySelector('[data-town-action="fly"]')`, 'the FLY button', 10_000);
  await picture(context, 'rustwall-town-fly');
  // FLY: Kestrel One on the town's Helipad, Roger surprised by the wall.
  await context.evaluate(`document.querySelector('[data-town-action="fly"]').click()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli'&&window.__qaApp.heliSession?.courseId==='scablands'`, 'the helicopter in the Scablands', 60_000);
  await advance(context, 2);
  await picture(context, 'rustwall-pad');
  const said = await context.evaluate(`window.__qaApp.heliLog.filter(e=>e.type==='scablandsSaid').map(e=>e.id)`);
  if (!said.includes('heli.scablands.roger.first') || !said.includes('heli.scablands.roger.fire')) throw new Error(`Roger did not speak: ${said.join(', ')}`);
  // The bucket on, up to 120 m, then the autopilot takes the empty bucket to the dip tank.
  await context.evaluate(`(() => {const s=window.__qaApp.heliSession;if(!s.fitBucket().ok)throw Error('No bucket at the pad.');window.__qaApp._heliEvents(s.takeEvents());})()`);
  await context.evaluate(`window.__qaApp.keys={KeyW:true}`);
  await advance(context, 14);
  await context.evaluate(`window.__qaApp.keys={}`);
  await picture(context, 'rustwall-over-town');
  await context.evaluate(`window.__qaApp.heliSession.pressAutopilot()`);
  await context.waitFor(`(() => {const v=window.__qaApp.heliView(),t=v?.scablands?.tank;return !!t&&Math.hypot(v.heli.x-t.x,v.heli.z-t.z)<40;})()`, 'the autopilot at the dip tank', 300_000);
  await picture(context, 'rustwall-dip-tank');
  await context.evaluate(`window.__qaApp.heliCamera=2`);
  await picture(context, 'rustwall-dip-tank-cable-view');
  await context.evaluate(`window.__qaApp.heliCamera=0`);
  // Over the Ridge: the fire, Old Tam's hut ring, the scrub band.
  await context.evaluate(`(() => {const s=window.__qaApp.heliSession;if(s.autopilotOn)s.pressAutopilot();})()`);
  const ridge = await context.evaluate(`(() => {const v=window.__qaApp.heliView();return {fire:v.fire?.target??null,hut:v.scablands.hut};})()`);
  if (!ridge.fire) throw new Error('The fire on the Ridge has no hot edge to aim at.');
  await picture(context, 'rustwall-ridge-from-tank');
  const map = await context.evaluate(`(() => {const v=window.__qaApp.heliView();return {scouted:v.scablands.scouted,fire:v.scablands.fire};})()`);
  if (!(map.scouted > 0)) throw new Error('Nothing went on the town map from the air.');
  // Leave: the town keeps the fire and the map.
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await advance(context, 1);
  await picture(context, 'rustwall-left');
  return {said, map};
}
