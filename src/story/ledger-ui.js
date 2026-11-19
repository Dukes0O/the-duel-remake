// The view receives the part of the ledger someone at the hearth can know.
export function playLedgerPageTurn(audio) {
  if (audio?.context?.state === 'running' && !audio.muted) audio._playCue('story.ledger.open');
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
      section('Tonight', (page.memories ?? []).map(escapeHTML), true);
  }
  return '<article class="yard-home-intro story-ledger" aria-labelledby="ledger-title">' + title + content + '</article>';
}
