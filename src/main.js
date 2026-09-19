import './style.css';
import { App } from './app.js';
import { CARS, DIFFICULTY, COURSE, DRIVE } from './config.js';

const app = new App();
const root = document.querySelector('#app');
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7"/></svg>';
const sound = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>';
const choices = { car: app.duel.state.car, difficulty: app.duel.state.difficulty, mode: 'duel' };
let rendererPromise, lastScreen, routeCourse, routeMap, mapTick = 0;

root.innerHTML = `<div id="stage" class="in-menu"><div id="view3d" aria-label="Three-dimensional driving scene"></div><div class="film-grain"></div><div id="overlay">
  <header class="masthead"><a class="wordmark" href="#" data-action="menu" aria-label="The Duel main menu"><span class="brand-slashes">///</span> THE DUEL <span class="edition">REDLINE</span></a><div class="utility-controls"><span id="menu-location" class="location-label"><i></i> MOJAVE COUNTY, USA</span><button id="sound-toggle" class="icon-button" data-action="sound" aria-label="Mute sound" title="Sound · M">${sound}<span id="sound-caption">SOUND ON</span></button><button id="camera-toggle" class="icon-button race-only" data-action="camera" aria-label="Change camera" title="Camera · C" hidden><svg viewBox="0 0 24 24" fill="none"><path d="m8 6 2-3h4l2 3h5v14H3V6h5Z"/><circle cx="12" cy="12" r="4"/></svg></button><button id="pause-button" class="icon-button race-only" data-action="pause" aria-label="Pause race" title="Pause · Esc" hidden><svg viewBox="0 0 24 24" fill="none"><path d="M8 5v14M16 5v14"/></svg></button></div></header>
  <main id="menu-screen" class="menu-screen">
    <div class="menu-intro"><p class="eyebrow"><i></i> TWO RIVALS. ONE OPEN ROAD.</p><h1>THE<span>DUEL</span><em>REDLINE</em></h1><p class="menu-description">Chase the horizon.<br>Leave your rival in the dust.</p></div>
    <section class="race-setup" aria-label="Race setup"><div class="setup-line"><span class="field-label">THE CHALLENGE</span><div class="segmented" role="group" aria-label="Race mode"><button class="choice on" data-mode="duel" aria-pressed="true">RIVAL DUEL</button><button class="choice" data-mode="timetrial" aria-pressed="false">TIME TRIAL</button></div></div><div class="setup-line"><span class="field-label">TRANSMISSION</span><div class="segmented" role="group" aria-label="Difficulty">${Object.entries(DIFFICULTY).map(([key,d]) => `<button class="choice ${choices.difficulty === key ? 'on' : ''}" data-difficulty="${key}" aria-pressed="${choices.difficulty === key}">${d.autoShift ? 'ARCADE / AUTO' : 'PRO / MANUAL'}</button>`).join('')}</div></div><button id="start-engine" class="start-button" data-action="start"><span>START ENGINE</span>${arrow}</button><p class="start-note">${COURSE.length} STAGES <span>·</span> TRAFFIC <span>·</span> PURSUITS <span>·</span> FIFTH MAJOR CRASH ENDS THE RUN</p></section>
    <section class="garage" aria-label="Choose your car"><div class="garage-heading"><span class="field-label">CHOOSE YOUR WEAPON</span><span id="garage-count">01 / 02</span></div><div class="car-choices" role="group" aria-label="Car">${Object.entries(CARS).map(([key,c],i) => `<button class="car-choice ${choices.car === key ? 'on' : ''}" data-car="${key}" aria-pressed="${choices.car === key}"><span class="car-index">0${i+1}</span><span>${c.name}</span><span class="car-marker">↗</span></button>`).join('')}</div><div class="car-specs"><div><b id="car-speed"></b><span>TOP SPEED / MPH</span></div><div><b id="car-gears"></b><span>GEARS</span></div><div><b id="car-character"></b><span>DRIVING CHARACTER</span></div></div><p class="route-preview"><span class="route-symbol">↝</span><span>FIRST UP <b>${COURSE[0].name}</b></span><span class="route-length">${(COURSE[0].lengthU/1000).toFixed(1)} KM</span></p></section>
    <footer class="menu-footer"><span class="footer-label">BUILT FOR THE DRIVE</span><div class="controls-strip"><span><kbd>W A S D</kbd> DRIVE</span><span><kbd>SPACE</kbd> BOOST</span><span><kbd>C</kbd> CAMERA</span><span><kbd>Q / E</kbd> MANUAL SHIFT</span><span><kbd>ESC</kbd> PAUSE</span></div><a class="build-label audio-credits" href="/assets/audio/credits.html" target="_blank" rel="noopener">ASSET CREDITS ↗</a></footer>
  </main>
  <section id="race-hud" class="hud" aria-label="Race information" hidden><div class="race-progress"><i id="progress-fill"></i></div><div class="race-heading"><p class="eyebrow" id="stage-label"></p><h2 id="stage-name"></h2><p id="stage-objective"></p></div><div class="race-clock"><span class="field-label">STAGE TIME</span><b id="race-time">00:00.00</b><span id="penalty-time"></span></div><div class="race-position"><span class="position-number"><b id="race-position">01</b><span id="position-total">/02</span></span><div><span class="field-label" id="gap-label">RIVAL BEHIND</span><b id="rival-gap">0.0 SEC</b></div></div>
  <div class="route-hud"><div class="route-hud-top"><span class="field-label">ROUTE / LIVE</span><b id="route-percent">0%</b></div><canvas id="route-map" width="400" height="270" aria-label="Route minimap showing you and your rival"></canvas><div class="route-legend"><span><i class="player-dot"></i> YOU</span><span id="rival-legend"><i class="rival-dot"></i> RIVAL</span><b id="route-remaining"></b></div></div><div class="race-health"><span class="field-label">CHASSIS INTEGRITY</span><span id="lives-display"></span><b id="damage-label">0 / 5 MAJOR CRASHES</b><span id="radar-label">RADAR CLEAR</span><div class="radar-meter"><i id="radar-fill"></i></div></div>
  <div class="speedometer"><div class="speed-top"><div class="gear"><span class="field-label">GEAR</span><b id="gear-value">1</b></div><div class="speed"><b id="speed-value">000</b><span>MPH</span></div></div><div class="rpm-track"><i id="rpm-fill"></i></div><div class="rpm-labels"><span>0</span><span>RPM × 1000</span><span id="rpm-value">8</span></div><div class="boost-readout"><span class="field-label">NITRO</span><div class="boost-track"><i id="boost-fill"></i></div><kbd>SPACE</kbd></div><div class="speed-footer"><span id="camera-label">CHASE CAM</span><span><kbd>ESC</kbd> PAUSE</span></div></div><div class="style-score"><b id="style-score">0000</b><span class="field-label">STYLE POINTS</span><span id="combo-label"></span></div>
  <div id="countdown" class="countdown" hidden><span id="countdown-word">GET READY</span><b id="countdown-number">3</b><p>HOLD W OR ↑ TO ACCELERATE</p></div><div id="race-callout" class="race-callout" aria-live="polite" hidden><span id="callout-kicker"></span><b id="callout-text"></b></div><div id="crash-flash" class="crash-flash" hidden></div></section>
  <div id="modal-layer" class="modal-layer" hidden></div><div id="renderer-error" class="renderer-error" role="alert" hidden><strong>The road couldn't load.</strong><span>Enable browser graphics acceleration, then try again.</span><button class="text-button" data-action="retry-renderer">RETRY GRAPHICS ↗</button></div><div id="renderer-loading" class="renderer-loading"><span></span> FINDING THE OPEN ROAD</div><button id="test-driver" class="test-driver" data-action="manual" hidden>TEST DRIVER ACTIVE · TAKE CONTROL</button>
</div></div>`;

