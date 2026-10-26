import test from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_LESSON_CORNERS,createDriveLesson,stepDriveLesson,placeCones,cornerPoints,buildLessonLine,instructorControls,buildInstructorRun,finishInstructorTrace,lessonPlanFor,instructorConeDistances,TIP_DISTANCE_M,LESSON_LINE} from '../src/lessons/drive-lessons.js';

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
test('late try radio: early braking, a slide after screech, a wall, or nothing; never the time-lost line',()=>{
  // contacts: what ends the try (a finish by default, or a wall)
  const late=(brakeS,screech,contacts={})=>{const lesson=create();begin(lesson);
    stepDriveLesson(lesson,view(brakeS,-4,{brake:.7}),{},.1);
    stepDriveLesson(lesson,view(150,-4,{tyreSlip:screech?1.2:0}),{},screech||.1);
    return stepDriveLesson(lesson,view(contacts.wallHit?160:200),contacts,.1).radio;};
  assert.equal(late(110,0),'drive.radio.corner.late.early');
  // DRIVE-LESSONS-LINES-2: the true lines replace the old time-lost line (late.result is gone).
  assert.equal(late(130,.5),'drive.radio.corner.late.slid');
  assert.equal(late(130,.49),null);
  assert.equal(late(130,.7,{wallHit:true}),'drive.radio.corner.late.off','a try that ends at a wall says where a slide takes you');
  assert.equal(late(130,0,{wallHit:true}),'drive.radio.corner.late.off','even with no screech');
  assert.equal(late(110,.7,{wallHit:true}),'drive.radio.corner.late.early','braking early still wins');
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
test('cones sit on the corner points, 1.5m from the outside edge and 1.0m from the inside edge',()=>{
  for (const dir of [-1,1]) {
    const options={brakeS:100,turnInS:110,apexS:130,exitS:160,dir};
    const plan=placeCones(straightCourse,options);
    assert.deepEqual(plan.cones.map(c=>[c.id,c.s,c.lateral]),[[1,100,-4.5*dir],[2,130,5*dir],[3,160,-4.5*dir]]);
    assert.deepEqual(plan.cones.map(c=>[c.x,c.z]),[[100,-4.5*dir],[130,5*dir],[160,-4.5*dir]]);
    assert.equal(plan.redBoardS,110,'never past turn-in');assert.equal(plan.finishS,220);
    assert.equal(placeCones(straightCourse,{...options,brakeS:60}).redBoardS,85);
  }
});
test('cone placement rejects a corner narrower than the 2m sanity check and bad points',()=>{
  const options={brakeS:100,turnInS:110,apexS:130,exitS:160,dir:1};
  assert.throws(()=>placeCones({...straightCourse,roadHalfWidthAt:()=>1.5},options),/valid road edge/);
  assert.throws(()=>placeCones({...straightCourse,roadHalfWidthAt:()=>2.2},options),/2m inward/);
  assert.doesNotThrow(()=>placeCones({...straightCourse,roadHalfWidthAt:()=>2.25},options));
  assert.throws(()=>placeCones(straightCourse,{...options,apexS:105}),/Invalid corner points/);
  assert.throws(()=>placeCones(straightCourse,{...options,dir:0}),/Invalid corner points/);
});
test('the lesson line runs outside to the apex cone and back out to the exit cone',()=>{
  for (const dir of [-1,1]) {
    const points=cornerPoints({turnInS:110,turnOutS:150,dir,apexShare:.5});
    assert.deepEqual([points.turnInS,points.apexS,points.exitS],[110,130,170]);
    const line=buildLessonLine({...straightCourse,at:s=>({heading:0})},points,{startS:50,endS:230});
    assert.equal(line.offsetAt(100),-4.5*dir);assert.equal(line.offsetAt(130),5*dir);assert.equal(line.offsetAt(170),-4.5*dir);
    assert.ok(dir*line.offsetAt(120)>-4.5&&dir*line.offsetAt(120)<5,'smooth between the points');
    assert.ok(dir*line.curvatureAt(120)<0||dir*line.curvatureAt(120)>0);
  }
  assert.throws(()=>cornerPoints({turnInS:150,turnOutS:110,dir:1,apexShare:.5}),/Invalid corner geometry/);
});

test('instructor controls retain settled pace and use the tyre yaw helper with braking',()=>{
  const calls=[],steerForYaw=(yaw,options)=>{calls.push({yaw,options});return .123;};
  const plan={course:straightCourse,car:{topSpeed:200,grip:1,gears:[80,120,200]},
    line:{offsetAt:()=>0,curvatureAt:()=>0},profile:{at:()=>100},drive:{mphToWorld:.44704},steerForYaw,
    turnInS:150,turnOutS:200,difficulty:'casual'};
  const state={s:100,lateral:0,speedMph:100,headingError:0,revs:.8,gear:1,tyreSlipRules:true};
  straightCourse.at=()=>({curvature:0});
  const surface={speedLimit:300,traction:1};
  const casual=instructorControls(state,surface,plan),pro=instructorControls(state,surface,{...plan,difficulty:'pro'});
  assert.equal(casual.targetMph,92);assert.equal(pro.targetMph,97);
  assert.equal(instructorControls(state,surface,{...plan,difficulty:'pro',profile:{pace:.95,at:()=>100}}).targetMph,95,
    'lesson 1 uses its trial pace while other lessons retain 97%');
  assert.equal(casual.steer,.123);assert.equal(casual.throttle,0);assert.ok(casual.brake>0);
  assert.equal(calls[0].options.tyreSlip,true);assert.equal(calls[0].options.brake,casual.brake);
  assert.equal(casual.boost,false);
});


test('instructor cancels retained steering before the full-brake grip limit drops',()=>{
  const state={s:100,lateral:0,speedMph:100,headingError:0,revs:.8,gear:1};
  const plan={course:{at:()=>({curvature:0})},car:{grip:1,gears:[80,120,200]},
    line:{offsetAt:()=>0,curvatureAt:()=>0},profile:{at:()=>50},drive:{mphToWorld:.44704,steerResponse:24},
    difficulty:'casual'};
  const alpha=1-Math.exp(-plan.drive.steerResponse/120);
  for(const sign of [-1,1]){
    const before={...state,steerVisual:sign*.8};
    const controls=instructorControls(before,{speedLimit:300,traction:1},
      {...plan,steerForYaw:()=>sign*.64});
    assert.equal(controls.brake,1);
    const actual=before.steerVisual+(controls.steer-before.steerVisual)*alpha;
    assert.ok(Math.abs(actual-sign*.64)<1e-12,'existing native smoothing must reach the helper capped demand in this tick');
    assert.equal(before.steerVisual,sign*.8,'controller cannot alter the native smoothing state');
    assert.ok(Math.abs(controls.steer)<=1,'input stays inside the native command range');
  }
});

test('before the corner braking point an earlier bend gets only a light brake, under the 50% rule',()=>{
  const course={...straightCourse,at:()=>({curvature:.02})};
  const plan={course,car:{grip:1,gears:[100]},line:{offsetAt:()=>0,curvatureAt:()=>0},profile:{at:()=>50},
    drive:{mphToWorld:.44704},steerForYaw:()=>0,difficulty:'casual',brakeS:200};
  const state={s:100,lateral:0,speedMph:80,headingError:0,revs:.8,gear:0};
  const early=instructorControls(state,{speedLimit:300,traction:1},plan);
  assert.ok(early.brake>0&&early.brake<.5);
  assert.equal(instructorControls({...state,s:250},{speedLimit:300,traction:1},plan).brake,0,'no braking in the bend itself');
});
test('instructor does not brake on a curved approach before the named corner',()=>{
  const course={...straightCourse,at:()=>({curvature:.02})};
  const plan={course,car:{grip:1,gears:[100]},line:{offsetAt:()=>0,curvatureAt:()=>0},profile:{at:()=>50},
    drive:{mphToWorld:.44704},steerForYaw:()=>0,difficulty:'casual',turnInS:150,turnOutS:200};
  const controls=instructorControls({s:100,lateral:0,speedMph:80,headingError:0,revs:.8,gear:0},
    {speedLimit:300,traction:1},plan);
  assert.equal(controls.brake,0);assert.equal(controls.throttle,0);
});
test('finish trace ignores only wholly post-finish faults and keeps straddling ticks closed',()=>{
  const poses=[{t:0,s:0,lateral:0,heading:0},{t:1,s:9,lateral:1,heading:.1},
    {t:2,s:11,lateral:3,heading:.3},{t:3,s:15,lateral:8,heading:.5}];
  const before=JSON.stringify(poses);
  const actual=finishInstructorTrace(poses,10,[{fromS:11,s:15,reason:'post-finish contact'}]);
  assert.equal(actual.timeSec,1.5);assert.equal(actual.poses.at(-1).s,10);
  assert.equal(actual.poses.at(-1).lateral,2);assert.equal(actual.poses.length,3);
  assert.equal(JSON.stringify(poses),before,'observation poses stay unchanged');
  assert.doesNotThrow(()=>finishInstructorTrace(poses,10,[{fromS:10,s:11}]));
  assert.throws(()=>finishInstructorTrace(poses,10,[{fromS:9,s:11,reason:'straddles finish'}]),/straddles finish/);
  assert.throws(()=>finishInstructorTrace(poses,10,[{fromS:0,s:9,reason:'before finish'}]),/before finish/);
  assert.throws(()=>finishInstructorTrace(poses,10,[{s:15,reason:'unknown tick origin'}]),/unknown tick origin/);
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
      assert.equal(instructor.redBoardS,courseId==='panorama-ridge'?corner.turnInS:Math.min(instructor.cones[0].s+25,corner.turnInS));
      assert.equal(instructor.poses[0].s,corner.startS);
      assert.equal(instructor.poses.at(-1).s,corner.finishS);
      assert.equal(instructor.poses.at(-1).t,instructor.timeSec);
      assert.ok(instructor.poses.every(pose=>Number.isFinite(pose.x)&&Number.isFinite(pose.z)&&pose.tyreSlip<=1));
      // The instructor never looks like it clips a cone: at least 0.5 m clear of the tip distance, still inside the 2.5 m that counts it.
      for (const distance of instructorConeDistances(instructor.poses,instructor.cones)) assert.ok(distance>=TIP_DISTANCE_M+LESSON_LINE.minClearM&&distance<=2.5,`cone clearance ${distance}`);
    });
  }
}


