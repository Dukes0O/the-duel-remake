import {lessonBoardMarkup} from './lesson-board.js';

// Presentation only. The host supplies actual catalog/ownership choices and the
// current lesson observation; callbacks request actions without performing them.
const escape = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const rows = value => Array.isArray(value) ? value : [];
const textId = value => typeof value === 'string' && value.trim().length > 0;
const seconds = value => Number.isFinite(value) && value >= 0 ? value.toFixed(2) + ' s' : 'Not available';
const stages = Object.freeze({late: 'Try 1: brake late', right: 'Try 2: do it right', challenge: 'Challenge: three in a row'});
const rules = Object.freeze(['Brake at cone 1', 'Touch the inside cone', 'Accelerate out wide', 'Keep screech below 0.30 s']);

// corners comes from DRIVE_LESSON_CORNERS; no copy of that source table lives
// here. Catalog arrays have {id,name}; ownership is supplied separately.
export function driveLessonBoardModel(props = {}) {
  const ownedCourses = new Set(rows(props.ownedCourseIds));
  const catalog = new Map(rows(props.courses).map(course => [course.id, course]));
  const seen = new Set();
  const courses = rows(props.corners).flatMap(corner => {
    const course = catalog.get(corner.courseId);
    if (!course || !textId(course.id) || seen.has(course.id)) return [];
    seen.add(course.id);
    return [{id: course.id, name: course.name, cornerName: corner.cornerName,
      rollingMph: corner.rollingMph, owned: ownedCourses.has(course.id)}];
  });
  const selected = courses.find(course => course.id === props.courseId && course.owned)
    ?? courses.find(course => course.owned) ?? null;
  const car = rows(props.cars).find(item => item.id === props.carId);
  const progress = props.progress;
  const compatible = progress == null || progress.version === 1;
  const completed = compatible && progress?.done?.corner === true;
  const best = progress?.best?.corner;
  let reason = '';
  if (!textId(props.playerId)) reason = 'Choose a player first.';
  else if (!compatible) reason = 'This lesson progress belongs to another version.';
  else if (!selected) reason = 'Opens later: buy Panorama Ridge or Tremblant Woods.';
  else if (!car || !rows(props.ownedCarIds).includes(car.id)) reason = 'Choose an unlocked car.';
  else if (!['casual', 'pro'].includes(props.difficulty)) reason = 'Choose Casual or Pro.';
  const start = reason ? null : {lessonId: 'corner', courseId: selected.id, carId: car.id, difficulty: props.difficulty};
  return {courses, selected, car, start, reason, completed,
    bestMargin: compatible && Number.isFinite(best) && best > 0 ? best : null,
    // Shared board treats done as an enabled Retake. Keep saved completion
    // visible separately if the current car/course/player cannot start it.
    rows: [{group: 'Driving', id: 'corner', name: '1 The sharp corner', open: !!start, done: !!start && completed}]};
}

export function driveLessonBoardMarkup(props = {}) {
  const model = driveLessonBoardModel(props);
  const choices = model.courses.map(course => `<label class="drive-lesson-course">
    <input type="radio" name="drive-lesson-course" data-drive-course="${escape(course.id)}"
      ${model.selected?.id === course.id ? 'checked' : ''} ${course.owned ? '' : 'disabled'}>
    <span>${escape(course.name)} — ${escape(course.cornerName)}${course.owned ? '' : ' (not owned)'}</span></label>`).join('');
  const best = model.bestMargin == null ? '' : `<p>Best: ${seconds(model.bestMargin)} faster</p>`;
  const car = model.car ? escape(model.car.name) : 'Choose an unlocked car';
  const difficulty = props.difficulty === 'pro' ? 'Pro' : props.difficulty === 'casual' ? 'Casual' : 'Choose a setting';
  return `<section class="drive-lesson-board" aria-label="Driving instructor">
    <h2>Driving lessons</h2><p>Brake before the corner. Follow the three cones.</p>
    <fieldset><legend>Choose a corner</legend>${choices}</fieldset>
    <p class="drive-lesson-setup">Car: ${car}. Setting: ${difficulty}.</p>
    ${lessonBoardMarkup(model.rows, {action: 'data-drive-action'})}
    ${model.reason ? `<p class="drive-lesson-notice" role="status">${escape(model.reason)}</p>` : ''}
    ${model.completed && !model.start ? '<p>Lesson completed. Retake when your course and car are available.</p>' : ''}
    ${best}<button type="button" data-drive-action="leave">Back</button></section>`;
}

function currentLesson(props) {
  const lesson = props?.lesson;
  if (!textId(props?.playerId) || props.playerId !== props.runPlayerId || lesson?.id !== 'corner'
      || !Object.hasOwn(stages, lesson.stage) || !['ready', 'driving', 'result'].includes(lesson.phase)) return null;
  return lesson;
}
const streak = lesson => Number.isInteger(lesson.streak) && lesson.streak >= 0 && lesson.streak <= 3 ? lesson.streak : 0;
const passed = lesson => lesson.stage === 'challenge' && lesson.phase === 'result'
  && lesson.done === true && streak(lesson) === 3 && lesson.lastAttempt?.finished === true && lesson.lastAttempt?.passed === true;
