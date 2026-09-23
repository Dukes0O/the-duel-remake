import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function wavFromPcm(pcm, sampleRate, channels = 2) {
  if (!Number.isInteger(sampleRate) || sampleRate < 8000 || ![1, 2].includes(channels) || pcm.length % (channels * 2))
    throw Error('Invalid PCM recording.');
  const wav = Buffer.alloc(44 + pcm.length);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + pcm.length, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * channels * 2, 28);
  wav.writeUInt16LE(channels * 2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(pcm.length, 40); pcm.copy(wav, 44);
  return wav;
}

export async function run(context) {
  await context.navigate('/tools/audio-race-check.html');
  await context.waitFor('window.__audioQaReady && !!Object.getOwnPropertyDescriptor(window,"localStorage")?.value', 'isolated audio race', 30_000);
  const started = await context.evaluate('window.__audioQaStart()');
  if (!started.storageIsMemory) throw Error('Audio race did not isolate saves in memory.');
  await new Promise(resolve => setTimeout(resolve, 14_000));
  const recording = await context.evaluate('window.__audioQaFinish()');
  if (!recording.memoryOnlySaves || recording.sampleStatus !== 'ready')
    throw Error(`Audio race failed isolation or sample loading: ${recording.sampleStatus}`);
  if (recording.events.filter(event => event.kind === 'combatExplosion').length < 2)
    throw Error('Audio race did not record both explosion probes.');
  if (!recording.events.some(event => event.kind === 'combatExplosion' && event.source === 'race' &&
    Number.isFinite(event.audioSpatial?.pan) && Number.isFinite(event.audioSpatial?.distance)))
    throw Error('Audio race did not capture a real blast with spatial geometry.');
  if (recording.frames.length < 100) throw Error('Audio race did not capture real-time frames.');
  const tracks = {};
  for (const [name, track] of Object.entries(recording.tracks)) {
    const file = `${name}.wav`;
    await writeFile(join(context.outputDir, file), wavFromPcm(Buffer.from(track.pcmBase64, 'base64'), recording.sampleRate, recording.channels));
    tracks[name] = { file, audioStartSec: track.audioStartSec, frames: track.frames };
  }
  const metadata = { schema: 1, sampleRate: recording.sampleRate, channels: recording.channels,
    tracks, events: recording.events, frames: recording.frames,
    memoryOnlySaves: recording.memoryOnlySaves, sampleStatus: recording.sampleStatus,
    ambienceStatus: recording.ambienceStatus,
    note: 'Real-time Wasteland autopilot; two marked QA explosion cues test timing without changing race physics. Stems are pre-limiter except mix.' };
  const file = join(context.outputDir, 'recording.json');
  await writeFile(file, JSON.stringify(metadata, null, 2) + '\n');
  console.log(`Audio race: ${recording.frames.length} real-time frames, ${recording.events.length} events, ${Object.keys(tracks).length} WAV tracks. Recording: ${file}`);
}
