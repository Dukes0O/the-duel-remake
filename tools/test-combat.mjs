import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createProfile,bestKey} from '../src/progression.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createLeaderboard,recordFinish} from '../src/leaderboard.js';
import {stepCombat,fireWeapon} from '../src/combat.js';
import {createCombatScene} from '../src/combat-scene.js';
globalThis.cancelAnimationFrame=()=>{};
const make=()=>{const d=new Duel({seed:1989});d.startCampaign({mode:'wasteland',startStage:0});d.state.status='racing';d.state.invulnerableSec=0;d.state.s=100;d.state.rival.s=150;return d;};
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
let d=make(),s=d.state;
check(s.mode==='wasteland'&&s.rival&&s.combat,'combat mode spawns a rival and weapons');
check(d.fireWeapon('ufo'),'UFO fires');check(s.s===150&&s.rival.s===100&&s.prevS===150,'UFO swaps and resets sweep origin');
check(!d.fireWeapon('ufo'),'UFO cannot spam');s.paused=true;const cd=s.combat.cooldowns.ufo;d.step(1);check(cd===s.combat.cooldowns.ufo&&!d.fireWeapon('star'),'pause freezes weapons');s.paused=false;
d=make();s=d.state;s.rival.s=90;d.fireWeapon('ufo');check(s.s>100&&s.s<d._lapGates[0],'forward warp stops before next checkpoint');
d=make();s=d.state;const r=s.rival;r.s=d.course.length+500;r.completedLaps=1;r.nextLapGate=1;r.lapTimes=[55.2];r.lapStartedAt=55.2;s.stageTimeSec=60;d.fireWeapon('ufo');check(s.completedLaps===1&&s.nextLapGate===1&&r.completedLaps===0,'swap transfers valid route progress');
assert.deepEqual(r.lapTimes,[55.2],'a rival keeps prior lap history even when the swap transfers its completed-lap progress');checks++;
// Route position and checkpoints trade places, but each driver keeps the lap
// times already driven and the start time of the current lap.
d=make();s=d.state;const rival=s.rival,length=d.course.length;
s.s=length+100;rival.s=length+150;s.completedLaps=rival.completedLaps=1;
s.nextLapGate=0;rival.nextLapGate=2;s.lapTimes=[55.2];rival.lapTimes=[53.6];
s.assistedLaps=[false];rival.assistedLaps=[false];
s.lapStartedAt=55.2;rival.lapStartedAt=53.6;s.stageTimeSec=70;
const lapEvents=[];d.onChange((_,event)=>{if(event.lapCompleted)lapEvents.push(event);});
check(d.fireWeapon('ufo'),'UFO swaps two drivers who have completed a lap');
check(s.nextLapGate===2&&rival.nextLapGate===0,'UFO exchanges checkpoint progress with route position');
assert.deepEqual(s.lapTimes,[55.2],'player keeps completed lap history after UFO swap');checks++;
assert.deepEqual(rival.lapTimes,[53.6],'rival keeps completed lap history after UFO swap');checks++;
check(s.lapStartedAt===55.2&&rival.lapStartedAt===53.6,'UFO keeps both running lap timers');
check(s.assistedLap===true&&rival.assistedLap===true,'UFO flags both current laps as assisted');
s.s=2*length-1;s.prevS=s.s;s.lateral=s.prevLateral=0;s.speedMph=100;s.stageTimeSec=80;
s.nextLapGate=d._lapGates.length;s.s=2*length+1;d._advanceLaps(s,.05,true);
check(s.lapTimes.length===2&&s.assistedLaps?.[0]===false&&s.assistedLaps[1]===true&&lapEvents.at(-1)?.assisted===true,
  'the next completed lap retains an assisted flag for best-lap eligibility');
check(d._finishStage(),'the completed swap race produces a result');
assert.deepEqual(s.results.assistedLaps,[false,true],'finished results retain assisted flags beside both lap times');checks++;
check(s.results.assistedLaps!==s.assistedLaps,'finished assisted flags are a result snapshot');
d.nextStage();
check(d.state===s&&s.stageIndex===1&&s.assistedLaps.length===0&&s.assistedLap===false,
  'a new stage clears the previous stage assisted-lap flags');
