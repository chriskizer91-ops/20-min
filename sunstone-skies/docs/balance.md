# Balance: how the numbers fit together

**October 6, 2026.** Every number here lives in `src/game/progress.js` (and the ships' stats in `src/ships/index.js`).
They were set with a simulated Captain (`tools/sim-voyage.mjs`), a bot that plays the game on its own clock with the
same rules as a player. It isn't a good player: it flies straight at the nearest raider, keeps broadside ships side-on,
fires, and uses its abilities when they help. It never dodges, and it doesn't look after its crystals. So where the bot
wins comfortably, a person should too, and where the bot struggles, a person has to fly well. The aims:

- **One Captain, one purse, three charts.** The shards won on an easier chart buy the ships, parts and skills a harder
  one needs.
- **Fair Winds can be won from a fresh start**, in the Skiff, and its voyages ask for the ship a Captain is likely to
  have by then.
- **Black Sky can't be sailed without upgrades.** Each of its voyages needs a certain strength: the first, a Frigate
  or a Galleon with some parts and skills; the tenth, a Man-o'-war with everything.
- **Even with everything bought, the end of Black Sky is hard.** A Man-o'-war with every part at Mk V and every skill
  at the top wins about three waves in four of Black Sky's tenth voyage, most of them with less than a third of her
  hull left.
- **The run is long**: about five hours of fighting from the Skiff to the end of Black Sky's tenth voyage, more with
  time in port.

## The charts

| | Fair Winds | Rough Air | Black Sky |
|---|---|---|---|
| The danger of voyage v | v | v + 2 | v + 5 |
| Raiders sail at | 88% of the Captain's pace | 92% | 97% |
| Raiders take this long to reload, against the Captain's same guns | ×1.75 | ×1.5 | ×1.3 |
| Raiders' aim, off by | 2.6 m every 100 m | 2 m | 1.6 m |
| Pay | ×1.2 | ×1.3 | ×1.4 |
| Going down | keeps half the hold | loses the hold | loses the hold |
| A lost wave comes back | weaker | weaker | just as strong |
| Opens | from the start | after two Fair Winds voyages | after three Rough Air voyages |
| Its raiders' power, against Rough Air's (see Strength) | −0.6 | 0 | +0.5 |

A voyage's danger sets its raiders and how much they pay; its number on its chart sets its length (five waves on the
first, one more each voyage, up to ten). So Black Sky's first voyage is as dangerous as Fair Winds' sixth, with sharper
raiders, in five waves rather than ten.

## Danger

