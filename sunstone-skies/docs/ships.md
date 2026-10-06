# The six ships, levelled up

**October 6, 2026.** The Captain's ships rebuilt in more detail, with parts that work: first the Frigate, then the
Brig, the Cutter and the Skiff, and last the Galleon and the Man-o'-war, from Chris's art packs for them. All six can be
bought in the garage, and raiders sail all six.

See them in `dist/shipyard.html`, and fly them in `dist/game.html` (keys 1 to 6).

## What changed, and what stayed

Each ship is the same ship as the game's (`src/ships/`): the same length, guns, crystals and masts in the same
places, and the same stats. Her hit zones are read off her own model the same way (`src/game/damage.js`), so she flies,
fights and takes damage as before. The Galleon and the Man-o'-war start from the game's own models of them, which were
measured off Chris's pictures of them (the side, top, front and back views in the art packs); this version's
`src/ships/galleon.js` and `manowar.js` are copied from the game unchanged.

What changed is their look and that their parts move.

## How they're built

The code is in `src/fleet/`. It's built on the same recipe as every ship (`src/ship/`): a hull shaped from a side
outline and a top outline, dressed in the paint cut from Chris's Brig pictures (the Man-o'-war's iron plates from her
own), with everything else made in 3D. Each ship has a measurements file: `skiff.js`, `cutter.js`, `brig.js`,
`frigate.js`, `galleon.js` and `manowar.js`.

| File | What it makes |
|---|---|
| `hull.js` | The hull (with tumblehome and clean steps up to the raised decks), planks or iron plates, brass, the strakes' gold pinstripes, channels, the stern gallery, quarter galleries, rows of castle windows, lift vents, armour plate |
| `guns.js` | Gun ports with hinged lids (in one row or two), broadside guns, chasers, bow guns through square ports, in all four fittings |
| `crystals.js` | The furnaces, the crystal cage, the glowing conduits |
| `rigging.js` | Masts, tops, crow's nests, ribbed wing sails (and the racing canvas), rigging, the bowsprit |
| `fittings.js` | Rails, stairs (one flight or a pair), castle faces with storeys of windows, wheels, binnacle, skylight, belfry, capstan, hatches, boats and davits, catheads, figureheads, lanterns, fins, the rudder; and the big ships' own work: anchors, battlements, the sunburst, the cargo boom and the treasure chests |
| `rig.js` | The working parts: how a piece is tied to a control |
| `shaders.js` | What the materials add: moving parts, sail ripple, sail holes, scorch, the plum strakes, dark crystals, power pulses |
| `materials.js` | The materials, a fresh set for each ship, and the Captain's and the raiders' colours |
| `build.js` | Puts a ship together and runs her working parts |

**Working parts without extra cost.** Each ship's pieces are joined into a few dozen meshes, one per material. Each
moving piece is tagged with a control, a pivot and an axis, and the graphics card turns or slides it there. The sails,
lids, guns, rudder, wheel and fins all move inside those meshes: 30 to 36 draw calls a ship at full detail.

**One model, many ships.** A ship's pieces are built once for each level of detail, and every ship drawn from them
(the Captain's, or each raider's) gets its own materials, so each raider shows its own damage, sails and gun lids.
The game builds a raider class's models the first time it needs them, and warms up a voyage's classes in port.

**Fittings are separate meshes**, shown or hidden as the garage fits them, so changing parts is instant. Every gun is
built in all four fittings (plain, long-focus, high-angle, both) and the right one is shown.

## The two big ships

**The Galleon, the Doldrums** (60 m), the treasure ship: two decks of eight ports a side, each deck with its own plum
strake and gilt lids; a stern castle two storeys high, with rows of lit windows down its sides between gilt sills, a
stern gallery round its upper storey and quarter galleries on its corners, and stairs up both sides of its front
wall, which has a door and windows of its own; a forecastle with ladders; four crystal crowns; two masts with channels
and fighting tops, and a crow's nest on the mainmast; a gilt sunburst with a sunstone at its heart on the bow; anchors
hanging from the catheads; a cargo boom on a samson post, swinging a net with a chest of crystals in over the main
hatch; and chests of gold on deck, two of them open and glowing.

**The Man-o'-war, the Thunderhead** (90 m), the fortress: a hull of dark riveted iron plates, with two plum strakes and
two decks of twelve gilt-lidded ports a side; castles at both ends, ringed with battlements of riveted iron instead of
rails; four guns straight out of the bow in square gilt ports round the ram; storeys of windows on the castles; stairs
up both sides of each castle; five crystal crowns; three masts, each with a crow's nest; and anchors at the catheads.

As raiders they're drawn at most at middle detail (40,000 and 46,000 triangles), since a late fight can have several.

## Detail budgets

| Ship | Full (your ship) | Middle (raiders) | Far |
|---|---|---|---|
| Skiff | 141,000 | 9,800 | 2,000 |
| Cutter | 152,000 | 13,500 | 2,600 |
| Brig | 173,000 | 21,000 | 4,000 |
| Frigate | 216,000 | 35,000 | 6,200 |
| Galleon | 195,000 | 40,000 | 6,000 |
| Man-o'-war | 213,000 | 46,000 | 6,800 |

About twice the game's old budget of 100,000 at full. Only the ship you fly, or a small raider right alongside, is ever
drawn at full. `node tools/counts.mjs` shows where the triangles go.

## The garage's parts on the ships

| Part | What you see |
|---|---|
| Armour plate | Dark riveted iron plates over the lower hull, and an iron beak round the bow |
| Racing canvas | Pale silk sails with more ribs, a rounder edge and gold stripes |
| Storm canvas | Heavy grey sailcloth |
| Long-focus guns | Longer barrels with glass lenses along them |
| High-angle mounts | Barrels raised on brass elevating arcs |
| Heavy shot | Bigger, heavier bolts in the fight |
| Crystal cage | A brass lattice dome over each crown of crystals |
| Overcharged vents | The lift vents under the keel glow brighter |

Rapid loaders and trim fins don't change a ship's looks. The crystal power shared between sails, guns and lift shows
in the conduits, the yard-tip crystals and the lift vents.

## Questions for Chris

1. **The plum strakes on the big two**: the Captain's plum and gold looks regal on the Galleon and stern on the
   Man-o'-war's iron. Keep it, or should the big ships keep the honey-brown planks of the art packs?
2. **The Galleon's sunburst and the Man-o'-war's battlements** are new: keep them?
3. **The figureheads** (the Frigate's storm-bird, the Brig's gull): still right?
