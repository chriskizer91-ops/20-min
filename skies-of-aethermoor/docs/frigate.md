# The Tempest, levelled up

**October 6, 2026.** The Captain's biggest ship, the Frigate, rebuilt in more detail and with parts that work. She
was built with the next round of features in mind (the plan Chris brought: choosing targets, raider personalities,
the garage, shards and difficulty), so the model already shows what those features will need it to show.

See her in `dist/shipyard.html`, and fly her in `dist/game.html` (key 4).

## What changed, and what stayed

She's the same ship in the game: 40 m long, the same ten gun ports a side, two bow and two stern chasers, three
crystal furnaces and three masts in the same places, and the same stats in `src/ships/index.js`. Her hit zones are
read off her own model the same way as before (`src/game/damage.js`). So she flies, fights and takes damage exactly
as the old Frigate did; `tools/check.mjs` still passes with her.

What changed is her look (the list is in the README) and that her parts move.

## How she's built

The code is in `src/flagship/`. It's built on the same recipe as every ship (`src/ship/`): a hull shaped from a side
outline and a top outline, dressed in the paint cut from Chris's Brig pictures, with everything else made in 3D.

| File | What it makes |
|---|---|
| `frigate.js` | Her measurements: outlines, decks, ports, masts, galleries, boats, lanterns |
| `hull.js` | The hull (with tumblehome and clean steps up to the raised decks), brass, channels, the stern gallery, quarter galleries, lift vents, armour plate |
| `guns.js` | Gun ports with hinged lids, broadside guns, chasers, in all four fittings |
| `crystals.js` | The furnaces, the crystal cage, the glowing conduits |
| `rigging.js` | Masts, tops, the crow's nest, ribbed wing sails (and the racing canvas), rigging, the bowsprit |
| `fittings.js` | Rails, stairs, the double wheel, binnacle, skylight, belfry, boats and davits, catheads and grapnels, the figurehead, lanterns, fins, the rudder |
| `rig.js` | The working parts: how a piece is tied to a control |
| `shaders.js` | What the materials add: moving parts, sail ripple, sail holes, scorch, the plum strake, dark crystals, power pulses |
| `materials.js` | The materials, a fresh set for each ship, and the Captain's and the raiders' colours |
| `build.js` | Puts her together and runs her working parts |

**Working parts without extra cost.** The old ships join each material's pieces into one mesh, so a ship is about a
dozen draw calls. The Tempest keeps that: each moving piece is tagged with a control, a pivot and an axis, and the
graphics card turns or slides it there. The sails, lids, guns, rudder, wheel and fins all move inside a few meshes,
36 draw calls in all at full detail.

**One model, many ships.** Her pieces are built once for each level of detail, and every ship drawn from them (the
Captain's, or each raider's) gets its own materials. That's what lets each raider show its own damage, its own sails
and its own gun lids.

**Fittings are separate meshes**, shown or hidden as the garage fits them, so changing parts is instant. Every gun is
built in all four fittings (plain, long-focus, high-angle, both) and the right one is shown.

## Ready for the next features

The plan for the next round of features, and what the model already does for each:

**Choosing a target (hull, sails or crystals).** The hit zones already existed. Now each kind of hit shows: scorched
and holed planks, torn sails, crystals going dark one by one. When you pick a target, you'll see it work, and you'll
see what a raider has left.

**Raider personalities.** The working parts let raiders give themselves away, which makes their tactics readable:
- a raider whose lids swing open on one side is about to fire that broadside (a warning you can react to)
- a raider letting out every sail with its wings spread wide is running
- glowing lift vents under a raider show it's putting power into climbing, to come at you from above

**Cloud breaks the lock.** Nothing needed from the model.

**Named captains in modified ships.** Raiders can wear garage fittings too. Armour plate and crystal cages show at
the middle detail raiders use. Racing canvas, long-focus guns and high-angle mounts only show at full detail, so a
named captain's ship should be drawn at full when it comes close.

**Put in to port, or fly on with the damage you have.** Damage now stays visible on her until it's repaired, so
flying on with a scorched hull and torn sails looks the part.

**The garage.**
- *Parts*: all five show on her (README, "The garage's parts show on her"). The Frigate's four slots are enforced in
  the shipyard; the other ships would get one to three when they're levelled up.
- *Tuning*: the crystal power shared between sails, guns and lift shows in the conduits, the yard-tip crystals and
  the lift vents. The shipyard's Power tab is a first go at the tuning screen.
- None of the parts or the tuning changes how she flies yet; that's for the game step.

**Shards.** A crystal kill that pays half because you shattered the loot reads well now: the crystals visibly go dark.

**Difficulty.** Nothing needed from the model.

## Detail budgets

| Level | Triangles | Draw calls | The old Frigate |
|---|---|---|---|
| Full (your ship, or one alongside) | 216,000 | 36 | 104,000, 17 |
| Middle (raiders in the fight) | 35,000 | 31 | 30,000, 17 |
| Far (raiders small on screen) | 6,200 | 15 | 4,700, 15 |

Full is about twice the old budget of 100,000 a ship. Only one ship is ever drawn at full, so a fight with six
raiders close enough for middle detail stays under about 430,000 triangles. `node tools/counts.mjs` shows where they
go. The rails' turned balusters are the biggest single cost (about 26,000); they'd be the first thing to trim if a
phone struggles.

## Questions for Chris

1. **The storm-bird figurehead**: is a gilt bird right for the Tempest, or should she carry something else?
2. **The plum gun strake with gilt lids**: keep it as the Captain's colours on every ship as they're levelled up?
3. **Should going down cost the shards you haven't banked?** My suggestion: yes, lose the unbanked shards, but keep
   the ship, her parts and everything banked. That's what makes "put in to port or fly on" a real choice: flying on
   risks the haul, not the ship. On Fair Winds you could keep half, so the easy setting stays gentle.

## Next

1. Level up the Brig, the Cutter and the Skiff the same way (each needs its own measurements file in
   `src/flagship/`).
2. Build the garage and tuning into the game, with what each part gains and costs in flight.
3. Then the features above.
