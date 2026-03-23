import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';
import gifenc from 'gifenc';

const { GIFEncoder, applyPalette, quantize } = gifenc;

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'readme');
const DEV_SERVER_PORT = process.env.SHOWCASE_PORT ?? '4173';
const CAPTURE_URL = process.env.SHOWCASE_URL ?? `http://127.0.0.1:${DEV_SERVER_PORT}/?showcase=1`;
const VIEWPORT = { width: 1360, height: 840 };
const FRAME_DELAY_MS = 90;
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SHOULD_START_SERVER = !process.argv.includes('--use-existing-server');

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

function easeInOut(progress) {
  return 0.5 - Math.cos(progress * Math.PI) / 2;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeClip(clip) {
  const x = clamp(Math.floor(clip.x), 0, VIEWPORT.width - 1);
  const y = clamp(Math.floor(clip.y), 0, VIEWPORT.height - 1);
  const width = clamp(Math.ceil(clip.width), 1, VIEWPORT.width - x);
  const height = clamp(Math.ceil(clip.height), 1, VIEWPORT.height - y);
  return { x, y, width, height };
}

async function getUnionClip(page, selectors, padding = { top: 20, right: 20, bottom: 20, left: 20 }) {
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    if (box) boxes.push(box);
  }

  if (boxes.length === 0) {
    return { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height };
  }

  const left = Math.min(...boxes.map((box) => box.x)) - padding.left;
  const top = Math.min(...boxes.map((box) => box.y)) - padding.top;
  const right = Math.max(...boxes.map((box) => box.x + box.width)) + padding.right;
  const bottom = Math.max(...boxes.map((box) => box.y + box.height)) + padding.bottom;

  return normalizeClip({
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  });
}

async function getExpandedElementClip(page, selector, expand = { top: 20, right: 20, bottom: 20, left: 20 }) {
  const box = await page.locator(selector).boundingBox();
  if (!box) {
    return { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height };
  }

  return normalizeClip({
    x: box.x - expand.left,
    y: box.y - expand.top,
    width: box.width + expand.left + expand.right,
    height: box.height + expand.top + expand.bottom,
  });
}

function getBrowserExecutablePath() {
  const executablePath = BROWSER_PATHS.find((candidate) => existsSync(candidate));
  if (!executablePath) {
    throw new Error('Could not find a local Chrome or Edge executable for showcase capture.');
  }
  return executablePath;
}

async function waitForServer(url, timeoutMs = 30000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startDevServer() {
  const child = spawn(
    POWERSHELL,
    ['-Command', `npm.cmd run dev -- --host 127.0.0.1 --port ${DEV_SERVER_PORT} --strictPort`],
    {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      windowsHide: true,
    },
  );

  child.stdout?.on('data', (chunk) => process.stdout.write(String(chunk)));
  child.stderr?.on('data', (chunk) => process.stderr.write(String(chunk)));

  return child;
}

async function stopDevServer(child) {
  if (!child.pid || child.killed) return;

  await new Promise((resolve) => {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      cwd: PROJECT_ROOT,
      windowsHide: true,
      stdio: 'ignore',
    });

    killer.on('exit', () => resolve());
    killer.on('error', () => resolve());
  });
}

async function openPage(browser) {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });

  await page.goto(CAPTURE_URL, { waitUntil: 'networkidle' });
  await page.locator('text=Load Complex Demo').waitFor({ state: 'visible' });
  await page.waitForTimeout(800);
  return page;
}

async function resetScene(page) {
  await page.evaluate(() => {
    const bridge = window.__LPC_SHOWCASE__;
    if (!bridge) {
      throw new Error('Showcase bridge not found on window.');
    }

    const waferStore = bridge.waferStore.getState();
    waferStore.resetModelState();
    waferStore.setViewState({
      granularity: 'die',
      showDisplacementVectors: true,
      showFieldBoundaries: true,
      showDieBoundaries: true,
      colorMapRange: [0, 1000],
      arrowScaleFactor: 10000,
    });
    waferStore.selectField(null);
    waferStore.resetFieldTransformOverride('f_0_0');
    waferStore.resetFieldCornerOverlay('f_0_0');

    bridge.agentStore.setState({
      prompt: '',
      selectedTemplateId: 'general',
      isLoading: false,
      error: null,
      draftPlan: null,
      activePlanMessageId: null,
      history: [],
      lastAppliedSnapshot: null,
    });
  });
  await page.waitForTimeout(250);
}

