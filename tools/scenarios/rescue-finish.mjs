// RESCUE-FINISH: Summit arrival and hoist pictures, scripted player controls.
// Complements complete, repeatable flights in the session/tune tests.
// No frames; private harness, memory-only storage, no position/state injection.
import {Course} from '../../src/course.js';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';
import {groundFromCourse} from '../../src/heli/heli-ground.js';
import {menu as rescueMenu, callHeli, answer, fitLine, cruiseTo, flyTo, look, setDown, lowerOver,
  shoot, view, pilotTo, sim, groundAt} from './rescue-view.mjs';

const app = 'window.__qaApp';
const world = new Course(ALL_CIRCUITS.find(d => d.id === 'summit-run'), 1989);
const ground = groundFromCourse(world);
const dist = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
async function menu(context, heli) {
  await rescueMenu(context, heli);
  await context.evaluate(`(() => {
    const session = ${app}.heliSession, step = session.step.bind(session);
    // __go supplies a fixed dt. App's normal frame loop supplies none.
    // Draw and update the UI between commands without also flying the route,
    // burning fuel or bouncing off a touchdown while a screenshot is taken.
    session.step = (controls, dt) => dt === undefined ? [] : step(controls, dt);
  })()`);
}
async function land(context, p) {
  await flyTo(context, {x:p.x,z:p.z,y:p.y+12,speed:3,sink:3}, 'above truck', {within:3,tall:2});
  await pilotTo(context, {x:p.x,z:p.z,y:p.y-2,speed:1,sink:1.1});
  if (!await sim(context,120,'v => v.heli.onGround')) throw Error('Did not land at truck');
}
async function fill(context, kg) {
  await context.waitFor(`!!document.querySelector('[data-heli-fuel-target]')`, 'truck pump controls', 10000);
  const before = await view(context, 'v.heli.fuelKg');
  await context.evaluate(`(() => {
    const choice = document.querySelector('[data-heli-fuel-target]'); choice.value=${JSON.stringify(kg)};
    document.querySelector('[data-heli-fuel="target"]').click();
  })()`);
  if (before < kg-1 && !await view(context, `v.heli.fuelKg > ${kg-2}`)) throw Error('Truck UI did not buy the selected fuel target');
}
async function road(context, goal, finalY) {
  const from = await view(context,'v.heli');
  const nearest = p => { let at=0,best=Infinity; for(let s=0;s<=world.length;s+=25) {const d=dist(world.at(s),p);if(d<best){at=s;best=d;}}return at;};
  const a=nearest(from),b=nearest(goal),dir=b>=a?1:-1,points=[];
  for(let s=a;dir>0?s<b:s>b;s+=dir*150) {const q=world.at(s);points.push({x:q.x,z:q.z});}
  points.push(goal);
  for(let i=0;i<points.length;i++) {
    const q=points[i], h=await view(context,'v.heli');
    let top=-Infinity;
    for(let k=0;k<=30;k++) top=Math.max(top,ground.highest(h.x+(q.x-h.x)*k/30,h.z+(q.z-h.z)*k/30,12));
    if (h.y < top+40) await flyTo(context,{x:h.x,z:h.z,y:top+45,speed:1,sink:6},'climb above road',{within:12,tall:6,seconds:180});
    await flyTo(context,{x:q.x,z:q.z,y:top+45,speed:24,sink:6},'along road',{within:20,tall:8,seconds:180});
  }
  await flyTo(context,{x:goal.x,z:goal.z,y:finalY,speed:3,sink:3},'site hover',{within:4,tall:3,seconds:180});
}
// Reuse the complete Summit flight's terrain-following route for staging and cargo.
// It steers with ordinary controls; no position or outcome is set.
async function terrainTo(context, goal, finalY, {requireCargo = true} = {}) {
  await context.evaluate(`window.__pilot = v => {
    const goal=${JSON.stringify(goal)}, h=v.heli, d=Math.hypot(goal.x-h.x,goal.z-h.z);
    const ux=d>1?(goal.x-h.x)/d:0, uz=d>1?(goal.z-h.z)/d:0;
    let top=-Infinity;
    for(let ahead=0;ahead<=Math.min(d,400);ahead+=20) top=Math.max(top,v.rescue.ground(h.x+ux*ahead,h.z+uz*ahead));
    const y=d<100?${finalY}:top+45;
    return {x:goal.x,z:goal.z,y,speed:d<100?4:h.y<y-30?4:h.y<y-12?12:24,sink:6};
  }`);
  const done=await sim(context,1500,`v => v.courseId !== 'summit-run' || Math.hypot(v.heli.x-${goal.x},v.heli.z-${goal.z})<10 && Math.abs(v.heli.y-${finalY})<3 && Math.hypot(v.heli.vx,v.heli.vz)<1`);
  if (!done || !await view(context, requireCargo ? "v.courseId === 'summit-run' && v.rescue.crates.some(c=>c.hooked)" : "v.courseId === 'summit-run'"))
    throw Error('Cargo approach failed: '+await context.evaluate(`JSON.stringify(${app}.heliLog.slice(-20))`));
}
export async function run(context) {
  const yardOnly = process.env.RESCUE_FINISH_ONLY === 'yard';
  if (!yardOnly) {
  await menu(context,callHeli('avalanche','summit-run'));
  await answer(context); await fitLine(context); await cruiseTo(context,'summit-run');
  const zone=await view(context,'v.zone');
  await context.waitFor(`document.body.textContent.includes('Fill to at least 330 kg at the truck.')`, 'named start truck guidance', 10000);
  await shoot(context,'summit-arrival-truck','Summit arrival: refuel at the start-area truck first');
  await land(context,zone); await fill(context,330);
  await context.evaluate(`document.querySelector('[data-heli-fuel-target]').value='190'; document.querySelector('[data-heli-fuel="target"]').click()`);
  await context.waitFor(`[...document.querySelectorAll('.heli-notices p')].some(p => p.textContent.includes('already has') && p.textContent.includes('higher target'))`, 'the lower fuel target explains why', 10000);
  await shoot(context,'summit-truck-controls','Summit truck: partial tank controls and a clear refusal reason');
  await pilotTo(context,{x:zone.x,z:zone.z,y:zone.y+60,speed:1,sink:3});
  await sim(context,90,`v => v.heli.y > ${zone.y+55}`);
  await context.evaluate(`window.__pilot=null; ${app}.heliSession.pressAutopilot()`);
  if (!await sim(context,1500,'v => Math.hypot(v.heli.x-v.rescue.active.sites.slide.x,v.heli.z-v.rescue.active.sites.slide.z)<12 && Math.hypot(v.heli.vx,v.heli.vz)<1'))
    throw Error('Autopilot did not reach the slide');
  const sites=await view(context,'v.rescue.active.sites');
  await context.evaluate(`if (${app}.heliSession.autopilotOn) ${app}.heliSession.pressAutopilot()`);
  await shoot(context,'summit-avalanche-arrival','Summit avalanche: arrival over the slide');
  await road(context,sites.pickup,sites.pickup.y+30);
  await land(context,sites.pickup);
  await context.waitFor(`/Fill to (?:at least )?400 kg at the (?:pickup )?truck/.test(document.body.textContent)`, 'named pickup truck guidance', 10000);
  await fill(context,400);
  const b=sites.beacon,gy=await groundAt(context,b.x,b.z);
  await road(context,b,gy+40);
  await setDown(context,b,gy); await lowerOver(context,b,gy,10.5);
  await context.evaluate(`${app}.heliCamera=3`);
  await shoot(context,'summit-avalanche-hoist','Summit avalanche: rescuer digging and clipping the skier');
  await sim(context,30,'v => v.rescue.active?.stage === "carry"');
  if (!await view(context,'v.rescue.line.who === "pair"')) throw Error('Skier did not clip on');
  await shoot(context,'summit-avalanche-pair','Summit avalanche: casualty on the line');
  }
  // Supply pickup at the same staging area: a separate answered call from home.
  await menu(context,callHeli('supply','summit-run')); await answer(context); await cruiseTo(context,'summit-run');
  const z=await view(context,'v.zone');await land(context,z);await fill(context,400);
  const pickup=await view(context,'v.rescue.active.sites.pickup');
  await terrainTo(context,pickup,pickup.y+40,{requireCargo:false});
  if (await context.evaluate(`${app}.heliLog.some(e => e.type === 'charged' && e.kind === 'fuelTruck')`)) throw Error('Supply picture flight needed an unplanned fuel truck');
  if (!yardOnly) await shoot(context,'summit-supply-arrival','Summit supply: arrival at the truck and three crates');
  const food=await view(context,'v.rescue.crates.find(c => c.id === "food")');
  await land(context,pickup);
  await context.waitFor(`document.body.textContent.includes('Take at least 230 kg before each supply crate leg.')`, 'named supply fuel guidance', 10000);
  await fill(context,230);
  await flyTo(context,{x:food.x,z:food.z,y:food.y+15.4,speed:3,sink:1},'over food crate',{within:1,tall:.5});
  const hooked=await context.evaluate(`${app}.heliSession.pressHook()`);
  if(hooked?.type!=='hooked') throw Error('Food crate did not hook');
  await context.evaluate(`${app}.heliCamera=3`);
  if (!yardOnly) await shoot(context,'summit-supply-hook','Summit supply: hooking the first crate');
  const yard=await view(context,'v.rescue.active.sites.yard');
  await terrainTo(context,yard,ground.height(yard.x,yard.z)+45);
  await look(context,yard,{back:80,up:60,speed:10,within:5});
  await context.evaluate(`${app}.heliCamera=0`);
  await shoot(context,'summit-supply-yard-arrival','Summit supply: arrival at the summit hut yard');
}
