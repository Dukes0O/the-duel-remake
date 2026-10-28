import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// DRIVE-LESSONS-VIEW-2: lessons 2 to 4 in the real game, private port, memory-only storage. Ordinary UI and real key
// events only. The one fixture is the saved progress of the lessons before the one being taken (lesson 2 cannot open
// otherwise), written into the temporary career. No result is invented and no frame is timed. The "look" captures at
// the end of each lesson are marked as such below: they exist only to feed the picture sheet.
async function click(context, selector) {
  // A screen that has only just been asked for may not have its size yet.
  await context.waitFor(`(()=>{const n=document.querySelector(${JSON.stringify(selector)});const b=n&&n.getBoundingClientRect();return !!b&&b.width>0&&b.height>0;})()`, 'visible ' + selector, 8000);
  const point = await context.evaluate(`(()=>{
    const node=document.querySelector(${JSON.stringify(selector)});
    if(!node||node.disabled||node.hidden)throw Error('Lesson control unavailable: '+${JSON.stringify(selector)});
    node.scrollIntoView({block:'center'});
    const box=node.getBoundingClientRect(),top=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    if(!box.width||!box.height||!node.contains(top))throw Error('Lesson control is covered by '+(top?.tagName||'nothing')+'.'+(top?.className||'')+' '+JSON.stringify({x:box.x,y:box.y,w:box.width,h:box.height}));
    return{x:box.x+box.width/2,y:box.y+box.height/2};})()`);
  for (const type of ['mousePressed', 'mouseReleased']) await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...point});
}
const key = (context, type, code, letter, windowsVirtualKeyCode) =>
  context.command('Input.dispatchKeyEvent', {type, key: letter, code, windowsVirtualKeyCode});
const press = (context, code, letter, vk) => key(context, 'keyDown', code, letter, vk);
const release = (context, code, letter, vk) => key(context, 'keyUp', code, letter, vk);

