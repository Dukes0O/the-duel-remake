import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {CARS,DRIVE,LIVES,POLICE,TRAFFIC} from '../src/config.js';
import {planNpcYield,vehicleContactEnvelope} from '../src/npc-yielding.js';
import {sweepObstacle} from '../src/collision.js';

let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
const equal=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;};
const clean=()=>({front:0,rear:0,left:0,right:0});
function fixture({car='falcone_f42',cpuDifficulty='easy',closed=false}={}){
  const duel=new Duel({seed:1989});duel.startCampaign({car,cpuDifficulty,mode:'timetrial'});
  const point=(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0,curvature:0});
  duel.course={def:{theme:'desert'},closed,length:closed?1000:10000,raceLength:closed?2000:20000,
    features:{obstacles:[],shortcuts:[],flocks:[],radarTraps:[],crushables:[]},
    at:s=>point(s),worldAt:point,groundAt:point,phase:s=>closed?(s%1000+1000)%1000:s,
    nearest:(x,z)=>({s:z,lateral:x}),roadHalfWidthAt:()=>7,themeAt:()=> 'desert',nearestRadar:()=>null,
    surfaceAt:(_,lateral)=>({road:Math.abs(lateral)<=7,mainRoad:Math.abs(lateral)<=7,roadHalfWidth:7}),
    obstaclesNear:()=>duel.course.features.obstacles,
  };
  duel._lapGates=closed?[250,500,750]:[2500,5000,7500];duel._obstacleQueryCache=new Map();duel._obstacleArray=duel.course.features.obstacles;
  Object.assign(duel.state,{status:'racing',s:closed?12:390,prevS:closed?12:390,lateral:-3.4,prevLateral:-3.4,
    speedMph:0,rival:null,traffic:[],lapsTotal:2,damageZones:clean(),combo:2,comboTimer:3});
  return duel;
}
function addNpc(duel,kind,{speed=80,dir=1,gap=65,...values}={}){
  const s=duel.state,car={s:s.s-gap*dir,prevS:s.s-gap*dir,lateral:s.lateral,prevLateral:s.lateral,speedMph:speed,dir,
    alive:true,active:true,headingError:0,pushVelocity:0,contactCooldown:0,damageZones:clean(),damageCooldown:0,
    completedLaps:0,nextLapGate:3,lapTimes:[],lapStartedAt:0,finished:false,...values};
  if(kind==='traffic')s.traffic=[car];else if(kind==='rival')s.rival=car;else s.police.pursuit=car;
  return car;
}
const protectedState=state=>JSON.stringify(Object.fromEntries(['s','lateral','speedMph','headingError','yawVelocity','pushVelocity','lives','majorCrashes','stageCrashes','impactTimer','damageZones','damageCooldown','score','stageStyleScore','combo','drift','racePenaltySec'].map(key=>[key,state[key]])));
function move(duel,kind,actor,dt){
  if(kind==='traffic')duel._traffic(dt);else if(kind==='rival')duel._rival(dt);else duel._movePolice(actor,dt);
  duel._collisions();
}

// A traffic contact used to leave yaw permanently nonzero even though traffic
// continued along its road-relative lane. Its diagonal shell then caused a
// repeat rear-end crash at each pass. Moving recovery must be bounded, retain
// the same lane/speed integration, and leave stationary blockers untouched.
for(const dir of [1,-1])for(const angle of [-.65,.65])for(const dt of [1/120,.05]){
  const d=fixture(),s=d.state,lane=dir<0?3.4:-3.4;
  const npc=addNpc(d,'traffic',{dir,gap:700,speed:45,lateral:lane,prevLateral:lane,headingError:angle});
  const start=npc.s,player=protectedState(s);let steps=0;
  for(let time=0;time<2-1e-9;time+=dt){
    const before=npc.headingError;d._traffic(dt);steps++;
    check(Math.abs(npc.headingError-before)<=.95*dt+1e-10,'moving traffic countersteers without an instant yaw reset');
    check(Math.abs(npc.headingError)<=Math.abs(before)+1e-10,'lane-centred contact yaw decays instead of persisting');
  }
  equal(npc.headingError,0,'moving traffic recovers its road-relative heading in either travel direction');
  check(Math.abs(npc.s-(start+dir*45*DRIVE.mphToWorld*steps*dt))<1e-8,'heading repair preserves original traffic forward integration');
  equal(npc.lateral,lane,'heading repair does not move a centred sedan sideways');
  equal(protectedState(s),player,'heading recovery never moves or damages the player');
}
for(const dir of [1,-1])for(const offset of [-1.4,1.4]){
  const d=fixture(),lane=dir<0?3.4:-3.4;
  const npc=addNpc(d,'traffic',{dir,gap:700,speed:45,lateral:lane+offset,prevLateral:lane+offset});
  for(let frame=0;frame<120;frame++)d._traffic(1/120);
  check(Math.sign(npc.headingError)===-Math.sign(offset)*dir,'oncoming and forward traffic point toward their lane-return movement');
  check(Math.abs(npc.headingError-Math.atan(-Math.sign(offset)*.7/(dir*45*DRIVE.mphToWorld)))<1e-8,'recovered heading matches the existing lateral/longitudinal traffic path');
}
for(const dir of [1,-1]){
  const d=fixture(),s=d.state,lane=dir<0?3.4:-3.4;s.lateral=s.prevLateral=lane;
  const npc=addNpc(d,'traffic',{dir,gap:6,speed:0,cruiseSpeedMph:80,lateral:lane,prevLateral:lane,headingError:.65});
  const stoppedGap=vehicleContactEnvelope(s,npc,d._vehicleSpec(s),d._vehicleSpec(npc)).length+.79;
  npc.s=npc.prevS=s.s-dir*stoppedGap;
  const player=protectedState(s),start=npc.s;
  for(let frame=0;frame<120;frame++)move(d,'traffic',npc,1/120);
  equal(npc.headingError,.65,'a blocked stationary sedan does not pivot its shell into the player');
  equal(npc.s,start,'a true stopped yielding sedan does not creep during heading recovery');
  equal(protectedState(s),player,'stationary angled NPC remains harmless to the blocking player');
}

