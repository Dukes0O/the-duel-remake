import {lessonBoardMarkup} from './lesson-board.js';
import {GEAR_LESSON, TIP_DISTANCE_M} from './drive-lessons.js';

// Presentation only. The host supplies actual catalog/ownership choices and the
// current lesson observation; callbacks request actions without performing them.
const escape = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const rows = value => Array.isArray(value) ? value : [];
const textId = value => typeof value === 'string' && value.trim().length > 0;
const seconds = value => Number.isFinite(value) && value >= 0 ? value.toFixed(2) + ' s' : 'Not available';

// DRIVE-LESSONS-VIEW-2: the four lessons' names, stage titles, rule wording and radio lines. Lesson 1's
// strings are the ones this file always had.
export const DRIVE_LESSON_VIEW = Object.freeze({
  corner: Object.freeze({n: 1, title: 'The sharp corner', intro: 'drive.radio.corner.intro', pass: 'drive.radio.corner.pass',
    stages: Object.freeze({late: 'Try 1: brake late', right: 'Try 2: do it right', challenge: 'Challenge: three in a row'}),
    rules: Object.freeze(['Brake at cone 1', 'Touch the inside cone', 'Accelerate out wide', 'Keep screech below 0.30 s']),
    hints: Object.freeze({late: 'Keep your foot down and brake at the red board.',
      challenge: 'Beat the instructor through the corner three times in a row.'})}),
  line: Object.freeze({n: 2, title: 'The racing line', intro: 'drive.radio.line.intro', pass: 'drive.radio.line.pass',
    stages: Object.freeze({late: 'Try 1: stay on the markers', right: 'Try 2: use the whole road', challenge: 'Challenge: three in a row'}),
    rules: Object.freeze(['Touch every inside cone', 'Pass the last cone on the outside half of the road', 'Keep screech below 0.30 s']),
    hints: Object.freeze({late: 'Stay on the markers down the middle of the road.',
      challenge: 'Beat the instructor through the esses three times in a row.'})}),
  gears: Object.freeze({n: 3, title: 'The gearbox', intro: 'drive.radio.gears.intro', pass: 'drive.radio.gears.pass',
    stages: Object.freeze({late: 'Try 1: change up early', right: 'Try 2: change up on the lights', challenge: 'Challenge: three in a row'}),
    rules: Object.freeze(['Change up when the shift lights come on', 'Stay off the limiter (under 0.50 s)',
      'Leave the corner in the instructor’s gear', 'Keep screech below 0.30 s']),
    hints: Object.freeze({late: 'Change up as soon as the needle passes the green mark. E is up, Q is down.',
      challenge: 'Beat the instructor, changing gear yourself, three times in a row.'})}),
  snow: Object.freeze({n: 4, title: 'Snow', intro: 'drive.radio.snow.intro', pass: 'drive.radio.snow.pass',
    stages: Object.freeze({late: 'Try 1: brake at the dry board', right: 'Try 2: the snow way',
      challenge: 'Challenge: three in a row', winter: 'Last run: winter tyres'}),
    rules: Object.freeze(['Start braking at the snow cone', 'Brake gently, under 20%, on the ice', 'Touch the inside cone',
      'Keep screech below 0.30 s']),
    hints: Object.freeze({late: 'Brake at the red dry board, where you would on a dry road.',
      challenge: 'Beat the instructor on summer tyres three times in a row.',
      winter: 'The same corner on winter tyres. This run passes however fast you go.'})}),
});
const stages = DRIVE_LESSON_VIEW.corner.stages;
const rules = DRIVE_LESSON_VIEW.corner.rules;
const LATER = Object.freeze(['line', 'gears', 'snow']);
// Lesson 3 draws three lights on the rev counter; each comes on a third of the way from the lights' revs to the limiter's.
export const SHIFT_LIGHTS = Object.freeze([0, 1, 2].map(i =>
  GEAR_LESSON.lightsRevs + (GEAR_LESSON.limiterRevs - GEAR_LESSON.lightsRevs) * i / 3));
export const shiftLightsLit = revs => Number.isFinite(revs) ? SHIFT_LIGHTS.filter(at => revs >= at - 1e-9).length : 0;
export const shiftLightCue = index => index === 0 ? 'lesson.shift-light' : `lesson.shift-light.${index + 1}`;

