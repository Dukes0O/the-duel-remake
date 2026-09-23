import assert from 'node:assert/strict';
import test from 'node:test';
import { assertPrivatePort, consoleIssue, parseArguments } from './browser-harness.mjs';

test('smoke and named scenarios parse without accepting paths or unknown flags', () => {
  assert.deepEqual(parseArguments(['smoke']), { name: 'smoke', injectConsoleError: false });
  assert.deepEqual(parseArguments(['scenario', 'night-race', '--inject-console-error']), { name: 'night-race', injectConsoleError: true });
  assert.throws(() => parseArguments(['scenario', '../private']), /Unknown browser harness argument/);
  assert.throws(() => parseArguments(['smoke', '--port', '5174']), /Unknown browser harness argument/);
  assert.throws(() => parseArguments(['scenario']), /scenario needs/);
});

test('QA ports stay above the reserved range', () => {
  assert.equal(assertPrivatePort(5191), 5191);
  for (const port of [0, 5174, 5190, 65536, NaN, 5200.5]) {
    assert.throws(() => assertPrivatePort(port), /Refusing non-private QA port/);
  }
});

test('console issues include errors and exceptions but not ordinary logs', () => {
  assert.deepEqual(consoleIssue({ method: 'Runtime.consoleAPICalled', params: { type: 'error', args: [{ value: 'failure' }] } }), { kind: 'console.error', text: 'failure' });
  assert.deepEqual(consoleIssue({ method: 'Runtime.exceptionThrown', params: { exceptionDetails: { text: 'Uncaught', exception: { description: 'boom' } } } }), { kind: 'exception', text: 'Uncaught: boom' });
  assert.deepEqual(consoleIssue({ method: 'Log.entryAdded', params: { entry: { level: 'error', text: 'missing', url: 'http://127.0.0.1:5191/a' } } }), { kind: 'browser log', text: 'missing (http://127.0.0.1:5191/a)' });
  assert.equal(consoleIssue({ method: 'Runtime.consoleAPICalled', params: { type: 'log', args: [{ value: 'okay' }] } }), null);
});