const canNext = lesson => lesson && !lesson.done && ['ready', 'result'].includes(lesson.phase);
function nextLabel(lesson) {
  if (lesson.phase === 'ready') return 'Start try';
  if (lesson.stage === 'late') return 'Try the right way';
  if (lesson.stage === 'right') return lesson.lastAttempt?.passed ? 'Start challenge' : 'Try again';
  return 'Next attempt';
}
function nextButton(lesson) {
  return canNext(lesson) ? `<button type="button" data-drive-action="next">${nextLabel(lesson)}</button><small>Enter starts the next attempt.</small>` : '';
}

export function driveLessonPanelMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson) return '';
  const checked = lesson.phase === 'result' ? lesson.lastAttempt?.rules : null;
  const checklist = lesson.stage === 'right' ? `<ol class="drive-lesson-rules">${rules.map((rule, index) => {
    const met = checked?.[index];
    const status = met === true ? 'Met:' : met === false ? 'Missed:' : 'In progress:';
    return `<li><span>${status}</span> ${rule}</li>`;
  }).join('')}</ol>` : `<p>${lesson.stage === 'late'
    ? 'Keep your foot down and brake at the red board.' : 'Beat the instructor through the corner three times in a row.'}</p>`;
  return `<section class="drive-lesson-panel" aria-label="Driving lesson">
    <h2>${stages[lesson.stage]}</h2><p>Instructor ${seconds(lesson.instructor?.timeSec > 0 ? lesson.instructor.timeSec : null)}</p>
    ${checklist}<p class="drive-lesson-streak">Streak <strong>${streak(lesson)}/3</strong></p>
    <button type="button" data-drive-action="leave">Leave lesson</button></section>`;
}

export function driveLessonResultMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson || lesson.phase !== 'result' || !lesson.lastAttempt) return '';
  const result = lesson.lastAttempt;
  const finished = result.finished === true;
  const loss = Number.isFinite(result.timeLostSeconds) ? result.timeLostSeconds : null;
  const comparison = !finished || loss == null ? '' : loss < 0
    ? `<p>Faster by ${seconds(-loss)}</p>` : `<p>Lost ${seconds(loss)}</p>`;
  const reasons = {wall: 'Wall hit', offroad: 'Off the road', stop: 'Stopped'};
  const progress = Number.isFinite(result.progressM) && result.progressM >= 0 ? result.progressM.toFixed(1) + ' m' : 'Not available';
  const timing = finished ? `You ${seconds(result.elapsedSeconds)}`
    : `Did not finish. ${reasons[result.endReason] ?? 'Attempt ended'}. Reached ${progress}. Elapsed ${seconds(result.elapsedSeconds)}`;
  const title = passed(lesson) ? 'Lesson passed' : lesson.stage === 'late' ? 'Late-braking try complete'
    : result.passed ? 'Attempt complete' : 'Try again';
  const best = Number.isFinite(lesson.bestMargin) && lesson.bestMargin > 0
    ? `<p>Best: ${seconds(lesson.bestMargin)} faster</p>` : '';
  return `<section class="drive-lesson-result" role="region" aria-label="Attempt result" aria-live="polite">
    <h2>${title}</h2><p>${timing}</p><p>Instructor ${seconds(lesson.instructor?.timeSec > 0 ? lesson.instructor.timeSec : null)}</p>
    ${comparison}<p>Tyres screeched ${seconds(result.screechSeconds)}</p>${best}
    ${nextButton(lesson)}${passed(lesson)&&props.lessonSaveFailed?'<button type="button" data-drive-action="retry-save">Retry save</button>':''}<button type="button" data-drive-action="leave">Leave lesson</button></section>`;
}

