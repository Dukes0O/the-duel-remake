import {STORY_PEOPLE} from './people.js';

// The view receives the part of the ledger someone at the hearth can know.
export function playLedgerPageTurn(audio) {
  if (audio?.context?.state === 'running' && !audio.muted) audio._playCue('story.ledger.open');
}

// STORY-NIGHT-2-FLOW: the one-line "Remembered" notice when a night ends.
export function playJournalNote(audio) {
  if (audio?.context?.state === 'running' && !audio.muted) audio._playCue('story.journal.note');
}

export function playLedgerChoice(audio) {
  if (audio?.context?.state === 'running' && !audio.muted) audio._playCue('story.ledger.choose');
}

export function bindLedgerReplayKeys(window, currentPage, signal) {
  const activation = new Set(['Enter', 'NumpadEnter', 'Space', 'Escape']);
  const pressedOn = new Map();
  const capture = {capture: true, signal};
  window.addEventListener('keydown', event => {
    if (!activation.has(event.code)) return;
    const page = currentPage();
    const held = pressedOn.has(event.code);
    if (page && (held || event.repeat)) event.preventDefault();
    // A repeat seen after window focus returns still needs a release.
    if (!held) pressedOn.set(event.code, event.repeat ? null : page);
  }, capture);
  window.addEventListener('keyup', event => {
    if (!activation.has(event.code)) return;
    const page = currentPage();
    // Space activates a button on keyup. Its press must belong to this page.
    if (page && pressedOn.get(event.code) !== page) event.preventDefault();
    pressedOn.delete(event.code);
  }, capture);
  window.addEventListener('blur', () => pressedOn.clear(), {signal});
}

export const LEDGER_MARK_LINES = Object.freeze({
  'know-south-ford': 'The Walkers told you about the South Ford.',
  'dace-knows-the-count': 'You told Dace how many embers the town has.',
  'gave-rell-an-ember': 'You gave Rell an ember and asked nothing.',
  'walkers-inside': 'You invited the Walkers to the hearth.',
  'dace-runner': 'Dace will carry a brand for you.',
  'dace-secret': 'You and Dace have a secret.',
  'dace-sent-away': 'You sent Dace away.',
  'told-walkers-of-mall': 'You told the Walkers about the Dead Mall.',
  'dace-kept-watch': 'Dace kept a watch nobody asked for.',
  'unseen-night-2-scout': 'An Ash scout went unseen.',
  'night-2-lamps-counted': 'The Ash scout counted the lamps.',
  'walkers-refused-clinker': 'The Walkers refused Clinker.',
  'walkers-with-clinker': 'The Walkers went with Clinker.',
  'ash-men-know-footpaths': 'The Ash Men know the footpaths.',
  'ash-men-know-south-ford': 'The Ash Men know the South Ford.',
  'changed-mind-in-night': 'You changed your mind in the night.',
  'wash-camp-taken': "The Ash Men took the Walkers' camp at the Wash.",
});
const marks = LEDGER_MARK_LINES;

function tellingLine({slot, key}, value, other) {
  switch (slot) {
    case 'stocks': return value + (key === 'gas' ? ' gas in store.' : value === 1 ? ' ember in store.' : ' embers in store.');
    case 'roadWord': return 'Word on the road: ' + value + ' of 5.';
    case 'feud': return 'The Ash Men: ' + value + '.';
    case 'words': return STORY_PEOPLE[key] + ': ' + (value ?? 'Strangers') + '.';
    case 'encounters': return STORY_PEOPLE[key] + (value ? ': ' + value : ' is absent from this telling.');
    case 'extraHeatFrom': return value === null ? 'The usual hearth burn.' : 'The hearth needs an extra ember every other night.';
    case 'obligations': return value?.text ?? 'No ' + (other?.type ?? 'obligation') + '.';
    case 'made': return key.replaceAll('-', ' ') + (value ? ' was made.' : ' was left unmade.');
    case 'marks': return value ? marks[key] ?? key.replaceAll('-', ' ') : '—';
    default: return '';
  }
}

