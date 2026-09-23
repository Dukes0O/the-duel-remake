import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { probeDuelServer } from './launcher-port.mjs';

const exec = promisify(execFile);
const page = await readFile(new URL('../index.html', import.meta.url), 'utf8');

async function listenPrivate(server) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const port = randomInt(5200, 62000);
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, 'localhost', () => {
          server.off('error', reject);
          resolve();
        });
      });
      return port;
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
    }
  }
  throw new Error('No private launcher test port was available');
}

async function withServer(reply, check) {
  const server = createServer(reply);
  const port = await listenPrivate(server);
  try {
    await check(port);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

async function cliState(port) {
  try {
    const { stdout, stderr } = await exec(process.execPath, [fileURLToPath(new URL('./launcher-port.mjs', import.meta.url)), '--port', String(port)]);
    return { code: 0, output: stdout + stderr };
  } catch (error) {
    return { code: error.code, output: error.stdout + error.stderr };
  }
}

await withServer((request, response) => {
  response.writeHead(200, { 'Content-Type': request.url === '/src/main.js' ? 'text/javascript' : 'text/html; charset=utf-8' });
  response.end(request.url === '/src/main.js' ? '' : page);
}, async port => {
  assert.equal(await probeDuelServer(port), 'duel', 'existing development game is recognized');
  const cli = await cliState(port);
  assert.equal(cli.code, 10, 'launcher receives the reuse exit code');
  assert.match(cli.output, /already running/);
});

await withServer((request, response) => {
  response.writeHead(200, { 'Content-Type': request.url === '/assets/index-Abc123.js' ? 'application/javascript' : 'text/html' });
  response.end(request.url === '/assets/index-Abc123.js' ? '' : page.replace('/src/main.js', '/assets/index-Abc123.js'));
}, async port => assert.equal(await probeDuelServer(port), 'duel', 'built game is recognized'));

for (const [label, reply] of [
  ['unrelated site', (request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<title>Another game</title>'); }],
  ['copied title alone', (request, response) => { response.writeHead(200, { 'Content-Type': 'text/html' }); response.end('<title>The Duel: Redline — Open Road</title>'); }],
  ['missing game script', (request, response) => {
    response.writeHead(request.url === '/' ? 200 : 404, { 'Content-Type': request.url === '/' ? 'text/html' : 'text/plain' });
    response.end(request.url === '/' ? page : 'Not found');
  }],
  ['redirect', (request, response) => { response.writeHead(302, { Location: 'https://example.org/' }); response.end(); }],
  ['non-HTML response', (request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('{}'); }],
]) await withServer(reply, async port => {
  assert.equal(await probeDuelServer(port), 'occupied', label);
  const cli = await cliState(port);
  assert.equal(cli.code, 20, `${label} refuses the port`);
});

const unused = createServer();
const freePort = await listenPrivate(unused);
await new Promise(resolve => unused.close(resolve));
assert.equal(await probeDuelServer(freePort), 'free', 'unoccupied private port allows first launch');
assert.equal((await cliState(freePort)).code, 0, 'launcher receives the first-launch exit code');

console.log('Launcher port: existing Duel reused, unrelated services refused, free private port starts normally.');
