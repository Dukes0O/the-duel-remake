import {DRIVE_RADIO_LINES, driveRadioId} from './drive-radio-lines.js';
import {speedKph, formatSpeed} from '../speed-format.js';
import {lessonBoardMarkup} from './lesson-board.js';
import {GEAR_LESSON, TIP_DISTANCE_M, DRIVE_LESSON_STEPS, suggestedDriveLessonRun, driveLessonGold} from './drive-lessons.js';
const STEP_IDS = new Set(DRIVE_LESSON_STEPS.map(step => step.id));

// Presentation only. The host supplies actual catalog/car choices and the
// current lesson observation; callbacks request actions without performing them.
const escape = value => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const rows = value => Array.isArray(value) ? value : [];
const textId = value => typeof value === 'string' && value.trim().length > 0;
const seconds = value => Number.isFinite(value) && value >= 0 ? value.toFixed(2) + ' s' : 'Not available';

// DRIVE-LESSONS-VIEW-2: the four lessons' names, stage titles, rule wording and radio lines. Lesson 1's
// strings are the ones this file always had.
const stages = Object.freeze(Object.fromEntries(DRIVE_LESSON_STEPS.map(step => [step.id, step.title])));
export const DRIVE_LESSON_VIEW = Object.freeze(Object.fromEntries([
  ['corner', 1, 'Braking'], ['line', 2, 'The racing line'], ['gears', 3, 'The gearbox'], ['snow', 4, 'Snow'],
].map(([id, n, title]) => [id, Object.freeze({n, title, stages, intro: driveRadioId(id, 'intro'), pass: driveRadioId(id, 'pass')})])));
const LATER = Object.freeze(['line', 'gears', 'snow']);
export const SHIFT_LIGHTS = Object.freeze([0, 1, 2].map(i =>
  GEAR_LESSON.lightsRevs + (GEAR_LESSON.limiterRevs - GEAR_LESSON.lightsRevs) * i / 3));
export const shiftLightsLit = revs => Number.isFinite(revs) ? SHIFT_LIGHTS.filter(at => revs >= at - 1e-9).length : 0;
export const shiftLightCue = index => index === 0 ? 'lesson.shift-light' : `lesson.shift-light.${index + 1}`;

const ordinal = gear => Number.isInteger(gear) && gear >= 0 ? ['1st', '2nd', '3rd'][gear] ?? `${gear + 1}th` : 'none';
const percent = value => Math.round(value * 100) + '%';
// The streets and stretches a lesson row is named after, from the row tables the host passes.
const GEAR_STRETCH = Object.freeze({'panorama-ridge': 'Mountain Straight into The Cutting', 'tremblant-woods': 'Beaver Run into Beaver Hairpin',
  'summit-run': 'Pine Switchbacks into Picnic Hairpin'});
function rowLabel(lessonId, row) {
  if (lessonId === 'line') return [...new Set(rows(row.cornerNames).map(name => name.replace(/ \d+$/, '')))].join(' and ');
  if (lessonId === 'gears') return GEAR_STRETCH[row.courseId] ?? row.cornerName;
  if (lessonId === 'snow') return rows(row.cornerNames)[0] + ' on snow';
  return row.cornerName;
}

