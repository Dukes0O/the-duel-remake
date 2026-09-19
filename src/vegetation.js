import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Image-generated needle sprays form a full radial crown; roots are placed by
// course.groundAt so the same terrain surface supports every tree.
export function pineTreeAssets() {
  const parts=[];
  for(let tier=0;tier<12;tier++)for(let arm=0;arm<9;arm++){
    const reach=(2.65-tier*.205)*(1+.19*Math.sin(arm*4.1+tier*1.7)),angle=arm*Math.PI*2/9+tier*.81+.17*Math.sin(arm*3.1+tier);
    for(const tilt of [0,1.57,.8]){
      const g=new THREE.PlaneGeometry(reach,reach*.68);
      g.translate(reach*.46,0,0);g.rotateX(-Math.PI/2+tilt);g.rotateZ(-.12);
      g.rotateY(angle);g.translate(0,1.05+tier*.43+.09*Math.sin(arm*3+tier),0);parts.push(g);
    }
  }
  const crown=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const map=new THREE.TextureLoader().load('/assets/textures/pine-bough.png');
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  return {
    trunk:new THREE.CylinderGeometry(.06,.23,5.9,9).translate(0,2.95,0),
    crown,
    bark:new THREE.MeshStandardMaterial({color:0x514335,roughness:1}),
    needles:new THREE.MeshStandardMaterial({map,color:0xbed0ae,roughness:.88,alphaTest:.48,side:THREE.DoubleSide}),
  };
}

// One reusable mesh per species: rounded saguaro arms and irregular pine tiers.
export function vegetationGeometry(alpine) {
  const pieces = [];
  function add(g, color) {
    const a = g.attributes.position, colors = [], c = new THREE.Color(color);
    for (let i = 0; i < a.count; i++) {
      const shade = .79 + .18 * Math.sin(a.getX(i) * 29 + a.getY(i) * 17 + a.getZ(i) * 31);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); pieces.push(g);
  }
  if (alpine) {
    add(new THREE.CylinderGeometry(.065, .16, 5.3, 7).translate(0, 2.65, 0), 0x695840);
    for (let layer = 0; layer < 6; layer++) {
      const radius = 1.55 - layer * .22, h = 1.65 - layer * .10;
      const g = new THREE.ConeGeometry(radius, h, 14, 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
        const scallop = 1 + .2 * Math.sin(a * 7 + layer * 2.1);
        p.setXYZ(i, x * scallop, p.getY(i) + Math.sin(a * 7) * .12, z * scallop);
      }
      g.computeVertexNormals(); g.translate(Math.sin(layer * 2.4) * .12, 1.55 + layer * .66, Math.cos(layer * 2.4) * .1);
      add(g, layer % 2 ? 0x54755b : 0x456452);
    }
  } else {
    const trunk = new THREE.CapsuleGeometry(.23, 3.3, 5, 16).translate(0, 1.88, 0);
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
      const rib = 1 + .08 * Math.cos(a * 8);
      p.setXYZ(i, x * rib + Math.sin(p.getY(i) * .8) * .04, p.getY(i), z * rib);
    }
    trunk.computeVertexNormals(); add(trunk, 0x69805a);
    for (const side of [-1, 1]) {
      const height = side < 0 ? 2.8 : 2.3;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * .12, 1.55, 0), new THREE.Vector3(side * .58, 1.55, 0),
        new THREE.Vector3(side * .85, 1.83, 0), new THREE.Vector3(side * .86, height, 0),
      ]);
      add(new THREE.TubeGeometry(path, 8, .155, 8, false), 0x718765);
      add(new THREE.SphereGeometry(.155, 8, 5).translate(side * .86, height, 0), 0x819572);
    }
  }
  const result = mergeGeometries(pieces); pieces.forEach(g => g.dispose()); return result;
}
