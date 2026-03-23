import { spawn } from 'node:child_process';
import { copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const PROJECT_ROOT = process.cwd();
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'docs', 'readme');
const OUTPUT_VIDEO_PATH = path.join(OUTPUT_DIR, 'showcase-workflow.webm');
const DEV_SERVER_PORT = process.env.SHOWCASE_PORT ?? '4173';
const CAPTURE_URL = process.env.SHOWCASE_URL ?? `http://127.0.0.1:${DEV_SERVER_PORT}/?showcase=1`;
const VIEWPORT = { width: 1360, height: 840 };
const POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const SHOULD_START_SERVER = !process.argv.includes('--use-existing-server');

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

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
  if (!child?.pid || child.killed) return;

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

async function resetScene(page) {
  await page.evaluate(() => {
    const bridge = window.__LPC_SHOWCASE__;
    if (!bridge) {
      throw new Error('Showcase bridge not found on window.');
    }

    const waferStore = bridge.waferStore.getState();
    waferStore.resetModelState();
    waferStore.setViewState({
      granularity: 'field',
      showDisplacementVectors: true,
      showFieldBoundaries: true,
      showDieBoundaries: true,
      colorMapRange: [0, 320],
      arrowScaleFactor: 34000,
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

async function dragHandle(page, selector, deltaX, deltaY, steps = 14) {
  const handle = page.locator(selector).first();
  await handle.waitFor({ state: 'visible' });
  const box = await handle.boundingBox();
  if (!box) {
    throw new Error(`Handle not found for selector: ${selector}`);
  }

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps });
  await page.mouse.up();
  await page.waitForTimeout(280);
}

async function seedAgentPlan(page) {
  await page.evaluate(() => {
    const bridge = window.__LPC_SHOWCASE__;
    const assistantId = 'showcase-assistant';
    const userPrompt = 'Tighten the vector story, keep field mode, and focus the center field.';
    const demoPlan = {
      planVersion: 'v1',
      intent: 'scenario',
      summary: 'Increase the global scene drift, keep field-level inspection, and focus the center field.',
      analysis: 'This plan adjusts the overall scene first, then keeps the presentation in field mode so the selected field remains the visual focus.',
      actions: [
        {
          type: 'set_wafer_distortion',
          patch: { Tx: 120, Ty: -74, theta: 260 },
        },
        {
          type: 'set_view_state',
          patch: { granularity: 'field', arrowScaleFactor: 38000, colorMapRange: [0, 360] },
        },
        {
          type: 'select_field',
          fieldId: 'f_0_0',
        },
        {
          type: 'set_field_transform',
          fieldId: 'f_0_0',
          patch: { Tx: 62, Ty: -31, theta: 112 },
        },
      ],
      suggestions: [
        'Add a corner warp to the selected field.',
        'Push vector contrast slightly higher.',
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

async function recordWorkflow(page) {
  await page.goto(CAPTURE_URL, { waitUntil: 'networkidle' });
  await page.locator('text=Load Complex Demo').waitFor({ state: 'visible' });
  await page.waitForTimeout(700);

  await resetScene(page);
  await page.getByRole('button', { name: 'Load Complex Demo' }).click();
  await page.waitForTimeout(900);

  await page.locator('[data-wafer-map-panel="interactive"] [data-field-id="f_1_0"]').click();
  await page.waitForTimeout(650);

  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="translate"]', 42, -28);
  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="rotate"]', 32, 44);
  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="scale-right-edge"]', 48, 0);
  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="scale-top-edge"]', 0, -36);
  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="corner-1"]', 30, -24);
  await dragHandle(page, '[data-wafer-map-panel="interactive"] [data-editor-handle-field="f_1_0"][data-editor-handle-key="corner-2"]', 18, 22);

  await page.waitForTimeout(600);

  await page.locator('[data-agent-fab="true"]').click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Generate Plan' }).click();
  await page.locator('textarea').fill('Tighten the vector story, keep field mode, and focus the center field.');
  await page.waitForTimeout(350);

  await page.evaluate(() => {
    window.__LPC_SHOWCASE__.agentStore.setState({
      isLoading: true,
      error: null,
    });
  });
  await page.waitForTimeout(450);

  await seedAgentPlan(page);
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.waitForTimeout(1000);
}

async function run() {
  const devServer = SHOULD_START_SERVER ? startDevServer() : null;
  let browser;
  let context;
  let page;

  try {
    await waitForServer(CAPTURE_URL);

    browser = await chromium.launch({
      headless: true,
      executablePath: getBrowserExecutablePath(),
    });

    context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      recordVideo: {
        dir: OUTPUT_DIR,
        size: VIEWPORT,
      },
    });

    page = await context.newPage();
    await recordWorkflow(page);
    const video = page.video();
    await page.close();
    await context.close();

    if (!video) {
      throw new Error('Playwright did not return a video handle.');
    }

    const recordedPath = await video.path();
    await copyFile(recordedPath, OUTPUT_VIDEO_PATH);
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    if (devServer) {
      await stopDevServer(devServer);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