// Prepared native student acceptance. These runs are heavy, just like the
// instructor cases above: no execution until Root admits the existing suite.
async function nativeStudentAttempt(baseline, lesson, mode, fps) {
  const [{Duel}, {COURSE, DRIVE, steerForYaw, tyreSlipSteering}] = await Promise.all([
    import('../src/game.js'), import('../src/config.js'),
  ]);
  const {corner,instructor,courseId,car,upgrades,difficulty,seed}=baseline;
  const duel=new Duel({seed,featureFlags:{enabled:name=>name==='tyre-slip'}});
  duel.startCampaign({seed,car,upgrades:{...upgrades},difficulty,driverId:'club',
    mode:'timetrial',opponentCount:0,startStage:COURSE.findIndex(row=>row.id===courseId)});
  const state=duel.state,course=duel.course,spec=duel.car;
  const pace=difficulty==='casual'?.92:.95;
  const lessonPlan=await lessonPlanFor(duel,DRIVE_LESSON_CORNERS.find(row=>row.courseId===courseId),pace);
  const {line}=lessonPlan,profile=lessonPlan.profile;
  const start=instructor.poses[0];
  state.tyreSlipRules=true;state.tyreSlip=0;
  state.status='racing';state.countdown=0;state.s=corner.startS;
  state.lateral=start.lateral;state.headingError=start.heading-course.at(state.s).heading;
  state.speedMph=start.mph;
  const rollingGear=spec.gears.findIndex(top=>top*DRIVE.gearCeilFrac>=state.speedMph);
  state.gear=rollingGear<0?spec.gears.length-1:rollingGear;
  state.revs=state.speedMph/spec.gears[state.gear];
  state.yawVelocity=line.curvatureAt(state.s)*state.speedMph*DRIVE.mphToWorld;
  state.traffic=[];state.opponents=[];
  state.nextLapGate=duel._lapGates.filter(s=>s<=state.s).length;
  // instructorControls multiplies its profile by pace. Divide once to ask
  // for the actual 100% line speed, not 100% of the slower instructor.
  const speedScale=mode==='fast'?1:mode==='slow'?pace*.8:pace;
  const plan={course,car:spec,line,profile:{pace,at:s=>profile.at(s)*speedScale/pace},
    drive:DRIVE,steerForYaw,difficulty,turnInS:corner.turnInS,turnOutS:corner.turnOutS,brakeS:profile.brakeS};
  const cornerSpeed=Math.min(...instructor.poses.filter(p=>p.s>=corner.turnInS&&p.s<=corner.turnOutS).map(p=>p.mph));
  assert.ok(Number.isFinite(cornerSpeed)&&cornerSpeed>0,'actual instructor corner speed exists');
  let wallHit=false,brakingDone=false,ticks=0,frames=0,answer;
  const off=duel.onChange((current,event)=>{
    if(event.crash||event.scrape||event.boundaryReset||event.checkpointReset)wallHit=true;
  });
  const carView=controls=>({s:state.s,lateral:state.lateral,world:course.groundAt(state.s,state.lateral),
    speedMph:state.speedMph,brake:controls.brake,throttle:controls.throttle,tyreSlip:state.tyreSlip||0,
    offRoad:state.offRoad===true,status:'racing',paused:false});
  try {
    answer=stepDriveLesson(lesson,carView({brake:0,throttle:0}),{start:true},0);
    while(lesson.phase==='driving'&&ticks<120*120){
      const frameTicks=Math.floor(++frames*120/fps+1e-9);
      while(ticks<frameTicks&&lesson.phase==='driving'&&ticks<120*120){
        const surface=duel._drivingSurface(state.s,state.lateral);
        let controls=instructorControls(state,surface,plan);
        if(mode==='late'){
          const brakeS=instructor.redBoardS;
          if(state.s>=brakeS&&state.speedMph<=cornerSpeed)brakingDone=true;
          const brake=state.s>=brakeS&&!brakingDone?1:0;
          // Up to cone 1 the late driver follows the instructor's own plan, including
          // its light brake (under the 50% rule) for an earlier bend, then holds
          // full throttle until the board.
          const early=state.s<instructor.cones[0].s;
          const flatOut=!early&&state.s<brakeS;
          controls=early?controls:{...controls,brake:flatOut?0:brake,throttle:flatOut?1:brake?0:controls.throttle};
          // Use the real tyre steering gain but do not clip desired yaw
          // to its grip peak: the late driver can ask for full steering.
          const rawSteer=(yaw,options)=>{
            const {steerGain}=tyreSlipSteering({...options,brake});
            return Math.max(-1,Math.min(1,-yaw/Math.max(.05,steerGain)));
          };
          controls.steer=instructorControls(state,surface,{...plan,steerForYaw:rawSteer}).steer;
        }
        // The right try (and the full-pace and slow tries) drive the instructor's own
        // line and speed plan with the ordinary steering helper and input limits.
        duel.setInput(controls);duel.step(1/120);ticks++;
        answer=stepDriveLesson(lesson,carView(controls),{
          wallHit:wallHit||state.impactTimer>0,crashed:state.status!=='racing',
        },1/120);
      }
    }
    assert.equal(lesson.phase,'result',mode+' must end at a real gate or physical failure');
    return {answer,attempt:structuredClone(lesson.lastAttempt)};
  } finally {off();}
}

