import {createKeyboardSteering} from '../src/keyboard-steering.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {DRIVE, steeringYawAuthority, steeringGrip, TYRE_SLIP, tyreSlipGrip,
  tyreSlipScrub, tyreSlipSteering, stepTyreSlip, tyreSlipAngle, tyreSlipRawSound, steerForYaw} from '../src/config.js';
const near=(a,b,t=1e-12)=>assert.ok(Math.abs(a-b)<=t, a+' differs from '+b);

test('released driving constants and authority function remain byte-identical',()=>{
  const hash=s=>createHash('sha256').update(s).digest('hex');
  assert.equal(hash(JSON.stringify(DRIVE)), '89f3e6debda3ad1c5400b9a2807fc695b062df55169b0d55ca2c5170e35bdc5c');
  assert.equal(hash(steeringYawAuthority.toString()), '36e5d75c64cc15c08a9b280880a43804b6162d4fcb7cd0b954fc552830fcafa9');
});

test('grip and scrub reproduce the independently reviewed Casual/Pro table',()=>{
  for(const [slip,cg,pg,cs,ps] of [[0,1,1,0,0],[1,1,1,0,0],[1.05,.98,.964,1.6,2.8],
    [1.1,.96,.928,3.2,5.6],[1.25,.9,.82,8,14],[2,.9,.82,8,14]]){
    near(tyreSlipGrip(slip,'casual'),cg);near(tyreSlipGrip(slip,'pro'),pg);
    near(tyreSlipScrub(slip,'casual'),cs);near(tyreSlipScrub(slip,'pro'),ps);
  }
  assert.ok(Object.isFrozen(TYRE_SLIP));assert.ok(Object.isFrozen(TYRE_SLIP.casual));
});

test('braking uses the same steering grip and demand sensitivity stays fixed',()=>{
  for(const grip of [.35,.7,1,1.2])for(const traction of [.5,.8,1]){
    const dry=tyreSlipSteering({speedMph:100,grip,traction});
    const half=tyreSlipSteering({speedMph:100,grip,traction,brake:.5});
    const full=tyreSlipSteering({speedMph:100,grip,traction,brake:1});
    near(dry.peakYaw,30*grip*traction/44.704);near(full.peakYaw/dry.peakYaw,.8);
    near(half.peakYaw/dry.peakYaw,.9539392014169457);assert.equal(full.steerGain,dry.steerGain);
  }
  assert.equal(steeringGrip(20,.7,{lowSpeedSteer:true}),1);
  assert.equal(steeringGrip(45,.7,{lowSpeedSteer:true}),.7);
  assert.equal(steeringGrip(20,.7),.7);
});

test('full demand and snow follow the reviewed grip limits',()=>{
  for(const [mph,ask] of [[40,.804672],[50,1.00584],[60,1.207008],[80,1.25],[100,1.25],[120,1.25]]){
    const x=tyreSlipSteering({speedMph:mph});near(x.steerGain/x.peakYaw,ask);
  }
  const dry=tyreSlipSteering({speedMph:60}),snow=tyreSlipSteering({speedMph:60,grip:.7});
  near(.8/dry.peakYaw,.715264);near(.8/snow.peakYaw,1.0218057142857143);
});

test('slip rise/fall use exact exponential response independent of step partitions',()=>{
  const expected=1.25*(1-Math.exp(-6));near(stepTyreSlip(0,1.25,.5),expected);
  for(const fps of [30,60,120,144]){
    let slip=0,remaining=.5;
    while(remaining>1e-14){const dt=Math.min(remaining,1/fps);slip=stepTyreSlip(slip,1.25,dt);remaining-=dt;}
    near(slip,expected);assert.ok(slip>1.2375&&slip<1.25);
  }
  near(stepTyreSlip(1.25,.75,.3),.75+.5*Math.exp(-2.4));
  for(const conditions of [{reversing:true},{airborne:true},{knock:true},{speedMph:14.99}])
    near(stepTyreSlip(1.25,1.25,.3,conditions),1.25*Math.exp(-2.4));
  near(stepTyreSlip(1.25,1.25,.3,{speedMph:15}),1.25);
});