d=make();s=d.state;const cleanLength=d.course.length;
s.s=cleanLength-1;s.prevS=s.s;s.lateral=s.prevLateral=0;s.speedMph=100;s.stageTimeSec=60;
s.nextLapGate=d._lapGates.length;s.s=cleanLength+1;d._advanceLaps(s,.05,true);
check(s.assistedLaps?.[0]===false,'a lap without a swap remains eligible for a best lap');
// A swap must land each car facing the way the previous occupant faced, with
// speed that suits the destination and a short window free of crash damage.
d=make();s=d.state;s.traffic=[];s.headingError=.34;s.slipAngle=.12;s.crashSpin=.05;s.speedMph=305;
s.rival.headingError=-.47;s.rival.speedMph=190;s.rival.lateral=40;
const landingLimit=d._drivingSurface(s.rival.s,s.rival.lateral,d.rivalSpec).speedLimit;
check(d.fireWeapon('ufo'),'UFO fires into an off-road rival position');
check(Math.abs(s.headingError+.47)<1e-9&&Math.abs(s.rival.headingError-.51)<1e-9,
  'both swapped cars keep the destination heading');
check(s.speedMph<=landingLimit&&s.rival.speedMph<=d._drivingSurface(s.rival.s,s.rival.lateral).speedLimit,
  'both swapped cars receive a speed cap for their new surface');
const landingCrashes=s.stageCrashes,rivalWear=s.rival.damageZones.front;
d._crash('rock',1,100);d._dentVehicle(s.rival,'front',100);
check(s.stageCrashes===landingCrashes&&s.rival.damageZones.front===rivalWear,
  'both cars reject crash damage immediately after landing');
stepCombat(d,1.19);d._crash('rock',1,100);d._dentVehicle(s.rival,'front',100);
check(s.stageCrashes===landingCrashes&&s.rival.damageZones.front===rivalWear,
  'both cars retain crash protection until 1.2 seconds after landing');
stepCombat(d,.02);d._crash('rock',1,100);d._dentVehicle(s.rival,'front',100);
check(s.stageCrashes===landingCrashes+1&&s.rival.damageZones.front>rivalWear,
  'ordinary crash damage resumes after the landing protection expires');
d=new Duel({seed:1989});d.startCampaign({mode:'wasteland',startStage:0,cpuDifficulty:'hard'});
s=d.state;s.status='racing';s.traffic=[];const cut=d.course.features.shortcuts[0];
s.s=cut.start-155;s.lateral=-3.4;s.speedMph=140;
s.rival.s=cut.start-135;s.rival.lateral=-3.4;s.rival.speedMph=140;
d._rival(1/120);check(s.rival.routeId===cut.id,'hard rival commits to a branch before the swap');
check(d.fireWeapon('ufo'),'UFO exchanges a committed rival route');
check(s.routeId===cut.id&&s.routeLap===1,'the player receives the destination route context');
check(d._npcRoutePlanner.routeFor(s.rival)===null&&s.rival.routeId==null,
  'the rival abandons its stale branch plan after landing before the entry');
d=new Duel({seed:1989});d.startCampaign({mode:'wasteland',startStage:0,cpuDifficulty:'hard'});
s=d.state;s.status='racing';s.traffic=[];const branch=d.course.features.shortcuts[0];
s.s=(branch.start+branch.end)/2;s.lateral=d.course.shortcutOffset(branch,s.s);s.speedMph=120;
s.rival.s=s.s+30;s.rival.lateral=-3.4;s.rival.speedMph=120;
check(d.fireWeapon('ufo'),'UFO swaps a rival onto an occupied shortcut');
check(s.rival.routeId===branch.id&&d._npcRoutePlanner.routeFor(s.rival)?.routeId===branch.id,
  'the rival plans along the shortcut it lands on');
d=make();s=d.state;check(d.fireWeapon('star'),'star activates');const speed=s.speedMph=100;d._crash('rock',1,100);check(s.speedMph===speed&&s.stageCrashes===0,'star blocks crash damage');for(let i=0;i<99;i++)stepCombat(d,.05);check(s.combat.shield>0,'star lasts until five seconds');stepCombat(d,.05);check(s.combat.shield<1e-8,'star expires after five seconds');
d=make();s=d.state;check(d.fireWeapon('bomb')&&s.combat.projectiles.length===8,'bomb storm throws eight bombs');check(new Set(s.combat.projectiles.map(p=>Math.atan2(p.vx,p.vz).toFixed(2))).size===8,'bombs travel in eight directions');for(let i=0;i<40;i++)stepCombat(d,.05);check(s.combat.projectiles.length===0&&s.combat.bursts.length>0,'bombs expire into explosions');
// A removed traffic car remains in the array for a while. Its old position
// must not produce an invisible hit, while a live car there still takes damage.
d=make();s=d.state;s.s=500;s.rival.s=550;
const traffic={s:100,lateral:0,airHeight:0,speedMph:80,alive:false,crushed:false,
  damageZones:{front:0,rear:0,left:0,right:0},pushVelocity:0,headingError:0};