const ordinal = gear => Number.isInteger(gear) && gear >= 0 ? ['1st', '2nd', '3rd'][gear] ?? `${gear + 1}th` : 'none';
const percent = value => Math.round(value * 100) + '%';
// The streets and stretches a lesson row is named after, from the row tables the host passes.
const GEAR_STRETCH = Object.freeze({'panorama-ridge': 'Mountain Straight into The Cutting', 'tremblant-woods': 'Beaver Run into Beaver Hairpin'});
function rowLabel(lessonId, row) {
  if (lessonId === 'line') return [...new Set(rows(row.cornerNames).map(name => name.replace(/ \d+$/, '')))].join(' and ');
  if (lessonId === 'gears') return GEAR_STRETCH[row.courseId] ?? row.cornerName;
  if (lessonId === 'snow') return rows(row.cornerNames)[0] + ' on snow';
  return row.cornerName;
}

// corners comes from DRIVE_LESSON_CORNERS; no copy of that source table lives
// here. Catalog arrays have {id,name}; ownership is supplied separately.
// DRIVE-LESSONS-VIEW-2: with props.lessonRows ({line, gears, snow}: the host's row tables) the board also lists
// lessons 2 to 4, each open or shut by props.lessonAccess ({line: {open}, ...}, from driveLessonAccess); without lessonRows
// the board is lesson 1 alone, exactly as before (the helipad's rows). This file imports nothing that reads the feature catalog.
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
  const bestMargin = compatible && Number.isFinite(best) && best > 0 ? best : null;
  // Shared board treats done as an enabled Retake. Keep saved completion
  // visible separately if the current car/course/player cannot start it.
  const cornerRow = {group: 'Driving', id: 'corner', name: '1 The sharp corner', open: !!start, done: !!start && completed};
  const model = {courses, selected, car, start, reason, completed, bestMargin, rows: [cornerRow]};
  if (!props.lessonRows) return model;
  // With all four lessons listed, every finished lesson shows its best margin in its own row, lesson 1 too.
  if (completed && bestMargin != null) cornerRow.name += ` (best ${seconds(bestMargin)} faster)`;
  const byId = {corner: {id: 'corner', courses, selected, start, reason, completed, bestMargin, row: cornerRow}};
  for (const id of LATER) {
    const table = rows(props.lessonRows[id]);
    const lessonCourses = table.flatMap(row => {
      const course = catalog.get(row.courseId);
      return course && textId(course.id) ? [{id: course.id, name: course.name, cornerName: rowLabel(id, row), owned: ownedCourses.has(course.id)}] : [];
    }).filter((course, index, all) => all.findIndex(other => other.id === course.id) === index);
    const choice = lessonCourses.find(course => course.id === props.courseIds?.[id] && course.owned)
      ?? lessonCourses.find(course => course.owned) ?? null;
    const access = props.lessonAccess?.[id] ?? {open: false};
    const done = compatible && progress?.done?.[id] === true;
    const margin = progress?.best?.[id];
    let why = '';
    const names = lessonCourses.map(course => course.name).join(' or ');
    if (!textId(props.playerId)) why = 'Choose a player first.';
    else if (!compatible) why = 'This lesson progress belongs to another version.';
    else if (id === 'gears' && props.engineCurve !== true) why = 'Opens later: waiting for the new engines.';
    else if (!access.open && !done) why = 'Opens later: finish lesson ' + (id === 'line' ? 1 : id === 'gears' ? 2 : props.engineCurve === true ? 3 : 2) + ' first.';
    else if (!choice) why = 'Opens later: buy ' + names + '.';
    else if (!car || !rows(props.ownedCarIds).includes(car.id)) why = 'Choose an unlocked car.';
    else if (!['casual', 'pro'].includes(props.difficulty)) why = 'Choose Casual or Pro.';
    const go = why ? null : {lessonId: id, courseId: choice.id, carId: car.id, difficulty: props.difficulty};
    const info = DRIVE_LESSON_VIEW[id];
    const bestMargin = compatible && Number.isFinite(margin) && margin > 0 ? margin : null;
    // A finished lesson shows its best margin in its own row ("Best: ..." for lesson 1 sits under the list).
    const row = {group: 'Driving', id, name: info.n + ' ' + info.title + (done && bestMargin != null ? ` (best ${seconds(bestMargin)} faster)` : ''),
      open: !!go, done: !!go && done, note: why};
    byId[id] = {id, courses: lessonCourses, selected: choice, start: go, reason: why, completed: done, bestMargin, row};
    model.rows.push(row);
  }
  model.byId = byId;
  return model;
}

