// Exercise the production controls with a disposable player and browser profile.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor("document.querySelector('#stage.in-menu') && !document.querySelector('#start-engine').disabled && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated ready menu', 60_000);
  await context.evaluate("document.querySelector('[data-mode=wasteland]').click(); document.querySelector('#start-engine').click()");
  await context.waitFor("document.querySelector('#overlay').dataset.status==='racing' && !document.querySelector('.weapon-hud').hidden", 'active combat race', 25_000);
  const directions=await context.evaluate("[...document.querySelectorAll('.weapon-hud [data-weapon]')].map(button=>button.getAttribute('aria-label'))");
  for(const direction of ['Up','Right','Down','Left'])if(!directions.some(label=>label.includes(`D-pad ${direction}`)))throw Error(`Missing accessible gamepad direction ${direction}.`);
  const changes = await context.evaluate(`new Promise(resolve => {
    const hud=document.querySelector('.weapon-hud');
    const observer=new MutationObserver(records=>{window.__weaponBarWrites=(window.__weaponBarWrites||0)+records.length});
    window.__weaponBarWrites=0;
    observer.observe(hud,{attributes:true,childList:true,characterData:true,subtree:true});
    setTimeout(()=>{observer.disconnect();resolve(window.__weaponBarWrites)},500);
  })`);
  if (changes > 1) throw Error(`Weapon bar changed ${changes} times during an unchanged half-second state.`);
  console.log(`Weapon bar: ${changes} DOM changes in 500 ms with steady combat state.`);
  await context.evaluate("(() => { const probe=document.createElement('button'); probe.id='space-probe'; probe.textContent='Keyboard probe'; probe.onclick=()=>window.__spaceProbeClicks=(window.__spaceProbeClicks||0)+1; document.body.append(probe); probe.focus(); })()");
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await context.command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  const probeClicks=await context.evaluate("(() => { const count=window.__spaceProbeClicks||0; document.querySelector('#space-probe').remove(); return count; })()");
  if(probeClicks!==1)throw Error(`Browser keyboard probe expected one Space click, received ${probeClicks}.`);
  const point = await context.evaluate(`(() => {
    const button=document.querySelector('[data-weapon=crossbow]'),rect=button.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
  })()`);
  await context.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await context.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  await context.waitFor("document.querySelector('[data-weapon=crossbow]').disabled", 'crossbow fired');
  await context.waitFor("!document.querySelector('[data-weapon=crossbow]').disabled", 'crossbow recharged', 10_000);
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await context.command('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await new Promise(resolve=>setTimeout(resolve,150));
  const after = await context.evaluate("({ready:!document.querySelector('[data-weapon=crossbow]').disabled,focus:document.activeElement?.dataset?.weapon||null})");
  if (!after.ready) throw Error('Space fired the previously clicked weapon button.');
  await context.screenshot('weapon-bar');
}
