// DEEP-LOG picture recipe (THE_DEEP 6.4): renders each creature model
// (public/assets/models/deep/) with the look page's own Three
// module on a transparent background, so the garage darkens the same picture
// into a grey shape. Pictures and a comparison sheet go to the evidence folder;
// with DUEL_DEEP_LOG_INSTALL=1 the pictures also replace public/assets/deep/log/.
//   DUEL_DEEP_LOG_INSTALL=1 node tools/browser-harness.mjs scenario deep-log-pictures
// The sardine card is a school: thirty-four of the one-fish model in a fixed loose cigar.
// Photography only: no race, no save (the look page's memory storage), no timing.
import {mkdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {DEEP_CREATURES, logPicture} from '../../src/deep/deep-log.js';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const WIDTH = 480, HEIGHT = 360;
// Each creature's view: azimuth round it (degrees from its +z side) and height above (degrees).
const VIEW = {default: [55, 18], 'silver-school': [30, 16], ray: [35, 62], manta: [30, 55], jellyfish: [30, 8],
  crab: [30, 35], octopus: [35, 30], whale: [60, 12], otter: [50, 30]};

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1200, height: 760, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/deep-look.html?quality=high&still=1&clean=1&manual=1&art-qa=1');
  await context.waitFor('window.__deepLook?.ready===true&&!!window.__deepLook.artQa', 'look page Three module', 90000);
  await context.evaluate(`(()=>{
    const {THREE,GLTFLoader,installIsolatedStorage}=window.__deepLook.artQa;installIsolatedStorage();
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
    renderer.setSize(${WIDTH},${HEIGHT},false);renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
    window.__deepLogPicture=async(id,azimuth,height)=>{
      const scene=new THREE.Scene();
      scene.add(new THREE.HemisphereLight(0xcfeaf2,0x1d3a44,1.6));
      const sun=new THREE.DirectionalLight(0xfff4e0,2.2);sun.position.set(2,5,3);scene.add(sun);
      const gltf=await new GLTFLoader().loadAsync('/assets/models/deep/'+id+'.glb');
      let model=gltf.scene;
      if(id==='silver-school'){
        // One sardine is not the card's picture: a school, the same fixed fish and layout every run.
        let seed=7;const next=()=>(seed=seed*16807%2147483647)/2147483647;
        model=new THREE.Group();
        for(let i=0;i<34;i++){
          const fish=gltf.scene.clone(true);
          fish.position.set((next()+next()-1)*.62,(next()+next()-1)*.34,(next()+next()-1)*.42);
          fish.rotation.set((next()-.5)*.14,Math.PI/2+(next()-.5)*.42,(next()-.5)*.5,'YXZ');
          fish.scale.setScalar(.88+next()*.24);model.add(fish);
        }
      }
      if(gltf.animations.length){const mixer=new THREE.AnimationMixer(model);for(const clip of gltf.animations)mixer.clipAction(clip).play();mixer.setTime(.67);}
      scene.add(model);model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model),centre=box.getCenter(new THREE.Vector3());
      const radius=box.getBoundingSphere(new THREE.Sphere()).radius||1;
      const camera=new THREE.PerspectiveCamera(30,${WIDTH}/${HEIGHT},radius/100,radius*100);
      const a=azimuth*Math.PI/180,h=height*Math.PI/180,distance=radius/Math.sin(15*Math.PI/180)*.92;
      camera.position.set(centre.x+Math.sin(a)*Math.cos(h)*distance,centre.y+Math.sin(h)*distance,centre.z+Math.cos(a)*Math.cos(h)*distance);
      camera.lookAt(centre);
      // Fit: move in or out until the model's own points fill about 85% of the picture.
      const corners=[];
      model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,step=Math.max(1,Math.floor(p.count/1500));
        if(o.isSkinnedMesh)o.skeleton.update();
        for(let i=0;i<p.count;i+=step){const v=new THREE.Vector3();
          if(o.isSkinnedMesh)o.getVertexPosition(i,v);else v.fromBufferAttribute(p,i);corners.push(v.applyMatrix4(o.matrixWorld));}});
      for(let pass=0;pass<3;pass++){
        camera.updateMatrixWorld(true);
        const extent=Math.max(...corners.map(c=>{const p=c.clone().project(camera);return Math.max(Math.abs(p.x),Math.abs(p.y));}));
        camera.position.sub(centre).multiplyScalar(extent/.85).add(centre);
      }
      renderer.render(scene,camera);
      scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of [].concat(o.material||[]))m.dispose();}});
      return renderer.domElement.toDataURL('image/webp',.86);
    };
  })()`);
  const install = process.env.DUEL_DEEP_LOG_INSTALL === '1', target = join(root, 'public/assets/deep/log');
  if (install) await mkdir(target, {recursive: true});
  const made = [];
  for (const id of Object.keys(DEEP_CREATURES)) {
    if (!logPicture(id)) continue;
    const [azimuth, height] = VIEW[id] ?? VIEW.default;
    const data = await context.evaluate(`window.__deepLogPicture(${JSON.stringify(id)},${azimuth},${height})`);
    if (typeof data !== 'string' || !data.startsWith('data:image/webp')) throw Error(id + ': the browser gave no WebP picture');
    const bytes = Buffer.from(data.split(',')[1], 'base64');
    await writeFile(join(context.outputDir, id + '.webp'), bytes);
    if (install) await writeFile(join(target, id + '.webp'), bytes);
    made.push({id, data, bytes: bytes.length});
  }
  // The comparison sheet: each card on the log's own water colour, with its grey shape.
  await context.evaluate(`(()=>{document.body.innerHTML=${JSON.stringify(`<div style="position:fixed;inset:0;z-index:99;background:#0a2028;display:grid;grid-template-columns:repeat(5,236px);gap:4px;padding:4px;font:12px sans-serif;color:#dfe">${
    made.map(({id, data}) => `<figure style="margin:0;padding:6px;background:radial-gradient(circle at 50% 30%,#1f5263,#0a2028 70%)"><img src="${data}" style="width:224px;display:block"><figcaption>${DEEP_CREATURES[id].name}</figcaption><img src="${data}" style="width:96px;filter:brightness(0) opacity(.45)"></figure>`).join('')}</div>`)};})()`);
  await new Promise(done => setTimeout(done, 500));
  const shot = await context.command('Page.captureScreenshot', {format: 'jpeg', quality: 80, clip: {x: 0, y: 0, width: 1200, height: 760, scale: 1}});
  const sheet = join(context.outputDir, 'deep-log-sheet.jpg');
  await writeFile(sheet, Buffer.from(shot.data, 'base64'));
  context.screenshots.push(sheet);
  await writeFile(join(context.outputDir, 'deep-log-pictures.json'), JSON.stringify({installed: install,
    pictures: made.map(({id, bytes}) => ({id, bytes}))}, null, 2) + '\n');
}
