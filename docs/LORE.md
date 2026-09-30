# Moonlight & Mire: lore bible

This is the lore for a 20-40 minute game in the style of FF9. The Moonlight Witch from *Follow Me Down Witch Way* fights using Aethermoor's battle and loot rules, and the game takes place in one small corner of each world.

Sources and shorthand:
- **WW** is *Follow Me Down Witch Way* (`/home/user/follow-me-down-witch-way`).
- **A** is *Aethermoor: Hearth & Heirloom* (New-game, branch `claude/cool-ptolemy-uc93gg`).
- **TH** is Thareia (branch `claude/tender-babbage-4wiplk`).
- Names in `code` are A's data ids.

## 1. Title

Options: **Moonlight & Mire** · Follow the Lights Down · The Lantern Mother · Witch Way Down · Lanterns Down the Sable.

**Pick: *Moonlight & Mire*.** Each half comes from one parent: Moonlight is her power in WW, and the mire is A's Gloomfen. It also names the core of the battle system, Radiant against Blight, and echoes *Hearth & Heirloom*. The logo keeps WW's style: blackletter title (Jacquard 12), with "Follow me down" small in gold above it.

## 2. Premise

**Pitch:** Wickhollow's lanterns are floating away down the river. The Moonlight Witch follows them into a fen, where a grieving ghost has been lighting the way home for a hundred years.

The whole game is one full-moon night. Wickhollow's lanterns have been going out, one a night. Each flame lifts off its wick and drifts down the Sable. Where the light leaves, the Whispering Rot moves in: herbs go grey, wisps go sour, and shy things bite. When the rot reaches her own lavender bed, the witch follows the lights over the Sable bridge, through the Hollow and down into Aethermoor's Gloomfen. There Nettie the Swamp Witch tells her who is calling them: the Lantern Mother, last lamplighter of drowned Misthollow, still lighting the boardwalk for children who got home long ago. She's "kind, and wrong." The witch fights her way to her, sits her down and makes her tea.

### Why fighting fits her

- **Nothing she fights is wicked.** Every foe is hollowed by rot, lost or asleep. Beaten, it is itself again. A already writes defeat this way: Hodge "sits down on his stool."
- **Her weapons are her gifts: witchfire, moonlight and brews.** The athame still "cuts herbs and nothing else." In battle it gathers, like FF9's Steal.
- **A's own rules give the fights meaning.** Radiant and Blight beat each other, and whoever strikes first wins. Every fight is moonlight against rot.
- **The boss is released, not slain.** The Lantern Mother is A's most tender boss, and a lamplighter like Silas. The fight gets her to stop; tea does the rest.
- **Dropped:** the blade (breaks the athame rule), a rival witch such as Mother Grue (a villain), and the Rot-Stag (too grim, and from A's forest).

## 3. Tone rules

WW's rule, "dark in look, kind at heart," comes first. A's "warm epic with an edge" adds the edge: the fights are real, but the stakes stay small.

**Always**
- Moonlight, candle glow, crooked graves and friendly ghosts. (WW)
- Foes are troubled, not wicked. A beaten foe sits down, roots, sinks or wakes, and says its `koText` instead of falling. (A)
- The witch fights with witchfire, moonlight and brews, and never with the blade.
- Every roll is shown, and so is every foe's next move. (A)
- Ghosts are kind, and they stay after they are helped. (WW)
- Mischief is gentle: her hat, the crow, the screaming mandrake. (WW)
- Nothing is lost. If she loses a fight, she wakes in her armchair with everything she had. (A and WW)
- Every piece of loot has a story, told on its card. (A)

**Never**
- Gore, blood or death. Nobody dies.
- Villains. That rules out A's Unsmith, the Tallymen and Mother Grue.
- A curse at the heart of the story. A two-turn Hexed status in battle is fine.
- Children in danger. A's Lantern Mother leads children away; this one borrows lights.
- Money of any kind: no gold, no prices, no silver coins. (WW)
- Relics that shatter. A foe keeps whatever you don't pry loose.
- Ghosts meant to frighten, or ghosts who fade away once helped. (WW)
- The moon or Wren in danger, deadlines, Vesper Keep as a place to visit, or a name for the witch. (WW)
- Grinding, the Waking, Grudges, or levels that block the way.

## 4. The world

**How the two lands join.** The Sable flows past Wickhollow under its stone bridge. Over the bridge and through the twisted grove lies the Hollow, a marsh graveyard from WW. The marsh keeps going downhill with the river and becomes Aethermoor's Gloomfen. So WW's Hollow leads down to A's Mother's Hollow, and the intro's last line, "Follow me down," becomes the map.

**The Wickhollow corner (WW):** her cottage and garden, the lane, the square (well, chapel, Hilde's smithy, Quill's stall), the lantern path, the Sable bridge and the Hollow.

**The Gloomfen corner (A):** the Murkway (a plank path over black pools); Nettie's hut at the head of the Long Boardwalk (in A it stands in Bogmire); and Mother's Hollow, black willows around a sunken house with every window lit. Drowned Misthollow lies beyond.

**Canon choices.** Gloomfen names come from A, not Thareia. The moon is WW's: four phases, never in danger. Thareia's Auros and airships stay out, as do A's Keep, Sleepers, Brands, Unsmith and Tallymen. The fen lies off Witch Way's road and is not WW's next region.

**What's wrong, and why it's nobody's fault.** A hundred years ago the water rose over Misthollow. Its last lamplighter led the children out along the Long Boardwalk, then went back for the last one. Every child got home; she never found out. She has lit the boardwalk every night since. Her grief turned to the Whispering Rot (A's name for blight), the rot soured her marsh-lights, and her lamp-moths flew further for light: up the Sable to Wickhollow's moonpetal-oil lanterns, the brightest for miles.

