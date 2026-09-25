import test from 'node:test';
import assert from 'node:assert/strict';
const module = () => import('./audio/voice-candidates.mjs');
function fixture(fail = false) {
  let ledger = { version: 1, entries: [] };
  const calls = [];
  return {
    calls,
    get ledger() {
      return ledger;
    },
    deps: {
      wait: async () => {},
      load: () => structuredClone(ledger),
      save: (l) => {
        ledger = structuredClone(l);
      },
      voices: async () => [{ id: 'stock', name: 'Harry' }],
      credits: async () => ({ left: 9999 }),
      say: async (options) => {
        assert.equal(options.keep, false);
        assert.equal(ledger.entries.at(-1).status, 'reserved');
        calls.push(options);
        if (fail) throw Error('network failure');
        return {
          path: '.evidence/audio/voices/test.mp3',
          entry: {
            creditsUsed: options.text.length,
            creditsEstimated: true,
            sha256: 'fake',
            bytes: 12,
          },
        };
      },
    },
  };
}
const plan = [
  { id: 'rook', voice: 'Harry', text: 'Road is clear.' },
  { id: 'raider', voice: 'Harry', text: 'Turn back.' },
];
test('budget rejects oversized batches before any generation', async () => {
  const { generateCandidates } = await module(),
    f = fixture();
  await assert.rejects(
    () =>
      generateCandidates(
        { plan: [{ ...plan[0], text: 'x'.repeat(1501) }] },
        f.deps,
      ),
    /budget/i,
  );
  assert.equal(f.calls.length, 0);
  await assert.rejects(
    () => generateCandidates({ plan, budget: 1501 }, f.deps),
    /budget/i,
  );
  assert.equal(f.calls.length, 0);
});
test('candidates only, reserve before generation, resume without spending again', async () => {
  const { generateCandidates } = await module(),
    f = fixture();
  const first = await generateCandidates({ plan }, f.deps);
  assert.equal(first.entries.length, 2);
  assert.equal(f.calls.length, 2);
  await generateCandidates({ plan }, f.deps);
  assert.equal(f.calls.length, 2);
  assert(first.entries.every((e) => e.status === 'candidate'));
});
test('uncertain generation retains reservation and cannot auto retry on resume', async () => {
  const { generateCandidates } = await module(),
    f = fixture(true);
  await assert.rejects(
    () => generateCandidates({ plan }, f.deps),
    /uncertain/i,
  );
  assert.equal(f.calls.length, 1);
  await assert.rejects(
    () => generateCandidates({ plan }, f.deps),
    /uncertain/i,
  );
  assert.equal(f.calls.length, 1);
});
test('changed text and insufficient account balance stop before further calls', async () => {
  const { generateCandidates } = await module(),
    f = fixture();
  await generateCandidates({ plan }, f.deps);
  await assert.rejects(
    () =>
      generateCandidates({ plan: [{ ...plan[0], text: 'Changed' }] }, f.deps),
    /changed/i,
  );
  assert.equal(f.calls.length, 2);
  const empty = fixture();
  empty.deps.credits = async () => ({ left: 1 });
  await assert.rejects(
    () => generateCandidates({ plan }, empty.deps),
    /credits/i,
  );
  assert.equal(empty.calls.length, 0);
});

test('saved take with delayed accounting remains a candidate and is never regenerated', async () => {
  const { generateCandidates } = await module(),
    f = fixture(),
    original = f.deps.say;
  f.deps.say = async (options) => ({
    ...(await original(options)),
    accountingWarning: 'Take saved; accounting unavailable.',
  });
  const ledger = await generateCandidates({ plan }, f.deps);
  assert(ledger.entries.every((e) => e.accountingWarning));
  await generateCandidates({ plan }, f.deps);
  assert.equal(f.calls.length, 2);
});
