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

test('connected neutral face follows measured side-profile brow, nose, lips and chin', () => {
  const source = json('rook-p2-source.json');
  const core = source.meshes.find(mesh => mesh.role === 'body-core' && mesh.lod === 'near');
  assert.ok(core, 'measure the authored connected near body core');
  const metresPerPixel = 1.83 / 578;
  const heightAt = imageY => (641 - imageY) * metresPerPixel;
  const centerline = core.vertices.filter(([x, depth, z]) =>
    Math.abs(x) < .003 && depth < -.04 && z >= heightAt(145) - .05 && z <= heightAt(100) + .05)
    .sort((a, b) => a[2] - b[2]);
  assert.ok(centerline.length >= 6, 'face is measured on real connected centerline bands');
  const projectedX = imageY => {
    const height = heightAt(imageY);
    let lower, upper;
    for (const point of centerline) {
      if (point[2] <= height) lower = point;
      if (point[2] >= height && !upper) upper = point;
    }
    assert.ok(lower && upper, `connected face spans measured image row ${imageY}`);
    const t = upper[2] === lower[2] ? 0 : (height - lower[2]) / (upper[2] - lower[2]);
    const depth = lower[1] + t * (upper[1] - lower[1]);
    return 270 - depth / metresPerPixel;
  };
  const errors = [];
  for (const [name, imageX, imageY] of [
    ['brow', 311, 100], ['nose tip', 319, 120], ['under nose', 312, 124],
    ['upper lip', 313, 130], ['lower lip', 310, 135], ['chin', 309, 141],
  ]) {
    const actual = projectedX(imageY);
    if (Math.abs(actual - imageX) > 2)
      errors.push(`${name}: clay x${actual.toFixed(1)}, reference x${imageX} at y${imageY}`);
  }
  assert.deepEqual(errors, [], `connected side outline exceeds 2 native pixels: ${errors.join('; ')}`);
});

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

test('front trouser landmarks follow independently sampled native leg edges', () => {
  const marks=json('rook-p2-landmarks.json').views.front;
  // Native 2067×761 approved reference, SHA checked by the landmark identity test.
  // These lower-leg boundaries are visible against uninterrupted background.
  // Waist, hip, crotch and holster-covered edges remain inferred in the source data.
  const measured=[
    {y:455,left:[48,94],right:[134,180],level:'knee'},
    {y:500,left:[44,86],right:[143,185],level:'calf'},
    {y:525,left:[38,87],right:[141,189]},
    {y:550,left:[41,86],right:[142,189],level:'cuff'},
    {y:556,left:[42,80],right:[145,183]}
  ];
  const errors=[];
  for(const row of measured){
    for(const [side,expected] of [['left',row.left],['right',row.right]]){
      const trace=marks.outlines[`${side}-trouser-${side==='left'?'outer':'inner'}`];
      const traceOther=marks.outlines[`${side}-trouser-${side==='left'?'inner':'outer'}`];
      const atY=polyline=>{
        for(let i=1;i<polyline.length;i++){
          const [x0,y0]=polyline[i-1],[x1,y1]=polyline[i];
          if(y0<=row.y&&row.y<=y1)return x0+(x1-x0)*(row.y-y0)/(y1-y0);
        }
        throw new Error(`missing ${side} contour at y${row.y}`);
      };
      const actual=[atY(trace),atY(traceOther)].sort((a,b)=>a-b);
      for(let i=0;i<2;i++)if(Math.abs(actual[i]-expected[i])>3)
        errors.push(`outline y${row.y} ${side} ${actual[i].toFixed(1)} vs native ${expected[i]}`);
      if(row.level){
        const band=marks.trouserBands[row.level];
        assert.equal(band.y,row.y,`${row.level} band records the independently sampled native row`);
        const pair=[...band[side]].sort((a,b)=>a-b);
        for(let i=0;i<2;i++)if(Math.abs(pair[i]-expected[i])>3)
          errors.push(`band ${row.level} ${side} ${pair[i]} vs native ${expected[i]}`);
      }
    }
  }
  assert.deepEqual(errors,[],`front trouser oracle must match independently visible native boundaries: ${errors.join('; ')}`);
});

