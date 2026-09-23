// Inspect the real game UI and pooled pickup meshes with disposable QA saves.
// Two crates from the seed plan are staged together for one readable image;
// their types and IDs remain seeded while their route positions are brought
// close enough to inspect in the same frame.

async function qualityPass(context, quality) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
  `${quality} isolated combat menu`, 60_000);
  await context.evaluate(`(() => {
    const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change', {bubbles: true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value ===
    ${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready'`,
  `${quality} renderer ready`, 60_000);

  const before = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode: 'wasteland', startStage: 0,
      opponentCount: 3, cpuDifficulty: 'hard', seed: 1989}))
      throw Error('Seeded three-opponent Wasteland race did not start');
    app.stop();
    const duel = app.duel, state = duel.state, combat = state.combat;
    if (state.opponents.length !== 3 || !Number.isFinite(state.maxArmor))
      throw Error('Wasteland2 armor and three CPU cars are required');
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      s: 180, prevS: 180, lateral: -2.2, prevLateral: -2.2,
      speedMph: 0, traffic: [], invulnerableSec: 0});
    state.opponents.forEach((actor, index) => Object.assign(actor, {
      s: 800 + index * 50, prevS: 800 + index * 50,
      lateral: 0, prevLateral: 0, speedMph: 0, impactTimer: 0,
      combatWrecking: false, finished: false, crushed: false,
    }));
    combat.aiTimer = Infinity;
    combat.pickupTimer = Infinity;
    // Combat runs before drive integration, so the first fixed step builds
    // the six-crate plan without making a collection.
    duel.step(1 / 120);
    const plan = combat.seededPickupPlan;
    if (plan?.length !== 6 || plan.filter(p => p.kind === 'armor').length !== 2 ||
        plan.filter(p => p.kind === 'weapon').length !== 4)
      throw Error('Seeded two-lap pickup plan is incomplete');
    const armor = plan.find(p => p.kind === 'armor');
    const weapon = plan.find(p => p.kind === 'weapon' && p.weapon === 'bomb');
    if (!armor || !weapon) throw Error('Seed 1989 has no armor and bomb pair');
    combat.pickups = [{...armor, s: 200, lateral: -2.2, age: 0},
      {...weapon, s: 204, lateral: 2.2, age: 0}];
    state.armor = state.maxArmor - 40;
    const events = window.__pickupScenarioEvents = [];
    duel.onChange((_, event) => {
      if (event.powerupCollected) events.push(event);
    });

    const focus = duel.course.groundAt(202, 0);
    const sideX = Math.cos(focus.heading), sideZ = -Math.sin(focus.heading);
    const backX = -Math.sin(focus.heading), backZ = -Math.cos(focus.heading);
    app.inspectionCamera = {
      position: [focus.x + sideX * 14 + backX * 22, focus.y + 13,
        focus.z + sideZ * 14 + backZ * 22],
      target: [focus.x, focus.y + 2, focus.z],
    };
    app.onFrame?.(state);
    const render = window.__render;
    render.camera.position.fromArray(app.inspectionCamera.position);
    const frame = render.renderFrame();
    const groups = Array.from({length: 6}, (_, index) =>
      render.scene.getObjectByName('combat-pickup-' + index));
    if (groups.some(group => !group) ||
        render.scene.getObjectByName('combat-pickup-6'))
      throw Error('Expected exactly six fixed pickup mesh groups');
    const [armorMesh, weaponMesh] = groups;
    if (!armorMesh.visible || !weaponMesh.visible ||
        groups.slice(2).some(group => group.visible) ||
        armorMesh.children[0].visible || !armorMesh.children[2].visible ||
        !weaponMesh.children[0].visible || weaponMesh.children[2].visible ||
        !weaponMesh.children[3].visible)
      throw Error('Armor cross and weapon crate are not visibly distinct');
    window.__pickupPoolIds = groups.map(group => group.uuid);
    render.camera.updateMatrixWorld();
    const projected = groups.slice(0, 2).map(group => {
      const at = group.position.clone().project(render.camera);
      return {x: at.x, y: at.y, z: at.z};
    });
    document.querySelectorAll('details').forEach(panel => {
      const label = panel.querySelector('summary')?.textContent || '';
      if (label.includes('TEMPORARY SAVES') ||
          label.startsWith('Performance samples')) panel.hidden = true;
    });
    return {quality: ${JSON.stringify(quality)}, seed: duel.seed,
      opponents: state.opponents.length, planCount: plan.length,
      staged: combat.pickups.map(({id, kind, weapon, s, lateral}) =>
        ({id, kind, weapon, s, lateral})),
      poolCount: groups.length, visibleCount: groups.filter(group => group.visible).length,
      armorCross: armorMesh.children[2].visible,
      weaponTip: weaponMesh.children[3].visible,
      drawCalls: frame.drawCalls,
      camera: render.camera.position.toArray(), projected,
      memoryOnlySaves: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value};
  })()`);
  if (!before.memoryOnlySaves || before.opponents !== 3 ||
      before.planCount !== 6 || before.poolCount !== 6 ||
      before.visibleCount !== 2 || !before.armorCross || !before.weaponTip ||
      !(before.drawCalls > 0) || before.projected.some(({x, y, z}) =>
        Math.abs(x) > .8 || Math.abs(y) > .8 || z < 0 || z > 1))
    throw Error(`${quality} pre-collection pickup scene failed: ${JSON.stringify(before)}`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`pickups-before-${quality}`);

  const repaired = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const previous = state.armor;
    state.prevS = 196;
    state.s = 204;
    state.prevLateral = state.lateral = -2.2;
    duel.step(1 / 120);
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.renderFrame();
    const groups = window.__pickupPoolIds.map((id, index) =>
      window.__render.scene.getObjectByName('combat-pickup-' + index));
    const event = window.__pickupScenarioEvents.at(-1);
    const hud = document.querySelector('#damage-label')?.textContent || '';
    const callout = document.querySelector('#callout-text')?.textContent || '';
    if (Math.abs(state.armor - (previous + 25)) > 1e-6 ||
        combatCount() !== 1 || event?.powerupCollected !== 'armor' ||
        event?.collector !== 'player' || !hud.includes('ARMOR') ||
        !hud.includes(String(Math.round(state.armor))) ||
        !callout.includes('ARMOR +25') ||
        groups.some((group, index) => group?.uuid !== window.__pickupPoolIds[index]) ||
        groups.filter(group => group.visible).length !== 1)
      throw Error('Player repair, HUD, callout or pooled mesh failed: ' +
        JSON.stringify({previous, armor: state.armor, event, hud, callout,
          active: combatCount()}));
    function combatCount() { return state.combat.pickups.length; }
    return {armorBefore: previous, armorAfter: state.armor, event,
      hud, callout, activeCrates: combatCount(), poolCount: groups.length};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`pickups-player-repair-${quality}`);

  const cpu = await context.evaluate(`(() => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const later = state.opponents[2];
    Object.assign(later, {prevS: 200, s: 208, prevLateral: 2.2,
      lateral: 2.2, speedMph: 0, impactTimer: 0});
    state.prevS = state.s = 180;
    state.prevLateral = state.lateral = -2.2;
    duel.step(1 / 120);
    app.onFrame?.(state);
    window.__render.camera.position.fromArray(app.inspectionCamera.position);
    window.__render.renderFrame();
    const event = window.__pickupScenarioEvents.at(-1);
    const callout = document.querySelector('#callout-text')?.textContent || '';
    const groups = window.__pickupPoolIds.map((id, index) =>
      window.__render.scene.getObjectByName('combat-pickup-' + index));
    if (later.cpuPickupCharges?.bomb !== 1 ||
        state.combat.cpuPickupCharges.bomb !== 0 ||
        state.combat.pickups.length !== 0 ||
        event?.powerupCollected !== 'bomb' || event?.opponentIndex !== 2 ||
        !callout.includes('RIVAL 3') || !callout.includes('BOMB') ||
        groups.some((group, index) => group?.uuid !== window.__pickupPoolIds[index]) ||
        groups.some(group => group.visible))
      throw Error('Later CPU weapon pickup, callout or fixed pool failed: ' +
        JSON.stringify({charge: later.cpuPickupCharges?.bomb, event, callout,
          active: state.combat.pickups.length}));
    return {opponentIndex: event.opponentIndex, weapon: event.powerupCollected,
      charge: later.cpuPickupCharges.bomb, callout, activeCrates: 0,
      poolCount: groups.length};
  })()`);
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot(`pickups-cpu-weapon-${quality}`);
  if (context.issues.length || context.warnings.length)
    throw Error(`${quality} browser console issues: ` +
      JSON.stringify({issues: context.issues, warnings: context.warnings}));
  console.log(`${quality} pickup scene: ` +
    JSON.stringify({before, repaired, cpu, warnings: 0, errors: 0}));
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await qualityPass(context, quality);
}
