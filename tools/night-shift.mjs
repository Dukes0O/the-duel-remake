// FAC-03: installed tools run serially on the declared idle, awake laptop.
// Importing this module never starts jobs, installs a task, rewrites or pushes.
import { spawn, spawnSync } from 'node:child_process';
import { appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { namedScenarios } from './run-browser-scenarios.mjs';

const ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
const path=(...parts)=>join(...parts).replaceAll('\\','/');
const usage='Usage: node tools/night-shift.mjs --idle-awake --no-push [--date YYYY-MM-DD]';
const commitPattern=/^[a-f0-9]{40}$/;
function localDate(now=new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function parseNightArguments(args=[]) {
  const options={idleAwake:false,noPush:false,date:localDate()},seen=new Set();
  for(let index=0;index<args.length;index++) {
    const arg=args[index];if(seen.has(arg))throw Error(usage);seen.add(arg);
    if(arg==='--idle-awake')options.idleAwake=true;
    else if(arg==='--no-push')options.noPush=true;
    else if(arg==='--date') {
      const date=args[++index];
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)throw Error(usage);
      options.date=date;
    }else throw Error(usage);
  }
  if(!options.idleAwake||!options.noPush)throw Error(usage);
  return options;
}
export function nightPlan({root=ROOT,date=localDate()}={}) {
  const evidence=path(root,'.evidence',date,'FAC-03','night');
  const frameDir=path(evidence,'frames'),browserDir=path(evidence,'browser');
  return [
    {id:'full',args:['tools/run-tests.mjs','--tier','full','--jobs','4','--keep-going','--json']},
    {id:'frames',args:['tools/browser-harness.mjs','scenario','frame-pacing','--headed','--output-dir',frameDir],
      env:{DUEL_NIGHT_FRAMES:'1',DUEL_NIGHT_IDLE_AWAKE:'1'},packet:path(frameDir,'frame-pacing.json')},
    {id:'combat-off',args:['tools/combat-balance.mjs','--check','--wasteland2','off']},
    {id:'combat-on',args:['tools/combat-balance.mjs','--check','--wasteland2','on']},
    {id:'browser',args:['tools/run-browser-scenarios.mjs','--all','--jobs','4','--output-dir',browserDir],
      packet:path(browserDir,'summary.json')}
  ].map(row=>({...row,log:path(evidence,row.id+'.log')}));
}
export function validateFramePacket(packet) {
  if(packet?.schema!==1||packet.mode!=='night-simple'||packet.reports?.length!==2)
    throw Error('Missing complete simple night frame packet.');
  for(const [index,quality]of ['High','Performance'].entries()) {
    const row=packet.reports[index];
    if(row.quality!==quality||row.course!=='harbour-lights'||row.cars!==8||row.night!==true||
      row.frames!==120||row.headed!==true||row.visible!==true||row.memoryOnlySaves!==true||
      row.appRunning!==true||row.rearView!=='ready'||!Number.isFinite(row.countdownBefore)||
      !Number.isFinite(row.countdownAfter)||row.countdownAfter<=row.countdownBefore||
      !Number.isFinite(row.p95)||row.p95<=0||row.p95>18.5||
      !Number.isFinite(row.constructionMs)||row.constructionMs<0||row.constructionMs>=1000)
      throw Error(`${quality}: real eight-car night frames require delivered p95 <=18.5 ms and complete construction <1000 ms.`);
  }
  return packet;
}
export async function runChild(executable,args,{cwd,env=process.env,logPath,
  appendText=appendFile,spawnImpl=spawn}={}) {
  let stdout='',stderr='',writes=Promise.resolve(),child;
  const record=(kind,chunk)=>{
    const text=chunk.toString();if(kind==='stdout')stdout+=text;else stderr+=text;
    if(logPath)writes=writes.then(()=>appendText(logPath,kind==='stderr'?'[stderr] '+text:text));
  };
  let exitCode;
  try {
    child=spawnImpl(executable,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
    child.stdout?.on('data',chunk=>record('stdout',chunk));
    child.stderr?.on('data',chunk=>record('stderr',chunk));
    exitCode=await new Promise(done=>{
      child.once('error',error=>{record('stderr',error.message+'\n');done(1);});
      child.once('close',(code,signal)=>{if(signal)record('stderr',`Terminated by ${signal}\n`);done(code??1);});
    });
  }catch(error){record('stderr',error.message+'\n');exitCode=1;}
  await writes;
  return {exitCode,stdout,stderr};
}
function gitRead(args,root) {
  const child=spawnSync('git',args,{cwd:root,encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error(child.error?.message||child.stderr||'Git read failed.');
  return child.stdout.trim();
}
export function heavyProcesses(rows,self=process.pid) {
  return rows.filter(row=>row.pid!==self&&
    /tools\/(?:run-tests|combat-balance|browser-harness|run-browser-scenarios|[^\s"]*field-rate)\.mjs|vite[^\r\n]*\bbuild\b|blender/i
      .test(String(row.command||'').replaceAll('\\','/')));
}
export function inspectNightProcesses() {
  if(process.platform!=='win32')throw Error('The installed night command requires Windows process inspection.');
  const script="Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','blender.exe') } | ForEach-Object { @{pid=$_.ProcessId;command=$_.CommandLine} } | ConvertTo-Json -Compress";
  const child=spawnSync('powershell.exe',['-NoProfile','-Command',script],
    {encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error('Cannot verify quiet laptop: '+(child.error?.message||child.stderr));
  const rows=child.stdout.trim()?JSON.parse(child.stdout):[];
  return heavyProcesses(Array.isArray(rows)?rows:[rows]);
}
const json=text=>JSON.parse(text);
function fullPacket(text) {
  const rows=text.trim().split(/\r?\n/).filter(Boolean);
  return json(rows.at(-1)||'null');
}
function validateFull(packet) {
  if(packet?.schema!==1||packet.kind!=='result'||packet.tier!=='full'||packet.jobs!==4||
    !Number.isInteger(packet.total)||packet.total<1||packet.passed!==packet.total||
    packet.failures?.length!==0||packet.notRun!==0||packet.results?.length!==packet.total||
    packet.results.some(row=>row.passed!==true))throw Error('Full tier has failures, unrun suites or an incomplete actual packet.');
}
function validateBrowser(packet,names) {
  if(packet?.schema!==1||packet.count!==names.length||packet.count<1||packet.passed!==packet.count||
    packet.failed!==0||packet.rows?.length!==packet.count||packet.rows.some(row=>row.passed!==true)||
    packet.rows.map(row=>row.name).join('|')!==names.join('|'))throw Error('Browser acceptance has failures or missing named scenarios.');
}
function validateCombat(packet,value) {
  const row=packet?.wasteland2,active=value==='on';
  if(row?.value!==value||row.eligibility!==active||row.rulesActive!==active)
    throw Error(`Combat ${value}: missing actual gate eligibility and rulesActive.`);
  if(row.acceptance!=='applicable')throw Error(`Combat ${value}: ${row.acceptance||'unsupported'} acceptance; ${row.reason||'no accepted targets for these rules'}.`);
}
async function previousGreen(date,dependencies) {
  const names=(await dependencies.listNightFiles()).filter(name=>/^night-\d{4}-\d{2}-\d{2}\.json$/.test(name)&&
    name.slice(6,16)<date).sort().reverse();
  for(const name of names) {
    try {
      const row=json(await dependencies.readText(path(dependencies.root,'docs/board/checks',name)));
      if(row.schema===1&&row.status==='passed'&&commitPattern.test(row.source))return row;
    }catch{}
  }
  return null;
}
export async function runNight(options,overrides={}) {
  const root=overrides.root||ROOT;
  if(root.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()==='c:/users/kyleb/dev/the-duel-remake')
    throw Error('Refusing the live folder.');
  if(options?.idleAwake!==true||options.noPush!==true)throw Error(usage);
  const dependencies={root,now:()=>new Date(),git:args=>gitRead(args,root),processes:inspectNightProcesses,
    scenarioNames:namedScenarios,readText:file=>readFile(file,'utf8'),writeText:writeFile,appendText:appendFile,
    mkdir:dir=>mkdir(dir,{recursive:true}),
    listNightFiles:()=>readdir(path(root,'docs/board/checks')).catch(error=>{if(error.code==='ENOENT')return[];throw error;}),
    ...overrides};
  const source=(await dependencies.git(['rev-parse','HEAD'])).trim();
  if(!commitPattern.test(source))throw Error('Missing actual source commit.');
  const packet={schema:1,date:options.date,source,started:dependencies.now().toISOString(),status:'failed',
    context:{operatorDeclaredIdleAwake:true,operatorDeclaredNoOtherGpuWorkload:true,
      displayPowerMeasured:false,processIsolationObserved:false},stages:[],failures:[],
    compaction:{status:'disabled',reason:'Separate Kyle authorization required; no history rewrite this run.'},
    push:{status:'disabled',reason:'--no-push; no push authorized this run.'}};
  const previous=await previousGreen(options.date,dependencies);packet.lastGreen=previous?.source||null;
  let firstMerge=null,attribution='Unknown: no previous green night.';
  if(previous) {
    try {
      firstMerge=(await dependencies.git(['rev-list','--first-parent','--reverse','--merges',previous.source+'..'+source])).trim().split(/\r?\n/)[0]||null;
      attribution=firstMerge?'First merge after the last green night.':'No merge after the last green night.';
    }catch(error){attribution='Unknown: '+error.message;}
  }
  const failure=(name,error)=>packet.failures.push({name,error,firstMerge,attribution});
  const plan=nightPlan({root,date:options.date});
  await dependencies.mkdir(path(root,'.evidence',options.date,'FAC-03','night'));
  try {
    if((await dependencies.git(['status','--porcelain'])).trim())throw Error('Source tree is dirty; no night jobs started.');
    const busy=await dependencies.processes();
    if(busy.length)throw Error('Laptop is busy: '+busy.map(row=>row.command).join('; '));
    packet.context.processIsolationObserved=true;
    for(const stage of plan) {
      const row={id:stage.id,args:stage.args,log:stage.log,started:dependencies.now().toISOString(),passed:false};
      packet.stages.push(row);
      try {
        if((await dependencies.git(['status','--porcelain'])).trim())throw Error('Source tree changed during the night.');
        if((await dependencies.git(['rev-parse','HEAD'])).trim()!==source)throw Error('Source commit changed during the night.');
        if((await dependencies.processes()).length)throw Error('Another heavy job started; this stage is refused.');
        await dependencies.writeText(stage.log,'');
        const result=await runChild(process.execPath,stage.args,{cwd:root,env:{...process.env,DUEL_NIGHT_FRAMES:'0',DUEL_NIGHT_IDLE_AWAKE:'0',...stage.env},
          logPath:stage.log,spawnImpl:dependencies.spawnImpl||spawn,appendText:dependencies.appendText});
        row.exitCode=result.exitCode;
        if(stage.id==='full') {
          try {
            const actual=fullPacket(result.stdout);
            row.counts={passed:actual.passed,failed:actual.failures?.length,unrun:actual.notRun,total:actual.total};
            row.failureNames=(actual.failures||[]).map(name=>'full: '+name);
          }catch{}
        }else if(stage.id==='browser') {
          try {
            const actual=json(await dependencies.readText(stage.packet));
            row.counts={passed:actual.passed,failed:actual.failed,total:actual.count};
            row.failureNames=(actual.rows||[]).filter(item=>item.passed!==true).map(item=>'browser: '+item.name);
          }catch{}
        }
        if(result.exitCode!==0)throw Error(result.stderr.trim()||`Installed tool exited ${result.exitCode}. See ${stage.log}`);
        if(stage.id==='full')validateFull(fullPacket(result.stdout));
        else if(stage.id==='frames')validateFramePacket(json(await dependencies.readText(stage.packet)));
        else if(stage.id==='browser')validateBrowser(json(await dependencies.readText(stage.packet)),await dependencies.scenarioNames());
        else validateCombat(json(result.stdout),stage.id.endsWith('off')?'off':'on');
        if((await dependencies.processes()).length)throw Error('Heavy child or competing job remains after the stage; timing is not accepted.');
        if((await dependencies.git(['status','--porcelain'])).trim())throw Error('Source tree changed during the night.');
        if((await dependencies.git(['rev-parse','HEAD'])).trim()!==source)throw Error('Source commit changed during the stage.');
        row.passed=true;
      }catch(error){row.error=error.message;for(const name of row.failureNames?.length?row.failureNames:[stage.id])failure(name,error.message);}
      row.finished=dependencies.now().toISOString();
    }
  }catch(error){failure('context',error.message);}
  packet.finished=dependencies.now().toISOString();packet.status=packet.failures.length?'failed':'passed';
  const reportDir=path(root,'docs/board/checks');await dependencies.mkdir(reportDir);
  await dependencies.writeText(path(reportDir,`night-${options.date}.json`),JSON.stringify(packet,null,2)+'\n');
  const morning=[`Night ${options.date}: ${packet.status.toUpperCase()} (${source}).`,
    ...packet.stages.map(row=>`${row.passed?'PASS':'FAIL'} ${row.id}: ${row.log}`),
    'First merge after last green: '+(firstMerge||attribution),
    'Compaction and push disabled; separate Kyle authorization is pending.',
    `Details: docs/board/checks/night-${options.date}.json`];
  await dependencies.writeText(path(reportDir,`night-${options.date}.md`),morning.join('\n')+'\n');
  return packet;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  runNight(parseNightArguments(process.argv.slice(2))).then(packet=>{
    console.log(`Night ${packet.date}: ${packet.status}; docs/board/checks/night-${packet.date}.json`);
    process.exitCode=packet.status==='passed'?0:1;
  }).catch(error=>{console.error(error.message);process.exitCode=2;});
}