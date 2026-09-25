import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join, relative, resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import * as scenario from './scenarios/crew-fighters.mjs';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const baseline = join(root, 'public/assets/models/wasteland/crew/rook.glb');
const candidateDir = join(root, 'art-build/crew/rook-p2');
const candidatePath = join(candidateDir, 'test-private-candidate.glb');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const rel = path => relative(root,path).replaceAll('\\','/');
const sheetTool = join(root,'tools/fidelity-sheet.mjs');

test('private candidate preparation accepts only one local ignored Rook GLB with memory-only review', async () => {
  assert.equal(typeof scenario.prepareRookCandidate, 'function', 'scenario exports its actual candidate validation');
  assert.equal(await scenario.prepareRookCandidate({candidatePath: null, crewOnly: '', root}), null);
  await mkdir(candidateDir, {recursive: true});
  const bytes = readFileSync(baseline);
  await writeFile(candidatePath, bytes);
  try {
    const selected = await scenario.prepareRookCandidate({candidatePath, crewOnly: 'rook', root});
    assert.equal(selected.path, 'art-build/crew/rook-p2/test-private-candidate.glb');
    assert.ok(Buffer.isBuffer(selected.bytes) && selected.bytes.equals(bytes));
    assert.equal(selected.sha256, sha(bytes));
    assert.equal(selected.baselineSha256, sha(readFileSync(baseline)));
    await assert.rejects(() => scenario.prepareRookCandidate({candidatePath, crewOnly: '', root}), /rook|only/i);
    await assert.rejects(() => scenario.prepareRookCandidate({candidatePath: baseline, crewOnly: 'rook', root}), /art-build|ignored|candidate/i);
    await assert.rejects(() => scenario.prepareRookCandidate({candidatePath: '../rook.glb', crewOnly: 'rook', root}), /art-build|outside|path/i);
    await assert.rejects(() => scenario.prepareRookCandidate({candidatePath: join(candidateDir, 'absent.glb'), crewOnly: 'rook', root}), /ENOENT|missing|exist/i);
  } finally { await rm(candidatePath, {force: true}); }
});

test('actual browser install script replaces only same-origin Rook fetch after the private memory guard', async () => {
  assert.equal(typeof scenario.rookCandidateFetchInstallScript, 'function', 'scenario exports its executed browser fetch install');
  const bytes = Buffer.from([1, 9, 8, 9, 0, 4]);
  const base64 = bytes.toString('base64');
  const script = scenario.rookCandidateFetchInstallScript(base64);
  assert.equal(typeof script, 'string');
  const delegated = [];
  const original = async (input, init) => {delegated.push({input, init}); return {delegated: true};};
  class ResponseStub {
    constructor(body, init) {this.body = body; this.init = init;}
    async arrayBuffer() {return Uint8Array.from(this.body).buffer;}
  }
  const window = {name: '__duel_qa_tab_v2:test', location: {href: 'http://127.0.0.1:42001/tools/menu-check.html',
    origin: 'http://127.0.0.1:42001'}, fetch: original};
  Object.defineProperty(window, 'localStorage', {value: new Map(), configurable: true});
  const globals = {window, Response: ResponseStub, URL, Uint8Array, atob, Buffer};
  runInNewContext(script, globals);
  const exact = await window.fetch('/assets/models/wasteland/crew/rook.glb', {cache: 'no-store'});
  assert.deepEqual(Buffer.from(await exact.arrayBuffer()), bytes);
  const queried = await window.fetch('/assets/models/wasteland/crew/rook.glb?v=7');
  assert.deepEqual(Buffer.from(await queried.arrayBuffer()), bytes, 'same-origin Rook pathname still matches with a query');
  for (const url of ['/assets/models/wasteland/crew/nell.glb', '/assets/models/wasteland/crew/rook.glb/extra',
    'https://example.net/assets/models/wasteland/crew/rook.glb']) {
    const init = {signal: 'sentinel'};
    assert.equal((await window.fetch(url, init)).delegated, true);
    assert.deepEqual(delegated.at(-1), {input: url, init}, 'delegation retains exact input and init');
  }
  assert.equal(window.__rookCandidateReview.substitutions, 2);
  const unsafe = {name: 'ordinary-tab', location: window.location, fetch: original};
  Object.defineProperty(unsafe, 'localStorage', {value: new Map(), configurable: true});
  assert.throws(() => runInNewContext(script, {...globals, window: unsafe}), /private|memory|guard/i);
  assert.equal(unsafe.fetch, original, 'failed guard leaves fetch unchanged');
});

test('Rook candidate sheet paths are isolated from unchanged P1 review outputs', () => {
  const plan = mode => {
    const run=spawnSync(process.execPath,[sheetTool,mode,'3','--paths-only'],
      {cwd:root,encoding:'utf8',timeout:10_000});
    assert.equal(run.status,0,run.stderr||run.stdout);
    return JSON.parse(run.stdout);
  };
  const p1=plan('--crew-round'),p2=plan('--crew-p2-round');
  assert.match(p1.directory.replaceAll('\\','/'),/\/\.evidence\/\d{4}-\d{2}-\d{2}\/crew\/round-3$/);
  assert.match(p2.directory.replaceAll('\\','/'),/\/\.evidence\/\d{4}-\d{2}-\d{2}\/crew-p2\/round-3$/);
  assert.equal(p1.summary,join(root,'docs/board/looks/crew/round-3.jpg'));
  assert.equal(p2.summary,join(root,'docs/board/looks/crew-p2/round-3.jpg'));
  assert.equal(p2.manifest,join(p2.directory,'sheet.json'));
});

const tinyPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
function colorPng(red,green,blue){
  const crc=bytes=>{let value=0xffffffff;for(const byte of bytes){value^=byte;
    for(let i=0;i<8;i++)value=(value>>>1)^(value&1?0xedb88320:0);}
    return (value^0xffffffff)>>>0;};
  const chunk=(name,data)=>{const type=Buffer.from(name),length=Buffer.alloc(4),checksum=Buffer.alloc(4);
    length.writeUInt32BE(data.length);checksum.writeUInt32BE(crc(Buffer.concat([type,data])));
    return Buffer.concat([length,type,data,checksum]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(Buffer.from([0,red,green,blue,255]))),chunk('IEND',Buffer.alloc(0))]);
}
async function sheetFixture(mutate=()=>{}){
  await mkdir(join(root,'.evidence'),{recursive:true});
  const directory=await mkdtemp(join(root,'.evidence','test-rook-p2-review-'));
  const candidate=join(directory,'candidate-rook.glb'),picture=join(directory,'frame.png');
  await writeFile(candidate,readFileSync(baseline));await writeFile(picture,tinyPng);
  const candidateAsset={path:rel(candidate),sha256:sha(readFileSync(candidate))};
  const pictureAsset={path:rel(picture),sha256:sha(tinyPng)};
  const reference={path:'public/assets/reference/wasteland-crew-1.png',
    sha256:sha(readFileSync(join(root,'public/assets/reference/wasteland-crew-1.png'))),
    crops:[{view:'front',crop:[0,40,207,710]},
      {view:'side',crop:[210,40,340,710]},
      {view:'back',crop:[343,40,534,710]}]};
  const camera={position:[0,.96,5],target:[0,.96,0],verticalFov:28,width:432,height:576};
  const views=[['front',0],['side',Math.PI/2],['back',Math.PI]];
  const blenderPictures=[];
  for(let i=0;i<views.length;i++){
    const path=join(directory,`blender-${views[i][0]}.png`),bytes=colorPng(45+i*60,90+i*25,150-i*40);
    await writeFile(path,bytes);blenderPictures.push({path:rel(path),sha256:sha(bytes)});
  }
  const blender={asset:candidateAsset,reference,camera,
    captures:views.map(([view,yaw],index)=>({view,yaw,clip:'idle',time:.25,...blenderPictures[index]}))};
  const baselineSha=sha(readFileSync(baseline));
  const captures={only:'rook',assets:{rook:candidateAsset},candidate:{...candidateAsset,baselineRookSha256:baselineSha},
    qa:{baselineRookSha256:baselineSha,candidateSha256:candidateAsset.sha256,
      substitutionRequests:{high:1,performance:1}},
    camera:{...camera,fov:28},qualities:['high','performance'],counts:{},
    captures:views.flatMap(([view,yaw])=>['high','performance'].map(quality=>
      ({crew:'rook',quality,clip:'idle',time:.25,view,yaw,...pictureAsset})))};
  mutate({captures,blender});
  await writeFile(join(directory,'captures.json'),JSON.stringify(captures));
  await writeFile(join(directory,'blender-rook.json'),JSON.stringify(blender));
  return directory;
}
function compileSheet(directory){
  return spawnSync(process.execPath,[sheetTool,'--crew-p2-round','3',
    '--blender',join(directory,'missing-blender.exe')],{cwd:root,
    env:{...process.env,DUEL_EVIDENCE_DIR:directory},encoding:'utf8',timeout:10_000});
}
test('Rook candidate sheet records three matched views, candidate identity and positive private substitution',async()=>{
  const directory=await sheetFixture();
  try{
    const run=compileSheet(directory),path=join(directory,'sheet.json');
    assert.ok(existsSync(path),`candidate provenance compiles before Blender rendering: ${run.stderr||run.stdout}`);
    assert.match(run.stderr,/missing-blender\.exe|ENOENT/i);
    const report=JSON.parse(readFileSync(path,'utf8'));
    assert.equal(report.rows.length,3);
    assert.deepEqual(report.rows.map(row=>row.view),['front','side','back']);
    assert.ok(report.rows.every(row=>row.crew==='rook'&&row.clip==='idle'&&row.time===.25));
    assert.equal(report.candidate.sha256,report.qa.candidateSha256);
    assert.equal(report.qa.baselineRookSha256,sha(readFileSync(baseline)));
    assert.ok(report.qa.substitutionRequests.high>0&&report.qa.substitutionRequests.performance>0);
    assert.equal(report.assets.rook.sha256,report.candidate.sha256);
  }finally{await rm(directory,{recursive:true,force:true});}
});
for(const [name,mutate,reason] of [
  ['missing substitution count',({captures})=>{captures.qa.substitutionRequests.high=0;},/substitution|candidate.*load/i],
  ['mismatched candidate hash',({captures})=>{captures.qa.candidateSha256='0'.repeat(64);},/candidate|hash|sha256/i],
  ['mismatched game camera',({captures})=>{captures.camera.position=[1,.96,5];},/camera|match/i],
  ['missing capture SHA',({captures})=>{delete captures.captures.find(item=>item.view==='front'&&item.quality==='high').sha256;},/sha256|hash|source/i],
  ['duplicate Blender view image',({blender})=>{blender.captures[1].path=blender.captures[0].path;
    blender.captures[1].sha256=blender.captures[0].sha256;},/duplicate|distinct|image.*view/i],
])test(`Rook candidate sheet rejects ${name} before recording provenance`,async()=>{
  const directory=await sheetFixture(mutate);
  try{
    const run=compileSheet(directory);
    assert.match(run.stderr,reason,`${name} must fail for the right reason`);
    assert.ok(!existsSync(join(directory,'sheet.json')));
  }finally{await rm(directory,{recursive:true,force:true});}
});
