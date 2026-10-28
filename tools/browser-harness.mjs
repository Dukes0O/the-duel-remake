import { spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const VITE_CLI = join(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const PRIVATE_PORT_MIN = 5191;
const TIMEOUT_MS = 45_000;
const CLOSE_WAIT_MS = 3_000;
const TREE_WAIT_MS = 3_000;
const delay = ms => new Promise(done => setTimeout(done, ms));

export function parseArguments(args) {
  const [command, ...rest] = args;
  if (!['smoke', 'scenario', 'record-race'].includes(command)) throw Error('Usage: node tools/browser-harness.mjs smoke|scenario NAME|record-race [NAME] [--inject-console-error]');
  let name = command === 'smoke' ? 'smoke' : command === 'record-race' ? 'audio-race' : null;
  let injectConsoleError = false;
  let named = false;
  let outputDir, qaBundle, headed = false;
  for (let index = 0; index < rest.length; index++) {
    const value = rest[index];
    if (value === '--inject-console-error') injectConsoleError = true;
    else if (value === '--headed') {
      if (headed) throw Error('--headed may be requested once.');
      headed = true;
    }
    else if (value === '--output-dir') {
      if (outputDir || !rest[index + 1]) throw Error('--output-dir needs one path.');
      outputDir = rest[++index];
    }
    else if (value.startsWith('--output-dir=')) {
      if (outputDir || !value.slice('--output-dir='.length)) throw Error('--output-dir needs one path.');
      outputDir = value.slice('--output-dir='.length);
    }
    else if (value === '--qa-bundle') {
      if (qaBundle || !rest[index + 1] || rest[index + 1].startsWith('--')) throw Error('--qa-bundle needs one path.');
      qaBundle = rest[++index];
    }
    else if (!named && command !== 'smoke' && /^[a-z][a-z0-9-]*$/.test(value)) { name = value; named = true; }
    else throw Error(`Unknown browser harness argument: ${value}`);
  }
  if (!name) throw Error('scenario needs a simple name from tools/scenarios/.');
  return { name, injectConsoleError, ...(outputDir ? { outputDir } : {}), ...(qaBundle ? { qaBundle } : {}), ...(headed ? {headed: true} : {}) };
}

export function evidenceOutputDir(name, date = new Date(), root = PROJECT_ROOT) {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) throw Error('Evidence scenario name must be simple.');
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return join(root, '.evidence', timestamp.slice(0, 10), `${name}-${timestamp}`);
}

export function resolveEvidenceDir(path, root = PROJECT_ROOT) {
  const evidenceRoot = resolve(root, '.evidence');
  const target = resolve(root, path);
  const part = relative(evidenceRoot, target);
  if (!part || part === '..' || part.startsWith('..' + sep) || part.includes(':'))
    throw Error('Raw browser output must stay below .evidence/.');
  return target;
}

// A suite-created bundle is read-only to its scenario children.
export function resolveQaBundle(path, root = PROJECT_ROOT) {
  const target = resolve(root, path), part = relative(resolve(root, '.qa-dist'), target);
  if (!/^browser-suite-[a-zA-Z0-9_-]+$/.test(part)) throw Error('QA bundle must be an owned leaf under .qa-dist/.');
  return target;
}

export async function validateQaBundle(path, {realPath = realpath, read = readFile} = {}) {
  const target = resolveQaBundle(path);
  const actual = resolveQaBundle(await realPath(target));
  const marker = JSON.parse(await read(join(actual, 'qa-bundle.json'), 'utf8'));
  if (marker.schema !== 1 || marker.qa !== true || marker.projectRoot !== PROJECT_ROOT)
    throw Error('QA bundle is not a completed build of this project.');
  return actual;
}

export async function recycleQaBundle(path, {realPath = realpath, start = launch, wait = waitForExit, platform = process.platform} = {}) {
  const owned = resolveQaBundle(path), target = resolveQaBundle(await realPath(owned));
  if (relative(owned, target)) throw Error('QA bundle cleanup refuses a redirected target.');
  if (platform !== 'win32') throw Error('QA bundle recycling requires the Windows Recycle Bin.');
  // The owner supplies only its mkdtemp leaf; never recurse through another root.
  const literal = "'" + target.replaceAll("'", "''") + "'";
  const script = 'Add-Type -AssemblyName Microsoft.VisualBasic; ' +
    '[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory(' + literal +
    ', [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)';
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  await wait(start('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded]), 'QA bundle recycle');
}

export async function buildQaBundle({
  hasVite = () => existsSync(VITE_CLI), makeDirectory = mkdir, makeTemp = mkdtemp,
  start = launch, wait = waitForExit, read = readFile, write = writeFile,
  recycle = recycleQaBundle,
} = {}) {
  if (!hasVite()) throw Error('Vite is missing. Run npm ci in this isolated worktree.');
  const qaRoot = join(PROJECT_ROOT, '.qa-dist');
  await makeDirectory(qaRoot, {recursive: true});
  const bundle = resolveQaBundle(await makeTemp(join(qaRoot, 'browser-suite-')));
  try {
    console.log('Building one isolated QA bundle...');
    await wait(start(process.execPath, [VITE_CLI, 'build', '--config', 'tools/vite-qa.config.js',
      '--outDir', bundle]), 'QA build');
    const htmlPath = join(bundle, 'tools', 'menu-check.html');
    const html = await read(htmlPath, 'utf8');
    if (!html.includes('<meta charset=')) throw Error('QA bundle is missing its menu entry.');
    await write(htmlPath, html.replace('<meta charset=', '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><meta charset='));
    await write(join(bundle, 'qa-bundle.json'), JSON.stringify({schema: 1, projectRoot: PROJECT_ROOT, qa: true}) + '\n');
    return bundle;
  } catch (error) {
    await recycle(bundle);
    throw error;
  }
}

export function reviewRoundOutputDir(name, date = new Date(), root = PROJECT_ROOT, env = process.env) {
  const review = {
    'crew-fighters': ['crew', 'GFX_CREW_ROUND'],
    'first-person-gear': ['first-person', 'GFX_FIRST_PERSON_ROUND'],
    rustwall: ['rustwall', 'EGG_RUSTWALL_ROUND'],
    'rigged-fighter': ['test-fighter', null],
  }[name];
  if (!review) return null;
  const [family, roundKey] = review;
  const round = Number(roundKey ? env[roundKey] || 1 : 1);
  if (!Number.isInteger(round) || round < 1 || round > 10)
    throw Error(`${roundKey} must be a round from 1 to 10.`);
  if (env.DUEL_EVIDENCE_DIR) return resolveEvidenceDir(env.DUEL_EVIDENCE_DIR, root);
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return join(root, '.evidence', day, family, `round-${round}`);
}

export function assertPrivatePort(port) {
  if (!Number.isInteger(port) || port < PRIVATE_PORT_MIN || port > 65535 || port === 5174) throw Error(`Refusing non-private QA port: ${port}`);
  return port;
}

async function freePrivatePort() {
  for (let attempt = 0; attempt < 30; attempt++) {
    const port = assertPrivatePort(randomInt(PRIVATE_PORT_MIN, 64000));
    const available = await new Promise(done => {
      const server = createServer();
      server.once('error', () => done(false));
      server.listen(port, '127.0.0.1', () => server.close(() => done(true)));
    });
    if (available) return port;
  }
  throw Error('No free private QA port was found.');
}

function chromeExecutable() {
  const candidates = [
    process.env.DUEL_CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = candidates.find(path => existsSync(path));
  if (!found) throw Error('Chrome was not found. Set DUEL_CHROME_PATH to chrome.exe.');
  return found;
}

export function browserLaunchMetadata(args) {
  const headless = args.some(arg => /^--headless(?:=|$)/.test(arg));
  return {headed: !headless, launchMode: headless ? 'headless' : 'headed'};
}

export function chromeLaunchArguments(profile, {headed = false} = {}) {
  if (typeof headed !== 'boolean') throw Error('headed must be a boolean.');
  return [
    ...(headed ? [] : ['--headless=new']), '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-extensions', '--mute-audio', '--enable-unsafe-swiftshader',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ];
}

function launch(executable, args, options = {}) {
  const child = spawn(executable, args, { cwd: PROJECT_ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...options });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { output = (output + chunk.toString()).slice(-16_000); });
  return { child, output: () => output };
}

async function waitForExit(processHandle, label) {
  const { child, output } = processHandle;
  const code = await new Promise((done, reject) => {
    child.once('error', reject);
    child.once('exit', (exitCode, signal) => done({ exitCode, signal }));
  });
  if (code.exitCode !== 0) throw Error(`${label} failed (${code.exitCode ?? code.signal}).\n${output()}`);
  return output();
}

async function waitForHttp(url, child, output) {
  const end = Date.now() + TIMEOUT_MS;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw Error(`QA preview stopped early.\n${output()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw Error(`QA preview did not start at ${url}.\n${output()}`);
}

async function waitForChromePort(profile, child, output) {
  const end = Date.now() + TIMEOUT_MS;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw Error(`Chrome stopped early.\n${output()}`);
    try {
      const lines = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).trim().split(/\r?\n/);
      const port = Number(lines[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {}
    await delay(100);
  }
  throw Error(`Chrome DevTools did not start.\n${output()}`);
}

export function consoleIssue(packet) {
  if (packet.method === 'Runtime.consoleAPICalled' && packet.params.type === 'error') {
    return { kind: 'console.error', text: packet.params.args.map(arg => arg.value ?? arg.description ?? '').join(' ') };
  }
  if (packet.method === 'Runtime.exceptionThrown') {
    return { kind: 'exception', text: packet.params.exceptionDetails.text + ': ' + (packet.params.exceptionDetails.exception?.description ?? '') };
  }
  if (packet.method === 'Log.entryAdded' && packet.params.entry.level === 'error') {
    return { kind: 'browser log', text: `${packet.params.entry.text}${packet.params.entry.url ? ` (${packet.params.entry.url})` : ''}` };
  }
  return null;
}

class CdpConnection {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
    socket.addEventListener('message', event => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      if (packet.id) {
        const pending = this.pending.get(packet.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(packet.id);
        if (packet.error) pending.reject(Error(`${pending.method}: ${packet.error.message}`));
        else pending.resolve(packet.result ?? {});
      } else for (const listener of this.listeners) listener(packet);
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(Error('Chrome DevTools connection closed.')); }
      this.pending.clear();
    });
  }
  onEvent(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      // Native promise evaluations include capture work and can exceed 20 s
      // when the required parallel gate shares this laptop. Other CDP commands
      // retain their shorter wait; every command remains bounded.
      const timeoutMs = method === 'Runtime.evaluate' ? 60_000 : 20_000;
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`${method} timed out.`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  close() { this.socket.close(); }
}

async function connectDevTools(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw Error(`Chrome DevTools returned HTTP ${response.status}.`);
  const version = await response.json();
  if (!version.webSocketDebuggerUrl?.startsWith(`ws://127.0.0.1:${port}/`)) throw Error('Chrome DevTools returned an unexpected socket address.');
  const socket = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Chrome DevTools socket timed out.')), 10_000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(Error('Chrome DevTools socket failed.')); }, { once: true });
  });
  return new CdpConnection(socket);
}

async function openPage(cdp, issues, warnings) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  cdp.onEvent(packet => {
    if (packet.sessionId !== sessionId) return;
    const issue = consoleIssue(packet);
    if (issue) issues.push(issue);
    if (packet.method === 'Runtime.consoleAPICalled' && packet.params.type === 'warning') warnings.push(packet.params.args.map(arg => arg.value ?? arg.description ?? '').join(' '));
    if (packet.method === 'Network.loadingFailed' && !packet.params.canceled && packet.params.errorText !== 'net::ERR_ABORTED') issues.push({ kind: 'request', text: packet.params.errorText });
  });
  await Promise.all([
    cdp.send('Page.enable', {}, sessionId),
    cdp.send('Page.setLifecycleEventsEnabled', {enabled:true}, sessionId),
    cdp.send('Runtime.enable', {}, sessionId),
    cdp.send('Log.enable', {}, sessionId),
    cdp.send('Network.enable', {}, sessionId),
  ]);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
  return { targetId, sessionId };
}

async function evaluate(cdp, sessionId, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }, sessionId);
  if (response.exceptionDetails) throw Error(`Browser evaluation failed: ${response.exceptionDetails.text} ${response.exceptionDetails.exception?.description ?? ''}`);
  return response.result.value;
}

