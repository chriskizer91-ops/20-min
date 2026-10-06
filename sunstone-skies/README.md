# Sunstone Skies

The laptop version of the airship game set in Aethermoor. It started as a copy of the game in the
`airship-game-in-aethermoor-` repository, and from here it's its own game, built up in this folder only: two games,
the same ships over Chris's world. (Another version of the game is being made separately; this one is *Sunstone
Skies*.)

What's in it so far:

- **Six ships, levelled up**: the Captain's Skiff, Cutter, Brig and Frigate, and now the Galleon and the Man-o'-war,
  built from Chris's art packs for them. More detail, parts that move, damage you can see, and every garage part
  showing on the ship. The Captain can buy all six, and raiders sail all six (lighter versions of the big two).
- **Three charts**: Fair Winds, Rough Air and Black Sky, sailed by one Captain with one purse. Every voyage has a
  danger, and the port rates your ship's strength on the same scale, so you can see whether she's ready. Black Sky
  needs a strong ship.
- **Voyages**: runs of waves of raiders, longer and harder voyage by voyage, each ending with a named raider captain.
- **The map**: Aethermoor seen straight down, like a view from the air, sharper than before (4 m to a pixel), with a
  fine grain over the ground and trees standing up out of the woods when you fly low.
- **Sound and music**, all made in code: the wind and her timbers, rolling broadsides, hits that sound like what they
  hit, raiders going down, the abilities, and a quiet score that quickens in a fight.
- **Choosing what to shoot at**: a raider's hull, sails or crystals, each doing something different, with a firing
  board showing every battery's guns and reload, and the raider you're locked on.
- **Crystal power in flight**, the **photo camera**, a **flight guide** for the first flight, and **settings**.
- **The port and the garage**: bank your shards, pick the chart, buy ships and parts, tune the crystal power.
- **The Captain's levels**: renown wins levels, levels buy skill ranks in four skills, and skills unlock four abilities.
- **Free flight**, with everything unlocked, and **Explore**: no raiders, flight courses against the clock, and
  waypoints on the map.

The map, the sound, the settings, aiming at a part, the firing board, the photo camera, the guide, crystal power in
flight, Explore and the low-flying trees all come from the version of the game made with ChatGPT that Chris sent
(`reference/gpt-version/`), rewritten into this game.

It's built for a laptop with a keyboard and mouse. It's still the pieces, not the finished game.

## Open it

- **The game**: https://claude.ai/artifact/EL93WRMph8tSQ6YAbGE6Hz (or open `dist/game.html`).
- **The shipyard**: https://claude.ai/artifact/7N7Tjm1wmUy6TE48Gfg8JF (or open `dist/shipyard.html`): the six ships
  up close. Work their sails, helm, guns and damage, fit the garage's parts and shift the crystal power. **New / Old /
  Both** compares a ship with how she was. Drag to turn round her, scroll to zoom.
- `dist/hangar.html` is the old hangar page, with the four ships as they were.

Each is one file with everything inside, and works with no internet.

## Playing

