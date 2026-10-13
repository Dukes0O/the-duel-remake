// Existing circuits' opening pile-up rate: thirty complete standard races per difficulty.
// One process, existing legal driver/seeds, and disposable course ownership.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,relative,sep,join} from 'node:path';
import {App} from '../src/app.js';
import {COURSE} from '../src/config.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {ownTestCourses} from './career-fixture.mjs';
import {DIFFICULTIES,TARGETS,runRace,summarize} from './race-field-balance.mjs';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));

export async function runAzureRate(outputDir, courseId = 'azure-riviera') {
  const stage = COURSE.findIndex(course => course.id === courseId);
  assert.ok(stage >= 0, 'Existing circuit must exist: ' + courseId);
  const evidenceRoot=resolve(root,'.evidence');
  const output=resolve(root,outputDir);
  const inside=relative(evidenceRoot,output);
  assert.ok(inside&&inside!=='..'&&!inside.startsWith('..'+sep)&&!inside.includes(':'),
    'Rate output belongs below ignored integration evidence.');
  const git=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(git.status,0,'Source commit must be known.');
  const sourceCommit=git.stdout.trim();
  const originalStart=App.prototype.startCampaign;
  const results=[];
  const setup={memoryOnly:true,courseAccess:'existing ownTestCourses before native start',
    driver:'existing runRace/installTestDriver',seeds:'existing raceSeeds',jobs:1,
    fieldSize:8,laps:3,syntheticFinishes:false,runtimeChanges:false,prototypeRestored:false};
  App.prototype.startCampaign=function(options) {
    const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage')?.value;
    assert.ok(storage&&typeof storage.getItem==='function'&&typeof window==='undefined',
      'The existing runRace memory facade must exist before course ownership.');
    ownTestCourses(this);
    return originalStart.call(this,options);
  };
  try {
    for(const difficulty of DIFFICULTIES)for(let index=0;index<30;index++) {
      let lastDuel;
      const result=runRace(difficulty,index,{startStage:stage,onStep:duel=>{
        assert.equal(duel.course.def.id,courseId);
        assert.equal(duel.state.mode,'grandprix');
        assert.equal(duel.state.field.size,8);
        assert.equal(duel.state.lapsTotal,3);
        lastDuel=duel;
      }});
      assert.ok(lastDuel,'Native race must execute.');
      const state=lastDuel.state;
      results.push({...result,actualSeed:lastDuel.seed,layoutFingerprint:courseFingerprint(lastDuel.course),
        raceFingerprint:createHash('sha256').update(JSON.stringify(state)).digest('hex'),
        actualCompletedLaps:state.completedLaps,
        allComputerFinished:state.opponents.every(racer=>racer.finished)});
      if((index+1)%5===0)console.log(`${difficulty}: ${index+1}/30 full races; `+
        `${results.filter(row=>row.cpuDifficulty===difficulty&&row.pileUp).length} opening pile-ups.`);
    }
  } finally {
    App.prototype.startCampaign=originalStart;
    assert.equal(App.prototype.startCampaign,originalStart,'Native App prototype must be restored.');
    setup.prototypeRestored=true;
  }
  const summary=summarize(results);
  const verdict=Object.fromEntries(DIFFICULTIES.map(difficulty=>[difficulty,{
    races:summary[difficulty].races,pileUps:summary[difficulty].pileUps,
    rate:summary[difficulty].pileUpRate,maximumRate:TARGETS.pileUpRate,
    pass:summary[difficulty].pileUpRate<=TARGETS.pileUpRate+1e-9}]));
  await mkdir(output,{recursive:true});
  await writeFile(join(output,'azure-rate.json'),JSON.stringify({sourceCommit,courseId,setup,summary,verdict,results},null,2)+'\n');
  console.log(JSON.stringify({sourceCommit,courseId,summary,verdict},null,2));
  return verdict;
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url) {
  if(![4,6].includes(process.argv.length)||process.argv[2]!=='--output-dir'||
      (process.argv.length===6&&process.argv[4]!=='--course'))
    throw Error('Usage: node tools/gp-existing-rate.mjs --output-dir .evidence/<date>/<card>/<run> [--course ID]');
  const verdict=await runAzureRate(process.argv[3],process.argv[5]);
  if(Object.values(verdict).some(row=>!row.pass))process.exitCode=1;
}
