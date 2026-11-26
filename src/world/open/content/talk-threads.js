import burnedCamp from '../../../story/threads/content/burned-camp.js';
import {firstBeat} from '../../../story/threads/thread-rule.js';
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
