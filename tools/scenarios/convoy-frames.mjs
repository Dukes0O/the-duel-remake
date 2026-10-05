import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function click(context, selector) {
  const at = await context.evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    if (!button || button.disabled) throw Error('Missing Convoy frame control');
    const rect = button.getBoundingClientRect();
    return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...at});
  }
}

async function ready(context) {
  await context.waitFor(`(() => {
    const app = window.__qaApp;
    app?.onFrame?.(app.duel.state, 0);
    return app?.visualReady && document.querySelector('#renderer-loading')?.hidden &&
      window.__render?.scene.getObjectByName('convoy-tanker')?.children.length > 0;
  })()`, 'loaded native tanker and Salt Flats', 60000);
}

async function measure(context, quality, distance, present, pair) {
  const label = `${quality}-${distance}-${present ? 'tanker' : 'baseline'}-${pair}`;
  await context.evaluate('window.name = ""');
  await context.navigate('/tools/menu-check.html?flags=convoy-raid&harness=convoy-frames');
  await context.waitFor('!!window.__qaApp && !!window.__render', 'memory-only Convoy App', 60000);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.stop();
    if (!window.name.startsWith('__duel_qa_tab_v2:') ||
        !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) {
      throw Error('Memory-only frame fixture required');
    }
    app.audio.setMuted(true);
    app.setGraphicsQuality(${JSON.stringify(quality)});
    app.cameraMode = 'chase';
    app.cpuDifficulty = 'medium';
    app.profile.wasteland.discoveredGate = true;
    app.profile.wasteland.xp = 1000000;
    app.profile.wasteland.territories.tollkeeper.hold = 10;
    if (!app._saveProfile() || !app.visitWasteland()) throw Error('Native yard fixture failed');
    document.head.insertAdjacentHTML('beforeend', '<style>details{display:none!important}</style>');
  })()`);
  await context.waitFor(`(() => {const app = window.__qaApp; app.onFrame?.(app.duel.state, 0);
    return app.visualReady && document.querySelector('#renderer-loading')?.hidden;})()`, 'native yard', 60000);
  await context.evaluate('window.__qaApp.advance(8)');
  await click(context, '[data-action="yard-scrapdome"]');
  await click(context, '[data-arena-mode="convoy-raid"]');
  await click(context, '[data-action="arena-start"]');
  await ready(context);
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    app.advance(3.1);
    const state = app.duel.state, rig = state.opponents[0];
    if (state.status !== 'racing' || state.arena.mode !== 'convoy-raid') {
      throw Error('Native Convoy countdown did not finish');
    }
    Object.assign(state, {s: rig.s - ${distance}, prevS: rig.s - ${distance},
      lateral: rig.lateral, prevLateral: rig.lateral, speedMph: rig.speedMph,
      headingError: rig.headingError, yawVelocity: 0, pushVelocity: 0});
    app.keys = {};
    app.duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    app.onFrame?.(state, 0);
    const model = window.__render.scene.getObjectByName('convoy-tanker');
    if (!model?.visible || !model.children.length) throw Error('Approved tanker is not visible');
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === 'Measure frame pacing');
    if (!button) throw Error('Existing frame profiler control missing');
    const originalStep = app.duel.step, originalDraw = window.__render.composer.render;
    const actor = value => ({s: value.s, lateral: value.lateral, speedMph: value.speedMph,
      headingError: value.headingError, armor: value.armor, maxArmor: value.maxArmor,
      airHeight: value.airHeight, finished: value.finished, combatWrecking: value.combatWrecking});
    const review = window.__convoyFrames = {model, originalStep, originalDraw,
      profile: JSON.stringify(app.profile), ticks: 0, witnesses: [], drawCount: 0,
      startedAt: state.stageTimeSec, rigStartedAt: rig.s,
      seed: app.duel.seed, cameraStartedAt: window.__render.camera.position.toArray()};
    app.duel.step = function(dt) {
      const result = originalStep.call(this, dt);
      review.ticks++;
      if (review.ticks % 120 === 0 && review.ticks <= 360) {
        review.witnesses.push({tick: review.ticks, time: state.stageTimeSec,
          player: actor(state), opponents: state.opponents.map(actor),
          convoy: structuredClone(state.arena.convoy)});
      }
      return result;
    };
    window.__render.composer.render = function(...args) {
      review.drawCount++;
      if (${present}) return originalDraw.apply(this, args);
      const parent = model.parent, index = parent?.children.indexOf(model), visible = model.visible;
      if (!parent || index < 0) throw Error('Tanker baseline lost its presentation owner');
      parent.remove(model);
      try {return originalDraw.apply(this, args);}
      finally {
        parent.add(model);
        parent.children.splice(parent.children.indexOf(model), 1);
        parent.children.splice(index, 0, model);
        model.visible = visible;
      }
    };
    app.start();
    button.click();
  })()`);
  try {
    await context.waitFor(`document.querySelector('#performance-results')?.textContent.includes('"frames": 120')`,
      label + ' delivered native frames', 35000);
    const result = await context.evaluate(`(() => {
      const app = window.__qaApp, state = app.duel.state, review = window.__convoyFrames;
      app.stop();
      if (state.status !== 'racing' || state.stageTimeSec <= review.startedAt ||
          state.opponents[0].s === review.rigStartedAt || !review.drawCount ||
          window.__render.camera.position.toArray().every((value, i) => value === review.cameraStartedAt[i])) {
        throw Error('Profiler did not cover a moving native fight and camera');
      }
      if (JSON.stringify(app.profile) !== review.profile || !review.model.parent || !review.model.visible) {
        throw Error('Frame baseline changed career or tanker ownership');
      }
      const camera = window.__render.camera;
      const projected = review.model.getWorldPosition(camera.position.clone());
      projected.y += 1.7;
      projected.project(camera);
      if (Math.abs(projected.x) >= .95 || Math.abs(projected.y) >= .95 ||
          projected.z < -1 || projected.z > 1) throw Error('Moving tanker is outside the camera view');
      return {seed: review.seed, witnesses: review.witnesses, ticks: review.ticks,
        drawCount: review.drawCount, startedAt: review.startedAt, endedAt: state.stageTimeSec,
        profileUnchanged: true, tankerRestored: true,
        pacing: JSON.parse(document.querySelector('#performance-results').textContent).at(-1)};
    })()`);
    const pacing = result.pacing, cpu = pacing.phaseTiming?.cpuMs;
    if (pacing.frames !== 120 || pacing.quality !== (quality === 'high' ? 'High' : 'Performance') ||
        pacing.startScale !== pacing.endScale || !Number.isFinite(pacing.p95) || pacing.p95 <= 0 ||
        cpu?.renderSubmit?.samples < 110 || !result.witnesses.length) {
      throw Error('Invalid or changing-scale frame sample');
    }
    result.capture = await context.screenshot(label);
    return {quality, distance, present, pair, ...result};
  } finally {
    await context.evaluate(`(() => {
      const app = window.__qaApp, review = window.__convoyFrames;
      app.stop();
      app.duel.step = review.originalStep;
      window.__render.composer.render = review.originalDraw;
      if (!review.model.parent || !review.model.visible) throw Error('Tanker draw cleanup failed');
    })()`);
  }
}

