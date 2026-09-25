import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = name => JSON.parse(readFileSync(join(root, 'tools/blender', name), 'utf8'));
const roles = ['body-core','jacket','vest-left','vest-right','scarf','trousers','boots','pack'];
const pointNames = ['crown','chin','neck','shoulder','elbow','wrist','scarf','vest','belt','crotch','knee','boot','pack'];
const finitePoint = (point, length) => Array.isArray(point) && point.length === length && point.every(Number.isFinite);

test('neutral Rook has explicit connected control meshes with bounded near and far geometry', () => {
  const source = json('rook-p2-source.json');
  assert.equal(source.version, 1);
  assert.equal(source.units, 'metres');
  assert.equal(source.coordinates, 'blender-z-up');
  assert.equal(source.height, 1.83);
  assert.ok(Array.isArray(source.meshes) && source.meshes.length > 0);
  const names = new Set(), triangles = {near:0, far:0};
  const present = new Set();
  const bounds = {min:[Infinity,Infinity,Infinity], max:[-Infinity,-Infinity,-Infinity]};
  for (const mesh of source.meshes) {
    assert.equal(typeof mesh.name, 'string'); assert.ok(mesh.name && !names.has(mesh.name));
    names.add(mesh.name);
    assert.ok(['near','far'].includes(mesh.lod), mesh.name + ': explicit detail level');
    assert.equal(typeof mesh.role, 'string');
    if (mesh.lod === 'near') present.add(mesh.role);
    assert.ok(Array.isArray(mesh.vertices) && mesh.vertices.length >= 3, mesh.name + ': real vertices');
    assert.ok(Array.isArray(mesh.faces) && mesh.faces.length > 0, mesh.name + ': real polygon faces');
    const links = mesh.vertices.map(() => new Set()), used = new Set();
    for (const vertex of mesh.vertices) {
      assert.ok(finitePoint(vertex,3), mesh.name + ': finite metre coordinates');
      for(let axis=0;axis<3;axis++) {
        bounds.min[axis]=Math.min(bounds.min[axis],vertex[axis]);
        bounds.max[axis]=Math.max(bounds.max[axis],vertex[axis]);
      }
    }
    for (const face of mesh.faces) {
      assert.ok(Array.isArray(face) && face.length >= 3);
      assert.equal(new Set(face).size,face.length,mesh.name + ': duplicate polygon corner');
      for (let i=0;i<face.length;i++) {
        const a=face[i], b=face[(i+1)%face.length];
        assert.ok(Number.isInteger(a) && a>=0 && a<mesh.vertices.length,mesh.name + ': valid face index');
        assert.ok(Number.isInteger(b) && b>=0 && b<mesh.vertices.length);
        used.add(a);links[a].add(b);links[b].add(a);
      }
      triangles[mesh.lod]+=face.length-2;
    }
    assert.equal(used.size,mesh.vertices.length,mesh.name + ': no unused vertices');
    if(mesh.role==='body-core') {
      const seen=new Set([0]), queue=[0];
      for(let i=0;i<queue.length;i++)for(const next of links[queue[i]])if(!seen.has(next)){seen.add(next);queue.push(next);}
      assert.equal(seen.size,mesh.vertices.length,mesh.name + ': head and neck share one connected core');
      const zs=mesh.vertices.map(v=>v[2]), ys=mesh.vertices.map(v=>v[1]);
      assert.ok(Math.max(...zs)>1.65 && Math.min(...zs)<1.25,mesh.name + ': core reaches through neck into torso');
      assert.ok(Math.max(...ys)-Math.min(...ys)>.15,mesh.name + ': volumetric core');
    }
  }
  for(const role of roles)assert.ok(present.has(role),'Missing near role '+role);
  assert.ok(triangles.near>0 && triangles.near<=8000,'near control triangle ceiling');
  assert.ok(triangles.far>0 && triangles.far<=2000,'far control triangle ceiling');
  assert.ok(bounds.min[2]>=-.02 && bounds.max[2]>=1.75 && bounds.max[2]<=1.92,'feet and crown at calibrated height');
  assert.ok(bounds.max[0]-bounds.min[0]<=1.1 && bounds.max[1]-bounds.min[1]<=1.1,'human-scale silhouette');
});

