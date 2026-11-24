#!/usr/bin/env node
/**
 * Take screenshots of the site in headless Chrome, with software WebGL, and
 * report console errors. No dependencies: it talks to Chrome over the
 * DevTools protocol using Node's built-in WebSocket (Node 22 or later).
 *
 * Usage:
 *   node tools/screenshot.mjs <url> [options]
 *
 * Options:
 *   --size WxH            Viewport size in CSS pixels (default 1280x800).
 *   --out PATH            Save a screenshot here after all steps.
 *   --dpr N               Device pixel ratio (default 1).
 *   --mobile              Emulate a phone (touch, mobile viewport). On by default below 600 px wide.
 *   --desktop             Turn phone emulation off even below 600 px wide.
 *   --reduced-motion      Emulate prefers-reduced-motion: reduce.
 *   --no-webgl            Start Chrome without WebGL, to test the fallback.
 *   --timeout MS          Longest wait for any one step (default 20000).
 *   --step STEP           A step to run after the page loads; repeat for more, in order:
 *       wait:MS               Wait a number of milliseconds.
 *       waitfor:SELECTOR      Wait until an element matching SELECTOR is visible.
 *       click:SELECTOR        Click the center of the first visible match.
 *       key:KEY               Press a key: Tab, Shift+Tab, Enter, Space, Escape,
 *                             ArrowLeft, ArrowRight, ArrowUp, ArrowDown, PageUp,
 *                             PageDown, Home, End, or a single character.
 *       eval:JS               Evaluate JavaScript in the page and print the result.
 *       shot:PATH             Save a screenshot now.
 *   --fail-on-error       Exit with status 1 if the page logged any errors.
 *
 * Example:
 *   node tools/screenshot.mjs http://localhost:5173/ --size 390x844 \
 *     --step waitfor:body.is-ready --step click:#welcome-explore --step wait:800 \
 *     --out assets-src/shots/phone.png
 */
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/* ------------------------------------------------------------------ */
/* Arguments                                                           */
/* ------------------------------------------------------------------ */

function parseArgs(argv) {
  const options = {
    url: null,
    width: 1280,
    height: 800,
    dpr: 1,
    mobile: null,
    reducedMotion: false,
    webgl: true,
    timeout: 20000,
    out: null,
    steps: [],
    failOnError: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      return value;
    };
    switch (arg) {
      case '--size': {
        const match = /^(\d+)x(\d+)$/.exec(next());
        if (!match) throw new Error('--size must look like 390x844');
        options.width = Number(match[1]);
        options.height = Number(match[2]);
        break;
      }
      case '--out':
        options.out = next();
        break;
      case '--dpr':
        options.dpr = Number(next());
        break;
      case '--mobile':
        options.mobile = true;
        break;
      case '--desktop':
        options.mobile = false;
        break;
      case '--reduced-motion':
        options.reducedMotion = true;
        break;
      case '--no-webgl':
        options.webgl = false;
        break;
      case '--timeout':
        options.timeout = Number(next());
        break;
      case '--step':
        options.steps.push(next());
        break;
      case '--fail-on-error':
        options.failOnError = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (arg.startsWith('--')) throw new Error(`Unknown option ${arg}`);
        options.url = arg;
    }
  }
  if (options.mobile === null) options.mobile = options.width < 600;
  return options;
}

/* ------------------------------------------------------------------ */
/* Chrome and the DevTools protocol                                     */
/* ------------------------------------------------------------------ */

