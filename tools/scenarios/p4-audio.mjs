// Native FIELD/audio functional QA. Private memory-only browser; no timing or
// listening verdict. Keep simulation, lap count and result creation untouched.
import {appendFile, open, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {ffmpeg} from '../audio/codec.mjs';
import {measureLoudness, repetition} from '../audio/measurements.mjs';
import {detectOnset, rms} from '../audio-analysis.mjs';
import {createCaptureWitness, inspectCaptureWitness, recorderWorkletSource}
  from '../audio/capture-witness.mjs';

async function install(recorder) {
  const app = window.__qaApp, audio = app.audio;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.__qaMemoryBackupStore)
    throw Error('P4 audio requires isolated memory-only saves.');
  app.stop();
  audio.unlock(); audio.setMuted(false); audio.setPaused(false);
  await audio.context.resume();
  await Promise.all([audio._samplesPromise, audio._ambiencePromise, audio._cueBuffersPromise]);
  const ids = ['race.start.light', 'race.start.go', 'race.position.gain', 'race.lap.final', 'race.finish.flag'];
  const report = {native: [], cues: [], decoded: [], lifecycle: [], steps: 0, phase: 'race',
    frames: [], stages: [], interfaceActivity: [], memoryOnly: true, syntheticResults: false, simulationEdits: false, listeningApproved: false};
  const demand = (yes, message) => { if (!yes) throw Error(message); };
  for (const id of ids) {
    const buffer = audio.cueBuffers[id];
    demand(buffer instanceof AudioBuffer && buffer.duration > .05, 'Undecoded recording: ' + id);
    const data = buffer.getChannelData(0);
    let peak = 0, sum = 0, hash = 2166136261;
    const bits = new Uint32Array(data.buffer, data.byteOffset, data.length);
    for (let i = 0; i < data.length; i++) {
      demand(Number.isFinite(data[i]), 'Nonfinite decoded PCM');
      peak = Math.max(peak, Math.abs(data[i])); sum += data[i] * data[i];
      hash = Math.imul(hash ^ bits[i], 16777619) >>> 0;
    }
    demand(peak > .001 && peak <= .99, 'Inaudible or clipped decoded recording: ' + id);
    report.decoded.push({id, duration: buffer.duration, sampleRate: buffer.sampleRate,
      peak, rms: Math.sqrt(sum / data.length), pcmHash: hash.toString(16)});
  }
  const original = {event: audio.event, play: audio._playCue,
    createSource: audio.context.createBufferSource, start: app.duel.startCampaign, step: app.duel.step};
  let observingCue = null, control = null, controlApp = null, replay = true;
  const sources = [], lastEvents = {};
  audio.context.createBufferSource = function(...args) {
    const source = original.createSource.apply(this, args);
    if (ids.includes(observingCue)) {
      const row = {id: observingCue, phase: report.phase, started: false, ended: false, stops: []};
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...values) => { row.started = true; row.buffer = source.buffer;
        row.audioStartSec = values[0] ?? this.currentTime; return start(...values); };
      source.stop = (...values) => { row.stops.push(values[0] ?? this.currentTime); return stop(...values); };
      source.addEventListener('ended', () => { row.ended = true; });
      sources.push(row);
    }
    return source;
  };
  audio._playCue = function(id, ...args) {
    const previous = observingCue; observingCue = id;
    const audioTimeSec = this.context.currentTime;
    let voice;
    try { voice = original.play.call(this, id, ...args); } finally { observingCue = previous; }
    if (ids.includes(id) || id.startsWith('interface.')) report.interfaceActivity.push({id, phase: report.phase,
      audioTimeSec, until: voice?.until ?? audioTimeSec, started: !!voice});
    if (ids.includes(id) || ['interface.countdown', 'interface.go', 'interface.win', 'interface.lose'].includes(id))
      report.cues.push({id, phase: report.phase, started: !!voice});
    return voice;
  };
  audio.event = function(ev, state, course) {
    if (ev.stageLoaded != null) report.stages.push({phase: report.phase, audioTimeSec: this.context.currentTime, stage: ev.stageLoaded});
    const kind = ev.startLight ? 'light' : ev.go && ev.lightsOut ? 'go' : ev.positionGain ? 'gain' :
      ev.finalLap ? 'final' : ev.stageResult?.grandPrix && ev.stageResult.completed ? 'finish' : null;
    const before = kind ? JSON.stringify(state) : null;
    const audioTimeSec = this.context.currentTime;
    const result = original.event.call(this, ev, state, course);
    if (kind) {
      demand(JSON.stringify(state) === before, 'Audio changed native race state: ' + kind);
      const count = report.cues.length;
      original.event.call(this, ev, state, course);
      original.event.call(this, {...ev}, state, course);
      demand(report.cues.length === count, 'Duplicate audio delivery: ' + kind);
      demand(JSON.stringify(state) === before, 'Repeated audio changed native race state');
      report.native.push({kind, phase: report.phase, light: ev.startLight, audioTimeSec,
        at: state.stageTimeSec, position: state.field.position, laps: state.completedLaps});
      lastEvents[kind] = ev;
    }
    return result;
  };
  app.duel.startCampaign = function(options) {
    if (replay) {
      control = new this.constructor({seed: this.seed, car: this.carKey,
        difficulty: this.difficultyKey, featureFlags: this.featureFlags});
      const profile = structuredClone(app.profile), player = structuredClone(app.player);
      const startingProfile = JSON.stringify(profile);
      controlApp = {duel: control, profile, player,
        _switches: app._switches, getHiddenRoadDiscovery: app.getHiddenRoadDiscovery};
      report.controlAdapter = {nativeDiscovery: true, nativeGrandPrixSettlement: true, saveCalls: 0, events: 0};
      control.onChange((state, event) => {
        demand(state.mode === 'grandprix' && !state.arena, 'Replay adapter must stay in the native Grand Prix branch');
        // This synchronous adapter may read its clone, but may never save.
        const storage = window.localStorage;
        const writes = Object.fromEntries(['setItem', 'removeItem', 'clear'].map(key => [key, storage[key]]));
        for (const key of Object.keys(writes)) storage[key] = () => {
          report.controlAdapter.saveCalls++; throw Error('No-audio replay adapter attempted a save');
        };
        try {
          app._syncHiddenRoadDiscovery.call(controlApp);
          if (event.stageResult) {
            demand(event.stageResult.grandPrix === true, 'Replay settlement needs a native Grand Prix result');
            app._settleResult.call(controlApp, event.stageResult, state);
            // The clone may never save, so it cannot be paid: its result keeps the unpaid default.
            demand(event.stageResult.creditReward === 0,
              'Native replay settlement changed its Grand Prix presentation contract');
          }
        } finally { for (const [key, value] of Object.entries(writes)) storage[key] = value; }
        demand(JSON.stringify(profile) === startingProfile, 'Replay adapter changed its cloned profile');
        report.controlAdapter.events++;
      });
      control.startCampaign({...options});
    }
    return original.start.call(this, options);
  };
  app.duel.step = function(dt) {
    const input = {...this.state.input};
    const result = original.step.call(this, dt);
    if (replay) { control.setInput(input); control.step(dt); report.steps++; }
    return result;
  };
  const options = {mode: 'grandprix', startStage: 0, car: 'falcone_f42', seed: 1989,
    fieldSeed: 4242, fieldSize: 7, cpuDifficulty: 'easy', difficulty: 'casual'};
  function start() {
    app.stop();
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    demand(app.startCampaign({...options}), 'Real App campaign failed');
    demand(app.duel.state.field?.size === 8 && app.duel.state.lapsTotal === 3, 'Expected unmodified eight-car three-lap race');
    app.autopilot = true; app._scriptedCrashDone = true;
    // Present the new course and allow the existing readiness gate to settle.
    app.onFrame?.(app.duel.state);
  }
  async function digest(text) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))))
      .map(value => value.toString(16).padStart(2, '0')).join('');
  }
  window.__p4Audio = {app, audio, ids, report, sources, lastEvents, demand, start,
    async finish() {
      const state = app.duel.state;
      demand(state.status === 'stage_result' && state.results?.grandPrix && state.results.completed &&
        state.completedLaps === 3, 'No genuine completed three-lap Grand Prix');
      demand(report.controlAdapter.saveCalls === 0 && report.controlAdapter.events > 0, 'Replay adapter save boundary failed');
      // Grand Prix pay is live (GP-CAREER-LIVE): the native result carries the real payout and the player's new balance.
      // The no-save clone is never paid, so its result keeps the unpaid default.
      demand(Number.isSafeInteger(state.results.creditReward) && state.results.creditReward >= 0 &&
        state.results.creditBalance === app.profile.credits &&
        (state.results.creditReward === 0 || state.results.creditBreakdown?.base > 0) &&
        control.state.results.creditReward === 0,
        'Native Grand Prix reward/balance presentation differs');
      demand(JSON.stringify(state.hiddenRoadDiscovery) === JSON.stringify(app.getHiddenRoadDiscovery()) &&
        JSON.stringify(control.state.hiddenRoadDiscovery) === JSON.stringify(app.getHiddenRoadDiscovery.call(controlApp)),
        'Native discovery presentation differs');
      // Only what the real _settleResult writes into a result on this run may differ from the unpaid clone; every
      // other result field, and every other state field, must still match exactly. The clone's _settleResult stops at
      // the player-identity check (it has no run owner), so it writes none of these. Fields the real call cannot write
      // on this run are NOT listed: drift scores, cup, tuned lap, Coast Cup, Yeti, medals and earned cars (earned-cars
      // is off), notoriety and scrap (Wasteland only), and ghostRecorded (only Time Trial records a ghost).
      const PAY_FIELDS = new Set([
        'lapChoiceEnabled', 'raceDistance', // lap-choice block, after the identity check, completed races only
        'creditPositionReward', // Grand Prix position pay, inside the awarded.awarded block
        'creditReward', 'creditCharge', 'policeFineCharge', 'creditBreakdown', // the Object.assign of the settlement
        'personalBest', 'personalBestStatus', 'previousBest', 'best', 'winStreak', 'milestoneAwards', // same Object.assign
        'creditBalance']); // final line of _settleResult
      const withoutPay = results => Object.fromEntries(Object.entries(results ?? {}).filter(([key]) => !PAY_FIELDS.has(key)));
      const same = key => key === 'results' ? JSON.stringify(withoutPay(state.results)) === JSON.stringify(withoutPay(control.state.results))
        : JSON.stringify(state[key]) === JSON.stringify(control.state[key]);
      report.replayDifference = [...new Set([...Object.keys(state), ...Object.keys(control.state)])].filter(key => !same(key));
      report.raceFingerprint = await digest(JSON.stringify(state));
      report.replayFingerprint = await digest(JSON.stringify(control.state));
      demand(report.replayDifference.length === 0, 'Native input replay differs with audio: ' + report.replayDifference.join(', '));
      report.result = {position: state.results.position, time: state.results.stageTimeSec,
        laps: state.completedLaps, fieldSize: state.results.fieldSize, creditReward: state.results.creditReward};
      const native = kind => report.native.filter(row => row.phase === 'race' && row.kind === kind).length;
      const played = id => report.cues.filter(row => row.phase === 'race' && row.id === id && row.started).length;
      demand(native('light') === 5 && played(ids[0]) === 5, 'Five native light ticks required');
      demand(native('go') === 1 && played(ids[1]) === 1, 'One native go required');
      demand(native('gain') > 0 && played(ids[2]) === native('gain'), 'A real position gain must be heard once');
      demand(native('final') === 1 && played(ids[3]) === 1, 'One final-lap signal required');
      demand(native('finish') === 1 && played(ids[4]) === 1, 'One genuine finish flourish required');
      demand(report.cues.filter(row => row.phase === 'race').every(row => ids.includes(row.id)), 'Grand Prix played legacy race signals');
      demand(sources.filter(row => row.phase === 'race').every(row => row.started && row.buffer === audio.cueBuffers[row.id]),
        'Native source must use the actual decoded recording');
      replay = false;
      return report.result;
    },
    async cleanup(label, action) {
      const before = sources.filter(row => !row.ended);
      action();
      demand(audio.grandPrixVoices.size === 0, label + ': tracked voice survived');
      await new Promise(resolve => setTimeout(resolve, 150));
      demand(before.every(row => row.ended), label + ': native source survived its stop');
      report.lifecycle.push({label, sourceCount: before.length, passed: true});
    },
    async result() {
      report.sources = sources.map(({buffer, ...row}) => row);
      return report;
    },
  };
  const frame = app.onFrame;
  app.onFrame = function(state, dt) {
    frame?.(state, dt);
    if (report.phase === 'race') report.frames.push({audioTimeSec: audio.context.currentTime,
      raceTime: state.stageTimeSec, revs: state.revs, speedMph: state.speedMph,
      throttle: state.input.throttle, status: state.status, laps: state.completedLaps});
  };
  window.__p4Capture = await recorder.create(audio, recorder);
  return {decoded: report.decoded.length, context: audio.context.state};
}