// Actual NPC integrations stop without a single forced player correction, then
// accelerate again when the obstacle clears. Include long-frame substep sizes.
for(const kind of ['traffic','rival','police'])for(const dir of kind==='traffic'?[1,-1]:[1])for(const cpuDifficulty of ['easy','medium','hard'])for(const dt of [1/120,.05]){
  const d=fixture({cpuDifficulty}),s=d.state;if(dir<0)s.lateral=s.prevLateral=3.4;
  const npc=addNpc(d,kind,{dir}),before=protectedState(s);let braked=false;
  for(let time=0;time<12;time+=dt){
    move(d,kind,npc,dt);braked ||= npc.braking&&npc.yieldingToPlayer;
    equal(protectedState(s),before,`${kind}/${dir}/${cpuDifficulty}: NPC movement never changes the blocking player`);
    check(npc.speedMph>=0&&Number.isFinite(npc.s),`${kind}: yielding never reverses or corrupts NPC motion`);
  }
  check(braked&&npc.speedMph===0,`${kind}/${dir}: sustained blockage ends in a true zero-speed stop`);
  const envelope=vehicleContactEnvelope(s,npc,d._vehicleSpec(s),d._vehicleSpec(npc));
  check((d.relativeS(s.s,npc.s)-npc.s)*dir>=envelope.length,`${kind}/${dir}: stopped shells do not overlap`);
  equal(npc.damageZones,clean(),`${kind}: a safe stop does not dent either car`);
  const stoppedAt=npc.s;s.lateral=s.prevLateral=dir<0?-3.4:3.4;let resumedSpeed=0;
  for(let time=0;time<2;time+=dt){move(d,kind,npc,dt);resumedSpeed=Math.max(resumedSpeed,npc.speedMph);}
  // Pursuit can brake again after turning toward the player's new lane.
  check(resumedSpeed>5&&(npc.s-stoppedAt)*dir>1,`${kind}/${dir}: clear lane resumes real forward motion`);
}

for(const kind of ['traffic','rival','police'])for(const dir of kind==='traffic'?[1,-1]:[1]){
  const d=fixture({closed:true}),s=d.state;if(dir<0)s.lateral=s.prevLateral=3.4;
  const npc=addNpc(d,kind,{dir});npc.s=npc.prevS=(npc.s+1000)%1000;
  const before=protectedState(s);
  for(let i=0;i<1440;i++)move(d,kind,npc,1/120);
  check(npc.yieldingToPlayer&&npc.speedMph===0,`${kind}/${dir}: shortest lap-relative gap stops at the seam`);
  equal(protectedState(s),before,'lap wrap cannot create player push, damage or penalty');
}

// The production order also drives the player, resolves scenery, updates the
// other cars and checks contacts. Use the real seeded Pacific road for this.
for(const [kind,dir]of [['traffic',1],['traffic',-1],['rival',1]]){
  const d=new Duel({seed:1989});d.startCampaign({cpuDifficulty:'easy',mode:'timetrial'});
  const s=d.state,lateral=dir<0?3.4:-3.4;
  Object.assign(s,{status:'racing',s:390,prevS:390,lateral,prevLateral:lateral,traffic:[],rival:null});
  const npc=addNpc(d,kind,{dir});
  for(let frame=0;frame<1440;frame++)d.step(1/120);
  equal([s.s,s.lateral,s.speedMph,s.pushVelocity,s.impactTimer],[390,lateral,0,0,0],`${kind}/${dir}: real fixed-step order leaves a stationary blocker untouched`);
  equal([s.lives,s.stageCrashes,s.damageZones],[LIVES.start,0,clean()],'real seeded road produces no NPC-caused damage');
  check(npc.speedMph===0&&npc.yieldingToPlayer,'real road integration reaches a stable stop');
}

