# Invariant Frog — Design

What the game teaches and the rules of its world.

## The idea

A program's **state space** is an endless plane of tiles; each tile is one
program state. Running the program is a **frog** hopping between tiles, one hop
per loop iteration. The learner writes a formula describing an **area** of the
plane (the loop invariant), and **Check** tests it against three rules:

| Rule | Formal | Learner-facing wording |
|---|---|---|
| **Initialization** | `pre ⇒ Inv` (after the initialisation code) | Every egg is on the area. |
| **Maintenance** | `Inv ∧ guard ⇒ Inv[body]` | Every hop lands on the area. |
| **Exit** | `Inv ∧ ¬guard ⇒ post` | Every stop on the area is a goal. |

The area is a **claim**: every frog is always somewhere on it. Initialization
and Maintenance make the claim true; Exit makes it strong enough. If all three
hold, every frog that stops, for every input, stops on a goal.

**Audience:** programmers who write loops every day but have never met loop
invariants. Nothing beyond boolean expressions is assumed.

**A learner should leave able to:** explain why testing can't prove a loop
correct for all inputs; state the three rules in their own words; explain why
Maintenance must hold even for states real runs never reach; strengthen an
invariant to fix a failing rule; recognise the shape *a preserved equation + a
bound*.

## The world

| Program concept | On screen |
|---|---|
| Program state | A tile |
| One loop iteration | One frog hop (never per statement: the invariant only matters at the loop head) |
| Loop guard false | The **stop** region: striped tiles |
| States the precondition allows (after init code) | **Eggs**; real frogs hatch from them |
| States the precondition rules out | Faint ghost tiles |
| Postcondition | **Goal** pools, shown only in the stop region |
| Loop invariant | The learner's **area**, raised as blue slabs |
| An input the loop never changes | A **plane** per value, picked in the inputs card |

**Visual language.** Everything the level fixes is grayscale; the learner's
area is the only saturated surface. Other colours are reserved: real frogs
green, the checker's frogs pale blue, goals amber, and red only for failures.
Each idea has one channel, and channels stack without changing each other:
the area is height and blue, the stop region is stripes, a goal is a pool.
A ringed tile takes a deep shade of its tag's colour (dark slate for a plain
pointer), the same on the floor and on a slab: a brighter ring would match the
slab's lightness and blur. The paper's grayscale figures use the same rings.

Goals are drawn only in the stop region, because Exit reads the postcondition
only there. Drawn everywhere, they would invite the learner to copy the
postcondition as the area.

## See-through frogs

Real frogs are actual runs; they hatch from eggs. The frogs the checker places
are **see-through frogs**: pale blue, standing on the tile they test, never
hopping. They only draw the hop they would make, since the checker asks where a
frog here would go rather than running one.

The most common objection is *"that frog could never actually be there!"* The
checker can't run real frogs, because where they go is exactly what is being
proved. The area claims a frog could be on any of its tiles, so the checker
asks of every tile: if a frog were here, where would it land? If you don't
want a frog there, shrink the claim. That is **strengthening**.

A see-through frog says nothing about whether a real frog gets to its tile,
and looks the same either way. The checker can't tell in general: knowing which
tiles no frog reaches takes an invariant, the very thing being looked for. So
the checker never acts out a failure with a real frog, and every frog it shows
is see-through. They are not called "ghost frogs", which would read as "no
frog can get here".

## The narrative

The game never leads with the rules; each is met as a picture first:

1. **Testing looks convincing**: run the frogs; every one reaches a goal.
2. **Testing can't be enough**: zoom out; the eggs never end.
3. **What an invariant is for**: a different loop with a fixed area. Bad
   stops are off the area and the only stops on it are goals, so if the claim
   is true a frog can only stop on a goal. That argument never followed a frog,
   which is why it survives endless eggs.
4. **Each rule on our loop**: the picture and the plain sentence, then the
   learner checks their own area, and a what-if shows the rule's typical
   failure.
5. **Induction, shown with one frog**: it starts on the area, every hop lands
   on it again, so it never leaves; when it stops, is that a goal?

## Planes and inputs

Frogs never hop along an input, so the state space is a set of independent
planes, one per choice of inputs, and the rules hold exactly when they hold in
every plane. Showing one plane at a time loses nothing. The inputs card lists
every input not on an axis; changing one switches the plane.

- **Inputs are never mutated**; programs copy them into loop variables.
- The input-only part of `requires` decides which planes exist. A learner may
  still type a ruled-out input; that plane is all ghost tiles.
- A level plots two integer names on the axes. An input can be one of them, so
  its planes lie side by side as rows.

## The checker

- **A rule passes only if it is proved.** Z3 decides every rule over every
  plane and tile. A large search never stands in for a proof; that would
  contradict what the game teaches.
- **On failure, show one counterexample**, preferring what the learner can
  already see: a hop on a real frog's run in view, then the failing tile
  nearest the origin, then anything Z3 finds, searching small values first.
  The camera goes to it: "everything you could see looked fine" is not a proof.
- **Every failing tile is ringed** at once, as far as the slabs reach. The
  counterexample is the one tagged and the only one a frog shows.
