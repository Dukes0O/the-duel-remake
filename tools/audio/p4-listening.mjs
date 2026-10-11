// Offline labelled listening reels. These are auditions, not gameplay captures.
import {writeFileSync, mkdirSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ffmpeg, decodeAudioBytes} from './codec.mjs';
import {runtimeName} from './p4-audio.mjs';
import {measureLoudness} from './measurements.mjs';

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
function waveInfo(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
    throw Error('Recorded listening source must be a WAV');
  let format, pcm;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = bytes.toString('ascii', at, at + 4), size = bytes.readUInt32LE(at + 4);
    if (at + 8 + size > bytes.length) throw Error('Truncated listening WAV');
    if (id === 'fmt ') {
      const block = bytes.subarray(at + 8, at + 8 + size);
      if (block.length < 16) throw Error('Short listening WAV format');
      const encoding = block.readUInt16LE(0);
      format = {encoding: encoding === 65534 && block.length >= 40 ? block.readUInt16LE(24) : encoding,
        channels: block.readUInt16LE(2), sampleRate: block.readUInt32LE(4), bits: block.readUInt16LE(14)};
    }
    if (id === 'data') pcm = bytes.subarray(at + 8, at + 8 + size);
    at += 8 + size + (size % 2);
  }
  if (!format || !pcm) throw Error('Listening WAV has no format or PCM');
  return {...format, pcm, frames: pcm.length / (format.channels * format.bits / 8)};
}

// Copy an already verified complete race. The source-reel workflow above is separate.
export function buildP4RecordedListening(out) {
  if (!out) throw Error('--recorded-mix needs an existing native evidence directory');
  const readJson = name => JSON.parse(readFileSync(join(out, name), 'utf8'));
  const recording = readJson('recording.json'), functional = readJson('p4-audio.json'), harness = readJson('report.json');
  const demand = (yes, message) => { if (!yes) throw Error(message); };
  demand(harness.scenario === 'p4-audio' && harness.passed === true && harness.memoryOnlySaves === true,
    'Native harness has not passed');
  demand(functional.memoryOnly === true && functional.simulationEdits === false && functional.syntheticResults === false &&
    ['nativeEvents', 'replay', 'lifecycle', 'genuineThreeLapFinish'].every(key => functional.functionalVerdict?.[key] === true) &&
    functional.controlAdapter?.saveCalls === 0 && functional.replayDifference?.length === 0,
    'Native functional checks have not passed');
  demand(recording.status === 'complete' &&
    ['continuousNativeFrames', 'sourceIdentity', 'nativeEventSignal', 'completeThreeLapRace'].every(key => recording.verdict?.[key] === true),
    'Native recording integrity has not passed');
  const {sampleRate, startFrame, endFrame} = recording;
  demand(Number.isInteger(sampleRate) && sampleRate > 0 && Number.isInteger(startFrame) &&
    Number.isInteger(endFrame) && endFrame > startFrame && recording.duration === (endFrame - startFrame) / sampleRate,
    'Invalid native recording interval');
  let nextFrame = startFrame;
  demand(Array.isArray(recording.segments) && recording.segments.length > 0, 'Missing native segments');
  for (const segment of recording.segments) {
    demand(segment.sampleRate === sampleRate && segment.startFrame === nextFrame && segment.endFrame > nextFrame,
      'Native segments do not share exact boundaries');
    for (const name of ['mix', 'engine', 'interface']) {
      const track = segment.tracks?.[name], frames = segment.endFrame - segment.startFrame;
      demand(track?.startFrame === segment.startFrame && track.endFrame === segment.endFrame && track.frames === frames &&
        track.identity?.complete === true && track.identity.checkedFrames === frames,
        'Native stem integrity is incomplete: ' + name);
    }
    nextFrame = segment.endFrame;
  }
  demand(nextFrame === endFrame, 'Native segments do not cover the complete recording');
  const source = readFileSync(join(out, 'mix.wav')), wave = waveInfo(source);
  demand(wave.encoding === 3 && wave.bits === 32 && wave.channels === 2 && wave.sampleRate === sampleRate &&
    wave.frames === endFrame - startFrame, 'Source WAV differs from the verified native recording');
  demand(wave.pcm.equals(readFileSync(join(out, 'mix.f32'))), 'Source WAV is not the exact retained native PCM');
  demand(Array.isArray(recording.events) && recording.events.length > 0, 'Missing native cue timestamps');
  const events = recording.events.map(event => {
    const timeSec = event.audioTimeSec - startFrame / sampleRate;
    demand(Number.isFinite(timeSec) && Number.isFinite(event.duration) && timeSec >= 0 &&
      timeSec + event.duration <= recording.duration, 'Native cue or tail lies outside the full recording');
    return {kind: event.kind, cue: event.cue, timeSec: Number(timeSec.toFixed(6)), durationSec: event.duration,
      onsetDelaySec: event.onsetDelaySec, overlappingInterfaceCue: event.overlappingInterfaceCue};
  });
  const file = 'mix-listening.mp3';
  const args = ['-threads', '1', '-y', '-i', join(out, 'mix.wav'), '-map', '0:a:0',
    '-c:a', 'libmp3lame', '-q:a', '2', join(out, file)];
  ffmpeg(args);
  const output = readFileSync(join(out, file)), decoded = waveInfo(decodeAudioBytes(output));
  // A seekable MP3 file lets FFmpeg apply its end-padding metadata. A byte pipe cannot.
  const decodedPcm = ffmpeg(['-threads', '1', '-i', join(out, file), '-c:a', 'pcm_s16le', '-f', 's16le', 'pipe:1']);
  const decodedFrames = decodedPcm.length / (decoded.channels * 2);
  demand(decoded.sampleRate === sampleRate && decoded.channels === 2 && decodedFrames === wave.frames,
    'Listening copy changed the recorded rate, channels or complete duration');
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const info = {file, source: 'mix.wav', sourceSha256: sha256(source), outputSha256: sha256(output),
    outputBytes: output.length, durationSec: recording.duration, sampleRate, channels: 2, decodedFrames,
    purpose: 'Lossy listening copy of the complete native mix; original PCM/WAV and recording.json remain primary evidence.',
    normalization: false, edits: false, resampling: false, listeningApproved: false,
    recipe: {helper: 'tools/audio/codec.mjs:ffmpeg', args}, events};
  writeFileSync(join(out, 'listening.json'), JSON.stringify(info, null, 2) + '\n');
  return info;
}