// Each segment uses the established recorder and its independent input witness.
// Overlapping meters see one absolute native clock; no wall-time splicing.
async function nativeRecorder(audio, helpers) {
  const ctx = audio.context, rate = ctx.sampleRate;
  const reference = helpers.createWitness(rate);
  const witnessBuffer = ctx.createBuffer(1, reference.length, rate);
  witnessBuffer.copyToChannel(reference, 0);
  const url = URL.createObjectURL(new Blob([helpers.worklet], {type: 'text/javascript'}));
  try { await ctx.audioWorklet.addModule(url); } finally { URL.revokeObjectURL(url); }
  const silent = ctx.createGain(); silent.gain.value = 0; silent.connect(ctx.destination);
  const buses = {mix: audio.output, engine: audio.buses.engine, interface: audio.buses.interface};
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const demand = (yes, message) => { if (!yes) throw Error(message); };
  const segments = [];
  let active = null, clockFailure = null;
  async function settle(test, label) {
    const end = performance.now() + 5000;
    while (!test()) { if (performance.now() > end) throw Error(label); await wait(16); }
  }
  async function segment() {
    const source = ctx.createBufferSource(); source.buffer = witnessBuffer;
    const tracks = {};
    for (const [name, bus] of Object.entries(buses)) {
      const node = new AudioWorkletNode(ctx, 'arsenal-native-meter',
        {numberOfInputs: 2, numberOfOutputs: 1, outputChannelCount: [2]});
      const chunks = [];
      node.port.onmessage = event => chunks.push(event.data);
      node.connect(silent); bus.connect(node); source.connect(node, 0, 1);
      tracks[name] = {node, bus, chunks};
    }
    source.start();
    const row = {index: segments.length, tracks, source, startFrame: null}; segments.push(row);
    await settle(() => Object.values(tracks).every(track => {
      const last = track.chunks.slice(-3);
      return last.length === 3 && last.every((chunk, i) => chunk.witness[0] > 0 &&
        (!i || chunk.frame === last[i - 1].frame + 2048));
    }), 'Recorder did not establish three real consecutive blocks');
    row.startFrame = Math.min(...Object.values(tracks).map(track => track.chunks.at(-1).frame));
    return row;
  }
  function disconnect(row) {
    if (row.closed) return;
    row.closed = true;
    row.source.stop(); row.source.disconnect();
    for (const track of Object.values(row.tracks)) {
      track.bus.disconnect(track.node); track.node.disconnect(); track.node.port.close();
    }
  }
  function encode(values) {
    const bytes = new Uint8Array(values.buffer, values.byteOffset, values.byteLength);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  }
  async function close(row, endFrame) {
    demand(Number.isInteger(endFrame) && endFrame > row.startFrame, 'Invalid native capture interval');
    await settle(() => Object.values(row.tracks).every(track =>
      track.chunks.at(-1)?.frame + 2048 >= endFrame), 'Recorder did not cover its final native frame');
    disconnect(row);
    const output = {};
    for (const [name, track] of Object.entries(row.tracks)) {
      const chunks = track.chunks.filter(chunk => chunk.frame < endFrame && chunk.frame + 2048 > row.startFrame);
      const pcm = new Float32Array((endFrame - row.startFrame) * 2);
      const witness = new Float32Array(endFrame - row.startFrame);
      let covered = row.startFrame, emptyInput = 0, callbacks = 0;
      for (const chunk of chunks) {
        demand(chunk.pcm.length === 4096 && chunk.witness.length === 2048, 'Short native block: ' + name);
        const from = Math.max(row.startFrame, chunk.frame), to = Math.min(endFrame, chunk.frame + 2048);
        if (from !== covered && !clockFailure) {
          const header={segment:row.index,track:name,sampleRate:rate,startFrame:row.startFrame,endFrame,
            expected:covered,actual:from,chunkFrame:chunk.frame,scope:'four raw neighboring chunks per stem; not a whole segment'};
          try {
            clockFailure={...header,tracks:Object.fromEntries(Object.entries(row.tracks).map(([stem,input])=>{
              const center=input.chunks.reduce((best,item,index)=>Math.abs(item.frame-chunk.frame)<Math.abs(input.chunks[best].frame-chunk.frame)?index:best,0);
              return [stem,input.chunks.slice(Math.max(0,center-2),center+2).map(item=>({
                frame:item.frame,callbacks:item.callbacks,pcmFrames:item.pcm.length/2,witnessFrames:item.witness.length,
                pcmBase64:encode(item.pcm),witnessBase64:encode(item.witness)}))];
            }))};
          } catch(error) {clockFailure={...header,retentionError:error.message};}
        }
        demand(from === covered, 'Missing or duplicated native sample frames: ' + name + ' ' + JSON.stringify({
          segment: row.index, startFrame: row.startFrame, endFrame, expected: covered, actual: from,
          chunkFrame: chunk.frame, previousFrames: chunks.slice(Math.max(0, chunks.indexOf(chunk) - 2), chunks.indexOf(chunk) + 2).map(item => item.frame),
          callbacks: chunk.callbacks.map(item => item.frame), witnessFirst: chunk.witness[0]}));
        const offset = from - chunk.frame, count = to - from, target = from - row.startFrame;
        pcm.set(chunk.pcm.subarray(offset * 2, (offset + count) * 2), target * 2);
        witness.set(chunk.witness.subarray(offset, offset + count), target);
        for (const header of chunk.callbacks.filter(item => item.frame < to && item.frame + 128 > from)) {
          callbacks++;
          demand(header.witnessFrames === 128, 'Short witness input: ' + name);
          demand([0, 128].includes(header.leftFrames) && [0, 128].includes(header.rightFrames), 'Short signal input: ' + name);
          if (!header.leftFrames) emptyInput++;
        }
        covered = to;
      }
      demand(covered === endFrame, 'Incomplete native interval: ' + name);
      const identity = helpers.inspectWitness(witness, reference);
      demand(identity.complete, 'Native sample identity failed: ' + name + ' ' + JSON.stringify(identity));
      demand(name === 'interface' || emptyInput === 0, 'Connected mix/engine input missing: ' + name);
      for (const sample of pcm) demand(Number.isFinite(sample), 'Nonfinite recorded sample: ' + name);
      output[name] = {pcmBase64: encode(pcm), identity, callbacks, disconnectedSilentInputCallbacks: emptyInput,
        startFrame: row.startFrame, endFrame, frames: pcm.length / 2};
    }
    // Keep earlier stems available if a later stem fails validation.
    for (const track of Object.values(row.tracks)) track.chunks.length = 0;
    return {index: row.index, sampleRate: rate, startFrame: row.startFrame, endFrame, tracks: output};
  }
  return {
    failurePacket() { return clockFailure; },
    async begin() { active = await segment(); return {sampleRate: rate, startFrame: active.startFrame}; },
    age() { return active ? ctx.currentTime - active.startFrame / rate : 0; },
    async rotate() {
      const previous = active, next = await segment(); active = next;
      return close(previous, next.startFrame);
    },
    async finish() {
      if (!active) return null;
      const row = active; active = null;
      const result = await close(row, Math.ceil(ctx.currentTime * rate / 128) * 128);
      silent.disconnect(); return result;
    },
    stop() { for (const row of segments) disconnect(row); silent.disconnect(); },
  };
}

