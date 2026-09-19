import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';

// Composer render targets bypass the canvas's built-in antialiasing. A final
// edge pass preserves small road markings and vegetation in the High preset.
export function createRenderQuality({renderer,composer,ambientShading,sun,host}){
  const smoothing=new SMAAPass(host.clientWidth,host.clientHeight);composer.addPass(smoothing);
  let previous=null,previousRatio=null;
  return {
    update(high){
      high=!!high;
      const ratio=Math.min(window.devicePixelRatio||1,high?1.6:1);
      if(previous===high&&previousRatio===ratio)return;previous=high;previousRatio=ratio;
      renderer.setPixelRatio(ratio);composer.setPixelRatio(ratio);
      ambientShading.enabled=high;smoothing.enabled=high;
      const size=high?2048:1024;
      if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;}
      host.dataset.edgeSmoothing=String(high);host.dataset.shadowResolution=String(size);
    },
  };
}
