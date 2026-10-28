import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Lessons 2 to 4 in the real game as they play now (DRIVING_LESSONS 14), private port, memory-only storage: the board
// rows, each lesson's briefing, scene, rev counter or ice sign, and one native Follow me result card. Clicks and keys are
// real. A run no longer ends early, so a whole run is stepped on the game's own fixed clock with the instructor's recorded
// inputs sent through the normal input path. The one fixture is the saved progress of the lessons before the one being
// taken (lesson 2 cannot open otherwise), written into the temporary career. No result is invented, no car is placed
// and no frame is timed.
// hold: milliseconds between the button going down and coming up. A person's click is about 100.
async function click(context, selector, hold = 0) {
  // A screen that has only just been asked for may not have its size yet.
  await context.waitFor(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});const b=n&&n.getBoundingClientRect();return !!b&&b.width>0&&b.height>0;})()`, 'visible ' + selector, 8000);
  const point = await context.evaluate(`(()=>{
    const node=document.querySelector(${JSON.stringify(selector)});
    if(!node||node.disabled||node.hidden)throw Error('Lesson control unavailable: '+${JSON.stringify(selector)});
    node.scrollIntoView({block:'center'});
    const box=node.getBoundingClientRect(),top=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    if(!box.width||!box.height||!node.contains(top))throw Error('Lesson control is covered by '+(top?.tagName||'nothing')+'.'+(top?.className||'')+' '+JSON.stringify({x:box.x,y:box.y,w:box.width,h:box.height}));
    return{x:box.x+box.width/2,y:box.y+box.height/2};})()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
    if (type === 'mousePressed' && hold) await context.evaluate(`new Promise(done=>setTimeout(done,${hold}))`);
  }
}
const key = (context, type, code, letter, windowsVirtualKeyCode) =>
  context.command('Input.dispatchKeyEvent', {type, key: letter, code, windowsVirtualKeyCode});
const press = (context, code, letter, vk) => key(context, 'keyDown', code, letter, vk);
const release = (context, code, letter, vk) => key(context, 'keyUp', code, letter, vk);

// The stepper: the game's own fixed clock, with the instructor's recorded inputs as the student's in the steps where the student drives.
const stepperSource = `window.lessonDrive=({stopS=Infinity,ticks=90000}={})=>{
  const a=window.__qaApp,r=a.duel.drivingLesson;a.stop();let n=0;
  for(;n<ticks&&r.lesson.phase==='driving'&&a.duel.state.s<stopS;n++){
    if(r.lesson.stage!=='watch')a.duel.setInput(r.plan.instructor.inputs[Math.round(r.lesson.attempt.elapsedSeconds*120)]??{});
    a.duel.step(1/120);
  }
  a._driveLessonUi?.update();a.onFrame?.(a.duel.state);
  return{ticks:n,stage:r.lesson.stage,phase:r.lesson.phase,s:a.duel.state.s};};`;

