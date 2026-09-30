# Moonlight in the Aether: the slice

This is the play outline for one full-moon night, about 20 to 40 minutes of play. The lore is in `LORE.md`, and the art to commission is in `art-requests/batch-02.md`.

The slice has:
- Two towns, Wickhollow and Bogmire.
- Five wild places, where all the foes live.
- A painted world map that the skiff flies over, with no fights in the air.
- 12 field screens, plus the world map.
- 6 fights, 4 of them required.
- 3 places to brew.
- 4 cut-scenes.

Path keys:
- `20m/` = `/home/user/20-min/`
- `WW/` = `/home/user/follow-me-down-witch-way/`
- `TH:` = New-game branch `origin/claude/tender-babbage-4wiplk`
- **B2 #n** = prompt n in `art-requests/batch-02.md`

## 1. The route

```
 WICKHOLLOW (town)                                   BOGMIRE (town)
 cottage · garden · square · riverbank jetty  ≈ skiff ≈  mast & moot-circle · Nettie's hut
      |                                                        |
 wild: the lantern path (B1)                               wild: the Murkway (B4)
 wild: Sable bridge → the Hollow (B2, B3)                  wild: the Long Boardwalk (B5)
                                                           wild: Mother's Hollow (B6)
```

**The order is fixed where it matters.** The Hollow opens once Silas has told her where the moths go, so B1 comes before B2 and B3. The skiff flies once Quill has his swap and the Gloamwing's moths have shown the way. Nettie joins before the first fen fight.

### Wickhollow (town): herbs, friends, no foes

| # | Screen | Painting | What happens | Herbs | People | Min |
|---|---|---|---|---|---|---|
| 1 | Cottage, inside | `20m/art/backgrounds/cottage-inside.webp` | The opening cut-scene ends here. She takes the hag stone and 2 moonwater. After the garden she comes back for the brewing tutorial (Heartsease). The armchair is where she rests and saves. | — | — | 1-1.5 |
| 2 | Cottage garden | `20m/art/backgrounds/cottage-outside.webp` | The gathering tutorial. One lavender bed is grey, and Moonlight shows a rot trail. A mandrake climbs out of the grey bed and scuttles off toward the Gloamwood. | lavender, moonpetal, witch's bells | — | 1-2 |
| 3 | Wickhollow square | `20m/art/backgrounds/wickhollow-square.webp` (demo 1) | This is the hub. Inkblot drops a rescued flame in her basket and settles on her hat: **Inkblot joins.** Hilde gives the Horseshoe charm, and Agnes points to the chapel moss. The well gives moonwater (3 a night, shared with the lantern path). Exits lead to the riverbank, the lantern path and the stone bridge. | chapel moss, moonpetal | Hilde, Agnes | 1.5-2.5 |
| 4 | The Sable riverbank | `WW/game/art/backgrounds/sable-riverbank.webp` | Quill sits by his cold skiff at the old jetty (the skiff is 3D). Lamp-moths carry flames past on the water. Quill sets his swap: warm hands and a bow-lamp that won't blow out. She comes back here later to take off. | nightrose | Quill; Rosalind (optional: a nightrose earns the Bell charm) | 1, then 0.5 |

### Wickhollow's wild places (the Gloamwood): foes and herbs

| # | Screen | Painting | What happens | Herbs | People | Fight | Min |
|---|---|---|---|---|---|---|---|
| 5 | The lantern path | `WW/witch_game_assets/backgrounds/lantern_path.webp` | Silas stands among his dark lanterns. The runaway mandrake and a glowcap block the path. At the wayside kettle (moonwater, a bench, a cauldron) she brews Lantern Oil. Silas relights, gives her the Owl charm and a bow-lamp flame, and says the moths gather in the Hollow. She also brews the Warming Balm, using glowcap Gathered in B1. | witch's bells, ember-star lily, silver mugwort; Silas's garden: lavender, wisp-sprout, bogwick | Silas | **B1** | 3-4 |
| 6 | The Sable bridge | `20m/art/backgrounds/sable-bridge.webp` | Crossing the bridge on the way to the Hollow. Lights float away under the arches. Sour wisps crowd the twisted grove at the far end: Wisp-Calm lets her by, or she fights. | — | — | **B2** (skip with Wisp-Calm) | 0.5-1.5 |
| 7 | The Hollow | `WW/witch_game_assets/backgrounds/hollow.webp` | A marsh graveyard. The iron gate stays shut. Inkblot's nest holds his tail feather. The Gloamwing hangs in the bone-hung trees, fat with light. Once it's beaten, every moth rises and streams away downriver: "Further than I can walk tonight." | one hollowed bed; clean it for bogwick | — | **B3** (boss) | 1-2 |

