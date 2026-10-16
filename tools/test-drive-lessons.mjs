import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_LESSON_CORNERS,createDriveLesson,stepDriveLesson,placeCones,instructorControls,buildInstructorRun} from '../src/lessons/drive-lessons.js';

// Plain car-view tests only. These do not simulate a car or prove instructor physics.
const corner={id:'test-corner',startS:80,finishS:200,dir:1};
const instructor={timeSec:1,redBoardS:125,cones:[
  {id:1,s:100,lateral:-4,x:100,z:-4},{id:2,s:130,lateral:4,x:130,z:4},{id:3,s:160,lateral:-4,x:160,z:-4}]};
const view=(s,lateral=-4,extra={})=>({s,lateral,world:{x:s,z:lateral},speedMph:60,brake:0,throttle:0,tyreSlip:0,status:'racing',paused:false,offRoad:false,...extra});
const create=()=>createDriveLesson('corner',{corner,instructor});
const begin=lesson=>stepDriveLesson(lesson,view(80),{start:true},0);
function right(lesson,{brakeS=100,inside=true,wide=true,screech=0,gas=true,dt=.1}={}){
  begin(lesson);
  stepDriveLesson(lesson,view(brakeS,-4,{brake:.5}),{},dt);
  stepDriveLesson(lesson,view(130,inside?4:-4,{tyreSlip:screech?1.1:0,throttle:gas?.8:0}),{},screech||dt);
  stepDriveLesson(lesson,view(160,wide?-4:4),{},dt);
  return stepDriveLesson(lesson,view(200,wide?-4:4),{},dt);
}
function reachRight(lesson){begin(lesson);stepDriveLesson(lesson,view(200),{},.4);}

