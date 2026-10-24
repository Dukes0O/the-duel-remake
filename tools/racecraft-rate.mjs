// GP-RACECRAFT: seeded, graphics-free comparisons using the existing stock driver.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {DRIVE} from '../src/config.js';
import {runtimeOf} from '../src/race-field-driver.js';
import {writeFileSync} from 'node:fs';
import {stageOf,raceSeeds,installTestDriver} from './race-field-balance.mjs';

const STEP=1/60;
const average=values=>values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
function memoryStorage(){const rows=new Map();return {get length(){return rows.size;},key:i=>[...rows.keys()][i]??null,
  getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,String(v)),removeItem:k=>rows.delete(k)};}
// A single real first-braking snapshot. Count distinct body-overlap pairs;
// an actor cannot supply two pairs. At most eight cars, so exact matching is small.
export function startFormation(actors) {
  if (actors.some(row => ![row.s, row.lateral, row.halfLength, row.halfWidth].every(Number.isFinite) ||
    row.halfLength <= 0 || row.halfWidth <= 0) || new Set(actors.map(row => row.id)).size !== actors.length)
    throw Error('Invalid first-braking actor snapshot');
  const alongside = (a, b) => {
    const overlap = Math.min(a.s + a.halfLength, b.s + b.halfLength) -
      Math.max(a.s - a.halfLength, b.s - b.halfLength);
    return overlap >= Math.min(a.halfLength, b.halfLength) &&
      Math.abs(a.lateral - b.lateral) >= a.halfWidth + b.halfWidth;
  };
  const matching = remaining => {
    if (remaining.length < 2) return [];
    const [first, ...rest] = remaining;
    let best = matching(rest);
    for (let i = 0; i < rest.length; i++) if (alongside(first, rest[i])) {
      const pairs = [[first.id, rest[i].id], ...matching(rest.filter((_, j) => j !== i))];
      if (pairs.length > best.length) best = pairs;
    }
    return best;
  };
  const leading = [...actors].sort((a, b) => b.s - a.s).slice(0, 6);
  const mean = average(leading.map(row => row.lateral));
  const lateralSpread = leading.length === 6 ? Math.sqrt(average(leading.map(row => (row.lateral - mean) ** 2))) : null;
  return {pairs: matching(actors), lateralSpread, leading: leading.map(row => row.id)};
}
function threeWide(duel,entry=-Infinity,apex=Infinity){
  const actors=[duel.state,...duel.state.opponents].filter(r=>!r.finished&&!r.knock&&r.s>=entry&&r.s<=apex);
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)for(let k=j+1;k<actors.length;k++){
    const rows=[actors[i],actors[j],actors[k]], shells=rows.map(r=>duel._vehicleSpec(r));
    const stations=rows.map(r=>duel.relativeS(r.s,rows[0].s));
    if(Math.max(...stations)-Math.min(...stations)>Math.min(...shells.map(s=>s.halfWidth)))continue;
    if(rows.every((r,a)=>rows.every((q,b)=>a===b||Math.abs(r.lateral-q.lateral)>=shells[a].halfWidth+shells[b].halfWidth)))return true;
  }
  return false;
}
export function measureRace({course,index=0,enabled=false,mode='normal',maxSec=null}){
  const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const cancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
  let app;
  try{
    globalThis.localStorage=memoryStorage();globalThis.cancelAnimationFrame??=()=>{};
    app=new App();
    app.duel.featureFlags=createFeatureFlags({storage:null,qa:false,search:'',overrides:{'grand-prix':true,'cpu-racecraft':enabled}});
    const stage=stageOf(course),{seed,fieldSeed}=raceSeeds(index);
    app.profile={...app.profile,credits:1e6};app._saveProfile();
    if(course!=='pacific-canyon'&&!app.purchaseCourse(course).ok)throw Error('Cannot purchase '+course);
    // Hard is the production setting whose player slot is last; no car is repositioned.
    if(!app.startCampaign({startStage:stage,seed,fieldSeed,fieldSize:7,mode:'grandprix',car:'falcone_f42',difficulty:'casual',cpuDifficulty:mode==='nitro'?'hard':'medium'}))throw Error('Cannot start '+course);
    app.autopilot=true;app._scriptedCrashDone=true;installTestDriver(app);
    const d=app.duel,s=d.state;s.field.deferFinish=true;
    if(mode==='nitro'&&s.field.playerSlot!==7)throw Error('Nitro benchmark must start last');
    const profiles=s.opponents.map(r=>runtimeOf(d,r).profile);
    const drive=app._driveAutopilot.bind(app);
    if(mode!=='normal')app._driveAutopilot=dt=>{
      drive(dt);if(s.status!=='racing')return;
      let input={...s.input,boost:mode==='nitro'&&s.completedLaps===0};
      if(mode==='slow'){
        const target=average(profiles.map(p=>p.at(s.s)))*.97;
        input={...input,throttle:s.speedMph<target?1:0,brake:s.speedMph>target+1?Math.min(1,(s.speedMph-target)/8):0};
      }
      d.setInput(input);
    };
    const front=s.opponents.reduce((a,b)=>a.s>b.s?a:b), profile=runtimeOf(d,front).profile;
    const phase=d.course.phase(front.s), length=d.course.length;
    const entries=profile.corners.map(c=>({corner:c,distance:(c.entryS-phase+length)%length})).filter(row=>row.distance>1).sort((a,b)=>a.distance-b.distance);
    const first=entries[0],entry=first ? front.s+first.distance : null;
    const apex=first ? entry+(first.corner.apexS-first.corner.entryS+length)%length : null;
    let wide=false,entryInstantWide=null,entryCars=null,startSnapshot=null,firstLapPosition=null,passedPlayer=false,boostFrames=0;
    const sides=new Map(s.opponents.map((r,i)=>[i,Math.sign(d.relativeS(r.s,s.s)-s.s)]));
    maxSec??=d.course.script?Math.max(420,d.course.raceLength/14):420;
    while(s.status==='countdown'||s.status==='racing'){
      app.advance(STEP,STEP);
      if(s.status!=='racing')continue;
      if(entry!==null){
        if(entryInstantWide===null && [s,...s.opponents].some(r=>r.s>=entry)){
          entryInstantWide=threeWide(d);
          entryCars=[s,...s.opponents].map((r,id)=>({id,s:r.s,lateral:r.lateral,speed:r.speedMph,
            bias:r.field?.bias,passes:r.field?.passes?.start,...d._vehicleSpec(r)}));
          const active=entryCars.filter((_,id)=>![s,...s.opponents][id].finished&&![s,...s.opponents][id].knock);
          startSnapshot={time:s.stageTimeSec,entry,...startFormation(active)};
        }
        // Measure cars physically in this first braking zone, not just the
        // instant pole arrives or an unrelated group elsewhere on the track.
        if(!wide)wide=threeWide(d,entry,apex);
      }
      s.opponents.forEach((r,i)=>{
        const ds=d.relativeS(r.s,s.s)-s.s,previous=sides.get(i);
        const side=ds>4?1:ds< -4?-1:previous;
        if(previous===-1&&side===1)passedPlayer=true;sides.set(i,side);
        if(r.boosting)boostFrames++;
      });
      if(firstLapPosition===null&&s.completedLaps>=1)firstLapPosition=s.field.position;
      if(s.completedLaps>=s.lapsTotal&&s.opponents.every(r=>r.finished))break;
      if(s.stageTimeSec>maxSec)break;
    }
    const times=s.opponents.map(r=>r.finished?r.lapStartedAt:null),stats=s.field.stats;
    return {course,index,seed,fieldSeed,enabled,mode,wide,entry,apex,entryInstantWide,entryCars,startSnapshot,startZoneComplete:apex!==null&&[s,...s.opponents].every(r=>r.s>apex),passedPlayer,firstLapPosition,
      passes:stats.passes,crashes:stats.crashes.length,playerCrashes:s.stageCrashes,
      pileUp:new Set(stats.crashes.filter(c=>c.t<=30).map(c=>c.index)).size>=3,
      finished:times.filter(v=>v!==null).length,playerFinished:s.completedLaps>=s.lapsTotal,
      meanCpuTime:times.every(v=>v!==null)?average(times):null,boostFrames,simSec:s.stageTimeSec};
  }finally{
    try{app?.dispose();}finally{
      if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;
      if(cancel)Object.defineProperty(globalThis,'cancelAnimationFrame',cancel);else delete globalThis.cancelAnimationFrame;
    }
  }
}
if(process.argv[2]==='--case')console.log(JSON.stringify(measureRace(JSON.parse(process.argv[3]))));