### The flight

| # | Screen | Painting | What happens | Min |
|---|---|---|---|---|
| 8 | The world map | **New: B2 #01** (stopgap: `TH: thareia/art-in/regions/04-Gloomfen-Marsh.png`, night-graded in code) | "The skiff wakes" plays at the jetty. Then the 3D skiff lifts off and flies free over the painted map, with the violet lights drifting down the river below to show the way. It lands at Bogmire's mast, or back at the Wickhollow jetty whenever she likes. There is music, clouds and a trail of motes: no fights, no fuel, no clock. | about 1 each way |

### Bogmire (town): herbs, friends, no foes

| # | Screen | Painting | What happens | Herbs | People | Min |
|---|---|---|---|---|---|---|
| 9 | Bogmire | **New: B2 #02** | Plank streets on stilts around the moot-circle, with the mooring mast where the skiff lands. Every lamp-pole burns a borrowed violet flame, and the window boxes have gone grey. Mayor Gretch is glad of the light and sorry about the herbs. | bogwick (lamp-pole planters), silver mugwort (plank edges) | Mayor Gretch | 1-2 |
| 10 | Nettie's hut | **New: B2 #03** | The middle-turn cut-scene plays here. She brews Hush Tea, Nettie sleeps an hour, wakes cross and rested, and **Nettie joins.** The rain-butt gives 3 moonwater. There is a rest point and a cauldron for Remembrance Incense and Lantern Oil. | lavender (window boxes) | Nettie | 2-3 |

### Bogmire's wild places (the fen): foes and herbs