export function ledgerReplayMarkup({differences, confirming, issue}, escapeHTML) {
  const button = (action, label) => '<button type="button" data-action="night-2-replay-' + action + '">' + label + '</button>';
  const warning = confirming ? '<p id="ledger-replay-warning" class="story-replay-warning">The first telling will be forgotten.</p>' : '';
  const status = issue ? '<p role="status">' + escapeHTML(issue) + '</p>' : '';
  const rows = differences.map(fact => '<tr><td>' + escapeHTML(tellingLine(fact, fact.kept, fact.played)) +
    '</td><td>' + escapeHTML(tellingLine(fact, fact.played, fact.kept)) + '</td></tr>').join('');
  const content = '<table><thead><tr><th scope="col">As it stands</th><th scope="col">This time</th></tr></thead>' +
    '<tbody>' + (rows || '<tr><td colspan="2">The two tellings leave the same marks.</td></tr>') + '</tbody></table>';
  const controls = confirming ? button('cancel', 'Go back') + button('replace', 'Keep this time')
    : button('keep', 'Keep how it stands') + button('review', 'Keep this time');
  return '<section class="yard-home-panel story-replay" role="dialog" aria-modal="true" aria-labelledby="ledger-title"' +
    (confirming ? ' aria-describedby="ledger-replay-warning"' : '') + '>' +
    '<h3 id="ledger-title">What people remember</h3>' +
    '<div class="story-replay-comparison yard-home-intro" role="region" aria-label="Compare tellings" tabindex="0">' +
    content + '</div>' + warning + status + '<footer>' + controls + '</footer></section>';
}

// STORY-NIGHT-2-FLOW: the end of a night in the world. One line of what people remember at the top of the screen and a
// Continue at the foot; the dawn over the hearth stays in view between them.
export function night2DawnMarkup({remembered, issue = ''}, escapeHTML) {
  return '<section class="story-dawn" aria-label="Dawn">' +
    (remembered ? '<p class="story-dawn-note" role="status">' + escapeHTML(remembered) + '</p>' : '') +
    (issue ? '<p class="story-dawn-issue" role="status">' + escapeHTML(issue) + '</p>' : '') +
    '<footer><button type="button" data-action="night-2-continue">Continue</button></footer></section>';
}

// The journal from the pause menu: the same page the Story Wall shows, with the way back to the pause card.
export function night2JournalMarkup(page, escapeHTML) {
  return '<section class="yard-home-panel story-journal" role="dialog" aria-modal="true" aria-labelledby="ledger-title">' +
    '<div class="yard-home-content">' + ledgerPageMarkup(page, escapeHTML) + '</div>' +
    '<footer><button type="button" data-action="story-journal-close">Back</button></footer></section>';
}

export function ledgerPageMarkup(page, escapeHTML) {
  const title = '<h3 id="ledger-title">What people remember</h3>';
  const section = (subtitle, items, tonight = false) => items.length
    ? '<section' + (tonight ? ' class="ledger-tonight"' : '') + '><h4>' + subtitle + '</h4><ul>' + items.map(item => '<li>' + item + '</li>').join('') + '</ul></section>'
    : '';
  let content = '<p>Your story has yet to begin.</p>';
  if (page) {
    const supplies = (page.tonight?.supplies ? '<p class="ledger-tonight">' : '<p>') + page.embers + (page.embers === 1 ? ' ember' : ' embers') + ' and ' +
      page.gas + ' gas in store. Enough for ' + page.nights + (page.nights === 1 ? ' night.' : ' nights.') + '</p>';
    const people = page.people.map(({name, last}) => '<strong>' + escapeHTML(name) + '</strong> ' + escapeHTML(last));
    const news = page.consequences.map(({text, because}) => escapeHTML(text) + ' ' + escapeHTML(because));
    content = supplies + (page.saltScrap ? '<p class="ledger-tonight">Salt blocks worth 10 scrap.</p>' : '') +
      section('Promises and debts', page.obligations.map(escapeHTML), page.tonight?.obligations) +
      section('People you met', people, page.tonight?.people.length > 0) + section('What came of it', news) +
      section('Tonight', (page.memories ?? []).map(escapeHTML), true) +
      (page.toldBeforeChange ?? []).map(night => '<p>Night ' + escapeHTML(night) + ' was told before this changed.</p>').join('');
  }
  return '<article class="yard-home-intro story-ledger" aria-labelledby="ledger-title">' + title + content + '</article>';
}
