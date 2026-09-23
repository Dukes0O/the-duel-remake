import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {join} from 'node:path';
import {CORE_SUITE,LEGACY_SUITE_ORDER,PROJECT_ROOT,CAMPAIGN_SUITE,CAMPAIGN_SHARDS,parseArguments,discoverSuites,selectSuites,selectPlan,localDependencies,suitesForChanges,changedFiles,runSuites,runSuitesConcurrent,main} from './run-tests.mjs';

let checks=0;const same=(actual,expected,label)=>{assert.deepEqual(actual,expected,label);checks++;},check=(value,label)=>{assert.ok(value,label);checks++;};
same(LEGACY_SUITE_ORDER.length,80,'all 80 original package.json commands are retained');
same(LEGACY_SUITE_ORDER[0],CORE_SUITE,'the core suite remains first');
same(new Set(LEGACY_SUITE_ORDER).size,80,'legacy suite order contains no duplicates');
same(createHash('sha256').update(LEGACY_SUITE_ORDER.join('\n')).digest('hex'),'948bc2c6bb4aa171d73d10af114b079e10c87885c93a2799bd08ab3ba010a40b','migration preserves the exact complete legacy order');
check(Object.isFrozen(LEGACY_SUITE_ORDER),'discovery cannot mutate the historical order');

const defaults={list:false,help:false,filters:[],jobs:1,keepGoing:false,tier:null,changed:false,json:false};
same(parseArguments([]),defaults,'default runs all suites');
same(parseArguments(['--list','--filter','Reverse','--filter=HEIGHT']),{...defaults,list:true,filters:['reverse','height']},'listing and repeated case-insensitive filters compose');
same(parseArguments(['--filter','  core  ','-h']),{...defaults,help:true,filters:['core']},'filter whitespace is normalized and short help works');
same(parseArguments(['--tier','full','--jobs=8','--keep-going','--json']),{...defaults,tier:'full',jobs:8,keepGoing:true,json:true},'new full-run options compose');
same(parseArguments(['--tier=lane','--changed','--jobs','2']),{...defaults,tier:'lane',changed:true,jobs:2},'lane change selection and separate jobs argument compose');
for(const args of [['--filter'],['--filter='],['--filter',' '],['--filter','--list'],['--unknown'],['reverse'],['--jobs'],['--jobs=0'],['--jobs=33'],['--jobs=abc'],['--tier'],['--tier=wrong'],['--tier','full','--changed']]){
  assert.throws(()=>parseArguments(args),/requires|Unknown argument|cannot narrow/,'malformed CLI input is rejected');checks++;
}
same(selectSuites(LEGACY_SUITE_ORDER,['reverse']),['tools/test-reverse.mjs','tools/test-reverse-presentation.mjs'],'substring filtering preserves original relative order');
same(selectSuites(LEGACY_SUITE_ORDER,['CORE','reverse']),[CORE_SUITE,'tools/test-reverse.mjs','tools/test-reverse-presentation.mjs'],'core remains first when selected with other suites');
same(selectSuites(LEGACY_SUITE_ORDER,['jump-height','height']),['tools/test-jump-height.mjs','tools/test-jump-height-hud.mjs'],'overlapping filters never duplicate a suite');
same(selectSuites(LEGACY_SUITE_ORDER,['no-such-suite']),[],'unmatched filters produce no accidental fallback to the full suite');
const copy=selectSuites(LEGACY_SUITE_ORDER);check(copy!==LEGACY_SUITE_ORDER,'an unfiltered plan is an independent array');

