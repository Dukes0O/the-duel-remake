import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';
import { CARS, DRIVE, LIVES } from '../src/config.js';

let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
function straight({car='falcone_f42',prepared=true,upgrades={}}={}) {
  const duel=new Duel({car,seed:1989}),state=duel.state;
  Object.assign(state,{status:'racing',s:1000,prevS:1000,speedMph:110,gear:2,lapsTotal:2,cpuDifficulty:'hard'});
  Object.assign(state.upgrades,upgrades);
  const point=(s,lateral=0)=>({x:lateral,y:0,z:s,heading:0,curvature:0});
  duel.course={def:{kind:prepared?'rally':undefined,offroad:prepared,theme:'desert'},length:10000,raceLength:20000,closed:false,
    features:{obstacles:[],flocks:[],shortcuts:[],radarTraps:[]},at:s=>point(s),worldAt:point,groundAt:point,
    nearest:(x,z)=>({s:z,lateral:x,distance:Math.abs(x)}),phase:s=>s,themeAt:()=> 'desert',roadHalfWidthAt:()=>7,
    surfaceAt:()=>({road:prepared,mainRoad:false,shortcutId:null,roadHalfWidth:7}),nearestRadar:()=>null,
    obstaclesNear:()=>duel.course.features.obstacles};
  duel._lapGates=[2500,5000,7500];duel._obstacleQueryCache=new Map();duel._obstacleArray=duel.course.features.obstacles;
  return duel;
}
function drive(duel,seconds,input={}) {
  duel.setInput({throttle:1,steer:0,...input});let boosting=0;
  for(let frame=0;frame<seconds*120;frame++){duel.step(1/120);if(duel.state.boosting)boosting++;}
  return boosting/120;
}
{
  const stock=straight(),rally=straight({car:'dusthawk_rally'}),rough=straight({prepared:false});
  const a=stock._drivingSurface(1000,0),b=rally._drivingSurface(1000,0),c=rough._drivingSurface(1000,0);
  check(a.preparedGravel&&a.boostAllowed,'legal Rally gravel is prepared surface and permits nitro');
  check(Math.abs(a.speedLimit-CARS.falcone_f42.topSpeed*.95)<1e-9,'stock cars retain95% of their top speed on graded gravel');
  check(Math.abs(b.speedLimit-CARS.dusthawk_rally.topSpeed*.98)<1e-9,'the rally car retains98% of its top speed');
  check(b.traction>a.traction&&b.scrub<a.scrub&&b.roughness<a.roughness,'rally equipment preserves a grip, drag, and ride advantage');
  check(c.speedLimit===68&&c.traction===DRIVE.offRoadGrip&&c.scrub===DRIVE.offRoadScrub&&!c.boostAllowed,'rough off-trail ground keeps its original penalties');
  check(straight({car:'dusthawk_rally',prepared:false})._drivingSurface(1000,0).speedLimit===125,'the rally car retains its distinct125mph off-trail cap');
  const start=stock.state.s;drive(stock,2);drive(rough,2);
  check(stock.state.speedMph>rough.state.speedMph+35&&stock.state.s-start>rough.state.s-start+15,'graded gravel changes actual driving pace rather than awarding artificial progress');
  check(stock.state.roughness<.22&&rough.state.roughness>.6,'prepared gravel stays smoother than open dirt');
}
{
  const normal=straight(),boost=straight(),tank=straight({upgrades:{tank:3}}),rough=straight({prepared:false});
  drive(normal,2);drive(boost,2,{boost:true});drive(rough,2,{boost:true});
  check(boost.state.boosting&&boost.state.boost<.7,'nitro actually burns fuel on a legal gravel route');
  check(boost.state.speedMph>normal.state.speedMph+45&&boost.state.s>normal.state.s+15,'legal gravel nitro produces acceleration and a distance gain');
  check(!rough.state.boosting&&rough.state.boost===1,'holding nitro on rough ground neither activates nor wastes the tank');
  const baseTank=straight(),baseSeconds=drive(baseTank,8,{boost:true}),upgradedSeconds=drive(tank,8,{boost:true});
  check(upgradedSeconds>baseSeconds+2.5&&tank.state.boost>.1,'a larger tank provides materially longer gravel boost time');
  const baseTurn=straight(),tires=straight({upgrades:{tires:3}});
  drive(baseTurn,.5,{steer:.2});drive(tires,.5,{steer:.2});
  check(Math.abs(tires.state.headingError)>Math.abs(baseTurn.state.headingError)*1.08,'tire upgrades improve actual steering authority on prepared gravel');
  const suspension=straight({upgrades:{suspension:3}});drive(suspension,2);
  check(suspension.state.roughness<normal.state.roughness*.7,'suspension upgrades visibly reduce gravel roughness');
  const refill=boost.state.boost;drive(boost,1,{throttle:0,boost:false});
  check(boost.state.boost>refill,'the tank refills normally after releasing gravel nitro');
}
{
  const fast=straight({car:'dusthawk_rally'}),rough=straight({car:'dusthawk_rally',prepared:false});
  for(const duel of [fast,rough]) {
    duel.state.s=0;duel.state.rival={s:900,lateral:-3.4,headingError:0,speedMph:160,pushVelocity:0,completedLaps:0,nextLapGate:0,lapTimes:[],lapStartedAt:0};
    for(let i=0;i<240;i++)duel._rival(1/120);
  }
  check(fast.state.rival.speedMph>160&&rough.state.rival.speedMph<125,'the CPU uses the same prepared-gravel distinction as the player');
  check(fast.state.rival.speedMph<=fast._drivingSurface(1000,0,CARS.dusthawk_rally).speedLimit,'CPU pace stays within its prepared-gravel limit');
  const police=straight();police.state.s=1800;police.state.police.pursuit={...police._newPursuit(500),speedMph:120};
  police._movePolice(police.state.police.pursuit,1/120);
  check(police.state.police.pursuit.preparedGravel&&police.state.police.pursuit.speedMph>119,'police do not inherit the old90mph dirt slowdown on prepared routes');
  const traffic=straight();traffic.state.traffic=[{alive:true,s:900,lateral:0,dir:1,speedMph:48}];traffic._traffic(1);
  check(traffic.state.traffic[0].speedMph===48,'ordinary traffic maintains cruising pace on a legal gravel road');
}
{
  const d=straight(),s=d.state;
  d.course.features.shortcuts=[{id:'wide',start:1000,end:2000,halfWidth:4.6,offset:112}];
  d.course.shortcutOffset=()=>112;d.course.phase=distance=>((distance%10000)+10000)%10000;
  d.course.surfaceAt=(distance,lateral)=>({road:Math.abs(lateral)<=7||Math.abs(lateral-112)<=4.6,mainRoad:Math.abs(lateral)<=7,shortcutId:Math.abs(lateral-112)<=4.6?'wide':null,roadHalfWidth:7});
  for(const lap of [0,1]) {
    Object.assign(s,{s:1500+lap*10000,lateral:112,speedMph:100});d._boundary(s);
    check(s.lateral===112&&!s.boundaryWarning,'a112m legal shortcut remains safe on either lap');
  }
  Object.assign(s,{s:1500,lateral:137,speedMph:100});d._boundary(s);
  check(s.lateral===137&&s.boundaryWarning,'the branch has its own shoulder warning before recovery');
  Object.assign(s,{s:1500,lateral:56,speedMph:100});d._boundary(s);
  check(Math.abs(s.lateral)<7&&s.boundaryResets===1,'the middle of the distant branch gap is not an unrestricted shortcut field');
  for(const actor of [{s:1500,lateral:155,speedMph:100},{s:1500,lateral:112,speedMph:100}]) {
    d._boundary(actor);check(Math.abs(actor.lateral)<7||actor.lateral===112,'NPCs share the legal branch corridor and outer recovery');
  }
  Object.assign(s,{s:2500,lateral:79,speedMph:100});d._boundary(s);
  check(Math.abs(s.lateral)<7,'ordinary sections retain the established78m boundary');
  check(s.lives===LIVES.start&&s.majorCrashes===0&&s.racePenaltySec===0,'all boundary recovery remains harmless');
  d.course.themeAt=()=> 'coast';d.course.groundAt=(distance,lateral)=>({x:lateral,y:lateral>100?-15:0,z:distance,heading:0});
  Object.assign(s,{s:1500,lateral:112,speedMph:100});d._boundary(s);
  check(Math.abs(s.lateral)<7,'a legal route label cannot authorize driving below sea level');
  d.course.themeAt=()=> 'desert';d.course.features.obstacles=[{id:'branch-building',kind:'building',x:112,y:0,z:1510,s:1510,off:112,heading:0,halfX:4,halfZ:3}];
  Object.assign(s,{status:'racing',s:1520,prevS:1490,lateral:112,prevLateral:112,speedMph:100,invulnerableSec:0});d._staticContacts(s,true);
  check(s.s<1505&&s.majorCrashes===1,'legal shortcut bounds never disable solid building impacts');
}
console.log(`Prepared surfaces: ${checks} pace, nitro, upgrade, NPC and route-boundary checks passed.`);
