import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ffmpeg } from './audio/codec.mjs';
const manifest = JSON.parse(
  readFileSync(new URL('./audio/runtime-pcm.json', import.meta.url)),
);
for (const row of manifest.files) {
  const file = new URL('../public/assets/audio/' + row.file, import.meta.url);
  const bytes = readFileSync(file);
  const staged = execFileSync(
    'git',
    ['show', ':public/assets/audio/' + row.file],
    { maxBuffer: 16000000, windowsHide: true },
  );
  assert(
    bytes.equals(staged),
    row.file + ': staged bytes must not be text-normalized',
  );
  assert.equal(bytes.toString('ascii', 0, 4), 'fLaC');
  const pcm = ffmpeg(['-i', 'pipe:0', '-f', 's16le', 'pipe:1'], {
    input: bytes,
  });
  assert.equal(
    createHash('sha256').update(pcm).digest('hex'),
    row.pcmSha256,
    row.file + ': decoded PCM identical to pre-migration baseline',
  );
  assert.equal(
    pcm.length / 2,
    row.samples,
    row.file + ': loop sample count unchanged',
  );
}
console.log(
  '14 compressed runtime sounds preserve baseline PCM and loop sample counts exactly.',
);

const catalog = JSON.parse(
  readFileSync(new URL('./audio/catalog.json', import.meta.url)),
);
for (const row of catalog.sounds.filter((row) =>
  row.file.startsWith('audio-src/'),
)) {
  const bytes = readFileSync(new URL('../' + row.file, import.meta.url));
  const staged = execFileSync('git', ['show', ':' + row.file], {
    maxBuffer: 16000000,
    windowsHide: true,
  });
  assert(bytes.equals(staged), row.file + ': source bytes preserved in Git');
  assert.equal(
    createHash('sha256').update(staged).digest('hex'),
    row.sha256,
    row.file + ': catalog checksum',
  );
}
