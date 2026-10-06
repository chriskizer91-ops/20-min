# Sunstone Skies

The laptop version of the airship game set in Aethermoor. It started as a copy of the game in the
`airship-game-in-aethermoor-` repository and is built up here, in this folder only, so the game itself is never
touched. (Another version of the game is being made separately; this one is *Sunstone Skies*.)

What's in it so far:

- **Six ships, levelled up**: the Captain's Skiff, Cutter, Brig and Frigate, and now the Galleon and the Man-o'-war,
  built from Chris's art packs for them. More detail, parts that move, damage you can see, and every garage part
  showing on the ship. The Captain can buy all six, and raiders sail all six (lighter versions of the big two).
- **Voyages**: runs of waves of raiders, longer and harder voyage by voyage, each ending with a named raider captain.
- **The port and the garage**: bank your shards, buy ships and parts, tune the crystal power.
- **The Captain's levels**: renown wins levels, levels buy skill ranks in four skills, and skills unlock four abilities.
- **Three difficulty settings**, and free flight with everything unlocked.

It's built for a laptop with a keyboard and mouse. It's still the pieces, not the finished game.

## Open it

- **The game**: https://claude.ai/artifact/EL93WRMph8tSQ6YAbGE6Hz (or open `dist/game.html`).
- **The shipyard**: https://claude.ai/artifact/7N7Tjm1wmUy6TE48Gfg8JF (or open `dist/shipyard.html`): the six ships
  up close. Work their sails, helm, guns and damage, fit the garage's parts and shift the crystal power. **New / Old /
  Both** compares a ship with how she was. Drag to turn round her, scroll to zoom.
- `dist/hangar.html` is the old hangar page, with the four ships as they were.

Each is one file with everything inside, and works with no internet.

## Playing

The start screen offers **Carry on the voyage** (once there's a saved Captain), a **new Captain** on one of the three
settings, or **free flight**. Progress saves in the browser by itself.

| Keys | |
|---|---|
| W / S | more sail / less sail |
| A / D or ← → | turn |
| Space / E or ↑, Shift / Q or ↓ | climb, dive |
| Mouse | aim: the guns on that side fire; hold the aim on a raider and the guns lock on and lead it |
| Left click or F | fire |
| Z · X · V · B | Crystal Surge · Double Shot · Damage Control · Sunstone Ward (once unlocked) |
| Enter · P | after a wave: fly on · put in to port. In port, Enter sets sail |
| 1–6 | in port: sail another ship you own |
| C · M · H | look ahead · the map · hide the keys |

### Voyages

A voyage is a run of waves; the first voyage has five, and each one after has one more, up to ten. A big wave comes
in pieces: the first group, then reinforcements once it's mostly down (a late wave can come in three or four groups).
The last wave of every voyage brings a named raider captain (Captain Rook, Black Meg, Old Sallow...) in one of the
biggest ships of the voyage, tougher than the rest and fitted with garage parts, with an escort. Beat them and the
voyage is done: the hold is banked with a quarter more, and the next voyage waits.

Each voyage's raiders are a little tougher, hit a little harder and shoot a little straighter than the last, and
bigger classes join in: Skiffs and Cutters on the first three voyages, Brigs from the fourth, Frigates from the fifth,
Galleons from the seventh and Men-o'-war from the ninth (a Galleon's captain ends the seventh, a Man-o'-war's the
eighth). Past the tenth voyage, every voyage is a tenth stronger than the last.

### Shards, the hold, and the choice after a wave

Every raider you bring down pays shards into the hold: more for bigger ships, in full when you sink it by its hull,
half when you break its crystals (you shattered the loot). After each wave you choose:

- **Fly on**: the hold pays a tenth more when it's banked, for every wave you fly on (up to half as much again), but
  the damage stays. The crew patch up a little.
- **Put in to port**: the hold is banked, the ship is repaired, and the garage opens.

**Going down** loses what's in the hold (on Fair Winds you keep half), and the wave is sailed again from port. The
ship, her parts and everything banked are safe, and the wave comes back weaker each time (the raiders lost ships too),
so no wave is a wall.

### The garage

| Tab | |
|---|---|
| Ships | Buy the next ship up: the Cutter (250 shards), the Brig (700), the Frigate (2,000), the Galleon (5,000), the Man-o'-war (9,000). Choose which to sail |
| Parts | Buy parts and upgrade them (Mk I to V), and fit them into the ship's slots: one on the Skiff, up to six on the Man-o'-war. A part bought is yours on every ship |
| Tuning | Share the crystal power between sails (speed), guns (reload, a little damage) and lift (climbing). Free |
| Captain | Your level and renown, and your skill points |

Every part gains something and costs something. These are their Mk I numbers. Each mark gains more (Mk III doubles
the gain, Mk V nearly triples it) and costs a little more (half as much again at Mk V). The port's shipwrights sell
Mk IV from the fifth voyage and Mk V from the seventh.

| Part | Gains | Costs | On the ship |
|---|---|---|---|
| Armour plate | +25% hull | −6% speed, −12% climbing | Dark riveted iron plates, an iron beak |
| Racing canvas | +10% speed | −25% sails | Pale silk sails, more ribs, gold stripes |
| Storm canvas | +40% sails | −5% speed | Heavy grey sailcloth |
| Long-focus guns | +25% range | −12% damage | Long barrels with glass lenses |
| High-angle mounts | +60% gun tilt | +12% reload time | Barrels raised on brass arcs |
| Heavy shot | +20% damage | −12% range | Bigger, heavier bolts |
| Rapid loaders | −15% reload time | −20% gun swing | |
| Crystal cage | +50% crystals | −15% power to share | A brass lattice over each crown of crystals |
| Overcharged vents | +25% climbing | −15% crystals | The lift vents under the keel glow brighter |
| Trim fins | +15% turning | −4% speed | |

