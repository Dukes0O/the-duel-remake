import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {COURSE, LIVES} from '../src/config.js';
import {breakableScenery, trafficDestruction, startTrafficWreck, stepTrafficWreck} from '../src/destructibles.js';
import {combatCrashThresholdMph} from '../src/vehicle-impact.js';

let checks = 0;
const check = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const stageIndex = COURSE.findIndex(stage => !stage.kind && stage.hasRival);

function fixture({mode = 'wasteland', enabled = true} = {}) {
  const duel = new Duel({seed:1989, destructiblesEnabled:enabled});
  duel.startCampaign({startStage:stageIndex, mode});
  const point = (s, lateral = 0) => ({x:lateral, y:0, z:s, heading:0, curvature:0});
  duel.course = {
    def:{theme:'alpine'}, length:1000, closed:false, features:{obstacles:[],shortcuts:[],mountains:[]},
    at:point, worldAt:point, groundAt:point, phase:s=>s,
    nearest:(x,z)=>({s:z,lateral:x}), obstaclesNear:()=>duel.course.features.obstacles,
    roadHalfWidthAt:()=>7, surfaceAt:(_,lateral)=>({road:Math.abs(lateral)<=7,mainRoad:Math.abs(lateral)<=7,roadHalfWidth:7}),
  };
  duel._obstacleArray = duel.course.features.obstacles;
  duel._obstacleQueryCache = new Map();
  Object.assign(duel.state,{status:'racing',s:100,prevS:100,lateral:0,prevLateral:0,speedMph:0,rival:null,traffic:[],mode});
  return duel;
}
const tree = (scale = .8) => ({id:'tree-1',kind:'tree',theme:'alpine',shape:'ellipse',scale,s:110,off:0,x:0,y:0,z:110,heading:0,halfX:.23*scale,halfZ:.23*scale,height:6*scale});
const post = (id,x = 0) => ({id,kind:'prop',signSupport:true,shape:'box',s:110,off:x,x,y:0,z:110,heading:0,halfX:.07,halfZ:.08,height:4});
function sweep(duel, speed, from = 100, to = 120) {
  Object.assign(duel.state,{prevS:from,s:to,prevLateral:0,lateral:0,speedMph:speed});
  duel._staticContacts(duel.state,true);
}

{
  const d = fixture(), s = d.state; d.course.features.obstacles.push(tree());
  sweep(d, 90);
  same(s.brokenScenery.map(event=>[event.id,event.kind]),[['tree-1','tree']],'a small tree falls on a fast Wasteland impact');
  check(s.s > 110 && s.speedMph > 65 && s.speedMph < 90,'the car passes the tree with an appreciable speed loss');
  same([s.lives,s.stageCrashes,s.impactTimer],[LIVES.start,0,0],'breakable tree does not force a crash');
  same(d._obstacles(100,120),[],'the broken tree loses its collider immediately');
  const speed = s.speedMph; sweep(d,speed);
  same(s.brokenScenery.length,1,'repeat passes do not destroy the same tree twice');
  same(s.speedMph,speed,'the missing collider never scrubs speed again');
  d.startCampaign({startStage:stageIndex,mode:'wasteland'});
  same(s.brokenScenery,[],'a new stage restores scenery state');
}
{
  const d=fixture();d.course.features.obstacles.push(tree());sweep(d,10);
  same(d.state.brokenScenery,[],'a parking-speed tree touch cannot fell it');
  check(d.state.s<110,'the tree remains solid at parking speed');
}
{
  const d=fixture();d.course.features.obstacles.push(tree(1.45));sweep(d,100);
  same(d.state.brokenScenery,[],'large trees remain solid');
  check(d.state.s<110,'large tree does not become a free shortcut');
}
{
  const d=fixture();d.course.features.obstacles.push(tree(1.45));
  const threshold=combatCrashThresholdMph(d.car);
  sweep(d,threshold-5);
  same(d.state.stageCrashes,0,'armor absorbs a solid tree contact below this car’s crash threshold');
  const hard=fixture();hard.course.features.obstacles.push(tree(1.45));
  sweep(hard,threshold+5);
  same(hard.state.stageCrashes,1,'a sufficiently fast solid tree contact still wrecks the car');
}
{
  const d=fixture();d.course.features.obstacles.push(post('road-sign-0-post--1.8'),post('road-sign-0-post-1.8',3.6));
  sweep(d,45);
  same(d.state.brokenScenery.map(event=>event.id),['road-sign-0'],'one post brings down the whole sign');
  same(d._obstacles(100,120),[],'both sign-post colliders are gone after impact');
}
{
  const d=fixture();d.course.features.obstacles.push(post('turn-chevron-0'));
  sweep(d,30);
  same(d.state.brokenScenery.map(event=>event.kind),['chevron'],'small turn sign falls and clears the road');
}
for(const options of [{mode:'duel',enabled:true},{mode:'wasteland',enabled:false}]){
  const d=fixture(options);d.course.features.obstacles.push(tree());sweep(d,75);
  same(d.state.brokenScenery,[],'ordinary races and disabled experiments keep their original tree rules');
  check(d.state.s<110,'without the feature, trees remain solid');
}
{
  const compact=breakableScenery(tree(),60,{enabled:true,mode:'wasteland'});
  check(compact.speedLossMph>12,'tree resistance has a measured speed cost');
  const light=trafficDestruction({enabled:true,mode:'wasteland',impactMph:110,playerTopSpeedMph:150,playerMass:3500,targetMass:1250});
  check(light.wreck && light.impulse>4,'a fast heavy-car strike can wreck traffic and launch it');
  const tap=trafficDestruction({enabled:true,mode:'wasteland',impactMph:8,playerTopSpeedMph:150});
  same(tap.wreck,false,'low-speed contact remains a shove');
  same(trafficDestruction({enabled:true,mode:'duel',impactMph:150,playerTopSpeedMph:150}).wreck,false,'traffic wrecking belongs to Wasteland');
  const car={alive:true,s:110,lateral:0,speedMph:55,dir:-1,headingError:0};
  check(startTrafficWreck(car,{atTime:3,impulse:light.impulse,side:-1}),'first impact starts one wreck');
  same(startTrafficWreck(car,{atTime:4,impulse:light.impulse,side:1}),false,'a wreck cannot restart and farm impact events');
  for(let i=0;i<180;i++)stepTrafficWreck(car,1/120);
  check(!car.alive&&car.lateral<0&&car.s<110&&car.airHeight===0,'destroyed oncoming car flies sideways, slides ahead in its travel direction, then lands');
  check([car.s,car.lateral,car.headingError,car.wrecked.roll].every(Number.isFinite),'wreck motion remains finite');
}

console.log(`Roadside destruction: ${checks} checks passed.`);