export function driveLessonBoardMarkup(props = {}) {
  const model = driveLessonBoardModel(props);
  const choices = model.courses.map(course => `<label class="drive-lesson-course">
    <input type="radio" name="drive-lesson-course" data-drive-course="${escape(course.id)}"
      ${model.selected?.id === course.id ? 'checked' : ''} ${course.owned ? '' : 'disabled'}>
    <span>${escape(course.name)} — ${escape(course.cornerName)}${course.owned ? '' : ' (not owned)'}</span></label>`).join('');
  const best = model.bestMargin == null || model.byId ? '' : `<p>Best: ${seconds(model.bestMargin)} faster</p>`;
  const car = model.car ? escape(model.car.name) : 'Choose an unlocked car';
  const difficulty = props.difficulty === 'pro' ? 'Pro' : props.difficulty === 'casual' ? 'Casual' : 'Choose a setting';
  // Lessons 2 to 4: a course choice only where a lesson has more than one owned place, and each done lesson's best margin.
  const later = model.byId ? LATER.map(id => {
    const info = model.byId[id];
    const pick = info.courses.length > 1 && info.selected ? `<fieldset class="drive-lesson-more"><legend>Lesson ${DRIVE_LESSON_VIEW[id].n}: choose where</legend>${
      info.courses.map(course => `<label class="drive-lesson-course">
    <input type="radio" name="drive-lesson-course-${id}" data-drive-lesson="${id}" data-drive-course="${escape(course.id)}"
      ${info.selected?.id === course.id ? 'checked' : ''} ${course.owned ? '' : 'disabled'}>
    <span>${escape(course.name)} — ${escape(course.cornerName)}${course.owned ? '' : ' (not owned)'}</span></label>`).join('')}</fieldset>` : '';
    return pick;
  }).join('') : '';
  return `<section class="drive-lesson-board" aria-label="Driving instructor">
    <h2>Driving lessons</h2><p>${model.byId ? 'Pick a lesson and a place. The instructor drives it first.' : 'Brake before the corner. Follow the three cones.'}</p>
    <fieldset${model.byId ? ' class="drive-lesson-more"' : ''}><legend>${model.byId ? 'Lesson 1: choose where' : 'Choose a corner'}</legend>${choices}</fieldset>${later}
    <p class="drive-lesson-setup">Car: ${car}. Setting: ${difficulty}.</p>
    ${lessonBoardMarkup(model.rows, {action: 'data-drive-action'})}
    ${model.reason ? `<p class="drive-lesson-notice" role="status">${escape(model.reason)}</p>` : ''}
    ${model.completed && !model.start ? '<p>Lesson completed. Retake when your course and car are available.</p>' : ''}
    ${best}<button type="button" data-drive-action="leave">Back</button></section>`;
}

function currentLesson(props) {
  const lesson = props?.lesson, info = Object.hasOwn(DRIVE_LESSON_VIEW, lesson?.id) ? DRIVE_LESSON_VIEW[lesson.id] : null;
  if (!textId(props?.playerId) || props.playerId !== props.runPlayerId || !info
      || !Object.hasOwn(info.stages, lesson.stage) || !['ready', 'driving', 'result'].includes(lesson.phase)) return null;
  return lesson;
}
const streak = lesson => Number.isInteger(lesson.streak) && lesson.streak >= 0 && lesson.streak <= 3 ? lesson.streak : 0;
// The lesson is passed: the third win (lessons 1 to 3), or the winter-tyre run (lesson 4, however it ends).
const passed = lesson => lesson.phase === 'result' && lesson.done === true && streak(lesson) === 3 && lesson.lastAttempt?.passed === true
  && (lesson.id === 'snow' ? lesson.stage === 'winter' : lesson.stage === 'challenge' && lesson.lastAttempt?.finished === true);
