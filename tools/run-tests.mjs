import {readdirSync,statSync,readFileSync} from 'node:fs';
import {spawnSync,spawn} from 'node:child_process';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sourceState,writeFullTierEvidence} from './build-status.mjs';

export const PROJECT_ROOT=resolve(fileURLToPath(new URL('../',import.meta.url)));
export const CORE_SUITE='src/test.js';
// Preserve the established order during migration from package.json. New
// tools/test-*.mjs files are discovered automatically and appended alphabetically;
// adding a suite does not require editing this historical list or package.json.
export const LEGACY_SUITE_ORDER=Object.freeze([
  CORE_SUITE,
  'tools/test-progression.mjs',
  'tools/test-progression-integration.mjs',
  'tools/test-terrain.mjs',
  'tools/test-circuits.mjs',
  'tools/test-shortcuts.mjs',
  'tools/test-effects.mjs',
  'tools/test-audio.mjs',
  'tools/test-route-map.mjs',
  'tools/test-arena-props.mjs',
  'tools/test-rally-detail.mjs',
  'tools/test-mountain-landscape.mjs',
  'tools/test-ghost.mjs',
  'tools/test-ghost-vehicle.mjs',
  'tools/test-camera-clearance.mjs',
  'tools/test-road-furniture.mjs',
  'tools/test-prepared-surface.mjs',
  'tools/test-terrain-style.mjs',
  'tools/test-stunt-trial.mjs',
  'tools/test-milestones.mjs',
  'tools/test-paint-presets.mjs',
  'tools/test-paint-integration.mjs',
  'tools/test-vehicle-paint.mjs',
  'tools/test-tunnel-detail.mjs',
  'tools/test-npc-route.mjs',
  'tools/test-police-route-reset.mjs',
  'tools/test-route-variants.mjs',
  'tools/test-route-variants-integration.mjs',
  'tools/test-race-integrity.mjs',
  'tools/test-desert-detail.mjs',
  'tools/test-course-preview.mjs',
  'tools/test-city-interiors.mjs',
  'tools/test-vegetation-cells.mjs',
  'tools/test-drift-scoring.mjs',
  'tools/test-harbor-batches.mjs',
  'tools/test-drift-trial.mjs',
  'tools/test-drift-integration.mjs',
  'tools/test-city-road-paint.mjs',
  'tools/test-road-surface.mjs',
  'tools/test-drift-leaderboard.mjs',
  'tools/test-render-reuse.mjs',
  'tools/test-landscape-cells.mjs',
  'tools/test-city-skyline.mjs',
  'tools/test-turn-sign-cells.mjs',
  'tools/test-checkpoint-rush.mjs',
  'tools/test-checkpoint-integration.mjs',
  'tools/test-checkpoint-gates.mjs',
  'tools/test-app-lifecycle.mjs',
  'tools/test-chicken-pool.mjs',
  'tools/test-polyline-index.mjs',
  'tools/test-course-nearest.mjs',
  'tools/test-shortcut-presets.mjs',
  'tools/test-polyline-terrain-integration.mjs',
  'tools/test-city-pavement.mjs',
  'tools/test-city-decoration-placement.mjs',
  'tools/test-city-parking.mjs',
  'tools/test-city-parking-gameplay.mjs',
  'tools/test-lighting-moods.mjs',
  'tools/test-lighting-integration.mjs',
  'tools/test-render-warmup.mjs',
  'tools/test-render-readiness.mjs',
  'tools/test-meadow-material.mjs',
  'tools/test-completion-screen.mjs',
  'tools/test-pine-material.mjs',
  'tools/test-vehicle-grounding.mjs',
  'tools/test-driving-rewards.mjs',
  'tools/test-vehicle-assets.mjs',
  'tools/test-classic-vehicles.mjs',
  'tools/test-layout-archives.mjs',
  'tools/test-police-fines.mjs',
  'tools/test-busted-quit.mjs',
  'tools/test-race-settings.mjs',
  'tools/test-heritage-driving.mjs',
  'tools/test-reverse.mjs',
  'tools/test-reverse-presentation.mjs',
  'tools/test-contact-damage.mjs',
  'tools/test-npc-vehicle-damage.mjs',
  'tools/test-cactus-fall.mjs',
  'tools/test-jump-height.mjs',
  'tools/test-jump-height-hud.mjs',
]);

