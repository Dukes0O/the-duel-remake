// Keyboard-only Suspension classroom play at 1920 by 1000. Saves stay in memory.
const KEYS=Object.freeze({Enter:['Enter',13],Space:[' ',32],KeyH:['h',72],Digit1:['1',49],Digit2:['2',50],Digit3:['3',51],Digit4:['4',52]});
const state=`JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride',{width:1920,height:1000,deviceScaleFactor:1,mobile:false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,lab-2,helicopter,forest-fire,rescue,heli-skiing,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`,'menu',90000);
  await c.evaluate(`(()=>{const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Suspension QA');app.profile={...app.profile,drivingLessons:{version:1,done:{corner:true}},courses:{version:1,unlocked:['tremblant-woods','summit-run']},heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},refuels:3}};app._saveProfile();document.querySelectorAll('body > details').forEach(item=>item.hidden=true);app.openLab()})()`);
  const key=(code,type)=>c.command('Input.dispatchKeyEvent',{type,code,key:KEYS[code][0],windowsVirtualKeyCode:KEYS[code][1]});
  const press=async(code,count=1)=>{for(let i=0;i<count;i++){await key(code,'keyDown');await key(code,'keyUp');await wait(220)}};
  const at=(step,extra='true')=>c.waitFor(`${state}?.step==='${step}' && (value=>${extra})(${state})`,step,30000);
  const next=async step=>{await at(step,'value.ready');await press('Enter')};
  await c.waitFor('window.__qaApp.labOpen===true','Lab map',60000);
  await c.waitFor(`document.querySelector('.lab-canvas')?.dataset.labWalkReady === 'true'`,'Lab room',60000);
  await c.evaluate(`document.querySelector('[data-go="wind-tunnel"]')?.click()`);
  await at('wonder'); await c.screenshot('suspension-wonder'); await wait(2100); await next('wonder');
  await at('word-spring'); await c.screenshot('suspension-spring'); await press('Digit1'); await next('word-spring');
  await at('word-shake'); await c.screenshot('suspension-shake'); await next('word-shake');
  await at('word-roll'); await c.screenshot('suspension-roll'); await next('word-roll');
  await at('watch'); await wait(3300); await next('watch');
  await at('guess-bumps'); await c.screenshot('suspension-bump-question'); await press('Digit2');
  await press('Digit1'); await press('Digit3'); await press('Space'); await next('guess-bumps');
  await at('guess-roll'); await c.screenshot('suspension-roll-question'); await press('Digit1');
  await press('Digit2'); await press('Digit4'); await press('Space'); await next('guess-roll');
  await at('try-free'); await press('Digit1'); await press('Digit3'); await press('Space');
  await press('Digit2'); await press('Space'); await press('Digit4'); await press('Space');
  await at('try-free','value.ready'); await c.screenshot('suspension-free-results'); await next('try-free');
  await at('recap');
  const physics=await c.evaluate(`document.querySelector('.lc-physics')?.textContent.includes('body roll')`);
  if(!physics) throw new Error('The physics panel did not show the body-roll rule at 1920 by 1000.');
  const kept=await c.evaluate(`document.querySelectorAll('.lc-past > *').length >= 8`);
  if(!kept) throw new Error('The classroom page did not keep the earlier lesson steps.');
  await c.screenshot('suspension-recap'); await press('Enter'); await wait(1200);
  await c.screenshot('suspension-challenge');
  await c.waitFor(`document.querySelector('.lc-bubble')?.textContent.includes('completed the Suspension lesson')`,'all four suspension bench comparisons pass the unchanged challenge',20000);
}
