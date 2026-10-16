import test from 'node:test';
import assert from 'node:assert/strict';
import {coachAllowed, buildCoachMarkers, setCoachEnabled, coachEnabled, coachRaceContext} from '../src/coach-markers.js';
const context={playerId:'kyle',runPlayerId:'kyle',racePlayerId:'kyle',enabled:true,flag:true,intelLevel:2,status:'racing',mode:'duel',difficulty:'hard',cpuDifficulty:'hard',cup:false};
const course={def:{id:'unit-course'},closed:true,length:1000,worldAt:(s,lateral)=>({x:s,z:lateral}),groundAt:()=>({y:4})};
const dossier={courseId:'unit-course',route:'fixed',notes:{one:{note:'Brake before turning.'}},analysis:{corners:[{id:'one',number:1,apexS:200,entryS:170,exitS:230}]},reference:{eventId:'unit-course',route:'fixed',corners:[{id:'one',brakeS:145}],poseSamples:[[0,17000,-200,0,0,0,0],[1,20000,300,0,0,0,0],[2,23000,100,0,0,0,0]]}};
// Unit corner IDs are supplied explicitly; native dossiers use stable corner IDs.
test('off default and every exclusion fails closed',()=>{
 assert.equal(coachAllowed({}),false);assert.equal(coachAllowed(context),true);
 for(const patch of [{enabled:false},{flag:false},{intelLevel:1},{status:'menu'},{status:'paused'},{cup:true},{mode:'grandprix',difficulty:'hard'},{onFoot:true},{inspection:true},{mode:'wasteland'},{mode:'grandprix',cpuDifficulty:'hard'}])assert.equal(coachAllowed({...context,...patch}),false,JSON.stringify(patch));
 assert.equal(coachAllowed({...context,mode:'grandprix',difficulty:'medium',cpuDifficulty:'medium'}),true);
});
test('option is transient, owner-specific and strictly boolean',()=>{
 const app={player:{id:'kyle'}},other={player:{id:'kyle'}};assert.equal(coachEnabled(app),false);
 setCoachEnabled(app,true);assert.equal(coachEnabled(app),true);assert.equal(coachEnabled(other),false);
 app.player={id:'gratian'};assert.equal(coachEnabled(app),false);app.player={id:'kyle'};assert.equal(coachEnabled(app),false);
 setCoachEnabled(app,'yes');assert.equal(coachEnabled(app),false);
});
test('marker uses real braking location and native lateral apex poses without changing inputs',()=>{
 const before=JSON.stringify({course,dossier});const markers=buildCoachMarkers(course,dossier,context);
 assert.equal(markers.length,1);assert.equal(markers[0].brake.x,145);assert.equal(markers[0].brake.y,4.06);
 assert.deepEqual(markers[0].line.map(p=>[p.x,p.z]),[[170,-2],[200,3],[230,1]]);
 assert.equal(JSON.stringify({course,dossier}),before);
});
test('missing notes, mismatched event/route and open routes never get invented markers',()=>{
 for(const value of [{...dossier,notes:{}},{...dossier,courseId:'other'},{...dossier,route:'other'},{...dossier,reference:null},{...dossier,reference:{...dossier.reference,poseSamples:[]}}])assert.deepEqual(buildCoachMarkers(course,value,context),[]);
 assert.deepEqual(buildCoachMarkers({...course,closed:false},dossier,context),[]);
 assert.deepEqual(buildCoachMarkers(course,dossier,{...context,intelLevel:1}),[]);
});
test('wraparound corners follow only their own reference samples',()=>{
 const d={...dossier,analysis:{corners:[{id:'one',apexS:5,entryS:970,exitS:30}]},reference:{...dossier.reference,corners:[{id:'one',brakeS:940}],poseSamples:[[0,1000,100,0,0,0,0],[1,50000,0,0,0,0,0],[2,98000,-100,0,0,0,0]]}};
 assert.deepEqual(buildCoachMarkers(course,d,context)[0].line.map(p=>p.x),[980,10]);
});

test('actual Panorama dossier produces read-only markers on the bundled team lap',async()=>{
 const {Course}=await import('../src/course.js');const {COURSE}=await import('../src/config.js');
 const {referenceLap}=await import('../src/reference-laps.js');const {buildTrackDossier}=await import('../src/track-analysis.js');
 const ref=referenceLap('panorama-ridge','fixed');const actual=new Course(COURSE.find(c=>c.id==='panorama-ridge'),ref.seed);
 const dossier=buildTrackDossier(actual,{route:'fixed',reference:ref}),before=JSON.stringify(ref);
 const markers=buildCoachMarkers(actual,dossier,context);assert.ok(markers.length>5);
 for(const marker of markers){assert.ok(marker.line.length>=2);for(const point of [marker.brake,...marker.line])assert.ok([point.x,point.y,point.z].every(Number.isFinite));}
 assert.equal(JSON.stringify(ref),before);assert.equal(ref,referenceLap('panorama-ridge','fixed'));
});

