import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const LIVE_PORT = 5174;
const TITLE = '<title>The Duel: Redline — Open Road</title>';
const DESCRIPTION = 'The Duel: Redline. Two rivals. One open road.';
const BOOTSTRAP = /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](\/(?:src\/main\.js|assets\/[^"']+\.js))["'][^>]*><\/script>/i;

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

export async function probeDuelServer(port = LIVE_PORT, { timeoutMs = 1500 } = {}) {
  let response;
  try {
    response = await fetch(`http://localhost:${port}/`, {
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
  // Accept both the built preview and the old development server, so the
  // first click after this launcher ships can reuse an already running game.
  const page = await response.text();
  const bootstrap = page.match(BOOTSTRAP)?.[1];
  if (!page.includes(TITLE) || !page.includes(DESCRIPTION) ||
      !page.includes('<div id="app"></div>') || !bootstrap) return 'occupied';
  try {
    const script = await fetch(`http://localhost:${port}${bootstrap}`, {
      method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
    });
    return script.status === 200 && script.headers.get('content-type')?.toLowerCase().includes('javascript')
      ? 'duel' : 'occupied';
  } catch {
    return 'occupied';
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()) {
  const port = process.argv[2] === '--port' ? Number(process.argv[3]) : LIVE_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('Invalid launcher probe port.');
    process.exitCode = 20;
  } else {
    const state = await probeDuelServer(port);
    if (state === 'duel') console.log('The Duel is already running.');
    if (state === 'occupied') console.error(`Port ${port} is in use by an unrecognized server.`);
    process.exitCode = { free: 0, duel: 10, occupied: 20 }[state];
  }
}
