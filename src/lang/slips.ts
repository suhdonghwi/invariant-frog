import { t } from '../i18n/i18n';
import type { Span } from './ast';
import { KEYWORDS, LangError, tokenize, type Token } from './parser';

const E = () => t().langErrors;

const WORDS: Record<string, '&&' | '||' | '!'> = { and: '&&', or: '||', not: '!' };
const DOUBLED: Record<string, string> = { '&': '&&', '|': '||' };
const MAX_POWER = 4;

const adjacent = (a: Token | undefined, b: Token | undefined) => !!a && !!b && a.span.to === b.span.from;
const isOp = (tok: Token | undefined, text: string) => tok?.kind === 'op' && tok.text === text;
const slip = (message: string, span: Span, text?: string) => new LangError(message, span, text === undefined ? undefined : { span, text });

function notBody(toks: Token[], k: number): Token | null {
  let depth = 0;
  let last: Token | null = null;
  for (let j = k + 1; j < toks.length; j++) {
    const tok = toks[j];
    if (tok.kind === 'eof') break;
    if (tok.kind === 'op' && tok.text === '(') depth++;
    if (tok.kind === 'op' && tok.text === ')') {
      if (depth === 0) break;
      depth--;
    }
    if (depth === 0 && tok.kind === 'op' && (tok.text === '&&' || tok.text === '||' || tok.text === ';')) break;
    if (depth === 0 && tok.kind === 'ident' && (tok.text.toLowerCase() === 'and' || tok.text.toLowerCase() === 'or')) break;
    last = tok;
  }
  return last;
}

function power(src: string, toks: Token[], k: number, opEnd: number): LangError {
  const base = toks[k - 1];
  const exp = toks[opEnd + 1];
  const span = { from: toks[k].span.from, to: toks[opEnd].span.to };
  if (!base || !exp || (base.kind !== 'ident' && base.kind !== 'num') || exp.kind !== 'num') return slip(E().power(base?.kind === 'ident' ? base.text : 'i'), span);
  const n = Number(exp.text);
  if (n < 2 || n > MAX_POWER) return slip(E().power(base.text), span);
  const whole = { from: base.span.from, to: exp.span.to };
  return new LangError(E().power(base.text), span, { span: whole, text: Array(n).fill(src.slice(base.span.from, base.span.to)).join(' * ') });
}

export function findSlip(src: string): LangError | null {
  const toks = tokenize(src, { lenient: true });
  let depth = 0;
  for (let k = 0; k < toks.length; k++) {
    const tok = toks[k];
    const next = toks[k + 1];
    if (tok.kind === 'op') {
      if (tok.text === '==' && isOp(next, '>') && adjacent(tok, next)) return slip(E().implication, { from: tok.span.from, to: next.span.to });
      if (tok.text === '=') {
        if (isOp(next, '<') && adjacent(tok, next)) return slip(E().flipped('<='), { from: tok.span.from, to: next.span.to }, '<=');
        if (isOp(next, '>') && adjacent(tok, next)) return slip(E().flipped('>='), { from: tok.span.from, to: next.span.to }, '>=');
        return slip(E().assign, tok.span, '==');
      }
      if (tok.text === ';') {
        if (next?.kind === 'eof') return slip(E().trailingSemicolon, tok.span, '');
        return slip(E().semicolon, tok.span, /\s/.test(src[tok.span.from - 1] ?? ' ') ? '&&' : ' &&');
      }
      if (tok.text === '*' && isOp(next, '*') && adjacent(tok, next)) return power(src, toks, k, k + 1);
      if (tok.text === '(') depth++;
      if (tok.text === ')' && --depth < 0) return slip(E().unmatchedClose, tok.span, '');
    }
    if (tok.kind === 'bad') {
      if (DOUBLED[tok.text]) return slip(E().doubled(tok.text, DOUBLED[tok.text]), tok.span, DOUBLED[tok.text]);
      if (tok.text === '^') return power(src, toks, k, k);
    }
    if (tok.kind === 'ident') {
      const word = WORDS[tok.text.toLowerCase()];
      if (word === '!') {
        if (isOp(next, '(')) return slip(E().word(tok.text, '!'), { from: tok.span.from, to: next.span.from }, '!');
        const last = notBody(toks, k);
        if (last) {
          const span = { from: tok.span.from, to: last.span.to };
          return new LangError(E().word(tok.text, '!'), tok.span, { span, text: `!(${src.slice(next.span.from, last.span.to)})` });
        }
        return slip(E().word(tok.text, '!'), tok.span, '!');
      }
      if (word) return slip(E().word(tok.text, word), tok.span, word);
    }
    if (tok.kind === 'num' && next?.kind === 'ident' && !KEYWORDS.has(next.text) && !WORDS[next.text.toLowerCase()]) {
      const span = { from: tok.span.from, to: next.span.to };
      return slip(E().implicitTimes(tok.text, next.text), span, `${tok.text} * ${next.text}`);
    }
  }
  return null;
}