test('authored trouser cloth follows the corrected visible lower-leg stance', () => {
  const mesh=json('rook-p2-source.json').meshes.find(part=>
    part.lod==='near'&&part.role==='trousers');
  assert.ok(mesh,'inspect the connected near trouser surface');
  const scale=1.83/578,errors=[];
  const measured=[
    {y:455,left:[48,94],right:[134,180]},
    {y:500,left:[44,86],right:[143,185]},
    {y:525,left:[38,87],right:[141,189]},
    {y:550,left:[41,86],right:[142,189]}
  ];
  for(const row of measured){
    const z=(641-row.y)*scale,points=[];
    for(const face of mesh.faces)for(let i=0;i<face.length;i++){
      const a=mesh.vertices[face[i]],b=mesh.vertices[face[(i+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    assert.ok(points.length>=8,`actual cloth intersects native y${row.y}`);
    const depths=points.map(p=>p[1]);
    const midDepth=(Math.min(...depths)+Math.max(...depths))/2;
    const visible=points.filter(p=>p[1]<=midDepth);
    for(const side of ['left','right']){
      const sample=visible.filter(p=>side==='left'?p[0]<0:p[0]>0);
      assert.ok(sample.length>=2,`front ${side} leg cloth at native y${row.y}`);
      const actual=[Math.min(...sample.map(p=>p[0])),Math.max(...sample.map(p=>p[0]))]
        .map(x=>112+x/scale);
      for(let i=0;i<2;i++)if(Math.abs(actual[i]-row[side][i])>10)
        errors.push(`front cloth y${row.y} ${side} ${actual[i].toFixed(1)} vs native ${row[side][i]}`);
    }
  }
  assert.deepEqual(errors,[],`visible trouser surface follows the approved native stance at existing 10px geometry tolerance: ${errors.join('; ')}`);
});

test('back calf trace and rear cloth match the independently visible native pair', () => {
  // The rear reference is a mirrored view. Original-image pixels at y490/500/510
  // consistently show left 370..414 and right 463..507 at the central row.
  // This corrects only the measured calf band; knee and cuff stay unchanged.
  const native={left:[370,414],right:[463,507]};
  const band=json('rook-p2-landmarks.json').views.back.trouserBands.calf;
  assert.equal(band.y,500,'back calf band records the measured native row');
  const errors=[];
  for(const side of ['left','right'])for(let i=0;i<2;i++)
    if(Math.abs(band[side][i]-native[side][i])>3)
      errors.push(`back calf ${side} reference edge ${band[side][i]} vs native ${native[side][i]}`);

  const mesh=json('rook-p2-source.json').meshes.find(part=>
    part.lod==='near'&&part.role==='trousers');
  assert.ok(mesh,'measure actual connected rear trouser surface');
  const scale=1.83/578,z=(641-500)*scale,points=[];
  for(const face of mesh.faces)for(let i=0;i<face.length;i++){
    const a=mesh.vertices[face[i]],b=mesh.vertices[face[(i+1)%face.length]];
    if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
    const t=(z-a[2])/(b[2]-a[2]);
    if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
  }
  assert.ok(points.length>=8,'back calf intersects a substantial cloth section');
  const depths=points.map(p=>p[1]);
  const midDepth=(Math.min(...depths)+Math.max(...depths))/2;
  const rear=points.filter(p=>p[1]>=midDepth);
  for(const side of ['left','right']){
    const sample=rear.filter(p=>side==='left'?p[0]>0:p[0]<0);
    assert.ok(sample.length>=2,`actual ${side} rear calf cloth`);
    const pixels=sample.map(p=>439-p[0]/scale);
    const actual=[Math.min(...pixels),Math.max(...pixels)];
    for(let i=0;i<2;i++)if(Math.abs(actual[i]-native[side][i])>10)
      errors.push(`back cloth ${side} ${actual[i].toFixed(1)} vs native ${native[side][i]}`);
  }
  assert.deepEqual(errors,[],`rear-facing calf must fit the measured back pose without moving accepted front cloth: ${errors.join('; ')}`);
});

test('boot shafts stand under the measured trouser cuffs at both visible leg heights', () => {
  const source=json('rook-p2-source.json'),scale=1.83/578,errors=[];
  const native=[
    {y:565,left:[43,81],right:[147,185]},
    {y:600,left:[44,74],right:[153,182]}
  ];
  for(const side of ['left','right']){
    const boot=source.meshes.find(part=>part.lod==='near'&&part.name===`rook-near-boot-${side}`);
    assert.ok(boot,`${side} boot has a real authored shaft`);
    for(const row of native){
      const z=(641-row.y)*scale,points=[];
      for(const face of boot.faces)for(let i=0;i<face.length;i++){
        const a=boot.vertices[face[i]],b=boot.vertices[face[(i+1)%face.length]];
        if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
        const t=(z-a[2])/(b[2]-a[2]);
        if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
      }
      assert.ok(points.length>=4,`${side} actual boot shaft intersects native y${row.y}`);
      const actual=[Math.min(...points.map(p=>p[0])),Math.max(...points.map(p=>p[0]))]
        .map(x=>112+x/scale);
      for(let i=0;i<2;i++)if(Math.abs(actual[i]-row[side][i])>10)
        errors.push(`${side} shaft y${row.y} edge ${actual[i].toFixed(1)} vs native ${row[side][i]}`);
    }
    const bootTop=boot.vertices.filter(p=>p[2]>.23);
    const trousers=source.meshes.find(part=>part.lod==='near'&&part.role==='trousers');
    const cuff=trousers.vertices.filter(p=>p[2]>.25&&p[2]<.29&&
      (side==='left'?p[0]<0:p[0]>0));
    assert.ok(bootTop.length>=8&&cuff.length>=4,`${side} has real boot-top and trouser-cuff surfaces`);
    const nearest=Math.min(...bootTop.flatMap(a=>cuff.map(b=>Math.hypot(
      a[0]-b[0],a[1]-b[1],a[2]-b[2]))));
    assert.ok(nearest<.05,`${side} boot shaft meets its trouser cuff within 50mm: ${nearest.toFixed(3)}m`);
  }
  assert.deepEqual(errors,[],`boot shaft stance follows independently visible native edges at original 10px geometry tolerance: ${errors.join('; ')}`);
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

test('Rook hair follows the traced temple and rear curl silhouette', () => {
  const source=json('rook-p2-source.json');
  const parts=source.meshes.filter(mesh=>mesh.lod==='near'&&mesh.role.startsWith('hair'));
  const scale=1.83/578, atY=y=>(641-y)*scale;
  const section=y=>{
    const z=atY(y),points=[];
    for(const part of parts)for(const face of part.faces)for(let i=0;i<face.length;i++){
      const a=part.vertices[face[i]],b=part.vertices[face[(i+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    assert.ok(points.length>=8,`hair contour has real surface at native row ${y}`);
    return points;
  };
  const errors=[];
  for(const [y,left,right] of [[95,79,149],[101,80,149]]){
    const points=section(y),actual=[112+Math.min(...points.map(p=>p[0]))/scale,
      112+Math.max(...points.map(p=>p[0]))/scale];
    if(Math.abs(actual[0]-left)>6||Math.abs(actual[1]-right)>6)
      errors.push(`front y${y}: ${actual.map(n=>n.toFixed(1))} vs ${left},${right}`);
  }
  // This rear edge is visible in the side reference, unlike the face-side hair boundary.
  for(const [y,rear] of [[95,241],[101,242]]){
    const actual=270-Math.max(...section(y).map(p=>p[1]))/scale;
    if(Math.abs(actual-rear)>6)errors.push(`side rear y${y}: ${actual.toFixed(1)} vs ${rear}`);
  }
  assert.deepEqual(errors,[],`hair outline follows native front/side curl contour: ${errors.join('; ')}`);
});

test('upper rear skull sits inside the measured hair shell without moving the lower head', () => {
  const source=json('rook-p2-source.json'),landmarks=json('rook-p2-landmarks.json');
  const core=source.meshes.find(part=>part.lod==='near'&&part.role==='body-core');
  assert.ok(core,'measure the actual connected skull rather than a scalp proxy');
  const outline=landmarks.views.side.outlines['head-back'],scale=1.83/578;
  const referenceAt=y=>{
    for(let i=1;i<outline.length;i++){
      const a=outline[i-1],b=outline[i];
      if(y>=a[1]&&y<=b[1])return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
    }
    assert.fail(`missing side reference hair contour at y${y}`);
  };
  const rearAt=y=>{
    const z=(641-y)*scale,depth=[];
    for(const face of core.faces)for(let i=0;i<face.length;i++){
      const a=core.vertices[face[i]],b=core.vertices[face[(i+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)depth.push(a[1]+t*(b[1]-a[1]));
    }
    assert.ok(depth.length>=4,`real rear skull cross-section at native y${y}`);
    return 270-Math.max(...depth)/scale;
  };
  const errors=[];
  for(const y of [67,77,85]){
    const skull=rearAt(y),hair=referenceAt(y);
    // Three millimetres of exterior hair contact is one native pixel at this scale.
    if(skull<hair+.003/scale)errors.push(`y${y} skull ${skull.toFixed(1)} before hair ${hair.toFixed(1)}`);
  }
  for(const y of [95,101]){
    const skull=rearAt(y);
    if(Math.abs(skull-243.2)>2)
      errors.push(`lower y${y} skull ${skull.toFixed(1)} moved from accepted 243.2`);
  }
  assert.deepEqual(errors,[],`upper skull fits reference shell; lower head stays put: ${errors.join('; ')}`);
});

test('trouser folds follow visible intermediate contours while accepted bands stay fixed', () => {
  const source=json('rook-p2-source.json'),mesh=source.meshes.find(part=>
    part.lod==='near'&&part.role==='trousers');
  assert.ok(mesh);
  const scale=1.83/578,errors=[];
  // y525 was previously 52 from the stale oracle. Native background separation
  // independently measures the visible left outer cloth edge at x38 there.
  for(const [y,referenceLeft] of [[425,50],[475,44],[525,38]]){
    const z=(641-y)*scale,points=[];
    for(const face of mesh.faces)for(let i=0;i<face.length;i++){
      const a=mesh.vertices[face[i]],b=mesh.vertices[face[(i+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    assert.ok(points.length>=8,`cloth section at native y${y}`);
    const depths=points.map(p=>p[1]),midDepth=(Math.min(...depths)+Math.max(...depths))/2;
    const front=points.filter(p=>p[1]<=midDepth);
    assert.ok(front.length>=4,`visible trouser surface at native y${y}`);
    const left=112+Math.min(...front.filter(p=>p[0]<0).map(p=>p[0]))/scale;
    if(Math.abs(left-referenceLeft)>5)
      errors.push(`front left cloth y${y}: ${left.toFixed(1)} vs ${referenceLeft}`);
    if(y===525){
      const sideFront=270-Math.min(...points.map(p=>p[1]))/scale;
      if(Math.abs(sideFront-283)>6)
        errors.push(`visible side lower calf y525: ${sideFront.toFixed(1)} vs 283`);
    }
  }
  assert.deepEqual(errors,[],`measured visible fold inflections: ${errors.join('; ')}`);
});

test('Rook vest frames a measured widening teal opening with unequal soft hems', () => {
  const source=json('rook-p2-source.json'),marks=json('rook-p2-landmarks.json').views.front.outlines;
  const scale=1.83/578,parts=['vest-left','vest-right'].map(role=>source.meshes.find(mesh=>
    mesh.lod==='near'&&mesh.role===role));
  assert.ok(parts.every(Boolean),'both torso cloth panels remain separately authored');
  const section=(part,imageY)=>{
    const z=(641-imageY)*scale,points=[];
    for(const face of part.faces)for(let edge=0;edge<face.length;edge++){
      const a=part.vertices[face[edge]],b=part.vertices[face[(edge+1)%face.length]];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    const depth=points.map(point=>point[1]),mid=(Math.min(...depth)+Math.max(...depth))/2;
    const visible=points.filter(point=>point[1]<=mid);
    assert.ok(visible.length>=4,`${part.role} has real front cloth at native y${imageY}`);
    return [112+Math.min(...visible.map(point=>point[0]))/scale,
      112+Math.max(...visible.map(point=>point[0]))/scale];
  };
  const traceAt=(name,y)=>{
    const trace=marks[name];
    for(let i=1;i<trace.length;i++){
      const a=trace[i-1],b=trace[i];
      if(y>=a[1]&&y<=b[1])return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
    }
    assert.fail(`missing traced ${name} at y${y}`);
  };
  const errors=[];
  for(const y of [180,211,241,269,289]){
    const left=section(parts[0],y),right=section(parts[1],y);
    const expected=[traceAt('vest-left-outer',y),traceAt('vest-left-inner',y),
      traceAt('vest-right-inner',y),traceAt('vest-right-outer',y)];
    const actual=[left[0],left[1],right[0],right[1]];
    for(let edge=0;edge<4;edge++)if(Math.abs(actual[edge]-expected[edge])>7)
      errors.push(`y${y} edge${edge} ${actual[edge].toFixed(1)} vs ${expected[edge].toFixed(1)}`);
    assert.ok(left[1]+.003/scale<right[0],`teal shirt stays visibly open at y${y}`);
  }
  assert.deepEqual(errors,[],`vest visible edges match measured front trace: ${errors.slice(0,8).join('; ')}`);
});

test('vest lapels stand proud of cloth and pockets hang with unequal shaped flaps', () => {
  const source=json('rook-p2-source.json');
  const near=source.meshes.filter(mesh=>mesh.lod==='near');
  for(const side of ['left','right']){
    const vest=near.filter(mesh=>mesh.role===`vest-${side}`);
    assert.ok(vest.length,'retain the separately paintable vest panel');
    const points=vest.flatMap(mesh=>mesh.vertices);
    const band=(low,high)=>points.filter(([x,,z])=>
      Math.abs(x)>=.025&&Math.abs(x)<=.13&&z>=low&&z<=high);
    const lapel=band(1.45,1.55),lower=band(1.35,1.43);
    assert.ok(lapel.length>=6&&lower.length>=6,'lapel and lower return have surface');
    const tip=Math.min(...lapel.map(point=>point[1]));
    const cloth=Math.min(...lower.map(point=>point[1]));
    assert.ok(tip<=cloth-.01,
      `${side} upper lapel projects at least 10mm over adjacent lower cloth: ${tip} vs ${cloth}`);
  }
  const pockets=near.filter(mesh=>mesh.role==='pocket');
  const flaps=['left','right'].map(side=>pockets.find(mesh=>
    mesh.name.includes('flap')&&mesh.name.includes(side)));
  assert.ok(flaps.every(Boolean),'two lower pocket flaps remain attached to vest');
  for(const [index,flap] of flaps.entries()){
    const lower=flap.vertices.filter(point=>point[2]<Math.max(...flap.vertices.map(v=>v[2]))-.02);
    assert.ok(lower.length>=2,`${index?'right':'left'} pocket has a hanging lower flap edge`);
    const tilt=Math.max(...lower.map(point=>point[2]))-Math.min(...lower.map(point=>point[2]));
    assert.ok(tilt>=.008,
      `${index?'right':'left'} soft flap edge slopes visibly instead of ending as a square box: ${tilt}`);
  }
});

test('back fabric forms a connected diagonal drape down to the retained satchel', () => {
  const source=json('rook-p2-source.json');
  const parts=source.meshes.filter(mesh=>mesh.lod==='near'&&mesh.role==='pack');
  assert.ok(parts.length>=1,'existing pack chart still owns the rear fabric');
  const crossing=parts.filter(part=>{
    const z=part.vertices.map(point=>point[2]);
    return Math.max(...z)>=1.5&&Math.min(...z)<=1.2;
  });
  assert.ok(crossing.length>=1,
    'one actual back fabric surface connects shoulder drape to lower satchel height');
  const diagonal=crossing.some(part=>{
    const high=part.vertices.filter(point=>point[2]>1.47),low=part.vertices.filter(point=>point[2]<1.25);
    if(high.length<2||low.length<2)return false;
    const centre=points=>points.reduce((sum,point)=>sum+point[0],0)/points.length;
    return Math.abs(centre(high)-centre(low))>=.035;
  });
  assert.ok(diagonal,'rear fabric has a visible diagonal travel rather than three level rolls');
  assert.ok(parts.some(part=>part.vertices.some(point=>point[2]<=1.07)&&
    part.vertices.some(point=>point[2]>=1.14)),
  'lower rear satchel remains as a real volume beneath the drape');
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
