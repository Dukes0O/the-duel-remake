const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function tick(value) {
  try { return BigInt(value ?? 0); } catch { return 0n; }
}

export function townReportsPanelModel(town) {
  const reports = [...(Array.isArray(town?.reports) ? town.reports : [])]
    .sort((a, b) => Number(Boolean(b.unanswered)) - Number(Boolean(a.unanswered))
      || (Number(b.priority) || 0) - (Number(a.priority) || 0)
      || (tick(b.createdTick) > tick(a.createdTick) ? 1 : tick(b.createdTick) < tick(a.createdTick) ? -1 : String(b.id).localeCompare(String(a.id))));
  return reports.map(report => ({
    id:String(report.id ?? ''), who:String(report.who || 'Town report'), what:String(report.what || 'Something needs attention.'),
    where:String(report.where || 'Town'), unanswered:report.unanswered === true, priority:Number(report.priority) || 0,
    x:Number.isSafeInteger(report.x) ? report.x : Number.isSafeInteger(report.facts?.x) ? report.facts.x : null,
    z:Number.isSafeInteger(report.z) ? report.z : Number.isSafeInteger(report.facts?.z) ? report.facts.z : null,
    answers:Array.isArray(report.answers) ? report.answers.map(answer => ({id:String(answer.id ?? ''), label:String(answer.label || 'Choose this answer.')})) : [],
  }));
}

export function townReportsPanelMarkup(reports) {
  if (!reports.length) return '<section class="town-reports-panel" aria-labelledby="town-reports-title"><h2 id="town-reports-title">Reports</h2><p>No reports need attention.</p></section>';
  return `<section class="town-reports-panel" aria-labelledby="town-reports-title"><h2 id="town-reports-title">Reports</h2>${reports.map(report => {
    const route = report.x === null || report.z === null ? '' : ` data-town-focus-x="${report.x}" data-town-focus-z="${report.z}"`;
    const focus = `<button type="button" data-town-focus-report="${escapeHtml(report.id)}"${route} aria-label="Why? Show ${escapeHtml(report.where)} on the map">Why? Show ${escapeHtml(report.where)} on the map</button>`;
    const answers = report.unanswered ? `<ul>${report.answers.map(answer => `<li><button type="button" data-town-report-id="${escapeHtml(report.id)}" data-town-report-answer="${escapeHtml(answer.id)}">${escapeHtml(answer.label)}</button></li>`).join('')}</ul>` : '<p>This report has an answer.</p>';
    return `<article class="town-report" data-town-report="${escapeHtml(report.id)}"><h3>${escapeHtml(report.what)}</h3><p>${escapeHtml(report.who)} has reported this at ${escapeHtml(report.where)}.</p><p><strong>Why?</strong> ${escapeHtml(report.what)}</p>${focus}${answers}</article>`;
  }).join('')}</section>`;
}

export function bindTownReportsPanel(root, {onCommand = () => {}, onFocus = () => {}} = {}) {
  const click = event => {
    const answer = event.target?.closest?.('[data-town-report-answer]');
    if (answer) {
      onCommand({type:'answerReport', reportId:answer.dataset.townReportId, answerId:answer.dataset.townReportAnswer});
      return;
    }
    const focus = event.target?.closest?.('[data-town-focus-report]');
    if (focus) onFocus({reportId:focus.dataset.townFocusReport, x:focus.dataset.townFocusX === undefined ? null : Number(focus.dataset.townFocusX), z:focus.dataset.townFocusZ === undefined ? null : Number(focus.dataset.townFocusZ)});
  };
  root.addEventListener('click', click);
  return () => root.removeEventListener('click', click);
}