for(const courseId of ['panorama-ridge','tremblant-woods']){
  for(const difficulty of ['casual','pro']){
    test(`native student ${courseId} ${difficulty}: late, right and full-pace challenge at 30/60/144 FPS`,async()=>{
      const baseline=await buildInstructorRun({courseId,difficulty,car:'falcone_f42',upgrades:{},seed:1989,fps:60});
      let reference=null;
      for(const fps of [30,60,144]){
        const lesson=createDriveLesson('corner',baseline),results=[];
        const late=await nativeStudentAttempt(baseline,lesson,'late',fps);results.push(late);
        assert.ok(late.attempt.firstBrakeS>=baseline.instructor.redBoardS,'late driver waits for the fixed board');
        assert.ok(late.attempt.screechSeconds>=.5,'late entry must produce at least half a second of real screech');
        // Claude's review (card, 'Claude answers', late-try acceptance): the tyre model punishes
        // a late entry with screech, not with time, so the time-loss clause is replaced by the
        // late-try radio line playing. DRIVE-LESSONS-LINES-2: that is now the true screech line
        // (late.slid) or, at a wall, late.off; never the untrue time-lost line.
        assert.ok(['drive.radio.corner.late.slid','drive.radio.corner.late.off'].includes(late.answer.radio),'late try plays a true late line (not the untrue time-lost line)');
        const right=await nativeStudentAttempt(baseline,lesson,'right',fps);results.push(right);
        assert.equal(lesson.stage,'right');assert.equal(right.attempt.endReason,'finish');
        assert.deepEqual(right.attempt.rules,[true,true,true,true],'native right try passes every settled rule');
        for(let index=0;index<2;index++){
          const fast=await nativeStudentAttempt(baseline,lesson,'fast',fps);results.push(fast);
          assert.equal(lesson.stage,'challenge');assert.ok(fast.attempt.elapsedSeconds<baseline.instructor.timeSec);
          assert.equal(lesson.streak,index+1);
        }
        const slow=await nativeStudentAttempt(baseline,lesson,'slow',fps);results.push(slow);
        assert.equal(slow.attempt.endReason,'finish');assert.ok(slow.attempt.elapsedSeconds>=baseline.instructor.timeSec);
        assert.equal(lesson.streak,0,'a real slower attempt resets the earned streak');
        for(let index=0;index<3;index++){
          const fast=await nativeStudentAttempt(baseline,lesson,'fast',fps);results.push(fast);
          assert.equal(fast.attempt.endReason,'finish');assert.ok(fast.attempt.elapsedSeconds<baseline.instructor.timeSec);
          assert.equal(fast.answer.result,index===2?'passed':'running');
        }
        assert.equal(lesson.done,true);assert.equal(lesson.streak,3);
        if(reference)assert.deepEqual(results,reference,`native student scoring repeats at ${fps} FPS`);
        else reference=results;
      }
    });
  }
}
