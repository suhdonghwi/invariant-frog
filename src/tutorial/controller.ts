import { setTutorial, useGame } from '../game/store';

type Press = () => void;
export interface NextAction {
  label: string;
  onClick: Press;
}

let back: Press | null = null;
let check: Press | null = null;
let next: NextAction | null = null;

export function setBack(press: Press | null) {
  back = press;
  setTutorial({ canGoBack: press !== null });
}

export function awaitCheck(press: Press | null) {
  check = press;
  setTutorial({ awaitingCheck: press !== null });
}

export function setNext(action: NextAction | null) {
  next = action;
  setTutorial({ next: action && { label: action.label } });
}

const tutorial = () => useGame.getState().tutorial;

export const currentNext = (): NextAction | null => (tutorial().next ? next : null);

export function goBack() {
  if (tutorial().canGoBack) back?.();
}

export function pressCheck() {
  if (tutorial().awaitingCheck) check?.();
}
