// The Lab's taught words, turned into word buttons inside sentences (docs/LAB.md 12.2). Titles and names are never broken up:
// a heading or an element marked data-name is left whole (LEFT_WHOLE), and so is a lesson or upgrade name written inside a
// sentence ("Lift and weight passed."). Pure strings in, strings out.
import {LAB_LESSONS} from './lab-lessons.js';
import {LAB_UPGRADES} from './lab-shop.js';

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pattern = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Text inside any of these is not touched.
export const LEFT_WHOLE = '[data-word],[data-name],h1,h2,h3,h4,h5,h6,select,script,style';

// words: [{id, word}]. interactive false draws an underline instead of a button (the text is already inside a button).
export function wordMarkup(text, words, interactive = true) {
  const sorted = [...words].sort((a, b) => b.word.length - a.word.length);
  if (!sorted.length) return escape(text);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${sorted.map(w => pattern(w.word)).join('|')})(?![\\p{L}\\p{N}])`, 'giu');
  let html = '', start = 0;
  for (const match of String(text).matchAll(re)) {
    const word = sorted.find(w => w.word.toLowerCase() === match[0].toLowerCase());
    html += escape(text.slice(start, match.index)) + (interactive ? `<button type="button" class="lab-word" data-word="${word.id}">${escape(match[0])}</button>` : `<u class="lab-word" data-word="${word.id}">${escape(match[0])}</u>`);
    start = match.index + match[0].length;
  }
  return html + escape(String(text).slice(start));
}

const names = [...LAB_LESSONS, ...LAB_UPGRADES].map(item => item.name).sort((a, b) => b.length - a.length);
const namesRe = new RegExp(`(${names.map(pattern).join('|')})`);

// A sentence: a lesson or upgrade name in it stays whole, and the taught words around it become buttons.
export const sentenceMarkup = (text, words, interactive = true) =>
  String(text).split(namesRe).map((part, i) => i % 2 ? escape(part) : wordMarkup(part, words, interactive)).join('');