const canNext = lesson => lesson && !lesson.done && ['ready', 'result'].includes(lesson.phase);
// The snow lesson goes on to its winter-tyre run once the third win is in.
const winterNext = lesson => lesson.id === 'snow' && lesson.stage === 'challenge' && streak(lesson) === 3 && !lesson.done;
function nextLabel(lesson) {
  if (lesson.phase === 'ready') return 'Start try';
  if (lesson.stage === 'late') return 'Try the right way';
  if (lesson.stage === 'right') return lesson.lastAttempt?.passed ? 'Start challenge' : 'Try again';
  return winterNext(lesson) ? 'Start the winter-tyre run' : 'Next attempt';
}
function nextButton(lesson) {
  return canNext(lesson) ? `<button type="button" data-drive-action="next">${nextLabel(lesson)}</button><small>Enter starts the next attempt.</small>` : '';
}
// What the instructor's time is for this stage: the winter run is against the winter instructor.
const instructorTime = lesson => {
  const time = lesson.stage === 'winter' ? lesson.instructor?.winter?.timeSec : lesson.instructor?.timeSec;
  return time > 0 ? time : null;
};

export function driveLessonPanelMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson) return '';
  const info = DRIVE_LESSON_VIEW[lesson.id];
  const checked = lesson.phase === 'result' ? lesson.lastAttempt?.rules : null;
  const checklist = lesson.stage === 'right' ? `<ol class="drive-lesson-rules">${info.rules.map((rule, index) => {
    const met = checked?.[index];
    const status = met === true ? 'Met:' : met === false ? 'Missed:' : 'In progress:';
    return `<li><span>${status}</span> ${rule}</li>`;
  }).join('')}</ol>` : `<p>${lesson.stage === 'late' ? info.hints.late : lesson.stage === 'winter' ? info.hints.winter : info.hints.challenge}</p>`;
  return `<section class="drive-lesson-panel" aria-label="Driving lesson">
    <h2>${info.stages[lesson.stage]}</h2><p>Instructor ${seconds(instructorTime(lesson))}</p>
    ${checklist}<p class="drive-lesson-streak">Streak <strong>${streak(lesson)}/3</strong></p>
    <button type="button" data-drive-action="leave">Leave lesson</button></section>`;
}

