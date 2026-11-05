// G-force classroom lesson: keyboard play at the full physics-panel resolution, with memory-only saves.
const KEYS={Enter:['Enter',13],Space:[' ',32],KeyH:['h',72],ArrowUp:['ArrowUp',38],ArrowDown:['ArrowDown',40],ArrowLeft:['ArrowLeft',37],ArrowRight:['ArrowRight',39],Digit1:['1',49],Digit2:['2',50],Digit3:['3',51]};
const state=`JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')`;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function run(c){
  await c.command('Emulation.setDeviceMetricsOverride',{width:1920,height:1000,deviceScaleFactor:1,mobile:false});
  await c.navigate('/tools/menu-check.html?flags=lab-classroom,rescue,summit-run');
  await c.waitFor(`!!window.__qaApp && !document.querySelector('#start-engine')?.disabled`,'menu',90000);
  await c.evaluate(`(()=>{const a=window.__qaApp;a.audio.setMuted?.(true);a.addPlayer('G-force QA');a.profile={...a.profile,drivingLessons:{version:1,done:{corner:true}},drivingLesson:{version:1,done:{corner:true}},courses:{version:1,unlocked:['summit-run']},heli:{...a.profile.heli,version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true}}};a._saveProfile();document.querySelectorAll('body > details').forEach(e=>e.open=false);a.openLab()})()`);
  const key=(code,type)=>c.command('Input.dispatchKeyEvent',{type,code,key:KEYS[code][0],windowsVirtualKeyCode:KEYS[code][1]});
  const press=async(code,n=1)=>{for(let i=0;i<n;i++){await key(code,'keyDown');await key(code,'keyUp');await wait(220)}};
  const at=(step,extra='true')=>c.waitFor(`${state}?.step==='${step}' && (s=>${extra})(${state})`,step,30000);
  const next=async step=>{await at(step,'s.ready');await press('Enter')};
  const shot=name=>c.screenshot(name);
  await c.waitFor(`window.__qaApp.labOpen===true`,'Lab map',60000);
  await c.evaluate(`document.querySelector('[data-go="turning-arm"]')?.click()`);
  await at('wonder'); await shot('gforce-wonder'); await next('wonder');
  await at('word-speed'); await shot('gforce-word-speed'); await press('ArrowRight'); await at('word-speed','s.ready'); await shot('gforce-speed-set'); await next('word-speed');
  await at('word-radius'); await shot('gforce-word-radius'); await press('ArrowDown',2); await at('word-radius','s.ready'); await next('word-radius');
  await at('watch'); await wait(3500); await at('watch','s.ready'); await shot('gforce-watch'); await next('watch');
  await at('try-free'); await shot('gforce-free'); await press('ArrowRight'); await press('Space'); await wait(250); await press('ArrowUp'); await press('Space'); await wait(250); await press('ArrowRight'); await press('Space'); await at('try-free','s.ready'); await shot('gforce-free-three'); await next('try-free');
  await at('try-speed'); await shot('gforce-speed-setup'); await press('Digit2'); await press('ArrowRight',2); await press('Space'); await at('try-speed','s.ready'); await shot('gforce-speed-result'); await next('try-speed');
  await at('try-radius'); await press('Digit2'); await press('ArrowDown'); await press('Space'); await at('try-radius','s.ready'); await next('try-radius');
  await at('alone'); await shot('gforce-alone'); await press('ArrowRight',2); await press('Space'); await at('alone','s.ready'); await shot('gforce-alone-pass'); await next('alone');
  for(const step of ['check-speed','check-radius','check-rule']){await at(step);await shot(`gforce-${step}`);await press('Digit1');await at(step,'s.ready');await press('Enter')}
  await at('recap'); await shot('gforce-recap');
  if(!(await c.evaluate(`document.querySelector('.lc-physics') && document.querySelector('.lc-physics').textContent.includes('G-force')`))) throw Error('The live physics panel did not appear at 1920 by 1000.');
  if(!(await c.evaluate(`JSON.parse(document.querySelector('.lab-classroom').dataset.classroom).page.length>=10`))) throw Error('The classroom page did not keep the earlier lesson steps.');
  await press('Enter');
  await c.waitFor(`!document.querySelector('.lab-classroom') && window.__qaApp.labOpen===true`,'the existing G-force challenge opens from the recap',20000);
}
