// The private QA page replaces storage before the game imports it.
export async function run(context){
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,
  'isolated loadout Armory',60_000);
  const armory=await context.evaluate(`(()=>{
    const app=window.__qaApp;
    document.querySelector('#armory-open').click();
    const before=[...document.querySelectorAll('[data-loadout-slot]')]
      .map(select=>select.value);
    if(before.join(',')!=='ufo,bomb,crossbow,star')
      throw Error('Default four-slot loadout missing');
    const first=document.querySelector('[data-loadout-slot="0"]');
    first.value='star';first.dispatchEvent(new Event('change',{bubbles:true}));
    const after=[...document.querySelectorAll('[data-loadout-slot]')]
      .map(select=>select.value);
    if(after.join(',')!=='star,bomb,crossbow,ufo')
      throw Error('Armory did not swap the two equipped slots');
    if(app.profile.wasteland.loadout.join(',')!==after.join(','))
      throw Error('Selected slots were not saved in this player career');
    return {before,after,memoryOnly:!!Object.getOwnPropertyDescriptor(
      window,'localStorage')?.value};
  })()`);
  if(!armory.memoryOnly)throw Error('QA storage was not isolated');
  await context.evaluate(`document.querySelectorAll('details').forEach(panel=>{
    const title=panel.querySelector('summary')?.textContent||'';
    if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))
      panel.hidden=true;
  })`);
  await context.screenshot('car-loadout-armory');
  const race=await context.evaluate(`(()=>{
    const app=window.__qaApp;
    document.querySelector('[data-action="armory-close"]').click();
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const state=app.duel.state;
    Object.assign(state,{status:'racing',countdown:0,paused:false,
      s:500,prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[]});
    state.combat.aiTimer=Infinity;state.combat.pickupTimer=Infinity;
    app.onFrame?.(state);
    const hud=[...document.querySelectorAll('[data-combat-slot]')]
      .map(button=>button.dataset.combatWeapon);
    if(state.weaponLoadout.join(',')!==hud.join(','))
      throw Error('Race HUD does not follow the saved slot order');
    app._inputAction('weapon:ufo');
    if(state.combat.shield<=0)
      throw Error('Key 1 did not fire the newly selected Star Shield');
    return {loadout:state.weaponLoadout,hud,shield:state.combat.shield};
  })()`);
  console.log(`Armory save, HUD and slot firing: ${JSON.stringify({armory,race})}`);
}
