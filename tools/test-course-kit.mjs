import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash, randomUUID} from 'node:crypto';
import {cp, mkdir, mkdtemp, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {join, resolve, relative} from 'node:path';
import {Course} from '../src/course.js';
import {courseFingerprint} from '../src/track-analysis.js';
import {TREMBLANT_WOODS} from '../src/circuits/tremblant-woods.js';
import {TREMBLANT_SNOW} from '../src/circuits/tremblant-snow.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import {PANORAMA_RIDGE} from '../src/circuits/panorama-ridge.js';
import {SUMMIT_RUN,manifest as summitManifest} from '../src/circuits/summit-run.js';
import {SUMMIT_TIME_ATTACK,manifest as attackManifest} from '../src/circuits/summit-time-attack.js';
import {SUMMIT_ATTACK_ID,isSummitAttack,summitAttackTargets,summitAttackMedal} from '../src/summit-attack.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const originals = [TREMBLANT_WOODS, TREMBLANT_SNOW, HARBOUR_LIGHTS, PANORAMA_RIDGE];
const api = await import('../src/circuit-manifests.js').catch(() => null);
const fixtureApi = await import('./course-fixtures.mjs').catch(() => null);

function requireApi() {
  assert.ok(api && fixtureApi, 'course registry and fixture loaders are missing');
}

test('manifests derive current registration, flags, prices and GP membership without mutation', async () => {
  requireApi();
  const {ALL_CIRCUITS, circuitsEnabled} = await import('../src/circuits/index.js');
  const {FEATURE_STATES, createFeatureFlags} = await import('../src/feature-flags.js');
  const {COURSE_PRICES} = await import('../src/course-access.js');
  const {GRAND_PRIX_COURSES} = await import('../src/race-field.js');
  assert.deepEqual(ALL_CIRCUITS.map(row => row.id), api.CIRCUIT_MANIFESTS.map(row => row.id));
  for (const manifest of api.CIRCUIT_MANIFESTS) {
    assert.ok(Object.isFrozen(manifest));
    assert.equal(FEATURE_STATES[manifest.flag], manifest.state);
    assert.equal(COURSE_PRICES[manifest.id], manifest.price);
    assert.equal(GRAND_PRIX_COURSES.includes(manifest.id), manifest.grandPrix);
  }
  const off = createFeatureFlags({storage: null, qa: false});
  const {COURSE} = await import('../src/config.js');
  const released = api.CIRCUIT_MANIFESTS.filter(row => row.state === 'on').map(row => row.id);
  assert.deepEqual(circuitsEnabled(off).map(row => row.id), released);
  assert.deepEqual(circuitsEnabled(off).map(row => COURSE.indexOf(row)), released.map(id => { const m = api.CIRCUIT_MANIFESTS.find(row => row.id === id); return m.slot ?? api.BASE_COURSE_COUNT + released.filter(id => api.CIRCUIT_MANIFESTS.find(row => row.id === id).slot === undefined).indexOf(id); }));
  const on = createFeatureFlags({storage: null, qa: true, search: '?flags=' + api.CIRCUIT_MANIFESTS.map(row => row.flag).join(',')});
  assert.deepEqual(circuitsEnabled(on).map(row => row.id), api.CIRCUIT_MANIFESTS.map(row => row.id));
});

test('derived public stage preserves exact authored generation, physical features and reference identity', async () => {
  requireApi();
  const {ALL_CIRCUITS} = await import('../src/circuits/index.js');
  for (const original of originals) {
    const view = ALL_CIRCUITS.find(row => row.id === original.id), before = JSON.stringify(original);
    assert.equal(view.stage, original.stage);
    assert.equal(view, original);
    assert.ok(Object.isFrozen(view));
    for (const seed of [1989, 42, 17]) {
      const authored = new Course(original, seed), derived = new Course(view, seed);
      const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
      assert.equal(hash(derived.samples), hash(authored.samples), 'exact complete unrounded sample data');
      assert.equal(hash(derived.features), hash(authored.features), 'exact complete physical feature data');
      assert.equal(courseFingerprint(derived), courseFingerprint(authored));
    }
    assert.equal(JSON.stringify(original), before, 'registry never mutates the authored definition');
  }
});

test('duplicate ids/flags/order and malformed manifests cannot silently register', () => {
  requireApi();
  const manifest = api.CIRCUIT_MANIFESTS[0], circuit = originals[0];
  const module = {manifest, circuit};
  assert.throws(() => api.registerCircuits([module, module]), /Duplicate/);
  assert.deepEqual(api.registerCircuits([{helper:()=>42}]), [], 'helper-only module is skipped');
  assert.throws(() => api.registerCircuits([{circuit}]), /manifest/i, 'real circuit without a manifest must fail');
  for (const change of [{price: -1}, {state: 'future'}, {grandPrix: 'yes'}, {releaseOrder: -1}, {driver: null}])
    assert.throws(() => api.registerCircuits([{circuit, manifest: {...manifest, ...change}}]), /manifest/i);
});


test('future free variants require a valid default GP manifest without changing old metadata', () => {
  requireApi();
  const original=api.CIRCUIT_ENTRIES[0];
  const parent={manifest:original.manifest,circuit:original.definition};
  const descriptor={kind:'default-gp-podium',defaultEventId:original.manifest.id};
  const child={manifest:{...original.manifest,id:'career-test-night',flag:'career-test-night',price:0,
    releaseOrder:1000,unlock:descriptor},circuit:{...original.definition,id:'career-test-night',flag:'career-test-night',stage:1000}};
  const before=JSON.stringify([parent,child]);
  const registered=api.registerCircuits([parent,child]);
  assert.deepEqual(registered[1].manifest.unlock,descriptor);
  assert.ok(Object.isFrozen(registered[1].manifest.unlock));
  assert.notEqual(registered[1].manifest.unlock,descriptor,'registry owns the frozen descriptor clone');
  assert.equal(JSON.stringify([parent,child]),before,'registration never mutates authored inputs');
  assert.deepEqual(registered[0].manifest,original.manifest,'old default manifest stays exact');
  for(const unlock of [null,{},[],{kind:'other',defaultEventId:original.manifest.id},
    {kind:'default-gp-podium',defaultEventId:'missing-default'},
    {kind:'default-gp-podium',defaultEventId:'career-test-night'},
    {...descriptor,extra:true}])
    assert.throws(()=>api.registerCircuits([parent,{...child,manifest:{...child.manifest,unlock}}]),/unlock|default/i);
  assert.throws(()=>api.registerCircuits([parent,{...child,manifest:{...child.manifest,price:1}}]),/unlock|price/i);
  assert.throws(()=>api.registerCircuits([{...parent,manifest:{...parent.manifest,grandPrix:false}},child]),/default|Grand Prix/i);
  const next={manifest:{...child.manifest,id:'career-test-reverse',flag:'career-test-reverse',releaseOrder:1001,
    unlock:{kind:'default-gp-podium',defaultEventId:'career-test-night'}},
    circuit:{...child.circuit,id:'career-test-reverse',flag:'career-test-reverse',stage:1001}};
  assert.throws(()=>api.registerCircuits([parent,child,next]),/default|chain/i);
  assert.throws(()=>api.registerCircuits([{...child,manifest:{...child.manifest,
    unlock:{kind:'default-gp-podium',defaultEventId:'career-test-reverse'}}},next]),/default|chain|cycle/i);
});
test('Summit Attack is a narrow shared-switch child with parent-only free access',()=>{
  requireApi();
  const parent={manifest:summitManifest,circuit:SUMMIT_RUN};
  const child={manifest:attackManifest,circuit:SUMMIT_TIME_ATTACK};
  const before=JSON.stringify([parent,child]);
  const registered=api.registerCircuits([child,parent]);
  assert.deepEqual(registered.map(row=>row.manifest.id),['summit-run',SUMMIT_ATTACK_ID]);
  assert.equal(registered[1].generationStage,SUMMIT_RUN.stage);
  assert.ok(Object.isFrozen(registered[1].manifest.unlock));
  assert.equal(JSON.stringify([parent,child]),before);
  assert.equal(attackManifest.releaseOrder,6);
  assert.deepEqual(attackManifest.unlock,{kind:'owned-course',defaultEventId:'summit-run'});
  for(const patch of [{price:1},{grandPrix:true},{state:'dev'},{flag:'another-switch'},
    {unlock:{kind:'owned-course',defaultEventId:'missing'}},
    {unlock:{kind:'owned-course',defaultEventId:SUMMIT_ATTACK_ID}}]){
    const m={...attackManifest,...patch},circuit={...SUMMIT_TIME_ATTACK,flag:m.flag};
    assert.throws(()=>api.registerCircuits([parent,{manifest:m,circuit}]),/unlock|parent|owned|flag|state/i);
  }
  const {unlock,...ordinaryManifest}=attackManifest;
  const other={manifest:{...ordinaryManifest,id:'unrelated-shared-flag',releaseOrder:7},
    circuit:{...SUMMIT_TIME_ATTACK,id:'unrelated-shared-flag'}};
  assert.throws(()=>api.registerCircuits([parent,other]),/unlock|Duplicate/i);
  assert.throws(()=>api.registerCircuits([child]),/parent|default/i);
});
test('Summit Attack preserves the authored parent road and has only the solo event overrides',()=>{
  const before=JSON.stringify(SUMMIT_RUN);
  for(const seed of [1989,42]){
    const parent=new Course(SUMMIT_RUN,seed),attack=new Course(SUMMIT_TIME_ATTACK,seed);
    assert.deepEqual(attack.samples,parent.samples,'same complete unrounded road samples');
  }
  for(const key of ['script','scriptDefaults','pitLane','roadBranches','galleries','kitPlacements','surfacePatches','snowWorld','lightPath'])
    assert.deepEqual(SUMMIT_TIME_ATTACK[key],SUMMIT_RUN[key],key+' remains exact');
  assert.equal(SUMMIT_TIME_ATTACK.id,SUMMIT_ATTACK_ID);
  assert.equal(SUMMIT_TIME_ATTACK.closed,false);
  assert.equal(SUMMIT_TIME_ATTACK.defaultMode,'timetrial');
  assert.equal(SUMMIT_TIME_ATTACK.laps,1);
  assert.equal(SUMMIT_TIME_ATTACK.fieldSize,1);
  assert.equal(SUMMIT_TIME_ATTACK.hasRival,false);
  assert.equal(SUMMIT_TIME_ATTACK.noCombat,true);
  assert.equal(SUMMIT_TIME_ATTACK.noTraffic,true);
  assert.equal(JSON.stringify(SUMMIT_RUN),before);
});
test('Attack medals use inclusive rounded tenths without writing a medal save field',()=>{
  assert.equal(isSummitAttack(SUMMIT_ATTACK_ID),true);
  assert.equal(isSummitAttack({id:SUMMIT_ATTACK_ID}),true);
  for(const value of [null,{},'summit-run','summit-time-attack-extra'])assert.equal(isSummitAttack(value),false);
  const targets=summitAttackTargets(101);
  assert.deepEqual(targets,{gold:104.1,silver:109.1,bronze:116.2});
  assert.ok(Object.isFrozen(targets));
  for(const [time,medal]of [[104.1,'gold'],[104.10001,'silver'],[109.1,'silver'],[109.10001,'bronze'],[116.2,'bronze'],[116.20001,null]])
    assert.equal(summitAttackMedal(time,targets),medal);
  for(const value of [undefined,null,NaN,Infinity,-1,0,'101',Number.MAX_VALUE])assert.throws(()=>summitAttackTargets(value),/baseline/i);
  for(const value of [undefined,null,NaN,Infinity,-1,0,'101'])assert.equal(summitAttackMedal(value,targets),null);
  for(const invalid of [null,{}, {gold:110,silver:109,bronze:116}, {...targets,bronze:NaN}])
    assert.equal(summitAttackMedal(100,invalid),null);
});

test('adding only one course and its own reference/replay/signature files registers every consumer', async () => {
  requireApi();
  const id = 'fac04-test-' + randomUUID().replaceAll('-', '');
  await mkdir(join(root, '.qa-dist'), {recursive: true});
  const fixtureRoot = await mkdtemp(join(root, '.qa-dist', 'fac04-test-'));
  const created = [], paths = [join(fixtureRoot, 'src/circuits', id + '.js'),
    join(fixtureRoot, 'src/generated/reference-laps', id + '.json'),
    join(fixtureRoot, 'tools/replays/courses', id + '.json'),
    join(fixtureRoot, 'tools/fixtures/world-signatures', id + '.json')];
  async function own(path, value) {
    assert.ok(!relative(fixtureRoot, path).startsWith('..'));
    await writeFile(path, value, {flag: 'wx'}); created.push(path);
  }
  try {
    await cp(join(root, 'src'), join(fixtureRoot, 'src'), {recursive: true});
    await cp(join(root, 'package.json'), join(fixtureRoot, 'package.json'));
    await cp(join(root, 'tools/replays'), join(fixtureRoot, 'tools/replays'), {recursive: true});
    await cp(join(root, 'tools/fixtures/world-signatures'), join(fixtureRoot, 'tools/fixtures/world-signatures'), {recursive: true});
    await cp(join(root, 'tools/course-fixtures.mjs'), join(fixtureRoot, 'tools/course-fixtures.mjs'));
    for (const name of ['test-feature-flags.mjs', 'test-wasteland-beta.mjs'])
      await cp(join(root, 'tools', name), join(fixtureRoot, 'tools', name));
    await cp(join(root, 'tools/scenarios'), join(fixtureRoot, 'tools/scenarios'), {recursive: true});
    await mkdir(join(fixtureRoot, 'tools/blender'), {recursive: true});
    await cp(join(root, 'tools/blender/gunn-turret.json'), join(fixtureRoot, 'tools/blender/gunn-turret.json'));
    await own(paths[0], `import {TREMBLANT_WOODS} from './tremblant-woods.js';
export const circuit=Object.freeze({...TREMBLANT_WOODS,id:${JSON.stringify(id)},flag:${JSON.stringify(id)}});
export const manifest=Object.freeze({id:${JSON.stringify(id)},flag:${JSON.stringify(id)},state:'dev',price:1900,grandPrix:true,releaseOrder:${Math.max(...api.CIRCUIT_MANIFESTS.map(row => row.releaseOrder)) + 1},driver:{car:'stuttgart_959s',driverId:'club',controller:'racing-line',skill:.95}});
`);
    await own(paths[1], JSON.stringify({[id + '|fixed']: {eventId: id, route: 'fixed', marker: 'own reference'}}));
    await own(paths[2], JSON.stringify({eventId: id, cases: [{id: id + '-duel', eventId: id, category: 'duel', mode: 'duel', car: 'falcone_f42'}], fingerprints: {[id + '-duel']: {'30': 'own fingerprint', '60': 'own fingerprint', '144': 'own fingerprint'}}}));
    await own(paths[3], JSON.stringify({[id]: {hash: 'own signature'}}));
    const code = `
const {FEATURE_STATES,createFeatureFlags}=await import('./src/feature-flags.js');
const {COURSE}=await import('./src/config.js');
const {circuitsEnabled}=await import('./src/circuits/index.js');
const {COURSE_PRICES}=await import('./src/course-access.js');
const {GRAND_PRIX_COURSES}=await import('./src/race-field.js');
const {referenceLap}=await import('./src/reference-laps.js');
const {loadReplayCatalog,loadWorldSignatures}=await import('./tools/course-fixtures.mjs');
const flags=createFeatureFlags({storage:null,qa:true,search:'?flags=${id}'});
const definitions=circuitsEnabled(flags);
const replay=loadReplayCatalog({definitions});
console.log(JSON.stringify({state:FEATURE_STATES['${id}'],price:COURSE_PRICES['${id}'],gp:GRAND_PRIX_COURSES.includes('${id}'),
course:${api.BASE_COURSE_COUNT}+definitions.findIndex(row=>row.id==='${id}'),ref:referenceLap('${id}')?.marker,
replay:replay.fixture.cases.some(row=>row.eventId==='${id}'),fingerprint:replay.expected.fingerprints['${id}-duel']?.['30'],world:loadWorldSignatures()['${id}']?.hash,production:createFeatureFlags({storage:null,qa:false}).enabled('${id}'),listed:COURSE.some(row=>row.id==='${id}')}));`;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
    assert.equal(child.status, 0, child.stderr);
    assert.deepEqual(JSON.parse(child.stdout), {state: 'dev', price: 1900, gp: true, course: api.BASE_COURSE_COUNT + api.CIRCUIT_MANIFESTS.filter(row => row.state === 'on').length,
      ref: 'own reference', replay: true, fingerprint: 'own fingerprint', world: 'own signature', production:false, listed:false});
    for (const state of ['dev', 'on']) {
      if (state === 'on') {
        const {readFile} = await import('node:fs/promises');
        await writeFile(paths[0], (await readFile(paths[0], 'utf8')).replace("state:'dev'", "state:'on'"));
      }
      const catalog = spawnSync(process.execPath, ['--input-type=module', '-e', code], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
      assert.equal(catalog.status, 0, catalog.stderr);
      const result = JSON.parse(catalog.stdout);
      assert.equal(result.state, state);
      assert.equal(result.production, state === 'on');
      assert.equal(result.listed, state === 'on');
      for (const name of ['test-feature-flags.mjs', 'test-wasteland-beta.mjs']) {
        const flags = spawnSync(process.execPath, ['tools/' + name], {cwd: fixtureRoot, encoding: 'utf8', windowsHide: true});
        assert.equal(flags.status, 0, `${state} course must need no shared flag test edit: ${flags.stdout} ${flags.stderr}`);
      }
    }

    // Extend this existing disposable FAC04 tree, never the runtime catalogue.
    const variantId=id+'-night';
    await own(join(fixtureRoot,'src/circuits',variantId+'.js'), `import {circuit as base} from './${id}.js';
export const circuit=Object.freeze({...base,id:'${variantId}',flag:'${variantId}',name:'Fixture Night'});
export const manifest=Object.freeze({id:'${variantId}',flag:'${variantId}',state:'on',price:0,grandPrix:true,
releaseOrder:${Math.max(...api.CIRCUIT_MANIFESTS.map(row=>row.releaseOrder))+2},
unlock:{kind:'default-gp-podium',defaultEventId:'${id}'},
driver:{car:'stuttgart_959s',driverId:'club',controller:'racing-line',skill:.95}});
`);
    const accessCode=`
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value))};
const {COURSE}=await import('./src/config.js');
const {createProfile,normalizeProfile,settleRace}=await import('./src/progression.js');
const {COURSE_PRICES,normalizeCourseAccess,isCourseUnlocked,purchaseCourse,courseUnlockRequirement}=await import('./src/course-access.js');
const {normalizeRaceSettings}=await import('./src/race-settings.js');
const {courseAccessPanel}=await import('./src/course-access-ui.js');
const {App}=await import('./src/app.js');
const parent=COURSE.find(course=>course.id==='${id}'),variant=COURSE.find(course=>course.id==='${variantId}');
assert.ok(parent&&variant,'actual scratch registration supplies both authored definitions');
const parentIndex=COURSE.indexOf(parent),variantIndex=COURSE.indexOf(variant),fresh=createProfile();
assert.equal(COURSE_PRICES[variant.id],0);
assert.ok(!fresh.courses.unlocked.includes(variant.id),'zero price cannot include a gated variant');
const owned={...fresh,credits:10000,courses:{version:1,unlocked:[...fresh.courses.unlocked,parent.id]}};
const prospective={...fresh,grandPrixPodiums:[parent.id]};
const earned={...owned,grandPrixPodiums:[parent.id]};
for(const profile of [fresh,owned,prospective,{...fresh,courses:{version:1,unlocked:[variant.id]}},
  {...owned,grandPrixPodiums:[variant.id]}, {...owned,grandPrixPodiums:'bad'},
  {...owned,history:[{eventId:parent.id,completed:true,position:1,won:true,reward:100,key:'old'}]},
  {...owned,personalBests:{[parent.id+'|layout:1']:1}}, {...owned,circuitWins:[parent.id]}]){
 assert.equal(isCourseUnlocked(profile,variant),false,'only owned default plus prospective default podium grants access');
 const bytes=JSON.stringify(profile),attempt=purchaseCourse(profile,variant.id);
 assert.equal(attempt.ok,false);assert.equal(attempt.cost,0);assert.equal(attempt.profile,profile);assert.equal(JSON.stringify(profile),bytes);
 assert.equal(normalizeRaceSettings({eventId:variant.id},profile).eventId,COURSE[0].id,'saved settings cannot enter a locked child');
}
for(const raw of [{courses:{version:1,unlocked:[variant.id]}},
 {history:[{eventId:variant.id,completed:true,won:true,reward:10,key:'old-child'}]},
 {personalBests:{[variant.id+'|layout:1']:1}}, {circuitWins:[variant.id]},
 {activeRace:{runId:'old-child-active',stageId:variant.id,stageIndex:variantIndex,car:'falcone_f42'}}]){
 assert.ok(!normalizeCourseAccess(raw.courses,raw).unlocked.includes(variant.id),'migration never stores a child entitlement');
 assert.equal(isCourseUnlocked(normalizeProfile({...fresh,...raw}),variant),false);
}
assert.equal(isCourseUnlocked(earned,variant),true);
assert.equal(normalizeRaceSettings({eventId:variant.id},earned).eventId,variant.id);
assert.ok(!normalizeProfile({...earned,courses:{version:1,unlocked:[...owned.courses.unlocked,variant.id]}}).courses.unlocked.includes(variant.id));
assert.equal(isCourseUnlocked(normalizeProfile(earned),variant),true,'derived access survives normal profile reload without a child ledger');
const earnedBytes=JSON.stringify(earned),freeAttempt=purchaseCourse(earned,variant);
assert.equal(freeAttempt.ok,false);assert.equal(freeAttempt.cost,0);assert.equal(freeAttempt.profile,earned);assert.equal(JSON.stringify(earned),earnedBytes);
const result={runId:'future-default-podium',stageIndex:parentIndex,car:'falcone_f42',mode:'grandprix',
 grandPrixCareerEnabled:true,position:3,fieldSize:8,won:false,completed:true,laps:parent.grandPrixLaps??3,
 timeSec:100,difficulty:'casual',cpuDifficulty:'medium',driverId:'club',clean:false,seed:1989,layoutVersion:parent.layoutVersion??1};
const settled=settleRace(owned,result);assert.equal(settled.awarded,true);assert.equal(isCourseUnlocked(settled.profile,variant),true,'real validated future default podium grants free access');
const afterRace=JSON.stringify(settled.profile);isCourseUnlocked(settled.profile,variant);normalizeCourseAccess(settled.profile.courses,settled.profile);
assert.equal(JSON.stringify(settled.profile),afterRace,'access reads never award money or rewrite records');
const duplicate=settleRace(settled.profile,result);assert.equal(duplicate.awarded,false);assert.equal(JSON.stringify(duplicate.profile),afterRace);
const previouslySettled={...owned,settledResults:[result.runId+':'+parentIndex]};
assert.equal(isCourseUnlocked(settleRace(previouslySettled,result).profile,variant),false,'replaying an already settled result cannot fabricate its missing podium');
for(const changes of [{mode:'duel'},{mode:'timetrial'},{position:4},{completed:false},{qualifying:true},{practice:true},
 {grandPrixCareerEnabled:false},{laps:1},{stageIndex:variantIndex}]){
 const rejected=settleRace(owned,{...result,...changes,runId:'rejected-'+JSON.stringify(changes)});
 assert.equal(isCourseUnlocked(rejected.profile,variant),false,'only a validated prospective DEFAULT GP top-three finish counts');
}
const requirement=courseUnlockRequirement(variant);
assert.equal(requirement.defaultEventId,parent.id);assert.ok(requirement.condition.includes(parent.name));
const card=profile=>courseAccessPanel(profile,variantIndex,'',{teamRoomEnabled:true}).split('<article').find(row=>row.includes('<h3>'+variant.name+'</h3>')).split('</article>')[0];
const lockedCard=card(owned),openCard=card(settled.profile);
assert.ok(lockedCard.includes(requirement.condition));assert.ok(!lockedCard.includes('data-course-unlock')&&!lockedCard.includes(' CR'));
assert.ok(openCard.includes('data-course-select="'+variant.id+'"'));assert.match(lockedCard,new RegExp('data-team-room="'+variant.id+'"[^>]*disabled'),'a locked variant shows its Team Room entry disabled');
assert.match(openCard,new RegExp('data-team-room="'+variant.id+'"[^>]*aria-label="Study [^"]*" >TEAM ROOM'),'an owned variant opens its Team Room');
// Execute the actual existing router admission body; a missed guard reaches an unavailable dependency and fails.
const router=readFileSync('./src/screen-router.js','utf8');
const newline=String.fromCharCode(10);
const dossierBody=router.split('getDossier(eventId) {')[1].split(newline+'  },'+newline+'  async capture')[0];
const getDossier=new Function('app','COURSE','isCourseUnlocked','courseUnlockRequirement','profile','eventId',dossierBody);
const menuApp={duel:{state:{status:'menu'}},_switches:()=>({enabled:()=>true})};
assert.equal(getDossier(menuApp,COURSE,isCourseUnlocked,courseUnlockRequirement,()=>owned,variant.id),null,'a locked variant cannot open the Team Room');
assert.throws(()=>getDossier(menuApp,COURSE,isCourseUnlocked,courseUnlockRequirement,()=>settled.profile,variant.id),ReferenceError,'an owned variant passes every Team Room admission guard');
const app=new App();app.profile=owned;app._saveProfile();
assert.equal(app.selectCourse(variant.id),false);assert.equal(app.startCampaign({startStage:variantIndex}),false);
app.profile=settled.profile;app._saveProfile();
const selected=app.selectCourse(variant.id);
assert.deepEqual(selected,app.getRaceChoices(),'earned selection returns the actual settings, matching the existing App contract');
assert.equal(selected.startStage,variantIndex,'earned selection admits the actual registered variant');
assert.equal(app.startCampaign({startStage:variantIndex,mode:'duel'}),true);app.returnToMenu();
assert.equal(new App().getRaceChoices().startStage,variantIndex,'real App reload retains earned selection');
assert.equal(app.addPlayer('Variant second player').ok,true);assert.equal(isCourseUnlocked(app.profile,variant),false);
console.log(JSON.stringify({variantAccess:true,temporaryOnly:true}));`;
    const access=spawnSync(process.execPath,['--input-type=module','-e',accessCode],{cwd:fixtureRoot,encoding:'utf8',windowsHide:true});
    assert.equal(access.status,0,access.stdout+' '+access.stderr);
    assert.deepEqual(JSON.parse(access.stdout),{variantAccess:true,temporaryOnly:true});
    // Availability is the actual current COURSE, not merely a known manifest ID.
    const parentBytes=await import('node:fs/promises').then(fs=>fs.readFile(paths[0],'utf8'));
    await writeFile(paths[0],parentBytes.replace("state:'on'","state:'dev'"));
    const unavailableCode=`import assert from 'node:assert/strict';
const {COURSE}=await import('./src/config.js');
const {createProfile}=await import('./src/progression.js');
const {isCourseUnlocked,purchaseCourse}=await import('./src/course-access.js');
assert.ok(!COURSE.some(course=>course.id==='${id}'));
assert.ok(COURSE.some(course=>course.id==='${variantId}'));
const profile={...createProfile(),credits:10000,courses:{version:1,unlocked:['pacific-canyon','${id}','${variantId}']},grandPrixPodiums:['${id}']};
assert.equal(isCourseUnlocked(profile,'${variantId}'),false,'an unavailable default cannot grant a listed child');
const result=purchaseCourse(profile,'${variantId}');assert.equal(result.ok,false);assert.equal(result.profile,profile);assert.equal(result.cost,0);`;
    const unavailable=spawnSync(process.execPath,['--input-type=module','-e',unavailableCode],{cwd:fixtureRoot,encoding:'utf8',windowsHide:true});
    assert.equal(unavailable.status,0,unavailable.stdout+' '+unavailable.stderr);
  } finally {
    assert.equal(process.platform, 'win32', 'test cleanup requires the authorized Recycle Bin');
    const part = relative(join(root, '.qa-dist'), fixtureRoot);
    assert.ok(/^fac04-test-[a-zA-Z0-9]+$/.test(part), 'recycle only the mkdtemp tree this test owns');
    const literal = "'" + fixtureRoot.replaceAll("'", "''") + "'";
    const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
      '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(' + literal + ',[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
    const cleanup = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {windowsHide: true, encoding: 'utf8'});
    assert.equal(cleanup.status, 0, cleanup.stderr);
  }
});


// FAC-04's consumed one-time migration proof is retained in docs/changes/FAC-04.md.
// Per-event reference, replay and world guards remain in their existing suites.