// corners comes from DRIVE_LESSON_CORNERS; no copy of that source table lives
// here. Catalog arrays have {id,name}; car ownership is supplied separately.
// DRIVE-LESSONS-VIEW-2: with props.lessonRows ({line, gears, snow}: the host's row tables) the board also lists
// lessons 2 to 4, each open or shut by props.lessonAccess ({line: {open}, ...}, from driveLessonAccess); without lessonRows
// the board is lesson 1 alone, exactly as before (the helipad's rows). This file imports nothing that reads the feature catalog.
export function driveLessonBoardModel(props = {}) {
  const catalog = new Map(rows(props.courses).map(course => [course.id, course]));
  const seen = new Set();
  const courses = rows(props.corners).flatMap(corner => {
    const course = catalog.get(corner.courseId);
    if (!course || !textId(course.id) || seen.has(course.id)) return [];
    seen.add(course.id);
    return [{id: course.id, name: course.name, cornerName: corner.cornerName,
      rollingMph: corner.rollingMph}];
  });
  const selected = courses.find(course => course.id === props.courseId)
    ?? courses[0] ?? null;
  const car = rows(props.cars).find(item => item.id === props.carId);
  const progress = props.progress;
  const compatible = progress == null || progress.version === 1;
  const completed = compatible && progress?.done?.corner === true;
  const best = progress?.best?.corner;
  let reason = '';
  if (!textId(props.playerId)) reason = 'Choose a player first.';
  else if (!compatible) reason = 'This lesson progress belongs to another version.';
  else if (!selected) reason = 'No lesson course is available.';
  else if (!car || !rows(props.ownedCarIds).includes(car.id)) reason = 'Choose an unlocked car.';
  else if (!['casual', 'pro'].includes(props.difficulty)) reason = 'Choose Casual or Pro.';
  const start = reason ? null : {lessonId: 'corner', courseId: selected.id, carId: car.id, difficulty: props.difficulty};
  const bestMargin = compatible && Number.isFinite(best) && best > 0 ? best : null;
  // Shared board treats done as an enabled Retake. Keep saved completion
  // visible separately if the current car/course/player cannot start it.
  const cornerRow = {group: 'Driving', id: 'corner', name: '1 The sharp corner', open: !!start, done: !!start && completed};
  const model = {courses, selected, car, start, reason, completed, bestMargin, gold: driveLessonGold(bestMargin), rows: [cornerRow]};
  if (model.gold) cornerRow.name += ' \u2605 Gold';
  if (!props.lessonRows) return model;
  // With all four lessons listed, every finished lesson shows its best margin in its own row, lesson 1 too.
  if (completed && bestMargin != null) cornerRow.name += ` (best ${seconds(bestMargin)} faster)`;
  const byId = {corner: {id: 'corner', courses, selected, start, reason, completed, bestMargin, gold: driveLessonGold(bestMargin), row: cornerRow}};
  for (const id of LATER) {
    const table = rows(props.lessonRows[id]);
    const lessonCourses = table.flatMap(row => {
      const course = catalog.get(row.courseId);
      return course && textId(course.id) ? [{id: course.id, name: course.name, cornerName: rowLabel(id, row)}] : [];
    }).filter((course, index, all) => all.findIndex(other => other.id === course.id) === index);
    const choice = lessonCourses.find(course => course.id === props.courseIds?.[id])
      ?? lessonCourses[0] ?? null;
    const access = props.lessonAccess?.[id] ?? {open: false};
    const done = compatible && progress?.done?.[id] === true;
    const margin = progress?.best?.[id];
    let why = '';
    if (!textId(props.playerId)) why = 'Choose a player first.';
    else if (!compatible) why = 'This lesson progress belongs to another version.';
    else if (id === 'gears' && props.engineCurve !== true) why = 'Opens later: waiting for the new engines.';
    else if (!access.open && !done) why = 'Opens later: finish lesson ' + (id === 'line' ? 1 : id === 'gears' ? 2 : props.engineCurve === true ? 3 : 2) + ' first.';
    else if (!choice) why = 'No lesson course is available.';
    else if (!car || !rows(props.ownedCarIds).includes(car.id)) why = 'Choose an unlocked car.';
    else if (!['casual', 'pro'].includes(props.difficulty)) why = 'Choose Casual or Pro.';
    const go = why ? null : {lessonId: id, courseId: choice.id, carId: car.id, difficulty: props.difficulty};
    const info = DRIVE_LESSON_VIEW[id];
    const bestMargin = compatible && Number.isFinite(margin) && margin > 0 ? margin : null;
    // A finished lesson shows its best margin in its own row ("Best: ..." for lesson 1 sits under the list).
    const row = {group: 'Driving', id, name: info.n + ' ' + info.title + (done && bestMargin != null ? ` (best ${seconds(bestMargin)} faster)` : ''),
      open: !!go, done: !!go && done, note: why};
    if (driveLessonGold(bestMargin)) row.name += ' ★ Gold';
    byId[id] = {id, courses: lessonCourses, selected: choice, start: go, reason: why, completed: done, bestMargin, gold: driveLessonGold(bestMargin), row};
    model.rows.push(row);
  }
  model.byId = byId;
  return model;
}