// A failed whole capture can still contain an independently verified prefix.
// This mode never changes its source manifests or grants a whole-race verdict.
export function inspectP4PartialRecording({recording, functional, harness, sourceWave, pcmByStem}) {
  const demand = (yes, message) => {if (!yes) throw Error(message);};
  demand(recording?.status === 'incomplete', 'Partial mode needs an incomplete native recording');
  demand(harness?.scenario === 'p4-audio' && harness.passed === false && harness.memoryOnlySaves === true &&
    typeof harness.error === 'string' && harness.error.length > 0, 'Partial mode needs the original failed memory-only harness');
  demand(functional?.memoryOnly === true && functional.simulationEdits === false && functional.syntheticResults === false &&
    functional.controlAdapter?.saveCalls === 0, 'Partial source lacks unedited memory-only native checks');
  const {sampleRate,startFrame,endFrame} = recording;
  demand(sampleRate === 48000 && Number.isInteger(startFrame) && Number.isInteger(endFrame) && endFrame > startFrame,
    'Partial mode needs integer native boundaries at48kHz');
  const frames=endFrame-startFrame,durationSec=frames/sampleRate;
  demand(recording.duration == null || recording.duration === durationSec, 'Partial native duration conflicts with its frames');
  demand(Array.isArray(recording.segments) && recording.segments.length > 0, 'No verified native prefix segments');
  let nextFrame=startFrame;
  for(const segment of recording.segments) {
    demand(segment.sampleRate === sampleRate && segment.startFrame === nextFrame &&
      Number.isInteger(segment.endFrame) && segment.endFrame > nextFrame, 'Partial native segment boundary/rate mismatch');
    const count=segment.endFrame-segment.startFrame;
    for(const name of ['mix','engine','interface']) {
      const track=segment.tracks?.[name];
      demand(track?.startFrame === segment.startFrame && track.endFrame === segment.endFrame && track.frames === count &&
        track.identity?.complete === true && track.identity.checkedFrames === count,
        'Partial native stem identity/boundary mismatch: '+name);
    }
    nextFrame=segment.endFrame;
  }
  demand(nextFrame === endFrame, 'Partial segments do not cover exactly the retained native prefix');
  const sha256=bytes=>createHash('sha256').update(bytes).digest('hex'),stemSha256={};
  for(const name of ['mix','engine','interface']) {
    const pcm=pcmByStem?.[name];
    demand(Buffer.isBuffer(pcm) && pcm.length === frames*8, 'Partial retained PCM length mismatch: '+name);
    for(let at=0;at<pcm.length;at+=4)demand(Number.isFinite(pcm.readFloatLE(at)), 'Nonfinite partial PCM: '+name);
    stemSha256[name]=sha256(pcm);
  }
  demand(Buffer.isBuffer(sourceWave), 'Missing partial source WAV');
  const wave=waveInfo(sourceWave);
  demand(wave.encoding === 3 && wave.bits === 32 && wave.channels === 2 && wave.sampleRate === sampleRate &&
    wave.frames === frames, 'Partial WAV differs from native prefix format/frames');
  demand(wave.pcm.equals(pcmByStem.mix), 'Partial source WAV is not the exact retained native mix prefix');
  return {status:'incomplete',completeRace:false,wholeHarnessPassed:false,verifiedPrefix:true,
    sampleRate,channels:2,startFrame,endFrame,frames,durationSec,segments:recording.segments.length,
    originalFailure:harness.error,sourcePcmSha256:stemSha256.mix,stemSha256,sourceSha256:sha256(sourceWave)};
}

