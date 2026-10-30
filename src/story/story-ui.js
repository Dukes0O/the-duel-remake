// The Kogane Invitation on screen (docs/story/kogane-invitation.md section 3): the Story card, the
// main menu button and its red dot, the garage panel and plaque, Daichi's lines on the results
// screen and the Deep log's lead line. Words and markup only: nothing here changes a race, a
// flight or a save. Every screen reads one plain object, the one `app.storyProps()` gives
// (section 12.1): {available, step, read, steps: [{id, state, note, button}], fireClosed,
// skylineOwned, lead}. With the `kogane-invitation` switch off, or with no story to show,
// every function here gives nothing.
import {STORY_LETTER, STORY_ANA_SEQUENCE, captionText} from './story-lines.js';
import {KOGANE_SKYLINE, KOGANE_DUEL_LEVELS, storyOf, storyIsNewer} from './story-save.js';

export const STORY_SWITCH = 'kogane-invitation';
export const STORY_RACE_MARK = 'kogane-night-duel';
export const STORY_PRIZE_NAME = 'Nissan Skyline GT-R R34';
export const STORY_LEAD_LINE = 'LEAD: Lake Kogane. A long dark shape on the lake bed. Not dived yet.';
export const STORY_PLAQUE_TEXT = 'Won from Daichi Mori, Kogane Pass at night';

const STEP_ORDER = Object.freeze(['lesson', 'supplies', 'duel', 'ana']);
const STEP_NAMES = Object.freeze({lesson: 'Brian\'s Hairpin Lesson', supplies: 'Supplies for the Summit',
  duel: 'The Night Duel', ana: 'Ana\'s message'});
// What an open step asks of the player, when the game gives no words of its own.
const OPEN_NOTES = Object.freeze({
  lesson: 'Four short runs on the Kogane road with Brian. Pass "Beat me" to open the next part.',
  supplies: 'Take the job at the home helipad, then fly the crate up to the tea house.',
  duel: 'Pick your own car and a level, then race Daichi down Kogane Pass at night.',
  ana: 'Ana will radio the next time the main menu opens.',
});
// What a locked step needs first, in plain words.
const LOCKED_NOTES = Object.freeze({
  lesson: 'Buy Kogane Pass first.',
  supplies: 'Finish Brian\'s Hairpin Lesson first, then finish his flying lessons at the helipad.',
  duel: 'Fly the supplies to the tea house first.',
  ana: 'Win the Night Duel first.',
});
const OPEN_BUTTONS = Object.freeze({lesson: 'Start the lesson', supplies: 'Go to the helipad', duel: 'Race Daichi'});
// The lesson and the duel are on the road itself, so they wait while the road is closed.
const ROAD_STEPS = Object.freeze(['lesson', 'duel']);
const STATES = Object.freeze(['locked', 'open', 'done']);

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character]);

export const storyOn = app => app?._switches?.().enabled?.(STORY_SWITCH) === true;

// The steps when the game gives none: everything before the open step is done, everything after is locked.
function defaultSteps(step) {
  const at = step === 'done' ? STEP_ORDER.length : Math.max(0, STEP_ORDER.indexOf(step));
  return STEP_ORDER.map((id, index) => ({id, state: index < at ? 'done' : index === at ? 'open' : 'locked'}));
}

function closedDays(fireClosed) {
  if (!fireClosed) return null;
  const days = typeof fireClosed === 'number' ? fireClosed : fireClosed.days ?? fireClosed.playDays;
  return {days: Number.isFinite(days) && days > 0 ? Math.ceil(days) : null};
}

// The one plain object every screen draws from, or null when there is nothing to show.
export function storyView(props) {
  if (!props || props.available !== true || typeof props.step !== 'string') return null;
  const given = Array.isArray(props.steps) && props.steps.length ? props.steps : defaultSteps(props.step);
  const steps = given.filter(item => item && Object.hasOwn(STEP_NAMES, item.id)).map(item => {
    const label = typeof item.button === 'string' ? item.button : item.button?.label;
    return {id: item.id, state: STATES.includes(item.state) ? item.state : 'locked',
      note: typeof item.note === 'string' ? item.note.trim() : '', button: typeof label === 'string' ? label.trim() : ''};
  });
  const lead = typeof props.lead === 'string' && props.lead.trim() ? props.lead.trim() : props.lead === true ? STORY_LEAD_LINE : '';
  return {step: props.step, read: props.read === true, steps, closed: closedDays(props.fireClosed),
    skylineOwned: props.skylineOwned === true, lead,
    // A message waits while the letter is unread or Ana has yet to call.
    message: props.read !== true || props.step === 'ana'};
}

