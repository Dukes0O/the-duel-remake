// The dispatch board's panel (docs/HELICOPTER.md section 6): plain markup and
// a click handler. HELI-VIEW mounts and styles it with the helicopter's other
// page parts; class names all start with heli-board. It only reads the
// session and asks it to take or drop a job, so it never changes race state.
import {HELI_DESTINATIONS, HOME_COURSE, jobTitle} from './heli-jobs.js';
import {CARS} from '../config.js';
import {HELI_PAYS, payWords} from './heli-pay.js';

const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);

// The jobs part shows only with the helicopter on the home pad's ground.
export function atHomePad(view) {
  if (!view || view.phase !== 'flying' || view.courseId !== HOME_COURSE || !view.heli?.onGround || !view.zone) return false;
  return Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) <= view.zone.radius;
}

// MAP-VIEW: on the ground inside the landing circle of whatever course this is.
export function atAnyPad(view) {
  if (!view || view.phase !== 'flying' || !view.heli?.onGround || !view.zone) return false;
  return Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) <= view.zone.radius;
}

// The wildlife count (docs/HELI_WILDLIFE.md section 4) pays the same in
// Assisted and Real, from 200 to 600 credits by how near the estimate is.
function jobRow(job, mode, {survey = null, skins = null} = {}) {
  // The story's job (STORY-KOGANE-DELIVERY) has its own title and a crate waiting by the pad, like the recovery job's car on the slope.
  const own = job.own === true, count = job.survey === true, story = !!job.story;
  const state = job.done ? 'done' : job.taken ? 'taken' : 'open';
  const pay = own ? 'No pay' : count ? payWords(job.payNow ?? job.pay, {upTo: true}) : `${payWords(job.payNow ?? job.pay, {bonus: job.cleanBonus ?? 0})}${mode === 'real' ? ' (Real pays 25% more)' : ''}`;
  const pickUp = !own && !count && job.from !== HOME_COURSE ? `Pick up at ${HELI_DESTINATIONS[job.from]?.name ?? job.from}` : '';
  const title = own ? `Fly my car${job.carId && CARS[job.carId] ? ` (${CARS[job.carId].name})` : ''}` : job.recovery || count || story ? job.title : jobTitle(job);
  let button = '';
  // The recovery job (section 5.3) is taken and dropped like the day's jobs.
  const note = job.recovery && !job.taken ? `<span class="heli-board-note">Hook the car on the slope</span>`
    : '';
  // The story's job keeps its words on a line of their own under the title, before and after it is taken, so the button never sits on them.
  const hint = story && !job.done ? `<span class="heli-board-hint">${job.taken ? 'Fly the crate to Daichi&#39;s tea house at Kogane Pass' : 'Race tyres and tea-house supplies: hook the crate by the pad'}</span>` : '';
  if (own) button = `<button type="button" class="heli-board-button" data-heli-board="take:own">Fly my car</button>`;
  else if (job.done) button = `<span class="heli-board-note">Done today</span>`;
  else if (job.taken) button = `<button type="button" class="heli-board-button heli-board-drop" data-heli-board="drop">Drop job</button>`;
  else {
    button = `<button type="button" class="heli-board-button" data-heli-board="take:${esc(job.id)}">Take job</button>`;
    // With the matching coat owned, the same click can wear it (section 5.2).
    const wear = count ? skins?.offers?.survey : null;
    if (wear) button += `<button type="button" class="heli-board-button heli-board-wear" data-heli-board="survey-wear:${esc(job.id)}">Take job and wear ${esc(skinName(skins, wear))}</button>`;
  }
  // A count in hand: what the panel shows, and the report to Sarah once a quarter is covered.
  if (count && job.taken && survey?.active) {
    button = `<span class="heli-board-note">${esc(String(survey.name).toUpperCase())} ${survey.count} &middot; ${survey.percent}% covered</span>` +
      (survey.canReport ? `<button type="button" class="heli-board-button heli-board-report" data-heli-board="survey-report">Report</button>` : '') + button;
  }
  button = note + button;
  return `<li class="heli-board-job heli-board-${state}${own ? ' heli-board-own' : ''}${story ? ' heli-board-story' : ''}" data-job="${esc(job.id)}">` +
    `<span class="heli-board-text">${esc(title)}</span>` +
    `<span class="heli-board-pay">${esc(pay)}</span>` +
    (pickUp ? `<span class="heli-board-pickup">${esc(pickUp)}</span>` : '') +
    `${button}${hint}</li>`;
}

