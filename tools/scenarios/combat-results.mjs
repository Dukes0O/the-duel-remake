// Private, memory-only visual acceptance for the CMB-03 results panel.
// The harness builds its QA page and uses a throwaway browser profile/port.
const LABELS = ['HITS LANDED', 'WRECKS CAUSED', 'WRECKS TAKEN',
  'KNOCKDOWNS', 'DAMAGE DEALT', 'BEST COMBO', 'COMBAT STYLE'];

async function pass(context, quality, {width, height, name, mobile}) {
  await context.command('Emulation.setDeviceMetricsOverride',
    {width, height, deviceScaleFactor: 1, mobile});
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine')?.disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value",
    `${quality} ${name} memory-only menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value === ${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
    `${quality} ${name} renderer ready`, 60_000);

  const report = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, seed: 1989})) throw Error('Combat result race did not start');
    app.stop();
    const duel = app.duel, state = duel.state;
    Object.assign(state, {status: 'racing', countdown: 0,
      s: 500, prevS: 500, lateral: 0, prevLateral: 0,
      speedMph: 0, invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = Infinity;
    state.combat.pickupTimer = Infinity;
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 100 + index * 100, prevS: 100 + index * 100,
      lateral: 0, prevLateral: 0, speedMph: 0, impactTimer: 0,
    }));
    const victim = state.opponents[1];
    victim.armor = 5;
    const at = duel.course.groundAt(victim.s, victim.lateral);
    state.combat.projectiles.push({kind: 'crossbow', enemy: false, level: 0,
      x: at.x, y: at.y + 2, z: at.z, vx: 0, vy: 0, vz: 0, age: 0});
    duel.step(1 / 120);
    if (!victim.combatWrecking || state.combat.hits !== 1)
      throw Error('The real player bolt did not wreck CPU 2');
    Object.assign(state, {s: duel.raceLength,
      completedLaps: state.lapsTotal, stageTimeSec: 80,
      lapTimes: Array(state.lapsTotal).fill(40)});
    if (!duel._finishStage()) throw Error('Combat result race did not finish');
    app.onFrame?.(state);
    const panel = document.querySelector('#modal-layer .result-panel');
    if (!panel || document.querySelector('#modal-layer').hidden)
      throw Error('Combat results are not visibly mounted');
    const labels = ${JSON.stringify(LABELS)};
    const text = panel.textContent || '';
    const missing = labels.filter(label => !text.includes(label));
    const bounds = panel.getBoundingClientRect();
    return {missing, width: innerWidth, height: innerHeight,
      panel: {left: bounds.left, right: bounds.right, width: bounds.width},
      hitsLanded: state.results.hitsLanded,
      wrecksCaused: state.results.wrecksCaused,
      damageDealt: state.results.damageDealt,
      combatStyleScore: state.results.combatStyleScore,
      opponentCount: state.results.opponentCount,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (report.missing.length || report.hitsLanded !== 1 ||
      report.wrecksCaused !== 1 || report.damageDealt !== 5 ||
      report.combatStyleScore !== 500 || report.opponentCount !== 3 ||
      !report.memoryOnlySaves)
    throw Error(`${quality} ${name} combat results incomplete: ${JSON.stringify(report)}`);
  if (report.width !== width || report.height !== height ||
      report.panel.left < -2 || report.panel.right > width + 2)
    throw Error(`${quality} ${name} combat results clip the viewport: ${JSON.stringify(report)}`);
  await context.screenshot(`combat-results-${quality}-${name}`);
  console.log(`${quality} ${name} combat results: ${JSON.stringify(report)}`);
}

export async function run(context) {
  try {
    for (const quality of ['high', 'performance']) {
      await pass(context, quality,
        {width: 1280, height: 720, name: 'desktop', mobile: false});
      await pass(context, quality,
        {width: 390, height: 844, name: 'mobile', mobile: true});
    }
  } finally {
    await context.command('Emulation.clearDeviceMetricsOverride');
  }
}
