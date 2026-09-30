# Aethermoor's rules, vendored

`src/core`, `src/data` and `src/rules` are copied from the New-game repo, branch
`claude/cool-ptolemy-uc93gg`, folder `game/src/` (Aethermoor, Milestone 7), with five of its test files in
`test/`. They are the battle, loot and progression rules: pure JavaScript with no page code, all randomness
from a seeded RNG. This game draws its battles with them.

Run their tests: `node --test vendor/aethermoor/test/*.test.mjs` (97 pass).

## Changes from the original

Any change for this game goes in this list, so the two can be compared. Every changed line is marked
`ADDED for the 20-min game`.

- `src/data/witch.js` (new): the Moonlight Witch as a hero, her witchfire (a weapon item), her skills (Silver
  Circle, Moonbeam, Bless, Gather) and her brews (Heartsease Tonic, Hush Tea, Moonwater, Remembrance Incense), in
  Aethermoor's data formats, following docs/LORE.md.
- `src/data/heroes.js`, `src/data/skills.js`, `src/data/items.js`: import `witch.js` and merge it in (one or two
  lines each).
