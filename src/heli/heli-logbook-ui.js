// The hut shelf reads the session's view. Its buttons ask the session to act.
import {RANKS} from './heli-logbook.js';
import {atHomePad} from './heli-board.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const pageText = text => esc(text).replaceAll('Marguerite', '<i>Marguerite</i>');

export function shelfMarkup(view) {
  const book = view?.logbook;
  if (!book || !atHomePad(view)) return '';
  const rank = book.notice;
  const notice = rank ? `<article class="heli-rank" aria-live="polite"><h3>${esc(rank.name)}</h3><p>${esc(rank.real)}</p>` +
    (rank.roger ? `<p>Roger: “${esc(rank.roger)}”</p>` : '') +
    (rank.id === 'private' ? '<p>Brian: “Roger’s jobs count as supervised training flights until you have your commercial licence.”</p>' : '') +
    (rank.id === 'chief' ? '<p>Ana: “With Gus’s last page I know where the <i>Marguerite</i> lies, deeper than any car can go. The field station has a small submarine.”</p>' : '') +
    `<p>New paint: ${esc(rank.paint)}.</p><button type="button" data-logbook-dismiss>Continue</button></article>` : '';
  const books = book.books.map(page => `<details class="heli-gus-page"><summary>Gus Lindqvist · ${page.year}</summary><p>${pageText(page.text)}</p></details>`).join('');
  const paints = RANKS.slice(0, book.awarded).map(r => `<button type="button" data-logbook-paint="${r.skin}"${book.paint === r.skin ? ' disabled' : ''}>${esc(r.name)}${book.paint === r.skin ? ' · wearing' : ''}</button>`).join('');
  return `${notice}<section class="heli-shelf"><h3>THE SHELF</h3><p>${esc(book.rank?.name ?? 'Pilot in training')} · ${book.flights} flights</p>` +
    `<details><summary>Your logbook</summary><p>Completed jobs: ${Object.entries(book.jobs).filter(([kind]) => ['car', 'crate', 'fire', 'rescue', 'ski'].includes(kind)).map(([kind, count]) => `${esc(kind)} ${count}`).join(' · ')}.</p><p>Places visited: ${book.visited.length}.</p></details>` +
    books + (books ? '' : '<p>Gus’s books wait here as you earn your pilot ranks.</p>') +
    (paints ? `<details><summary>Your paints</summary>${paints}</details>` : '') + '</section>';
}
