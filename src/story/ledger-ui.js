// The view receives the part of the ledger someone at the hearth can know.
export function ledgerPageMarkup(page, escapeHTML) {
  const title = '<h3 id="ledger-title">What people remember</h3>';
  const section = (subtitle, items) => items.length
    ? '<section><h4>' + subtitle + '</h4><ul>' + items.map(item => '<li>' + item + '</li>').join('') + '</ul></section>'
    : '';
  let content = '<p>Your story has yet to begin.</p>';
  if (page) {
    const supplies = '<p>' + page.embers + (page.embers === 1 ? ' ember' : ' embers') + ' and ' +
      page.gas + ' gas in store. Enough for ' + page.nights + (page.nights === 1 ? ' night.' : ' nights.') + '</p>';
    const people = page.people.map(({name, last}) => '<strong>' + escapeHTML(name) + '</strong> ' + escapeHTML(last));
    const news = page.consequences.map(({text, because}) => escapeHTML(text) + ' ' + escapeHTML(because));
    content = supplies + section('Promises and debts', page.obligations.map(escapeHTML)) +
      section('People you met', people) + section('What came of it', news);
  }
  return '<article class="yard-home-intro story-ledger" aria-labelledby="ledger-title">' + title + content + '</article>';
}
