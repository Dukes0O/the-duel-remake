import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Ordinary private UI acceptance of lesson 1 as it plays now (DRIVING_LESSONS 14): the board, the briefing,
// Watch me, Follow me, the result card and the step buttons. Clicks are real. A run no longer ends early (a held
// key just crawls on), so the one driven run is stepped on the game's own fixed clock with the instructor's recorded
// inputs sent through the normal input path. No placement, invented result, state mutation, alternate physics,
// audio capture or frame measurement.
async function click(context,selector){
  const point=await context.evaluate(`(()=>{
    const node=document.querySelector(${JSON.stringify(selector)});
    if(!node||node.disabled||node.hidden)throw Error('Lesson control unavailable: '+${JSON.stringify(selector)});
    node.scrollIntoView({block:'center'});
    const box=node.getBoundingClientRect(),top=document.elementFromPoint(box.x+box.width/2,box.y+box.height/2);
    if(!box.width||!box.height||!node.contains(top))throw Error('Lesson control is covered');
    return{x:box.x+box.width/2,y:box.y+box.height/2};})()`);
  for(const type of ['mousePressed','mouseReleased'])await context.command('Input.dispatchMouseEvent',{
    type,button:'left',clickCount:1,...point});
}
export async function run(context){
  const report={scope:'Actual memory-only Instructor board, native plan, briefing, drawn cones, line and zones, Watch me, Follow me, native result card and step buttons. The Beat me win and the reward are the native tests and the keyboard finishing pass.',
    fixtures:[],captures:[]};
  // 1366 x 768, the laptop size lessons-v2-view uses. At 1280 x 720 the lesson panel covers 27 px of the minimap (reported in QA-LESSON-SCENARIOS).
  await context.command('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!window.__render?.scene&&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
    document.querySelector('#driving-instructor')?.hidden===false`,'isolated lesson menu',90000);
  report.storage=await context.evaluate(`(()=>({qaTab:window.name.startsWith('__duel_qa_tab_v2:'),
    memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value}))()`);
  if(!report.storage.qaTab||!report.storage.memoryOnly)throw Error('Private memory-only storage required');
  // Use the existing, visible temporary-career QA fixture, then the real
  // player verbs. Do not buy or inject course/lesson progress.
  await context.evaluate(`(()=>{
    const button=[...document.querySelectorAll('details button')].find(node=>node.textContent==='Create funded temporary player');
    if(!button||button.disabled)throw Error('Funded temporary career fixture missing');button.click();
    const a=window.__qaApp;
    a.setRaceSettings({eventId:'panorama-ridge',car:'falcone_f42',difficulty:'casual'});
    a.audio.setMuted(true);
    for(const panel of document.querySelectorAll('details')){
      const text=panel.querySelector('summary')?.textContent||'';
      if(text.includes('TEMPORARY SAVES')||text.startsWith('Performance samples'))panel.hidden=true;
    }
  })()`);
  report.fixtures.push('Existing funded temporary career button; no course purchase');
  await click(context,'#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'unowned corner board');
  report.owner=await context.evaluate(`(()=>{
    const a=window.__qaApp,ownerId=a.player.id;
    if(!a.addPlayer('Driving lesson second player').ok)throw Error('Second temporary player unavailable');
    const otherId=a.player.id;
    if(!a.driveLessonProps().ownedCourseIds.includes('pacific-canyon')||
      a.driveLessonProps().ownedCourseIds.includes('panorama-ridge'))throw Error('Second player inherited another course');
    if(a.startLesson.constructor.name!=='AsyncFunction')throw Error('Real instructor factory host missing');
    return{ownerId,otherId};})()`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'new player can start without buying a course');
  const board = await context.evaluate(`(()=>{
    const panel=document.querySelector('.drive-lesson-board');
    const choices=[...panel.querySelectorAll('input[name="drive-lesson-course"]')];
    return {text:panel.textContent,enabled:choices.filter(n=>!n.disabled).map(n=>n.dataset.driveCourse),
      locked:[...panel.querySelectorAll('.lesson-board-locked')].map(n=>({text:n.textContent,cursor:getComputedStyle(n).cursor,color:getComputedStyle(n).color}))};})()`);
  if(board.enabled.join(',')!=='panorama-ridge,tremblant-woods'||/not owned|buy /i.test(board.text)
      ||board.locked.length!==3||board.locked.some(n=>n.cursor==='pointer'||!/Opens later/.test(n.text)))
    throw Error('New-player board choices or locked lesson reasons are wrong: '+JSON.stringify(board));
  report.newPlayerBoard=board;
  report.captures.push(await context.screenshot('driving-lesson-new-player-board'));
  for(const courseId of ['tremblant-woods','panorama-ridge']) {
    await click(context,`.drive-lesson-board [data-drive-course="${courseId}"]`);
    const selected=await context.evaluate(`window.__qaApp.driveLessonCourse`);
    if(selected!==courseId)throw Error('Unowned corner choice did not respond: '+courseId);
  }
  await context.evaluate(`if(!window.__qaApp.selectPlayer(${JSON.stringify(report.owner.ownerId)}))throw Error('Could not return to lesson owner')`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'original owner board');
  report.captures.push(await context.screenshot('driving-lesson-board'));
  report.before=await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  // The stepper: the game's own fixed clock, with the instructor's recorded inputs as the student's in the steps where the student drives.
  await context.evaluate(`window.lessonDrive=({stopS=Infinity,ticks=90000}={})=>{
    const a=window.__qaApp,r=a.duel.drivingLesson;a.stop();let n=0;
    for(;n<ticks&&r.lesson.phase==='driving'&&a.duel.state.s<stopS;n++){
      if(r.lesson.stage!=='watch')a.duel.setInput(r.plan.instructor.inputs[Math.round(r.lesson.attempt.elapsedSeconds*120)]??{});
      a.duel.step(1/120);
    }
    a._driveLessonUi?.update();a.onFrame?.(a.duel.state);
    return{ticks:n,stage:r.lesson.stage,phase:r.lesson.phase,s:a.duel.state.s};};`);
  await click(context,'.drive-lesson-board [data-drive-action="start:corner"]');
  await context.waitFor(`!!window.__qaApp.duel.drivingLesson||
    window.__qaApp.driveLessonMessage?.includes("can't drive this lesson")`,'actual native instructor plan or explicit failure',90000);
  const failed=await context.evaluate(`!window.__qaApp.duel.drivingLesson?window.__qaApp.driveLessonMessage:null`);
  if(failed)throw Error(failed);
  await context.waitFor(`window.__qaApp.visualReady&&!!document.querySelector('.drive-lesson-briefing')&&
    !!window.__render.scene.getObjectByName('Driving lesson cones and red board')?.visible`,'briefing and lesson scene',90000);
  report.start=await context.evaluate(`(()=>{
    const a=window.__qaApp,r=a.duel.drivingLesson,s=a.duel.state;
    if(r.ownerId!==a.player.id||r.state!==s||s.playerId!==r.ownerId||s.mode!=='timetrial'||
      s.opponents.length||s.traffic.length||s.police.pursuit||s.combat||s.tyreSlipRules!==true)
      throw Error('Lesson isolation/ownership missing');
    if(a.selectPlayer(${JSON.stringify(report.owner.otherId)}))throw Error('Player changed during an active lesson');
    if(r.lesson.id!=='corner'||r.lesson.stage!=='watch'||a.driveLessonBriefing!==true||!r.plan.instructor.poses.length)
      throw Error('The lesson should open on its briefing, ready for Watch me');
    const group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const cones=group.children.filter(node=>node.userData.coneId!==undefined);
    if(!cones.length||cones.length!==r.plan.instructor.cones.length)throw Error('The planned cones are not all drawn');
    if(!group.children.some(node=>node.userData.lessonLine))throw Error('The painted line is not drawn');
    if(!group.children.some(node=>node.name==='Lesson brake and lift boxes'))throw Error('The brake zones are not painted');
    const brief=document.querySelector('.drive-lesson-briefing');
    const steps=[...brief.querySelectorAll('.drive-lesson-brief-steps li')].map(node=>node.textContent.replace(/\\s+/g,' ').trim());
    if(steps.length!==4||!brief.querySelector('svg.drive-lesson-section-map')||brief.querySelectorAll('.drive-lesson-map-corners li').length!==r.plan.instructor.corners.length||
      !/Start Watch me/.test(brief.querySelector('[data-drive-action="next"]')?.textContent||''))
      throw Error('Briefing card is missing its map, corner list, four steps or start button');
    return{ownerId:r.ownerId,courseId:r.plan.courseId,car:s.car,difficulty:s.difficulty,corners:r.plan.instructor.corners.length,
      instructorSeconds:r.plan.instructor.timeSec,cones:cones.length,steps,briefing:brief.textContent.replace(/\\s+/g,' ').trim()};})()`);
  report.captures.push(await context.screenshot('driving-lesson-briefing'));
  // Watch me: lesson 1 first shows the late brake, with its red board. The panel and the four-step strip appear.
  await click(context,'.drive-lesson-briefing [data-drive-action="next"]');
  await context.waitFor(`!!document.querySelector('.drive-lesson-panel')&&!document.querySelector('.drive-lesson-briefing')&&
    window.__qaApp.duel.drivingLesson.lesson.stage==='watch'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`,'Watch me panel');
  report.watch=await context.evaluate(`(()=>{
    const r=window.__qaApp.duel.drivingLesson,group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const strip=[...document.querySelectorAll('.drive-lesson-panel .drive-lesson-step-strip li')].map(node=>({text:node.textContent.trim(),current:node.getAttribute('aria-current')==='step'}));
    if(strip.length!==4||strip.filter(item=>item.current).length!==1||!strip[0].current)throw Error('Step strip should show four steps with Watch me lit: '+JSON.stringify(strip));
    if(r.watchClip!=='late'||!group.children.some(node=>node.userData.redBoard&&node.visible))throw Error('Lesson 1 should open with the late brake clip and its red board');
    return{strip,clip:r.watchClip,caption:document.querySelector('.drive-lesson-watch-caption')?.textContent||''};})()`);
  // DRIVE-LESSON-HUD: no Time Trial banner, lap count or style points, and the lesson panel, the minimap and
  // the instructor's caption never overlap.
  report.hud=await context.evaluate(`(()=>{
    const shown=selector=>{const node=document.querySelector(selector);return !!node&&getComputedStyle(node).display!=='none'&&!!node.getClientRects().length;};
    const hidden=['.race-position','.lap-readout','#route-lap','#style-score-panel'].filter(shown);
    if(hidden.length)throw Error('Lesson still shows Time Trial chrome: '+hidden.join(', '));
    if(!shown('#speed-value')||!shown('#gear-value')||!shown('.route-hud'))throw Error('Lesson lost speed, gear or the minimap');
    const box=selector=>{const node=document.querySelector(selector);if(!node)return null;const b=node.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
    const overlap=(a,b)=>!!a&&!!b&&!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
    const caption=box('.drive-lesson-radio'),map=box('.route-hud'),panel=box('.drive-lesson-panel');
    if(!panel||!map)throw Error('Lesson panel or minimap missing');
    if(overlap(panel,map))throw Error('The lesson panel covers the minimap');
    if(overlap(caption,map))throw Error('The instructor caption covers the minimap');
    if(overlap(caption,panel))throw Error('The instructor caption covers the lesson panel');
    return{caption,map,panel,chromeHidden:true};})()`);
  report.captures.push(await context.screenshot('driving-lesson-watch'));
  // Skip goes to Follow me: ghost, painted line, target box and gap appear once the car is moving.
  // Frozen first: the panel is rebuilt on every frame while the car moves, so a click that takes a human's 100 ms never lands (reported in QA-LESSON-SCENARIOS).
  await context.evaluate(`window.__qaApp.stop()`);
  await click(context,'.drive-lesson-panel [data-drive-action="skip"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson.lesson.stage==='follow'&&window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`,'Follow me starts');
  await context.evaluate(`window.lessonDrive({ticks:600})`);
  report.follow=await context.evaluate(`(()=>{
    const a=window.__qaApp,group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    if(!a.getDriveLessonGhost())throw Error('Follow me should show the instructor as a ghost');
    if(!group.children.some(node=>node.userData.lessonLine&&node.visible))throw Error('Follow me should show the painted line');
    if(!document.querySelector('.drive-lesson-target')||!document.querySelector('.drive-lesson-live-gap'))throw Error('Follow me should show the target box and the live gap');
    if(!document.querySelector('.drive-lesson-corner-lights li'))throw Error('Corner lights missing');
    return{target:document.querySelector('.drive-lesson-target').textContent.replace(/\\s+/g,' '),gap:document.querySelector('.drive-lesson-live-gap').textContent.replace(/\\s+/g,' '),
      lights:document.querySelectorAll('.drive-lesson-corner-lights li').length};})()`);
  report.captures.push(await context.screenshot('driving-lesson-follow'));
  // A whole run to the finish line. A native result, never relabelled as a lesson pass.
  const drive=await context.evaluate(`window.lessonDrive({})`);
  if(drive.phase!=='result')throw Error('The run should end at the finish line: '+JSON.stringify(drive));
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`,'actual result card');
  report.result=await context.evaluate(`(()=>{
    const a=window.__qaApp,run=a.duel.drivingLesson,lesson=run.lesson,card=document.querySelector('.drive-lesson-result');
    if(!lesson.lastAttempt||lesson.stage!=='follow'||lesson.done||!lesson.lastAttempt.finished||lesson.lastAttempt.elapsedSeconds<=0)
      throw Error('Native Follow me run did not produce an honest finished result');
    if(JSON.stringify(a.profile)!==${JSON.stringify(report.before)})throw Error('An unfinished lesson changed saved progress, credits, damage costs or records');
    if(a.ghostRecorder||a.grandPrixLapRecorder||a.lapTelemetryRecorder||a.profile.activeRace)
      throw Error('Lesson started ordinary race recording/settlement');
    const rows=card.querySelectorAll('tbody tr').length;
    if(rows!==run.plan.instructor.corners.length)throw Error('Result table should have one row per corner: '+rows);
    const buttons=[...card.querySelectorAll('[data-drive-action]')].map(node=>node.dataset.driveAction);
    for(const need of ['next','step:watch','step:follow','step:your-turn','step:beat','leave'])if(!buttons.includes(need))throw Error('Result card lacks '+need+': '+buttons.join(','));
    if(!/Start Your turn/.test(card.querySelector('[data-drive-action="next"]').textContent))throw Error('Result card should offer Your turn next');
    if(!card.querySelector('.drive-lesson-advice')?.textContent)throw Error('Result card lacks its advice sentence');
    return{attempt:lesson.lastAttempt,rows,buttons,text:card.textContent.replace(/\\s+/g,' '),profileUnchanged:true,lessonComplete:false};})()`);
  report.captures.push(await context.screenshot('driving-lesson-native-result'));
  await click(context,'.drive-lesson-result [data-drive-action="next"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.stage==='your-turn'&&
    window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`,'next real run starts Your turn');
  // Any step, back or forward (Kyle, 27 October): the strip drops the run unscored and starts the chosen step.
  for(const [id,stage] of [['step:watch','watch'],['step:beat','beat'],['step:follow','follow']]){
    await click(context,`.drive-lesson-panel [data-drive-action="${id}"]`);
    await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.stage===${JSON.stringify(stage)}&&
      window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`,'step button '+id);
  }
  if(await context.evaluate(`JSON.stringify(window.__qaApp.profile)`)!==report.before)throw Error('Choosing steps changed saved progress');
  await click(context,'.drive-lesson-panel [data-drive-action="leave"]');
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`,'leave returns to menu');
  await context.evaluate(`window.__qaApp.start()`);
  if(context.issues.length||context.warnings.length)throw Error('Lesson browser emitted console issues/warnings');
  await writeFile(join(context.outputDir,'drive-lesson-run.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
