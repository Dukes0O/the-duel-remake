// The stories on screen. The Kogane Invitation (docs/story/kogane-invitation.md section 3): the Story card, the
// main menu button and its red dot, the garage panel and plaque, Daichi's lines on the results
// screen and the Deep log's lead line. Words and markup only: nothing here changes a race, a
// flight or a save. Every screen reads one plain object, the one `app.storyProps(key)` gives
// (section 12.1): {available, step, read, steps: [{id, state, note, button}], fireClosed,
// skylineOwned, lead}. With a story's switch off, or with no story to show, every function here gives nothing.
//
// More than one story: each story registers a card (`registerStoryCard`, below) beside its save and its lines. The menu then
// shows one Story card per story the player can see, and a short chooser when there is more than one.
import {STORY_LETTER, STORY_ANA_SEQUENCE, captionText} from './story-lines.js';
import {KOGANE_SKYLINE, KOGANE_DUEL_LEVELS, storyOf, storyIsNewer} from './story-save.js';

export const STORY_SWITCH = 'kogane-invitation';
export const STORY_RACE_MARK = 'kogane-night-duel';
export const STORY_PRIZE_NAME = 'Nissan Skyline GT-R R34';
export const STORY_LEAD_LINE = 'LEAD: Lake Kogane. A long dark shape on the lake bed. Not dived yet.';
export const STORY_PLAQUE_TEXT = 'Won from Daichi Mori, Kogane Pass at night';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character]);
const STATES = Object.freeze(['locked', 'open', 'done']);

// ---- The cards ---------------------------------------------------------------------------------------------------------------
// A story's card is data:
//   key          the story's key (the same as its save and its lines)
//   switch       the feature switch that shows the story
//   eyebrow      the small title ("THE KOGANE INVITATION"); heading: the big words on the card
//   letter       the opening letter's words, and letterLabel its accessible name
//   stepsLabel   the accessible name of the list of steps
//   steps        {id: {name, open, locked, done, button, primary, road, start}} in the order they are played:
//                  open / locked / done  the words for each state, when the game gives none of its own
//                  doneWords             the words once done, whatever the game says (Ana's two lines)
//                  button                the label of the open step's button (none: the step has no button)
//                  primary               the button is the big one
//                  road                  the step waits while the road is closed
//                  start                 the name of the app method that starts the step's race (it returns true when it did)
//   footer       (view) => markup under the steps (already escaped)
const CARDS = new Map();

export function registerStoryCard(card) {
  const {key, steps} = card ?? {};
  if (typeof key !== 'string' || !/^[a-z][a-z0-9-]*$/.test(key)) throw new Error(`A story card needs a story key, not ${JSON.stringify(key)}.`);
  if (CARDS.has(key)) throw new Error(`The card of "${key}" is already registered.`);
  if (typeof card.switch !== 'string' || !card.switch) throw new Error(`The card of "${key}" needs a feature switch.`);
  if (steps === null || typeof steps !== 'object' || !Object.keys(steps).length) throw new Error(`The card of "${key}" needs its steps.`);
  CARDS.set(key, Object.freeze({letterLabel: 'Letter', stepsLabel: 'The parts', footer: () => '', ...card,
    steps: Object.freeze(Object.fromEntries(Object.entries(steps).map(([id, step]) => [id, Object.freeze({done: 'Done.', ...step})])))}));
}
// Takes a card out again (for tests that register a throwaway story).
export const unregisterStoryCard = key => CARDS.delete(key);
export const storyCardKeys = () => [...CARDS.keys()];