test('the two settled corner rows retain their named gates and rolling starts',()=>{
  assert.deepEqual(DRIVE_LESSON_CORNERS.map(row=>[row.courseId,row.cornerName,row.gateBefore,row.gateOffsetM,row.rollingMph]),[
    ['panorama-ridge','The Cutting','The Cutting',180,100],['tremblant-woods','Beaver Hairpin','Beaver Kink',150,75]]);
  assert.ok(Object.isFrozen(DRIVE_LESSON_CORNERS)&&DRIVE_LESSON_CORNERS.every(Object.isFrozen));
});
test('creation is isolated and neither car views nor plans are mutated',()=>{
  const input=JSON.stringify({corner,instructor}),a=create(),b=create(),car=view(100,-4,{brake:.7});
  begin(a);const before=JSON.stringify(car);stepDriveLesson(a,car,{},.1);
  assert.equal(JSON.stringify(car),before);assert.equal(JSON.stringify({corner,instructor}),input);
  assert.equal(b.phase,'ready');assert.equal(b.streak,0);assert.equal(a.stage,'late');
});
test('late try counts a real contact, records screech and advances only at the next start',()=>{
  const lesson=create();begin(lesson);stepDriveLesson(lesson,view(110,-4,{brake:.7,tyreSlip:1.2}),{},.6);
  const answer=stepDriveLesson(lesson,view(115),{wallHit:true},.1);
  assert.equal(answer.result,'running');assert.equal(lesson.phase,'result');assert.equal(lesson.stage,'late');
  assert.equal(lesson.lastAttempt.endReason,'wall');assert.equal(lesson.lastAttempt.screechSeconds,.6);
  assert.equal(answer.radio,'drive.radio.corner.late.early');begin(lesson);assert.equal(lesson.stage,'right');
});
test('the four right-try rules pass and cones tip only once per attempt',()=>{
  const lesson=create();reachRight(lesson);const answer=right(lesson);
  assert.equal(answer.result,'running');assert.equal(answer.radio,'drive.radio.corner.right.pass');
  assert.deepEqual(lesson.lastAttempt.rules,[true,true,true,true]);
  assert.deepEqual(lesson.lastAttempt.cones.map(row=>row.id),[1,2,3]);
  const repeat=stepDriveLesson(lesson,view(200),{},.1);assert.deepEqual(repeat.cones,[]);
  begin(lesson);assert.equal(lesson.stage,'challenge');
});
test('brake window includes minus15 and plus5; first failure is coached',()=>{
  for(const [brakeS,passes]of [[85,true],[105,true],[84.999,false],[105.001,false]]){
    const lesson=create();reachRight(lesson);const answer=right(lesson,{brakeS});
    assert.equal(lesson.lastAttempt.rules[0],passes,String(brakeS));
    if(!passes){assert.equal(answer.result,'retry');assert.equal(answer.radio,'drive.radio.corner.coach.brake');}
  }
});
test('inside, outside throttle and screech failures keep their coaching order',()=>{
  for(const [options,radio]of [[{inside:false},'inside'],[{wide:false},'exit'],[{gas:false},'exit'],[{screech:.3},'screech']]){
    const lesson=create();reachRight(lesson);const answer=right(lesson,options);
    assert.equal(answer.result,'retry');assert.equal(answer.radio,'drive.radio.corner.coach.'+radio);
  }
  const lesson=create();reachRight(lesson);assert.equal(right(lesson,{screech:.299}).result,'running');
});
test('challenge requires three strictly faster runs; a slow or tied try resets it',()=>{
  const lesson=create();reachRight(lesson);right(lesson);
  for(let index=0;index<2;index++){begin(lesson);stepDriveLesson(lesson,view(200),{},.8);assert.equal(lesson.streak,index+1);}
  begin(lesson);stepDriveLesson(lesson,view(200),{},1);assert.equal(lesson.streak,0);
  for(let index=0;index<3;index++){begin(lesson);const answer=stepDriveLesson(lesson,view(200),{},.75);
    assert.equal(answer.result,index===2?'passed':'running');}
  assert.equal(lesson.done,true);assert.equal(lesson.bestMargin,.25);
});
test('wall, a stop, and more than one continuous second off-road retry right try',()=>{
  for(const reason of ['wall','stop','offroad']){
    const lesson=create();reachRight(lesson);begin(lesson);
    const answer=stepDriveLesson(lesson,view(110,-4,{speedMph:reason==='stop'?0:60,offRoad:reason==='offroad'}),{wallHit:reason==='wall'},reason==='offroad'?1.001:.1);
    assert.equal(answer.result,'retry');assert.equal(lesson.lastAttempt.endReason,reason);
  }
});
test('pause cannot advance the timer or observe inputs',()=>{
  const lesson=create();begin(lesson);const before=JSON.stringify(lesson);
  stepDriveLesson(lesson,view(200,4,{paused:true,brake:1,tyreSlip:2}),{},5);
  assert.equal(JSON.stringify(lesson),before);
});
test('swept cone tracking and finish crossing do not depend on sample spacing',()=>{
  const lesson=create();begin(lesson);
  const answer=stepDriveLesson(lesson,view(220),{},1.4);
  assert.equal(lesson.lastAttempt.elapsedSeconds,1.2);
  assert.ok(lesson.lastAttempt.cones.some(row=>row.id===1));
  assert.ok(lesson.lastAttempt.cones.some(row=>row.id===3));assert.equal(answer.result,'running');
});
test('bad authored plans and non-finite car views fail closed',()=>{
  assert.throws(()=>createDriveLesson('other',{corner,instructor}));
  assert.throws(()=>createDriveLesson('corner',{corner,instructor:{...instructor,timeSec:0}}));
  assert.throws(()=>createDriveLesson('corner',{corner,instructor:{...instructor,cones:[]}}));
  const lesson=create();begin(lesson);assert.throws(()=>stepDriveLesson(lesson,view(NaN),{},.1));
});

