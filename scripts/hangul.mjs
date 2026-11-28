import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const root = join(import.meta.dirname, '..');
export const GLYPHS_FILE = join(root, 'src', 'assets', 'fonts', 'hangul.txt');

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/g;

function scan(path, found) {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) scan(join(path, name), found);
  } else if (/\.(ts|tsx|css|html)$/.test(path)) {
    for (const ch of readFileSync(path, 'utf8').match(HANGUL) ?? []) found.add(ch);
  }
}

export function usedHangul() {
  const found = new Set();
  scan(join(root, 'src'), found);
  scan(join(root, 'index.html'), found);
  return [...found].sort();
}
