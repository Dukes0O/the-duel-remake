import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const texture = (file, size, transparent, maxBytes, grid = null) => ({
  file: `public/assets/textures/${file}`, width: size, height: size,
  transparent, maxBytes, grid, credits: 'public/assets/textures/CREDITS.md',
});

export const BATCH_A_ART = Object.freeze([
  { file: 'public/assets/reference/wasteland-art-direction.png', wide: true,
    transparent: false, maxBytes: 8_000_000, credits: 'public/assets/reference/CREDITS.md' },
  texture('scrap-plating.png', 1024, false, 4_500_000),
  texture('scrapyard-dirt.png', 1024, false, 4_500_000),
  texture('fire-flipbook.png', 2048, true, 12_000_000, [8, 8]),
  texture('explosion-flipbook.png', 2048, true, 12_000_000, [8, 8]),
  texture('smoke-flipbook.png', 2048, true, 12_000_000, [8, 8]),
  texture('muzzle-dust.png', 1024, true, 4_500_000, [2, 2]),
]);
export const BATCH_A_TOTAL_BYTES = 32_000_000;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? (value >>> 1) ^ 0xedb88320 : value >>> 1;
  }
  return (value ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
  return da <= db && da <= dc ? a : db <= dc ? b : c;
}

export function inspectPng(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw Error('invalid PNG signature');
  let offset = 8, width, height, bitDepth, colorType, interlace, ended = false;
  const data = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset + 12 + length > bytes.length) throw Error('truncated PNG chunk');
    const payload = bytes.subarray(offset + 8, offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== bytes.readUInt32BE(offset + 8 + length)) {
      throw Error('PNG chunk checksum failed');
    }
    if (type === 'IHDR') {
      if (length !== 13 || width != null) throw Error('invalid PNG header');
      width = payload.readUInt32BE(0); height = payload.readUInt32BE(4);
      bitDepth = payload[8]; colorType = payload[9]; interlace = payload[12];
    } else if (type === 'IDAT') data.push(payload);
    else if (type === 'IEND') { ended = true; break; }
    offset += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!ended || !width || !height || !data.length || bitDepth !== 8 || interlace !== 0 || !channels) {
    throw Error('unsupported or incomplete 8-bit PNG');
  }
  if (width > 8192 || height > 8192 || width * height > 32_000_000) throw Error('PNG dimensions are unsafe');
  const stride = width * channels, expected = (stride + 1) * height;
  const raw = inflateSync(Buffer.concat(data), { maxOutputLength: expected + 1 });
  if (raw.length !== expected) throw Error('PNG pixel data has the wrong length');
  let previous = Buffer.alloc(stride), cursor = 0, hasTransparentPixels = false;
  for (let y = 0; y < height; y++) {
    const filter = raw[cursor++], row = Buffer.allocUnsafe(stride);
    if (filter > 4) throw Error('invalid PNG row filter');
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? row[x - channels] : 0;
      const up = previous[x], upperLeft = x >= channels ? previous[x - channels] : 0;
      const predictor = filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth(left, up, upperLeft) : 0;
      row[x] = (raw[cursor++] + predictor) & 255;
    }
    if (colorType === 4 || colorType === 6) {
      for (let x = channels - 1; x < stride; x += channels) if (row[x] < 255) {
        hasTransparentPixels = true; break;
      }
    }
    previous = row;
  }
  return { width, height, hasTransparentPixels };
}

function provenanceFor(markdown, file) {
  const section = markdown.split(/^## /m).find(item => item.startsWith(`${file}\n`));
  if (!section) return false;
  const prompt = section.match(/^Prompt:\s*\r?\n((?:> .*(?:\r?\n|$))+)/m)?.[1] ?? '';
  return /^Date: \d{4}-\d{2}-\d{2}\s*$/m.test(section) &&
    /^Tool: \S.+$/m.test(section) && /^Use: \S.+$/m.test(section) &&
    prompt.replace(/^> /gm, '').trim().split(/\s+/).length >= 20;
}

export function checkArtIntake({ root, catalog = BATCH_A_ART, maxTotalBytes = BATCH_A_TOTAL_BYTES } = {}) {
  if (!root) throw Error('art-intake root is required');
  const provenancePath = join(root, 'docs/WASTELAND_ART.md');
  const markdown = existsSync(provenancePath) ? readFileSync(provenancePath, 'utf8') : '';
  const failures = [], present = [], missingPlanned = [];
  let totalBytes = 0;
  for (const item of catalog) {
    const path = join(root, item.file);
    if (!existsSync(path)) { missingPlanned.push(item.file); continue; }
    const bytes = statSync(path).size;
    totalBytes += bytes;
    present.push(item.file);
    if (bytes > item.maxBytes) failures.push(`${item.file}: ${bytes} bytes exceeds ${item.maxBytes}`);
    try {
      const image = inspectPng(readFileSync(path));
      if (item.wide ? image.width < 1200 || image.width / image.height < 1.5 :
        image.width !== item.width || image.height !== item.height) {
        failures.push(`${item.file}: image dimensions do not match the art catalog`);
      }
      if (item.grid && (image.width % item.grid[0] || image.height % item.grid[1])) {
        failures.push(`${item.file}: image does not divide into its ${item.grid.join('×')} cell grid`);
      }
      if (item.transparent && !image.hasTransparentPixels) failures.push(`${item.file}: transparent pixels are required`);
    } catch (error) { failures.push(`${item.file}: ${error.message}`); }
    if (!provenanceFor(markdown, item.file)) failures.push(`${item.file}: date, tool, use, and full prompt are required in docs/WASTELAND_ART.md`);
    const creditsPath = join(root, item.credits);
    if (!existsSync(creditsPath) || !readFileSync(creditsPath, 'utf8').includes(basename(item.file))) {
      failures.push(`${item.file}: image credit is missing from ${item.credits}`);
    }
  }
  if (totalBytes > maxTotalBytes) failures.push(`Batch A total ${totalBytes} bytes exceeds ${maxTotalBytes}`);
  return { present, missingPlanned, totalBytes, failures };
}
