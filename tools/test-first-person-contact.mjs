import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, mkdirSync, rmSync, symlinkSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {
  selectBindContactPatch, measureContactFrame, assessContactSequence,
  createActualContactPlan, collectActualCandidateContact,
} from './first-person-contact.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const proofRoot = join(root,'art-build/first-person-p1/contact-test');
const candidatePath = process.env.GFX_FIRST_PERSON_P1_CANDIDATE ||
  join(proofRoot,'hands/rook.glb');
let builtThisRun=false;
function ensureActualAssets() {
  if (process.env.GFX_FIRST_PERSON_P1_CANDIDATE) {
    assert.ok(existsSync(candidatePath),'an explicit frozen candidate path must exist');
    return;
  }
  if (builtThisRun) return;
  mkdirSync(proofRoot,{recursive:true});
  const blender = process.env.BLENDER_PATH || 'blender';
  const result = spawnSync(blender,['-b','--python-exit-code','1','--python',
    join(root,'tools/blender/first-person-gear.py'),'--','--root',root,'--round','1',
    '--p1-rook','--output-dir',proofRoot,'--skip-renders'],
  {cwd:root,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
  assert.ok(existsSync(candidatePath));
  builtThisRun=true;
}

// A closed 100 mm cube is an actual triangulated handle. Its upper face is
// z=.1, so a hand surface at .11 has a known 10 mm exterior gap.
const cube = () => {
  const v = [
    [-.05,-.05,0], [.05,-.05,0], [.05,.05,0], [-.05,.05,0],
    [-.05,-.05,.1], [.05,-.05,.1], [.05,.05,.1], [-.05,.05,.1],
  ];
  const indices = [
    [0,2,1],[0,3,2], [4,5,6],[4,6,7],
    [0,1,5],[0,5,4], [1,2,6],[1,6,5],
    [2,3,7],[2,7,6], [3,0,4],[3,4,7],
  ];
  return indices.map((face, id) => ({id, vertices:face.map(index => v[index])}));
};
const hand = z => Object.fromEntries([
  [-.025,-.02,z], [0,-.02,z], [.025,-.02,z],
  [-.025,.02,z], [0,.02,z], [.025,.02,z],
].map((point, id) => [id, point]));
const patch = {
  vertexIds:[0,1,2,3,4,5], handleTriangleIds:[2,3],
  bounds:{min:[-.025,-.02,.11],max:[.025,.02,.11]}, selectionHash:'fixed-bind-selection',
};
const sample = (z, options = {}) => measureContactFrame({
  patch, skinnedVertexPositions:hand(z), posedHandleTriangles:cube(),
  posedClosedHandleFaces:options.open ? cube().slice(1) : cube(),
  requested:Object.hasOwn(options,'requested') ? options.requested : {clip:'idle',progress:.25},
  actual:Object.hasOwn(options,'actual') ? options.actual :
    Object.hasOwn(options,'requested') ? options.requested : {clip:'idle',progress:.25},
  sampleStamp:options.sampleStamp ?? 1, geometryHash:`hand-z-${z}`,
});

test('bind selection fixes connected contact-facing surface and tool triangle IDs', () => {
  const points = hand(.11);
  const regionVertices = Object.entries(points).map(([id,position]) => ({id:Number(id),position}));
  const regionFaces = [
    {id:0,vertexIds:[0,3,1]}, {id:1,vertexIds:[1,3,4]},
    {id:2,vertexIds:[1,4,2]}, {id:3,vertexIds:[2,4,5]},
  ];
  const chosen = selectBindContactPatch({regionVertices,regionFaces,
    handleTriangles:cube(),closedHandleFaces:cube(),minVertices:6});
  assert.deepEqual([...chosen.vertexIds].sort((a,b) => a-b), [0,1,2,3,4,5]);
  assert.ok(chosen.handleTriangleIds.length >= 1);
  assert.ok(chosen.handleTriangleIds.every(id => id === 2 || id === 3),
    'bind patch must target the upper surface, not an arbitrary remote handle face');
  assert.ok(chosen.selectionHash, 'bind selection identity must be recorded once');
});

test('bind patch stays edge-connected across duplicated UV seam vertices after 0.1 mm weld', () => {
  const points=[[-.02,-.02,.11],[0,-.02,.11],[-.02,0,.11],[0,0,.11],
    [0,-.02,.11],[0,0,.11],[.02,-.02,.11],[.02,0,.11]];
  const regionVertices=points.map((position,id)=>({id,position}));
  const regionFaces=[
    {id:0,vertexIds:[0,2,1]},{id:1,vertexIds:[1,2,3]},
    {id:2,vertexIds:[4,5,6]},{id:3,vertexIds:[5,7,6]},
  ];
  const selected=selectBindContactPatch({regionVertices,regionFaces,
    handleTriangles:cube(),closedHandleFaces:cube(),minVertices:6});
  assert.ok(selected.vertexIds.some(id=>id<=3)&&selected.vertexIds.some(id=>id>=4),
    'two sides of the physically shared seam must remain one fixed contact patch');
  assert.ok(selected.vertexIds.length>=6);
  assert.ok(selected.selectionHash);
});

test('closed triangulated handle distinguishes 10 mm grip, 25 mm miss, and deep penetration', () => {
  const near = sample(.11);
  assert.equal(near.closed, true);
  assert.ok(Math.abs(near.p90Gap - .01) < .001, `expected 10 mm, got ${near.p90Gap}`);
  assert.ok(near.maxPenetration <= .001);
  const missed = sample(.125);
  assert.ok(missed.p90Gap > .02, '25 mm gap must fail a 15 mm right-grip limit');
  const inside = sample(.05);
  assert.ok(inside.insideCount >= 6, 'all synthetic hand points are inside the closed handle');
  assert.ok(inside.maxPenetration > .005, 'deeply embedded fingers cannot count as contact');
  const open = sample(.11, {open:true});
  assert.equal(open.closed, false, 'open target has no valid inside/outside test');
  assert.ok(open.unsupported || open.maxPenetration == null,
    'an open target must be reported as unsupported, never a clean pass');
  assert.throws(() => sample(.11, {actual:{clip:'fire',progress:.25}}),
    /phase|clip|actual|requested/i, 'measurement cannot silently relabel the production pose');
  for (const invalid of [{clip:'idle',progress:NaN},{clip:'idle'},null])
    assert.throws(() => sample(.11,{requested:invalid,actual:invalid}),
      /phase|clip|progress|finite|requested/i,
      'measurement cannot accept an absent or nonfinite pose identity');
});

test('ordered phase assessment rejects stale samples and bad contacts but permits held poses', () => {
  let stamp = 0;
  const frame = (clip, progress, tool, entries) => {
    const requested = {clip,progress}, sampleStamp = ++stamp;
    return {sampleStamp,requested,actual:{...requested},
      geometryHash:'legitimate-held-pose',contacts:entries.map(([handSide,region]) => ({
        tool,hand:handSide,region,measurement:sample(.11,{sampleStamp,requested}),
      }))};
  };
  const good = [];
  const rightRpg = [['R','palm'],['R','index'],['R','thumb']];
  for (const [clip, progress] of [['idle',.25],['aim',.25],['fire',.1]]) {
    good.push(frame(clip,progress,'rpg',[...rightRpg,['L','support']]));
  }
  // Production presentation has left reload at exactly 1.0; .999 is the
  // final in-action support reacquire sample, never a fabricated reload@1.
  for (const progress of [.18,.48,.76,.90,.999]) {
    const contacts = [...rightRpg];
    if (progress === .48 || progress === .76)
      contacts.push(['L','rocket-guide']);
    if (progress >= .90) contacts.push(['L','support']);
    good.push(frame('reload',progress,'rpg',contacts));
  }
  // A fresh production idle sample after the reload selector transition proves
  // support remains attached after the in-action .999 reacquire pose.
  good.push(frame('idle',.25,'rpg',[...rightRpg,['L','support']]));
  good.push(frame('wrench-idle',.25,'wrench',[['R','palm'],['R','thumb']]));
  for (const progress of [.25,.5,.75,1])
    good.push(frame('repair',progress,'wrench',[['R','palm'],['R','thumb']]));
  const accepted = assessContactSequence({frames:good});
  assert.equal(accepted.passed, true, JSON.stringify(accepted.failures));
  const stale = good.map(row => ({...row}));
  stale[3].sampleStamp = stale[2].sampleStamp;
  assert.equal(assessContactSequence({frames:stale}).passed, false,
    'reused frame stamp cannot prove ordered continuous motion');
  const badGap = good.map(row => ({...row}));
  badGap[1] = {...badGap[1],contacts:badGap[1].contacts.map(contact =>
    contact.hand === 'R' && contact.region === 'palm' ? {...contact,
      measurement:sample(.125,{requested:badGap[1].requested,
        sampleStamp:badGap[1].sampleStamp})} : contact)};
  assert.equal(assessContactSequence({frames:badGap}).passed, false,
    'a 25 mm right grip miss must be detected');
  const wrongPhase = good.map(row => ({...row}));
  wrongPhase[2] = {...wrongPhase[2],actual:{clip:'idle',progress:.25}};
  assert.equal(assessContactSequence({frames:wrongPhase}).passed, false,
    'actual production clip must match the requested phase');
  for (const field of ['actual','requested']) for (const progress of [NaN,undefined]) {
    const mislabeled=good.map(row=>({...row}));
    mislabeled[0]={...mislabeled[0],contacts:mislabeled[0].contacts.map((contact,index)=>
      index ? contact : {...contact,measurement:{...contact.measurement,
        [field]:{clip:'idle',progress}}})};
    assert.equal(assessContactSequence({frames:mislabeled}).passed,false,
      `missing or NaN nested measurement ${field}.progress cannot certify a sampled pose`);
  }
  const missingSupport = good.map(row => row.requested.clip === 'aim' ? {...row,
    contacts:row.contacts.filter(contact => contact.hand !== 'L')} : row);
  assert.equal(assessContactSequence({frames:missingSupport}).passed, false,
    'an otherwise good sequence cannot omit an entire required support pose');
  const openTarget = good.map(row => ({...row}));
  openTarget[0] = {...openTarget[0],contacts:openTarget[0].contacts.map((contact,index) =>
    index ? contact : {...contact,measurement:sample(.11,{
      open:true,requested:openTarget[0].requested,sampleStamp:openTarget[0].sampleStamp})})};
  assert.equal(assessContactSequence({frames:openTarget}).passed, false,
    'an unsupported open handle cannot satisfy a required grip');
  const embedded = good.map(row => ({...row}));
  embedded[0] = {...embedded[0],contacts:embedded[0].contacts.map((contact,index) =>
    index ? contact : {...contact,measurement:sample(.05,{
      requested:embedded[0].requested,sampleStamp:embedded[0].sampleStamp})})};
  assert.equal(assessContactSequence({frames:embedded}).passed, false,
    'a hand more than 5 mm inside the handle is not a valid grip');
  const noPenetrationNumber = good.map(row => ({...row}));
  noPenetrationNumber[0] = {...noPenetrationNumber[0],contacts:
    noPenetrationNumber[0].contacts.map((contact,index) => index ? contact :
      {...contact,measurement:{...contact.measurement,maxPenetration:NaN}})};
  assert.equal(assessContactSequence({frames:noPenetrationNumber}).passed, false,
    'NaN penetration must never satisfy the 5 mm safety bound');
  const noPatchIdentity = good.map(row => ({...row}));
  noPatchIdentity[0] = {...noPatchIdentity[0],contacts:
    noPatchIdentity[0].contacts.map((contact,index) => index ? contact :
      {...contact,measurement:{...contact.measurement,selectionHash:null}})};
  assert.equal(assessContactSequence({frames:noPatchIdentity}).passed, false,
    'missing bind-patch identity cannot prove fixed surface tracking');
  const wrenchMiss = good.map(row => ({...row}));
  const wrenchIndex = wrenchMiss.findIndex(row => row.requested.clip === 'wrench-idle');
  wrenchMiss[wrenchIndex] = {...wrenchMiss[wrenchIndex],contacts:
    wrenchMiss[wrenchIndex].contacts.map(contact => contact.region !== 'palm' ? contact :
      {...contact,measurement:sample(.118,{
        requested:wrenchMiss[wrenchIndex].requested,
        sampleStamp:wrenchMiss[wrenchIndex].sampleStamp})})};
  assert.equal(assessContactSequence({frames:wrenchMiss}).passed, false,
    '18 mm wrench right-hand gap must fail the same 15 mm grip limit');
});

test('actual asset contact plan keeps fixed patches and reports an open mounted grip as unsupported', () => {
  ensureActualAssets();
  const rpgPath=join(root,'public/assets/models/wasteland/first-person/rpg.glb');
  const wrenchPath=join(root,'public/assets/models/wasteland/first-person/wrench.glb');
  const glbNames = path => {
    const bytes=readFileSync(path);
    assert.equal(bytes.toString('ascii',0,4),'glTF');
    const size=bytes.readUInt32LE(12);
    return JSON.parse(bytes.subarray(20,20+size).toString('utf8')).nodes.map(node => node.name);
  };
  assert.ok(glbNames(candidatePath).some(name => /rook|hand/i.test(name)),
    'contact proof must use an actual exported Rook hand asset');
  assert.ok(glbNames(rpgPath).includes('rpg-body'));
  assert.ok(glbNames(rpgPath).includes('loaded-rocket'));
  assert.ok(glbNames(wrenchPath).includes('wrench-body'));

  const shiftedCube=(x,idOffset=0,open=false) => cube().slice(open?1:0).map(face => ({
    id:face.id+idOffset,vertices:face.vertices.map(([vx,y,z])=>[vx+x,y,z]),
  }));
  const positions={...hand(.11)};
  for(const [id,point] of Object.entries(hand(.11))) positions[Number(id)+6]=[point[0]-.4,point[1],point[2]];
  const facesBySide=offset => [
    [0,3,1],[1,3,4],[1,4,2],[2,4,5],
  ].map((vertexIds,id)=>({id:id+offset,vertexIds:vertexIds.map(vertex=>vertex+offset)}));
  const bindSnapshot={
    hand:{positions,faces:[...facesBySide(0),...facesBySide(6)],regions:Object.fromEntries(
      ['R','L'].flatMap(side=>['palm','index','thumb','support'].map(region=>[
        `${side}:${region}`,{center:[side==='R'?0:-.4,0,.11],radiusMetres:.05},
      ])))},
    tools:{rpgBody:[...shiftedCube(0,0,true),...shiftedCube(-.4,12)],
      loadedRocket:shiftedCube(-.4),wrenchBody:shiftedCube(0)},
  };
  const plan=createActualContactPlan({candidatePath,rpgPath,wrenchPath,bindSnapshot});
  assert.equal(plan.sources.candidate.sha256,sha(candidatePath));
  assert.equal(plan.sources.rpg.sha256,sha(rpgPath));
  assert.equal(plan.sources.wrench.sha256,sha(wrenchPath));
  assert.ok(plan.patches['rpg:R:palm']?.vertexIds.length>=6);
  assert.ok(plan.patches['rpg:R:palm']?.selectionHash);
  assert.ok(plan.componentIds['rpg-right-handle']?.triangleIds.length>0);
  assert.equal(plan.componentIds['rpg-right-handle'].closed,false,
    'nearest grip component is open; another closed component cannot mask it');
  const wrenchHand={positions:Object.fromEntries(Object.entries(bindSnapshot.hand.positions)
    .map(([id,[x,y,z]])=>[Number(id)+100,[x+.2,y,z]])),
  faces:bindSnapshot.hand.faces.map(face=>({id:face.id+100,
    vertexIds:face.vertexIds.map(id=>id+100)})),
  regions:Object.fromEntries(Object.entries(bindSnapshot.hand.regions)
    .map(([key,hint])=>[key,{...hint,center:[hint.center[0]+.2,...hint.center.slice(1)]}]))};
  const distinctToolBind={...bindSnapshot,
    handByTool:{rpg:bindSnapshot.hand,wrench:wrenchHand},
    tools:{...bindSnapshot.tools,wrenchBody:shiftedCube(.2)}};
  const separatePlan=createActualContactPlan({candidatePath,rpgPath,wrenchPath,
    bindSnapshot:distinctToolBind});
  assert.ok(separatePlan.patches['wrench:R:palm'].vertexIds.every(id=>id>=100),
    'wrench grip must select the hand from its own production bind pose');
  assert.ok(separatePlan.patches['rpg:R:palm'].vertexIds.every(id=>id<100),
    'RPG grip must retain its separate production bind-pose vertices');
  assert.ok(separatePlan.componentIds['wrench-handle'].nearestGripGap<.03,
    'wrench component must be selected near the wrench-pose hand');
  const inner=Object.fromEntries([
    [-.012,-.01,.11],[0,-.01,.11],[.012,-.01,.11],
    [-.012,.01,.11],[0,.01,.11],[.012,.01,.11],
  ].map((point,index)=>[index+12,point]));
  const edgeFaceBind={...bindSnapshot,hand:{...bindSnapshot.hand,
    positions:{...bindSnapshot.hand.positions,...inner},
    faces:[...bindSnapshot.hand.faces,
      {id:20,vertexIds:[12,13,0]},{id:21,vertexIds:[13,14,2]},
      {id:22,vertexIds:[15,16,3]},{id:23,vertexIds:[16,17,5]}],
    regions:{...bindSnapshot.hand.regions,
      'R:palm':{center:[0,0,.11],radiusMetres:.02}}}};
  const edgePlan=createActualContactPlan({candidatePath,rpgPath,wrenchPath,
    bindSnapshot:edgeFaceBind});
  assert.ok(edgePlan.patches['rpg:R:palm'].vertexIds.some(id=>[0,2,3,5].includes(id)),
    'a real face with centroid inside the palm region must keep its outside corner');

  let stamp=0;
  const pose=(clip,progress,tool='rpg')=>({sampleStamp:++stamp,
    requested:{clip,progress},actual:{clip,progress},geometryHash:`render-${stamp}`,
    hand:{positions},tools:{rpgBody:bindSnapshot.tools.rpgBody,
      loadedRocket:bindSnapshot.tools.loadedRocket,
      wrenchBody:bindSnapshot.tools.wrenchBody}});
  const poseSamples=[pose('idle',.25),pose('aim',.25),pose('fire',.1),
    ...[.18,.48,.76,.90,.999].map(value=>pose('reload',value)),
    pose('idle',.25),
    pose('wrench-idle',.25,'wrench'),
    ...[.25,.5,.75,1].map(value=>pose('repair',value,'wrench'))];
  const report=collectActualCandidateContact({plan,poseSamples});
  assert.equal(report.frames.length,14);
  assert.ok(report.triangleCounts.rpgBody>0 && report.triangleCounts.wrenchBody>0);
  assert.deepEqual(report.sources,plan.sources);
  assert.equal(report.verdict.passed,false,
    'an open actual grip component cannot establish safe continuous contact');
  assert.ok(report.unsupported.length>0);
  assert.deepEqual(report.patches['rpg:R:palm'].vertexIds,
    plan.patches['rpg:R:palm'].vertexIds,'selected hand IDs stay fixed after bind');
  const activeOnly=poseSamples.map(row => row.requested.clip === 'wrench-idle' ||
    row.requested.clip === 'repair' ? {...row,tools:{wrenchBody:row.tools.wrenchBody}} :
    {...row,tools:{rpgBody:row.tools.rpgBody,loadedRocket:row.tools.loadedRocket}});
  const activeReport=collectActualCandidateContact({plan,poseSamples:activeOnly});
  assert.equal(activeReport.frames.length,14,
    'ordinary poses only carry their active mounted tool, not hidden off-tool meshes');
  assert.ok(activeReport.unsupported.length>0,
    'open active RPG grip must still be reported unsupported');
  const junction=join(proofRoot,'candidate-junction');
  try {
    mkdirSync(proofRoot,{recursive:true});
    symlinkSync(join(root,'public/assets/models/wasteland/first-person/hands'),junction,'junction');
    assert.throws(()=>createActualContactPlan({candidatePath:join(junction,'rook.glb'),
      rpgPath,wrenchPath,bindSnapshot}),/outside|candidate|approved|realpath/i,
    'candidate path cannot use an art-build junction to read production Rook bytes');
  } finally {rmSync(junction,{recursive:true,force:true});}
});
