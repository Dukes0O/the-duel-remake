// Rebuild the local candidate listening page; never calls a service or keeps a take.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { EVIDENCE_DIR, sha256 } from './sourcing.mjs';
import { measureLoudness } from './measurements.mjs';
const folder = join(EVIDENCE_DIR, 'voices');
const ledger = JSON.parse(
  readFileSync(join(folder, 'aud-17-candidates.json'), 'utf8'),
);
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const rows = ledger.entries
  .filter((e) => e.status === 'candidate')
  .map((e) => {
    const bytes = readFileSync(e.path);
    if (sha256(bytes) !== e.receipt.sha256)
      throw Error('Candidate changed: ' + e.id);
    return { ...e, measured: measureLoudness(bytes) };
  });
const html =
  '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>The Duel � voice candidates</title><style>body{background:#171b20;color:#eee4d2;font:17px system-ui;max-width:880px;margin:40px auto;padding:0 20px}h1{color:#e1a468}article{border-top:1px solid #56606a;padding:20px 0}audio{width:100%}small{color:#b3bec9}</style><h1>Voice candidates</h1><p>None selected or kept. These are dry casting auditions; runtime voices have not changed.</p><p>Generated with ElevenLabs stock voices. Human ratings pending.</p>' +
  rows
    .map(
      (e) =>
        '<article><h2>' +
        escape(e.id) +
        ' � ' +
        escape(e.voice) +
        '</h2><p>' +
        escape(e.text) +
        '</p><audio controls preload="none" src="' +
        escape(basename(e.path)) +
        '"></audio><p><small>' +
        e.measured.integratedLufs +
        ' LUFS � ' +
        e.measured.truePeakDbtp +
        ' dBTP</small></p></article>',
    )
    .join('');
writeFileSync(join(folder, 'listen.html'), html + '\n');
console.log(
  'Candidate listening page rebuilt; ' +
    rows.length +
    ' takes, no service calls.',
);
