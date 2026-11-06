import assert from 'node:assert/strict';
import {planTownRoutes,moveTownRouteWaypoint,makeTownRouteWorkOrder} from '../src/town/town-routes.js';

const hill=(x,z)=>Math.max(0,32-Math.hypot(x-100,z)/2);
const input={start:{x:0,z:0},end:{x:240,z:0},kind:'pipe',spacing:10,groundAt:hill};
const planned=planTownRoutes(input);
assert.ok(planned.routes.length>=2,'a hill produces at least two route choices');
assert.ok(planned.routes.length<=3,'route choices stay concise');
assert.equal(new Set(planned.routes.map(r=>r.id)).size,planned.routes.length,'route choices have unique ids');
assert.ok(planned.routes.every(r=>r.points.length>2&&r.length>=240),'each option has a sampled ground path');
assert.ok(planned.routes.some(r=>r.points.some(p=>Math.abs(p.z)>10)),'the low-cut route goes around the hill');
assert.ok(planned.routes.every(r=>r.ingredients.pipe>0&&r.machines.includes('trencher')),'routes list real materials and machines');
assert.ok(planned.routes.every(r=>r.profile.every(p=>Number.isFinite(p.ground)&&Number.isFinite(p.route)&&Number.isFinite(p.pressure))),'pipe side view includes ground, pipe and pressure');
assert.ok(planned.routes.some(r=>r.pumps>0),'uphill pipe route accounts for pumps');
assert.equal(planned.tunnel.available,false,'tunnel route stays unavailable before the trial passes');
assert.equal(planTownRoutes({...input,tunnelTrialPassed:true}).tunnel.available,true,'tunnel hook can be enabled by trial data');

const moved=moveTownRouteWaypoint({...input,waypoints:[{x:80,z:0}]},0,{x:80,z:40});
assert.ok(moved.routes.length>=2,'moving a waypoint recalculates options');
assert.ok(moved.routes.every(r=>r.points.some(p=>Math.abs(p.z-40)<10)),'new paths pass near the moved waypoint');
assert.throws(()=>moveTownRouteWaypoint(input,0,{x:1,z:1}),RangeError,'invalid waypoint index is rejected');

const road=planTownRoutes({...input,kind:'road'}).routes[0];
const order=makeTownRouteWorkOrder(road,'road');
assert.equal(order.stages[0].kind,'survey','work order starts with survey');
assert.equal(order.stages[1].kind,'grade','roads are graded rather than trenched');
assert.equal(order.stages[2].kind,'lay','the route is laid after ground work');
assert.ok(order.ingredients.gravel>0,'work order carries actual materials');
const flatRoute=makeTownRouteWorkOrder({length:100,cut:0,points:[{x:0,z:0},{x:100,z:0}],ingredients:{},machines:[],pumps:0},'road');
assert.ok(!flatRoute.stages.some(stage=>stage.kind==='fill'&&stage.amount===0),'a flat route omits its zero-volume fill stage');
assert.notEqual(order.route,road.points,'work order owns a plain copy of its route');
assert.throws(()=>planTownRoutes({...input,kind:'canal'}),TypeError,'unknown route kind is rejected');
assert.throws(()=>planTownRoutes({...input,groundAt:()=>NaN}),TypeError,'invalid ground data is rejected');
console.log('TOWN-ROUTES passed');
