# Balance: how the numbers fit together

**October 6, 2026.** Every number here lives in `src/game/progress.js` (and the ships' stats in `src/ships/index.js`).
They were set with a simulated Captain (`tools/sim-voyage.mjs`), a bot that plays the game on its own clock with the
same rules as a player. It isn't a good player: it flies straight at the nearest raider, keeps broadside ships side-on,
fires, and uses its abilities when they help. So where the bot wins comfortably, a person should too, and where the
bot struggles, a person has to fly well. The aim:

- **Voyage 1 is the Skiff's.** A new Captain can win it in the ship they start with.
- **Each voyage is sized for the ship and kit a Captain is likely to have by then**, and the last waves and the raider
  captain are the hard part.
- **A new ship is a big step**, and buying the next one is a goal for the voyage before it.
- **The run is long.** About two hours of fighting to reach the Man-o'-war and two and a half to finish the tenth
  voyage (more with time in port); the four skills fill up around the ninth voyage, and Mk V parts are for the last
  voyages.

## The ships

| Ship | Price | Slots | Hull | Sails | Crystals | Speed | Turning | Climbing | Guns (bow · stern · a side) |
|---|---|---|---|---|---|---|---|---|---|
| Skiff | 0 | 1 | 300 | 150 | 150 | 8 | 10 | 10 | 1 · 0 · 1 |
| Cutter | 250 | 2 | 600 | 300 | 250 | 10 | 8 | 7 | 1 · 1 · 3 |
| Brig | 700 | 3 | 1,200 | 600 | 500 | 7 | 6 | 6 | 2 · 1 · 6 |
| Frigate | 2,000 | 4 | 2,200 | 1,000 | 900 | 8 | 5 | 5 | 2 · 2 · 10 |
| Galleon | 5,000 | 5 | 4,000 | 1,500 | 1,600 | 4 | 3 | 3 | 1 · 2 · 16 |
| Man-o'-war | 9,000 | 6 | 7,000 | 2,400 | 2,600 | 3 | 2 | 1 | 4 · 2 · 24 |

The stats are the game's own (`docs/ships.md` in the game). The Galleon and the Man-o'-war are slow and turn like
barges, so buying one trades speed for a wall of guns; the skills and parts (Helm, trim fins, racing canvas) win some
of the handling back.

## Parts

Prices in shards, by mark. Each mark gains more (×1, ×1.5, ×2, ×2.4, ×2.8 of the Mk I gain) and costs a little more
(×1, ×1.15, ×1.3, ×1.4, ×1.5 of the Mk I cost). Mk IV is sold from the fifth voyage, Mk V from the seventh.

| Part | Gains (Mk I) | Costs (Mk I) | Mk I | Mk II | Mk III | Mk IV | Mk V |
|---|---|---|---|---|---|---|---|
| Armour plate | +25% hull | −6% speed, −12% climbing | 150 | 350 | 700 | 1,300 | 2,200 |
| Racing canvas | +10% speed | −25% sails | 120 | 300 | 600 | 1,100 | 1,900 |
| Storm canvas | +40% sails | −5% speed | 100 | 260 | 520 | 1,000 | 1,700 |
| Long-focus guns | +25% range | −12% damage | 140 | 340 | 680 | 1,250 | 2,100 |
| High-angle mounts | +60% gun tilt | +12% reload time | 110 | 280 | 560 | 1,050 | 1,800 |
| Heavy shot | +20% damage | −12% range | 160 | 380 | 760 | 1,400 | 2,400 |
| Rapid loaders | −15% reload time | −20% gun swing | 150 | 360 | 720 | 1,350 | 2,300 |
| Crystal cage | +50% crystals | −15% power to share | 130 | 320 | 640 | 1,200 | 2,000 |
| Overcharged vents | +25% climbing | −15% crystals | 100 | 260 | 520 | 1,000 | 1,700 |
| Trim fins | +15% turning | −4% speed | 100 | 260 | 520 | 1,000 | 1,700 |

## Skills and levels

Four skills of six ranks: Helm (+4% turning, +2% speed a rank), Gunnery (−5% reload time, +3% damage), Crew (+5%
hull, +20% repairs) and Crystals (+5% crystals, +3% power). Rank 2 unlocks the skill's ability, rank 4 makes it
stronger, rank 6 brings it back sooner. Each level is one skill point; the top level, 25, is enough for all 24 ranks.

Renown to reach a level: level 2: 50 · level 5: 740 · level 10: 3,690 · level 15: 8,890 · level 20: 16,340 ·
level 25: 26,040. Each level costs 90 more than the last.

## Shards and renown

| Raider | Pays (voyage 1, Rough Air) | Renown | Threat |
|---|---|---|---|
| Skiff | 19 | 10 | 1 |
| Cutter | 38 | 20 | 2 |
| Brig | 75 | 40 | 3 |
| Frigate | 138 | 75 | 4 |
| Galleon | 200 | 110 | 6 |
| Man-o'-war | 300 | 170 | 8 |

Pay and renown grow by a tenth each voyage; a raider captain pays and brings three times as much. A crystal kill pays
half. Every wave beaten brings 10 renown and 5 more for each voyage. The table shows Rough Air's pay, a quarter over
the bounties in `progress.js`; Fair Winds pays the bounties as they are, and Black Sky 40% over them.

**Threat** is how much a raider counts towards a wave's strength. It comes from the simulated fights below: it's how
many Skiffs a raider is worth to a Captain fighting it, not its size. One big raider alone is easy to out-turn; what
sinks a Captain is many guns coming from many sides, so the big ships count for less than their hull would say.

## Voyages

| Voyage | Waves | Strength of each wave | At once | Raiders | Captain |
|---|---|---|---|---|---|
| 1 | 5 | Skiff + Skiff, 2, 3, 3 | 3 | Skiff, Cutter | Cutter, escort 1 |
| 2 | 6 | 3, 4, 4, 5, 6 | 4 | Skiff, Cutter | Brig, escort 1 |
| 3 | 7 | 4, 5, 5, 6, 7, 8 | 5 | Skiff, Cutter | Brig, escort 3 |
| 4 | 8 | 6, 7, 8, 9, 10, 11, 12 | 6 | Skiff, Cutter, Brig | Frigate, escort 3 |
| 5 | 9 | 8, 9, 10, 11, 12, 13, 14, 15 | 8 | Cutter, Brig, Frigate | Frigate, escort 5 |
| 6 | 10 | 10, 11, 12, 13, 14, 15, 16, 17, 18 | 9 | Cutter, Brig, Frigate | Frigate, escort 7 |
| 7 | 10 | 12, 13, 14, 15, 16, 17, 18, 19, 20 | 10 | Cutter, Brig, Frigate, Galleon | Galleon, escort 8 |
| 8 | 10 | 13, 14, 15, 16, 17, 18, 19, 20, 21 | 10 | Brig, Frigate, Galleon | Man-o'-war, escort 8 |
| 9 | 10 | 18, 19, 21, 22, 24, 25, 27, 28, 30 | 15 | Brig, Frigate, Galleon, Man-o'-war | Man-o'-war, escort 12 |
| 10 | 10 | 20, 22, 23, 25, 27, 28, 30, 32, 34 | 17 | Frigate, Galleon, Man-o'-war | Man-o'-war, escort 14 |

"At once" is the most threat that comes in together; the rest of a wave follows as reinforcements once the raiders
in the fight are mostly down, so the late waves are long fights in three or four parts. The raider captain is half as
tough again as their class, and fitted with two to four parts (Mk I on the first voyages, Mk III from the fifth).
Past the tenth voyage the tenth is sailed again, a tenth stronger each time.

**No wave is a wall.** Each time the Captain goes down in a wave, it comes back weaker: 15% fewer raiders each time,
down to 45% of the wave, and a raider captain a tenth less tough each time (down to 70%). The banner says so ("They
lost ships last time too"). Without this, a Captain who can't beat a wave earns nothing and can't buy the ship they need
to beat it; the simulated Captain got stuck exactly like that before this rule.

Each voyage the raiders get a little better:

| Voyage | Health | Damage | Reload time | Aim error |
|---|---|---|---|---|
| 1 | ×1.00 | ×1.00 | ×1.00 | ×1.00 |
| 3 | ×1.20 | ×1.12 | ×0.92 | ×0.88 |
| 5 | ×1.40 | ×1.24 | ×0.84 | ×0.76 |
| 7 | ×1.60 | ×1.36 | ×0.80 | ×0.64 |
| 10 | ×2.20 | ×1.66 | ×0.80 | ×0.60 |

From the eighth voyage, when a Captain may be sailing a Man-o'-war, they toughen twice as fast.

## What the simulated Captain did

### A whole campaign on each setting

The bot started a new Captain and sailed ten voyages, shopping in port as a sensible player would: skill points to the
skill with the fewest ranks; the next ship as soon as it can pay for it; saving for that ship once it's within two
voyages' pay; otherwise parts (armour, heavy shot, loaders, storm canvas, cage, fins) and their upgrades. Game minutes
are fight time on the game's clock, not counting time in port.

**Rough Air** (as the raiders are meant to be):

| Voyage | Done at (game minutes) | Level at the end | Ships sailed | Times gone down | Shards at the end |
|---|---|---|---|---|---|
| 1 | 7 | 3 | Skiff | 2 | 81 |
| 2 | 23 | 4 | Skiff, Cutter | 7 | 123 |
| 3 | 46 | 6 | Cutter | 16 | 656 |
| 4 | 62 | 8 | Cutter, Brig | 5 | 440 |
| 5 | 83 | 12 | Brig, Frigate | 8 | 387 |
| 6 | 95 | 15 | Frigate, Galleon | 0 | 563 |
| 7 | 108 | 18 | Galleon | 0 | 6,933 |
| 8 | 121 | 21 | Galleon, Man-o'-war | 0 | 763 |
| 9 | 135 | 25 | Man-o'-war | 0 | 1,876 |
| 10 | 149 | 25 | Man-o'-war | 0 | 20,284 |

What each voyage paid: about 400, 530, 1,550, 2,300, 5,400, 6,400, 10,900 and 17,500 shards for voyages 2 to 9.

**Fair Winds**: the same ships at much the same points (Cutter on voyage 2, Brig at the end of 3, Frigate on 5,
Galleon on 7, Man-o'-war on 8), level 25 on voyage 9, 126 minutes, and only 9 times gone down in all.

**Black Sky**: the same ships at the same points, 166 minutes, 58 times gone down: 30 of them on voyage 3, in the
Cutter, and 8 each on voyages 4 and 5.

### Each kit through each wave

`node tools/sim-voyage.mjs waves` sends a kit (a ship, skill ranks and parts) through every wave of the voyage it's
likely to sail, fresh from port each time. On Rough Air, three tries a wave:

| Kit | Voyage | Waves won | Lowest hull, on average | Hardest wave |
|---|---|---|---|---|
| A new Skiff, nothing fitted | 1 | 15 of 15 | 59% | the third |
| The Skiff after voyage 1 (Mk I armour) | 1 | 14 of 15 | 63% | the raider captain |
| A new Cutter | 2 | 17 of 18 | 62% | the fifth |
| A Brig, new | 3 | 21 of 21 | 71% | the raider captain |
| A Brig, seasoned | 4 | 22 of 24 | 62% | the sixth |
| A Frigate, new | 5 | 27 of 27 | 64% | the seventh |
| The Frigate, near her best | 6 | 28 of 30 | 60% | the eighth |
| A Galleon, new | 7 | 30 of 30 | 55% | the ninth |

(That table was run before voyage 3 lost its Brigs and voyages 8 to 10 were retuned; run it again to see them.)

### What it shows

- **Voyage 1 is the Skiff's**, and a new Captain can win it without buying anything. The raider captain at the end is
  the hardest fight of it.
- **Voyage 3 is the hard one**: a Cutter against Old Sallow's Brig and the waves before her, while the Brig is still
  being saved for. It's where most of the going down happens on Rough Air and Black Sky, and where a Captain learns that
  the next ship matters. The wave-weakening rule always gets them through in the end.
- **The ships come at a steady pace**: the Cutter on voyage 2, the Brig around the end of voyage 3, the Frigate on 5,
  the Galleon at the end of 6 or on 7, the Man-o'-war on 8.
- **The last voyages are the easiest for the bot.** Once it has the Man-o'-war with Mk V parts, its hull never fell
  below 35% on voyages 8 to 10 (70 to 79% on average), and it ended with 20,000 shards and nothing left to buy. Bigger
  late fleets and tougher late raiders helped only a little: the next step is raiders that fight smarter (focusing
  fire, coming from two sides), and more to spend shards on late.
- **A person will do better than the bot** in a fight (dodging, picking targets, using the clouds), and may spend
  differently. The numbers are easy to change in `progress.js`, and the simulator shows what a change does in minutes.

## Running the simulator

```
node tools/build.mjs game
node tools/sim-voyage.mjs campaign rough 600 10      # a new Captain sailing ten voyages on Rough Air
node tools/sim-voyage.mjs waves rough 3              # every kit through its voyage's waves, three times each
node tools/sim-voyage.mjs ladder rough 4             # every kit against bigger and bigger groups of one class
node tools/sim-voyage.mjs wave rough 7 9 ship=galleon ranks=gunnery:5,crew:5 parts=armour:4,heavyShot:4 runs=4
```
