// Candidates only. Reservations survive uncertain responses; no automatic retry.
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { say, voices, credits } from './elevenlabs.mjs';
import { EVIDENCE_DIR } from './sourcing.mjs';
export const CANDIDATE_PLAN = [
  {
    id: 'rook',
    voice: 'Harry',
    text: 'Road is clear. Keep your wheels under you.',
  },
  { id: 'nell', voice: 'Alice', text: 'Give me a gap. I will make it wider.' },
  {
    id: 'jax',
    voice: 'Liam',
    text: 'Close the distance. I will catch the rest.',
  },
  {
    id: 'odessa',
    voice: 'Matilda',
    text: 'Hold still. This engine has one more run in it.',
  },
  { id: 'cinder', voice: 'Jessica', text: 'That road is mine. Keep moving.' },
  { id: 'dune', voice: 'George', text: 'One clean shot. Keep the car steady.' },
  {
    id: 'wren',
    voice: 'Lily',
    text: 'Clear path on the left. Follow my dust.',
  },
  {
    id: 'tusk',
    voice: 'Bill',
    text: 'Too much scrap in the way. I will shift it.',
  },
  {
    id: 'raider-harry',
    voice: 'Harry',
    text: 'Turn around, driver. This road has a toll.',
  },
  {
    id: 'raider-bill',
    voice: 'Bill',
    text: 'Turn around, driver. This road has a toll.',
  },
];
const ledgerPath = join(EVIDENCE_DIR, 'voices', 'aud-17-candidates.json');
function load() {
  return existsSync(ledgerPath)
    ? JSON.parse(readFileSync(ledgerPath, 'utf8'))
    : { version: 1, entries: [] };
}
function save(ledger) {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath + '.tmp', JSON.stringify(ledger, null, 2) + '\n');
  renameSync(ledgerPath + '.tmp', ledgerPath);
}
export async function generateCandidates(
  { plan = CANDIDATE_PLAN, budget = 1500 } = {},
  deps = {},
) {
  const io = {
    load,
    save,
    say,
    voices,
    credits,
    wait: () => new Promise((resolve) => setTimeout(resolve, 30000)),
    ...deps,
  };
  if (!Number.isInteger(budget) || budget < 1 || budget > 1500)
    throw Error('Budget must be 1..1500 credits.');
  if (
    !Array.isArray(plan) ||
    plan.some(
      (p) => !p.id || !p.voice || typeof p.text !== 'string' || !p.text.length,
    ) ||
    new Set(plan.map((p) => p.id)).size !== plan.length
  )
    throw Error('Invalid candidate plan.');
  if (plan.reduce((n, p) => n + p.text.length, 0) > budget)
    throw Error('Candidate plan exceeds credit budget.');
  const ledger = io.load();
  if (ledger.version !== 1 || !Array.isArray(ledger.entries))
    throw Error('Invalid candidate ledger.');
  const cast = await io.voices();
  const resolved = plan.map((p) => {
    const voice = cast.find(
      (v) => v.name === p.voice || v.name.startsWith(p.voice + ' '),
    );
    if (!voice) throw Error('Stock voice unavailable: ' + p.voice);
    return { ...p, voiceId: voice.id };
  });
  for (const p of resolved) {
    const old = ledger.entries.find((e) => e.id === p.id);
    if (old) {
      if (old.text !== p.text || old.voiceId !== p.voiceId)
        throw Error('Candidate plan changed: ' + p.id);
      if (old.status !== 'candidate')
        throw Error(
          'Uncertain candidate reservation; inspect saved evidence before any manual retry.',
        );
      continue;
    }
    const used = ledger.entries.reduce((n, e) => n + e.reserved, 0);
    if (used + p.text.length > budget)
      throw Error('Remaining session credit budget is insufficient.');
    const balance = await io.credits();
    if (!Number.isFinite(balance.left) || balance.left < p.text.length)
      throw Error('Insufficient or unavailable account credits.');
    const entry = { ...p, reserved: p.text.length, status: 'reserved' };
    ledger.entries.push(entry);
    io.save(ledger);
    let result;
    try {
      result = await io.say({
        voice: p.voiceId,
        line: 'aud17-candidate-' + p.id,
        text: p.text,
        model: 'eleven_multilingual_v2',
        keep: false,
        settings: { stability: 0.4, similarity: 0.8, style: 0.35 },
      });
    } catch {
      throw Error(
        'Uncertain generation; reservation retained. Do not retry automatically.',
      );
    }
    entry.status = 'candidate';
    entry.path = result.path;
    entry.receipt = result.entry;
    entry.accountingWarning = result.accountingWarning || null;
    entry.reserved = Math.max(
      entry.reserved,
      Number(result.entry.creditsUsed) || entry.reserved,
    );
    io.save(ledger);
    if (ledger.entries.reduce((n, e) => n + e.reserved, 0) > budget)
      throw Error(
        'Measured usage exceeded budget; stop and review accounting.',
      );
    if (p !== resolved.at(-1)) await io.wait();
  }
  return ledger;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv[2] !== '--generate')
    throw Error('Generation requires --generate. Candidates only, never keep.');
  const result = await generateCandidates();
  console.log(
    JSON.stringify(
      {
        candidates: result.entries.length,
        reservedCredits: result.entries.reduce((n, e) => n + e.reserved, 0),
        ledger: ledgerPath,
      },
      null,
      2,
    ),
  );
}
