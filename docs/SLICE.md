# Moonlight & Mire: the slice

This is the play outline for one full-moon night, 20 to 40 minutes long. It has 11 field screens, 6 fights (4 of them required), 3 places to brew and 3 cut-scenes. The lore is in `LORE.md`.

Path keys:
- `20m/` = `/home/user/20-min/`
- `WW/` = `/home/user/follow-me-down-witch-way/`
- `TH:` = New-game branch `origin/claude/tender-babbage-4wiplk`
- `HH:` = New-game branch `origin/claude/cool-ptolemy-uc93gg`

## 1. The route

The route follows WW's own map. The lantern path leaves from the bottom of the square. The Hollow lies over the stone bridge in the square's top corner, through the twisted grove, which is a Wisp-Calm gate in WW. The witch visits the lantern path first, walks back up through the square, and then crosses the bridge.

| # | Screen | Painting | What happens | Herbs | People | Fight | Min |
|---|---|---|---|---|---|---|---|
| 1 | Cottage, inside | `20m/art/backgrounds/cottage-inside.webp` | The opening cut-scene ends here. Inkblot taps the round window with a flame in his beak, then flies off. She takes the hag stone and 2 moonwater. After the garden she comes back for the first brew (Heartsease). The armchair is the rest and save point. | — | Inkblot, at the window | — | 1-2 |
| 2 | Cottage garden | `20m/art/backgrounds/cottage-outside.webp` | Gathering tutorial. One lavender bed is grey. Moonlight shows a rot trail running down the path. A mandrake climbs out of its bed, and a glowcap waddles toward her lit window. | lavender, moonpetal, witch's bells | — | B1 | 2-3 |
| 3 | The lane | `20m/art/backgrounds/the-lane.webp` | Every bracket lantern is dark. She relights one with witchfire. It flickers as if it wants to leave. "Stay." | nightrose, moonpetal | — | — | 1 |
| 4 | Wickhollow square | `20m/art/backgrounds/wickhollow-square.webp` (demo 1) | This is the hub. Hilde talks about the lost lights ("Mine went Tuesday") and gives the Horseshoe charm. Agnes points to the chapel moss. The well gives moonwater, sharing three with the lantern path. Inkblot shows up again and heads for Quill's. | chapel moss | Hilde, Agnes, Inkblot | — | 2-4 |
| 5 | Quill's stall | `20m/art/backgrounds/quills-stall.webp` | Quill explains that the bird has been ferrying lights home all week, one at a time. "Take him. Everything's a swap." **Inkblot joins.** The swap shop opens. | — | Quill | — | 2 |
| 6 | The lantern path | `WW/witch_game_assets/backgrounds/lantern_path.webp` | Silas stands among his dark lanterns. His garden is here, and so are the wayside kettle, a moonwater source and a bench to rest and save. She brews Lantern Oil, his pole lights, and he gives her the Owl charm. She can also brew Wisp-Calm here. | witch's bells, ember-star lily, silver mugwort, lavender, wisp-sprout, bogwick | Silas | — | 4-5 |
| 7 | The Sable bridge | `20m/art/backgrounds/sable-bridge.webp` | Lamp-moths carry lights downriver under the arches. Moonlight shows Witch Way's first runestone. At the far end, sour wisps crowd the twisted grove. Wisp-Calm lets her by; otherwise she fights. | — | Rosalind (optional: a nightrose earns the Bell charm) | B2 (skip with Wisp-Calm) | 1-2 |
| 8 | The Hollow | `WW/witch_game_assets/backgrounds/hollow.webp` | A marsh graveyard. The iron gate stays shut. Inkblot's nest holds his lost tail feather. The Gloamwing hangs in the bone-hung trees, fat with light. After the fight, the rot trail runs off the Hollow's low end and down. | one hollowed bed; clean it for bogwick | — | B3 (boss) | 2-3 |
| 9 | The Murkway | `TH: thareia/art-in/scenes/walk-graveyard-path-night.png` | A plank path over black pools, past old fen graves. Hollowed patches are everywhere. Fog covers the low path, and Hag-Sight shows which planks hold. | hollowed patches (bogwick, lavender) | — | B4 (can walk round) | 2 |
| 10 | Nettie's hut, Long Boardwalk | **New art.** Layout reference: `HH: art-in/batch-3/map-long-boardwalk-a.png` | The lamp-posts burn with violet Wickhollow flames. The middle-turn cut-scene plays. She brews Hush Tea and **Nettie joins.** The rain-butt gives 3 moonwater, and there is a rest point and a cauldron (Remembrance Incense, more Lantern Oil). Then she goes on along the boardwalk. | — | Nettie | B5 | 4-6 |
| 11 | Mother's Hollow | **New art.** Layout reference: `HH: art-in/batch-3/map-mothers-hollow.png` | Black willows stand around a sunken house. Every window is lit with Wickhollow's lanterns. The Lantern Mother waits on the step. | — | The Lantern Mother | B6 (final) | 1, plus the fight |

