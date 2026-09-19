// Recorded engine/tire loops blended with original wind, transmission and music.
// See public/assets/audio/CREDITS.md. Audio starts only after a user gesture.
export class EngineAudio {
  constructor() {
    this.context = null;
    this.muted = readMuted();
    this.paused = false;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.nextRadar = 0;
    this.samples = {}; this.sampleStatus = 'locked';
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    try {
      if (!this.context) this._build(new AudioContext());
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
    } catch (_) { /* Driving is available on devices without Web Audio. */ }
  }

  _build(ctx) {
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted || this.paused ? 0 : 0.42;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -18; limiter.knee.value = 16; limiter.ratio.value = 4;
    this.master.connect(limiter); limiter.connect(ctx.destination);
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 1100;
    this.engineFilter.Q.value = 0.65;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineFilter.connect(this.engineGain); this.engineGain.connect(this.master);
    this.engine = [1, 2, 3.01].map((multiple, index) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = index === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.value = 35 * multiple;
      gain.gain.value = [0.7, 0.24, 0.12][index];
      osc.connect(gain); gain.connect(this.engineFilter); osc.start();
      return { osc, multiple };
    });
    const length = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    this.wind = this._noiseLayer('lowpass', 1600);
    this.tires = this._noiseLayer('bandpass', 950);
    this.boost = this._noiseLayer('highpass', 2400);
    this.siren = ctx.createOscillator(); this.siren.type = 'sine';
    this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0;
    this.siren.connect(this.sirenGain); this.sirenGain.connect(this.master); this.siren.start();
    this.nextBeat = ctx.currentTime + 0.08;
    this._loadSamples();
  }

  async _loadSamples() {
    this.sampleStatus='loading';
    const entries=[['engine','engine-loop.wav'],['squeal','tire-loop.wav'],['explosion','catastrophic-blast.wav']];
    const results=await Promise.allSettled(entries.map(async([key,file])=>{
      const response=await fetch(`/assets/audio/${file}`);if(!response.ok)throw Error(file);
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      if(key==='explosion'){this.samples[key]=buffer;return;}
      const source=this.context.createBufferSource(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();
      source.buffer=buffer;source.loop=true;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=key==='engine'?1800:5800;
      source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.samples[key]={source,gain,filter};
    }));
    this.sampleStatus=results.every(r=>r.status==='fulfilled')?'ready':'fallback';
  }

  _sample(buffer,volume=1) {
    const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=volume;
    source.connect(gain);gain.connect(this.master);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};
  }

  _noiseLayer(type, frequency) {
    const ctx = this.context, source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer; source.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = type; filter.frequency.value = frequency;
    const gain = ctx.createGain(); gain.gain.value = 0;
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start();
    return { filter, gain };
  }

  setMuted(muted) {
    this.muted = !!muted;
    try { localStorage.setItem('duel_audio_muted', String(this.muted)); } catch (_) {}
    this._volume();
  }
  toggleMute() { this.unlock(); this.setMuted(!this.muted); return this.muted; }
  setPaused(paused) { this.paused = !!paused; this._volume(); }
  _volume() {
    if (this.context) this.master.gain.setTargetAtTime(this.muted || this.paused ? 0 : 0.42, this.context.currentTime, 0.025);
  }

  update(st) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    if (this.paused !== st.paused) this.setPaused(st.paused);
    const t = ctx.currentTime;
    const racing = st.status === 'racing' && !st.paused;
    const impacting = st.impactTimer > 0;
    const running = (racing && !impacting) || (st.status === 'countdown' && !st.paused);
    const speed = Math.min(1.2, st.speedMph / 200);
    const rpm = 0.18 + Math.min(1.15, st.revs) * 0.82;
    for (const layer of this.engine) layer.osc.frequency.setTargetAtTime((32 + rpm * 112) * layer.multiple, t, 0.055);
    this.engineFilter.frequency.setTargetAtTime(500 + rpm * 1700 + (st.input.throttle ? 600 : 0), t, 0.08);
    this.engineGain.gain.setTargetAtTime(running ? (0.1 + rpm * 0.12 + st.input.throttle * 0.045)*(this.samples.engine?.24:1) : 0, t, 0.1);
    this.wind.gain.gain.setTargetAtTime(racing ? speed * speed * 0.085 : 0, t, 0.12);
    const slip = Math.min(1,Math.max(0,Math.abs(st.slipAngle||0)*3.5+Math.abs(st.steerVisual)*speed*.35-.22,st.input.brake*speed*.85-.18));
    if(this.samples.engine){const sample=this.samples.engine,load=st.input.throttle;
      sample.source.playbackRate.setTargetAtTime((.64+rpm*1.8)*(st.car.includes('959')?.9:1),t,.065);
      sample.filter.frequency.setTargetAtTime(650+rpm*2400+load*1300,t,.08);
      sample.gain.gain.setTargetAtTime(running?.26+rpm*.15+load*.16:0,t,.06);
    }
    if(this.samples.squeal){const sample=this.samples.squeal;
      sample.source.playbackRate.setTargetAtTime(.88+slip*.25+Math.sin(t*12)*.018,t,.06);
      sample.gain.gain.setTargetAtTime(racing&&!st.offRoad&&!impacting?slip*.43:0,t,.065);
    }
    const impactGrind = impacting ? .2 * st.impactStrength * st.impactTimer / st.impactDuration : 0;
    const roadNoise = st.offRoad ? .025 + st.roughness * speed * .23 : slip * .07;
    this.tires.gain.gain.setTargetAtTime(racing ? Math.max(impactGrind, roadNoise) : 0, t, 0.05);
    this.boost.gain.gain.setTargetAtTime(st.boosting && racing ? 0.1 : 0, t, 0.07);
    this.siren.frequency.setTargetAtTime(580 + Math.sin(t * 5.5) * 170, t, 0.04);
    this.sirenGain.gain.setTargetAtTime(racing && st.police.pursuit?.active ? 0.024 : 0, t, 0.15);
    if (racing && st.police.beep > 0.2 && !st.police.triggered && t >= this.nextRadar) {
      this._tone(1200, 0.045, 0.025);
      this.nextRadar = t + 1.2 - st.police.beep * 1.05;
    }
    if (st.paused || this.muted) { this.nextBeat = t + 0.15; return; }
    if (t >= this.nextBeat) {
      // A quiet original minor-key sequencer sits behind the engine.
      const pattern = [110, 164.81, 220, 261.63, 98, 146.83, 196, 246.94];
      const note = pattern[this.beatIndex % pattern.length];
      this._tone(note * (racing ? 2 : 1), racing ? 0.18 : 0.5, racing ? 0.016 : 0.033, 'triangle');
      if (this.beatIndex % 4 === 0) this._tone(note / 2, racing ? 0.25 : 0.9, 0.028, 'sine');
      this.beatIndex++;
      this.nextBeat = t + (racing ? 0.25 : 0.5);
    }
  }

  event(ev) {
    if (!this.context || this.context.state !== 'running' || this.muted || this.paused || !ev) return;
    if (ev.countdown) this._tone(440, 0.12, 0.16, 'sine');
    if (ev.go) { this._tone(880, 0.32, 0.16); this._tone(1320, 0.22, 0.055); }
    if (ev.shift != null) this._tone(95, 0.085, 0.075, 'triangle');
    if (ev.boostStarted) this._tone(180, 0.25, 0.065, 'sine', 0, 650);
    if (ev.nearMiss) {
      [659.25, 880, 1318.51].forEach((f, i) => this._tone(f, 0.15, 0.06, 'sine', i * 0.055));
    }
    if (ev.escaped || ev.stageResult || ev.complete) {
      [440, 554.37, 659.25, 880].forEach((f, i) => this._tone(f, 0.35, 0.08, 'triangle', i * 0.08));
    }
    if (ev.ticket || ev.gameover) this._tone(110, 0.65, 0.1, 'triangle', 0, 65);
    if(ev.explosion && this.samples.explosion)this._sample(this.samples.explosion,1.15);
    if (ev.crash) {
      const force = .55 + (ev.strength ?? .7) * .45;
      const ctx = this.context, noise = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      noise.buffer = this.noiseBuffer; filter.type = 'lowpass'; filter.frequency.value = 1400;
      noise.connect(filter); filter.connect(gain); gain.connect(this.master);
      gain.gain.setValueAtTime(0.56 * force, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      noise.start(); noise.stop(ctx.currentTime + 0.5);
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
      this._tone(70, 0.4, 0.24 * force, 'sine', 0, 28);
      if(ev.explosion&&!this.samples.explosion){this._tone(44,2,.6,'sine',0,20);this._tone(90,1.2,.2,'triangle',.03,22);}
    }
  }

  _tone(frequency, duration, volume, type = 'sine', delay = 0, endFrequency = null) {
    const ctx = this.context, start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.009);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain); gain.connect(this.master);
    oscillator.start(start); oscillator.stop(start + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}

function readMuted() {
  try { return localStorage.getItem('duel_audio_muted') === 'true'; } catch (_) { return false; }
}
