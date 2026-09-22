// Brief digital-key taps are gentler; holding a key still reaches full steering
// in 200 ms. This shapes keyboard input only, not the vehicle's steering model.
export const KEYBOARD_STEERING_START = .78;
export const KEYBOARD_STEERING_RISE_SEC = .2;
export const keyboardSteeringDirection=keys=>(keys.ArrowRight?1:0)-((keys.ArrowLeft||keys.KeyA)?1:0);

export function createKeyboardSteering(){
  let direction=0,held=0;
  const reset=()=>{direction=0;held=0;};
  // Integral of the linear ramp, including any time beyond full authority.
  const area=time=>KEYBOARD_STEERING_START*time+(1-KEYBOARD_STEERING_START)*(time<KEYBOARD_STEERING_RISE_SEC?time*time/(2*KEYBOARD_STEERING_RISE_SEC):time-KEYBOARD_STEERING_RISE_SEC/2);
  return {
    reset,
    update(next,dt){
      next=Number.isFinite(next)?Math.sign(next):0;
      if(!next){reset();return 0;}
      if(!Number.isFinite(dt)||dt<=0)return 0;
      if(next!==direction){direction=next;held=0;}
      if(held>=KEYBOARD_STEERING_RISE_SEC)return direction;
      const end=held+dt,average=(area(end)-area(held))/dt;
      held=Math.min(KEYBOARD_STEERING_RISE_SEC,end);
      return direction*Math.min(1,Math.max(KEYBOARD_STEERING_START,average));
    },
  };
}
