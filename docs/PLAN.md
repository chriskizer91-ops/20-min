# Plan: the 20-minute slice

The quality bar is Final Fantasy IX, the same as for Thareia in the New-game repo. Twenty minutes of FF9 is
about 1% of the game, but the slice needs almost all of FF9's systems, so most of the work is systems and polish,
not content.

## What each FF9 part becomes

| FF9 | Here | State |
|---|---|---|
| Pre-rendered backgrounds in layers | A painting, plus cut-outs at their own depth | **Done in demo 1** |
| Low-poly 3D characters | Chunky models built from shapes in code, drawn at 2× pixels | **Done in demo 1**: the witch, Hilde, Agnes, Inkblot |
| Walkmesh, with stairs and slopes | Traced in painting pixels, with heights | **Done in demo 1** |
| Field talk and the "!" | Dialogue box with portraits, a typewriter and a voice for each speaker | **Done in demo 1** |
| Field music | Aethermoor's code-made synth, with a new Wickhollow tune | **Done in demo 1** |
| Screen exits and scene changes | The `exits` in each scene file, then a fade to the next screen | Next |
| Battles on a separate screen | Aethermoor's battle rules, drawn with these 3D characters on a painted battle backdrop | After that |
| Loot | Aethermoor's loot rolls and card reveal | With battles |
| CG movies | Painted stills with slow pans and text (see `art-requests/batch-01.md`, 09 to 12) | Once the art is in |
| Menus, saving | Built on Aethermoor's save and menu code | Last |

## Reusing Aethermoor's battle and loot

The full Aethermoor game is on the New-game repo's `claude/cool-ptolemy-uc93gg` branch, under `game/src/`. The
built copy is in `reference/aethermoor-m7.zip`.

- **Rules are pure.** `rules/` and `data/` never touch the page, and all randomness comes from a seeded
  `core/rng.js`, with 623 tests. The battle API (`createBattle`, `act`, `foeTurn`) returns a new state plus a
  list of events (`damage`, `status`, `ko`, `victory`...). A new battle screen only has to play those events.
- **The turn model** is the Initiative Ribbon: each action pushes that unit's next turn back by the weapon's
  weight. That sits close to FF9's ATB bar and can be shown the same way.
- **Loot** (`rules/loot.js`) rolls rarity tiers, affixes and names, and `ui/card.js` does the reveal. Both can
  come across as they are.
- **What would change:** the foes, heroes and relics are Aethermoor's own content. A slice set in another world
  needs its own `data/` files in the same shapes.

Plan for the battle step: copy `core/`, `data/` and `rules/` in unchanged at first, keep their tests running
here, and write only a new battle screen (3D party on the left, foes on the right, a painted backdrop from the
Thareia art, FF9-style command menu and turn bar).

## Size

Demo 1 is 2.0 MB: the painting is 0.7 MB, the portraits and fonts 0.3 MB, and the code (three.js and the game)
about 1 MB. Each new screen adds about 0.6 to 0.9 MB of painting. Ten screens, four battle backdrops and four
movie stills would come to about 15 MB, in line with the 15 to 20 MB estimate for a 20-minute slice.

## Open questions for you

1. **Which world is the slice set in?** Demo 1 uses Wickhollow, because its art is ready and matches the look.
   But Witch Way's lore says "no fighting", and the slice needs battles. Options: Aethermoor or Thareia with this
   engine; Wickhollow with gentle "battles" (brewing duels, calming wisps); or a new world.
2. **Camera:** Thareia's notes leave three-quarter vs straight-down open. This demo is three-quarter (30°).
   Does it look right to you?
3. **Pixels:** the characters are drawn at 2× to match the painting. Thareia's notes rejected 2× and 3× *sprites*
   as clunky, but these are 3D models, which is different. Try the Pixels button and say which you prefer.
