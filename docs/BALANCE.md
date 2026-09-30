# Moonlight in the Aether: battle balance

This is how the six fights of the slice (`SLICE.md` §2) are tuned: the targets, the numbers they come out at, why, and
how to check them again. The fights run on Aethermoor's rules (`vendor/aethermoor`), with the party and foes in its data
formats (`vendor/aethermoor/src/data/witch.js`, `moonlight-foes.js`) and the fights themselves in
`src/battle/encounters.js`.

- `node tools/balance.mjs` plays every fight 400 times for each of three scripted players and prints the table below.
- `node --test tests/balance.test.mjs` (part of `npm test`) replays 50 seeds of each and fails if a fight drifts out of
  its band. It takes about 10 seconds.

All the numbers here are from 400 seeds a row unless it says otherwise.

## 1. Targets

**Losing costs nothing** (SLICE §5, the user's decision): she wakes at her last rest with everything she had, and the
fight waits for her. So a loss is a lesson, not a punishment, and the targets are set on that:

- **Rabble fights (B1, B2, B4) should rarely beat sensible play.** They teach one idea each, and a sensible player who
  loses one has been unlucky, not careless. B4 is the one rabble fight with teeth, and a First Strike takes them out.
- **A boss may beat a careless first try.** Mashing Attack against the Gloamwing is a coin flip, and against the
  Boardwalk and the Lantern Mother it loses. The bosses reward reading the ribbon.
- **The Lantern Mother may beat a sensible first try about a third of the time.** SLICE §2 says "losing once is fine".
  An expert rarely loses to her.

| Fight | Target | Result (naive / sensible / expert) | |
| --- | --- | --- | --- |
| B1 lantern path | sensible ~100%, naive 95%+ | 100 / 100 / 100 | met |
| B2 twisted grove | sensible 95%+, naive 80%+ | 100 / 100 / 100 | met |
| B3 the Gloamwing | naive 40-65%, sensible 75-90%, expert 95%+ | 52 / 87 / 97 | met |
| B4 the Murkway | sensible with First Strike 90%+, without 70-85% | 7 / 76 / 90 without; 15 / 98 / 100 with | met |
| B5 the Long Boardwalk | sensible 65-80%, expert 90%+ | 4 / 72 / 93 | met |
| B6 the Lantern Mother | sensible 55-75% first try, expert 85%+ | 2 / 70 / 92 | met rested; see §7 for arriving straight from B5 |

The other targets:

| Target | Result |
| --- | --- |
| rabble fights 1-2 minutes | B1 1.0, B2 1.6, B4 2.3 (1.9 with a First Strike). B4 runs a little long: three heroes and three foes make a round about 30 seconds. |
| boss fights 4-6 minutes (SLICE: B3 about 3, B5 2-3, B6 4-5) | B3 3.0, B5 3.1, B6 5.0. Tuned to SLICE's shorter numbers for B3 and B5, which are the smaller bosses. |
| no fight won in 1-2 turns | fastest wins: B1 4 hero turns, B2 5, B3 14, B4 11, B5 16, B6 23 |
| Witchfire lands about 60-75% of the time | hits and crits 57-74% by fight, plus 13-18% grazes (half damage); 11-28% misses. The Lantern Mother's Guard is highest, so B6 is the low end. |
| every command is worth using | §8: every command has a fight where taking it away costs wins |
| Gather never does damage | it has no effects at all; `tests/balance.test.mjs` checks it in every fight with a Gatherable foe |
| no always-best move | §8: the best move changes by fight: Witchfire in B1-B3 and B5, Moonbeam in B4, Pinch and the jars in B6 |

## 2. How it is measured

Three scripted players (`tools/balance.mjs`, top of the file):

- **naive** mashes the basic attack (Witchfire, Peck, Nettie's stick) at the weakest foe, heals or drinks only when
  someone is under 20%, revives a fallen friend, and fires the Full Moon the moment it is full.
- **sensible** plays the aspects (Witchfire on Verdant and Ember-weak foes, Moonlight on Blight and Hollowed, never
  Moonlight on Radiant; Nettie's Tide on the Lantern Mother), heals at about 40%, Gathers when it is safe, Pinches what
  a foe holds, casts Silver Circle on a crowd, Hexes the biggest foe once, drinks Remembrance Incense on a spreading
  rot, and flees an optional fight that is plainly lost. It does not read the ribbon.
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
| B6 (both forms) | all three (4); Silas in Lights Out | 2% | 70% | 92% | 5.0 (3.7-6.5) | 39 | 27% |

"Lowest party HP" is the median over fights of the party's lowest total HP. The sensible player flees B4 3% of the
time and B5 8% (it counts as not winning; the fight waits). Brews drunk a fight (sensible): B1 0.3, B2 0.7, B3 0.8, B4
0.4, B5 0.8, B6 2.0.

Witchfire (the witch's basic attack, sensible): hit or crit / graze / miss

| B1 | B2 | B3 | B4 | B5 | B6 |
| --- | --- | --- | --- | --- | --- |
| 72 / 16 / 13 | 60 / 15 / 25 | 64 / 17 / 19 | 65 / 17 / 17 | 69 / 15 / 15 | 59 / 14 / 27 |

## 4. Fight by fight

**B1, the lantern path** (Hollowed Mandrake and Glowcap, level 1; witch and Inkblot, level 1). The tutorial. Both foes
are Verdant, so Witchfire (Ember) hits them half again as hard, and they can't hurt much (the worst of it is a Nip and
the Scream, which Staggers everyone and knocks her hat off). The sensible player Gathers the glowcap a quarter of her
turns (0.9 herbs a fight; the glowcap is needed for the Warming Balm) and still wins every time. Nobody flees: it is the
tutorial, so `noFlee`.

**B2, the twisted grove** (two Sour Wisps and a Lamp-Moth, level 1; witch and Inkblot, level 2). Optional; Wisp-Calm
skips it. Sour Wisps are Radiant, so Moonlight does half, and the witch has to use Witchfire (that is the lesson). Their
Cold Fire does most of the damage (14 HP a fight). Inkblot Pinches the moth's Wickhollow flame loose in two fights in
three. Everyone wins; at level 1 (a player who reached it without the story's level-up) it is still 93%.

**B3, the Gloamwing** (level 2 boss; witch and Inkblot, level 2). No fleeing. What decides it is the Moon-Dive, a
charge worth 3d6: the naive player eats it (23 HP a fight), the sensible one less (18), and the expert breaks it off
with Pinch (the moth is Flustered, which breaks a charge) or draws it onto a Guarding crow with Kraa! (8). Pinching the
Dawnbell loose (99% of sensible fights) turns off Call the Moths and Bell-Hum and drops its intent die from a d12 to a
d8. Bless (Warded plus a to-hit bonus) is the witch's other good move here. The naive player's 52% is right for a boss
that is meant to be read.

**B4, the Murkway** (a Hollowed Boglurcher, level 4, and two Hollowed Mire Leeches, level 1; all three heroes, level 3).
Optional. Every foe carries the Hollowed Omen: +4 speed, radiant does half again, its hits add Rotting, and Moonlight that
lands before its own first hit breaks the Omen (after that only Moonrise or Remembrance Incense does). This is the fight
for "whoever strikes first wins". With a First Strike (Moonlight on a foe's back in the field) the party gets the first
round, breaks 2.8 of the 3 Omens before any rot lands, and wins 98%. Without it, it breaks 1.8, the rest land their rot,
and it is 76%. The naive player never uses Moonlight, takes 23 HP of rot a fight and loses. The Boglurcher's Slam is
the big hitter.

**B5, the Long Boardwalk** (a Willow-Wight, level 6, and two Drowned Choristers, level 1; all three, level 3). Required,
and the last test. The Willow hits hard (Lash roots you, Bough-Fall is a 2d8 charge that Staggers) and weeps its
wounds shut; the Choristers chill and frighten. Nettie's heals carry it (Stir the Pot is her most-used move), Hex takes
the edge off the Willow, and Remembrance Incense clears the rot and Hexed. The expert's answer is Kraa! and Pinch on the
Bough-Fall: 10 HP a fight from it against the sensible player's 26.

**B6, the Lantern Mother** (the champion, level 5, in two forms; all three, level 4; Silas joins in the second form).
Required, no fleeing, the finale.

- *Lamplight* (her first phases): Lamp-Pole (1d10, her main damage), Lantern Flare (1d8 to everyone, DEX half), Lure
  (a charge: WIS or Charmed), Hush Now (WIS or Hexed). At half HP, *the Children's Road*: Lead Them Down (a charge: WIS
  or Led Away), the Moths, Mourning (WIS or Spooked, and Rotting).
- *Lights Out* (the second form, after the cut; `B6b`): the lamps go out, Silas steps out of the bow-lamp's flame and
  lights them again (Warded 1d8 for everyone), and she stops being gentle: Snuff (everyone Exposed), Lantern Nova
  (1d8 to everyone and Burning), and Drown the Light, a 3d10 Tide charge.
- She is Tide-weak, so Nettie's jars and thrown moonwater do half again; she holds two relics with grip meters, the
  Mourning Veil (Pinch it first: it turns Mourning off) and the Lamplighter's Lantern (Lure and Nova need it).
- What decides it: Drown the Light (53 HP a fight to the sensible player, 22 to the expert, who breaks it off with
  Pinch or wards it with Lantern Oil) and the Lamp-Pole. The expert pries the Veil 98% of the time and the Lantern 38%.

## 5. Party levels and XP

Every hero gets each won fight's full XP (Aethermoor's rules), and the XP to the next level is 30 × L^1.55 (level 2 at
30, 3 at 118, 4 at 283, 5 at 540). A fight's XP is its foes' (tier × level, +20% for an Omen). Two **story floors**
raise the party's XP at a story beat, so the brisk player who skips the optional fights meets every required fight at
the same level as the one who plays them all (`STORY_FLOORS` in `encounters.js`):

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
biggest knob there is: one level either way moves a boss by 25-40 points (§9).

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
brews a night get drunk in battle, which is what 8 moonwater minus the required three leaves.

## 7. The whole night

`node tools/balance.mjs --chain` plays the night in order: HP, MP and the bag carry from fight to fight; each won fight
gives Aethermoor's breather (+20% HP, +25% MP); a rest (the armchair, Silas's bench, the skiff deck, Nettie's hut) puts
everyone back to full; a loss puts her back at her last rest, whole, with the bag she had, and she tries again.
There is no rest between B2 and B3, or between B5 and B6 (SLICE).

300 nights each. "First try" is the chance to win that fight the first time it is met.

CHAIN_TABLE

What this shows:

- **B3 without a rest after B2** comes in at about 86% HP and is still in its band (sensible first try 77%).
- **B6 straight after B5 is the problem.** The party arrives at about 84% HP and three-quarters MP (Nettie's heals are
  what B5 costs), and the sensible first try drops from 70% to about B6_NOREST_S%. The retry comes from Nettie's hut,
  rested, so it is back at 70%, and the sensible player needs about B6_NOREST_TRIES tries. The expert is fine either way.
- **Suggestion: a rest before B6.** A lamp-post bench at the end of the Long Boardwalk, or Silas's kettle at the lip of
  Mother's Hollow, would put the first try in its band. Without it, the fight is harder the first time than the
  targets want, and a sensible player will probably lose it once (which SLICE allows: "losing once is fine").

## 8. Every command earns its place

`node tools/balance.mjs --ablate` plays each fight again with one command taken away from one hero (or one brew from the
bag) and reports the change in win rate. A big drop means the command matters there; about zero means it is a free
choice; a rise means the player uses it at the wrong time. 300 seeds a row, so differences under about 6 points are
noise. Commands used under 1% of turns are left out.

ABLATION_TABLE

The reading:

- **Every command matters somewhere.** Witchfire everywhere; Pinch in B3 and B6 (breaking the big charge, prying the
  relic); Bless in B3; Moonbeam and Silver Circle in B4 (the Hollowed); the jars in B4 and B6 (Tide on the Lantern
  Mother); Stir the Pot in B5; Kraa! for the expert in B4-B6; Heartsease in B2 and B3; Remembrance Incense in B4;
  Lantern Oil and Inkblot's Full Moon in B6.
- **Gather** costs nothing in B1 and B2 (where it is meant to be done) and costs a little in B4 without a First Strike:
  the Boglurcher's bogwick is a real trade there, which is right.
- **Hex** is cheap and never hurts, but it is a small effect: in B5 (600 seeds) the sensible player wins 81% with it and
  77% without; the expert is the same either way. It is the one command that could do with more (§11).
- **Stir the Pot in B6** was a trap before this pass (taking it away *raised* the sensible win rate 16 points, because the
  fight is a race and her jars are Tide against a Tide-weak boss). It now heals a die more at level 4 (3d8 + WIS), so it
  keeps up with the Lamp-Pole, and the gap is within noise for the sensible player and in its favour for the expert. The
  race is still the fight's lesson ("Tide against her weakness", SLICE §2): a healer who only heals makes it longer.

## 9. How sensitive it is

300 seeds a row (naive / sensible / expert).

**One level off the curve** (a player who skipped fights, or ground them):

| | one level lower | the curve | one level higher |
| --- | --- | --- | --- |
| B2 | 94 / 93 / 94 (level 1) | 100 / 100 / 100 | 100 / 100 / 100 |
| B3 | 19 / 56 / 75 | 52 / 87 / 97 | 81 / 98 / 100 |
| B4 | 3 / 45 / 64 | 7 / 76 / 90 | 16 / 96 / 99 |
| B5 | SENS_B5_LOW | 4 / 72 / 93 | SENS_B5_HIGH |
| B6 | SENS_B6_LOW | 2 / 70 / 92 | SENS_B6_HIGH |

**The Hag-Stone** (the witch's other relic: its Legend Surge is Through the Hole instead of Moonrise, +6 MP and +1 WIS)
is a sidegrade: B3 52 / 88 / 97, B4 5 / 77 / 91, SENS_HAG.

**Bags** (sensible / expert):

- B3: two Heartsease 92 / 100; none 72 / 91; a Hush Tea in place of the moonwater 87 / 98.
- SENS_BAGS

## 10. What changed

The party (`vendor/aethermoor/src/data/witch.js`), following LORE:

- **The witch** (hit die 10, WIS 16): Witchfire is her weapon, a relic (1d8 Ember, WIS, +1 to hit) whose Legend Surge
  is **Moonrise**: 2d8 + WIS radiant (a die more every 3 levels) at one foe, and every foe loses Hollowed. Moonlight
  is Silver Circle (3 MP, 1d4 radiant to every foe, and she sees each foe's next two intents), Moonbeam (3 MP, 2d6
  radiant, never misses) and Bless (2 MP, from level 2: +1 to hit and Warded 1d6 + WIS). Gather (0 MP) cuts a herb and does nothing else. Brew is the bag; Be Still is
  Defend; Full Moon is the Legend Surge; Slip Away is Flee.
- **Inkblot** (hit die 8, DEX 16, +1 speed, can't be Rooted): Peck with his beak (1d4 pierce); **Pinch** (2 MP: half
  damage, +2 to hit, 2d6 grip on what the foe holds, and Flustered, which breaks a charge); **Kraa!** (0 MP: every foe
  is Provoked onto him for a turn, and he Guards). His feather (from his nest, B3) gives Every Shiny Thing as his Surge.
- **Nettie** (hit die 8, WIS 16): **Mind the Jars** (2 MP: 1d6 + WIS Tide, bleeding on a failed DEX save), **Stir the
  Pot** (4 MP: heal 2d8 + WIS, 3d8 from level 4), **Bitterroot** (1 MP: cures Poisoned, Bleeding and Rooted, heals 1d6),
  **Hex** (1 MP, a quick turn: Hexed and Exposed for three turns, no save). She wears the Hexbane Shawl (Undo the
  Knot).
- **Brews**: Heartsease Tonic (heals 2d4 + 30%, or gets a fallen friend up at 30%), Hush Tea (Staggered, and it loses a turn unless it makes a WIS save),
  Moonwater (2d6 Tide), Remembrance Incense (everyone shakes off Rotting, Hexed and Unmade, and every foe loses
  Hollowed), Lantern Oil (everyone shakes off Exposed and Spooked, and is Warded 1d8), Warming Balm (cures Chilled and
  Frozen, and Hasted), and three duds from bad brewing. Wisp-Calm is a field brew only (skipping B2), not a battle item.

The foes (`vendor/aethermoor/src/data/moonlight-foes.js`): the Hollowed Omen; Flustered and In the Lamplight; the
Hollowed Mandrake and Silas; and variants of Aethermoor's lamp-moth (carries a Wickhollow flame), Willow-Wight (26 HP,
+8 damage: short and sharp), Gloamwing (84 HP, a 3d6 Moon-Dive, calls moths while the Dawnbell hums) and Lantern Mother
(48 and 40 HP, +6 damage, two forms). The rest (Sour Wisp, Glowcap, Boglurcher, Mire Leech, Drowned Chorister) are
Aethermoor's own, at the levels `encounters.js` gives them.

This pass's last changes: Stir the Pot a die more every 3 levels, not 4 (§8); the Lantern Mother +1 damage in both
forms, to keep her at her target with the stronger Stir; the Willow-Wight 24 → 26 HP and +6 → +8 damage (harder,
shorter); and the sensible player now Hexes only the biggest foe, once a fight.

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
  (Silas), `noFlee`, the First Strike and the bag. After B6's first form is won, `nextForm(state)` gives the second
  form (B6b, Lights Out) with the party, the bag and the grip meters carried over; ignore the first form's loot and
  XP and use B6b's. The cut between them needs a scene transition and Silas stepping out of the bow-lamp.
- **Pinch needs a relic chooser** when a foe holds two (the Lantern Mother's Veil and Lantern): pass `relic` with the
  command. Prying the Veil first is the expert's play.
- **Gather**: `src/battle/director.js` `GATHERS` has no entry for `hollowed-mandrake` (the simulator uses `mandrake`).
- **Held relics on a KO**: the fights are `gentle`, so a beaten holder drops its relics intact. LORE says some stay (the
  Wickhollow flames go home): filter what the loot screen shows.
- **The Dawnbell** is a mace, which none of the three can wield (Nettie refuses maces). Make it a charm or a trophy.
- **A rest before B6** (§7).
- **Hex** could do more. A cheap way: make it hit every foe for two turns (3 MP), or let it break a charge.
- **B5 runs 3.1 minutes** for the sensible player against SLICE's 2-3. Cutting the Choristers to one would bring it
  under 3, but it also makes it easier; a second Willow Bough-Fall face on the table would put the difficulty back.
- A few kit details go past LORE and could be cut if they read wrong: Hollowed gives +4 speed; Moonrise adds WIS;
  Kraa! gives full Guarding; Bitterroot also cures Rooted; Lantern Oil also clears Spooked.

## 12. Running it

```
node tools/balance.mjs                      # every fight, every player, 400 seeds (about 2 minutes)
node tools/balance.mjs B4 --n 1000          # one fight; B4 runs with and without a First Strike
node tools/balance.mjs B6 --policy expert --seed 17 --trace   # one fight, move by move
node tools/balance.mjs B3 --level 1         # off the curve
node tools/balance.mjs B6 --bag heartsease-tonic:1,lantern-oil:1 --wears witch:hag-stone
node tools/balance.mjs B5 --ban nettie:hex  # without a command
node tools/balance.mjs --ablate             # every command taken away in turn (slow)
node tools/balance.mjs --chain --paths typical,typical+rest   # the whole night
HURT=1 node tools/balance.mjs B6            # what hurt the party, by move
node --test tests/balance.test.mjs          # the fast check (npm test runs it)
```
