import { readFileSync } from 'node:fs';
import { GLYPHS_FILE, usedHangul } from './hangul.mjs';

const subset = new Set(readFileSync(GLYPHS_FILE, 'utf8').trim());
const missing = usedHangul().filter((ch) => !subset.has(ch));
if (missing.length) {
  console.error(`Korean text uses glyphs the subset fonts lack: ${missing.join('')}\nRun \`pnpm fonts\` to rebuild the subsets.`);
  process.exit(1);
}
