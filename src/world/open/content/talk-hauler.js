import hauler from '../../../story/threads/content/stranded-hauler.js';
import {threadRule, mark} from '../../../story/threads/thread-rule.js';
import {haulerAtGate, haulerMarked} from './stranded-hauler-places.js';

export const HAULER_TALK = Object.groupBy(hauler.later.filter(row => row.by !== 'sumps-rider').map(row => ({by: row.by,
  scene: hauler.id + '/later/' + row.id, once: true,
  needs: {fact: 'thread', id: hauler.id, at: 'any'}})), row => row.by);

export function haulerTalkScene(id, context) {
  const record = context.world.open.threads[hauler.id];
  if (!record) return null;
  const rule = threadRule(hauler, context, record);
  const later = hauler.later.find(row => id === hauler.id + '/later/' + row.id);
  if (!later || !rule.ask(later.when) || haulerMarked(context.world, 'said/' + later.id)) return null;
  if (['tally-told-sump-of-the-ridge', 'tally-told-sump-of-the-fire'].includes(later.id) &&
      (!haulerAtGate(context.world) || !record.end)) return null;
  if (later.id === 'dot-on-tallys-late-flour' && !haulerMarked(context.world, 'never-stopped-for-her') &&
      !haulerMarked(context.world, 'drove-past-her')) return null;
  const effects = [...rule.effects(later.effects), mark(hauler.id + '/said/' + later.id)];
  const fill = row => ({...row, words: rule.line(row.words)});
  const reopened = hauler.notes.laterReopens[later.id];
  const beat = reopened && hauler.beats[reopened];
  return {id, lines: [...later.lines, ...(beat?.lines ?? [])].map(fill),
    ...(beat ? {questions: beat.questions.map(fill)} : {}),
    choices: beat ? beat.choices.map(row => ({id: id + '/' + row.id, words: row.words,
      effects: [...effects, ...rule.effects(row.effects)]})) : [{id, words: 'I hear you.', effects}]};
}

export function haulerGateNews(context) {
  const record = context.world.open.threads[hauler.id], rule = threadRule(hauler, context, record);
  const beat = hauler.beats.gate;
  const questions = beat.questions.filter(row => rule.ask(row.when)).map(row => ({...row,
    words: rule.line(row.words), lines: row.lines.map(line => ({...line, words: rule.line(line.words)})),
    effects: rule.effects(row.effects)}));
  return {id: hauler.id + '/gate-news', questions, lines: [], choices: [{id: hauler.id + '/gate-news/done', words: 'I hear you.'}]};
}
