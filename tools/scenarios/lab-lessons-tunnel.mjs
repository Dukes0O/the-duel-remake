// Real UI, loaded models, isolated memory-only careers via browser-harness.
const ids = (process.env.LAB_TUNNEL_QA_LESSONS ?? 'grip,downforce,braking,suspension,fuel').split(',');
// The lesson driver is shared: LAB-TUNE-VIEW takes the Downforce lesson through it to open the wing on the Tune page.
export function tunnelDriver(c) {
  const canvas = `document.querySelector('.lab-canvas')`, panel = `document.querySelector('.lab-teaching')`;
  const click = action => c.evaluate(`document.querySelector('[data-teach="${action}"]').click()`);
  const next = () => c.waitFor(`!!document.querySelector('[data-teach="next"]') && !document.querySelector('[data-teach="next"]').disabled`, 'step ready', 40_000);
  async function walkToTunnel() {
    await c.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'room', 60_000);
    await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]').click()`);
    await c.waitFor(`${canvas}.dataset.labWalkArrived === 'wind-tunnel'`, 'walk to tunnel', 30_000);
  }
  async function useTunnel() {
    await c.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'KeyE', key: 'e'});
    await c.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'KeyE', key: 'e'});
    await c.waitFor(`!!document.querySelector('[data-lab-lesson="start:grip"]')`, 'tunnel choices');
  }
  async function setControls(spec, wanted) {
    // A newly entered try resets input immediately; its displayed result follows
    // on the next render. Read the current machine, not the previous try's label.
    await c.evaluate(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))))`);
    for (const [setting, value] of Object.entries(wanted)) {
      const control = spec.controls.find(x => (x.setting ?? x.id) === setting && (Number.isFinite(x.min) || x.value === value));
      if (!control) throw Error(`Missing ${setting}`);
      if (!Number.isFinite(control.min)) { await click(`control:${control.id}`); continue; }
      let current = await c.evaluate(`JSON.parse(${canvas}.dataset.labTunnelResult).settings[${JSON.stringify(setting)}]`), turns = 0;
      if (control.drag) {
        await c.command('Input.dispatchKeyEvent', {type: 'keyDown', code: 'ArrowDown', key: 'ArrowDown'});
        try { await c.waitFor(`JSON.parse(${canvas}.dataset.labTunnelResult).settings[${JSON.stringify(setting)}] === ${control.min}`, 'lower dial to its stop'); await new Promise(r => setTimeout(r, 350)); }
        finally { await c.command('Input.dispatchKeyEvent', {type: 'keyUp', code: 'ArrowDown', key: 'ArrowDown'}); }
        current = control.min;
      }
      while (current !== value && turns < 40) {
        await click(`control:${control.id}`); current += control.step;
        if (current > control.max && control.cycle) current = control.min;
        turns++;
      }
      if (current !== value) throw Error(`Cannot reach ${setting}=${value}`);
      try { await c.waitFor(`JSON.parse(${canvas}.dataset.labTunnelResult).settings[${JSON.stringify(setting)}] === ${JSON.stringify(value)}`, `machine ${setting} at ${value}`); }
      catch (error) { await c.screenshot('blocked-machine'); throw Error(error.message + ': ' + await c.evaluate(`${canvas}.dataset.labTunnelResult + ' / ' + ${panel}.textContent`)); }
    }
  }
  async function play(id) {
    const {definition, spec} = await import(`../../src/lab/lessons/${id}-lesson.js`);
    await useTunnel();
    await c.evaluate(`document.querySelector('[data-lab-lesson="start:${id}"]').click()`);
    await c.waitFor(`${canvas}.dataset.labTunnelModel === '${id}' && ${panel}?.textContent.includes('Wonder')`, `${id} loaded`);
    await c.screenshot(`${id}-wonder`); await click('next');
    for (let i = 0; i < definition.words.length; i++) { await c.waitFor(`${panel}?.textContent.includes('New words')`, 'word'); if (i === 0) await c.screenshot(`${id}-word`); await click('next'); }
    for (let i = 0; i < definition.worked.length; i++) {
      await next(); await c.screenshot(`${id}-watch-${i}`);
      if (i === 0) { await click('pause'); await click('step'); await click('replay'); await next(); }
      await click('next');
    }
    await c.screenshot(`${id}-predict`);
    // A wrong picture must explain the difference and allow a retry.
    await click(`answer:${definition.tries[0].prediction.answers.find(a => a.id !== definition.tries[0].prediction.correct).id}`);
    await click('run'); await c.waitFor(`!!document.querySelector('[data-teach="retry"]')`, 'wrong prediction');
    await c.screenshot(`${id}-hint`); await click('retry');
    for (let i = 0; i < 3; i++) {
      if (i === 0) {
        await c.waitFor(`JSON.parse(${canvas}.dataset.labLessonControls ?? '[]').length > 0`, 'redrawn machine click targets');
        const target = await c.evaluate(`(() => { const b=${canvas}.getBoundingClientRect(), p=JSON.parse(${canvas}.dataset.labLessonControls)[0]; return {id:p.id,x:b.left+p.x,y:b.top+p.y}; })()`);
        const before = await c.evaluate(`${canvas}.dataset.labTunnelResult`);
        await c.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: target.x, y: target.y, button: 'left', clickCount: 1});
        const drag = spec.controls.find(x => x.id === target.id)?.drag;
        if (drag) await c.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: target.x, y: target.y - 50, button: 'left', buttons: 1});
        await c.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: target.x, y: target.y - (drag ? 50 : 0), button: 'left', clickCount: 1});
        try { await c.waitFor(`${canvas}.dataset.labTunnelResult !== ${JSON.stringify(before)}`, '3D part acted on'); }
        catch (error) {
          await c.screenshot('blocked-part');
          const top = await c.evaluate(`(() => { const e = document.elementFromPoint(${target.x}, ${target.y}); return e ? e.tagName + '.' + e.className : 'nothing'; })()`);
          throw Error(error.message + ` (${target.id} at ${Math.round(target.x)},${Math.round(target.y)}; on top there: ${top})`);
        }
      }
      await setControls(spec, spec.examples[i]);
      await click(`answer:${spec.classify(spec.bench.run(spec.examples[i]))}`); await click('run');
      await next(); if (i === 2) await c.screenshot(`${id}-alone`); await click('next');
    }
    for (let i = 0; i < definition.checks.length; i++) {
      const q = definition.checks[i]; await click(`answer:${q.answers.find(a => a.id !== q.correct).id}`);
      await c.waitFor(`${panel}.textContent.includes('Watch the highlighted picture')`, 'correct picture replay');
      if (i === 0) await c.screenshot(`${id}-check`); await click('next');
    }
    if (await c.evaluate(`!!window.__qaApp.profile.lab?.done?.${id}`)) throw Error('Teaching awarded challenge progress.');
    await click('challenge');
    await c.waitFor(`${panel}?.textContent.includes('Challenge') && ${canvas}.dataset.labTunnelModel === '${id}'`, 'loaded inline challenge');
    await c.screenshot(`${id}-challenge`);
    const overlaps = await c.evaluate(`(() => { const card=document.querySelector('.lab-key-idea'); if (!card || card.hidden) return []; const a=card.getBoundingClientRect(); card.hidden=true; try { return [...document.querySelectorAll('button,.lab-teaching,.lab-side')].filter(b=>{const r=b.getBoundingClientRect(); const visible=r.width>0&&r.height>0&&b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)); return visible&&a.left<r.right&&a.right>r.left&&a.top<r.bottom&&a.bottom>r.top;}).map(b=>b.className+' '+b.textContent.slice(0,80)); } finally {card.hidden=false;} })()`);
    if (overlaps.length) throw Error('Key idea overlaps visible controls: ' + overlaps.join(', '));
    const wanted = id === 'suspension' ? {spring: 'stiff', road: 'smooth'} : spec.examples[2];
    await setControls(spec, wanted); await click(`answer:${spec.classify(spec.bench.run(wanted))}`); await click('run');
    await c.waitFor(`!!document.querySelector('[data-teach="finish"]')`, 'challenge run');
    await c.screenshot(`${id}-challenge-result`); await click('finish');
    await c.waitFor(`window.__qaApp.profile.lab?.done?.${id} === true`, `${id} real goal and reward`);
  }
  return {walkToTunnel, play};
}

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await c.navigate('/tools/menu-check.html');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`, 'menu', 90_000);
  await c.evaluate(`(() => { const a = window.__qaApp; a.audio.setMuted?.(true); a.addPlayer('Tunnel QA');
    a.profile = {...a.profile, drivingLessons: {version: 1, done: {corner: true}}}; a._saveProfile();
    document.querySelectorAll('body > details').forEach(e => e.open = false); a.openLab(); })()`);
  const driver = tunnelDriver(c);
  await driver.walkToTunnel();
  for (const id of ids) await driver.play(id);
  await c.evaluate(`window.__qaApp.closeLab()`);
}
