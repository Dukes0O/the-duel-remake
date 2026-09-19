import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createUnlockedVehicle} from '../src/unlock-vehicles.js';
import {createClassicVehicle} from '../src/classic-vehicles.js';
import {loadHeroVehicle} from '../src/hero-vehicle.js';
import {CARS} from '../src/config.js';
import {applyVehiclePaint} from '../src/vehicle-paint.js';
import {updateVehicleDamage} from '../src/vehicles.js';
import {updateDriver} from '../src/driver.js';

const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x292d2e);scene.fog=new THREE.Fog(0x292d2e,22,65);
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment(),environment=pmrem.fromScene(room,.035);scene.environment=environment.texture;scene.environmentIntensity=.70;room.dispose();pmrem.dispose();
const floor=new THREE.Mesh(new THREE.PlaneGeometry(120,120).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x404545,roughness:.8}));floor.position.y=-.004;floor.receiveShadow=true;scene.add(floor);
const keyLight=new THREE.DirectionalLight(0xffefdc,3.2);keyLight.position.set(4,7,6);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:24});keyLight.shadow.bias=-.0003;scene.add(keyLight);
const fill=new THREE.DirectionalLight(0xb9d1e4,1.2);fill.position.set(-4,3,-3);scene.add(fill,new THREE.HemisphereLight(0xdde8f0,0x3a3a30,.9));
const camera=new THREE.PerspectiveCamera(38,1,.03,120),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=2.4;controls.maxDistance=22;controls.maxPolarAngle=Math.PI*.493;
const labels=Object.fromEntries(Object.entries(CARS).map(([key,car])=>[key,car.name])),models=new Map();
let vehicle=null,selected='falcone_f42',pose='front',damaged=false,neutral=false;
function view(next=pose){pose=next;const tall=selected==='titan_monster',height=tall?1.6:.70,d=tall?1.25:1;
  controls.target.set(0,height,0);camera.position.set(...({front:[5.9*d,height+2.2*d,7.6*d],rear:[-5.9*d,height+2.2*d,-7.6*d],side:[9.3*d,height+.8*d,.15],detail:[3.3*d,height+.18,3.4*d]}[next]));camera.lookAt(controls.target);controls.update();
}
async function show(key){if(vehicle)scene.remove(vehicle);selected=key;
  if(!models.has(key)){const car=createClassicVehicle({key,...CARS[key]})||createUnlockedVehicle({key,...CARS[key]});if(car)models.set(key,car);else{const factory=await loadHeroVehicle();models.set(key,factory({color:CARS[key].color,kind:'gt'}));}}
  if(selected!==key)return;vehicle=models.get(key);scene.add(vehicle);applyVehiclePaint(vehicle,neutral?{id:'review-neutral',color:0x939d9c,metalness:.3,roughness:.27,clearcoat:.8}:null);damage(damaged);view();for(const button of document.querySelectorAll('#models button'))button.setAttribute('aria-pressed',String(button.dataset.key===key));}
function damage(active){damaged=active;if(vehicle)updateVehicleDamage(vehicle,active?3:0,false,0,active?{front:2,rear:0,left:1,right:0}:{front:0,rear:0,left:0,right:0});}
for(const key of Object.keys(labels)){const button=document.createElement('button');button.textContent=labels[key];button.dataset.key=key;button.onclick=()=>show(key);document.querySelector('#models').append(button);}
for(const [name,callback]of[['Front three-quarter',()=>view('front')],['Rear three-quarter',()=>view('rear')],['Side silhouette',()=>view('side')],['Wheel and nose detail',()=>view('detail')],['Same neutral paint',()=>{neutral=!neutral;show(selected);}],['Toggle damage',()=>damage(!damaged)],['Steer driver',()=>{updateDriver(vehicle.userData.driver,.8,.2);vehicle.userData.wheelPivots.filter(p=>p.userData.front).forEach(p=>p.rotation.y=.45);}]] ) {const button=document.createElement('button');button.textContent=name;button.onclick=callback;document.querySelector('#views').append(button);}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();show(new URLSearchParams(location.search).get('car') in labels?new URLSearchParams(location.search).get('car'):'falcone_f42');
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);document.querySelector('#stats').textContent=`${labels[selected]} · ${pose} · ${neutral?'neutral paint':'factory paint'} · ${damaged?'damaged':'undamaged'}\n${renderer.info.render.calls} draws · ${renderer.info.render.triangles.toLocaleString()} submitted triangles (includes shadows)`;});