function floatWave(pcm,sampleRate,channels) {
  const wave=Buffer.alloc(44+pcm.length),stride=channels*4;
  wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);
  wave.writeUInt32LE(16,16);wave.writeUInt16LE(3,20);wave.writeUInt16LE(channels,22);
  wave.writeUInt32LE(sampleRate,24);wave.writeUInt32LE(sampleRate*stride,28);
  wave.writeUInt16LE(stride,32);wave.writeUInt16LE(32,34);wave.write('data',36);
  wave.writeUInt32LE(pcm.length,40);pcm.copy(wave,44);return wave;
}

export function buildP4PartialRecordedListening(out) {
  if(!out)throw Error('--partial-recorded-mix needs an existing native evidence directory');
  const readJson=name=>JSON.parse(readFileSync(join(out,name),'utf8'));
  const sourceWave=readFileSync(join(out,'mix.wav'));
  const pcmByStem=Object.fromEntries(['mix','engine','interface'].map(name=>[name,readFileSync(join(out,name+'.f32'))]));
  const prefix=inspectP4PartialRecording({recording:readJson('recording.json'),functional:readJson('p4-audio.json'),
    harness:readJson('report.json'),sourceWave,pcmByStem});
  const file='mix-incomplete-listening.mp3';
  const args=['-threads','1','-filter_threads','1','-y','-i',join(out,'mix.wav'),'-map','0:a:0',
    '-map_metadata','-1','-c:a','libmp3lame','-q:a','2',join(out,file)];
  ffmpeg(args);
  const output=readFileSync(join(out,file)),format=waveInfo(decodeAudioBytes(output));
  const decodeArgs=['-threads','1','-i',join(out,file),'-c:a','pcm_f32le','-f','f32le','pipe:1'];
  const decodedPcm=ffmpeg(decodeArgs),decodedFrames=decodedPcm.length/(format.channels*4);
  if(format.sampleRate !== prefix.sampleRate || format.channels !== prefix.channels || decodedFrames !== prefix.frames)
    throw Error('Partial MP3 changed the native prefix rate/channels/frame count');
  const sourceMeasurements=measureLoudness(sourceWave);
  const reconstructedMeasurements=measureLoudness(floatWave(decodedPcm,format.sampleRate,format.channels));
  if(!sourceMeasurements.available || !reconstructedMeasurements.available)throw Error('Partial mix loudness unavailable');
  const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
  const info={...prefix,file,source:'mix.wav',outputSha256:sha256(output),outputBytes:output.length,
    decodedFrames,sourceMeasurements,reconstructedMeasurements,
    purpose:'INCOMPLETE native listening prefix. The whole-race recording failed; this file cannot certify its finish or full capture.',
    normalization:false,edits:false,resampling:false,listeningApproved:false,
    recipe:{helper:'tools/audio/codec.mjs:ffmpeg',args,decodeArgs,measurement:'FFmpeg loudnorm input metrics; normalized analysis output discarded'}};
  writeFileSync(join(out,'listening-partial.json'),JSON.stringify(info,null,2)+'\n');return info;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const partial = process.argv[2] === '--partial-recorded-mix';
  if (partial && process.argv.length !== 4) throw Error('Usage: p4-listening.mjs --partial-recorded-mix <native-evidence-directory>');
  const recorded = process.argv[2] === '--recorded-mix';
  if (recorded && process.argv.length !== 4) throw Error('Usage: p4-listening.mjs --recorded-mix <native-evidence-directory>');
  console.log(JSON.stringify(partial ? buildP4PartialRecordedListening(process.argv[3]) :
    recorded ? buildP4RecordedListening(process.argv[3]) : buildP4Listening(process.argv[2]), null, 2));
}