test('race context fails closed for missing course and foreign or stale run ownership',()=>{
 const app={player:{id:'kyle'},_runPlayerId:'kyle',_switches:()=>({enabled:()=>true}),getIntelLevel:()=>2};
 setCoachEnabled(app,true);const state={...context,playerId:'kyle'};
 assert.equal(coachAllowed(coachRaceContext(app,course,state)),true);
 assert.equal(coachAllowed(coachRaceContext(app,null,state)),false);
 assert.equal(coachAllowed(coachRaceContext(app,course,{...state,playerId:'gratian'})),false);
 app._runPlayerId='gratian';assert.equal(coachAllowed(coachRaceContext(app,course,state)),false);
 for(const patch of [{playerId:null},{racePlayerId:'other'},{runPlayerId:'other'}])assert.equal(coachAllowed({...context,...patch}),false);
});

test('real setup helper binds once, reflects the current player and disables excluded choices',async()=>{
 const {syncCoachChoice}=await import('../src/race-settings-ui.js');
 function button(value){return {dataset:{coach:value},disabled:false,events:[],attributes:{},classList:{toggle(){}},setAttribute(k,v){this.attributes[k]=v;},addEventListener(_,fn){this.events.push(fn);}};}
 const buttons=[button('off'),button('on')];let installed=null;
 const group={querySelectorAll:()=>buttons};
 const anchor={insertAdjacentElement(_,value){installed=value;}};
 const root={ownerDocument:{createElement:()=>group},querySelector:q=>q==='#qualifying-choice'?anchor:installed};
 const app={player:{id:'kyle'},profile:{},_switches:()=>({enabled:()=>true}),getIntelLevel:()=>2};
 const choices={mode:'duel',difficulty:'medium',cpuDifficulty:'medium'},stage={id:'unit-course',closed:true};
 syncCoachChoice(root,app,choices,stage);assert.equal(group.hidden,false);assert.equal(group.id,'coach-choice');
 assert.match(group.innerHTML,/aria-label="Coach markers"/);assert.equal(buttons[0].attributes['aria-pressed'],'true');
 buttons[1].events[0]();assert.equal(coachEnabled(app),true);assert.equal(buttons[1].events.length,1);
 app.player={id:'gratian'};syncCoachChoice(root,app,choices,stage);assert.equal(coachEnabled(app),false);
 app.profile.cups={active:{id:'cup'}};syncCoachChoice(root,app,choices,stage);assert.equal(group.hidden,true);assert.ok(buttons.every(b=>b.disabled));
 buttons[1].events[0]();assert.equal(coachEnabled(app),false);
 delete app.profile.cups;choices.mode='grandprix';choices.difficulty='hard';syncCoachChoice(root,app,choices,stage);assert.equal(group.hidden,true);
 choices.mode='timetrial';app.getIntelLevel=()=>1;syncCoachChoice(root,app,choices,stage);assert.equal(group.hidden,true);
 assert.deepEqual(app.profile,{});assert.equal(Object.hasOwn(choices,'coach'),false);
});

test('braking guide is above the actual rendered asphalt, not buried by terrain relief',async()=>{
 const THREE=await import('three');const {Course}=await import('../src/course.js');const {COURSE}=await import('../src/config.js');
 const {referenceLap}=await import('../src/reference-laps.js');const {buildTrackDossier}=await import('../src/track-analysis.js');const {strip}=await import('../src/world-surfaces.js');
 const ref=referenceLap('panorama-ridge','fixed'),actual=new Course(COURSE.find(c=>c.id==='panorama-ridge'),ref.seed);
 const markers=buildCoachMarkers(actual,buildTrackDossier(actual,{route:'fixed',reference:ref}),context);
 const road=new THREE.Mesh(strip(actual,s=>-actual.roadHalfWidthAt(s),s=>actual.roadHalfWidthAt(s),.035),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
 road.updateMatrixWorld();try{
  const brake=markers[0].brake;const ray=new THREE.Raycaster(new THREE.Vector3(brake.x,brake.y+100,brake.z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObject(road)[0];assert.ok(hit,'actual road exists at reference braking point');assert.ok(brake.y>hit.point.y+.01,'guide clears the visible asphalt by at least1cm');assert.ok(brake.y-hit.point.y<.1,'guide stays close to road');
 }finally{road.geometry.dispose();road.material.dispose();}
});
