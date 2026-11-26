import runaway from '../../../story/threads/content/runaway.js';
import {nameRow} from '../register.js';
import {distance} from '../site-rule.js';
import {RUNAWAY_PLACES} from './runaway-places.js';
import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {validateTalkScene} from '../../../story/talk.js';
import {firstBeat, threadRule} from '../../../story/threads/thread-rule.js';
import {isSignAlive} from '../../../story/threads/signs.js';
import {namedThrow} from '../../../story/ledger.js';
import {feudOf} from '../open-record.js';
import {FEUD_WORDS} from '../register.js';
import {isHeld} from '../holds.js';
import {checkTalkRow, requireSound} from '../check-tables.js';

// The walker uses these rows before ordinary greetings. Scene text stays in the storyline.
export function threadTalkRows(threads) {
  const rows = threads.flatMap(thread => {
    const later = (thread.later ?? []).map(row => ({id: row.id, by: row.by, needs: row.when, scene: row.id}));
    if (thread.sign.kind !== 'words') return later;
    const id = `${thread.id}/heard-sign`;
    return [{id, by: thread.sign.by, scene: id, needs: {fact: 'thread', id: thread.id, at: firstBeat(thread)}}, ...later];
  });
  requireSound(rows, checkTalkRow, 'Storyline talk rows');
  return Object.freeze(Object.groupBy(rows, row => row.by));
}

const ambientRunaway = [
  ['price-up', 'clinker'], ['bowl-washer-caught', 'auntie-solder'], ['at-the-gate-same-dusk', 'clinker'],
  ['road-was-kind', 'nan-tallow'], ['road-was-not-kind', 'nan-tallow'],
  ...['rell', 'captain-imre', 'marigold', 'hetty', 'gasket'].map(by => ['who-told', by]),
];
const runawayRows = ambientRunaway.map(([id, by]) => ({
  id: 'runaway/' + by + '/' + id, by, scene: 'runaway/later/' + id, once: true,
  needs: id === 'who-told' ? {fact: 'mark', id: 'runaway/told-where'} :
    id.startsWith('road-was-') ? {fact: 'mark', id: 'runaway/sent-alone'} :
    runaway.later.find(row => row.id === id).when,
})).map(row => row.id.endsWith('/at-the-gate-same-dusk') ? {...row, needs: {fact: 'thread', id: 'runaway', at: 'prints'}} : row);
requireSound(runawayRows, checkTalkRow, 'The Runaway talk rows');

export const THREADS_TALK = threadTalkRows([burnedCamp]);
export const RUNAWAY_TALK = Object.freeze(Object.groupBy(runawayRows, row => row.by));

export function runawayTalkScene(id, context) {
  const record = context.world.open.threads.runaway;
  if (!record || !id.startsWith('runaway/later/')) return null;
  const row = runaway.later.find(row => row.id === id.slice('runaway/later/'.length));
  if (!row) return null;
  const {world, view} = context;
  const player = view.player?.position ?? view.player;
  const passed = world.ledger.night - record.began;
  let when = row.when;
  if (row.id === 'at-the-gate-same-dusk') {
    if (view.partOfDay !== 'dusk' || record.beat !== 'prints' || passed > 0 ||
        distance(player, RUNAWAY_PLACES['gate-entry']) > 8) return null;
    when = undefined;
  } else if (row.id === 'bowl-washer-caught') {
    if (passed < 2 || distance(player, RUNAWAY_PLACES.hearth) > 8) return null;
  } else if (row.id.startsWith('road-was-')) {
    if (passed < 2) return null;
    const rule = threadRule(runaway, context, record);
    if (!rule.ask({fact: 'mark', id: 'runaway/sent-alone'})) return null;
    const told = rule.ask({fact: 'mark', id: 'runaway/told-where'});
    const night = world.open.journal.findLast(change => change.choiceId === 'runaway/mission/road-out/nobody')?.night ?? record.began;
    const feud = Math.max(0, FEUD_WORDS.indexOf(feudOf(world, 'ash-men')));
    const kind = namedThrow(world, 'runaway/night-' + night + '/road-alone', told ? .25 : .5 - .08 * feud);
    if ((row.id === 'road-was-kind') !== kind) return null;
    when = undefined;
  }
  const rule = threadRule(runaway, context, record);
  if (!rule.ask(when)) return null;
  const leader = nameRow(record.cast.haven)?.leader;
  const lines = row.lines.map(line => ({...line, speaker: line.speaker === '{haven.leader}' ? leader : line.speaker,
    words: rule.line(line.words)}));
  const scene = {id, lines, choices: [{id, words: 'I hear you.'}]};
  validateTalkScene(scene);
  return scene;
}

// The host's scene resolver can call this for an offered row after checking its speaker and location.
export function openThreadTalkScene(id, context, threads = [burnedCamp]) {
  for (const thread of threads) {
    const record = context.world.open.threads[thread.id];
    if (!record) continue;
    const sign = thread.sign.kind === 'words' && id === `${thread.id}/heard-sign`;
    if (sign && (isHeld(context.holds ?? [], 'signs') || !isSignAlive(thread, record, context.world.ledger.night))) return null;
    const row = sign ? thread.beats[firstBeat(thread)] : thread.later?.find(row => row.id === id);
    if (!row) continue;
    const rule = threadRule(thread, context, record);
    if (!sign && !rule.ask(row.when)) return null;
    const lines = (row.lines ?? []).filter(line => rule.ask(line.when))
      .map(line => ({speaker: line.speaker, words: rule.line(line.words), radio: line.radio}));
    const scene = {id, lines, choices: [{id, words: 'I hear you.', effects: rule.effects(row.effects)}]};
    validateTalkScene(scene);
    return scene;
  }
  return null;
}