// The numbers a lesson reports beyond the time (docs/DRIVING_LESSONS.md 12.2 to 12.4): lesson 3's shift revs and the gear
// at the exit, lesson 4's braking point against the snow cone.
function extraNumbers(lesson, result) {
  if (lesson.id === 'gears') {
    const revs = rows(result.upshiftRevs);
    return `<p>${revs.length ? 'Changed up at ' + revs.map(percent).join(', ') : 'You did not change up'}</p>
    <p>Gear at the exit: ${ordinal(result.exitGear)} (instructor ${ordinal(result.instructorExitGear)})</p>
    <p>On the limiter ${seconds(result.limiterSeconds)}</p>`;
  }
  if (lesson.id === 'snow') {
    const cone = lesson.instructor?.cones?.[0]?.s;
    const gap = Number.isFinite(result.firstBrakeS) && Number.isFinite(cone) ? result.firstBrakeS - cone : null;
    const braking = gap == null ? 'You did not brake'
      : Math.abs(gap) < .5 ? 'You braked at the snow cone'
        : `You braked ${Math.abs(gap).toFixed(0)} m ${gap < 0 ? 'before' : 'after'} the snow cone`;
    const ice = Number.isFinite(result.iceBrakeMax) ? `<p>Brake on the ice ${Math.round(result.iceBrakeMax * 100)}%</p>` : '';
    return `<p>${braking}</p>${ice}`;
  }
  if (lesson.id === 'line') {
    const total = rows(lesson.instructor?.cones).length;
    return `<p>Cones touched ${rows(result.cones).length} of ${total}</p>`;
  }
  return '';
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
  const first = {corner: 'Late-braking try complete', line: 'Middle-of-the-road try complete', gears: 'Early-shift try complete',
    snow: 'Dry-board try complete'}[lesson.id];
  const title = passed(lesson) ? 'Lesson passed' : lesson.stage === 'late' ? first
    : result.passed ? 'Attempt complete' : 'Try again';
  const best = Number.isFinite(lesson.bestMargin) && lesson.bestMargin > 0
    ? `<p>Best: ${seconds(lesson.bestMargin)} faster</p>` : '';
  return `<section class="drive-lesson-result" role="region" aria-label="Attempt result" aria-live="polite">
    <h2>${title}</h2><p>${timing}</p><p>Instructor ${seconds(result.instructorSeconds > 0 ? result.instructorSeconds : instructorTime(lesson))}</p>
    ${comparison}<p>Tyres screeched ${seconds(result.screechSeconds)}</p>${extraNumbers(lesson, result)}${best}
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
    else if (action.startsWith('start:')) {
      const model = driveLessonBoardModel(props), start = (model.byId?.[action.slice(6)] ?? (action === 'start:corner' ? model : null))?.start;
      if (start && !props.lesson) callbacks.onStart?.({...start});
    }
  };
  const change = event => {
    const input = event.target;
    if (!inside(input) || input.disabled || !input.dataset?.driveCourse) return;
    const model = driveLessonBoardModel(readProps());
    const lessonId = input.dataset.driveLesson ?? 'corner';
    const courses = (model.byId?.[lessonId] ?? model).courses;
    if (courses.some(course => course.id === input.dataset.driveCourse && course.owned))
      callbacks.onSelectCourse?.(lessonId === 'corner' ? {courseId: input.dataset.driveCourse} : {courseId: input.dataset.driveCourse, lessonId});
  };
  const keydown = event => {
    if (event.key !== 'Enter' || event.repeat || !inside(event.target)
        || /^(INPUT|BUTTON|SELECT|TEXTAREA|A)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (next(readProps())) event.preventDefault();
  };
  root.addEventListener('click', click); root.addEventListener('change', change); root.addEventListener('keydown', keydown);
  return () => {root.removeEventListener('click', click); root.removeEventListener('change', change); root.removeEventListener('keydown', keydown);};
}

// DRIVE-LESSONS-VIEW-2: the markers of lesson 2's first try are knocked over when the car's centre passes within the
// tip distance (the cones' own distance), the same drawing-only check the cones use. Returns the indices newly knocked.
export function markersKnocked(markers, from, to, knocked) {
  const found = [];
  const dx = to.x - from.x, dz = to.z - from.z, length2 = dx * dx + dz * dz;
  rows(markers).forEach((marker, index) => {
    if (knocked.has(index)) return;
    const fraction = length2 ? Math.max(0, Math.min(1, ((marker.x - from.x) * dx + (marker.z - from.z) * dz) / length2)) : 0;
    if (Math.hypot(from.x + dx * fraction - marker.x, from.z + dz * fraction - marker.z) <= TIP_DISTANCE_M) found.push(index);
  });
  return found;
}

// This owns only its DOM surface. Race and save actions remain App verbs.
export function mountDriveLessonUi(app,host){
  const boardProps=()=>app.driveLessonBoardProps?.()??app.driveLessonProps(); // an app without lessons 2 to 4 shows lesson 1 alone
  const root=host.ownerDocument.createElement('div');
  root.className='drive-lesson-host';root.tabIndex=-1;root.hidden=true;host.append(root);
  let previous='';
  const clean=bindDriveLessonUi(root,()=>boardProps(),{
    onStart:request=>void app.startLesson({...request,car:request.carId}),
    onNext:()=>app.nextLessonAttempt(),onLeave:()=>app.leaveLesson(),onRetrySave:()=>app.retryLessonSave(),
    onSelectCourse:({courseId,lessonId='corner'})=>{
      const model=driveLessonBoardModel(boardProps());
      const selected=(model.byId?.[lessonId]??model).selected?.id;
      if(courseId!==selected&&app._driveLessonPreparing)
        settleDriveLessonPreparation(app,app._driveLessonPreparing);
      if(lessonId==='corner')app.driveLessonCourse=courseId;
      else app.driveLessonCourses={...app.driveLessonCourses,[lessonId]:courseId};
      previous='';update();
    },
  });
  const open=event=>{
    const button=event.target?.closest?.('[data-drive-open]');
    if(button&&host.contains(button)&&!button.hidden)app.openDrivingLessons();
  };
  host.addEventListener('click',open);
  // Lesson 3's rev counter: a green mark at half revs and three shift lights from 90%. Drawing on the HUD's own bar;
  // it reads the revs and never touches the race.
  let gauge=null,lit=0;
  function syncGauge(active,revs){
    const track=active?host.ownerDocument.querySelector('.rpm-track'):null;
    if(!track){if(gauge){gauge.lights.remove();gauge.mark.remove();gauge=null;lit=0;}return;}
    if(!gauge||!track.contains(gauge.mark)){
      gauge?.lights.remove();gauge?.mark.remove();
      const doc=host.ownerDocument,lights=doc.createElement('div'),mark=doc.createElement('b');
      lights.className='drive-lesson-lights';lights.setAttribute('aria-hidden','true');lights.innerHTML='<i></i><i></i><i></i>';
      mark.className='drive-lesson-green-mark';mark.style.left=percent(GEAR_LESSON.greenMarkRevs);mark.setAttribute('aria-hidden','true');
      track.classList.add('drive-lesson-gauge');track.before(lights);track.append(mark);gauge={lights,mark};lit=0;
    }
    const now=shiftLightsLit(revs);
    [...gauge.lights.children].forEach((light,index)=>light.classList.toggle('is-lit',index<now));
    gauge.lights.classList.toggle('is-limiter',revs>=GEAR_LESSON.limiterRevs);
    for(let index=lit;index<now;index++)app.playDriveLessonCue?.(shiftLightCue(index));
    lit=now;
  }
  // Lesson 2's first-try markers: knocked over (drawn so) when the car drives into one, with the cone's knock.
  function syncMarkers(run){
    const lesson=run?.lesson,state=app.duel.state;
    if(!run||lesson.id!=='line'||lesson.stage!=='late'||!lesson.attempt){app.driveLessonMarkers=null;return;}
    let view=app.driveLessonMarkers;
    if(!view||view.attempt!==lesson.attempt)view=app.driveLessonMarkers={attempt:lesson.attempt,tipped:new Set(),prev:null};
    if(lesson.phase!=='driving')return; // the knocked markers stay down while the result card shows
    const here=app.duel.course.groundAt(state.s,state.lateral);
    if(view.prev){
      for(const index of markersKnocked(run.plan.instructor.markers,view.prev,here,view.tipped)){
        view.tipped.add(index);app.playDriveLessonCue?.('lesson.cone');
      }
    }
    view.prev={x:here.x,z:here.z};
  }
  function update(){
    const available=app.drivingLessonsAvailable();
    const button=host.querySelector('[data-drive-open]');
    if(button)button.hidden=!available||app.duel.state.status!=='menu';
    const props=app.driveLessonBoardOpen&&!app.duel.drivingLesson?boardProps():app.driveLessonProps(),run=!!props.lesson; // the extra rows are only needed on the board
    syncGauge(available&&run&&props.lesson.id==='gears',app.duel.state.revs);
    syncMarkers(available&&run?app.duel.drivingLesson:null);
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
  return {update,dispose(){clean();syncGauge(false);host.removeEventListener('click',open);root.remove();}};
}


// Pure boundary check before the approved profile API is called. An old event
// or a different player's finished lesson must never grant a reward.
export function driveLessonCompletion(run,state,playerId){
  const lesson=run?.lesson;
  // The last stage is the third win (lessons 1 to 3) or the winter-tyre run (lesson 4).
  const last=lesson?.id==='snow'?'winter':'challenge';
  if(!playerId||run?.ownerId!==playerId||run.state!==state||state?.playerId!==playerId||
    run.plan?.car!==state.car||run.plan?.difficulty!==state.difficulty||
    run.plan?.driverId!==state.driverId||!lesson||!Object.hasOwn(DRIVE_LESSON_VIEW,lesson.id)||
    lesson.stage!==last||lesson.phase!=='result'||!lesson.done||lesson.streak!==3||
    lesson.lastAttempt?.passed!==true||(last==='challenge'&&lesson.lastAttempt?.finished!==true)||
    !Number.isFinite(lesson.bestMargin)||lesson.bestMargin<=0)return null;
  return {id:lesson.id,carId:state.car,marginSeconds:lesson.bestMargin};
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
