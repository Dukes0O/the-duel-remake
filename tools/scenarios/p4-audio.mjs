// Native FIELD/audio functional QA. Private memory-only browser; no timing or
// listening verdict. Keep simulation, lap count and result creation untouched.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function install() {
  const app = window.__qaApp, audio = app.audio;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value || !window.__qaMemoryBackupStore)
    throw Error('P4 audio requires isolated memory-only saves.');
  app.stop();
  audio.unlock(); audio.setMuted(false); audio.setPaused(false);
  await audio.context.resume();
  await Promise.all([audio._samplesPromise, audio._ambiencePromise, audio._cueBuffersPromise]);
  const ids = ['race.start.light', 'race.start.go', 'race.position.gain', 'race.lap.final', 'race.finish.flag'];
  const report = {native: [], cues: [], decoded: [], lifecycle: [], steps: 0, phase: 'race',
    memoryOnly: true, syntheticResults: false, simulationEdits: false, listeningApproved: false};
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
  let observingCue = null, control = null, replay = true;
  const sources = [], lastEvents = {};
  audio.context.createBufferSource = function(...args) {
    const source = original.createSource.apply(this, args);
    if (ids.includes(observingCue)) {
      const row = {id: observingCue, phase: report.phase, started: false, ended: false, stops: []};
      const start = source.start.bind(source), stop = source.stop.bind(source);
      source.start = (...values) => { row.started = true; row.buffer = source.buffer; return start(...values); };
      source.stop = (...values) => { row.stops.push(values[0] ?? this.currentTime); return stop(...values); };
      source.addEventListener('ended', () => { row.ended = true; });
      sources.push(row);
    }
    return source;
  };
  audio._playCue = function(id, ...args) {
    const previous = observingCue; observingCue = id;
    let voice;
    try { voice = original.play.call(this, id, ...args); } finally { observingCue = previous; }
    if (ids.includes(id) || ['interface.countdown', 'interface.go', 'interface.win', 'interface.lose'].includes(id))
      report.cues.push({id, phase: report.phase, started: !!voice});
    return voice;
  };
  audio.event = function(ev, state, course) {
    const kind = ev.startLight ? 'light' : ev.go && ev.lightsOut ? 'go' : ev.positionGain ? 'gain' :
      ev.finalLap ? 'final' : ev.stageResult?.grandPrix && ev.stageResult.completed ? 'finish' : null;
    const before = kind ? JSON.stringify(state) : null;
    const result = original.event.call(this, ev, state, course);
    if (kind) {
      demand(JSON.stringify(state) === before, 'Audio changed native race state: ' + kind);
      const count = report.cues.length;
      original.event.call(this, ev, state, course);
      original.event.call(this, {...ev}, state, course);
      demand(report.cues.length === count, 'Duplicate audio delivery: ' + kind);
      demand(JSON.stringify(state) === before, 'Repeated audio changed native race state');
      report.native.push({kind, phase: report.phase, light: ev.startLight,
        at: state.stageTimeSec, position: state.field.position, laps: state.completedLaps});
      lastEvents[kind] = ev;
    }
    return result;
  };
  app.duel.startCampaign = function(options) {
    if (replay) {
      control = new this.constructor({seed: this.seed, car: this.carKey,
        difficulty: this.difficultyKey, featureFlags: this.featureFlags});
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
      report.replayDifference = Object.keys(state).filter(key => JSON.stringify(state[key]) !== JSON.stringify(control.state[key]));
      report.raceFingerprint = await digest(JSON.stringify(state));
      report.replayFingerprint = await digest(JSON.stringify(control.state));
      demand(report.replayDifference.length === 0, 'Native input replay differs with audio: ' + report.replayDifference.join(', '));
      report.result = {position: state.results.position, time: state.results.stageTimeSec,
        laps: state.completedLaps, fieldSize: state.results.fieldSize};
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
  start();
  return {decoded: report.decoded.length, context: audio.context.state};
}

async function ready(context) {
  await context.waitFor(`(() => {const a=window.__qaApp;a.onFrame?.(a.duel.state);return a.visualReady;})()`,
    'actual campaign visual readiness', 60_000);
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=grand-prix');
  await context.waitFor(`!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, 'isolated audio App', 60_000);
  await context.evaluate(`window.__qaApp.setGraphicsQuality('performance')`);
  await context.evaluate(`(${install.toString()})()`);
  try {
    await ready(context);
    for (let batch = 0; batch < 360; batch++) {
      const state = await context.evaluate(`(() => {
        const q=window.__p4Audio,a=q.app;
        a.advance(a.duel.state.status==='countdown'?.25:5);
        a._updateAudio();
        a.onFrame?.(a.duel.state);
        return {status:a.duel.state.status,time:a.duel.state.stageTimeSec,laps:a.duel.state.completedLaps};
      })()`);
      if (batch % 24 === 0) console.log('P4 native race progress: ' + JSON.stringify(state));
      if (state.status === 'stage_result') break;
      if (['gameover', 'complete'].includes(state.status)) throw Error('Autopilot ended before a completed Grand Prix: ' + JSON.stringify(state));
      if (batch === 359) throw Error('Genuine Grand Prix did not finish within bounded advance: ' + JSON.stringify(state));
    }
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
    })()`);
  } finally {
    const report = await context.evaluate('window.__p4Audio.result()');
    await writeFile(join(context.outputDir, 'p4-audio.json'), JSON.stringify(report, null, 2) + '\n');
  }
}
