import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {COURSE, LIVES} from '../src/config.js';

// Geometry fixtures are deliberately simple. Every contact still uses the
// production swept collision and damage paths; all saves stay in memory.
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const zeroDamage=()=>({front:0,rear:0,left:0,right:0});
const stageIndex=COURSE.findIndex(stage=>!stage.kind&&stage.hasRival),dt=1/120;
function straight(d){
  const point=(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0,curvature:0});
  d.course={def:{theme:'desert'},length:10000,raceLength:20000,closed:false,
    features:{obstacles:[],flocks:[],shortcuts:[],radarTraps:[]},at:s=>point(s),worldAt:point,groundAt:point,
    nearest:(x,z)=>({s:z,lateral:x,distance:Math.abs(x)}),phase:s=>s,themeAt:()=> 'desert',roadHalfWidthAt:()=>7,
    surfaceAt:(_,lateral)=>({road:Math.abs(lateral)<=7,mainRoad:Math.abs(lateral)<=7,shortcutId:null,roadHalfWidth:7}),
    nearestRadar:()=>null,obstaclesNear:()=>d.course.features.obstacles};
  d._lapGates=[2500,5000,7500];d._obstacleQueryCache=new Map();d._obstacleArray=d.course.features.obstacles;
  Object.assign(d.state,{status:'racing',s:100,prevS:100,lateral:0,prevLateral:0,rival:null,traffic:[],lapsTotal:2});return d;
}
function fixture(){const d=new Duel({seed:1989});d.startCampaign({startStage:stageIndex,mode:'timetrial'});return straight(d);}
const cactus=(id='cactus-1',s=110,extra={})=>({id,kind:'tree',theme:'desert',shape:'ellipse',s,off:0,x:0,y:0,z:s,heading:0,halfX:.45,halfZ:.45,height:4,...extra});
const npc=(extra={})=>({alive:true,s:110,prevS:110,lateral:0,prevLateral:0,speedMph:0,dir:1,headingError:0,pushVelocity:0,
  damageZones:zeroDamage(),damageCooldown:0,...extra});
function sweep(d,from,to,speed,extra={}){Object.assign(d.state,{prevS:from,s:to,prevLateral:0,lateral:0,speedMph:speed,gear:speed<0?-1:0,...extra});d._staticContacts(d.state,true);}
function forwardHit(d,speed=20,otherSpeed=0){
  const s=d.state,b=s.traffic[0]||npc();s.traffic=[b];
  Object.assign(s,{prevS:100,s:107,lateral:0,prevLateral:0,speedMph:speed,headingError:0,pushVelocity:0});
  Object.assign(b,{prevS:110,s:110,lateral:0,prevLateral:0,speedMph:otherSpeed,dir:1,headingError:0,pushVelocity:0});
  d._vehicleContact(s,b,'traffic');return b;
}
function damagedOnly(actor,zone,label){
  check(actor.damageZones[zone]>0&&actor.damageZones[zone]<=5,`${label}: ${zone} panel is visibly damaged within the cap`);
  for(const other of Object.keys(zeroDamage()).filter(key=>key!==zone))same(actor.damageZones[other],0,`${label}: unrelated ${other} panel is unchanged`);
}

// Freshly created actors own separate damage state, not one shared material or
// mutable damage object that could dent every traffic car at once.
{
  const d=new Duel({seed:1989});d.startCampaign({startStage:stageIndex,mode:'duel'});
  check(d.state.rival&&d.state.traffic.length>1,'normal race creates a rival and multiple traffic actors');
  const actors=[d.state,d.state.rival,...d.state.traffic,d._newPursuit(20)];
  for(const actor of actors){same(actor.damageZones,zeroDamage(),'every new actor begins with four clean panels');same(actor.damageCooldown,0,'new actor has no stale damage cooldown');}
  same(new Set(actors.map(actor=>actor.damageZones)).size,actors.length,'actors do not share mutable damage state');
  same(d.state.fallenCacti,[],'new stage starts with every cactus standing');
}

