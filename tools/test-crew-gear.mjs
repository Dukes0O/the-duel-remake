import assert from 'node:assert/strict';
import {PerspectiveCamera, Vector3} from 'three';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {CREW} from '../src/crew.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {onFootCameraPose} from '../src/onfoot-camera.js';
import {keyboardAction, gamepadEdgeActions, footControlInput} from '../src/input-contexts.js';
import {hazardsFor} from '../src/arsenal/hazards.js';
import {targetFor} from '../src/arsenal/targeting.js';
import {actorBody} from '../src/vehicle-knock.js';
import {solveVehicleImpact, yawInertia, CRASH_TUNING} from '../src/vehicle-collision.js';
import {createProfile, createPlayerRegistry, createPlayer, savePlayers, loadPlayers, PLAYERS_KEY} from '../src/progression.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';

// Independent CREW-02 acceptance through existing native entrypoints.
// No future gear module or export is imported. Failed native selection leaves
// later mechanics unproved. CREW-03 charges and CREW-04 crews are separate.
const DT = 1 / 120, EPS = 1e-6, failures = [];
const admissionOnly=process.argv.includes('--admission-only');
const briefNames=new Set(['crew-gear is a real dev switch, disabled in release and enabled only by QA opt-in',
  'keyboard 3 and D-pad down use the existing native foot action dispatch','native signature admission: nell',
  'flag-off current RPG and wrench retain their native timing and controls',
  'Rook locks in 0.6 s and reloads in 1.8 s through actual RPG use',
  'undiscovered memory-only player cannot enter the crew shop or mutate a saved profile']);
let checks = 0;
function check(name, run) {if(admissionOnly&&!briefNames.has(name))return;checks++; try {run();} catch (e) {failures.push(name + ': ' + e.message);}}
function near(a, b, label, tolerance = EPS) {assert.ok(Math.abs(a-b) <= tolerance, label + ': expected ' + b + ', received ' + a);}
const flags = (enabled = true) => createFeatureFlags({storage:null, qa:true,
  overrides:{arsenal:true, 'crew-gear':enabled}});
function placeCar(car, s, lateral = 0, speedMph = 0) {
  Object.assign(car,{s,prevS:s,lateral,prevLateral:lateral,speedMph,
    headingError:0,yawVelocity:0,pushVelocity:0,impactTimer:0,
    combatShield:0,airHeight:0,prevAirHeight:0,contactCooldown:0});
}
function ticks(duel, count = 1, observe = () => {}) {
  for (let i=0;i<count;i++) {duel.step(DT); observe(i);}
}
function holdTargets(duel, count, observe = () => {}) {
  const poses=duel.state.opponents.map(car=>({car,s:car.s,lateral:car.lateral,speedMph:car.speedMph,headingError:car.headingError}));
  ticks(duel,count, i=>{observe(i); for(const p of poses)
    Object.assign(p.car,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,speedMph:p.speedMph,headingError:p.headingError});});
}
function leave(duel) {
  duel.setInput({interact:true});ticks(duel,48);
  assert.equal(duel.state.onFoot,true,'actual 0.4 s F hold creates the fighter');
  duel.setInput({interact:false});ticks(duel);
}
function race(crew='rook',{enabled=true,discovered=true,opponents=1}={}) {
  const duel=new Duel({seed:1989,featureFlags:flags(enabled)});
  duel.startCampaign({mode:'wasteland',car:'falcone_f42',driverId:'club',crewId:crew,
    discoveredGate:discovered,arsenalRank:30,seed:1989,opponentCount:opponents,cpuDifficulty:'easy'});
  Object.assign(duel.state,{status:'racing',countdown:0,invulnerableSec:0,traffic:[]});
  placeCar(duel.state,500);
  duel.state.combat.aiTimer=duel.state.combat.pickupTimer=Infinity;
  duel.state.opponents.forEach((car,i)=>placeCar(car,650+i*30));
  if (discovered) leave(duel);
  return duel;
}
function target(duel,metres,lateral=0,speedMph=0,index=0) {
  const f=duel.state.fighter,car=duel.state.opponents[index];
  const x=f.x+Math.sin(f.yaw)*metres+Math.cos(f.yaw)*lateral;
  const z=f.z+Math.cos(f.yaw)*metres-Math.sin(f.yaw)*lateral;
  const at=duel.course.nearest(x,z,f.s);placeCar(car,at.s,at.lateral,speedMph);return car;
}
function aim(duel,car) {
  const f=duel.state.fighter,p=duel.course.groundAt(car.s,car.lateral);
  f.yaw=Math.atan2(p.x-f.x,p.z-f.z);f.pitch=Math.atan2(p.y+1-f.y-1.62,Math.hypot(p.x-f.x,p.z-f.z));
}
function signature(duel) {
  assert.equal(duel.selectFootGear(3),true,'native discovered signature slot 3 must select');
  assert.notEqual(duel.state.footWeapons.selected,'wrench','signature selection does not fall back to wrench');
}
function fire(duel, held=false) {
  const events=[];const stop=duel.onChange((_,event)=>events.push(event));
  duel.setFighterInput({fire:true});ticks(duel);
  if(!held) {duel.setFighterInput({fire:false});ticks(duel);}
  stop();return events;
}
function raiderAt(duel,metres,lateral=0) {
  const f=duel.state.fighter,zone=duel.state.raids.zones[0],r=zone.raiders[0];
  const x=f.x+Math.sin(f.yaw)*metres+Math.cos(f.yaw)*lateral;
  const z=f.z+Math.cos(f.yaw)*metres-Math.sin(f.yaw)*lateral;
  const at=duel.course.nearest(x,z,f.s),p=duel.course.groundAt(at.s,at.lateral);
  Object.assign(r,{s:at.s,lateral:at.lateral,x:p.x,y:p.y,z:p.z,groundY:p.y,
    health:120,maxHealth:120,knockedDown:false});return r;
}
function reenter(duel) {
  duel.setFighterInput({fire:false,aim:false,forward:false,right:false,left:false});
  const p=duel.course.groundAt(duel.state.s,duel.state.lateral+2.5);
  Object.assign(duel.state.fighter,{x:p.x,y:p.y,z:p.z,s:duel.state.s,lateral:duel.state.lateral+2.5,
    groundY:p.y,airHeight:0,verticalSpeed:0});
  duel.setInput({interact:false});ticks(duel);duel.setInput({interact:true});ticks(duel,72);
  assert.equal(duel.state.onFoot,false,'actual fresh 0.6 s F hold re-enters');
  duel.setInput({interact:false});ticks(duel);leave(duel);
}