async function waitForValue(cdp, sessionId, expression, label, timeoutMs = 45_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const value = await evaluate(cdp, sessionId, expression);
    if (value) return value;
    await delay(250);
  }
  throw Error(`Timed out waiting for ${label}.`);
}

// A command acknowledgement can precede document/context replacement.
export function createPageNavigation(cdp, page, baseURL) {
  async function transition(method, params, actionReload = false) {
    const {frameTree} = await cdp.send('Page.getFrameTree', {}, page.sessionId);
    const mainId = frameTree.frame.id, previousLoader = frameTree.frame.loaderId;
    const expectedUrl = actionReload ? frameTree.frame.url : null;
    if(actionReload && (!expectedUrl?.startsWith(baseURL+'/tools/') || typeof params.expression!=='string' || !params.expression.trim()))
      throw Error('Import reload requires the current QA tools URL and one action.');
    return new Promise((resolve, reject) => {
      let commit = null, execution = null, expectedLoader = null;
      let accepted = false, restored = false, checking = false, finished = false;
      const loaded = new Set();
      const complete = error => {
        if (finished) return;
        finished = true;clearTimeout(timer);off();
        cdp.socket?.removeEventListener('close', closed);
        if (error) reject(error);else resolve();
      };
      const closed = () => complete(Error('Chrome DevTools connection closed.'));
      const ready = () => {
        if (finished || checking || !accepted || !commit || restored) return;
        if (!commit.sameDocument && (!execution || !loaded.has(commit.loaderId) ||
          expectedLoader && commit.loaderId !== expectedLoader)) return;
        checking = true;
        // This read probes the selected default context, never game readiness.
        cdp.send('Runtime.evaluate', {expression:'true',returnByValue:true,
          ...(!commit.sameDocument ? {uniqueContextId:execution.uniqueId} : {})}, page.sessionId)
          .then(response => {
            if (response.exceptionDetails) complete(Error('Navigation context probe failed: '+response.exceptionDetails.text));
            else if (response.result?.value !== true) complete(Error('Navigation default context is not usable.'));
            else complete();
          }, complete);
      };
      const off = cdp.onEvent(packet => {
        if (packet.method === 'Target.detachedFromTarget' && packet.params.sessionId === page.sessionId) {
          complete(Error('Navigation target detached.'));return;
        }
        if (packet.method === 'Target.targetDestroyed' && packet.params.targetId === page.targetId) {
          complete(Error('Navigation target destroyed.'));return;
        }
        if (packet.sessionId !== page.sessionId) return;
        const {method:event,params:value} = packet;
        if (event === 'Runtime.executionContextsCleared') execution = null;
        if (event === 'Runtime.executionContextDestroyed' && execution?.id === value.executionContextId) execution = null;
        if (event === 'Runtime.executionContextCreated' && value.context.auxData?.isDefault &&
          value.context.auxData.frameId === mainId) execution = value.context;
        if (event === 'Page.frameNavigated' && value.frame.id === mainId && !value.frame.parentId) {
          if(actionReload && value.frame.url!==expectedUrl){complete(Error('Import reload changed its destination.'));return;}
          // The writer's restored document synchronously reloads on pageshow.
          restored = value.type === 'BackForwardCacheRestore';
          if (restored) {commit = null;execution = null;}
          else if (value.frame.loaderId !== previousLoader) commit = value.frame;
        }
        if (event === 'Page.lifecycleEvent' && value.frameId === mainId && value.name === 'DOMContentLoaded')
          loaded.add(value.loaderId);
        if (event === 'Page.navigatedWithinDocument' && value.frameId === mainId) {
          if(actionReload){complete(Error('Import reload requires a replacement document.'));return;}
          commit = {sameDocument:true};
        }
        ready();
      });
      const timer = setTimeout(() => complete(Error('Timed out waiting for navigation document/context.')), TIMEOUT_MS);
      cdp.socket?.addEventListener('close', closed);
      // Listener is installed before the one mutation, including fast events.
      cdp.send(method, params, page.sessionId).then(result => {
        if (result.errorText) {complete(Error('Navigation failed: '+result.errorText));return;}
        if(actionReload && result.exceptionDetails){complete(Error('Import action failed: '+result.exceptionDetails.text+' '+(result.exceptionDetails.exception?.description??'')));return;}
        expectedLoader = result.loaderId ?? null;accepted = true;ready();
      }, complete);
    });
  }
  return {
    navigate(path) {
      if (!path.startsWith('/tools/') || path.includes('..')) throw Error('Scenario path must stay in QA tools.');
      return transition('Page.navigate', {url:baseURL+path});
    },
    reload: (params = {}) => transition('Page.reload', params),
    reloadAfterAction: expression => transition('Runtime.evaluate', {expression,awaitPromise:false,returnByValue:true,userGesture:true}, true),
    async back() {
      const history = await cdp.send('Page.getNavigationHistory', {}, page.sessionId);
      if (history.currentIndex < 1) throw Error('No previous QA history entry.');
      return transition('Page.navigateToHistoryEntry', {entryId:history.entries[history.currentIndex-1].id});
    },
  };
}

