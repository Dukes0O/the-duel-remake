// Production App/Duel/audio graph; earned balances and contact poses are tab-local QA fixtures.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ffmpeg} from '../audio/codec.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

async function capture(quality) {
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  const app = window.__qaApp, audio = app.audio;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.__qaMemoryBackupStore)
    throw Error('Capture requires isolated memory-only storage.');
  app.stop(); audio.unlock(); audio.setMuted(false); audio.setPaused(false);
  await audio.context.resume();
  await Promise.all([audio._samplesPromise, audio._ambiencePromise, audio._cueBuffersPromise]);
  const ids = ['weapon.harpoon.fire', 'weapon.harpoon.flight', 'weapon.harpoon.hit',
    'weapon.harpoon.break', 'weapon.caltrops.deploy', 'weapon.caltrops.hit'];
  for (const id of ids) if (audio.cueBuffers[id]?.length !== 3 ||
      audio.cueBuffers[id].some(buffer => !buffer?.duration)) throw Error('Undecoded ABC recordings: ' + id);
  if (!app.addPlayer('Wave Audio ' + quality).ok) throw Error('Memory-only owner fixture failed.');
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
    discoveredGate: true, xp: 3500, scrap: 3000}};
  if (!app._saveProfile()) throw Error('Memory-only earned career failed.');
  for (const id of ['harpoon', 'caltrops'])
    if (!app.purchaseArsenalWeapon(id).ok) throw Error('Actual purchase failed: ' + id);
  app.profile.wasteland.loadout = ['harpoon', 'caltrops', 'crossbow', 'star'];
  if (!app._saveProfile()) throw Error('Memory-only loadout failed.');
  if (!app.startCampaign({mode: 'wasteland', startStage: 0, opponentCount: 1,
      seed: 1989, cpuDifficulty: 'easy'})) throw Error('Actual campaign failed.');
  const state = app.duel.state, course = app.duel.course, ctx = audio.context;
  async function waitUntil(predicate, label) {
    const deadline = performance.now() + 15000;
    while (!predicate()) {
      if (performance.now() >= deadline) throw Error(label + ' timed out.');
      await sleep(16);
    }
    if (app.duel.state !== state || app.duel.course !== course) throw Error('Actual campaign changed.');
  }
  app.start(); await waitUntil(() => app.visualReady, 'Actual visual readiness'); app.stop();
  Object.assign(state, {status: 'racing', countdown: 0, paused: false, invulnerableSec: 0, traffic: []});
  state.combat.aiTimer = state.combat.pickupTimer = Infinity;
  const place = (actor, s, lateral = 0, speedMph = 0) => Object.assign(actor, {
    s, prevS: s, lateral, prevLateral: lateral, speedMph, headingError: 0,
    yawVelocity: 0, pushVelocity: 0, impactTimer: 0, contactCooldown: 0,
    airHeight: 0, prevAirHeight: 0, combatShield: 0});
  place(state, 500, 0, 100); place(state.rival, 1000);
  app.autopilot = false; app._scriptedCrashDone = true;
  app.onFrame?.(state);
  await waitUntil(() => app.visualReady && app.activeInputContext() === 'car', 'Actual car input context');

  const module = `class Meter extends AudioWorkletProcessor {
    constructor(){super();this.pcm=new Float32Array(4096);this.at=0;this.first=0;}
    process(inputs){const a=inputs[0]||[],l=a[0],r=a[1]||l;
      for(let i=0;i<128;i++){if(!this.at)this.first=currentFrame+i;
        this.pcm[this.at++]=l?.[i]||0;this.pcm[this.at++]=r?.[i]||0;
        if(this.at===4096){this.port.postMessage({frame:this.first,pcm:this.pcm},[this.pcm.buffer]);
          this.pcm=new Float32Array(4096);this.at=0;}}
      return true;}}registerProcessor('wave-one-native-meter',Meter);`;
  const url = URL.createObjectURL(new Blob([module], {type: 'text/javascript'}));
  try {await ctx.audioWorklet.addModule(url);} finally {URL.revokeObjectURL(url);}
  const meter = node => {
    const chunks = [], tap = new AudioWorkletNode(ctx, 'wave-one-native-meter',
      {numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2]}), silent = ctx.createGain();
    silent.gain.value = 0; tap.connect(silent); silent.connect(ctx.destination);
    tap.port.onmessage = event => chunks.push(event.data); node.connect(tap);
    return {chunks, stop(){node.disconnect(tap);tap.disconnect();silent.disconnect();tap.port.close();}};
  };
  const tracks = {mix: meter(audio.output), engine: meter(audio.buses.engine), weapons: meter(audio.buses.weapons)};
  const original = {event: audio.event, play: audio._playCue, moving: audio.mixer.playMoving, frame: app.onFrame};
  const native = [], shots = [], moving = [], frames = [], failures = [];
  let epochFrame, began, measuring = false, launched = false, broken = false, deployed = false, touched = false, strip;
  audio.event = function(event, st, route) {
    if (ids.includes(event.arsenalCue)) {
      const before = JSON.stringify(st), position = JSON.stringify(event.hitPosition);
      const result = original.event.call(this, event, st, route);
      if (before !== JSON.stringify(st) || position !== JSON.stringify(event.hitPosition))
        failures.push('Audio consumption changed native state or event position.');
      native.push({id: event.arsenalCue, time: ctx.currentTime - began,
        position: {...event.hitPosition}, actor: event.actor === st ? 'player' : 'rival'});
      if (event.arsenalCue === 'weapon.caltrops.deploy') strip = event.hazard;
      return result;
    }
    return original.event.call(this, event, st, route);
  };
  audio._playCue = function(id, ...args) {
    const result = original.play.call(this, id, ...args);
    if (ids.includes(id)) shots.push({id, time: ctx.currentTime - began, started: !!result});
    return result;
  };
  audio.mixer.playMoving = function(id, buffer, position, listener, options) {
    const voice = original.moving.call(this, id, buffer, position, listener, options);
    if (id === 'weapon.harpoon.flight' && voice) {
      const row = {id, time: ctx.currentTime - began, loop: voice.source.loop, updates: []};
      moving.push(row);
      const update = voice.update, stop = voice.stop;
      voice.update = (next, ear) => {
        row.updates.push({time: ctx.currentTime - began, x: next.x, y: next.y, z: next.z});
        return update(next, ear);
      };
      voice.stop = () => {row.stopped = ctx.currentTime - began; return stop();};
    }
    return voice;
  };
  app.onFrame = function(st) {
    original.frame?.(st);
    if (!measuring) return;
    const time = ctx.currentTime - began;
    frames.push({time, throttle: st.input.throttle, revs: st.revs, speedMph: st.speedMph});
    if (!launched && time >= .7) {
      launched = true; place(st.rival, st.s + 20, st.lateral, 40);
      if (!app.duel.fireWeapon('harpoon')) failures.push('Genuine Harpoon launch failed.');
    }
    if (!broken && time >= 1.6) {
      broken = true;
      // A named QA distance pose triggers the production tether's distance counter.
      place(st.rival, st.s + 100, st.lateral);
    }
    if (!deployed && time >= 2.5) {
      deployed = true;
      if (!app.duel.fireWeapon('caltrops')) failures.push('Genuine Caltrops launch failed.');
    }
    if (!touched && time >= 3.3) {
      touched = true;
      if (!strip) failures.push('Native strip disappeared before contact.');
      else {
        const at = course.nearest(strip.x, strip.z, st.rival.s);
        place(st.rival, at.s, at.lateral + .1);
        // Subsequent real fixed steps resolve this body/hazard overlap once.
      }
    }
  };
  let cleanup;
  try {
    window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyW', key: 'w', bubbles: true}));
    app.start();
    await waitUntil(() => state.input.throttle === 1 && state.revs > 0, 'Actual full-throttle engine');
    const warmedFrame = Math.ceil(ctx.currentTime * ctx.sampleRate);
    await waitUntil(() => Object.values(tracks).every(track => {
      const tail = track.chunks.slice(-3);
      return tail.length === 3 && tail[0].frame >= warmedFrame &&
        tail.every((chunk, i) => !i || chunk.frame === tail[i - 1].frame + 2048);
    }), 'Native recorder startup');
    epochFrame = Math.ceil(ctx.currentTime * ctx.sampleRate); began = epochFrame / ctx.sampleRate;
    measuring = true; await sleep(4400); app.stop(); measuring = false;
    for (const id of ids) if (native.filter(event => event.id === id).length !== 1)
      failures.push('Native event must occur exactly once: ' + id);
    for (const id of ids.filter(id => !id.endsWith('.flight')))
      if (shots.filter(event => event.id === id && event.started).length !== 1)
        failures.push('Recorded one-shot must start exactly once: ' + id);
    if (moving.length !== 1 || !moving[0].loop || moving[0].updates.length < 2 ||
        new Set(moving[0].updates.map(at => [at.x, at.y, at.z].join(','))).size < 2 ||
        !Number.isFinite(moving[0].stopped)) failures.push('Actual moving flight loop did not travel and retire once.');
    if (!frames.length || frames.some(frame => frame.throttle !== 1 || !(frame.revs > 0)))
      failures.push('Actual mix lost full-throttle engine input.');
    audio.setPaused(true); await sleep(250);
    cleanup = {activeShots: audio.activeShots.size, movingVoices: audio.projectileVoices.size,
      mixerVoices: [...audio.mixer.voices.values()].reduce((sum, set) => sum + set.size, 0)};
    if (Object.values(cleanup).some(Boolean)) failures.push('Pause did not clear actual cue voices.');
  } finally {
    app.stop(); window.dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW', key: 'w', bubbles: true}));
    audio.event = original.event; audio._playCue = original.play;
    audio.mixer.playMoving = original.moving; app.onFrame = original.frame;
    for (const track of Object.values(tracks)) track.stop();
    await sleep(40);
  }
  function encode(chunks) {
    const kept = chunks.filter(chunk => chunk.frame + chunk.pcm.length / 2 > epochFrame);
    const skip = kept.length ? Math.max(0, epochFrame - kept[0].frame) : 0;
    const pcm = new Float32Array(kept.reduce((sum, chunk) => sum + chunk.pcm.length, 0) - skip * 2);
    let at = 0;
    for (const [i, chunk] of kept.entries()) {
      const data = i ? chunk.pcm : chunk.pcm.subarray(skip * 2); pcm.set(data, at); at += data.length;
    }
    const bytes = new Uint8Array(pcm.buffer); let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    const contiguous = kept.length > 0 && kept[0].frame <= epochFrame &&
      kept.every((chunk, i) => !i || chunk.frame === kept[i - 1].frame + 2048);
    return {pcmBase64: btoa(binary), frames: pcm.length / 2, chunkCount: kept.length, contiguous};
  }
  return {quality, sampleRate: ctx.sampleRate, channels: 2, memoryOnlySaves: true,
    native, shots, moving, frames, cleanup, failures,
    tracks: Object.fromEntries(Object.entries(tracks).map(([id, track]) => [id, encode(track.chunks)]))};
}
export async function run(context) {
  const rows = [];
  const persist = status => writeFile(join(context.outputDir, 'capture.json'), JSON.stringify({status, rows,
    limitations: ['RMS ratios describe the actual mix; human listening and cue recognition remain unmeasured.']}, null, 2) + '\n');
  for (const quality of ['high', 'performance']) {
    await context.navigate('/tools/menu-check.html?flags=arsenal');
    await context.waitFor("!!window.__qaApp && !!window.__render && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
      'memory-only wave-one audio App', 60000);
    await context.evaluate(`(() => {const select=document.querySelector('#graphics-quality');
      select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const row = await context.evaluate('(' + capture.toString() + ')(' + JSON.stringify(quality) + ')');
    const raws = {};
    for (const [kind, track] of Object.entries(row.tracks)) {
      const raw = Buffer.from(track.pcmBase64, 'base64'); delete track.pcmBase64; raws[kind] = raw;
      if (!track.contiguous || !track.frames) row.failures.push('Incomplete native ' + kind + ' recording.');
      const wav = ffmpeg(['-f', 'f32le', '-ar', String(row.sampleRate), '-ac', '2', '-i', 'pipe:0',
        '-c:a', 'pcm_f32le', '-f', 'wav', 'pipe:1'], {input: raw});
      track.file = quality + '-' + kind + '.wav'; await writeFile(join(context.outputDir, track.file), wav);
      track.measurement = measureLoudness(wav);
      let peak = 0, clipped = 0;
      for (let i = 0; i < raw.length; i += 4) {
        const value = Math.abs(raw.readFloatLE(i)); peak = Math.max(peak, value); clipped += value >= 1;
      }
      track.samplePeakDbfs = 20 * Math.log10(Math.max(1e-12, peak)); track.clippedSamples = clipped;
      if (kind === 'mix' && (clipped || track.measurement.truePeakDbtp >= 0)) row.failures.push('Actual mixed output clipped.');
    }
    const rms = (raw, time, duration) => {
      const first = Math.max(0, Math.round(time * row.sampleRate)) * 8;
      const last = Math.min(raw.length, first + Math.round(duration * row.sampleRate) * 8);
      let power = 0; for (let at = first; at < last; at += 4) power += raw.readFloatLE(at) ** 2;
      return Math.sqrt(power / Math.max(1, (last - first) / 4));
    };
    row.cueWindows = row.native.map(event => {
      const engineRms = rms(raws.engine, event.time, .25), weaponsRms = rms(raws.weapons, event.time, .25);
      return {id: event.id, time: event.time, duration: .25, engineRms, weaponsRms,
        weaponsToEngineDb: 20 * Math.log10(Math.max(1e-12, weaponsRms) / Math.max(1e-12, engineRms))};
    });
    rows.push(row); await persist(row.failures.length ? 'failed' : 'capturing');
    if (row.failures.length) throw Error(row.failures.join(' '));
    await context.screenshot('arsenal-wave1-native-audio-' + quality);
  }
  await persist('complete');
  console.log('Wave-one native mix captured in both qualities: six events, moving flight loop, engine and weapons stems.');
}
