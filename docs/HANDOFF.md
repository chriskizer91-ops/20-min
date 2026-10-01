# Hand-off: Moonlight in the Aether

For a fresh session picking this up. Read this first, then `README.md`, `docs/LORE.md` and `docs/SLICE.md`.

## What this is

An FF9-style browser game, 20-40 minutes long. A 3D witch walks over painted backgrounds, and battles cut to a separate screen. It merges the user's games: *Follow Me Down Witch Way* (the Moonlight Witch, Wickhollow), Aethermoor (the Gloomfen, its battle and loot rules), and Thareia (the sunstone skiff, the sound studio). It is built with three.js and esbuild.

- **Name:** *Moonlight in the Aether*. **Logo on the title screen:** just "Witch Way". The user chose both.
- **Party:** the witch, Inkblot (crow) and Nettie (swamp witch). Silas joins as a guest in the final fight.
- **Settled decisions:**
  - free flight, back and forth, between two towns (Wickhollow and Bogmire);
  - the skiff is named the Magpie;
  - it's a standalone game, reusing the other games' assets;
  - the party can lose, at no cost;
  - there's a rest bench before the Lantern Mother (B6), not a healing opener;
  - pixels off (smooth models) by default;
  - no gold: everything's a swap.

## Where things stand

The pieces were built as separate demos, and are now **joined into one game**: `game.html`, built to `dist/game/` (a page and a folder of art: the whole night's art is about 13 MB, and written into the page as text it would make a page of about 20 MB, over the 16 MB a one-file page can be). Title → the Opening → the cottage → … → B6 and Lights Out → the Ending → the title again, with Continue. Every fight is real, the party's HP/MP/XP carry over, brews come from the cauldron, and the night saves. `tests/browser-game.mjs` plays it through.

The demos still build and pass their tests: they're the same code (the areas and the modes), each with its own small host.

## Working rules

- **Repos:**
  - **Write** only to `chriskizer91-ops/20-min` (`/home/user/20-min`). This session worked on branch `ccr-5afa0fa7-7ojc16` (the earlier sessions used `claude/amazing-hamilton-h3g6sg`); use the branch your session names.
  - **Read only:** `/home/user/New-game` (Aethermoor and Thareia, on several branches), `/home/user/follow-me-down-witch-way` and `/home/user/building-with-assets-`. Copy any art you need into `art/`, compressed to webp.
- **Commits:** end every commit message with the two trailer lines the session gives you. Put no model names in commits. Don't open a PR unless asked.
- **Stop hook:** it wants a clean tree. Commit work-in-progress snapshots when it asks, after checking that the pages bundle and `npm test` passes.
- **The user:** likes building in pieces. They get demos and the game as published Artifacts; republish the same file path to keep the link.
- **Publishing the game:** `dist/game/index.fragment.html` as the page, with every file under `dist/game/art/` as supporting files (`files`, with `root: 'dist/game'`), so the page's `./art/...` URLs resolve.
- **Publishing brewing:** `dist/brewing.fragment.html` is rejected by the Artifact publisher as a "review page". The cause wasn't found, so it's unpublished; everything else publishes fine.

## The game and the demos

| Page | Entry | Published |
|---|---|---|
| **the game** (`game.html` → `dist/game/`) | `src/game/main.js` | https://claude.ai/artifact/6zKY7KkP7PjqCqy9iL9E5y |
| wickhollow-square | `src/main.js` | https://claude.ai/artifact/UjsFYHW6Ya4fxZ47v7UkmF |
| wickhollow (cottage, garden, square, riverbank) | `src/wickhollow.js` | https://claude.ai/artifact/NqMRUtUrb3LkPGYbC2wbQ7 |
| gloamwood (lantern path, Sable bridge) | `src/gloamwood.js` | https://claude.ai/artifact/GBSaFwnFj8pzvJVkrxqBoC |
| bogmire (moot-circle, Nettie's hut, Murkway, Long Boardwalk, Mother's Hollow) | `src/bogmire.js` | https://claude.ai/artifact/CDqbnAu1AwfaDgYT6CGdQF |
| airship (the Magpie over the world map) | `src/airship/main.js` | https://claude.ai/artifact/WknjPwx92GaLadP9syRVjS |
| hollow-battle (all six fights, B6 → Lights Out) | `src/battle/main.js` | https://claude.ai/artifact/KyPsj6MkmmxvEAddqXp29x |
| brewing (Pick Your Poison) | `src/brew/main.js` | not published (see above) |
| swap-shop (Quill's stall) | `src/swap/main.js` | https://claude.ai/artifact/C5A9gJTmrmYrvpmFvHMZzG |
| title (title screen and four cut-scenes) | `src/title/main.js` | https://claude.ai/artifact/BnWTgA5QUTSnPPh3W6Xw5n |
| bestiary (20 models on a turntable) | `src/bestiary.js` | https://claude.ai/artifact/45yT8VGQ8ot64fgDZ9BrAM |
| witch-up-close | `src/viewer.js` | https://claude.ai/artifact/B8wEC6PqpwRe25iDw9R6Rp |

## Commands

```
node tools/build.mjs [name]        # build the game and all demos, or one ('game' writes game.html first, then dist/game/)
node tools/serve.mjs               # dev server with live rebuild: http://localhost:8000/game.html is the game
npm test                           # rule tests: scenes, balance, brewing, swaps, the game's state (+ vendor: node --test vendor/aethermoor/test/*.test.mjs)
node tests/browser-game.mjs        # the whole game, title to ending (serves dist/game/ itself; about 15 minutes)
node tests/browser.mjs             # square + battles + airship; also browser-{wickhollow,gloamwood,bogmire,fen,brewing,swap-shop,title}.mjs
node tools/shot.mjs out.png --page <name> --size 1280x800 --wait 2500 --eval "js"   # screenshot a demo
python3 tools/overlay.py scenes/<file>.json out.png                                 # check a scene's floor and cut-outs by eye
node tools/balance.mjs [B1..B6] [--chain] [--arrive]                                # battle balance simulator
```

Headless Chromium renders in software here (about 8 fps, slower under load), so browser tests wait generously. Pages expose test handles: `window.__play` (the game: `state`, `town`, `battle`, `map`, `title`, `cauldron`, `shop`), `__game` (a town), `__battle`, `__airship`, `__title` and `__bestiary`.

## Where things live

- **The game** (`src/game/`):
  - `main.js` runs the night: the four screens taking turns (title, field, battle, map; only the one on show has its HUD in the page), the host the areas ask (fights with the FF9 swirl and a result box, the cauldron, Quill's shop, the Skiff Wakes and the flight, cut-scenes, rests, joining), a lost fight's wake-up at the last rest, the Ending, and the menu (M) with a "Next:" line.
  - `state.js` is the night as JSON: the bag, the party (XP → levels via Aethermoor's progression, HP/MP carried), flags, each area's record, the last rest, and `afterBattle` / `afterDefeat`. Battles only take the moonwater she can spare from the three required brews. Saved in localStorage (`moonlight-in-the-aether:save`).
- **Areas** (`src/areas/`): `wickhollow.js`, `gloamwood.js` (lantern path, bridge), `hollow.js` (the Hollow, B3; only in the game), `bogmire.js` (town and fen). Each is `createX(host)` → `{ screens, images }`; `common.js` documents the host and holds shared pieces (hollowed patches, stepping aside).
- **Field engine:** `src/paint.js`, `walkmesh.js`, `layers.js`, `stage.js` (rendering; can share a renderer; `stage.look(pixel)` leads the camera away), `field.js` (people, things, herbs, dialogue, the bag: `count/has/give/take`, lockable exits via `cast.locked`), `screen.js`, `town.js` (the `Town` class: screens joined by doors, `go(id, at)`, `pause/resume`, a following party).
- **Screens as modes:** `src/battle/mode.js` (`fight(id, opts)`), `src/airship/mode.js` (`fly({ from })`, "Go ashore"), `src/title/mode.js` (`menu()`, `play(id)`). The demo entries (`main.js` in each folder) wrap them.
- **The page:** `game.html` is generated by `tools/game-page.mjs` from `tools/game-shell.html` and the demo pages (title, bogmire, battle, airship): edit the shell or the demo pages, not `game.html`.
- **Items:** `src/items.js` (names, kinds, icons by Quill's catalogue ids in `src/swap/swaps.js THINGS`); icons in `src/assets-items.js` and `src/swap/icons.js` (pixel icons for the relics and gear).
- **Battles:** `src/battle/encounters.js` (B1-B6, B6b, `startEncounter`, `nextForm`, `makeHero`), `director.js`, the vendored rules in `vendor/aethermoor/` (the game's additions marked `// ADDED for the 20-min game`), and `docs/BALANCE.md`.
- **Models:** `src/actors/` (built in code with `kit.js`); the bestiary lists are in `registry-*.js`.
- **Art:** `art/`. Batch 1 and batch 2 prompts and returns are in `docs/art-requests/`. Each demo page has its own `src/assets-<page>.js`, so pages don't bundle each other's paintings. Don't add side-effect mutations to `src/assets.js`.
- **Audio:** `src/audio/sound.js`: Thareia's sfx, plus music pieces such as `'marsh'`, `'flight'` and `'thareia:title'`, and the synth's tracks (`'wickhollow'`). `music()` carries on with a piece that's already playing.

## What's next

- **Play it and tune it.** The route plays end to end in the test, by its test handle; a person playing it will find rough edges (pacing, hints, where things are).
- **An equip screen.** Loot that drops is recorded (`state.gear`) but can't be worn; charms and relics are kept but only the Horseshoe's basket slots and Inkblot's feather do anything yet.
- **Charms and gear on the 3D witch** (LORE §9: they dangle on the model).
- **Optional rooms** (SLICE §1): Quill's stall (`quills-stall.webp`, with its own scene), the lane, Hilde's smithy, the graveyard, the chapel.
- **The garden's mandrake** climbing out of the grey bed and scuttling off to the Gloamwood (SLICE screen 2).
- **The Murkway's old fen graves** (its exit only says where it would go).
- **Hex** is the weakest battle command (`docs/BALANCE.md` §11).