// Exact protective contact fallback: first sweep has already entered the shell
// before a normal braking step can help. Resolve only the NPC in either order.
for(const kind of ['traffic','rival','police'])for(const reverseOrder of [false,true])for(const contact of ['rear','side','oncoming','cut-in','stationary-overlap']){
  const d=fixture(),s=d.state,npc=addNpc(d,kind);s.lateral=s.prevLateral=0;
  Object.assign(npc,{lateral:0,prevLateral:0});
  if(contact==='rear')Object.assign(npc,{prevS:s.s-15,s:s.s-2,speedMph:120});
  if(contact==='oncoming')Object.assign(npc,{prevS:s.s+15,s:s.s+2,speedMph:120,dir:-1});
  if(contact==='side')Object.assign(npc,{s:s.s,prevS:s.s,prevLateral:5,lateral:1,speedMph:0,pushVelocity:-8});
  if(contact==='cut-in'){
    Object.assign(s,{speedMph:20,prevS:s.s-.2,prevLateral:5,lateral:1,headingError:-.2});
    Object.assign(npc,{prevS:s.s-9,s:s.s-2,speedMph:120});
  }
  if(contact==='stationary-overlap')Object.assign(npc,{s:s.s-2,prevS:s.s-2,speedMph:0});
  const before=protectedState(s);
  check(reverseOrder?d._vehicleContact(npc,s,kind):d._vehicleContact(s,npc,kind),`${contact}: fixture actually contacts`);
  equal(protectedState(s),before,`${kind}/${contact}: fallback preserves player physics, damage, drift and rewards`);
  equal(npc.damageZones,clean(),`${kind}/${contact}: safe NPC-only correction is not a damage event`);
  check(npc.yieldingToPlayer&&npc.braking,`${kind}/${contact}: fallback signals yielding/braking`);
  const box=vehicleContactEnvelope(s,npc,d._vehicleSpec(s),d._vehicleSpec(npc));
  check(Math.abs(s.lateral-npc.lateral)>=box.width||Math.abs(d.relativeS(npc.s,s.s)-s.s)>=box.length,`${contact}: fallback fully separates shells`);
}

// A lateral sweep normal during a rear cut-in used to push the yielding NPC
// into a nearby wall, then ratchet it through on subsequent static contacts.
for(const kind of ['traffic','rival','police']){
  const d=fixture(),s=d.state,npc=addNpc(d,kind,{s:388,prevS:381,lateral:0,prevLateral:0,speed:120});
  Object.assign(s,{s:390,prevS:389.8,lateral:1,prevLateral:5,speedMph:20,headingError:-.2});
  const wall={id:'yield-wall',kind:'building',s:388,off:-2.5,x:-2.5,y:0,z:388,heading:0,halfX:.25,halfZ:20,height:8};
  d.course.features.obstacles.push(wall);const before=protectedState(s);
  d._collisions();if(kind==='police')d._vehicleContact(s,npc,'police');
  equal(protectedState(s),before,'wall-aware yielding still never shifts or dents the player');
  const clearWall=()=>{const point=d.course.worldAt(npc.s,npc.lateral);return !sweepObstacle(point,point,wall,npc.headingError||0,d._vehicleSpec(npc));};
  check(clearWall()&&npc.lateral>-2.5,'late rear cut-in retreats along the lane without embedding in the wall');
  Object.assign(s,{prevS:s.s,prevLateral:s.lateral,headingError:0,speedMph:0});
  for(let frame=0;frame<60;frame++){move(d,kind,npc,1/120);check(clearWall()&&npc.lateral>-2.5,'repeated blocked frames cannot ratchet an NPC through roadside scenery');}
  equal(s.damageZones,clean(),'wall-constrained NPC never transfers damage to the waiting player');
}
for(const axis of ['longitudinal','lateral']){
  const d=fixture(),s=d.state,npc=addNpc(d,'traffic');s.lateral=s.prevLateral=0;
  const wall=axis==='longitudinal'
    ? {id:'thin-wall',kind:'building',s:380,off:0,x:0,y:0,z:380,heading:0,halfX:20,halfZ:.1,height:8}
    : {id:'thin-wall',kind:'building',s:390,off:3,x:3,y:0,z:390,heading:0,halfX:.1,halfZ:20,height:8};
  if(axis==='longitudinal')Object.assign(npc,{prevS:375,s:388,lateral:0,prevLateral:0,speedMph:120});
  else Object.assign(npc,{prevS:390,s:390,lateral:1,prevLateral:5,speedMph:0,pushVelocity:-8});
  d.course.features.obstacles.push(wall);const before=protectedState(s);
  d._vehicleContact(s,npc,'traffic');
  equal(protectedState(s),before,'thin-wall protection leaves the player unchanged');
  check(axis==='longitudinal'?npc.s<wall.s-2.45:npc.lateral>wall.x+1.12,'a clear endpoint beyond a thin wall is rejected when its correction sweep crosses the wall');
}

