import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const LIVE_PORT = 5174;
const TITLE = '<title>The Duel: Redline — Open Road</title>';
const DESCRIPTION = 'The Duel: Redline. Two rivals. One open road.';
const BOOTSTRAP = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/(?:src\/main\.js|assets\/[^"']+\.js))["'][^>]*><\/script>/i;
const PREVIEW_TITLE = '<title>The Duel Preview</title>';
const PREVIEW_BOOTSTRAP = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/assets\/preview-[^"']+\.js)["'][^>]*><\/script>/i;

function portHasListener(port, timeoutMs) {
  return new Promise(resolve => {
    const socket = connect({ host: 'localhost', port });
    let settled = false;
    function done(value) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    }
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(timeoutMs, () => done(false));
  });
}

export async function probeDuelServer(port = LIVE_PORT, { timeoutMs = 1500, kind = 'duel',
  expectCommit = null } = {}) {
  const path=kind==='preview'?'/tools/preview.html':'/';
  let response;
  try {
    response = await fetch(`http://localhost:${port}${path}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'text/html' },
    });
  } catch {
    return await portHasListener(port, timeoutMs) ? 'occupied' : 'free';
  }
  if (response.status !== 200 || !response.headers.get('content-type')?.toLowerCase().includes('text/html')) {
    await response.body?.cancel();
    return 'occupied';
  }
  const page = await response.text();
  const preview=kind==='preview';
  const bootstrap = page.match(preview?PREVIEW_BOOTSTRAP:BOOTSTRAP)?.[1];
  const identity=preview?
    page.includes(PREVIEW_TITLE)&&page.includes('data-preview-badge')&&/>\s*PREVIEW\s*</i.test(page):
    page.includes(TITLE)&&page.includes(DESCRIPTION);
  if (!identity || !page.includes('<div id="app"></div>') || !bootstrap) return 'occupied';
  try {
    const script = await fetch(`http://localhost:${port}${bootstrap}`, {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
    });
    if (script.status !== 200 || !script.headers.get('content-type')?.toLowerCase().includes('javascript'))
      return 'occupied';
  } catch {
    return 'occupied';
  }
  if (!preview) return 'duel';
  if (!expectCommit) return 'preview';
  // A running Preview built from older work is replaced, not reopened.
  try {
    const stamp = await fetch(`http://localhost:${port}/preview-build.json`, {
      redirect: 'manual', signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' },
    });
    const built = stamp.ok ? (await stamp.json())?.commit : null;
    return built === expectCommit ? 'preview' : 'stale';
  } catch {
    return 'stale';
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const args=process.argv.slice(2),portIndex=args.indexOf('--port');
  const port = portIndex>=0 ? Number(args[portIndex+1]) : LIVE_PORT;
  const kind=args.includes('--preview')?'preview':'duel';
  const commitIndex=args.indexOf('--expect-commit');
  const expectCommit=commitIndex>=0?args[commitIndex+1]||null:null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Invalid launcher probe port.');
    process.exitCode = 20;
  } else {
    const state = await probeDuelServer(port,{kind,expectCommit});
    if (state === 'duel') console.log('The Duel is already running.');
    if (state === 'preview') console.log('The Duel Preview is already running.');
    if (state === 'stale') console.log('The running Duel Preview is older than the current work.');
    if (state === 'occupied') console.error(`Port ${port} is in use by an unrecognized server.`);
    process.exitCode = { free: 0, duel: 10, preview:10, stale: 11, occupied: 20 }[state];
  }
}