**Why the witch goes.** Silas can't keep a lantern lit, and the rot has reached her garden. Someone has to ask for the lights back. There is no clock.

**The new idea about herbs** (every WW region brings one): herbs remember. Rot makes a patch forget what it is. Cleaned with moonlight and witchfire, it blooms at once, whatever the moon says. Big patches get up and walk, and those become fights.

## 5. The Moonlight Witch

Same witch, no other name, same 3D model. She already knows the ghosts, and starts with the hag stone and two moonwater, as WW's side stories do.

### In the field

| Ability | Source | Here |
|---|---|---|
| Moonlight | WW | A silver circle that shows hidden herbs, runes and rot trails. Cast on a foe's back, it gives a First Strike (A's overworld rule). |
| Witchfire | WW | Lights lamps and the cauldron, blesses brews, and burns rot off a small patch: "Witchfire burns nothing that belongs." |
| Spirit Sight / Hag-Sight | WW + A hag stone | She sees ghosts, and in fog she sees which planks will hold. |
| Gathering | WW | WW's rules, plus one new rule, **hollowed**: clean the patch before you pick. |
| Rest | WW bed + A Hearthfire | Her armchair, Silas's bench and Nettie's hut all heal and save. She never sleeps, so the moon stays full. |

### In battle

Her commands are A's, renamed:

| Hers | A's | What it does |
|---|---|---|
| **Witchfire** | Attack | d20 against Guard for 1d8 Ember, with A's grazes and Legend Strikes. |
| **Moonlight** (MP) | Skills | *Silver Circle*: 1d4 Radiant to every foe, shows each foe's next two intents, and reveals hidden foes and herbs. *Moonbeam*: 2d6 Radiant to one foe. *Bless*: one ally becomes Moonlit and Warded 1d6. |
| **Brew** | Items | Drink or throw a brew. |
| **Gather** | new (like FF9 Steal) | The athame cuts an herb off a plant foe. It never does damage. WW's gathering rules apply. |
| **Be Still** | Defend | +2 Guard, half damage, +2 MP. Named for WW's Stillness. |
| **Full Moon** | Legend Surge | The gauge is a moon that waxes. When it is full, her best relic fires, with A's card slam. With no relic, she uses *Moonrise*: 2d8 Radiant to one foe, and every foe loses Hollowed. |
| **Slip Away** | Flee | A's flee roll. It never works against a boss. |

A hero at 0 HP sits down with her hat over her eyes. A Heartsease Tonic gets her up.

