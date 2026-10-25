import { Duel } from '../src/game.js';
import { kelpCoastProvider } from '../src/deep/zones/kelp-coast.js';
import { rampAt, rampChaseCamera } from '../src/deep/deep-journey.js';
import { terrainGeometry, farTerrainGeometry, strip } from '../src/world-surfaces.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { ROUTE_VARIANTS } from '../src/route-variants.js';
import { SEA_LEVEL, shoreOffset } from '../src/coastal-water.js';
import { buildPacificRockLayout, offshoreClearance } from '../src/pacific-coast.js';
import { sweepObstacle } from '../src/collision.js';
import { buildDeepRamp, rampGrade, rampCoordinates, rampClearsScenery, rampOpening } from '../src/deep/deep-ramp.js';

const definition = COURSE.find(course => course.id === 'pacific-canyon');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const near = (actual, expected, label, tolerance = 1e-5) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} differs from ${expected}`);
const obstacleRecords = course => course.features.obstacles.map(obstacle => ({
  data: { ...obstacle }, modelMinY: obstacle.modelMinY, modelMaxY: obstacle.modelMaxY,
  minDescriptor: Object.getOwnPropertyDescriptor(obstacle, 'modelMinY'),
  maxDescriptor: Object.getOwnPropertyDescriptor(obstacle, 'modelMaxY'),
}));
const originalBounds = course => [...course.features.obstacles, ...buildPacificRockLayout(course)];
function clearance(course, ramp) {
  const first = ramp.points[0], last = ramp.points.at(-1);
  for (const original of originalBounds(course).filter(o => !rampOpening({deepRamp:ramp},o) && !(['tree','rock'].includes(o.kind) && rampClearsScenery({deepRamp:ramp},o)))) {
    const obstacle = { ...original, shape: 'box', modelMinY: original.modelMinY, modelMaxY: original.modelMaxY };
    assert.equal(sweepObstacle({ x: first.x, z: first.z }, { x: last.x, z: last.z },
      obstacle, ramp.heading, { halfWidth: 6, halfLength: 0 }), null, 'full strip avoids each original bound');
    assert.equal(sweepObstacle(ramp.cove.center, ramp.cove.center, obstacle, ramp.heading,
      { halfWidth: 6, halfLength: 6 }), null, 'whole cove avoids each original bound');
  }
  assert.equal(offshoreClearance(course, last.x, last.z, Math.hypot(6, 6)), true,
    'existing offshore reader clears a disk covering the entire cove');
  for (const point of ramp.points.filter(point => point.progress > 8)) for (const offset of [-6, -4, -2, 0, 2, 4, 6]) {
    const x = point.x + Math.cos(ramp.heading) * offset;
    const z = point.z - Math.sin(ramp.heading) * offset;
    const nearest = course.nearest(x, z);
    assert.equal(course.surfaceAt(nearest.s, nearest.lateral).road, false, 'whole strip leaves road/shortcuts clear');
  }
  for (const corner of ramp.cove.corners) {
    const nearest = course.nearest(corner.x, corner.z);
    assert.ok(rampGrade(ramp, corner, course.groundAt(nearest.s, nearest.lateral).y) < SEA_LEVEL, 'cove is genuinely submerged');
  }
  // Denser independent sampling also covers the cove's interior.
  for (let side = -6; side <= 6; side += .5) for (let along = -6; along <= 6; along += .5) {
    const x = last.x + Math.cos(ramp.heading) * side + Math.sin(ramp.heading) * along;
    const z = last.z - Math.sin(ramp.heading) * side + Math.cos(ramp.heading) * along;
    const nearest = course.nearest(x, z);
    assert.ok(rampGrade(ramp, {x,z}, course.groundAt(nearest.s, nearest.lateral).y) < SEA_LEVEL, 'whole graded cove is submerged');
  }
}

test('actual Pacific A/B/C ramps have 120 m of sampled grounded geometry to -23 and preserve generation', () => {
  const selected = [];
  for (const route of ROUTE_VARIANTS) {
    const course = new Course(definition, route.seed), control = new Course(definition, route.seed);
    const originals = obstacleRecords(course), featureText = JSON.stringify(course.features);
    const ramp = buildDeepRamp(course);
    assert.ok(ramp, `${route.label} must have a real clear ramp, without fallback`);
    assert.equal(ramp.courseId, definition.id);
    assert.equal(ramp.width, 12); // DEEP-RAMP-2: Kyle requested twice the old width.
    assert.ok(ramp.points.length > 20);
    assert.ok(ramp.points.every(point => [point.x, point.y, point.z, point.progress].every(Number.isFinite)));
    near(ramp.points.slice(1).reduce((sum, point, i) => sum + distance(ramp.points[i], point), 0), 120, 'actual 3D sum');
    near(ramp.length, 120, 'declared length');
    near(ramp.points.at(-1).progress, 120, 'end progress');
    near(ramp.points.at(-1).y, -23, 'actual sea level minus 8');
    for (const point of ramp.points) {
      const nearest = course.nearest(point.x, point.z);
      near(point.y, rampGrade(ramp, point, course.groundAt(nearest.s, nearest.lateral).y), 'centerline follows graded cutting');
    }
    const shore = ramp.shoreline.center, nearest = course.nearest(shore.x, shore.z);
    near(shore.y, SEA_LEVEL, 'shoreline sea height');
    near(rampGrade(ramp, shore, course.groundAt(nearest.s, nearest.lateral).y), SEA_LEVEL, 'graded descending shoreline');
    near(ramp.heading, course.at(ramp.atDistance).heading + Math.PI / 2, 'straight fall line');
    assert.ok(shore.progress > 0 && shore.progress < 120);
    assert.equal(ramp.shoreline.edges.length, 2);
    assert.ok(ramp.shoreline.edges.every(edge => Number.isFinite(edge.progress) && edge.progress > 0 && edge.progress < 120));
    clearance(course, ramp);
    const again = buildDeepRamp(course);
    assert.deepEqual(ramp, again, 'repeat selection is deterministic');
    assert.notEqual(ramp, again);
    assert.notEqual(ramp.points, again.points);
    assert.notEqual(ramp.cove, again.cove);
    assert.ok(Object.isFrozen(ramp) && Object.isFrozen(ramp.points) && Object.isFrozen(ramp.points[0])
      && Object.isFrozen(ramp.footprint.corners) && Object.isFrozen(ramp.cove.center));
    assert.throws(() => { ramp.points[0].x = 999; }, TypeError);
    assert.equal(JSON.stringify(course.features), featureText);
    assert.deepEqual(obstacleRecords(course), originals, 'non-enumerable model bounds preserved');
    assert.deepEqual(course.features, control.features, 'untouched control features stay exact');
    assert.deepEqual(Array.from({ length: 20 }, () => course.rng.float()),
      Array.from({ length: 20 }, () => control.rng.float()), 'Course RNG progression stays exact');
    selected.push({ route: route.label, atDistance: ramp.atDistance, shoreline: shore.progress,
      points: ramp.points.length, endDepth: SEA_LEVEL - ramp.points.at(-1).y });
  }
  console.log('Actual Pacific ramp geometry: ' + JSON.stringify(selected));
});

test('a bound crossing the first full strip or cove rejects that candidate', () => {
  const course = new Course(definition, ROUTE_VARIANTS[0].seed), first = buildDeepRamp(course);
  assert.ok(first);
  for (const point of [first.points[Math.floor(first.points.length / 2)], first.cove.center]) {
    // High vertical bounds cannot hide a horizontal footprint obstruction.
    const blocker = { x: point.x, z: point.z, y: 1000, height: 1, heading: 0, halfX: 3, halfZ: 3 };
    Object.defineProperties(blocker, { modelMinY: { value: 1000 }, modelMaxY: { value: 1001 } });
    const next = buildDeepRamp(course, { obstacles: [...course.features.obstacles, blocker] });
    assert.ok(next, 'later real candidate remains available');
    assert.ok(next.atDistance > first.atDistance, 'first obstructed candidate is not reused or fitted around');
    clearance(course, next);
    assert.equal(sweepObstacle(next.points[0], next.points.at(-1), blocker, next.heading,
      { halfWidth: 6, halfLength: 0 }), null);
  }
  const stacks = buildPacificRockLayout(course);
  const blockedStack = { ...stacks[0], x: first.cove.center.x, z: first.cove.center.z, halfX: 3, halfZ: 6 };
  const next = buildDeepRamp(course, { buildPacificRockLayout: () => [...stacks, blockedStack] });
  assert.ok(next && next.atDistance > first.atDistance, 'actual stack rectangle contract blocks the first cove');
});

// DEEP-RAMP-2: the cutting deliberately replaces raised natural ground, including the bottom apron.
test('the bottom apron profile lowers an interior emergence', () => {
  const course = new Course(definition, ROUTE_VARIANTS[0].seed), ramp = buildDeepRamp(course);
  const end = ramp.points.at(-1), point = { x: end.x + Math.sin(ramp.heading)*3, z: end.z + Math.cos(ramp.heading)*3 };
  near(rampGrade(ramp, point, SEA_LEVEL + 1), end.y, 'interior headland lowered to the bottom apron');
});

test('unavailable descending shores and offshore clearance return null without fabricated geometry', () => {
  const course = new Course(definition, ROUTE_VARIANTS[1].seed);
  assert.equal(buildDeepRamp(course, { shoreOffset: () => null }), null);
  assert.equal(buildDeepRamp(course, { offshoreClearance: () => false }), null);
  assert.equal(buildDeepRamp(new Course(COURSE.find(def => def.id === 'high-country'), 1989)), null);
});

// DEEP-RAMP-2 acceptance: use actual installed courses and the real fixed-step Duel.

function duelFor(seed) {
  const duel = new Duel({ seed, deepProviders: [kelpCoastProvider], featureFlags: { 'the-deep': true } });
  duel.startCampaign({ seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1 });
  Object.assign(duel.state, { status: 'racing', countdown: 0 });
  return duel;
}
function place(duel, progress, angle=0, speed=0, side=0) {
  const ramp=duel.deepRuntime.ramp, point=rampAt(ramp,progress,side), near=duel.course.nearest(point.x,point.z);
  Object.assign(duel.state,{s:near.s,prevS:near.s,lateral:near.lateral,prevLateral:near.lateral,
    headingError:Math.atan2(Math.sin(ramp.heading+angle-duel.course.at(near.s).heading),Math.cos(ramp.heading+angle-duel.course.at(near.s).heading)),
    speedMph:speed,groundHeight:point.y,airHeight:0,airborne:false,impactTimer:0,_jumpY:null});
}

test('angled entry reaches the water on all routes, with steering and reverse up the ramp', () => {
  for (const [index,route] of ROUTE_VARIANTS.entries()) {
    const duel=duelFor(route.seed), ramp=duel.course.deepRamp;
    assert.equal(ramp.atDistance,[2184,2192,2192][index],'same coastal cove; B shifts 48 m to clear its headland');
    place(duel,2,.75,45,2);duel.state.pushVelocity=20;duel.state.slipAngle=.8;
    duel.setInput({throttle:1,steer:.35});
    for(let step=0;step<2400 && !duel.state.deepJourney;step++){
      duel.step(1/120);
      const point=duel.course.worldAt(duel.state.s,duel.state.lateral), local=rampCoordinates(ramp,point);
      assert.ok(Math.abs(local.side)<=4.01,'player remains inside kerbs even holding steering');
      assert.ok(Math.abs(duel.state.speedMph)<=18,'steady roll cap');
      assert.equal(duel.state.slipAngle,0);assert.equal(duel.state.pushVelocity,0);
    }
    assert.equal(duel.state.deepJourney?.phase,'choice','actual shoreline choice reached');
    assert.equal(duel.state.speedMph,0);
    // Back out from the choice using the normal brake hold and signed reverse.
    duel.chooseDeep('turn-back');duel.step(1/120);duel.setInput({throttle:0,brake:1,steer:0});
    for(let step=0;step<2400 && duel.state.deepJourney;step++)duel.step(1/120);
    assert.equal(duel.state.status,'racing');assert.equal(duel.state.deepJourney,undefined);
  }
});

test('higher ramp camera reads state and blends at the road and below the water', () => {
  const duel=duelFor(1989), ramp=duel.course.deepRamp;
  place(duel,0);near(rampChaseCamera(duel).blend,0,'road blend');
  place(duel,40);const before=JSON.stringify(duel.state), camera=rampChaseCamera(duel);
  assert.ok(camera.blend>.99);assert.ok(camera.position.y-rampAt(ramp,40).y>8);
  assert.ok(rampCoordinates(ramp,camera.target).along>rampCoordinates(ramp,camera.position).along);
  assert.equal(JSON.stringify(duel.state),before,'camera is read-only');
  place(duel,ramp.length);near(rampChaseCamera(duel).blend,0,'underwater blend');
});

function triangleHeight(point,a,b,c){
  const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);
  if(Math.abs(det)<1e-10)return null;
  const u=((b.z-c.z)*(point.x-c.x)+(c.x-b.x)*(point.z-c.z))/det;
  const v=((c.z-a.z)*(point.x-c.x)+(a.x-c.x)*(point.z-c.z))/det;
  return u>=-1e-5&&v>=-1e-5&&u+v<=1.00001 ? u*a.y+v*b.y+(1-u-v)*c.y : null;
}
test('all rendered terrain triangles stay below the full deck on A/B/C and ground outside the cutting is exact', () => {
  for(const route of ROUTE_VARIANTS){
    const duel=duelFor(route.seed),course=duel.course,ramp=course.deepRamp,control=new Course(definition,route.seed);
    const road=strip(course,-7,7,.035);assert.ok(road.index.count>0,'road mesh survives ramp cutting');road.dispose();
    const triangles=[];
    for(const geometry of [terrainGeometry(course),farTerrainGeometry(course)]){
      const p=geometry.attributes.position,idx=geometry.index.array;
      for(let i=0;i<idx.length;i+=3){
        const tri=[idx[i],idx[i+1],idx[i+2]].map(k=>({x:p.getX(k),y:p.getY(k),z:p.getZ(k)}));
        const local=tri.map(p=>rampCoordinates(ramp,p));
        if(Math.max(...local.map(p=>p.along))<0||Math.min(...local.map(p=>p.along))>ramp.points.at(-1).horizontal||
          Math.max(...local.map(p=>p.side))<-6||Math.min(...local.map(p=>p.side))>6)continue;
        triangles.push(tri);
      }
      geometry.dispose();
    }
    for(let progress=1;progress<120;progress+=1)for(let side=-6;side<=6;side+=.5){
      const point=rampAt(ramp,progress,side),near=course.nearest(point.x,point.z);
      nearEqual(course.groundAt(near.s,near.lateral).y,point.y,.002,'full-width physical cutting');
      const heights=triangles.map(t=>triangleHeight(point,...t)).filter(y=>y!==null);
      assert.ok(heights.length,'terrain covers the cutting');
      assert.ok(Math.max(...heights)<=point.y+.006,'no rendered hillside triangle pokes through deck');
    }
    for(let progress=5;progress<120;progress+=5)for(const side of [-18,18]){
      const point=rampAt(ramp,progress,side),n=course.nearest(point.x,point.z);
      assert.deepEqual(course.groundAt(n.s,n.lateral),control.groundAt(n.s,n.lateral),'outside earthworks unchanged');
    }
  }
});
function nearEqual(a,b,tolerance,label){assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);}

test('generated rock records without world coordinates are cleared consistently with their colliders',()=>{
  const duel=duelFor(1989), course=duel.course;
  const rock=course.features.rocks.find(p=>Math.abs(p.s-2177.709968108684)<.001);
  assert.ok(rock && !Object.hasOwn(rock,'x'));
  assert.equal(rampClearsScenery(course,rock),true);
  assert.ok(!course.obstaclesNear(rock.s-1,rock.s+1).some(o=>o.source===rock));
  const moved=duelFor(42).course, oldRock=moved.features.rocks.find(p=>Math.abs(p.s-2141.7994199553505)<.001);
  assert.ok(oldRock);assert.equal(rampClearsScenery(moved,oldRock),false,'the old B rock remains outside the new cutting');
  assert.ok(moved.obstaclesNear(oldRock.s-1,oldRock.s+1).some(o=>o.source===oldRock),'its collider is retained');
});

test('capable cars replace the prior hillside tilt with the flat ramp cross-section',()=>{
  for(const car of ['dusthawk_rally','titan_monster']){
    const duel=new Duel({seed:1989,deepProviders:[kelpCoastProvider],featureFlags:{'the-deep':true}});
    duel.startCampaign({seed:1989,car,mode:'duel',deepKit:true,opponentCount:1});
    Object.assign(duel.state,{status:'racing',countdown:0});place(duel,40,0,12);
    duel.state.terrainPitch=.3;duel.state.terrainRoll=.6;
    duel.step(1/120);
    assert.ok(Math.abs(duel.state.terrainRoll)<.005,'stale hillside roll cleared');
    assert.ok(duel.state.terrainPitch<-.1,'capable car follows downhill pitch');
  }
});

test('rendered terrain outside the cutting preserves the original source planes',()=>{
  const duel=duelFor(1989), course=duel.course, control=new Course(definition,1989), ramp=course.deepRamp;
  function localTriangles(geometry){
    const p=geometry.attributes.position,idx=geometry.index.array,triangles=[];
    for(let i=0;i<idx.length;i+=3){
      const t=[idx[i],idx[i+1],idx[i+2]].map(k=>({x:p.getX(k),y:p.getY(k),z:p.getZ(k)}));
      const local=t.map(p=>rampCoordinates(ramp,p));
      if(Math.max(...local.map(p=>p.along))<0||Math.min(...local.map(p=>p.along))>ramp.points.at(-1).horizontal ||
        Math.max(...local.map(p=>p.side))<-25||Math.min(...local.map(p=>p.side))>25)continue;
      triangles.push(t);
    }
    geometry.dispose();return triangles;
  }
  const current=localTriangles(terrainGeometry(course)), original=localTriangles(terrainGeometry(control));
  for(let progress=5;progress<115;progress+=5)for(const side of [-20,-16,16,20]){
    const p=rampAt(ramp,progress,side);
    const heights=triangles=>triangles.map(t=>triangleHeight(p,...t)).filter(y=>y!==null);
    nearEqual(Math.max(...heights(current)),Math.max(...heights(original)),.002,'outside rendered source plane');
  }
});

// DEEP-RAMP-2: retain the original independent interior-headland guard for the widened cove.
test('an interior headland rejects a cove even when its four corners and offshore clearance pass', () => {
  const course = new Course(definition, ROUTE_VARIANTS[0].seed), first = buildDeepRamp(course);
  assert.ok(first);
  // An isolated emergence beyond the ramp end lies inside the original cove,
  // away from its center and four corners. Only this actual Course instance's
  // terrain reader is wrapped; feature records and generators are unchanged.
  const interior = {
    x: first.cove.center.x + Math.cos(first.heading) * 2 + Math.sin(first.heading) * 3,
    z: first.cove.center.z - Math.sin(first.heading) * 2 + Math.cos(first.heading) * 3,
  };
  const originalGroundAt = course.groundAt;
  course.groundAt = function(s, lateral) {
    const point = originalGroundAt.call(this, s, lateral);
    return Math.hypot(point.x - interior.x, point.z - interior.z) < .45
      ? { ...point, y: SEA_LEVEL + 1 } : point;
  };
  for (const corner of first.cove.corners) {
    const nearest = course.nearest(corner.x, corner.z);
    assert.ok(course.groundAt(nearest.s, nearest.lateral).y < SEA_LEVEL, 'all old corner tests still pass');
  }
  assert.equal(offshoreClearance(course, first.cove.center.x, first.cove.center.z, Math.hypot(6, 6)), true);
  const inside = course.nearest(interior.x, interior.z);
  assert.ok(course.groundAt(inside.s, inside.lateral).y > SEA_LEVEL, 'the interior genuinely emerges above water');
  const next = buildDeepRamp(course);
  assert.ok(next && next.atDistance > first.atDistance, 'interior emergence rejects the otherwise-clear first cove');
  clearance(course, next);
});