registerStoryCard({
  key: 'kogane',
  switch: STORY_SWITCH,
  eyebrow: 'THE KOGANE INVITATION',
  heading: 'A LETTER FOR YOU.',
  letter: STORY_LETTER.text,
  letterLabel: 'Letter from Daichi Mori',
  stepsLabel: 'The four parts',
  steps: {
    lesson: {name: "Brian's Hairpin Lesson", button: 'Start the lesson', road: true,
      open: 'Four short runs on the Kogane road with Brian. Pass "Beat me" to open the next part.',
      locked: 'Buy Kogane Pass first.'},
    supplies: {name: 'Supplies for the Summit', button: 'Go to the helipad',
      open: 'Take the job at the home helipad, then fly the crate up to the tea house.',
      locked: "Finish Brian's Hairpin Lesson first, then finish his flying lessons at the helipad."},
    duel: {name: 'The Night Duel', button: 'Race Daichi', primary: true, road: true, start: 'startStoryDuel',
      open: 'Pick your own car and a level, then race Daichi down Kogane Pass at night.',
      locked: 'Fly the supplies to the tea house first.'},
    ana: {name: "Ana's message", doneWords: STORY_ANA_SEQUENCE.map(captionText).join(' '),
      open: 'Ana will radio the next time the main menu opens.',
      locked: 'Win the Night Duel first.'},
  },
  footer: view => `<p class="story-prize">THE PRIZE · ${escape(STORY_PRIZE_NAME)}. Win the Night Duel and Daichi hands over the keys.${view.skylineOwned ? ' You already own one. The story still plays.' : ''}</p>`,
});

export const storyCardOf = key => CARDS.get(key) ?? null;

// Whether a story's switch is on. With no key: whether any registered story's switch is on.
export function storyOn(app, key) {
  const switches = app?._switches?.();
  const keys = key === undefined ? [...CARDS.keys()] : [key];
  return keys.some(name => CARDS.has(name) && switches?.enabled?.(CARDS.get(name).switch) === true);
}

// The steps when the game gives none: everything before the open step is done, everything after is locked.
function defaultSteps(card, step) {
  const order = Object.keys(card.steps);
  const at = step === 'done' ? order.length : Math.max(0, order.indexOf(step));
  return order.map((id, index) => ({id, state: index < at ? 'done' : index === at ? 'open' : 'locked'}));
}

function closedDays(fireClosed) {
  if (!fireClosed) return null;
  const days = typeof fireClosed === 'number' ? fireClosed : fireClosed.days ?? fireClosed.playDays;
  return {days: Number.isFinite(days) && days > 0 ? Math.ceil(days) : null};
}

// The one plain object every screen draws from, or null when there is nothing to show.
export function storyView(props, key = 'kogane') {
  const card = CARDS.get(key);
  if (!card || !props || props.available !== true || typeof props.step !== 'string') return null;
  const given = Array.isArray(props.steps) && props.steps.length ? props.steps : defaultSteps(card, props.step);
  const steps = given.filter(item => item && Object.hasOwn(card.steps, item.id)).map(item => {
    const label = typeof item.button === 'string' ? item.button : item.button?.label;
    // A bar, when the game gives one: how far a hold or a rank is, with its words.
    const bar = item.bar && Number.isFinite(item.bar.value) && Number.isFinite(item.bar.max) && item.bar.max > 0 && typeof item.bar.label === 'string'
      ? {value: Math.max(0, Math.min(item.bar.max, item.bar.value)), max: item.bar.max, label: item.bar.label} : null;
    return {id: item.id, state: STATES.includes(item.state) ? item.state : 'locked',
      note: typeof item.note === 'string' ? item.note.trim() : '', button: typeof label === 'string' ? label.trim() : '',
      ...(bar ? {bar} : {})};
  });
  const lead = typeof props.lead === 'string' && props.lead.trim() ? props.lead.trim() : props.lead === true ? STORY_LEAD_LINE : '';
  return {key, step: props.step, read: props.read === true, steps, closed: closedDays(props.fireClosed),
    skylineOwned: props.skylineOwned === true, lead,
    // Notes after the letter (the Water Road's notes from V.), oldest first.
    notes: Array.isArray(props.notes) ? props.notes.filter(text => typeof text === 'string' && text) : [],
    // A message waits while the letter is unread or Ana has yet to call; a story may say so itself.
    message: typeof props.message === 'boolean' ? props.message : props.read !== true || props.step === 'ana'};
}

