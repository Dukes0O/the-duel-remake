// The QA page installs memory-only storage before importing the game.
export async function run(context){
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(`!!window.__qaApp && !!window.__render &&
    !document.querySelector('#start-engine')?.disabled &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`,
  'isolated crew Armory',60_000);
  const selection=await context.evaluate(`(()=>{
    const app=window.__qaApp;
    app.profile={...app.profile,wasteland:{...app.profile.wasteland,
      xp:100000,rank:30}};
    app._saveProfile();
    document.querySelector('#armory-open').click();
    const cards=[...document.querySelectorAll('#modal-layer [data-crew-select]')];
    if(cards.length!==8||!cards.find(button=>button.dataset.crewSelect==='wren'))
      throw Error('Eight crew members did not render in the Armory');
    cards.find(button=>button.dataset.crewSelect==='wren').click();
    const selected=document.querySelector('#modal-layer [data-crew-select="wren"]');
    if(app.profile.wasteland.crew.selected!=='wren'||
        selected?.getAttribute('aria-pressed')!=='true')
      throw Error('Wren selection did not persist');
    return {count:cards.length,selected:app.profile.wasteland.crew.selected,
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  if(!selection.memoryOnly)throw Error('QA storage was not isolated');
  await context.evaluate(`(()=>{
    document.querySelectorAll('details').forEach(panel=>{
      const title=panel.querySelector('summary')?.textContent||'';
      if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))
        panel.hidden=true;
    });
    document.querySelector('.crew-panel')?.scrollIntoView({block:'start'});
  })()`);
  await context.screenshot('crew-selection-armory');
  const race=await context.evaluate(`(()=>{
    const app=window.__qaApp;
    document.querySelector('[data-action="armory-close"]').click();
    document.querySelector('#garage-open').click();
    const garage=document.querySelector('#modal-layer .crew-panel');
    if(!garage?.querySelector('[data-crew-select="wren"][aria-pressed="true"]'))
      throw Error('Garage did not show selected crew');
    document.querySelector('[data-action="garage-close"]').click();
    if(!app.startCampaign({mode:'wasteland',startStage:0,seed:1989}))
      throw Error('Wasteland race did not start');
    app.stop();
    const s=app.duel.state;
    Object.assign(s,{status:'racing',countdown:0,paused:false,s:500,
      prevS:500,lateral:0,prevLateral:0,speedMph:0,traffic:[],opponents:[]});
    s.combat.aiTimer=Infinity;s.combat.pickupTimer=Infinity;
    app.duel.setInput({interact:true});
    for(let i=0;i<48;i++)app.duel.step(1/120);
    if(s.crewId!=='wren'||s.fighter?.crewId!=='wren'||
        s.fighter.sprintMultiplier!==1.2)
      throw Error('Saved crew/perk did not reach the race');
    return {crewId:s.crewId,health:s.fighter.health,
      sprint:s.fighter.sprintMultiplier};
  })()`);
  console.log(`Crew Armory, Garage and Wasteland race: ${JSON.stringify({selection,race})}`);
}
