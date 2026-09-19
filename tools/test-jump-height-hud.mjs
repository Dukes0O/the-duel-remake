import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createJumpHeightReadout} from '../src/jump-height.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const equal=(actual,expected,message)=>{assert.deepEqual(actual,expected,message);checks++;};
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
const markup=main.match(/<section\b[^>]*\bid="jump-height-panel"[^>]*>[\s\S]*?<\/section>/)?.[0];
check(markup,'the height readout has its own section');
check(/^<section\b[^>]*\bhidden(?:\s|>)/.test(markup),'the panel starts hidden before the first frame');
check(/^<section\b[^>]*\baria-label="[^"]*(?:height|Height)[^"]*"/.test(markup),'the panel has an accessible height label');
check(!/\baria-live\s*=|\brole="(?:status|alert|log)"/.test(markup),'frame-by-frame height does not flood a live region');
check(/<div class="speedometer">\s*<section\b[^>]*id="jump-height-panel"/.test(main),'the height readout is attached to the speedometer');
for(const id of ['jump-height-panel','jump-height-label','jump-height-value','jump-height-peak']){
  equal([...main.matchAll(new RegExp(`\\bid="${id}"`,'g'))].length,1,`${id} has exactly one markup target`);
}
check(/id="jump-height-label"[^>]*>HEIGHT ABOVE GROUND</.test(markup),'the initial label states ground clearance');
check(/id="jump-height-value"[^>]*>0\.0<\/b>\s*<span>m<\/span>/.test(markup),'the numeric value has a separate, visible metres unit');
check(/id="jump-height-peak"[^>]*>PEAK 0\.0 m</.test(markup),'the live peak includes its metres unit');
check(/\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/.test(css),'the hidden attribute cannot be overridden by panel layout');
check(/\.jump-height\s*\{[^}]*position\s*:\s*absolute[^}]*bottom\s*:\s*calc\(100%/.test(css),'the panel sits above the speedometer instead of covering its digits');
check(/\.jump-height-number>b\s*\{[^}]*font-variant-numeric\s*:\s*tabular-nums/.test(css),'changing decimal digits use stable-width numerals');
check(/\.jump-height\[data-phase="landed"\]/.test(css),'landed phase has a distinct visual treatment');
check(/@media\([^}]*\)\s*\{\s*\.jump-height\s*\{/.test(css),'the height panel has a small-viewport layout');
check(/import\s*\{createJumpHeightReadout\}\s*from\s*['"]\.\/jump-height\.js['"]/.test(main),'the production HUD imports the real readout helper');
equal([...main.matchAll(/\bcreateJumpHeightReadout\(\)/g)].length,1,'the HUD retains one readout instance between frames');

// Execute the actual production presentation block, not a parallel rendering
// implementation. The real helper supplies height and phase; the DOM is stubbed.
const renderState=main.slice(main.indexOf('function renderState(s) {'),main.indexOf('\nfunction updateHud(s) {'));
const block=renderState.match(/const jumpHeight=jumpHeightReadout\.update\(s,app\.duel\.course\);[\s\S]*?(?=\s*if\(s\.status!=='menu'\) updateHud\(s\);)/)?.[0];
check(block,'height rendering runs before the menu guard so stale jumps can reset');
const present=new Function('s','app','ui','text','jumpHeightReadout',block);
const ui=Object.fromEntries(['jump-height-panel','jump-height-label','jump-height-value','jump-height-peak'].map(id=>[id,{hidden:true,dataset:{},textContent:''}]));
const text=(id,value)=>{ui[id].textContent=String(value);};
const app={duel:{course:{id:'height-ui-course'}}},readout=createJumpHeightReadout();
const sample={status:'racing',stageTimeSec:0,airborne:false,airHeight:0,_jumpY:0,stageCrashes:0,boundaryResets:0,impactTimer:0,paused:false};
const view=()=>({hidden:ui['jump-height-panel'].hidden,phase:ui['jump-height-panel'].dataset.phase,label:ui['jump-height-label'].textContent,value:ui['jump-height-value'].textContent,peak:ui['jump-height-peak'].textContent});
function render(overrides={}){
  const state=Object.freeze({...sample,...overrides}),before=JSON.stringify(state);
  present(state,app,ui,text,readout);
  equal(JSON.stringify(state),before,'height presentation never changes the simulation');
  check(/^\d+\.\d$/.test(ui['jump-height-value'].textContent),'the main numeric value always has exactly one decimal');
  return view();
}
const hidden={hidden:true,phase:'hidden',label:'HEIGHT ABOVE GROUND',value:'0.0',peak:'PEAK 0.0 m'};
equal(render({status:'menu',airborne:true,airHeight:10}),hidden,'menu does not display stale airborne state');
equal(render({status:'countdown',stageTimeSec:0}),hidden,'countdown begins with the panel hidden and zeroed');
equal(render({stageTimeSec:1}),hidden,'ordinary grounded driving does not show a jump panel');
equal(render({stageTimeSec:2,airborne:true,airHeight:1.04}),{hidden:false,phase:'airborne',label:'HEIGHT ABOVE GROUND',value:'1.0',peak:'PEAK 1.0 m'},'takeoff displays the current ground clearance in metres');
equal(render({stageTimeSec:2.2,airborne:true,airHeight:3.26}),{hidden:false,phase:'airborne',label:'HEIGHT ABOVE GROUND',value:'3.3',peak:'PEAK 3.3 m'},'the rising jump updates both rounded height and peak');
const descending=render({stageTimeSec:2.4,airborne:true,airHeight:2.09});
equal(descending,{hidden:false,phase:'airborne',label:'HEIGHT ABOVE GROUND',value:'2.1',peak:'PEAK 3.3 m'},'descent shows live height while preserving the larger peak');
for(let frame=0;frame<3;frame++)equal(render({stageTimeSec:2.4,airborne:true,airHeight:2.09,paused:true}),descending,'paused frames retain the frozen airborne values');
const landed=render({stageTimeSec:2.6});
equal(landed,{hidden:false,phase:'landed',label:'JUMP PEAK',value:'3.3',peak:'LANDED'},'landing shows the completed jump peak, not zero current clearance');
for(let frame=0;frame<3;frame++)equal(render({stageTimeSec:2.6,paused:true}),landed,'pause does not consume the landing display hold');
equal(render({stageTimeSec:4.59}),landed,'the completed peak remains visible briefly after landing');
equal(render({stageTimeSec:4.61}),hidden,'the completed peak hides and clears after its hold');
equal(render({stageTimeSec:5,airborne:true,airHeight:.64}),{hidden:false,phase:'airborne',label:'HEIGHT ABOVE GROUND',value:'0.6',peak:'PEAK 0.6 m'},'the next jump starts with its own lower peak');
equal(render({status:'menu',stageTimeSec:5,airborne:true,airHeight:.64}),hidden,'returning to the menu clears an active jump immediately');
equal(render({status:'countdown',stageTimeSec:0}),hidden,'a restart countdown cannot revive the last jump');
equal(render({stageTimeSec:1,airborne:true,airHeight:1.26}),{hidden:false,phase:'airborne',label:'HEIGHT ABOVE GROUND',value:'1.3',peak:'PEAK 1.3 m'},'the restarted race displays only its new jump');
equal(render({stageTimeSec:1.2}),{hidden:false,phase:'landed',label:'JUMP PEAK',value:'1.3',peak:'LANDED'},'a new landing presents the restarted jump peak');
equal(render({status:'countdown',stageTimeSec:0}),hidden,'countdown also clears a held landing peak');
for(const status of ['stage_result','complete','gameover']){
  render({stageTimeSec:2,airborne:true,airHeight:7.18});
  equal(render({status,stageTimeSec:2,airborne:true,airHeight:7.18}),hidden,`${status} hides the in-race height readout`);
}

console.log(`Jump-height HUD: ${checks} production markup, metres, live/landed peak, pause and reset checks passed.`);
