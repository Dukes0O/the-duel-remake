// Recorded load/coast engine layers and tires, with original wind and music.
// See public/assets/audio/CREDITS.md. Audio starts only after a user gesture.
const ENGINE_BANDS = [
  { key: 'idle', rpm: .18, toneHz:68 }, { key: 'loadLow', rpm: .44, toneHz:81 },
  { key: 'loadMid', rpm: .65, toneHz:81 }, { key: 'loadHigh', rpm: .82, toneHz:86 },
];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class EngineAudio {
  constructor() {
    this.context = null;
    this.muted = readMuted();
    this.paused = false;
    this.nextBeat = 0;
    this.beatIndex = 0;
    this.nextRadar = 0;
    this.samples = {}; this.sampleStatus = 'locked';
    this.smoothedLoad = 0; this.lastThrottle = 0; this.lastUpdateTime = 0;
    this.nextThrottle = 0; this.shiftUntil = 0; this.activeShots = new Set();
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
    const entries=[
      ['engine','engine-loop.wav'], ['squeal','tire-loop.wav'],
      ['idle','engine-idle.wav'], ['loadLow','engine-load-low.wav'],
      ['loadMid','engine-load-mid.wav'], ['loadHigh','engine-load-high.wav'],
      ['coast','engine-coast.wav'], ['throttle','engine-throttle.wav',true],
      ['lift','engine-lift.wav',true], ['shift','engine-shift.wav',true],
      ['explosion','catastrophic-blast.wav',true],
    ];
    const results=await Promise.allSettled(entries.map(async([key,file,oneShot])=>{
      const response=await fetch(`/assets/audio/${file}`);if(!response.ok)throw Error(file);
      const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
      if(oneShot){this.samples[key]=buffer;return;}
      const source=this.context.createBufferSource(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();
      source.buffer=buffer;source.loop=true;gain.gain.value=0;filter.type='lowpass';filter.frequency.value=key==='squeal'?5800:2400;
      source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.samples[key]={source,gain,filter};
    }));
    this.sampleStatus=results.every(r=>r.status==='fulfilled')?'ready':'fallback';
  }

  _sample(buffer,volume=1,rate=1) {
    const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain(),start=ctx.currentTime;
    source.buffer=buffer;source.playbackRate.value=rate;
    const duration=buffer.duration/rate;
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.008);
    gain.gain.setValueAtTime(volume,start+Math.max(.009,duration-.035));gain.gain.linearRampToValueAtTime(0,start+duration);
    source.connect(gain);gain.connect(this.master);source.start();
    const voice={source,gain};this.activeShots.add(voice);
    source.onended=()=>{source.disconnect();gain.disconnect();this.activeShots.delete(voice);};
    return voice;
  }

  _stopShot(voice) {
    if(!voice||voice.stopping||!this.activeShots.has(voice))return;
    voice.stopping=true;
    const t=this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(t);
    voice.gain.gain.setTargetAtTime(0,t,.018);
    try{voice.source.stop(t+.08);}catch(_){}
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
  setPaused(paused) {
    this.paused = !!paused; this._volume();
    if(this.paused){for(const voice of this.activeShots)this._stopShot(voice);this.lastThrottle=0;}
  }
  _volume() {
    if (this.context) this.master.gain.setTargetAtTime(this.muted || this.paused ? 0 : 0.42, this.context.currentTime, 0.025);
  }

  update(st) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    if (this.paused !== st.paused) this.setPaused(st.paused);
    const t = ctx.currentTime;
    const dt=clamp(t-this.lastUpdateTime,0,.1);this.lastUpdateTime=t;
    const racing = st.status === 'racing' && !st.paused;
    const impacting = st.impactTimer > 0;
    const running = (racing && !impacting) || (st.status === 'countdown' && !st.paused);
    const speed = Math.min(1.2, st.speedMph / 200);
    const rpm = 0.18 + clamp(st.revs,0,1.15) * 0.82;
    const throttle=running?clamp(st.input.throttle,0,1):0;
    this.smoothedLoad+=(throttle-this.smoothedLoad)*(1-Math.exp(-dt/.065));
    const load=this.smoothedLoad,shiftCut=t<this.shiftUntil?.3:1;
    const bandWeights=engineBandWeights(rpm);
    const bandCoverage=ENGINE_BANDS.reduce((sum,band,i)=>sum+(this.samples[band.key]?bandWeights[i]**2:0),0);
    const coverage=clamp(bandCoverage*load+(this.samples.coast?1:0)*(1-load),0,1);
    // Match the dominant recorded tone during crossfades. At high revs the
    // leveled steady loop is the only loaded-engine voice; no pitched overlay.
    const targetTone=62+rpm*47,carPitch=st.car.includes('959')?.93:1;
    for (const layer of this.engine) layer.osc.frequency.setTargetAtTime((32 + rpm * 112) * layer.multiple, t, 0.055);
    this.engineFilter.frequency.setTargetAtTime(500 + rpm * 1700 + (st.input.throttle ? 600 : 0), t, 0.08);
    const synthFallback=this.samples.engine?0:1-coverage;
    this.engineGain.gain.setTargetAtTime(running ? (0.1 + rpm * 0.12 + throttle * 0.045)*synthFallback*shiftCut : 0, t, 0.1);
    this.wind.gain.gain.setTargetAtTime(racing ? speed * speed * 0.085 : 0, t, 0.12);
    const slip = Math.min(1,Math.max(0,Math.abs(st.slipAngle||0)*3.5+Math.abs(st.steerVisual)*speed*.35-.22,st.input.brake*speed*.85-.18));
    for(let i=0;i<ENGINE_BANDS.length;i++){
      const band=ENGINE_BANDS[i],sample=this.samples[band.key];if(!sample)continue;
      // Adjacent recordings crossfade with equal power. Moderate pitch changes
      // retain exhaust texture instead of stretching a single loop sixfold.
      const rate=clamp(targetTone/band.toneHz,.82,1.4)*carPitch;
      sample.source.playbackRate.setTargetAtTime(rate,t,.09);
      sample.filter.frequency.setTargetAtTime(950+rpm*1400+load*350,t,.1);
      const idleSupport=i===0?Math.max(0,1-rpm/.46)*.52:0;
      const volume=bandWeights[i]*(.58+rpm*.35)*Math.sqrt(load)+idleSupport*Math.sqrt(1-load);
      sample.gain.gain.setTargetAtTime(running?volume*shiftCut:0,t,.05);
    }
    if(this.samples.coast){const sample=this.samples.coast;
      sample.source.playbackRate.setTargetAtTime(.68+rpm*.85,t,.065);
      sample.filter.frequency.setTargetAtTime(600+rpm*1500,t,.09);
      sample.gain.gain.setTargetAtTime(running?(.26+rpm*.4)*Math.sqrt(1-load)*shiftCut:0,t,.065);
    }
    if(this.samples.engine){const sample=this.samples.engine;
      sample.source.playbackRate.setTargetAtTime(clamp(targetTone/86,.82,1.4)*carPitch,t,.09);
      sample.filter.frequency.setTargetAtTime(950+rpm*1400+load*350,t,.1);
      sample.gain.gain.setTargetAtTime(running?(.26+rpm*.15+load*.16)*(1-coverage)*shiftCut:0,t,.08);
    }
    if(running&&racing&&!this.muted&&t>=this.nextThrottle){
      if(throttle>.6&&this.lastThrottle<.3&&this.samples.throttle){
        this._stopShot(this.throttleVoice);this._stopShot(this.liftVoice);
        this.throttleVoice=this._sample(this.samples.throttle,.22+rpm*.14,.85+rpm*.28);
        this.nextThrottle=t+.7;
      }else if(throttle<.2&&this.lastThrottle>.65&&st.speedMph>35&&this.samples.lift){
        this._stopShot(this.throttleVoice);
        this.liftVoice=this._sample(this.samples.lift,.2+rpm*.1,.85+rpm*.35);
        this.nextThrottle=t+.45;
      }
    }
    if(!running){this._stopShot(this.throttleVoice);this._stopShot(this.liftVoice);}
    this.lastThrottle=throttle;
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
    if (ev.shift != null) {
      this.shiftUntil=this.context.currentTime+.12;
      this._stopShot(this.throttleVoice);
      if(this.samples.shift)this._sample(this.samples.shift,.42);
      else this._tone(95,0.085,0.075,'triangle');
    }
    if(ev.chickenBonus){
      [523.25,783.99,1046.5].forEach((frequency,i)=>this._tone(frequency,.13,.075,'sine',i*.07));
      this._flutter();
    }
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

  _flutter() {
    const ctx=this.context,start=ctx.currentTime,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=this.noiseBuffer;filter.type='bandpass';filter.frequency.value=1250;filter.Q.value=.55;
    gain.gain.setValueAtTime(0,start);
    for(let i=0;i<5;i++){const at=start+i*.075;gain.gain.linearRampToValueAtTime(.13*(1-i*.13),at+.018);gain.gain.linearRampToValueAtTime(.001,at+.062);}
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.stop(start+.42);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
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

function engineBandWeights(rpm) {
  const weights=[0,0,0,0];
  if(rpm<=ENGINE_BANDS[0].rpm){weights[0]=1;return weights;}
  for(let i=0;i<ENGINE_BANDS.length-1;i++){
    const low=ENGINE_BANDS[i].rpm,high=ENGINE_BANDS[i+1].rpm;
    if(rpm<=high){const blend=clamp((rpm-low)/(high-low),0,1);weights[i]=Math.cos(blend*Math.PI/2);weights[i+1]=Math.sin(blend*Math.PI/2);return weights;}
  }
  weights[3]=1;return weights;
}

function readMuted() {
  try { return localStorage.getItem('duel_audio_muted') === 'true'; } catch (_) { return false; }
}
