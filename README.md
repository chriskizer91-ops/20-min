# Moonlight in the Aether: an FF9-style slice in the browser

A 20-40 minute game built the way Final Fantasy IX is built: painted backgrounds, 3D characters walking over
them, and battles that cut to a separate scene. It merges your games: the Moonlight Witch and Wickhollow from
*Follow Me Down Witch Way*, Aethermoor's Gloomfen, battle rules and loot, and Thareia's sunstone skiff, which
flies her between the two towns over a painted map. Her party is the witch, Inkblot and Nettie. The story is in
`docs/LORE.md`, the route in `docs/SLICE.md`. We're building it as small demos first, to get each piece looking
right before the full build.

## The demos

| Page | What it shows |
|---|---|
| `dist/wickhollow-square.html` | FF9's field trick: the 3D witch walking over the painted square, behind the well and lamps, up the chapel steps. Talk to Hilde, Agnes and Inkblot; gather 11 herbs into her basket. "Behind the scenes" flies the camera out to show how it's built. |
| `dist/witch-up-close.html` | The witch model on a turntable: her walk, gathering with the athame, witchfire (raise and throw), Moonlight, tracing a rune, the athame dash, her veil, drinking a brew, and her faces. |
| `dist/airship.html` | The skiff: the Magpie, Quill's sunstone skiff, in 3D and wearing the paint of Thareia's turnaround sheet, with the witch at the wheel and Inkblot on the rail, flying over Thareia's painted Gloomfen between Wickhollow and Bogmire. Tap the map to fly, steer with the keys, or pick a town and she flies there and sets down at its dock. Town cards list the herbs in town and the wild places on foot from it (their foes and herbs). Night, dusk or day; stolen violet lights drift down the fen to show the way. |
| `dist/bestiary.html` | Every 3D model on a turntable next to the witch, with their moves: the party (the witch, Inkblot, Nettie), six Gloomfen foes (Sour Wisp, Lamp-Moth, Glowcap, Hollowed Mandrake, Boglurcher, Mire Leech), and the veterans and bosses (Willow-Wight, Drowned Chorister, the Gloamwing, the Lantern Mother). Foes can be shown Hollowed. |
| `dist/hollow-battle.html` | A first battle (the outline's B2): the witch against two Sour Wisps and a Lamp-Moth on Thareia's graveyard backdrop, using Aethermoor's battle rules: the turn ribbon, intent dice, d20 rolls with grazes, statuses, and loot. Her commands follow the lore: Witchfire, Moonlight, Gather, Brew, Be Still, Full Moon, Slip Away. |

**The square demo** shows FF9's main trick. The Moonlight Witch from *Follow Me Down Witch Way* is a
chunky 3D model walking around a flat painting of the village square. She climbs the chapel steps, slides around
the well, and walks behind the lamp posts, the well and the roof in front, which cover her the way the real
objects would. Hilde hammers at her anvil, Agnes knits by the chapel, and Inkblot hops about and flies off if you
crowd him.

## Play it

Open **`dist/wickhollow-square.html`** in a browser. It is one file of about 3 MB, with everything inside.

| | Keyboard | Touch or mouse |
|---|---|---|
| Walk | arrow keys or WASD | tap or click where to go |
| Talk, next line | Space, Enter or E | tap the person, then tap the box |
| Behind the scenes | B | the button, top right |
| Show the layers | L | the button, top right |

In **the airship demo**, tap anywhere on the map to fly over it, or steer with the arrow keys or WASD. Tap a
town's name (or "Fly to") and she flies there and lands. Space lands when a town is near, or takes off from a dock.
**Map** shows the whole region; the ♪ button switches the flying music between Thareia's *Sunstone Wind* and
*Over the Wilds*. The map is Thareia's Gloomfen region, graded to night in code, until art batch 2's world map
comes back.

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

## Folders

| Folder | What it holds |
|---|---|
| `dist/` | the built game: `wickhollow-square.html` to play, plus a copy without the `<html>` wrapper for hosts that add their own |
| `src/` | the engine and the game |
| `scenes/` | one JSON file per painted screen: the camera, the walkmesh, the cut-outs, the lights and the exits |
| `art/` | the painting, dialogue portraits and pixel fonts, copied from *Follow Me Down Witch Way* |
| `tools/` | build, dev server, screenshots, and `overlay.py`, which draws a scene file over its painting |
| `tests/` | rule tests (Node) and a browser test that plays the built game |
| `docs/` | `LORE.md` (the story), `SLICE.md` (the route and battles), `PLAN.md`, `art-requests/`, and `lore-sources/` (digests of both games' lore) |
| `vendor/` | Aethermoor's battle and loot rules, and Thareia's sound studio, copied from the New-game repo |
| `reference/` | `aethermoor-m7.zip`, the Aethermoor build, kept for its battle and loot systems |

## Commands

```
npm install            # three.js and esbuild
npm run serve          # play from source at http://localhost:8000, rebuilding as you edit
npm run build          # build every demo into dist/ (node tools/build.mjs airship builds one)
npm test               # rule tests for the camera and the walkmesh
node --test vendor/aethermoor/test/*.test.mjs   # Aethermoor's battle and loot tests
npm run test:browser   # build, then play the demos in headless Chromium
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
