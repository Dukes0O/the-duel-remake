import test from 'node:test';
import assert from 'node:assert/strict';
import {driveLessonTarget,driveLessonMapMarkup,driveLessonBriefingMarkup,driveLessonPanelMarkup,driveLessonResultMarkup} from '../src/lessons/drive-lesson-ui.js';
const corner={name:'Test bend',kind:'brake',approachS:0,brakeS:100,turnInS:120,turnOutS:160,exitS:180,targetMph:56};
test('target counts down and colours only the corner speed at the specified thresholds',()=>{
  const lesson={instructor:{corners:[corner]}};
  assert.equal(driveLessonTarget(lesson,0,120).cue,'Brake in 100 m');
  assert.equal(driveLessonTarget(lesson,100,120).cue,'Corner 56 mph');
  assert.equal(driveLessonTarget(lesson,119,56).tone,'');
  for(const speed of [53,56,59])assert.equal(driveLessonTarget(lesson,140,speed).tone,'green');
  assert.equal(driveLessonTarget(lesson,140,61).tone,'');
  assert.equal(driveLessonTarget(lesson,140,61.01).tone,'red');
  assert.equal(driveLessonTarget(lesson,161,80),null);
});
test('Watch replays the late clip then the clean inputs; views and briefing leave race state unchanged',async()=>{
  const previous=new Map(['__DUEL_QA__','location'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.defineProperty(globalThis,'__DUEL_QA__',{configurable:true,value:true});
  Object.defineProperty(globalThis,'location',{configurable:true,value:{search:'?flags=driving-lessons,tyre-slip,engine-curve'}});
  try{
    const {withReferenceApp}=await import('./build-reference-laps.mjs');
    await withReferenceApp(async app=>{
      app.addPlayer('View test');app.profile={...app.profile,credits:50000};app._saveProfile();
      app.setRaceSettings({eventId:'panorama-ridge',car:'falcone_f42',difficulty:'casual'});
      app.openDrivingLessons();
      assert.equal(await app.startLesson({courseId:'panorama-ridge',car:'falcone_f42',difficulty:'casual'}),true);
      const run=app.duel.drivingLesson,s=app.duel.state;
      assert.equal(run.watchClip,'late');assert.equal(app.driveLessonBriefing,true);
      const frozen=JSON.stringify(s);app._simulate(1);assert.equal(JSON.stringify(s),frozen,'briefing holds at gate');
      const props=app.driveLessonProps();
      assert.match(driveLessonBriefingMarkup(props),/Start Watch me/);
      assert.doesNotMatch(driveLessonPanelMarkup({...props,distanceS:run.plan.corner.startS,watchClip:'clean'}),/Braking now/);
      assert.match(driveLessonPanelMarkup({...props,distanceS:run.plan.instructor.corners[0].brakeS,watchClip:'clean'}),/Braking now/);
      assert.match(driveLessonMapMarkup(run.plan.instructor),/polyline/);
      assert.match(driveLessonBriefingMarkup(props),/Clean run, and hit every brake zone or beat my time/);
      assert.equal(JSON.stringify(s),frozen,'all presentation is read only');
      app.nextLessonAttempt();assert.equal(app.driveLessonBriefing,false);
      for(let i=0;i<run.plan.instructor.lateClip.inputs.length;i++)app.duel.step(1/120);
      assert.equal(run.watchClip,'clean');assert.equal(run.lesson.stage,'watch');assert.equal(run.lesson.phase,'driving');
      assert.equal(s.s,run.plan.corner.startS);assert.equal(run.lesson.attempt.elapsedSeconds,0);
      for(let i=0;i<run.plan.instructor.inputs.length+2&&run.lesson.phase==='driving';i++)app.duel.step(1/120);
      assert.equal(run.lesson.phase,'result');assert.equal(run.lesson.lastAttempt.finished,true);
      assert.equal(run.lesson.lastAttempt.clean,true);assert.equal(run.lesson.lastAttempt.passed,false);
      assert.ok(Math.abs(run.lesson.lastAttempt.elapsedSeconds-run.plan.instructor.timeSec)<.009);
      const markup=driveLessonResultMarkup(app.driveLessonProps());assert.match(markup,/<table>/);assert.match(markup,/Start Follow me/);
      app.nextLessonAttempt();assert.equal(run.lesson.stage,'follow');
      assert.ok(app.getDriveLessonGhost());app.leaveLesson();
      app.openDrivingLessons();await app.startLesson({courseId:'panorama-ridge',car:'falcone_f42',difficulty:'casual'});
      app.nextLessonAttempt();app.nextLessonAttempt();assert.equal(app.duel.drivingLesson.lesson.stage,'follow','Enter skips the whole Watch step');
    });
  }finally{for(const [k,v]of previous){if(v)Object.defineProperty(globalThis,k,v);else delete globalThis[k];}}
});
