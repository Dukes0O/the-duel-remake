import assert from 'node:assert/strict';
import {townRouteToolModel,townRouteToolMarkup,bindTownRouteTool} from '../src/town/ui/town-route-tool.js';

const hill=(x,z)=>Math.max(0,32-Math.hypot(x-100,z)/2);
const input={kind:'pipe',start:{x:0,z:0},end:{x:240,z:0},spacing:10,groundAt:hill};
const model=townRouteToolModel(input);
assert.equal(model.kind,'pipe','the selected route kind is shown');
assert.ok(model.routes.length>=2&&model.routes.length<=3,'the planner presents a short list of real options');
assert.ok(model.cells.length>100,'the map samples the supplied ground');
assert.match(model.profileMarkup,/ground, route and water pressure/i,'the side view names all three pipe lines');
const several=townRouteToolModel({...input,waypoints:[{x:40,z:10},{x:180,z:-10}]});
assert.equal(several.waypoints.length,2,'the model preserves every supplied waypoint');
assert.match(townRouteToolMarkup(several),/data-town-waypoint-hit="1"/,'each waypoint gets its own map handle');
const markup=townRouteToolMarkup(model);
for(const phrase of ['PLAN ON THE GROUND','Around the hill','Materials','Machines','Along the route','Agree to this route','tunnel trial']) {
  assert.ok(markup.toLowerCase().includes(phrase.toLowerCase()),`${phrase} appears in the tool`);
}
assert.match(markup,/data-town-waypoint-hit/,'the route point can be dragged');

const listeners=new Map(),callbacks={agreed:null,flags:null,valve:null,change:null},message={textContent:''};
let focusCount=0,capturedPointer=null;
const map={getBoundingClientRect:()=>({left:0,top:0,width:1000,height:560})};
const handleNode={focus(){focusCount++;}};
const root={innerHTML:'',addEventListener:(type,handler)=>listeners.set(type,handler),removeEventListener:type=>listeners.delete(type),
  setPointerCapture:id=>{capturedPointer=id;},querySelector:selector=>selector==='.town-route-message'?message:selector==='.town-route-map'?map:selector.startsWith('[data-town-waypoint-hit=')?handleNode:null};
const controls=bindTownRouteTool(root,input,{
  onAgree:value=>callbacks.agreed=value,onPlantFlags:value=>callbacks.flags=value,
  onValveMoment:value=>callbacks.valve=value,onPlanChange:value=>callbacks.change=value,
});
const target=(selector,data={})=>({dataset:data,closest:value=>value.includes(selector)?target(selector,data):null,setPointerCapture(){}});
const routeId=controls.getPlan().routes[0].id;
listeners.get('click')({target:target('data-town-route-select',{townRouteSelect:routeId})});
listeners.get('click')({target:target('data-town-route-agree')});
assert.equal(callbacks.agreed.workOrder.kind,'pipe','agree returns a real construction work order');
assert.ok(callbacks.flags.flags.length>1,'agree supplies survey flag locations');
assert.equal(callbacks.agreed.workOrder.route.length,callbacks.agreed.route.points.length,'the work order keeps the planned route');
controls.markRouteLaid(routeId);
listeners.get('click')({target:target('data-town-route-valve',{townRouteValve:routeId})});
assert.equal(callbacks.valve.cameraFollow,true,'opening the valve requests the camera follow');
assert.equal(callbacks.valve.followPoints.length,callbacks.agreed.route.points.length,'the camera receives the water path');
assert.match(message.textContent,/water is running/i,'the valve moment has a plain status');

let prevented=0;
listeners.get('keydown')({target:target('data-town-waypoint-hit',{townWaypointHit:'0'}),key:'ArrowRight',shiftKey:false,preventDefault(){prevented++;}});
assert.equal(callbacks.change.waypoints[0].x,130,'keyboard movement changes the waypoint in metres');
assert.equal(prevented,1,'keyboard movement prevents page scrolling');
assert.equal(focusCount,1,'keyboard editing keeps focus on the waypoint handle');
listeners.get('keydown')({target:target('data-town-waypoint-hit',{townWaypointHit:'1'}),key:'ArrowRight',shiftKey:false,preventDefault(){prevented++;}});
assert.equal(callbacks.change.waypoints[1].x,130,'keyboard movement can place an additional waypoint');
const hit=target('data-town-waypoint-hit',{townWaypointHit:'0'});
const beforeDrag=townRouteToolModel(input,{waypoints:callbacks.change.waypoints});
listeners.get('pointerdown')({target:hit,pointerId:4,preventDefault(){}});
listeners.get('pointermove')({clientX:650,clientY:280});
listeners.get('pointerup')();
const expectedX=beforeDrag.bounds.minX+0.65*(beforeDrag.bounds.maxX-beforeDrag.bounds.minX);
assert.ok(Math.abs(callbacks.change.waypoints[0].x-expectedX)<1,'pointer dragging maps the screen position into world coordinates');
assert.equal(capturedPointer,4,'drag capture stays on the stable route tool root');
assert.equal(root.innerHTML.includes('data-town-route-valve'),true,'laid pipes keep the valve action visible');
controls.dispose();
assert.equal(listeners.size,0,'disposing removes each event handler');
console.log('Town route tool: 26 checks passed.');
