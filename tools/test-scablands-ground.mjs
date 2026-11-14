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

const venue=ARENA_VENUES.scablands;
const course=new Course(venue,1989);
const close=(a,b,tolerance,label)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
const courseDistance=(from,to)=>((to-from+course.length)%course.length);
// SCABLANDS-LAND round 4: the places left the oval (they stand ten times as far from the yard). The dirt ring round the yard stays; its eight
// stops are where the places stood on the first land.
const RING_STOPS=Object.freeze([[600,0],[424,304],[0,430],[-424,304],[-600,0],[-424,-304],[0,-430],[424,-304]].map(([x,z],index)=>Object.freeze({name:`ring stop ${index+1}`,x,z})));

test('Scablands is an arena ground, never a menu circuit',()=>{
  assert.equal(COURSE.some(row=>row.id==='scablands'),false);
  assert.equal(venue.id,'scablands');
  assert.equal(SCABLANDS_PLACES.length,8);
  assert.equal(venue.scablands.floorSpeedMph,115);
  for(const place of RING_STOPS){
    const at=course.nearest(place.x,place.z);
    assert.ok(at.distance<8,`${place.name} is close to the stable oval frame`);
    assert.equal(scablandsSurfaceAt(place.x,place.z).road,true,`${place.name} is on the dirt ring`);
  }
});

test('an ordinary car follows the dirt road from each place to the next',()=>{
  for(let index=0;index<RING_STOPS.length;index++){
    const from=RING_STOPS[index],to=RING_STOPS[(index+1)%RING_STOPS.length];
    const start=course.nearest(from.x,from.z).s,target=course.nearest(to.x,to.z).s;
    const distance=courseDistance(start,target);
    const duel=new Duel({seed:1989,car:'banshee_muscle',featureFlags:{'hidden-road':true}});
    duel.state.wastelandGateDiscovered=true;
    assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'last-car-rolling',car:'banshee_muscle',seed:1989,
      opponents:[{car:'dusthawk_rally'}]}),true);
    const player=duel.state,opponent=duel.state.opponents[0];
    placeActor(duel,player,{s:start,lateral:0});
    placeActor(duel,opponent,{s:start+course.length/2,lateral:0});
    opponent.finished=true;
    let travelled=0,steps=0;
    while(travelled<distance+4&&steps<120*26){
      duel.setInput({throttle:1,brake:0,steer:Math.max(-1,Math.min(1,player.headingError*2)),boost:false});
      duel.step(1/120);
      travelled=courseDistance(start,player.s);steps++;
    }
    assert.ok(steps<120*26,`${from.name} to ${to.name} reaches the next place`);
    const at=course.worldAt(player.s,player.lateral);
    assert.ok(scablandsSurfaceAt(at.x,at.z).road,`${from.name} to ${to.name} stays on the road`);
    assert.ok(player.speedMph>0,'the ordinary car is moving');
  }
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
