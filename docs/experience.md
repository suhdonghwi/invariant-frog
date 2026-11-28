# Invariant Frog — Experience

How the interface looks, moves and responds. Keep these when changing or
adding UI.

## Motion

- **Nothing pops.** Everything that appears or disappears animates: dialogs,
  captions, tags, frogs. Only a rebuild (Back, skipping ahead in the tutorial)
  may cut.
- **Quick, never sluggish.** The learner never waits on decoration. A hop is
  the loop body running, so it takes long enough to follow; hatching or a frog
  going home carries no content, so it is quick.
- **One standard.** Every duration and pause is a token from `src/motion.ts`;
  pick the token for the job rather than a number that felt right.
- **Cause, then effect.** What changed is shown before what follows from it.
- **Overlap, don't queue.** The next move starts while the last one finishes.
- **Smooth in position and speed.** Hops, slabs and the camera ease out of
  rest and into it, with no jerk. A new camera target mid-move bends the path
  instead of kinking it.
- **The camera's time follows the distance**, but never past about a second.
  A very long trip is a fade and a cut, not a blurred flight.
- **Every movement means something.** A frog turns only when its next hop goes
  another way and cheers only on a goal. Things come from somewhere: frogs
  climb out of their egg and go back into it.
- **No layout shift.** Reserve space up front, and show errors inside the box
  they belong to.
- **Screens hand over, they don't cut.** The first frame is already right: the
  camera is placed before anything is drawn.
- **Reduced motion is respected.** With the setting on (`reducedMotion()` in
  `src/motion.ts`, read live), the camera fades to its new view instead of
  flying; frogs don't squash, breathe or cheer; slabs don't bounce, goals don't
  ripple, tags don't pulse; the home camera doesn't sway or fly in, its frogs
  don't loop and the title doesn't wave. Hops still play, since a hop is
  content. In CSS, nothing loops and entrances are shortened.

## Verifying

- **Every verification plays the same way**: frogs go home, each rule is shown
  in turn in the scene, and only then does the caption say what happened.
- **One rule at a time, with a visible seam.** Each rule rings the states it
  checks (eggs, the tiles hops start from, stops), then its light turns. The
  first failing rule ends the check.
- **A failure looks the same whether or not a real frog gets there** (see
  design.md, *See-through frogs*). The caption opens with the rule's name
  ("**Exit fails.**"), says what fails in general in one clause, then gives the
  counterexample, putting the area first: "your area says a frog could be at
  …". When the area matches a known wrong answer, that answer's message sits
  below a line, as the question to act on.
- **Typing is the cancel.** In a level the formula box stays editable while a
  check runs or its replay plays (a counterexample replayed from a red light
  too). The first edit ends the check: the solver stops, frogs go home, tags
  and rings leave with their exit animations, and the lights return to idle.
  The Check button stays disabled while a check plays. The tutorial keeps its
  box locked.
- **A check that takes time says so.** A Check that arrives while the checker
  is still loading says so. After two seconds of solving, the caption names the
  rule being worked on and offers Cancel. A check has one time budget; a rule
  still open when it runs out is undecided.
- **A failure caption belongs to its formula.** In a level, editing the
  formula drops a caption a check produced (failure or undecided); intro, hint
  and success captions stay.
- **The board changes only when the learner asks.** A failure on another input
  is offered with a button; nothing moves until it is pressed.
- **The camera moves only when it must**: when what a moment is about is off
  screen, under a panel or too small. Once the player drags, taps or scrolls,
  the view is theirs until the game shows something new.

## Clarity

- **One component per idea.** Every label in the scene is the same tag; don't
  invent a second kind.
- **Hierarchy at a glance.** Primary actions are blue with a 3D edge, ordinary
  ones white, secondary ones quiet but still clearly visible.
- **Consistent labels.** The same action has the same label everywhere; change
  the caption, not the button. One icon per meaning.
- **Captions are written, not dumped.** They name concrete values
  (`i = 1, n = 0`).
- **One moving thing at a time** while a caption explains something.
- **Draw what doesn't exist faintly** rather than not at all: states the
  precondition rules out are ghost tiles.
- **Step and Run move the frog the learner picked**, and never pick one
  themselves where there is a choice.
- **A real frog leaves a trail** so where it came from can still be read.
  The checker's see-through frogs never hop, so they leave none.
- **Hovering a tile answers the checker's question**: a see-through frog shows
  the hop a frog there would make.
- **The board works from the keyboard.** The canvas takes focus; the arrow keys
  move the same tile cursor the mouse sets, starting from the centre of the
  view, and the camera follows when it leaves the view. Enter acts as a click
  on that tile (picking an egg), under the same tutorial limits; `+` and `−`
  zoom. The tile readout is announced.
- **Zoom goes where the player points.** The wheel and a trackpad pinch move
  the camera toward the tile under the cursor, never the page. A view control
  in the top bar zooms in, zooms out and resets the view to the game's framing.
- **Errors wait for Check.** A formula is never marked wrong while it is typed.
- **An error names the slip.** Habits from other languages (`=`, `=<`, `and`,
  `;`, `^`, `2i`, `==>`) and a name in the wrong case get their own message, and
  where one rewrite fixes it, a button applies it. An empty box and an
  unfinished formula say so, and the underline sits on the last token.
- **Failures stay on the page.** No WebGL or a crash is told in a plain card,
  never a blank page. A checker that can't run here is said on the home screen
  and at the start of the tutorial, with the next step to take, and the
  tutorial's checks then offer a way on instead of waiting.
- **Reset puts the screen back as the level opened**; the area and its
  verdicts stay, since those are the learner's work.

## The tutorial

- **The caption comes first**, then the scene change it describes.
- **Next is always clickable.** Pressed while a step's scene change is still
  playing, it rebuilds the next step at once; pressed after, it moves on as it
  would on its own, so nothing on screen cuts. The learner never waits for an
  animation.
- **Back is always there** and rebuilds the last earlier step at once.
- **Only what the step asks for is enabled**, so the learner can't break the
  story.
- **Predict before you see**: a yes-or-no question comes before a pitfall's
  demo.
- **Spotlight** whatever the caption is talking about.

## Access

- **Dialogs are modal dialogs.** Rules, Syntax and the level list open as
  `<dialog>`: focus moves in, Tab stays inside, Esc and the backdrop close
  them, and focus returns to the button that opened them.
- **What the screen says is announced.** Every caption is read out through a
  status region that stays mounted; a formula error is tied to the box; each
  rule light's name carries its state ("Exit: fails").
- **Text on a light background passes 4.5:1.** Status text uses darker shades
  (`--color-pass-text`, `--color-fail-text`, `--color-warn-text`); icons, pills,
  buttons and the scene keep their colours.
- **One focus ring**, in the spotlight's blue, on whatever has keyboard focus;
  the formula box shows it on the box.

## Layout

Desktop first: the 3D scene is full-screen and panels float over it. On small
screens panels shrink, stack or fold, and the scene keeps as much room as it
can.
