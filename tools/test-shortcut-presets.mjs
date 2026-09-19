// Normal mode checks exact saved paths, full input invalidation and isolation.
// Run --verify-solvers to also solve all 15 layouts and compare every feature.
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { ROUTE_VARIANTS, supportsRouteVariants } from '../src/route-variants.js';
import { SHORTCUT_PRESET_DATA } from '../src/generated-shortcut-presets.js';
import { SHORTCUT_GENERATION_VERSION, findShortcutPreset, shortcutPresetFingerprint } from '../src/shortcut-preset-cache.js';
import { shortcutSourceFingerprint } from './shortcut-preset-freshness.mjs';

let checks=0,layouts=0,solved=0;const check=(value,label)=>{assert.ok(value,label);checks++;},equal=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
equal(SHORTCUT_PRESET_DATA.version,SHORTCUT_GENERATION_VERSION,'saved paths use the current solver version');
equal(await shortcutSourceFingerprint(),SHORTCUT_PRESET_DATA.sourceFingerprint,'generation code changed: rerun tools/generate-shortcut-presets.mjs and --verify-solvers');
const saved=JSON.stringify(SHORTCUT_PRESET_DATA),reports=[];
for(const definition of COURSE)for(const seed of supportsRouteVariants(definition)?ROUTE_VARIANTS.map(route=>route.seed):[1989]){
  const before=performance.now(),course=new Course(definition,seed),presetMs=performance.now()-before;layouts++;
  if(definition.arena){equal(course.features.shortcuts,[],'arenas do not need solved shortcut presets');continue;}
  equal(course._shortcutSource,'preset',`${definition.id}/${seed}: a cold selectable route uses its saved solution`);
  const key=shortcutPresetFingerprint(course),entry=SHORTCUT_PRESET_DATA.entries.find(record=>record.fingerprint===key);
  check(!!entry,`${definition.id}/${seed}: full route inputs select the intended record`);
  equal(course.features.shortcuts,entry.shortcuts,'saved paths exactly preserve all route metadata and numeric offsets');
  if(definition.kind==='chase'||definition.layout==='city')check(course.features.shortcuts.every(cut=>cut.name!=='Canyon cut'),'city shortcuts have harbor/service names instead of desert labels');
  const first=findShortcutPreset(key),second=findShortcutPreset(key);
  check(first!==second&&first[0]!==second[0]&&first[0].offsets!==second[0].offsets,'every lookup clones array, path records and offsets');
  first[0].start+=80;first[0].offsets[0]=999;first.push({...first[0]});
  equal(findShortcutPreset(key),second,'mutating one returned path cannot change future courses');
  for(const changed of[
    {...course,seed:seed^0x1a34},
    {...course,def:{...definition,lengthU:definition.lengthU+8}},
    {...course,def:{...definition,layoutVersion:(definition.layoutVersion||1)+1}},
    {...course,def:{...definition,sections:definition.sections.map((section,i)=>i?section:{...section,share:section.share+.001})}},
    {...course,samples:course.samples.map((point,i)=>i===4?{...point,x:point.x+.0001}:point)},
    {...course,features:{...course.features,tunnels:[...course.features.tunnels,{start:500,end:640,width:8.3,height:8.5}]}},
  ])check(findShortcutPreset(shortcutPresetFingerprint(changed))===null,'unknown seeds, definitions, geometry or tunnel layouts fall back instead of borrowing a path');
  let solverMs=null;
  if(process.argv.includes('--verify-solvers')){
    const start=performance.now(),original=new Course(definition,seed,{solveShortcuts:true});solverMs=performance.now()-start;solved++;
    equal(original._shortcutSource,'solver','explicit verification bypasses both saved presets and the warm cache');
    equal(course.samples,original.samples,'preset loading leaves all sampled route values bit-identical');
    equal(course.features,original.features,'all shortcuts, collider positions and scenery features exactly match the fresh original solver');
  }
  reports.push({event:definition.id,seed,presetMs:+presetMs.toFixed(2),...(solverMs==null?{}:{solverMs:+solverMs.toFixed(2),speedup:+(solverMs/presetMs).toFixed(2)})});
}
equal(layouts,17,'four events × three routes plus five fixed events');
equal(SHORTCUT_PRESET_DATA.entries.length,15,'only fifteen non-arena layouts need presets');
equal(JSON.stringify(SHORTCUT_PRESET_DATA),saved,'generation records remain unchanged after all courses and mutation probes');
// A small custom route has no matching preset and still runs the original
// generator. Its second construction uses the existing cloned runtime cache.
const custom={...COURSE.find(event=>event.kind==='chase'),id:'custom-preset-fallback',lengthU:800,hasRadar:false,sections:[{theme:'city',name:'Custom',share:1}]};
const fallback=new Course(custom,991),cached=new Course(custom,991);
equal(fallback._shortcutSource,'solver','custom routes retain the original on-demand generator');
equal(cached._shortcutSource,'cache','custom routes still benefit from the existing per-session cache');
equal(fallback.features,cached.features,'custom cache results preserve every feature');
console.log(JSON.stringify({shortcutPresetLoads:reports}));
console.log(`Shortcut presets: ${checks} checks, ${layouts} selectable layouts, ${solved} fresh solver comparisons; no regular-test full regeneration.`);