export function driveLessonBoardMarkup(props = {}) {
  const model = driveLessonBoardModel(props);
  const choices = model.courses.map(course => `<label class="drive-lesson-course">
    <input type="radio" name="drive-lesson-course" data-drive-course="${escape(course.id)}"
      ${model.selected?.id === course.id ? 'checked' : ''}>
    <span>${escape(course.name)} : ${escape(course.cornerName)}</span></label>`).join('');
  const best = model.bestMargin == null || model.byId ? '' : `<p>Best: ${seconds(model.bestMargin)} faster</p>`;
  const car = model.car ? escape(model.car.name) : 'Choose an unlocked car';
  const difficulty = props.difficulty === 'pro' ? 'Pro' : props.difficulty === 'casual' ? 'Casual' : 'Choose a setting';
  // Lessons 2 to 4: a course choice only where a lesson has more than one place, and each done lesson's best margin.
  const later = model.byId ? LATER.map(id => {
    const info = model.byId[id];
    const pick = info.courses.length > 1 && info.selected ? `<fieldset class="drive-lesson-more"><legend>Lesson ${DRIVE_LESSON_VIEW[id].n}: choose where</legend>${
      info.courses.map(course => `<label class="drive-lesson-course">
    <input type="radio" name="drive-lesson-course-${id}" data-drive-lesson="${id}" data-drive-course="${escape(course.id)}"
      ${info.selected?.id === course.id ? 'checked' : ''}>
    <span>${escape(course.name)} : ${escape(course.cornerName)}</span></label>`).join('')}</fieldset>` : '';
    return pick;
  }).join('') : '';
  return `<section class="drive-lesson-board" aria-label="Driving instructor">
    <h2>Driving lessons</h2><p>${model.byId ? 'Pick a lesson and a place. The instructor drives it first.' : 'Brake before the corner. Follow the three cones.'}</p>
    <fieldset${model.byId ? ' class="drive-lesson-more"' : ''}><legend>${model.byId ? 'Lesson 1: choose where' : 'Choose a corner'}</legend>${choices}</fieldset>${later}
    <p class="drive-lesson-setup">Car: ${car}. Setting: ${difficulty}.</p>
    ${lessonBoardMarkup(model.rows, {action: 'data-drive-action'})}
    ${model.reason ? `<p class="drive-lesson-notice" role="status">${escape(model.reason)}</p>` : ''}
    ${model.completed && !model.start ? '<p>Lesson completed. Retake when your car and settings are available.</p>' : ''}
    ${best}<button type="button" data-drive-action="leave">Back</button></section>`;
}