// Board, then the lesson's start button, then its briefing; the briefing's button opens Watch me and Skip opens Follow me.
async function takeLesson(context, report, lessonId, courseId) {
  await click(context, '#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:${lessonId}"]')`, `${lessonId} start button`);
  if (await context.evaluate(`!!document.querySelector('.drive-lesson-board [data-drive-lesson="${lessonId}"][data-drive-course="${courseId}"]')`))
    await click(context, `.drive-lesson-board [data-drive-lesson="${lessonId}"][data-drive-course="${courseId}"]`);
  await click(context, `.drive-lesson-board [data-drive-action="start:${lessonId}"]`);
  await context.waitFor(`!!window.__qaApp.duel.drivingLesson||window.__qaApp.driveLessonMessage?.includes("can't drive this lesson")`,
    `${lessonId} native instructor plan or explicit failure`, 120000);
  const failed = await context.evaluate(`!window.__qaApp.duel.drivingLesson?window.__qaApp.driveLessonMessage:null`);
  if (failed) throw Error(failed);
  await context.waitFor(`window.__qaApp.visualReady&&!!document.querySelector('.drive-lesson-briefing')&&
    !!window.__render.scene.getObjectByName('Driving lesson cones and red board')?.visible`, `${lessonId} briefing and scene`, 90000);
  report[lessonId] = {...report[lessonId], briefing: await context.evaluate(`(()=>{
    const r=window.__qaApp.duel.drivingLesson,brief=document.querySelector('.drive-lesson-briefing');
    if(r.lesson.id!==${JSON.stringify(lessonId)}||r.plan.courseId!==${JSON.stringify(courseId)}||r.lesson.stage!=='watch'||window.__qaApp.driveLessonBriefing!==true)
      throw Error('Lesson did not open on its briefing on the chosen course');
    if(r.state.opponents.length||r.state.traffic.length||r.state.tyreSlipRules!==true)throw Error('Lesson isolation missing');
    const steps=brief.querySelectorAll('.drive-lesson-brief-steps li').length,corners=brief.querySelectorAll('.drive-lesson-map-corners li').length;
    if(steps!==4||!brief.querySelector('svg.drive-lesson-section-map')||corners!==r.plan.instructor.corners.length||!/Start Watch me/.test(brief.querySelector('[data-drive-action="next"]')?.textContent||''))
      throw Error('Briefing card is missing its map, corner list, four steps or start button');
    return{corners,instructorSeconds:r.plan.instructor.timeSec,text:brief.textContent.replace(/\\s+/g,' ').trim()};})()`)};
  await click(context, '.drive-lesson-briefing [data-drive-action="next"]');
  await context.waitFor(`!!document.querySelector('.drive-lesson-panel')&&!document.querySelector('.drive-lesson-briefing')&&
    window.__qaApp.duel.drivingLesson.lesson.stage==='watch'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`, `${lessonId} Watch me`);
  // Clicks that take 100 ms, with the car moving: the buttons must still be there when the button comes up.
  await click(context, '.drive-lesson-panel [data-drive-action="skip"]', 100);
  await context.waitFor(`window.__qaApp.duel.drivingLesson.lesson.stage==='follow'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`, `${lessonId} Follow me after a 100 ms click on Skip`);
  await context.evaluate(`new Promise(done=>setTimeout(done,1200))`);
  const before = await context.evaluate(`window.__qaApp.duel.drivingLesson.lesson.attempt.elapsedSeconds`);
  await click(context, '.drive-lesson-panel [data-drive-action="step:follow"]', 100);
  await context.evaluate(`new Promise(done=>setTimeout(done,150))`);
  const after = await context.evaluate(`window.__qaApp.duel.drivingLesson.lesson.attempt.elapsedSeconds`);
  if (!(before >= .3 && after < before)) throw Error(`${lessonId}: a 100 ms click on the Follow me step button did not restart the run: ${before} then ${after}`);
  report[lessonId].clicks = {skip: 'Follow me started', follow: `run restarted (${before.toFixed(2)} s then ${after.toFixed(2)} s)`};
  // That run set off with nobody driving; start a clean one, with the game stopped so the click is steady.
  await context.evaluate(`window.__qaApp.stop()`);
  await click(context, '.drive-lesson-panel [data-drive-action="step:follow"]');
}
const sceneStateExpression = `(()=>{
  const group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
  const kids=group.children;
  return{cones:kids.filter(n=>n.userData.coneId!==undefined).length,
    line:kids.filter(n=>n.userData.lessonLine&&n.visible).length,
    boxes:kids.filter(n=>n.name==='Lesson brake and lift boxes').length,
    redBoard:kids.filter(n=>n.userData.redBoard).length,
    iceSign:kids.filter(n=>n.userData.iceSign).length};})()`;

// The lesson panel must not sit on the minimap or the instructor's caption.
async function checkPanelClear(context, label) {
  const overlap = await context.evaluate(`(()=>{
    const box=selector=>{const n=document.querySelector(selector);if(!n)return null;const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
    const hit=(a,b)=>!!a&&!!b&&!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
    const panel=box('.drive-lesson-panel');
    return{panel,map:hit(panel,box('.route-hud')),caption:hit(panel,box('.drive-lesson-radio'))};})()`);
  if (!overlap.panel) throw Error(label + ': the lesson panel is not showing');
  if (overlap.map || overlap.caption) throw Error(label + ': the lesson panel covers the minimap or the instructor caption: ' + JSON.stringify(overlap));
  return overlap;
}
// Follow me: the ghost, the painted line, the target box and the live gap are all there once the car has moved a few seconds.
async function checkFollowGuides(context, label) {
  await context.evaluate(`window.lessonDrive({ticks:600})`);
  return context.evaluate(`(()=>{
    if(!window.__qaApp.getDriveLessonGhost())throw Error(${JSON.stringify(label)}+': Follow me should show the instructor as a ghost');
    if(!document.querySelector('.drive-lesson-target')||!document.querySelector('.drive-lesson-live-gap')||!document.querySelector('.drive-lesson-corner-lights li'))
      throw Error(${JSON.stringify(label)}+': Follow me should show the target box, the live gap and the corner lights');
    return{target:document.querySelector('.drive-lesson-target').textContent.replace(/\\s+/g,' '),gap:document.querySelector('.drive-lesson-live-gap').textContent.replace(/\\s+/g,' ')};})()`);
}
// A whole run to the finish line, then the native result card: one row per corner, the advice sentence, the next-step buttons.
async function finishRun(context, report, label) {
  const drive = await context.evaluate(`window.lessonDrive({})`);
  if (drive.phase !== 'result') throw Error(label + ': the run should end at the finish line: ' + JSON.stringify(drive));
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`, label + ' result card');
  const result = await context.evaluate(`(()=>{
    const run=window.__qaApp.duel.drivingLesson,lesson=run.lesson,card=document.querySelector('.drive-lesson-result');
    if(!lesson.lastAttempt||lesson.done||!lesson.lastAttempt.finished||lesson.lastAttempt.elapsedSeconds<=0)throw Error('The run did not produce an honest finished result');
    const rows=card.querySelectorAll('tbody tr').length;
    if(rows!==run.plan.instructor.corners.length)throw Error('Result table should have one row per corner: '+rows);
    const buttons=[...card.querySelectorAll('[data-drive-action]')].map(node=>node.dataset.driveAction);
    for(const need of ['next','step:watch','step:follow','leave'])if(!buttons.includes(need))throw Error('Result card lacks '+need+': '+buttons.join(','));
    if(!card.querySelector('.drive-lesson-advice')?.textContent)throw Error('Result card lacks its advice sentence');
    return{rows,buttons,text:card.textContent.replace(/\\s+/g,' '),elapsed:lesson.lastAttempt.elapsedSeconds};})()`);
  if (await context.evaluate(`JSON.stringify(window.__qaApp.profile)`) !== report.before) throw Error(label + ' changed the career');
  return result;
}
// Leave through whichever Leave lesson button is showing (the panel's, or the result card's once a run has ended).
async function leaveLesson(context) {
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const selector = await context.evaluate(`['.drive-lesson-result','.drive-lesson-panel'].map(base=>base+' [data-drive-action="leave"]')
        .find(item=>{const n=document.querySelector(item);const b=n&&n.getBoundingClientRect();return b&&b.width>0&&b.height>0;})||null`);
      if (!selector) throw Error('No Leave lesson button is showing');
      await click(context, selector);
      return;
    } catch (error) {
      last = error;
      await context.evaluate(`new Promise(done=>setTimeout(done,400))`);
    }
  }
  throw last;
}
const fixtureDone = (context, ids) => context.evaluate(`(()=>{const a=window.__qaApp,ids=${JSON.stringify(ids)};
  a.profile={...a.profile,drivingLessons:{version:1,done:Object.fromEntries(ids.map(id=>[id,true])),best:Object.fromEntries(ids.map(id=>[id,.4])),
    rewarded:Object.fromEntries(ids.map(id=>[id,true]))}};
  if(!a._saveProfile())throw Error('Temporary career did not save');})()`);

