import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Manual finishing evidence, using production keyboard adapters and fixed steps.
// No placement, race-state edits, synthetic results or save-progress injection.
function installDriver() {
  const app = window.__qaApp;
  const key = (code, down) => {
    if (!!app.keys[code] !== down) window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', {code, bubbles: true}));
  };
  const release = () => ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyQ'].forEach(code => key(code, false));
  window.lessonEvidenceDrive = (mode, scale = 1, ticks = 14400, stopS = Infinity) => {
    const run = app.duel.drivingLesson, state = app.duel.state, course = app.duel.course;
    const poses = run.plan.instructor.poses, cone = run.plan.instructor.cones[0];
    const sample = s => {
      let i = poses.findIndex(p => p.s >= s); if (i < 0) i = poses.length - 1;
      const b = poses[i], a = poses[Math.max(0, i - 1)], f = b.s > a.s ? Math.max(0, Math.min(1, (s-a.s)/(b.s-a.s))) : 0;
      return {mph:a.mph+(b.mph-a.mph)*f, lateral:a.lateral+(b.lateral-a.lateral)*f};
    };
    const cornerMph = Math.min(...poses.filter(p=>p.s>=run.plan.corner.turnInS&&p.s<=run.plan.corner.turnOutS).map(p=>p.mph));
    let brakeDone = false, maxWide = 0, screech = 0, n = 0;
    for (; n < ticks && run.lesson.phase === 'driving' && state.s < stopS; n++) {
      const speed = state.speedMph * .44704, look = Math.max(12, speed*.45);
      const target = sample(state.s + look), here = course.at(state.s), ahead = course.at(state.s+speed*.18);
      // A small inward aim near the apex compensates for discrete key taps.
      const apex = run.plan.instructor.cones[1].s;
      const inward = mode === 'late' ? 0 : .65 * Math.max(0, 1-Math.abs(state.s+look-apex)/40) * run.plan.corner.dir;
      const heading = Math.atan((target.lateral+inward-state.lateral)*2.5/Math.max(15,speed));
      const yaw = ahead.curvature*speed+(heading-state.headingError)*6;
      const error = yaw-(state.yawVelocity||0);
      key('ArrowLeft', error > .035); key('ArrowRight', error < -.035);
      let brake = state.s >= cone.s && state.speedMph > sample(state.s+2).mph*scale+.5;
      let gas = !brake && state.speedMph < sample(state.s).mph*scale+1;
      if (mode === 'late' && state.s >= cone.s) {
        if (state.s >= run.plan.instructor.redBoardS && state.speedMph <= cornerMph) brakeDone = true;
        brake = state.s >= run.plan.instructor.redBoardS && !brakeDone;
        gas = !brake;
      }
      if (mode === 'miss') brake = false;
      key('ArrowDown',brake); key('ArrowUp',gas);
      key('KeyE',state.revs>.95&&state.gear<app.duel.car.gears.length-1);
      key('KeyQ',state.revs<.48&&state.gear>0);
      app._simulate(1/120);
      if (state.tyreSlip>1) screech+=1/120;
      if (state.s>=run.plan.corner.turnInS&&state.s<=run.plan.corner.turnOutS)
        maxWide=Math.max(maxWide,-run.plan.corner.dir*(state.lateral-sample(state.s).lateral));
    }
    release(); app._driveLessonUi.update(); app.onFrame?.(state);
    return {mode,scale,ticks:n,phase:run.lesson.phase,maxWideM:maxWide,measuredScreech:screech,
      attempt:structuredClone(run.lesson.lastAttempt),text:document.querySelector('.drive-lesson-result')?.textContent,
      panel:document.querySelector('.drive-lesson-panel')?.textContent};
  };
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=driving-lessons,tyre-slip');
  await context.waitFor(`!!window.__qaApp?.visualReady&&[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`,'memory-only menu',90000);
  const isolated = await context.evaluate(`!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`);
  if (!isolated) throw Error('Memory-only storage required');
  await context.evaluate(`(()=>{const a=window.__qaApp;[...document.querySelectorAll('details button')].find(n=>n.textContent==='Create funded temporary player').click();
    for(const id of ['panorama-ridge','tremblant-woods'])if(!a.purchaseCourse(id).ok)throw Error('Course purchase failed');
    a.audio.setMuted(true);for(const d of document.querySelectorAll('details'))d.hidden=true;})()`);
  await context.evaluate(`(${installDriver.toString()})()`);
  const report = {memoryOnly:true,viewport:'1280x720',input:'Arrow keys and E/Q DOM key events through production App._simulate at 120 Hz',rows:[]};
  for (const courseId of ['panorama-ridge','tremblant-woods']) for (const difficulty of ['casual','pro']) {
    const id = courseId+'-'+difficulty;
    await context.evaluate(`(()=>{const a=window.__qaApp;a.leaveLesson();a.addPlayer(${JSON.stringify('Finish '+id)});
      a.profile={...a.profile,credits:50000};a._saveProfile();
      if(!a.purchaseCourse(${JSON.stringify(courseId)}).ok)throw Error('Temporary course purchase failed');
      a.setRaceSettings({eventId:${JSON.stringify(courseId)},car:'falcone_f42',difficulty:${JSON.stringify(difficulty)}});a.openDrivingLessons();})()`);
    const ok = await context.evaluate(`window.__qaApp.startLesson({courseId:${JSON.stringify(courseId)},car:'falcone_f42',difficulty:${JSON.stringify(difficulty)}})`);
    if (!ok) throw Error(await context.evaluate('window.__qaApp.driveLessonMessage'));
    await context.waitFor('window.__qaApp.visualReady','lesson world',90000);
    await context.evaluate('window.__qaApp.stop();window.__qaApp.onFrame?.(window.__qaApp.duel.state)');
    const start = await context.evaluate(`(()=>{const r=window.__qaApp.duel.drivingLesson;return{seed:r.plan.seed,upgrades:r.plan.upgrades,instructor:r.plan.instructor.timeSec,rolling:r.plan.instructor.poses[0].mph,cones:r.plan.instructor.cones,redBoardS:r.plan.instructor.redBoardS}})()`);
    await context.screenshot(id+'-instructions-cones');
    const late = await context.evaluate(`window.lessonEvidenceDrive('late')`);
    await context.screenshot(id+'-late-result');
    await context.evaluate('window.__qaApp.nextLessonAttempt()');
    await context.screenshot(id+'-right-instructions');
    await context.evaluate(`window.lessonEvidenceDrive('right',1,14400,window.__qaApp.duel.drivingLesson.plan.instructor.cones[0].s-16)`);
    await context.screenshot(id+'-before-brake-cone');
    const right = await context.evaluate(`window.lessonEvidenceDrive('right')`);
    await context.screenshot(id+'-right-result');
    const row = {courseId,difficulty,...start,late,right,challenge:[]};
    if (right.attempt?.passed) for (let i=0;i<3;i++) {
      await context.evaluate('window.__qaApp.nextLessonAttempt()');
      row.challenge.push(await context.evaluate(`window.lessonEvidenceDrive('sloppy',${1/(difficulty==='casual'?.92:.97)*.99})`));
    }
    if(row.challenge.length)await context.screenshot(id+'-challenge-result');
    report.rows.push(row);
    await writeFile(join(context.outputDir,'keyboard-results.json'),JSON.stringify(report,null,2)+'\n');
  }
  await context.evaluate('window.__qaApp.leaveLesson()');
}