check('crew-gear is a real dev switch, disabled in release and enabled only by QA opt-in',()=>{
  // Released on 4 October 2026; the dev-switch rules are kept with it pinned to dev.
  assert.equal(FEATURE_STATES['crew-gear'],'on','production catalog has crew gear released');
  const dev=search=>qa=>createFeatureFlags({catalog:{...FEATURE_STATES,'crew-gear':'dev'},storage:null,qa,search});
  assert.equal(dev('?flags=crew-gear')(false).enabled('crew-gear'),false);
  assert.equal(dev('?flags=crew-gear')(true).enabled('crew-gear'),true);
});
check('keyboard 3 and D-pad down use the existing native foot action dispatch',()=>{
  assert.equal(keyboardAction('foot','Digit3'),'gear:3');
  const pressed=Array(16).fill(false);pressed[13]=true;
  assert.deepEqual(gamepadEdgeActions('foot',pressed,[]),['gear:3']);
  const duel=race('nell');App.prototype._inputAction.call({duel},keyboardAction('foot','Digit3'));
  assert.notEqual(duel.state.footWeapons.selected,'rpg','actual App action selects Nell signature instead of silently staying on RPG');
});
for(const crew of Object.keys(CREW)) check('native signature admission: '+crew,()=>{
  const duel=race(crew);signature(duel);
  for(const options of [{enabled:false},{discovered:false}]) {
    const gated=race(crew,options);assert.equal(gated.selectFootGear(3),false,'discovery and switch keep signature gear unavailable');
  }
});
check('Jax, Cinder and Tusk are active rather than marked as future perks',()=>{
  for(const id of ['jax','cinder','tusk']) assert.equal(CREW[id].active,true,id+' has its real signature and passive');
});
check('flag-off current RPG and wrench retain their native timing and controls',()=>{
  const duel=race('rook',{enabled:false}),car=target(duel,35);aim(duel,car);
  assert.equal(duel.selectFootGear(3),false);duel.setFighterInput({aim:true});holdTargets(duel,96);
  near(duel.state.footWeapons.lockSeconds,.8,'released RPG lock time');
  fire(duel);near(duel.state.footWeapons.nextFireAt-duel.state.footWeapons.lastFireAt,2.2,'released RPG reload');
  assert.equal(duel.selectFootGear(2),true);assert.equal(duel.state.footGear.name,'WRENCH');
});
check('Rook locks in 0.6 s and reloads in 1.8 s through actual RPG use',()=>{
  const duel=race('rook'),car=target(duel,35);aim(duel,car);
  duel.setFighterInput({aim:true});holdTargets(duel,72);
  near(duel.state.footWeapons.lockSeconds,.6,'Rook literal lock timer');
  fire(duel);assert.equal(duel.state.combat.projectiles.at(-1).targetIndex,0,'Rook actually fires a locked rocket at 0.6 s');
  near(duel.state.footWeapons.nextFireAt-duel.state.footWeapons.lastFireAt,1.8,'Rook literal reload');
});
check('Nell carries 3 bombs, throws a real upward arc within 18 m and uses a 3 s contact fuse',()=>{
  const duel=race('nell');signature(duel);assert.equal(duel.state.footGear.ammo,3);
  const car=target(duel,12);aim(duel,car);const armor=car.armor,origin={...duel.state.fighter};
  fire(duel);assert.equal(duel.state.footGear.ammo,2);
  const shot=duel.state.combat.projectiles.at(-1);assert.ok(shot,'actual thrown bomb has a simulation flight product');
  assert.ok(shot.vy>0,'throw starts as an upward arc');
  let firstContact=null,blastAt=null,maxRange=0;
  holdTargets(duel,720,()=>{
    maxRange=Math.max(maxRange,Math.hypot(shot.x-origin.x,shot.z-origin.z));
    if(firstContact===null && Math.hypot(shot.vx||0,shot.vy||0,shot.vz||0)<EPS) firstContact=duel.state.stageTimeSec;
    if(car.armor<armor && blastAt===null) blastAt=duel.state.stageTimeSec;
  });
  assert.ok(maxRange<=18+.3,'native throw stays within the settled 18 m reach');
  assert.notEqual(firstContact,null,'bomb sticks before exploding');assert.notEqual(blastAt,null,'real bomb eventually explodes');
  near(blastAt-firstContact,3,'real contact-to-blast fuse',2*DT);near(armor-car.armor,25,'native sticky center damage');
});
check('Nell sticky blast uses her 6 m perk radius and hits a real raider for 60 health',()=>{
  const duel=race('nell',{opponents:2});signature(duel);
  const car=target(duel,12),neighbor=target(duel,12,5,0,1),r=raiderAt(duel,12);
  aim(duel,car);const armor=neighbor.armor;fire(duel);holdTargets(duel,720);
  assert.ok(neighbor.armor<armor,'a car within the Nell 6 m perk radius takes genuine splash');
  near(120-r.health,60,'a real raider at the blast center loses the literal 60 health');
});
check('Jax grapple reaches an 89 km/h enemy roof within 25 m, rejects 91 km/h and recharges in 6 s',()=>{
  const duel=race('jax');signature(duel);const car=target(duel,20,0,89/1.609344);aim(duel,car);
  fire(duel);holdTargets(duel,600);
  const f=duel.state.fighter,p=duel.course.groundAt(car.s,car.lateral);
  assert.ok(Math.hypot(f.x-p.x,f.z-p.z)<3 && f.y>p.y+1,'native grapple puts Jax on the actual moving enemy roof');
  near(duel.state.footWeapons.nextFireAt-duel.state.footWeapons.lastFireAt,6,'native grapple recharge');
  for(const [metres,kph] of [[26,89],[20,91]]) {
    const blocked=race('jax');signature(blocked);const enemy=target(blocked,metres,0,kph/1.609344);aim(blocked,enemy);
    const at={...blocked.state.fighter};fire(blocked);holdTargets(blocked,120);
    assert.ok(Math.hypot(blocked.state.fighter.x-at.x,blocked.state.fighter.z-at.z)<.5,'out-of-range or too-fast enemy never pulls Jax');
  }
});
check('Jax pulls up onto an actual salvage ledge within the literal 25 m line',()=>{
  const duel=race('jax');signature(duel);
  const crate=duel.state.raids.zones.find(z=>z.salvage)?.salvage;assert.ok(crate,'generated course has a real salvage ledge');
  const at=duel.course.nearest(crate.x-10,crate.z,crate.s),ground=duel.course.groundAt(at.s,at.lateral);
  placeCar(duel.state,at.s,at.lateral);
  Object.assign(duel.state.fighter,{x:ground.x,y:ground.y,z:ground.z,s:at.s,lateral:at.lateral,groundY:ground.y,
    yaw:Math.atan2(crate.x-ground.x,crate.z-ground.z),pitch:Math.atan2(crate.y+1.35-ground.y-1.62,Math.hypot(crate.x-ground.x,crate.z-ground.z))});
  fire(duel);ticks(duel,600);const f=duel.state.fighter;
  assert.ok(Math.hypot(f.x-crate.x,f.z-crate.z)<2 && f.y>=crate.y+1,
    'native grapple brings Jax to the actual solid salvage ledge top');
});
check('Odessa turret damages the nearest car by 4 every 0.8 s, stops at 20 s and recharges after it goes',()=>{
  const duel=race('odessa',{opponents:2});signature(duel);
  const nearest=target(duel,20),farther=target(duel,30,0,0,1),otherArmor=farther.armor;
  fire(duel);const launch=duel.state.footWeapons.lastFireAt,shots=[];let last=nearest.armor;
  holdTargets(duel,2520,()=>{if(nearest.armor<last) {near(last-nearest.armor,4,'turret real car-hit amount');shots.push(duel.state.stageTimeSec);nearest.armor=last;}});
  assert.ok(shots.length>1,'native deployable actually fires repeatedly');
  for(let i=1;i<shots.length;i++) near(shots[i]-shots[i-1],.8,'turret actual cadence',DT+EPS);
  assert.ok(shots.at(-1)-launch<=20+DT,'turret stops at its literal 20 s lifetime');assert.equal(farther.armor,otherArmor,'nearest valid enemy wins');
  near(duel.state.footWeapons.nextFireAt-launch,50,'20 s deployed lifetime plus 30 s after it goes',DT+EPS);
  const out=race('odessa');signature(out);const enemy=target(out,36),armor=enemy.armor;fire(out);holdTargets(out,240);
  assert.equal(enemy.armor,armor,'enemy beyond 35 m is safe from the turret');
});
check('Cinder native cone deals 10 armor/s and 30 raider health/s; range and width are counterable',()=>{
  for(const [metres,angle,expected] of [[4,0,true],[10,0,false],[6,45,false]]) {
    const duel=race('cinder');signature(duel);const radians=angle*Math.PI/180;
    const car=target(duel,metres*Math.cos(radians),metres*Math.sin(radians));
    const r=raiderAt(duel,metres*Math.cos(radians),metres*Math.sin(radians)),armor=car.armor,health=duel.state.fighter.health;
    duel.setFighterInput({fire:true});holdTargets(duel,120);
    near(armor-car.armor,expected?10:0,'native 6 m / 35 degree cone armor per second',.03);
    near(120-r.health,expected?30:0,'native cone raider health per second',.03);
    assert.equal(duel.state.fighter.health,health,'Cinder survives native self contact');
  }
});
check('Cinder has 4 s fuel and recovers half a second per idle second',()=>{
  const duel=race('cinder');signature(duel);near(duel.state.footGear.ammo,4,'native initial fuel seconds');
  duel.setFighterInput({fire:true});holdTargets(duel,120);near(duel.state.footGear.ammo,3,'one second of native burn consumes one fuel second',DT);
  duel.setFighterInput({fire:false});holdTargets(duel,240);near(duel.state.footGear.ammo,4,'two idle seconds recover one fuel second',DT);
});
check('Dune has 8 bolts, native 90 m/s flight, 15 armor, 150 m reach and 1.5 s reload',()=>{
  const duel=race('dune');signature(duel);assert.equal(duel.state.footGear.ammo,8);
  const car=target(duel,35);aim(duel,car);const armor=car.armor;fire(duel);
  const bolt=duel.state.combat.projectiles.at(-1);assert.ok(bolt,'native Marksman fire creates its bolt');
  near(Math.hypot(bolt.vx,bolt.vy,bolt.vz),90,'Marksman literal flight speed');
  near(duel.state.footWeapons.nextFireAt-duel.state.footWeapons.lastFireAt,1.5,'Marksman literal reload');
  holdTargets(duel,120);near(armor-car.armor,15,'Marksman real car damage');assert.equal(duel.state.footGear.ammo,7);
  const outside=race('dune');signature(outside);const far=target(outside,155);aim(outside,far);const untouched=far.armor;fire(outside);holdTargets(outside,360);
  assert.equal(far.armor,untouched,'native range expiry cannot damage the 155 m target');
});
check('Dune one real bolt knocks a raider down and aiming gives 3x camera magnification',()=>{
  const duel=race('dune');signature(duel);const r=raiderAt(duel,20);
  const f=duel.state.fighter;const p=onFootCameraPose(duel.course,f);duel.setFighterInput({aim:true});ticks(duel);
  const zoom=onFootCameraPose(duel.course,f);
  near(Math.tan(p.fov*Math.PI/360)/Math.tan(zoom.fov*Math.PI/360),3,'actual camera angular magnification');
  f.pitch=Math.atan2(r.y+1-f.y-1.62,Math.hypot(r.x-f.x,r.z-f.z));fire(duel);holdTargets(duel,120);
  assert.equal(r.knockedDown,true,'Marksman knockdown applies to a real live raider in one hit');
});
check('Wren throws two grenades within 20 m; native smoke is 5 m across and lasts 6 s',()=>{
  const duel=race('wren');signature(duel);assert.equal(duel.state.footGear.ammo,2);const origin={...duel.state.fighter};fire(duel);
  let cloud=null;
  for(let i=0;i<600&&!cloud;i++) {ticks(duel);cloud=hazardsFor(duel).find(h=>h.kind==='smoke');}
  assert.ok(cloud,'real grenade registers with the shared arsenal smoke');
  near(cloud.radius,2.5,'5 m across means literal 2.5 m radius');near(cloud.lifetime,6,'native smoke lifetime');
  assert.ok(Math.hypot(cloud.x-origin.x,cloud.z-origin.z)<=20+.3,'native thrown smoke stays within 20 m');assert.equal(duel.state.footGear.ammo,1);
  const owner=duel.state,enemy=duel.state.rival;
  const across=duel.course.nearest(cloud.x,cloud.z,owner.s);
  placeCar(owner,across.s-10,across.lateral);placeCar(enemy,across.s+10,across.lateral);
  assert.equal(targetFor(duel,owner,{range:50}),null,'real shared smoke blocks CPU sight and lock selection');
  holdTargets(duel,721);assert.equal(hazardsFor(duel).includes(cloud),false,'native cloud retires after six seconds');
});
check('Tusk cannon carries 2 shells, reloads in 4 s and deals 20 armor through an equivalent native solver shove',()=>{
  const duel=race('tusk');signature(duel);assert.equal(duel.state.footGear.ammo,2);const car=target(duel,12);aim(duel,car);
  let before=actorBody(duel,car);const armor=car.armor;fire(duel);
  near(duel.state.footWeapons.nextFireAt-duel.state.footWeapons.lastFireAt,4,'native Cannon reload');
  // FIX-LAUNCH: the target moves under CPU control while the shell flies; compare against its body on the
  // tick before the hit, not its standing start (the old launch happened to cancel the difference).
  for(let i=0;i<240&&car.armor===armor;i++){before=actorBody(duel,car);ticks(duel);}
  near(armor-car.armor,20,'native Cannon car-hit armor');assert.equal(duel.state.footGear.ammo,1);
  assert.ok(car.knock,'real cannon hit enters the released car crash motion');
  const f=duel.state.fighter,heading=Math.atan2(before.x-f.x,before.z-f.z),hl=duel._vehicleSpec(duel.state).halfLength,hw=duel._vehicleSpec(duel.state).halfWidth;
  const incoming={x:before.x-Math.sin(heading)*(hl+before.halfLength),z:before.z-Math.cos(heading)*(hl+before.halfLength),heading,
    vx:Math.sin(heading)*35*CRASH_TUNING.mphToMps,vz:Math.cos(heading)*35*CRASH_TUNING.mphToMps,
    spin:0,mass:1450,halfLength:hl,halfWidth:hw,inertia:yawInertia(1450,hl,hw)};
  const expected=solveVehicleImpact(incoming,before).b;
  near(Math.hypot(car.knock.vx,car.knock.vz),Math.hypot(expected.vx,expected.vz),'Cannon uses the settled 1450 kg / 35 mph solver response',.1);
});
check('Tusk walks into a parked car to push it at 1 m/s and a Cannon hit downs a real raider',()=>{
  const duel=race('tusk');signature(duel);const car=target(duel,2),initial={...duel.course.worldAt(car.s,car.lateral)};
  duel.setFighterInput({forward:true});ticks(duel,120);
  const at=duel.course.worldAt(car.s,car.lateral);assert.ok(Math.hypot(at.x-initial.x,at.z-initial.z)>.5,'native walking contact really moves the parked car');
  near(Math.hypot(actorBody(duel,car).vx,actorBody(duel,car).vz),1,'parked-car passive native push speed',.1);
  const hit=race('tusk');signature(hit);const r=raiderAt(hit,12),f=hit.state.fighter;
  f.pitch=Math.atan2(r.y+1-f.y-1.62,Math.hypot(r.x-f.x,r.z-f.z));fire(hit);holdTargets(hit,180);
  assert.equal(r.knockedDown,true,'native Cannon hit knocks the live raider down');
});
for(const [crew,capacity] of [['nell',3],['dune',8],['wren',2],['tusk',2]]) check('actual native re-entry refills signature inventory: '+crew,()=>{
  const duel=race(crew);signature(duel);fire(duel);assert.equal(duel.state.footGear.ammo,capacity-1,'successful native use consumes one item');
  reenter(duel);signature(duel);assert.equal(duel.state.footGear.ammo,capacity,'fresh native car exit has refilled gear');
});
check('Rook gear-enabled car re-entry refills his existing RPG',()=>{
  const duel=race('rook');fire(duel);assert.equal(duel.state.footWeapons.ammo,2);reenter(duel);assert.equal(duel.state.footWeapons.ammo,3,'Rook existing gear follows the new refilling rule');
});
check('strafe controls (Q/E since 12 October 2026) move in the matching camera direction without changing car progress',()=>{
  for(const [key,sign] of [['KeyE',1],['KeyQ',-1]]) {
    const duel=race('nell'),f=duel.state.fighter,start={...f},pose=onFootCameraPose(duel.course,f),carS=duel.state.s;
    const camera=new PerspectiveCamera(pose.fov,16/9,.15,1000);camera.position.set(pose.position.x,pose.position.y,pose.position.z);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);camera.updateMatrixWorld();
    duel.setFighterInput(footControlInput({[key]:true},{},{}));ticks(duel,12);
    const ahead={x:start.x+Math.sin(start.yaw)*10,z:start.z+Math.cos(start.yaw)*10};
    const x=new Vector3(ahead.x+f.x-start.x,pose.position.y,ahead.z+f.z-start.z).project(camera).x;
    assert.ok(x*sign>0,'actual '+key+' movement projects to its named screen side');assert.equal(duel.state.s,carS,'walking leaves parked car race progress fixed');
  }
});
function withApp(discovered,run) {
  const names=['localStorage','cancelAnimationFrame'],old=names.map(n=>Object.getOwnPropertyDescriptor(globalThis,n)),rows=new Map();
  const storage={getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:()=>{}});
  let app;
  try {
    const profile=createProfile();profile.wasteland=normalizeWasteland({discoveredGate:discovered,xp:100000,scrap:4000});
    let registry=createPlayerRegistry(profile);registry.players[0].id='gear-player';registry.activePlayerId='gear-player';
    registry=createPlayer(registry,'Other Gear Player').registry;registry.activePlayerId='gear-player';assert.equal(savePlayers(registry,storage),true);
    app=new App();app.duel.featureFlags=flags();app.audio.unlock=()=>{};run(app,rows);
  } finally {app?.dispose();names.forEach((n,i)=>{if(old[i]) Object.defineProperty(globalThis,n,old[i]);else delete globalThis[n];});}
}
check('native memory-only named-player crew selection reaches real signature admission',()=>withApp(true,(app,rows)=>{
  const other=structuredClone(loadPlayers().players[1]);assert.equal(app.selectCrewMember('jax').ok,true);
  assert.equal(app.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989}),true);
  const s=app.duel.state;Object.assign(s,{status:'racing',countdown:0,traffic:[]});placeCar(s,500);s.opponents=[];s.combat.aiTimer=s.combat.pickupTimer=Infinity;
  leave(app.duel);assert.equal(s.fighter.crewId,'jax','actual App campaign carries the selected earned crew');signature(app.duel);
  assert.deepEqual(loadPlayers().players[1],other,'gear use cannot change another named player');assert.ok(rows.has(PLAYERS_KEY),'memory-only profile remains persisted');
}));
check('undiscovered memory-only player cannot enter the crew shop or mutate a saved profile',()=>withApp(false,(app,rows)=>{
  const before=rows.get(PLAYERS_KEY);assert.equal(app.selectCrewMember('jax').ok,false);assert.equal(rows.get(PLAYERS_KEY),before);
}));
console.log('Crew gear'+(admissionOnly?' bounded admission':'')+': '+checks+' checks, '+(checks-failures.length)+' passed, '+failures.length+' failed.');
if(failures.length) {console.error(failures.join('\n'));process.exitCode=1;}