const HELP=[
  'Usage: node tools/run-tests.mjs [--list] [--filter NAME] [--jobs N] [--keep-going] [--tier lane|merge|full] [--changed] [--json]',
  '',
  'Each suite runs in its own Node process. Full tier splits the long campaign matrix into eight shards.',
  '  --list          Show the selected suites without running them.',
  '  --filter NAME   Match a path substring, ignoring case. Repeat for OR matches.',
  '                  Use "core" to select src/test.js.',
  '  --jobs N        Run up to N suites at once (1-32; default 1).',
  '  --keep-going    Run every selected suite after failures.',
  '  --tier NAME     lane: changed imports and smoke; merge: all short suites; full: all suites.',
  '  --changed       Select suites affected by Git changes and the smoke set.',
  '  --json          Emit one machine-readable result object, including captured suite output.',
  '  --help, -h      Show this help.',
  '',
  'The lane tier implies --changed. --changed cannot narrow merge or full gates.',
  'DUEL_SKIP_CAMPAIGNS still skips the direct campaign script for older workflows.'
].join('\n');

export function parseArguments(args){
  const options={list:false,help:false,filters:[],jobs:1,keepGoing:false,tier:null,changed:false,json:false};
  for(let index=0;index<args.length;index++){
    const argument=args[index];
    if(argument==='--list')options.list=true;
    else if(argument==='--help'||argument==='-h')options.help=true;
    else if(argument==='--keep-going')options.keepGoing=true;
    else if(argument==='--changed')options.changed=true;
    else if(argument==='--json')options.json=true;
    else if(argument==='--filter'||argument.startsWith('--filter=')){
      const value=argument==='--filter'?args[++index]:argument.slice('--filter='.length);
      if(typeof value!=='string'||!value.trim()||value.startsWith('-'))throw Error('--filter requires a nonempty suite name.');
      options.filters.push(value.trim().toLowerCase());
    }else if(argument==='--jobs'||argument.startsWith('--jobs=')){
      const value=argument==='--jobs'?args[++index]:argument.slice('--jobs='.length);
      if(!/^\d+$/.test(value||''))throw Error('--jobs requires a whole number from 1 to 32.');
      options.jobs=Number(value);
      if(options.jobs<1||options.jobs>32)throw Error('--jobs requires a whole number from 1 to 32.');
    }else if(argument==='--tier'||argument.startsWith('--tier=')){
      const value=argument==='--tier'?args[++index]:argument.slice('--tier='.length);
      if(!['lane','merge','full'].includes(value))throw Error('--tier requires lane, merge or full.');
      options.tier=value;
    }else throw Error('Unknown argument: '+argument+'. Use --help for options.');
  }
  if(options.changed&&['merge','full'].includes(options.tier))throw Error('--changed cannot narrow a merge or full tier.');
  return options;
}
const isFile=path=>{try{return statSync(path).isFile();}catch{return false;}};
export function discoverSuites({projectRoot=PROJECT_ROOT,readDirectory=readdirSync,hasFile=isFile}={}){
  const missing=LEGACY_SUITE_ORDER.filter(suite=>!hasFile(join(projectRoot,suite)));
  if(missing.length)throw Error(`Required test suites are missing: ${missing.join(', ')}`);
  const known=new Set(LEGACY_SUITE_ORDER);
  const extras=readDirectory(join(projectRoot,'tools'),{withFileTypes:true})
    .filter(entry=>entry.isFile()&&/^test-.+\.mjs$/.test(entry.name))
    .map(entry=>`tools/${entry.name}`).filter(suite=>!known.has(suite)).sort();
  return [...LEGACY_SUITE_ORDER,...new Set(extras)];
}

