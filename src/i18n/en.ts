import type { Rule } from '../checker/types';

export const en = {
  gotIt: 'Got it',

  rules: {
    initialization: 'Initialization',
    maintenance: 'Maintenance',
    exit: 'Exit',
  } satisfies Record<Rule, string>,

  home: {
    tagline: 'A little game about loop invariants',
    pitch: "How do you know if your loop is correct for every input? Let’s find out, with frogs.",
    tutorial: 'Tutorial',
    levels: 'Levels',
    back: 'Back',
    language: 'Language',
    cleared: 'Cleared',
    clearedCount: (n: number, of: number) => `${n} of ${of} levels cleared`,
    resetTitle: 'Forget which levels you have cleared',
    resetConfirm: 'Erase progress?',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    source: 'Source on GitHub',
    checkerUnavailable: 'The checker can’t run on this page, so no area can be checked. Open the game directly in your browser, not inside another app or page.',
  },

  trouble: {
    webglTitle: 'This game needs 3D graphics',
    webgl: 'Your browser couldn’t start WebGL 2. Turn on hardware acceleration in your browser’s settings, or try another browser, then reload the page.',
    crashTitle: 'Something went wrong',
    crash: 'The game ran into a problem it couldn’t recover from.',
    reload: 'Reload',
  },

  topBar: {
    home: 'Home',
    allLevels: 'All levels',
  },

  view: {
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset view',
  },

  caption: {
    back: 'Back',
    next: 'Next',
    replay: 'Replay',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
  },

  board: {
    label: 'Board. Arrow keys move a cursor over the tiles, Enter picks the egg under it, and + and − zoom.',
  },

  code: {
    title: 'Code',
    show: 'Show',
    hide: 'Hide',
    resize: 'Drag to resize the code panel; double-click to reset',
  },

  formula: {
    replay: 'Replay the counterexample',
    area: 'area',
    placeholder: (names: string) => `condition on ${names}`,
    check: 'Check',
  },

  controls: {
    rules: 'Rules',
    run: 'Run',
    pause: 'Pause',
    step: 'Step',
    reset: 'Reset',
    resetTitle: 'Back to how the level opened: frogs, inputs and view (your area stays)',
    hint: 'Hint',
    hintTitle: 'A nudge for when you’re stuck',
    syntax: 'Syntax',
    syntaxTitle: 'What you can type into the area box',
  },

  inputs: {
    title: 'Inputs',
    decrease: (name: string) => `${name} down by one`,
    increase: (name: string) => `${name} up by one`,
    random: (name: string) => `A random ${name}`,
    impossible: 'not a possible input',
  },

  lightState: {
    dim: 'not checked yet',
    idle: 'not checked yet',
    checking: 'checking',
    pass: 'holds',
    fail: 'fails',
    undecided: 'undecided',
  },

  rulesCard: {
    title: 'The three rules',
    intro:
      'With Initialization and Maintenance, every frog always stays on your area. Add Exit, and a frog can only stop on a goal.',
    initialization: 'Every egg is on the area.',
    maintenance: 'Every hop lands on the area.',
    exit: 'Every stop on the area is a goal.',
  },

  syntax: {
    title: 'Writing a condition',
    compare: 'Compare',
    combine: 'Combine',
    arithmetic: 'Arithmetic',
    functions: 'Functions',
    arrays: 'Arrays',
    constants: 'Constants',
    quantBody: 'After the `:` comes one comparison. For more, put the body in parentheses.',
  },

  level: {
    hint: (k: number, of: number) => `**Hint ${k} of ${of}.**`,
    anotherHint: 'Another hint',
    undecided: 'The checker couldn’t prove this, and couldn’t find a tile where it breaks either. Try a simpler formula, or open a **Hint**.',
    avoidDivision: ' Try avoiding division: for example, `2 * s == …` instead of `s == … / 2`.',
    proved: 'Proved, for every input: no frog ever leaves your area, and a frog can only stop on a goal.',
    next: (title: string) => `Next: ${title}`,
    backToLevels: 'Back to levels',
    pickEgg: 'pick an egg first',
    frogStopped: 'this frog has stopped',
    otherAnswers: (count: number): string => (count > 1 ? 'Other answers that work:' : 'Another answer that works:'),
    dafny: 'The same proof in Dafny',
    copy: 'Copy',
    copied: 'Copied',
  },

  verdicts: {
    solverUnavailable: 'The checker can’t run on this page. Open the game directly in your browser, not inside another app or page.',
    checkFailed: 'The checker ran into a problem with this check. Press **Check** to try again.',
    loadingChecker: 'Loading the checker…',
    stillChecking: (rule: string) => `Still checking **${rule}**…`,
    cancel: 'Cancel',
    far: 'Nothing nearby breaks it, but something far away does. ',
    tooFar: 'That spot is too far away to show on screen.',
    elsewhere: (here: string, there: string) => `Nothing breaks near this board (\`${here}\`), but something does at \`${there}\`.`,
    showThere: (there: string) => `Show ${there}`,
    longOnly: (rule: string, max: number) => `**${rule}** fails, but only for arrays longer than ${max}, too long to show here. Check that your area holds for every length.`,
    yourArea: 'your area',
    theArea: 'the area',
    noLongerHolds: (part: string) => ` \`${part}\` no longer holds.`,
    falseThere: (part: string) => ` \`${part}\` is false there.`,
    startsOutsideTag: (area: string) => `starts outside ${area}`,
    startsOutside: (state: string, area: string, note = '') => `**Initialization fails.** ${note}Some eggs are outside ${area}. For example, the egg at ${state}.`,
    landsOutsideTag: (area: string) => `lands outside ${area}`,
    landsOutside: (from: string, to: string, area: string, note = '') =>
      `**Maintenance fails.** ${note}From some tiles of ${area}, a hop lands outside it. For example, ${area} says a frog could be at ${from}, and from there a hop lands on ${to}.`,
    offGoalTag: 'stops, but not on a goal',
    holdsTag: {
      initialization: 'every egg is on the area',
      maintenance: 'every hop lands on the area',
      exit: 'every stop on the area is a goal',
    } satisfies Record<Rule, string>,
    offGoal: (state: string, area: string, note = '') =>
      `**Exit fails.** ${note}Some stops on ${area} aren’t goals. For example, ${area} says a frog could be at ${state}, and it would stop there.`,
  },

  langErrors: {
    anArea: 'an area',
    anIndex: 'an index',
    aBound: 'a bound of the range',
    isArray: (name: string) => `${name} is an array: write a cell of it, like \`${name}[0]\``,
    notArray: (name: string) => `${name} is a number, not an array`,
    nameTaken: (name: string) => `'${name}' is already a name here; pick another for the bound name`,
    quantRange: (q: string) => `${q} needs a range, like \`${q} 0 <= k < n: …\``,
    rangeTooWide: (max: number) => `This range is too wide to check: keep it to at most ${max} values`,
    quantName: 'The names in the middle of the range are the bound names, like `k` in `0 <= k < n`',
    needsNumber: (text: string, ctx: string) => `\`${text}\` is true/false, but ${ctx} needs a number`,
    needsCondition: (text: string, ctx: string) => `\`${text}\` is a number, but ${ctx} needs a true/false condition`,
    didYouMean: (text: string, what: string) => `\`${text}\` is a number, but ${what} needs a true/false condition. Did you mean \`${text} == 0\`?`,
    unknownName: (name: string, names: string) => `Unknown name '${name}'. You can use: ${names}`,
    arity: (fn: string, n: number) => `${fn} takes ${n} argument${n > 1 ? 's' : ''}`,
    positiveDivisor: (op: string) => `'${op}' only works with a positive number on the right, like \`x ${op} 2\``,
    unexpectedChar: (c: string) => `Unexpected character '${c}'`,
    doubleSlash: 'Use `/`: it already rounds down',
    chainedEquality: (op: string) => `'${op}' can’t be chained with other comparisons; add parentheses, like \`(x >= 0) ${op} (y >= 0)\``,
    expectedEnded: (text: string) => `Expected '${text}' but the input ended`,
    expectedFound: (text: string, found: string) => `Expected '${text}' but found '${found}'`,
    expected: (text: string) => `Expected '${text}'`,
    expectedNameEnded: 'Expected a name but the input ended',
    expectedNameFound: (found: string) => `Expected a name but found '${found}'`,
    notHere: (word: string) => `'${word}' can’t be used here`,
    unknownFunction: (name: string, available: string) => `Unknown function '${name}'. Available: ${available}`,
    endsEarly: 'The formula ends too early',
    unexpected: (found: string) => `Unexpected '${found}'`,
    empty: 'Type a condition',
    assign: 'To compare, write `==`: a single `=` sets a variable.',
    flipped: (op: string) => `Write \`${op}\`, with \`${op[0]}\` first.`,
    word: (word: string, op: string) => `Write \`${op}\` for \`${word}\`.`,
    doubled: (c: string, op: string) => `Write \`${op}\`, doubled: a single \`${c}\` isn’t an operator here.`,
    semicolon: 'An area is one condition; join two with `&&`.',
    trailingSemicolon: 'An area is one condition, with no `;` at the end.',
    implicitTimes: (num: string, name: string) => `To multiply, write \`${num} * ${name}\`.`,
    power: (name: string) => `There is no power operator; multiply instead, like \`${name} * ${name}\`.`,
    implication: 'There is no `==>`. To say “if `a` then `b`”, write `!a || b`.',
    unmatchedClose: 'This `)` has no `(` to match.',
    caseName: (typed: string, name: string) => `Names are case-sensitive: write \`${name}\`, not \`${typed}\`.`,
    chainedPlain: (op: string, joined: string) => `\`${op}\` can’t be chained. Did you mean \`${joined}\`?`,
    quantBody: (name: string, q: string) =>
      `\`${name}\` exists only in the first comparison after the \`:\`. To use it in more, put the body in parentheses: \`${q} … : (… && …)\`.`,
    fixTo: 'Change to',
  },

  tutorial: {
    hint: 'Hint:',
    undecided: 'The checker couldn’t decide that either way. Try a simpler formula.',
    lostRule: 'It held a moment ago; your change broke it. ',
    fixAndCheck: 'Fix your area and press **Check** again.',
    trying: (f: string) => `Trying \`${f}\`…`,
    guessedRight: 'Right, no. ',
    guessedWrong: 'Not quite. ',

    whatIf: (pitfall: string, question: string) => `Before we move on: what if we had tried \`${pitfall}\`? ${question}`,

    hello:
      'Hi. This game is about **loop invariants**: the tool for proving that a loop works for every input.\n\nIn this tutorial you’re going to prove a small loop correct. First, the world it lives in.',
    letsGo: 'Let’s go',
    frog: 'Each frog stands for the program, run on one input. The tile it sits on is its **program state**, the current values of its variables.',
    program: 'Here is the **code** of the program we are running. The loop runs its body again and again while `i < n`.',
    pressStep: 'Press **Step** to run the loop body once.',
    pressRun: 'One hop is the loop body running once: `i` went from `0` to `1`.\n\n**Run** keeps the frog hopping until the loop stops. Press it.',
    stops: 'Now `i < n` is false (`3 < 3`), so the loop ends and the frog **stops**. The striped tiles are where the loop stops: each one is a **stop**.',
    stopsTag: 'stops: 3 < 3 is false',
    eggs: 'Where can a frog start? The **precondition** is what we assume about the input. Here, the precondition `requires n >= 0` lets `n` be any number from `0` up.\n\nEach **egg** is one place a frog can start.',
    eggsTag: 'starts at i = 0, n = 2',
    goals:
      'The **postcondition**, `ensures i == n`, is the condition that must hold once the loop ends. The striped tiles where it holds are the **goals**, the amber pools.\n\nYour frog stopped on one, at `i = 3, n = 3`.',
    goalsTag: 'stopped on a goal',
    bug: 'Not every stop is a goal. A frog that stopped here, at `i = 3, n = 1`, would leave the loop with `i ≠ n`: the program would be wrong.\n\nFor the program to be correct, **every frog must stop on a goal**.',
    bugTag: 'stops, but i ≠ n',
    testTen: 'Does every frog really stop on a goal? Let’s test it on ten eggs.',
    hatchTen: 'Hatch ten eggs',
    allTen: 'All ten frogs stopped on a goal, which means the program works for `n` = 0 to 9.',
    endless:
      'But that was only ten inputs. `n` can be any number, so the eggs never end: however many you test, infinitely many are left.\n\n**So how can we be sure the program works for every egg?**',
    testedTag: 'tested: n = 0 to 9',
    endlessTag: 'more eggs, never ending',
    detour: 'There is a way to be sure about every egg without hatching infinitely many of them. Let’s leave our loop for a moment.',
    exWorld: 'Here is another loop. Its frogs hatch and hop straight to the right until they reach a stop.\n\nThis loop’s eggs never end either: they go on up and down forever.',
    exArea:
      'These blue slabs are an **area**. An area is a claim: **“frogs never leave this area.”**',
    exBadTag: 'stops, but not on a goal',
    exWhy:
      'Why does that help? If a frog stopped on one of these red tiles, it would stop off a goal, and the program would be wrong.\n\nBut these tiles are off the area. If every frog is always on the area, as it claims, no frog can ever reach them.',
    exEndings: 'On the area, the loop can only stop in this one column, and every tile of it is a goal. So if the claim holds and frogs never leave the area, **a frog can only stop on a goal**.',
    exEndingTag: 'a stop on the area',
    exRules:
      'All it takes is three things:\n\n- **Initialization:** every egg is on the area.\n- **Maintenance:** every hop lands on the area.\n- **Exit:** every stop on the area is a goal.\n\nTogether, they prove that every frog that stops, stops on a goal.',
    backToOurs: 'On to our loop',

    draw: 'This time, you draw the area. Type any condition on `i` and `n`: the tiles where it’s true rise as **slabs**.\n\nTry something like `i == 2`, `i % 2 == 0` or `i < n`.',
    askInitialization: '**Rule 1 · Initialization:** every egg must be on your area.\n\nChange your area so **every egg is on it**, then press **Check**.',
    nudgeInitialization: 'Every egg has the same `i`. What is it?',
    passedInitialization: 'Correct! Every egg is on your area: **Initialization** holds.',
    questionInitialization: 'Is every egg on it?',
    afterDemoInitialization: (mine: string) => `\`i == n\` only covers the egg at \`n = 0\`, while yours, ${mine}, covers every egg.`,
    afterOwnInitialization: (mine: string) => `Your first try left some eggs off the area, but ${mine} covers every egg.`,

    ruleMaintenance: 'Next rule.\n\n**Rule 2 · Maintenance:** every hop lands on your area. From any tile of it, one hop lands on it again.',
    askMaintenance: 'Now change your area so **every hop lands on it**. The checker tests rules 1 and 2 together.',
    nudgeMaintenance: 'Every frog starts at `i = 0`, and a hop only ever increases `i`.',
    ghostMaintenance:
      'The checker put a see-through frog there. It doesn’t matter whether a real frog ever gets there: your area claims one could.',
    passedMaintenance:
      'Correct! Every hop lands on your area: **Maintenance** holds.\n\nThe see-through frogs are just a few examples the checker put on your area. It never runs real frogs and doesn’t try tiles one by one: it reasons about your formula, like solving an equation, so it covers every tile of your area at once.',
    questionMaintenance: 'Does every hop from the area land on the area?',

    together:
      'With rules 1 and 2 together, a frog never leaves your area: every frog starts on it, and no number of hops takes it off.\n\nThat’s why it’s called an **invariant**: with every hop the state changes, but “it is on the area” stays true.',
    stillOnTag: 'still on your area',

    leadExit:
      'A frog that reaches a striped tile stops there, still on your area. The outlined tiles are the stops on this area.\n\n**So does a frog that stops on the area always stop on a goal?** The third rule makes sure of that.',

    askExit:
      '**Rule 3 · Exit:** every stop on your area must be a goal.\n\nChange your area so **every stop on it is a goal**, then press **Check**. The checker now tests all three rules.',
    nudgeExit: 'A real frog’s `i` never passes `n`. Does your area say so?',
    objection:
      '“But `i` can never pass `n`!” True: no real frog gets here. But your area claims “a frog could be here too”. The area is too large.',
    objectionDemo:
      '“But `i` can never pass `n`!” True: no real frog gets here.\n\nBut the area `i >= 0` claims “a frog could be on any tile where `i >= 0`”. Checking that claim covers tiles where `i` is greater than `n` too.',
    passedExit: 'Correct! Every stop on your area is a goal: **Exit** holds.',
    questionExit: 'Would it pass all three rules?',
    afterDemoExit: (mine: string) =>
      `\`i >= 0\` isn’t false: every real frog keeps \`i >= 0\`. But it leaves room for a frog to stop off a goal, so it is too weak to prove the postcondition.\n\nYour area ${mine} closes that gap: it is strong enough to prove it.`,
    afterOwnExit: (weak: string, mine: string) =>
      `Your earlier area ${weak} was a true claim too, but it left room to stop off a goal, so it was too weak to prove the postcondition.\n\nYour area ${mine} closes that gap: it is strong enough to prove it.`,
    twoWays:
      'So two things can keep an area from proving the program:\n\n- If it fails **rule 1 or 2**, we can’t be sure frogs stay on it: an egg is off the area, or a hop from some tile on it lands off it.\n- If it fails **rule 3**, frogs may stay on it and still stop off a goal. The area is too **weak**.\n\nAn area proves the program only when it passes all three.',

    wrapUp: (mine: string) =>
      `Your area ${mine} passes all three rules:\n\n- **Initialization:** every egg is on it.\n- **Maintenance:** every hop lands on it.\n- **Exit:** every stop on it is a goal.\n\nSo every frog that stops, stops on a goal. You’ve proved our loop correct for infinitely many inputs! 🎉`,
    finish: 'Finish',
  },
};

export type Messages = typeof en;
