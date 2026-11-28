import { Fragment, type ReactNode } from 'react';
import { HighlightedCode } from './codeColors';

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n[ \t]*\n/);
  return <>{blocks.map((b, i) => renderBlock(b, i))}</>;
}

const gap = (key: number) => (key > 0 ? 'mt-2.5 compact:mt-2' : '');

function renderBlock(block: string, key: number): ReactNode {
  const lines = block.split('\n');
  if (lines.every((l) => BULLET.test(l))) {
    return (
      <ul key={key} className={`list-disc pl-5.5 ${gap(key)}`}>
        {lines.map((l, j) => (
          <li key={j} className="marker:text-muted [&+li]:mt-0.5">
            {renderInline(l.replace(BULLET, ''))}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <p key={key} className={gap(key)}>
      {lines.map((l, j) => (
        <Fragment key={j}>
          {j > 0 && <br />}
          {renderInline(l)}
        </Fragment>
      ))}
    </p>
  );
}

const BULLET = /^\s*-\s+/;
const INLINE = /(`[^`]+`|\*\*.+?\*\*)/;

function wrapPoints(src: string): string[] {
  return (src.match(/.+?(?:(?:&&|\|\|) +|$)/g) ?? [src]).map((c) => c.trimEnd()).filter(Boolean);
}

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
      return (
        <code key={i} className="rounded-md bg-shade/6 box-decoration-clone px-1.5 py-px font-mono text-[0.9em]">
          {wrapPoints(part.slice(1, -1)).map((chunk, j) => (
            <Fragment key={j}>
              {j > 0 && ' '}
              <span className="whitespace-nowrap">
                <HighlightedCode src={chunk} />
              </span>
            </Fragment>
          ))}
        </code>
      );
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**'))
      return (
        <strong key={i} className="font-bold text-ink">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}
