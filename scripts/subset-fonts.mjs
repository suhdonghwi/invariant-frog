import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import subsetFont from 'subset-font';
import { GLYPHS_FILE, root, usedHangul } from './hangul.mjs';

const require = createRequire(import.meta.url);
const outDir = join(root, 'src', 'assets', 'fonts');

const FONTS = [
  { from: '@noonnu/tmoney-round-wind-extra-bold/fonts/tmoneyroundwindextrabold-normal.woff', to: 'TmoneyRoundWind-ExtraBold.woff2' },
  { from: '@kfonts/nanum-square-round/NanumSquareRoundR.woff2', to: 'NanumSquareRound-Regular.woff2' },
  { from: '@kfonts/nanum-square-round/NanumSquareRoundB.woff2', to: 'NanumSquareRound-Bold.woff2' },
];

const glyphs = usedHangul();
mkdirSync(dirname(GLYPHS_FILE), { recursive: true });
writeFileSync(GLYPHS_FILE, glyphs.join('') + '\n');
console.log(`${glyphs.length} Hangul glyphs`);

mkdirSync(outDir, { recursive: true });
for (const f of FONTS) {
  const src = readFileSync(require.resolve(f.from));
  const out = await subsetFont(src, glyphs.join(''), { targetFormat: 'woff2' });
  writeFileSync(join(outDir, f.to), out);
  console.log(`${f.to}: ${(src.length / 1024).toFixed(0)} KB → ${(out.length / 1024).toFixed(0)} KB`);
}
