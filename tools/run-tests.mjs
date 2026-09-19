import {readdirSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

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

const HELP=`Usage: node tools/run-tests.mjs [--list] [--filter NAME]

Runs each suite in a separate Node process; stops at the first failure.
  --list          Print selected suite paths without running them.
  --filter NAME   Match a path substring, ignoring case. Repeat for OR matches.
                  Use "core" to select src/test.js. No match is an error.
  --help, -h      Show this help.

The original 80 suites retain their order, with src/test.js first.
New tools/test-*.mjs suites follow in alphabetical order.
Child processes inherit the environment, including DUEL_SKIP_CAMPAIGNS.`;

export function parseArguments(args){
  const options={list:false,help:false,filters:[]};
  for(let index=0;index<args.length;index++){
    const argument=args[index];
    if(argument==='--list')options.list=true;
    else if(argument==='--help'||argument==='-h')options.help=true;
    else if(argument==='--filter'||argument.startsWith('--filter=')){
      const value=argument==='--filter'?args[++index]:argument.slice('--filter='.length);
      if(typeof value!=='string'||!value.trim()||value.startsWith('-'))throw Error('--filter requires a nonempty suite name.');
      options.filters.push(value.trim().toLowerCase());
    }else throw Error(`Unknown argument: ${argument}. Use --help for options.`);
  }
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

export function main(args=process.argv.slice(2),{discover=discoverSuites,run=runSuites,log=console.log,error=console.error}={}){
  try{
    const options=parseArguments(args);
    if(options.help){log(HELP);return 0;}
    const selected=selectSuites(discover(),options.filters);
    if(!selected.length){error(`No test suites match: ${options.filters.join(', ')||'(none)'}`);return 2;}
    if(options.list){selected.forEach(suite=>log(suite));return 0;}
    return run(selected,{log,error}).exitCode;
  }catch(cause){error(`Test runner: ${cause.message}`);return 2;}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)process.exitCode=main();