| # | Screen | Painting | What happens | Herbs | Fight | Min |
|---|---|---|---|---|---|---|
| 11 | The Murkway | `20m/art/backgrounds/graveyard-path.webp` (Thareia's walk-graveyard-path-night) | A plank path over black pools, past old fen graves. Hollowed patches are everywhere. Fog covers the low path, and Hag-Sight shows which planks hold. | hollowed patches: bogwick, silver mugwort | **B4** (can walk round) | 1 |
| 12 | The Long Boardwalk | **New: B2 #04** | Planks on stilts, with lamp-posts burning Wickhollow's flames out into the mist. | reed islets: silver mugwort | **B5** | 1 |
| 13 | Mother's Hollow | **New: B2 #05** | Black willows around a sunken house with every window lit. The Lantern Mother waits on the step. | — | **B6** (final) | 0.5, plus the fight |

**Optional rooms.** These use existing paintings and aren't counted in the 12:
- Quill's stall (`20m/art/backgrounds/quills-stall.webp`), the swap shop.
- The lane (`the-lane.webp`), with nightrose and a lantern to relight.
- Hilde's smithy (`smithy-inside.webp`), to temper a charm +1.
- The graveyard (`graveyard.webp`).
- The chapel (`chapel-inside.webp`).

**Not used yet:** WW's stepping stones, pond and crypt.

**New art.** The world map, two Bogmire screens and two fen screens are new. For the other wild places the slice reuses existing paintings: WW's lantern path and Hollow, WW's Sable riverbank, the 20-min Sable bridge, and Thareia's graveyard path (the Murkway).

## 2. The battles

This is the list for the balance agent. Foes live only in the wild places. They are visible on the field, and Moonlight cast on a foe's back gives a First Strike. Target levels are suggestions; `docs/BALANCE.md` decides.

| # | Where | Line-up | Party | Target level | Required? | Difficulty | Backdrop | What it teaches |
|---|---|---|---|---|---|---|---|---|
| B1 | Lantern path (Wickhollow wilds) | Hollowed Mandrake, Glowcap | Witch, Inkblot | 1 | yes | tutorial | **New: B2 #06** Gloamwood at night (stopgap: `TH: battle-forest-ruins.png`, night-graded) | d20, grazes, intent dice, Witchfire beating Verdant, Gather (glowcap for the Warming Balm), the gentle rule and the hat gag |
| B2 | Twisted grove, off the Sable bridge | Sour Wisp ×2 (A's `marsh-light`), Lamp-Moth | Witch, Inkblot | 1-2 | no (Wisp-Calm skips it) | easy | `20m/art/battle/graveyard-night.webp` (already in `battle.html`) | Radiant on Radiant is ×0.5; Pinch takes a flame; Wisp-Calm ends a fight |
| B3 | The Hollow | The Gloamwing (it calls up to 2 Lamp-Moths) | Witch, Inkblot | 2 | yes | medium: first boss | `20m/art/battle/graveyard-night.webp` | Grip & Claim on the Dawnbell, Stagger cancelling a charge, Ember against a boss weak to it, the gold card |
| B4 | The Murkway (fen) | Boglurcher, Mire Leech ×2, all Hollowed | Witch, Inkblot, Nettie | 3 | no (can walk round) | easy with a First Strike, medium without | **New: B2 #07** open fen | Nettie's first fight; Radiant against Blight, first hit wins |
| B5 | The Long Boardwalk | Willow-Wight, Drowned Chorister ×2 | Witch, Inkblot, Nettie | 3-4 | yes | hard: the last test | **New: B2 #08** the boardwalk | Nettie's heals and Tide; Hexed and Rooted; Remembrance Incense |
| B6 | Mother's Hollow | The Lantern Mother (champion, 3 phases, calls Lamp-Moths) | Witch, Inkblot, Nettie; **Silas joins as a guest in phase 3** | 4 | yes | boss; losing once is fine | **New: B2 #09** the sunken house (stopgap: `TH: battle-dark-cathedral.png`) | Two grip meters; Tide (thrown moonwater, Nettie) against her weakness; Lantern Oil against Lights Out |

**How long fights take:** rabble fights about 1-2 min, B3 about 3, B5 about 2-3, and B6 about 4-5.

## 3. Story beats

**Opening.** Painted stills with slow pans and text:
1. `20m/art/stills/moonrise.webp`: "When the moon rises, an old path wakes in the woods. They call it Witch Way." (WW's intro)
2. `20m/art/stills/square-from-the-well.webp`: "This month, Wickhollow's lanterns started going out. One a night. No wind."
3. **B2 #10**, lights down the Sable: "Each little flame lifts off its wick and floats down the Sable, like a leaf that knows where it's going."
4. `20m/art/stills/witch-at-her-door.webp`: "Where they pass, the riverbank goes grey." The witch: "Right. Boots. Basket. Hat."
5. **B2 #15**, the title: *Moonlight in the Aether*, with "Follow me down" in gold.

**The skiff wakes.** This plays at the jetty, after B3:
1. Quill flexes his warm fingers. "Everything's a swap. Bring her back with the lights in her."
2. **B2 #11**: she holds witchfire to the brazier, and the amber crystals take on a violet heart. Silas's flame hangs at the bow. Inkblot, on the rail: "Kraa."
3. The skiff lifts off the water. The witch: "It's a broom with ambitions." Then the world map.

**The middle turn.** This plays at Nettie's hut:
1. Nettie: "Your lamps weren't stolen. They were called."
2. **B2 #12**, the night Misthollow sank (the event, not the party, as Thareia does it): a young lamplighter leads a line of children, safe and holding hands, along the boardwalk through mist. "A hundred years ago the water came up. The lamplighter led the children out, and went back for the last one."
3. Nettie: "They all got home. Nobody told her. She's still lighting the way, and every light she can't find, she borrows."
4. Nettie: "Where she takes the light, the rot comes in behind. That's your grey riverbank."
5. The witch: "So she's not a thief. She's someone who hasn't sat down in a hundred years." Nettie: "You'll have to fight her to sit her down. Then you can make her tea."

**The ending.** This plays after B6:
1. The veil falls. The Lantern Mother: "Are they safe? I was taking them home. The water came up the stair, and I went back for the last one…" (A's line)
2. The witch: "Everyone got home. Every one. You can put the lamp down." She pours Hush Tea (`20m/art/stills/witchfire-cauldron.webp`).
3. At Bogmire's mast, Nettie: "If your village ever needs a witch, ask me. I'm not saying yes. I'm saying ask." (A's line, one word changed)
4. **B2 #13**, the lights go home: the flames lift off the boardwalk and stream up the Sable, and the skiff follows them.
5. **B2 #14**, two lamplighters: Wickhollow is lit again, and Silas and the Lantern Mother walk the lantern path. "She didn't fade. Ghosts in Wickhollow don't. They walk the path together, and neither has finished a round since, because they talk."
6. The grimoire opens to the Dawnbell's page: it's a bell from somewhere far north. That leads onward.

## 4. Core loops

| Loop | What you do | How long | What it feeds |
|---|---|---|---|
| Town | Talk, gather, trade swaps, rest | 1-3 min a screen | Friends' troubles (and their charms), herbs, the skiff |
| Wild | Walk, gather, cast Moonlight on a foe's back, fight | 1-4 min a screen, plus fights | Herbs only foes carry, loot, cleaned patches that bloom |
| Brew | "Pick Your Poison": witchfire, moonwater, up to 3 herbs, stir, bless | 30-60 s a brew, at 3 cauldrons | Brews solve troubles and win fights |
| Fly | Take off, fly the map, land | about 1 min a trip | The way between towns; a breather with music |
| Loot | Card reveal, equip, the grimoire at a rest | 10-20 s a card | Charms and gear shorten fights and speed up the field |

**How they connect.** Town troubles send her into the wilds. The wilds give herbs and loot, brews solve the troubles, and solving them gets her the skiff to the next town.

**Before takeoff she needs:** a Warming Balm (its glowcap only comes from B1), Silas's bow-lamp (from Lantern Oil), and the Gloamwing beaten (B3).

**Moonwater is the limit: 8 for the night** (2 carried, 3 in Wickhollow, 3 at Nettie's).

| Brew | For | Required? | Herbs from |
|---|---|---|---|
| Lantern Oil | Silas and the bow-lamp | yes | garden or square; Silas's garden |
| Warming Balm | Quill's hands, the skiff | yes | lantern path; B1 |
| Hush Tea | Nettie joining | yes | garden; lantern path |
| Heartsease | the brewing tutorial | no | garden |
| Wisp-Calm | skipping B2 | no | Silas's garden |
| Remembrance Incense, a second Lantern Oil, raw moonwater | the boss | no | square; lantern path |

That's 3 required brews and 5 choices for 8 moonwater.

**Time.** About 25 minutes at a brisk pace (skipping B2, B4 and the optional talk), about 35 minutes for a typical run, and about 40 with the optional rooms.

## 5. Demo plan

Build and polish these in order. Each is a small page of its own.

1. **The witch model** (done). *Looks good when:* she reads clearly at 2× pixels from any angle, and the hat, horns and charms keep their shape in motion.
2. **Gathering in the square** (done). *Looks good when:* the kneel and snip are one soft motion, and "Found it!" pops.
3. **A first battle** (built as `battle.html`: B2's line-up on the graveyard backdrop). Next is B1, with Gather and the mandrake's hat gag. *Looks good when:* every number reads at a glance, and nothing waits on a menu longer than it needs to.
4. **Screen changes: garden → square → riverbank.** *Looks good when:* she keeps the same size from painting to painting, the short fade goes to violet rather than black, and the music carries across.
5. **Pick Your Poison.** *Looks good when:* the witchfire strip lights the pot, herbs float, violet steam rises, stir and bless feel like two separate gestures, and a dud is funny.
6. **The flight.** The 3D skiff lifts off the riverbank jetty, flies over the world map (B2 #01), and lands at Bogmire's mast. *Looks good when:* the skiff bobs and banks; the crystals glow amber with a violet heart; a soft shadow slides over the map; clouds (B2 #19) pass above and below; motes (B2 #20) trail behind; the violet lights drift down the river; and a code-made flying theme, like Thareia's "Sunstone Wind", swells on take-off.
7. **The opening cut-scene and title** (B2 #10 and #15). *Looks good when:* the pans feel like camera moves, and no line stays up longer than it takes to read.

**Build as you go.** These are modeled in code, the same way as the witch:
- The skiff (done: the Magpie, `src/actors/airship.js`), wearing the paint of `TH: thareia/art-in/airship/ship-2-refitted-skiff.webp`.
- Quill, Silas, Rosalind, Mayor Gretch, Nettie and the Lantern Mother.
- All 10 foe families.

## 6. Decisions

These were open questions; they're settled now.

1. **The skiff's name:** she's *the Magpie*. Quill named her for the shiny things she carried home, and a magpie is Inkblot's cousin. The name is painted on both bows.
2. **Flying:** free flight over the map, with the drifting lights showing the way. She lands at a town's dock when she's near it. A trip between the towns takes about 20 seconds in the demo; it can be slowed toward the minute suggested above.
3. **Flying back:** yes, she can fly back and forth between Wickhollow and Bogmire whenever she likes, to rest in her armchair or fetch chapel moss. The fen fights wait for her.
4. **Standalone:** yes. This is its own game, reusing Witch Way's and Aethermoor's art and characters. She knows the ghosts, but nothing depends on Witch Way's plot.
5. **Losing:** yes, the party can lose, at no cost. She wakes at her last rest with everything she had, and the fight waits.
