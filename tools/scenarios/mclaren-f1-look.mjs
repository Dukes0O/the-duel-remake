// EARN-CAR-2: the existing native showroom, original model and UI controls.
// No player storage, synthetic mesh, camera override or timing measurement.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/vehicle-art-check.html?car=mclaren_f1');
  await context.waitFor(`document.readyState==='complete' &&
    document.querySelector('#stats')?.textContent.includes('McLaren F1') &&
    document.querySelector('#stats')?.textContent.includes('draws') &&
    document.querySelector('[data-key="mclaren_f1"]')?.getAttribute('aria-pressed')==='true'`, 'actual F1 showroom model ready', 45000);
  const view = async (label, name, pose) => {
    await context.evaluate(`(() => {
      const button=[...document.querySelectorAll('#views button')].find(button=>button.textContent===${JSON.stringify(label)});
      if(!button)throw Error('Missing existing showroom control');button.click();
      document.querySelector('aside').style.visibility='hidden';
    })()`);
    await context.waitFor(`document.querySelector('#stats').textContent.includes(${JSON.stringify(' · '+pose+' · ')})`, 'actual showroom view '+pose, 10000);
    await context.command('Runtime.evaluate',{expression:'new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))',awaitPromise:true});
    await context.screenshot(name);
  };
  await view('Front three-quarter','f1-front','front');
  await view('Rear three-quarter','f1-rear','rear');
  await view('Side silhouette','f1-side','side');
  await view('Wheel and nose detail','f1-detail','detail');
  await context.evaluate(`[...document.querySelectorAll('#views button')].find(button=>button.textContent==='Toggle damage').click()`);
  await context.waitFor(`document.querySelector('#stats').textContent.includes(' · damaged')`, 'actual directional damage applied',10000);
  await context.screenshot('f1-damage');
  await context.evaluate(`[...document.querySelectorAll('#views button')].find(button=>button.textContent==='Steer driver').click()`);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.screenshot('f1-driver');
}