// Under load Chrome can take minutes to stop, and its helper programs can keep
// this process's output pipes open after the report is saved. Ask Chrome to
// close, wait a few seconds at most, then end the browser this harness started
// (its own child and that child's helpers, never any other browser) and let go
// of the pipes so the process can exit.
export async function stopBrowser(cdp, chrome, closeWaitMs = CLOSE_WAIT_MS) {
  let timer;
  try {
    if (cdp) await Promise.race([cdp.send('Browser.close'), new Promise(done => { timer = setTimeout(done, closeWaitMs); })]);
  } catch {}
  clearTimeout(timer);
  try { cdp?.close(); } catch {}
  if (!chrome) return;
  const { child } = chrome;
  if (child.exitCode === null && child.pid) {
    if (process.platform === 'win32') {
      const tree = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      await new Promise(done => { tree.once('error', done); tree.once('exit', done); setTimeout(done, TREE_WAIT_MS).unref(); });
    }
    if (child.exitCode === null) child.kill();
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
}

async function cleanupProfile(profile) {
  const tempRoot = await realpath(tmpdir());
  const target = await realpath(profile);
  if (!target.startsWith(tempRoot + sep) || !target.slice(tempRoot.length + 1).startsWith('the-duel-browser-')) throw Error(`Refusing to remove unexpected browser profile: ${target}`);
  await rm(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (!existsSync(VITE_CLI)) throw Error('Vite is missing. Run npm ci in this isolated worktree.');
  const port = await freePrivatePort();
  const baseURL = `http://127.0.0.1:${port}`;
  const qaBundle = options.qaBundle ? await validateQaBundle(options.qaBundle) : null;
  if (!qaBundle) {
    const build = launch(process.execPath, [VITE_CLI, 'build', '--config', 'tools/vite-qa.config.js']);
    console.log('Building isolated QA bundle...');
    await waitForExit(build, 'QA build');
    // The QA page has no favicon; keep Chrome from logging a false 404 on each navigation.
    const qaHtmlPath = join(PROJECT_ROOT, '.qa-dist', 'tools', 'menu-check.html');
    const qaHtml = await readFile(qaHtmlPath, 'utf8');
    if (!qaHtml.includes('<meta charset=')) throw Error('QA bundle is missing its menu entry.');
    await writeFile(qaHtmlPath, qaHtml.replace('<meta charset=', '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><meta charset='));
  }
  const outputDir = options.outputDir
    ? resolveEvidenceDir(options.outputDir)
    : reviewRoundOutputDir(options.name) ?? evidenceOutputDir(options.name);
  await mkdir(outputDir, { recursive: true });
  const profile = await mkdtemp(join(tmpdir(), 'the-duel-browser-'));
  let preview, chrome, cdp, report, launchMetadata;
  const issues = [], warnings = [], screenshots = [];
  try {
    preview = launch(process.execPath, [VITE_CLI, 'preview', '--config', 'tools/vite-qa.config.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort', ...(qaBundle ? ['--outDir', qaBundle] : [])]);
    await waitForHttp(`${baseURL}/tools/menu-check.html`, preview.child, preview.output);
    const chromePath = chromeExecutable();
    const chromeArgs = chromeLaunchArguments(profile, {headed: options.headed === true});
    chrome = launch(chromePath, chromeArgs);
    launchMetadata = browserLaunchMetadata(chromeArgs);
    const debugPort = await waitForChromePort(profile, chrome.child, chrome.output);
    cdp = await connectDevTools(debugPort);
    // This disposable browser owns only this scenario. Keep exports beside its
    // report and screenshots, including exports triggered after a page reload.
    await cdp.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: outputDir});
    const page = await openPage(cdp, issues, warnings);
    const navigation = createPageNavigation(cdp,page,baseURL);
    const context = {
      baseURL, outputDir, issues, warnings, screenshots, ...launchMetadata,
      navigate: navigation.navigate, reload: navigation.reload, back: navigation.back,
      reloadAfterAction: navigation.reloadAfterAction,
      evaluate: expression => evaluate(cdp, page.sessionId, expression),
      waitFor: (expression, label, timeoutMs) => waitForValue(cdp, page.sessionId, expression, label, timeoutMs),
      command: (method, params) => cdp.send(method, params, page.sessionId),
      screenshot: async name => {
        if (!/^[a-z0-9-]+$/.test(name)) throw Error('Screenshot name must be simple.');
        const result = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, page.sessionId);
        const path = join(outputDir, `${name}.png`);
        await writeFile(path, Buffer.from(result.data, 'base64'));
        screenshots.push(path);
        return path;
      },
    };
    const moduleURL = pathToFileURL(join(PROJECT_ROOT, 'tools', 'scenarios', `${options.name}.mjs`));
    const scenario = await import(moduleURL.href);
    if (typeof scenario.run !== 'function') throw Error(`Scenario ${options.name} does not export run(context).`);
    await scenario.run(context);
    if (options.injectConsoleError) { await context.evaluate("console.error('FND-08 deliberate console error')"); await delay(300); }
    if (issues.length) throw Error(`${issues.length} browser error(s): ${issues.map(issue => `${issue.kind}: ${issue.text}`).join(' | ')}`);
    report = { scenario: options.name, passed: true, port, memoryOnlySaves: true, issues, warnings, screenshots };
    console.log(`Browser smoke passed on private port ${port}. ${screenshots.length} screenshots, ${warnings.length} warnings, 0 errors.`);
  } catch (error) {
    report = { scenario: options.name, passed: false, port, memoryOnlySaves: true, error: error.message, issues, warnings, screenshots };
    console.error(`Browser harness failed: ${error.message}`);
  } finally {
    Object.assign(report, launchMetadata || {headed: false, launchMode: 'not-launched'});
    await writeFile(join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const path of screenshots) console.log(`Screenshot: ${path}`);
    console.log(`Report: ${join(outputDir, 'report.json')}`);
    await stopBrowser(cdp, chrome);
    if (preview && preview.child.exitCode === null) preview.child.kill();
    await delay(300);
    try { await cleanupProfile(profile); } catch (error) { console.error(`Browser profile cleanup: ${error.message}`); }
  }
  return report.passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`Browser harness: ${error.message}`); process.exitCode = 2; });
}
