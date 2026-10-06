# Skies of Aethermoor: levelling up the Captain's ships

This folder is a working copy of the airship game from the `airship-game-in-aethermoor-` repository, made so the
Captain's ships can be improved here without touching the game itself. The first ship to get the treatment is the
biggest one the Captain can fly: **the Frigate, the Tempest**.

## Open it

- **The shipyard**: https://claude.ai/artifact/7N7Tjm1wmUy6TE48Gfg8JF (or open `dist/shipyard.html`): the Tempest in the shipyard. One file with everything inside; it works with no internet,
  on a phone or a laptop. Drag to turn round her, pinch or scroll to zoom. **New / Old / Both** at the top compares
  her with the Frigate as it was. On a phone, tap **Controls** for the panel.
- **The game**: https://claude.ai/artifact/EL93WRMph8tSQ6YAbGE6Hz (or open `dist/game.html`): the game, with the new Tempest in it. Press **4** (or tap *Tempest*) to fly her. Raider
  Frigates fly her too, in their rust colours.
- `dist/hangar.html` is the hangar page as it was, with the four ships before this work.

## What's new on the Tempest

She's the same 40 m ship, with the same guns, crystals and masts in the same places, so she flies and fights exactly
as before. What changed is how she looks and what moves.

**She looks like a frigate now.** Her sides lean in above the gun deck. A raised forecastle at the bow and a
quarterdeck at the stern step up from the main deck. Round her stern runs a gallery, a balcony with tall lit
windows, and a bay of windows bulges from each side near the stern. Her gun deck is painted the Captain's plum with
gold pinstripes, and her port lids are gilt, so with the lids shut her side shows a row of gold squares. Her masts
have fighting tops, and the mainmast has a crow's nest. A gilt storm-bird with raised wings leans out over the ram,
under a long bowsprit. Boats hang from davits at her quarters, and boarding grapnels hang from the catheads at her
bow. On deck there's a double wheel, a compass in its binnacle, a skylight over the great cabin, a belfry and a
capstan.

**Her wing sails are ribbed like a bat's wing**, with a scalloped edge and a plum stripe.

**Her parts work:**

| You do this | She does this |
|---|---|
| Take in sail | The canvas folds down onto its yard like a fan, and the yards swing back along the hull like a bird folding its wings |
| Let out sail | The wings spread wide and the canvas fills |
| Turn | The rudder swings and the double wheel spins |
| Climb or dive | The belly fins tilt like a fish's |
| Go to battle stations | The gun-port lids swing up and the guns run out |
| Fire a side | Its guns kick back into the hull and flash, then roll out again |

**Damage shows on her**, so you can see what each shot did:

- **Hull**: scorched planks, then dark holes with glowing edges.
- **Sails**: holes torn in the canvas, with burnt edges.
- **Crystals**: the crystals go dark one by one, and stop shedding sparks.

**The garage's parts show on her.** Each one changes how she looks, so you can tell a fitted ship at a glance:

| Part | What you see |
|---|---|
| Armour plate | Dark riveted iron plates over her lower hull, and an iron beak round the bow |
| Racing canvas | Pale silk sails with more ribs, a rounder edge and gold stripes |
| Long-focus guns | Longer barrels with glass lenses along them |
| High-angle mounts | Barrels raised on brass elevating arcs |
| Crystal cage | A brass lattice dome over each crown of crystals |

The Frigate has four part slots, so the shipyard lets you fit four of the five.

**Crystal power shows too.** Glowing pipes run from the furnaces to the masts (the sails' share), along both sides
of the deck to the guns (the guns' share), and down to lift vents along the keel (the lift's share). Pulses of light
run along each pipe, brighter and faster the more power it gets. Shift the shares in the **Power** tab and watch
them change.

## Detail

| | Triangles | Draw calls |
|---|---|---|
| Your own ship, close up (full) | 216,000 | 36 |
| A raider in the fight (middle) | 35,000 | 31 |
| A raider far off (far) | 6,000 | 15 |
| The old Frigate, full | 104,000 | 17 |

She has about twice the triangles of the old Frigate at full detail. Only the ship you fly, or one right alongside,
is ever drawn at full, so even a fight with six raiders all close enough for middle detail stays under about 430,000
triangles.

`docs/frigate.md` has the details, and how the model is ready for the game's next features.

After a change, build and publish `dist/shipyard.artifact.html` and `dist/game.artifact.html` to those two links, so
they keep working.

## Rebuilding and checking

```
npm install
node tools/build.mjs           # builds dist/game.html, dist/hangar.html and dist/shipyard.html
node tools/check.mjs           # the game's own checks, now flying the new Frigate: must end with "all good"
node tools/check-shipyard.mjs  # works the Tempest through the shipyard's panel: must end with "all good"
node tools/counts.mjs          # where her triangles go, part by part
node tools/yard-shots.mjs      # pictures of her from set views, into shots/
node tools/game-shots.mjs      # pictures of her in a fight in the game, into shots/
```

The code for the new Frigate is in `src/flagship/`; her measurements are in `src/flagship/frigate.js`. Everything
else came from `chriskizer91-ops/airship-game-in-aethermoor-` unchanged, apart from the two places the game now uses
her (`src/game/main.js` and `src/game/raiders.js`), the game page's name, and the hangar's sky, which moved into
`src/demo/sunset.js` so the shipyard can share it.
