// Check the player-facing preview and callout against the actual jump.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("!!window.__qaApp && !!window.__render && !document.querySelector('#start-engine').disabled", 'isolated menu and renderer', 60_000);
  const result = await context.evaluate(`(() => {
    const app = window.__qaApp;
    if (!app.startCampaign({mode:'wasteland',startStage:0,car:'falcone_f42',seed:1989})) throw Error('Wasteland race did not start');
    app.stop();
    const duel = app.duel, s = duel.state, firstGate = duel._lapGates[0];
    Object.assign(s, {status:'racing',s:firstGate+20,prevS:firstGate+20,nextLapGate:1,
      lateral:0,prevLateral:0,speedMph:75,traffic:[]});
    s.rival.s = s.s + 200;
    app.onFrame?.(s);
    const button = document.querySelector('[data-weapon=ufo]');
    const preview = button.textContent;
    const advance = Number.parseInt(preview.split('JUMP +')[1], 10);
    const destination = Number.parseInt(preview.split('→')[1], 10);
    if (!Number.isFinite(advance) || !Number.isFinite(destination) || button.disabled)
      throw Error('Exact UFO jump preview is missing: '+preview);
    const before = s.s;
    if (!duel.fireWeapon('ufo')) throw Error('Ready UFO jump did not fire');
    const jump = s.combat.lastUfo;
    app.onFrame?.(s);
    const callout = document.querySelector('#callout-text').textContent;
    if (jump.kind !== 'jump' || Math.abs(s.s-jump.toS)>1e-6 ||
        advance !== Math.round(jump.gainMeters) ||
        destination !== Math.round(jump.toS) ||
        !callout.includes('JUMP +'+Math.round(jump.gainMeters)+' m TO '+Math.round(jump.toS)+' m'))
      throw Error('Preview, landing and callout differ: '+JSON.stringify({preview,callout,jump,actual:s.s}));
    s.combat.cooldowns.ufo = 0;
    app.onFrame?.(s);
    const used = button.textContent;
    if (!button.disabled || !used.includes('USED THIS LAP') || duel.fireWeapon('ufo'))
      throw Error('Second UFO jump was allowed this lap: '+used);
    s.completedLaps = 1;
    s.s = s.prevS = duel.course.length + firstGate + 20;
    s.nextLapGate = 1;
    s.rival.s = s.s + 200;
    app.onFrame?.(s);
    if (button.disabled || !button.textContent.includes('JUMP +'))
      throw Error('UFO did not rearm after next lap first gate: '+button.textContent);
    window.__render.renderFrame();
    return {advance:s.combat.lastUfo.gainMeters,preview,callout,used,before};
  })()`);
  await context.screenshot('ufo-jump');
  console.log(`UFO jump: ${Math.round(result.advance)} m preview, landing and callout agree; one use per lap.`);
}
