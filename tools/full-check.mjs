// Full check: installed tools run serially on one detached source commit.
// Importing this module never starts jobs, installs a task, rewrites or pushes.
import { spawn, spawnSync } from 'node:child_process';
import { appendFile, mkdir, mkdtemp, readFile, readdir, writeFile, rmdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';


const ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
const path=(...parts)=>join(...parts).replaceAll('\\','/');
const usage='Usage: node tools/full-check.mjs --idle-awake --no-push [--date YYYY-MM-DD]';
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
export function nightPlan({root=ROOT,date=localDate(),evidence=path(root,'.evidence',date,'FAC-03','night')}={}) {
  const frameDir=path(evidence,'frames'),browserDir=path(evidence,'browser');
  return [
    {id:'full',args:['tools/run-tests.mjs','--tier','full','--jobs','4','--keep-going','--json']},
    {id:'frames',args:['tools/run-browser-scenarios.mjs','--scenarios','frame-pacing,tremblant-snow,tremblant-views',
      '--timing-only','--headed','--jobs','1','--output-dir',frameDir],
      env:{DUEL_NIGHT_FRAMES:'1',DUEL_NIGHT_IDLE_AWAKE:'1'},packet:path(frameDir,'frame-pacing','frame-pacing.json'),
      suitePacket:path(frameDir,'summary.json'),timingPackets:[
        {name:'tremblant-snow',packet:path(frameDir,'tremblant-snow','tremblant-snow-frame-pacing.json')},
        {name:'tremblant-views',packet:path(frameDir,'tremblant-views','tremblant-frame-pacing.json')}]},
    {id:'combat',args:['tools/combat-balance.mjs','--check']},
    {id:'browser',args:['tools/run-browser-scenarios.mjs','--all','--jobs','4','--output-dir',browserDir],
      env:{DUEL_NIGHT_FRAME_REUSE:'1',DUEL_NIGHT_FRAME_PACKET:path(frameDir,'frame-pacing','frame-pacing.json')},
      packet:path(browserDir,'summary.json')}
  ].map(row=>({...row,log:path(evidence,row.id+'.log')}));
}
export function validateFramePacket(packet,{warn=()=>{}}={}) {
  if(packet?.schema!==1||packet.mode!=='night-simple'||packet.reports?.length!==2)
    throw Error('Missing complete simple night frame packet.');
  // Load warnings describe the measured packet even if a frame verdict fails.
  for(const [index,quality]of ['High','Performance'].entries()) {
    const row=packet.reports[index];
    if(row?.quality===quality&&Number.isFinite(row.constructionMs)&&row.constructionMs>5000)
      warn(`${quality}: full first-race load ${row.constructionMs} ms exceeds 5000 ms (warning only).`);
  }
  for(const [index,quality]of ['High','Performance'].entries()) {
    const row=packet.reports[index];
    if(row.quality!==quality||row.course!=='harbour-lights'||row.cars!==8||row.night!==true||
      row.frames!==120||row.headed!==true||row.visible!==true||row.memoryOnlySaves!==true||
      row.appRunning!==true||row.rearView!=='ready'||!Number.isFinite(row.countdownBefore)||
      !Number.isFinite(row.countdownAfter)||row.countdownAfter<=row.countdownBefore||
      !Number.isFinite(row.p95)||row.p95<=0||row.p95>18.5||
      !Number.isFinite(row.worldBuildMs)||row.worldBuildMs<0||row.worldBuildMs>=1000||
      !Number.isFinite(row.constructionMs)||row.constructionMs<0)
      throw Error(`${quality}: real eight-car night frames require delivered p95 <=18.5 ms, finite world build <1000 ms and finite full first-race load.`);
  }
  return packet;
}
export async function runChild(executable,args,{cwd,env=process.env,logPath,
  appendText=appendFile,spawnImpl=spawn}={}) {
  let stdout='',stderr='',writes=Promise.resolve(),child,childError=false;
  const logErrors=[];
  const record=(kind,text)=>{
    if(kind==='stdout')stdout+=text;else stderr+=text;
    // Attach rejection handling now, while the child is still alive. Keep
    // every later write queued, then report the error after close and drain.
    if(logPath)writes=writes.then(()=>appendText(logPath,kind==='stderr'?'[stderr] '+text:text))
      .catch(error=>{logErrors.push(error.message);});
  };
  let exitCode;
  try {
    child=spawnImpl(executable,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true});
    child.stdout?.setEncoding('utf8');child.stderr?.setEncoding('utf8');
    child.stdout?.on('data',text=>record('stdout',text));
    child.stderr?.on('data',text=>record('stderr',text));
    exitCode=await new Promise(done=>{
      child.on('error',error=>{childError=true;record('stderr',error.message+'\n');});
      child.once('close',(code,signal)=>{
        if(signal)record('stderr',`Terminated by ${signal}\n`);
        done(childError?1:code??1);
      });
    });
  }catch(error){record('stderr',error.message+'\n');exitCode=1;}
  await writes;
  if(logErrors.length){exitCode=exitCode||1;stderr+='Log append failed: '+logErrors.join('; ')+'\n';}
  return {exitCode,stdout,stderr};
}
function gitCommand(args,root) {
  const child=spawnSync('git',args,{cwd:root,encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error(child.error?.message||child.stderr||'Git read failed.');
  return child.stdout;
}
// Count actual foreign job trees, not their Blender or harness descendants.
export function heavyProcesses(rows,self=process.pid) {
  const byPid=new Map(rows.map(row=>[row.pid,row]));
  const ancestors=pid=>{const found=new Set();while(byPid.has(pid)&&!found.has(pid)){found.add(pid);pid=byPid.get(pid).parent;}return found;};
  const own=ancestors(self);
  const heavy=rows.filter(row=>!own.has(row.pid)&&!ancestors(row.pid).has(self)&&
    /tools\/(?:full-check|run-tests|combat-balance|race-field-balance|browser-harness|run-browser-scenarios|[^\s"]*field-rate)\.mjs|vite[^\r\n]*\bbuild\b|blender/i
      .test(String(row.command||'').replaceAll('\\','/')));
  const ids=new Set(heavy.map(row=>row.pid));
  return heavy.filter(row=>![...ancestors(row.parent)].some(pid=>ids.has(pid)));
}
export function inspectNightProcesses() {
  if(process.platform!=='win32')throw Error('The installed full check requires Windows process inspection.');
  const script="Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('node.exe','blender.exe') } | ForEach-Object { @{pid=$_.ProcessId;parent=$_.ParentProcessId;command=$_.CommandLine} } | ConvertTo-Json -Compress";
  const child=spawnSync('powershell.exe',['-NoProfile','-Command',script],
    {encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error('Cannot inspect competing work: '+(child.error?.message||child.stderr));
  const rows=child.stdout.trim()?JSON.parse(child.stdout):[];
  return heavyProcesses(Array.isArray(rows)?rows:[rows]);
}

const ownedCopies=new WeakSet();
function junctionCommand(link,target,operation='verify') {
  const inspect="if($PSVersionTable.PSVersion.Major -lt 7){throw 'Junction cleanup requires PowerShell 7'}; $item=Get-Item -LiteralPath $env:DUEL_CHECK_LINK -Force -ErrorAction Stop; if($item.LinkType -ne 'Junction'){throw 'Expected Junction'}; $actual=[IO.Path]::GetFullPath(@($item.Target)[0]).TrimEnd('\\'); $expected=[IO.Path]::GetFullPath($env:DUEL_CHECK_TARGET).TrimEnd('\\'); if($actual -ine $expected){throw 'Junction target mismatch'}; ";
  const script=(operation==='create'?"New-Item -ItemType Junction -Path $env:DUEL_CHECK_LINK -Target $env:DUEL_CHECK_TARGET -ErrorAction Stop | Out-Null; ":'')+inspect+
    (operation==='remove'?"Remove-Item -LiteralPath $env:DUEL_CHECK_LINK -ErrorAction Stop":'');
  const row=spawnSync('pwsh',['-NoProfile','-NonInteractive','-Command',script],
    {encoding:'utf8',shell:false,windowsHide:true,env:{...process.env,DUEL_CHECK_LINK:link,DUEL_CHECK_TARGET:target}});
  if(row.error||row.status!==0)throw Error(row.error?.message||row.stderr||'Junction operation failed.');
}
export async function createCheckCopy(integration,source) {
  if(!commitPattern.test(source))throw Error('Copy requires an exact source commit.');
  integration=path(resolve(integration));
  if(integration.toLowerCase()==='c:/users/kyleb/dev/the-duel-remake')throw Error('Refusing the live folder.');
  const container=path(await mkdtemp(path(dirname(integration),'full-check-')));
  const copy=Object.freeze({integration,source,container,root:path(container,'source')});
  try {
    gitCommand(['worktree','add','--detach',copy.root,source],integration);
    for(const name of ['node_modules','.evidence']) {
      await mkdir(path(integration,name),{recursive:true});
      junctionCommand(path(copy.root,name),path(integration,name),'create');
    }
    ownedCopies.add(copy);return copy;
  }catch(error) {
    // Preserve a partially prepared checkout. Never guess which path is safe
    // to delete when setup failed; the actual retained path makes it reviewable.
    throw Error('Copy setup failed; retained '+container+': '+error.message);
  }
}
export async function removeCheckCopy(copy) {
  if(!ownedCopies.has(copy)||path(copy.root)!==path(copy.container,'source')||
    path(dirname(copy.container))!==path(dirname(copy.integration)))throw Error('Missing owned copy receipt.');
  if(gitCommand(['rev-parse','HEAD'],copy.root).trim()!==copy.source||
    gitCommand(['branch','--show-current'],copy.root).trim()||gitCommand(['status','--porcelain'],copy.root).trim())
    throw Error('Copy is changed; nonforced cleanup refused.');
  if(gitCommand(['rev-parse','--path-format=absolute','--git-common-dir'],copy.root).trim()!==
    gitCommand(['rev-parse','--path-format=absolute','--git-common-dir'],copy.integration).trim())
    throw Error('Copy no longer belongs to integration.');
  // Verify both exact resolved link/target pairs before unlinking either.
  for(const name of ['node_modules','.evidence']) {
    const link=path(resolve(copy.root,name)),target=path(resolve(copy.integration,name));
    junctionCommand(link,target);
  }
  for(const name of ['node_modules','.evidence'])junctionCommand(path(copy.root,name),path(copy.integration,name),'remove');
  gitCommand(['worktree','remove',copy.root],copy.integration);
  await rmdir(copy.container);ownedCopies.delete(copy);
}
const json=text=>JSON.parse(text);
function fullPacket(text) {
  const rows=text.trim().split(/\r?\n/).filter(Boolean);
  return json(rows.at(-1)||'null');
}
const fullReportName='docs/board/checks/full-tier.json';
async function consumeFullReport(dependencies,copy,source,original,result,evidence) {
  const status=await dependencies.git(['status','--porcelain'],copy.root);
  if(!status.trim())return null;
  const entries=status.split(/\r?\n/).filter(Boolean);
  if((await dependencies.git(['rev-parse','HEAD'],copy.root)).trim()!==source ||
    entries.length!==1 || entries[0]!==' M '+fullReportName)
    throw Error('Copied source changed outside the full runner report; consumption refused.');
  const target=path(copy.root,fullReportName),text=await dependencies.readText(target);
  const record=json(text),actual=fullPacket(result.stdout);
  const rows=actual?.results;
  if(actual?.schema!==1 || actual.kind!=='result' || actual.tier!=='full' || actual.jobs!==4 ||
    !Number.isSafeInteger(actual.total) || actual.total<1 || actual.notRun!==0 ||
    !Array.isArray(rows) || rows.length!==actual.total ||
    rows.some(row=>typeof row.label!=='string' || !row.label || typeof row.passed!=='boolean' ||
      !Number.isSafeInteger(row.exitCode) || row.exitCode<0 || row.passed!==(row.exitCode===0)) ||
    new Set(rows.map(row=>row.label)).size!==rows.length ||
    actual.passed!==rows.filter(row=>row.passed).length ||
    !Array.isArray(actual.failures) ||
    JSON.stringify(actual.failures)!==JSON.stringify(rows.filter(row=>!row.passed).map(row=>row.label)) ||
    actual.exitCode!==result.exitCode || actual.exitCode!==(rows.find(row=>!row.passed)?.exitCode??0))
    throw Error('Full runner stdout is incomplete or inconsistent; report consumption refused.');
  if(record?.schema!==1 || record.tier!=='full' || record.commit!==source || record.endCommit!==source ||
    record.dirty!==false || record.startDirty!==false || record.endDirty!==false || record.complete!==true ||
    typeof record.time!=='string' || !Number.isFinite(Date.parse(record.time)) ||
    Date.parse(record.time)>dependencies.now().getTime() || record.total!==actual.total ||
    record.completed!==actual.total || record.passed!==(actual.exitCode===0) ||
    JSON.stringify(record.failures)!==JSON.stringify(actual.failures) || typeof original!=='string')
    throw Error('Full runner report does not match exact clean source and complete stdout; consumption refused.');
  const retained=path(evidence,'full-tier.json');
  await dependencies.writeText(retained,text);
  // Recheck immediately before replacing only this verified generated file.
  if(await dependencies.readText(target)!==text ||
    await dependencies.git(['status','--porcelain'],copy.root)!==status ||
    (await dependencies.git(['rev-parse','HEAD'],copy.root)).trim()!==source)
    throw Error('Copied source changed while retaining the full report; consumption refused.');
  await dependencies.writeText(target,original);
  return retained;
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
export function validateTremblantFramePacket(packet,name) {
  if(!['tremblant-snow','tremblant-views'].includes(name))throw Error('Unknown Tremblant frame recipe.');
  const labels=name==='tremblant-snow'?['8 cars on the grid']:['8 cars on the grid','8 cars on Timber Straight'];
  const expected=['high','performance'].flatMap(quality=>labels.map(label=>({quality,label})));
  if(packet?.mode!=='timing'||packet.misses!==0||packet.reports?.length!==expected.length)
    throw Error(name+': missing completed timing-only packet.');
  for(const [index,at]of expected.entries()) {
    const row=packet.reports[index];
    if(row.quality!==at.quality||row.label!==at.label||row.course!==(name==='tremblant-snow'?'tremblant-snow':'tremblant-woods')||
      row.cars!==8||row.frames!==120||
      !Number.isFinite(row.p95)||row.p95<=0||row.p95>(name==='tremblant-snow'?18.5:33.5)||
      (name==='tremblant-views'&&(!Number.isInteger(row.over33ms)||row.over33ms<0||row.over33ms>12)))
      throw Error(name+': timing requires both qualities, eight cars,120frames and the unchanged frame limits.');
  }
  return packet;
}
function validateCombat(packet) {
  // The installed --check owns every original band and gameplay assertion.
  // Require its actual current-rules aggregate, not an empty success packet.
  if(!Array.isArray(packet?.flags)||packet.flags.length!==0||
    !Number.isInteger(packet.policyRuns)||packet.policyRuns<1||
    !Number.isInteger(packet.baselineRaces)||packet.baselineRaces<1||
    !Number.isFinite(packet.crossbowAim?.hitRate)||!Number.isFinite(packet.ownBombs?.maxSpeedLossPct))
    throw Error('Missing actual current-rules combat balance aggregate.');
}

async function previousGreen(date,dependencies) {
  const names=(await dependencies.listNightFiles()).filter(name=>/^night-\d{4}-\d{2}-\d{2}\.json$/.test(name)&&
    name.slice(6,16)<=date).sort().reverse();
  for(const name of names) {
    try {
      const row=json(await dependencies.readText(path(dependencies.root,'docs/board/checks',name)));
      if(row.schema===1&&row.status==='passed'&&commitPattern.test(row.source))return row;
      if(row.schema===1&&row.lastGreenNight?.status==='passed'&&commitPattern.test(row.lastGreenNight.source))return row.lastGreenNight;
    }catch{}
  }
  return null;
}
function refreshNightStatus(root) {
  const child=spawnSync(process.execPath,['tools/build-status.mjs'],{cwd:root,encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error('STATUS refresh failed: '+(child.error?.message||child.stderr));
}
function recycleNightDraft(file,root) {
  const relative=file.slice(path(root).length+1);
  if(!/^docs\/board\/(?:STATUS\.md|checks\/night-\d{4}-\d{2}-\d{2}\.(?:json|md))$/.test(relative))
    throw Error('Refusing to recycle an unrelated file.');
  const literal=file.replaceAll("'","''");
  const script="Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('"+
    literal+"',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)";
  const child=spawnSync('powershell.exe',['-NoProfile','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
    {encoding:'utf8',shell:false,windowsHide:true});
  if(child.error||child.status!==0)throw Error('Draft recycle failed: '+(child.error?.message||child.stderr));
}
async function assertNightSource(dependencies,source,allowed=[]) {
  if((await dependencies.git(['branch','--show-current'])).trim()!=='integration/wasteland')
    throw Error('Actual night runs and publication require integration/wasteland.');
  if(source&&(await dependencies.git(['rev-parse','HEAD'])).trim()!==source)throw Error('Starting source commit changed.');
  const status=await dependencies.git(['status','--porcelain']);
  const unexpected=status.split(/\r?\n/).filter(Boolean).filter(line=>!allowed.includes(line.slice(3)));
  if(unexpected.length)throw Error('Source tree is dirty: '+unexpected.join('; '));
}
async function maybeRead(dependencies,file) {
  try{return await dependencies.readText(file);}
  catch(error){if(error.code==='ENOENT'||error.message==='ENOENT')return null;throw error;}
}
async function publishNightReports(packet,morning,dependencies) {
  const {root}=dependencies;
  const names=[`docs/board/checks/night-${packet.date}.json`,`docs/board/checks/night-${packet.date}.md`,'docs/board/STATUS.md'];
  const original=new Map(),drafts=new Map();let staged=false;
  try {
    await assertNightSource(dependencies,null);
    for(const name of names)original.set(path(root,name),await maybeRead(dependencies,path(root,name)));
    await dependencies.mkdir(path(root,'docs/board/checks'));
    // Public bytes describe the tested source. The actual commit receipt is
    // recorded in the ignored final packet, avoiding a self-referential hash.
    packet.publication={status:'prepared',paths:names};
    for(const [name,text]of [[names[0],JSON.stringify(packet,null,2)+'\n'],[names[1],morning]]) {
      const file=path(root,name);drafts.set(file,text);await dependencies.writeText(file,text);
    }
    try{await dependencies.refreshStatus();}
    finally{drafts.set(path(root,names[2]),await maybeRead(dependencies,path(root,names[2])));}
    await assertNightSource(dependencies,null,names);
    await dependencies.git(['add','--',...names]);staged=true;
    await assertNightSource(dependencies,null,names);
    await dependencies.git(['commit','--only','-m',`Record night ${packet.date} checks and refresh status`,'--',...names]);
    packet.publication={status:'committed',paths:names,commit:null};
    // A successful commit is irreversible here. Receipt errors must not send
    // already committed public metadata through draft cleanup.
    try{packet.publication.commit=(await dependencies.git(['rev-parse','HEAD'])).trim();}
    catch(error){packet.publication.receiptError=error.message;}
  }catch(error) {
    const cleanup=[];
    if(staged)try{await dependencies.git(['restore','--staged','--',...names]);}catch(failed){cleanup.push(failed.message);}
    let cleanupHead=null;
    try{cleanupHead=(await dependencies.git(['rev-parse','HEAD'])).trim();}catch{}
    for(const [file,expected]of drafts) {
      try {
        if(await maybeRead(dependencies,file)!==expected)continue; // Preserve somebody else's later edit.
        const name=file.slice(path(root).length+1);
        const state=await dependencies.git(['status','--porcelain','--',name]);
        if(!state.trim())continue; // The current HEAD already owns these bytes.
        let before=original.get(file);
        if(cleanupHead!==packet.source) {
          try{before=await dependencies.git(['show','HEAD:'+name]);}
          catch(error){
            if(state.trim().startsWith('?? '))before=null;
            else {cleanup.push('Could not read current committed '+name+': '+error.message);continue;}
          }
        }
        if(before===null){if(expected!==null)await dependencies.recycleText(file);}
        else if(before!==undefined)await dependencies.writeText(file,before);
      }catch(failed){cleanup.push(failed.message);}
    }
    packet.status='failed';
    packet.publication={status:'refused',reason:error.message,...(cleanup.length?{cleanupErrors:cleanup}:{})};
    packet.failures.push({name:'publication',error:error.message,firstMerge:null,attribution:'Publication context, not a game failure.'});
  }
}
export async function runNight(options,overrides={}) {
  const root=overrides.root||ROOT;
  if(root.replaceAll('\\','/').replace(/\/$/,'').toLowerCase()==='c:/users/kyleb/dev/the-duel-remake')
    throw Error('Refusing the live folder.');
  if(options?.idleAwake!==true||options.noPush!==true)throw Error(usage);
  const dependencies={root,print:message=>console.log(message),now:()=>new Date(),git:(args,cwd=root)=>gitCommand(args,cwd),processes:inspectNightProcesses,
    createCopy:source=>createCheckCopy(root,source),removeCopy:removeCheckCopy,framePollMs:1000,
    scenarioNames:async copyRoot=>(await import(pathToFileURL(path(copyRoot,'tools/run-browser-scenarios.mjs')).href)).namedScenarios(),readText:file=>readFile(file,'utf8'),writeText:writeFile,appendText:appendFile,
    mkdir:dir=>mkdir(dir,{recursive:true}),makeTemp:mkdtemp,
    refreshStatus:()=>refreshNightStatus(root),recycleText:file=>recycleNightDraft(file,root),
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
  packet.lastGreenNight=previous?{schema:1,status:'passed',source:previous.source,date:previous.date}:null;
  let firstMerge=null,attribution='Unknown: no previous green night.';
  if(previous) {
    try {
      firstMerge=(await dependencies.git(['rev-list','--first-parent','--reverse','--merges',previous.source+'..'+source])).trim().split(/\r?\n/)[0]||null;
      attribution=firstMerge?'First merge after the last green night.':'No merge after the last green night.';
    }catch(error){attribution='Unknown: '+error.message;}
  }
  const failure=(name,error)=>packet.failures.push({name,error,firstMerge,attribution});
  const evidenceParent=path(root,'.evidence',options.date,'FAC-03');
  await dependencies.mkdir(evidenceParent);
  packet.evidence=path(await dependencies.makeTemp(path(evidenceParent,'night-')));
  let copy;
  try {
    await assertNightSource(dependencies,null);
    copy=await dependencies.createCopy(source);
    const copyEvidence=path(copy.root,'.evidence',options.date,'FAC-03',packet.evidence.split('/').at(-1));
    const plan=nightPlan({root:copy.root,date:options.date,evidence:copyEvidence});
    const assertCopy=async()=>{
      if((await dependencies.git(['rev-parse','HEAD'],copy.root)).trim()!==source||
        (await dependencies.git(['status','--porcelain'],copy.root)).trim())throw Error('Copied source changed.');
    };
    for(const stage of plan) {
      const log=path(packet.evidence,stage.id+'.log');
      const row={id:stage.id,args:stage.args,log,started:dependencies.now().toISOString(),passed:false};
      packet.stages.push(row);
      try {
        await assertCopy();
        const busy=await dependencies.processes();
        if(stage.id==='frames'?busy.length>0:busy.length>=3)throw Error(stage.id==='frames'?'Competing heavy work: frame timing refused.':'Three heavy jobs already running; stage refused.');
        if(stage.id==='frames')packet.context.processIsolationObserved=true;
        await dependencies.writeText(log,'');
        if(stage.id==='frames') {
          const reminder='Frame check: keep the laptop panel off; use Win+P "Second screen only". No other GPU workload.';
          dependencies.print(reminder);
          await dependencies.appendText(log,reminder+'\n');
        }
        const stageEnv={...stage.env};
        if(stage.id==='browser')stageEnv.DUEL_NIGHT_FRAME_PASSED=packet.stages.find(row=>row.id==='frames')?.passed===true?'1':'0';
        let timer,observations=Promise.resolve(),timingError=null;
        if(stage.id==='frames')timer=setInterval(()=>{
          observations=observations.then(async()=>{
            if((await dependencies.processes()).length)timingError='Competing heavy work appeared during frame timing; packet discarded.';
          }).catch(error=>{timingError='Frame process inspection failed: '+error.message;});
        },dependencies.framePollMs);
        const originalFullReport=stage.id==='full'?await dependencies.readText(path(copy.root,fullReportName)):null;
        let result;
        try {result=await runChild(process.execPath,stage.args,{cwd:copy.root,env:{...process.env,DUEL_NIGHT_FRAMES:'0',DUEL_NIGHT_IDLE_AWAKE:'0',DUEL_NIGHT_FRAME_REUSE:'0',DUEL_NIGHT_FRAME_PACKET:'',DUEL_NIGHT_FRAME_PASSED:'0',...stageEnv},
          logPath:log,spawnImpl:dependencies.spawnImpl||spawn,appendText:dependencies.appendText});
        }finally{clearInterval(timer);await observations;}
        row.exitCode=result.exitCode;
        if(stage.id==='frames'&&(await dependencies.processes()).length)timingError='Competing heavy work remains after frame timing; packet discarded.';
        if(timingError)throw Error(timingError);
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
        let frameError;
        if(stage.id==='frames') {
          row.warnings=[];
          try {
            const frames=json(await dependencies.readText(stage.packet));
            if(frames?.schema===1&&frames.mode==='night-simple'&&frames.reports?.length===2)
              row.reports=frames.reports.flatMap((report,index)=>
                report?.quality===['High','Performance'][index]&&
                Number.isFinite(report.p95)&&report.p95>0&&
                Number.isFinite(report.worldBuildMs)&&report.worldBuildMs>=0&&
                Number.isFinite(report.constructionMs)&&report.constructionMs>=0
                  ?[{quality:report.quality,p95:report.p95,worldBuildMs:report.worldBuildMs,constructionMs:report.constructionMs}]:[]);
            validateFramePacket(frames,{warn:message=>row.warnings.push(message)});
            const timing=json(await dependencies.readText(stage.suitePacket));
            if(timing.timingMode!=='timing-only')throw Error('Frame suite did not run timing-only mode.');
            validateBrowser(timing,['frame-pacing','tremblant-snow','tremblant-views']);
            row.tremblantReports=[];
            for(const recipe of stage.timingPackets) {
              const actual=validateTremblantFramePacket(json(await dependencies.readText(recipe.packet)),recipe.name);
              row.tremblantReports.push(...actual.reports.map(report=>({scenario:recipe.name,...report})));
            }
          }catch(error){frameError=error;row.reportError=error.message;}
        }
        if(stage.id==='full')row.generatedReport=await consumeFullReport(dependencies,copy,source,originalFullReport,result,packet.evidence);
        if(result.exitCode!==0)throw Error(result.stderr.trim()||`Installed tool exited ${result.exitCode}. See ${stage.log}`);
        if(stage.id==='full')validateFull(fullPacket(result.stdout));
        else if(stage.id==='frames') {if(frameError)throw frameError;}
        else if(stage.id==='browser')validateBrowser(json(await dependencies.readText(stage.packet)),await dependencies.scenarioNames(copy.root));
        else validateCombat(json(result.stdout));
        await assertCopy();
        row.passed=true;
      }catch(error){row.error=error.message;for(const name of row.failureNames?.length?row.failureNames:[stage.id])failure(name,error.message);}
      row.finished=dependencies.now().toISOString();
    }
  }catch(error){failure('context',error.message);}
  finally {if(copy)try{await dependencies.removeCopy(copy);}catch(error){failure('copy-cleanup',error.message);}}
  packet.finished=dependencies.now().toISOString();packet.status=packet.failures.length?'failed':'passed';

  const morning=[`Full check ${options.date}: ${packet.status.toUpperCase()} (${source}).`,
    ...packet.stages.map(row=>`${row.passed?'PASS':'FAIL'} ${row.id}: ${row.log}`),
    ...packet.stages.filter(row=>row.id==='frames').flatMap(row=>[
      ...(row.reports||[]).map(report=>`${report.quality}: p95 ${report.p95} ms, world build ${report.worldBuildMs} ms, full first-race load ${report.constructionMs} ms.`),
      ...(row.tremblantReports||[]).map(report=>`${report.scenario} ${report.quality} ${report.label}: p95 ${report.p95} ms, ${report.over33ms} slow frames.`),
      ...(row.warnings||[]).map(message=>'WARNING '+message)]),
    'First merge after last green: '+(firstMerge||attribution),
    'Compaction and push disabled; separate Kyle authorization is pending.',
    `Details: docs/board/checks/night-${options.date}.json`];
  await publishNightReports(packet,morning.join('\n')+'\n',dependencies);
  morning[0]=`Night ${options.date}: ${packet.status.toUpperCase()} (${source}).`;
  await dependencies.writeText(path(packet.evidence,'night-report.json'),JSON.stringify(packet,null,2)+'\n');
  await dependencies.writeText(path(packet.evidence,'morning.md'),morning.join('\n')+'\n'+(packet.publication.status==='refused'?'Publication refused: '+packet.publication.reason+'\n':''));
  return packet;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  runNight(parseNightArguments(process.argv.slice(2))).then(packet=>{
    console.log(`Full check ${packet.date}: ${packet.status}; docs/board/checks/night-${packet.date}.json`);
    process.exitCode=packet.status==='passed'?0:1;
  }).catch(error=>{console.error(error.message);process.exitCode=2;});
}