function recorderCode() {
  return '{worklet:' + JSON.stringify(recorderWorkletSource) + ',createWitness:(' + createCaptureWitness.toString() +
    '),inspectWitness:(' + inspectCaptureWitness.toString() + '),create:(' + nativeRecorder.toString() + ')}';
}

async function appendSegment(outputDir, recording, segment) {
  if (!segment || segment.startFrame !== (recording.endFrame ?? recording.startFrame))
    throw Error('Capture segments do not share the exact native boundary');
  const tracks = {};
  for (const [name, {pcmBase64, ...track}] of Object.entries(segment.tracks)) {
    const bytes = Buffer.from(pcmBase64, 'base64');
    if (!track.identity.complete || track.startFrame !== segment.startFrame || track.endFrame !== segment.endFrame ||
        bytes.length !== (segment.endFrame - segment.startFrame) * 8) throw Error('Invalid native recorded stem: ' + name);
    await appendFile(join(outputDir, name + '.f32'), bytes);
    tracks[name] = track;
  }
  recording.endFrame = segment.endFrame;
  recording.segments.push({...segment, tracks});
}

async function measureRecording(outputDir, recording, functional) {
  const rate = recording.sampleRate;
  recording.duration = (recording.endFrame - recording.startFrame) / rate;
  recording.measurements = {};
  for (const name of ['mix', 'engine', 'interface']) {
    const file = join(outputDir, name + '.wav');
    ffmpeg(['-threads', '1', '-filter_threads', '1', '-y', '-f', 'f32le', '-ar', String(rate), '-ac', '2',
      '-i', join(outputDir, name + '.f32'), '-c:a', 'pcm_f32le', file]);
    recording.measurements[name] = measureLoudness(await readFile(file));
  }
  if (!recording.measurements.mix.available) throw Error('Recorded mix has no measurable loudness');
  const firstStage = functional.stages.find(row => row.phase === 'race');
  if (!firstStage || firstStage.audioTimeSec * rate < recording.startFrame)
    throw Error('Recorder began after the genuine race stage loaded');
  const handles = Object.fromEntries(await Promise.all(['engine', 'interface'].map(async name =>
    [name, await open(join(outputDir, name + '.f32'), 'r')])));
  async function windowTrack(name, event, seconds) {
    const start = Math.max(recording.startFrame, Math.floor(event.audioTimeSec * rate) - Math.ceil(.1 * rate));
    const end = Math.min(recording.endFrame, start + Math.ceil((seconds + .3) * rate));
    const bytes = Buffer.alloc((end - start) * 8);
    const read = await handles[name].read(bytes, 0, bytes.length, (start - recording.startFrame) * 8);
    if (read.bytesRead !== bytes.length) throw Error('Short recorded event window');
    const left = new Float32Array(end - start), right = new Float32Array(end - start);
    for (let i = 0; i < left.length; i++) { left[i] = bytes.readFloatLE(i * 8); right[i] = bytes.readFloatLE(i * 8 + 4); }
    return {left, right, sampleRate: rate, audioStartSec: start / rate};
  }
  const cueFor = {light: 'race.start.light', go: 'race.start.go', gain: 'race.position.gain',
    final: 'race.lap.final', finish: 'race.finish.flag'};
  const events = functional.native.filter(event => event.phase === 'race').map(event => ({...event,
    cue: cueFor[event.kind], variant: 'single-recording', duration: functional.decoded.find(row => row.id === cueFor[event.kind]).duration}));
  recording.events = [];
  try {
    for (const event of events) {
      if (event.audioTimeSec * rate < recording.startFrame || (event.audioTimeSec + event.duration) * rate > recording.endFrame)
        throw Error('Native cue or its full tail is outside retained PCM: ' + event.kind);
      const ui = await windowTrack('interface', event, event.duration), engine = await windowTrack('engine', event, event.duration);
      const duration = Math.min(.3, event.duration), uiRms = rms(ui, event.audioTimeSec, duration), engineRms = rms(engine, event.audioTimeSec, duration);
      const overlap = functional.interfaceActivity.some(other => other.phase === 'race' && other.started &&
        !(other.id === event.cue && Math.abs(other.audioTimeSec - event.audioTimeSec) < .05) &&
        other.audioTimeSec < event.audioTimeSec + duration && other.until > event.audioTimeSec);
      const onset = detectOnset(ui, event.audioTimeSec);
      if (!(uiRms > .00001)) throw Error('Native race cue absent from recorded interface stem: ' + event.kind);
      if (!overlap && (onset === null || Math.abs(onset) > .15)) throw Error('Recorded interface onset missing or late: ' + event.kind);
      recording.events.push({...event, interfaceRms: uiRms, engineRms,
        interfaceOverEngineDb: engineRms > 0 ? 20 * Math.log10(uiRms / engineRms) : null,
        onsetDelaySec: onset, overlappingInterfaceCue: overlap});
    }
  } finally { await Promise.all(Object.values(handles).map(handle => handle.close())); }
  recording.repetition = repetition(events);
  recording.repetitionNote = 'Each race signal has one chosen recording; five identical light ticks are intentional. Native duplicate-event/source checks are separate.';
  recording.frames = functional.frames.filter(frame => frame.audioTimeSec >= recording.startFrame / rate && frame.audioTimeSec < recording.endFrame / rate);
  recording.nativeSources = functional.sources.filter(source => source.phase === 'race');
  recording.verdict = {continuousNativeFrames: true, sourceIdentity: true, nativeEventSignal: true,
    completeThreeLapRace: true, listeningApproved: false, advisoryMixTargets: recording.measurements.mix.targets};
}