- **Three verdicts**: proved, a counterexample, or **undecided** (the level is
  not cleared).
- **One time budget per Check** (`CHECK_BUDGET_MS`, about 8 s), shared by every
  solver pass and the fallback that compares the formula with the stored
  solutions. A rule still open when it runs out is undecided. Validation uses
  the same budget, so a level never needs more time than a player gets.
- **One definition, three uses.** The same parsed program and formula drive the
  frogs, the proofs and the floor, so what the learner sees and what is proved
  can't disagree.
- Checks run only when the learner presses **Check**, never live.

## The formula language

The area is one text box; its language is the expression part of the program
language.

- Integers and booleans, strictly typed: a number is not a condition.
- **Mathematical integers**: unbounded, no overflow.
- **Chained comparisons**: `0 <= i <= n`. `==` and `!=` don't chain.
- `≤`, `≥` and `≠` are read as `<=`, `>=` and `!=`.
- **`/` and `%` only by positive literals**, Euclidean. This removes division
  by zero and keeps formulas decidable.
- `*` between variables is allowed; it and the quantifiers are the sources of
  *undecided*.
- **Arrays** are read-only inputs; a cell outside the array reads as 0.
- **`forall` / `exists`** over a range of indices, written as a chain:
  `forall 0 <= k < i: A[k] <= m`. The body is one comparison; a longer body
  goes in parentheses, and the syntax card says so.

While typing, the slabs follow the last valid formula; errors wait for Check.

## Programs and levels

A level is a small program: inputs, variables, `requires`, one `while` loop
whose body has assignments and `if/else`, and `ensures`. No nested loops, no
calls, no writing to arrays. **Eggs are every state satisfying `requires`
after the initialisation code.**

Every level carries **solutions** (after a proof, the ones the checker cannot
show equivalent to the learner's are listed, so the learner sees a loop has
more than one invariant), **pitfalls** (the wrong answers learners are
expected to try, matched by meaning, each with its own message) and three
**hints** that never spell out a solution. `pnpm validate` checks all of them.

Level design:

- Each level teaches one idea, and its pitfall is the tempting formula that
  misses it (often the previous level's answer).
- The usual fix is **strengthening**: add the bound or fact the pitfall forgot.
- Programs are loops a programmer might actually write, and the intro says
  what the loop is *for*, not how to solve it.
- Each level adds exactly one new thing: a new mechanic on familiar content, or
  new content on known mechanics, never both. Levels are grouped in four tiers:
  Beginner, Intermediate, Advanced and Arrays.

## The tutorial

A scripted story on one program, a counter (`i` from `0` up to `n`), with a
detour through an **example**: frogs hop straight right to a column of goals,
inside a fixed endless strip.

- **Progressive reveal**: a bare plane and one frog first, then the code, the
  stop region, eggs, goals, a test of ten eggs, the example, and finally the
  formula box.
- **The example is shown, not solved.** Its area is fixed and its code hidden.
- **An endless region is drawn endless**, fading into the horizon.
- **Any formula is a valid move.** Each of three stages asks for one rule's
  worth of area; the story branches on which rule failed, never on what was
  typed. The learner is never asked for "the invariant": it emerges by
  strengthening.
- **Every failure is witnessed**, by the learner's own formula or else by a
  demo of the stage's pitfall, after the learner predicts the outcome.
- **Say what things are once, then keep one name each.**

### Vocabulary

| Concept | English | Korean |
|---|---|---|
| The program, run on one input | a **frog** | 개구리 |
| Program state | the **tile** a frog sits on | 칸, 프로그램 상태 |
| One loop iteration | a **hop** | 점프 |
| `requires` | the **precondition** | 사전 조건 |
| States a frog can start from | **eggs** | 알 |
| `ensures` | the **postcondition** (level texts say this, never "the goal") | 사후 조건 |
| Stop tiles where the postcondition holds | **goals** | 목표 |
| Loop guard false | the loop **stops** here | 멈춘다 |
| A tile where the loop stops | a **stop** | 멈추는 곳 |
| The learner's formula | the **area**; it is the **loop invariant** | 영역, 루프 불변식 |
| Raised tiles | **slabs** | 블록 |
| A state placed to test the area's claim | a **see-through frog** | 반투명 개구리 |
| What an area says | a **claim** | 주장 |
| Passes Initialization and Maintenance | an **invariant** | 불변식 |
| Also passes Exit | **strong enough** | 충분히 강한 |
| Fails Exit | **too weak** | 너무 약한 |
| The button that proves | **Check** | 검사 |
| What runs Check, in the third person | the **checker** | 검사기 |
| One element of an array | a **cell** | 원소 |

Rule names are **Initialization**, **Maintenance** and **Exit** (초기화, 유지,
탈출). CLRS calls the third Termination, but in verification termination means
proving the loop halts, so the game names it for the moment the loop exits.

Not used: "watching" for testing or proving; the point of a proof is that it
covers infinitely many inputs without checking any of them.

## Scope

Out of scope: termination, nested loops, function calls, arrays the loop writes
to, accounts. Read-only arrays fit because an array is an input, so it is a
plane; an array the loop changes would be part of the frog's state, which no
longer fits a grid.
