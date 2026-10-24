import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {EventEmitter} from 'node:events';
import {join,relative,sep} from 'node:path';
import {CORE_SUITE,LEGACY_SUITE_ORDER,PROJECT_ROOT,CAMPAIGN_SUITE,CAMPAIGN_SHARDS,LANE_GUARDS,SHARED_FILES,parseArguments,discoverSuites,selectSuites,selectPlan,localDependencies,suitesForChanges,changedFiles,runSuites,runSuitesConcurrent,main} from './run-tests.mjs';

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

// FAC-03: only proven native heavyweight suites leave daytime lane dispatch.
{
  const heavy=['tools/test-audio-crash-peak.mjs','tools/test-convoy-tanker-art.mjs',
    'tools/test-first-person-contact.mjs','tools/test-first-person-cloth.mjs','tools/test-first-person-polish.mjs',
    'tools/test-rustwall-p2-relief.mjs','tools/test-rook-p2-candidate.mjs',
    'tools/test-rustwall-p2.mjs','tools/test-rustwall-atlas-isolation.mjs',
    // QA-TEST-AUDIT: slow suites with no real catch in 30 days.
    'tools/test-campaigns.mjs','tools/test-expansion-driving.mjs','tools/test-opponents.mjs',
    'tools/test-crossbow-aim.mjs','tools/test-circuit-layouts.mjs','tools/test-course-eligibility.mjs',
    'tools/test-ufo-landing.mjs','tools/test-terrain.mjs','tools/test-grand-prix-existing.mjs'];
  check(heavy.every(suite=>actual.includes(suite)),'every explicitly deferred heavy suite actually exists');
  const lane=selectPlan(actual,{tier:'lane',affected:actual});
  check(heavy.every(suite=>!lane.some(task=>task.suite===suite)),
    'a fully affected daytime lane defers only the proven browser and Blender suites');
  const day=selectPlan(actual,{changed:true,affected:actual});
  same(day,lane,'legacy changed-only dispatch follows the same daytime policy');
  for(const pure of ['tools/test-browser-harness.mjs','tools/test-combat-balance.mjs'])
    check(lane.some(task=>task.suite===pure),'bounded pure '+pure+' remains in the lane');
  check(LANE_GUARDS.every(suite=>lane.some(task=>task.suite===suite)),
    'night deferral cannot remove replay or world-signature guards');
  same(selectPlan(actual,{tier:'full'}),selectPlan(actual),
    'full/default plans remain byte-for-byte equal after daytime deferral');
  check(heavy.every(suite=>selectPlan(actual,{tier:'full'}).some(task=>task.suite===suite)),
    'the night full tier still runs every heavy suite');
  same(new Set(lane.map(task=>task.suite)).size,actual.length-heavy.length,
    'fully affected lane loses exactly the listed full-tier-only suites');
}
// Titan delegates only a duplicate child that this final plan really owns.
{
  const titan='tools/test-titan-climb.mjs',replay='tools/test-replays.mjs',other='tools/test-speed-format.mjs';
  const task=(suite,args=[])=>({suite,label:suite,args});
  const expected=[task(titan,['--replays-in-plan']),task(replay),task(other)];
  for(const options of [{},{tier:'full'},{tier:'merge'},{tier:'lane',affected:[titan,other]},
    {changed:true,affected:[titan,other]}])
    same(selectPlan([titan,replay,other],options),expected,
      'only Titan delegates when the same final default/full/merge/lane plan runs the real replay guard');
  same(selectPlan([titan]),[task(titan)],'standalone Titan keeps its original nested replay');
  same(selectPlan([titan,replay,other],{filters:['titan-climb']}),[task(titan)],
    'filtering replay out restores the full standalone Titan contract');
  same(selectPlan([titan,replay,other],{tier:'lane',affected:[titan,other],filters:['titan-climb','speed-format']}),
    [task(titan),task(other)],'the delegation decision happens after lane and final filters');
  same(selectPlan([titan,replay],{filters:['replays']}),[task(replay)],
    'a replay-only filter runs the exact replay task without Titan or extra arguments');
  same(selectPlan([titan,replay],{filters:['titan','replays','titan','replay']}),expected.slice(0,2),
    'overlapping filters preserve one replay and one Titan argument');
  same(selectPlan(['tools/test-titan-climb-copy.mjs',replay]),
    [task('tools/test-titan-climb-copy.mjs'),task(replay)],'only the exact Titan suite receives delegation');
  same(selectPlan([titan,'tools/test-combat-replays.mjs']),
    [task(titan),task('tools/test-combat-replays.mjs')],'a different replay guard cannot replace the ordinary replay suite');
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
  check(LANE_GUARDS.every(guard=>lane.some(task=>task.suite===guard)),'every lane runs the replay and world-signature guards');
  check(!lane.some(task=>task.suite===CAMPAIGN_SUITE),'unchanged campaigns do not slow a lane gate');
  same(selectPlan(actual,{tier:'full',filters:['campaigns']}).map(task=>task.args[0]),
    Array.from({length:CAMPAIGN_SHARDS},(_,index)=>'--shard='+(index+1)+'/'+CAMPAIGN_SHARDS),
    'campaign shard arguments are complete and deterministic');
}
{
  const dependencies=localDependencies('tools/test-course-eligibility.mjs');
  check(dependencies.has('src/screen-menu.js'),'UI test maps to the production menu module it imports');
  check(suitesForChanges(actual,['src/screen-menu.js']).includes('tools/test-course-eligibility.mjs'),
    'changed selection follows local source references');
  check(suitesForChanges(actual,['tools/test-test-runner.mjs']).includes('tools/test-test-runner.mjs'),
    'changed test files select themselves');
  // FACTORY rule 11: an unmapped game file is named for the night run instead of selecting everything.
  const computedRead=suitesForChanges(actual,['tools/unmapped-source-reader.js','src/screen-menu.js']);
  check(computedRead.length<actual.length&&computedRead.includes('tools/test-course-eligibility.mjs'),
    'an unmapped source no longer widens a lane, and importers of the mapped source still run');
  // QA-TEST-AUDIT: shared files and hubs do not pull in every suite that builds a game.
  const shared=suitesForChanges(actual,['src/game.js']);
  check(shared.length<40&&!shared.includes('tools/test-race-field.mjs')&&!shared.unmapped.includes('src/game.js'),
    'a shared file selects only its owners and text readers; the smoke set and guards drive it');
  const sharedPlan=selectPlan(actual,{tier:'lane',affected:shared});
  check(LANE_GUARDS.every(guard=>sharedPlan.some(task=>task.suite===guard))&&sharedPlan.some(task=>task.suite===CORE_SUITE),
    'a shared-file lane still runs the replay guards and the core suite');
  check(Object.entries(SHARED_FILES).every(([path,owners])=>owners.every(owner=>suitesForChanges(actual,[path]).includes(owner))),
    'a shared file selects the suites that own it');
  const lesson=suitesForChanges(actual,['src/lessons/drive-lessons.js']);
  check(lesson.includes('tools/test-drive-lessons.mjs')&&lesson.length<40,
    'a feature module selects its own suites, not every suite that reaches it through game.js');
  check(localDependencies('tools/test-qa-storage.mjs').has('tools/menu-check.js'),
    'the finite existing computed bootstrap reader is an explicit dependency');
  const pine=suitesForChanges(actual,['public/assets/textures/pine-bough.png']);
  check(pine.includes('tools/test-pine-material.mjs')&&pine.includes('tools/test-vegetation-cells.mjs'),
    'known pine bytes include their real direct and transitive rendering consumers');
  check(pine.length<actual.length&&!pine.includes(CAMPAIGN_SUITE)&&!pine.includes('tools/test-polyline-index.mjs'),
    'known texture changes do not select unrelated campaigns or pure spatial indexing solely for being public');
  const css=suitesForChanges(actual,['src/style.css']);
  check(css.includes('tools/test-driver-ui.mjs')&&css.includes('tools/test-build-update.mjs')&&
    css.includes('tools/test-course-access.mjs')&&css.includes('tools/test-jump-height-hud.mjs'),
    'known screen CSS retains every direct source-text CSS check');
  check(css.length<actual.length&&!css.includes(CAMPAIGN_SUITE),
    'known presentation CSS no longer triggers the blanket full fallback');
  const kits=suitesForChanges(actual,['public/assets/models/circuits/kits/pit-garage.glb']);
  check(['tools/test-p4-kits.mjs','tools/test-track-kits.mjs','tools/test-blender-output.mjs'].every(suite=>kits.includes(suite)),
    'computed runtime and manifest/directory kit readers remain in the affected set');
  check(kits.length<actual.length&&!kits.includes(CAMPAIGN_SUITE),
    'known kit GLB changes exclude unrelated campaigns');
  const manifest=suitesForChanges(actual,['public/assets/models/circuits/kits/manifest.json']);
  check(['tools/test-p4-kits.mjs','tools/test-circuit-harbour.mjs','tools/test-circuit-tremblant.mjs'].every(suite=>manifest.includes(suite)),
    'manifest changes retain all existing direct and computed manifest readers');
  same(suitesForChanges(actual,['src/style.css','public/assets/textures/pine-bough.png']),
    actual.filter(suite=>new Set([...css,...pine]).has(suite)),
    'mixed known changes select the ordered union without losing a consumer');
  for(const unknown of ['public/assets/textures/unmapped.png','src/new-presentation.css','public/assets/models/circuits/kits/unmapped.png']){
    const mixed=suitesForChanges(actual,['public/assets/textures/pine-bough.png',unknown]);
    check(mixed.length<actual.length&&pine.every(suite=>mixed.includes(suite)),
      'an unnamed asset or CSS path keeps the known consumers and does not select every suite: '+unknown);
  }
  const launcher=suitesForChanges(actual,['start-game.bat']);
  check(launcher.length>0||launcher.unmapped.includes('start-game.bat'),'a root file is selected by its readers or reported by name');
  const chain=suitesForChanges(actual,['tools/menu-check.html']);
  check(chain.includes('tools/test-audio-crash-peak.mjs'),'a path in the middle of a + chain is still read');
  check(suitesForChanges(actual,['public/assets/models/circuits/kits/nested/unknown.glb']).includes('tools/test-blender-output.mjs'),
    'a new file under a read directory selects the readers of that directory');
  for(const config of ['tools/run-tests.mjs','package-lock.json','pnpm-lock.yaml','vite.config.js','tools/vite-qa.config.js'])
    same(suitesForChanges(actual,[config]),actual,'runner/dependency/build config edits retain full selection: '+config);
  check(suitesForChanges(actual,['src/config.js']).length<actual.length,
    'src/config.js is game data and follows its importers, not the build-config rule');
  const audio=suitesForChanges(actual,['public/assets/audio/arsenal-wave1/new.ogg']);
  check(audio.includes('tools/test-arsenal-wave1-audio.mjs')&&!audio.includes('tools/test-polyline-index.mjs'),
    'a concatenated asset URL head selects its reader and leaves pure suites out');
  // Existing dependency-injection options model add/delete and incomplete reads without filesystem edits.
  const virtualRoot=join(PROJECT_ROOT,'runner dependency fixture'),
    virtualSuites=['tools/test-reader.mjs','tools/test-pine-material.mjs','tools/test-unrelated.mjs'];
  const virtualSources=new Map([
    ['tools/test-reader.mjs',"import '../src/vegetation.js';"],
    ['tools/test-pine-material.mjs',"new URL('../public/assets/textures/pine-bough.png',import.meta.url);"],
    ['tools/test-unrelated.mjs',''],['src/vegetation.js',"import './tree-leaf.js';"],['src/tree-leaf.js','']
  ]);
  const nameOf=path=>relative(virtualRoot,path).split(sep).join('/');
  const graphOptions={projectRoot:virtualRoot,hasFile:path=>virtualSources.has(nameOf(path)),
    readSource:path=>{const name=nameOf(path);if(!virtualSources.has(name))throw Error('missing '+name);return virtualSources.get(name);}};
  const knownPath='public/assets/textures/pine-bough.png',expected=virtualSuites.slice(0,2);
  virtualSources.set(knownPath,'binary bytes');
  same(suitesForChanges(virtualSuites,[knownPath],graphOptions),expected,'known added asset includes all proven consumers');
  virtualSources.delete(knownPath);
  same(suitesForChanges(virtualSuites,[knownPath],graphOptions),expected,'known deleted asset keeps literal and computed readers');
  same(suitesForChanges(virtualSuites,['src/tree-leaf.js'],graphOptions),[virtualSuites[0]],
    'source dependency selection follows the complete transitive chain');
  const possibleSuites=[...virtualSuites,'tools/test-computed.mjs','tools/test-filesystem.mjs'];
  virtualSources.set('tools/test-computed.mjs','const file=globalThis.modulePath; await import(file);');
  virtualSources.set('tools/test-filesystem.mjs',"import {readFile} from 'node:fs/promises'; const path=globalThis.assetPath; await readFile(path);");
  same(suitesForChanges(possibleSuites,[knownPath],graphOptions),[...expected,...possibleSuites.slice(3)],
    'audited assets include arbitrary computed-import and filesystem consumers without guessing targets');
  same(suitesForChanges(possibleSuites,['public/assets/unknown.bin'],graphOptions),possibleSuites.slice(3),
    'readers that name no bounded path still run for any game change; others wait for the night run');
  same(suitesForChanges(possibleSuites,['src/tree-leaf.js'],graphOptions),[virtualSuites[0],...possibleSuites.slice(3)],
    'mapped source includes static and every possible fs/computed consumer but omits unrelated pure suites');
  same(suitesForChanges(possibleSuites,['src/unmapped-source.js'],graphOptions),possibleSuites.slice(3),
    'unknown source selects only unbounded readers');
  same(suitesForChanges(virtualSuites,['src/unmapped-source.js'],graphOptions).unmapped,['src/unmapped-source.js'],
    'a game file no selected suite reaches is reported by name for the night run');
  same(suitesForChanges(virtualSuites,['index.html'],graphOptions).unmapped,['index.html'],'an unread root file is reported by name');
  // Named paths and distance from the suite (FACTORY rule 11).
  const pathSuites=['tools/test-head.mjs','tools/test-join.mjs','tools/test-declared.mjs','tools/test-runtime.mjs','tools/test-deep.mjs'];
  virtualSources.set('tools/test-head.mjs',"import {readFileSync} from 'node:fs'; readFileSync(new URL('../public/assets/audio/'+name,import.meta.url));");
  virtualSources.set('tools/test-join.mjs',"import {join} from 'node:path'; import {readdirSync} from 'node:fs'; readdirSync(join(root,'public','models'));");
  virtualSources.set('tools/test-declared.mjs',['// test-reads: docs/board/',"import {readFileSync} from 'node:fs'; readFileSync(globalThis.where);"].join('\n'));
  virtualSources.set('tools/test-runtime.mjs',"import '../src/bank.js';");
  virtualSources.set('src/bank.js',"export const url='assets/sfx/'+name;");
  virtualSources.set('tools/test-deep.mjs',"import '../src/a.js';");
  virtualSources.set('src/a.js',"import './b.js';");virtualSources.set('src/b.js',"import './c.js';");virtualSources.set('src/c.js','');
  same(suitesForChanges(pathSuites,['public/assets/audio/boom.ogg'],graphOptions),['tools/test-head.mjs'],'a URL head names a prefix');
  same(suitesForChanges(pathSuites,['public/models/car.glb'],graphOptions),['tools/test-join.mjs'],'join(root, literals) names a directory');
  same(suitesForChanges(pathSuites,['docs/board/board.yaml'],graphOptions),['tools/test-declared.mjs'],'a test-reads line declares a computed read');
  same(suitesForChanges(pathSuites,['public/assets/sfx/hit.ogg'],graphOptions),['tools/test-runtime.mjs'],'a runtime assets/ string maps into public/');
  same(suitesForChanges(pathSuites,['src/b.js'],graphOptions),['tools/test-deep.mjs'],'a file two steps away is in reach');
  same([...suitesForChanges(pathSuites,['src/c.js'],graphOptions)],[],'a file three steps away waits for the night run');
  same([...suitesForChanges(pathSuites,['src/b.js'],{...graphOptions,hubImports:1})],[],'a hub passes no change through it');
  same(suitesForChanges(pathSuites,['src/a.js'],{...graphOptions,hubImports:1}),['tools/test-deep.mjs'],'a hub that changes selects its importers');
  same(suitesForChanges(pathSuites,['src/c.js'],{...graphOptions,reach:3}),['tools/test-deep.mjs'],'reach is adjustable');


  const brokenOptions={...graphOptions,readSource:path=>{if(nameOf(path)==='src/vegetation.js')throw Error('unreadable');return graphOptions.readSource(path);}};
  same(suitesForChanges(virtualSuites,[knownPath],brokenOptions),virtualSuites,'an incomplete audited reader graph falls back full');
  virtualSources.delete('src/vegetation.js');
  same(suitesForChanges(virtualSuites,[knownPath],graphOptions),virtualSuites,'missing audited reader/import coverage falls back full');
  same(suitesForChanges(actual,['docs/OPERATIONS.md']),['tools/test-build-status.mjs','tools/test-preview-launcher.mjs','tools/test-repo-hygiene-rules.mjs','tools/test-test-runner.mjs'],
    'documentation edits select only the suites that name that document');
  const unnamedDoc=suitesForChanges(actual,[['docs','NOWHERE.md'].join('/')]);
  check(unnamedDoc.length<=5&&!unnamedDoc.includes('tools/test-preview-launcher.mjs'),
    'an unnamed document selects only the few suites that read the whole docs folder');
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
  const failedCalls=[];
  assert.throws(()=>changedFiles({git:(executable,args)=>{
    failedCalls.push([executable,...args]);
    return {status:128,stderr:'fatal: no merge base'};
  }}),/cannot find merge base with integration\/wasteland: fatal: no merge base/,
  'a missing integration merge base fails clearly instead of comparing only with HEAD');checks++;
  same(failedCalls.length,1,'missing merge base never proceeds to a misleading HEAD diff');
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
// The scheduled replay's real child result remains authoritative even when
// Titan's duplicate child is delegated. Reuse the existing captured fake child.
for(const replayFailure of [{code:7,signal:null},{code:null,signal:'SIGTERM'}]) {
  const titan='tools/test-titan-climb.mjs',replay='tools/test-replays.mjs',other='tools/test-speed-format.mjs';
  const plan=selectPlan([titan,replay,other]),calls=[];
  const child=(executable,args,options)=>{
    calls.push({executable,args,options});
    const handle=new EventEmitter();handle.stdout=new EventEmitter();handle.stderr=new EventEmitter();
    const isReplay=args[0]===join(PROJECT_ROOT,replay);
    queueMicrotask(()=>handle.emit('close',isReplay?replayFailure.code:0,isReplay?replayFailure.signal:null));
    return handle;
  };
  const result=await runSuitesConcurrent(plan,{jobs:1,keepGoing:true,spawnChild:child,now:()=>0});
  same(calls.map(row=>row.args),[[join(PROJECT_ROOT,titan),'--replays-in-plan'],[join(PROJECT_ROOT,replay)],[join(PROJECT_ROOT,other)]],
    'actual dispatch passes only Titan the explicit argument and launches the original replay command');
  same([result.exitCode,result.passed,result.failures,result.notRun],
    [replayFailure.code??1,2,[replay],0],'replay nonzero or signal cannot be hidden by passing delegated Titan');
  same(result.results[1].signal,replayFailure.signal,'the scheduled replay retains its actual termination cause');
}
{
  const titan='tools/test-titan-climb.mjs',replay='tools/test-replays.mjs',other='tools/test-speed-format.mjs';
  const plan=selectPlan([titan,other,replay]),calls=[];
  const child=(executable,args)=>{
    calls.push(args);const handle=new EventEmitter();
    queueMicrotask(()=>handle.emit('close',args[0]===join(PROJECT_ROOT,other)?4:0,null));
    return handle;
  };
  const result=await runSuitesConcurrent(plan,{jobs:1,spawnChild:child,now:()=>0});
  same(calls,[[join(PROJECT_ROOT,titan),'--replays-in-plan'],[join(PROJECT_ROOT,other)]],
    'fail-fast does not launch a later scheduled replay after another real failure');
  same([result.exitCode,result.passed,result.failures,result.notRun],[4,1,[other],1],
    'unrun delegated replay coverage stays explicitly incomplete in a failed aggregate');
  check(!result.results.some(row=>row.suite===replay),'unrun replay is never reported as a passed fingerprint assertion');
}

{
  const audio='tools/test-audio-crash-peak.mjs';
  const ordinary=side=>Array.from({length:8},(_,index)=>'tools/test-'+side+'-'+index+'.mjs');
  const before=ordinary('before'),after=ordinary('after'),suites=[...before,audio,...after];
  const tasks=suites.map(suite=>({suite,label:suite,args:[]})),active=new Set(),starts=[];
  const child=()=>{
    const suite=suites[starts.length],handle=new EventEmitter();
    active.add(suite);starts.push({suite,active:[...active]});
    setImmediate(()=>{active.delete(suite);handle.emit('close',0,null);});
    return handle;
  };
  const result=await runSuitesConcurrent(tasks,{jobs:8,keepGoing:true,spawnChild:child,now:()=>0});
  same({
    beforePeak:Math.max(...starts.filter(row=>before.includes(row.suite)).map(row=>row.active.length)),
    audioCompanions:starts.find(row=>row.suite===audio).active.filter(suite=>suite!==audio),
    laterOverlapsAudio:starts.some(row=>after.includes(row.suite)&&row.active.includes(audio)),
    afterPeak:Math.max(...starts.filter(row=>after.includes(row.suite)).map(row=>row.active.length))
  },{beforePeak:8,audioCompanions:[],laterOverlapsAudio:false,afterPeak:8},
    'native audio crash-peak capture drains preceding suites and blocks later suites while ordinary work keeps eight concurrent jobs');
  same([result.exitCode,result.passed,result.notRun,result.results.map(row=>row.suite)],
    [0,suites.length,0,suites],'exclusive capture preserves every suite result and the original plan order');
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
