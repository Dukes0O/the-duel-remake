import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {FIGHT_VOICE_LINES} from '../../src/fight-voices.js';
import {wavFromPcm} from './audio-race.mjs';

async function recordFightVoices(quality, lines) {
  const app = window.__qaApp;
  if (!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value)
    throw Error('Fight voice capture requires memory-only saves.');
  app.stop(); app.audio.setMuted(true); app.setGraphicsQuality(quality);
  const rate = 44100, secondsPerLine = 6, length = Object.keys(lines).length * secondsPerLine;
  const native = new OfflineAudioContext(6, rate * length, rate);
  const merge = native.createChannelMerger(6); merge.connect(native.destination);
  const destination = native.createGain(), split = native.createChannelSplitter(2);
  destination.connect(split); split.connect(merge, 0, 0); split.connect(merge, 1, 1);
  let clock = 0;
  const ctx = new Proxy(native, {get(target, key) {
    if (key === 'destination') return destination;
    if (key === 'currentTime') return clock;
    if (key === 'state') return 'running';
    const value = Reflect.get(target, key, target);
    if (key === 'createBufferSource') return () => {
      const node = value.call(target), start = node.start.bind(node), stop = node.stop.bind(node);
      node.start = (time = clock, ...args) => start(time, ...args);
      node.stop = (time = clock) => stop(time);
      return node;
    };
    return typeof value === 'function' ? value.bind(target) : value;
  }});
  const Audio = app.audio.constructor;
  const audio = new Audio({flags: {enabled: name => name === 'fight-voices'}});
  audio.muted = false; audio._build(ctx);
  await Promise.all([audio._samplesPromise, audio._ambiencePromise, audio._cueBuffersPromise]);
  for (const id of Object.keys(lines))
    if (!(audio.cueBuffers[id]?.duration > 0)) throw Error('Voice was not decoded: ' + id);
  for (const [bus, index] of [['engine', 2], ['voice', 4]]) {
    const high = native.createBiquadFilter(), low = native.createBiquadFilter();
    const gain = native.createGain(), channels = native.createChannelSplitter(2);
    high.type = 'highpass'; high.frequency.value = 350;
    low.type = 'lowpass'; low.frequency.value = 4000; gain.gain.value = .42;
    audio.buses[bus].connect(high); high.connect(low); low.connect(gain);
    gain.connect(channels); channels.connect(merge, 0, index); channels.connect(merge, 1, index + 1);
  }
  const events = [], cues = [], rows = [];
  const originalPlay = audio._playCue.bind(audio);
  audio._playCue = (id, ...args) => {
    const voice = originalPlay(id, ...args);
    if (lines[id]) cues.push({id, time: clock, started: !!voice});
    return voice;
  };
  const off = app.duel.onChange((state, event) => {
    if (event.stageLoaded == null && !event.weaponFired && !event.raiderWarning) return;
    const before = JSON.stringify(state);
    audio.event(event, state, app.duel.course);
    if (before !== JSON.stringify(state)) throw Error('Voice event changed simulation state.');
    if (event.weaponFired || event.raiderWarning)
      events.push({time: clock, crewId: state.crewId, weapon: event.weaponFired,
        warning: !!event.raiderWarning, zone: event.zone});
  });
  try {
    let index = 0;
    for (const [id, line] of Object.entries(lines)) {
      const offset = index++ * secondsPerLine;
      clock = offset;
      app.duel.startCampaign({mode: 'wasteland', car: 'falcone_f42', seed: 1989,
        discoveredGate: true, crewId: id.startsWith('crew.') ? id.split('.')[1] : 'rook', opponentCount: 1});
      const state = app.duel.state;
      Object.assign(state, {status: 'racing', countdown: 0, paused: false, speedMph: 160,
        revs: .95, gear: 3, traffic: [], stageTimeSec: 10, s: 500, prevS: 500});
      app.duel.setInput({throttle: 1, brake: 0, steer: 0});
      state.combat.aiTimer = state.combat.pickupTimer = Infinity;
      for (const zone of state.raids?.zones || []) zone.nextShotAt = Infinity;
      for (let frame = 0; frame < secondsPerLine * 60; frame++) {
        clock = offset + frame / 60;
        state.stageTimeSec = 10 + frame / 60;
        audio.nextBeat = Infinity;
        if (frame === 30) {
          if (id === 'raider.toll') {
            const zone = state.raids?.zones[0];
            if (!zone) throw Error('Native raider zone missing.');
            Object.assign(state, {s: zone.s - 50, prevS: zone.s - 50, speedMph: 0});
            app.duel.step(1 / 120);
            state.speedMph = 160;
          } else if (!app.duel.fireWeapon('crossbow')) throw Error('Native player weapon failed: ' + id);
        }
        audio.update(state, {biome: 'coast'});
      }
      const call = cues.find(cue => cue.id === id && cue.time >= offset);
      if (!call?.started) throw Error('Native event did not start the kept cue: ' + id);
      rows.push({id, text: line.text, offset, duration: audio.cueBuffers[id].duration});
    }
  } finally {off();}
  const buffer = await native.startRendering();
  const mix = buffer.getChannelData(0), engine = buffer.getChannelData(2), voice = buffer.getChannelData(4);
  let peak = 0;
  for (const row of rows) {
    let v = 0, e = 0, windows = 0;
    const chunk = Math.round(rate * .2), first = Math.round((row.offset + .5) * rate);
    const end = Math.round((row.offset + .5 + row.duration) * rate);
    for (let start = first; start < end; start += chunk) {
      let vp = 0, ep = 0;
      for (let i = start; i < Math.min(start + chunk, end); i++) {
        vp += voice[i] ** 2; ep += engine[i] ** 2;
      }
      if (Math.sqrt(vp / chunk) > .004) {v += vp; e += ep; windows++;}
    }
    row.speechOverEngineDb = 10 * Math.log10(v / e);
    row.activeWindows = windows;
  }
  const pcm = new Int16Array(buffer.length * 2);
  for (let i = 0; i < buffer.length; i++) for (let channel = 0; channel < 2; channel++) {
    const n = buffer.getChannelData(channel)[i]; peak = Math.max(peak, Math.abs(n));
    pcm[i * 2 + channel] = Math.round(Math.max(-1, Math.min(1, n)) * 32767);
  }
  const bytes = new Uint8Array(pcm.buffer); let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return {quality, rate, rows, events, cues, peak, pcm: btoa(binary)};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1366, height: 768, deviceScaleFactor: 1, mobile: false});
  const results = [];
  for (const quality of ['high', 'performance']) {
    await context.navigate('/tools/menu-check.html?flags=fight-voices,crew-gear,arsenal');
    await context.waitFor(`!!window.__qaApp?.visualReady && !!window.__render &&
      !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'private laptop voice HUD', 60000);
    const hud = await context.evaluate(`(async()=>{
      const app=window.__qaApp;app.stop();app.setGraphicsQuality(${JSON.stringify(quality)});
      app.audio.unlock();app.audio.setMuted(true);app.audio.setPaused(false);
      await Promise.all([app.audio._samplesPromise,app.audio._ambiencePromise,app.audio._cueBuffersPromise]);
      const rows=[],lines=${JSON.stringify(FIGHT_VOICE_LINES)};
      for(const crewId of ['rook','cinder','dune','jax','nell','tusk','wren','odessa']){
        app.duel.startCampaign({mode:'wasteland',car:'falcone_f42',seed:1989,
          discoveredGate:true,crewId,opponentCount:1});
        const s=app.duel.state;Object.assign(s,{status:'racing',countdown:0,paused:false,
          s:500,prevS:500,speedMph:0,traffic:[],stageTimeSec:10});
        s.combat.aiTimer=s.combat.pickupTimer=Infinity;
        if(!app.duel.fireWeapon('crossbow'))throw Error('Actual crew weapon failed');
        app.audio.updateFightVoices(s);app.onFrame?.(s);
        const caption=document.querySelector('.combat-fight-subtitle');
        const rect=caption.getBoundingClientRect(),slots=document.querySelector('.combat-slot-bar').getBoundingClientRect();
        if(caption.hidden||caption.textContent!==lines['crew.'+crewId+'.callout'].text)
          throw Error('Wrong or missing muted subtitle: '+crewId);
        const observer=new MutationObserver(()=>{});
        observer.observe(caption,{attributes:true,childList:true,characterData:true,subtree:true});
        for(let repeat=0;repeat<5;repeat++)app.onFrame?.(s);
        const writes=observer.takeRecords().length;observer.disconnect();
        if(writes)throw Error('Unchanged laptop subtitle rewrote the DOM');
        if(rect.left<0||rect.right>innerWidth||rect.top<0||rect.bottom>slots.top||caption.scrollWidth>caption.clientWidth)
          throw Error('Laptop subtitle clips or overlaps weapon slots: '+crewId);
        for(const selector of ['#style-score-panel','#onfoot-hint']){
          const node=document.querySelector(selector),other=node.getBoundingClientRect();
          if(!node.hidden&&rect.left<other.right&&rect.right>other.left&&rect.top<other.bottom&&rect.bottom>other.top)
            throw Error('Subtitle overlaps existing laptop HUD: '+selector);
        }
        rows.push({crewId,text:caption.textContent,bounds:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}});
      }
      document.querySelectorAll('details').forEach(node=>node.hidden=true);
      window.__render.renderFrame();
      return {rows,memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
    })()`);
    await context.screenshot(quality + '-muted-odessa-subtitle');
    const lifecycle = await context.evaluate(`(()=>{
      const a=window.__qaApp,s=a.duel.state,n=document.querySelector('.combat-fight-subtitle');
      s.paused=true;a.audio.updateFightVoices(s);a.onFrame?.(s);
      if(!n.hidden)throw Error('Pause retained a caption');
      s.paused=false;a.audio.updateFightVoices(s);a.onFrame?.(s);
      if(!n.hidden)throw Error('Resume restored stale caption');
      a.duel.emit({raiderWarning:true,zone:'qa-warning'});a.onFrame?.(s);
      if(n.hidden)throw Error('Warning caption missing');
      a.returnToMenu();a.audio.updateFightVoices(a.duel.state);a.onFrame?.(a.duel.state);
      if(!n.hidden)throw Error('Menu retained caption');
      return {pauseCleared:true,noStaleResume:true,menuCleared:true};
    })()`);
    const recording = await context.evaluate(`(${recordFightVoices.toString()})(${JSON.stringify(quality)},${JSON.stringify(FIGHT_VOICE_LINES)})`);
    const wave = wavFromPcm(Buffer.from(recording.pcm, 'base64'), recording.rate);
    delete recording.pcm;
    await writeFile(join(context.outputDir, quality + '-fight-voices.wav'), wave);
    if (recording.peak >= 1 || recording.rows.some(row => row.activeWindows < 3 || row.speechOverEngineDb < 6))
      throw Error('Full-throttle speech contrast/headroom failed: ' + JSON.stringify(recording));
    results.push({quality, hud, lifecycle, recording});
    console.log('Fight voices ' + quality + ': ' + JSON.stringify({peak:recording.peak,rows:recording.rows}));
  }
  await writeFile(join(context.outputDir, 'fight-voices.json'), JSON.stringify({results,
    fixture:'Actual App/Duel event routing and laptop HUD; offline native EngineAudio full-throttle mix.',
    humanListeningPending:true}, null, 2) + '\n');
}