export function fireMessage(closed) {
  if (!closed) return '';
  return closed.days
    ? `Kogane Pass is closed after the fire and opens again in ${closed.days} play ${closed.days === 1 ? 'day' : 'days'}. The lesson and the duel wait. Your progress is kept.`
    : 'Kogane Pass is closed after the fire. The lesson and the duel wait. Your progress is kept.';
}

function stepText(step) {
  if (step.state === 'done') {
    if (step.id === 'ana') return STORY_ANA_SEQUENCE.map(captionText).join(' ');
    return step.note || 'Done.';
  }
  if (step.state === 'open') return step.note || OPEN_NOTES[step.id];
  return step.note || LOCKED_NOTES[step.id];
}

function stepMarkup(step, closed) {
  const label = step.state === 'open' ? step.button || OPEN_BUTTONS[step.id] || '' : '';
  const waiting = closed && ROAD_STEPS.includes(step.id);
  const button = label
    ? `<button type="button" class="${step.id === 'duel' ? 'start-button' : 'secondary-button'} story-step-button" data-story-step="${step.id}"${waiting ? ' disabled aria-disabled="true"' : ''}><span>${escape(label)}</span></button>`
    : '';
  const state = {done: 'DONE', open: 'NEXT', locked: 'LOCKED'}[step.state];
  return `<li class="story-step is-${step.state}" data-step="${step.id}"><i class="story-tick" aria-hidden="true"></i>`
    + `<div class="story-step-words"><b>${escape(STEP_NAMES[step.id])}</b><small class="story-state">${state}</small><p>${escape(stepText(step))}</p></div>${button}</li>`;
}

// The Story card. Empty when there is nothing to show.
export function storyCardMarkup(view) {
  if (!view) return '';
  const steps = view.steps.map(step => stepMarkup(step, view.closed !== null)).join('');
  return `<section class="story-card career-panel" role="dialog" aria-modal="true" aria-labelledby="story-title">`
    + `<header class="shop-heading"><div><p class="eyebrow"><i></i> THE KOGANE INVITATION</p><h2 id="story-title">A LETTER FOR YOU.</h2></div>`
    + `<button type="button" class="shop-close" data-story-close aria-label="Close the story card">×</button></header>`
    + `<article class="story-letter" aria-label="Letter from Daichi Mori"><span class="story-seal" aria-hidden="true"></span><p>${escape(STORY_LETTER.text)}</p></article>`
    + (view.closed ? `<p class="story-fire" role="status">${escape(fireMessage(view.closed))}</p>` : '')
    + `<ol class="story-steps" aria-label="The four parts">${steps}</ol>`
    + (view.lead ? `<p class="story-lead">${escape(view.lead)}</p>` : '')
    + `<p class="story-prize">THE PRIZE · ${escape(STORY_PRIZE_NAME)}. Win the Night Duel and Daichi hands over the keys.${view.skylineOwned ? ' You already own one. The story still plays.' : ''}</p>`
    + `</section>`;
}

// The main menu button, added only while the switch is on. Hidden until the game says a story is open.
export const storyButtonMarkup = () =>
  '<button id="story-visit" type="button" class="secondary-button story-entry" data-story-open hidden>STORY <i class="story-dot" aria-label="New message" hidden></i><span>→</span></button>';

// Shows or hides the button and its red dot. `view` is null when there is nothing to show.
export function syncStoryButton(button, view) {
  if (!button) return;
  button.hidden = !view;
  const dot = button.querySelector?.('.story-dot');
  if (dot) dot.hidden = !(view && view.message);
}

// The front door's Next up entry (src/menu-front-door.js reads these facts).
export function storyNextUp(story) {
  if (!story) return null;
  const text = {
    invite: 'A letter from Daichi Mori is waiting. Open the Story card.',
    lesson: 'Your story is open: Brian\'s Hairpin Lesson on Kogane Pass.',
    supplies: 'Your story is open: fly supplies up to the tea house on Kogane Pass.',
    duel: 'Your story is open: Daichi is waiting. Race him down Kogane Pass at night.',
    ana: 'Ana has a message for you. Open the Story card.',
  }[story.step];
  return text ? {kind: 'story', attr: 'data-story-open', text, dot: story.read !== true || story.step === 'ana'} : null;
}