export function selectSuites(suites,filters=[]){
  if(!filters.length)return [...suites];
  const names=filters.map(name=>name.toLowerCase());
  return suites.filter(suite=>names.some(name=>name==='core'?suite===CORE_SUITE:suite.toLowerCase().includes(name)));
}

const seconds=milliseconds=>`${(milliseconds/1000).toFixed(2)}s`;
export function runSuites(suites,{cwd=PROJECT_ROOT,spawn=spawnSync,execPath=process.execPath,env=process.env,
  log=console.log,error=console.error,now=()=>performance.now()}={}){
  const started=now(),results=[];let exitCode=0,failed=null;
  if(!suites.length){error('No test suites selected.');return {exitCode:2,passed:0,failed:null,total:0,durationMs:0,results};}
  for(const [index,suite]of suites.entries()){
    log(`\n[${index+1}/${suites.length}] ${suite}`);
    const suiteStarted=now();let child;
    try{child=spawn(execPath,[join(cwd,suite)],{cwd,env,stdio:'inherit',shell:false,windowsHide:true});}
    catch(cause){child={error:cause,status:null};}
    const durationMs=Math.max(0,now()-suiteStarted),passed=child.status===0&&!child.error&&!child.signal;
    const code=passed?0:Number.isInteger(child.status)&&child.status>0?child.status:1;
    results.push({suite,passed,exitCode:code,durationMs,signal:child.signal||null});
    if(passed)log(`PASS ${suite} (${seconds(durationMs)})`);
    else{
      exitCode=code;failed=suite;
      const reason=child.error?.message||(child.signal?`signal ${child.signal}`:`exit ${code}`);
      error(`FAIL ${suite} (${seconds(durationMs)}; ${reason})`);break;
    }
  }
  const durationMs=Math.max(0,now()-started),passed=results.filter(result=>result.passed).length;
  if(failed)error(`Stopped after ${seconds(durationMs)}: ${passed} passed, 1 failed, ${suites.length-results.length} not run.`);
  else log(`\nPassed ${passed}/${suites.length} suites in ${seconds(durationMs)}.`);
  return {exitCode,passed,failed,total:suites.length,durationMs,results};
}

export const CAMPAIGN_SUITE='tools/test-campaigns.mjs';
export const CAMPAIGN_SHARDS=8;
export const SMOKE_SUITES=Object.freeze([
  CORE_SUITE,
  'tools/test-repo-hygiene.mjs',
  'tools/test-test-runner.mjs',
  'tools/test-app-lifecycle.mjs',
  'tools/test-progression.mjs',
  'tools/test-race-integrity.mjs'
]);

