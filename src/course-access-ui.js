import {COURSE, CARS} from './config.js';
import {COURSE_PRICES, isCourseUnlocked, courseUnlockRequirement} from './course-access.js';
import {DRIVERS} from './drivers.js';
import {mergeLeaderboards,getLeaderboard} from './leaderboard.js';
import {SUMMIT_ATTACK_ID,isSummitAttack,summitAttackMedal} from './summit-attack.js';
import {closureCard} from './course-closures.js';

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
  if (isSummitAttack(course)) return `${kilometres(course)} km · SOLO TIME TRIAL · ONE RUN · NO PAY.`;
  if (course.practice) return 'Untimed free driving. No credits, records or finish line.';
  if (course.stuntTrial) return 'Two laps, four landed jumps and four crushes.';
  if (course.kind === 'drift') return 'Bank the drift target and finish before the deadline.';
  if (course.kind === 'checkpoint') return 'Pass all twelve timed gates over two laps.';
  if (course.kind === 'chase') return 'Escape pursuit and finish before the deadline.';
  return `${kilometres(course)} km per lap · ${laps==null?'Two-lap':`${laps}-lap`} ${course.kind ? 'standalone event' : 'campaign circuit'}.`;
}

// A course burnt in a forest fire (docs/HELI_FIRE.md section 8.2): the card
// stays where it is, darkened with soot, with the play days left and the
// buyback. Only with the forest-fire switch on.
// Prices on a burnt card always read like the save's own messages ("7,000").
const burntCredits = value => Math.floor(value || 0).toLocaleString('en-US');
function burntCard(profile, course, owned) {
  const card = owned ? closureCard(profile, course.id, undefined, {enabled: true, credits: profile.credits, name: course.name}) : null;
  if (!card) return null;
  const lines = card.lines.map(line => `<p class="course-burnt-note">${escape(line)}</p>`).join('');
  if (!card.closed) return {closed: false, lines};
  const action = card.short > 0
    ? `<button type="button" disabled aria-label="Buy back ${escape(course.name)}: you need ${burntCredits(card.short)} more credit${card.short === 1 ? '' : 's'}">BUY BACK · ${burntCredits(card.price)} CR</button><p class="course-burnt-note">You need ${burntCredits(card.short)} more credit${card.short === 1 ? '' : 's'}.</p>`
    : `<button type="button" data-course-buyback="${escape(course.id)}" aria-label="Buy back ${escape(course.name)} for ${burntCredits(card.price)} credits">BUY BACK · ${burntCredits(card.price)} CR</button>`;
  return {closed: true, lines, action};
}

export function bestSummitAttackTime(board, playerId) {
  if (typeof playerId !== 'string' || !playerId) return null;
  const normalized=mergeLeaderboards(board);
  let best=null;
  for(const driverId of Object.keys(DRIVERS)){
    const row=getLeaderboard(normalized,{eventId:SUMMIT_ATTACK_ID,mode:'timetrial',playerId,driverId})[0];
    if(row&&(best===null||row.timeSec<best))best=row.timeSec;
  }
  return best;
}