// Player-caused impacts stay real, including reversing into stopped NPCs and
// driving head-on toward an oncoming car. Both bodies keep their damage hooks.
for(const kind of ['traffic','rival','police'])for(const contact of ['front','reverse','side','head-on']){
  const d=fixture(),s=d.state,npc=addNpc(d,kind);s.lateral=s.prevLateral=0;
  Object.assign(npc,{lateral:0,prevLateral:0,s:s.s+10,prevS:s.s+10,speedMph:0});
  if(contact==='front')Object.assign(s,{prevS:s.s,s:s.s+7,speedMph:80});
  if(contact==='reverse'){Object.assign(npc,{s:s.s-10,prevS:s.s-10});Object.assign(s,{prevS:s.s,s:s.s-7,speedMph:-22,gear:-1});}
  if(contact==='side'){Object.assign(npc,{s:s.s,prevS:s.s,lateral:1,prevLateral:1});Object.assign(s,{prevLateral:-5,lateral:-1,pushVelocity:4});}
  if(contact==='head-on'){Object.assign(npc,{s:s.s+3,prevS:s.s+10,dir:-1,speedMph:80});s.speedMph=80;}
  check(d._vehicleContact(s,npc,kind),`${contact}: intentional impact contacts`);
  check(Object.values(s.damageZones).some(value=>value>0),`${kind}/${contact}: player-initiated contact retains player damage`);
  check(Object.values(npc.damageZones).some(value=>value>0),`${kind}/${contact}: player ram dents the other vehicle`);
  if(contact==='front'||contact==='head-on')equal(s.lives,LIVES.start-1,'a high-speed player ram still costs a life');
}

// Large and sideways player shells block the real footprint; a distant branch
// or parallel safe pass does not become an invisible whole-road stop trigger.
for(const car of Object.keys(CARS))for(const heading of [0,Math.PI/2]){
  const d=fixture({car}),s=d.state,npc=addNpc(d,'traffic',{gap:8,speed:100});s.headingError=heading;
  const plan=d._npcYield(npc,100);
  check(plan.yielding&&plan.targetMph<100,`${car}: own turned collision shell controls yielding`);
  s.lateral=50;
  equal(d._npcYield(npc,100).targetMph,100,`${car}: separated shortcut does not block the main lane`);
}
{
  const d=fixture(),s=d.state,npc=addNpc(d,'traffic',{gap:8,speed:100});
  s.lateral=npc.lateral+5;s.headingError=-.3;s.speedMph=80;
  check(d._npcYield(npc,100).yielding,'future player cut-in brakes before current shells overlap');
  s.headingError=0;s.speedMph=0;
  const envelope=vehicleContactEnvelope(s,npc,d._vehicleSpec(s),d._vehicleSpec(npc));
  check(planNpcYield({player:s,npc,lead:12,envelope,targetMph:100,plannedHeading:.3}).yielding,'planned NPC side merge anticipates a stationary blocker');
  s.lateral=npc.lateral;s.airborne=true;s.airHeight=10;
  equal(d._npcYield(npc,100).targetMph,100,'a vertically clear overflight does not block a grounded NPC');
}
for(const dir of [1,-1]){
  const d=fixture(),s=d.state;Object.assign(s,{prevS:380,s:400,speedMph:100,lateral:0,prevLateral:0});
  const npc=addNpc(d,'traffic',{dir,s:390,prevS:390,lateral:TRAFFIC.collideLatU+.2,prevLateral:TRAFFIC.collideLatU+.2,speed:0});
  d._collisions();equal(s.nearMisses,1,'a clear adjacent pass retains the near-miss reward');
  equal(s.damageZones,clean(),'a rewarded near miss is not a hidden collision');
}
{
  const d=fixture(),s=d.state,npc=addNpc(d,'police',{gap:POLICE.pursuitCatchU-1,speed:0});
  d._police(1/120);equal(s.status,'ticket','police still ticket at the unchanged catch radius');
  equal(s.police.ticket.fine,POLICE.ticketBaseFine,'yielding does not change the fine');
  equal(s.damageZones,clean(),'catching/ticketing is not permission to damage the player');
}
console.log(`NPC yielding: ${checks} stop/resume, bidirectional traffic, cut-in, seam, responsibility, shell, reward and police-rule checks passed.`);
