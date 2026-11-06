const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function tick(value) { try { return BigInt(value ?? 0); } catch { return 0n; } }

export function townBookViewModel(town) {
  const savedPages = Array.isArray(town?.bookPages) ? town.bookPages.map(page => ({
    year:String(page.year ?? '1'), text:String(page.text || ''), entries:Array.isArray(page.entries) ? page.entries.map(String) : [], chronicle:[],
  })) : [];
  const pages = [...savedPages];
  const yearly = new Map(savedPages.map(page => [page.year, page]));
  for (const event of Array.isArray(town?.book) ? town.book : []) {
    const year = (tick(event?.tick) / 8640n + 1n).toString();
    let page = yearly.get(year);
    if (!page) {
      page = {year, text:'', entries:[], chronicle:[]};
      yearly.set(year, page);
    }
    page.chronicle.push(String(event?.text || 'Something happened in the town.'));
  }
  pages.splice(0, pages.length, ...yearly.values());
  pages.sort((a, b) => {
    try { const left = BigInt(a.year), right = BigInt(b.year); return left < right ? -1 : left > right ? 1 : 0; }
    catch { return String(a.year).localeCompare(String(b.year)); }
  });
  return {townName:String(town?.name || 'The Town'), pages};
}

export function townBookViewMarkup(model) {
  const pages = model.pages.length ? model.pages.map(page => `<article class="town-book-page"><h3>Year ${escapeHtml(page.year)}</h3>${page.text ? `<p>${escapeHtml(page.text)}</p>` : ''}${page.entries.length ? `<ul>${page.entries.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : ''}${page.chronicle.length ? `<section><h4>What happened</h4><ul>${page.chronicle.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul></section>` : ''}</article>`).join('') : '<p>The town has not written its first page yet.</p>';
  return `<section class="town-book" aria-labelledby="town-book-title"><h2 id="town-book-title">The Book of ${escapeHtml(model.townName)}</h2><p>The Book keeps the town's years and the people who made them.</p>${pages}</section>`;
}
