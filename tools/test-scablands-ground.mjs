import assert from 'node:assert/strict';
import test from 'node:test';
import {Course} from '../src/course.js';
import {COURSE,CARS} from '../src/config.js';
import {Duel} from '../src/game.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {placeActor} from '../src/arena/arena-event.js';
import {createFighter,stepFighter} from '../src/onfoot.js';
import {SCABLANDS_PLACES} from '../src/world/scablands.js';
import {scablandsSurfaceAt,scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {limitClimb,offroadCapability} from '../src/offroad-physics.js';
import {ROAD_NET,EAST_ROAD} from '../src/world/scablands-road.js';
import {resampleRoad} from '../src/world/scablands-road-geometry.js';

const venue=ARENA_VENUES.scablands;
const course=new Course(venue,1989);
const close=(a,b,tolerance,label)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const courseDistance=(from,to)=>((to-from+course.length)%course.length);
// SCABLANDS-LAND round 4, slice 2a: the dirt ring round the yard is gone. The roads are the net of src/world/scablands-road.js, and the oval is
// only the frame a car's position is kept against.
const ROAD_ENDS=Object.freeze(ROAD_NET.roads.flatMap(road=>[Object.assign({name:`${road.name}, start`},road.points[0]),Object.assign({name:`${road.name}, end`},road.points.at(-1))]));

test('Scablands is an arena ground, never a menu circuit',()=>{
  assert.equal(COURSE.some(row=>row.id==='scablands'),false);
  assert.equal(venue.id,'scablands');
  assert.equal(SCABLANDS_PLACES.length,8);
  assert.equal(venue.scablands.floorSpeedMph,115);
  for(const end of ROAD_ENDS)assert.equal(scablandsSurfaceAt(end.x,end.z).road,true,`${end.name} is on a road`);
  assert.equal(scablandsSurfaceAt(0,0).road,false,'the yard itself is not road');
  assert.equal(scablandsSurfaceAt(3000,-2400).road,false,'open ground between the roads is not road');
});

test('an ordinary car follows the East Road from the yard to the Girder Bridge',()=>{
  const line=resampleRoad(EAST_ROAD.points,10),target=line.find(sample=>sample.along>=3700);
  const duel=new Duel({seed:1989,car:'banshee_muscle',featureFlags:{'hidden-road':true}});
  duel.state.wastelandGateDiscovered=true;
  assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'last-car-rolling',car:'banshee_muscle',seed:1989,
    opponents:[{car:'dusthawk_rally'}]}),true);
  const player=duel.state,opponent=duel.state.opponents[0],start=line[0],pose=course.nearest(start.x,start.z);
  placeActor(duel,player,{s:pose.s,lateral:pose.lateral});
  placeActor(duel,opponent,{s:pose.s+course.length/2,lateral:0});
  opponent.finished=true;
  player.headingError=0;
  const facing=Math.atan2(line[1].x-start.x,line[1].z-start.z);
  player.headingError=Math.atan2(Math.sin(facing-course.at(player.s).heading),Math.cos(facing-course.at(player.s).heading));
  let steps=0,worst=0;
  const aimAt=(x,z)=>{
    let best=0,distance=Infinity;
    for(let index=0;index<line.length;index++){const d=Math.hypot(line[index].x-x,line[index].z-z);if(d<distance){distance=d;best=index;}}
    return line[Math.min(line.length-1,best+8)];
  };
  while(steps<120*400){
    const at=course.worldAt(player.s,player.lateral);
    if(Math.hypot(at.x-target.x,at.z-target.z)<20)break;
    const aim=aimAt(at.x,at.z),heading=course.at(player.s).heading+player.headingError,turn=Math.atan2(Math.sin(Math.atan2(aim.x-at.x,aim.z-at.z)-heading),Math.cos(Math.atan2(aim.x-at.x,aim.z-at.z)-heading));
    duel.setInput({throttle:1,brake:0,steer:Math.max(-1,Math.min(1,-turn*2)),boost:false});
    duel.step(1/120);steps++;
    const here=course.worldAt(player.s,player.lateral);
    worst=Math.max(worst,ROAD_NET.nearest(here.x,here.z)?0:1);
  }
  assert.ok(steps<120*400,'the ordinary car reaches the bridge');
  const at=course.worldAt(player.s,player.lateral);
  assert.ok(scablandsSurfaceAt(at.x,at.z).road,'and is on the road there');
  assert.equal(worst,0,'and stayed on the road the whole way');
  assert.ok(player.speedMph>0,'the ordinary car is moving');
});

test('a fighter walks across Tin Town without a ground seam',()=>{
  const town=SCABLANDS_PLACES.find(row=>row.id==='tin-town'),x=town.x+34,z=0,nearest=course.nearest(x,z),car={s:nearest.s,lateral:nearest.lateral};
  const fighter=createFighter(course,car,{...car,yaw:Math.PI/2});
  const startY=fighter.y;
  let crossed=false;
  for(let i=0;i<240;i++){
    const oldX=fighter.x;
    stepFighter(course,car,fighter,{forward:true});
    if(oldX<town.x+40&&fighter.x>=town.x+40)crossed=true;
    close(fighter.y,scablandsSurfaceHeightAt(fighter.x,fighter.z),.002,'fighter feet match shared ground height');
  }
  assert.equal(crossed,true,'the walk crosses a line 40 m east of the town centre');
  close(fighter.y,startY,.01,'Tin Town stays flat while walking');
});

test('the Titan climbs farther up the Ridge than the rally car',()=>{
  const ordinary=offroadCapability(CARS.dusthawk_rally);
  const titan=offroadCapability(CARS.titan_monster,{titanClimb:true});
  const ridge=SCABLANDS_PLACES.find(place=>place.id==='ridge'),scale=1.002/Math.hypot(ridge.x/7000,ridge.z/5000);
  const start={x:ridge.x*scale,z:ridge.z*scale},length=Math.hypot(start.x,start.z);
  const direction={x:start.x/length,z:start.z/length};
  const climb=(capability)=>{
    let distance=0,accumulated=0;
    for(let step=0;step<1200&&distance<240;step++){
      const x=start.x+direction.x*distance,z=start.z+direction.z*distance;
      const nextX=x+direction.x*2,nextZ=z+direction.z*2;
      const gain=scablandsSurfaceHeightAt(nextX,nextZ)-scablandsSurfaceHeightAt(x,z);
      const limit=limitClimb({gain,distance:2,dt:.25,capability,accumulated});
      if(limit.tipped)break;
      accumulated+=Math.max(0,gain)*limit.fraction;distance+=2*limit.fraction;
    }
    return distance;
  };
  const ordinaryDistance=climb(ordinary),titanDistance=climb(titan);
  assert.ok(titanDistance>ordinaryDistance+10,`Titan reaches farther (${titanDistance} m vs ${ordinaryDistance} m)`);
});

test('height stays continuous at ground chunk edges',()=>{
  const epsilon=1e-4;
  for(let edge=-768;edge<=768;edge+=128){
    const xDelta=Math.abs(scablandsSurfaceHeightAt(edge-epsilon,73)-scablandsSurfaceHeightAt(edge+epsilon,73));
    const zDelta=Math.abs(scablandsSurfaceHeightAt(91,edge-epsilon)-scablandsSurfaceHeightAt(91,edge+epsilon));
    assert.ok(xDelta<.01,`x chunk edge ${edge} is continuous`);
    assert.ok(zDelta<.01,`z chunk edge ${edge} is continuous`);
  }
});
