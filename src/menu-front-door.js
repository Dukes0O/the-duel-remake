// MENU-FRONT-DOOR: the main menu as a front door (behind the 'menu-front-door' switch).
// Pure rules and markup: a save and a few yes/no facts go in, one sentence, eight door tiles
// and the Drive card come out. Nothing here reads the clock, draws a scene or changes a save.
import {COURSE} from './config.js';
import {COURSE_PRICES, isCourseUnlocked, courseUnlockRequirement} from './course-access.js';
import {lessonRows} from './lab/lab-lessons.js';
import {TERRITORIES} from './wasteland-career.js';
import {DRIVE_LESSON_ORDER, driveLessonAccess, normalizeDrivingLessons} from './lessons/drive-lesson-save.js';

const LESSON_NAMES = Object.freeze({corner: 'driving lesson 1, cornering', line: 'driving lesson 2, the racing line',
  gears: 'driving lesson 3, changing gear', snow: 'driving lesson 4, driving on snow'});
const MODE_NAMES = Object.freeze({duel: 'Rival duel', wasteland: 'Mad Max duel', timetrial: 'Time trial', grandprix: 'Grand Prix'});

// What the save says, in plain facts. flags is anything with enabled(name).
export function frontDoorFacts({profile, flags, wastelandOpen = false, heliOn = false, labOn = false, lessonsOn = false, heliJob = null, seaCreature = null} = {}) {
  const credits = Math.floor(profile?.credits || 0);
  const labLesson = labOn ? lessonRows(profile, flags).find(row => row.open && !row.done) ?? null : null;
  const course = COURSE.find(item => !item.practice && COURSE_PRICES[item.id] > 0 && !courseUnlockRequirement(item)
    && !isCourseUnlocked(profile, item) && COURSE_PRICES[item.id] <= credits) ?? null;
  const done = normalizeDrivingLessons(profile?.drivingLessons).done;
  const engineCurve = flags?.enabled?.('engine-curve') === true;
  const lessonId = lessonsOn ? DRIVE_LESSON_ORDER.find(id => done[id] !== true && driveLessonAccess(profile?.drivingLessons, id, {engineCurve}).open) ?? null : null;
  // A Wasteland boss whose hold is three quarters won and not yet claimed.
  const holdId = wastelandOpen ? Object.entries(profile?.wasteland?.territories ?? {}).find(([id, row]) =>
    Object.hasOwn(TERRITORIES, id) && row?.claimed !== true && row?.hold >= 75 && row?.hold < 100)?.[0] ?? null : null;
  return {
    labOn, lessonsOn, heliOn, wastelandOpen,
    labLesson: labLesson ? {id: labLesson.id, name: labLesson.name} : null,
    course: course ? {id: course.id, name: course.name, price: COURSE_PRICES[course.id]} : null,
    hold: holdId ? {id: holdId, name: TERRITORIES[holdId].name} : null,
    heliJob: heliOn && heliJob ? {name: heliJob.name} : null,
    driveLesson: lessonId ? {id: lessonId, name: LESSON_NAMES[lessonId]} : null,
    creature: seaCreature ? {id: seaCreature.id, name: seaCreature.name} : null, // the game says it; src/deep stays behind its own guard
  };
}

// The first match in the ordered list wins. Each answer says where a click goes.
export function chooseNextUp(facts = {}) {
  if (facts.labLesson) return {kind: 'lab', action: 'lab-open', text: `A Lab lesson is open: ${facts.labLesson.name}. Go and try it.`};
  if (facts.course) return {kind: 'course', action: 'courses', text: `You can afford a new course: ${facts.course.name}. See it in Courses.`};
  if (facts.hold) return {kind: 'hold', action: 'wasteland-visit', text: `${facts.hold.name}'s hold is nearly yours. Go back to the Wasteland and finish it.`};
  if (facts.heliJob) return {kind: 'heli', action: 'heli-visit', text: `A helicopter job is waiting: ${facts.heliJob.name}.`};
  if (facts.driveLesson) return {kind: 'lesson', attr: 'data-drive-open', text: `Your next lesson is ready: ${facts.driveLesson.name}.`};
  if (facts.creature) return {kind: 'creature', action: 'heli-visit', text: `Find the next sea creature for your log: ${facts.creature.name}.`};
  return {kind: 'none', action: 'courses', text: 'Pick a course, then press START ENGINE.'};
}