async function ready(context) {
  await context.waitFor(`(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state);return a.visualReady;})()`,
    'actual campaign visual readiness', 60_000);
}

// Explicit QA-only replacement material; the default whole capture is unchanged.
export function p4ListeningCaptureMode(env=process.env) {
  const value=env.DUEL_P4_LISTENING_PREFIX;
  if(value == null || value === '')return null;
  if(value !== '121')throw Error('DUEL_P4_LISTENING_PREFIX accepts only the approved121-second listening prefix');
  return {purpose:'listening-prefix',requestedDurationSec:121};
}

async function measureListeningPrefix(outputDir,recording,functional) {
  const rate=recording.sampleRate;
  const contained=event=>event.audioTimeSec*rate >= recording.startFrame &&
    (event.audioTimeSec+functional.decoded.find(row=>row.id === ({light:'race.start.light',go:'race.start.go',
      gain:'race.position.gain',final:'race.lap.final',finish:'race.finish.flag'})[event.kind]).duration)*rate <= recording.endFrame;
  const raceEvents=functional.native.filter(event=>event.phase === 'race');
  const retained=raceEvents.filter(contained);
  if(!retained.some(event=>event.kind === 'go') || retained.filter(event=>event.kind === 'light').length !== 5)
    throw Error('Listening prefix lacks its genuine five start lights and go');
  // Keep original full-tail signal/onset measurement for each actually retained cue.
  // Later cues are explicitly uncaptured; the original whole mode still tests all.
  await measureRecording(outputDir,recording,{...functional,native:retained});
  recording.uncapturedEvents=raceEvents.filter(event=>!contained(event)).map(({kind,audioTimeSec})=>({kind,audioTimeSec}));
  recording.verdict={...recording.verdict,completeThreeLapRace:false,verifiedListeningPrefix:true};
}