export async function run(context) {
  const report = {scope: 'Lessons 2 to 4 in the real game: board rows, each lesson\'s briefing, scene and Follow me guides, lesson 2 on Tremblant Woods, lesson 3 rev counter and manual box, lesson 4 ice sign and snow cone, and one native result card each.',
    fixtures: [], captures: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip,engine-curve');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!window.__render?.scene&&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
    document.querySelector('#driving-instructor')?.hidden===false`, 'isolated lesson menu', 90000);
  report.storage = await context.evaluate(`(()=>({qaTab:window.name.startsWith('__duel_qa_tab_v2:'),
    memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value}))()`);
  if (!report.storage.qaTab || !report.storage.memoryOnly) throw Error('Private memory-only storage required');
  await context.evaluate(stepperSource);
  await context.evaluate(`(()=>{
    const button=[...document.querySelectorAll('details button')].find(node=>node.textContent==='Create funded temporary player');
    if(!button||button.disabled)throw Error('Funded temporary career fixture missing');button.click();
    const a=window.__qaApp;
    for(const id of ['tremblant-woods','tremblant-snow'])if(!a.purchaseCourse(id).ok)throw Error('Actual course purchase failed: '+id);
    a.setRaceSettings({eventId:'tremblant-woods',car:'falcone_f42',difficulty:'casual'});
    a.audio.setMuted(true);
    for(const panel of document.querySelectorAll('details')){
      const text=panel.querySelector('summary')?.textContent||'';
      if(text.includes('TEMPORARY SAVES')||text.startsWith('Performance samples'))panel.hidden=true;
    }
  })()`);
  report.fixtures.push('Existing funded temporary career button; actual Tremblant Woods and Tremblant Snow purchases');

  // The board: four rows, the later three shut with their reasons.
  await click(context, '#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`, 'lesson board');
  report.boardShut = await context.evaluate(`[...document.querySelectorAll('.drive-lesson-board .lesson-board li')].map(li=>li.textContent.replace(/\\s+/g,' ').trim())`);
  if (report.boardShut.length !== 4 || !/Opens later: finish lesson 1 first/.test(report.boardShut[1])
      || !/Opens later/.test(report.boardShut[2]) || !/Opens later/.test(report.boardShut[3]))
    throw Error('Board rows for lessons 2 to 4 are missing their Opens later reasons: ' + JSON.stringify(report.boardShut));
  report.captures.push(await context.screenshot('lessons-board-shut'));
  await click(context, '.drive-lesson-board [data-drive-action="leave"]');
  await context.waitFor(`document.querySelector('.drive-lesson-host')?.hidden===true`, 'board closed');

  // Fixture: lesson 1 done in the temporary career, so lesson 2 opens.
  report.fixtures.push('Lesson 1 marked done in the memory-only temporary career (lesson 2 cannot open otherwise)');
  await fixtureDone(context, ['corner']);
  report.before = await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  await click(context, '#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:line"]')`, 'lesson 2 open');
  report.captures.push(await context.screenshot('lessons-board-lesson-2-open'));
  await click(context, '.drive-lesson-board [data-drive-action="leave"]');

  // ---- Lesson 2: the racing line on Tremblant Woods ---------------------------------------------------------------
  await takeLesson(context, report, 'line', 'tremblant-woods');
  report.line.scene = await context.evaluate(sceneStateExpression);
  if (!report.line.scene.cones || report.line.scene.redBoard !== 0 || report.line.scene.boxes !== 1)
    throw Error('Lesson 2 should draw its cones and brake boxes, and no red board: ' + JSON.stringify(report.line.scene));
  report.line.follow = await checkFollowGuides(context, 'lesson 2');
  report.line.panelClear = await checkPanelClear(context, 'lesson 2');
  report.captures.push(await context.screenshot('lesson-2-follow'));
  report.line.result = await finishRun(context, report, 'lesson 2 Follow me');
  report.captures.push(await context.screenshot('lesson-2-result'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`, 'leave lesson 2');
  await context.evaluate(`window.__qaApp.start()`);

  // ---- Lesson 3: the rev counter, forced manual box --------------------------------------------------------------
  report.fixtures.push('Lesson 2 marked done in the same temporary career (lesson 3 cannot open otherwise)');
  await fixtureDone(context, ['corner', 'line']);
  report.before = await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  await takeLesson(context, report, 'gears', 'tremblant-woods');
  if (!/Revs/.test(report.gears.briefing.text)) throw Error('Lesson 3 briefing should explain revs: ' + report.gears.briefing.text);
  report.gears = {...report.gears, ...await context.evaluate(`(()=>{
    const a=window.__qaApp,s=a.duel.state;
    const mark=document.querySelector('.rpm-track .drive-lesson-green-mark'),lights=document.querySelectorAll('.drive-lesson-lights i');
    if(!mark||lights.length!==3)throw Error('The green mark and three shift lights are not on the rev counter');
    if(a.duel.diff.autoShift!==false||a.duel.diff.engineBlow!==false||s.engineCurve!==true||s.gear!==1)throw Error('Lesson 3 should be manual, undamaged, on the engine curve, in 2nd');
    return{mark:mark.style.left,lights:lights.length,gear:document.querySelector('#gear-value').textContent};})()`)};
  if (report.gears.mark !== '50%') throw Error('The green mark is not at half revs: ' + report.gears.mark);
  report.gears.scene = await context.evaluate(sceneStateExpression);
  if (!report.gears.scene.cones || report.gears.scene.redBoard !== 0) throw Error('Lesson 3 should draw its cones and no red board: ' + JSON.stringify(report.gears.scene));
  // Real keys on the real loop: hold W in 2nd until the three shift lights are lit, then E changes up (Casual lets it in this lesson).
  await press(context, 'KeyW', 'w', 87);
  await context.evaluate(`window.__qaApp.start()`);
  try {
    await context.waitFor(`document.querySelectorAll('.drive-lesson-lights i.is-lit').length===3`, 'all three shift lights lit', 30000);
    report.captures.push(await context.screenshot('lesson-3-shift-lights-lit'));
    await press(context, 'KeyE', 'e', 69); await release(context, 'KeyE', 'e', 69);
    await context.waitFor(`document.querySelector('#gear-value').textContent==='3'`, 'E changes up on Casual in this lesson', 10000);
  } finally {
    await release(context, 'KeyW', 'w', 87);
  }
  await context.evaluate(`window.__qaApp.stop()`);
  // Start Follow me again from its step button (a run in progress is dropped unscored), then a whole run.
  await click(context, '.drive-lesson-panel [data-drive-action="step:follow"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson.lesson.stage==='follow'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'&&window.__qaApp.duel.state.s<window.__qaApp.duel.drivingLesson.plan.instructor.corners[0].brakeS`, 'Follow me starts again');
  report.gears.follow = await checkFollowGuides(context, 'lesson 3');
  report.gears.panelClear = await checkPanelClear(context, 'lesson 3');
  report.captures.push(await context.screenshot('lesson-3-follow'));
  report.gears.result = await finishRun(context, report, 'lesson 3 Follow me');
  report.captures.push(await context.screenshot('lesson-3-result'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`, 'leave lesson 3');
  report.boxRestored = await context.evaluate(`window.__qaApp.duel.diff.autoShift===true&&document.querySelectorAll('.drive-lesson-lights').length===0`);
  if (!report.boxRestored) throw Error('The automatic box and the plain rev counter should be back after lesson 3');
  await context.evaluate(`window.__qaApp.start()`);

  // ---- Lesson 4: the dry board, the snow cone and the ice sign ---------------------------------------------------
  report.fixtures.push('Lesson 3 marked done in the same temporary career (lesson 4 cannot open otherwise)');
  await fixtureDone(context, ['corner', 'line', 'gears']);
  report.before = await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  await click(context, '#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:snow"]')`, 'lesson 4 open');
  report.captures.push(await context.screenshot('lessons-board-all-open'));
  await click(context, '.drive-lesson-board [data-drive-action="leave"]');
  await takeLesson(context, report, 'snow', 'tremblant-snow');
  if (!/Grip/.test(report.snow.briefing.text)) throw Error('Lesson 4 briefing should explain grip: ' + report.snow.briefing.text);
  report.snow = {...report.snow, ...await context.evaluate(`(()=>{
    const a=window.__qaApp,r=a.duel.drivingLesson,s=a.duel.state;
    if(r.lesson.id!=='snow'||r.plan.courseId!=='tremblant-snow'||s.tyre!==undefined)throw Error('Lesson 4 should start on summer tyres at Tremblant Snow');
    const group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const first=group.children.find(n=>n.userData.coneId===1);
    return{scene:${sceneStateExpression},snowConeColour:first.children[1].material.color.getHex(),
      marks:{ice:r.plan.instructor.ice[0].s0,board:r.plan.instructor.redBoardS},
      winter:r.plan.instructor.winter.timeSec,summer:r.plan.instructor.timeSec};})()`)};
  if (report.snow.scene.cones < 1 || report.snow.scene.redBoard !== 1 || report.snow.scene.iceSign !== 1 || report.snow.snowConeColour !== 0x8fd0f0 || report.snow.winter >= report.snow.summer)
    throw Error('Lesson 4 should draw its cones (the first one pale blue), the dry board and the ice sign, with a faster winter instructor: ' + JSON.stringify(report.snow));
  report.snow.follow = await checkFollowGuides(context, 'lesson 4');
  report.snow.panelClear = await checkPanelClear(context, 'lesson 4');
  // Drive on, as the student would, to 50 m before the ice: the sign is on the verge 30 m before it, so it is ahead and on screen.
  await context.evaluate(`window.lessonDrive({stopS:${report.snow.marks.ice - 50}})`);
  report.snow.sign = await context.evaluate(`(()=>{const g=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const sign=g.children.find(n=>n.userData.iceSign),cam=window.__render.camera,v=sign.position.clone();sign.getWorldPosition(v);
    const p=v.clone().project(cam);
    if(!(p.z<1)||Math.abs(p.x)>1||Math.abs(p.y)>1)throw Error('The ice sign is not on screen 50 m before the ice: '+JSON.stringify([p.x,p.y,p.z]));
    return{ndc:[p.x,p.y,p.z].map(n=>+n.toFixed(2)),children:sign.children.length};})()`);
  report.captures.push(await context.screenshot('lesson-4-ice-sign'));
  report.snow.result = await finishRun(context, report, 'lesson 4 Follow me');
  report.captures.push(await context.screenshot('lesson-4-result'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'&&window.__qaApp.duel.state.tyre===undefined`, 'leave lesson 4');
  await context.evaluate(`window.__qaApp.start()`);
  if (context.issues.length || context.warnings.length) throw Error('Lessons browser emitted console issues/warnings');
  await writeFile(join(context.outputDir, 'drive-lessons-view-2.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
}