| Danger | Strength of the waves | At once | Raiders | Captain | Fair Winds | Rough Air | Black Sky |
|---|---|---|---|---|---|---|---|
| 1 | 2 to 3 | 3 | Skiff, Cutter | Cutter, escort 1 | voyage 1 (5 waves) | | |
| 2 | 3 to 6 | 4 | Skiff, Cutter | Brig, escort 1 | voyage 2 (6 waves) | | |
| 3 | 4 to 8 | 5 | Skiff, Cutter | Brig, escort 3 | voyage 3 (7 waves) | voyage 1 (5 waves) | |
| 4 | 6 to 11 | 6 | Skiff, Cutter, Brig | Frigate, escort 3 | voyage 4 (8 waves) | voyage 2 (6 waves) | |
| 5 | 8 to 15 | 8 | Cutter, Brig, Frigate | Frigate, escort 5 | voyage 5 (9 waves) | voyage 3 (7 waves) | |
| 6 | 9 to 17 | 9 | Cutter, Brig, Frigate | Frigate, escort 7 | voyage 6 (10 waves) | voyage 4 (8 waves) | voyage 1 (5 waves) |
| 7 | 12 to 20 | 10 | Cutter, Brig, Frigate, Galleon | Galleon, escort 8 | voyage 7 | voyage 5 (9 waves) | voyage 2 (6 waves) |
| 8 | 14 to 24 | 11 | Brig, Frigate, Galleon | Man-o'-war, escort 9 | voyage 8 | voyage 6 (10 waves) | voyage 3 (7 waves) |
| 9 | 16 to 26 | 13 | Brig, Frigate, Galleon, Man-o'-war | Man-o'-war, escort 11 | voyage 9 | voyage 7 | voyage 4 (8 waves) |
| 10 | 18 to 29 | 15 | Frigate, Galleon, Man-o'-war | Man-o'-war, escort 13 | voyage 10 | voyage 8 | voyage 5 (9 waves) |
| 11 | 21 to 34 | 17 | Frigate, Galleon, Man-o'-war | Man-o'-war, escort 16 | voyage 11 | voyage 9 | voyage 6 (10 waves) |
| 12 | 24 to 40 | 20 | Frigate, Galleon, Man-o'-war | Man-o'-war, escort 18 | voyage 12 | voyage 10 | voyage 7 |
| 13 | 28 to 41 | 22 | Frigate, Galleon, Man-o'-war | Man-o'-war, escort 26 | voyage 13 | voyage 11 | voyage 8 |
| 14 | 32 to 44 | 24 | Galleon, Man-o'-war, Frigate | Man-o'-war, escort 32 | voyage 14 | voyage 12 | voyage 9 |
| 15 | 38 to 52 | 29 | Galleon, Man-o'-war | Man-o'-war, escort 40 | voyage 15 | voyage 13 | voyage 10 |

