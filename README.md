# Moonlight in the Aether: an FF9-style game in the browser

A 20-40 minute game built the way Final Fantasy IX is built: painted backgrounds, 3D characters walking over
them, and battles that cut to a separate scene. It merges your games: the Moonlight Witch and Wickhollow from
*Follow Me Down Witch Way*, Aethermoor's Gloomfen, battle rules and loot, and Thareia's sunstone skiff, which
flies her between the two towns over a painted map. Her party is the witch, Inkblot and Nettie. The story is in
`docs/LORE.md`, the route in `docs/SLICE.md`. It was built as small demos first, to get each piece looking right;
now the pieces are joined into one game, `game.html`.

## The game

**`dist/game.html`** is the whole night, title to ending (docs/SLICE.md §1 and §3), in one file like the demos:

- **The title** and **the Opening**: Wickhollow's lanterns go out, one a night, and float down the Sable.
- **Wickhollow**: her cottage (the hag stone, two moonwater, her armchair to rest in, her cauldron), the garden
  (the gathering tutorial and the grey lavender bed), the square (Inkblot joins; Hilde swaps her Horseshoe charm
  for a Heartsease Tonic; the well's moonwater) and the riverbank (Quill and his swap shop, Rosalind, the Magpie).
- **The Gloamwood**: the lantern path (B1, Silas and his lanterns, the wayside kettle), the Sable bridge (B2, or
  Wisp-Calm), and **the Hollow** (B3, the Gloamwing; Inkblot's nest; a Hollowed bed).
- **The Magpie**: Quill's swap made, the Skiff Wakes, and the flight down the Sable, back and forth as she likes.
- **Bogmire and the fen**: Gretch, Nettie's hut (the Middle Turn, a Hush Tea, and Nettie joins), the Murkway (B4,
  Hag-Sight, a First Strike if she comes up behind them), the Long Boardwalk (B5 and the rest bench), and
  Mother's Hollow: the Lantern Mother, Lights Out with Silas as a guest, and **the Ending**.

Every fight is a real one: the field spins away into the battle screen and comes back after. The party's HP, MP,
XP and levels carry from fight to fight; brews brewed at a cauldron are what she has to drink or throw; herbs she
Gathers, relics Inkblot prises loose and drops come home in her basket. A lost fight costs nothing: she wakes at her
last rest with everything she had, and the fight waits. The night saves whenever she changes screens, rests, brews,
swaps or wins, and **Continue** on the title picks it up (after the Ending too: the lights have gone home, and the
Lantern Mother sits with her cold tea). **Menu** (or M) shows the party, what she keeps about her, and a line on what
to do next.

To play it, open `dist/game.html` in a browser, or `npm run serve` and open http://localhost:8000/game.html to play
from source. It's about 15 MB: every painting of the night is written into it. At full quality they'd make it about
20 MB, over the 16 MB a published page can be, so the build first makes the paintings a little smaller
(`tools/compact-art.py`, which needs Python's Pillow); the demos keep the originals.

## The demos

| Page | What it shows |
|---|---|
| `dist/wickhollow-square.html` | FF9's field trick: the 3D witch walking over the painted square, behind the well and lamps, up the chapel steps. Talk to Hilde, Agnes and Inkblot; gather 11 herbs into her basket. "Behind the scenes" flies the camera out to show how it's built. |
| `dist/wickhollow.html` | Wickhollow, the witch's village, over four paintings joined by doors. She starts in her cottage (the armchair is her rest point; she takes the hag stone and two moonwater). In the garden she learns to gather and finds a lavender bed gone grey; Moonlight shows the rot trail out of the gate. The well square comes along whole, with Hilde, Agnes, Inkblot and its herbs. On the Sable riverbank the Magpie sits cold and low at the old jetty, Mister Quill on his stool beside her sets his swap for the skiff, lamp-moths carry violet flames downriver, and Rosalind, a ghost, trades the Bell charm for a nightrose. |
| `dist/gloamwood.html` | The Gloamwood, Wickhollow's wild places: Witch Way's own lantern path and the Sable bridge. Silas the ghost lamplighter stands among his dark lanterns; give him her Lantern Oil and the five lanterns light one by one down the path, and he gives her the Owl charm, a flame for the skiff's bow and the way to the Hollow. The wayside kettle, a crock of moonwater, a bench to rest on, witch's bells, ember-star lilies and Silas's out-of-season garden. B1's and B2's foes show their encounter cards and let her pass; lamp-moths carry stolen lights away under the arches. |
| `dist/bogmire.html` | Bogmire, the fen town on stilts, and its fen. In town: the moot-circle (Mayor Gretch, Inkblot by the fire, the mast where the Magpie ties up) and, through the bottle-lined door, Nettie's hut (three moonwater at the rain-butt). Down the pier, the Murkway: Hollowed herb patches to clean with Moonlight and witchfire before she can pick them, fog over the low path where Hag-Sight lights the planks that hold, and B4's Hollowed foes, which the planks go round. The Long Boardwalk: B5's Willow-Wight and Drowned Choristers, and the bench under a lamp-post where she rests before the end. Mother's Hollow: the Lantern Mother on the step of her sunken house, and B6. Once she's met Nettie, Nettie and Inkblot follow her out. |
| `dist/brewing.html` | Pick Your Poison: brewing at her cottage hearth, behind a 3D cauldron with witchfire under it. Herbs, Moonwater, Stir, Bless: the water changes colour with each herb, she stirs with her spoon, a good brew glows and chimes, and a dud plops (hiccups, a wilted hat, a green fug). LORE's six recipes and Witch Way's dud rules; every brew and dud gets a card, and the grimoire fills in. |
| `dist/swap-shop.html` | Quill's swap shop. Mister Quill (blowing on his cold fingers) fusses over his curios behind the counter while Inkblot hops about. Talk to him and the FF9-style shop opens: the Horseshoe, Owl and Bell charms, gear and curios, what he wants for each, her basket of herbs, brews and found things, a confirm step and a flourish. No gold: everything's a swap, including his own swap for the Magpie, a Warming Balm and the bow-lamp. |
| `dist/witch-up-close.html` | The witch model on a turntable: her walk, gathering with the athame, witchfire (raise and throw), Moonlight, tracing a rune, the athame dash, her veil, drinking a brew, and her faces. |
| `dist/airship.html` | The skiff: the Magpie, Quill's sunstone skiff, in 3D and wearing the paint of Thareia's turnaround sheet, with the witch at the wheel and Inkblot on the rail, flying over Thareia's painted Gloomfen between Wickhollow and Bogmire. Tap the map to fly, steer with the keys, or pick a town and she flies there and sets down at its dock. Town cards list the herbs in town and the wild places on foot from it (their foes and herbs). Painted flames drift down the Sable to show the way, under the batch's painted night clouds. |
| `dist/bestiary.html` | Every 3D model on a turntable next to the witch, with their moves: the party (the witch, Inkblot, Nettie), six Gloomfen foes (Sour Wisp, Lamp-Moth, Glowcap, Hollowed Mandrake, Boglurcher, Mire Leech), the veterans and bosses (Willow-Wight, Drowned Chorister, the Gloamwing, the Lantern Mother), and the people (Mister Quill, Silas, Rosalind, Mayor Gretch) and the cauldron. Foes can be shown Hollowed. |
| `dist/hollow-battle.html` | The night's six battles (docs/SLICE.md §2), tuned in docs/BALANCE.md: B1 and B2 in the Gloamwood, the Gloamwing in the Hollow, the Murkway's Hollowed foes on the open fen, the Willow-Wight and the Drowned Choristers on the Long Boardwalk, and the Lantern Mother at her sunken house, whose second form, Lights Out, puts every lamp out. The witch and Inkblot fight in the Gloamwood, and Nettie joins them in the fen. Aethermoor's battle rules: the turn ribbon, intent dice, d20 rolls with grazes, statuses, Grip & Claim on held relics, and loot. Pick a fight, or go on from one to the next. |
| `dist/title.html` | The title screen and the cut-scenes. The logo over art batch 2's painting of the skiff over the valley, which pans slowly under twinkling stars, drifting painted clouds and violet flames, with golden motes off the crystals. "Tap to begin" starts Thareia's main theme; New game plays the Opening, and Story plays any of the four cut-scenes (the Opening, the Skiff Wakes, the Middle Turn, the Ending): painted stills under slow camera moves, dissolving into each other, with narration as captions and spoken lines typed out in the dialogue box, in each speaker's voice. Auto, Skip, and Escape to leave. |

**The square demo** shows FF9's main trick. The Moonlight Witch from *Follow Me Down Witch Way* is a
chunky 3D model walking around a flat painting of the village square. She climbs the chapel steps, slides around
the well, and walks behind the lamp posts, the well and the roof in front, which cover her the way the real
objects would. Hilde hammers at her anvil, Agnes knits by the chapel, and Inkblot hops about and flies off if you
crowd him.

## Play it

The demos are one file each: open **`dist/wickhollow-square.html`** (or any other) in a browser. The game is served
(see above).

| | Keyboard | Touch or mouse |
|---|---|---|
| Walk | arrow keys or WASD | tap or click where to go |
| Talk, next line | Space, Enter or E | tap the person, then tap the box |
| The menu (the game) | M | the button, top right |
| Hag-Sight (the Murkway) | H | the button, bottom left |
| In a fight | arrow keys and Enter to pick a target, Escape to go back | tap a command, then a foe |
| Behind the scenes | B | the button, top right (the demos) |
| Show the layers | L | the button, top right (the demos) |

**Bogmire** plays the same way. Walk into Nettie's door (the cottage with bottles in the window, on the left) to go
inside; the gate at the bottom of her hut leads back out. On these wider paintings the arrow keys follow the screen.
Walk off the bottom of the pier for the Murkway, or past the mast for the Long Boardwalk. Hag-Sight is the button
bottom left, or H, or stand still by the fog. **Wickhollow** and **the Gloamwood** play the same way: doors and paths at
the edges of each painting lead on.

In **the airship demo**, tap anywhere on the map to fly over it, or steer with the arrow keys or WASD. Tap a
town's name (or "Fly to") and she flies there and lands. Space lands when a town is near, or takes off from a dock.
**Map** shows the whole region; the ♪ button switches the flying music between Thareia's *Sunstone Wind* and
*Over the Wilds*. The map is art batch 2's night painting of the valley, from Wickhollow down the Sable to Bogmire.

**Behind the scenes** flies the camera out of the painting so you can see how the scene is put together: the
painting on a flat card, the painter's camera, the invisible floor, and the cut-outs standing at their depths. You
can keep walking while it's out. **Layers** colors the floor and the cut-outs in place. **Pixels** switches the
characters between 2× pixels (to match the painting), 1× and smooth.

## How it works

1. **The painter's camera** (`src/paint.js`). The painting is flat, so we choose a 3D camera that "took" it: how
   far it tilts down (30°), its lens (15°), and how many pixels one meter covers (70). Every position in the scene
   file is a painting pixel, and this camera turns pixels into 3D.
2. **The walkmesh** (`src/walkmesh.js`). An invisible floor traced over the cobbles, with holes for the well and
   the lamp posts. Each corner has a height, so the chapel steps are a slope. Tap-to-walk finds a path over it.
3. **Cut-outs** (`src/layers.js`). Outlines around things that stand in front (the well, the lamps, the roof),
   stood up in 3D where they touch the ground. They show the painting's own pixels, so they're invisible until
   she's behind one.
4. **The stage** (`src/stage.js`). It draws the painting, then the 3D characters (small, then scaled up so their
   pixels match), then any cut-out that is nearer the camera than her.

The characters (`src/actors/`) are built in code from simple shapes: no model files. The skiff is built the same way, but to the
silhouettes of Thareia's painted turnaround sheet (`art/airship/skiff-sheet.webp`), so the painting can be projected
onto its triangles: the side view onto the hull, the top view onto the deck, and cut-outs for the sails, fins and
rudder. `python3 tools/bake-skiff.py` cuts those pieces into `art/airship/skiff-atlas.webp`. Her face is painted
(`art/faces/witch.webp`). Battles run on Aethermoor's own rules (`vendor/aethermoor/`, with its tests), with
the witch added as a hero (`vendor/aethermoor/src/data/witch.js`). Music and sound are made in code: effects
from Thareia's sound studio (`vendor/thareia-sfx/`) and music from Aethermoor's synth (`src/audio/synth.js`),
following the "no recorded songs" decision in Thareia's notes.

### One game from the pieces

- **Areas** (`src/areas/`): Wickhollow, the Gloamwood, the Hollow and Bogmire, each a set of painted screens with
  their casts (who and what is on each). An area asks a *host* for what it can't do itself: a fight, the cauldron,
  Quill's shop, the skiff, a cut-scene, a rest, who's in the party (`src/areas/common.js`). The game is one host;
  each town demo (`src/wickhollow.js`, `src/gloamwood.js`, `src/bogmire.js`) is another, which shows encounter cards.
- **Screens** that take turns on one WebGL renderer: the field (`src/town.js`: every painted screen of the night,
  joined by doors), the battle (`src/battle/mode.js`), the map (`src/airship/mode.js`), and the title with its
  cut-scenes (`src/title/mode.js`, on its own 2D canvas). The brewing screen (`src/brew/ui.js`) and the swap shop
  (`src/swap/ui.js`) open over the field.
- **The night** (`src/game/state.js`): one plain object that saves as JSON: her bag (everything by Quill's catalogue
  ids, `src/items.js`), the party's XP, HP and MP, the story's flags, each area's own record, and her last rest.
- **The page** (`game.html`) is written by `tools/game-page.mjs` from `tools/game-shell.html` and the demo pages
  whose screens the game uses, one `<template>` each, so the game and the demos share one look. Only the screen on
  show is in the page, so their ids and styles never meet.
- **The game** (`src/game/main.js`) runs it all: the title and New game or Continue, the swirl into a fight and the
  result after, a lost fight's wake-up, the Skiff Wakes and the flight, the Middle Turn, the Ending, and the menu.

## Folders

| Folder | What it holds |
|---|---|
| `dist/` | the built pages: `game.html`, the whole game, and the demos (`wickhollow-square.html` and the rest), each with a copy without the `<html>` wrapper for hosts that add their own |
| `src/` | the engine and the game: `areas/` (the places), `game/` (the night and the game), `battle/`, `airship/`, `title/`, `brew/`, `swap/`, `actors/` (the models) |
| `scenes/` | one JSON file per painted screen: the camera, the walkmesh, the cut-outs, the lights and the exits |
| `art/` | paintings (`backgrounds/`, `battle/`, `stills/`, `map/`), dialogue portraits, face sheets, effects and pixel fonts: from *Follow Me Down Witch Way*, Thareia, and art batches 1 and 2 (`docs/art-requests/`) |
| `tools/` | build, dev server, screenshots, and `overlay.py`, which draws a scene file over its painting |
| `tests/` | rule tests (Node) and a browser test that plays the built game |
| `docs/` | `LORE.md` (the story), `SLICE.md` (the route and battles), `PLAN.md`, `art-requests/`, and `lore-sources/` (digests of both games' lore) |
| `vendor/` | Aethermoor's battle and loot rules, and Thareia's sound studio, copied from the New-game repo |
| `reference/` | `aethermoor-m7.zip`, the Aethermoor build, kept for its battle and loot systems |

## Commands

```
npm install            # three.js and esbuild
npm run serve          # play from source at http://localhost:8000, rebuilding as you edit
npm run build          # build the game and every demo into dist/ (node tools/build.mjs game builds one)
npm test               # rule tests: the camera and walkmesh, balance, brewing, swaps, the game's record of the night
node --test vendor/aethermoor/test/*.test.mjs   # Aethermoor's battle and loot tests
npm run test:browser   # build, then play the demos in headless Chromium
node tests/browser-game.mjs   # play the whole game through, title to ending (slow: about 15 minutes)
python3 tools/overlay.py scenes/wickhollow-square.json out.png   # check a scene by eye (needs Pillow)
```

## Adding a painted screen

1. Put the painting in `art/backgrounds/` and add it to `src/assets.js`.
2. Copy `scenes/wickhollow-square.json`. Set the camera so a person standing mid-screen is about as tall as the
   doors: `ppm` is the scale, and `pitch` is how top-down the painting looks (the more of the tops of things you
   see, the higher it goes).
3. Trace the floor (`walk`), the things that stand in front (`layers`), and the lamps (`lights`) in painting
   pixels. Run `tools/overlay.py` and look at the picture after each change.
4. Give each cut-out a `base`: one ground point for something round, like the well, or two for something that
   runs at an angle, like a fence.
