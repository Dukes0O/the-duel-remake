// QA-only independent native input. Its 720-second sine period is longer
// than this 90-second recording; each positive float32 value is unique.
export function createCaptureWitness(sampleRate) {
  const count = Math.floor(sampleRate * 90), values = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    values[i] = Math.sin(.1 + i / count * Math.PI / 4);
    if (i && !(values[i] > values[i - 1]))
      throw Error('Sample rate does not support unique float32 witness values');
  }
  return values;
}

// This uses sample identity only. Neither frame labels nor wall clocks can
// turn a missing or repeated sample into a passing diagnostic.
export function inspectCaptureWitness(samples, reference) {
  if (!samples.length) return {complete: false, reason: 'empty measured witness'};
  let lo = 0, hi = reference.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (reference[mid] < samples[0]) lo = mid + 1;
    else hi = mid;
  }
  if (lo >= reference.length || reference[lo] !== samples[0])
    return {complete: false, reason: 'first measured sample has no source identity'};
  for (let i = 0; i < samples.length; i++) {
    if (lo + i >= reference.length || samples[i] !== reference[lo + i])
      return {complete: false, sourceStartFrame: lo, checkedFrames: i,
        firstMismatch: {measuredFrame: i, sourceFrame: lo + i,
          expected: reference[lo + i] ?? null, actual: samples[i]}};
  }
  return {complete: true, sourceStartFrame: lo, checkedFrames: samples.length};
}

export const recorderWorkletSource = `class Meter extends AudioWorkletProcessor {
  constructor(){super();this.pcm=new Float32Array(4096);this.at=0;this.first=0;
    this.witness=new Float32Array(2048);this.callbacks=[];}
  process(inputs){const a=inputs[0]||[],l=a[0],r=a[1]||l,w=inputs[1]?.[0];
    this.callbacks.push({frame:currentFrame,chunkOffset:this.at/2,
      leftFrames:l?.length||0,rightFrames:a[1]?.length||0,witnessFrames:w?.length||0});
    for(let i=0;i<128;i++){if(!this.at)this.first=currentFrame+i;
      this.witness[this.at/2]=w?.[i]||0;
      this.pcm[this.at++]=l?.[i]||0;this.pcm[this.at++]=r?.[i]||0;
      if(this.at===4096){this.port.postMessage({frame:this.first,pcm:this.pcm,
        witness:this.witness,callbacks:this.callbacks},[this.pcm.buffer,this.witness.buffer]);
        this.pcm=new Float32Array(4096);this.witness=new Float32Array(2048);
        this.callbacks=[];this.at=0;}}
    return true;}}
  registerProcessor('arsenal-native-meter',Meter);`;
