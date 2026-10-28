// Full-field targets on the authored forest circuit, with Claude's native .95 driver.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,relative,sep,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {ARDENNES_FOREST} from '../src/circuits/ardennes-forest.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {ownTestCourses} from './career-fixture.mjs';
import {useRacingLine} from './track-script-drive.mjs';
import {DIFFICULTIES,TARGETS,raceSeeds,runRace,summarize,checkTargets} from './race-field-balance.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
function evidenceDirectory(outputDir){
  const output=resolve(root,outputDir),inside=relative(resolve(root,'.evidence'),output);
  assert.ok(inside&&inside!=='..'&&!inside.startsWith('..'+sep)&&!inside.includes(':'));
  return output;
}
export async function runArdennesRate(outputDir,{difficulties=DIFFICULTIES}={}){
  assert.ok(Array.isArray(difficulties)&&difficulties.length&&new Set(difficulties).size===difficulties.length&&difficulties.every(d=>DIFFICULTIES.includes(d)));
  const output=evidenceDirectory(outputDir);
  const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(git.status,0);
  const sourceCommit=git.stdout.trim(),originalStart=App.prototype.startCampaign;
  const added=!COURSE.some(def=>def.id===ARDENNES_FOREST.id);
  if(added)COURSE.push(ARDENNES_FOREST);
  const stage=COURSE.findIndex(def=>def.id===ARDENNES_FOREST.id);
  let activeApp;
  const results=[];
  App.prototype.startCampaign=function(options){
    const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage')?.value;
    assert.ok(storage&&typeof window==='undefined','Existing memory-only runRace must own the App.');
    ownTestCourses(this);
    activeApp=this;
    return originalStart.call(this,options);
  };
  try{
    for(const difficulty of difficulties)for(let index=0;index<30;index++){
      let installed=false,lastDuel;
      const result=runRace(difficulty,index,{startStage:stage,car:'stuttgart_959s',onStep:duel=>{
        assert.equal(duel,activeApp.duel);
        assert.equal(duel.course.def.id,'ardennes-forest');
        assert.equal(duel.state.mode,'grandprix');
        assert.equal(duel.state.field.size,8);
        assert.equal(duel.state.lapsTotal,2);
        if(!installed){
          assert.equal(duel.state.status,'countdown','The native driver must be installed before go.');
          useRacingLine(activeApp,.95);installed=true;
        }
        lastDuel=duel;
      }});
      assert.ok(installed&&lastDuel);
      const state=lastDuel.state;
      results.push({...result,actualCompletedLaps:state.completedLaps,
        allComputerFinished:state.opponents.every(racer=>racer.finished),
        layoutFingerprint:courseFingerprint(lastDuel.course),
        raceFingerprint:createHash('sha256').update(JSON.stringify(state)).digest('hex')});
      if((index+1)%5===0)console.log(difficulty+': '+(index+1)+'/30 complete attempts.');
    }
  }finally{
    App.prototype.startCampaign=originalStart;activeApp=null;
    if(added)COURSE.splice(COURSE.findIndex(def=>def.id===ARDENNES_FOREST.id),1);
    assert.equal(App.prototype.startCampaign,originalStart);
  }
  const summary=summarize(results),failures=checkTargets(summary);
  await mkdir(output,{recursive:true});
  const report={sourceCommit,completeCoverage:difficulties.length===DIFFICULTIES.length,setup:{memoryOnly:true,driver:'native useRacingLine .95; existing field avoidance',
    car:'stuttgart_959s',seeds:'existing raceSeeds',jobs:1,syntheticResults:false,prototypeRestored:true},
    targets:TARGETS,summary,failures,results};
  await writeFile(join(output,'ardennes-rate.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({sourceCommit,summary,failures},null,2));
  return report;
}
export async function aggregateArdennesRate(outputDir,inputDirs){
  assert.equal(inputDirs.length,3,'All three isolated difficulty reports are required.');
  const reports=await Promise.all(inputDirs.map(async input=>JSON.parse(
    await readFile(join(evidenceDirectory(input),'ardennes-rate.json'),'utf8'))));
  const sourceCommit=reports[0].sourceCommit,results=reports.flatMap(report=>report.results);
  assert.ok(/^[a-f0-9]{40}$/.test(sourceCommit));
  assert.ok(reports.every(report=>report.sourceCommit===sourceCommit&&report.completeCoverage===false&&
    report.setup.memoryOnly===true&&report.setup.prototypeRestored===true&&report.results.length===30),
    'Inputs must be isolated complete thirty-race reports from the same source.');
  assert.equal(results.length,90);
  for(const difficulty of DIFFICULTIES){
    const rows=results.filter(row=>row.cpuDifficulty===difficulty);
    assert.equal(rows.length,30,'Every difficulty needs thirty native attempts.');
    assert.equal(new Set(rows.map(row=>row.index)).size,30);
    for(const row of rows){
      assert.ok(Number.isInteger(row.index)&&row.index>=0&&row.index<30);
      const expected=raceSeeds(row.index);
      assert.equal(row.seed,expected.seed);assert.equal(row.fieldSeed,expected.fieldSeed);
      assert.match(row.raceFingerprint,/^[a-f0-9]{64}$/);
    }
  }
  const summary=summarize(results),failures=checkTargets(summary);
  const report={sourceCommit,completeCoverage:true,setup:reports[0].setup,
    targets:TARGETS,summary,failures,results};
  const output=evidenceDirectory(outputDir);await mkdir(output,{recursive:true});
  await writeFile(join(output,'ardennes-rate.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({sourceCommit,completeCoverage:true,summary,failures},null,2));
  return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const args=process.argv;
  if(![4,6,8].includes(args.length)||args[2]!=='--output-dir'||
      args.length===6&&args[4]!=='--difficulty'||args.length===8&&args[4]!=='--aggregate')
    throw Error('Usage: ardennes-field-rate.mjs --output-dir .evidence/<date>/<card>/<run> [--difficulty easy|medium|hard | --aggregate EASY_DIR MEDIUM_DIR HARD_DIR]');
  const report=args.length===8?await aggregateArdennesRate(args[3],args.slice(5)):
    await runArdennesRate(args[3],{difficulties:args.length===6?[args[5]]:DIFFICULTIES});
  if(report.failures.length)process.exitCode=1;
}
