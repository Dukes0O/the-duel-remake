// The Water Road's screens (docs/story/wasteland-water-road.md section 3): its
// Story card on the main menu, the chapters on the yard's Story Wall, the yard's
// "Next up" line and the results tick. Presentation only: every word and button
// comes from the plain props of src/story/water-road.js, and pressing a button
// asks the app (`waterStep`). Nothing here changes a race or a save.
import {registerStoryCard} from './story-ui.js';
import {WATER_LETTER} from './water-lines.js';
import {WATER_CHAPTERS} from './water-save.js';
import {WATER_SWITCH, waterChapterGets} from './water-road.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[character]);

export const WATER_CHAPTER_NAMES = Object.freeze({
  well: 'The dry well', sal: 'Saws on the pipe', dustmonger: 'Fuel for the pump', mirage: 'The stolen valve',
  gunn: 'Hold the yard', kettle: 'The boiler', vultures: 'The water truck', tollkeeper: 'The tanker', blackiron: 'The Cistern',
  magnus: 'The ninth warlord',
});
const chapterTitle = id => `${WATER_CHAPTERS.find(chapter => chapter.id === id)?.n ?? ''} · ${WATER_CHAPTER_NAMES[id]}`;
// After the Baron: the road is won, and a dust cloud is coming. After Magnus (chapter 9): the end.
const ENDED = 'The tower is full and water runs into the camp. Dust on the horizon: a ninth warlord is coming.';
const ENDED_NINTH = 'The tower is full and the water keeps flowing. Magnus is back in his scrapyard, sulking: rematch him any time from the TERRITORY MAP.';
const ended = view => view.ninth ? ENDED_NINTH : ENDED;

registerStoryCard({
  key: 'water',
  switch: WATER_SWITCH,
  eyebrow: 'THE WATER ROAD',
  heading: 'THE WELL IS DRY.',
  letter: WATER_LETTER.text,
  letterLabel: 'A note from Hollis',
  stepsLabel: 'The chapters',
  steps: Object.fromEntries(WATER_CHAPTERS.map(chapter => [chapter.id, {name: chapterTitle(chapter.id), primary: true}])),
  footer: view => view.step === 'done' ? `<p class="story-prize">${escape(ended(view))}</p>` : '',
});

// One chapter as a row: its tick, its words, its bar and its one button (open chapters only).
function chapterRow(step) {
  const state = {done: 'DONE', open: 'NEXT', locked: 'LOCKED'}[step.state] ?? 'LOCKED';
  const bar = step.state === 'open' && step.bar
    ? `<div class="story-bar"><progress max="${step.bar.max}" value="${step.bar.value}" aria-label="${escape(step.bar.label)}"></progress><small>${escape(step.bar.label)}</small></div>` : '';
  const button = step.state === 'open' && step.button
    ? `<button type="button" class="start-button story-step-button" data-water-step="${escape(step.id)}"><span>${escape(step.button)}</span></button>` : '';
  return `<li class="story-step is-${step.state}" data-water-chapter="${escape(step.id)}"><i class="story-tick" aria-hidden="true"></i>`
    + `<div class="story-step-words"><b>${escape(chapterTitle(step.id))}</b><small class="story-state">${state}</small>`
    + `<p>${escape(step.note)}</p>${bar}</div>${button}</li>`;
}

// The Story Wall's Water Road section in the yard. Empty when the story is not shown.
// The notes: the newest one in view, the older ones (and Hollis's first note) folded away, so the chapters and their
// button stay at the top of the screen.
export function waterNotesMarkup(notes = []) {
  const all = [WATER_LETTER.text, ...notes];
  const latest = all.at(-1), older = all.slice(0, -1);
  const card = (text, letter) => letter
    ? `<article class="story-letter" aria-label="A note from Hollis"><span class="story-seal" aria-hidden="true"></span><p>${escape(text)}</p></article>`
    : `<p class="story-note">${escape(text)}</p>`;
  return card(latest, all.length === 1)
    + (older.length ? `<details class="story-older-notes"><summary>Earlier notes (${older.length})</summary>${older.map((text, index) => card(text, index === 0)).join('')}</details>` : '');
}

export function waterWallMarkup(props) {
  if (!props?.available) return '';
  return `<section class="water-road-wall" aria-label="The Water Road"><h3>THE WATER ROAD</h3>`
    + `<ol class="story-steps" aria-label="The chapters">${props.steps.map(chapterRow).join('')}</ol>`
    + (props.step === 'done' ? `<p class="story-prize">${escape(ended(props))}</p>` : '')
    + `<div class="story-notes" aria-label="Notes">${waterNotesMarkup(props.notes)}</div>`
    + `</section>`;
}

// The yard's "Next up": the open chapter's words and its one button, or null when the story is not shown.
export function waterNextUp(props) {
  if (!props?.available) return null;
  if (props.step === 'done') return {text: `Next up: the water road is won. ${ended(props)}`, button: ''};
  const step = props.steps.find(item => item.id === props.step);
  if (!step) return null;
  const title = `Chapter ${chapterTitle(step.id)}`;
  if (step.id === 'well') return {text: `Next up: ${title}. Hollis left you a note. Open the STORY WALL.`, button: ''};
  // The note and, when it adds something, the bar's words (how many wins are left).
  const bar = step.bar?.label && !step.note.includes(step.bar.label) ? ` ${step.bar.label}` : '';
  return {text: `Next up: ${title}. ${step.note}${bar}`,
    button: step.button ? `<button type="button" class="start-button yard-next-button" data-water-step="${escape(step.id)}"><span>${escape(step.button)}</span></button>` : ''};
}

// The results card's line: the chapter's job won, or the chapter done with its warlord beaten.
export function waterResultLine(result) {
  if (result?.waterJob) {
    const chapter = WATER_CHAPTERS.find(item => item.id === result.waterJob);
    return chapter ? `Water Road: chapter ${chapter.n} job done. ${waterChapterGets(chapter.id)}` : '';
  }
  if (result?.waterChapter) {
    const chapter = WATER_CHAPTERS.find(item => item.id === result.waterChapter);
    return chapter ? `Water Road: chapter ${chapter.n}, ${WATER_CHAPTER_NAMES[chapter.id]}, is done. ${waterChapterGets(chapter.id)}` : '';
  }
  return '';
}