test('a counted cone can tip later, with one sound event at the tip threshold',()=>{
  const lesson=create();begin(lesson);
  const near=stepDriveLesson(lesson,view(100,-1.5),{},.1);
  assert.deepEqual(lesson.attempt.cones,[{id:1}]);assert.deepEqual(near.cones,[]);
  const tip=stepDriveLesson(lesson,view(100,-3.2),{},.1);
  assert.deepEqual(tip.cones,[{id:1,tipped:true,cue:'lesson.cone'}]);
  assert.deepEqual(stepDriveLesson(lesson,view(100,-4),{},.1).cones,[]);
});
test('off-road retries use continuous time, and exactly one second is allowed',()=>{
  const lesson=create();reachRight(lesson);begin(lesson);
  assert.equal(stepDriveLesson(lesson,view(100,-4,{offRoad:true}),{},1).result,'running');
  stepDriveLesson(lesson,view(110),{},.1);
  assert.equal(stepDriveLesson(lesson,view(120,-4,{offRoad:true}),{},.9).result,'running');
  assert.equal(stepDriveLesson(lesson,view(121,-4,{offRoad:true}),{},.101).result,'retry');
});
test('a challenge contact clears a previously earned streak',()=>{
  const lesson=create();reachRight(lesson);right(lesson);begin(lesson);
  stepDriveLesson(lesson,view(200),{},.8);assert.equal(lesson.streak,1);begin(lesson);
  assert.equal(stepDriveLesson(lesson,view(100),{wallHit:true},.1).result,'retry');
  assert.equal(lesson.streak,0);assert.equal(lesson.done,false);
});
test('timing begins at the gate and clips a step that crosses both gates',()=>{
  const lesson=create();stepDriveLesson(lesson,view(60),{start:true},0);
  stepDriveLesson(lesson,view(220),{},1.6);
  assert.equal(lesson.lastAttempt.elapsedSeconds,1.2);
  assert.equal(lesson.lastAttempt.timeLostSeconds,.2);
});


test('attempts cannot start beyond their gate or finish with zero-time movement',()=>{
  const lesson=create();reachRight(lesson);right(lesson);
  const before=JSON.stringify(lesson);
  assert.throws(()=>stepDriveLesson(lesson,view(200),{start:true},0));
  assert.equal(JSON.stringify(lesson),before);assert.equal(lesson.streak,0);
  begin(lesson);const started=JSON.stringify(lesson);
  assert.throws(()=>stepDriveLesson(lesson,view(200),{},0));
  assert.equal(JSON.stringify(lesson),started);assert.equal(lesson.streak,0);
});
test('physical failure after all four rules does not blame successful braking',()=>{
  const lesson=create();reachRight(lesson);begin(lesson);
  stepDriveLesson(lesson,view(100,-4,{brake:.5}),{},.1);
  stepDriveLesson(lesson,view(130,4,{throttle:.8}),{},.1);
  stepDriveLesson(lesson,view(160),{},.1);
  const result=stepDriveLesson(lesson,view(170),{wallHit:true},.1);
  assert.deepEqual(lesson.lastAttempt.rules,[true,true,true,true]);
  assert.equal(result.result,'retry');assert.equal(result.radio,null);
});
test('coaching lines respect the shared six-second interval between tries',()=>{
  const lesson=create();reachRight(lesson);
  assert.equal(right(lesson,{inside:false}).radio,'drive.radio.corner.coach.inside');
  assert.equal(right(lesson,{inside:false}).radio,null);
  begin(lesson);stepDriveLesson(lesson,view(110),{},6);
  assert.equal(stepDriveLesson(lesson,view(200),{},.1).radio,'drive.radio.corner.coach.brake');
});


test('reversing behind a crossed start gate never removes elapsed time',()=>{
  const lesson=create();begin(lesson);
  stepDriveLesson(lesson,view(70),{},2);
  stepDriveLesson(lesson,view(80),{},2);
  stepDriveLesson(lesson,view(200),{},1);
  assert.equal(lesson.lastAttempt.elapsedSeconds,5);
});
test('challenge summary ignores cone rules just like the streak does',()=>{
  const lesson=create();reachRight(lesson);right(lesson);begin(lesson);
  stepDriveLesson(lesson,view(200),{},.8);
  assert.equal(lesson.lastAttempt.rules[0],false);
  assert.equal(lesson.lastAttempt.passed,true);assert.equal(lesson.streak,1);
});


