import {TOWN_EVENT_BY_ID, townEventMatches} from './content/events.js';

const ANSWER_TICKS = 24 * 7;

function reportsFor(town) {
  if (!Array.isArray(town.reports)) town.reports = [];
  if (!Number.isSafeInteger(town.nextReportNumber) || town.nextReportNumber < 1) town.nextReportNumber = 1;
  return town.reports;
}

export function townReports(town) {
  return [...reportsFor(town)].sort((a, b) => Number(b.unanswered) - Number(a.unanswered)
    || b.priority - a.priority || (BigInt(b.createdTick) > BigInt(a.createdTick) ? 1
      : BigInt(b.createdTick) < BigInt(a.createdTick) ? -1 : b.id.localeCompare(a.id)));
}

export function raiseTownReport(town, eventId, facts = {}) {
  const event = TOWN_EVENT_BY_ID.get(eventId);
  if (!event || !townEventMatches(event, facts)) return {ok: false, message: 'That event does not match the town.'};
  const reports = reportsFor(town);
  if (reports.some(report => report.unanswered && report.eventId === eventId)) return {ok: false, message: 'That report is already waiting for an answer.'};
  if (event.bad && reports.filter(report => report.unanswered && report.bad).length >= 3)
    return {ok: false, message: 'Three urgent reports are already waiting for an answer.'};

  const report = {
    id: `report-${town.nextReportNumber++}`, eventId, who: event.who,
    what: `${event.what} ${typeof facts.detail === 'string' ? facts.detail.trim() : ''}`.trim(),
    where: typeof facts.where === 'string' && facts.where.trim() ? facts.where.trim() : 'Town',
    priority: event.priority, bad: event.bad, createdTick: BigInt(town.tick),
    expiresTick: BigInt(town.tick) + BigInt(ANSWER_TICKS), unanswered: true,
    answers: event.answers.map(answer => ({...answer})), outcome: null,
  };
  reports.push(report);
  return {ok: true, report};
}

export function answerReport(town, reportId, answerId) {
  const report = reportsFor(town).find(item => item.id === reportId);
  if (!report) return {ok: false, message: 'That report is no longer here.'};
  if (!report.unanswered) return {ok: false, message: 'That report already has an answer.'};
  const answer = report.answers.find(item => item.id === answerId);
  if (!answer) return {ok: false, message: 'Choose one of the answers on the report.'};
  report.unanswered = false;
  report.answeredTick = BigInt(town.tick);
  report.answerId = answer.id;
  report.outcome = answer.outcome;
  return {ok: true, report, message: answer.outcome};
}

export function settleIgnoredReports(town) {
  const tick = BigInt(town.tick);
  for (const report of reportsFor(town)) {
    if (report.unanswered && tick >= BigInt(report.expiresTick)) answerReport(town, report.id, 'leave');
  }
}