function currentLesson(props) {
  const lesson = props?.lesson, info = Object.hasOwn(DRIVE_LESSON_VIEW, lesson?.id) ? DRIVE_LESSON_VIEW[lesson.id] : null;
  if (!textId(props?.playerId) || props.playerId !== props.runPlayerId || !info
      || !Object.hasOwn(info.stages, lesson.stage) || !['ready', 'driving', 'result'].includes(lesson.phase)) return null;
  return lesson;
}
const passed = lesson => lesson?.phase === 'result' && lesson.stage === 'beat' && lesson.done === true && lesson.lastAttempt?.passed === true && lesson.lastAttempt?.finished === true;
// All helpers below only read the native plan and observations.
export function driveLessonTarget(lesson, s, mph) {
  const corner = rows(lesson?.instructor?.corners).find(c => s <= c.turnOutS);
  if (!corner) return null;
  const inCorner = s >= corner.turnInS;
  const tone = inCorner && Math.abs(mph - corner.targetMph) <= 3 ? 'green'
    : inCorner && mph > corner.targetMph + 5 ? 'red' : '';
  const distance = Math.max(0, Math.round((corner.brakeS ?? corner.turnInS) - s));
  const cue = corner.kind === 'brake' && s < corner.brakeS ? `Brake in ${distance} m`
    : corner.kind === 'lift' && !inCorner ? `Lift in ${distance} m` : `Corner ${formatSpeed(corner.targetMph)}`;
  return {corner, cue, tone};
}
export function driveLessonMapMarkup(instructor) {
  const plan = rows(instructor?.plan);
  if (!plan.length) return '';
  const xs = plan.map(p => p.x), zs = plan.map(p => p.z);
  const minX = Math.min(...xs), minZ = Math.min(...zs);
  const scale = Math.min(280 / Math.max(1, Math.max(...xs) - minX), 210 / Math.max(1, Math.max(...zs) - minZ));
  const point = p => `${(30 + (p.x - minX) * scale).toFixed(1)},${(25 + (p.z - minZ) * scale).toFixed(1)}`;
  const colors = {brake: '#ff6b65', coast: '#f4f1df', accelerate: '#6de4a0'};
  let paths = '';
  // Group adjacent samples into paths so the map follows the actual road without thousands of DOM nodes.
  let start = 0;
  for (let i = 1; i < plan.length; i++) {
    if (plan[i].action !== plan[start].action || i === plan.length - 1) {
      paths += `<polyline points="${plan.slice(start, i + 1).map(point).join(' ')}" fill="none" stroke="${colors[plan[start].action]}" stroke-width="4"/>`;
      start = i;
    }
  }
  const sample = s => plan[Math.min(plan.length - 1, Math.max(0, Math.round(s - plan[0].s)))];
  const labels = rows(instructor.corners).map((c, i) => {
    const [x, y] = point(sample(c.turnInS)).split(',').map(Number);
    const [zx, zy] = point(sample(c.brakeS ?? c.turnInS)).split(',').map(Number);
    const zone = c.kind === 'flat' ? '' : `<rect x="${zx-5}" y="${zy-5}" width="10" height="10" fill="${c.kind === 'brake' ? '#ff6b65' : '#f7d560'}"/>`;
    // Short corner numbers stay on the road; speeds have a clean, stable key.
    // Long labels beside linked Harbour bends would overlap one another.
    return `${zone}<circle cx="${x}" cy="${y}" r="7" fill="#0c191f" stroke="#d9e5df" stroke-width="1"/><text x="${x}" y="${y+3}" text-anchor="middle" fill="#fff5dd" font-size="9">${i+1}</text><text x="338" y="${22+i*24}" fill="#fff5dd" font-size="13">${i+1}. ${formatSpeed(c.targetMph)}</text>`;
  }).join('');
  return `<svg class="drive-lesson-section-map" viewBox="0 0 520 265" role="img" aria-label="Section map: green accelerate, white coast, red brake. Numbered corner speeds."><polyline points="${plan.filter((_, i) => i % 3 === 0 || i === plan.length-1).map(point).join(' ')}" fill="none" stroke="#53616b" stroke-width="13" stroke-linejoin="round"/>${paths}${labels}<text x="30" y="255" fill="#d9e5df" font-size="12">Start to numbered corners to finish</text></svg>`;
}
const lessonIdeas = {
  corner: 'Brake while the car is straight. Release the brake as you turn, so the tyres have grip left to steer. Fast bends may need only a lift of the accelerator.',
  line: 'Use the whole road to make each curve gentler. Start wide, touch the inside, then let the car run wide on the exit. Look ahead to the next bend.',
  gears: 'Keep the engine pulling strongly. E changes up and Q changes down. Change up at the shift lights, and change down while braking to leave the corner in a useful gear.',
  snow: 'Snow gives the tyres less grip. Brake earlier and steer gently. On ice, leave the brakes alone; do your slowing before it.',
};
const wordPicture = (kind, title, text) => {
  const road = '<path d="M8 50 Q8 8 50 8 H86" fill="none" stroke="#65737b" stroke-width="18"/><path d="M10 50 Q10 10 50 10 H86" fill="none" stroke="#6de4a0" stroke-width="3"/>';
  const picture = kind === 'revs'
    ? '<path d="M10 47 A35 35 0 0 1 80 47" fill="none" stroke="#65737b" stroke-width="8"/><path d="M45 47 L66 21" stroke="#6de4a0" stroke-width="4"/><circle cx="45" cy="47" r="5" fill="#edb65f"/>'
    : kind === 'grip'
      ? '<rect x="25" y="4" width="34" height="40" rx="8" fill="#65737b"/><path d="M30 13 H54 M30 23 H54 M30 33 H54 M8 49 H78" stroke="#d5e5df" stroke-width="3"/><path d="M30 46 H54" stroke="#6de4a0" stroke-width="5"/>'
      : kind === 'lift'
        ? '<rect x="32" y="19" width="24" height="31" rx="4" fill="#65737b"/><path d="M44 32 V3 M35 12 L44 3 L53 12" fill="none" stroke="#edb65f" stroke-width="4"/>'
        : road + (kind === 'brake' ? '<path d="M1 34 H20 M1 43 H20" stroke="#ff6b65" stroke-width="5"/>' : kind === 'apex' ? '<circle cx="29" cy="27" r="5" fill="#f6af58"/>' : '<path d="M12 49 Q9 13 83 10" fill="none" stroke="#fff5dd" stroke-width="2"/>');
  return `<div class="drive-lesson-word"><svg viewBox="0 0 90 55" aria-hidden="true">${picture}</svg><p><strong>${title}</strong><br>${text}</p></div>`;
};
export function driveLessonBriefingMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson) return '';
  const info = DRIVE_LESSON_VIEW[lesson.id];
  return `<section class="drive-lesson-briefing" aria-label="Lesson briefing"><header><small>BRIAN'S DRIVING SCHOOL / LESSON ${info.n}</small><h2>${escape(info.title)}</h2><p>${lessonIdeas[lesson.id]}</p></header>${runPicker(lesson)}<div class="drive-lesson-brief-grid"><div>${driveLessonMapMarkup(lesson.instructor)}<p class="drive-lesson-map-key"><span>Green: accelerate</span> / White: coast / <b>Red: brake</b> / Yellow: lift</p><ol class="drive-lesson-map-corners">${lesson.instructor.corners.map(c => `<li>${escape(c.name)} / ${formatSpeed(c.targetMph)}</li>`).join('')}</ol></div><div>${wordPicture('brake', 'Brake zone', 'The box where you brake, while the car is straight.')}${wordPicture('apex', 'Apex', 'The inside of the corner. Aim for the cone.')}${wordPicture('line', 'Racing line', 'The widest, gentlest curve through the corners.')}${lesson.id === 'gears' ? wordPicture('revs', 'Revs', 'How fast the engine spins. The lights show when to change up.') : lesson.id === 'snow' ? wordPicture('grip', 'Grip', 'How well the tyres hold the road. Ice leaves much less grip.') : wordPicture('lift', 'Lift and coast', 'Ease off the accelerator. Coast means use neither pedal.')}</div></div><p class="drive-lesson-clean-rule">Clean means no wall hit, no more than 1 s off the road, and less than 0.3 s of tyre screech. Each corner checks braking, speed within ${formatSpeed(5)} and quiet tyres.</p><p class="drive-lesson-intro">Brian: ${escape(DRIVE_RADIO_LINES[info.intro].text)}</p><button type="button" data-drive-action="leave">Leave lesson</button></section>`;
}
// The four runs, on the opening screen and again after every run (Kyle, 28 October). Any run can be started at any time.
// A mark shows what this visit has done: a finished practice run, or a passed scored run with its best margin.
const runMark = (run, step) => !run?.done ? ''
  : step.rule === 'none' ? 'Done'
    : 'Passed' + (run.margin > 0 ? `, best ${seconds(run.margin)} faster` : '') + (driveLessonGold(run.margin) ? ', Gold' : '');
