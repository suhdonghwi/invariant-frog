import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const MODULE = '/scripts/favicon-frog.ts';
const out = (name: string) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'warn' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', chromiumSandbox: true });
try {
  const page = await browser.newPage();
  const blank = new URL('favicon-blank', server.resolvedUrls!.local[0]).href;
  await page.route(blank, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto(blank);
  const icons: Record<string, string> = await page.evaluate(async (module) => (await import(module)).renderIcons(), MODULE);
  for (const [name, png] of Object.entries(icons)) {
    writeFileSync(out(name), Buffer.from(png, 'base64'));
    console.log(`wrote ${out(name)}`);
  }
} finally {
  await browser.close();
  await server.close();
}