s.traffic=[traffic];
const blastHits=[];d.onChange((_,event)=>{if(event.combatHit)blastHits.push(event);});
const blastTraffic=()=>{const ground=d.course.groundAt(traffic.s,traffic.lateral);
  s.combat.projectiles.push({kind:'bomb',enemy:false,level:0,x:ground.x,y:ground.y+3,z:ground.z,
    vx:0,vy:0,vz:0,age:1.5});stepCombat(d,.01);};
blastTraffic();
check(traffic.speedMph===80&&traffic.damageZones.rear===0&&blastHits.length===0,
  'bomb blasts ignore removed traffic without an invisible hit');
traffic.alive=true;blastTraffic();
check(traffic.speedMph<80&&traffic.damageZones.rear>0&&blastHits.length===1,
  'bomb blasts still damage live traffic at the same position');
check(blastHits[0].victim==='traffic','combat hit identifies traffic as the bomb victim');
d=make();s=d.state;s.rival.s=120;s.rival.lateral=s.lateral;s.rival.speedMph=100;
const arrowHits=[];d.onChange((_,event)=>{if(event.combatHit)arrowHits.push(event);});
check(d.fireWeapon('crossbow'),'crossbow fires');for(let i=0;i<10;i++)stepCombat(d,.02);check(s.combat.hits===1&&s.rival.speedMph<100&&Math.abs(s.rival.pushVelocity)>0,'swept arrow hits and shoves the opponent');
check(arrowHits.some(event=>!event.enemy&&event.victim==='rival'),
  'player arrow hit identifies the rival as its victim');
{
 const hits=[];d.onChange((_,event)=>{if(event.combatHit)hits.push(event);});
 const player=d.course.groundAt(s.s,s.lateral);
 s.invulnerableSec=0;
 s.combat.projectiles.push({kind:'bomb',enemy:true,level:0,x:player.x,y:player.y+3,z:player.z,
   vx:0,vy:0,vz:0,age:1.5});stepCombat(d,.01);
 check(hits.some(event=>event.enemy&&event.victim==='player'),
   'enemy bomb hit identifies the player as its victim');
}
// Aim each projectile at a rotated car so dents follow the struck body panel,
// rather than the road axis or a fixed rear-panel fallback.
for(const kind of ['bomb','crossbow'])for(const zone of ['front','rear','left','right']){
  d=make();s=d.state;s.headingError=.4;s.slipAngle=.15;
  const at=d.course.groundAt(s.s,s.lateral),heading=at.heading+s.headingError+s.slipAngle;
  const forward={x:Math.sin(heading),z:Math.cos(heading)},left={x:Math.cos(heading),z:-Math.sin(heading)};
  const direction={front:forward,rear:{x:-forward.x,z:-forward.z},left,right:{x:-left.x,z:-left.z}}[zone];
  const distance=kind==='bomb'?8:1;
  s.combat.projectiles.push({kind,enemy:true,level:0,x:at.x+direction.x*distance,
    y:at.y+1,z:at.z+direction.z*distance,vx:0,vy:0,vz:0,age:kind==='bomb'?1.5:0});
  stepCombat(d,.01);
  check(s.damageZones[zone]>0&&Object.entries(s.damageZones).every(([name,wear])=>name===zone||wear===0),
    `${kind} from ${zone} dents only the struck panel on a rotated car`);
}
// NPC render headings omit slip and crash spin; oncoming traffic also faces
// against the course. Hit zones must use those same displayed orientations.
d=make();s=d.state;s.rival.headingError=.2;s.rival.slipAngle=.8;s.rival.crashSpin=.8;
let at=d.course.groundAt(s.rival.s,s.rival.lateral),heading=at.heading+s.rival.headingError;
s.combat.projectiles.push({kind:'crossbow',enemy:false,level:0,x:at.x+Math.sin(heading),
  y:at.y+2,z:at.z+Math.cos(heading),vx:0,vy:0,vz:0,age:0});
