import assert from 'node:assert/strict';
import test from 'node:test';
import { after } from 'node:test';
import { relative, resolve } from 'node:path';
import { assertPrivatePort, consoleIssue, parseArguments } from './browser-harness.mjs';
import * as browserHarness from './browser-harness.mjs';

let evidenceChecks = 0;
const evidenceCheck = (condition, message) => { evidenceChecks++; assert.ok(condition, message); };
after(() => console.log(`Browser evidence: ${evidenceChecks} checks`));

test('smoke and named scenarios parse without accepting paths or unknown flags', () => {
  assert.deepEqual(parseArguments(['smoke']), { name: 'smoke', injectConsoleError: false });
  assert.deepEqual(parseArguments(['scenario', 'night-race', '--inject-console-error']), { name: 'night-race', injectConsoleError: true });
  assert.deepEqual(parseArguments(['record-race']), { name: 'audio-race', injectConsoleError: false });
  assert.throws(() => parseArguments(['record-race', 'audio-race', 'again']), /Unknown browser harness argument/);
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

test('browser captures default to a dated ignored evidence folder, including audio recording', () => {
  evidenceCheck(typeof browserHarness.evidenceOutputDir === 'function', 'browser harness must expose its default evidence directory');
  const date = new Date('2026-09-24T12:34:56.000Z');
  for (const scenario of ['smoke', 'audio-race', 'weapon-audio']) {
    const output = browserHarness.evidenceOutputDir(scenario, date);
    const name = relative(browserHarness.PROJECT_ROOT, output).replaceAll('\\', '/');
    evidenceCheck(/^\.evidence\/2026-09-24\//.test(name), `${scenario} must default under dated .evidence: ${name}`);
    evidenceCheck(name.includes(`/${scenario}-`), `${scenario} evidence must have a separate run folder: ${name}`);
    evidenceCheck(!name.startsWith('..') && !name.startsWith('.qa-dist/') && !name.startsWith('docs/board/looks/'),
      `${scenario} raw capture must stay outside tracked review files and QA build output: ${name}`);
  }
});

test('explicit browser evidence paths stay inside the ignored root', () => {
  evidenceCheck(typeof browserHarness.resolveEvidenceDir === 'function', 'browser harness must validate explicit evidence folders');
  const approved = resolve(browserHarness.PROJECT_ROOT, '.evidence', '2026-09-24', 'CLEAN-03');
  evidenceCheck(browserHarness.resolveEvidenceDir(approved) === approved, 'an explicit path inside .evidence is accepted');
  for (const outside of [resolve(browserHarness.PROJECT_ROOT, 'docs/board/looks/raw'),
    resolve(browserHarness.PROJECT_ROOT, '.qa-dist/browser-output')]) {
    assert.throws(() => browserHarness.resolveEvidenceDir(outside), /evidence|outside|Refusing/i,
      `raw captures must reject ${outside}`);
    evidenceChecks++;
  }
});
