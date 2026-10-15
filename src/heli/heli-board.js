// The dispatch board's panel (docs/HELICOPTER.md section 6): plain markup and
// a click handler. HELI-VIEW mounts and styles it with the helicopter's other
// page parts; class names all start with heli-board. It only reads the
// session and asks it to take or drop a job, so it never changes race state.
import {HELI_DESTINATIONS, HOME_COURSE, jobTitle} from './heli-jobs.js';
import {CARS} from '../config.js';

const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);

// The jobs part shows only with the helicopter on the home pad's ground.
export function atHomePad(view) {
  if (!view || view.phase !== 'flying' || view.courseId !== HOME_COURSE || !view.heli?.onGround || !view.zone) return false;
  return Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) <= view.zone.radius;
}

function jobRow(job, mode) {
  const own = job.own === true;
  const state = job.done ? 'done' : job.taken ? 'taken' : 'open';
  const pay = own ? 'No pay' : `${job.payNow ?? job.pay} credits${mode === 'real' ? ' (+25% in Real)' : ''}`;
  const pickUp = !own && job.from !== HOME_COURSE ? `Pick up at ${HELI_DESTINATIONS[job.from]?.name ?? job.from}` : '';
  const title = own ? `Fly my car${job.carId && CARS[job.carId] ? ` (${CARS[job.carId].name})` : ''}` : jobTitle(job);
  let button = '';
  if (own) button = `<button type="button" class="heli-board-button" data-heli-board="take:own">Fly my car</button>`;
  else if (job.done) button = `<span class="heli-board-note">Done today</span>`;
  else if (job.taken) button = `<button type="button" class="heli-board-button heli-board-drop" data-heli-board="drop">Drop job</button>`;
  else button = `<button type="button" class="heli-board-button" data-heli-board="take:${esc(job.id)}">Take job</button>`;
  return `<li class="heli-board-job heli-board-${state}${own ? ' heli-board-own' : ''}" data-job="${esc(job.id)}">` +
    `<span class="heli-board-text">${esc(title)}</span>` +
    `<span class="heli-board-pay">${esc(pay)}</span>` +
    (pickUp ? `<span class="heli-board-pickup">${esc(pickUp)}</span>` : '') +
    `${button}</li>`;
}

// view: the session's view. jobs: session.boardJobs(). offer:
// session.raceHereOffer(). Returns '' when there is nothing to show.
export function dispatchBoardMarkup(view, {jobs = [], offer = null, mode = 'assisted'} = {}) {
  const parts = [];
  if (jobs.length && atHomePad(view))
    parts.push(`<div class="heli-board-jobs"><h3 class="heli-board-title">Dispatch board</h3><ul class="heli-board-list">` +
      `${jobs.map(job => jobRow(job, mode)).join('')}</ul></div>`);
  if (offer) {
    const course = HELI_DESTINATIONS[offer.courseId]?.name ?? offer.courseId;
    parts.push(`<div class="heli-board-race"><span class="heli-board-text">${esc(CARS[offer.carId]?.name ?? 'Your car')} is set down at ${esc(course)}.</span>` +
      `<button type="button" class="heli-board-button heli-board-race-here" data-heli-board="race-here">Race here</button></div>`);
  }
  return parts.length ? `<section class="heli-board" data-heli-board-panel>${parts.join('')}</section>` : '';
}

// action: 'take:<id>', 'drop' or 'race-here', from a button's data-heli-board.
// Returns the session's answer (or false for Race here).
export function handleBoardAction(action, app) {
  const session = app?.heliSession;
  if (!session || typeof action !== 'string') return {ok: false, reason: 'No helicopter visit.'};
  const settle = result => { app._heliEvents?.(session.takeEvents()); return result; };
  if (action.startsWith('take:')) return settle(session.takeJob(action.slice(5)));
  if (action === 'drop') return settle(session.dropJob());
  if (action === 'race-here') {
    const offer = session.raceHereOffer();
    return offer ? app.raceHere(offer) : false;
  }
  return {ok: false, reason: 'Unknown board action.'};
}

// Wires the board into a root element: draws it from the app's helicopter
// view and handles its buttons. Call render() as often as the view changes;
// the root's markup is replaced only when it differs.
export function createDispatchBoard({root, app}) {
  let last = null;
  const render = () => {
    const session = app.heliSession, view = app.heliView?.() ?? null;
    const markup = session && view ? dispatchBoardMarkup(view, {jobs: session.boardJobs(), offer: session.raceHereOffer(), mode: session.mode}) : '';
    if (markup !== last) { root.innerHTML = markup; last = markup; }
    if ('hidden' in root) root.hidden = markup === '';
    return markup;
  };
  const onClick = event => {
    const button = event.target?.closest?.('[data-heli-board]');
    if (!button || button.dataset.heliBoard === undefined) return;
    handleBoardAction(button.dataset.heliBoard, app);
    render();
  };
  root.addEventListener('click', onClick);
  return {render, dispose() { root.removeEventListener('click', onClick); root.innerHTML = ''; last = null; }};
}