function cost(row) {
  const pacing = row.pacing;
  const passes = pacing.passTiming?.passes || [];
  const gpuAvailable = pacing.passTiming?.gpuStatus?.startsWith('available');
  const gpuValid = gpuAvailable && passes.length > 0 && passes.every(pass => pass.gpuMs?.samples >= 100);
  return {delivered: pacing.p95, cpu: pacing.phaseTiming.cpuMs.renderSubmit.p95Ms,
    gpu: gpuValid ? passes.reduce((sum, pass) => sum + pass.gpuMs.p95, 0) : null};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  });
  const report = {card: 'CONVOY-FRAMES', rows: [], comparisons: [], passed: false,
    method: 'Seeded native Convoy entry, one repeated coasting pose, ordinary chase camera and real-time App physics. Existing 120-frame profiler only.',
    baseline: 'Only the loaded tanker presentation group is detached around composer drawing and restored to its exact parent/index/visibility. Native movement, pose and valve updates remain common.',
    limits: ['Delivered intervals, CPU submission and completed GPU pass costs are separate; they are not added together.',
      'Summed GPU pass p95 values are a pass-cost proxy, not a whole-frame GPU percentile. Native tanker pose and lamp updates remain in the baseline.']};
  const persist = () => writeFile(join(context.outputDir, 'convoy-frames.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    for (const quality of ['high', 'performance']) {
      for (const distance of [35, 110]) {
        for (const pair of [1, 2]) {
          for (const present of pair === 1 ? [false, true] : [true, false]) {
            report.rows.push(await measure(context, quality, distance, present, pair));
            await persist();
          }
          const rows = report.rows.filter(row => row.quality === quality && row.distance === distance && row.pair === pair);
          const baseline = rows.find(row => !row.present), tanker = rows.find(row => row.present);
          const count = Math.min(baseline.witnesses.length, tanker.witnesses.length);
          if (baseline.pacing.startScale !== tanker.pacing.startScale ||
              baseline.pacing.renderPixelRatio !== tanker.pacing.renderPixelRatio ||
              baseline.pacing.viewport !== tanker.pacing.viewport ||
              baseline.pacing.gpu !== tanker.pacing.gpu) throw Error('Matched renderer configurations differ');
          if (baseline.seed !== tanker.seed || JSON.stringify(baseline.witnesses.slice(0, count)) !==
              JSON.stringify(tanker.witnesses.slice(0, count))) throw Error('Matched native Convoy paths diverged');
          const a = cost(baseline), b = cost(tanker);
          report.comparisons.push({quality, distance, pair, matchedTicks: count * 120,
            baseline: a, tanker: b, addedPercent: Object.fromEntries(Object.keys(a).map(key =>
              [key, a[key] > 0 && b[key] != null ? (b[key] / a[key] - 1) * 100 : null]))});
          await persist();
        }
      }
    }
    const paired = report.comparisons;
    report.requiresSimplification = paired.some(row => ['delivered', 'cpu', 'gpu'].some(key =>
      row.addedPercent[key] > 10 && paired.some(other => other.quality === row.quality &&
        other.distance === row.distance && other.pair !== row.pair && other.addedPercent[key] > 10)));
    report.inconclusive = paired.some(row =>
      ['delivered', 'cpu', 'gpu'].some(key => row.addedPercent[key] > 10)) && !report.requiresSimplification;
    report.passed = !report.requiresSimplification && !report.inconclusive;
    await persist();
    if (!report.passed) throw Error(report.requiresSimplification ?
      'Matched tanker cost exceeds ten percent; distant-view hook review required' :
      'Matched tanker cost is noisy; one bounded repeated measurement is needed');
  } catch (error) {
    report.failure = error.message;
    await persist();
    throw error;
  }
}