async function pushFrame(page, frames, repeat = 1, clip) {
  const screenshotOptions = {
    type: 'png',
  };
  if (clip) {
    screenshotOptions.clip = clip;
  }

  const screenshot = await page.screenshot(screenshotOptions);
  for (let i = 0; i < repeat; i += 1) {
    frames.push(screenshot);
  }
}

async function writeGif(outputPath, frames) {
  if (frames.length === 0) {
    throw new Error(`No frames were captured for ${outputPath}`);
  }

  const gif = GIFEncoder();

  frames.forEach((frame, index) => {
    const png = PNG.sync.read(frame);
    const palette = quantize(png.data, 128, { format: 'rgb565' });
    const indexed = applyPalette(png.data, palette, 'rgb565');
    gif.writeFrame(indexed, png.width, png.height, {
      palette,
      delay: FRAME_DELAY_MS,
      repeat: index === 0 ? 0 : undefined,
    });
  });

  gif.finish();
  await writeFile(outputPath, Buffer.from(gif.bytes()));
}

async function captureTween(page, frameCount, updateFrame, clip) {
  const frames = [];
  await pushFrame(page, frames, 3, clip);
  for (let step = 1; step <= frameCount; step += 1) {
    await updateFrame(step / frameCount);
    await page.waitForTimeout(80);
    await pushFrame(page, frames, 1, clip);
  }
  await pushFrame(page, frames, 6, clip);
  return frames;
}

async function captureWaferTransform(page) {
  await resetScene(page);
  const frames = await captureTween(page, 24, async (progress) => {
    const eased = easeInOut(progress);
    await page.evaluate((value) => {
      const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
      waferStore.setViewState({ granularity: 'die', arrowScaleFactor: 28000 });
      waferStore.setWaferDistortion({
        Tx: Math.round(160 * value),
        Ty: Math.round(-120 * value),
        theta: Math.round(320 * value),
        M: 0,
        Sx: 0,
        Sy: 0,
      });
    }, eased);
  });

  await writeGif(path.join(OUTPUT_DIR, 'showcase-wafer-transform.gif'), frames);
}

async function captureFieldTransform(page) {
  await resetScene(page);
  const frames = await captureTween(page, 24, async (progress) => {
    const eased = easeInOut(progress);
    await page.evaluate((value) => {
      const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
      waferStore.setViewState({ granularity: 'field', arrowScaleFactor: 32000 });
      waferStore.setFieldDistortion({
        FTx: Math.round(150 * value),
        FTy: Math.round(-110 * value),
        Ftheta: Math.round(-240 * value),
        FM: Math.round(1.6 * value * 100) / 100,
        FSx: Math.round(1.1 * value * 100) / 100,
        FSy: Math.round(-0.9 * value * 100) / 100,
      });
    }, eased);
  });

  await writeGif(path.join(OUTPUT_DIR, 'showcase-field-transform.gif'), frames);
}

async function captureFieldEdit(page) {
  const showcaseFieldId = 'f_1_0';

  await resetScene(page);
  await page.evaluate(() => {
    const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
    waferStore.applyVectorMapShowcase();
    waferStore.setViewState({ granularity: 'field', arrowScaleFactor: 34000 });
  });
  await page.evaluate((fieldId) => {
    const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
    waferStore.selectField(fieldId);
  }, showcaseFieldId);
  await page.waitForTimeout(500);
  const clip = await getUnionClip(
    page,
    ['[data-wafer-map-panel="interactive"]', '[data-field-edit-panel="true"]'],
    { top: 18, right: 18, bottom: 18, left: 18 },
  );

  const frames = await captureTween(page, 22, async (progress) => {
    const eased = easeInOut(progress);
    await page.evaluate(({ fieldId, value }) => {
      const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
      waferStore.selectField(fieldId);
      waferStore.setFieldTransformOverride(fieldId, {
        Tx: Math.round(180 * value),
        Ty: Math.round(-138 * value),
        theta: Math.round(240 * value),
        M: Math.round(1.2 * value * 100) / 100,
        Sx: Math.round(0.92 * value * 100) / 100,
        Sy: Math.round(-0.66 * value * 100) / 100,
      });
      waferStore.setFieldCornerOverlay(fieldId, {
        cornerDx: [
          Math.round(58 * value),
          Math.round(132 * value),
          Math.round(-72 * value),
          Math.round(-116 * value),
        ],
        cornerDy: [
          Math.round(118 * value),
          Math.round(-48 * value),
          Math.round(-126 * value),
          Math.round(52 * value),
        ],
      });
    }, { fieldId: showcaseFieldId, value: eased });
  }, clip);

  await writeGif(path.join(OUTPUT_DIR, 'showcase-field-edit.gif'), frames);
}