// Eight doors. A locked door says why and does nothing.
export function doorList(facts = {}) {
  const lock = reason => ({badge: 'LOCKED', note: reason, locked: true});
  const open = (badge, note = '') => ({badge, note, locked: false});
  return [
    {id: 'garage', label: 'Garage', action: 'garage', ...open('READY', 'Cars, paint and tuning')},
    {id: 'courses', label: 'Courses', action: 'courses', ...(facts.course ? open('NEW', `${facts.course.name} is in reach`) : open('READY', 'Pick where to race'))},
    {id: 'armory', label: 'Armory', action: 'armory', ...open('READY', 'Weapons for the Wasteland')},
    {id: 'wasteland', label: 'Wasteland', action: 'wasteland-visit', ...(facts.wastelandOpen ? open(facts.hold ? 'NEW' : 'READY', 'Beyond the Rustwall') : lock('Find the hidden road first'))},
    {id: 'helipad', label: 'Helipad', action: 'heli-visit', ...(facts.heliOn ? open(facts.heliJob ? 'NEW' : 'READY', 'Fly the helicopter') : lock('Not open yet'))},
    {id: 'lab', label: 'Lab', action: 'lab-open', ...(facts.labOn ? open(facts.labLesson ? 'NEW' : 'READY', 'Learn, then upgrade') : lock('Not open yet'))},
    {id: 'lessons', label: 'Lessons', attr: 'data-drive-open', ...(facts.lessonsOn ? open(facts.driveLesson ? 'NEW' : 'READY', 'Learn to drive faster') : lock('Not open yet'))},
    {id: 'scores', label: 'Scores', action: 'leaderboard', ...open('READY', 'Best times and points')},
  ];
}

export function driveSummary({carName = '', mode = 'duel', level = ''} = {}) {
  return ['your ' + carName, MODE_NAMES[mode] ?? mode, level].filter(Boolean).join(' · ');
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

export function doorTile(door) {
  const hook = door.locked ? 'aria-disabled="true" disabled' : door.attr ? door.attr : `data-action="${door.action}"`;
  return `<button type="button" class="front-door-tile${door.locked ? ' is-locked' : ''}" data-door="${door.id}" ${hook}><b>${esc(door.label)}</b><span class="front-door-note">${esc(door.note)}</span><i class="front-door-badge badge-${door.badge.toLowerCase()}">${door.badge}</i></button>`;
}

export function nextUpMarkup(next) {
  const hook = next.attr ?? `data-action="${next.action}"`;
  return `<button type="button" id="fd-next" class="front-door-next" ${hook}><span class="field-label">NEXT UP</span><b>${esc(next.text)}</b></button>`;
}

// The first screen, in three parts. The race controls move into the options drawer; START ENGINE moves into fd-start-slot.
export function frontDoorMarkup({facts = {}, arrow = ''} = {}) {
  return `<div id="front-door" class="front-door" aria-label="Front door">
    <section class="front-door-drive" aria-label="Drive"><span class="field-label">DRIVE</span><b id="fd-course" class="front-door-course"></b><p id="fd-summary" class="front-door-summary"></p><div id="fd-start-slot" class="front-door-start"></div><button type="button" id="fd-options-toggle" class="front-door-options-toggle" aria-expanded="false" aria-controls="race-options">Race options</button></section>
    <section class="front-door-nextup" aria-label="Next up" id="fd-nextup">${nextUpMarkup(chooseNextUp(facts))}</section>
    <nav id="fd-doors" class="front-door-doors" aria-label="Doors">${doorList(facts).map(doorTile).join('')}</nav>
  </div>`;
}
