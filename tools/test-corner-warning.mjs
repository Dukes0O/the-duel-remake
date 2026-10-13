import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';
let api={};
try { api=await import('../src/corner-warning.js'); } catch(error) { if(error.code!=='ERR_MODULE_NOT_FOUND')throw error; }
let checks=0;const failures=[];
const check=(label,run)=>{checks++;try{run();}catch(error){failures.push(`${label}: ${error.message}`);}};
check('pure warning API exists',()=>{assert.equal(typeof api.cornerWarnings,'function');assert.equal(typeof api.cornerWarning,'function');});
for(const [def,name,board] of [[HARBOUR_LIGHTS,'Casino Corner',100],[HARBOUR_LIGHTS,'Lantern Hairpin',150],[HARBOUR_LIGHTS,'Harbour Turn',100],[TREMBLANT_WOODS,'Ridge Corner',100],[TREMBLANT_WOODS,'Beaver Hairpin',100],[TREMBLANT_WOODS,"Devil's Chicane 1",100]])check(`${def.id}: ${name} actual warning boundaries`,()=>{
 const course=new Course(def,1989),before=JSON.stringify(course.features),piece=course.script.pieces.find(p=>p.name===name);
 const rows=api.cornerWarnings(course),row=rows.find(c=>c.name===name),phase=s=>((s%course.length)+course.length)%course.length;
 assert.equal(row.entryS,phase(piece.s0));assert.equal(row.brakeBoard,board);assert.equal(row.apexS,phase(piece.s0+(piece.s1-piece.s0)*.55));assert.equal(row.direction,piece.dir>0?'L':'R');assert.equal(row.hairpin,piece.radius<40);
 const at=distance=>api.cornerWarning(course,{status:'racing',s:row.brakeS-distance});
 // Harbour Casino and Woods Ridge have no preceding overlapping apex in this window.
 if(name==='Casino Corner'||name==='Ridge Corner'){
  assert.notEqual(at(250.01)?.id,row.id);
  for(const [distance,label,color] of [[250,'','amber'],[150.01,'','amber'],[150,'150','amber'],[100.01,'150','amber'],[100,'100','amber'],[50.01,'100','amber'],[50,'50','amber'],[.01,'50','amber'],[0,'BRAKE','red']]){
   const view=at(distance);assert.equal(view.id,row.id);assert.equal(view.distance,label);assert.equal(view.color,color);
  }
 }
 assert.notEqual(api.cornerWarning(course,{status:'racing',s:row.apexS+.01})?.id,row.id);
 assert.equal(api.cornerWarning(course,{status:'menu',s:row.brakeS}),null);assert.equal(api.cornerWarning(course,{status:'racing',paused:true,s:row.brakeS}),null);
 assert.equal(api.cornerWarning(course,{status:'racing',onFoot:true,s:row.brakeS}),null);assert.equal(api.cornerWarning(course,{status:'racing',s:NaN}),null);
 assert.equal(JSON.stringify(course.features),before);assert.equal(api.cornerWarnings(course),rows,'same course reuses immutable corner data');
});
check('actual Woods chicane first unpassed apex wins, then next',()=>{
 const c=new Course(TREMBLANT_WOODS,1989),rows=api.cornerWarnings(c),a=rows.find(x=>x.name==="Devil's Chicane 1"),b=rows.find(x=>x.name==="Devil's Chicane 2");
 assert.equal(a.brakeBoard,100);assert.equal(b.brakeBoard,100);
 const s=a.brakeS;assert.ok(b.brakeS-s<=250,'actual windows overlap');assert.equal(api.cornerWarning(c,{status:'racing',s}).id,a.id);
 assert.equal(api.cornerWarning(c,{status:'racing',s:a.apexS+.01}).id,b.id);
});
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
console.log(`Corner warning: ${checks} groups, ${failures.length} failures.`);