const entry=(name,file=true)=>({name,isFile:()=>file});
{
  const root=join(PROJECT_ROOT,'runner test project'),reads=[],files=[];
  const plan=discoverSuites({projectRoot:root,hasFile:path=>(files.push(path),true),readDirectory:(path,options)=>{
    reads.push([path,options]);return [entry('test-z-new.mjs'),entry('test-a-new.mjs'),entry('test-reverse.mjs'),entry('test-z-new.mjs'),entry('test-folder.mjs',false),entry('helper.mjs'),entry('test-wrong.js')];
  }});
  same(plan.slice(0,80),LEGACY_SUITE_ORDER,'discovery keeps every old suite in place');same(plan.slice(80),['tools/test-a-new.mjs','tools/test-z-new.mjs'],'only new regular test files are appended once in deterministic alphabetical order');
  same(reads,[[join(root,'tools'),{withFileTypes:true}]],'discovery stays in the project tools directory');
  same(files.length,80,'every original suite is checked for accidental removal');
  same(files[0],join(root,CORE_SUITE),'core file is validated too');
  assert.throws(()=>discoverSuites({hasFile:path=>!path.endsWith('test-audio.mjs'),readDirectory:()=>[]}),/Required test suites are missing: tools\/test-audio.mjs/,'missing historical suites fail instead of silently dropping coverage');checks++;
}

function fakeRun(statuses){
  const calls=[],messages=[],errors=[],env={DUEL_SKIP_CAMPAIGNS:'1',RUNNER_TEST:'kept'},cwd=join(PROJECT_ROOT,'a project with spaces');let tick=0;
  const result=runSuites(['src/test.js','tools/test-one.mjs','tools/test-two.mjs'],{
    cwd,execPath:'node executable with spaces',env,now:()=>{tick+=100;return tick;},log:value=>messages.push(value),error:value=>errors.push(value),
    spawn:(...args)=>{calls.push(args);const next=statuses[calls.length-1];if(next instanceof Error)throw next;return next;},
  });
  return {result,calls,messages,errors,env,cwd};
}
{
  const {result,calls,messages,errors,env,cwd}=fakeRun([{status:0},{status:0},{status:0}]);
  same([result.exitCode,result.passed,result.failed,result.total],[0,3,null,3],'successful suites return a clean aggregate result');
  same(calls.length,3,'each suite gets its own process');
  for(const [index,[executable,args,options]]of calls.entries()){
    same(executable,'node executable with spaces','runner uses the supplied Node executable directly');
    same(args,[join(cwd,['src/test.js','tools/test-one.mjs','tools/test-two.mjs'][index])],'script path is one argv item, even when the directory contains spaces');
    same(options,{cwd,env,stdio:'inherit',shell:false,windowsHide:true},'cross-platform child execution uses no shell and inherits output and environment');
    check(options.env===env,'DUEL_SKIP_CAMPAIGNS and all other environment variables are passed through unchanged');
  }
  same(result.results.map(row=>row.durationMs),[100,100,100],'each suite reports its measured duration');same(result.durationMs,700,'summary reports total elapsed time');
  check(messages.some(message=>message.includes('Passed 3/3 suites in 0.70s.')),'success summary gives counts and duration');same(errors,[],'successful run has no error output');
}
{
  const {result,calls,errors}=fakeRun([{status:0},{status:7},{status:0}]);
  same([result.exitCode,result.passed,result.failed],[7,1,'tools/test-one.mjs'],'nonzero child exit status is preserved');same(calls.length,2,'first failure prevents all later child launches');
  check(errors.some(message=>message.includes('exit 7')),'failure identifies the child exit code');check(errors.some(message=>message.includes('1 passed, 1 failed, 1 not run')),'failure summary identifies unrun coverage');
}
for(const failed of [{status:null,signal:'SIGTERM'},{status:null,error:Error('could not launch')},Error('spawn threw'),{status:null}]){
  const {result,calls,errors}=fakeRun([failed]);same(result.exitCode,1,'signal, missing status or spawn failure cannot be treated as success');same(calls.length,1,'launch failures also fail fast');check(errors.length===2,'failed launch emits its reason and a summary');
}
{
  let launched=false;const result=runSuites([],{spawn:()=>{launched=true;},error:()=>{},now:()=>0});same(result.exitCode,2,'an empty run is a usage failure');check(!launched,'empty selection does not launch Node');
}

