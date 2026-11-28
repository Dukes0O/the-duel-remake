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

// Called only during the handshake. Retain the actual first blocks so a
// failed start can distinguish extra leading silence from lost source samples.
export function inspectCaptureStartup(chunks, reference, inspect = inspectCaptureWitness) {
  let startupFrames = 0, sourceFrames = 0, started = false;
  const reasons = [], blocks = [];
  for (const chunk of chunks) {
    let offset = 0;
    if (!started) while (offset < chunk.witness.length && chunk.witness[offset] === 0) offset++;
    startupFrames += offset;
    const samples = chunk.witness.subarray(offset);
    const identity = inspect(samples, reference);
    blocks.push({frame: chunk.frame, startupFrames: offset, identity, witness: Array.from(chunk.witness)});
    if (!samples.length && !started) continue;
    started = true;
    if (!identity.complete || identity.sourceStartFrame !== sourceFrames)
      reasons.push('startup witness expected source frame ' + sourceFrames + ': ' + JSON.stringify(identity));
    sourceFrames += samples.length;
  }
  return {complete: started && !reasons.length, started, startupFrames, sourceFrames, reasons, blocks};
}

// Shared check-tool adaptation of P4's witnessed coordinates. Retain raw labels
// and PCM; only independent sample identity can establish their position.
export function inspectWitnessedChunks(chunks, sourceStartFrame, reference, inspect = inspectCaptureWitness) {
  const reasons = [], clockNotes = [], positioned = [];
  let started = false, covered = 0;
  for (const [index, chunk] of chunks.entries()) {
    let startupFrames = 0;
    if (!started) while (startupFrames < chunk.witness.length && chunk.witness[startupFrames] === 0) startupFrames++;
    const samples = chunk.witness.subarray(startupFrames), identity = inspect(samples, reference);
    const callbacks = chunk.callbacks ?? [];
    const badCallback = callbacks.some((row, i) => {
      if ((row.chunkOffset ?? row.offset) !== i * 128) return true;
      if ((i + 1) * 128 <= startupFrames) return false;
      if ((row.witnessFrames ?? row.lengths?.at(-1)?.[0]) !== 128) return true;
      return row.lengths
        ? row.lengths.slice(0, -1).some(channels => channels.some(length => length !== 128))
        : ![0, 128].includes(row.leftFrames) || ![0, 128].includes(row.rightFrames);
    });
    if (chunk.pcm.length !== 4096 || chunk.witness.length !== 2048 || callbacks.length !== 16 ||
        badCallback)
      reasons.push('short PCM, witness or callback input at block ' + index);
    if (!samples.length && !started) {
      positioned.push({...chunk, sampleFrame: null, startupFrames, identity});
      continue;
    }
    started = true;
    if (!identity.complete || identity.sourceStartFrame !== covered)
      reasons.push('witness gap/repeat at block ' + index + ': expected source frame ' + covered + ', ' + JSON.stringify(identity));
    const sampleFrame = identity.complete ? sourceStartFrame + identity.sourceStartFrame - startupFrames : null;
    if (sampleFrame !== null) {
      if (chunk.frame !== sampleFrame) clockNotes.push({block: index, actualFrame: chunk.frame, expectedFrame: sampleFrame});
      for (const row of callbacks) {
        const offset = row.chunkOffset ?? row.offset;
        if (row.frame !== sampleFrame + offset)
          clockNotes.push({block: index, chunkOffset: offset, actualFrame: row.frame, expectedFrame: sampleFrame + offset});
      }
    }
    positioned.push({...chunk, sampleFrame, startupFrames, identity});
    covered += samples.length;
  }
  if (!started) reasons.push('no witnessed source samples');
  return {complete: started && !reasons.length, reasons, clockNotes, chunks: positioned};
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