test('Rook landmarks identify the actual approved reference and all three measured views', () => {
  const data=json('rook-p2-landmarks.json');
  assert.equal(data.version,1);assert.equal(data.height,1.83);
  assert.equal(data.reference.path,'public/assets/reference/wasteland-crew-1.png');
  const bytes=readFileSync(join(root,data.reference.path));
  assert.equal(data.reference.sha256,createHash('sha256').update(bytes).digest('hex'));
  assert.equal(data.reference.width,bytes.readUInt32BE(16));
  assert.equal(data.reference.height,bytes.readUInt32BE(20));
  for(const name of ['front','side','back']) {
    const view=data.views[name];assert.ok(view,name);
    assert.ok(finitePoint(view.crop,4));
    const [left,top,right,bottom]=view.crop;
    assert.ok(left>=0 && right>left && right<=data.reference.width);
    assert.ok(top>=0 && bottom>top && bottom<=data.reference.height);
    assert.ok(Number.isFinite(view.crown) && Number.isFinite(view.floor) &&
      view.crown>=top && view.floor<=bottom && view.floor-view.crown>450,'calibrated floor/crown');
    for(const point of pointNames) {
      const p=view.points[point];assert.ok(finitePoint(p,2),name+' '+point);
      assert.ok(p[0]>=left && p[0]<=right && p[1]>=top && p[1]<=bottom,name+' '+point+' lies in its reference view');
    }
  }
});

