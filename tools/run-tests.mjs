import {readdirSync,statSync,readFileSync} from 'node:fs';
import {spawnSync,spawn} from 'node:child_process';
import {resolve,join,dirname,relative} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {sourceState,writeFullTierEvidence} from './build-status.mjs';
import {parseAst} from 'rolldown/parseAst';

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
  '  --tier NAME     lane: near imports and reads of changed files, smoke and replay guards; merge: all short suites; full: all suites.',
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

// Every lane also proves races replay exactly and course scenery has not moved.
export const LANE_GUARDS=Object.freeze([
  'tools/test-replays.mjs',
  'tools/test-combat-replays.mjs',
  'tools/test-world-composition.mjs'
]);

// Proven native child workloads belong to the idle night full tier. Keep this
// explicit: importing a browser/balance helper does not make a pure test heavy.
export const NIGHT_ONLY_SUITES=Object.freeze([
  'tools/test-audio-crash-peak.mjs',
  'tools/test-convoy-tanker-art.mjs',
  'tools/test-first-person-contact.mjs',
  'tools/test-first-person-cloth.mjs',
  'tools/test-first-person-polish.mjs',
  'tools/test-rustwall-p2-relief.mjs',
  'tools/test-rook-p2-candidate.mjs',
  'tools/test-rustwall-p2.mjs',
  'tools/test-rustwall-atlas-isolation.mjs',
  // QA-TEST-AUDIT (24 October 2026): 90 s or more each and no real fault caught in
  // the 30 days before; docs/board/checks/test-audit.md has their numbers. A card
  // whose claim needs one names it as its check and runs it with --filter.
  'tools/test-campaigns.mjs','tools/test-expansion-driving.mjs','tools/test-opponents.mjs',
  'tools/test-crossbow-aim.mjs','tools/test-circuit-layouts.mjs','tools/test-course-eligibility.mjs',
  'tools/test-ufo-landing.mjs','tools/test-terrain.mjs','tools/test-grand-prix-existing.mjs'
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

// Path text a file names: './x', '../public/a/', 'src/x.js', runtime 'assets/x'.
// A read is a path or a path prefix (the literal head of a joined or added path).
const PATH_TEXT=/^(?:\.\.?\/|(?:src|public|tools|docs|audio-src)\/|[\w-]+\.(?:bat|ps1|html|json)$)/;
const RUNTIME_ASSET=/^\/?assets\//;
function moduleReferences(source,file){
  const references=[],reads=[],specifiers=new Set();
  let possibleReader=false,computedImports=false;
  const literal=node=>node?.type==='Literal'&&typeof node.value==='string'?node.value:
    node?.type==='TemplateLiteral'&&node.expressions.length===0?node.quasis[0].value.cooked:null;
  // Literal start of '../a/'+name or `../a/${name}`; exact when nothing follows.
  const head=node=>{
    const value=literal(node);
    if(value!==null)return {text:value,exact:true};
    if(node?.type==='TemplateLiteral')return {text:node.quasis[0].value.cooked,exact:false};
    if(node?.type==='BinaryExpression'&&node.operator==='+'){
      const left=head(node.left);
      return left&&{text:left.text,exact:false};
    }
    return null;
  };
  const read=(text,exact,base,joined=false)=>{
    if(!text)return;
    if(RUNTIME_ASSET.test(text))reads.push({path:'public/'+text.replace(/^\//,''),exact,base:'root'});
    else if(PATH_TEXT.test(joined&&!text.endsWith('/')?text+'/':text))reads.push({path:text,exact,base:base??(text.startsWith('.')?'file':'root')});
  };
  const add=(node,kind)=>{
    const specifier=literal(node);
    if(specifier!==null){
      references.push({specifier,kind});
      if(kind==='import')specifiers.add(node);
      if(['fs','node:fs','fs/promises','node:fs/promises'].includes(specifier))possibleReader=true;
    }else if(kind==='import'){possibleReader=true;computedImports=true;}
    else if(kind==='url'){const start=head(node);if(start)read(start.text,false,'file');}
  };
  const walk=node=>{
    if(!node||typeof node.type!=='string')return;
    if(node.type==='ImportDeclaration'||node.type==='ExportAllDeclaration'||node.type==='ExportNamedDeclaration'){
      if(node.source)add(node.source,'import');
    }else if(node.type==='ImportExpression')add(node.source,'import');
    else if(node.type==='CallExpression'&&node.callee?.type==='Identifier'&&node.callee.name==='require')
      add(node.arguments[0],'import');
    else if(node.type==='NewExpression'&&node.callee?.name==='URL'&&
      node.arguments[1]?.type==='MemberExpression'&&node.arguments[1].property?.name==='url'&&
      node.arguments[1].object?.type==='MetaProperty'&&node.arguments[1].object.meta?.name==='import')
      add(node.arguments[0],'url');
    else if(node.type==='CallExpression'&&['join','resolve'].includes(node.callee?.name??node.callee?.property?.name)){
      // join(root,'public','assets',name): the literal run after the root names a path or prefix.
      const parts=[];let exact=true;
      for(const argument of node.arguments.slice(1)){
        const value=literal(argument);
        if(value===null){exact=false;break;}
        parts.push(value);
      }
      if(parts.length)read(parts.join('/').replace(/^\.\//,''),exact,'root',true);
    }else if(node.type==='Literal'&&typeof node.value==='string'&&!specifiers.has(node))read(node.value,true);
    else if(node.type==='TemplateLiteral'){const start=head(node);if(start)read(start.text,start.exact);}
    else if(node.type==='BinaryExpression'&&node.operator==='+'){
      const start=head(node);
      if(start)read(start.text,false);
    }
    for(const value of Object.values(node)){
      if(Array.isArray(value))value.forEach(walk);
      else if(value&&typeof value==='object')walk(value);
    }
  };
  walk(parseAst(source,null,file));
  // Declared reads for paths the code builds at run time: // test-reads: public/a/, docs/b.md
  for(const match of source.matchAll(/\/\/\s*test-reads:\s*(.+)$/gm))
    for(const text of match[1].split(/[\s,]+/).filter(Boolean))reads.push({path:text,exact:false,base:'root'});
  return {references,reads,complete:true,possibleReader,computedImports};
}
// Audited non-import readers. These are additive edges, not filename guesses.
const EXPLICIT_READS=Object.freeze({
  'tools/test-qa-storage.mjs': ['visual-check','reward-check','reverse-check','contact-check',
    'jump-height-check','update-check','menu-check'].map(name=>'tools/'+name+'.js')
});
// Only these current presentation paths have a complete consumer mapping.
const PRESENTATION_CONSUMERS=Object.freeze([
  {files:['public/assets/textures/pine-bough.png','public/assets/textures/pine-bark.png'],
    readers:['src/vegetation.js','tools/test-pine-material.mjs']},
  {directory:'public/assets/models/circuits/kits/',extensions:['.glb'],
    readers:['src/track-kits.js','tools/test-track-kits.mjs','tools/test-p4-kits.mjs','tools/test-blender-output.mjs']},
  {files:['public/assets/models/circuits/kits/manifest.json'],
    readers:['tools/test-p4-kits.mjs','tools/test-circuit-harbour.mjs','tools/test-circuit-tremblant.mjs']},
  {files:['style','screen-card-wall','screen-team-room','screen-menu','screen-players',
    'screen-leaderboard','screen-garage','screen-armory','screen-yard-home','screen-arena',
    'screen-territory','screen-courses','screen-results','screen-hud'].map(name=>'src/'+name+'.css'),
    readers:['src/screen-router.js']}
]);
const presentationConsumers=path=>PRESENTATION_CONSUMERS.find(row=>row.files?.includes(path)||
  (row.directory&&path.startsWith(row.directory)&&!path.slice(row.directory.length).includes('/')&&
    row.extensions.some(extension=>path.endsWith(extension))));
const fullScope=path=>{
  const name=path.slice(path.lastIndexOf('/')+1);
  // Build and tool configs only; src/config.js is game data and follows its importers.
  const buildConfig=(!path.includes('/')||path.startsWith('tools/'))&&/^(?:.*[.-])?config\.[^.]+$/.test(name);
  return path==='tools/run-tests.mjs'||path==='tools/test-test-runner.mjs'||buildConfig||
    /^(?:package(?:-lock)?\.json|.*\.lock|.*(?:^|[.-])lock(?:file)?\.[^.]+|tsconfig.*\.json)$/.test(name);
};

// A hub gathers many of the game's own modules (game.js, app.js, render3d.js).
// A suite that imports a hub runs when the hub itself changes, but a lane does not
// follow the hub's own imports: otherwise every suite that builds a Duel would run
// for any file the game touches. The night full tier covers those deeper paths.
export const HUB_IMPORTS=20;
const localImportCount=(parsed,file,hasFile)=>parsed.references.filter(({specifier,kind})=>{
  if(kind!=='import'||!specifier.startsWith('.'))return false;
  const base=resolve(dirname(file),specifier.split(/[?#]/,1)[0]);
  return [base,base+'.js',base+'.mjs',join(base,'index.js')].some(path=>/\.m?js$/.test(path)&&hasFile(path));
}).length;

export function localDependencies(entry,{projectRoot=PROJECT_ROOT,readSource=readFileSync,hasFile=isFile,
  dependencyCache=new Map(),hubImports=Infinity}={}){
  let complete=true,possibleReader=false,computedImports=false;
  // Breadth-first so each file keeps its shortest import distance from the suite.
  const reads=new Map(),found=new Set(),depths=new Map(),hubs=new Set(),queue=[[resolve(projectRoot,entry),0]];
  const enqueue=(file,depth)=>{const name=relativeName(projectRoot,file);if(!found.has(name)&&hasFile(file)){found.add(name);depths.set(name,depth);queue.push([file,depth]);}};
  found.add(relativeName(projectRoot,queue[0][0]));depths.set(relativeName(projectRoot,queue[0][0]),0);
  if(!hasFile(queue[0][0]))queue.length=0;
  while(queue.length){
    const [file,depth]=queue.shift(),name=relativeName(projectRoot,file);
    if(!/\.m?js$/.test(file))continue;
    let parsed=dependencyCache.get(file);
    if(!parsed){
      try{parsed=moduleReferences(readSource(file,'utf8'),file);}
      catch{parsed={references:[],complete:false};}
      dependencyCache.set(file,parsed);
    }
    if(!parsed.complete)complete=false;
    // A hub's own reads still count; its imports are not followed past it.
    const hub=depth>0&&localImportCount(parsed,file,hasFile)>=hubImports;
    if(hub)hubs.add(name);
    possibleReader ||= parsed.possibleReader;computedImports ||= parsed.computedImports;
    for(const {path,exact,base} of parsed.reads??[]){
      const target=relativeName(projectRoot,base==='file'?resolve(dirname(file),path):resolve(projectRoot,path));
      // A head that resolves to the root or outside it names no bounded path.
      if(!target||target==='.'||target.startsWith('..'))continue;
      const read=(exact?'=':'^')+target+(path.endsWith('/')&&!target.endsWith('/')?'/':'');
      if(!reads.has(read)||reads.get(read)>depth)reads.set(read,depth);
    }
    if(hub)continue;
    for(const readerPath of EXPLICIT_READS[name]??[]){
      if(hasFile(resolve(projectRoot,readerPath)))enqueue(resolve(projectRoot,readerPath),depth+1);
      else {found.add(readerPath);depths.set(readerPath,depth+1);complete=false;}
    }
    for(const {specifier,kind} of parsed.references){
      if(!specifier.startsWith('.'))continue;
      const base=resolve(dirname(file),specifier.split(/[?#]/,1)[0]);
      const candidates=[base,base+'.js',base+'.mjs',join(base,'index.js')];
      const target=candidates.find(hasFile);
      if(target)enqueue(target,depth+1);
      else {
        const missing=relativeName(projectRoot,base);
        if(!found.has(missing)){found.add(missing);depths.set(missing,depth+1);}
        // Missing asset/CSS URLs still select their reader on deletion.
        if(kind==='import'&&!specifier.endsWith('.css'))complete=false;
      }
    }
  }
  Object.defineProperties(found,{complete:{value:complete},possibleReader:{value:possibleReader},
    computedImports:{value:computedImports},reads:{value:reads},depths:{value:depths},hubs:{value:hubs}});
  return found;
}
// Exact reads also cover a directory's contents; prefix reads cover anything they start.
export function readsPath(reads,path,within=Infinity){
  for(const [read,depth] of reads){
    if(depth>within)continue;
    const target=read.slice(1);
    if(read[0]==='^'?path.startsWith(target):path===target||path.startsWith(target.endsWith('/')?target:target+'/'))return true;
  }
  return false;
}
// A suite runs for a file it imports, or a file one step further through a module
// that is not a hub, or a path those name. Deeper chains wait for the night full
// tier; replay fingerprints run in every lane and guard race rules.
export const LANE_REACH=2;
// Shared files most suites import: the busy-game-files lock (FACTORY section 2) and
// the two shared tables. Importing one does not select a suite; the smoke set and
// replay guards drive them in every lane, the card's other files select their own
// suites, a suite that reads one as text still runs, and the night full tier runs
// every importer. Each lists the suites that own it.
export const SHARED_FILES=Object.freeze({
  'src/game.js':[],'src/main.js':[],'src/render3d.js':[],'src/app.js':[],'src/config.js':[],
  'src/feature-flags.js':['tools/test-feature-flags.mjs','tools/test-preview-launcher.mjs']
});
export function suitesForChanges(suites,paths,{reach=LANE_REACH,hubImports=HUB_IMPORTS,...options}={}){
  const changed=new Set(paths.map(normalized));
  if(!changed.size)return [];
  if([...changed].some(fullScope))return [...suites];
  const presentation=new Map();
  for(const path of changed){
    const row=presentationConsumers(path);
    if(row)presentation.set(path,row);
  }
  const mapped=new Set(),requiredReaders=new Set([...presentation.values()].flatMap(row=>row.readers));
  const affected=[],covered=new Set(),dependencyCache=new Map(),
    gameChange=[...changed].some(path=>/^(?:src|public|tools)\//.test(path)||path.endsWith('.css'));
  for(const suite of suites){
    mapped.add(suite);
    const dependencies=localDependencies(suite,{...options,dependencyCache,hubImports});
    if(!dependencies.complete)return [...suites];
    for(const path of dependencies)mapped.add(path);
    const near=path=>!Object.hasOwn(SHARED_FILES,path)&&(dependencies.depths.get(path)??Infinity)<=reach;
    [...changed].filter(path=>readsPath(dependencies.reads,path)).forEach(path=>mapped.add(path));
    const reading=[...changed].filter(path=>near(path)||readsPath(dependencies.reads,path,reach-1));
    // A file reader that names no bounded path could read anything it is handed.
    const unbounded=(dependencies.possibleReader||dependencies.computedImports)&&!dependencies.reads.size;
    const readsPresentation=[...requiredReaders].some(reader=>dependencies.has(reader)),
      readsChange=reading.length>0;
    const ownsShared=[...changed].filter(path=>SHARED_FILES[path]?.includes(suite));
    reading.push(...ownsShared);
    if(changed.has(suite)||readsPresentation||readsChange||ownsShared.length||(gameChange&&unbounded)){
      affected.push(suite);
      reading.forEach(path=>covered.add(path));
      if(changed.has(suite))covered.add(suite);
    }
  }
  // Explicit mappings must have their real readers in this inventory.
  if([...requiredReaders].some(reader=>!mapped.has(reader)))return [...suites];
  // A changed game file no selected suite reaches is named, not a reason to run everything.
  // The night full tier and the release full tier still cover it.
  const unmapped=[...changed].filter(path=>!path.startsWith('docs/')&&!path.endsWith('.md')&&
    !covered.has(path)&&!presentation.has(path)&&!Object.hasOwn(SHARED_FILES,path));
  return Object.defineProperty(affected,'unmapped',{value:unmapped});
}

export function selectPlan(suites,{tier=null,filters=[],changed=false,affected=[]}={}){
  let selected;
  if(tier==='lane'||changed){
    const selectedNames=new Set([...SMOKE_SUITES,...LANE_GUARDS,...affected]);
    selected=suites.filter(suite=>selectedNames.has(suite)&&!NIGHT_ONLY_SUITES.includes(suite));
  }else selected=[...suites];
  if(tier==='merge')selected=selected.filter(suite=>suite!==CAMPAIGN_SUITE);
  if(filters.length)selected=selectSuites(selected,filters);
  const replayScheduled=selected.includes('tools/test-replays.mjs');
  return selected.flatMap(suite=>suite===CAMPAIGN_SUITE
    ?Array.from({length:CAMPAIGN_SHARDS},(_,index)=>({
      suite,label:suite+' ['+(index+1)+'/'+CAMPAIGN_SHARDS+']',args:['--shard='+(index+1)+'/'+CAMPAIGN_SHARDS]
    }))
    :[{suite,label:suite,args:suite==='tools/test-titan-climb.mjs'&&replayScheduled?['--replays-in-plan']:[]}]);
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
  let next=0,active=0,stopped=false,finished=false,exclusiveActive=false;
  await new Promise(resolveDone=>{
    const finish=()=>{
      if(finished)return;
      finished=true;resolveDone();
    };
    const pump=()=>{
      while(active<jobs&&next<tasks.length&&!stopped&&!exclusiveActive){
        const task=tasks[next];
        // Native audio timing and the sea-life frame cost must be measured without other suites competing.
        const exclusive=task.suite==='tools/test-audio-crash-peak.mjs'||task.suite==='tools/test-deep-life.mjs';
        if(exclusive&&active>0)break;
        const index=next++;active++;exclusiveActive=exclusive;onStart(task,index,tasks.length);
        captureSuite(task,{cwd,execPath,env,spawnChild,now}).then(result=>{
          results[index]=result;active--;
          if(exclusive)exclusiveActive=false;
          onResult(result,index,tasks.length);
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
    if(impacted.unmapped?.length)
      log('No suite imports or reads '+impacted.unmapped.join(', ')+'; the night full tier covers it.');
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