export function fireMessage(closed) {
  if (!closed) return '';
  return closed.days
    ? `Kogane Pass is closed after the fire and opens again in ${closed.days} play ${closed.days === 1 ? 'day' : 'days'}. The lesson and the duel wait. Your progress is kept.`
    : 'Kogane Pass is closed after the fire. The lesson and the duel wait. Your progress is kept.';
}

function stepText(card, step) {
  const words = card.steps[step.id];
  if (step.state === 'done') return words.doneWords ?? (step.note || words.done);
  return step.note || (step.state === 'open' ? words.open : words.locked) || '';
}

function stepMarkup(card, step, closed) {
  const words = card.steps[step.id];
  const label = step.state === 'open' ? step.button || words.button || '' : '';
  const waiting = closed && words.road === true;
  const button = label
    ? `<button type="button" class="${words.primary ? 'start-button' : 'secondary-button'} story-step-button" data-story-step="${step.id}"${waiting ? ' disabled aria-disabled="true"' : ''}><span>${escape(label)}</span></button>`
    : '';
  const state = {done: 'DONE', open: 'NEXT', locked: 'LOCKED'}[step.state];
  const bar = step.bar && step.state === 'open'
    ? `<div class="story-bar"><progress max="${step.bar.max}" value="${step.bar.value}" aria-label="${escape(step.bar.label)}"></progress><small>${escape(step.bar.label)}</small></div>` : '';
  return `<li class="story-step is-${step.state}" data-step="${step.id}"><i class="story-tick" aria-hidden="true"></i>`
    + `<div class="story-step-words"><b>${escape(words.name)}</b><small class="story-state">${state}</small><p>${escape(stepText(card, step))}</p>${bar}</div>${button}</li>`;
}

// The Story card. Empty when there is nothing to show.
export function storyCardMarkup(view) {
  const card = view ? CARDS.get(view.key) : null;
  if (!card) return '';
  const steps = view.steps.map(step => stepMarkup(card, step, view.closed !== null)).join('');
  return `<section class="story-card career-panel" role="dialog" aria-modal="true" aria-labelledby="story-title">`
    + `<header class="shop-heading"><div><p class="eyebrow"><i></i> ${escape(card.eyebrow)}</p><h2 id="story-title">${escape(card.heading)}</h2></div>`
    + `<button type="button" class="shop-close" data-story-close aria-label="Close the story card">×</button></header>`
    + `<article class="story-letter" aria-label="${escape(card.letterLabel)}"><span class="story-seal" aria-hidden="true"></span><p>${escape(card.letter)}</p></article>`
    // Notes after the letter: the newest in view, the older ones folded, so the steps stay near the top.
    + (view.notes?.length ? `<div class="story-notes" aria-label="Notes"><p class="story-note">${escape(view.notes.at(-1))}</p>`
      + (view.notes.length > 1 ? `<details class="story-older-notes"><summary>Earlier notes (${view.notes.length - 1})</summary>${view.notes.slice(0, -1).map(text => `<p class="story-note">${escape(text)}</p>`).join('')}</details>` : '') + `</div>` : '')
    + (view.closed ? `<p class="story-fire" role="status">${escape(fireMessage(view.closed))}</p>` : '')
    + `<ol class="story-steps" aria-label="${escape(card.stepsLabel)}">${steps}</ol>`
    + (view.lead ? `<p class="story-lead">${escape(view.lead)}</p>` : '')
    + card.footer(view)
    + `</section>`;
}