const straightCourse={roadHalfWidthAt:()=>6,groundAt:(s,lateral)=>({x:s,y:0,z:lateral})};
test('cone placement uses recorded brake, closest inside and outside exit with the fixed board',()=>{
  const poses=[{s:80,lateral:-4,brake:0},{s:100,lateral:-4,brake:.2},
    {s:120,lateral:0,brake:0},{s:130,lateral:4,brake:0},
    {s:160,lateral:-4,brake:0},{s:180,lateral:-2,brake:0}];
  const before=JSON.stringify(poses);
  const plan=placeCones(poses,{course:straightCourse,turnInS:110,turnOutS:150,exitSearchEndS:180,dir:1});
  assert.deepEqual(plan.cones.map(c=>[c.id,c.s,c.lateral]),[[1,100,-4],[2,130,4],[3,160,-4]]);
  assert.equal(plan.redBoardS,110);assert.equal(plan.finishS,220);
  assert.equal(JSON.stringify(poses),before);
  assert.throws(()=>placeCones(poses.map(p=>({...p,brake:0})),{course:straightCourse,turnInS:110,turnOutS:150,exitSearchEndS:180,dir:1}));
});
test('instructor controls retain settled pace and use the tyre yaw helper with braking',()=>{
  const calls=[],steerForYaw=(yaw,options)=>{calls.push({yaw,options});return .123;};
  const plan={course:straightCourse,car:{topSpeed:200,grip:1,gears:[80,120,200]},
    line:{offsetAt:()=>0},profile:{at:()=>100},drive:{mphToWorld:.44704},steerForYaw,
    turnInS:150,turnOutS:200,difficulty:'casual'};
  const state={s:100,lateral:0,speedMph:100,headingError:0,revs:.8,gear:1,tyreSlipRules:true};
  straightCourse.at=()=>({curvature:0});
  const surface={speedLimit:300,traction:1};
  const casual=instructorControls(state,surface,plan),pro=instructorControls(state,surface,{...plan,difficulty:'pro'});
  assert.equal(casual.targetMph,92);assert.equal(pro.targetMph,97);
  assert.equal(casual.steer,.123);assert.equal(casual.throttle,0);assert.ok(casual.brake>0);
  assert.equal(calls[0].options.tyreSlip,true);assert.equal(calls[0].options.brake,casual.brake);
  assert.equal(casual.boost,false);
});


test('instructor does not brake on a curved approach before the named corner',()=>{
  const course={...straightCourse,at:()=>({curvature:.02})};
  const plan={course,car:{grip:1,gears:[100]},line:{offsetAt:()=>0},profile:{at:()=>50},
    drive:{mphToWorld:.44704},steerForYaw:()=>0,difficulty:'casual',turnInS:150,turnOutS:200};
  const controls=instructorControls({s:100,lateral:0,speedMph:80,headingError:0,revs:.8,gear:0},
    {speedLimit:300,traction:1},plan);
  assert.equal(controls.brake,0);assert.equal(controls.throttle,0);
});
test('cone placement freezes the first outside exit instead of a later wider point',()=>{
  const poses=[{s:80,lateral:-4,brake:0},{s:100,lateral:-4,brake:.2},
    {s:120,lateral:0,brake:0},{s:130,lateral:4,brake:0},
    {s:160,lateral:-4,brake:0},{s:180,lateral:-2,brake:0},
    {s:240,lateral:-5,brake:0},{s:260,lateral:-3,brake:0}];
  const plan=placeCones(poses,{course:straightCourse,turnInS:110,turnOutS:150,exitSearchEndS:270,dir:1});
  assert.equal(plan.cones[2].s,160);assert.equal(plan.finishS,220);
});


// These are actual native runs, not the plain-view helper tests above.
// Execute only under normal heavy admission / the canonical lane gate.
for (const courseId of ['panorama-ridge','tremblant-woods']) {
  for (const difficulty of ['casual','pro']) {
    test(`native instructor ${courseId} ${difficulty}: clean, same seed, 30/60/144 FPS`,async()=>{
      const options={courseId,difficulty,car:'falcone_f42',upgrades:{},seed:1989};
      const baseline=await buildInstructorRun({...options,fps:30});
      for (const fps of [30,60,144]) {
        const actual=await buildInstructorRun({...options,fps});
        assert.deepEqual(actual,baseline,`native poses and plan repeat at ${fps} FPS`);
      }
      const {corner,instructor}=baseline;
      assert.ok(instructor.timeSec>0);
      assert.equal(instructor.finishS,instructor.cones[2].s+60);
      assert.equal(instructor.redBoardS,Math.min(instructor.cones[0].s+25,corner.turnInS));
      assert.equal(instructor.poses[0].s,corner.startS);
      assert.equal(instructor.poses.at(-1).s,corner.finishS);
      assert.equal(instructor.poses.at(-1).t,instructor.timeSec);
      assert.ok(instructor.poses.every(pose=>Number.isFinite(pose.x)&&Number.isFinite(pose.z)&&pose.tyreSlip<=1));
    });
  }
}