function runPicker(lesson) {
  const suggested = suggestedDriveLessonRun(lesson);
  return `<div class="drive-lesson-runs" role="group" aria-label="Choose a run">${DRIVE_LESSON_STEPS.map((step, i) => {
    const mark = runMark(lesson.runs?.[step.id], step);
    return `<button type="button" data-drive-action="step:${step.id}" aria-keyshortcuts="${i + 1}"${step.id === suggested ? ' class="drive-lesson-suggested" aria-current="step"' : ''}><strong>${i + 1} ${step.title}</strong><span>${escape(step.whatCounts)}</span>${mark ? `<em>${escape(mark)}</em>` : ''}</button>`;
  }).join('')}</div><small class="drive-lesson-run-keys">Press 1 to 4 to start a run, or Enter for the highlighted one. Esc leaves the lesson.</small>`;
}
export function driveLessonPanelMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson) return '';
  const s = props.distanceS ?? lesson.corner?.startS ?? 0;
  const target = driveLessonTarget(lesson, s, props.speedMph ?? 0);
  const corner = target?.corner;
  const gap = lesson.attempt?.gapSeconds;
  const caption = props.watchClip === 'late' ? 'Watch the late brake: less grip to turn, so the car slides wide.'
    : corner ? `${corner.name} / ${corner.kind === 'brake' && s < corner.brakeS ? target.cue : corner.kind === 'brake' ? `Braking now: ${speedKph(lesson.instructor.plan?.find(p => p.s >= (corner.brakeS ?? s))?.targetMph ?? corner.targetMph)} down to ${formatSpeed(corner.targetMph)}` : corner.kind === 'lift' ? 'Lift the accelerator. Keep the brakes free.' : 'Carry your speed. No braking needed.'}` : 'Clean run complete.';
  return `<section class="drive-lesson-panel" aria-label="Driving lesson">${lesson.stage === 'watch' ? `<p class="drive-lesson-watch-caption">${escape(caption)}</p>` : ''}</section><small class="drive-lesson-esc-hint">Esc: back to the lesson menu</small>
    ${lesson.phase === 'driving' && target && lesson.stage !== 'watch' ? `<aside class="drive-lesson-target ${target.tone}" aria-label="Corner target"><small>NEXT CORNER</small><strong>${escape(corner.name)}</strong><b>${target.cue}</b><span>Your speed ${formatSpeed(props.speedMph ?? 0)}</span><span>Target ${formatSpeed(corner.targetMph)}</span></aside>` : ''}
    ${lesson.phase === 'driving' && Number.isFinite(gap) && lesson.stage !== 'watch' ? `<aside class="drive-lesson-live-gap ${gap > 0 ? 'red' : 'green'}">${gap > 0 ? '+' : ''}${gap.toFixed(2)} s<small>${gap > 0 ? 'behind' : 'ahead of'} instructor</small></aside>` : ''}
    <ol class="drive-lesson-corner-lights" aria-label="Corner checks">${rows(lesson.instructor.corners).map((c, i) => {const r = lesson.attempt?.corners[i]?.result, finished = s >= c.exitS; return `<li class="${finished ? r?.light ?? '' : ''}" title="${escape(c.name)}: ${finished ? r?.light ?? 'waiting' : 'not finished'}"><i></i>${i+1}</li>`;}).join('')}</ol>`;
}
// Advice is formatted from observations, so no rounded mph text is converted back.
export function driveLessonDisplayAdvice(corners) {
  const observations=rows(corners);
  if(!observations.length)return '';
  if(observations.every(c=>c.passed===true))return 'Clean on every corner. Same again, a little quicker.';
  const worst=[...observations].sort((a,b)=>Number(b.wallHit)-Number(a.wallHit)||Number(!b.checks.quiet)-Number(!a.checks.quiet)||b.missed-a.missed||b.screechSeconds-a.screechSeconds)[0];
  const name=worst.name+': ';
  if(worst.wallHit)return name+'you hit the wall; slow before turning so the car stays on the road.';
  const brake=worst.brakeDeltaM===null?'you missed the brake zone':`you braked ${Math.abs(worst.brakeDeltaM).toFixed(0)} m ${worst.brakeDeltaM>0?'late':'early'}`;
  if(!worst.checks.quiet)return name+(worst.kind==='brake'?brake:'you turned with too little grip')+` and the tyres slid for ${worst.screechSeconds.toFixed(1)} s; sliding tyres grip less, so the car can run wide.`;
  if(worst.checks.brake===false)return name+(worst.kind==='lift'?'leave the brake alone and lift the accelerator to keep the car settled.':brake+'; slow while straight to leave grip for turning.');
  if(!worst.checks.speed)return name+`aim for ${formatSpeed(worst.targetMph)} through the corner to balance speed and grip.`;
  return name+'keep the car settled through the corner.';
}
export function driveLessonResultMarkup(props = {}) {
  const lesson = currentLesson(props);
  if (!lesson || lesson.phase !== 'result' || !lesson.lastAttempt) return '';
  const result = lesson.lastAttempt;
  return `<section class="drive-lesson-result" aria-label="Attempt result" aria-live="polite">
    <h2>${passed(lesson) ? 'Lesson passed' : result.passed ? 'Run passed' : lesson.failed ? 'Try again' : 'Practice complete'}</h2>
    <p>${result.finished ? 'You ' + seconds(result.elapsedSeconds) : 'Did not finish'}. Instructor ${seconds(lesson.instructor.timeSec)}</p>
    ${runPicker(lesson)}
    <div class="drive-lesson-results-scroll"><table><thead><tr><th>Corner</th><th>Braking</th><th>Speed / target</th><th>Tyres</th></tr></thead><tbody>${rows(result.corners).map(c => `<tr><th>${escape(c.name)}</th><td>${c.checks?.brake == null ? 'n/a' : c.checks.brake ? '✓' : '✗'} ${c.kind === 'flat' ? 'No brake needed' : c.kind === 'lift' ? 'Lift only' : c.brakeDeltaM == null ? 'No brake press' : Math.abs(c.brakeDeltaM).toFixed(0) + ' m ' + (c.brakeDeltaM > 0 ? 'late' : 'early')}</td><td>${c.checks?.speed ? '✓' : '✗'} ${c.minMph == null ? 'Not reached' : speedKph(c.minMph) + ' / ' + formatSpeed(c.targetMph)}</td><td>${c.checks?.quiet ? '✓ Quiet' : '✗ Slid'} / ${(c.screechSeconds ?? 0).toFixed(1)} s</td></tr>`).join('')}</tbody></table></div><p class="drive-lesson-advice">${escape(driveLessonDisplayAdvice(result.corners))}</p>
    ${driveLessonGold(lesson.bestMargin) ? '<p>Gold</p>' : ''}
    ${passed(lesson) && props.lessonSaveFailed ? '<button type="button" data-drive-action="retry-save">Retry save</button>' : ''}
    <button type="button" data-drive-action="leave">Leave lesson</button></section>`;
}

