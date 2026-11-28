import { t } from '../i18n/i18n';
import type { Span } from './ast';
import { KEYWORDS, Slip, tokenize, type Token } from './parser';

const E = () => t().langErrors;

const WORDS: Record<string, '&&' | '||' | '!'> = { and: '&&', or: '||', not: '!' };
const DOUBLED: Record<string, string> = { '&': '&&', '|': '||' };

const adjacent = (a: Token | undefined, b: Token | undefined) => !!a && !!b && a.span.to === b.span.from;
const isOp = (tok: Token | undefined, text: string) => tok?.kind === 'op' && tok.text === text;
const slip = (message: string, span: Span) => new Slip(message, span);

function power(toks: Token[], k: number, opEnd: number): Slip {
  const base = toks[k - 1];
  const exp = toks[opEnd + 1];
  const span = { from: toks[k].span.from, to: toks[opEnd].span.to };
  const named = base && exp && (base.kind === 'ident' || base.kind === 'num') && exp.kind === 'num';
  return slip(E().power(named || base?.kind === 'ident' ? base.text : 'i'), span);
}

export function findSlip(src: string): Slip | null {
  const toks = tokenize(src, { lenient: true });
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    const next = toks[k + 1];
    if (tok.kind === 'op') {
      if (tok.text === '==' && isOp(next, '>') && adjacent(tok, next)) return slip(E().implication, { from: tok.span.from, to: next.span.to });
      if (tok.text === '=') {
        if (isOp(next, '<') && adjacent(tok, next)) return slip(E().flipped('<='), { from: tok.span.from, to: next.span.to });
        if (isOp(next, '>') && adjacent(tok, next)) return slip(E().flipped('>='), { from: tok.span.from, to: next.span.to });
        return slip(E().assign, tok.span);
      }
      if (tok.text === ';') {
        if (next?.kind === 'eof') return slip(E().trailingSemicolon, tok.span);
        return slip(E().semicolon, tok.span);
      }
      if (tok.text === '*' && isOp(next, '*') && adjacent(tok, next)) return power(toks, k, k + 1);
      if (tok.text === '(') depth++;
      if (tok.text === ')' && --depth < 0) return slip(E().unmatchedClose, tok.span);
    }
    if (tok.kind === 'bad') {
      if (DOUBLED[tok.text]) return slip(E().doubled(tok.text, DOUBLED[tok.text]), tok.span);
      if (tok.text === '^') return power(toks, k, k);
    }
    if (tok.kind === 'ident') {
      const word = WORDS[tok.text.toLowerCase()];
      if (word === '!') {
        if (isOp(next, '(')) return slip(E().word(tok.text, '!'), { from: tok.span.from, to: next.span.from });
        return slip(E().word(tok.text, '!'), tok.span);
      }
      if (word) return slip(E().word(tok.text, word), tok.span);
    }
    if (tok.kind === 'num' && next?.kind === 'ident' && !KEYWORDS.has(next.text) && !WORDS[next.text.toLowerCase()]) {
      const span = { from: tok.span.from, to: next.span.to };
      return slip(E().implicitTimes(tok.text, next.text), span);
    }
  }
  return null;
}
