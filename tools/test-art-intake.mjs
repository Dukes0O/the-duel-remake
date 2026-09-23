import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { deflateSync } from 'node:zlib';
import { checkArtIntake, inspectPng } from './art-intake.mjs';

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, payload) {
  const name = Buffer.from(type), length = Buffer.alloc(4), crc = Buffer.alloc(4);
  length.writeUInt32BE(payload.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, payload])));
  return Buffer.concat([length, name, payload, crc]);
}
function png(width, height, alpha = 0) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = y * (width * 4 + 1) + 1 + x * 4;
    raw.set([40, 80, 120, alpha], offset);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const root = mkdtempSync(join(tmpdir(), 'duel-art-intake-'));
if (!resolve(root).startsWith(resolve(tmpdir()) + sep)) throw Error('temporary test folder escaped the system temp directory');
const file = 'public/assets/textures/probe.png';
const item = { file, width: 1, height: 1, transparent: true, maxBytes: 1024,
  credits: 'public/assets/textures/CREDITS.md' };
const assetPath = join(root, file), creditsPath = join(root, item.credits);
const provenancePath = join(root, 'docs/WASTELAND_ART.md');
const prompt = 'Create an original transparent effect sprite for a racing game with clear edges, muted warm colors, no text, no logo, no background, and a readable silhouette at speed.';
const provenance = `# Art\n\n## ${file}\nDate: 2026-09-23\nTool: Codex image generation\nUse: Test effect sprite\nPrompt:\n> ${prompt}\n`;
const check = options => checkArtIntake({ root, catalog: [item], ...options });

try {
  mkdirSync(dirname(assetPath), { recursive: true });
  mkdirSync(dirname(provenancePath), { recursive: true });
  assert.deepEqual(check().failures, [], 'planned image can be absent while art is in progress');
  assert.deepEqual(check().missingPlanned, [file]);

  writeFileSync(assetPath, png(1, 1, 0));
  writeFileSync(provenancePath, provenance);
  writeFileSync(creditsPath, 'probe.png: original Codex generated sprite.');
  assert.deepEqual(check().failures, [], 'complete transparent asset and provenance pass');
  assert.equal(inspectPng(readFileSync(assetPath)).hasTransparentPixels, true);

  writeFileSync(assetPath, png(1, 1, 255));
  assert.ok(check().failures.some(failure => failure.includes('transparent pixels')),
    'an opaque RGBA image is rejected');
  writeFileSync(assetPath, png(2, 1, 0));
  assert.ok(check().failures.some(failure => failure.includes('dimensions')),
    'wrong atlas dimensions are rejected');
  writeFileSync(assetPath, png(1, 1, 0));
  writeFileSync(provenancePath, '# Art\n');
  assert.ok(check().failures.some(failure => failure.includes('full prompt')),
    'image without its recorded prompt is rejected');
  writeFileSync(provenancePath, provenance);
  writeFileSync(creditsPath, '# Credits\n');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'uncredited image is rejected');
  writeFileSync(creditsPath, 'probe.png: original Codex generated sprite.');
  assert.ok(check({ maxTotalBytes: 1 }).failures.some(failure => failure.includes('Batch A total')),
    'total download budget is enforced');
  assert.ok(check({ catalog: [{ ...item, maxBytes: 1 }] }).failures.some(failure => failure.includes('bytes exceeds')),
    'per-image download budget is enforced');
  writeFileSync(assetPath, Buffer.from('not a PNG'));
  assert.ok(check().failures.some(failure => failure.includes('invalid PNG signature')),
    'a corrupt asset cannot pass through header-only validation');
  const badChecksum = png(1, 1, 0);
  badChecksum[badChecksum.length - 5] ^= 1;
  writeFileSync(assetPath, badChecksum);
  assert.ok(check().failures.some(failure => failure.includes('checksum failed')),
    'a damaged PNG chunk is rejected');
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Art intake validation passed.');
