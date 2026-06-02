# NWoD Dice Smoke Cases

The project does not currently have a test runner. Use `rollNwodPoolWithSequence`
from `src/lib/dice/nwod.ts` for deterministic checks while the dice roller stays
pure.

Expected chained explosion cases:

- 10-again: `rollNwodPoolWithSequence({ pool: 1, again: 10 }, [10, 10, 8])`
  should produce 3 successes, rolls `[10, 10, 8]`, and exploded rolls `[10, 8]`.
- 9-again: `rollNwodPoolWithSequence({ pool: 1, again: 9 }, [9, 10, 9, 7])`
  should produce 3 successes, rolls `[9, 10, 9, 7]`, and exploded rolls
  `[10, 9, 7]`.
- 8-again: `rollNwodPoolWithSequence({ pool: 1, again: 8 }, [8, 8, 10, 6])`
  should produce 3 successes, rolls `[8, 8, 10, 6]`, and exploded rolls
  `[8, 10, 6]`.
- Chance die: `rollNwodPoolWithSequence({ pool: 0, chanceDie: true }, [10, 10])`
  should consume only the first 10, produce 1 success, and produce no exploded
  rolls.
- Rote: `rollNwodPoolWithSequence({ pool: 1, again: 10, rote: true }, [2, 10, 8])`
  should reroll the failed initial die once, then recursively explode the rote 10.