// Read props when an event happens. A stale menu cannot use an unavailable
// car or act for a player who has since changed. The host remains authoritative.
export function bindDriveLessonUi(root, readProps, callbacks = {}) {
  if (!root?.addEventListener || typeof readProps !== 'function') throw new TypeError('Lesson root and current props reader required');
  const inside = node => !!node && root.contains(node);
  // Enter starts the highlighted run on the opening screen and after a run, never during one.
  const next = props => {
    if (!props.briefing && !['ready', 'result'].includes(currentLesson(props)?.phase)) return false;
    callbacks.onNext?.(); return true;
  };
  const click = event => {
    const button = event.target?.closest?.('[data-drive-action]');
    if (!inside(button) || button.disabled) return;
    const action = button.dataset.driveAction;
    const props = readProps();
    if (action === 'leave') callbacks.onLeave?.();
    else if (action.startsWith('step:') && STEP_IDS.has(action.slice(5)) && currentLesson(props)) callbacks.onStep?.(action.slice(5));
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
    if (courses.some(course => course.id === input.dataset.driveCourse))
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

// The running screen is updated in place: a button that is under the mouse must still be the same element when the
// button comes up, or the browser sends no click. Rebuilding the overlay every frame broke every click while the car moved.
function patchNode(from, to) {
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.replaceWith(to.cloneNode(true)); return; }
  if (from.nodeType !== 1) { if (from.data !== to.data) from.data = to.data; return; }
  for (const attr of [...from.attributes]) if (!to.hasAttribute(attr.name)) from.removeAttribute(attr.name);
  for (const attr of to.attributes) if (from.getAttribute(attr.name) !== attr.value) from.setAttribute(attr.name, attr.value);
  patchChildren(from, to);
}
function patchChildren(from, to) {
  const old = [...from.childNodes], next = [...to.childNodes];
  next.forEach((node, index) => index < old.length ? patchNode(old[index], node) : from.append(node.cloneNode(true)));
  for (let index = old.length - 1; index >= next.length; index--) old[index].remove();
}
// This owns only its DOM surface. Race and save actions remain App verbs.
export function mountDriveLessonUi(app,host){
  const boardProps=()=>app.driveLessonBoardProps?.()??app.driveLessonProps(); // an app without lessons 2 to 4 shows lesson 1 alone
  const root=host.ownerDocument.createElement('div');
  root.className='drive-lesson-host';root.tabIndex=-1;root.hidden=true;host.append(root);
  let previous='',previousMode='';
  const clean=bindDriveLessonUi(root,()=>boardProps(),{
    onStart:request=>void app.startLesson({...request,car:request.carId}),
    onNext:()=>app.nextLessonAttempt(),onLeave:()=>app.leaveLesson(),onRetrySave:()=>app.retryLessonSave(),
    // Drop focus from the clicked step so Space and the arrow keys drive the car, not the button.
    onStep:id=>{host.ownerDocument.activeElement?.blur?.();app.chooseLessonStep(id);update();},
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
  function update(){
    const available=app.drivingLessonsAvailable();
    const button=host.querySelector('[data-drive-open]');
    if(button)button.hidden=!available||app.duel.state.status!=='menu';
    const props=app.driveLessonBoardOpen&&!app.duel.drivingLesson?boardProps():app.driveLessonProps(),run=!!props.lesson; // the extra rows are only needed on the board
    syncGauge(available&&run&&props.lesson.id==='gears',app.duel.state.revs);

    root.hidden=!available||!run&&!app.driveLessonBoardOpen;
    root.classList.toggle('drive-lesson-host-running',run);
    const speed=host.ownerDocument.getElementById?.('speed-value');
    if(root.hidden){speed?.classList.remove('drive-lesson-speed-green','drive-lesson-speed-red');return;}
    const briefing=run&&(props.lesson.phase==='ready'||props.briefing);
    const viewProps={...props,distanceS:app.duel.state.s,speedMph:app.duel.state.speedMph,watchClip:app.duel.drivingLesson?.watchClip,radioText:app.driveLessonRadioText};
    const markup=briefing?driveLessonBriefingMarkup(viewProps):run?driveLessonPanelMarkup(viewProps)+driveLessonResultMarkup(props):driveLessonBoardMarkup(props);
    root.classList.toggle('drive-lesson-host-briefing',!!briefing);
    const target=run&&!briefing?driveLessonTarget(props.lesson,app.duel.state.s,app.duel.state.speedMph):null;
    if(speed){speed.classList.toggle('drive-lesson-speed-green',target?.tone==='green');speed.classList.toggle('drive-lesson-speed-red',target?.tone==='red');}
    const message=app.driveLessonMessage;
    const status=message?`<p class="drive-lesson-message" role="status">${escape(message)}</p>`:'';
    const radio=run&&app.driveLessonRadioText?`<p class="drive-lesson-radio" aria-live="polite">${escape(app.driveLessonRadioText)}</p>`:'';
    const content=markup+status+radio;
    // Only the running screen changes every frame; it is patched in place. Every other screen is rebuilt when it changes.
    const mode=briefing?'briefing':run?(props.lesson.phase==='result'?'result':'running'):'board';
    if(content!==previous){
      if(mode==='running'&&previousMode==='running'){
        const next=host.ownerDocument.createElement('div');next.innerHTML=content;patchChildren(root,next);
      }else{
        const action=root.contains(host.ownerDocument.activeElement)?host.ownerDocument.activeElement?.dataset?.driveAction:null;
        root.innerHTML=content;
        if(action)root.querySelector(`[data-drive-action="${action}"]`)?.focus({preventScroll:true});
      }
      previous=content;
    }
    previousMode=mode;
    root.classList.toggle('drive-lesson-host-result',run&&props.lesson.phase==='result');
  }
  return {update,dispose(){clean();syncGauge(false);host.ownerDocument.getElementById?.('speed-value')?.classList.remove('drive-lesson-speed-green','drive-lesson-speed-red');host.removeEventListener('click',open);root.remove();}};
}


// Pure boundary check before the approved profile API is called. An old event
// or a different player's finished lesson must never grant a reward.
export function driveLessonCompletion(run,state,playerId){
  const lesson=run?.lesson;
  if(!playerId||run?.ownerId!==playerId||run.state!==state||state?.playerId!==playerId||
    run.plan?.car!==state.car||run.plan?.difficulty!==state.difficulty||run.plan?.driverId!==state.driverId||
    !lesson||!Object.hasOwn(DRIVE_LESSON_VIEW,lesson.id)||!passed(lesson)||
    !Number.isFinite(lesson.bestMargin)||lesson.bestMargin<=0)return null;
  return {id:lesson.id,courseId:run.plan.courseId,carId:state.car,marginSeconds:lesson.bestMargin};
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
