import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {validateTalkScene} from '../../../story/talk.js';
import {firstBeat, threadRule} from '../../../story/threads/thread-rule.js';
import {isSignAlive} from '../../../story/threads/signs.js';
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

export const THREADS_TALK = threadTalkRows([burnedCamp]);

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
