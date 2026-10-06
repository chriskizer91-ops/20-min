# CLAUDE.md

## What this is

Sunstone Skies: the laptop version of Chris's airship game over Aethermoor. It's its own game, separate from the one in
`chriskizer91-ops/airship-game-in-aethermoor-`: two games, the same ships over Chris's world. This one has room for more
detail, more things to do and more decisions, because it only has to run on a laptop.

## Rules

- Write only inside this folder (`20-min/sunstone-skies/`). Other repositories are read-only.
- Take nothing more from `airship-game-in-aethermoor-` (Chris, October 6). It was the starting copy, and its Galleon and
  Man-o'-war models were the starting point for ours; from here this game goes its own way.
- Laptop only: keyboard and mouse, full detail. Phones aren't a target.
- Chris reads the README, the docs and everything in the game: plain words.
- The numbers that balance the game live in `src/game/progress.js`; check a change with the simulated Captain
  (`tools/sim-voyage.mjs`) and keep `docs/balance.md` up to date.
- After a change, build and republish `dist/game.artifact.html` and `dist/shipyard.artifact.html` to the two links in the
  README (pass the url), so Chris's links keep working.

## Checking a change

```
npm install
node tools/build.mjs
npm test                       # the progress rules
node tools/check.mjs           # the game: must end with "all good"
node tools/check-shipyard.mjs  # the shipyard: must end with "all good"
node tools/sim-voyage.mjs campaign 600 30        # the balance, as a simulated Captain plays it (docs/balance.md)
node tools/sim-voyage.mjs rate 16                # the strength rating's numbers
```