Only one kind of canvas at a time. Prices are in `docs/balance.md`.

### Levels, skills and abilities

Renown comes from every raider brought down and every wave beaten. Each level is a skill point, for one of four
skills of six ranks each:

| Skill | Each rank | Rank 2 unlocks | Rank 4 | Rank 6 |
|---|---|---|---|---|
| Helm | +4% turning, +2% speed | **Crystal Surge** (Z): a burst of speed and turning, 6 s | lasts 9 s | back 10 s sooner |
| Gunnery | −5% reload time, +3% damage | **Double Shot** (X): the guns reload twice as fast, 8 s | two and a half times | back 10 s sooner |
| Crew | +5% hull, +20% repairs | **Damage Control** (V): patches up 30% of what's missing | 45% | back 15 s sooner |
| Crystals | +5% crystals, +3% power to share | **Sunstone Ward** (B): a shell of golden light round the ship; hits do half damage, 5 s | a third, for 7 s | back 12 s sooner |

The top level is 25, enough for every skill at rank 6.

### Difficulty

| | Raiders | Shards pay | Going down |
|---|---|---|---|
| Fair Winds | slower, slower to reload, aim wider | as they are | keeps half the hold |
| Rough Air | as they're meant to be | a quarter more | loses the hold |
| Black Sky | faster, quicker to reload, sharper-eyed | 40% more | loses the hold |

### Free flight

Every ship and every part at Mk V, every skill at the top rank, and the old endless waves (Galleons and Men-o'-war join
the later ones). **G** opens the garage between waves (the fight waits), and 1–6 changes ship at any time.

## The ships

| | Class | Length | Slots | Full detail (your ship) | Middle (raiders) | Far |
|---|---|---|---|---|---|---|
| Zephyr | Skiff | 8 m | 1 | 141,000 triangles | 10,000 | 2,000 |
| Gale | Cutter | 15 m | 2 | 152,000 | 14,000 | 2,600 |
| Tradewind | Brig | 25 m | 3 | 173,000 | 21,000 | 4,000 |
| Tempest | Frigate | 40 m | 4 | 216,000 | 35,000 | 6,200 |
| Doldrums | Galleon | 60 m | 5 | 195,000 | 40,000 | 6,000 |
| Thunderhead | Man-o'-war | 90 m | 6 | 213,000 | 46,000 | 6,800 |

Each keeps the size, guns, crystals and masts of the game's ship, so she flies and fights as before. (The Galleon and
the Man-o'-war are the game's own models of them, built from Chris's art packs, levelled up the same way.) What's new on
all four: a plum gun strake (or band) with gold pinstripes and gilt port lids, ribbed wing sails with a scalloped
edge, a gilt figurehead, glowing crystal pipes that pulse with the power shared to the sails, guns and lift, lift vents
under the keel, and every garage part showing. The Frigate also has her stern gallery, quarter galleries, boats, a
crow's nest, a double wheel and a belfry; the Brig her fighting tops and channels; the Cutter her raised bowsprit.

- **The Galleon, the Doldrums**, is the treasure ship, all plum and gold: two decks of eight gilt-lidded ports a side, a
  two-storey stern castle with rows of lit windows, stairs up both sides of it, a stern gallery and quarter galleries,
  a gilt sunburst on the bow, anchors at the catheads, a cargo boom swinging a net of treasure in over the main hatch,
  and chests of gold on deck, some open.
- **The Man-o'-war, the Thunderhead**, is the fortress: a hull of dark riveted iron plates with two plum gun strakes
  and two decks of twelve ports a side, battlements of iron round both castles, four guns out of the bow in square
  gilt ports round the ram, rows of castle windows, stairs up both sides of each castle, crow's nests on all three
  masts, and anchors at the catheads.

Raiders sail the Galleon and the Man-o'-war too, drawn at most at middle detail, so a fight with several of them stays
smooth.

Their parts work: the sails fold and furl, the rudder, wheel and belly fins answer the helm, the gun-port lids swing
up at battle stations, and the guns kick back when they fire. Damage shows: scorched and holed planks, torn sails,
crystals going dark one by one. Raiders fly the same ships in rust colours, and a raider captain's ship shows its parts.

`docs/ships.md` tells how the ships are built.

## Balance

The numbers (prices, parts, skills, the voyages' waves) are in `src/game/progress.js`, and `docs/balance.md` explains
them, with what a simulated Captain did with them. `node tools/sim-voyage.mjs` runs that Captain.

## Rebuilding and checking

```
npm install
node tools/build.mjs           # builds dist/game.html, dist/hangar.html and dist/shipyard.html
npm test                       # the progress rules: levels, parts, waves, shards
node tools/check.mjs           # plays the game: free flight, then a voyage; must end with "all good"
node tools/check-shipyard.mjs  # works the ships through the shipyard's panel; must end with "all good"
node tools/sim-voyage.mjs      # a simulated Captain sailing voyages (see docs/balance.md)
node tools/counts.mjs          # where each ship's triangles go
node tools/yard-shots.mjs      # pictures from the shipyard, into shots/
node tools/game-shots.mjs      # pictures of a fight, into shots/
```

After a change, build and publish `dist/game.artifact.html` and `dist/shipyard.artifact.html` to the two links above,
so they keep working.

The ships' code is in `src/fleet/` (one measurements file each); the progress rules in `src/game/progress.js`; the
voyages in `src/game/voyage.js`; the garage in `src/game/garage.js`; the abilities in `src/game/abilities.js`.
Everything else came from `chriskizer91-ops/airship-game-in-aethermoor-`.
