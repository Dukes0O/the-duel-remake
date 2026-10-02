// Real App/Duel/EngineAudio. QA poses and earned balances live only in memory.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ffmpeg} from '../audio/codec.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

async function capture(quality, side) {
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  const app = window.__qaApp, audio = app.audio;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.__qaMemoryBackupStore)
    throw Error('Capture requires the isolated memory-only store.');
  app.stop(); audio.unlock(); audio.setMuted(false); audio.setPaused(false);
  await audio.context.resume();
  await Promise.all([audio._samplesPromise, audio._ambiencePromise, audio._cueBuffersPromise]);
  const ids = ['weapon.oil.deploy', 'weapon.oil.slip', 'weapon.smoke.deploy'];
  for (const id of ids) {
    const buffers = audio.cueBuffers[id];
    if (!Array.isArray(buffers) || buffers.length !== 3 || buffers.some(buffer => !buffer?.duration))
      throw Error('Undecoded ABC Arsenal recordings: ' + id);
  }
  if (!app.addPlayer('Core Audio ' + quality).ok) throw Error('Memory-only owner fixture failed.');
  app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
    discoveredGate: true, xp: 3500, scrap: 3000}};
  if (!app._saveProfile()) throw Error('Memory-only earned career failed.');
  for (const id of ['oil', 'smoke']) if (!app.purchaseArsenalWeapon(id).ok) throw Error('Actual purchase failed: ' + id);
  app.profile.wasteland.loadout = ['oil', 'smoke', 'crossbow', 'bomb'];
  if (!app._saveProfile()) throw Error('Memory-only loadout failed.');
  const ctx = audio.context;
  let state;
  const place = (actor, s, lateral = 0, speedMph = 0) => Object.assign(actor, {
    s, prevS: s, lateral, prevLateral: lateral, speedMph, headingError: 0,
    yawVelocity: 0, pushVelocity: 0, airHeight: 0, prevAirHeight: 0, combatShield: 0});
  async function startCycle() {
    measuring = false; app.stop();
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 1, seed: 1989, cpuDifficulty: 'easy'})) throw Error('Actual Arsenal campaign failed.');
    state = app.duel.state;
    const course = app.duel.course, deadline = performance.now() + 15000;
    // Let the actual renderer load and present this new state/course. Input
    // stays blocked by the real App until its existing readiness gate passes.
    app.start();
    while (!app.visualReady || app.duel.state !== state || app.duel.course !== course) {
      if (performance.now() >= deadline) throw Error('Actual campaign visual readiness timed out.');
      await sleep(16);
    }
    app.stop();
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = state.combat.pickupTimer = Infinity;
    place(state, 500, 0, 100); place(state.rival, 1000);
    app.autopilot = false; app._scriptedCrashDone = true;
    // Resolve the actual racing presentation/input context before holding W.
    // A context transition may legitimately clear the keys and neutralize input.
    original.frame?.(state);
    const inputDeadline = performance.now() + 5000;
    while (!app.visualReady || app.activeInputContext() !== 'car' ||
        app.duel.state !== state || app.duel.course !== course) {
      if (performance.now() >= inputDeadline) throw Error('Actual racing car context timed out.');
      await sleep(16); original.frame?.(state);
    }
    window.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyW', key: 'w', bubbles: true}));
  }
  const worklet = `class Meter extends AudioWorkletProcessor {
    constructor(){super();this.pcm=new Float32Array(4096);this.at=0;this.first=0;}
    process(inputs){const a=inputs[0]||[],l=a[0],r=a[1]||l;
      for(let i=0;i<128;i++){if(!this.at)this.first=currentFrame+i;
        this.pcm[this.at++]=l?.[i]||0;this.pcm[this.at++]=r?.[i]||0;
        if(this.at===4096){this.port.postMessage({frame:this.first,pcm:this.pcm},[this.pcm.buffer]);
          this.pcm=new Float32Array(4096);this.at=0;}}
      return true;}}
    registerProcessor('arsenal-native-meter',Meter);`;
  const url = URL.createObjectURL(new Blob([worklet], {type: 'text/javascript'}));
  try {await ctx.audioWorklet.addModule(url);} finally {URL.revokeObjectURL(url);}
  function meter(node) {
    const chunks = [], tap = new AudioWorkletNode(ctx, 'arsenal-native-meter',
      {numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2]}), silent = ctx.createGain();
    silent.gain.value = 0; tap.connect(silent); silent.connect(ctx.destination);
    tap.port.onmessage = event => chunks.push(event.data); node.connect(tap);
    return {chunks, stop(){node.disconnect(tap);tap.disconnect();silent.disconnect();tap.port.close();}};
  }
  const began = ctx.currentTime, tracks = {mix: meter(audio.output),
    engine: meter(audio.buses.engine), weapons: meter(audio.buses.weapons)};
  const native = [], cues = [], frames = [];
  const original = {event: audio.event, play: audio._playCue, buffer: audio._cueBuffer,
    space: audio._spatialOutput, frame: app.onFrame};
  let current = null, oil = null, cycle = 0, cycleBegan = ctx.currentTime, measuring = false;
  audio.event = function(event, st, course) {
    if (!ids.includes(event.arsenalCue)) return original.event.call(this, event, st, course);
    const before = JSON.stringify(st), position = JSON.stringify(event.hitPosition);
    if (event.arsenalCue === 'weapon.oil.deploy') oil = event.hazard;
    current = {id: event.arsenalCue, cycle, time: ctx.currentTime - began, position: {...event.hitPosition},
      actor: event.actor === st ? 'player' : 'rival', source: 'native-simulation'};
    const result = original.event.call(this, event, st, course);
    if (before !== JSON.stringify(st) || position !== JSON.stringify(event.hitPosition))
      throw Error('Actual audio consumption changed native state or event position.');
    native.push(current); current = null; return result;
  };
  audio._spatialOutput = function(...args) {
    const result = original.space.apply(this, args);
    if (current) current.spatial = {...result.space, weaponsBus: args[3] === this.buses.weapons};
    return result;
  };
  audio._cueBuffer = function(id) {
    const buffer = original.buffer.call(this, id);
    if (current && ids.includes(id)) {
      const variants = this.cueBuffers[id];
      current.variant = variants.indexOf(buffer);
      // Hash actual decoded recording samples; this never changes the buffer.
      const data = buffer.getChannelData(0), bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
      let hash = 2166136261;
      for (const value of bits) hash = Math.imul(hash ^ value, 16777619) >>> 0;
      current.recordingHash = hash.toString(16);
    }
    return buffer;
  };
  audio._playCue = function(id, ...args) {
    const result = original.play.call(this, id, ...args);
    if (ids.includes(id)) {
      const voices = this.mixer.voices.get(id)?.size || 0;
      if (voices > 6) throw Error('Released cue exceeded its bounded voice pool: ' + id);
      cues.push({id, cycle, time: ctx.currentTime - began, started: !!result, voices});
    }
    return result;
  };
  let deployed = false, touched = false, smoked = false;
  app.onFrame = function(st) {
    original.frame?.(st);
    if (!measuring) return;
    const elapsed = ctx.currentTime - cycleBegan;
    const gate = app._visualReadiness;
    frames.push({cycle, time: ctx.currentTime - began, cycleTime: elapsed,
      throttle: st.input.throttle, revs: st.revs, speedMph: st.speedMph,
      visualReady: app.visualReady, status: st.status, paused: !!st.paused,
      activeInputContext: app.activeInputContext(), keyHeld: !!app.keys.KeyW,
      matchingReadinessGate: !gate || gate.state === st && gate.course === app.duel.course,
      controlLock: !!st.hiddenRoadJourney?.controlsLocked});
    if (!deployed && elapsed >= .7) {
      deployed = true;
      if (!app.duel.fireWeapon('oil')) throw Error('Genuine Oil launch failed.');
    }
    if (!touched && elapsed >= 1.5) {
      touched = true;
      if (!oil) throw Error('Native Oil disappeared before contact.');
      const at = app.duel.course.nearest(oil.x, oil.z, st.rival.s);
      place(st.rival, at.s, at.lateral + side * 2.5);
      // Genuine native fixed steps resolve this body/hazard overlap once.
      app.duel.step(1 / 120); app.duel.step(1 / 120);
    }
    if (!smoked && elapsed >= 2.5) {
      smoked = true;
      if (!app.duel.fireWeapon('smoke')) throw Error('Genuine Smoke launch failed.');
    }
  };
  let cleanup;
  try {
    // Real campaign restarts reset hazards and recharge, while the existing
    // audio cue indices continue. Three repetitions exercise A, B and C.
    for (cycle = 0; cycle < 3; cycle++) {
      oil = null; deployed = touched = smoked = false;
      await startCycle();
      const armedState = state, armedCourse = app.duel.course, inputDeadline = performance.now() + 5000;
      app.start();
      // The first production RAF has dt=0. Wait for genuine fixed steps to
      // apply the held key and rev the engine before starting the cue clock.
      while (state.input.throttle !== 1 || !(Number.isFinite(state.revs) && state.revs > 0)) {
        if (app.duel.state !== armedState || app.duel.course !== armedCourse)
          throw Error('Actual campaign changed while arming the audio drive.');
        if (performance.now() >= inputDeadline) throw Error('Actual full-throttle engine input timed out.');
        await sleep(16);
      }
      if (app.duel.state !== armedState || app.duel.course !== armedCourse)
        throw Error('Actual campaign changed before arming the audio drive.');
      cycleBegan = ctx.currentTime; measuring = true;
      await sleep(3900); app.stop(); measuring = false;
      window.dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW', key: 'w', bubbles: true}));
      for (const id of ids) {
        if (native.filter(event => event.id === id && event.cycle === cycle).length !== 1 ||
            cues.filter(event => event.id === id && event.cycle === cycle && event.started).length !== 1)
          throw Error('Native cue/playback must occur exactly once per repetition: ' + id);
      }
    }
    for (const id of ids) {
      const repeats = native.filter(event => event.id === id);
      if (repeats.map(event => event.variant).join(',') !== '0,1,2' ||
          new Set(repeats.map(event => event.recordingHash)).size !== 3)
        throw Error('Actual adjacent ABC recordings did not vary: ' + id);
    }
    if (native.some(event => !event.spatial?.weaponsBus || !Object.values(event.position).every(Number.isFinite)))
      throw Error('Native cue lost physical position or weapons bus.');
    const drive = frames.filter(frame => frame.cycleTime >= .5 && frame.cycleTime <= 3.5);
    if (!drive.length || drive.some(frame => frame.throttle !== 1))
      throw Error('Mix was not driven at full throttle: ' + JSON.stringify(drive.find(frame => frame.throttle !== 1) || null));
    audio.setPaused(true); await sleep(250);
    cleanup = {paused: audio.paused, activeShots: audio.activeShots.size,
      mixerVoices: [...audio.mixer.voices.values()].reduce((sum, set) => sum + set.size, 0)};
    if (cleanup.activeShots || cleanup.mixerVoices) throw Error('Pause did not clear actual cue voices.');
  } finally {
    app.stop();
    window.dispatchEvent(new KeyboardEvent('keyup', {code: 'KeyW', key: 'w', bubbles: true}));
    audio.event = original.event;
    audio._playCue = original.play; audio._cueBuffer = original.buffer;
    audio._spatialOutput = original.space; app.onFrame = original.frame;
    for (const track of Object.values(tracks)) track.stop();
    await sleep(40);
  }
  function encode(chunks) {
    const pcm = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.pcm.length, 0));
    let at = 0;
    for (const chunk of chunks) {pcm.set(chunk.pcm, at); at += chunk.pcm.length;}
    const bytes = new Uint8Array(pcm.buffer); let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    const gap = chunks.findIndex((chunk, i) => i > 0 && chunk.frame !== chunks[i - 1].frame + 2048);
    return {pcmBase64: btoa(binary), frames: pcm.length / 2, chunkCount: chunks.length,
      firstFrame: chunks[0]?.frame ?? null, lastFrame: chunks.at(-1)?.frame ?? null,
      firstGap: gap < 0 ? null : {chunk: gap, previousFrame: chunks[gap - 1].frame,
        expectedFrame: chunks[gap - 1].frame + 2048, actualFrame: chunks[gap].frame},
      audioStartSec: (chunks[0]?.frame ?? 0) / ctx.sampleRate - began,
      contiguous: chunks.every((chunk, i) => !i || chunk.frame === chunks[i - 1].frame + 2048)};
  }
  return {quality, side, sampleRate: ctx.sampleRate, channels: 2, nativeContext: ctx instanceof AudioContext,
    native, cues, frames, cleanup, contextStateAtStop: ctx.state,
    captureBeganAudioSec: began, captureEndedAudioSec: ctx.currentTime, memoryOnlySaves: true,
    tracks: Object.fromEntries(Object.entries(tracks).map(([key, track]) => [key, encode(track.chunks)]))};
}
export async function run(context) {
  const rows = [];
  async function persist(status, quality) {
    // Preserve native events, input frames and diagnostic headers before any
    // file validation. Never serialize large Float32/base64 payloads to JSON.
    const metadata = rows.map(row => ({...row, tracks: Object.fromEntries(
      Object.entries(row.tracks).map(([kind, {pcmBase64, ...track}]) => [kind, track]))}));
    await writeFile(join(context.outputDir, 'capture.json'), JSON.stringify({status, quality, rows: metadata,
      limitations: ['Human listening and cue recognition remain unmeasured', 'No release or live save access']}, null, 2) + '\n');
  }
  for (const [quality, side] of [['high', -1], ['performance', 1]]) {
    await context.navigate('/tools/menu-check.html?flags=arsenal');
    await context.waitFor("!!window.__qaApp && !!window.__render && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
      'memory-only Arsenal audio App', 60_000);
    await context.evaluate(`(() => {const select=document.querySelector('#graphics-quality');
      select.value=${JSON.stringify(quality)};select.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const row = await context.evaluate('(' + capture.toString() + ')(' + JSON.stringify(quality) + ',' + side + ')');
    row.validationStatus = 'partial'; rows.push(row);
    await persist('validating', quality);
    for (const [kind, track] of Object.entries(row.tracks)) {
      if (!track.contiguous || !track.frames) {
        const diagnostic = {quality, kind, frames: track.frames, chunkCount: track.chunkCount,
          audioStartSec: track.audioStartSec, firstFrame: track.firstFrame,
          lastFrame: track.lastFrame, contiguous: track.contiguous, firstGap: track.firstGap};
        row.validationStatus = 'failed'; row.failure = diagnostic;
        await persist('failed', quality);
        console.error('Native recording diagnostic: ' + JSON.stringify(diagnostic));
        throw Error('Incomplete native ' + kind + ' recording. ' + JSON.stringify(diagnostic));
      }
      const raw = Buffer.from(track.pcmBase64, 'base64');
      const wav = ffmpeg(['-f', 'f32le', '-ar', String(row.sampleRate), '-ac', '2', '-i', 'pipe:0',
        '-c:a', 'pcm_f32le', '-f', 'wav', 'pipe:1'], {input: raw});
      track.file = quality + '-' + kind + '.wav';
      await writeFile(join(context.outputDir, track.file), wav);
      track.measurement = measureLoudness(wav);
      let peak = 0;
      for (let i = 0; i < raw.length; i += 4) peak = Math.max(peak, Math.abs(raw.readFloatLE(i)));
      track.samplePeakDbfs = 20 * Math.log10(Math.max(1e-12, peak));
      delete track.pcmBase64;
    }
    row.validationStatus = 'complete'; await persist('capturing', quality);
    await context.screenshot('arsenal-native-audio-' + quality);
  }
  await persist('complete', null);
  console.log('Arsenal core native audio: two qualities, nine genuine cue events each, ABC repeats and full-throttle output captured.');
}