const normalized=path=>path.replaceAll('\\','/').replace(/^\.\//,'');
const relativeName=(root,path)=>normalized(relative(root,path));

export function changedFiles({cwd=PROJECT_ROOT,git=spawnSync}={}){
  const execute=args=>{
    const result=git('git',args,{cwd,encoding:'utf8',shell:false,windowsHide:true});
    if(result.error||result.status!==0)throw Error('Git change lookup failed: '+(result.error?.message||result.stderr?.trim()||result.status));
    return result.stdout.split('\0').filter(Boolean).map(normalized);
  };
  const merge=git('git',['merge-base','HEAD','integration/wasteland'],{cwd,encoding:'utf8',shell:false,windowsHide:true});
  if(merge.error||merge.status!==0||!merge.stdout?.trim())
    throw Error('Git change lookup failed: cannot find merge base with integration/wasteland: '+
      (merge.error?.message||merge.stderr?.trim()||merge.status));
  const base=merge.stdout.trim();
  return [...new Set([
    ...execute(['diff','--name-only','-z',base,'--']),
    ...execute(['ls-files','--others','--exclude-standard','-z'])
  ])];
}

const IMPORT_PATTERNS=[
  /\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bnew\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g
];
export function localDependencies(entry,{projectRoot=PROJECT_ROOT,readSource=readFileSync,hasFile=isFile}={}){
  const found=new Set(),visit=file=>{
    const name=relativeName(projectRoot,file);
    if(found.has(name)||!hasFile(file))return;
    found.add(name);
    if(!/\.(?:m?js|json)$/.test(file))return;
    let source;
    try{source=readSource(file,'utf8');}catch{return;}
    for(const pattern of IMPORT_PATTERNS){
      pattern.lastIndex=0;
      for(const match of source.matchAll(pattern)){
        const specifier=match[1];
        if(!specifier.startsWith('.'))continue;
        const base=resolve(dirname(file),specifier);
        const candidates=[base,base+'.js',base+'.mjs',join(base,'index.js')];
        const target=candidates.find(hasFile);
        if(target)visit(target);
      }
    }
  };
  visit(resolve(projectRoot,entry));
  return found;
}
export function suitesForChanges(suites,paths,options={}){
  const changed=new Set(paths.map(normalized));
  if(!changed.size)return [];
  if([...changed].some(path=>path==='package.json'||path==='package-lock.json'||path==='vite.config.js'||path.startsWith('public/')||path.endsWith('.css')))
    return [...suites];
  const mapped=new Set();
  const affected=suites.filter(suite=>{
    mapped.add(suite);
    const dependencies=localDependencies(suite,options);
    for(const path of dependencies)mapped.add(path);
    if(changed.has(suite))return true;
    return [...dependencies].some(path=>changed.has(path));
  });
  // A source-text or computed-path test may read a file without importing it.
  // Fall back per changed path, even if another changed file already found suites.
  if([...changed].some(path=>(path.startsWith('src/')||path.startsWith('tools/'))&&!mapped.has(path)))
    return [...suites];
  return affected;
}

export function selectPlan(suites,{tier=null,filters=[],changed=false,affected=[]}={}){
  let selected;
  if(tier==='lane'||changed){
    const selectedNames=new Set([...SMOKE_SUITES,...affected]);
    selected=suites.filter(suite=>selectedNames.has(suite));
  }else selected=[...suites];
  if(tier==='merge')selected=selected.filter(suite=>suite!==CAMPAIGN_SUITE);
  if(filters.length)selected=selectSuites(selected,filters);
  return selected.flatMap(suite=>suite===CAMPAIGN_SUITE
    ?Array.from({length:CAMPAIGN_SHARDS},(_,index)=>({
      suite,label:suite+' ['+(index+1)+'/'+CAMPAIGN_SHARDS+']',args:['--shard='+(index+1)+'/'+CAMPAIGN_SHARDS]
    }))
    :[{suite,label:suite,args:[]}]);
}

const captureSuite=(task,{cwd,execPath,env,spawnChild,now})=>new Promise(resolveResult=>{
  const started=now();let child,stdout='',stderr='',settled=false;
  const finish=(status,signal,cause)=>{
    if(settled)return;
    settled=true;
    const passed=status===0&&!signal&&!cause;
    const exitCode=passed?0:Number.isInteger(status)&&status>0?status:1;
    resolveResult({suite:task.suite,label:task.label,args:task.args,passed,exitCode,
      signal:signal||null,error:cause?.message||null,durationMs:Math.max(0,now()-started),stdout,stderr});
  };
  try{child=spawnChild(execPath,[join(cwd,task.suite),...task.args],{
    cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:true
  });}catch(cause){finish(null,null,cause);return;}
  child.stdout?.on('data',data=>{stdout+=data.toString();});
  child.stderr?.on('data',data=>{stderr+=data.toString();});
  child.once('error',cause=>finish(null,null,cause));
  child.once('close',(status,signal)=>finish(status,signal,null));
});

export async function runSuitesConcurrent(tasks,{cwd=PROJECT_ROOT,execPath=process.execPath,env=process.env,
  spawnChild=spawn,now=()=>performance.now(),jobs=1,keepGoing=false,onStart=()=>{},onResult=()=>{}}={}){
  const started=now(),results=new Array(tasks.length);
  if(!tasks.length)return {exitCode:2,passed:0,failed:null,failures:[],total:0,notRun:0,durationMs:0,results:[]};
  let next=0,active=0,stopped=false,finished=false;
  await new Promise(resolveDone=>{
    const finish=()=>{
      if(finished)return;
      finished=true;resolveDone();
    };
    const pump=()=>{
      while(active<jobs&&next<tasks.length&&!stopped){
        const index=next++,task=tasks[index];active++;onStart(task,index,tasks.length);
        captureSuite(task,{cwd,execPath,env,spawnChild,now}).then(result=>{
          results[index]=result;active--;onResult(result,index,tasks.length);
          if(!result.passed&&!keepGoing)stopped=true;
          if(active===0&&(stopped||next===tasks.length))finish();
          else pump();
        });
      }
      if(active===0&&(stopped||next===tasks.length))finish();
    };
    pump();
  });
  const completed=results.filter(Boolean),failures=completed.filter(result=>!result.passed);
  return {exitCode:failures[0]?.exitCode||0,passed:completed.length-failures.length,
    failed:failures[0]?.label||null,failures:failures.map(result=>result.label),total:tasks.length,
    notRun:tasks.length-completed.length,durationMs:Math.max(0,now()-started),results:completed};
}

export async function main(args=process.argv.slice(2),{discover=discoverSuites,run=runSuitesConcurrent,
  getChanges=changedFiles,affected=suitesForChanges,log=console.log,error=console.error,
  projectRoot,now=()=>new Date()}={}){
  let options;
  try{
    options=parseArguments(args);
    if(options.help){log(HELP);return 0;}
    const root=projectRoot??PROJECT_ROOT;
    const suites=discover({projectRoot:root});
    const paths=options.tier==='lane'||options.changed?getChanges({cwd:root}):[];
    const impacted=paths.length?affected(suites,paths,{projectRoot:root}):[];
    const plan=selectPlan(suites,{...options,affected:impacted});
    if(!plan.length)throw Error('No test suites match: '+(options.filters.join(', ')||'(none)'));
    if(options.list){
      if(options.json)log(JSON.stringify({schema:1,kind:'plan',tier:options.tier||'default',
        changedFiles:paths,suites:plan.map(task=>task.label)}));
      else plan.forEach(task=>log(task.label));
      return 0;
    }
    // Injected unit-test runners cannot write real project evidence. A fixture
    // must explicitly supply its own root before recording is enabled.
    const record=options.tier==='full'&&!options.filters.length&&
      (projectRoot!==undefined||(discover===discoverSuites&&run===runSuitesConcurrent));
    const start=record?sourceState(root):null;
    if(record)writeFullTierEvidence(root,start,{plan,now});
    const env=options.tier==='full'?{...process.env,DUEL_SKIP_CAMPAIGNS:''}:process.env;
    const result=await run(plan,{cwd:root,jobs:options.jobs,keepGoing:options.keepGoing,env,
      onStart:options.json?()=>{}:(task,index,total)=>log('\n['+(index+1)+'/'+total+'] '+task.label),
      onResult:options.json?()=>{}:(row)=>{
        if(row.stdout.trim())log(row.stdout.trimEnd());
        if(row.stderr.trim())error(row.stderr.trimEnd());
        const line=(row.passed?'PASS ':'FAIL ')+row.label+' ('+seconds(row.durationMs)+')';
        if(row.passed)log(line);else error(line+(row.error?' '+row.error:''));
      }});
    if(record)writeFullTierEvidence(root,start,{result,plan,now});
    if(options.json)log(JSON.stringify({schema:1,kind:'result',tier:options.tier||'default',
      jobs:options.jobs,keepGoing:options.keepGoing,changedFiles:paths,...result}));
    else{
      const summary='Tests: '+result.passed+' passed, '+result.failures.length+' failed, '+
        result.notRun+' not run in '+seconds(result.durationMs)+'.';
      if(result.exitCode)error(summary);else log(summary);
    }
    return result.exitCode;
  }catch(cause){
    if(options?.json||args.includes('--json'))log(JSON.stringify({schema:1,kind:'error',message:cause.message}));
    else error('Test runner: '+cause.message);
    return 2;
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
  process.exitCode=await main();