**Optional rooms** add time on a longer run and are not counted in the 11. They use paintings that already exist:
- Hilde's smithy (`20m/art/backgrounds/smithy-inside.webp`), where she can temper one charm by +1.
- The graveyard (`graveyard.webp`), which has more chapel moss.
- The chapel (`chapel-inside.webp`), where Agnes tells her story.

**New field art: screens 10 and 11 only.** Paint them like batch 1: a 30° three-quarter view, at night, with the floor left empty. HH's Gloomfen maps are top-down daytime paintings, so use them only as layout references.

**Unused for now:** WW's stepping stones, pond, crypt and Sable riverbank. They're good for a longer cut.

## 2. The battles

| # | Where | Line-up | Difficulty | Backdrop | What it teaches |
|---|---|---|---|---|---|
| B1 | Garden gate, at the Gloamwood's edge | Hollowed Mandrake, Glowcap | Tutorial; you can't really lose | **New:** `battle-gloamwood-night` (stopgap: `TH: battle-forest-ruins.png` night-graded in code) | d20 rolls, grazes, intent dice, Witchfire beating Verdant, Gather, the "gentle" rule and the hat gag |
| B2 | The twisted grove, where it opens into the Hollow | Sour Wisp ×2 (A's `marsh-light`), Lamp-Moth | Easy | `TH: thareia/art-in/scenes/battle-graveyard-night.png`, which the battle demo already uses | Moonlight is weak against light (Radiant on Radiant is ×0.5). Inkblot's Pinch takes a flame. Wisp-Calm ends the fight. |
| B3 | The Hollow | The Gloamwing, which calls up to 2 Lamp-Moths | Medium: the first boss | `TH: thareia/art-in/scenes/battle-graveyard-night.png`, which already looks like the Hollow | Grip & Claim on the Dawnbell, Stagger cancelling a charge, Witchfire against a boss weak to Ember, the gold card slam |
| B4 | The Murkway | Boglurcher and Mire Leech ×2, all Hollowed | Easy if she strikes first, medium if not | `battle-graveyard-night.png` again | A First Strike from field Moonlight; Radiant against Blight, where the first hit wins |
| B5 | Long Boardwalk | Willow-Wight, Drowned Chorister ×2 | Hard: the last test before the boss | **New:** `battle-long-boardwalk` | Nettie's heals and Tide; Hexed and Rooted; Remembrance Incense |
| B6 | Mother's Hollow | The Lantern Mother: a champion with 3 phases who calls Lamp-Moths. Silas joins as a guest in phase 3. | Boss; losing once is fine | **New:** `battle-mothers-hollow` (stopgap: `TH: battle-dark-cathedral.png`, read as the sunken house) | Two grip meters, thrown moonwater and Nettie's Tide against her weakness, Lantern Oil against Lights Out |

**Lengths:**
- Rabble fights: about 1-2 minutes each.
- B5: about 2-3 minutes.
- B6: about 4-6 minutes.

The party goes from level 1 to about level 5.

## 3. Story beats

**Opening.** Painted stills, slow pans and text:
1. `20m/art/stills/moonrise.webp`: "When the moon rises, an old path wakes in the woods. They call it Witch Way." (This is WW's intro.)
2. `20m/art/stills/square-from-the-well.webp`: "This month, Wickhollow's lanterns started going out. One a night. No wind."
3. **New still**, `lights-down-the-sable`: "Each little flame lifts off its wick and floats down the Sable, like a leaf that knows where it's going."
4. `20m/art/stills/witch-at-her-door.webp`: "Where they pass, the riverbank goes grey." The witch: "Right. Boots. Basket. Hat."
5. The title, *Moonlight & Mire*, with "Follow me down" in gold.

**The middle turn.** This happens at Nettie's hut, on screen 10:
1. Nettie: "Your lamps weren't stolen. They were called."
2. **New still**, `the-night-misthollow-sank`. It shows the event, not the party, as TH decided for cut-scenes: a young lamplighter leads a line of children along the boardwalk through mist. Text: "A hundred years ago the water came up. The lamplighter led the children out, and went back for the last one."
3. Nettie: "They all got home. Nobody told her. She's still lighting the way, and every light she can't find, she borrows."
4. Nettie: "Where she takes the light, the rot comes in behind. That's your grey riverbank."
5. The witch: "So she's not a thief. She's someone who hasn't sat down in a hundred years." Nettie: "You'll have to fight her to sit her down. Then you can make her tea."

**The ending.** This plays after B6:
1. The veil falls. The Lantern Mother: "Are they safe? I was taking them home. The water came up the stair, and I went back for the last one…" (This line is A's.)
2. The witch: "Everyone got home. Every one. You can put the lamp down." She pours Hush Tea, and `20m/art/stills/witchfire-cauldron.webp` can cover the brewing.
3. **New still**, `lights-going-home`: the flames lift off the boardwalk and float back up the Sable.
4. **New still**, `two-lamplighters`: Wickhollow is lit again, and Silas and the Lantern Mother walk the lantern path. Text: "She didn't fade. Ghosts in Wickhollow don't. They walk the path together, and neither has finished a round since, because they talk."
5. Nettie, at the door: "If your village ever needs a witch, ask me. I'm not saying yes. I'm saying ask." (This is A's line, with one word changed.)
6. The grimoire opens to the Dawnbell's page: it's a bell from somewhere far north. That leads onward.

## 4. Core loops

| Loop | What you do | How long | What it feeds |
|---|---|---|---|
| Field | Walk, talk, cast Moonlight, gather herbs, relight lanterns | 1-3 min a screen | Herbs for brews, First Strikes for fights, and friends' troubles |
| Brew | "Pick Your Poison": light it with witchfire, add moonwater and up to 3 herbs, stir, bless | 30-60 s a brew, at 3 stops | Brews solve troubles (which earn charms) and win fights |
| Fight | Take turns on the ribbon; watch d20s and intents; Gather; Pinch | 1-2 min for rabble, up to 6 for the final boss | Herbs she can't pick tonight, loot, and cleaned patches that bloom |
| Loot | Card reveal, equip, the grimoire at a rest | 10-20 s a card | Charms and gear shorten fights and speed up the field |

**How the loops connect.** She gathers, brews and fights. In the fight she gathers what only foes carry, then brews again.

**The limit is moonwater.** She has about 8 for the night:
- 2 she carries.
- 3 shared between the well and the lantern path.
- 3 from Nettie's rain-butt.

Those 8 have to cover:
- Heartsease, for the tutorial.
- Lantern Oil twice: once for Silas and once for the boss.
- Hush Tea, for Nettie.
- Remembrance Incense, for the boss.
- Wisp-Calm (optional), to skip B2.
- Any she throws raw at the Lantern Mother.

The choices are meant to be tight.

**Where the herbs come from:**

| Brew | Herbs | Where to get them |
|---|---|---|
| Lantern Oil | moonpetal, bogwick | Garden or lane; Silas's garden |
| Hush Tea | lavender, silver mugwort | Garden; lantern path |
| Remembrance Incense | chapel moss, silver mugwort | Square; lantern path |

All of these can be gathered before the fen.

**Total time:**
- About 22 minutes at a brisk pace, skipping B2 and B4 and the optional talk.
- About 32 minutes for a typical run.
- About 40 minutes for a thorough run with the optional rooms.

## 5. Demo plan

Build and polish these in order. Each one is a small page of its own.

1. **The witch model** (done). *Looks good when:* she reads clearly at 2× pixels from any angle, and the hat, horns and charms hold their shape as she moves.
2. **Gathering in the square** (in progress). She kneels, the athame snips, the herb arcs into the basket, and "Found it!" pops up. Moonlight's circle reveals a hidden patch. A "gentle" mandrake knocks her hat off. *Looks good when:* the kneel and snip feel like one soft motion, and the hat gag lands.
3. **Changing screens: garden → lane → square.** *Looks good when:* she walks off one painting and onto the next at the same size (each scene has its own `ppm`), the short fade goes to violet rather than black, and the music carries across.
4. **A first battle.** This is in progress as `battle.html`, using B2's line-up on the graveyard backdrop. It needs the FF9-style cut into battle; the chunky 3D party on the left and foes on the right; the Initiative Ribbon; a d20 that tumbles and lands; intent dice over the foes' heads; a `koText` in place of a death; and a Worn drop card. Gather and the mandrake's hat gag come with B1. *Looks good when:* every number reads at a glance, and nothing waits on a menu longer than it needs to.
5. **Pick Your Poison.** *Looks good when:* the witchfire strip (`20m/art/fx/witchfire.webp`) lights the pot, herbs float, violet steam rises, stir and bless feel like two separate gestures, and a dud is funny.
6. **The Gloamwing, B3.** The relic glints, the greyed *HELD BY* card appears, Inkblot's Pinch drains the grip meter, and the gold card slams in. *Looks good when:* the moth is big and pale but never scary, and the relic reveal matches A's frame for frame.
7. **The opening cut-scene.** Four stills with slow pans, typewriter text in Pixelify Sans, the title in Jacquard 12, and music made in code. *Looks good when:* the pans feel like camera moves, and no line stays up longer than it takes to read.

**Build as you go.** The foe models and the new characters are made in code, the same way as the witch:
- Quill, Silas, Rosalind, Nettie and the Lantern Mother.
- All 10 foe families.

For portraits, Quill, Silas and Rosalind can borrow WW's (`WW/witch_game_assets/npcs/<id>/`) until matching ones are painted. Nettie and the Lantern Mother need new portraits.

## 6. Open questions

1. **Is the title *Moonlight & Mire*?** Recommended: yes, with "Follow me down" small above it.
2. **Is this standalone, or does it follow WW Chapter 1?** Recommended: standalone, like WW's own side stories (*Silas's Last Lantern* also starts her with the hag stone and two moonwater). She knows the ghosts, but nothing depends on Chapter 1's plot.
3. **Is the party three (the witch, Inkblot and Nettie), with Silas as a guest?** Recommended: yes. A fourth member, such as Hilde with a hammer, would double the battle work for a 40-minute game.
4. **Should I commission art batch 2?** It would be 2 field paintings, 3 battle backdrops, 4 stills and 2 portraits. Recommended: yes. Start with the Gloamwood backdrop, because B1 is the only early fight that has no backdrop yet; until then, night-grade `battle-forest-ruins`. The two fen field paintings come next.
5. **Can the party lose?** Recommended: yes, at no cost. She wakes in her armchair with everything, and the fight waits for her. Most players won't lose before the final boss.
