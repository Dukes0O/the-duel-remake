import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function ffmpegPath() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  const packages = join(
    process.env.LOCALAPPDATA || '',
    'Microsoft',
    'WinGet',
    'Packages',
  );
  if (existsSync(packages)) {
    for (const item of readdirSync(packages).filter((name) =>
      name.startsWith('Gyan.FFmpeg_'),
    )) {
      const folder = join(packages, item);
      for (const build of readdirSync(folder)) {
        const binary = join(folder, build, 'bin', 'ffmpeg.exe');
        if (existsSync(binary)) return binary;
      }
    }
  }
  return 'ffmpeg';
}
export function ffmpeg(args, options = {}) {
  return execFileSync(
    ffmpegPath(),
    ['-hide_banner', '-loglevel', 'error', ...args],
    {
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    },
  );
}
const decoded = new Map();
export function decodeAudioBytes(bytes) {
  if (bytes.toString('ascii', 0, 4) === 'RIFF') return bytes;
  const key = createHash('sha256').update(bytes).digest('hex');
  if (!decoded.has(key)) {
    const wave = ffmpeg(
      ['-i', 'pipe:0', '-c:a', 'pcm_s16le', '-f', 'wav', 'pipe:1'],
      { input: bytes },
    );
    let format, pcm;
    for (let offset = 12; offset + 8 <= wave.length;) {
      const id = wave.toString('ascii', offset, offset + 4),
        size = wave.readUInt32LE(offset + 4);
      if (id === 'fmt ') format = wave.subarray(offset + 8, offset + 24);
      if (id === 'data') {
        pcm = wave.subarray(
          offset + 8,
          Math.min(wave.length, offset + 8 + size),
        );
        break;
      }
      offset += 8 + size + (size % 2);
    }
    if (!format || !pcm) throw Error('Decoder produced no PCM');
    const canonical = Buffer.alloc(44 + pcm.length);
    canonical.write('RIFF');
    canonical.writeUInt32LE(canonical.length - 8, 4);
    canonical.write('WAVEfmt ', 8);
    canonical.writeUInt32LE(16, 16);
    format.copy(canonical, 20);
    canonical.write('data', 36);
    canonical.writeUInt32LE(pcm.length, 40);
    pcm.copy(canonical, 44);
    decoded.set(key, canonical);
  }
  return decoded.get(key);
}
export function readRuntimeWav(file) {
  return decodeAudioBytes(
    readFileSync(
      new URL(
        '../../public/assets/audio/' + file.replace(/\.wav$/, '.flac'),
        import.meta.url,
      ),
    ),
  );
}
