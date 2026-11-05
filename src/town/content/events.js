import {REPORT_TEXT} from './report-text.js';

export const TOWN_EVENTS = Object.freeze(Object.entries(REPORT_TEXT).map(([id, row]) => Object.freeze({id, ...row})));
export const TOWN_EVENT_BY_ID = new Map(TOWN_EVENTS.map(event => [event.id, event]));

export function townEventMatches(event, facts) {
  if (!event || !facts || typeof facts !== 'object') return false;
  return Object.entries(event.requires).every(([key, value]) => facts[key] === value);
}
