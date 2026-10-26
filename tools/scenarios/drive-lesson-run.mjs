import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {run as finishEvidence} from '../drive-lesson-finish.mjs';

// Ordinary private UI acceptance. No placement, invented instructor/result,
// state mutation, alternate physics, audio capture or frame measurement.
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
  if(process.env.DUEL_LESSON_FINISH==='1')return finishEvidence(context);
  const report={scope:'Actual memory-only Instructor board, native plan, drawn cones/panel and native attempt result. Full three-win/reward acceptance remains the native/host gate responsibility.',
    fixtures:[],captures:[]};
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!window.__render?.scene&&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
    document.querySelector('#driving-instructor')?.hidden===false`,'isolated lesson menu',90000);
  report.storage=await context.evaluate(`(()=>({qaTab:window.name.startsWith('__duel_qa_tab_v2:'),
    memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value}))()`);
  if(!report.storage.qaTab||!report.storage.memoryOnly)throw Error('Private memory-only storage required');
  // Use the existing, visible temporary-career QA fixture, then the real
  // course purchase and player verbs. Do not inject course/lesson progress.
  await context.evaluate(`(()=>{
    const button=[...document.querySelectorAll('details button')].find(node=>node.textContent==='Create funded temporary player');
    if(!button||button.disabled)throw Error('Funded temporary career fixture missing');button.click();
    const a=window.__qaApp;if(!a.purchaseCourse('panorama-ridge').ok)throw Error('Actual course purchase failed');
    a.setRaceSettings({eventId:'panorama-ridge',car:'falcone_f42',difficulty:'casual'});
    a.audio.setMuted(true);
    for(const panel of document.querySelectorAll('details')){
      const text=panel.querySelector('summary')?.textContent||'';
      if(text.includes('TEMPORARY SAVES')||text.startsWith('Performance samples'))panel.hidden=true;
    }
  })()`);
  report.fixtures.push('Existing funded temporary career button; actual Panorama purchase');
  await click(context,'#driving-instructor');
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'owned corner board');
  report.owner=await context.evaluate(`(()=>{
    const a=window.__qaApp,ownerId=a.player.id;
    if(!a.addPlayer('Driving lesson second player').ok)throw Error('Second temporary player unavailable');
    const otherId=a.player.id;
    if(!a.driveLessonProps().ownedCourseIds.includes('pacific-canyon')||
      a.driveLessonProps().ownedCourseIds.includes('panorama-ridge'))throw Error('Second player inherited another course');
    if(a.startLesson.constructor.name!=='AsyncFunction')throw Error('Real instructor factory host missing');
    return{ownerId,otherId};})()`);
  await context.waitFor(`!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'current player ownership guard');
  await context.evaluate(`if(!window.__qaApp.selectPlayer(${JSON.stringify(report.owner.ownerId)}))throw Error('Could not return to lesson owner')`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-board [data-drive-action="start:corner"]')`,'original owner board');
  report.captures.push(await context.screenshot('driving-lesson-board'));
  report.before=await context.evaluate(`JSON.stringify(window.__qaApp.profile)`);
  await click(context,'.drive-lesson-board [data-drive-action="start:corner"]');
  await context.waitFor(`!!window.__qaApp.duel.drivingLesson||
    window.__qaApp.driveLessonMessage?.includes('could not complete a clean run')`,'actual native instructor plan or explicit failure',90000);
  const failed=await context.evaluate(`!window.__qaApp.duel.drivingLesson?window.__qaApp.driveLessonMessage:null`);
  if(failed)throw Error(failed);
  await context.evaluate(`window.__qaApp.stop()`);
  await context.waitFor(`window.__qaApp.visualReady&&document.querySelector('.drive-lesson-panel')&&
    window.__render.scene.getObjectByName('Driving lesson cones and red board')?.visible`,'native lesson panel and cone scene',90000);
  report.start=await context.evaluate(`(()=>{
    const a=window.__qaApp,r=a.duel.drivingLesson,s=a.duel.state;
    if(r.ownerId!==a.player.id||r.state!==s||s.playerId!==r.ownerId||s.mode!=='timetrial'||
      s.opponents.length||s.traffic.length||s.police.pursuit||s.combat||s.tyreSlipRules!==true)
      throw Error('Lesson isolation/ownership missing');
    if(a.selectPlayer(${JSON.stringify(report.owner.otherId)}))throw Error('Player changed during an active lesson');
    const group=window.__render.scene.getObjectByName('Driving lesson cones and red board');
    const cones=group.children.filter(node=>node.userData.coneId);
    if(cones.length!==3||!group.children.some(node=>node.userData.redBoard&&node.visible))throw Error('Actual cones/red board are not drawn');
    if(r.lesson.phase!=='driving'||r.lesson.stage!=='late'||!r.plan.instructor.poses.length)
      throw Error('Actual late stage/native instructor poses missing');
    return{ownerId:r.ownerId,courseId:r.plan.courseId,car:s.car,difficulty:s.difficulty,
      instructorSeconds:r.plan.instructor.timeSec,cones:cones.map(node=>node.userData.coneId),
      panel:document.querySelector('.drive-lesson-panel').textContent};})()`);
  // DRIVE-LESSON-HUD: no Time Trial banner, lap count or style points, and the
  // instructor's caption, the lesson panel and the minimap never overlap.
  report.hud=await context.evaluate(`(()=>{
    const shown=selector=>{const node=document.querySelector(selector);return !!node&&getComputedStyle(node).display!=='none'&&!!node.getClientRects().length;};
    const hidden=['.race-position','.lap-readout','#route-lap','#style-score-panel'].filter(shown);
    if(hidden.length)throw Error('Lesson still shows Time Trial chrome: '+hidden.join(', '));
    if(!shown('#speed-value')||!shown('#gear-value')||!shown('.route-hud'))throw Error('Lesson lost speed, gear or the minimap');
    const box=selector=>{const node=document.querySelector(selector);if(!node)throw Error('Missing '+selector);const b=node.getBoundingClientRect();return{x:b.x,y:b.y,w:b.width,h:b.height};};
    const overlap=(a,b)=>!(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);
    const caption=box('.drive-lesson-radio'),map=box('.route-hud'),panel=box('.drive-lesson-panel');
    if(overlap(caption,map))throw Error('The instructor caption covers the minimap');
    if(overlap(caption,panel))throw Error('The instructor caption covers the lesson panel');
    return{caption,map,panel,chromeHidden:true};})()`);
  report.captures.push(await context.screenshot('driving-lesson-cones-panel'));
  // Hold a real driving input. A native wall/off-road/stop result is valid
  // UI evidence; it is never relabelled a passing right/challenge attempt.
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  await context.evaluate(`window.__qaApp.start()`);
  try{
    await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.phase==='result'`,'native student attempt result',60000);
  }finally{
    await context.command('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
  }
  await context.evaluate(`window.__qaApp.stop()`);
  await context.waitFor(`!!document.querySelector('.drive-lesson-result')`,'actual result card');
  report.result=await context.evaluate(`(()=>{
    const a=window.__qaApp,lesson=a.duel.drivingLesson.lesson;
    if(!lesson.lastAttempt||lesson.stage!=='late'||lesson.done||lesson.lastAttempt.elapsedSeconds<=0)
      throw Error('Native attempt did not produce an honest late result');
    if(JSON.stringify(a.profile)!==${JSON.stringify(report.before)})throw Error('An unfinished lesson changed saved progress, credits, damage costs or records');
    if(a.ghostRecorder||a.grandPrixLapRecorder||a.lapTelemetryRecorder||a.profile.activeRace)
      throw Error('Lesson started ordinary race recording/settlement');
    return{attempt:lesson.lastAttempt,text:document.querySelector('.drive-lesson-result').textContent,
      profileUnchanged:true,lessonComplete:false};})()`);
  report.captures.push(await context.screenshot('driving-lesson-native-result'));
  await click(context,'.drive-lesson-result [data-drive-action="next"]');
  await context.waitFor(`window.__qaApp.duel.drivingLesson?.lesson.stage==='right'&&
    window.__qaApp.duel.drivingLesson.lesson.phase==='driving'`,'next real attempt starts right stage');
  await click(context,'.drive-lesson-panel [data-drive-action="leave"]');
  await context.waitFor(`!window.__qaApp.duel.drivingLesson&&window.__qaApp.duel.state.status==='menu'`,'leave returns to menu');
  await context.evaluate(`window.__qaApp.start()`);
  if(context.issues.length||context.warnings.length)throw Error('Lesson browser emitted console issues/warnings');
  await writeFile(join(context.outputDir,'drive-lesson-run.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
}