for(const speed of [5,22,100,-22]){
  const d=fixture(),s=d.state,reverse=speed<0;d.course.features.obstacles.push(cactus());s.stageTimeSec=12.5;s.boost=.4;
  const scenery=JSON.stringify(d.course.features.obstacles);
  sweep(d,reverse?120:100,reverse?100:120,speed);
  same(s.fallenCacti.length,1,'the very first swept cactus contact knocks it over');
  const fallen=s.fallenCacti[0];same(fallen.id,'cactus-1','fallen state refers to the exact scenery object');same(fallen.atTime,12.5,'fall animation starts at the contact time');
  check(Number.isFinite(fallen.directionX)&&Number.isFinite(fallen.directionZ)&&Math.abs(fallen.directionX)<1e-9&&fallen.directionZ*(reverse?-1:1)>0,'cactus falls away from the actual forward or reverse impact');
  check(Math.sign(s.speedMph)===Math.sign(speed)&&Math.abs(s.speedMph)<Math.abs(speed)&&Math.abs(s.speedMph)>Math.abs(speed)*.6,'breaking a cactus applies only a small signed speed scrub');
  same(s.s,reverse?100:120,'a broken cactus does not stop the vehicle at its former collider');
  same([s.lives,s.majorCrashes,s.stageCrashes,s.impactTimer,s.racePenaltySec],[LIVES.start,0,0,0,0],'a cactus is not a life-consuming solid wall');
  same([s.score,s.stageStyleScore,s.nearMisses,s.crushCount,s.jumps,s.boost],[0,0,0,0,0,.4],'cactus contact awards no points, event progress or nitro');
  const record=structuredClone(fallen),afterSpeed=s.speedMph;
  for(let pass=0;pass<4;pass++)sweep(d,reverse?120:100,reverse?100:120,afterSpeed);
  same(s.fallenCacti,[record],'repeated crossings neither duplicate the fall nor restart its animation');same(s.speedMph,afterSpeed,'the fallen cactus cannot keep scrubbing speed');
  same(JSON.stringify(d.course.features.obstacles),scenery,'knockdown never mutates the reusable course scenery or colliders');
}
{
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus());d.setInput({throttle:1,brake:0,steer:0});
  for(let frame=0;frame<240;frame++)d.step(dt);
  same(s.fallenCacti.length,1,'ordinary throttle input knocks the cactus down on the first approach');check(s.s>110,'ordinary driving continues through the broken cactus');
  same([s.lives,s.stageCrashes,s.majorCrashes,s.status],[LIVES.start,0,0,'racing'],'first-contact driving does not trigger the old cactus crash');
}
{
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus());
  const driver=npc({prevS:100,s:120,speedMph:30});d._staticContacts(driver,false);
  same(s.fallenCacti.length,1,'an NPC first hit also knocks down the shared cactus');same(driver.s,120,'NPCs can pass through the cactus they knock down');
  sweep(d,100,120,20);same(s.fallenCacti.length,1,'player and NPC contact share one fallen-state identity');same(s.speedMph,20,'player cannot hit the collider of an NPC-felled cactus');
}
for(const theme of ['alpine','coast','city']){
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus('ordinary-tree',110,{theme}));sweep(d,100,120,20);
  same(s.fallenCacti,[],`${theme} trees are not mistaken for desert cacti`);check(s.s<110&&s.speedMph<5,`${theme} trees retain their solid collision response`);
}
{
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus('desert-rock',110,{kind:'rock'}));sweep(d,100,120,20);
  same(s.fallenCacti,[],'desert rocks are not breakable cacti');check(s.s<110,'desert rocks remain solid');
}
for(const reverse of [false,true]){
  const d=fixture(),s=d.state,from=reverse?130:100,to=reverse?100:130;
  // Intentionally list the cactus first. Nearest contact, not array order,
  // determines whether a wall shields it from the incoming car.
  d.course.features.obstacles.push(cactus('occluded-cactus',reverse?108:122),
    {id:'near-wall',kind:'building',theme:'desert',shape:'box',s:115,x:0,y:0,z:115,heading:0,halfX:4,halfZ:1,height:8});
  sweep(d,from,to,reverse?-22:20);
  same(s.fallenCacti,[],'a cactus behind a nearer solid wall cannot be knocked down through the wall');
  check(reverse?s.s>118:s.s<112,'the intervening wall resolves on the correct approach side');
}
{
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus('first',108),cactus('second',116),
    {id:'far-wall',kind:'building',theme:'desert',shape:'box',s:126,x:0,y:0,z:126,heading:0,halfX:4,halfZ:1,height:8});
  sweep(d,100,140,20);
  same(s.fallenCacti.map(item=>item.id),['first','second'],'one swept contact can break both cacti before a farther solid object');check(s.s<123,'breaking cacti cannot skip the solid wall later in the same sweep');
}
for(const [height,scale,hits] of [[6,1,false],[1,1,true],[5,2,true],[7,2,false]]){
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus('scaled-cactus',110,{scale}));
  sweep(d,100,120,20,{airborne:true,airHeight:height,prevAirHeight:height});
  same(s.fallenCacti.length,hits?1:0,'cactus knockdown respects scale-aware airborne clearance');
  same(s.lives,LIVES.start,'an airborne cactus contact has no extra crash cost');
}
{
  const d=fixture(),s=d.state;d.course.features.obstacles.push(cactus());sweep(d,100,120,20);const record=structuredClone(s.fallenCacti);
  s.paused=true;d.step(1);same(s.fallenCacti,record,'pause does not reset fallen scenery');s.paused=false;d._safeReset(s);same(s.fallenCacti,record,'safe vehicle recovery does not regrow cacti');
  Object.assign(s,{prevS:9999.9,s:10000.1,prevLateral:0,lateral:0,nextLapGate:3,speedMph:30,stageTimeSec:30});d._advanceLaps(s,dt);
  same(s.completedLaps,1,'fixture completes a validated first lap');same(s.fallenCacti,record,'fallen cacti remain down on the second lap');
  s.status='stage_result';d.nextStage();same(s.fallenCacti,[],'the next campaign stage has fresh scenery');
  straight(d);d.course.features.obstacles.push(cactus());sweep(d,100,120,20);d.startCampaign({startStage:stageIndex});same(s.fallenCacti,[],'a restarted run resets fallen cacti');
}

