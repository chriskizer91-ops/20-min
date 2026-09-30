# Aethermoor's rules, vendored

`src/core`, `src/data` and `src/rules` are copied from the New-game repo, branch
`claude/cool-ptolemy-uc93gg`, folder `game/src/` (Aethermoor, Milestone 7), with five of its test files in
`test/`. They are the battle, loot and progression rules: pure JavaScript with no page code, all randomness
from a seeded RNG. This game draws its battles with them.

Run their tests: `node --test vendor/aethermoor/test/*.test.mjs` (97 pass).

## Changes from the original

Any change for this game goes in this list, so the two can be compared. Every changed line is marked
`ADDED for the 20-min game`.

- `src/data/witch.js` (new): the party of three in Aethermoor's data formats, following docs/LORE.md: the Moonlight
  Witch, Inkblot and Nettie as heroes; their gear (Inkblot's beak and leg-ring, Nettie's stick); their skills (Silver
  Circle, Moonbeam, Bless, Gather; Pinch, Kraa; Mind the Jars, Stir the Pot, Bitterroot, Hex); three relics (the
  witchfire, whose Legend Surge is Moonrise; Inkblot's feather, whose Surge is Every Shiny Thing; the Wickhollow flame a
  lamp-moth carries); and the brews (Heartsease Tonic, Hush Tea, Moonwater, Remembrance Incense, Lantern Oil, Warming
  Balm, and three duds). The numbers are tuned with `tools/balance.mjs` (docs/BALANCE.md).
- `src/data/moonlight-foes.js` (new): what the six battles need that Aethermoor lacks: the Omen `hollowed`, the statuses
  `flustered` and `unseen`, the families `hollowed-mandrake` and `silas`, and variants of Aethermoor's lamp-moth
  (`wickhollow`), willow-wight, gloamwing and lantern-mother (`moonlight`, `lights-out`). Aethermoor's own entries and
  variants are untouched.
- `src/data/heroes.js`, `skills.js`, `items.js`, `relics.js`: import `witch.js` and merge it in (one or two lines each).
- `src/data/foes.js`, `omens.js`, `statuses.js`: import `moonlight-foes.js` and merge it in (one or two lines each).
  The Omen has `notFor` every tier, so the Waking and Grudges never roll it.
- `src/rules/combat.js` (rules change, 16 marked lines), for the Hollowed Omen (LORE §5, "whoever strikes first wins"):
  - `damageMult`: an Omen can carry its own `weak` list (Hollowed: radiant x1.5), which goes when the Omen does.
  - `resolveAttack`: a foe whose hit lands is marked `struck`.
  - `dealDamage`: a hero's damage with an aspect breaks the target's Omens that have `breaks: <that aspect>`, unless
    the target is already `struck` (new helpers `breakOmens` and `stripOmens`, which push an `omen` remove event).
  - `resolveCleanse`: a cleanse can carry `omens: [...]` (and `all: true` for every foe), so a brew or a Surge can
    strip an Omen (Remembrance Incense, Moonrise).
  None of this does anything unless a foe has an Omen with `breaks` or `weak`, which no Aethermoor Omen has.
- `src/rules/battle.js` (rules change, 1 marked line): a new target kind `ally-any` in `targets()`, a standing ally or
  a fallen one, for the Heartsease Tonic (heals the standing, revives the fallen). Nothing in Aethermoor uses it.

The five test files still pass unchanged: `node --test vendor/aethermoor/test/*.test.mjs` (97 pass).
