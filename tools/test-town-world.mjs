import assert from 'node:assert/strict';
import test from 'node:test';
import {createTown} from '../src/town/town-state.js';
import {createTownWorld} from '../src/town/town-world.js';
import {cellIsReserved} from '../src/town/town-world-data.js';
import {setScablandsTownLayout, clearScablandsTownLayout, scablandsSurfaceAt} from '../src/world/scablands-ground.js';
import {Course} from '../src/course.js';
import {ARENA_VENUES} from '../src/arena/venues.js';
import {Duel} from '../src/game.js';
import {sweepObstacle} from '../src/collision.js';
import {scablandsSurfaceHeightAt} from '../src/world/scablands-ground.js';
import {cleanupWorldJobLoan} from '../src/arena/modes/world-job.js';

test('town world is stable, reserves story roads, and exposes solid building cells', () => {
  const town=createTown(1405,'Test town');
  town.buildings.push({id:'hall',buildingId:'town-hall',regionId:'scablands',x:70,z:50,width:2,depth:3,state:'finished',groundY:0});
  const first=createTownWorld(town),second=createTownWorld(town);
  assert.deepEqual(first,second);
  assert.equal(first.solids.length,3);
  assert.deepEqual(first.solids.find(solid=>solid.id==='hall'),{id:'hall',x:568,y:scablandsSurfaceHeightAt(568,412),z:412,heading:0,halfX:8,halfZ:12,height:8,shape:'box'});
  assert.equal(cellIsReserved('scablands',70,50),false);
  assert.equal(cellIsReserved('scablands',-43,2),true,'Bowl gate is reserved');
  assert.equal(cellIsReserved('scablands',-53,38),true,'Everburn approach stays open');
  assert.equal(cellIsReserved('scablands',0,53),true,'Dead Mall route home stays open');
  assert.equal(first.roads.some(road=>road.id==='old-road-safe-everburn'),true);
});

test('Scablands town layout adds road ground and a car collider, then clears cleanly', () => {
  const town=createTown(1405,'Test town'),course=new Course(ARENA_VENUES.scablands,1989),point=course.worldAt(300);
  const x=Math.floor(point.x/8),z=Math.floor(point.z/8);
  town.buildings.push({id:'hall',buildingId:'town-hall',regionId:'scablands',x,z,width:2,depth:3,state:'finished',groundY:0});
  const layout=createTownWorld(town);
  const untouched=course.obstaclesNear(0).length;
  assert.equal(scablandsSurfaceAt(0,0).road,false);
  setScablandsTownLayout(layout);
  assert.equal(scablandsSurfaceAt(230,150).road,true);
  const buildingX=(x+1)*8,buildingZ=(z+1.5)*8;
  const solid=course.obstaclesNear(course.nearest(buildingX,buildingZ).s).find(item=>item.id==='hall');
  assert.ok(solid,'building is visible to the native course obstacle query');
  assert.ok(sweepObstacle({x:solid.x-20,y:solid.y,z:solid.z},{x:solid.x,y:solid.y,z:solid.z},solid,0,{height:1.5}),
    'the native car sweep collides with the town building');
  clearScablandsTownLayout();
  assert.equal(scablandsSurfaceAt(0,0).road,false);
  assert.equal(course.obstaclesNear(0).length,untouched);
});

test('a town drive remains open ended and repeatable from seed and layout', () => {
  const layout=createTownWorld(createTown(1405,'Test town'));
  const run=()=>{
    const duel=new Duel({seed:1989,featureFlags:{'wasteland-town':true}});
    duel.state.wastelandGateDiscovered=true;
    setScablandsTownLayout(layout);
    assert.equal(duel.startArenaEvent({venueId:'scablands',mode:'world-job',job:{id:'town-drive',kind:'town-drive',steps:[],seed:1989,layout}}),true);
    for(let i=0;i<10;i++)duel.step(1/120);
    const state=duel.state.arena.worldJob;
    const settled=state.settled,position=duel.course.groundAt(duel.state.s,duel.state.lateral);
    cleanupWorldJobLoan(duel);
    assert.equal(state.settled,true);
    return {status:duel.state.status,settled,position};
  };
  assert.deepEqual(run(),run());
  assert.equal(run().settled,false);
});

test('every unreserved town cell can be occupied while the old roads stay driveable', () => {
  const town=createTown(2026,'Crowded test town');let number=0;
  for(let x=-88;x<88;x++)for(let z=-63;z<63;z++)if(!cellIsReserved('scablands',x,z))
    town.buildings.push({id:`crowded-${number++}`,buildingId:'test-house',regionId:'scablands',x,z,width:1,depth:1,state:'finished'});
  const layout=createTownWorld(town),course=new Course(ARENA_VENUES.scablands,1989);
  assert.equal(layout.solids.length,number+2,'each occupied cell and the Dome gate are solid');
  setScablandsTownLayout(layout);
  for(const [x,z] of [[230,150],[424,304],[600,0],[-424,304],[0,430]])
    assert.equal(scablandsSurfaceAt(x,z).road,true,`the old route at ${x}, ${z} remains road`);
  for(const [x,z] of [[0,-104],[230,150],[424,304],[600,0],[-424,304],[0,430]]){
    const s=course.nearest(x,z).s;
    assert.equal(course.obstaclesNear(s).some(obstacle=>
      obstacle.id.startsWith('crowded-')&&Math.hypot(obstacle.x-x,obstacle.z-z)<10),false,
    `buildings leave the old road open near ${x}, ${z}`);
  }
  clearScablandsTownLayout();
});