// H2 Fire (docs/HELI_FIRE.md section 9). The board never lists fires; its
// Radio box shows a waiting call with its Answer button, or the mission in
// hand. With the fire switch on, the bucket's buttons sit with the board on
// the home pad's ground.
const COMPASS_WORDS = Object.freeze({N: 'north', NE: 'north-east', E: 'east', SE: 'south-east', S: 'south', SW: 'south-west', W: 'west', NW: 'north-west'});
// H4 Rescue (docs/HELI_RESCUE.md section 7): a waiting rescue with its Answer
// and Later buttons, or the one in hand with its clock. The panel names the
// place; Roger's words do not.
const RESCUE_WORDS = Object.freeze({hiker: 'Lost hiker at', avalanche: 'Avalanche at', hoist: 'Driver stranded at', supply: 'Supply run to'});
const clockWords = seconds => { const whole = Math.max(0, Math.ceil(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; };
function rescueRadio(rescue, heli) {
  if (rescue.active) {
    const a = rescue.active, place = esc(a.courseName ?? 'the mountain');
    const crates = a.kind === 'supply' ? ` &middot; crates ${a.cratesDown}/3` : '';
    const fuel = a.refuelFirst ? `Refuel at the truck first. Fill to at least ${a.refuelStop === 'pickup' ? 400 : 330} kg at the truck.`
      : a.refuelStop === 'pickup' && a.sites?.atTruck && heli?.fuelKg < 399.9 ? 'Fill to 400 kg at the pickup truck before the return flight.'
      : a.kind === 'supply' && a.courseId === 'summit-run' ? 'Take at least 230 kg before each supply crate leg.' : '';
    return `<div class="heli-board-radio heli-board-rescue-radio"><h3 class="heli-board-title">Radio</h3><span class="heli-board-text">` +
      `${RESCUE_WORDS[a.kind]} ${place}${crates}${fuel ? ` &middot; ${fuel}` : ''} &middot; ${clockWords(a.left)} left</span></div>`;
  }
  if (!rescue.call) return '';
  const c = rescue.call;
  // HELI-PAY-CONTINUE: what the call pays, before it is answered. A hurt casualty pays less.
  const offered = c.kind === 'supply' ? HELI_PAYS.supply.perCrate * 3 + HELI_PAYS.supply.allCrates : HELI_PAYS.rescue[c.kind];
  return `<div class="heli-board-radio heli-board-rescue-radio"><h3 class="heli-board-title">Radio</h3><span class="heli-board-text">` +
    `${RESCUE_WORDS[c.kind]} ${esc(c.courseName ?? 'the mountain')}. ${offered ? esc(payWords(offered, {upTo: true})) + (c.kind === 'supply' ? ' for three crates.' : '; a hurt casualty pays less.') : ''}</span>` +
    `<button type="button" class="heli-board-button" data-heli-board="radio-answer">Answer</button>` +
    `<button type="button" class="heli-board-button" data-heli-board="radio-later">Later</button></div>`;
}
function radioBox(fire, rescue = null, heli = null) {
  const rescueBox = rescue ? rescueRadio(rescue, heli) : '';
  if (rescueBox) return rescueBox;
  if (!fire?.call) return '';
  const course = esc(fire.courseName ?? 'the forest');
  if (!fire.call.answered)
    return `<div class="heli-board-radio"><h3 class="heli-board-title">Radio</h3><span class="heli-board-text">Fire reported at ${course}. ${esc(payWords(HELI_PAYS.fire))} when it is out.</span>` +
      `<button type="button" class="heli-board-button" data-heli-board="radio-answer">Answer</button></div>`;
  const wind = fire.wind.speed < 1 ? 'wind light' : `wind ${COMPASS_WORDS[fire.wind.name] ?? fire.wind.name} ${Math.round(fire.wind.speed)} m/s`;
  return `<div class="heli-board-radio"><h3 class="heli-board-title">Radio</h3><span class="heli-board-text">Fire at ${course}: ${fire.shareOut}% out, ${esc(wind)}</span></div>`;
}
function bucketBox(view, {repairCost = 0}, skins = null) {
  if (!atHomePad(view)) return '';
  // The fire service coat's water gauge shows litres instead of words.
  const bucket = view.bucket, words = bucket?.reading?.text ?? bucket?.words ?? null;
  const wear = !bucket && skins?.offers?.bucket;
  const fit = bucket ? `<button type="button" class="heli-board-button" data-heli-board="bucket-off">Take off the bucket</button>`
    : `<button type="button" class="heli-board-button" data-heli-board="bucket-fit"${view.load?.hooked ? ' disabled' : ''}>Fit the bucket</button>` +
      (wear ? `<button type="button" class="heli-board-button heli-board-wear" data-heli-board="bucket-fit-wear"${view.load?.hooked ? ' disabled' : ''}>Fit the bucket and wear ${esc(skinName(skins, wear))}</button>` : '');
  const repair = repairCost > 0 ? `<button type="button" class="heli-board-button" data-heli-board="bucket-repair">Repair the bucket: ${repairCost} credits</button>` : '';
  const state = bucket ? `<span class="heli-board-text">Bucket: ${esc(words)}</span>` : '';
  return `<div class="heli-board-bucket"><h3 class="heli-board-title">Bucket</h3>${state}${fit}${repair}</div>`;
}

// The rescue line is fitted and taken off at the pad, like the bucket.
function lineBox(view, skins = null) {
  if (!view?.rescue || !atHomePad(view)) return '';
  const line = view.rescue.line;
  const wear = !line && skins?.offers?.line;
  const fit = line ? `<button type="button" class="heli-board-button" data-heli-board="rescue-off"${line.who === 'pair' && !line.done ? ' disabled' : ''}>Take off the rescue line</button>`
    : `<button type="button" class="heli-board-button" data-heli-board="rescue-fit"${view.load?.hooked || view.bucket ? ' disabled' : ''}>Fit the rescue line</button>` +
      (wear ? `<button type="button" class="heli-board-button heli-board-wear" data-heli-board="rescue-fit-wear"${view.load?.hooked || view.bucket ? ' disabled' : ''}>Fit the rescue line and wear ${esc(skinName(skins, wear))}</button>` : '');
  const state = line ? `<span class="heli-board-text">Rescue line: ${line.who === 'pair' ? 'two on the line' : 'rescuer aboard'}</span>` : '';
  return `<div class="heli-board-line"><h3 class="heli-board-title">Rescue line</h3>${state}${fit}</div>`;
}

// H3 skins (docs/HELI_WILDLIFE.md sections 5 to 7). shop is session.paintShop():
// a coat's name for a kind, and the paint shop panel with the wash.
const skinName = (shop, kind) => shop?.rows?.find(row => row.kind === kind)?.name ?? kind;
function paintShopBox(shop) {
  const rows = shop.rows.map(row => {
    const tally = row.owned ? '' : row.need !== null ? `${row.tally}/${row.need}` : 'bought only';
    let button = '';
    if (row.worn) button = `<span class="heli-board-note">Wearing</span>`;
    else if (row.owned) button = `<button type="button" class="heli-board-button" data-heli-board="paint-wear:${esc(row.kind)}">Wear${row.fresh ? ' (fresh coat)' : ''}</button>`;
    else if (row.buy) button = `<button type="button" class="heli-board-button" data-heli-board="paint-buy:${esc(row.kind)}"${row.canAfford ? '' : ' disabled'}>Buy: ${row.price.toLocaleString('en-US')} credits</button>`;
    return `<li class="heli-board-coat heli-board-${row.worn ? 'worn' : row.owned ? 'owned' : 'open'}" data-skin="${esc(row.kind)}">` +
      `<span class="heli-board-text">${esc(row.name)}${tally ? ` ${esc(tally)}` : ''}</span>${button}</li>`;
  }).join('');
  const note = shop.note ? `<span class="heli-board-text heli-board-skin-note">${esc(shop.note)}</span>` : '';
  const grime = shop.wash.grime > 0 ? `Grime ${shop.wash.grime}%${shop.wash.hint ? '. She is filthy' : ''}` : 'She is clean';
  const wash = `<span class="heli-board-text">${esc(grime)}</span>` +
    `<button type="button" class="heli-board-button" data-heli-board="wash"${shop.wash.can ? '' : ' disabled'}>Wash: ${shop.wash.cost} credits</button>`;
  return `<div class="heli-board-paint"><h3 class="heli-board-title">Paint shop</h3>${note}<ul class="heli-board-list">${rows}</ul>${wash}</div>`;
}

// LAB-VIEW (docs/LAB.md 4.1): the Lab's pad menu. The bucket's water or retardant, the 15 or 25 m line, and the Lab's
// challenges with their Start buttons. lab is the session's lab getter plus its challengeBoard() and the last refusal.
const CHALLENGE_NAMES = Object.freeze({lift: 'Lift and weight', projectile: 'Projectile motion', fire: 'Fire triangle', pendulum: 'Pendulums',
  altitude: 'Air and altitude', headings: 'Headings and maps'});
function labBox(view, lab) {
  if (!lab?.on || !atHomePad(view)) return '';
  const parts = [];
  if (view.bucket) {
    const pick = (kind, name, disabled) => `<button type="button" class="heli-board-button${lab.contents === kind ? ' heli-board-chosen' : ''}" data-heli-board="bucket-load:${kind}"` +
      `${disabled ? ' disabled' : ''} aria-pressed="${lab.contents === kind}">${name}</button>`;
    parts.push(`<div class="heli-board-lab-row"><span class="heli-board-text">Bucket holds</span>${pick('water', 'Water', false)}${lab.retardant ? pick('retardant', 'Retardant', false) : ''}</div>`);
  }
  if (lab.lines.length > 1)
    parts.push(`<div class="heli-board-lab-row"><span class="heli-board-text">Cable</span>${lab.lines.map(metres =>
      `<button type="button" class="heli-board-button${lab.line === metres ? ' heli-board-chosen' : ''}" data-heli-board="line:${metres}" aria-pressed="${lab.line === metres}">${metres} m</button>`).join('')}</div>`);
  const rows = (lab.challenges ?? []).map(item => {
    const name = esc(CHALLENGE_NAMES[item.id] ?? item.id);
    const button = item.active ? `<button type="button" class="heli-board-button heli-board-drop" data-heli-board="challenge-stop">Stop</button>`
      : item.open ? `<button type="button" class="heli-board-button" data-heli-board="challenge:${esc(item.id)}">${item.done ? 'Again' : 'Start'}</button>`
        : `<span class="heli-board-note">Opens later</span>`;
    return `<li class="heli-board-job heli-board-${item.done ? 'done' : item.open ? 'open' : 'shut'}" data-challenge="${esc(item.id)}"><span class="heli-board-text">${item.done ? '&#10003; ' : ''}${name}</span>${button}</li>`;
  }).join('');
  if (rows) parts.push(`<h3 class="heli-board-title">Lab challenges</h3><ul class="heli-board-list">${rows}</ul>`);
  if (lab.note) parts.push(`<span class="heli-board-text heli-board-lab-note" role="status">${esc(lab.note)}</span>`);
  return parts.length ? `<div class="heli-board-lab"><h3 class="heli-board-title">Lab</h3>${parts.join('')}</div>` : '';
}

// The dispatch season (docs/HELI_FIRE.md section 3.6), and the first
// snow's note when it put a fire out on this visit.
const SEASON_NAMES = Object.freeze({summer: 'Summer', autumn: 'Autumn', winter: 'Winter', spring: 'Spring'});
function seasonBox(season) {
  if (!season || !SEASON_NAMES[season.name]) return '';
  const note = season.note ? `<span class="heli-board-text">${esc(season.note)}</span>` : '';
  return `<div class="heli-board-season"><span class="heli-board-text">${SEASON_NAMES[season.name]}, play day ${season.day} of ${season.days}</span>${note}</div>`;
}

// view: the session's view. jobs: session.boardJobs(). offer:
// session.raceHereOffer(). fire: with the fire switch on, {repairCost}.
// skins: with the heli-skins switch on, session.paintShop() (the paint shop,
// the wash and the fit buttons' coat offers). Returns '' when there is nothing to show.
// lessonOffer: session.lessonHereOffer(), shown beside Race here.
export function dispatchBoardMarkup(view, {jobs = [], offer = null, mode = 'assisted', fire = null, skins = null, lessonOffer = null, lab = null} = {}) {
  const parts = [];
  if (fire) {
    const season = seasonBox(view?.season);
    if (season) parts.push(season);
    const radio = radioBox(view?.fire, view?.rescue ?? null, view?.heli);
    if (radio) parts.push(radio);
    const bucket = bucketBox(view, fire, skins);
    if (bucket) parts.push(bucket);
    const line = lineBox(view, skins);
    if (line) parts.push(line);
  }
  if (skins && atHomePad(view)) parts.push(paintShopBox(skins));
  // MAP-VIEW: at any pad the board offers the pilot's map (the view carries `secrets` only with the map on).
  if (view?.secrets !== undefined && atAnyPad(view))
    parts.push('<div class="heli-board-map"><button type="button" class="heli-board-button" data-heli-board="map">Pilot\'s map</button></div>');
  const labPanel = labBox(view, lab);
  if (labPanel) parts.push(labPanel);
  if (jobs.length && atHomePad(view))
    parts.push(`<div class="heli-board-jobs"><h3 class="heli-board-title">Dispatch board</h3><ul class="heli-board-list">` +
      `${[...jobs].sort((a, b) => !!b.story - !!a.story).map(job => jobRow(job, mode, {survey: view?.survey ?? null, skins})).join('')}</ul></div>`);
  if (offer) {
    const course = HELI_DESTINATIONS[offer.courseId]?.name ?? offer.courseId;
    parts.push(`<div class="heli-board-race"><span class="heli-board-text">${esc(CARS[offer.carId]?.name ?? 'Your car')} is set down at ${esc(course)}.</span>` +
      `<button type="button" class="heli-board-button heli-board-race-here" data-heli-board="race-here">Race here</button>` +
      (lessonOffer ? `<button type="button" class="heli-board-button heli-board-lesson-here" data-heli-board="lesson-here">Lesson here: ${esc(lessonOffer.name)}</button>` : '') +
      `</div>`);
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
  // MAP-VIEW: open the pilot's map (the app owns whether it is open).
  if (action === 'map') return app.setHeliMap?.(true) ?? {ok: false};
  if (action === 'radio-answer') return settle(session.pressRadio());
  if (action === 'radio-later') return settle(session.declineCall?.() ?? false);
  if (action === 'rescue-fit') return settle(session.fitRescueLine?.() ?? {ok: false});
  if (action === 'rescue-off') return settle(session.takeOffRescueLine?.() ?? {ok: false});
  if (action === 'bucket-fit') return settle(session.fitBucket());
  if (action === 'bucket-fit-wear') return settle(session.fitBucket({wear: true}));
  if (action === 'rescue-fit-wear') return settle(session.fitRescueLine?.({wear: true}) ?? {ok: false});
  if (action.startsWith('survey-wear:')) return settle(session.takeJob(action.slice(12), {wear: true}));
  if (action === 'survey-report') return settle(session.reportCount?.() ?? {ok: false});
  if (action.startsWith('paint-buy:')) return settle(session.buyPaint?.(action.slice(10)) ?? {ok: false});
  if (action.startsWith('paint-wear:')) return settle(session.wearPaint?.(action.slice(11)) ?? {ok: false});
  if (action === 'wash') return settle(session.washHelicopter?.() ?? {ok: false});
  // LAB-VIEW: the Lab's pad menu.
  if (action.startsWith('bucket-load:')) return settle(session.loadBucket?.(action.slice(12)) ?? {ok: false});
  if (action.startsWith('line:')) return settle(session.chooseLine?.(Number(action.slice(5))) ?? {ok: false});
  if (action.startsWith('challenge:')) return settle(session.startChallenge?.(action.slice(10)) ?? {ok: false});
  if (action === 'challenge-stop') return settle(session.stopChallenge?.() ?? false);
  if (action === 'bucket-off') return settle(session.takeOffBucket());
  if (action === 'bucket-repair') return settle(session.repairBucket());
  if (action === 'race-here') {
    const offer = session.raceHereOffer();
    return offer ? app.raceHere(offer) : false;
  }
  if (action === 'lesson-here') {
    const offer = session.lessonHereOffer?.();
    return offer ? app.lessonHere(offer) : false;
  }
  return {ok: false, reason: 'Unknown board action.'};
}

// Wires the board into a root element: draws it from the app's helicopter
// view and handles its buttons. Call render() as often as the view changes;
// the root's markup is replaced only when it differs.
export function createDispatchBoard({root, app}) {
  let last = null, labNote = '', noteKey = '';
  const render = () => {
    const session = app.heliSession, view = app.heliView?.() ?? null;
    const fire = app.forestFireEnabled?.() === true && session?.bucketRepairCost ? {repairCost: session.bucketRepairCost()} : null;
    const skins = session?.paintShop?.() ?? null;
    // LAB-VIEW: the Lab's menu, with the reason the last Lab button was refused (the Lab's own "Try the challenge" leaves one here).
    // The note is dropped when the fuel or the challenge in hand has changed since it was made (the tank was filled, a challenge began).
    const key = `${Math.round(view?.heli?.fuelKg ?? 0)}|${view?.challenge?.id ?? ''}|${view?.bucket ? 1 : 0}`;
    if (app.heliChallengeNote) { labNote = app.heliChallengeNote; app.heliChallengeNote = null; noteKey = key; }
    else if (labNote && key !== noteKey) labNote = '';
    const lab = session?.lab?.on === true ? {...session.lab, challenges: session.challengeBoard?.() ?? [], note: labNote} : null;
    const markup = session && view ? dispatchBoardMarkup(view, {jobs: session.boardJobs(), offer: session.raceHereOffer(), mode: session.mode, fire, skins,
      lessonOffer: session.lessonHereOffer?.() ?? null, lab}) : '';
    if (markup !== last) { root.innerHTML = markup; last = markup; }
    if ('hidden' in root) root.hidden = markup === '';
    return markup;
  };
  const onClick = event => {
    const button = event.target?.closest?.('[data-heli-board]');
    if (!button || button.dataset.heliBoard === undefined) return;
    const result = handleBoardAction(button.dataset.heliBoard, app);
    // LAB-VIEW: a refused Lab button says why; any other button clears it.
    labNote = /^(?:bucket-load|line|challenge)/.test(button.dataset.heliBoard) && result && result.ok === false ? String(result.reason ?? '') : '';
    noteKey = `${Math.round(app.heliView?.()?.heli?.fuelKg ?? 0)}|${app.heliView?.()?.challenge?.id ?? ''}|${app.heliView?.()?.bucket ? 1 : 0}`;
    render();
  };
  root.addEventListener('click', onClick);
  return {render, dispose() { root.removeEventListener('click', onClick); root.innerHTML = ''; last = null; }};
}