async function launchChrome(options) {
  const profile = await mkdtemp(join(tmpdir(), 'mttm-chrome-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-component-update',
    '--hide-scrollbars',
    '--mute-audio',
    '--force-color-profile=srgb',
    `--window-size=${options.width},${options.height}`,
  ];
  if (options.webgl) {
    // Software WebGL, so screenshots work without a GPU.
    args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist');
  } else {
    args.push('--disable-3d-apis', '--disable-webgl');
  }
  args.push('about:blank');

  const chrome = spawn(CHROME, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolveEndpoint, reject) => {
    let buffer = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start in time')), 15000);
    chrome.stderr.on('data', (chunk) => {
      buffer += chunk.toString();
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffer);
      if (match) {
        clearTimeout(timer);
        resolveEndpoint(match[1]);
      }
    });
    chrome.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    chrome.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Chrome exited early (code ${code})`));
    });
  });

  const close = async () => {
    if (chrome.exitCode === null) {
      chrome.kill('SIGTERM');
      await new Promise((done) => {
        const timer = setTimeout(() => {
          chrome.kill('SIGKILL');
          done();
        }, 3000);
        chrome.once('exit', () => {
          clearTimeout(timer);
          done();
        });
      });
    }
    await rm(profile, { recursive: true, force: true });
  };
  return { endpoint, close };
}

/** A minimal DevTools protocol client over one browser WebSocket. */
async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', () => fail(new Error('Could not connect to Chrome')), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map();
  const handlers = new Set();
  socket.addEventListener('message', (message) => {
    const data = JSON.parse(String(message.data));
    if (data.id !== undefined && pending.has(data.id)) {
      const { resolve: done, reject: fail } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) fail(new Error(`${data.error.message} ${data.error.data ?? ''}`.trim()));
      else done(data.result);
    } else if (data.method) {
      for (const handler of handlers) handler(data);
    }
  });
  return {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      socket.send(JSON.stringify(payload));
      return new Promise((done, fail) => pending.set(id, { resolve: done, reject: fail }));
    },
    on(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    close() {
      socket.close();
    },
  };
}

/* ------------------------------------------------------------------ */
/* Page helpers                                                        */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const KEYS = {
  Tab: { code: 'Tab', keyCode: 9 },
  Enter: { code: 'Enter', keyCode: 13, text: '\r' },
  Space: { key: ' ', code: 'Space', keyCode: 32, text: ' ' },
  Escape: { code: 'Escape', keyCode: 27 },
  ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
  ArrowUp: { code: 'ArrowUp', keyCode: 38 },
  ArrowRight: { code: 'ArrowRight', keyCode: 39 },
  ArrowDown: { code: 'ArrowDown', keyCode: 40 },
  PageUp: { code: 'PageUp', keyCode: 33 },
  PageDown: { code: 'PageDown', keyCode: 34 },
  Home: { code: 'Home', keyCode: 36 },
  End: { code: 'End', keyCode: 35 },
};

function makePage(cdp, sessionId, options) {
  const send = (method, params) => cdp.send(method, params, sessionId);

  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ?? result.exceptionDetails.text,
      );
    }
    return result.result.value;
  };

  const waitFor = async (check, what) => {
    const deadline = Date.now() + options.timeout;
    while (Date.now() < deadline) {
      if (await check()) return;
      await sleep(100);
    }
    throw new Error(`Timed out waiting for ${what}`);
  };

  const visibleCenter = (selector) =>
    evaluate(`(() => {
      for (const el of document.querySelectorAll(${JSON.stringify(selector)})) {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (box.width > 0 && box.height > 0 && style.visibility !== 'hidden') {
          return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        }
      }
      return null;
    })()`);

  const screenshot = async (path) => {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: false,
    });
    const file = resolve(path);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(data, 'base64'));
    console.log(`Saved ${path}`);
  };

  const press = async (combo) => {
    const parts = combo.split('+');
    const name = parts.pop();
    const shift = parts.includes('Shift');
    const spec = KEYS[name] ?? {
      code: `Key${name.toUpperCase()}`,
      keyCode: name.toUpperCase().charCodeAt(0),
      text: name,
    };
    const key = spec.key ?? name;
    const modifiers = shift ? 8 : 0;
    const base = {
      key,
      code: spec.code,
      windowsVirtualKeyCode: spec.keyCode,
      nativeVirtualKeyCode: spec.keyCode,
      modifiers,
    };
    const down = spec.text
      ? { ...base, type: 'keyDown', text: spec.text, unmodifiedText: spec.text }
      : { ...base, type: 'rawKeyDown' };
    await send('Input.dispatchKeyEvent', down);
    await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' });
  };

  const runStep = async (step) => {
    const colon = step.indexOf(':');
    const kind = colon === -1 ? step : step.slice(0, colon);
    const arg = colon === -1 ? '' : step.slice(colon + 1);
    switch (kind) {
      case 'wait':
        await sleep(Number(arg) || 0);
        break;
      case 'waitfor':
        await waitFor(async () => (await visibleCenter(arg)) !== null, arg);
        break;
      case 'click': {
        let point = null;
        await waitFor(async () => (point = await visibleCenter(arg)) !== null, arg);
        const at = { x: point.x, y: point.y, button: 'left', clickCount: 1 };
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y });
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at });
        break;
      }
      case 'key':
        await press(arg);
        break;
      case 'eval':
        console.log(`eval: ${JSON.stringify(await evaluate(arg))}`);
        break;
      case 'shot':
        await screenshot(arg);
        break;
      default:
        throw new Error(`Unknown step "${step}"`);
    }
  };

  return { send, evaluate, screenshot, runStep };
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help || !options.url) {
    console.log(
      'Usage: node tools/screenshot.mjs <url> [--size WxH] [--out PATH] [--step STEP ...]',
    );
    console.log('See the comment at the top of tools/screenshot.mjs for every option.');
    process.exit(options.help ? 0 : 2);
  }

  const chrome = await launchChrome(options);
  const cdp = await connect(chrome.endpoint);
  const errors = [];
  let failed = false;

  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const page = makePage(cdp, sessionId, options);

    cdp.on((event) => {
      if (event.sessionId !== sessionId) return;
      const { method, params } = event;
      if (
        method === 'Runtime.consoleAPICalled' &&
        (params.type === 'error' || params.type === 'assert')
      ) {
        errors.push(
          `console.${params.type}: ${params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`,
        );
      } else if (method === 'Runtime.exceptionThrown') {
        const details = params.exceptionDetails;
        errors.push(`exception: ${details.exception?.description ?? details.text}`);
      } else if (method === 'Log.entryAdded' && params.entry.level === 'error') {
        errors.push(
          `${params.entry.source}: ${params.entry.text}${params.entry.url ? ` (${params.entry.url})` : ''}`,
        );
      }
    });

    await page.send('Runtime.enable');
    await page.send('Log.enable');
    await page.send('Page.enable');
    await page.send('Emulation.setDeviceMetricsOverride', {
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.dpr,
      mobile: options.mobile,
    });
    if (options.mobile) {
      await page.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    }
    await page.send('Emulation.setEmulatedMedia', {
      features: [
        {
          name: 'prefers-reduced-motion',
          value: options.reducedMotion ? 'reduce' : 'no-preference',
        },
      ],
    });

    const loaded = new Promise((done) => {
      const stop = cdp.on((event) => {
        if (event.sessionId === sessionId && event.method === 'Page.loadEventFired') {
          stop();
          done();
        }
      });
    });
    await page.send('Page.navigate', { url: options.url });
    await Promise.race([loaded, sleep(options.timeout)]);

    for (const step of options.steps) {
      await page.runStep(step);
    }
    if (options.out) await page.screenshot(options.out);
  } catch (error) {
    failed = true;
    console.error(`Error: ${error.message}`);
  } finally {
    cdp.close();
    await chrome.close();
  }

  if (errors.length) {
    console.log(`Console errors (${errors.length}):`);
    for (const error of errors) console.log(`  ${error}`);
  } else {
    console.log('Console errors: none');
  }
  if (failed || (options.failOnError && errors.length)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
