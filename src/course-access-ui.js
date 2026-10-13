import {COURSE, CARS} from './config.js';
import {COURSE_PRICES, isCourseUnlocked} from './course-access.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const credits = value => Math.floor(value || 0).toLocaleString();
const kilometres = course => (course.lengthU / 1000).toFixed(2).replace(/0$/, '');

export function grandPrixCourseDescription(course,laps=course.grandPrixLaps||3) {
  const fieldSize = course.fieldSize || 8;
  if (course.closed === false) return `${kilometres(course)} km · ${fieldSize} cars · ONE RUN.`;
  return `${kilometres(course)} km per lap · ${fieldSize} cars · ${laps} laps.`;
}

function classicDescription(course,laps) {
  if (course.practice) return 'Untimed free driving. No credits, records or finish line.';
  if (course.stuntTrial) return 'Two laps, four landed jumps and four crushes.';
  if (course.kind === 'drift') return 'Bank the drift target and finish before the deadline.';
  if (course.kind === 'checkpoint') return 'Pass all twelve timed gates over two laps.';
  if (course.kind === 'chase') return 'Escape pursuit and finish before the deadline.';
  return `${kilometres(course)} km per lap · ${laps==null?'Two-lap':`${laps}-lap`} ${course.kind ? 'standalone event' : 'campaign circuit'}.`;
}

function courseCard(profile, course, selected, {teamRoomEnabled, grandPrix, lapChoiceFor}) {
  const owned = isCourseUnlocked(profile, course);
  const price = COURSE_PRICES[course.id];
  const description = grandPrix ? grandPrixCourseDescription(course,lapChoiceFor?.(course,'grandprix')) : classicDescription(course,lapChoiceFor?.(course,'duel'));
  const teamRoom = teamRoomEnabled && course.closed !== false
    ? `<button type="button" data-team-room="${escape(course.id)}" aria-label="${owned ? 'Study' : 'Unlock to study'} ${escape(course.name)} in the Team Room" ${owned ? '' : 'disabled'}>TEAM ROOM ↗</button>` : '';
  const mode = grandPrix ? ' data-course-mode="grandprix"' : '';
  return `<article class="course-access-card${selected ? ' selected' : ''}"><div><span class="field-label">${course.practice ? 'PRACTICE' : owned ? 'UNLOCKED' : `${credits(price)} CR`}</span><h3>${escape(course.name)}</h3><p>${description}</p>${course.requiredCar ? `<p class="course-recommendation">${escape(CARS[course.requiredCar]?.name || 'Titan')} recommended.${course.arena ? ' Lighter cars cannot crush wrecks.' : ''}</p>` : ''}</div>${owned ? `<button type="button" data-course-select="${course.id}"${mode} aria-label="Select ${escape(course.name)} for free" aria-pressed="${selected}" ${selected ? 'disabled' : ''}>${selected ? 'SELECTED' : 'SELECT COURSE'}</button>` : `<button type="button" data-course-unlock="${course.id}" aria-label="Unlock ${escape(course.name)} for ${price} credits" ${profile.credits < price ? 'disabled' : ''}>UNLOCK · ${credits(price)} CR</button>`}${teamRoom}</article>`;
}

export function courseAccessPanel(profile, selectedStage = 0, message = '', {
  teamRoomEnabled = false,
  grandPrixCareerEnabled = false,
  grandPrixAvailable = () => false,
  selectedMode = 'duel',
  lapChoiceFor,
} = {}) {
  const groups = {grandPrix: [], classic: []};
  for (const [index, course] of COURSE.entries()) {
    const grandPrix = grandPrixCareerEnabled === true && grandPrixAvailable(course) === true;
    const selected = index === selectedStage && (!grandPrix || selectedMode === 'grandprix');
    groups[grandPrix ? 'grandPrix' : 'classic'].push(courseCard(profile, course, selected, {teamRoomEnabled, grandPrix, lapChoiceFor}));
  }
  const grid = cards => `<div class="course-access-grid">${cards.join('')}</div>`;
  const group = (label, cards) => cards.length
    ? `<section aria-label="${label}"><h3 class="field-label">${label}</h3>${grid(cards)}</section>` : '';
  const cards = grandPrixCareerEnabled === true
    ? group('GRAND PRIX', groups.grandPrix) + group('CLASSIC COURSES', groups.classic)
    : grid(groups.classic);
  return `<section class="career-panel course-access-panel" role="dialog" aria-modal="true" aria-labelledby="courses-title"><header class="shop-heading"><div><p class="eyebrow">EARN YOUR NEXT HORIZON</p><h2 id="courses-title">YOUR COURSES.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(profile.credits)}<small> CR</small></b></div><button class="shop-close" data-action="courses-close" aria-label="Close course garage">×</button></header><p>Pacific Canyon is included. Unlocking a course does not select it. Any owned car can enter an unlocked course.</p><p class="course-access-message" role="status" aria-live="polite">${escape(message) || 'Course purchases belong to this player. Completed race credits stay safe.'}</p>${cards}</section>`;
}