test('near trousers are one substantial pelvis and two measured leg silhouettes', () => {
  const source=json('rook-p2-source.json'), landmarks=json('rook-p2-landmarks.json');
  const trousers=source.meshes.filter(mesh=>mesh.role==='trousers'&&mesh.lod==='near');
  assert.equal(trousers.length,1,'one near trouser garment rather than separate leg meshes');
  const mesh=trousers[0];
  assert.equal(mesh.name,'rook-near-trousers','stable named control garment');
  const adjacency=mesh.faces.map(()=>new Set()), edges=new Map();
  for(let faceIndex=0;faceIndex<mesh.faces.length;faceIndex++){
    const face=mesh.faces[faceIndex];
    for(let i=0;i<face.length;i++){
      const a=face[i],b=face[(i+1)%face.length],key=a<b?`${a}:${b}`:`${b}:${a}`;
      const users=edges.get(key)||[];
      for(const other of users){adjacency[faceIndex].add(other);adjacency[other].add(faceIndex);}
      users.push(faceIndex);edges.set(key,users);
    }
  }
  assert.ok([...edges.values()].every(users=>users.length<=2),
    'pelvis and legs have no non-manifold edge pinch');
  const seen=new Set([0]), queue=[0];
  for(let i=0;i<queue.length;i++)for(const next of adjacency[queue[i]])
    if(!seen.has(next)){seen.add(next);queue.push(next);}
  assert.equal(seen.size,mesh.faces.length,
    'trouser faces must be one edge-connected pelvis-to-both-legs surface; vertex pinches do not join cloth');

  // Measure real surface in the central pelvis; a narrow seam or degenerate linking face is insufficient.
  const area=(a,b,c)=>{
    const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]);
    return Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;
  };
  let bridgeArea=0;
  for(const face of mesh.faces)for(let i=1;i<face.length-1;i++){
    const a=mesh.vertices[face[0]],b=mesh.vertices[face[i]],c=mesh.vertices[face[i+1]];
    const centre=[0,1,2].map(axis=>(a[axis]+b[axis]+c[axis])/3);
    if(Math.abs(centre[0])<.065&&centre[2]>.86&&centre[2]<1.01){
      const triangleArea=area(a,b,c);
      assert.ok(triangleArea>1e-8,'central pelvis has no degenerate bridge triangles');
      bridgeArea+=triangleArea;
    }
  }
  assert.ok(bridgeArea>.008,`central pelvis/crotch has substantial cloth area, got ${bridgeArea}`);

  // Intersections use the authored faces, so bounds describe the cloth surface rather than spare vertices.
  const section=z=>{
    const points=[];
    for(const face of mesh.faces)for(let i=0;i<face.length;i++){
      const a=mesh.vertices[face[i]],b=mesh.vertices[face[(i+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    return points;
  };
  const scale=1.83/578, tolerance=10*scale;
  const zFor=y=>(641-y)*scale;
  const bounds=values=>[Math.min(...values),Math.max(...values)];
  for(const viewName of ['front','back','side']){
    const bands=landmarks.views[viewName].trouserBands;
    assert.ok(bands&&typeof bands==='object',viewName+' measured trouser bands');
    for(const level of ['waist','hips','crotch','thigh','knee','calf','cuff']){
      const band=bands[level];assert.ok(band&&Number.isFinite(band.y),viewName+' '+level+' measured height');
      const points=section(zFor(band.y));
      assert.ok(points.length>=8,viewName+' '+level+' has trouser surface at the measured height');
      if(viewName==='side'){
        assert.ok(Number.isFinite(band.backX)&&Number.isFinite(band.frontX),level+' side depth pair');
        const [actualFront,actualBack]=bounds(points.map(p=>p[1]));
        const expectedFront=(270-band.frontX)*scale,expectedBack=(270-band.backX)*scale;
        assert.ok(Math.abs(actualFront-expectedFront)<=tolerance,level+' front trouser depth');
        assert.ok(Math.abs(actualBack-expectedBack)<=tolerance,level+' back trouser depth');
        continue;
      }
      const mapX=pixel=>viewName==='front'?(pixel-112)*scale:(439-pixel)*scale;
      const midDepth=(Math.min(...points.map(p=>p[1]))+Math.max(...points.map(p=>p[1])))/2;
      const visible=points.filter(p=>viewName==='front'?p[1]<=midDepth:p[1]>=midDepth);
      assert.ok(visible.length>=4,viewName+' '+level+' has visible cloth surface');
      const checkPair=(pair,label)=>{
        assert.ok(finitePoint(pair,2),viewName+' '+level+' '+label+' measured edges');
        const expected=bounds(pair.map(mapX));
        const sample=label==='whole'?visible:visible.filter(p=>
          label==='left'?(viewName==='front'?p[0]<0:p[0]>0):(viewName==='front'?p[0]>0:p[0]<0));
        assert.ok(sample.length>=2,viewName+' '+level+' '+label+' has sampled cloth');
        const actual=bounds(sample.map(p=>p[0]));
        assert.ok(Math.abs(actual[0]-expected[0])<=tolerance&&Math.abs(actual[1]-expected[1])<=tolerance,
          `${viewName} ${level} ${label} bounds ${actual} differ from reference ${expected}`);
      };
      if(['waist','hips','crotch'].includes(level))checkPair(band.whole,'whole');
      else for(const leg of ['left','right'])checkPair(band[leg],leg);
    }
  }
  for(const level of ['hips','crotch']){
    const band=landmarks.views.front.trouserBands[level],central=section(zFor(band.y)).filter(p=>Math.abs(p[0])<.03);
    assert.ok(central.length>=4&&Math.max(...central.map(p=>p[1]))-Math.min(...central.map(p=>p[1]))>.05,
      level+' has a real front-to-back central pelvis bridge');
  }
  const thigh=landmarks.views.front.trouserBands.thigh;
  assert.ok(section(zFor(thigh.y)).every(p=>Math.abs(p[0])>.006),
    'legs separate below the crotch rather than retaining a narrow central strip');
});

test('neutral output planning needs no Blender or authored binary and never touches runtime paths', () => {
  const fixture=mkdtempSync(join(tmpdir(),'duel-rook-neutral-'));
  try {
    const invoke=args=>spawnSync('python',[join(root,'tools/blender/rook-p2.py'),'--',
      '--root',fixture,'--stage','neutral','--paths-only',...args],
      {cwd:root,encoding:'utf8',windowsHide:true,timeout:10000});
    const result=invoke([]);
    assert.equal(result.error,undefined);
    assert.equal(result.status,0,result.stderr||result.stdout);
    const plan=JSON.parse(result.stdout);
    assert.deepEqual(plan.glb,[],'neutral review cannot export production geometry');
    assert.deepEqual(plan.textures,[],'neutral review precedes painted atlases');
    assert.equal(plan.blend.length,1);
    assert.ok(plan.evidence.length>=4,'three neutral views and their manifest');
    for(const output of [...plan.blend,...plan.evidence]) {
      assert.ok(isAbsolute(output));
      const rel=relative(fixture,resolve(output)).replaceAll('\\','/');
      assert.ok(rel.startsWith('art-build/')||rel.startsWith('.evidence/'),'review output stays ignored');
      assert.ok(!rel.split('/').includes('..'));
    }
    assert.deepEqual(readdirSync(fixture),[],'planning has no filesystem side effects');
    for(const unsafe of ['public/assets/models/wasteland/crew','src','art-build/../../outside',join(fixture,'public')]) {
      const rejected=invoke(['--output-dir',unsafe]);
      assert.notEqual(rejected.status,0,'reject output '+unsafe);
      assert.deepEqual(readdirSync(fixture),[],'rejected output creates no files');
    }
  } finally {
    const target=resolve(fixture), expected=resolve(tmpdir());
    assert.ok(relative(expected,target).startsWith('duel-rook-neutral-'),'only remove this test temporary directory');
    rmSync(target,{recursive:true});
  }
});
