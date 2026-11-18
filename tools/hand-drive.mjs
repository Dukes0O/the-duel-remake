// A hand drive in bursts of real time, for the rule that Claude drives a thing by hand before it is shown (EVERBURN-REMAKE).
// The desktop app's own browser pane draws about one frame a second when nobody is at the laptop, so this starts a visible
// Chrome that keeps running at full frame rate, and sends it real key presses. The game is paused between bursts, as a
// player pauses to think. Saves are memory-only: use the QA page, never port 5174.
//   1. Serve the game on a private port from a lane or Claude's worktree, for example
//        node node_modules/vite/bin/vite.js --host localhost --port 5191 --strictPort
//   2. node tools/hand-drive.mjs start "http://localhost:5191/tools/menu-check.html?flags=hidden-road,story-everburn"
//   3. node tools/hand-drive.mjs do <step> <step> ...   steps run in order:
//        hold:ArrowUp+ArrowLeft:3000        keys held for that many milliseconds of real time
//        hold:ArrowUp:3000:name             the same, with a picture taken just before the keys are let go
//        free:3000  or  free:3000:name      no keys, the game running
//        eval:<javascript>                  evaluated in the page, the result printed
//        shot:<name>                        a picture now (the pause screen, if the game is paused)
//        hold:Mouse:300  or  hold:ArrowUp+Mouse:800   the left mouse button held, alone or with keys
//      Keys: the arrows, Space, Escape, Enter, Tab, ShiftLeft and the letters W A S D Q P C F E H M V G R X and the digits 1 to 4 (as ArrowUp, KeyW, Digit4 and so on).
//   4. node tools/hand-drive.mjs stop       closes that Chrome and deletes its throwaway profile
// Pictures are saved as .evidence/hand-drive/<name>.jpg under the folder the tool is run from, and are deleted after the review.
import {spawn} from 'node:child_process';
import {writeFile, readFile, rm, mkdir} from 'node:fs/promises';
import {join} from 'node:path';

const here = join(process.cwd(), '.evidence', 'hand-drive'), PORT = 9333, profile = join(here, 'chrome-profile'), pidFile = join(here, 'chrome.pid');
const sleep = ms => new Promise(done => setTimeout(done, ms));
const VK = {ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, Space: 32, Escape: 27, KeyP: 80, KeyC: 67, KeyF: 70, KeyE: 69, KeyH: 72, KeyM: 77, Enter: 13, KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyQ: 81, Tab: 9, ShiftLeft: 16, KeyV: 86, KeyG: 71, KeyR: 82, KeyX: 88, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52};

async function page() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const tab = list.find(entry => entry.type === 'page');
      if (tab) return tab.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw Error('Chrome is not answering on port ' + PORT);
}

async function connect() {
  const socket = new WebSocket(await page());
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let id = 0; const waiting = new Map();
  socket.onmessage = event => { const message = JSON.parse(event.data); const wait = waiting.get(message.id); if (wait) { waiting.delete(message.id); message.error ? wait.fail(Error(message.error.message)) : wait.done(message.result); } };
  const send = (method, params = {}) => new Promise((done, fail) => { waiting.set(++id, {done, fail}); socket.send(JSON.stringify({id, method, params})); });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result.value;
  };
  // A page that is hidden draws no frames, and the game stands still. Something on the laptop can minimise this window during a
  // long drive (it happened on 16 November 2026, four minutes into a bore), so it is put back before every step.
  const restore = async () => {
    try {
      const {windowId, bounds} = await send('Browser.getWindowForTarget');
      if (bounds?.windowState && bounds.windowState !== 'normal') await send('Browser.setWindowBounds', {windowId, bounds: {windowState: 'normal'}});
    } catch { /* an older Chrome without the call: carry on */ }
  };
  return {send, evaluate, restore, close: () => socket.close()};
}

const [command, ...steps] = process.argv.slice(2);
if (command === 'start' && /:5174/.test(steps[0] ?? '')) throw Error('Port 5174 is the live game. Use a private port.');
if (command === 'start' || command === 'do') await mkdir(here, {recursive: true});
if (command === 'start') {
  await mkdir(profile, {recursive: true});
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--no-first-run', '--no-default-browser-check', '--disable-background-networking',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-extensions', '--mute-audio',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--window-size=1296,810', steps[0]], {detached: true, stdio: 'ignore'});
  chrome.unref(); await writeFile(pidFile, String(chrome.pid)); await page(); console.log('chrome', chrome.pid);
} else if (command === 'stop') {
  const pid = Number(await readFile(pidFile, 'utf8'));
  try { const browser = await connect(); await browser.send('Browser.close'); browser.close(); } catch { try { process.kill(pid); } catch { /* gone */ } }
  await sleep(1500); await rm(profile, {recursive: true, force: true}); await rm(pidFile, {force: true}); console.log('stopped', pid);
} else if (command === 'do') {
  const browser = await connect();
  const key = (type, code) => browser.send('Input.dispatchKeyEvent', {type, code, key: code.startsWith('Key') ? code.slice(3).toLowerCase() : code.startsWith('Digit') ? code.slice(5) : code === 'Space' ? ' ' : code, windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code]});
  // The left mouse button, pressed in the middle of the view (on foot it fires the hand weapon or swings).
  const mouse = type => browser.send('Input.dispatchMouseEvent', {type, x: 640, y: 400, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1});
  // In the Dig (a machine yard, not a race) there is no race to pause: `window.__theDig` runs on its own.
  const running = on => browser.evaluate(`(() => { const a = window.__qaApp; if (!a || window.__theDig?.host?.isConnected) return; if (a.duel.state.paused === ${on}) a.togglePause(); })()`);
  const shot = async name => {
    const {data} = await browser.send('Page.captureScreenshot', {format: 'jpeg', quality: 60, clip: {x: 0, y: 0, width: 1282, height: 716, scale: .5}});
    await writeFile(join(here, `${name}.jpg`), Buffer.from(data, 'base64'));
  };
  for (const step of steps) {
    await browser.restore();
    const [kind, ...rest] = step.split(':');
    if (kind === 'hold' || kind === 'free') {
      const codes = kind === 'hold' ? rest[0].split('+') : [], ms = Number(rest[kind === 'hold' ? 1 : 0]);
      await running(true);
      for (const code of codes) await (code === 'Mouse' ? mouse('mousePressed') : key('rawKeyDown', code));
      await sleep(ms);
      const name = rest[kind === 'hold' ? 2 : 1];
      if (name) await shot(name);
      for (const code of codes) await (code === 'Mouse' ? mouse('mouseReleased') : key('keyUp', code));
      await running(false);
    } else if (kind === 'eval') console.log(JSON.stringify(await browser.evaluate(rest.join(':'))));
    else if (kind === 'shot') await shot(rest[0]); else throw Error('Unknown step ' + step);
  }
  browser.close();
}