test('drawn angle follows actual slip, stays bounded, and crosses zero with steering',()=>{
  for(const [surface,max] of [['road',.21],['gravel',.25],['offroad',.31]]){
    for(const [slip,angle] of [[0,0],[.9,.045],[1,.075],[1.25,max],[2,max]]){
      near(tyreSlipAngle(slip,1,surface),-angle);near(tyreSlipAngle(slip,-1,surface),angle);
      near(tyreSlipAngle(slip,0,surface),0);
    }
  }
});

test('tyre-loop input is actual slide only and leaves gain mapping to existing audio',()=>{
  for(const [slip,raw] of [[0,0],[.9,0],[1,2/7],[1.1,4/7],[1.25,1],[2,1]]) near(tyreSlipRawSound(slip),raw);
});

test('driver helper preserves exact old inputs off and in every arena',()=>{
  for(const mph of [0,3,20,40,45,60,100,190])for(const grip of [.7,1,1.2])for(const traction of [.4,1])
    for(const desiredYaw of [-2,-.4,0,.4,2])for(const car of [null,{lowSpeedSteer:true}]){
      const authority=steeringYawAuthority(mph,grip,traction,car);
      const old=Math.max(-1,Math.min(1,-desiredYaw/Math.max(.05,authority)));
      assert.equal(steerForYaw(desiredYaw,{speedMph:mph,grip,traction,car}),old);
      for(const def of [{arena:true},{arena:true,venue:true}]){
        const course={def},a=steeringYawAuthority(mph,grip,traction,car,course);
        assert.equal(steerForYaw(desiredYaw,{speedMph:mph,grip,traction,car,course,tyreSlip:true}),Math.max(-1,Math.min(1,-desiredYaw/Math.max(.05,a))));
      }
    }
});

test('switch-on driver input respects the peak while braking and on low-grip roads',()=>{
  for(const mph of [20,40,50,60,80,120,190])for(const grip of [.35,.7,1,1.2])for(const traction of [.4,1])
    for(const brake of [0,.5,1])for(const yaw of [-4,-.8,0,.8,4]){
      const options={speedMph:mph,grip,traction,brake,tyreSlip:true},x=tyreSlipSteering(options),steer=steerForYaw(yaw,options);
      assert.ok(Math.abs(steer)<=1);assert.ok(Math.abs(steer)*x.steerGain<=x.peakYaw+1e-12);
    }
});


test('opt-in keyboard keeps every fixed-speed tap and held yaw within STEER-055',()=>{
  for(const [speed,cap] of [[40,1],[50,.956911636],[60,.766357804],[80,.68],[100,.62],[120,.56]]){
    const old=createKeyboardSteering(),next=createKeyboardSteering(),x=tyreSlipSteering({speedMph:speed});
    let last;
    for(let i=0;i<80;i++){
      const a=old.update(1,1/120,speed),b=next.update(1,1/120,speed,{tyreSlip:true});
      near(b*x.steerGain,a*steeringYawAuthority(speed),1e-9);last=b;
    }
    near(last,cap,1e-9);
  }
  for(const speed of [0,20,39.99,60,120])for(const arena of [false,true]){
    const old=createKeyboardSteering({arena}),next=createKeyboardSteering({arena});
    for(let i=0;i<100;i++){
      const direction=i<40?1:i<70?-1:0;
      const a=old.update(direction,1/120,speed),b=next.update(direction,1/120,speed,{tyreSlip:true,course:{def:{arena:true}}});
      assert.equal(b,a,'all arena identities retain old raw keyboard output');
    }
    if(speed<40){const a=createKeyboardSteering(),b=createKeyboardSteering();for(let i=0;i<80;i++)assert.equal(b.update(1,1/120,speed,{tyreSlip:true}),a.update(1,1/120,speed));}
  }
});
