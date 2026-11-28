import { chromium, type Page } from 'playwright-core';
import { createServer } from 'vite';
import type { useGame } from '../src/game/store';

declare global {
  interface Window {
    __game: typeof useGame;
  }
}

const TUTORIAL_STEPS = [0, 6, 12, 18, 22];
const CHECK_TIMEOUT = 40_000;
const DOUBLE_CLICK_GUARD_MS = 300;

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'warn' });
await server.listen();
const base = server.resolvedUrls!.local[0];
const browser = await chromium.launch({ channel: 'chrome', chromiumSandbox: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors: string[] = [];

function watch(page: Page) {
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`page: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('/ribbit/')) errors.push(`http ${r.status()}: ${r.url()}`);
  });
}

async function home(page: Page, query = '') {
  await page.goto(new URL(query, base).href);
  await page.locator('canvas').first().waitFor();
  await page.getByRole('button', { name: 'Tutorial', exact: true }).waitFor();
  await page.waitForFunction(() => document.documentElement.dataset.started !== undefined);
}

const caption = (page: Page) => page.evaluate(() => window.__game.getState().caption?.text ?? null);
const tone = (page: Page) => page.evaluate(() => window.__game.getState().caption?.tone ?? null);

async function checkFormula(page: Page, formula: string, expect: 'fail' | 'success') {
  const box = page.getByRole('textbox', { name: 'area' });
  await box.fill(formula);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await page.waitForFunction((want) => window.__game.getState().caption?.tone === want && !window.__game.getState().busy, expect, { timeout: CHECK_TIMEOUT });
  console.log(`  ${formula}: ${await tone(page)}`);
}

async function level(page: Page) {
  console.log('level');
  await home(page);
  await page.getByRole('button', { name: 'Levels', exact: true }).click();
  await page.getByRole('button', { name: /Countdown/ }).click();
  await page.getByRole('textbox', { name: 'area' }).waitFor();
  await page.waitForFunction(() => window.__game.getState().mode === 'level');
  await checkFormula(page, 'i <= n', 'fail');
  await checkFormula(page, 'i >= 0', 'success');
}

async function tutorial(page: Page, step: number) {
  console.log(`tutorial step ${step}`);
  await home(page, `?step=${step}`);
  await page.getByRole('button', { name: 'Tutorial', exact: true }).click();
  await page.waitForFunction(() => window.__game.getState().mode === 'tutorial' && window.__game.getState().caption !== null);
  for (let k = 0; k < 2; k++) {
    const label = await page.evaluate(() => {
      const action = window.__game.getState().caption?.action;
      return action && !action.disabled ? action.label : null;
    });
    if (!label) break;
    await page.waitForTimeout(DOUBLE_CLICK_GUARD_MS);
    const before = await caption(page);
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.waitForFunction((was) => window.__game.getState().caption?.text !== was, before, { timeout: 15_000 });
    console.log(`  ${label}`);
  }
}

async function fresh<T>(run: (page: Page) => Promise<T>) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, locale: 'en-US' });
  watch(page);
  try {
    return await run(page);
  } finally {
    page.removeAllListeners();
    await page.close();
  }
}

try {
  await fresh(level);
  for (const step of TUTORIAL_STEPS) await fresh((page) => tutorial(page, step));
} catch (e) {
  errors.push(`smoke: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  await browser.close();
  await server.close();
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('smoke test passed');