// The garage panel: the prize, while the story is open (before the duel is won).
export function storyGaragePanel(view) {
  if (!view || !['invite', 'lesson', 'supplies', 'duel'].includes(view.step)) return '';
  const next = view.steps.find(step => step.state === 'open');
  const nextLine = next ? `<p><b>Next:</b> ${escape(STEP_NAMES[next.id])}. ${escape(stepText(next))}</p>` : '';
  return `<section class="paint-panel story-garage" data-story="${escape(view.step)}" aria-label="The Kogane Invitation"><h3>THE KOGANE INVITATION</h3>`
    + `<p>The prize is the ${escape(STORY_PRIZE_NAME)}. Win the Night Duel against Daichi Mori on Kogane Pass and it is yours.${view.skylineOwned ? ' You already own one, so this is for the story alone.' : ''}</p>${nextLine}`
    + `<p class="story-garage-open"><button type="button" class="secondary-button" data-story-open>OPEN THE STORY CARD</button></p></section>`;
}

// The Skyline's plaque, once the duel is won (the Sirena's Coast Cup plaque is the model).
export function skylinePlaque(profile, {car, on = true} = {}) {
  if (!on || car !== KOGANE_SKYLINE || !profile || storyIsNewer(profile)) return '';
  if (!KOGANE_DUEL_LEVELS.includes(storyOf(profile).kogane.duel)) return '';
  return `<section class="paint-panel story-plaque" aria-label="Plaque"><p class="story-plaque-text">${escape(STORY_PLAQUE_TEXT)}</p></section>`;
}

// The Deep log's grey line, when Ana has logged the lead.
export const storyLeadLine = view => view && view.lead ? `<p class="story-lead deep-log-lead">${escape(view.lead)}</p>` : '';

// The results screen: a new-car card and Daichi's line, only for the story's own race.
// `result` is the settlement result, which carries `story` (the race mark), `won`, `storyCar` and `storyOwned`.
export function storyResultMarkup(result, {on = false, carName = STORY_PRIZE_NAME} = {}) {
  if (!on || !result || result.story !== STORY_RACE_MARK) return '';
  let card = '', id;
  if (result.won === true) {
    if (typeof result.storyCar === 'string' && result.storyCar) {
      card = `<div class="earned-car-card story-car-card" role="status"><span class="field-label">NEW CAR</span><b>${escape(String(carName).toUpperCase())}</b><p>Won from Daichi Mori. In your garage now.</p></div>`;
      id = 'story.kogane.daichi.win';
    } else if (result.storyOwned === true) id = 'story.kogane.daichi.owned';
  } else if (result.won === false) id = 'story.kogane.daichi.lose';
  if (!id) return '';
  return `${card}<p class="result-bonuses story-line" role="status"><b>Daichi:</b> ${escape(captionText(id))}</p>`;
}

// The Story card on screen. `host` is the stage; `actions` says where each step's button goes
// (the menu wires the instructor board and the helipad; the duel goes through `app.startStoryDuel()`, then `onRaceSetup` lets the menu show it).
export function createStoryUi({host, app, actions = {}, onChange = () => {}, onRaceSetup = null}) {
  // The look loads only when the Story card exists (the switch is on); tests without a browser skip it.
  if (typeof document !== 'undefined') import('./story-ui.css').catch(() => {});
  let layer = null;
  const view = () => storyOn(app) ? storyView(app.storyProps?.()) : null;
  function close() {
    if (!layer) return;
    layer.remove();
    layer = null;
    onChange();
  }
  function open() {
    if (!storyOn(app) || app.duel?.state?.status !== 'menu') return false;
    // Opening the card reads the letter (only the red dot goes away).
    app.openStory?.();
    const current = view();
    if (!current) { onChange(); return false; }
    close();
    layer = host.ownerDocument.createElement('div');
    layer.className = 'modal-layer story-layer';
    layer.innerHTML = storyCardMarkup(current);
    layer.addEventListener('click', event => {
      const target = event.target.closest?.('[data-story-close], [data-story-step]');
      if (!target) return;
      if (target.hasAttribute('data-story-close')) { close(); return; }
      if (target.disabled) return;
      const id = target.dataset.storyStep;
      close();
      if (id === 'duel') { if (app.startStoryDuel?.()) onRaceSetup?.(); }
      else actions[id]?.();
    });
    layer.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
    host.append(layer);
    layer.querySelector('[data-story-step]:not([disabled]), [data-story-close]')?.focus?.({preventScroll: true});
    onChange();
    return true;
  }
  return {open, close, view, get isOpen() { return layer !== null; }, dispose: close};
}
