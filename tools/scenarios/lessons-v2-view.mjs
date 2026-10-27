// Manual laptop evidence for section 14. Native inputs and physics, memory-only careers.
import assert from 'node:assert/strict';
const evaluate = (c, fn) => c.evaluate(`(${fn.toString()})()`);
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
  const layout=await evaluate(c,()=>{const n=document.querySelector('.drive-lesson-briefing'),b=n.getBoundingClientRect();return {width:b.width,height:b.height,scroll:n.scrollHeight,client:n.clientHeight,button:!!n.querySelector('[data-drive-action="next"]')};});
  assert.ok(layout.button);assert.ok(layout.height<=690);
  await picture('panorama-jesko-briefing');
  await c.evaluate(`document.querySelector('.drive-lesson-host').focus()`);
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'watch','Enter starts once without bubbling into skip');
  await c.evaluate('window.viewDrive(600)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.watchClip'),'late');
  await picture('panorama-jesko-watch-late-caption');
  await c.evaluate(`(()=>{const r=window.__qaApp.duel.drivingLesson;while(r.watchClip==='late')window.viewDrive(120);window.viewDrive(1, r.plan.instructor.corners[0].brakeS);})()`);
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS)');
  await picture('panorama-jesko-watch-clean-caption');
  // Enter uses the production window binding and skips the demonstration.
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'follow');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.ok(await c.evaluate('!!window.__qaApp.getDriveLessonGhost()'));
  await picture('panorama-jesko-follow-line-ghost-zone-target');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-4)');
  await picture('panorama-jesko-road-target-number');
  await c.evaluate('window.viewDrive();window.__qaApp.nextLessonAttempt();window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'your-turn');
  assert.equal(await c.evaluate('window.__qaApp.getDriveLessonGhost()'),null);
  await picture('panorama-jesko-your-turn');
  const result=await c.evaluate('window.viewDrive()');
  assert.equal(result.result.passed,true,'native clean student meets corner checks');
  await picture('panorama-jesko-result-corner-table');
  await c.evaluate('window.__qaApp.nextLessonAttempt();window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS-30)');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'beat');
  await picture('panorama-jesko-beat-gap');
  await evaluate(c,()=>{const a=window.__qaApp;a.leaveLesson();a.profile.drivingLessons.done.corner=true;a.profile.drivingLessons.best.corner=1.2;a._saveProfile();a.openDrivingLessons();});
  assert.match(await c.evaluate('document.querySelector(".drive-lesson-board").textContent'),/Gold/);
  await picture('board-gold');
  await start('harbour-lights','line','falcone_f42');
  await c.evaluate('window.__qaApp.nextLessonAttempt();window.__qaApp.nextLessonAttempt();window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].turnInS-25)');
  await picture('harbour-lesson-2-follow');
  // Check help freezes the current run and resumes without skipping it.
  await evaluate(c,()=>document.querySelector('[data-drive-action="help"]').click());
  assert.equal(await c.evaluate('window.__qaApp.driveLessonBriefing'),true);
  await picture('harbour-lesson-2-how-it-works');
  await c.evaluate(`document.querySelector('.drive-lesson-host').focus()`);
  await c.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await c.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  assert.equal(await c.evaluate('!!document.querySelector(".drive-lesson-briefing")'),false,'Enter closes help');
  assert.equal(await c.evaluate('window.__qaApp.duel.drivingLesson.lesson.stage'),'follow');
  await c.evaluate('window.viewDrive(20000,window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].turnInS+10)');
  assert.equal(await c.evaluate('document.getElementById("speed-value").classList.contains("drive-lesson-speed-green")'),true);
  await picture('harbour-corner-speed-green');
  await evaluate(c,()=>window.__qaApp.leaveLesson());
  assert.equal(await c.evaluate('document.getElementById("speed-value").className'),'','leaving clears lesson speed colours');
}
