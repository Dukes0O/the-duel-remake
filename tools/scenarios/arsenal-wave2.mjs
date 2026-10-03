// Private native App review: earned rank, three purchased weapons, memory-only saves.
const DT = 1 / 120;

async function start(context) {
  await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (app.duel.state.status !== 'menu') app.returnToMenu();
    if (!app.startCampaign({mode: 'wasteland', seed: 202602,
      car: 'falcone_f42', difficulty: 'casual', cpuDifficulty: 'medium',
      opponentCount: 1})) throw Error('Native wave-two race did not start');
    app.stop();
    const duel = app.duel, state = duel.state;
    Object.assign(state, {status: 'racing', countdown: 0, paused: false,
      invulnerableSec: 0, traffic: []});
    state.combat.aiTimer = state.combat.pickupTimer = Infinity;
    window.__waveTwoEvents = [];
    window.__waveTwoDetach?.();
    window.__waveTwoDetach = duel.onChange((_state, event) => {
      if (event.arsenalCue || event.weaponFired || event.powerupCollected)
        window.__waveTwoEvents.push(event);
    });
    window.__waveTwoPlace = (actor, s, lateral = 0) => Object.assign(actor,
      {s, prevS: s, lateral, prevLateral: lateral, speedMph: 0,
        headingError: 0, yawVelocity: 0, pushVelocity: 0, impactTimer: 0,
        airHeight: 0, prevAirHeight: 0, airborne: false, contactCooldown: 0});
    window.__waveTwoPlace(state, 500);
    window.__waveTwoPlace(state.rival, 540);
    window.__waveTwoAim = () => {
      const from = duel.course.groundAt(state.s, state.lateral);
      const to = duel.course.groundAt(state.rival.s, state.rival.lateral);
      state.headingError = Math.atan2(to.x - from.x, to.z - from.z) - from.heading;
    };
    window.__waveTwoTick = (count, targetS) => {
      for (let i = 0; i < count; i++) {
        duel.step(${DT});
        window.__waveTwoPlace(state, 500);
        window.__waveTwoPlace(state.rival, targetS);
        window.__waveTwoAim();
      }
    };
    window.__waveTwoPaint = () => {
      const a = duel.course.groundAt(state.s, state.lateral);
      const b = duel.course.groundAt(state.rival.s, state.rival.lateral);
      const dx = b.x - a.x, dz = b.z - a.z, length = Math.max(1, Math.hypot(dx, dz));
      const sx = dz / length, sz = -dx / length;
      const center = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 1.5,
        z: (a.z + b.z) / 2};
      const distance = Math.max(17, length * .9 + 10);
      app.inspectionCamera = {position: [center.x + sx * distance,
        center.y + distance * .45, center.z + sz * distance],
        target: [center.x, center.y, center.z]};
      window.__render.camera.position.fromArray(app.inspectionCamera.position);
      window.__render.camera.lookAt(...app.inspectionCamera.target);
      window.__render.camera.updateMatrixWorld(true);
      const before = JSON.stringify(state);
      app.onFrame?.(state, 0); window.__render.renderFrame();
      if (JSON.stringify(state) !== before)
        throw Error('Wave-two rendering changed race state');
      document.querySelectorAll('details').forEach(panel => {
        const title = panel.querySelector('summary')?.textContent || '';
        if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples'))
          panel.hidden = true;
      });
    };
    duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false});
    window.__waveTwoAim();
    window.__waveTwoPaint();
  })()`);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) {
    await context.command('Emulation.setDeviceMetricsOverride',
      {width: 1280, height: 800, deviceScaleFactor: 1, mobile: false});
    await context.navigate('/tools/menu-check.html?flags=arsenal');
    await context.waitFor(`!!window.__qaApp && !!window.__render &&
      document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
      !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`,
    'memory-only wave-two production page', 60_000);
    await context.evaluate(`(() => {
      const quality = document.querySelector('#graphics-quality');
      quality.value = '${quality}';
      quality.dispatchEvent(new Event('change', {bubbles: true}));
      const app = window.__qaApp;
      if (!app.addPlayer('Wave Two ${quality}').ok)
        throw Error('Named review player creation failed');
      app.profile = {...app.profile, wasteland: {...app.profile.wasteland,
        discoveredGate: true, xp: 20000, scrap: 4000}};
      if (!app._saveProfile()) throw Error('Earned wave-two career did not save');
      document.querySelector('#armory-open').click();
      for (const [slot, id] of ['rockets', 'flamethrower', 'magnet'].entries()) {
        const button = document.querySelector('[data-arsenal-purchase="' + id + '"]');
        if (!button) throw Error('Native Armory offer missing ' + id);
        button.click();
        const select = document.querySelector('[data-loadout-slot="' + slot + '"]');
        select.value = id;
        select.dispatchEvent(new Event('change', {bubbles: true}));
      }
      if (app.profile.wasteland.loadout.slice(0, 3).join(',') !==
          'rockets,flamethrower,magnet')
        throw Error('Wave-two native slots did not equip');
      document.querySelector('[data-action="armory-close"]').click();
    })()`);

    await start(context);
    // The first race paint creates the course scene; restart for an in-flight capture.
    await start(context);
    const rockets = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      if (!duel.fireWeapon('rockets') || duel.fireWeapon('rockets'))
        throw Error('Rocket trigger or eight-second recharge failed');
      window.__waveTwoTick(24, 540);
      window.__waveTwoPaint();
      const shot = state.combat.projectiles.find(item => item.kind === 'rocket-pod');
      const model = window.__render.scene.getObjectByName('combat-rpg-0');
      if (!shot || !model?.visible || !model.parent?.visible)
        throw Error('Native Rocket Pods shot has no visible pooled model');
      return {fired: window.__waveTwoEvents.filter(event =>
        event.arsenalCue === 'weapon.rockets.fire').length, cooldown: state.combat.cooldowns.rockets};
    })()`);
    await context.screenshot('wave-two-rockets-' + quality);

    await start(context);
    const rocketCounter = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state, rival = state.rival;
      window.__waveTwoPlace(rival, 520);
      window.__waveTwoAim();
      state.combat.rivalShield = 3;
      const armor = rival.armor;
      if (!duel.fireWeapon('rockets')) throw Error('Shield counter rocket did not fire');
      window.__waveTwoTick(110, 520);
      window.__waveTwoPaint();
      const hits = window.__waveTwoEvents.filter(event =>
        event.arsenalCue === 'weapon.rockets.hit').length;
      if (!hits || rival.armor !== armor)
        throw Error('Star Shield failed to block an actual rocket blast');
      return {hits, armor};
    })()`);
    await context.screenshot('wave-two-rockets-shield-' + quality);

    await start(context);
    const flame = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state, rival = state.rival;
      window.__waveTwoPlace(rival, 506);
      window.__waveTwoAim();
      const armor = rival.armor;
      if (!duel.fireWeapon('flamethrower')) throw Error('Native flame did not start');
      window.__waveTwoTick(24, 506);
      window.__waveTwoPaint();
      const tell = window.__render.scene.getObjectByName('arsenal-flame-0');
      if (!tell?.visible || !(rival.armor < armor))
        throw Error('Native flame has no visible cone or armor contact');
      return {armorLost: armor - rival.armor, styleHits: state.combat.scoring.hitsLanded};
    })()`);
    await context.screenshot('wave-two-flame-' + quality);

    await start(context);
    const flameCounter = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state, rival = state.rival;
      window.__waveTwoPlace(rival, 506);
      window.__waveTwoAim();
      state.combat.rivalShield = 3;
      const armor = rival.armor;
      if (!duel.fireWeapon('flamethrower')) throw Error('Shielded flame did not start');
      window.__waveTwoTick(24, 506);
      window.__waveTwoPaint();
      if (rival.armor !== armor || !window.__render.scene.getObjectByName('arsenal-flame-0')?.visible)
        throw Error('Star Shield failed to block the visible flame');
      return {armor};
    })()`);
    await context.screenshot('wave-two-flame-shield-' + quality);

    await start(context);
    const magnet = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      state.armor = state.maxArmor - 30;
      state.combat.seededPickupPlan = [];
      state.combat.pickups = [20, 30].map((ds, index) =>
        ({id: 'wave-two-review-' + index, lap: 0, s: state.s + ds,
          lateral: state.lateral, kind: 'armor', age: 0}));
      const first = state.combat.pickups[0].s;
      if (!duel.fireWeapon('magnet')) throw Error('Native magnet did not start');
      window.__waveTwoTick(60, 540);
      window.__waveTwoPaint();
      const field = window.__render.scene.getObjectByName('arsenal-magnet-0');
      if (!field?.visible || !(state.combat.pickups[0]?.s < first))
        throw Error('Native magnet field or crate pull missing');
      return {crateMoved: first - state.combat.pickups[0].s,
        active: state.combat.magnets.length};
    })()`);
    await context.screenshot('wave-two-magnet-' + quality);

    const magnetCounter = await context.evaluate(`(() => {
      const duel = window.__qaApp.duel, state = duel.state;
      state.combat.magnets[0].age = 5.99;
      window.__waveTwoTick(3, 540);
      window.__waveTwoPaint();
      if (state.combat.magnets.length ||
          window.__render.scene.getObjectByName('arsenal-magnet-0')?.visible)
        throw Error('The expired magnet still draws or moves crates');
      return {active: state.combat.magnets.length};
    })()`);
    await context.screenshot('wave-two-magnet-expired-' + quality);
    console.log('Wave two ' + quality + ': ' + JSON.stringify({rockets, rocketCounter,
      flame, flameCounter, magnet, magnetCounter}));
  }
}
