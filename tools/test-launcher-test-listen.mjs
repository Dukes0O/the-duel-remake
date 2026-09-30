import assert from 'node:assert/strict';
import {test} from 'node:test';
import {EventEmitter} from 'node:events';

// HK-LAUNCHER-PORT: stubbed listen only; no actual ports, browser or storage.
let checks = 0, modulePromise;
const equal = (actual, expected, label) => { checks++; assert.deepEqual(actual, expected, label); };
const ok = (value, label) => { checks++; assert.ok(value, label); };
test.after(() => console.log('Launcher test listen: ' + checks + ' acceptance checks executed.'));
async function helper() {
  const module = await (modulePromise ??= import('./launcher-test-listen.mjs').catch(error => {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('launcher-test-listen.mjs')) return null;
    throw error;
  }));
  ok(module && typeof module.listenPrivate === 'function',
    'HK-LAUNCHER-PORT must expose listenPrivate with EACCES retry support');
  return module.listenPrivate;
}
function stub(outcomes) {
  const server = new EventEmitter(), attempts = [];
  server.listen = (port, host, callback) => {
    attempts.push({port, host, listeners: server.listenerCount('error')});
    const result = outcomes[attempts.length - 1];
    if (result?.throw) throw result.error;
    queueMicrotask(() => {
      if (result instanceof Error) server.emit('error', result);
      else callback();
    });
    return server;
  };
  return {server, attempts};
}
const failure = code => Object.assign(new Error('synthetic ' + code), {code});
function picker(first = 5400) {
  const ports = [];
  return {ports, pickPort() { const port = first + ports.length; ports.push(port); return port; }};
}
function watchErrors(server) {
  const observed = [], listener = error => observed.push(error);
  server.on('error', listener);
  return {observed, listener};
}
function clean(server, watcher, label) {
  equal(server.listeners('error'), watcher ? [watcher.listener] : [], label);
}

test('one Windows reserved-port EACCES retries and returns only the successful port', async () => {
  const listenPrivate = await helper(), denied = failure('EACCES');
  const {server, attempts} = stub([denied, null]), pick = picker();
  const port = await listenPrivate(server, {pickPort: pick.pickPort});
  equal(port, 5401, 'reserved first port is replaced by the successful second port');
  equal(attempts.map(a => [a.port, a.host]), [[5400, 'localhost'], [5401, 'localhost']],
    'EACCES retries a freshly picked localhost port');
  equal(pick.ports.length, 2, 'exactly one retry follows EACCES');
  clean(server, null, 'successful bind removes every helper error listener');
});
test('occupied then reserved ports both retry before success, preserving existing observers', async () => {
  const listenPrivate = await helper(), busy = failure('EADDRINUSE'), denied = failure('EACCES');
  const {server, attempts} = stub([busy, denied, null]), pick = picker(6100), watcher = watchErrors(server);
  equal(await listenPrivate(server, {pickPort: pick.pickPort}), 6102, 'both retriable errors yield the third chosen port');
  equal(attempts.length, 3, 'each retriable failure causes one fresh attempt');
  equal(watcher.observed, [busy, denied], 'existing observer receives both original errors');
  equal(attempts.map(a => a.listeners), [2, 2, 2], 'old retry listeners never accumulate');
  clean(server, watcher, 'success retains exactly the caller error observer');
});
for (const code of ['EACCES', 'EADDRINUSE']) test(code + ' exhaustion stops at twenty total attempts', async () => {
  const listenPrivate = await helper(), {server, attempts} = stub(Array.from({length: 20}, () => failure(code)));
  const pick = picker(), watcher = watchErrors(server);
  checks++;
  await assert.rejects(listenPrivate(server, {pickPort: pick.pickPort}),
    /No private launcher test port was available/, 'attempt limit keeps the original terminal message');
  equal(attempts.length, 20, 'twenty total attempts includes the first try');
  equal(pick.ports.length, 20, 'exhaustion does not select a twenty-first port');
  equal(new Set(attempts.map(a => a.port)).size, 20, 'retry attempts use freshly selected ports');
  equal(watcher.observed.length, 20, 'existing observer sees every failed bind');
  clean(server, watcher, 'exhaustion leaves no helper error listener behind');
});
test('unexpected async errors propagate unchanged without retry', async () => {
  const listenPrivate = await helper(), original = failure('EINVAL');
  const {server, attempts} = stub([original, null]), pick = picker(), watcher = watchErrors(server);
  checks++;
  await assert.rejects(listenPrivate(server, {pickPort: pick.pickPort}), error => error === original,
    'unexpected bind error object propagates unchanged');
  equal(attempts.length, 1, 'unexpected error cannot trigger a retry');
  equal(pick.ports.length, 1, 'unexpected error cannot consume another port');
  clean(server, watcher, 'unexpected rejection cleans up only the helper listener');
});
test('a synchronous listen throw propagates unchanged and removes its pending listener', async () => {
  const listenPrivate = await helper(), original = failure('ERR_SERVER_ALREADY_LISTEN');
  const {server, attempts} = stub([{throw: true, error: original}]), pick = picker(), watcher = watchErrors(server);
  checks++;
  await assert.rejects(listenPrivate(server, {pickPort: pick.pickPort}), error => error === original,
    'synchronous non-retriable listen failure is preserved');
  equal(attempts.length, 1, 'synchronous unexpected throw receives no retry');
  clean(server, watcher, 'a throw before an error event cannot leak the helper listener');
});
test('first-try success keeps the existing localhost and random private-port range', async () => {
  const listenPrivate = await helper(), {server, attempts} = stub([null]), watcher = watchErrors(server);
  const port = await listenPrivate(server);
  equal(attempts.length, 1, 'first successful bind needs no retry');
  equal(attempts[0].host, 'localhost', 'extraction preserves the existing localhost binding');
  ok(Number.isInteger(port) && port >= 5200 && port < 62000, 'default picker retains randomInt(5200, 62000) bounds');
  equal(port, attempts[0].port, 'promise returns the actual successful bind port');
  clean(server, watcher, 'first successful callback removes only its temporary listener');
});