function courseCard(profile, course, selected, {teamRoomEnabled, grandPrix, lapChoiceFor, forestFire, leaderboard, playerId}) {
  const owned = isCourseUnlocked(profile, course);
  const requirement = courseUnlockRequirement(course);
  const price = COURSE_PRICES[course.id];
  const description = grandPrix ? grandPrixCourseDescription(course,lapChoiceFor?.(course,'grandprix')) : classicDescription(course,lapChoiceFor?.(course,'duel'));
  // A variant unlocked by a podium or found from the air still gets its Team Room entry (disabled until owned).
  const teamRoom = teamRoomEnabled && course.closed !== false && (!requirement || requirement.kind !== 'owned-course')
    ? `<button type="button" data-team-room="${escape(course.id)}" aria-label="${owned ? 'Study' : 'Unlock to study'} ${escape(course.name)} in the Team Room" ${owned ? '' : 'disabled'}>TEAM ROOM ↗</button>` : '';
  const mode = grandPrix ? ' data-course-mode="grandprix"' : '';
  const burnt = forestFire === true ? burntCard(profile, course, owned) : null;
  const label=burnt?.closed?'CLOSED':course.practice?'PRACTICE':owned?'UNLOCKED':requirement?'LOCKED':`${credits(price)} CR`;
  const condition=!owned&&requirement?`<p>${escape(requirement.condition)}</p>`:'';
  const recommendation=course.requiredCar
    ? `<p class="course-recommendation">${escape(CARS[course.requiredCar]?.name || 'Titan')} recommended.${course.arena ? ' Lighter cars cannot crush wrecks.' : ''}</p>` : '';
  const action=burnt?.closed ? burnt.action : owned
    ? `<button type="button" data-course-select="${course.id}"${mode} aria-label="Select ${escape(course.name)} for free" aria-pressed="${selected}" ${selected ? 'disabled' : ''}>${selected ? 'SELECTED' : 'SELECT COURSE'}</button>`
    : requirement
      ? `<button type="button" disabled aria-label="${escape(requirement.condition)}">LOCKED</button>`
      : `<button type="button" data-course-unlock="${course.id}" aria-label="Unlock ${escape(course.name)} for ${price} credits" ${profile.credits < price ? 'disabled' : ''}>UNLOCK · ${credits(price)} CR</button>`;
  const best=isSummitAttack(course)?bestSummitAttackTime(leaderboard,playerId):null;
  const medal=best===null?null:summitAttackMedal(best,course.attackTimes);
  const attackBest=best===null?'':`<p class="course-best">${medal?'BEST '+medal.toUpperCase():'BEST TIME'} · ${best.toFixed(1)} s</p>`;
  const soot = burnt?.closed ? ' course-burnt' : '';
  return `<article class="course-access-card${selected ? ' selected' : ''}${soot}"><div><span class="field-label">${label}</span><h3>${escape(course.name)}</h3><p>${description}</p>${condition}${recommendation}${attackBest}${burnt?.lines ?? ''}</div>${action}${teamRoom}</article>`;
}

export function courseAccessPanel(profile, selectedStage = 0, message = '', {
  teamRoomEnabled = false,
  grandPrixCareerEnabled = false,
  grandPrixAvailable = () => false,
  selectedMode = 'duel',
  lapChoiceFor,
  forestFire = false,
  leaderboard,
  playerId,
} = {}) {
  const groups = {grandPrix: [], classic: []};
  for (const [index, course] of COURSE.entries()) {
    const grandPrix = grandPrixCareerEnabled === true && grandPrixAvailable(course) === true;
    const selected = index === selectedStage && (!grandPrix || selectedMode === 'grandprix');
    groups[grandPrix ? 'grandPrix' : 'classic'].push(courseCard(profile, course, selected, {teamRoomEnabled, grandPrix, lapChoiceFor, forestFire, leaderboard, playerId}));
  }
  const grid = cards => `<div class="course-access-grid">${cards.join('')}</div>`;
  const group = (label, cards) => cards.length
    ? `<section aria-label="${label}"><h3 class="field-label">${label}</h3>${grid(cards)}</section>` : '';
  const cards = grandPrixCareerEnabled === true
    ? group('GRAND PRIX', groups.grandPrix) + group('CLASSIC COURSES', groups.classic)
    : grid(groups.classic);
  return `<section class="career-panel course-access-panel" role="dialog" aria-modal="true" aria-labelledby="courses-title"><header class="shop-heading"><div><p class="eyebrow">EARN YOUR NEXT HORIZON</p><h2 id="courses-title">YOUR COURSES.</h2></div><div class="shop-wallet"><span>YOUR CREDITS</span><b>${credits(profile.credits)}<small> CR</small></b></div><button class="shop-close" data-action="courses-close" aria-label="Close course garage">×</button></header><p>Pacific Canyon is included. Unlocking a course does not select it. Any owned car can enter an unlocked course.</p><p class="course-access-message" role="status" aria-live="polite">${escape(message) || 'Course purchases belong to this player. Completed race credits stay safe.'}</p>${cards}</section>`;
}
