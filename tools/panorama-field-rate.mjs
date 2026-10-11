// Full-field targets on the authored mountain, with Claude's native .95 driver.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {resolve,relative,sep,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {ownTestCourses} from './career-fixture.mjs';
import {useRacingLine} from './track-script-drive.mjs';
import {DIFFICULTIES,TARGETS,runRace,summarize,checkTargets} from './race-field-balance.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
export async function runPanoramaRate(outputDir){
  const output=resolve(root,outputDir),inside=relative(resolve(root,'.evidence'),output);
  assert.ok(inside&&inside!=='..'&&!inside.startsWith('..'+sep)&&!inside.includes(':'));
  const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(git.status,0);
  const sourceCommit=git.stdout.trim(),originalStart=App.prototype.startCampaign;
  const added=!COURSE.some(def=>def.id===PANORAMA_RIDGE.id);
  if(added)COURSE.push(PANORAMA_RIDGE);
  const stage=COURSE.findIndex(def=>def.id===PANORAMA_RIDGE.id);
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
    for(const difficulty of DIFFICULTIES)for(let index=0;index<30;index++){
      let installed=false,lastDuel;
      const result=runRace(difficulty,index,{startStage:stage,car:'falcone_f42',onStep:duel=>{
        assert.equal(duel,activeApp.duel);
        assert.equal(duel.course.def.id,'panorama-ridge');
        assert.equal(duel.state.mode,'grandprix');
        assert.equal(duel.state.field.size,8);
        assert.equal(duel.state.lapsTotal,3);
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
    if(added)COURSE.splice(COURSE.findIndex(def=>def.id===PANORAMA_RIDGE.id),1);
    assert.equal(App.prototype.startCampaign,originalStart);
  }
  const summary=summarize(results),failures=checkTargets(summary);
  await mkdir(output,{recursive:true});
  const report={sourceCommit,setup:{memoryOnly:true,driver:'native useRacingLine .95; existing field avoidance',
    car:'falcone_f42',seeds:'existing raceSeeds',jobs:1,syntheticResults:false,prototypeRestored:true},
    targets:TARGETS,summary,failures,results};
  await writeFile(join(output,'panorama-rate.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({sourceCommit,summary,failures},null,2));
  return report;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  if(process.argv.length!==4||process.argv[2]!=='--output-dir')
    throw Error('Usage: panorama-field-rate.mjs --output-dir .evidence/<date>/<card>/<run>');
  const report=await runPanoramaRate(process.argv[3]);
  if(report.failures.length)process.exitCode=1;
}