stepCombat(d,.01);
check(s.rival.damageZones.front>0&&Object.entries(s.rival.damageZones).every(([name,wear])=>name==='front'||wear===0),
  'crossbow dents the rival visible front despite stored slip and crash spin');
d=make();s=d.state;s.s=500;s.rival.s=550;
const oncoming={s:100,lateral:0,airHeight:0,speedMph:80,alive:true,crushed:false,dir:-1,
  damageZones:{front:0,rear:0,left:0,right:0},pushVelocity:0,headingError:.2,slipAngle:.8,crashSpin:.8};
s.traffic=[oncoming];at=d.course.groundAt(oncoming.s,oncoming.lateral);
heading=at.heading+Math.PI+oncoming.headingError;
s.combat.projectiles.push({kind:'bomb',enemy:false,level:0,x:at.x+8*Math.sin(heading),
  y:at.y+4,z:at.z+8*Math.cos(heading),vx:0,vy:0,vz:0,age:1.5});
stepCombat(d,.01);
check(oncoming.damageZones.front>0&&Object.entries(oncoming.damageZones).every(([name,wear])=>name==='front'||wear===0),
  'bomb dents the oncoming traffic visible front despite stored slip and crash spin');
d=make();s=d.state;s.rival.s=120;s.rival.lateral=s.lateral;s.speedMph=100;fireWeapon(d,'star');fireWeapon(d,'crossbow',true);for(let i=0;i<10;i++)stepCombat(d,.02);check(s.speedMph===100,'shield blocks incoming arrows');
d=make();s=d.state;s.combat.aiTimer=0;stepCombat(d,.05);check(s.combat.projectiles.some(p=>p.enemy),'CPU shoots back');
d=make();s=d.state;for(let i=0;i<200;i++){fireWeapon(d,'bomb',true);stepCombat(d,.05);}check(s.combat.projectiles.length<=40&&s.combat.bursts.length<=32,'pools remain bounded');
const scene=createCombatScene();scene.update(d);check(scene.group.visible,'combat visuals are visible');d.startCampaign({mode:'duel'});scene.update(d);check(!scene.group.visible&&!d.state.combat&&!d.fireWeapon('bomb'),'ordinary mode disables combat and visuals');scene.dispose();
check(normalizeRaceSettings({mode:'wasteland'},createProfile()).mode==='wasteland','combat selection persists');
const app=new App();app.startCampaign({mode:'wasteland'});app.restart();check(app.duel.state.mode==='wasteland'&&app.duel.state.combat.projectiles.length===0,'restart keeps mode and resets weapons');app.dispose();
const base={stageIndex:0,seed:1989,laps:2,car:'falcone_f42',mode:'duel',completed:true,won:true,timeSec:150,cpuDifficulty:'easy',difficulty:'casual'};
check(bestKey(base)!==bestKey({...base,mode:'wasteland'}),'personal bests stay separate');
let board=recordFinish(createLeaderboard(),base,{id:'test',name:'Test'}).board;board=recordFinish(board,{...base,mode:'wasteland',timeSec:100},{id:'test',name:'Test'}).board;check(board.entries.length===2,'combat cannot replace ordinary leaderboard records');
const race=new App();race.autopilot=true;race.startCampaign({mode:'wasteland',car:'falcone_f42',cpuDifficulty:'easy'});race._scriptedCrashDone=true;
let lastFire=-1;
for(let i=0;i<5000&&['countdown','racing'].includes(race.duel.state.status);i++){
 const time=Math.floor(race.duel.state.stageTimeSec/12);
 if(time!==lastFire&&race.duel.state.status==='racing'){race.duel.fireWeapon('star');race.duel.fireWeapon('bomb');race.duel.fireWeapon('crossbow');race.duel.fireWeapon('ufo');lastFire=time;}
 race.advance(.1);
}
check(race.duel.state.results?.completed===true,'input-driven armed race completes with valid lap gates');
check(race.leaderboard.entries.some(row=>row.mode==='wasteland'),'actual race saves combat leaderboard mode');race.dispose();
console.log(`Combat: ${checks} lifecycle, shield, UFO, projectile, CPU, record and rendering checks passed.`);