async function fakeMain(args){
  const messages=[],errors=[],runs=[];let discoveries=0;
  const code=await main(args,{discover:()=>{discoveries++;return [...LEGACY_SUITE_ORDER];},run:(plan)=>{runs.push(plan);return{exitCode:7,passed:0,failures:['mock'],notRun:0,durationMs:0};},getChanges:()=>[],log:value=>messages.push(value),error:value=>errors.push(value)});
  return {code,messages,errors,runs,discoveries};
}
{
  const result=await fakeMain(['--list','--filter','reverse']);same(result.code,0,'list mode succeeds');same(result.messages,['tools/test-reverse.mjs','tools/test-reverse-presentation.mjs'],'list prints only selected paths in runnable order');same(result.runs,[],'list mode never executes tests');
  const help=await fakeMain(['--help']);same([help.code,help.discoveries,help.runs.length],[0,0,0],'help needs neither filesystem discovery nor child processes');check(help.messages[0].includes('DUEL_SKIP_CAMPAIGNS'),'help documents inherited campaign behavior');
  const empty=await fakeMain(['--filter','missing']);same([empty.code,empty.runs.length],[2,0],'unmatched filter is visibly nonzero without executing the full chain');check(empty.errors[0].includes('No test suites match'),'unmatched filter explains the problem');
  const invalid=await fakeMain(['--oops']);same([invalid.code,invalid.discoveries,invalid.runs.length],[2,0,0],'bad arguments fail before discovery or process creation');
  const run=await fakeMain(['--filter','core']);same(run.code,7,'CLI returns the runner child failure');same(run.runs,[[{suite:CORE_SUITE,label:CORE_SUITE,args:[]}]],'focused core selection only runs core');
}

// Real inventory and CLI checks remain read-only and never recurse into the
// full suite. The new runner test must discover itself without a package edit.
const actual=discoverSuites();same(actual.slice(0,80),LEGACY_SUITE_ORDER,'actual working-tree inventory retains the complete migration order');check(actual.includes('tools/test-test-runner.mjs'),'future-style suite discovery includes this new test automatically');
same(new Set(actual).size,actual.length,'real discovery contains no duplicate suite paths');
const runner=join(PROJECT_ROOT,'tools','run-tests.mjs');
for(const filter of [null,'reverse','core','no-such-runner-suite']){
  const args=[runner,'--list',...(filter?['--filter',filter]:[])];
  const result=spawnSync(process.execPath,args,{cwd:PROJECT_ROOT,encoding:'utf8',shell:false,windowsHide:true});
  const selected=selectPlan(actual,{filters:filter?[filter]:[]}).map(task=>task.label);
  same(result.status,selected.length?0:2,'actual CLI list exit code matches its selection');
  if(selected.length){same(result.stdout.trim().split(/\r?\n/),selected,'actual CLI --list matches the discovered plan');same(result.stderr,'','successful list has no error noise');}
  else check(result.stderr.includes('No test suites match'),'actual unmatched CLI filter reports its failure');
}

