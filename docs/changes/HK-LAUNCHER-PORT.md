# HK-LAUNCHER-PORT

## Settled contract before tests

Extract the existing test-fixture binding helper into
tools/launcher-test-listen.mjs, exporting
listenPrivate(server, {pickPort = defaultRandomPicker} = {}).
The default picker retains randomInt(5200, 62000); localhost remains the host.
tools/test-launcher-port.mjs imports the helper and retains every assertion.

Retry EACCES and EADDRINUSE, up to twenty total listen attempts. Each attempt
picks a fresh port. Return the port only after a successful listen callback.
Unexpected errors reject immediately with the original error, without another
attempt. Exhaustion retains "No private launcher test port was available".
Remove only the helper's own temporary error listeners after each outcome;
existing server listeners remain. Synchronous listen throws also clean up.

The board records the observed Windows EACCES on ::1:59825. The independent
reproduction below uses an EventEmitter server and the exact current helper
function extracted in memory. It does not open sockets, run the rest of the
old suite, modify source or touch any live/Preview server.

## Acceptance checks

The new focused suite uses node:assert/strict and synthetic EventEmitter
listen callbacks. It covers EACCES once then success; EADDRINUSE then EACCES
then success; twenty retries; unexpected errors without retry; exact returned
port and localhost host; default picker bounds; listener cleanup on success,
exhaustion, unexpected async failure and synchronous throw.

No runtime behavior, race rules, player saves or fingerprints change.
No browser, network, heavy lane gate or build is run in this tests-first step.

## Changed assertions

None. No existing test file is edited by the test author.

## Removed

No files replaced in this test-author commit. The implementation removes the
inline helper from tools/test-launcher-port.mjs when importing its new module.

## Tests-first red verdict (30 September 2026)

Read-only reproduction extracted only the original inline listenPrivate
function into a VM and injected a stub EventEmitter listener. First attempt
emitted synthetic EACCES on ::1:59825; the second would have succeeded.
The original helper rejected after exactly one attempt, proving its current
retry condition is the fault. No sockets opened and no old suite ran.

node tools/test-launcher-test-listen.mjs: seven subtests, seven expected
failures, zero passes; seven API assertions reached. Every failure message:
"HK-LAUNCHER-PORT must expose listenPrivate with EACCES retry support".
The new extracted module does not exist yet, so the tests report its missing
public contract clearly instead of crashing on an unhandled import.

Failure cases are independently named for EACCES retry, mixed
EADDRINUSE/EACCES retry, both twenty-attempt limits, unexpected asynchronous
error propagation, synchronous-throw cleanup and default-port success.
Once the builder exposes the API, they execute the actual retry and listener
assertions. No existing source or assertions were edited. No heavy gates ran.

## Implementation and focused result

The tools-only helper retries EACCES and EADDRINUSE with the same localhost host, private port range and twenty-attempt cap. It removes only its temporary listener on all outcomes, including synchronous throws. Seven new stub cases pass; the original launcher port suite passes with every assertion unchanged. Mandatory lane/build and independent review are pending. No runtime, live launcher or save code changed.

## Final merge evidence

Independent review clean on exact clean bc498a5d268219959931236dabfa7916e251ea4d. Mandatory lane8/8 in111.39s and build passed (241 modules, Vite707ms); source unchanged through gates. Seven stub cases make40 acceptance checks; every original launcher assertion remains byte-identical. No runtime launcher or save changes.