The start screen offers **Carry on** (once there's a saved Captain), **A new Captain**, **free flight**, or
**Explore**. A new Captain starts over, so with one saved it asks for a second click. Progress saves in the browser by
itself, and so do the settings.

| Keys | |
|---|---|
| W / S | more sail / less sail |
| A / D or ← → | turn |
| Space / E or ↑, Shift / Q or ↓ | climb, dive |
| Mouse | aim: the guns on that side fire; hold the aim on a raider and the guns lock on and lead it |
| Left click or F | fire |
| T | aim at the raider's hull, sails or crystals |
| R | crystal power: your own tuning, to the sails, or to the guns |
| Z · X · V · B | Crystal Surge · Double Shot · Damage Control · Sunstone Ward (once unlocked) |
| Enter · P | after a wave: fly on · put in to port. In port, Enter sets sail |
| 1–6 | in port: sail another ship you own |
| O | the photo camera |
| Esc | the settings (the game waits while they're open). With the mouse locked to the view, the first Esc lets it go |
| C · M · H | look ahead · the map · hide the keys |

### Aiming, and the firing board

Lock on to a raider (hold the aim on her) and **T** picks what the guns aim at:

| Aim at | What it does |
|---|---|
| Her hull | Sinks her when it's gone: full pay |
| Her sails | Torn sails slow her and spoil her turning: she can't run or bring her guns round so fast |
| Her crystals | Brings her down fastest (they break before the hull does), but the loot shatters: half pay |

The **firing board** (bottom left) shows the four batteries round a plan of the ship, each with its guns and its
reload, and the one facing where you look picked out. The line under the crosshair says whether that battery is ready,
reloading or out of reach. The **target** panel (right) shows the raider you're locked on, how far off she is and what's
left of her hull, sails and crystals. A mark by the crosshair says what your last shots hit, and for how much.

### Crystal power in flight

**R** shifts the crystal power without going to port: your own tuning from the garage, most of it to the **sails**
(faster), or most of it to the **guns** (quicker reloads, a little more damage). The lift keeps a fifth either way.
Back in port it's your own tuning again.

### The photo camera, the guide and the settings

- **O** opens the photo camera: the game stops, the HUD goes, and you can fly the camera round your ship (drag, and the
  mouse wheel to come closer). There's a lens from wide to long, the light, and **Save picture**, which puts a picture
  in your downloads. O or Esc goes back to flying.
- The **flight guide** shows a few tips the first time you fly, each moving on once you've done it. It can be turned
  off, or shown again, in the settings.
- The **settings** (Esc, or the gear) hold the sound and music and their volumes, the mouse speed, how much the camera
  shakes, the size of the HUD, and the guide.

### Explore

No raiders: just you, every ship and part, and Aethermoor. **Flight course** puts six rings in the sky ahead at
different heights: fly through them in order (the next is gold) against the clock; each ship's best time is kept.
Open the map (**M**) and click anywhere to set a **waypoint**: the panel points the way and counts down the distance,
and a marker shows where it is. The photo camera is at its best here.

### Charts, voyages and danger

One Captain sails three charts, with one fleet and one purse: the shards won on an easier chart buy the ships, parts
and skills a harder one needs. The garage's first tab, **Charts**, picks the chart for the next voyage.

| Chart | Its raiders | First voyage | Pay | Going down | Opens |
|---|---|---|---|---|---|
| Fair Winds | slower, slower to reload, aim wide | danger 1 | the least | keeps half the hold; the wave comes back weaker | from the start |
| Rough Air | as they're meant to be | danger 3 | 8% more than Fair Winds at the same danger | loses the hold; the wave comes back weaker | after two Fair Winds voyages |
| Black Sky | faster, quicker to reload, sharp-eyed | danger 6 | 17% more than Fair Winds at the same danger | loses the hold, and the wave comes back just as strong | after three Rough Air voyages |

A voyage is a run of waves: five on a chart's first voyage, one more on each voyage after, up to ten. Its **danger**
is its number on its chart, plus 2 on Rough Air and plus 5 on Black Sky, and the danger decides its raiders: how many,
in which ships, how tough, how well they shoot, and what they pay. So Rough Air's first voyage is as dangerous as
Fair Winds' third, and Black Sky's first as Fair Winds' sixth, with sharper raiders on top.

Each danger's raiders are a little tougher, hit a little harder and shoot a little straighter than the last, and bigger
classes join in: Skiffs and Cutters up to danger 3, Brigs from 4, Frigates from 5, Galleons from 7 and Men-o'-war from
9. Past danger 15, each danger is a tenth stronger than the last.

A big wave comes in pieces: the first group, then reinforcements once it's mostly down (a late wave can come in three
or four groups). The last wave of every voyage brings a named raider captain (Captain Rook, Black Meg, Old Sallow...)
in one of the biggest ships of the voyage, tougher than the rest and fitted with garage parts, with an escort. Beat
them and the voyage is done: the hold is banked with a quarter more, and the chart's next voyage waits.

### Strength: is she ready?

The port gives the ship you're sailing a **strength**, on the same scale as danger: the danger of the Rough Air voyages
she's ready for. It starts from her class and grows with her parts and your skills: her hull, crystals and sails, her
guns' damage and reload, and how well she turns and how fast she sails. The Charts tab sets it against each chart's
next voyage: **ready for it**, **a hard fight** (within 1.5 of what it needs), or **not ready**. Fair Winds' sloppy
raiders need a little less than the danger, and Black Sky's sharp ones more.

| Ship | Plain | Every skill at the top | Every part at Mk V | Half and half (skills at rank 3, parts at Mk II) | Everything |
|---|---|---|---|---|---|
| Skiff | 1.7 | 3.7 | 1.9 | 2.8 | 4.1 |
| Cutter | 1.9 | 4.1 | 2.8 | 3.5 | 5.5 |
| Brig | 2.7 | 5.3 | 4.6 | 5.0 | 8.1 |
| Frigate | 3.6 | 6.7 | 6.0 | 6.4 | 10.1 |
| Galleon | 4.1 | 7.5 | 7.0 | 7.4 | 11.6 |
| Man-o'-war | 5.9 | 10.1 | 10.4 | 10.4 | 15.9 |

What each chart's voyages need:

| Voyage | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Fair Winds | 0.7 | 1.7 | 2.5 | 3.5 | 4.3 | 5.3 | 6.2 | 7.2 | 7.9 | 9.0 |
| Rough Air | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| Black Sky | 6.6 | 7.7 | 8.9 | 9.9 | 10.9 | 11.9 | 13.3 | 14.1 | 14.8 | 16.2 |

Handling counts for a lot (a ship that can't bring her guns round doesn't win), so parts that slow a ship down add less
than you'd think, and the Helm skill and trim fins more. The skills' abilities count too, most in the big ships.

Black Sky is built to be out of reach without upgrades. No plain ship is ready for its first voyage, and its tenth is
a hard fight even for a Man-o'-war with every part at Mk V and every skill at the top: the simulated Captain wins about
three of its waves in four in her, most with under a third of her hull left. `docs/balance.md` has how strength is
worked out and how it was measured.

### Shards, the hold, and the choice after a wave

Every raider you bring down pays shards into the hold: more for bigger ships, in full when you sink it by its hull,
half when you break its crystals (you shattered the loot). After each wave you choose:

- **Fly on**: the hold pays a tenth more when it's banked, for every wave you fly on (up to half as much again), but
  the damage stays. The crew patch up a little.
- **Put in to port**: the hold is banked, the ship is repaired, and the garage opens.

**Going down** loses what's in the hold (on Fair Winds you keep half), and the wave is sailed again from port. The
ship, her parts and everything banked are safe. On Fair Winds and Rough Air the wave comes back weaker each time (the
raiders lost ships too), so no wave there is a wall. Black Sky shows no mercy: the wave comes back just as strong.

### The garage

| Tab | |
|---|---|
| Charts | Pick the chart for the next voyage: each chart's next voyage, its danger, and whether your ship is ready for it |
| Ships | Buy the next ship up: the Cutter (250 shards), the Brig (700), the Frigate (2,500), the Galleon (8,000), the Man-o'-war (15,000). Choose which to sail, and see each one's strength with your parts and skills |
| Parts | Buy parts and upgrade them (Mk I to V), and fit them into the ship's slots: one on the Skiff, up to six on the Man-o'-war. A part bought is yours on every ship. Each part shows what its next mark would do to your ship's strength |
| Tuning | Share the crystal power between sails (speed), guns (reload, a little damage) and lift (climbing). Free |
| Captain | Your level and renown, your skill points, and the highest danger you've beaten |

Every part gains something and costs something. These are their Mk I numbers. Each mark gains more (Mk III doubles
the gain, Mk V nearly triples it) and costs a little more (half as much again at Mk V). The port's shipwrights sell
Mk IV once you've beaten a danger 4 voyage, and Mk V once you've beaten danger 6.

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

The numbers (prices, parts, skills, the charts, each danger's waves, the strength rating) are in
`src/game/progress.js`, and `docs/balance.md` explains them, with what a simulated Captain did with them.
`node tools/sim-voyage.mjs` runs that Captain.

## Rebuilding and checking

```
npm install
node tools/build.mjs           # builds dist/game.html, dist/hangar.html and dist/shipyard.html
npm test                       # the progress rules: charts, levels, parts, waves, shards, strength
node tools/check.mjs           # plays the game: free flight, then a voyage; must end with "all good"
node tools/check-shipyard.mjs  # works the ships through the shipyard's panel; must end with "all good"
node tools/sim-voyage.mjs      # a simulated Captain sailing the charts (see docs/balance.md)
node tools/counts.mjs          # where each ship's triangles go
node tools/yard-shots.mjs      # pictures from the shipyard, into shots/
node tools/game-shots.mjs      # pictures of a fight, into shots/
node tools/map-shots.mjs       # pictures of the ground from the air, into shots/
```

After a change, build and publish `dist/game.artifact.html` and `dist/shipyard.artifact.html` to the two links above,
so they keep working.

The ships' code is in `src/fleet/` (one measurements file each); the progress rules in `src/game/progress.js`; the
voyages in `src/game/voyage.js`; the garage in `src/game/garage.js`; the abilities in `src/game/abilities.js`; the sound
in `src/game/sound.js`; the settings in `src/game/settings.js` and `settings-panel.js`; aiming and the firing board in
`src/game/board.js`; the photo camera in `photo.js`; the guide in `guide.js`; Explore in `explore.js`; the trees in
`ground.js`. What happens in a fight is announced in `events.js` for whichever of them wants to know.
The map's tiles, and the ideas and much of the code for the sound, the settings, aiming at a part, the firing board,
the photo camera, the guide, crystal power in flight, Explore and the trees, came from the version made with ChatGPT
that Chris sent (`reference/gpt-version/README.md`).
Everything else came from `chriskizer91-ops/airship-game-in-aethermoor-`, which was the starting point (the Galleon and
the Man-o'-war began as that game's models of them). Nothing more is taken from it: the rules for working here are in
`CLAUDE.md`.