// The chooser, when the player can see more than one story: one button for each (a dot marks a new message).
export function storyChooserMarkup(views) {
  const list = (views ?? []).filter(view => view && CARDS.has(view.key));
  if (list.length < 2) return '';
  const items = list.map(view => `<li><button type="button" class="secondary-button story-choice" data-story-choose="${escape(view.key)}"><span>${escape(CARDS.get(view.key).eyebrow)}</span>`
    + `${view.message ? ' <i class="story-dot" aria-label="New message"></i>' : ''}</button></li>`).join('');
  return `<section class="story-card story-chooser career-panel" role="dialog" aria-modal="true" aria-labelledby="story-title">`
    + `<header class="shop-heading"><div><p class="eyebrow"><i></i> THE STORIES</p><h2 id="story-title">CHOOSE A STORY.</h2></div>`
    + `<button type="button" class="shop-close" data-story-close aria-label="Close the story card">×</button></header>`
    + `<ul class="story-choices">${items}</ul></section>`;
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

// The garage panel: the Kogane prize, while that story is open (before the duel is won).
export function storyGaragePanel(view) {
  if (!view || view.key !== 'kogane' || !['invite', 'lesson', 'supplies', 'duel'].includes(view.step)) return '';
  const card = CARDS.get('kogane'), next = view.steps.find(step => step.state === 'open');
  const nextLine = next ? `<p><b>Next:</b> ${escape(card.steps[next.id].name)}. ${escape(stepText(card, next))}</p>` : '';
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
// (the menu wires the instructor board and the helipad; a step that starts a race goes through the app method its card names,
// such as `app.startStoryDuel()`, then `onRaceSetup` lets the menu show it). An action is found as `actions['<story>.<step>']`,
// or else `actions['<step>']`.
// With one story visible this is the one card it always was. With more than one, `open()` shows a short chooser first and
// `open(key)` goes straight to that story's card.
export function createStoryUi({host, app, actions = {}, onChange = () => {}, onRaceSetup = null}) {
  // The look loads only when the Story card exists (the switch is on); tests without a browser skip it.
  if (typeof document !== 'undefined') import('./story-ui.css').catch(() => {});
  let layer = null, openKey = null;
  const viewOf = key => storyOn(app, key) ? storyView(app.storyProps?.(key), key) : null;
  // Every story the player can see, in the order they were registered.
  const visible = () => storyCardKeys().map(viewOf).filter(Boolean);
  // The one view the menu button draws from: the first story's, with a red dot if any visible story has a message.
  const view = () => {
    const all = visible();
    return all.length < 2 ? all[0] ?? null : {...all[0], message: all.some(item => item.message)};
  };
  function close() {
    if (!layer) return;
    layer.remove();
    layer = null;
    openKey = null;
    onChange();
  }
  function mount(markup, focus) {
    layer = host.ownerDocument.createElement('div');
    layer.className = 'modal-layer story-layer';
    layer.innerHTML = markup;
    layer.addEventListener('click', event => {
      const target = event.target.closest?.('[data-story-close], [data-story-choose], [data-story-step]');
      if (!target) return;
      if (target.hasAttribute('data-story-close')) { close(); return; }
      if (target.hasAttribute('data-story-choose')) { open(target.dataset.storyChoose); return; }
      if (target.disabled) return;
      const key = openKey, id = target.dataset.storyStep;
      close();
      const start = storyCardOf(key)?.steps[id]?.start;
      if (start) { if (app[start]?.()) onRaceSetup?.(); }
      else if (actions[`${key}.${id}`] ?? actions[id]) (actions[`${key}.${id}`] ?? actions[id])();
      // One action for every step of a story (the Water Road's chapters): it is told which step.
      else actions[key]?.(id);
    });
    layer.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } });
    host.append(layer);
    layer.querySelector(focus)?.focus?.({preventScroll: true});
    onChange();
    return true;
  }
  function open(key) {
    if (!storyOn(app) || app.duel?.state?.status !== 'menu') return false;
    const all = visible();
    if (key === undefined && all.length > 1) {
      close();
      return mount(storyChooserMarkup(all), '[data-story-choose], [data-story-close]');
    }
    // The only story, or the one asked for. With nothing to show, the first story whose switch is on is still asked (it answers no).
    const chosen = key ?? all[0]?.key ?? storyCardKeys().find(name => storyOn(app, name));
    // Opening the card reads the letter (only the red dot goes away).
    app.openStory?.(chosen);
    const current = viewOf(chosen);
    if (!current) { onChange(); return false; }
    close();
    openKey = chosen;
    return mount(storyCardMarkup(current), '[data-story-step]:not([disabled]), [data-story-close]');
  }
  return {open, close, view, views: visible, get isOpen() { return layer !== null; }, dispose: close};
}
