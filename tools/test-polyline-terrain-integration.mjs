import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {createPolylineIndex} from '../src/polyline-index.js';
import {farTerrainGeometry} from '../src/world.js';
import {mountainTransform} from '../src/mountain-landscape.js';
import {planCitySkyline} from '../src/city-skyline.js';

let checks=0,vertices=0,mountains=0,towers=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const textHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const emptyHash='4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945';
// Geometry snapshots refreshed for version-4 road landforms and the lower,
// broader mountain silhouettes. The independent legacy full scan below still
// compares every terrain byte, mountain matrix and skyline against the index.
const before={
  'pacific-canyon':['94308a3da28050e2dd577c90b24cb9a9f64e0062b6dcb2296adc1f0ae4f27c06','e0f79c80b8f275865f3b52b23c737f1519c23d70df8ec0fbbb869d591259e045',emptyHash],
  'high-country':['3302775100de32f144058967c91cf009edfc0ce21678f37f2204f88dcf2dd2ee','33f68f10f1fe9ebf8fe9e8e69323271711a2cd069c715b91264511b7bbd57ff3',emptyHash],
  'harbor-highlands':['92c1dc30bd62b4f4c1b59323462105a51f3e76e1089c07da75204133e8ae9f19','e56d0bdf269392b0938e36725897fd291cacc657aab0f580ec47812e1d98898b',emptyHash],
  'titan-arena':['5f346798466b9aa20248352fcd879e0693a6c98a355300f4347efd19a54de01b',emptyHash,emptyHash],
  'midnight-chase':['f07f86f14b514cccfd80166b6cf42a86a82c1a123e2e81401e478eb94c9c9586',emptyHash,'81285e1e4e2e5618377fa770db897abd7c1af53f80adba071f97e9512139c2ad'],
  'ridge-rally':['877d9b69e62842a13400e3d296c3ba3a90ddbd5db1fdbf9da056805831008a95','cfe4ec40d216e6a9c9ef691552913d895fa34270fa4fd186cdcb06d3e2595dee',emptyHash],
  'titan-stunt-trial':['5f346798466b9aa20248352fcd879e0693a6c98a355300f4347efd19a54de01b',emptyHash,emptyHash],
  'neon-drift-trial':['f07f86f14b514cccfd80166b6cf42a86a82c1a123e2e81401e478eb94c9c9586',emptyHash,'65e2d8fbddc8b3d47f8973125f2e37c0ee5bd6ed1e9abddc8ff8a545d81298df'],
  'timberline-rush':['59e0ca753a67a22b73ecc8a5449ea20a45d3979eae9772c07f31309166893dd9','695a4c6784eff52a33c82003343a827c49c27c8ecce381801d3f725077cb7a7c',emptyHash],
};
function geometryHash(geometry){
  const hash=createHash('sha256');for(const[name,attribute]of Object.entries(geometry.attributes).sort(([a],[b])=>a.localeCompare(b))){hash.update(name);hash.update(Buffer.from(attribute.array.buffer));}
  hash.update(Buffer.from(geometry.index.array.buffer));hash.update(JSON.stringify(geometry.groups));return hash.digest('hex');
}
function legacyIndex(points){return{query(x,z){
  let index=-1,t=0,distanceSq=Infinity;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,projection=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
    const px=x-a.x-projection*dx,pz=z-a.z-projection*dz,d=px*px+pz*pz;
    if(d<distanceSq){index=i;t=projection;distanceSq=d;}
  }
  return{index,t,distanceSq};
}};}
// Run production samplers with an independent legacy full-scan query. This
// does not add a test hook or a dependency override to the shipped scene API.
const dataUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const legacyQueryModule=dataUrl(`export const createPolylineIndex=${legacyIndex.toString()};`);
async function legacyModule(file){
  const url=new URL(`../src/${file}`,import.meta.url);let source=await readFile(url,'utf8');
  check(source.includes("from './polyline-index.js'"),`${file} uses the shared index`);
  source=source.replace(/from\s+(['"])([^'"]+)\1/g,(match,quote,specifier)=>{
    const resolved=specifier==='./polyline-index.js'?legacyQueryModule:specifier.startsWith('.')?new URL(specifier,url).href:import.meta.resolve(specifier);
    return `from ${JSON.stringify(resolved)}`;
  });
  return import(dataUrl(source));
}
const [legacyWorld,legacyMountain,legacyCity]=await Promise.all(['world.js','mountain-landscape.js','city-skyline.js'].map(legacyModule));
const benchmarks=[];
for(const def of COURSE){
  const course=new Course(def,1989),samplesBefore=JSON.stringify(course.samples),featuresBefore=JSON.stringify(course.features);
  const actual=farTerrainGeometry(course,false),legacy=legacyWorld.farTerrainGeometry(course,false);
  equal(Object.keys(actual.attributes),Object.keys(legacy.attributes),'No terrain attributes added or removed');
  for(const[name,attribute]of Object.entries(actual.attributes)){
    const other=legacy.attributes[name];equal(attribute.itemSize,other.itemSize);equal(attribute.count,other.count);
    check(Buffer.from(attribute.array.buffer).equals(Buffer.from(other.array.buffer)),`${def.id}: every ${name} byte is unchanged`);
  }
  check(Buffer.from(actual.index.array.buffer).equals(Buffer.from(legacy.index.array.buffer)),`${def.id}: exact triangle winding, omission and connectivity`);equal(actual.groups,legacy.groups,'Biome material groups are unchanged');
  equal(geometryHash(actual),before[def.id][0],`${def.id}: terrain equals the audited geometry snapshot`);vertices+=actual.attributes.position.count;
  const matrices=course.features.mountains.map(mountain=>{
    const matrix=mountainTransform(course,mountain).elements;equal(matrix,legacyMountain.mountainTransform(course,mountain).elements,'Mountain height and grounded base are exactly preserved');mountains++;return matrix;
  });
  equal(textHash(matrices),before[def.id][1],`${def.id}: all mountain transforms equal the audited geometry snapshot`);
  const skyline=planCitySkyline(course);equal(skyline,legacyCity.planCitySkyline(course),'All skyline footprints, corridor clearances, roof profiles and foundations are exactly preserved');
  equal(textHash(skyline),before[def.id][2],`${def.id}: full skyline plan equals the pre-integration snapshot`);towers+=skyline.length;
  equal(JSON.stringify(course.samples),samplesBefore,'Ground samplers leave route samples immutable');equal(JSON.stringify(course.features),featuresBefore,'No route or physical scenery changes');
  const route=course.samples.filter((_,i)=>i%4===0);if(route.at(-1)!==course.samples.at(-1))route.push(course.samples.at(-1));
  for(let i=1;i<route.length;i++)check((route[i].x-route[i-1].x)**2+(route[i].z-route[i-1].z)**2>.001,'Existing coarse spans never invoke skyline’s former tiny-segment denominator guard');
  const indexed=createPolylineIndex(route),scan=legacyIndex(route),points=actual.attributes.position;
  for(let i=0;i<points.count;i+=23)equal(indexed.query(points.getX(i),points.getZ(i)),scan.query(points.getX(i),points.getZ(i)),'Actual far-grid lookup result is exact');
  benchmarks.push({indexed,scan,points:new Float32Array(points.array)});actual.dispose();legacy.dispose();
}
function timeQueries(indexed){
  const start=performance.now();let checksum=0;
  for(const benchmark of benchmarks){const query=indexed?benchmark.indexed:benchmark.scan;for(let i=0;i<benchmark.points.length;i+=3){const result=query.query(benchmark.points[i],benchmark.points[i+2]);checksum+=result.index+result.t;}}
  return{ms:performance.now()-start,checksum};
}
timeQueries(true);timeQueries(false);const indexed=timeQueries(true),legacy=timeQueries(false);equal(indexed.checksum,legacy.checksum,'Terrain benchmark has the same exact query output');
console.log(`Polyline terrain integration: ${checks} checks; ${vertices} identical far-terrain vertices, ${mountains} identical grounded mountain transforms and ${towers} identical skyline buildings. Actual far-grid queries: ${indexed.ms.toFixed(1)}ms indexed / ${legacy.ms.toFixed(1)}ms legacy (${(legacy.ms/indexed.ms).toFixed(2)}×).`);
