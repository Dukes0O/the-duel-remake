import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function click(context, selector) {
  const at = await context.evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(selector)});
    if (!button || button.disabled) throw Error('Missing Convoy frame control');
    button.scrollIntoView({block: 'center'});
    const rect = button.getBoundingClientRect();
    return {x: rect.x + rect.width / 2, y: rect.y + rect.height / 2};
  })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...at});
  }
}

async function measure(context, quality, present, pair) {
  const label = `${quality}-${present ? 'tanker' : 'box'}-${pair}`;
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
    window.__render.renderFrame();
    return app.visualReady && document.querySelector('#renderer-loading')?.hidden;})()`, 'native yard', 60000);
  await context.evaluate('window.__qaApp.advance(8); window.__qaApp.onFrame?.(window.__qaApp.duel.state, 0)');
  await context.waitFor('!!document.querySelector(\'[data-action="yard-scrapdome"]\')', 'native yard control', 60000);
  await click(context, '[data-action="yard-scrapdome"]');
  await click(context, '[data-arena-mode="convoy-raid"]');
  await click(context, '[data-action="arena-start"]');
  await context.waitFor(`(() => {
    const app = window.__qaApp;
    app.onFrame?.(app.duel.state, 0); window.__render.renderFrame();
    return app.visualReady && document.querySelector('#renderer-loading')?.hidden &&
      window.__render.scene.getObjectByName('convoy-tanker')?.children.length > 0;
  })()`, 'loaded native tanker and Salt Flats', 60000);
  await context.evaluate(`(() => {
    const app = window.__qaApp, api = window.__render;
    const state = app.duel.state;
    if (state.arena?.mode !== 'convoy-raid' || state.arena.venueId !== 'salt-flats' ||
        state.status !== 'countdown') throw Error('Native Convoy entry missing');
    app.advance(3.1);
    const rig = state.opponents[0], model = api.scene.getObjectByName('convoy-tanker');
    // Use the production Three constructors; importing another copy here adds
    // a second engine to every comparison page before the native frame sample.
    const donor = api.scene.getObjectByName('crew-boarding-charge')?.children.find(node =>
      node.type === 'Mesh' && node.geometry?.type === 'BoxGeometry' &&
      node.material?.type === 'MeshStandardMaterial');
    let nativeGeometry = null;
    model.traverse(node => {
      if (!nativeGeometry && node.isMesh && node.geometry?.isBufferGeometry)
        nativeGeometry = node.geometry;
    });
    if (!donor || !api.camera.position.isVector3 || !nativeGeometry)
      throw Error('Native Three constructor donors are unavailable');
    if (!nativeGeometry.boundingBox) nativeGeometry.computeBoundingBox();
    if (!nativeGeometry.boundingBox?.isBox3)
      throw Error('Native tanker Box3 donor is unavailable');
    const Q = {Box3: nativeGeometry.boundingBox.constructor,
      Vector3: api.camera.position.constructor, Mesh: donor.constructor,
      BoxGeometry: donor.geometry.constructor, MeshStandardMaterial: donor.material.constructor};
    app.keys = {}; app.autopilot = false;
    app.duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    app.inspectionCamera = {position: [0, 0, 0], target: [0, 0, 0]};
    const cameraPose = () => {
      const at = app.duel.course.groundAt(rig.s, rig.lateral);
      const heading = at.heading + (rig.headingError || 0);
      app.inspectionCamera.position.splice(0, 3,
        at.x - Math.sin(heading) * 110 + Math.cos(heading) * 12, at.y + 14,
        at.z - Math.cos(heading) * 110 - Math.sin(heading) * 12);
      app.inspectionCamera.target.splice(0, 3, at.x, at.y + 1.7, at.z);
    };
    cameraPose(); app.onFrame?.(state, 0); api.renderFrame();
    model.updateWorldMatrix(true, true);
    const identity = model.parent.matrixWorld.elements;
    if (identity.some((value, index) => Math.abs(value - (index % 5 === 0 ? 1 : 0)) > 1e-10) ||
        model.scale.toArray().some(value => value !== 1)) throw Error('Box baseline requires identity owner and native scale');
    const bounds = new Q.Box3().setFromObject(model), size = bounds.getSize(new Q.Vector3());
    const center = model.worldToLocal(bounds.getCenter(new Q.Vector3()));
    // At entry rotation can enlarge an axis-aligned world box. Local native
    // bounds give the exact dimensions and centre, independent of the pose.
    const quaternion = model.quaternion.clone(), position = model.position.clone();
    model.quaternion.identity(); model.position.set(0, 0, 0); model.updateWorldMatrix(true, true);
    bounds.setFromObject(model); bounds.getSize(size); bounds.getCenter(center);
    model.quaternion.copy(quaternion); model.position.copy(position); model.updateWorldMatrix(true, true);
    const box = new Q.Mesh(new Q.BoxGeometry(size.x, size.y, size.z),
      new Q.MeshStandardMaterial({color: 0x888888, roughness: .6, metalness: .2}));
    box.name = 'convoy-frame-box'; box.castShadow = box.receiveShadow = true;
    const gl = api.renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const originalStep = app.duel.step, owner = ${quality === 'high'} ? api.composer : api.composer.passes[0];
    const originalDraw = owner.render, originalRendererDraw = api.renderer.render, originalDiagnostics = app.frameDiagnostics;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const review = window.__convoyFrames = {ticks: 0, frames: [], cpu: [], gpu: [],
      pending: [], disjoint: false, active: false, done: false, failure: null,
      witnesses: [], startSnapshot: null, endSnapshot: null, startS: null,
      scales: new Set(), viewports: new Set(), ratios: new Set(), model, box,
      originalStep, originalDraw, originalDiagnostics, owner, seed: app.duel.seed,
      size: size.toArray(), center: center.toArray(), previous: null,
      gpuName: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unavailable',
      gpuSupported: !!ext, originalCamera: null, profile: JSON.stringify(app.profile)};
    const snapshot = () => ({tick: review.ticks, time: state.stageTimeSec,
      rig: {s: rig.s, lateral: rig.lateral, speedMph: rig.speedMph, armor: rig.armor},
      convoy: structuredClone(state.arena.convoy)});
    const poll = () => {
      if (!ext || review.disjoint) return;
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) {
        review.disjoint = true; review.gpu.length = 0;
        for (const row of review.pending) gl.deleteQuery(row.query);
        review.pending.length = 0; return;
      }
      for (let i = review.pending.length - 1; i >= 0; i--) {
        const row = review.pending[i];
        if (!gl.getQueryParameter(row.query, gl.QUERY_RESULT_AVAILABLE)) continue;
        const ms = gl.getQueryParameter(row.query, gl.QUERY_RESULT) / 1e6;
        if (Number.isFinite(ms) && ms >= 0) review.gpu.push(ms);
        gl.deleteQuery(row.query); review.pending.splice(i, 1);
      }
    };
    app.duel.step = function(dt) {
      if (review.endSnapshot) return; // Stop at the same native tick in both paired runs.
      const value = originalStep.call(this, dt); review.ticks++; cameraPose();
      if (review.ticks === 120) {
        review.active = true; review.startS = rig.s; review.startSnapshot = snapshot();
      }
      if (review.active && review.ticks % 120 === 0) review.witnesses.push(snapshot());
      if (review.active && rig.s - review.startS >= app.duel.course.length) review.endSnapshot = snapshot();
      if (state.status !== 'racing' || state.paused) review.failure = 'Native fight stopped before full loop';
      return value;
    };
    // Existing renderer attribution hook, extended only within this private
    // scenario to retain every frame of the loop, rather than its last window.
    app.frameDiagnostics = {active: true, now: () => performance.now(), recordAppFrame() {},
      recordRendererFrame(now, updateMs, submitMs) {
        if (!review.active || review.done) return;
        if (review.previous !== null) review.frames.push(now - review.previous);
        review.previous = now; review.cpu.push(submitMs);
        const host = document.querySelector('#view3d');
        review.scales.add(Number(host.dataset.resolutionScale) || 1);
        review.ratios.add(api.renderer.getPixelRatio());
        review.viewports.add(host.clientWidth + 'x' + host.clientHeight);
        if (review.endSnapshot) {
          review.done = true; review.active = false; app.stop();
          poll();
        }
      }, stop() {} };
    // Replace the native scene model for every view, including the rear mirror
    // and ambient normals. Postprocess quads keep their original presentation.
    api.renderer.render = function(scene, camera) {
      if (scene !== api.scene) return originalRendererDraw.call(this, scene, camera);
      const parent = model.parent, index = parent?.children.indexOf(model), visible = model.visible;
      if (!parent || index < 0 || !visible) throw Error('Native tanker owner lost');
      model.updateWorldMatrix(true, false);
      box.position.copy(center).applyMatrix4(model.matrixWorld);
      box.quaternion.copy(model.quaternion); box.scale.copy(model.scale);
      if (${present}) return originalRendererDraw.call(this, scene, camera);
      parent.add(box); model.visible = false;
      try {return originalRendererDraw.call(this, scene, camera);}
      finally {
        box.removeFromParent(); model.visible = visible;
        if (model.parent !== parent || parent.children.indexOf(model) !== index) {
          review.failure = 'Native tanker presentation ownership changed';
        }
      }
    };
    owner.render = function(...args) {
      poll();
      let query = null;
      if (review.active && ext && !review.disjoint && review.pending.length < 32 &&
          !gl.getQuery(ext.TIME_ELAPSED_EXT, gl.CURRENT_QUERY)) {
        query = gl.createQuery(); if (query) gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      }
      try {return originalDraw.apply(this, args);}
      finally {
        if (query) {gl.endQuery(ext.TIME_ELAPSED_EXT); review.pending.push({query});}
      }
    };
    review.cleanup = () => {
      app.stop(); app.duel.step = originalStep; owner.render = originalDraw;
      api.renderer.render = originalRendererDraw;
      app.frameDiagnostics = originalDiagnostics; app.inspectionCamera = null;
      box.removeFromParent(); box.geometry.dispose(); box.material.dispose();
      for (const row of review.pending) gl.deleteQuery(row.query);
      review.pending.length = 0;
      if (!model.parent || !model.visible) throw Error('Tanker draw cleanup failed');
    };
    app.start();
  })()`);
  try {
    await context.waitFor(`(() => {
      const review = window.__convoyFrames;
      if (review.failure) throw Error(review.failure);
      return review.done;
    })()`, label + ' complete native loop', 180000);
    const result = await context.evaluate(`(() => {
      const review = window.__convoyFrames, state = window.__qaApp.duel.state;
      if (!review.startSnapshot || !review.endSnapshot || state.status !== 'racing' ||
          review.endSnapshot.rig.s - review.startSnapshot.rig.s < window.__qaApp.duel.course.length ||
          JSON.stringify(window.__qaApp.profile) !== review.profile || !review.model.visible || !review.model.parent) {
        throw Error('Full-loop coverage or ownership guard failed');
      }
      const target = review.model.getWorldPosition(window.__render.camera.position.clone());
      target.y += 1.7; target.project(window.__render.camera);
      if (Math.abs(target.x) >= .95 || Math.abs(target.y) >= .95 || target.z < -1 || target.z > 1) {
        throw Error('Tanker outside fixed camera view');
      }
      return {seed: review.seed, frames: review.frames, cpu: review.cpu, gpu: review.gpu,
        gpuStatus: !review.gpuSupported ? 'unsupported' : review.disjoint ? 'disjoint' : 'available',
        gpuName: review.gpuName, scales: [...review.scales], ratios: [...review.ratios],
        viewports: [...review.viewports], size: review.size, center: review.center,
        startSnapshot: review.startSnapshot, endSnapshot: review.endSnapshot,
        loopLength: window.__qaApp.duel.course.length, witnesses: review.witnesses};
    })()`);
    if (result.frames.length < 600 || result.cpu.length < 600 ||
        result.scales.length !== 1 || result.ratios.length !== 1 || result.viewports.length !== 1) {
      throw Error('Invalid or changing-scale loop measurement');
    }
    const summary = values => {
      if (!values.length) return null;
      const sorted = [...values].sort((a, b) => a - b);
      if (sorted.some(value => !Number.isFinite(value) || value < 0)) throw Error('Invalid loop timing');
      return {samples: sorted.length, mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1]};
    };
    const pacing = {delivered: summary(result.frames), cpu: summary(result.cpu), gpu: summary(result.gpu)};
    delete result.frames; delete result.cpu; delete result.gpu;
    if (pacing.delivered.p95 <= 0 || pacing.cpu.p95 <= 0 || result.gpuStatus === 'disjoint' ||
        result.gpuStatus === 'available' && (!pacing.gpu || pacing.gpu.samples < pacing.cpu.samples * .8 || pacing.gpu.p95 <= 0)) {
      throw Error('Insufficient completed GPU or renderer frames');
    }
    await context.evaluate("document.head.insertAdjacentHTML('beforeend', '<style>.combat-opponent-marker{visibility:hidden!important}</style>')");
    result.capture = await context.screenshot(label);
    if (quality === 'high' && present && pair === 1) {
      await context.evaluate(`(() => {
        const app = window.__qaApp, api = window.__render, rig = app.duel.state.opponents[0];
        const review = window.__convoyFrames, lod = review.model.getObjectByName('convoy-tanker-detail');
        const at = app.duel.course.groundAt(rig.s, rig.lateral), heading = at.heading + (rig.headingError || 0);
        review.farCamera = structuredClone(app.inspectionCamera);
        app.inspectionCamera.position.splice(0, 3,
          at.x - Math.sin(heading) * 35 + Math.cos(heading) * 12, at.y + 8,
          at.z - Math.cos(heading) * 35 - Math.sin(heading) * 12);
        api.camera.position.fromArray(app.inspectionCamera.position);
        if (lod) {lod.autoUpdate = false; lod.levels[0].object.visible = true; lod.levels[1].object.visible = false;}
        api.renderFrame({presentationSeconds: app.duel.state.stageTimeSec});
      })()`);
      result.nearOriginal = await context.screenshot('near-original-native');
      await context.evaluate(`(() => {
        const app = window.__qaApp, api = window.__render;
        const lod = window.__convoyFrames.model.getObjectByName('convoy-tanker-detail');
        if (lod) lod.autoUpdate = true;
        api.camera.position.fromArray(app.inspectionCamera.position);
        api.renderFrame({presentationSeconds: app.duel.state.stageTimeSec});
      })()`);
      result.nearSelected = await context.screenshot('near-selected-native');
      await context.evaluate(`(() => {
        const app = window.__qaApp, review = window.__convoyFrames;
        app.inspectionCamera.position.splice(0, 3, ...review.farCamera.position);
        app.inspectionCamera.target.splice(0, 3, ...review.farCamera.target);
      })()`);
    }
    console.log(label + ' loop: ' + JSON.stringify(pacing));
    return {quality, present, pair, ...result, pacing};
  } finally {
    await context.evaluate('window.__convoyFrames?.cleanup()');
  }
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false,
  });
  const report = {card: 'CONVOY-FRAMES', rows: [], comparisons: [], passed: false,
    method: 'Zero player input. Fixed tanker-relative camera 110 m behind/12m across/14m above. Two counterbalanced complete native Salt Flats loops per model and preset.',
    baseline: 'One neutral PBR box exactly matching native local bounds and shadows replaces tanker only during every native-scene draw, including the rear mirror. Native pose and valve updates remain common.',
    limits: ['Renderer RAF intervals, CPU submission and completed whole-view GPU costs are separate.',
      'GPU timer covers High composer or Performance scene pass. CPU attribution uses the existing renderer hook.']};
  const persist = () => writeFile(join(context.outputDir, 'convoy-frames.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    for (const quality of ['high', 'performance']) {
      for (const pair of [1, 2]) {
        for (const present of pair === 1 ? [false, true] : [true, false]) {
          report.rows.push(await measure(context, quality, present, pair)); await persist();
        }
        const rows = report.rows.filter(row => row.quality === quality && row.pair === pair);
        const box = rows.find(row => !row.present), tanker = rows.find(row => row.present);
        for (const key of ['seed', 'size', 'center', 'scales', 'ratios', 'viewports', 'gpuName', 'startSnapshot', 'endSnapshot']) {
          if (JSON.stringify(box[key]) !== JSON.stringify(tanker[key])) throw Error('Matched loop differs: ' + key);
        }
        const count = Math.min(box.witnesses.length, tanker.witnesses.length);
        if (JSON.stringify(box.witnesses.slice(0, count)) !== JSON.stringify(tanker.witnesses.slice(0, count))) {
          throw Error('Matched native loop paths diverged');
        }
        const comparison = {quality, pair, matchedTicks: count * 120, addedPercent: {}};
        for (const metric of ['delivered', 'cpu', 'gpu']) {
          const a = box.pacing[metric], b = tanker.pacing[metric];
          comparison.addedPercent[metric] = a && b ? (b.p95 / a.p95 - 1) * 100 : null;
        }
        report.comparisons.push(comparison); await persist();
      }
    }
    report.requiresSimplification = report.comparisons.some(row =>
      Object.values(row.addedPercent).some(value => value > 10));
    report.passed = !report.requiresSimplification;
    await persist();
    if (!report.passed) throw Error('Tanker adds more than ten percent over matched full-loop box; simplify distant view and remeasure');
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
