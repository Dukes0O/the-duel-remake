import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultFolder = fileURLToPath(
  new URL('../../docs/board/listening/', import.meta.url),
);
export function validateVerdict(input) {
  if (!input || input.schema !== 1) throw Error('Unsupported verdict schema');
  if (!/^AUD-[A-Z0-9-]{1,30}$/.test(input.card || ''))
    throw Error('Invalid audio card');
  if (!Number.isInteger(input.round) || input.round < 1 || input.round > 99)
    throw Error('Invalid round');
  if (
    !/^[a-z][a-z0-9.-]{1,79}$/.test(input.cue || '') ||
    input.cue.includes('..')
  )
    throw Error('Invalid cue');
  if (!['A', 'B', 'C'].includes(input.variant)) throw Error('Choose A, B or C');
  if (!['near', 'far'].includes(input.distance))
    throw Error('Choose near or far');
  if (!['full-throttle', 'quiet'].includes(input.bed))
    throw Error('Choose the listening bed');
  if (
    typeof input.listener !== 'string' ||
    !input.listener.trim() ||
    input.listener.length > 80
  )
    throw Error('Enter the listener name');
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
    throw Error('Choose an explicit rating from 1 to 5');
  if (typeof input.notes !== 'string' || input.notes.length > 4000)
    throw Error('Notes must be at most 4000 characters');
  return {
    schema: 1,
    card: input.card,
    round: input.round,
    cue: input.cue,
    variant: input.variant,
    distance: input.distance,
    bed: input.bed,
    listener: input.listener.trim(),
    rating: input.rating,
    notes: input.notes,
  };
}
export async function saveVerdict(input, folder = defaultFolder) {
  const verdict = {
    ...validateVerdict(input),
    reviewedAt: new Date().toISOString(),
    requiresHumanListening: false,
  };
  const file = `${verdict.card.toLowerCase()}-round-${verdict.round}-${randomUUID()}.json`;
  await mkdir(folder, { recursive: true });
  await writeFile(join(folder, file), JSON.stringify(verdict, null, 2) + '\n', {
    flag: 'wx',
  });
  return { file, verdict };
}
