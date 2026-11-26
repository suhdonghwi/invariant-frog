import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const SIZES = [16, 32];
const MODULE = '/scripts/favicon-frog.ts';
const out = (n: number) => fileURLToPath(new URL(`../public/favicon-${n}.png`, import.meta.url));

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', chromiumSandbox: true });
try {
  const page = await browser.newPage();
  const blank = new URL('favicon-blank', server.resolvedUrls!.local[0]).href;
  await page.route(blank, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto(blank);
  const pngs: Record<number, string> = await page.evaluate(
    async ([module, sizes]) => (await import(module)).renderFavicon(sizes),
    [MODULE, SIZES] as const,
  );
  for (const n of SIZES) {
    writeFileSync(out(n), Buffer.from(pngs[n], 'base64'));
    console.log(`wrote ${out(n)}`);
  }
} finally {
  await browser.close();
  await server.close();
}
