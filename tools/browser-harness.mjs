import { spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PROJECT_ROOT = resolve(fileURLToPath(new URL('../', import.meta.url)));
const VITE_CLI = join(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const QA_OUTPUT = join(PROJECT_ROOT, '.qa-dist', 'browser-output');
const PRIVATE_PORT_MIN = 5191;
const TIMEOUT_MS = 45_000;
const delay = ms => new Promise(done => setTimeout(done, ms));

export function parseArguments(args) {
  const [command, ...rest] = args;
  if (!['smoke', 'scenario'].includes(command)) throw Error('Usage: node tools/browser-harness.mjs smoke|scenario NAME [--inject-console-error]');
  let name = command === 'smoke' ? 'smoke' : null;
  let injectConsoleError = false;
  for (const value of rest) {
    if (value === '--inject-console-error') injectConsoleError = true;
    else if (command === 'scenario' && name === null && /^[a-z][a-z0-9-]*$/.test(value)) name = value;
    else throw Error(`Unknown browser harness argument: ${value}`);
  }
  if (!name) throw Error('scenario needs a simple name from tools/scenarios/.');
  return { name, injectConsoleError };
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
      const timer = setTimeout(() => { this.pending.delete(id); reject(Error(`${method} timed out.`)); }, 20_000);
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
  const build = launch(process.execPath, [VITE_CLI, 'build', '--config', 'tools/vite-qa.config.js']);
  console.log('Building isolated QA bundle...');
  await waitForExit(build, 'QA build');
  // The QA page has no favicon; keep Chrome from logging a false 404 on each navigation.
  const qaHtmlPath = join(PROJECT_ROOT, '.qa-dist', 'tools', 'menu-check.html');
  const qaHtml = await readFile(qaHtmlPath, 'utf8');
  if (!qaHtml.includes('<meta charset=')) throw Error('QA bundle is missing its menu entry.');
  await writeFile(qaHtmlPath, qaHtml.replace('<meta charset=', '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E"><meta charset='));
  await mkdir(QA_OUTPUT, { recursive: true });
  const outputDir = join(QA_OUTPUT, `${options.name}-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await mkdir(outputDir, { recursive: true });
  const profile = await mkdtemp(join(tmpdir(), 'the-duel-browser-'));
  let preview, chrome, cdp, report;
  const issues = [], warnings = [], screenshots = [];
  try {
    preview = launch(process.execPath, [VITE_CLI, 'preview', '--config', 'tools/vite-qa.config.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort']);
    await waitForHttp(`${baseURL}/tools/menu-check.html`, preview.child, preview.output);
    const chromePath = chromeExecutable();
    chrome = launch(chromePath, [
      '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
      '--disable-extensions', '--mute-audio', '--enable-unsafe-swiftshader',
      '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
    ]);
    const debugPort = await waitForChromePort(profile, chrome.child, chrome.output);
    cdp = await connectDevTools(debugPort);
    const page = await openPage(cdp, issues, warnings);
    const context = {
      baseURL, outputDir, issues, warnings, screenshots,
      navigate: async path => { if (!path.startsWith('/tools/') || path.includes('..')) throw Error('Scenario path must stay in QA tools.'); await cdp.send('Page.navigate', { url: baseURL + path }, page.sessionId); },
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
    await writeFile(join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    for (const path of screenshots) console.log(`Screenshot: ${path}`);
    console.log(`Report: ${join(outputDir, 'report.json')}`);
    try { if (cdp) await cdp.send('Browser.close'); } catch {}
    cdp?.close();
    if (chrome && chrome.child.exitCode === null) chrome.child.kill();
    if (preview && preview.child.exitCode === null) preview.child.kill();
    await delay(300);
    try { await cleanupProfile(profile); } catch (error) { console.error(`Browser profile cleanup: ${error.message}`); }
  }
  return report.passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(`Browser harness: ${error.message}`); process.exitCode = 2; });
}