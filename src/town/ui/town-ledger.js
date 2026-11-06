const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const amount = value => {
  if (typeof value === 'bigint') return value.toLocaleString('en');
  return Number.isSafeInteger(value) ? value.toLocaleString('en') : '0';
};
const ACCOUNT_LABELS = Object.freeze({
  cash:'Town cash', 'grant-income':'Founding grant', 'opening-equity':'Starting balance', 'rent-income':'Home rent',
  'shop-income':'Shop sales', 'ticket-income':'Ticket sales', 'protection-income':'Protection payments', 'scrap-in':'Scrap put in',
  'scrap-out':'Scrap taken out', 'levy-income':'Withdrawal levy', 'wages-expense':'Wages', 'upkeep-expense':'Building upkeep',
  'interest-expense':'Loan interest', 'loan-payable':'Loan balance',
});
const accountName = key => ACCOUNT_LABELS[key] || String(key).replaceAll('-', ' ');
function total(value) { return typeof value === 'bigint' ? value : Number.isSafeInteger(value) ? BigInt(value) : 0n; }

export function townLedgerModel(town, {period = 'year', year = String(town?.calendar?.year ?? 1), month = town?.calendar?.month, profile=null, canTrade=true, shortfall=0} = {}) {
  const money = town?.money || {};
  const key = period === 'month' ? `${year}-${String(month ?? 1).padStart(2, '0')}` : String(year);
  const entries = Array.isArray(money.entries) ? money.entries.filter(entry => String(entry.year) === String(year) && (period !== 'month' || Number(entry.month) === Number(month))).map(entry => ({
    from:accountName(entry.credit), to:accountName(entry.debit), amount:amount(entry.amount), reason:String(entry.kind || 'Town money movement'),
  })) : [];
  const bucket = (period === 'month' ? money.months?.[key] : money.years?.[key]) || {income:0n, expense:0n};
  const balances = Object.entries(money.balances || {}).map(([name, balance]) => ({name:accountName(name), paidIn:amount(balance?.debit), paidOut:amount(balance?.credit)}));
  const debit = balances.reduce((sum, item) => sum + total(item.paidIn.replaceAll(',', '')), 0n);
  const credit = balances.reduce((sum, item) => sum + total(item.paidOut.replaceAll(',', '')), 0n);
  const till = total(town?.till);
  const loans = total(money.loans);
  const wallet=total(profile?.wasteland?.scrap);
  return {period, year:String(year), month:period === 'month' ? Number(month ?? 1) : null, entries,
    income:amount(bucket.income), expense:amount(bucket.expense), till:amount(till), loans:amount(loans), net:amount(till - loans),
    balanced:debit === credit, balances, wallet:amount(wallet), tillShortfall:amount(total(shortfall)), canTrade};
}

export function townLedgerMarkup(model) {
  const period = model.period === 'month' ? `Month ${model.month}, Year ${escapeHtml(model.year)}` : `Year ${escapeHtml(model.year)}`;
  const entries = model.entries.length ? model.entries.map(entry => `<tr><td>${escapeHtml(entry.from)}</td><td>${escapeHtml(entry.to)}</td><td>${escapeHtml(entry.amount)} scrap</td><td>${escapeHtml(entry.reason)}</td></tr>`).join('') : '<tr><td colspan="4">No money was recorded for this period.</td></tr>';
  const balances = model.balances.length ? `<section><h3>Account totals</h3><p>The town records each movement in two accounts. The totals on both sides must match.</p><table><thead><tr><th>Account</th><th>Paid in</th><th>Paid out</th></tr></thead><tbody>${model.balances.map(item => `<tr><th scope="row">${escapeHtml(item.name)}</th><td>${escapeHtml(item.paidIn)} scrap</td><td>${escapeHtml(item.paidOut)} scrap</td></tr>`).join('')}</tbody></table></section>` : '';
  const controls=model.canTrade?`<section aria-label="Move scrap between your wallet and the town till"><h3>Move scrap</h3><p>Your scrap: ${escapeHtml(model.wallet)}. Town till: ${escapeHtml(model.till)}.</p><button type="button" data-town-till-in="100">Put in 100 scrap</button><button type="button" data-town-till-in="1000">Put in 1,000 scrap</button><button type="button" data-town-till-in="${model.tillShortfall}"${Number(model.tillShortfall)>0?'':' disabled'}>Put in enough to clear the shortfall</button><p>Taking out 100 scrap gives you 50 scrap. Hollis keeps 50 scrap as the town levy.</p><button type="button" data-town-till-out="100">Take out 100 scrap. You get 50.</button></section>`:'';
  return `<section class="town-ledger" aria-labelledby="town-ledger-title"><h2 id="town-ledger-title">The Town Ledger</h2><button type="button" data-town-ledger-close>Close Ledger</button><p>${period}. These are the town's recorded money movements.</p><dl><dt>Income</dt><dd>${escapeHtml(model.income)} scrap</dd><dt>Expenses</dt><dd>${escapeHtml(model.expense)} scrap</dd><dt>In the till</dt><dd>${escapeHtml(model.till)} scrap</dd><dt>Loans owed</dt><dd>${escapeHtml(model.loans)} scrap</dd><dt>Town value after loans</dt><dd>${escapeHtml(model.net)} scrap</dd></dl><p>The town value is the money in the till minus the money owed on loans.</p><p role="status">${model.balanced ? 'The Ledger balances. The money recorded in both accounts is equal.' : 'The Ledger does not balance yet. Please check the town records.'}</p>${controls}<table><thead><tr><th>Paid from</th><th>Paid into</th><th>Amount</th><th>Reason</th></tr></thead><tbody>${entries}</tbody></table>${balances}</section>`;
}