export async function run(context) {
  const prefix=p4ListeningCaptureMode();
  await context.navigate('/tools/menu-check.html?flags=grand-prix');
  await context.waitFor(`!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, 'isolated audio App', 60_000);
  await context.evaluate(`window.__qaApp.setGraphicsQuality('performance')`);
  await context.evaluate(`(${install.toString()})(${recorderCode()})`);
  const recording = {status: 'incomplete', segments: [], method: 'existing native worklet and independent sample witness',
    mode: 'real-time Grand Prix', listeningApproved: false,...(prefix ?? {})};
  for (const name of ['mix', 'engine', 'interface']) await writeFile(join(context.outputDir, name + '.f32'), Buffer.alloc(0));
  try {
    await ready(context);
    Object.assign(recording, await context.evaluate('window.__p4Capture.begin()'));
    await context.evaluate('window.__p4Audio.start()');
    await ready(context);
    await context.evaluate('window.__p4Audio.app.start()');
    const deadline = Date.now() + 600_000;
    let finishAt = null, lastProgress = 0,prefixStopped=false;
    while (Date.now() < deadline) {
      const state = await context.evaluate(`(() => {const q=window.__p4Audio,s=q.app.duel.state;
        return {status:s.status,time:s.stageTimeSec,laps:s.completedLaps,age:window.__p4Capture.age(),
          audioTime:q.audio.context.currentTime,finishDuration:q.audio.cueBuffers['race.finish.flag'].duration};})()`);
      if(prefix && !prefixStopped && state.audioTime-recording.startFrame/recording.sampleRate >= prefix.requestedDurationSec) {
        await appendSegment(context.outputDir,recording,await context.evaluate('window.__p4Capture.finish()'));
        recording.stopReason='native-prefix-duration';recording.stopAudioTimeSec=recording.endFrame/recording.sampleRate;
        prefixStopped=true;console.log('Native listening prefix intentionally stopped: '+JSON.stringify({
          startFrame:recording.startFrame,endFrame:recording.endFrame,sampleRate:recording.sampleRate}));
      } else if (!prefixStopped && state.age >= 20) await appendSegment(context.outputDir, recording, await context.evaluate('window.__p4Capture.rotate()'));
      if (state.time >= lastProgress + 20) {
        console.log('P4 real-time race progress: ' + JSON.stringify({status: state.status, time: state.time, laps: state.laps}));
        lastProgress = state.time;
      }
      if (state.status === 'stage_result') finishAt ??= state.audioTime + state.finishDuration + .3;
      if (finishAt !== null && state.audioTime >= finishAt) break;
      if (['gameover', 'complete'].includes(state.status)) throw Error('Real-time race ended before a genuine Grand Prix finish');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (finishAt === null) throw Error('Real-time Grand Prix exceeded its ten-minute bound');
    await context.evaluate('window.__p4Audio.app.stop()');
    if(prefix && !prefixStopped)throw Error('Genuine race finished before the approved native listening prefix');
    if(!prefix)await appendSegment(context.outputDir, recording, await context.evaluate('window.__p4Capture.finish()'));
    const result = await context.evaluate('window.__p4Audio.finish()');
    await context.screenshot('p4-audio-genuine-finish');
    console.log('Native P4 audio finish: ' + JSON.stringify(result));
    await context.evaluate(`(async()=>{const q=window.__p4Audio;
      await q.cleanup('menu after finish',()=>q.app.returnToMenu());
      q.report.phase='lifecycle';q.start();})()`);
    await ready(context);
    await context.evaluate(`(async()=>{const q=window.__p4Audio,a=q.app,au=q.audio;
      a.advance(1.1);q.demand(au.grandPrixVoices.size>0,'Expected live light voice before pause');
      await q.cleanup('pause',()=>a.togglePause());
      const n=q.report.cues.length;a.advance(1);q.demand(q.report.cues.length===n,'Paused race emitted cues');
      a.togglePause();a.advance(1);q.demand(q.report.cues.length>n,'New light missing after resume');
      await q.cleanup('mute',()=>au.setMuted(true));
      const m=q.report.cues.length;a.advance(1);au.setMuted(false);
      au.event({...q.lastEvents.light},a.duel.state,a.duel.course);
      q.demand(q.report.cues.length===m,'Muted light replayed on unmute');
      a.advance(1);q.demand(au.grandPrixVoices.size>0,'New light missing after unmute');
      await q.cleanup('stage replacement',()=>q.start());})()`);
    await ready(context);
    await context.evaluate(`(async()=>{const q=window.__p4Audio,a=q.app,au=q.audio;
      await au.context.suspend();const n=q.report.cues.length;a.advance(2.1);
      q.demand(q.report.cues.length===n,'Suspended context started a cue');
      await au.context.resume();au.event({...q.lastEvents.light},a.duel.state,a.duel.course);
      q.demand(q.report.cues.length===n,'Unlock replayed a missed cue');
      a.advance(1);q.demand(au.grandPrixVoices.size>0,'New cue missing after unlock');
      await q.cleanup('menu after unlock',()=>a.returnToMenu());
      q.report.lifecycle.push({label:'unlock without replay',passed:true});
      q.report.functionalVerdict={nativeEvents:true,replay:true,lifecycle:true,genuineThreeLapFinish:true,listeningApproved:false};
    })()`);
  } finally {
    // Retain the actual disputed samples before recorder cleanup. The original
    // thrown continuity assertion still decides this run's failure.
    try {
      const failure=await context.evaluate('window.__p4Capture.failurePacket()');
      if(failure) {
        const tracks={};
        for(const [stem,chunks] of Object.entries(failure.tracks??{})) {
          tracks[stem]=[];
          for(const [index,chunk] of chunks.entries()) {
            const {pcmBase64,witnessBase64,...header}=chunk;
            const pcmFile='clock-'+stem+'-'+index+'-pcm.f32',witnessFile='clock-'+stem+'-'+index+'-witness.f32';
            const pcm=Buffer.from(pcmBase64,'base64'),witness=Buffer.from(witnessBase64,'base64');
            await writeFile(join(context.outputDir,pcmFile),pcm);
            await writeFile(join(context.outputDir,witnessFile),witness);
            tracks[stem].push({...header,pcmFile,witnessFile,pcmBytes:pcm.length,witnessBytes:witness.length});
          }
        }
        await writeFile(join(context.outputDir,'clock-failure.json'),JSON.stringify({...failure,tracks},null,2)+'\n');
        recording.clockDispute={file:'clock-failure.json',scope:failure.scope,retentionError:failure.retentionError??null};
      }
    } catch(error) {recording.clockRetentionError=error.message;}
    await context.evaluate('window.__qaApp.stop(); window.__p4Capture.stop()');
    const report = await context.evaluate('window.__p4Audio.result()');
    await writeFile(join(context.outputDir, 'p4-audio.json'), JSON.stringify(report, null, 2) + '\n');
    try {
      if (report.functionalVerdict) {
        if(prefix) {
          await measureListeningPrefix(context.outputDir,recording,report);
          recording.status='incomplete';
        } else {
          recording.status = 'measuring';
          await measureRecording(context.outputDir, recording, report);
          recording.status = 'complete';
        }
      }
    } catch (error) { recording.error = error.message; throw error; }
    finally { await writeFile(join(context.outputDir, 'recording.json'), JSON.stringify(recording, null, 2) + '\n'); }
  }
}