export function summarizeRacecraft(rows,{courses,races}){
  const findings=[];
  const summary=courses.map(course=>{
    const normal=rows.filter(r=>r.course===course&&r.mode==='normal'),on=normal.filter(r=>r.enabled);
    const off=normal.filter(r=>!r.enabled),slow=rows.filter(r=>r.course===course&&r.mode==='slow'&&r.enabled);
    const nitro=rows.filter(r=>r.course===course&&r.mode==='nitro'&&r.enabled);
    const wide=on.filter(r=>r.wide).length;
    const paired=on.filter(r=>r.startSnapshot?.pairs?.length>=2).length;
    const spread=on.filter(r=>Number.isFinite(r.startSnapshot?.lateralSpread)&&r.startSnapshot.lateralSpread>=3).length;
    const baselinePaired=off.filter(r=>r.startSnapshot?.pairs?.length>=2).length;
    const baselineSpread=off.map(r=>r.startSnapshot?.lateralSpread);
    const passesOn=average(on.map(r=>r.passes)),passesOff=average(off.map(r=>r.passes));
    const timeChanges=on.map(r=>{const before=off.find(b=>b.index===r.index);return before?.meanCpuTime&&r.meanCpuTime ? Math.abs(r.meanCpuTime/before.meanCpuTime-1) : null;});
    const flags=[];
    const cases=rows.filter(r=>r.course===course);
    const keys=new Set(cases.map(r=>`${r.index}/${r.mode}/${r.enabled}`));
    if(cases.length!==races*6||keys.size!==cases.length||
      Array.from({length:races},(_,index)=>['normal','slow','nitro'].flatMap(mode=>
        [false,true].map(enabled=>`${index}/${mode}/${enabled}`))).flat().some(key=>!keys.has(key)))flags.push('missing cases');
    const passingFactor = passesOff >= 8 ? 1.5 : 2;
    const crashRacesOn=on.filter(r=>r.crashes>=8).length,crashRacesOff=off.filter(r=>r.crashes>=8).length;
    const meanCrashesOn=average(on.map(r=>r.crashes)),meanCrashesOff=average(off.map(r=>r.crashes));
    const pileUpsOn=on.filter(r=>r.pileUp).length,pileUpsOff=off.filter(r=>r.pileUp).length;
    if(crashRacesOn>crashRacesOff||meanCrashesOn>meanCrashesOff*1.1||pileUpsOn>pileUpsOff+1)flags.push('crash bound');
    if(timeChanges.some(v=>v===null||v>.02))flags.push('race time changed over 2 percent');
    if(rows.filter(r=>r.course===course).some(r=>r.finished!==7||!r.playerFinished))flags.push('unfinished races');
    findings.push(...flags.map(flag=>course+': '+flag));
    return {course,races,wide,paired,spread,baselinePaired,baselineMeanSpread:baselineSpread.every(Number.isFinite)?average(baselineSpread):null,passesOn,passesOff,passingFactor,crashRacesOn,crashRacesOff,meanCrashesOn,meanCrashesOff,pileUpsOn,pileUpsOff,startMeasuresReportOnly:true,passingReportOnly:true,slowPlayerPassed:slow.filter(r=>r.passedPlayer).length,
      nitroFirstAtLapOne:nitro.filter(r=>r.firstLapPosition===1).length,baselineNitroFirstAtLapOne:rows.filter(r=>r.course===course&&r.mode==='nitro'&&!r.enabled&&r.firstLapPosition===1).length,
      maxTimeChange:timeChanges.includes(null)?null:Math.max(...timeChanges),flags};
  });
  const complete=races>=20&&['panorama-ridge','tremblant-woods','pacific-canyon'].every(c=>courses.includes(c));
  return {complete,passed:complete&&findings.length===0,findings,summary,rows};
}
async function main(args){
  const option=name=>{const at=args.indexOf(name);return at<0?null:args[at+1];};
  const races=Number(option('--races')??20),jobs=Number(option('--jobs')??4);
  if(!Number.isInteger(races)||races<1||!Number.isInteger(jobs)||jobs<1||jobs>4)throw Error('Use positive races and jobs1 to4');
  const courses=(option('--courses')??'panorama-ridge,tremblant-woods,pacific-canyon').split(',');
  const modes=(option('--modes')??'normal,slow,nitro').split(',');
  if(modes.some(m=>!['normal','slow','nitro'].includes(m)))throw Error('Unknown mode');
  const cases=[];for(const course of courses)for(let index=0;index<races;index++)for(const mode of modes)for(const enabled of [false,true])cases.push({course,index,enabled,mode});
  const rows=[];let cursor=0;
  async function worker(){while(cursor<cases.length){
    const item=cases[cursor++];
    const row=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--case',JSON.stringify(item)],{windowsHide:true,stdio:['ignore','pipe','pipe']});
      let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
      child.on('error',reject);child.on('exit',code=>{if(code!==0)return reject(Error(JSON.stringify(item)+' '+stderr));try{resolve(JSON.parse(stdout));}catch(error){reject(error);}});
    });
    rows.push(row);if(rows.length%12===0||rows.length===cases.length)process.stderr.write('Measured '+rows.length+'/'+cases.length+' races\n');
  }}
  await Promise.all(Array.from({length:jobs},worker));
  rows.sort((a,b)=>a.course.localeCompare(b.course)||a.index-b.index||a.mode.localeCompare(b.mode)||Number(a.enabled)-Number(b.enabled));
  const result=summarizeRacecraft(rows,{courses,races}),output=option('--output');
  if(output)writeFileSync(output,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({...result,rows:undefined},null,2));
  if(args.includes('--check')&&!result.passed)process.exitCode=1;
}
if(process.argv[1]===fileURLToPath(import.meta.url)&&process.argv[2]!=='--case')main(process.argv.slice(2)).catch(error=>{console.error(error);process.exitCode=1;});
