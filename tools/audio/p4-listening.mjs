// Offline labelled listening reels. These are auditions, not gameplay captures.
import {writeFileSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {runtimeName} from './p4-audio.mjs';

export const LISTENING_GROUPS = Object.freeze({
  '01-race-signals': ['race.start.light', 'race.start.go', 'race.position.gain', 'race.lap.final', 'race.finish.flag'],
  '02-pit-and-surfaces': ['pit.limiter', 'pit.wrench', 'pit.go', 'surface.gravel', 'surface.snow', 'surface.ice'],
  '03-mountain-hazards': ['avalanche.rumble', 'avalanche.slide', 'yeti.roar', 'snowman.burst'],
  '04-crowd-wind-and-beds': ['crowd.cheer', 'wind.summit', 'ambient.harbour-night', 'ambient.forest-morning', 'ambient.mountain-wind'],
});

export function buildP4Listening(out = '.evidence/2026-10-10/P4-AUDIO') {
  mkdirSync(out, {recursive: true});
  const reels = [];
  for (const [name, ids] of Object.entries(LISTENING_GROUPS)) {
    const parts = [], labels = [];
    let time = 0;
    for (const id of ids) {
      const inputFile = `public/assets/audio/${runtimeName(id)}`;
      const pcm = ffmpeg(['-threads', '1', '-filter_threads', '1', '-i', inputFile, '-t', '6',
        '-af', 'afade=t=out:st=5.8:d=0.2,volume=0.8', '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1']);
      labels.push({cue: id, start: time, duration: pcm.length / 4 / 48000});
      parts.push(pcm, Buffer.alloc(48000 * 4));
      time += pcm.length / 4 / 48000 + 1;
    }
    const mp3 = ffmpeg(['-threads', '1', '-filter_threads', '1', '-f', 'f32le', '-ar', '48000', '-ac', '1',
      '-i', 'pipe:0', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1'], {input: Buffer.concat(parts)});
    const file = join(out, `${name}.mp3`);
    writeFileSync(file, mp3);
    reels.push({file, labels});
  }
  writeFileSync(join(out, 'listening-index.json'), JSON.stringify(reels, null, 2) + '\n');
  return reels;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  console.log(JSON.stringify(buildP4Listening(process.argv[2]), null, 2));
