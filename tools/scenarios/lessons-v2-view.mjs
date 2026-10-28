// Manual laptop evidence for section 14. Native inputs and physics, memory-only careers.
import assert from 'node:assert/strict';
const evaluate = (c, fn) => c.evaluate(`(${fn.toString()})()`);
const tap = async (c, code, key, vk) => {
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:vk});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:vk});
};
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await c.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip,engine-curve');
  await c.waitFor(`!!window.__qaApp?.visualReady&&[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`,'memory-only menu',90000);
  await evaluate(c,()=>{
    assertMemory();
    function assertMemory(){if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only storage required');}
    const a=window.__qaApp;a.stop();
    [...document.querySelectorAll('details button')].find(n=>n.textContent==='Create funded temporary player').click();
    // Temporary QA career only, including access to lesson 2. No persisted player is read.
    a.profile={...a.profile,credits:1000000,unlockedCars:[...a.profile.unlockedCars,'koenigsegg_jesko'],drivingLessons:{version:1,done:{},best:{},rewarded:{}}};a._saveProfile();
    for(const d of document.querySelectorAll('details'))d.hidden=true;
    a.audio.setMuted(true);a.setCamera('chase');
    window.viewPaint=()=>{a._driveLessonUi?.update();a.onFrame?.(a.duel.state);};
    window.viewDrive=(ticks=20000,stopS=Infinity)=>{
      const r=a.duel.drivingLesson;let n=0;
      for(;n<ticks&&r.lesson.phase==='driving'&&a.duel.state.s<stopS;n++){
        if(r.lesson.stage!=='watch')a.duel.setInput(r.plan.instructor.inputs[Math.round(r.lesson.attempt.elapsedSeconds*120)]??{});
        a.duel.step(1/120);
      }
      window.viewPaint();return {ticks:n,stage:r.lesson.stage,phase:r.lesson.phase,watch:r.watchClip,result:r.lesson.lastAttempt};
    };
  });
  async function picture(name){await c.evaluate('window.viewPaint()');await c.screenshot(name);}
  async function start(courseId,lessonId,car){
    const ok=await c.evaluate(`(async()=>{const a=window.__qaApp;a.leaveLesson();a.setRaceSettings({eventId:${JSON.stringify(courseId)},car:${JSON.stringify(car)},difficulty:'casual'});a.openDrivingLessons();return a.startLesson({courseId:${JSON.stringify(courseId)},lessonId:${JSON.stringify(lessonId)},car:${JSON.stringify(car)},difficulty:'casual'});})()`);
    assert.equal(ok,true,'native lesson starts');
    await c.waitFor('window.__qaApp.visualReady','lesson scene',90000);await c.evaluate('window.viewPaint()');
  }
  await start('panorama-ridge','corner','koenigsegg_jesko');
  await c.waitFor(`!!document.querySelector('.drive-lesson-briefing')`,'briefing');
  const layout=await evaluate(c,()=>{const n=document.querySelector('.drive-lesson-briefing'),b=n.getBoundingClientRect();return {width:b.width,height:b.height,scroll:n.scrollHeight,client:n.clientHeight,button:n.querySelectorAll('.drive-lesson-runs button').length===4};});
  assert.ok(layout.button);assert.ok(layout.height<=690);
  await picture('panorama-jesko-briefing');
  await c.evaluate(`document.querySelector('.drive-lesson-host').focus()`);
  await tap(c,'Enter','Enter',13);
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'watch','Enter starts the highlighted run, Watch me, once');
  await c.evaluate('window.viewDrive(600)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.watchClip'),'late');
  await picture('panorama-jesko-watch-late-caption');
  await c.evaluate(`(()=>{const r=window.__qaApp.duel.drivingLesson;while(r.watchClip==='late')window.viewDrive(120);window.viewDrive(1, r.plan.instructor.corners[0].brakeS);})()`);
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS)');
  await picture('panorama-jesko-watch-clean-caption');
  // Enter does nothing during the demonstration (no Skip); at the end the production window binding starts the highlighted run, Follow me.
  await tap(c,'Enter','Enter',13);
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'watch');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.phase'),'driving');
  await c.evaluate('window.viewDrive()');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.phase'),'result');
  await tap(c,'Enter','Enter',13);
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'follow');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.ok(await c.evaluate('!!window.__qaApp.getDriveLessonGhost()'));
  await evaluate(c,()=>{
    const box=selector=>{const n=document.querySelector(selector);if(!n)throw Error('Missing '+selector);return n.getBoundingClientRect();};
    const panel=box('.drive-lesson-panel'),mirror=box('.rear-view-frame');
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    if(overlaps(panel,mirror)||overlaps(panel,box('.race-heading'))||overlaps(panel,box('.race-clock')))throw Error('Lesson panel covers race HUD');
    const target=document.querySelector('.drive-lesson-target').textContent;
    const speed=Number(document.getElementById('speed-value').textContent);
    if(!target.includes('Your speed '+speed+' km/h'))throw Error('Lesson speed differs from speedometer');
    if(/\bmph\b/.test(document.querySelector('.drive-lesson-host').textContent))throw Error('Imperial speed on lesson screen');
  });
  await picture('panorama-jesko-follow-line-ghost-zone-target');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-4)');
  await picture('panorama-jesko-road-target-number');
  await c.evaluate('window.viewDrive();window.__qaApp.nextLessonAttempt();window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'your-turn');
  assert.equal(await c.evaluate('window.__qaApp.getDriveLessonGhost()'),null);
  await picture('panorama-jesko-your-turn');
  const result=await c.evaluate('window.viewDrive()');
  assert.equal(result.result.passed,true,'native clean student meets corner checks');
  assert.match(await c.evaluate('document.querySelector(".drive-lesson-advice").textContent'),/^Clean on every corner/);
  await picture('panorama-jesko-result-corner-table');
  await c.evaluate('window.__qaApp.nextLessonAttempt();window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'beat');
  await picture('panorama-jesko-beat-gap');
  await evaluate(c,()=>{const a=window.__qaApp;a.leaveLesson();a.profile.drivingLessons.done.corner=true;a.profile.drivingLessons.best.corner=1.2;a._saveProfile();a.openDrivingLessons();});
  assert.match(await c.evaluate('document.querySelector(".drive-lesson-board").textContent'),/Gold/);
  await picture('board-gold');
  await start('harbour-lights','line','falcone_f42');
  await c.evaluate("window.__qaApp.nextLessonAttempt();window.__qaApp.chooseLessonStep('follow');window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].turnInS-25)");
  await picture('harbour-lesson-2-follow');
  // Esc leaves the run for the opening screen (car back at the start, nothing scored); the key 2 starts Follow me again.
  await tap(c,'Escape','Escape',27);
  assert.equal(await c.evaluate('window.__qaApp.driveLessonBriefing'),true);
  assert.equal(await c.evaluate('!!document.querySelector(".drive-lesson-briefing")'),true,'Esc shows the opening screen');
  await picture('harbour-lesson-2-opening-screen');
  await tap(c,'Digit2','2',50);
  assert.equal(await c.evaluate('!!document.querySelector(".drive-lesson-briefing")'),false,'the key 2 starts a run');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'follow');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].turnInS+10)');
  assert.equal(await c.evaluate('document.getElementById("speed-value").classList.contains("drive-lesson-speed-green")'),true);
  await picture('harbour-corner-speed-green');
  await evaluate(c,()=>window.__qaApp.leaveLesson());
  assert.equal(await c.evaluate('document.getElementById("speed-value").className'),'','leaving clears lesson speed colours');
}
