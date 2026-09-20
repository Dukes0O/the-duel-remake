import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {ADAPTIVE_RESOLUTION} from './adaptive-resolution.js';

// Composer render targets bypass the canvas's built-in antialiasing. A final
// edge pass preserves small road markings and vegetation in the High preset.
export function createRenderQuality({renderer,composer,ambientShading,sun,host}){
  const smoothing=new SMAAPass(host.clientWidth,host.clientHeight);smoothing.name='Edge smoothing';composer.addPass(smoothing);
  let previous=null,previousRatio=null,previousComposerRatio=null,previousScale=null;
  return {
    update(high,scale=1){
      high=!!high;
      scale=high?1:Math.max(ADAPTIVE_RESOLUTION.minScale,Math.min(ADAPTIVE_RESOLUTION.maxScale,Number.isFinite(scale)?scale:1));
      const deviceRatio=Number.isFinite(window.devicePixelRatio)&&window.devicePixelRatio>0?window.devicePixelRatio:1;
      const ratio=Math.min(deviceRatio,high?1.6:1)*scale;
      if(previous===high&&previousRatio===ratio&&previousScale===scale)return;
      previous=high;previousScale=scale;
      if(previousRatio!==ratio){renderer.setPixelRatio(ratio);previousRatio=ratio;}
      // Performance renders directly to the canvas. Resizing unused composer
      // targets would add allocation stalls without changing its picture.
      if(high&&previousComposerRatio!==ratio){composer.setPixelRatio(ratio);previousComposerRatio=ratio;}
      ambientShading.enabled=high;smoothing.enabled=high;
      const size=high?2048:1024;
      if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;}
      host.dataset.edgeSmoothing=String(high);host.dataset.shadowResolution=String(size);
      host.dataset.resolutionScale=String(scale);host.dataset.renderPixelRatio=String(ratio);
      host.dataset.renderPipeline=high?'composite':'direct';
    },
  };
}
