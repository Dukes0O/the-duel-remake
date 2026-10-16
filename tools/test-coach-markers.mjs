import test from 'node:test';
import assert from 'node:assert/strict';
import {coachAllowed, buildCoachMarkers, setCoachEnabled, coachEnabled} from '../src/coach-markers.js';
const context={enabled:true,flag:true,intelLevel:2,status:'racing',mode:'duel',difficulty:'hard',cpuDifficulty:'hard',cup:false};
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
