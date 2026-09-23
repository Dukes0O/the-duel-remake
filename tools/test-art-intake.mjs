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
    raw.set([40, 80, 120, typeof alpha === 'function' ? alpha(x, y) : alpha], offset);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
function rgbPngWithTransparencyKey() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 2;
  const key = Buffer.from([0, 40, 0, 80, 0, 120]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header), chunk('tRNS', key),
    chunk('IDAT', deflateSync(Buffer.from([0, 40, 80, 120]))), chunk('IEND', Buffer.alloc(0))]);
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

  const partial = png(10, 10, 255);
  const header = partial.subarray(8, 33);
  const oneClearRaw = Buffer.alloc(10 * (10 * 4 + 1));
  for (let y = 0; y < 10; y++) for (let x = 0; x < 10; x++) {
    oneClearRaw.set([40, 80, 120, x === 0 && y === 0 ? 0 : 255], y * 41 + 1 + x * 4);
  }
  const oneClear = Buffer.concat([partial.subarray(0, 8), header,
    chunk('IDAT', deflateSync(oneClearRaw)), chunk('IEND', Buffer.alloc(0))]);
  writeFileSync(assetPath, oneClear);
  assert.ok(check({ catalog: [{ ...item, width: 10, height: 10 }] }).failures.some(failure => failure.includes('5% clear pixels')),
    'one clear pixel cannot make an otherwise opaque effect sprite pass');
  writeFileSync(assetPath, png(10, 10, 254));
  assert.ok(check({ catalog: [{ ...item, width: 10, height: 10 }] }).failures.some(failure => failure.includes('5% clear pixels')),
    'alpha 254 is not a transparent background');
  writeFileSync(assetPath, png(4, 4, (x, y) => x < 2 && y < 2 ? 0 : 255));
  assert.ok(check({ catalog: [{ ...item, width: 4, height: 4, grid: [2, 2] }] }).failures.some(failure => failure.includes('every sheet cell')),
    'one clear cell cannot hide three opaque atlas cells');
  writeFileSync(assetPath, png(1, 1, 0));
  assert.ok(check({ catalog: [{ ...item, transparent: false }] }).failures.some(failure => failure.includes('opaque image')),
    'an opaque catalog item rejects hidden alpha pixels');

  writeFileSync(assetPath, png(1, 1, 255));
  assert.ok(check().failures.some(failure => failure.includes('clear pixels')),
    'an opaque RGBA image is rejected');
  writeFileSync(assetPath, rgbPngWithTransparencyKey());
  assert.equal(inspectPng(readFileSync(assetPath)).hasTransparentPixels, true,
    'RGB tRNS transparency is decoded');
  assert.ok(check({ catalog: [{ ...item, transparent: false }] }).failures.some(failure => failure.includes('opaque image')),
    'RGB tRNS transparency cannot pass as an opaque image');
  writeFileSync(assetPath, png(2, 1, 0));
  assert.ok(check().failures.some(failure => failure.includes('dimensions')),
    'wrong atlas dimensions are rejected');
  writeFileSync(assetPath, png(1, 1, 0));
  writeFileSync(provenancePath, '# Art\n');
  assert.ok(check().failures.some(failure => failure.includes('full prompt')),
    'image without its recorded prompt is rejected');
  writeFileSync(provenancePath, provenance);
  writeFileSync(provenancePath, provenance.replace(prompt,
    'placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder placeholder'));
  assert.ok(check().failures.some(failure => failure.includes('full prompt')),
    'repeated placeholder text is not complete provenance');
  writeFileSync(provenancePath, provenance);
  writeFileSync(creditsPath, '# Credits\n');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'uncredited image is rejected');
  writeFileSync(creditsPath, 'probe.png: original Codex generated sprite.');
  writeFileSync(creditsPath, 'TODO: Codex must add the credit for probe.png later.');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'a reminder that mentions the filename is not a credit');
  writeFileSync(creditsPath, 'probe.png: no credit has been assigned for this Codex image.');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'a no-credit statement is not a credit');
  writeFileSync(creditsPath, 'probe.png: Not created by Codex; actual artist withheld.');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'a negated creator statement cannot count as an image credit');
  writeFileSync(creditsPath, 'probe.png: Not by Codex; the actual artist is withheld.');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'a shorter negated creator statement cannot count as an image credit');
  writeFileSync(creditsPath, 'probe.png: Created by somebody else; source withheld.');
  assert.ok(check().failures.some(failure => failure.includes('credit is missing')),
    'an unspecified creator cannot count as a generated-art credit');
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
  const valid = png(1, 1, 0);
  const idatLength = valid.readUInt32BE(33);
  const idat = valid.subarray(33, 33 + 12 + idatLength);
  const iend = valid.subarray(33 + 12 + idatLength);
  assert.throws(() => inspectPng(Buffer.concat([valid.subarray(0, 8), idat, valid.subarray(8, 33), iend])),
    /begin with IHDR/, 'IDAT may not precede the PNG header');
  assert.throws(() => inspectPng(Buffer.concat([valid, Buffer.from('junk')])),
    /trailing bytes/, 'trailing data after IEND is rejected');
  assert.throws(() => inspectPng(Buffer.concat([valid.subarray(0, 33), idat,
    chunk('tEXt', Buffer.from('probe')), idat, iend])),
    /contiguous/, 'IDAT chunks cannot be split by other chunks');
  assert.throws(() => inspectPng(Buffer.concat([valid.subarray(0, 33),
    chunk('XfAK', Buffer.alloc(0)), idat, iend])),
    /critical chunk/, 'an unknown critical chunk cannot be silently ignored');
  assert.throws(() => inspectPng(Buffer.concat([valid.subarray(0, 33),
    chunk('abce', Buffer.alloc(0)), idat, iend])),
    /reserved PNG chunk type/, 'the reserved chunk type bit must be valid');
  const nonAsciiType = Buffer.from(valid);
  nonAsciiType[37] |= 0x80;
  assert.throws(() => inspectPng(nonAsciiType), /invalid PNG chunk type/,
    'a high-bit chunk name is not valid ASCII');
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('Art intake validation passed.');