// Front/rear panels follow body orientation, not merely signed velocity.
{
  const d=fixture(),b=forwardHit(d);damagedOnly(d.state,'front','forward player impact');damagedOnly(b,'rear','rear-ended traffic');
  same([d.state.stageCrashes,d.state.lives],[0,LIVES.start],'a low-speed vehicle dent does not become a major crash');
}
{
  const d=fixture(),s=d.state,b=npc({s:100,prevS:100});Object.assign(s,{prevS:110,s:103,speedMph:-20,gear:-1});
  d._vehicleContact(s,b,'traffic');damagedOnly(s,'rear','reversing player impact');damagedOnly(b,'front','traffic hit by reversing player');
}
{
  const d=fixture(),s=d.state,b=npc({s:110,prevS:115,speedMph:10,dir:-1});Object.assign(s,{prevS:100,s:107,speedMph:10});
  d._vehicleContact(s,b,'head_on');damagedOnly(s,'front','head-on player');damagedOnly(b,'front','oncoming traffic body');
}
for(const side of [-1,1]){
  const d=fixture(),s=d.state,b=npc({s:100,prevS:100,lateral:side,prevLateral:side});
  Object.assign(s,{prevS:100,s:100,prevLateral:-side*5,lateral:-side,speedMph:0,pushVelocity:side*4});
  d._vehicleContact(s,b,'traffic');damagedOnly(s,side>0?'left':'right','player side impact');damagedOnly(b,side>0?'right':'left','other vehicle opposing side');
}
{
  const d=fixture(),a=npc({prevS:100,s:107,speedMph:20}),b=npc();d._vehicleContact(a,b,'traffic');
  damagedOnly(a,'front','NPC-to-NPC striking car');damagedOnly(b,'rear','NPC-to-NPC struck car');same(d.state.damageZones,zeroDamage(),'NPC-to-NPC collision cannot dent the player remotely');
}
for(const [speed,otherSpeed] of [[0,0],[1,0],[20,20]]){
  const d=fixture(),b=forwardHit(d,speed,otherSpeed);
  same(d.state.damageZones,zeroDamage(),'stationary, barely moving or matched-speed contact does not dent the player');same(b.damageZones,zeroDamage(),'stationary or matched-speed overlap cannot farm NPC damage');
}
{
  const d=fixture(),b=forwardHit(d,1.01);check(d.state.damageZones.front>0&&b.damageZones.rear>0,'meaningful contact just above 1 mph dents both cars');
  const soft=fixture(),softB=forwardHit(soft,5),hard=fixture(),hardB=forwardHit(hard,20);
  check(hardB.damageZones.rear>softB.damageZones.rear,'stronger closing speed creates a larger visible dent');
}
{
  const d=fixture(),s=d.state,b=forwardHit(d),first=[structuredClone(s.damageZones),structuredClone(b.damageZones)];
  for(let repeat=0;repeat<20;repeat++)forwardHit(d);
  same([s.damageZones,b.damageZones],first,'repeated same-frame overlaps cannot accumulate damage through cooldown');
  Object.assign(s,{s:1000,prevS:1000,speedMph:0});Object.assign(b,{s:1200,prevS:1200,speedMph:0});
  d.setInput({throttle:0,brake:0,steer:0});for(let frame=0;frame<180;frame++)d.step(dt);
  forwardHit(d);check(s.damageZones.front>first[0].front&&b.damageZones.rear>first[1].rear,'a new impact after normal simulation cooldown can dent both cars again');
  s.damageZones.front=b.damageZones.rear=4.99;s.damageCooldown=b.damageCooldown=0;forwardHit(d);
  same([s.damageZones.front,b.damageZones.rear],[5,5],'both cosmetic damage fields stop at the shared cap of five');
}
for(const protectedPlayer of [false,true]){
  const d=fixture(),s=d.state,b=npc({s:110,prevS:115,speedMph:80,dir:-1});Object.assign(s,{prevS:100,s:107,speedMph:80,invulnerableSec:protectedPlayer?2:0});
  d._vehicleContact(s,b,'head_on');check(b.damageZones.front>0,'the NPC always receives its own high-speed impact damage');
  if(protectedPlayer){same(s.damageZones,zeroDamage(),'recovery protection still prevents player damage');same([s.stageCrashes,s.majorCrashes,s.lives],[0,0,LIVES.start],'recovery protection prevents a duplicate player crash');}
  else{check(s.damageZones.front>0,'unprotected high-speed player impact still damages its front');same([s.stageCrashes,s.majorCrashes,s.lives],[1,1,LIVES.start-1],'real high-speed collision keeps the established player crash policy');same(s.racePenaltySec,LIVES.crashPenaltySec,'existing collision time penalty is unchanged');}
}
for(const kind of ['rival','police']){
  const d=fixture(),s=d.state,b=npc({prevS:100,s:107,speedMph:50});Object.assign(s,{prevS:110,s:110,speedMph:10});
  if(kind==='rival')s.rival=b;else s.police.pursuit=b;
  d._vehicleContact(s,b,kind);check(b.yieldingToPlayer,`${kind} still yields after its late rear contact`);
  damagedOnly(s,'rear',`${kind} cosmetic rear hit on player`);damagedOnly(b,'front',`${kind} cosmetic front impact`);
  same([s.s,s.speedMph,s.stageCrashes,s.majorCrashes,s.lives],[110,10,0,0,LIVES.start],`${kind} cosmetic damage cannot remove rear-yield player safety`);
}
{
  const d=fixture(),s=d.state,b=npc();Object.assign(s,{prevS:100,s:107,speedMph:20,airborne:true,airHeight:5});
  same(d._vehicleContact(s,b,'traffic'),false,'a car passing above another does not collide');same(s.damageZones,zeroDamage(),'airborne clearance prevents phantom player damage');same(b.damageZones,zeroDamage(),'airborne clearance prevents phantom NPC damage');
}