async function takeLesson(context, report, lessonId, courseName) {
  await click(context, '#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:${lessonId}"]')`, `${lessonId} start button`);
  await click(context, `.drive-lesson-board [data-drive-action="start:${lessonId}"]`);
  await context.waitFor(`!!window.__qaApp.duel.drivingLesson||window.__qaApp.driveLessonMessage?.includes('could not complete a clean run')`,
    `${lessonId} native instructor plan or explicit failure`, 120000);
  const failed = await context.evaluate(`!window.__qaApp.duel.drivingLesson?window.__qaApp.driveLessonMessage:null`);
  if (failed) throw Error(failed);
  await context.evaluate(`window.__qaApp.stop()`);
  await context.waitFor(`window.__qaApp.visualReady&&!!document.querySelector('.drive-lesson-panel')&&
    window.__render.scene.getObjectByName('Driving lesson cones and red board')?.visible`, `${lessonId} panel and scene`, 90000);
  report[lessonId] = {...report[lessonId], course: courseName};
}
const sceneStateExpression = `(()=>{
  const group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
  const kids=group.children;
  return{cones:kids.filter(n=>n.userData.coneId).length,
    markers:kids.filter(n=>n.userData.markerIndex!==undefined).length,
    markersShown:kids.filter(n=>n.userData.markerIndex!==undefined&&n.visible).length,
    redBoard:kids.filter(n=>n.userData.redBoard&&n.visible).length,
    iceSign:kids.filter(n=>n.userData.iceSign).length};})()`;

async function holdUntilResult(context, code, letter, vk, label) {
  await press(context, code, letter, vk);
  await context.evaluate(`window.__qaApp.start()`);
  try {
    await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.phase==='result'`, label, 90000);
  } finally {
    await release(context, code, letter, vk);
  }
  await context.evaluate(`window.__qaApp.stop()`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`, 'result card');
}

// LOOK CAPTURE ONLY: the picture sheet needs the boards and the sign close up, so after a lesson's own checks the car is
// set down on the instructor's own recorded pose near them (the camera follows) and the attempt is thrown away by
// leaving the lesson. Nothing here is a lesson result or is checked as one.
async function lookAt(context, s, name) {
  await context.evaluate(`(()=>{const a=window.__qaApp,r=a.duel.drivingLesson,st=a.duel.state;
    const pose=r.plan.instructor.poses.reduce((best,p)=>Math.abs(p.s-${s})<Math.abs(best.s-${s})?p:best);
    st.s=pose.s;st.lateral=pose.lateral;st.headingError=0;
    st.speedMph=Math.min(pose.mph,6);st.yawVelocity=0;})()`);
  await context.evaluate(`window.__qaApp.start()`);
  await context.evaluate(`new Promise(done=>setTimeout(done,2600))`); // slow, so the chase camera settles behind the car without driving past the boards
  await context.evaluate(`window.__qaApp.stop()`);
  return context.screenshot(name);
}
// The lesson panel must not sit on the minimap or the instructor's caption.
async function checkPanelClear(context, label) {
  const overlap = await context.evaluate(`(()=>{
    const box=selector=>{const n=document.querySelector(selector);if(!n)return null;const b=n.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
    const hit=(a,b)=>!!a&&!!b&&!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
    const panel=box('.drive-lesson-panel');
    return{panel,map:hit(panel,box('.route-hud')),caption:hit(panel,box('.drive-lesson-radio'))};})()`);
  if (overlap.map || overlap.caption) throw Error(label + ': the lesson panel covers the minimap or the instructor caption: ' + JSON.stringify(overlap));
  return overlap;
}
// Next attempt, then give the renderer a few frames to draw the new stage before the loop is frozen for the checks.
async function nextAndFreeze(context, stage) {
  await click(context, '.drive-lesson-result [data-drive-action="next"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.stage==='${stage}'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`, `${stage} stage`);
  await context.evaluate(`new Promise(done=>setTimeout(done,450))`);
  await context.evaluate(`window.__qaApp.stop()`);
}
// Leave through whichever Leave lesson button is showing (the panel's, or the result card's once an attempt has ended).
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
  const report = {scope: 'Lessons 2 to 4 in the real game: board rows, lesson 2 middle and right tries on Tremblant Woods, lesson 3 rev counter and manual box, lesson 4 boards and ice sign.',
    fixtures: [], captures: []};
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip,engine-curve');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!window.__render?.scene&&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
    document.querySelector('#driving-instructor')?.hidden===false`, 'isolated lesson menu', 90000);
  report.storage = await context.evaluate(`(()=>({qaTab:window.name.startsWith('__duel_qa_tab_v2:'),
    memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value}))()`);
  if (!report.storage.qaTab || !report.storage.memoryOnly) throw Error('Private memory-only storage required');
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

  // ---- Lesson 2: the middle try and the right try on Tremblant Woods --------------------------------------------
  await takeLesson(context, report, 'line', 'Tremblant Woods');
  report.line.start = await context.evaluate(`(()=>{
    const a=window.__qaApp,r=a.duel.drivingLesson,s=a.duel.state;
    if(r.lesson.id!=='line'||r.lesson.stage!=='late'||r.plan.courseId!=='tremblant-woods')throw Error('Lesson 2 did not start on Tremblant Woods');
    if(s.opponents.length||s.traffic.length||s.tyreSlipRules!==true)throw Error('Lesson isolation missing');
    return{scene:${sceneStateExpression},panel:document.querySelector('.drive-lesson-panel').textContent,instructor:r.plan.instructor.timeSec};})()`);
  if (report.line.start.scene.cones !== 3 || report.line.start.scene.markersShown < 20 || report.line.start.scene.redBoard !== 0)
    throw Error('Lesson 2 should draw the apex and exit cones and the middle markers, no red board: ' + JSON.stringify(report.line.start.scene));
  if (!/Try 1: stay on the markers/.test(report.line.start.panel)) throw Error('Lesson 2 panel: ' + report.line.start.panel);
  report.captures.push(await context.screenshot('lesson-2-middle-markers'));
  await holdUntilResult(context, 'KeyW', 'w', 87, 'lesson 2 middle try result');
  report.line.middle = await context.evaluate(`(()=>{
    const lesson=window.__qaApp.duel.drivingLesson.lesson;
    if(lesson.stage!=='late'||!lesson.lastAttempt||lesson.lastAttempt.elapsedSeconds<=0)throw Error('The middle try did not produce an honest result');
    if(JSON.stringify(window.__qaApp.profile)!==${JSON.stringify(report.before)})throw Error('An unfinished lesson changed the career');
    return{attempt:lesson.lastAttempt,text:document.querySelector('.drive-lesson-result').textContent.replace(/\\s+/g,' ')};})()`);
  if (!/Cones touched \d+ of 3/.test(report.line.middle.text) || !/Middle-of-the-road try complete/.test(report.line.middle.text))
    throw Error('Lesson 2 middle result card: ' + report.line.middle.text);
  report.captures.push(await context.screenshot('lesson-2-middle-result'));
  await nextAndFreeze(context, 'right');
  report.line.right = await context.evaluate(`(()=>({scene:${sceneStateExpression},rules:document.querySelectorAll('.drive-lesson-rules li').length,
    panel:document.querySelector('.drive-lesson-panel').textContent.replace(/\\s+/g,' ')}))()`);
  if (report.line.right.scene.markersShown !== 0 || report.line.right.scene.cones !== 3 || report.line.right.rules !== 3)
    throw Error('Lesson 2 right stage should hide the markers and list three rules: ' + JSON.stringify(report.line.right));
  report.captures.push(await context.screenshot('lesson-2-right-cones'));
  await holdUntilResult(context, 'KeyW', 'w', 87, 'lesson 2 right try result');
  report.line.rightResult = await context.evaluate(`(()=>({text:document.querySelector('.drive-lesson-result').textContent.replace(/\\s+/g,' '),
    rules:window.__qaApp.duel.drivingLesson.lesson.lastAttempt.rules}))()`);
  if (!/Instructor \d/.test(report.line.rightResult.text) || report.line.rightResult.rules.length !== 3) throw Error('Lesson 2 right result card: ' + JSON.stringify(report.line.rightResult));
  report.captures.push(await context.screenshot('lesson-2-right-result'));
  await click(context, '.drive-lesson-result [data-drive-action="next"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.phase==='driving'`, 'lesson 2 next try');
  await context.evaluate(`window.__qaApp.stop()`);
  report.line.panelClear = await checkPanelClear(context, 'lesson 2');
  const firstCone = await context.evaluate(`window.__qaApp.duel.drivingLesson.plan.instructor.cones[0].s`);
  report.captures.push(await lookAt(context, firstCone - 38, 'lesson-2-look-cones'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`, 'leave lesson 2');
  await context.evaluate(`window.__qaApp.start()`);

  // ---- Lesson 3: the rev counter, forced manual box --------------------------------------------------------------
  report.fixtures.push('Lesson 2 marked done in the same temporary career (lesson 3 cannot open otherwise)');
  await fixtureDone(context, ['corner', 'line']);
  report.before = await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  await takeLesson(context, report, 'gears', 'Tremblant Woods');
  report.gears = {...report.gears, ...await context.evaluate(`(()=>{
    const a=window.__qaApp,s=a.duel.state;
    const mark=document.querySelector('.rpm-track .drive-lesson-green-mark'),lights=document.querySelectorAll('.drive-lesson-lights i');
    if(!mark||lights.length!==3)throw Error('The green mark and three shift lights are not on the rev counter');
    if(a.duel.diff.autoShift!==false||a.duel.diff.engineBlow!==false||s.engineCurve!==true||s.gear!==1)throw Error('Lesson 3 should be manual, undamaged, on the engine curve, in 2nd');
    return{mark:mark.style.left,lights:lights.length,panel:document.querySelector('.drive-lesson-panel').textContent.replace(/\\s+/g,' '),gear:document.querySelector('#gear-value').textContent};})()`)};
  if (report.gears.mark !== '50%') throw Error('The green mark is not at half revs: ' + report.gears.mark);
  await press(context, 'KeyW', 'w', 87);
  await context.evaluate(`window.__qaApp.start()`);
  await context.waitFor(`document.querySelectorAll('.drive-lesson-lights i.is-lit').length===3`, 'all three shift lights lit', 30000);
  await context.evaluate(`window.__qaApp.stop()`);
  report.captures.push(await context.screenshot('lesson-3-shift-lights-lit'));
  await context.evaluate(`window.__qaApp.start()`);
  await press(context, 'KeyE', 'e', 69); await release(context, 'KeyE', 'e', 69);
  await context.waitFor(`document.querySelector('#gear-value').textContent==='3'`, 'E changes up on Casual in this lesson', 10000);
  try {
    await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.phase==='result'`, 'lesson 3 early-shift try result', 90000);
  } finally {
    await release(context, 'KeyW', 'w', 87);
  }
  await context.evaluate(`window.__qaApp.stop()`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`, 'lesson 3 result card');
  report.gears.result = await context.evaluate(`(()=>({text:document.querySelector('.drive-lesson-result').textContent.replace(/\\s+/g,' '),
    upshifts:window.__qaApp.duel.drivingLesson.lesson.lastAttempt.upshifts}))()`);
  if (!/(Changed up at \d+%|You did not change up)/.test(report.gears.result.text) || !/On the limiter/.test(report.gears.result.text))
    throw Error('Lesson 3 result card: ' + report.gears.result.text);
  report.captures.push(await context.screenshot('lesson-3-early-result'));
  if (await context.evaluate(`JSON.stringify(window.__qaApp.profile)`) !== report.before) throw Error('Lesson 3 changed the career');
  await nextAndFreeze(context, 'right');
  report.gears.panelClear = await checkPanelClear(context, 'lesson 3');
  report.gears.rules = await context.evaluate(`document.querySelectorAll('.drive-lesson-rules li').length`);
  if (report.gears.rules !== 4) throw Error('Lesson 3 should list four rules');
  report.captures.push(await context.screenshot('lesson-3-right-panel'));
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
  await takeLesson(context, report, 'snow', 'Tremblant Snow');
  report.snow = {...report.snow, ...await context.evaluate(`(()=>{
    const a=window.__qaApp,r=a.duel.drivingLesson,s=a.duel.state;
    if(r.lesson.id!=='snow'||r.plan.courseId!=='tremblant-snow'||s.tyre!==undefined)throw Error('Lesson 4 should start on summer tyres at Tremblant Snow');
    return{scene:${sceneStateExpression},panel:document.querySelector('.drive-lesson-panel').textContent.replace(/\\s+/g,' '),
      marks:{ice:r.plan.instructor.ice[0].s0,snowCone:r.plan.instructor.cones[0].s,board:r.plan.instructor.redBoardS},
      winter:r.plan.instructor.winter.timeSec,summer:r.plan.instructor.timeSec};})()`)};
  if (report.snow.scene.cones !== 3 || report.snow.scene.redBoard !== 1 || report.snow.scene.iceSign !== 1 || report.snow.winter >= report.snow.summer)
    throw Error('Lesson 4 should draw three cones, the dry board and the ice sign, with a faster winter instructor: ' + JSON.stringify(report.snow));
  report.captures.push(await context.screenshot('lesson-4-start'));
  // Look captures (see lookAt): the ice sign with the snow cone, then the dry board past the ice. The attempt is then thrown away.
  report.captures.push(await lookAt(context, report.snow.marks.ice - 70, 'lesson-4-look-sign-and-cone'));
  report.snow.sign = await context.evaluate(`(()=>{const g=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const sign=g.children.find(n=>n.userData.iceSign),cam=window.__render.camera,v=sign.position.clone();sign.getWorldPosition(v);
    const car=window.__qaApp.duel.course.groundAt(window.__qaApp.duel.state.s,window.__qaApp.duel.state.lateral);
    const p=v.clone().project(cam);return{pos:[v.x,v.y,v.z].map(n=>+n.toFixed(1)),car:[car.x,car.y,car.z].map(n=>+n.toFixed(1)),ndc:[p.x,p.y,p.z].map(n=>+n.toFixed(2)),
      rotationY:+sign.rotation.y.toFixed(2),scale:sign.scale.x,children:sign.children.length};})()`);
  report.captures.push(await lookAt(context, report.snow.marks.board - 28, 'lesson-4-look-dry-board'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`, 'leave lesson 4 look');
  await context.evaluate(`window.__qaApp.start()`);
  // The honest first try: hold W; it ends on the road, a wall or the finish.
  await takeLesson(context, report, 'snow', 'Tremblant Snow');
  await holdUntilResult(context, 'KeyW', 'w', 87, 'lesson 4 dry-board try result');
  report.snow.result = await context.evaluate(`(()=>({text:document.querySelector('.drive-lesson-result').textContent.replace(/\\s+/g,' '),
    attempt:window.__qaApp.duel.drivingLesson.lesson.lastAttempt}))()`);
  if (!/(You braked \d+ m (before|after) the snow cone|You braked at the snow cone|You did not brake)/.test(report.snow.result.text) || !/Dry-board try complete/.test(report.snow.result.text))
    throw Error('Lesson 4 result card: ' + report.snow.result.text);
  report.captures.push(await context.screenshot('lesson-4-late-result'));
  if (await context.evaluate(`JSON.stringify(window.__qaApp.profile)`) !== report.before) throw Error('Lesson 4 changed the career');
  await nextAndFreeze(context, 'right');
  report.snow.panelClear = await checkPanelClear(context, 'lesson 4');
  report.snow.rightScene = await context.evaluate(sceneStateExpression);
  if (report.snow.rightScene.redBoard !== 0 || report.snow.rightScene.iceSign !== 1)
    throw Error('Lesson 4 right stage should hide the dry board and keep the ice sign: ' + JSON.stringify(report.snow.rightScene));
  report.captures.push(await context.screenshot('lesson-4-right-panel'));
  await leaveLesson(context);
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`, 'leave lesson 4');
  await context.evaluate(`window.__qaApp.start()`);
  if (context.issues.length || context.warnings.length) throw Error('Lessons browser emitted console issues/warnings');
  await writeFile(join(context.outputDir, 'drive-lessons-view-2.json'), JSON.stringify(report, null, 2) + '\n', {flag: 'wx'});
}
