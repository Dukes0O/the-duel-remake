import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {wavFromPcm} from './audio-race.mjs';
import {validateWeaponAudioWaveforms, WEAPON_AUDIO_LIMITS} from '../weapon-audio-waveforms.mjs';

export async function run(context) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
  const worktreeDirty = !!execFileSync('git', ['status', '--porcelain', '--untracked-files=no'],
    {cwd:root, encoding:'utf8'}).trim();
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'memory-only offline weapon audio',30_000);
  const recordings = await context.evaluate(`(async () => {
    const Audio = window.__qaApp.audio.constructor;
    const recordings = [];
    const carWeapons = ['ufo', 'bomb', 'crossbow', 'star'];
    const footCues = ['rpg-launch', 'rpg-direct', 'rpg-splash', 'wrench-start',
      'wrench-complete', 'wrench-interrupt', 'raider-warning', 'raider-shot'];
    for (const cue of [...carWeapons, ...footCues]) {
      const channels = carWeapons.includes(cue) ? 1 : 2;
      const sampleRate = 44100;
      const context = new OfflineAudioContext(channels, Math.round(sampleRate * .55), sampleRate);
      const audio = new Audio();
      audio.context = context; audio.muted = false; audio.paused = false;
      audio.master = context.createGain(); audio.master.gain.value = .42;
      audio.master.connect(context.destination);
      audio.noiseBuffer = context.createBuffer(1, sampleRate, sampleRate);
      const noise = audio.noiseBuffer.getChannelData(0);
      let seed = 1989;
      for (let i = 0; i < noise.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        noise[i] = seed / 2147483648 - 1;
      }
      const state = {mode:'wasteland', maxArmor:100, s:0, lateral:0, headingError:0};
      const course = {groundAt:() => ({x:0, y:0, z:0, heading:0})};
      // OfflineAudioContext is suspended before rendering. These are direct
      // calls, not a test of production event dispatch or a whole-race mix.
      if (carWeapons.includes(cue)) audio._weaponCue(cue);
      else if (cue === 'rpg-launch') audio._weaponCue('rpg');
      else if (cue === 'rpg-direct' || cue === 'rpg-splash') {
        audio._rpgImpact({combatExplosion:true, audioImpact:cue.slice(4),
          hitPosition:{x:20, y:0, z:10}}, state, course);
      } else if (cue.startsWith('wrench-')) {
        audio._repairCue(cue === 'wrench-interrupt' ? 'interrupted' : cue.slice(7));
      } else if (cue === 'raider-shot') {
        audio._raiderShot({raiderShot:true, hitPosition:{x:-20, y:0, z:10}}, state, course);
      } else if (cue === 'raider-warning') {
        // Warning is inline in event(). Bypass only its suspended-state
        // guard; every audio node and parameter still belongs to the real
        // offline graph. This does not exercise live game event delivery.
        audio.context = new Proxy(context, {get(target, key) {
          if (key === 'state') return 'running';
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }});
        audio.event({raiderWarning:true}, state, course);
      }
      const rendered = await context.startRendering();
      const data = Array.from({length:channels}, (_, ch) => rendered.getChannelData(ch));
      let peak = 0, power = 0, zeroCrossings = 0, lastActive = -1, nonFiniteSamples = 0;
      const channelPower = Array(channels).fill(0);
      const pcm = new Uint8Array(rendered.length * channels * 2), view = new DataView(pcm.buffer);
      for (let i = 0; i < rendered.length; i++) {
        for (let ch = 0; ch < channels; ch++) {
          const value = data[ch][i];
          if (!Number.isFinite(value)) nonFiniteSamples++;
          peak = Math.max(peak, Math.abs(value)); power += value * value;
          channelPower[ch] += value * value;
          if (Math.abs(value) > .003) lastActive = i;
          if (ch === 0 && i && (value >= 0) !== (data[ch][i - 1] >= 0)) zeroCrossings++;
          view.setInt16((i * channels + ch) * 2,
            Math.max(-32768, Math.min(32767, Math.round(value * 32767))), true);
        }
      }
      let binary = '';
      for (let at = 0; at < pcm.length; at += 8192)
        binary += String.fromCharCode(...pcm.subarray(at, at + 8192));
      recordings.push({cue, channels, sampleRate, peak, rms:Math.sqrt(power / (rendered.length * channels)),
        leftRms:Math.sqrt(channelPower[0] / rendered.length),
        rightRms:channels === 2 ? Math.sqrt(channelPower[1] / rendered.length) : null,
        activeMs:Math.round((lastActive + 1) / sampleRate * 1000), zeroCrossings,
        nonFiniteSamples, pcmBase64:btoa(binary)});
    }
    return recordings;
  })()`);
  const footRecordings = recordings.filter(row => row.channels === 2);
  validateWeaponAudioWaveforms(footRecordings);
  const summaries = [];
  for (const recording of recordings) {
    const {cue, sampleRate, pcmBase64, channels, ...metrics} = recording;
    if (channels === 1) {
      // Retain the four car-weapon gates, including the shorter crossbow snap.
      const shortest = cue === 'crossbow' ? 80 : 110;
      if (metrics.nonFiniteSamples || metrics.peak < .025 || metrics.peak > .85 ||
          metrics.rms < .005 || metrics.activeMs < shortest || metrics.activeMs > 520)
        throw Error(cue + ' waveform outside audible, clean bounds: ' + JSON.stringify(metrics));
    }
    const file = 'weapon-' + cue + '.wav';
    await writeFile(join(context.outputDir, file),
      wavFromPcm(Buffer.from(pcmBase64, 'base64'), sampleRate, channels));
    summaries.push({cue, file, sampleRate, channels, ...metrics});
  }
  const summary = {sourceCommit, worktreeDirty, memoryOnlySaves:true,
    coverage:'Direct OfflineAudioContext cue rendering; no live event routing or whole-race mix coverage.',
    warningLimitation:'Raider warning calls EngineAudio.event with a context state guard shim; actual nodes use the offline graph.',
    capture:{sampleRate:44100, durationMs:550, masterGain:.42, noiseSeed:1989, activeThreshold:.003},
    limits:WEAPON_AUDIO_LIMITS, summaries};
  await writeFile(join(context.outputDir, 'weapon-waveforms.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log('Offline Wasteland weapon waveforms: ' + JSON.stringify(summaries));
}
