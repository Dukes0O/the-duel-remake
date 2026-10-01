import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createFeatureFlags, FEATURE_STATES } from '../src/feature-flags.js';
import { createProfile, isCarUnlocked, normalizeProfile } from '../src/progression.js';
import { wastelandUnlocked } from '../src/wasteland-access.js';

let checks = 0;
const failures = [];
const check = (label, assertion) => {
  checks++;
  try {
    assertion();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
};
const rootFile = name => new URL(`../${name}`, import.meta.url);
const toolFile = name => new URL(`./${name}`, import.meta.url);
const source = url => existsSync(url) ? readFileSync(url, 'utf8') : '';

const launcherUrl = rootFile('start-preview.bat');
const installerUrl = rootFile('install-preview-shortcut.ps1');
const pageUrl = toolFile('preview.html');
const entryUrl = toolFile('preview.js');
const playerUrl = toolFile('preview-player.js');
const qaConfigUrl = toolFile('vite-qa.config.js');
const operationsUrl = rootFile('docs/OPERATIONS.md');
const mainUrl = rootFile('src/main.js');
const boardUrl = rootFile('docs/board/board.yaml');
const launcher = source(launcherUrl);
const installer = source(installerUrl);
const page = source(pageUrl);
const entry = source(entryUrl);
const qaConfig = source(qaConfigUrl);
const operations = source(operationsUrl);
const mainSource = source(mainUrl);
const board = source(boardUrl);

check('preview launcher recipe exists', () => assert.ok(existsSync(launcherUrl),
  'start-preview.bat must launch the integration checkout preview'));
check('launcher builds the QA bundle', () => {
  assert.match(launcher, /(?:qa:build|vite-qa\.config\.js)/i,
    'preview launcher must build with the memory-only QA configuration');
  assert.match(launcher, /PREVIEW_DIR=\.preview-dist/i, 'preview launcher must name its own folder');
  assert.match(launcher, /build[^\r\n]*--outDir %PREVIEW_DIR% --emptyOutDir/i,
    'every build empties and reuses the one preview folder');
  assert.match(launcher, /preview[^\r\n]*--outDir %PREVIEW_DIR%/i,
    'the preview serves its own folder');
  assert.doesNotMatch(launcher, /\.qa-dist/i,
    'the preview never serves the folder that browser checks rebuild');
});
check('a click rebuilds when newer work is merged', () => {
  assert.match(launcher, /git rev-parse HEAD/i, 'the launcher reads the current integration commit');
  assert.match(launcher, /--expect-commit %PREVIEW_COMMIT%/i,
    'the launcher asks whether the running preview matches that commit');
  assert.match(launcher, /errorlevel 11 goto replace_stale/i, 'an older preview is replaced');
  assert.match(launcher, /taskkill \/FI "WINDOWTITLE eq The Duel Preview - close\*"/i,
    'the old preview window is closed, never another program');
  assert.match(launcher, /preview-stamp\.mjs %PREVIEW_DIR% %PREVIEW_COMMIT%/i,
    'each build records its commit');
  assert.match(entry, /preview-build\.json[\s\S]*BUILT/,
    'the PREVIEW badge shows when this copy was built');
});
check('launcher stays in its integration checkout', () => assert.match(launcher, /%~dp0/,
  'preview launcher must resolve the repository from its own folder'));
check('launcher binds a private strict port', () => {
  assert.match(launcher, /--host\s+(?:127\.0\.0\.1|localhost)/i,
    'preview server must bind only to this computer');
  assert.match(launcher, /--strictPort/i, 'preview server must refuse an occupied port');
  const configured = launcher.match(/PREVIEW_PORT\s*=\s*([0-9]+)/i)?.[1] ??
    launcher.match(/--port\s+([0-9]+)/i)?.[1];
  assert.ok(configured, 'preview launcher must name its private port');
  const port = Number(configured);
  assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535,
    'preview port must be a valid non-privileged port');
  assert.notEqual(port, 5174, 'preview must never use the live game port');
});
check('preview launch requests every current dev switch', () => {
  // Read from the catalog so a new development switch cannot be missed
  // (WAR-02a-SAL added warlords, released by WAR-SAL-RELEASE). Career backup is left out: Preview saves
  // are memory-only.
  const devSwitches = Object.entries(FEATURE_STATES)
    .filter(([name, state]) => state === 'dev' && name !== 'career-backup').map(([name]) => name);
  for (const flag of devSwitches) {
    assert.match(launcher, new RegExp(`(?:flags[^\\r\\n]*|PREVIEW_FLAGS[^\\r\\n]*)${flag}`),
      `preview URL must request ${flag}`);
  }
});

check('desktop shortcut installer exists', () => assert.ok(existsSync(installerUrl),
  'install-preview-shortcut.ps1 must create the second desktop icon'));
