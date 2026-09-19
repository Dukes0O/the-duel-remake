import * as THREE from 'three';

// Fixed pools of expanding flame and smoke sprites, metal panels and a ground blast.
export function createExplosion() {
  const group=new THREE.Group(), count=180, positions=new Float32Array(count*3), data=new Float32Array(count*4);
  const life=new Float32Array(count), maxLife=new Float32Array(count), velocity=new Float32Array(count*3);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('puff',new THREE.BufferAttribute(data,4).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{time:{value:0}},
    vertexShader:`attribute vec4 puff; varying vec4 vPuff; void main(){vPuff=puff;
      vec4 v=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*v;
      gl_PointSize=clamp(puff.x*620./max(1.,-v.z),0.,520.);}`,
    fragmentShader:`uniform float time;varying vec4 vPuff;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      void main(){vec2 p=gl_PointCoord*2.-1.;float n=noise(p*4.+vPuff.w+time*.4)*.65+noise(p*9.-time*.25)*.35;
        float r=length(p), mask=1.-smoothstep(.35+n*.23,.87+n*.13,r);
        float age=vPuff.y, alpha=mask*min(1.,age*12.)*pow(1.-age,.75);
        vec3 c;
        if(vPuff.z<.5){float heat=clamp((1.-r)*1.7-age*.9+n*.4,0.,1.);
          c=mix(vec3(.8,.024,.001),vec3(2.8,.48,.015),smoothstep(.12,.7,heat));
          c=mix(c,vec3(3.6,1.45,.12),smoothstep(.84,1.,heat));alpha*=.83;
        } else {c=mix(vec3(.055,.052,.05),vec3(.28,.25,.22),n*.7+(1.-r)*.22); alpha*=.66;}
        gl_FragColor=vec4(c,alpha);if(alpha<.012)discard;
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const puffs=new THREE.Points(geometry,material);puffs.frustumCulled=false;puffs.renderOrder=5;group.add(puffs);
  const light=new THREE.PointLight(0xff7b1b,0,42,1.4);group.add(light);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,64),new THREE.MeshBasicMaterial({color:0xffbc63,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  ring.rotation.x=-Math.PI/2;group.add(ring);
  const panels=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,.055,.75),new THREE.MeshStandardMaterial({color:0x514037,metalness:.7,roughness:.52}),18);
  panels.castShadow=true;panels.frustumCulled=false;group.add(panels);
  const tires=new THREE.InstancedMesh(new THREE.TorusGeometry(.32,.105,8,28),new THREE.MeshStandardMaterial({color:0x111314,roughness:.86}),2);
  tires.castShadow=true;tires.frustumCulled=false;group.add(tires);
  const wheels=Array.from({length:2},()=>({p:new THREE.Vector3(),v:new THREE.Vector3()}));
  const chunks=Array.from({length:18},()=>({p:new THREE.Vector3(),v:new THREE.Vector3(),life:0})), o=new THREE.Object3D();
  let cursor=0,previous=false,age=0,clock=0,budget=0,ground=0;
  function emit(p,smoke,burst=false){const i=cursor++%count,j=i*3,k=i*4;
    positions[j]=p.x+(Math.random()-.5)*2;positions[j+1]=p.y+.5+Math.random();positions[j+2]=p.z+(Math.random()-.5)*3;
    velocity[j]=(Math.random()-.5)*(burst?15:1.7);velocity[j+1]=smoke?3+Math.random()*3:1.5+Math.random()*3;velocity[j+2]=(Math.random()-.5)*(burst?15:1.7);
    maxLife[i]=smoke?3.5+Math.random()*2.5:.6+Math.random()*.7;life[i]=maxLife[i];
    data[k]=0;data[k+1]=0;data[k+2]=smoke?1:0;data[k+3]=Math.random()*100;
  }
  function clear(){life.fill(0);data.fill(0);chunks.forEach(c=>c.life=0);light.intensity=0;ring.material.opacity=0;}
  clear();
  function update(p,state,dt){
    const active=!!state.catastrophic&&state.status!=='menu';
    if(!active){if(previous)clear();previous=false;group.visible=false;return;}
    group.visible=true;
    if(!(dt>0))return; dt=Math.min(.06,dt);clock+=dt;material.uniforms.time.value=clock;
    if(!previous){clear();age=0;budget=0;ground=p.y;ring.position.set(p.x,p.y+.12,p.z);
      for(let i=0;i<75;i++)emit(p,i>40,true);
      chunks.forEach((c,i)=>{c.p.set(p.x+(Math.random()-.5)*2,p.y+.6,p.z);c.v.set((Math.random()-.5)*16,4+Math.random()*10,(Math.random()-.5)*16);c.life=6;});
      wheels.forEach((c,i)=>{c.p.set(p.x+(i?1:-1),p.y+.5,p.z);c.v.set((i?1:-1)*5,4+i*2,-3+i*5);});
    }
    previous=true;age+=dt;budget+=dt*22;
    while(budget>=1){budget--;emit(p,Math.random()<.68);}
    light.position.set(p.x,p.y+2,p.z);light.intensity=(age<.6?65*Math.exp(-age*3):6+Math.sin(clock*19)*1.5);
    ring.scale.setScalar(1+Math.min(age,1.5)*18);ring.material.opacity=Math.max(0,.4-age*.48);
    for(let i=0;i<count;i++){const j=i*3,k=i*4;if(life[i]<=0){data[k]=0;data[k+1]=1;continue;}
      life[i]=Math.max(0,life[i]-dt);const t=1-life[i]/maxLife[i],smoke=data[k+2]>.5;
      positions[j]+=velocity[j]*dt;positions[j+1]+=velocity[j+1]*dt;positions[j+2]+=velocity[j+2]*dt;
      velocity[j]*=Math.exp(-1.1*dt);velocity[j+2]*=Math.exp(-1.1*dt);
      data[k]=(smoke?1.3:1.8)+t*(smoke?6:2.8);data[k+1]=t;
    }
    geometry.attributes.position.needsUpdate=true;geometry.attributes.puff.needsUpdate=true;
    chunks.forEach((c,i)=>{c.life=Math.max(0,c.life-dt);c.v.y-=14*dt;c.p.addScaledVector(c.v,dt);
      if(c.p.y<ground+.1){c.p.y=ground+.1;c.v.y*= -.32;c.v.x*=.84;c.v.z*=.84;}
      o.position.copy(c.p);o.rotation.set(age*(i%3+1),age*(i%4+2),age*(i%5+2));o.scale.setScalar(c.life>0?Math.min(1,c.life):0);o.updateMatrix();panels.setMatrixAt(i,o.matrix);});
    panels.instanceMatrix.needsUpdate=true;
    wheels.forEach((c,i)=>{c.v.y-=12*dt;c.p.addScaledVector(c.v,dt);
      if(c.p.y<ground+.14){c.p.y=ground+.14;c.v.y*= -.4;c.v.x*=.92;c.v.z*=.92;}
      o.position.copy(c.p);o.rotation.set(Math.min(age*3,Math.PI/2),0,age*2);o.scale.setScalar(1);o.updateMatrix();tires.setMatrixAt(i,o.matrix);});tires.instanceMatrix.needsUpdate=true;
  }
  return {group,update,dispose(){geometry.dispose();material.dispose();ring.geometry.dispose();ring.material.dispose();panels.geometry.dispose();panels.material.dispose();panels.dispose();tires.geometry.dispose();tires.material.dispose();tires.dispose();group.removeFromParent();group.clear();}};
}
