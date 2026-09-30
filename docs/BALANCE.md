# Moonlight in the Aether: battle balance

This is how the six fights of the slice (`SLICE.md` §2) are tuned: the targets, the numbers they come out at, why, and
how to check them again. The fights run on Aethermoor's rules (`vendor/aethermoor`), with the party and foes in its data
formats (`vendor/aethermoor/src/data/witch.js`, `moonlight-foes.js`) and the fights themselves in
`src/battle/encounters.js`.

- `node tools/balance.mjs` plays every fight 400 times for each of three scripted players and prints the tables below.
- `node --test tests/balance.test.mjs` (part of `npm test`) replays 50 seeds of each and fails if a fight drifts out of
  its band. It takes about 10 seconds.

The numbers here are from 400 seeds a row unless it says otherwise.

## 1. Targets

**Losing costs nothing** (SLICE §5, the user's decision): she wakes at her last rest with everything she had, and the
fight waits for her. So a loss is a lesson, not a punishment, and the targets are set on that:

- **Rabble fights (B1, B2, B4) should rarely beat sensible play.** Each teaches one idea, and a sensible player who
  loses one has been unlucky, not careless. B4 is the one with teeth, and a First Strike takes them out.
- **A boss may beat a careless first try.** Mashing Attack against the Gloamwing is a coin flip, and against the
  Boardwalk and the Lantern Mother it loses. The bosses reward reading the ribbon.
- **The Lantern Mother may beat a sensible first try about a third of the time** ("losing once is fine", SLICE §2). An
  expert rarely loses to her, and the retry, rested, is easier.

Each fight on its own, with the party rested:

| Fight | Target | naive / sensible / expert | |
| --- | --- | --- | --- |
| B1 lantern path | sensible ~100%, naive 95%+ | 100 / 100 / 100 | met |
| B2 twisted grove | sensible 95%+, naive 80%+ | 100 / 100 / 100 | met |
| B3 the Gloamwing | naive 40-65%, sensible 75-90%, expert 95%+ | 52 / 87 / 97 | met |
| B4 the Murkway | sensible 70-85% without a First Strike, 90%+ with | without: 7 / 76 / 90; with: 15 / 98 / 100 | met |
| B5 the Long Boardwalk | sensible 65-80%, expert 90%+ | 4 / 72 / 93 | met |
| B6 the Lantern Mother | sensible 55-75% first try, expert 85%+ | rested (a retry): 2 / 78 / 97 | see below |

B3 and B6 come with no rest before them (SLICE: none between B2 and B3, or B5 and B6), so their real first try is with
the party as the fight before left it (§7):

| First try, walking in from the night | naive / sensible / expert | |
| --- | --- | --- |
| B3, straight from B2 | 49 / 77 / 92 | sensible met; expert a shade under 95% |
| B6, straight from B5 (typical path; brisk in brackets) | - / 60-66 (63-65) / 90-91 (92-94) | met |

The other targets:

| Target | Result |
| --- | --- |
| rabble fights 1-2 minutes | B1 1.0, B2 1.6, B4 2.3 (1.9 with a First Strike). B4 runs a little long: three heroes and three foes make a round about 30 seconds. |
| boss fights 4-6 minutes (SLICE: B3 about 3, B5 2-3, B6 4-5) | B3 3.0, B5 3.1, B6 4.7. B3 and B5 follow SLICE's shorter times. |
| no fight won in 1-2 turns | fastest wins: B1 4 hero turns, B2 5, B3 14, B4 11, B5 16, B6 23 |
| Witchfire lands about 60-75% of the time | hits and crits 56-74% by fight, plus 13-18% grazes (half damage); 11-28% misses. The Lantern Mother has the highest Guard, so B6 is the low end. |
| every command is worth using | §8: every command has a fight where taking it away costs wins |
| Gather never does damage | it has no effects at all; `tests/balance.test.mjs` checks it in every fight with a foe to Gather from |
| no always-best move | §8: Witchfire is the witch's mainstay, but in B4 she should hardly use it (Moonbeam and Silver Circle on the Hollowed); Pinch decides B3 and matters little in B4-B5; Nettie's jars decide B6 and barely matter in B5, where Stir the Pot does |

## 2. How it is measured

Three scripted players (`tools/balance.mjs`, top of the file):

- **naive** mashes the basic attack (Witchfire, Peck, Nettie's stick) at the weakest foe, heals or drinks only when
  someone is under 20%, revives a fallen friend, and fires the Full Moon the moment it is full.
- **sensible** plays the aspects (Witchfire on Verdant and Ember-weak foes, Moonlight on Blight and Hollowed, never
  Moonlight on Radiant; Nettie's Tide on the Lantern Mother), heals at about 40%, Blesses a hurt friend in a boss
  fight, Gathers when it is safe, Pinches what a foe holds, casts Silver Circle on a crowd, Hexes the biggest foe once,
  drinks Remembrance Incense on a spreading rot, and flees a fight that is plainly lost (the bosses can't be fled). It
  does not read the ribbon.
- **expert** is sensible play plus the ribbon: for each hero it works out what will hit whom before that hero's next
  turn and how likely each hit is to drop someone, and answers the biggest danger: heal or ward before a hit lands,
  Pinch (Flustered) or Hush Tea a charge, Kraa! a big hit onto a Guarding crow, Moonlight a Hollowed foe before it
  strikes, pry the Veil before the Lantern, and hold brews for when they matter.

**Time.** 6 seconds a hero turn (choosing and watching), 3 seconds a foe or guest turn, 1 second a lost turn. A round of
three heroes and three foes is about half a minute.

**Noise.** At 400 seeds a win rate of 70% is good to about ±2 points (one standard error), and a difference between two
runs of under about 6 points (at 300 seeds) is noise. Seeds are fixed (seed 1 + 7919 × i), so a rerun gives the same
numbers.

**Each fight is played on its own**, with the party at the level the XP curve gives it (§5), at full HP and MP, with the
bag a sensible player most often arrives with (§6). §7 plays the whole night in order, carrying HP, MP and the bag over.

## 3. Results

| Fight | Party (level) | naive | sensible | expert | sensible minutes (10th-90th) | hero turns | lowest party HP (sensible) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| B1 | witch, Inkblot (1) | 100% | 100% | 100% | 1.0 (0.8-1.4) | 8 | 76% |
| B2 | witch, Inkblot (2) | 100% | 100% | 100% | 1.6 (1.1-2.3) | 11 | 60% |
| B3 | witch, Inkblot (2) | 52% | 87% | 97% | 3.0 (2.3-4.0) | 25 | 41% |
| B4 | all three (3) | 7% | 76% | 90% | 2.3 (1.6-3.1) | 18 | 44% |
| B4, First Strike | all three (3) | 15% | 98% | 100% | 1.9 (1.6-2.6) | 16.5 | 64% |
| B5 | all three (3) | 4% | 72% | 93% | 3.1 (2.0-4.1) | 24 | 42% |
| B6, rested (both forms) | all three (4); Silas in Lights Out | 2% | 78% | 97% | 4.7 (3.3-6.1) | 37 | 36% |
| B6, straight from B5 | all three (4) | - | 66% | 91% | 4.9 (3.5-6.3) | 38 | 30% |

"Lowest party HP" is the median over fights of the party's lowest total HP. The sensible player flees B4 3% of the
time and B5 8% (counted as not winning; the fight waits). Brews drunk a fight (sensible): B1 0.3, B2 0.7, B3 0.8, B4
0.4, B5 0.8, B6 2.0. The expert takes a little longer than the sensible player (it heals and wards more, and loses less).

Witchfire (the witch's basic attack, sensible player): hit or crit / graze / miss, in %

| B1 | B2 | B3 | B4 | B5 | B6 |
| --- | --- | --- | --- | --- | --- |
| 72 / 16 / 13 | 60 / 15 / 25 | 64 / 17 / 19 | 65 / 17 / 17 | 69 / 15 / 15 | 58 / 15 / 28 |

## 4. Fight by fight

**B1, the lantern path** (Hollowed Mandrake and Glowcap, level 1; witch and Inkblot, level 1). The tutorial, so no
fleeing. Both foes are Verdant, so Witchfire (Ember) hits them half again as hard, and they can't hurt much: a Nip, and
the Scream, which Staggers everyone and knocks her hat off. The sensible player Gathers the glowcap a quarter of her
turns (0.9 herbs a fight; the glowcap is needed for the Warming Balm) and still wins every time.

**B2, the twisted grove** (two Sour Wisps and a Lamp-Moth, level 1; witch and Inkblot, level 2). Optional; Wisp-Calm
skips it. Sour Wisps are Radiant, so Moonlight does half and the witch has to use Witchfire: that is the lesson. Their
Cold Fire does most of the damage (14 HP a fight). Inkblot Pinches the moth's Wickhollow flame loose in two fights in
three. Everyone wins. At level 1 (a player who somehow missed the story's level-up) it is still 93%.

**B3, the Gloamwing** (level 2 boss; witch and Inkblot, level 2). No fleeing. What decides it is the Moon-Dive, a 3d6
charge: the naive player eats it (23 HP a fight), the sensible one a bit less (18), and the expert breaks it off with
Pinch (a Flustered foe loses its charge) or draws it onto a Guarding crow with Kraa! (8). Pinching the Dawnbell loose
(99% of sensible fights) turns off Call the Moths and Bell-Hum and drops the moth's intent die from a d12 to a d8. Bless
is the witch's other good move here. The naive player's 52% is right for a boss that is meant to be read.

**B4, the Murkway** (a Hollowed Boglurcher, level 4, and two Hollowed Mire Leeches, level 1; all three heroes, level 3).
Optional. Every foe carries the Hollowed Omen: +4 speed, radiant hits it half again as hard, its hits add Rotting, and
Moonlight that lands before its own first hit breaks the Omen (after that only Moonrise or Remembrance Incense can).
This is the fight for "whoever strikes first wins". With a First Strike (Moonlight on a foe's back in the field) the
party gets the first round, breaks 2.8 of the 3 Omens before any rot lands, and wins 98%. Without it, it breaks 1.8,
the others land their rot before Incense or Moonrise strips them, and it is 76%. The naive player never uses Moonlight,
takes 23 HP of rot a fight, and loses. The Boglurcher's Slam is the big hitter.

**B5, the Long Boardwalk** (a Willow-Wight, level 6, and two Drowned Choristers, level 1; all three, level 3). Required,
and the last test. The Willow hits hard (Lash roots you, and Bough-Fall is a 2d8 charge that Staggers) and weeps its
wounds shut; the Choristers chill and frighten. Nettie's heals carry it (Stir the Pot is her most-used move, and taking
it away costs 11-12 points), Hex takes the edge off the Willow, and Remembrance Incense clears Rotting and Hexed. The
expert's answer to the Bough-Fall is Kraa! and Pinch: it takes 10 HP a fight from it, against the sensible player's 26.

**B6, the Lantern Mother** (the champion, level 5, in two forms; all three, level 4; Silas joins in the second form).
Required, no fleeing, the finale.

- *Lamplight*. She takes the party for lost children, and her first move is always **Come In Out of the Wet**: every
  hero heals 30% of their HP and gets 6 MP back. Then: Lamp-Pole (1d10 and her +6 damage, her main hit), Lantern
  Flare (1d8 to everyone, DEX for half), Lure (a charge: WIS or Charmed) and Hush Now (WIS or Hexed). At half HP, *the
  Children's Road*: Lead Them Down (a charge: WIS or Led Away), the Moths, and Mourning (WIS or Spooked, and Rotting).
- *Lights Out* (the second form, after the cut; `B6b`): the lamps go out, Silas steps out of the bow-lamp's flame and
  lights them again (Warded 1d8 for everyone), and she stops being gentle (+7 damage): Snuff (everyone Exposed),
  Lantern Nova (1d8 to everyone, and Burning) and Drown the Light, a 3d10 Tide charge.
- She is Tide-weak, so Nettie's jars and thrown moonwater do half again. She holds two relics with grip meters: the
  Mourning Veil (Pinch it first: it turns Mourning off) and the Lamplighter's Lantern (Lure and Nova need it).
- What decides it: Drown the Light (48 HP a fight to the sensible player, 23 to the expert, who breaks it off with
  Pinch or wards it with Lantern Oil) and the Lamp-Pole (49 against 24). The expert pries the Veil 98% of the time and
  the Lantern 33%. It is a race: the witch's Witchfire and Nettie's jars are the two moves the fight can't be won
  without.

## 5. Party levels and XP

Every hero gets each won fight's full XP (Aethermoor's rules), and the XP to the next level is 30 × L^1.55 (level 2 at
30, 3 at 118, 4 at 283, 5 at 540). A fight's XP is its foes' (tier × level, +20% for an Omen). Two **story floors**
raise the party's XP at a story beat, so the brisk player who skips the optional fights meets every required fight at
the same level as one who plays them all (`STORY_FLOORS` in `encounters.js`):

- relighting Silas at the wayside kettle, after B1: at least 30 XP (level 2);
- Nettie's hut, the middle turn, where Nettie joins: at least 160 XP (level 3, well on the way to 4).

| Fight | XP it gives | typical path (all six): XP, level | brisk path (B1, B3, B5, B6): XP, level |
| --- | --- | --- | --- |
| B1 | 14 | 0, level 1 | 0, level 1 |
| B2 | 21 | 30, level 2 | skipped (Wisp-Calm) |
| B3 | 96 | 51, level 2 | 30, level 2 |
| B4 | 50 | 160, level 3 | skipped |
| B5 | 128 | 210, level 3 | 160, level 3 |
| B6 | 550 | 338, level 4 | 288, level 4 |
| after | | 888, level 5 | 838, level 5 |

Inkblot joins in the square (before B1) and Nettie at her hut (before B4), each with the witch's XP. Levels are the
biggest knob there is: one level under the curve costs a boss fight 30-47 points of sensible wins, and one over adds
10-25 (§9).

## 6. Bags and the eight moonwater

The night has 8 moonwater (2 carried, 3 in Wickhollow, 3 at Nettie's). Three brews are required (Lantern Oil for Silas,
the Warming Balm, Hush Tea for Nettie), which leaves 5. The plan the simulator follows (`CHAIN` in
`tools/balance.mjs`) spends them as a sensible player would:

| Before | typical path | brisk path |
| --- | --- | --- |
| B1 | a Heartsease (the brewing tutorial) | a Heartsease |
| B2 | a Heartsease and a raw moonwater | (a Wisp-Calm, to skip B2) |
| B3 | | a Heartsease |
| B4 | Remembrance Incense and a second Lantern Oil (Nettie's cauldron) | |
| B5 | | Remembrance Incense and a second Lantern Oil |

Each fight's bag in `encounters.js` is the commonest bag a sensible player walks in with on the typical path: B1 a
Heartsease; B2 two Heartsease and a moonwater; B3 a Heartsease and a moonwater; B4 and B5 Lantern Oil, Remembrance
Incense and a moonwater; B6 Lantern Oil and a moonwater (the rest went in B5). A loss gives her the bag back. About five
brews a night get drunk in battle, which is what the 8 moonwater leave after the required three.

## 7. The whole night

`node tools/balance.mjs --chain` plays the night in order: HP, MP, the Full Moon meter and the bag carry from fight to
fight; each won fight gives Aethermoor's breather (+20% HP, +25% MP); a rest (the armchair, Silas's bench, the skiff
deck, Nettie's hut) puts everyone back to full; a loss puts her back at her last rest, whole, with the bag she had, and
she tries again (up to six times). There is no rest between B2 and B3, or between B5 and B6 (SLICE).
`node tools/balance.mjs B6 --arrive` plays one fight as the night leaves the party.

300 nights each; the chance to win each fight the first time it is met:

| | typical, sensible | typical, expert | brisk, sensible | brisk, expert |
| --- | --- | --- | --- | --- |
| B1 | 100% | 100% | 100% | 100% |
| B2 | 99% | 100% | - | - |
| B3 (no rest after B2 on the typical path) | 77% (walks in at 86% HP) | 90% | 93% | 99% |
| B4 | 79% | 93% | - | - |
| B5 | 74% | 94% | 79% | 97% |
| B6 (no rest after B5) | 60% (walks in at 83% HP, 73% MP) | 90% | 63% | 94% |
| lost fights a night | 1.5 | 0.3 | 0.9 | 0.1 |
| if there were a rest before B6: B6 | 72% | 95% | 74% | 98% |

Naive play almost never finishes the night (1% on the typical path, 6% brisk, with six tries a fight): it loses B4, B5
and B6 over and over. That is right; a player who never uses Moonlight on the Hollowed or Nettie's Tide on the Lantern
Mother hasn't played the game the fights teach.

**Why the Lantern Mother tends the party first.** Straight from B5, the party walks into B6 at about 83% HP and 73% MP
(B5 costs Nettie most of her MP), and the fight is long. Tuned as it first was, that took the sensible first try from
70% (rested) down to about 30%, and the expert's from 91% to 76%: the fight was one thing rested and another after the
Boardwalk, and no one setting of her numbers fit both. Her opener, Come In Out of the Wet (heal 30% and 6 MP, capped at
full), makes the gap small: a rested party gains nothing from it, a battered one gains a lot. It is her, too: she is
"kind, and wrong", and she means to take them home. With it, the first try straight from B5 is 60-66% sensible and
90-94% expert, and the retry (rested, from Nettie's hut) is 78% and 97%.

If the game adds a rest before B6 after all, nothing needs changing (72-74% sensible, 95-98% expert). If she should not
heal the party, take out her `opener` in `moonlight-foes.js` and add a rest before B6 instead, or lower her damage
(Lights Out +7 back to +5) and accept a 30-35% sensible first try straight from B5.

## 8. Every command earns its place

`node tools/balance.mjs --ablate` plays each fight again with one command taken away from one hero (or one brew from the
bag) and reports the change in win rate. A big drop means the command matters there; about zero means it is a free
choice; a rise means the player uses it at the wrong time. 300 seeds a row, so differences under about 6 points are
noise.

Change in win rate without the command, sensible / expert (a blank: not in that fight; ·: used on under 1% of turns):

| Command | B1 | B2 | B3 | B4 | B5 | B6 (rested) |
| --- | --- | --- | --- | --- | --- | --- |
| Witchfire | -12 / -11 | -10 / -5 | -60 / -33 | +2 / -1 | -52 / -48 | -38 / -14 |
| Moonbeam | · | · | · | -4 / -1 | -2 / 0 | · |
| Silver Circle | · | · | · | -6 / -5 (-14 / 0 with a First Strike) | 0 / · | · |
| Bless | · | · / 0 | -8 / -1 | · / +1 | · | +10 / -3 |
| Gather | 0 / 0 | · / 0 | · | +6 / -1 | · | · |
| the witch's Full Moon (Moonrise) | · | · | · | -2 / -2 | -1 / · | 0 / · |
| Peck | -2 / -2 | -6 / -2 | -36 / -7 | -26 / -4 | -22 / -1 | -5 / 0 |
| Pinch | · | 0 / 0 | -30 / -19 | · / -1 | · / -4 | -7 / -4 |
| Kraa! | · | 0 / 0 | -4 / -1 | -2 / -4 | -3 / -2 | 0 / -3 |
| Inkblot's Full Moon | · | 0 / 0 | 0 / -1 | 0 / 0 | +1 / 0 | -10 / +1 |
| Mind the Jars | | | | -9 / -6 | -1 / · | -37 / -10 |
| Stir the Pot | | | | +2 / -3 | -11 / -12 | +6 / -1 |
| Bitterroot | | | | +1 / -1 | · / 0 | · |
| Hex | | | | · / -3 | -7 / -4 | · / -1 |
| Nettie's stick | | | | +1 / 0 | -1 / +2 | 0 / -2 |
| Heartsease Tonic | 0 / 0 | -3 / -2 | -15 / -6 | · | · | · |
| Remembrance Incense | | | | -10 / -18 | 0 / 0 | · |
| Lantern Oil | | | | · | · | -7 / 0 |
| Moonwater | | | | · | · | -2 / -1 |

The reading:

- **Every command matters somewhere.** Witchfire nearly everywhere; Pinch in B3 and B6 (breaking the big charge,
  prying the relic); Bless and Heartsease in B3; Moonbeam, Silver Circle and Remembrance Incense in B4 (the Hollowed);
  the jars in B4 and B6; Stir the Pot and Hex in B5; Kraa! for the expert in B4-B6; Lantern Oil and Inkblot's Full
  Moon in B6. Bitterroot, the Full Moons and Moonwater are small, occasional tools.
- **Gather** costs nothing in B1 and B2 (where it is meant to be done). In B4 without a First Strike the sensible player
  pays for the bogwick; that is a real trade, and it's right.
- **Bless and Stir the Pot in the finale.** The sensible player's habit of Blessing whoever is hurt costs 10 points
  against the Lantern Mother, and its heals about 6 (noise, nearly): B6 is a race, and a turn spent topping someone up
  is a turn not spent on Tide against a Tide-weak boss. The expert, who wards and heals only before a big hit lands,
  gains a little from both. Reading the ribbon is what the finale asks for, so this is kept. Two changes made it
  fair: Stir the Pot heals a die more from level 4 (3d8 + WIS), and before that change taking it away *raised* even
  the expert's win rate.
- **The Full Moons** come up at most about once a fight, and the policies fire them simply. Inkblot's Every Shiny Thing
  (a grip on everything held) matters in B6; Moonrise is the answer to a Hollowed foe that has already struck.

## 9. How sensitive it is

300 seeds a row, naive / sensible / expert.

**One level off the curve** (a player who skipped fights, or ground them):

| | one level lower | the curve | one level higher |
| --- | --- | --- | --- |
| B2 | 94 / 93 / 94 (level 1) | 100 / 100 / 100 | 100 / 100 / 100 |
| B3 | 19 / 56 / 75 | 52 / 87 / 97 | 81 / 98 / 100 |
| B4 | 3 / 45 / 64 | 7 / 76 / 90 | 16 / 96 / 99 |
| B5 | 1 / 39 / 80 | 4 / 72 / 93 | 22 / 95 / 99 |
| B6 (rested) | 0 / 31 / 61 | 2 / 78 / 97 | 10 / 96 / 100 |

**The Hag-Stone** (the witch's other relic: its Legend Surge is Through the Hole instead of Moonrise, +6 MP and +1
WIS) is a sidegrade that helps most in the long fights: B3 52 / 88 / 97, B4 5 / 77 / 91, B5 3 / 71 / 94, B6 4 / 86 / 97.

**Bags** (sensible / expert):

- B3: two Heartsease 92 / 100; none 72 / 91; a Hush Tea in place of the moonwater 87 / 98.
- B5: a Heartsease as well 86 / 98; no Incense 71 / 94.
- B6: Incense saved from B5 76 / 98; a Heartsease as well 83 / 99; a Hush Tea as well 77 / 99; an empty bag 60 / 94.

A Heartsease is worth 5-15 points to the sensible player in a boss fight. That is the moonwater economy working: the
choices at the cauldron matter.

## 10. What changed

The party (`vendor/aethermoor/src/data/witch.js`), following LORE. It is three, not Aethermoor's four, so the witch and
Nettie are a little sturdier than Aethermoor's scholars (a d10 hit die for the witch, +4 HP traits for all three):

- **The witch** (hit die 10, WIS 16): Witchfire is her weapon, a relic (1d8 Ember, WIS, +1 to hit) whose Legend Surge
  is **Moonrise**: 2d8 + WIS radiant (a die more every 3 levels) at one foe, and every foe loses Hollowed. Moonlight
  is Silver Circle (3 MP, 1d4 radiant to every foe, and she sees each foe's next two intents), Moonbeam (3 MP, 2d6
  radiant, never misses) and Bless (2 MP, from level 2: +1 to hit and Warded 1d6 + WIS). Gather (0 MP) cuts a herb and
  does nothing else. Brew is the bag; Be Still is Defend; Full Moon is the Legend Surge; Slip Away is Flee.
- **Inkblot** (hit die 8, DEX 16, +1 speed, can't be Rooted): Peck with his beak (1d4 pierce); **Pinch** (2 MP: half
  damage, +2 to hit, 2d6 grip on what the foe holds, and Flustered, which breaks a charge); **Kraa!** (0 MP: every foe
  is Provoked onto him for a turn, and he Guards). His feather (from his nest, B3) gives Every Shiny Thing as his Surge.
- **Nettie** (hit die 8, WIS 16): **Mind the Jars** (2 MP: 1d6 + WIS Tide, bleeding on a failed DEX save), **Stir the
  Pot** (4 MP: heal 2d8 + WIS, 3d8 from level 4), **Bitterroot** (1 MP: cures Poisoned, Bleeding and Rooted, heals 1d6),
  **Hex** (1 MP, a quick turn: Hexed and Exposed for three turns, no save). She wears the Hexbane Shawl (Undo the
  Knot).
- **Brews**: Heartsease Tonic (heals 2d4 + 30%, or gets a fallen friend up at 30%), Hush Tea (Staggered, and it loses a
  turn unless it makes a WIS save), Moonwater (2d6 Tide), Remembrance Incense (everyone shakes off Rotting, Hexed and
  Unmade, and every foe loses Hollowed), Lantern Oil (everyone shakes off Exposed and Spooked, and is Warded 1d8),
  Warming Balm (cures Chilled and Frozen, and Hasted), and three duds from bad brewing. Wisp-Calm is a field brew only
  (it skips B2), not a battle item.

The foes (`vendor/aethermoor/src/data/moonlight-foes.js`): the Hollowed Omen; Flustered and In the Lamplight; the
Hollowed Mandrake and Silas; and variants of Aethermoor's lamp-moth (carries a Wickhollow flame), Willow-Wight (26 HP,
+8 damage: short and sharp), Gloamwing (84 HP, a 3d6 Moon-Dive, calls moths while the Dawnbell hums) and Lantern Mother
(48 and 40 HP, +6 and then +7 damage, two forms, and Come In Out of the Wet). The rest (Sour Wisp, Glowcap, Boglurcher,
Mire Leech, Drowned Chorister) are Aethermoor's own, at the levels `encounters.js` gives them.

The last pass, after the whole night was played in order: Stir the Pot gains its die every 3 levels, not 4 (§8); the
Lantern Mother opens with Come In Out of the Wet and hits +6, then +7 in Lights Out (§7); the Willow-Wight went from 24
HP and +6 damage to 26 and +8 (harder and shorter); and the sensible player Hexes only the biggest foe, once a fight
(before, it hexed every Chorister, and Hex looked worse than it is).

**Rules changes** (all marked `// ADDED for the 20-min game`, listed in `vendor/aethermoor/README.md`; the 97 vendor
tests pass). The Hollowed Omen could not be data alone, because Aethermoor's Omens can't be broken:

- `rules/combat.js`: an Omen can have its own `weak` list; a foe whose hit lands is marked `struck`; a hero's damage
  with an aspect breaks an Omen with `breaks: <aspect>` on a foe not yet `struck`; a cleanse can strip Omens (`omens`,
  with `all` for every foe). 16 lines.
- `rules/battle.js`: a target kind `ally-any` (a standing ally, or a fallen one), so the Heartsease Tonic both heals and
  revives. 1 line.

## 11. For the battle screen and the design

- **Start fights with `startEncounter`** (`src/battle/encounters.js`), not `src/battle/engine.js`'s `startBattle`:
  that builds foes from family, level and variant only, so it drops the Omens (Hollowed), held relics, the ally
  (Silas), `noFlee`, the First Strike and the bag. To carry the night, pass the party's HP and MP in (`party` specs
  take `hp`, `mp` and `surge`) and give Aethermoor's breather after a win.
- **B6 is two fights.** After the first form is won, `nextForm(state)` gives the second (B6b, Lights Out) with the
  party, the bag and the grip meters carried over. Ignore the first form's loot and XP and use B6b's. The cut between
  them needs a scene transition and Silas stepping out of the bow-lamp.
- **Pinch needs a relic chooser** when a foe holds two (the Lantern Mother's Veil and Lantern): pass `relic` with the
  command. Prying the Veil first is the expert's play.
- **Gather**: `src/battle/director.js` `GATHERS` has no entry for `hollowed-mandrake` (the simulator uses `mandrake`).
- **Held relics on a KO**: the fights are `gentle`, so a beaten holder drops its relics intact. LORE says some go home
  (the Wickhollow flames): filter what the loot screen shows.
- **The Dawnbell** is a mace, which none of the three can wield (Nettie refuses maces). Make it a charm or a trophy.
- **The Lantern Mother's opener** (§7) is a design choice made here to fix a balance problem. It's a good story beat,
  but it is new: check it reads right, or swap it for a rest before B6.
- **Hex** is the weakest command: it helps in B5 and little anywhere else. A cheap boost: every foe for two turns (3 MP), or it
  breaks a charge.
- **B5 runs 3.1 minutes** for the sensible player against SLICE's 2-3, and the six fights take about 16 minutes of a
  35-minute typical night (plus about 1.5 lost fights). One Chorister fewer would bring B5 under 3 minutes, and a
  harder Willow would keep it hard.
- **B3 straight from B2** is a shade hard for the expert (92% against 95%). A Heartsease at the Sable bridge, or 80 HP
  on the Gloamwing, would fix it; it wasn't worth another pass.
- A few kit details go past LORE and could be cut if they read wrong: Hollowed gives +4 speed; Moonrise adds WIS;
  Kraa! gives full Guarding; Bitterroot also cures Rooted; Lantern Oil also clears Spooked.

## 12. Running it

```
node tools/balance.mjs                      # every fight, every player, 400 seeds (a few minutes)
node tools/balance.mjs B4 --n 1000          # one fight; B4 runs with and without a First Strike
node tools/balance.mjs B6 --arrive          # as the night leaves the party (no rest before it)
node tools/balance.mjs B6 --policy expert --seed 17 --trace   # one fight, move by move
node tools/balance.mjs B3 --level 1         # off the curve
node tools/balance.mjs B6 --bag heartsease-tonic:1,lantern-oil:1 --wears witch:hag-stone
node tools/balance.mjs B5 --ban nettie:hex  # without a command
node tools/balance.mjs --ablate             # every command taken away in turn (slow)
node tools/balance.mjs --chain --paths typical,typical+rest   # the whole night
HURT=1 node tools/balance.mjs B6            # what hurt the party, by move
node --test tests/balance.test.mjs          # the fast check (npm test runs it)
```