**The rot in battle.** Foes can carry a new A-style Omen, **Hollowed** (named for A's Hollowed Ranger). A Hollowed foe also counts as Blight, and its hits add Rotting. Radiant and Blight beat each other, and whoever strikes first wins: if her moonlight lands before the foe acts, the Omen breaks. After that, only Moonrise or Remembrance Incense breaks it. The player times it on the Initiative Ribbon.

**Aspects.** A's wheel is unchanged. Ember is witchfire, Radiant moonlight, Blight rot, Verdant herbs, Tide the river and fen, Frost chill, Stone graves, and Storm wind (mostly for hats).

**Statuses.** All 22 of A's statuses keep their rules. Five get new names: Bleeding → **Snagged**, Frightened → **Spooked**, Swallowed → **Led Away**, Unmade → **Greyed** (Nettie: "Hexed folk… just go grey"), Hearthlit → **Moonlit**.

### Voice

Warm and dry, with small jokes. She talks to plants and says sorry to mandrakes (WW). She doesn't like fighting, and she's good at it anyway. Sample lines:

- "I don't fight. I garden. Firmly."
- To a glowcap: "You're not wicked. You're walking toward the wrong light. Sit."
- "It cuts herbs and nothing else. I've asked it."
- In her grimoire: "Rot is grief that nobody sat with. I sat with some. It's better company than it looks."
- To the Lantern Mother: "Everyone got home. Every one. You can put the lamp down."

## 6. Companions and friends

**Inkblot** (WW, Quill's crow, "a thief with good intentions"). All week he has carried lights home, one flame at a time. He joins at Quill's stall. In battle he is A's Pip, the relic-thief, and the fastest on the ribbon. He only says "Kraa."
- **Peck:** 1d4 pierce; light, so he acts often.
- **Pinch:** grip damage (A's Disarm). Takes a relic, a stolen light or an item.
- **Kraa!:** foes must target him (A's Provoke); +2 Guard.
- **Fetch:** flies a brew to a friend.
- **Surge, *Every Shiny Thing* (new):** grip damage to every relic at once. Unlocks when his tail feather comes back from his nest in the Hollow.

**Nettie the Swamp Witch** (A, `nettie`, a companion A planned but never recruited). "Healer, herbalist, witch. Two of those you can buy. The third you don't cross. Mind the jars; some bite." She knows the Lantern Mother's story and joins after a Hush Tea. She heals, hexes, and hits with Tide, the boss's weakness.
- **Mind the Jars:** 1d6 Tide; some jars bite (Snagged).
- **Stir the Pot:** heals the worst-hurt ally 2d8 (A's Bog-Hag move).
- **Bitterroot:** cures Poisoned and Snagged (A's poultice: "Tastes like regret").
- **Hex:** WIS save or Hexed.
- **Surge, *Undo the Knot*** (her Hexbane Shawl): every ally sheds up to three harmful statuses and heals 2d6.
- Voice: "I'm Nettie, and I don't thank people." "Moonlight. Very pretty. Down here we use a lamp and a stick."

One witch is warm and one is tart, and neither admits they like each other.

**Silas, guest** (WW, the ghost lamplighter). Lantern Oil relights his dark pole, and he gives her the Owl charm. When the boss snuffs every lamp, he follows that flame down the boardwalk and joins as a guest, as A's Tamsin does. He can't be targeted. Each turn he *Lights the Lamps*: every ally is Warded 1d8 and loses Spooked. Two lamplighters, a hundred years apart.

**Friends in the field (WW):**
- **Hilde** gives the Horseshoe charm "for that hat of yours." "Ha!"
- **Mister Quill** runs the swap shop and lends Inkblot.
- **Agnes** points her to the chapel moss.
- **Rosalind** saw the lights pass under her bridge "like little boats." She trades the Bell charm for a nightrose.

## 7. Foes

There are ten foe families. Their stats and moves come from A's `data/foes.js`, except moves marked *new*. The intent die depends on tier: rabble d6, veteran d8, relic-bearer d12, champion d20.

| Foe | Source | Look | Aspect, tier | Two intents | Beaten |
|---|---|---|---|---|---|
| **Glowcap** | A `glowcap` + WW herb | Child-sized, with a spotted amber cap; walks toward light | Verdant, rabble | Spore Puff (all: Poisoned); Glow (Warded) | Sits down and puts down roots. Gather: glowcap. |
| **Hollowed Mandrake** | WW mandrake; A `briarling` stats | Grey leaves, with the face of a cross turnip | Verdant, rabble | Scream (*new*: all Staggered, her hat flies off); Tangle (Rooted) | Sulks. Hold to say sorry, and it comes quietly. |
| **Sour Wisp** | WW wisp + A `marsh-light` | A WW wisp, grey at the edges and pouting | Radiant, rabble | Lure (Charmed); Flicker (Guarding) | Hiccups, turns green again and drifts off, shy. Wisp-Calm ends the fight. |
| **Lamp-Moth** | A `lamp-moth` | Pale gold, carrying one violet Wickhollow flame | Radiant, rabble | Dust in the Eyes (Spooked); Circle the Light (Hasted) | Drops the flame, which floats home. |
| **Boglurcher** | A `boglurcher` | "A heap of bog with eyes in it" | Tide, rabble | Mire Grab (Rooted); Drag Under (charging) | Its eyes close. Now it's just bog, with bogwick growing on it. |
| **Mire Leech** | A `mire-leech` | Glossy and black, more slug than horror | Blight, rabble | Latch On (Snagged); Drink (drains and heals) | Uses A's own Sink move and slips back into the water. |
| **Willow-Wight** | A `willow-wight` | A weeping black willow that pulled up its roots | Verdant, veteran | Lash (Rooted); Weep (Regenerating) | Roots and sleeps, "only a willow again" (Elder Moss). |
| **Drowned Chorister** | A `drowned` (`choir` variant), drawn as WW ghosts | Misthollow's choir, singing in their sleep | Tide, veteran | The Lullaby (A's Hymn: all Hexed); Toll (all Spooked) | They wake, ask "Is it morning?" and stay to listen. |
| **The Gloamwing** (boss) | A `gloamwing` | A moth the size of a cart, with the Dawnbell spun into its silk | Radiant, relic-bearer; weak to Ember | Dreamdust (all Spooked); Bell-Hum (Radiant to all, Staggered) | Flutters up after the moon, then sleeps on Silas's moth-bower. |
| **The Lantern Mother** (final boss) | A `lantern-mother` | Tall, in a wet lace veil, carrying a lantern of borrowed flames | Radiant, champion; weak to Tide | Hush Now (all Hexed); Lead Them Down (charging: Led Away for 2 turns) | The veil falls. "Are they safe?" She drinks the witch's tea and stays. |

**The Lantern Mother** keeps A's three phases: Lamplight; the Children's Road (Mourning: Spooked and Rotting; she calls lamp-moths); and Lights Out (Snuff: every hero Exposed). Her Lantern and Veil each have a grip meter. If Inkblot pries the Veil loose, the rot stops.

Any rabble can be Hollowed; everything in the Murkway is. Left out: A's Bog-Hags, Hodge (his toll is money) and Rotgrubs.

## 8. Herbs and brews

All eleven herbs are WW's, with icons already in `art/herbs/`. Tonight's moon is full, so glowcap and mandrake don't grow; the only way to get them is to Gather them from foes. Silas's garden grows out of season (WW canon).

| Herb | Virtue | Where it grows tonight | Gathering rule | In battle (A's terms) |
|---|---|---|---|---|
| Lavender | Calm | Cottage garden; Silas's garden | none | cures Spooked and Charmed |
| Moonpetal | Light | Garden wall; the lane | none | Radiant, Warded |
| Witch's bells | Heart (dose herb) | Garden foxgloves; lantern path | two in one brew = a dud | heals |
| Nightrose | Heart | Roses in the lane | clear moon only | a gift for Rosalind |
| Chapel moss | Memory | Chapel stones | none | cleanses Rotting and Hexed |
| Silver mugwort | Memory, Endure | Lantern path stream | none | cleanses; Guarding |
| Ember-star lily | Warm | Lantern path | none | Ember; cures Chilled |
| Wisp-sprout | Calm (rare) | Silas's garden; Sour Wisps | only under Moonlight | calms spirits |
| Bogwick | Light | Silas's garden; Boglurchers; fen patches | hollowed | Radiant, Warded |
| Glowcap | Warm | Glowcap foes only | Gather | Ember; cures Chilled |
| Mandrake | Root (dose herb) | Hollowed Mandrake only | gentle | Rooted |

**Moonwater** is the base of every brew and the limit on brewing. She carries two. The well and the lantern path share three a night (WW's rule), and Nettie's rain-butt gives three more. Thrown raw, it does 2d6 Tide.

**Brews**, all WW recipes, made on "Pick Your Poison":

| Brew | Recipe (plus moonwater) | In the field | In battle | Nearest A item |
|---|---|---|---|---|
| Heartsease Tonic | witch's bells | used in the tutorial | heals 2d4 + 25%, or revives | Hearth Tonic, Ember Salts |
| Hush Tea | lavender + silver mugwort | Nettie sleeps, then joins | thrown: the foe loses a turn | A's `delay` effect |
| Wisp-Calm | lavender + wisp-sprout | opens the twisted grove | all wisps and moths leave | Dawnbell's map power |
| Lantern Oil | moonpetal + bogwick | relights Silas's lanterns | the party can't be Exposed or Snuffed; Warded 1d8 | Every Lamp Lit |
| Remembrance Incense | chapel moss + silver mugwort | — | the party sheds Rotting, Hexed and Greyed; foes lose Hollowed | Bitterroot Poultice, for the whole party |
| Warming Balm | ember-star lily + glowcap | eases Quill's cold fingers | cures Chilled and Frozen; Hasted | Frost Draught, reversed |

**Duds** get cards too ("Wren insisted"), and they are useful thrown:
- Hiccup Tonic makes a foe Stagger.
- Swamp Tea leaves it Poisoned.
- Droopy Hat Draught leaves it Exposed as its "hat" wilts.

## 9. Loot

**Tiers.** The slice uses six of A's eight tiers:

| Tier | How it drops here |
|---|---|
| Worn, Wrought, Tempered, Runed | Random drops, with A's affixes, for example "Willowmurk Lace Gloves of the Mender" |
| Storied | Drops unidentified; the grimoire names it at the next rest |
| Heirloom | Named relics and WW charms only; never random |

Regalia and Primal are endgame tiers and stay out.

**Slots.** Her hat never changes.
- **The witch:** three charms that dangle from her hat chain, plus a shawl, gloves, boots and a focus.
- **Inkblot:** a leg ring and one charm.
- **Nettie:** a staff and a ring.

Gear shows on the 3D models.

| Relic or charm | Source | Where it comes from | Power |
|---|---|---|---|
| **The Hag-Stone** | WW hag stone, which is also A's No. 057 | She starts with it | Surge *Through the Hole*: every foe is Exposed and Hexed. "It's also meant to keep witches away. Rude." |
| **Dawnbell** | A No. 018 | Pried from the Gloamwing | Surge *Matins*: the party heals 2d8 and each sheds one harmful status. It comes from a shrine far north: the hook onward. |
| **The Lamplighter's Lantern** | A No. 058 | Pried from the Lantern Mother | Surge *Every Lamp Lit*: the party is Warded 3d8 and sheds Spooked, Hexed and Charmed. |
| **The Mourning Veil** | A No. 059 | Pried from the Lantern Mother | Surge *The Last Lament* (its A awakening name, replacing Veil of Tears): every foe Spooked and Staggered. |
| **Hexbane Shawl** | A No. 066 | Nettie wears it | Surge *Undo the Knot* |
| **Horseshoe charm** | WW | Hilde | basket +4 slots; +1 Guard |
| **Owl charm** | WW | Silas | Moonlight reaches 1.5 times wider, and Silver Circle shows a third intent |
| **Bell charm** | WW | Rosalind | chimes near rare herbs, and near foes carrying something to Gather or Pinch |

**How loot fits the tone:**
- **Nobody is robbed.** Loot is what the rot made a foe carry, or what it lets go.
- **Grip & Claim is A's, with one change:** a relic nobody pries loose stays with its holder. Nothing shatters.
- **The card reveal is A's, unchanged.** Only the Chronicle's wording moves: foes "brought round," not "felled."
- **No gold.** Foes drop herbs where A's dropped coins; the shop runs on swaps.
