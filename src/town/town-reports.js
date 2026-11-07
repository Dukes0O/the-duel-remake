import {TOWN_EVENT_BY_ID, townEventMatches} from './content/events.js';

const ANSWER_TICKS = 24 * 7;
const MAX_RESOLVED_REPORTS = 24;
const MAX_REPORT_EFFECTS = 24;

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
  const where = typeof facts.where === 'string' && facts.where.trim() ? facts.where.trim() : 'Town';
  const existing = reports.find(report => report.unanswered && report.eventId === eventId
    && String(report.where || 'Town').trim().toLowerCase() === where.toLowerCase());
  if (existing) {
    existing.what = `${event.what} ${typeof facts.detail === 'string' ? facts.detail.trim() : ''}`.trim();
    existing.where = where;
    existing.priority = event.priority;
    existing.bad = event.bad;
    existing.expiresTick = BigInt(town.tick) + BigInt(ANSWER_TICKS);
    existing.updatedTick = BigInt(town.tick);
    existing.facts = {...facts};
    existing.answers = event.answers.map(answer => ({...answer, effect:{type:eventId, answerId:answer.id, facts:{...facts}}}));
    return {ok: true, report: existing, updated: true};
  }
  if (event.bad && reports.filter(report => report.unanswered && report.bad).length >= 3)
    return {ok: false, message: 'Three urgent reports are already waiting for an answer.'};

  const report = {
    id: `report-${town.nextReportNumber++}`, eventId, who: event.who,
    what: `${event.what} ${typeof facts.detail === 'string' ? facts.detail.trim() : ''}`.trim(),
    where,
    priority: event.priority, bad: event.bad, createdTick: BigInt(town.tick),
    expiresTick: BigInt(town.tick) + BigInt(ANSWER_TICKS), unanswered: true,
    answers: event.answers.map(answer => ({...answer, effect:{type:eventId, answerId:answer.id, facts:{...facts}}})), outcome: null, facts: {...facts},
  };
  reports.push(report);
  trimTownReportHistory(town);
  return {ok: true, report};
}

function bookHoldsReport(town, report) {
  if (report.book === true || report.bookEntry === true || report.keepInBook === true) return true;
  return [...(town.book || []), ...(town.bookPages || [])]
    .some(entry => entry && typeof entry === 'object' && (entry.reportId === report.id || entry.id === report.id));
}

export function trimTownReportHistory(town) {
  const reports = reportsFor(town);
  const resolvedRoutine = reports.filter(report => !report.unanswered
    && TOWN_EVENT_BY_ID.has(report.eventId) && !bookHoldsReport(town, report));
  const retained = new Set(resolvedRoutine.slice(-MAX_RESOLVED_REPORTS));
  town.reports = reports.filter(report => report.unanswered || !TOWN_EVENT_BY_ID.has(report.eventId)
    || bookHoldsReport(town, report) || retained.has(report));
  if (Array.isArray(town.reportEffects) && town.reportEffects.length > MAX_REPORT_EFFECTS)
    town.reportEffects = town.reportEffects.slice(-MAX_REPORT_EFFECTS);
}

export function answerReport(town, reportId, answerId) {
  const report = reportsFor(town).find(item => item.id === reportId);
  if (!report) return {ok: false, message: 'That report is no longer here.'};
  if (!report.unanswered) return {ok: false, message: 'That report already has an answer.'};
  const answer = report.answers.find(item => item.id === answerId);
  if (!answer) return {ok: false, message: 'Choose one of the answers on the report.'};
  const effect = answer.effect;
  applyReportEffect(town, effect);
  report.unanswered = false;
  report.answeredTick = BigInt(town.tick);
  report.answerId = answer.id;
  report.outcome = answer.outcome;
  report.effect = effect;
  trimTownReportHistory(town);
  return {ok: true, report, message: answer.outcome};
}

function applyReportEffect(town, effect) {
  const facts = effect.facts || {};
  town.reportEffects ||= [];
  town.reportEffects.push({...effect});
  if (effect.type === 'sickness-in-town' && effect.answerId !== 'leave') {
    for (const person of town.people || []) {
      if (!facts.personIds || facts.personIds.includes(person.id)) person.health = Math.min(100, (person.health ?? 50) + 25);
    }
  } else if (effect.type === 'road-rat-raid' && effect.answerId === 'leave') {
    const stocks = Object.values(town.goods?.stockpiles || {});
    const stock = facts.stockpileKey ? town.goods?.stockpiles?.[facts.stockpileKey] : stocks.find(item => Object.keys(item.goods || {}).length);
    if (stock) {
      const good = facts.good || Object.keys(stock.goods || {})[0];
      const loss = Math.min(stock.goods?.[good] || 0, facts.amount || Math.max(1, Math.ceil((stock.goods?.[good] || 0) * 0.1)));
      if (loss) stock.goods[good] -= loss;
    }
  } else if (effect.type === 'fire-at-site' && effect.answerId === 'leave') {
    const site = (town.buildings || []).find(building => building.id === facts.siteId);
    if (site) site.fireDamage = Math.min(100, (site.fireDamage || 0) + 25);
  } else {
    town.conditions ||= {};
    town.conditions[`${effect.type}:${effect.answerId}`] = true;
  }
}

export function settleIgnoredReports(town) {
  const tick = BigInt(town.tick);
  for (const report of reportsFor(town)) {
    if (report.unanswered && tick >= BigInt(report.expiresTick)) answerReport(town, report.id, 'leave');
  }
  trimTownReportHistory(town);
}
