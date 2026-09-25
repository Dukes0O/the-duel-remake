import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function run(context) {
  await context.navigate('/tools/audio/listening.html');
  await context.waitFor('!!window.__listeningBooth', 'listening booth', 30000);
  const result = await context.evaluate(`(async()=>{
    const booth=window.__listeningBooth;
    const storageIsMemory=!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value;
    const before=Object.keys(localStorage).length;
    await booth.play('A');
    await new Promise(r=>setTimeout(r,350));
    const level=booth.level();
    await booth.stop();
    const stopped=booth.audio.context.state;
    document.querySelector('#rating').value='4';
    document.querySelector('#listener').value='QA fixture';
    document.querySelector('#notes').value='Fixture, not a human verdict';
    document.querySelector('#bed').value='quiet';
    document.querySelector('#distance').value='far';
    const verdict=booth.verdict();
    return {storageIsMemory,before,after:Object.keys(localStorage).length,level,stopped,verdict,slots:document.querySelectorAll('[data-play]').length};
  })()`);
  if (!result.storageIsMemory || result.before !== result.after)
    throw Error('Booth touched persistent state');
  if (result.level <= 0.001 || result.stopped !== 'suspended')
    throw Error('Booth play/stop failed');
  if (
    result.slots !== 3 ||
    result.verdict.rating !== 4 ||
    result.verdict.variant !== 'A' ||
    result.verdict.bed !== 'full-throttle' ||
    result.verdict.distance !== 'near'
  )
    throw Error('Booth variants or explicit ratings failed');
  await context.screenshot('listening-booth');
  await context.navigate('/tools/audio-race-check.html');
  await context.waitFor('window.__audioQaReady', 'native-rate recorder', 30000);
  const rate = await context.evaluate(
    `(async()=>{const start=await window.__audioQaStart();const native=window.__qaApp?.audio?.context?.sampleRate;return {rate:start.sampleRate,native};})()`,
  );
  // Web Audio supports full-rate capture; a 16 kHz decimation cannot certify true peak.
  if (rate.rate < 44100)
    throw Error('Race recording discards high-frequency audio');
  await context.evaluate('window.__audioQaFinish()');
  await writeFile(
    join(context.outputDir, 'listening-check.json'),
    JSON.stringify({ ...result, rate }, null, 2) + '\n',
  );
}
