import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'memory-only offline weapon audio',30_000);
  const recordings=await context.evaluate(`(async () => {
    const Audio=window.__qaApp.audio.constructor;
    const recordings=[];
    for(const weapon of ['ufo','bomb','crossbow','star']) {
      const sampleRate=44100,context=new OfflineAudioContext(1,Math.round(sampleRate*.55),sampleRate);
      const audio=new Audio();audio.context=context;audio.muted=false;audio.paused=false;
      audio.master=context.createGain();audio.master.gain.value=.42;
      audio.master.connect(context.destination);
      audio.noiseBuffer=context.createBuffer(1,sampleRate,sampleRate);
      const noise=audio.noiseBuffer.getChannelData(0);
      let seed=1989;
      for(let i=0;i<noise.length;i++){
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;
        noise[i]=seed/2147483648-1;
      }
      // OfflineAudioContext stays suspended until rendering starts; schedule
      // the same event-selected cue directly into that graph.
      audio._weaponCue(weapon);
      const data=(await context.startRendering()).getChannelData(0);
      let peak=0,power=0,zeroCrossings=0,lastActive=0;
      const pcm=new Uint8Array(data.length*2),view=new DataView(pcm.buffer);
      for(let i=0;i<data.length;i++){
        const value=data[i];peak=Math.max(peak,Math.abs(value));power+=value*value;
        if(i && (value>=0)!==(data[i-1]>=0))zeroCrossings++;
        if(Math.abs(value)>.003)lastActive=i;
        view.setInt16(i*2,Math.max(-32768,Math.min(32767,Math.round(value*32767))),true);
      }
      let binary='';for(let at=0;at<pcm.length;at+=8192)
        binary+=String.fromCharCode(...pcm.subarray(at,at+8192));
      recordings.push({weapon,sampleRate,peak,rms:Math.sqrt(power/data.length),
        activeMs:Math.round(lastActive/sampleRate*1000),zeroCrossings,
        pcmBase64:btoa(binary)});
    }
    return recordings;
  })()`);
  const summaries=[];
  for(const recording of recordings) {
    const {weapon,sampleRate,pcmBase64,peak,rms,activeMs,zeroCrossings}=recording;
    // The crossbow's brief snap should end sooner than the other three cues.
    const shortest=weapon==='crossbow'?80:110;
    if(peak<.025||peak>.85||rms<.005||activeMs<shortest||activeMs>520)
      throw Error(`${weapon} waveform outside audible, clean bounds: ${JSON.stringify({peak,rms,activeMs})}`);
    const file=`weapon-${weapon}.wav`;
    await writeFile(join(context.outputDir,file),
      wavFromPcm(Buffer.from(pcmBase64,'base64'),sampleRate,1));
    summaries.push({weapon,file,peak:+peak.toFixed(3),rms:+rms.toFixed(3),
      activeMs,zeroCrossings});
  }
  await writeFile(join(context.outputDir,'weapon-waveforms.json'),
    JSON.stringify({memoryOnlySaves:true,summaries},null,2)+'\n');
  console.log(`Offline Wasteland weapon waveforms: ${JSON.stringify(summaries)}`);
}
