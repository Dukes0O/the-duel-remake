// Private High/Performance inspection of accepted Wasteland flipbooks.
// The QA entry installs in-memory saves before the game loads.
async function pass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  `${quality} isolated Wasteland menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value ===
    ${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
  `${quality} renderer ready`, 60_000);

  const setup = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, cpuDifficulty: 'hard', seed: 1989}))
      throw Error('Three-car Wasteland race did not start');
    app.stop();
    const duel = app.duel, state = duel.state;
    if (state.opponents.length !== 3 || !Number.isFinite(state.maxArmor))
      throw Error('Armored three-CPU field is unavailable');
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, invulnerableSec: 0, traffic: []});
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 100 + index * 80, prevS: 100 + index * 80,
      lateral: 0, prevLateral: 0, speedMph: 0, impactTimer: 0,
    }));
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    const focus = duel.course.groundAt(500, 0);
    app.inspectionCamera = {
      position: [focus.x + 15, focus.y + 10, focus.z + 18],
      target: [focus.x, focus.y + 2, focus.z],
    };
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.renderFrame();
    document.querySelectorAll('details').forEach(panel => {
      const label = panel.querySelector('summary')?.textContent || '';
      if (label.includes('TEMPORARY SAVES') ||
          label.startsWith('Performance samples')) panel.hidden = true;
    });
    const lightCount = () => {
      let count = 0;
      window.__render.scene.traverse(object => { if (object.isLight) count++; });
      return count;
    };
    window.__combatEffectsLightCount = lightCount();
    return {opponents: state.opponents.length, maxArmor: state.maxArmor,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window,
        'localStorage')?.value, lights: window.__combatEffectsLightCount,
      poolBuildMs: Number(document.querySelector('#view3d')?.dataset.opponentExplosionBuildMs),
      shaderWarmupMs: Number(document.querySelector('#view3d')?.dataset.opponentExplosionWarmupMs)};
  })()`);
  if (!setup.memoryOnlySaves || setup.opponents !== 3)
    throw Error(`${quality} effects setup failed: ${JSON.stringify(setup)}`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.combatEffectsStatus === 'ready'`,
    `${quality} four runtime sheets loaded`, 60_000);
  const atlasWarmupMs = await context.evaluate(`Number(
    document.querySelector('#view3d')?.dataset.combatEffectsWarmupMs)`);
  const baseline = await context.evaluate(`(() => {
    const samples = [];
    for (let frame = 0; frame < 8; frame++) {
      const started = performance.now();
      window.__render.renderFrame();
      samples.push(performance.now() - started);
    }
    return samples;
  })()`);
  const resourceBaseline = await context.evaluate(`({
    programs: window.__render.renderer.info.programs?.length || 0,
    textures: window.__render.renderer.info.memory.textures,
  })`);

  const muzzle = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const at = duel.course.groundAt(state.s, state.lateral);
    state.combat.projectiles = [{kind: 'crossbow', enemy: false, level: 0,
      x: at.x, y: at.y + 2, z: at.z, vx: 160, vy: 0, vz: 0, age: 0}];
    app.onFrame?.(state);
    window.__render.renderFrame();
    const mesh = window.__render.scene.getObjectByName('combat-vfx-muzzle-0');
    if (!mesh?.visible || !mesh.material.map || !mesh.material.transparent)
      throw Error('Muzzle sheet did not draw on the first frame');
    return {visible: mesh.visible, texture: mesh.material.map.image?.width,
      lightCount: sceneLights()};
    function sceneLights() { let count = 0; window.__render.scene.traverse(o => {
      if (o.isLight) count++;
    }); return count; }
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-muzzle-${quality}`);

  const blast = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.combat.projectiles = [];
    const at = duel.course.groundAt(state.s + 5, state.lateral);
    state.combat.bursts = [{kind: 'blast', id: 1, age: 0,
      x: at.x, y: at.y + 1, z: at.z}];
    app.onFrame?.(state);
    const started = performance.now();
    window.__render.renderFrame();
    const renderMs = performance.now() - started;
    const mesh = window.__render.scene.getObjectByName('combat-vfx-burst-0-explosion');
    if (!mesh?.visible) throw Error('First blast atlas frame is hidden');
    window.__combatEffectsFirstUV = Array.from(mesh.geometry.getAttribute('uv').array);
    return {position: mesh.position.toArray(), uv: window.__combatEffectsFirstUV,
      opacity: mesh.material.opacity, renderMs,
      programs: window.__render.renderer.info.programs?.length || 0,
      textures: window.__render.renderer.info.memory.textures};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-blast-first-${quality}`);

  const aged = await context.evaluate(`(() => {
    const app = window.__qaApp, state = app.duel.state;
    state.combat.bursts[0].age = .7;
    app.onFrame?.(state);
    window.__render.renderFrame();
    const mesh = window.__render.scene.getObjectByName('combat-vfx-burst-0-explosion');
    const smoke = window.__render.scene.getObjectByName('combat-vfx-burst-0-smoke');
    const uv = Array.from(mesh.geometry.getAttribute('uv').array);
    if (!mesh.visible || !smoke?.visible ||
        JSON.stringify(uv) === JSON.stringify(window.__combatEffectsFirstUV))
      throw Error('Blast did not progress into visible smoke');
    return {uv, smoke: smoke.visible, opacity: mesh.material.opacity};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-blast-aged-${quality}`);

  const playerWreck = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.combat.bursts = [];
    state.combat.projectiles = [];
    state.armor = 12;
    const at = duel.course.groundAt(state.s, state.lateral);
    state.combat.projectiles.push({kind: 'crossbow', enemy: true,
      level: 0, x: at.x,
      y: at.y + (state.airHeight || 0) + duel._vehicleSpec(state).height / 2,
      z: at.z,
      vx: 0, vy: 0, vz: 0, age: 0});
    duel.step(1 / 120);
    if (!state.combatWrecking || state.armor !== 0)
      throw Error('Player did not enter an armored wreck');
    app.onFrame?.(state);
    // Keep the race HUD visible while the renderer receives a paused dt=0.
    state.paused = true;
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const started = performance.now();
    window.__render.renderFrame();
    const renderMs = performance.now() - started;
    const mesh = window.__render.scene.getObjectByName('combat-vfx-wreck-0-explosion');
    if (!mesh?.visible) throw Error('First paused wreck atlas frame is hidden');
    const frame = {uv: Array.from(mesh.geometry.getAttribute('uv').array),
      opacity: mesh.material.opacity, position: mesh.position.toArray()};
    window.__render.renderFrame();
    const repeated = {uv: Array.from(mesh.geometry.getAttribute('uv').array),
      opacity: mesh.material.opacity, position: mesh.position.toArray()};
    if (JSON.stringify(frame) !== JSON.stringify(repeated))
      throw Error('Paused wreck advanced its atlas pose');
    let lights = 0;
    window.__render.scene.traverse(object => { if (object.isLight) lights++; });
    if (lights !== window.__combatEffectsLightCount)
      throw Error('First wreck changed the scene light count');
    return {armor: state.armor, frame, lights, renderMs,
      programs: window.__render.renderer.info.programs?.length || 0,
      textures: window.__render.renderer.info.memory.textures};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-player-wreck-paused-${quality}`);

  const recovered = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.paused = false;
    for (let frame = 0; frame < 216; frame++) duel.step(1 / 60);
    if (state.combatWrecking ||
        Math.abs(state.armor - state.maxArmor * .6) > 1e-6)
      throw Error('Player did not recover with 60% armor');
    app.onFrame?.(state);
    window.__render.renderFrame();
    const mesh = window.__render.scene.getObjectByName('combat-vfx-wreck-0-explosion');
    if (mesh.visible) throw Error('Recovered wreck still shows its blast');
    return {armor: state.armor, visible: mesh.visible};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-player-recovered-${quality}`);

  const cpuWreck = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const later = state.opponents[1];
    Object.assign(later, {s: state.s + 35, prevS: state.s + 35,
      lateral: 3.1, prevLateral: 3.1, speedMph: 0,
      impactTimer: 0, armor: 12});
    const at = duel.course.groundAt(later.s, later.lateral);
    state.combat.projectiles.push({kind: 'crossbow', enemy: false,
      level: 0, x: at.x,
      y: at.y + (later.airHeight || 0) + duel._vehicleSpec(later).height / 2,
      z: at.z,
      vx: 0, vy: 0, vz: 0, age: 0});
    duel.step(1 / 120);
    if (!later.combatWrecking || later.armor !== 0)
      throw Error('Later CPU did not enter its own wreck');
    const focus = duel.course.groundAt(later.s, later.lateral);
    app.inspectionCamera = {position: [focus.x + 15, focus.y + 10,
      focus.z + 18], target: [focus.x, focus.y + 2, focus.z]};
    app.onFrame?.(state);
    state.paused = true;
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    const started = performance.now();
    window.__render.renderFrame();
    const renderMs = performance.now() - started;
    const mesh = window.__render.scene.getObjectByName('combat-vfx-wreck-2-explosion');
    const player = window.__render.scene.getObjectByName('combat-vfx-wreck-0-explosion');
    const distance = mesh?.position.distanceTo(focus) ?? Infinity;
    if (!mesh?.visible || player?.visible || distance > 5)
      throw Error('Later CPU blast is missing, misplaced or shared with player');
    return {cpuArmor: later.armor, visible: mesh.visible,
      playerVisible: player.visible, distance, renderMs,
      programs: window.__render.renderer.info.programs?.length || 0,
      textures: window.__render.renderer.info.memory.textures};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`combat-vfx-cpu-wreck-${quality}`);

  if (context.issues.length || context.warnings.length)
    throw Error(`${quality} effects browser issues: ` +
      JSON.stringify({issues: context.issues, warnings: context.warnings}));
  console.log(`${quality} combat atlas: ` + JSON.stringify({setup, atlasWarmupMs,
    baseline, resourceBaseline, muzzle,
    blast, aged, playerWreck, recovered, cpuWreck}));
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await pass(context, quality);
}