const ui = Object.fromEntries([...root.querySelectorAll('[id]')].map(el => [el.id, el]));
const text = (id,v) => { if (ui[id].textContent !== String(v)) ui[id].textContent = v; };
const clamp = v => Math.max(0,Math.min(1,Number(v)||0));
const time = seconds => { const t = Math.floor(Math.max(0, Number(seconds)||0)*100); return `${String(Math.floor(t/6000)).padStart(2,'0')}:${String(Math.floor(t/100)%60).padStart(2,'0')}.${String(t%100).padStart(2,'0')}`; };

function ensureRenderer() {
  if (!rendererPromise) {
    ui['renderer-loading'].hidden = false; ui['renderer-error'].hidden = true;
    rendererPromise = import('./render3d.js').then(({attachRenderer}) => { attachRenderer(ui.view3d,app); ui.view3d.classList.add('live'); ui['start-engine'].disabled = false; }).catch(error => {
      rendererPromise = null; ui['renderer-error'].hidden = false; ui['start-engine'].disabled = true;
      if (['racing','countdown'].includes(app.duel.state.status) && !app.duel.state.paused) app.togglePause();
      console.error('Unable to initialize 3D graphics.',error);
    }).finally(() => { ui['renderer-loading'].hidden = true; });
  }
  return rendererPromise;
}
function updateMenuCar() { const car = CARS[choices.car]; app.duel.state.car = choices.car; app.menuCar = choices.car; text('car-speed',car.topSpeed); text('car-gears',String(car.gears.length).padStart(2,'0')); text('car-character',car.grip >= .9 ? 'PLANTED' : 'UNTAMED'); text('garage-count',`${String(Object.keys(CARS).indexOf(choices.car)+1).padStart(2,'0')} / 02`); }
root.addEventListener('click',e => {
  const button = e.target.closest('button,[data-action]'); if (!button) return;
  for (const key of ['car','difficulty','mode']) if (button.dataset[key]) { choices[key] = button.dataset[key]; for (const sibling of button.parentElement.children) { sibling.classList.toggle('on', sibling === button); sibling.setAttribute('aria-pressed', String(sibling === button)); } if (key === 'car') updateMenuCar(); return; }
  e.preventDefault();
  switch (button.dataset.action) {
    case 'start': app.startCampaign(choices); break;
    case 'sound': app.audio.unlock(); app.audio.toggleMute(); break;
    case 'camera': app.cycleCamera(); break;
    case 'pause': app.togglePause(); break;
    case 'resume': app.resume(); break;
    case 'restart': app.restart(); break;
    case 'menu': app.returnToMenu(); updateMenuCar(); break;
    case 'next': app.duel.nextStage(); break;
    case 'ticket': app.duel.ackTicket(); break;
    case 'retry-renderer': ensureRenderer(); break;
    case 'manual': app.autopilot = false; break;
    default: return;
  }
  renderState(app.duel.state);
});
const metric = (label,value,accent=false) => `<div class="result-metric${accent?' accent':''}"><span class="field-label">${label}</span><b>${value}</b></div>`;
const action = (label,verb,primary=false) => `<button class="${primary?'start-button':'secondary-button'}" data-action="${verb}"><span>${label}</span>${primary?arrow:''}</button>`;
function modalScreen(s) {
  const r = s.results || {}; let eyebrow='',title='',description='',metrics='',actions='';
  if (s.paused) { eyebrow='TAKE A BREATH'; title='ROAD<br>ON HOLD.'; description='Your rival can wait. The open road will be here.'; metrics=metric('CURRENT STAGE',`${s.stageIndex+1} / ${COURSE.length}`)+metric('TIME',time(s.stageTimeSec)); actions=action('BACK TO THE ROAD','resume',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu'); }
  else if (s.status==='ticket') { const t=s.police.ticket; eyebrow='HIGHWAY PATROL'; title='BUSTED.'; description=`${t.speedMph} mph in a ${t.limitMph} zone. The patrol caught up.`; metrics=metric('TIME PENALTY',`+${t.penaltySec} SEC`,true)+metric('FINE',`$${t.fine}`); actions=action('GET BACK OUT THERE','ticket',true)+action('MAIN MENU','menu'); }
  else if (s.status==='stage_result') { eyebrow=`STAGE ${String(s.stageIndex+1).padStart(2,'0')} / COMPLETE`; title=r.beatRival===false?'SO CLOSE.':r.cleanStage?'DUST<br>SETTLED.':'WIDE OF<br>THE MARK.'; description=r.beatRival===false?'Your rival took this one. There is more road ahead.':r.beatRival?'Your rival is still chasing your taillights.':r.cleanStage?'One stretch conquered. A new horizon awaits.':'You missed the station. Bring it home on the road next time.'; metrics=metric('STAGE TIME',time(r.stageTimeSec),true)+metric('PERSONAL BEST',r.best==null?'—':time(r.best))+metric('SCORE',Number(r.score||0).toLocaleString()); actions=action(s.stageIndex+1>=COURSE.length?'FINISH THE RUN':'NEXT STAGE','next',true)+action('RESTART RUN','restart')+action('MAIN MENU','menu'); }
  else if (s.status==='gameover') { eyebrow=s.catastrophic?'CATASTROPHIC DAMAGE':'END OF THE ROAD'; title=s.catastrophic?'TOTALLED.':'ONE MORE<br>RUN?'; description=s.catastrophic?'Five major crashes. The car is destroyed and this run is over.': 'The car has given all it has. A fresh set of keys is waiting.'; metrics=metric('TOTAL TIME',time(s.totalTimeSec))+metric('STYLE POINTS',Number(s.score||0).toLocaleString(),true); actions=action('RUN IT BACK','restart',true)+action('MAIN MENU','menu'); }
  else if (s.status==='complete') { eyebrow='ALL STAGES COMPLETE'; title='HORIZON<br>CONQUERED.'; description='From desert heat to mountain air. You made it all the way.'; metrics=metric('TOTAL TIME',time(r.totalTimeSec),true)+metric('LIVES LEFT',r.lives)+metric('STYLE POINTS',Number(s.score||0).toLocaleString()); actions=action('CHASE IT AGAIN','restart',true)+action('MAIN MENU','menu'); }
  else return '';
  return `<section class="result-panel" role="dialog" aria-modal="true" aria-labelledby="result-title"><p class="eyebrow"><i></i>${eyebrow}</p><h2 id="result-title">${title}</h2><p class="result-description">${description}</p><div class="result-metrics">${metrics}</div><div class="result-actions">${actions}</div>${s.paused?'<p class="pause-help">WASD / ARROWS TO DRIVE · SPACE TO BOOST · C TO CHANGE CAMERA</p>':''}</section>`;
}
function renderState(s) {
  ui.overlay.dataset.status=s.status; ui.overlay.dataset.paused=String(!!s.paused); ui.overlay.dataset.audioState=app.audio?.context?.state||'locked'; ui.overlay.dataset.muted=String(!!app.audio?.muted);
  ui.overlay.dataset.audioSamples=app.audio.sampleStatus;ui.overlay.dataset.majorCrashes=String(s.majorCrashes);ui.overlay.dataset.catastrophic=String(s.catastrophic);
  const showImpact = s.status === 'gameover' && s.impactTimer > 0;
  const screen=`${s.status}:${!!s.paused}:${showImpact}`;
  if (screen!==lastScreen) {
    lastScreen=screen; const menu=s.status==='menu'; ui.stage.classList.toggle('in-menu',menu); ui.stage.classList.toggle('in-race',!menu); ui['menu-screen'].hidden=!menu; ui['race-hud'].hidden=menu; ui['menu-location'].hidden=!menu; root.querySelectorAll('.race-only').forEach(el=>{el.hidden=menu;});
    const modal=menu||showImpact?'':modalScreen(s); ui['modal-layer'].innerHTML=modal; ui['modal-layer'].hidden=!modal; ui.stage.classList.toggle('has-modal',!!modal); ui['countdown'].hidden=s.status!=='countdown'||!!s.paused;
    text('stage-label',`STAGE ${String(s.stageIndex+1).padStart(2,'0')} / ${String(COURSE.length).padStart(2,'0')}`); text('stage-name',app.duel.stageDef?.name||'The open road'); text('stage-objective',s.rival?'BEAT YOUR RIVAL TO THE STATION':'CHASE YOUR PERSONAL BEST');
    ui['pause-button'].setAttribute('aria-label',s.paused?'Resume race':'Pause race');
    if(modal) ui['modal-layer'].querySelector('button')?.focus({preventScroll:true});
  }
  const muted=!!app.audio?.muted; ui['sound-toggle'].classList.toggle('muted',muted); ui['sound-toggle'].setAttribute('aria-label',muted?'Enable sound':'Mute sound'); text('sound-caption',muted?'SOUND OFF':'SOUND ON'); ui['test-driver'].hidden=!app.autopilot;
  if(s.status!=='menu') updateHud(s);
}
function updateHud(s) {
  text('race-time',time(s.stageTimeSec)); text('penalty-time',s.penaltySec?`+${Math.round(s.penaltySec)} SEC PENALTIES`:''); text('speed-value',String(Math.round(s.speedMph)).padStart(3,'0')); text('gear-value',s.gear+1); text('rpm-value',(clamp(s.revs)*8).toFixed(1));
  ui['rpm-fill'].style.transform=`scaleX(${clamp(s.revs)})`; ui['rpm-fill'].classList.toggle('redline',s.revs>DRIVE.redlineWarnFrac); ui['boost-fill'].style.transform=`scaleX(${clamp(s.boost??1)})`; ui.stage.classList.toggle('is-boosting',!!s.boosting); text('camera-label',`${(app.cameraMode||'chase').toUpperCase()} CAM`); text('style-score',String(s.score||0).padStart(4,'0')); text('combo-label',s.combo>1?`×${s.combo} COMBO`:'');
  const length=app.duel.course?.length||1,progress=clamp(s.s/length); text('route-percent',`${Math.floor(progress*100)}%`); text('route-remaining',`${(Math.max(0,length-s.s)/1000).toFixed(1)} KM TO GO`); ui['progress-fill'].style.transform=`scaleX(${progress})`;
  if(s.rival){
    const gap=s.rival.s-s.s, settled=s.status==='stage_result'||s.status==='complete';
    const behind=settled?s.results?.beatRival===false:s.rival.finished||gap>0;
    text('race-position',behind?'02':'01');
    text('gap-label',settled?'FINISH POSITION':s.rival.finished?'RIVAL FINISHED':behind?'RIVAL AHEAD':'RIVAL BEHIND');
    text('rival-gap',settled?(behind?'SECOND PLACE':'FIRST PLACE'):s.rival.finished?'KEEP PUSHING':`${(Math.abs(gap)/(Math.max(45,s.speedMph,s.rival.speedMph||0)*DRIVE.mphToWorld)).toFixed(1)} SEC`);
  }else{text('race-position','TT');text('gap-label','RACE THE CLOCK');text('rival-gap','TIME TRIAL');} ui['position-total'].hidden=!s.rival; ui['rival-legend'].hidden=!s.rival;
  const hits=s.majorCrashes||0;
  if(ui['lives-display'].dataset.value!==String(hits)){ui['lives-display'].dataset.value=hits;ui['lives-display'].innerHTML=Array.from({length:DRIVE.majorCrashLimit},(_,i)=>`<i class="${i<DRIVE.majorCrashLimit-hits?'healthy':''}"></i>`).join('');ui['lives-display'].setAttribute('aria-label',`${hits} of ${DRIVE.majorCrashLimit} major crashes`);}
  text('damage-label',hits===DRIVE.majorCrashLimit-1?'CRITICAL · NEXT MAJOR CRASH IS FATAL':`${hits} / ${DRIVE.majorCrashLimit} MAJOR CRASHES`);ui['damage-label'].classList.toggle('critical',hits>=DRIVE.majorCrashLimit-1);
  const p=s.police; text('radar-label',p.pursuit?.active?'PURSUIT / OUTRUN THE PATROL':p.beep>.2?'RADAR / SPEED TRAP AHEAD':'RADAR CLEAR'); ui['radar-label'].classList.toggle('warning',p.beep>.2||!!p.pursuit?.active); ui['radar-fill'].style.transform=`scaleX(${p.pursuit?.active?1:clamp(p.beep)})`;
  if(s.status==='countdown'){text('countdown-number',Math.max(1,Math.ceil(s.countdown)));text('countdown-word',s.countdown>1?'GET READY':'MAKE IT COUNT');}
  const crash=s.crashFlash>0||s.impactTimer>0; ui['crash-flash'].hidden=!crash;
  const callout=crash?(s.catastrophic?'CATASTROPHIC IMPACT':s.lastCrashReason==='engine_blew'?'ENGINE BLOWN':s.lastCrashReason==='rock'?'ROCK IMPACT':'COLLISION'):s.calloutTimer>0?s.callout:s.offRoad?'LOOSE SURFACE':s.drifting?'DRIFT':'';
  ui['race-callout'].hidden=!callout||!!s.paused; text('callout-kicker',s.catastrophic?'FIVE HITS. END OF THE ROAD.':crash?hits===DRIVE.majorCrashLimit-1?'CHASSIS CRITICAL. MAKE THIS LIFE COUNT.':'SHAKE IT OFF. KEEP DRIVING.':s.offRoad?'FIND THE TARMAC':s.boosting?'FULL SEND':'MAKE EVERY MOVE COUNT');text('callout-text',callout);ui['race-callout'].classList.toggle('crash-callout',crash);
  if(++mapTick%4===0) drawMap(s);
}
function drawMap(s){
  const canvas=ui['route-map'],ctx=canvas.getContext('2d'),course=app.duel.course;if(!ctx||!course?.samples?.length)return;
  if(routeCourse!==course){routeCourse=course;const points=course.samples,xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=Math.min((canvas.width-72)/Math.max(1,maxX-minX),(canvas.height-50)/Math.max(1,maxZ-minZ)),ox=(canvas.width-(maxX-minX)*scale)/2,oy=(canvas.height-(maxZ-minZ)*scale)/2;const project=p=>({x:ox+(p.x-minX)*scale,y:canvas.height-oy-(p.z-minZ)*scale});routeMap={points:points.map(project),project};}
  ctx.clearRect(0,0,canvas.width,canvas.height); const path=(points,color,width)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();};path(routeMap.points,'rgba(239,230,212,.1)',13);path(routeMap.points,'rgba(239,230,212,.5)',3);const passed=course.samples.filter(p=>p.s<=s.s).map(routeMap.project);if(passed.length>1)path(passed,'#ff6738',4);
  const dot=(distance,color,r)=>{const p=routeMap.project(course.at(distance));ctx.beginPath();ctx.arc(p.x,p.y,r+4,0,Math.PI*2);ctx.fillStyle='#18201bd9';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();};const finish=routeMap.points.at(-1);ctx.fillStyle='#eee6d6';ctx.fillRect(finish.x-5,finish.y-5,10,10);if(s.rival)dot(s.rival.s,'#f6d768',5);dot(s.s,'#ff5b2b',6);
}
document.addEventListener('keydown',e=>{if(e.code!=='Tab'||ui['modal-layer'].hidden)return;const buttons=[...ui['modal-layer'].querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
app.onFrame=renderState;updateMenuCar();renderState(app.duel.state);ensureRenderer();app.start();