"Strength of the waves" is the threat of a voyage's first and last waves before the raider captain's; the waves between
climb evenly. **Threat** is how much a raider counts: a Skiff 1, a Cutter 2, a Brig 3, a Frigate 4, a Galleon 6, a
Man-o'-war 8. It's how many Skiffs a raider is worth to a Captain fighting it, not its size: one big raider alone is
easy to out-turn, and what sinks a Captain is many guns coming from many sides. (Raider Men-o'-war are worth more than 8
to a Captain in a Man-o'-war: three of them are about as hard as six Galleons. So the top dangers climb less within a
voyage, and their captains bring big escorts, so a wave doesn't swing too much on which ships turn up.)

"At once" is the most threat that comes in together; the rest of a wave follows as reinforcements once the raiders in
the fight are mostly down. Past danger 15 each danger is a tenth stronger than the last.

Each danger's raiders are also a little better:

| Danger | Health | Damage | Reload time | Aim error |
|---|---|---|---|---|
| 1 | ×1.00 | ×1.00 | ×1.00 | ×1.00 |
| 3 | ×1.20 | ×1.12 | ×0.92 | ×0.88 |
| 5 | ×1.40 | ×1.24 | ×0.84 | ×0.76 |
| 7 | ×1.60 | ×1.36 | ×0.80 | ×0.64 |
| 8 | ×1.80 | ×1.46 | ×0.80 | ×0.60 |
| 10 | ×2.20 | ×1.66 | ×0.80 | ×0.60 |
| 12 | ×2.60 | ×1.76 | ×0.80 | ×0.60 |
| 15 | ×3.20 | ×1.91 | ×0.80 | ×0.60 |

**Raider captains** are half as tough again as the rest of their class, and a tenth more for each danger past 10 (twice
as tough at danger 15). They carry garage parts: Mk I at dangers 1 and 2, Mk II at 3 and 4, Mk III from 5, Mk IV from 12
and Mk V from 14. They no longer carry long-focus guns: at Mk IV those outranged the Captain by half again, and Iron Tam
(Black Sky voyage 8) beat a Man-o'-war with everything 8 times out of 8. With trim fins in their place, she lost 8 times
out of 8. A captain who fights from long range could come back as one of the raider personalities, with a way to beat
them.

**No wave is a wall on Fair Winds and Rough Air.** Each time the Captain goes down in a wave, it comes back weaker: 15%
fewer raiders each time, down to 45% of the wave, and a raider captain a tenth less tough each time (down to 70%). The
banner says so ("They lost ships last time too"). Black Sky has no such mercy.

## Strength

The port gives the ship the Captain is sailing a strength, on the same scale as danger: the danger of the Rough Air
voyages she's ready for. Each voyage needs a strength, and the Charts tab says how the ship stands: **ready for it**
(her strength is at least what it needs), **a hard fight** (within 1.5), or **not ready**.

How it's worked out:

1. **Power.** Raiders and the Captain's ship are both counted the way two fleets trading broadsides wear each other
   down: how much they can take, times how much they dish out, as a power of two (so one more is twice as strong). A
   danger's power is its typical wave's (the middle of a long voyage): its threat, and its raiders' health, damage,
   reload and aim at that danger. It climbs by about 2 a danger at first (each danger's raiders four times as strong
   as the last's), when each voyage brings a new ship, and by about half a danger from danger 9, when it's a part or
   a few skill ranks at a time.
2. **The kit factor** is what a ship's parts, the Captain's skills, the tuning and the abilities make of her: 1 for a
   plain ship. It multiplies her toughness (hull counts most, then crystals, then sails), her firepower (damage over
   reload time) and her handling (turning times speed), and half what the abilities add over a fight (Double Shot to
   firepower, the Sunstone Ward and Damage Control to toughness, Crystal Surge to handling).
3. **A ship's power** is her class's, plain, and 2.4 more for each doubling of the kit factor: Skiff 4.1, Cutter 4.6,
   Brig 5.6, Frigate 6.8, Galleon 7.4, Man-o'-war 8.9.
4. **Her strength** is the danger with that power. **A voyage needs** the strength whose power is its danger's, plus
   its chart's: Fair Winds' sloppy raiders are 0.6 less, Black Sky's sharp ones 0.5 more.

| Ship | Plain | Skills only (all at rank 6) | Parts only (Mk V) | Half (rank 3, Mk II) | At her best |
|---|---|---|---|---|---|
| Skiff | 1.7 | 3.7 | 1.9 | 2.8 | 4.1 |
| Cutter | 1.9 | 4.1 | 2.8 | 3.5 | 5.5 |
| Brig | 2.7 | 5.3 | 4.6 | 5.0 | 8.1 |
| Frigate | 3.6 | 6.7 | 6.0 | 6.4 | 10.1 |
| Galleon | 4.1 | 7.5 | 7.0 | 7.4 | 11.6 |
| Man-o'-war | 5.9 | 10.1 | 10.4 | 10.4 | 15.9 |

(Parts here fill her slots in this order: armour, heavy shot, rapid loaders, storm canvas, crystal cage, trim fins.)

What each voyage needs (danger · strength):

| Voyage | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Fair Winds | 1 · 0.7 | 2 · 1.7 | 3 · 2.5 | 4 · 3.5 | 5 · 4.3 | 6 · 5.3 | 7 · 6.2 | 8 · 7.2 | 9 · 7.9 | 10 · 9.0 |
| Rough Air | 3 · 3.0 | 4 · 4.0 | 5 · 5.0 | 6 · 6.0 | 7 · 7.0 | 8 · 8.0 | 9 · 9.0 | 10 · 10.0 | 11 · 11.0 | 12 · 12.0 |
| Black Sky | 6 · 6.6 | 7 · 7.7 | 8 · 8.9 | 9 · 9.9 | 10 · 10.9 | 11 · 11.9 | 12 · 13.3 | 13 · 14.1 | 14 · 14.8 | 15 · 16.2 |

So no plain ship is ready for Black Sky (a plain Man-o'-war is a hard fight on its first voyage), and its tenth voyage
is a hard fight even for a Man-o'-war at her best.

### How it was measured

`node tools/sim-voyage.mjs rate 16` sends each ship, in five kits (plain, skills only, parts only, half, at her best),
against a typical wave of one danger after another, 16 fights each: up while she wins three in four, down until she
does. Where she crosses three in four is her measured strength. The numbers above were fitted to 75 of those, on all
three charts, and match them to within about half a danger (0.44 typically). The biggest miss is a Man-o'-war at her
best, which the bot sails to danger 17.3 on Rough Air against the formula's 15.9.

What the measurements showed:

- **Handling counts a lot.** A ship that can't bring her guns round or get clear doesn't win. Armour and storm canvas
  slow a ship down, so parts alone help a Skiff hardly at all (1.7 to 1.9), and a Brig less than skills do.
- **Skills count more than parts in the small ships**, and the abilities they unlock count most in the big ones,
  whose fights are long.
- **A plain Galleon is barely stronger than a plain Frigate** (4.1 against 3.6): she turns like a barge. With a good
  kit she pulls well ahead (11.6 against 10.1).
- **Black Sky's raiders are worth about half a danger to a danger more** than Rough Air's at the same danger, and Fair
  Winds' a bit less than one danger less.

### The top of Black Sky

A Man-o'-war with every part at Mk V and every skill at rank 6, fresh from port for each wave, eight tries a wave
(`node tools/sim-voyage.mjs waves 8 only=best chart=black v=10`):

| Wave | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | Captain Rook |
|---|---|---|---|---|---|---|---|---|---|---|
| Won | 6/8 | 6/8 | 5/8 | 7/8 | 8/8 | 5/8 | 7/8 | 5/8 | 3/8 | 7/8 |
| Lowest hull when won | 26% | 34% | 28% | 32% | 29% | 23% | 28% | 27% | 36% | 24% |

59 of 80: about three in four, and even the wins leave her with about a quarter to a third of her hull. Getting through
the whole voyage without going down happens about one time in thirty. Black Sky's eighth voyage is a step easier
(about 19 waves in 20).

## The ships

| Ship | Price | Slots | Hull | Sails | Crystals | Speed | Turning | Climbing | Guns (bow · stern · a side) |
|---|---|---|---|---|---|---|---|---|---|
| Skiff | 0 | 1 | 300 | 150 | 150 | 8 | 10 | 10 | 1 · 0 · 1 |
| Cutter | 250 | 2 | 600 | 300 | 250 | 10 | 8 | 7 | 1 · 1 · 3 |
| Brig | 700 | 3 | 1,200 | 600 | 500 | 7 | 6 | 6 | 2 · 1 · 6 |
| Frigate | 2,500 | 4 | 2,200 | 1,000 | 900 | 8 | 5 | 5 | 2 · 2 · 10 |
| Galleon | 8,000 | 5 | 4,000 | 1,500 | 1,600 | 4 | 3 | 3 | 1 · 2 · 16 |
| Man-o'-war | 15,000 | 6 | 7,000 | 2,400 | 2,600 | 3 | 2 | 1 | 4 · 2 · 24 |

The Galleon and the Man-o'-war are slow and turn like barges, so buying one trades speed for a wall of guns; the skills
and parts (Helm, trim fins, racing canvas) win some of the handling back.

## Parts

Prices in shards, by mark. Each mark gains more (×1, ×1.5, ×2, ×2.4, ×2.8 of the Mk I gain) and costs a little more
(×1, ×1.15, ×1.3, ×1.4, ×1.5 of the Mk I cost). Mk IV is sold once a danger 4 voyage is beaten (on any chart), Mk V
once a danger 6 one is.

| Part | Gains (Mk I) | Costs (Mk I) | Mk I | Mk II | Mk III | Mk IV | Mk V |
|---|---|---|---|---|---|---|---|
| Armour plate | +25% hull | −6% speed, −12% climbing | 150 | 350 | 700 | 2,100 | 3,500 |
| Racing canvas | +10% speed | −25% sails | 120 | 300 | 600 | 1,750 | 3,050 |
| Storm canvas | +40% sails | −5% speed | 100 | 260 | 520 | 1,600 | 2,700 |
| Long-focus guns | +25% range | −12% damage | 140 | 340 | 680 | 2,000 | 3,350 |
| High-angle mounts | +60% gun tilt | +12% reload time | 110 | 280 | 560 | 1,700 | 2,900 |
| Heavy shot | +20% damage | −12% range | 160 | 380 | 760 | 2,250 | 3,850 |
| Rapid loaders | −15% reload time | −20% gun swing | 150 | 360 | 720 | 2,150 | 3,700 |
| Crystal cage | +50% crystals | −15% power to share | 130 | 320 | 640 | 1,900 | 3,200 |
| Overcharged vents | +25% climbing | −15% crystals | 100 | 260 | 520 | 1,600 | 2,700 |
| Trim fins | +15% turning | −4% speed | 100 | 260 | 520 | 1,600 | 2,700 |

## Skills and levels

Four skills of six ranks: Helm (+4% turning, +2% speed a rank), Gunnery (−5% reload time, +3% damage), Crew (+5%
hull, +20% repairs) and Crystals (+5% crystals, +3% power). Rank 2 unlocks the skill's ability, rank 4 makes it
stronger, rank 6 brings it back sooner. Each level is one skill point; the top level, 25, is enough for all 24 ranks.

Renown to reach a level: level 2: 50 · level 5: 920 · level 10: 4,770 · level 15: 11,620 · level 20: 21,470 ·
level 25: 34,320. Each level costs 120 more than the last.

## Shards and renown

| Raider | Pays at danger 1 | at danger 5 | at danger 10 | at danger 15 | Renown at danger 1 | Threat |
|---|---|---|---|---|---|---|
| Skiff | 18 | 21 | 24 | 28 | 10 | 1 |
| Cutter | 36 | 42 | 49 | 56 | 20 | 2 |
| Brig | 72 | 84 | 98 | 112 | 40 | 3 |
| Frigate | 132 | 153 | 180 | 206 | 75 | 4 |
| Galleon | 192 | 223 | 261 | 300 | 110 | 6 |
| Man-o'-war | 288 | 334 | 392 | 449 | 170 | 8 |

That's Fair Winds' pay; at the same danger Rough Air pays 8% more and Black Sky 17% more. Pay grows by 4% a danger
and renown by 5%: the later voyages pay more mostly because they have more and bigger raiders. A raider captain pays
and brings three times as much; a crystal kill pays half. Every wave beaten brings 10 renown and 5 more for each
danger.

Before the charts, pay grew by a tenth a danger, and the bigger fleets on top of that made the late voyages pay far
too well: the simulated Captain had everything bought two hours in and ended with 730,000 shards it couldn't spend.
The slower growth, dearer Mk IV and V parts, Frigate, Galleon and Man-o'-war, and dearer levels stretch that out to
about four hours. Something to spend the late shards on comes later (ship refits and bounties).

## What the simulated Captain did

`node tools/sim-voyage.mjs campaign 1500 60`: a new Captain, shopping in port as a sensible player would: skill points
to the skill with the fewest ranks; the next ship as soon as it can pay for it; saving for that ship once it's within
two voyages' pay; otherwise parts (armour, heavy shot, loaders, storm canvas, cage, fins) and their upgrades. Then it
sails the hardest chart its ship is ready for (once it has nothing left to buy, the hardest one that's a hard fight).
Game minutes are fight time on the game's clock, not counting time in port.

| Voyage | Danger | Done at (game minutes) | Level | Strength | Ships sailed | Times gone down |
|---|---|---|---|---|---|---|
| Fair Winds 1 | 1 | 6 | 2 | 1.7 | Skiff | 1 |
| Fair Winds 2 | 2 | 15 | 4 | 2.2 | Skiff, Cutter | 0 |
| Rough Air 1 | 3 | 38 | 6 | 3.5 | Brig | 1 |
| Fair Winds 3 | 3 | 41 | 6 | 3.6 | Cutter, Brig | 7 |
| Fair Winds 4 | 4 | 58 | 8 | 4.0 | Brig | 2 |
| Rough Air 2 | 4 | 85 | 9 | 4.1 | Brig | 3 |
| Rough Air 3 | 5 | 106 | 11 | 6.3 | Frigate | 0 |
| Rough Air 4 | 6 | 116 | 13 | 6.5 | Frigate | 1 |
| Fair Winds 5 | 5 | 119 | 13 | 6.5 | Brig, Frigate | 4 |
| Black Sky 1 | 6 | 127 | 15 | 7.9 | Frigate, Galleon | 0 |
| Black Sky 2 | 7 | 139 | 16 | 8.7 | Galleon | 3 |
| Black Sky 3 | 8 | 158 | 19 | 9.4 | Galleon | 4 |
| Rough Air 5 | 7 | 166 | 20 | 10.0 | Galleon | 0 |
| Black Sky 4 | 9 | 179 | 22 | 10.5 | Galleon | 1 |
| Rough Air 6 | 8 | 194 | 23 | 10.7 | Galleon | 0 |
| Black Sky 5 | 10 | 210 | 25 | 15.1 | Galleon, Man-o'-war | 0 |
| Black Sky 6 | 11 | 226 | 25 | 15.9 | Man-o'-war | 0 |
| Black Sky 7 | 12 | 243 | 25 | 15.9 | Man-o'-war | 0 |
| Black Sky 8 | 13 | 262 | 25 | 15.9 | Man-o'-war | 1 |
| Black Sky 9 | 14 | 285 | 25 | 15.9 | Man-o'-war | 2 |
| Black Sky 10 | 15 | 309 | 25 | 15.9 | Man-o'-war | 0 |

(A voyage's waves can be split: the bot left Fair Winds 3 at wave 5 to sail Rough Air 1 in its new Brig, and came back
to finish it. Each chart keeps its own place.)

What it shows:

- **The ships come at a steady pace**: the Cutter about ten minutes in, the Brig at half an hour, the Frigate at an hour
  and a half, the Galleon at two hours, the Man-o'-war at three and a half. Everything was bought (every skill at the
  top, the Man-o'-war's six parts at Mk V) at about three and three-quarter hours.
- **Black Sky opened at two hours**, once the bot's Frigate was strong enough, and from then on it was where the bot
  earned most. It went down 11 times there in all.
- **The hard spots** are Fair Winds 3 (a Cutter, short of the Brig it was saving for, against the first raider Brig),
  Fair Winds 5 (the first raider Frigates) and Black Sky 2 and 3 (new to Black Sky, in a Galleon still being fitted).
  In this run the bot won Black Sky's tenth voyage without going down, which is luck: it finished one wave with 1% of
  its hull, and the wave-by-wave test above says three in four.
- **Several of the bot's losses came with half its hull left**: it went down by its crystals, which it never protects.
  A person watching the crystal gauge (and a crystal cage) will do better.
- **The late shards still pile up**: about 100,000 at the end, with nothing left to buy. That's for step 4.

## Running the simulator

```
node tools/build.mjs game
node tools/sim-voyage.mjs campaign 1500 60          # a new Captain over the three charts, to Black Sky's tenth voyage
node tools/sim-voyage.mjs rate 16                   # the strength rating's measurements, on Rough Air
node tools/sim-voyage.mjs rate 16 black ships=brig,frigate,galleon,manowar   # and on Black Sky
node tools/sim-voyage.mjs waves 8 only=best chart=black v=10   # a kit through every wave of one voyage
node tools/sim-voyage.mjs wave black 8 10 ship=manowar ranks=gunnery:6,crew:6 parts=armour:5,heavyShot:5 runs=8
node tools/sim-voyage.mjs ladder 4                  # every kit against bigger and bigger groups of one class
```