// No breakable-prop wallet side channel: only a completed race can pay.
{
  memory.clear();const app=new App();app.profile.credits=2000;app._saveProfile();app.startCampaign({startStage:stageIndex,mode:'timetrial'});app.advance(4);straight(app.duel);
  const d=app.duel,s=d.state,history=app.profile.history.length,bests=JSON.stringify(app.profile.personalBests),board=JSON.stringify(app.leaderboard),ghosts=JSON.stringify(app.ghosts);
  for(let i=0;i<5;i++){d.course.features.obstacles.push(cactus(`farm-${i}`,110+i*10));sweep(d,100+i*10,120+i*10,100);}
  same(app.profile.credits,2000,'breaking any number of cacti does not directly award credits');same(app.profile.history.length,history,'cactus contact is not a settled race');same(JSON.stringify(app.profile.personalBests),bests,'cactus contact cannot create car bests');
  same(JSON.stringify(app.leaderboard),board,'cactus contact cannot enter the leaderboard');same(JSON.stringify(app.ghosts),ghosts,'cactus contact cannot save a best ghost');
  check(app.requestNavigation('menu'),'one-click Exit still settles this attempt');same(app.profile.credits,2000,'quitting after breakable contacts preserves the bank');same(app.profile.history.at(-1).reward,0,'abandoning cactus farming produces zero credit earnings');
}
console.log(`Contact damage: ${checks} checks passed (first-hit cacti, occlusion, reset, signed contacts, both vehicle faces, NPCs, cooldown, major-crash policy and no credit farming).`);