// Read props when an event happens. A stale menu cannot start a formerly owned
// course or act for a player who has since changed. The host remains authoritative.
export function bindDriveLessonUi(root, readProps, callbacks = {}) {
  if (!root?.addEventListener || typeof readProps !== 'function') throw new TypeError('Lesson root and current props reader required');
  const inside = node => !!node && root.contains(node);
  const next = props => {
    if (!canNext(currentLesson(props))) return false;
    callbacks.onNext?.(); return true;
  };
  const click = event => {
    const button = event.target?.closest?.('[data-drive-action]');
    if (!inside(button) || button.disabled) return;
    const action = button.dataset.driveAction;
    const props = readProps();
    if (action === 'leave') callbacks.onLeave?.();
    else if (action === 'next') next(props);
    else if (action === 'retry-save' && props.lessonSaveFailed === true && passed(currentLesson(props) ?? {})) callbacks.onRetrySave?.();
    else if (action === 'start:corner') {
      const model = driveLessonBoardModel(props);
      if (model.start && !props.lesson) callbacks.onStart?.({...model.start});
    }
  };
  const change = event => {
    const input = event.target;
    if (!inside(input) || input.disabled || !input.dataset?.driveCourse) return;
    const model = driveLessonBoardModel(readProps());
    if (model.courses.some(course => course.id === input.dataset.driveCourse && course.owned))
      callbacks.onSelectCourse?.({courseId: input.dataset.driveCourse});
  };
  const keydown = event => {
    if (event.key !== 'Enter' || event.repeat || !inside(event.target)
        || /^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (next(readProps())) event.preventDefault();
  };
  root.addEventListener('click', click); root.addEventListener('change', change); root.addEventListener('keydown', keydown);
  return () => {root.removeEventListener('click', click); root.removeEventListener('change', change); root.removeEventListener('keydown', keydown);};
}


// This owns only its DOM surface. Race and save actions remain App verbs.
export function mountDriveLessonUi(app,host){
  const root=host.ownerDocument.createElement('div');
  root.className='drive-lesson-host';root.tabIndex=-1;root.hidden=true;host.append(root);
  let previous='';
  const clean=bindDriveLessonUi(root,()=>app.driveLessonProps(),{
    onStart:request=>void app.startLesson({...request,car:request.carId}),
    onNext:()=>app.nextLessonAttempt(),onLeave:()=>app.leaveLesson(),onRetrySave:()=>app.retryLessonSave(),
    onSelectCourse:({courseId})=>{
      const selected=driveLessonBoardModel(app.driveLessonProps()).selected?.id;
      if(courseId!==selected&&app._driveLessonPreparing)
        settleDriveLessonPreparation(app,app._driveLessonPreparing);
      app.driveLessonCourse=courseId;previous='';update();
    },
  });
  const open=event=>{
    const button=event.target?.closest?.('[data-drive-open]');
    if(button&&host.contains(button)&&!button.hidden)app.openDrivingLessons();
  };
  host.addEventListener('click',open);
  function update(){
    const available=app.drivingLessonsAvailable();
    const button=host.querySelector('[data-drive-open]');
    if(button)button.hidden=!available||app.duel.state.status!=='menu';
    const props=app.driveLessonProps(),run=!!props.lesson;
    root.hidden=!available||!run&&!app.driveLessonBoardOpen;
    root.classList.toggle('drive-lesson-host-running',run);
    if(root.hidden)return;
    const markup=run?driveLessonPanelMarkup(props)+driveLessonResultMarkup(props):driveLessonBoardMarkup(props);
    const message=app.driveLessonMessage;
    const status=message?`<p class="drive-lesson-message" role="status">${escape(message)}</p>`:'';
    const radio=run&&app.driveLessonRadioText?`<p class="drive-lesson-radio" aria-live="polite">${escape(app.driveLessonRadioText)}</p>`:'';
    const content=markup+status+radio;
    if(content!==previous){
      const action=root.contains(host.ownerDocument.activeElement)?host.ownerDocument.activeElement?.dataset?.driveAction:null;
      root.innerHTML=content;previous=content;
      if(action)root.querySelector(`[data-drive-action="${action}"]`)?.focus({preventScroll:true});
    }
    root.classList.toggle('drive-lesson-host-result',run&&props.lesson.phase==='result');
  }
  return {update,dispose(){clean();host.removeEventListener('click',open);root.remove();}};
}


// Pure boundary check before the approved profile API is called. An old event
// or a different player's finished lesson must never grant a reward.
export function driveLessonCompletion(run,state,playerId){
  const lesson=run?.lesson;
  if(!playerId||run?.ownerId!==playerId||run.state!==state||state?.playerId!==playerId||
    run.plan?.car!==state.car||run.plan?.difficulty!==state.difficulty||
    run.plan?.driverId!==state.driverId||!lesson||lesson.id!=='corner'||
    lesson.stage!=='challenge'||lesson.phase!=='result'||!lesson.done||lesson.streak!==3||
    lesson.lastAttempt?.finished!==true||lesson.lastAttempt?.passed!==true||
    !Number.isFinite(lesson.bestMargin)||lesson.bestMargin<=0)return null;
  return {id:'corner',carId:state.car,marginSeconds:lesson.bestMargin};
}


export function settleDriveLessonPreparation(host,token,message=''){
  if(host._driveLessonPreparing!==token)return false;
  host._driveLessonPreparing=null;host.driveLessonMessage=message;return true;
}

export function driveLessonGhostPose(poses,t,car,course){
  const index=poses.findIndex(pose=>pose.t>=t);
  if(index<0)return null;
  const b=poses[index],a=poses[Math.max(0,index-1)];
  const mix=b.t>a.t?Math.max(0,Math.min(1,(t-a.t)/(b.t-a.t))):0;
  // Null/missing native ground witnesses remain absent. Arithmetic with null
  // would invent a zero-height ground sample and lower the ghost to y=0.
  const interpolate=key=>Number.isFinite(a[key])&&Number.isFinite(b[key])?a[key]+(b[key]-a[key])*mix:null;
  const s=interpolate('s'),heading=a.heading+Math.atan2(Math.sin(b.heading-a.heading),Math.cos(b.heading-a.heading))*mix;
  return {car,s,lateral:interpolate('lateral'),headingError:heading-course.at(s).heading,
    speedMph:interpolate('mph'),airHeight:interpolate('airHeight'),groundHeight:interpolate('groundHeight'),
    terrainPitch:interpolate('terrainPitch'),terrainRoll:interpolate('terrainRoll')};
}
