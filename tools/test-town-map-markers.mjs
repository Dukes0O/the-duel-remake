import assert from 'node:assert/strict';
import {createTownCamera} from '../src/town/view/town-camera.js';
import {buildTownMapMarkers, focusTownMapMarker} from '../src/town/view/town-map-markers.js';

const town = {
  buildings: [{id:'well-1',x:2,z:3,width:2,depth:1}],
  outposts: {dot:{position:{x:55,z:70},trucks:[{id:'dot-1',vehicle:'flatbed',path:[{x:0,z:0},{x:2,z:0}],pathIndex:0,progress:.5}]},
    pim:{trucks:[{id:'missing-position',status:'on-road'}]}},
  haulers:[{id:'hauler-1',vehicle:'truck',path:[{x:1,z:2},{x:2,z:3}],pathIndex:0,progress:.25}],
  reports:[
    {id:'fire',what:'A fire needs water.',where:'Town',unanswered:true,priority:5},
    {id:'site',what:'A site needs help.',where:'Somewhere',unanswered:true,facts:{siteId:'well-1'}},
    {id:'unknown',what:'No known place.',where:'Far away',unanswered:true},
    {id:'closed',what:'Resolved.',where:'Town',unanswered:false},
  ],
};
const before = JSON.stringify(town);
const markers = buildTownMapMarkers(town);
const marker = (kind,id) => markers.find(item => item.kind===kind && item.id===`${kind}:${id}`);
assert.ok(markers.some(item=>item.id==='place:tin-town'&&item.x===600&&item.z===0),'named world places provide base map markers');
assert.deepEqual({x:marker('outpost','dot').x,z:marker('outpost','dot').z},{x:55,z:70},'outposts use their saved map position');
assert.deepEqual({x:marker('truck','dot-1').x,z:marker('truck','dot-1').z},{x:8,z:0},'trade trucks follow their saved road path and progress');
assert.deepEqual({x:marker('truck','hauler-1').x,z:marker('truck','hauler-1').z},{x:10,z:18},'haulers convert road cells to world metres');
assert.equal(marker('truck','missing-position'),undefined,'trucks without a route position are not pinned to a false location');
assert.deepEqual({x:marker('report','fire').x,z:marker('report','fire').z},{x:0,z:0},'town reports point to the town centre');
assert.deepEqual({x:marker('report','site').x,z:marker('report','site').z},{x:24,z:28},'site reports use the building footprint centre');
assert.equal(marker('report','unknown'),undefined,'reports without a known location stay unpinned');
assert.equal(marker('report','closed'),undefined,'resolved reports are not shown');
assert.equal(JSON.stringify(town),before,'building markers does not alter town data');

const camera=createTownCamera({width:800,height:600,target:{x:0,y:0,z:0},zoom:.5});
const state=focusTownMapMarker(camera,marker('outpost','dot'));
assert.equal(state.target.x,55); assert.equal(state.target.z,70); assert.equal(state.zoom,.16);
assert.ok(camera.position.x!==0||camera.position.z!==0,'focusing a marker updates the camera');
assert.throws(()=>focusTownMapMarker(camera,null),/marker/);

console.log('Town map markers: places, coordinate-backed outposts, road vehicles, reports, read-only data, and camera focus passed.');
