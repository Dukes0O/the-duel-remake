// Two merged controls fixes: real keyboard input and native screen acceptance.
// Private browser harness only; memory storage, no frame measurement.
import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const save=(context,name,data)=>writeFile(join(context.outputDir,name),JSON.stringify(data,null,2)+'\n');

async function bindings(){
  const entry=join(root,'.qa-dist/release-controls.virtual.js').replaceAll('\\','/');
  const absolute=path=>JSON.stringify(join(root,path).replaceAll('\\','/'));
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'release-controls-private',resolveId(id){if(id.replaceAll('\\','/')===entry)return '\0release-controls';},
    load(id){if(id==='\0release-controls')return 'export {COURSE} from '+absolute('src/config.js')+';'+
      'export {useRacingLine} from '+absolute('tools/track-script-drive.mjs')+';';},
  }],build:{write:false,minify:false,lib:{entry,formats:['es']}}});
  const chunk=(Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk');
  if(!chunk)throw Error('Native controls helper did not compile');
  return chunk.code;
}

async function prepare(context,bundle){
  await context.navigate('/tools/menu-check.html?flags=grand-prix');
  await context.waitFor(`!!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, 'isolated real menu',60000);
  await context.evaluate(`(async()=>{
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only storage absent');
    const a=window.__qaApp;a.stop();a.audio.setMuted(true);a.setGraphicsQuality('high');
    document.querySelectorAll('details').forEach(node=>{const label=node.querySelector(':scope > summary')?.textContent||'';if(label==='MENU QA · TEMPORARY SAVES'||label.startsWith('Performance samples ('))node.style.display='none';});
    const url=URL.createObjectURL(new Blob([${JSON.stringify(bundle)}],{type:'text/javascript'}));
    try{window.ControlsQa=await import(url);}finally{URL.revokeObjectURL(url);}
    a.profile={...a.profile,courses:{version:1,unlocked:ControlsQa.COURSE.map(row=>row.id)}};
    if(!a._saveProfile())throw Error('Temporary course ownership failed');
    window.ControlsQaStart=(id,mode)=>{
      a.returnToMenu();a.stop();const stage=ControlsQa.COURSE.findIndex(row=>row.id===id);
      if(stage<0||!a.startCampaign({startStage:stage,seed:1989,mode,car:'falcone_f42',driverId:'club',difficulty:'casual',cpuDifficulty:'medium',opponentCount:1,upgrades:{}}))throw Error('Native start rejected '+id);
      a.stop();a.autopilot=false;a._scriptedCrashDone=true;a._readGamepad=()=>({throttle:0,brake:0,steer:0,boost:false});a.setCamera('chase');
      return{course:a.duel.course.def.id,laps:a.duel.state.lapsTotal,opponents:a.duel.state.opponents.length};
    };
    window.ControlsQaPaint=()=>{a.onFrame?.(a.duel.state,1/60);window.__render?.renderFrame();};
  })()`);
}
async function ready(context){
  await context.waitFor(`(ControlsQaPaint(),window.__qaApp.visualReady&&document.querySelector('#view3d')?.dataset.vehicleAsset==='ready')`,'actual course visuals',90000);
}

async function keyboardLap(context){
  const grid=await context.evaluate(`ControlsQaStart('harbour-lights','duel')`);
  await ready(context);
  await context.evaluate(`(()=>{
    const a=window.__qaApp,d=a.duel,s=d.state;
    ControlsQa.useRacingLine(a,.95);const targets=a._driveAutopilot;
    const apply=a._applyInput,step=d.step;const held=new Set();
    const facts=window.ControlsQaLap={grid:${JSON.stringify(grid)},fps:60,maxSeconds:1200,skill:.95,events:[],keys:{},steps:0,inputSteps:0,stuck:0,maxStuck:0,crashes:0,boundaryResets:0,checkpointResets:0,trace:[]};
    const send=(code,pressed)=>{if(held.has(code)===pressed)return;if(pressed)held.add(code);else held.delete(code);
      window.dispatchEvent(new KeyboardEvent(pressed?'keydown':'keyup',{code,bubbles:true}));facts.keys[code]=(facts.keys[code]||0)+1;};
    d.onChange((state,event)=>{for(const name of ['crash','boundaryReset','checkpointReset'])if(event[name]){
      facts.events.push({event:name,t:state.stageTimeSec,s:state.s,lateral:state.lateral});facts[name==='crash'?'crashes':name==='boundaryReset'?'boundaryResets':'checkpointResets']++;}});
    a._applyInput=function(dt){
      const requested={throttle:0,brake:0,steer:0};const original=d.setInput;
      d.setInput=input=>Object.assign(requested,input);
      try{targets.call(a,dt);}finally{d.setInput=original;}
      send('KeyW',requested.throttle>=.5);send('KeyS',requested.brake>0);
      send('ArrowLeft',requested.steer<=-.05);send('ArrowRight',requested.steer>=.05);
      apply.call(a,dt);facts.inputSteps++;
    };
    d.step=function(dt){
      if(facts.inputSteps!==facts.steps+1)throw Error('A physics step lacks actual keyboard input');
      if(a.autopilot)throw Error('Autopilot entered keyboard lap');
      step.call(d,dt);facts.steps++;
      if(s.status==='racing'){
        if(![s.s,s.lateral,s.speedMph,s.headingError].every(Number.isFinite))throw Error('Nonfinite keyboard race');
        if(s.stageTimeSec>8){facts.stuck=s.speedMph<3?facts.stuck+dt:0;facts.maxStuck=Math.max(facts.maxStuck,facts.stuck);}
        if(facts.steps%120===0)facts.trace.push({t:s.stageTimeSec,s:s.s,lateral:s.lateral,mph:s.speedMph,offRoad:s.offRoad,impact:s.impactTimer,knock:!!s.knock});
      }
    };
    window.ControlsQaLapAdvance=()=>{
      for(let i=0;i<600&&s.completedLaps<1&&['countdown','racing','ticket'].includes(s.status)&&facts.steps<1200*120;i++)a.advance(1/60,1/60);
      ControlsQaPaint();
      return{done:s.completedLaps>=1||!['countdown','racing','ticket'].includes(s.status)||facts.steps>=1200*120,status:s.status,laps:s.completedLaps,t:s.stageTimeSec,s:s.s,maxStuck:facts.maxStuck};
    };
    window.ControlsQaLapFinish=()=>{
      for(const code of held)window.dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
      a._applyInput=apply;d.step=step;Object.assign(facts,{status:s.status,completedLaps:s.completedLaps,lapTimes:[...s.lapTimes],nativeLapsTotal:s.lapsTotal,timeSec:s.stageTimeSec,endS:s.s,passed:s.completedLaps>=1&&facts.maxStuck<1});return facts;
    };
  })()`);
  let state;
  do{state=await context.evaluate('ControlsQaLapAdvance()');console.log('Keyboard Harbour: '+JSON.stringify(state));}while(!state.done);
  const result=await context.evaluate('ControlsQaLapFinish()');
  await context.screenshot('harbour-keyboard-lap');
  await save(context,'keyboard-lap.json',result);
  return result;
}

async function screenCase(context,id,width,height){
  await context.command('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const grid=await context.evaluate(`ControlsQaStart(${JSON.stringify(id)},'grandprix')`);
  await ready(context);
  const failures=[];
  await context.evaluate(`(()=>{
    const a=window.__qaApp,s=a.duel.state;
    for(let i=0;i<900&&s.status!=='racing';i++)a.advance(1/60,1/60);
    if(s.status!=='racing')throw Error('Native countdown did not end');
    ControlsQaPaint();
  })()`);
  // Photograph the race screen with every GP readout present.
  const layout=await context.evaluate(`(()=>{
    const debug=[...document.querySelectorAll('details')].filter(node=>{const label=node.querySelector(':scope > summary')?.textContent||'';return label==='MENU QA · TEMPORARY SAVES'||label.startsWith('Performance samples (');});
    if(debug.length!==2)throw Error('Both QA debug panels must exist before capture');
    for(const node of debug)node.style.display='none';
    if(debug.some(node=>getComputedStyle(node).display!=='none'))throw Error('QA debug panels still obscure native HUD');
    const visible=e=>e&&!e.hidden&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length>0;
    const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const selectors=['.route-hud','#route-map','.rear-view-frame','.speedometer','.race-clock','.race-position','.race-heading','.race-health','#field-board','#race-callout','#style-score-panel','#tow-marker','.utility-controls'];
    const rows=Object.fromEntries(selectors.map(selector=>[selector,document.querySelector(selector)]).filter(([,e])=>visible(e)).map(([selector,e])=>[selector,{...rect(e),text:e.textContent.trim()}]));
    const overlaps=[];for(const a of ['.route-hud','.rear-view-frame'])for(const b of Object.keys(rows)){
      if(a===b||b==='#route-map')continue;const p=rows[a],q=rows[b];if(p&&q&&Math.min(p.right,q.right)>Math.max(p.x,q.x)&&Math.min(p.bottom,q.bottom)>Math.max(p.y,q.y))overlaps.push([a,b]);}
    for(const b of ['.utility-controls','.race-position']){const p=rows['.race-clock'],q=rows[b];if(p&&q&&Math.min(p.right,q.right)>Math.max(p.x,q.x)&&Math.min(p.bottom,q.bottom)>Math.max(p.y,q.y))overlaps.push(['.race-clock',b]);} return{viewport:{width:innerWidth,height:innerHeight},rows,overlaps,canvas:{width:document.querySelector('#route-map').width,height:document.querySelector('#route-map').height}};
  })()`);
  const panel=layout.rows['.route-hud'],map=layout.rows['#route-map'],mirror=layout.rows['.rear-view-frame'];
  const near=(actual,expected)=>Math.abs(actual-expected)<=1;
  if(!panel||!map||!mirror)failures.push('Required native UI absent');
  else{
    if(!near(panel.width,432*height/1080)||!near(map.width,384*height/1080))failures.push('Map dimensions');
    if(!near(mirror.width,width*.3)||!near(mirror.width/mirror.height,3.2)||!near(mirror.x+mirror.width/2,width/2))failures.push('Mirror dimensions/center');
  }
  if(layout.overlaps.length)failures.push('Readout overlap '+JSON.stringify(layout.overlaps));
  await context.screenshot(id+'-'+width+'x'+height);
  const cameras=[];
  await context.evaluate(`window.__qaApp.setCamera('chase');ControlsQaPaint()`);
  for(const expected of ['hood','wide','back','chase']){
    await context.command('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyC',key:'c',windowsVirtualKeyCode:67});
    await context.command('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyC',key:'c',windowsVirtualKeyCode:67});
    const camera=await context.evaluate(`(ControlsQaPaint(),{mode:window.__qaApp.cameraMode,label:document.querySelector('#camera-label').textContent})`);
    cameras.push({expected,...camera});if(camera.mode!==expected||camera.label!==expected.toUpperCase()+' CAM')failures.push('C camera '+expected);
    if(id==='harbour-lights'&&width===1920){await new Promise(done=>setTimeout(done,350));await context.evaluate('ControlsQaPaint()');await context.screenshot('harbour-camera-'+expected+'-1920x1080');}
  }
  return{id,width,height,grid,layout,cameras,failures,passed:failures.length===0};
}
export async function run(context){
  const bundle=await bindings();await prepare(context,bundle);
  const uiOnly=process.env.DUEL_CONTROLS_UI_ONLY==='1';const packet={schema:1,storage:'memory-only',quality:'high',keyboard:uiOnly?null:await keyboardLap(context),notRepeated:uiOnly,keyboardReceipt:uiOnly?'native-b4a00a85/keyboard-lap.json':null,screens:[]};
  await save(context,'controls-native.json',packet);
  for(const [width,height]of [[1920,1080],[2560,1440]])for(const id of ['harbour-lights','tremblant-woods']){
    const result=await screenCase(context,id,width,height);packet.screens.push(result);await save(context,'controls-native.json',packet);
    console.log('Native screen '+id+' '+width+'x'+height+': '+(result.passed?'PASS':result.failures.join('; ')));
  }
  const failures=[...(!uiOnly&&!packet.keyboard.passed?['Harbour keyboard lap failed']:[]),...packet.screens.flatMap(row=>row.failures.map(failure=>row.id+' '+row.width+': '+failure))];
  if(failures.length)throw Error(failures.join('; '));
}