check('desktop shortcut has the settled name and target', () => {
  assert.match(installer, /The Duel Preview\.lnk/i,
    'desktop link must be named The Duel Preview');
  assert.match(installer, /start-preview\.bat/i,
    'desktop link must target the preview launcher');
  assert.match(installer, /GetFolderPath\s*\(\s*['"]Desktop['"]\s*\)/i,
    'installer must use the current player Desktop folder');
  assert.match(installer, /PSScriptRoot/i,
    'shortcut target must follow this integration checkout');
});
check('shortcut setup needs no elevation or account', () => {
  assert.doesNotMatch(installer, /requireAdministrator|\bRunAs\b|-Verb\s+RunAs/i,
    'preview setup must not request administrator access');
  assert.doesNotMatch(installer, /Invoke-WebRequest|curl(?:\.exe)?|https?:\/\//i,
    'preview setup must not download anything or require an online account');
});

check('QA build exposes the preview page', () => {
  assert.ok(existsSync(pageUrl), 'tools/preview.html must be the preview entry page');
  assert.match(qaConfig, /preview\s*:\s*fileURLToPath\s*\(\s*new URL\(\s*['"]\.\/preview\.html['"]/,
    'QA build must include tools/preview.html as an input');
});
check('preview has a clear on-screen badge', () => {
  assert.match(page + entry, /data-preview-badge/i,
    'preview page must expose a stable badge marker');
  assert.match(page + entry, />\s*PREVIEW\s*</i,
    'preview badge must visibly say PREVIEW');
});
check('preview isolates saves before game startup', () => {
  assert.match(entry, /from\s+['"]\.\/qa-storage\.js['"]/,
    'preview entry must use the established memory-only storage facade');
  const install = entry.indexOf('installIsolatedStorage(');
  const main = entry.search(/await\s+import\(\s*['"]\.\.\/src\/main\.js['"]\s*\)/);
  assert.ok(install >= 0 && main > install,
    'memory-only storage must be installed before importing production startup');
  assert.doesNotMatch(entry, /__qaPhysicalStorage/,
    'preview entry must not retain a handle to the real save store');
});
check('preview uses a memory-only career store before game startup', () => {
  assert.match(entry, /createMemoryBackupStore/,
    'preview entry must create the in-memory career backup and budget store');
  const inject = entry.indexOf('__duelQaBackupStore');
  const main = entry.search(/await\s+import\(\s*['"]\.\.\/src\/main\.js['"]\s*\)/);
  assert.ok(inject >= 0 && main > inject,
    'preview must inject the memory store before production startup');
  assert.match(mainSource, /__DUEL_QA__[\s\S]{0,200}__duelQaBackupStore/,
    'production startup may accept the injected store only in a QA build');
});

check('preview player seeding module exists', () => assert.ok(existsSync(playerUrl),
  'tools/preview-player.js must provide the testable preview player recipe'));
if (existsSync(playerUrl)) {
  try {
    const { seedPreviewProfile } = await import(playerUrl);
    check('preview player recipe is public', () => assert.equal(typeof seedPreviewProfile, 'function',
      'preview-player.js must export seedPreviewProfile'));
    if (typeof seedPreviewProfile === 'function') {
      const original = createProfile();
      const preview = seedPreviewProfile(original);
      const normalized = normalizeProfile(preview);
      check('preview player has found the gate', () => {
        assert.equal(normalized.wasteland.discoveredGate, true,
          'preview player must start with the Wasteland gate found');
        assert.equal(wastelandUnlocked(createFeatureFlags({storage: null, qa: false}), normalized), true,
          'preview player must pass the real Wasteland access rule');
      });
      check("preview player has Sal's full hold", () => assert.equal(
        normalized.wasteland.territories.sal.hold, 100,
        "preview player must start with Sal's territory hold at 100"));
      check('preview player owns the Titan', () => assert.equal(
        isCarUnlocked(normalized, 'titan_monster'), true,
        'preview player must pass the real Titan unlock rule'));
      check('preview seeding does not mutate its input', () => {
        assert.equal(original.wasteland.discoveredGate, false);
        assert.equal(original.wasteland.territories.sal.hold, 0);
        assert.equal(isCarUnlocked(original, 'titan_monster'), false);
      });
    }
  } catch (error) {
    check('preview player module loads', () => assert.fail(error.message));
  }
}
check('preview entry applies the player recipe only to isolated storage', () => {
  assert.match(entry, /from\s+['"]\.\/preview-player\.js['"]/,
    'preview entry must use the tested preview player recipe');
  assert.match(entry, /seedPreviewProfile\s*\(/,
    'preview entry must seed the disposable preview player');
});

check('operations guide documents the playtest launcher', () => {
  assert.match(operations, /The Duel Preview/,
    'operations guide must name the desktop icon');
  assert.match(operations, /memory-only/i,
    'operations guide must say preview saves are memory-only');
  assert.match(operations, /PREVIEW badge/i,
    'operations guide must explain how to recognize the preview');
  assert.match(operations, /gate found|found the gate/i,
    'operations guide must describe the seeded gate discovery');
  assert.match(operations, /Sal.{0,80}(?:hold|100)|(?:hold|100).{0,80}Sal/is,
    "operations guide must describe Sal's full territory hold");
  assert.match(operations, /Titan.{0,40}unlock|unlock.{0,40}Titan/is,
    'operations guide must describe the seeded Titan unlock');
});
check('preview card waits for Kyle to confirm the desktop launch', () => {
  const card = board.match(/  - id: PREVIEW-LAUNCHER\r?\n([\s\S]*?)(?=\r?\n  - id:|$)/)?.[0] ?? '';
  assert.match(card, /\r?\n\s+waiting_on:\s*kyle\s*(?:\r?\n|$)/,
    'PREVIEW-LAUNCHER must wait on Kyle until he has opened the desktop icon once');
});

console.log(`Preview launcher: ${checks} acceptance checks, ${failures.length} failures.`);
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  throw new AggregateError(failures, `${failures.length} preview launcher acceptance checks failed`);
}
