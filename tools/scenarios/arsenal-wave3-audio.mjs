// Private browser playback check using memory-only storage and the shipped OGG files.
const IDS = ['weapon.mortar.fire', 'weapon.mortar.whistle', 'weapon.mortar.hit',
  'weapon.tesla.charge', 'weapon.tesla.pulse', 'weapon.decoy.deploy',
  'weapon.decoy.burst', 'weapon.nitro.start', 'weapon.nitro.loop'];

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=arsenal,arsenal-wave3');
  await context.waitFor(`!!window.__qaApp &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  'memory-only Arsenal audio page', 30_000);
  const result = await context.evaluate(`(async () => {
    const ids = ${JSON.stringify(IDS)}, app = window.__qaApp;
    app.audio.unlock();
    app.audio.setMuted(false);
    await Promise.all([app.audio._samplesPromise, app.audio._ambiencePromise,
      app.audio._cueBuffersPromise]);
    const rows = [];
    for (const id of ids) {
      const buffers = app.audio.cueBuffers[id];
      if (!Array.isArray(buffers) || buffers.length !== 3 ||
          buffers.some(buffer => !buffer || buffer.sampleRate !== 48000))
        throw Error('Runtime OGG decode missing for ' + id);
      for (let variant = 0; variant < 3; variant++) {
        const native = new OfflineAudioContext(2, 48000 * 2, 48000);
        const Audio = app.audio.constructor;
        const audio = new Audio({flags: {enabled: name => ['arsenal', 'arsenal-wave3'].includes(name)}});
        audio._loadSamples = audio._loadAmbience = audio._loadCueBuffers = () => {};
        audio.muted = false;
        audio._build(native);
        audio.cueBuffers = app.audio.cueBuffers;
        audio.cueIndices.set(id, variant);
        const voice = audio._playCue(id);
        if (!voice) throw Error('New recorded cue did not start: ' + id);
        const rendered = await native.startRendering();
        let peak = 0, energy = 0;
        for (let channel = 0; channel < 2; channel++) {
          const wave = rendered.getChannelData(channel);
          for (let i = 0; i < wave.length; i++) {
            peak = Math.max(peak, Math.abs(wave[i]));
            energy += wave[i] * wave[i];
          }
        }
        const rms = Math.sqrt(energy / (2 * rendered.length));
        if (!(rms > .001 && peak < 1))
          throw Error('New cue is silent or clips in browser: ' + id +
            ' variant ' + variant + ' rms=' + rms + ' peak=' + peak);
        rows.push({id, variant: 'ABC'[variant], duration: buffers[variant].duration,
          rms: +rms.toFixed(5), peak: +peak.toFixed(5)});
      }
    }
    app.audio.setPaused(true);
    const liveVoices = [...app.audio.mixer.voices.values()].reduce((n, set) => n + set.size, 0);
    return {rows, liveVoices, memoryOnly:
      !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (!result.memoryOnly || result.rows.length !== 27 || result.liveVoices)
    throw Error('Arsenal browser audio lifecycle failed: ' + JSON.stringify(result));
  const actions = await context.evaluate(`(async () => {
    const app = window.__qaApp;
    if (!app.addPlayer('Wave Three Audio').ok) throw Error('Audio player creation failed');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
      discoveredGate: true, xp: 100000, scrap: 4000}};
    if (!app._saveProfile()) throw Error('Audio player save failed');
    document.querySelector('#armory-open').click();
    for (const [slot, id] of ['mortar', 'tesla', 'decoy', 'nitro'].entries()) {
      document.querySelector('[data-arsenal-purchase="' + id + '"]').click();
      const select = document.querySelector('[data-loadout-slot="' + slot + '"]');
      select.value = id; select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    document.querySelector('[data-action="armory-close"]').click();
    if (!app.startCampaign({mode: 'wasteland', seed: 202603, car: 'falcone_f42',
      difficulty: 'casual', cpuDifficulty: 'hard', opponentCount: 1}))
      throw Error('Native audio race failed to start');
    app.stop();
    const duel = app.duel, state = duel.state, combat = state.combat;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    combat.aiTimer = combat.pickupTimer = Infinity;
    const place = (actor, s, lateral = 0) => Object.assign(actor,
      {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
        airHeight: 0, prevAirHeight: 0, airborne: false, contactCooldown: 0});
    const tick = (seconds, gap = 20) => {
      for (let i = 0; i < Math.ceil(seconds * 120); i++) {
        place(state, 500); place(state.rival, 500 + gap); duel.step(1 / 120);
      }
      app._updateAudio();
    };
    place(state, 500); place(state.rival, 560);
    app.audio.setPaused(false);
    const events = [];
    duel.onChange((_state, event) => {if (event.arsenalCue) events.push(event.arsenalCue);});
    if (!duel.fireWeapon('mortar')) throw Error('Native Mortar action failed');
    app._updateAudio();
    const moving = app.audio.projectileVoices.size;
    if (!moving) throw Error('Mortar moving whistle missing');
    tick(1.61, 60);
    if (app.audio.projectileVoices.size) throw Error('Mortar whistle survived landing');
    place(state.rival, 510);
    if (!duel.fireWeapon('tesla')) throw Error('Native Tesla action failed');
    tick(.41, 10);
    tick(3.1, 20);
    if (!duel.fireWeapon('decoy')) throw Error('Native Drone action failed');
    state.rival.weaponLoadout = ['crossbow'];
    combat.aiTimer = 0;
    tick(1 / 120, -40); combat.aiTimer = Infinity;
    tick(2.5, -40);
    if (state.opponents.some(actor => actor.drone)) throw Error('Real Crossbow did not burst Drone');
    if (!duel.fireWeapon('nitro')) throw Error('Native Nitro action failed');
    const nitroVoice = app.audio.arsenalFieldVoices.size;
    if (!nitroVoice) throw Error('Nitro loop has no owned voice');
    tick(3.01);
    if (app.audio.arsenalFieldVoices.size) throw Error('Nitro loop survived expiry');
    combat.cooldowns.nitro = 0;
    if (!duel.fireWeapon('nitro')) throw Error('Native second Nitro action failed');
    app.audio.setPaused(true);
    if (app.audio.arsenalFieldVoices.size || app.audio.projectileVoices.size)
      throw Error('Pause left owned Arsenal loops running');
    const liveVoices = [...app.audio.mixer.voices.values()].reduce((n, set) => n + set.size, 0);
    if (liveVoices) throw Error('Pause left mixer voices running');
    return {events, moving, nitroVoice, liveVoices};
  })()`);
  if (IDS.some(id => !actions.events.includes(id)))
    throw Error('Native wave-three cue stream missing: ' + JSON.stringify(actions));
  const contrast = await context.evaluate(`(async () => {
    const app = window.__qaApp, Audio = app.audio.constructor, rate = 48000;
    const ids = ${JSON.stringify(IDS)}, rows = [];
    const state = {car: 'falcone_f42', status: 'racing', paused: false,
      mode: 'wasteland', wastelandGateDiscovered: true, maxArmor: 100,
      speedMph: 160, revs: .95, gear: 3, input: {throttle: 1, brake: 0},
      slipAngle: 0, steerVisual: 0, offRoad: false, roughness: 0,
      airborne: false, airHeight: 0, impactTimer: 0,
      police: {beep: 0, pursuit: null}};
    for (const id of ids) {
      const native = new OfflineAudioContext(6, rate * 2, rate);
      let clock = 0;
      const ctx = new Proxy(native, {get(target, key) {
        if (key === 'state') return 'running';
        if (key === 'currentTime') return clock;
        const value = Reflect.get(target, key, target);
        if (key === 'createBufferSource') return () => {
          const source = value.call(target), start = source.start.bind(source),
            stop = source.stop.bind(source);
          source.start = (at = clock, ...rest) => start(at, ...rest);
          source.stop = (at = clock) => stop(at);
          return source;
        };
        return typeof value === 'function' ? value.bind(target) : value;
      }});
      const audio = new Audio({flags: {enabled: name => ['arsenal', 'arsenal-wave3'].includes(name)}});
      audio._loadAmbience = audio._loadCueBuffers = () => {};
      audio.muted = false;
      audio._build(ctx);
      await audio._samplesPromise;
      audio.cueBuffers = app.audio.cueBuffers;
      for (const [bus, first] of [[audio.buses.engine, 2], [audio.buses.weapons, 4]]) {
        const gain = native.createGain(), split = native.createChannelSplitter(2),
          merge = native.createChannelMerger(6);
        gain.gain.value = .42;
        bus.connect(gain);
        gain.connect(split);
        split.connect(merge, 0, first);
        split.connect(merge, 1, first + 1);
        merge.connect(native.destination);
      }
      for (let frame = 0; frame <= 30; frame++) {
        clock = frame / 60;
        audio.update(state, {});
      }
      audio._playCue(id);
      const rendered = await native.startRendering();
      let engine = 0, weapon = 0, mixPeak = 0;
      const e = rendered.getChannelData(2), w = rendered.getChannelData(4);
      const left = rendered.getChannelData(0), right = rendered.getChannelData(1);
      for (let i = rate / 2; i < rate * .75; i++) {
        engine += e[i] * e[i]; weapon += w[i] * w[i];
        mixPeak = Math.max(mixPeak, Math.abs(left[i]), Math.abs(right[i]));
      }
      rows.push({id, overEngineDb: +(10 * Math.log10(weapon / engine)).toFixed(2),
        mixPeak: +mixPeak.toFixed(5)});
    }
    return rows;
  })()`);
  if (contrast.some(row => !Number.isFinite(row.overEngineDb) ||
      row.overEngineDb < 6 || row.mixPeak >= 1))
    throw Error('Arsenal full-throttle contrast or headroom failed: ' + JSON.stringify(contrast));
  const overlap = await context.evaluate(`(async () => {
    const app = window.__qaApp, Audio = app.audio.constructor, rate = 48000;
    const native = new OfflineAudioContext(2, rate * 3, rate);
    let clock = 0;
    const ctx = new Proxy(native, {get(target, key) {
      if (key === 'state') return 'running';
      if (key === 'currentTime') return clock;
      const value = Reflect.get(target, key, target);
      if (key === 'createBufferSource') return () => {
        const source = value.call(target), start = source.start.bind(source),
          stop = source.stop.bind(source);
        source.start = (at = clock, ...rest) => start(at, ...rest);
        source.stop = (at = clock) => stop(at);
        return source;
      };
      return typeof value === 'function' ? value.bind(target) : value;
    }});
    const audio = new Audio({flags: {enabled: name => ['arsenal', 'arsenal-wave3'].includes(name)}});
    audio._loadAmbience = audio._loadCueBuffers = () => {};
    audio.muted = false;
    audio._build(ctx);
    await audio._samplesPromise;
    audio.cueBuffers = app.audio.cueBuffers;
    const state = {car: 'falcone_f42', status: 'racing', paused: false,
      mode: 'wasteland', wastelandGateDiscovered: true, maxArmor: 100,
      speedMph: 160, revs: .95, gear: 3, input: {throttle: 1, brake: 0},
      slipAngle: 0, steerVisual: 0, offRoad: false, roughness: 0,
      airborne: false, airHeight: 0, impactTimer: 0,
      police: {beep: 0, pursuit: null}};
    for (let frame = 0; frame <= 30; frame++) {
      clock = frame / 60;
      audio.update(state, {});
    }
    for (const id of ${JSON.stringify(IDS)}) audio._playCue(id);
    const rendered = await native.startRendering();
    let peak = 0, energy = 0;
    for (let channel = 0; channel < 2; channel++)
      for (const sample of rendered.getChannelData(channel)) {
        peak = Math.max(peak, Math.abs(sample)); energy += sample * sample;
      }
    return {peak, rms: Math.sqrt(energy / (2 * rendered.length))};
  })()`);
  if (!(overlap.rms > .001 && overlap.peak < 1))
    throw Error('Overlapping Arsenal weapons clip or vanish: ' + JSON.stringify(overlap));
  console.log('Arsenal wave-three browser audio: ' + JSON.stringify(result));
  console.log('Arsenal wave-three native audio: ' + JSON.stringify(actions));
  console.log('Arsenal wave-three full-throttle contrast: ' + JSON.stringify(contrast));
  console.log('Arsenal wave-three simultaneous mix: ' + JSON.stringify(overlap));
}
