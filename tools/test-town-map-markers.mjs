import assert from 'node:assert/strict';
import {createTownCamera} from '../src/town/view/town-camera.js';
import {buildTownMapMarkers, focusTownMapMarker, layoutTownMapMarkers} from '../src/town/view/town-map-markers.js';

const town = {
  buildings: [{id:'well-1',x:2,z:3,width:2,depth:1}],
  tick:2n,
  outposts: {dot:{position:{x:55,z:70},trucks:[{id:'dot-1',vehicle:'flatbed',origin:{x:0,z:0},destination:{x:8,z:0},route:[{x:2,z:0},{x:6,z:0}],startedTick:0n,durationTicks:4,status:'on-road'}]},
    tam:{standing:0},
    pim:{trucks:[{id:'missing-position',status:'on-road'}]}},
  haulers:[{id:'hauler-1',vehicle:'truck',origin:{x:8,z:16},destination:{x:24,z:32},route:[{x:16,z:24}],startedTick:0n,durationTicks:8,status:'on-road'}],
  reports:[
    {id:'fire',what:'A fire needs water.',where:'Town',unanswered:true,priority:5},
    {id:'site',what:'A site needs help.',where:'Somewhere',unanswered:true,facts:{siteId:'well-1'}},
    {id:'unknown',what:'No known place.',where:'Far away',unanswered:true},
    {id:'direct-location',what:'A report with direct coordinates.',where:'Far away',unanswered:true,x:42,z:18},
    {id:'closed',what:'Resolved.',where:'Town',unanswered:false},
  ],
};
const before = JSON.stringify(town,(_key,value)=>typeof value==='bigint'?String(value):value);
const markers = buildTownMapMarkers(town);
const marker = (kind,id) => markers.find(item => item.kind===kind && item.id===`${kind}:${id}`);
assert.ok(markers.some(item=>item.id==='place:tin-town'&&item.x===600&&item.z===0),'named world places provide base map markers');
assert.deepEqual({x:marker('outpost','dot').x,z:marker('outpost','dot').z},{x:55,z:70},'outposts use their saved map position');
assert.deepEqual({x:marker('outpost','tam').x,z:marker('outpost','tam').z},{x:424,z:-304},'legacy outpost records read their place id from content');
assert.deepEqual({x:marker('truck','dot-1').x,z:marker('truck','dot-1').z},{x:4,z:0},'trade trucks interpolate on saved route coordinates using the town tick');
assert.deepEqual({x:marker('truck','hauler-1').x,z:marker('truck','hauler-1').z},{x:12,z:20},'haulers follow their explicit route in world metres');
assert.equal(marker('truck','missing-position'),undefined,'trucks without a route position are not pinned to a false location');
assert.deepEqual({x:marker('report','fire').x,z:marker('report','fire').z},{x:0,z:0},'town reports point to the town centre');
assert.deepEqual({x:marker('report','site').x,z:marker('report','site').z},{x:24,z:28},'site reports use the building footprint centre');
assert.equal(marker('report','unknown'),undefined,'reports without a known location stay unpinned');
assert.deepEqual({x:marker('report','direct-location').x,z:marker('report','direct-location').z},{x:42,z:18},'reports use their saved top-level world coordinates');
assert.equal(marker('report','closed'),undefined,'resolved reports are not shown');
assert.equal(JSON.stringify(town,(_key,value)=>typeof value==='bigint'?String(value):value),before,'building markers does not alter town data');

const camera=createTownCamera({width:800,height:600,target:{x:0,y:0,z:0},zoom:.5});
const state=focusTownMapMarker(camera,marker('outpost','dot'));
assert.equal(state.target.x,55); assert.equal(state.target.z,70); assert.equal(state.zoom,.16);
assert.ok(camera.position.x!==0||camera.position.z!==0,'focusing a marker updates the camera');
assert.throws(()=>focusTownMapMarker(camera,null),/marker/);
const many=Array.from({length:1000},(_,index)=>({id:`many:${index}`,kind:'place',label:`Place ${index}`,x:index,z:0}));
assert.equal(layoutTownMapMarkers(many,camera,{width:1280,height:800,zoom:1}).length,1000,'layout accepts every marker without a fixed count limit');

console.log('Town map markers: places, coordinate-backed outposts, road vehicles, reports, read-only data, and camera focus passed.');