// New runner choices keep the complete inventory but set clear gate boundaries.
{
  const merge=selectPlan(actual,{tier:'merge'});
  check(!merge.some(task=>task.suite===CAMPAIGN_SUITE),'merge tier skips only the long campaign matrix');
  same(new Set(merge.map(task=>task.suite)).size,actual.length-1,'merge tier retains every other suite once');
  const full=selectPlan(actual,{tier:'full'});
  same(full.filter(task=>task.suite===CAMPAIGN_SUITE).length,CAMPAIGN_SHARDS,'full tier assigns all campaign shards');
  same(full.length,actual.length-1+CAMPAIGN_SHARDS,'full tier preserves every suite and expands only campaigns');
  const lane=selectPlan(actual,{tier:'lane',affected:['tools/test-speed-format.mjs']});
  check(lane.some(task=>task.suite===CORE_SUITE)&&lane.some(task=>task.suite==='tools/test-speed-format.mjs'),'lane tier includes smoke and affected tests');
  check(!lane.some(task=>task.suite===CAMPAIGN_SUITE),'unchanged campaigns do not slow a lane gate');
  same(selectPlan(actual,{tier:'full',filters:['campaigns']}).map(task=>task.args[0]),
    Array.from({length:CAMPAIGN_SHARDS},(_,index)=>'--shard='+(index+1)+'/'+CAMPAIGN_SHARDS),
    'campaign shard arguments are complete and deterministic');
}
{
  const dependencies=localDependencies('tools/test-course-eligibility.mjs');
  check(dependencies.has('src/main.js'),'source-text UI test still maps to the production module it reads');
  check(suitesForChanges(actual,['src/main.js']).includes('tools/test-course-eligibility.mjs'),
    'changed selection follows local source references');
  check(suitesForChanges(actual,['tools/test-test-runner.mjs']).includes('tools/test-test-runner.mjs'),
    'changed test files select themselves');
  same(suitesForChanges(actual,['docs/OPERATIONS.md']),[],'documentation edits do not claim unrelated import coverage');
  same(suitesForChanges(actual,['package.json']),actual,'dependency metadata changes conservatively select every suite');
  const calls=[];
  const git=(executable,args)=>{
    calls.push([executable,...args]);
    if(args[0]==='merge-base')return {status:0,stdout:'base123\n'};
    if(args[0]==='diff')return {status:0,stdout:'src/game.js\0tools/test-test-runner.mjs\0'};
    return {status:0,stdout:'tools/test-new.mjs\0src/game.js\0'};
  };
  same(changedFiles({git}),['src/game.js','tools/test-test-runner.mjs','tools/test-new.mjs'],
    'changed mode includes branch, working-tree and untracked paths without duplicates');
  check(calls[1].includes('base123'),'changed mode compares with integration merge base');
}
{
  const tasks=['one','two','three'].map(name=>({suite:'tools/test-'+name+'.mjs',label:name,args:[]}));
  let active=0,peak=0,launched=0;
  const child=(executable,args,options)=>{
    check(options.shell===false&&options.stdio[1]==='pipe','parallel children use shell-free captured output');
    const index=launched++,handle=new EventEmitter();
    handle.stdout=new EventEmitter();handle.stderr=new EventEmitter();
    active++;peak=Math.max(active,peak);
    queueMicrotask(()=>{
      handle.stdout.emit('data',Buffer.from('output '+index+'\n'));
      active--;handle.emit('close',index===0?3:0,null);
    });
    return handle;
  };
  const first=await runSuitesConcurrent(tasks,{jobs:2,spawnChild:child,now:()=>0});
  same([launched,peak,first.exitCode,first.notRun],[2,2,3,1],
    'parallel fail-fast stops scheduling after a failure while in-flight work finishes');
  same(first.results[0].stdout,'output 0\n','parallel execution captures child output for JSON and review');
  active=0;peak=0;launched=0;
  const all=await runSuitesConcurrent(tasks,{jobs:2,keepGoing:true,spawnChild:child,now:()=>0});
  same([launched,peak,all.failures,all.notRun],[3,2,['one'],0],
    'keep-going runs every suite and retains a failure summary');
}
{
  const listed=spawnSync(process.execPath,[runner,'--tier','merge','--list','--json'],
    {cwd:PROJECT_ROOT,encoding:'utf8',shell:false,windowsHide:true});
  same(listed.status,0,'JSON plan CLI succeeds');
  const plan=JSON.parse(listed.stdout);
  check(plan.kind==='plan'&&plan.suites.length===actual.length-1&&!plan.suites.some(name=>name.includes('campaigns')),
    'JSON plan lists the merge suite set without human log text');
  const focused=spawnSync(process.execPath,[runner,'--filter','speed-format','--json'],
    {cwd:PROJECT_ROOT,encoding:'utf8',shell:false,windowsHide:true});
  same(focused.status,0,'JSON focused execution succeeds');
  const result=JSON.parse(focused.stdout);
  check(result.kind==='result'&&result.results.length===1&&result.results[0].stdout.includes('Metric speed presentation'),
    'JSON execution keeps captured test evidence in one parseable object');
}console.log(`Test runner: ${checks} order, discovery, filtering, safe process, environment, fail-fast, duration and read-only CLI checks passed (${actual.length} suites discovered).`);
