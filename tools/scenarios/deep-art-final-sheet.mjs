// DEEP-ART-FINAL comparison sheet: the sardine, sea lion, sea otter and gray whale, each as
// its log card (the installed picture), from three more sides (the look page's own Three,
// on the log's water colour) and in the water (a picture from the deep-life scenario).
//   node tools/browser-harness.mjs scenario deep-life --output-dir .evidence/<date>/DEEP-ART-FINAL/life
//   DUEL_FINAL_LIFE=.evidence/<date>/DEEP-ART-FINAL/life DUEL_FINAL_ROUND=1 \
//     node tools/browser-harness.mjs scenario deep-art-final-sheet
// Writes docs/board/looks/deep-art-final/round-N.jpg (500 KB at most). Photography only.
import {mkdir, readFile, stat, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const ROWS = [
  {id: 'silver-school', name: 'Sardines', water: 'life-1-sardines.jpg', views: [[55, 15], [90, 0], [0, 85]]},
  {id: 'sea-lion', name: 'California sea lion', water: 'life-5-sea-lion.jpg', views: [[60, 10], [90, 0], [0, 80]]},
  {id: 'otter', name: 'Sea otter', water: 'life-6-otter.jpg', views: [[60, 20], [90, 0], [0, 80]]},
  {id: 'whale', name: 'Gray whale', water: 'life-9-whale-2.jpg', views: [[60, 12], [90, 0], [0, 85]]},
];
const TILE = [200, 150];

export async function run(context) {
  const round = process.env.DUEL_FINAL_ROUND || '1', life = resolve(root, process.env.DUEL_FINAL_LIFE || '');
  if (!process.env.DUEL_FINAL_LIFE) throw Error('DUEL_FINAL_LIFE must name the deep-life output folder.');
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1400, height: 1300, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/deep-look.html?quality=high&still=1&clean=1&manual=1&art-qa=1');
  await context.waitFor('window.__deepLook?.ready===true&&!!window.__deepLook.artQa', 'look page Three module', 90000);
  await context.evaluate(`(()=>{
    const {THREE,GLTFLoader,installIsolatedStorage}=window.__deepLook.artQa;installIsolatedStorage();
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setSize(${TILE[0]},${TILE[1]},false);renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    window.__tile=async(id,azimuth,height)=>{
      const scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xcfeaf2,0x1d3a44,1.6));
      const sun=new THREE.DirectionalLight(0xfff4e0,2.2);sun.position.set(2,5,3);scene.add(sun);
      const gltf=await new GLTFLoader().loadAsync('/assets/models/deep/'+id+'.glb');
      const model=gltf.scene;
      if(gltf.animations.length){const mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations)mixer.clipAction(clip).play();mixer.setTime(.67);}
      scene.add(model);model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model),centre=box.getCenter(new THREE.Vector3());
      const radius=box.getBoundingSphere(new THREE.Sphere()).radius||1;
      const camera=new THREE.PerspectiveCamera(30,${TILE[0]}/${TILE[1]},radius/100,radius*100);
      const a=azimuth*Math.PI/180,h=height*Math.PI/180,distance=radius/Math.sin(15*Math.PI/180)*.92;
      camera.position.set(centre.x+Math.sin(a)*Math.cos(h)*distance,centre.y+Math.sin(h)*distance,centre.z+Math.cos(a)*Math.cos(h)*distance);
      camera.lookAt(centre);
      const points=[];
      model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,step=Math.max(1,Math.floor(p.count/1500));
        for(let i=0;i<p.count;i+=step){const v=new THREE.Vector3().fromBufferAttribute(p,i);points.push(v.applyMatrix4(o.matrixWorld));}});
      for(let pass=0;pass<3;pass++){camera.updateMatrixWorld(true);
        const extent=Math.max(...points.map(c=>{const p=c.clone().project(camera);return Math.max(Math.abs(p.x),Math.abs(p.y));}));
        camera.position.sub(centre).multiplyScalar(extent/.88).add(centre);}
      renderer.render(scene,camera);
      scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material||[]))m.dispose();}});
      return renderer.domElement.toDataURL('image/png');
    };
  })()`);
  const uri = async (path, type) => `data:${type};base64,${(await readFile(path)).toString('base64')}`;
  const rows = [];
  for (const row of ROWS) {
    const tiles = [];
    for (const [azimuth, height] of row.views) tiles.push(await context.evaluate(`window.__tile(${JSON.stringify(row.id)},${azimuth},${height})`));
    rows.push({...row, tiles, card: await uri(join(root, 'public/assets/deep/log', row.id + '.webp'), 'image/webp'),
      water: await uri(join(life, row.water), 'image/jpeg')});
  }
  const html = `<div style="position:fixed;inset:0;z-index:99;background:#06141a;font:13px 'Segoe UI',sans-serif;color:#dff0ec;padding:6px;box-sizing:border-box">
    <div style="font-size:17px;font-weight:600;color:#e8c36a;margin:2px 4px 8px">The Deep, final models, round ${round}: log card | three more sides | in the water (the game's own sea life)</div>
    ${rows.map(row => `<div style="display:grid;grid-template-columns:400px 400px 533px;gap:4px;margin-bottom:4px;height:300px">
      <figure style="margin:0;position:relative;background:radial-gradient(circle at 50% 30%,#1f5263,#0a2028 70%)"><img src="${row.card}" style="width:400px;display:block"><figcaption style="position:absolute;left:8px;bottom:6px;font-weight:600">${row.name}</figcaption></figure>
      <div style="display:grid;grid-template-columns:200px 200px;gap:0;background:#123a48">${row.tiles.map(t => `<img src="${t}" style="width:200px;height:150px">`).join('')}<div style="background:#0a2028"></div></div>
      <img src="${row.water}" style="width:533px;height:300px;object-fit:cover">
    </div>`).join('')}</div>`;
  await context.evaluate(`(()=>{document.body.innerHTML=${JSON.stringify(html)};})()`);
  await new Promise(done => setTimeout(done, 700));
  let quality = 86, bytes;
  for (; quality >= 50; quality -= 6) {
    const shot = await context.command('Page.captureScreenshot', {format: 'jpeg', quality, clip: {x: 0, y: 0, width: 1352, height: 1244, scale: 1}});
    bytes = Buffer.from(shot.data, 'base64');
    if (bytes.length <= 500_000) break;
  }
  if (bytes.length > 500_000) throw Error('The sheet is over 500 KB.');
  const directory = join(root, 'docs/board/looks/deep-art-final');
  await mkdir(directory, {recursive: true});
  const sheet = join(directory, `round-${round}.jpg`);
  await writeFile(sheet, bytes);
  context.screenshots.push(sheet);
  await writeFile(join(context.outputDir, 'sheet.json'), JSON.stringify({sheet, bytes: (await stat(sheet)).size, quality}, null, 2) + '\n');
}
