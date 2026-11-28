import type { Caption } from './store';

type Press = () => void;

export interface CaptionSpec extends Omit<Caption, 'action' | 'replay' | 'choices'> {
  action?: NonNullable<Caption['action']> & { onClick: Press };
  replay?: Press;
  choices?: (NonNullable<Caption['choices']>[number] & { onClick: Press })[];
}

interface Presses {
  action?: Press;
  replay?: Press;
  choices: Press[];
}

const presses = new WeakMap<Caption, Presses>();

export function captionOf({ action, replay, choices, ...rest }: CaptionSpec): Caption {
  const caption: Caption = {
    ...rest,
    action: action && { label: action.label, disabled: action.disabled },
    replay: !!replay,
    choices: choices?.map(({ label, tone }) => ({ label, tone })),
  };
  presses.set(caption, { action: action?.onClick, replay, choices: choices?.map((c) => c.onClick) ?? [] });
  return caption;
}

export const replayOf = (caption: Caption | null) => (caption ? presses.get(caption)?.replay : undefined);

export const pressAction = (caption: Caption) => presses.get(caption)?.action?.();
export const pressReplay = (caption: Caption) => presses.get(caption)?.replay?.();
export const pressChoice = (caption: Caption, i: number) => presses.get(caption)?.choices[i]?.();