async function seedAgentPlan(page) {
  await page.evaluate(() => {
    const bridge = window.__LPC_SHOWCASE__;
    const assistantId = 'showcase-assistant';
    const userPrompt = 'Increase wafer rotation, switch to field view, and open the center field for inspection.';
    const demoPlan = {
      planVersion: 'v1',
      intent: 'scenario',
      summary: 'Adjust the global scene, switch to field-level inspection, and focus the center field.',
      analysis: 'This keeps the changes small and reviewable: first update wafer-level drift, then switch the vector map to field granularity, then open the center field so local inspection can continue there.',
      actions: [
        {
          type: 'set_wafer_distortion',
          patch: { Tx: 96, Ty: -62, theta: 220 },
        },
        {
          type: 'set_view_state',
          patch: { granularity: 'field', arrowScaleFactor: 34000 },
        },
        {
          type: 'select_field',
          fieldId: 'f_0_0',
        },
        {
          type: 'set_field_transform',
          fieldId: 'f_0_0',
          patch: { Tx: 48, Ty: -24, theta: 88 },
        },
      ],
      suggestions: [
        'Add a small corner warp to the selected field.',
        'Raise vector scale slightly for presentation.',
      ],
      providerId: 'local-openai-compatible',
      requiresConfirmation: true,
    };

    bridge.agentStore.setState({
      prompt: '',
      selectedTemplateId: 'generate-plan',
      isLoading: false,
      error: null,
      draftPlan: demoPlan,
      activePlanMessageId: assistantId,
      history: [
        {
          id: 'showcase-user',
          role: 'user',
          text: userPrompt,
          createdAt: Date.now() - 1000,
        },
        {
          id: assistantId,
          role: 'assistant',
          text: `${demoPlan.summary}\n\n${demoPlan.analysis}`,
          createdAt: Date.now(),
          plan: demoPlan,
          diagnostics: {
            droppedActions: [],
            rawActionCount: 4,
            normalizedActionCount: 4,
            finalActionCount: 4,
            droppedActionCount: 0,
            droppedActionTypes: [],
            warnings: [],
          },
        },
      ],
    });
  });
}

async function captureAgentWorkflow(page) {
  await resetScene(page);
  await page.evaluate(() => {
    const waferStore = window.__LPC_SHOWCASE__.waferStore.getState();
    waferStore.applyVectorMapShowcase();
    waferStore.setViewState({ granularity: 'field', arrowScaleFactor: 34000 });
  });
  await page.waitForTimeout(500);

  const frames = [];
  await page.locator('button[title*="LPC Agent"]').click();
  await page.waitForTimeout(700);
  const clip = await getExpandedElementClip(
    page,
    '[data-agent-panel-root="true"]',
    { top: 26, right: 24, bottom: 24, left: 280 },
  );
  await pushFrame(page, frames, 4, clip);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(350);
  await pushFrame(page, frames, 3, clip);

  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.waitForTimeout(250);
  await pushFrame(page, frames, 2, clip);

  await page.getByRole('button', { name: 'Generate Plan' }).click();
  await page.locator('textarea').fill('Increase wafer rotation, switch to field view, and open the center field for inspection.');
  await page.waitForTimeout(250);
  await pushFrame(page, frames, 4, clip);

  await page.evaluate(() => {
    window.__LPC_SHOWCASE__.agentStore.setState({
      isLoading: true,
      error: null,
    });
  });
  await page.waitForTimeout(250);
  await pushFrame(page, frames, 3, clip);

  await seedAgentPlan(page);
  await page.waitForTimeout(250);
  await pushFrame(page, frames, 5, clip);

  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(400);
  await pushFrame(page, frames, 5, clip);

  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(350);
  await pushFrame(page, frames, 6, clip);

  await writeGif(path.join(OUTPUT_DIR, 'showcase-agent.gif'), frames);
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const devServer = SHOULD_START_SERVER ? startDevServer() : null;
  try {
    await waitForServer(CAPTURE_URL);

    const browser = await chromium.launch({
      headless: true,
      executablePath: getBrowserExecutablePath(),
    });

    try {
      const page = await openPage(browser);
      await captureWaferTransform(page);
      await captureFieldTransform(page);
      await captureFieldEdit(page);
      await captureAgentWorkflow(page);
      await page.close();
    } finally {
      await browser.close();
    }
  } finally {
    if (devServer) {
      await stopDevServer(devServer);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
