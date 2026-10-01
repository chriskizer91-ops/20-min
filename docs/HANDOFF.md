# Hand-off: Moonlight in the Aether

For a fresh session picking this up. Read this first, then `README.md`, `docs/LORE.md` and `docs/SLICE.md`.

## What this is

An FF9-style browser game, 20-40 minutes long. A 3D witch walks over painted backgrounds, and battles cut to a separate screen. It merges the user's games: *Follow Me Down Witch Way* (the Moonlight Witch, Wickhollow), Aethermoor (the Gloomfen, its battle and loot rules), and Thareia (the sunstone skiff, the sound studio). It is built with three.js and esbuild, and each demo is one self-contained HTML file.

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

## Working rules

- **Repos:**
  - **Write** only to `chriskizer91-ops/20-min` (`/home/user/20-min`), branch `claude/amazing-hamilton-h3g6sg`. Push with `git push -u origin claude/amazing-hamilton-h3g6sg`.
  - **Read only:** `/home/user/New-game` (Aethermoor and Thareia, on several branches), `/home/user/follow-me-down-witch-way` and `/home/user/building-with-assets-`. Copy any art you need into `art/`, compressed to webp.
- **Commits:** end every commit message with the two trailer lines the session gives you. Put no model names in commits. Don't open a PR unless asked.
- **Stop hook:** it wants a clean tree. Commit work-in-progress snapshots when it asks, after checking that the pages bundle and `npm test` passes.
- **The user:** likes building in pieces, as separate demos first. They get demos as published Artifacts; republish the same file path to keep the link.
- **Publishing brewing:** `dist/brewing.fragment.html` is rejected by the Artifact publisher as a "review page". The cause wasn't found, so it's unpublished; everything else publishes fine.

## The demos (each is `dist/<name>.html`, with a `.fragment.html` for publishing)

| Page | Entry | Published |
|---|---|---|
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
node tools/build.mjs [name]        # build all pages, or one; a page is skipped if its files don't exist
node tools/serve.mjs               # dev server with live rebuild
npm test                           # rule tests: scenes, balance, brewing, swaps (+ vendor: node --test vendor/aethermoor/test/*.test.mjs)
node tests/browser.mjs             # square + battles + airship; also browser-{wickhollow,gloamwood,bogmire,fen,brewing,swap-shop,title}.mjs
node tools/shot.mjs out.png --page <name> --size 1280x800 --wait 2500 --eval "js"   # screenshot
python3 tools/overlay.py scenes/<file>.json out.png                                 # check a scene's floor and cut-outs by eye
node tools/balance.mjs [B1..B6] [--chain] [--arrive]                                # battle balance simulator
```

Headless Chromium renders in software here (about 8 fps, slower under load), so browser tests wait generously. Pages expose test handles: `window.__game`, `__battle`, `__airship`, `__title` and `__bestiary`.

## Where things live

- **Field engine:** `src/paint.js` (painter's camera), `walkmesh.js`, `layers.js` (cut-outs), `stage.js` (rendering, `setScreen`, grade), `field.js` (people, things, herbs, dialogue, basket), `screen.js` and `town.js` (multi-screen towns: `bootTown({ screens, start, images })`). Scenes are in `scenes/*.json`, in painting pixels.
- **Battles:**
  - `src/battle/encounters.js` holds B1-B6 and B6b; start fights with `startEncounter`, and use `nextForm` for B6 → Lights Out.
  - `director.js` plays a battle's events out on the models.
  - The rules are vendored from Aethermoor in `vendor/aethermoor/`, and the game's additions are marked `// ADDED for the 20-min game`.
  - The balance is written up in `docs/BALANCE.md`.
- **Models:** `src/actors/` (built in code with `kit.js`); the bestiary lists are in `registry-*.js`.
- **Reusable screens, ready to plug in:**
  - `openCauldron({ basket, moonwater, grimoire, onBrew, onClose, view })` in `src/brew/ui.js`
  - `openSwapShop({ inventory, onSwap, onClose })` in `src/swap/ui.js`
- **Art:** `art/`. Batch 1 and batch 2 prompts and returns are in `docs/art-requests/`. Each town page has its own `src/assets-<page>.js`, so pages don't bundle each other's paintings. Don't add side-effect mutations to `src/assets.js`.
- **Audio:** `src/audio/sound.js`: Thareia's sfx, plus music pieces such as `'marsh'`, `'flight'` and `'thareia:title'`, and the synth's tracks (`'wickhollow'`).

## Next: put it together into one game

Everything exists as separate pages. The user said to finish the pieces "before we put it together", and they're finished. What's left is joining them:

1. **One game page:** title → opening cut-scene → cottage → … → B6 → the ending cut-scene. Follow the route and story beats in `docs/SLICE.md` §1 and §3.
2. **One shared state:**
   - the basket and inventory: herbs, brews, found things, charms, moonwater
   - the party, with their HP, MP, levels and XP (use `CURVE`/`partyFor` in `encounters.js`)
   - story flags
   - saving (rest points already write `localStorage` keys, but nothing reads them yet)
   - The swap shop's `src/swap/swaps.js` inventory (`THINGS`, `holdings`) is a good start for a shared inventory model.
3. **Fights from the field:** encounter cards become real battles (an FF9 swirl into `hollow-battle`'s stage), and the party's HP and MP carry over.
4. **Hook-ups:**
   - cauldron things (the cottage `'cauldron'`, the wayside `'kettle'`, Nettie's cauldron) → `openCauldron`
   - Quill → `openSwapShop` (his stall, and the riverbank for the skiff swap)
   - the riverbank jetty and Bogmire's mast → the airship page and back
   - the square's exits to the lantern path and the bridge
5. **Small engine clean-ups the builders asked for:**
   - export `SQUARE` from `field.js`
   - let `field.give` take unknown items, so charms and key items show in the basket
   - a `cast.leave()` hook
   - an exit `locked` flag
   - per-scene footsteps
   - a `stage.lookAt(pixel)` camera override for cut-scenes
   - make `sound.music()` skip a track that's already playing, so it doesn't restart
   - a shared encounter card, plus a following-party helper (from `src/bogmire.js`)
6. **Not built yet:**
   - the Hollow (B3's field screen)
   - the Murkway's old fen graves
   - charms and gear showing on the 3D witch
   - Hex is the weakest battle command (see `docs/BALANCE.md` §11)
