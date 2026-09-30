# Aethermoor digest (for the Moonlight Witch merge)

Sources, read-only. **H&H** = branch `origin/claude/cool-ptolemy-uc93gg` (the finished game *Aethermoor: Hearth & Heirloom*, Milestone 7). **TH** = branch `origin/claude/tender-babbage-4wiplk` (Thareia, the planned next game). **main** = `aethermoor-character-sheet-4.html` and `aethermoor-interactive-image-map-polished.html`. Paths below are on H&H unless marked TH or main. ★ in section 4 marks foes that suit a moonlit world of marsh, graveyard, woods, river and ghosts.

---

## 1. World

**Setting.** Aethermoor is a realm "Charted in the Age of Embers" (main, interactive map title). Four biomes meet at **Hearthstone Keep**, an island fortress in **Mirrordeep Lake**. The **Council of Elders/Wardens** sits there around the **Eternal Hearth**, which has "burned behind them for nine hundred years" (`game/src/ui/screens/newgame.js` prologue). The regions are listed in `game/src/data/world.js` `REGIONS`:

| Region | Act | Places (maps) |
|---|---|---|
| Hearthstone Keep (centre) | Prologue, hub | Courtyard, Great Hall with the Eternal Hearth, and a reliquary of four galleries (the "trophy hall") |
| The Verdant Wilds (NW) | I | Hearth Road, Thornhollow (rangers' outpost), Thornway, Briarmaw's Den, Mossfall, Mosswatch Tower, Hindwood, Fawnrest Shrine, Eldergrove, the Heartroot |
| The Sunscorch Wastes (SE) | II | Sunward Road, Sandspire, Dust Trail, Dusthaven, Deep Shaft and Glass Heart, Glass Flats, Miragewell, Scorchgate Ruins and Vaults |
| The Ironspire Peaks (NE) | II | East Road (6 painted maps), Rockslide Pass, Peak's Veil, Highfold, Iron Stair, Ironhold and Deeps, Harrow's Forge, Stormwatch, Frost Road, Frostmere and Beneath Frostmere |
| The Gloomfen Marsh (SW) | II | Murkway, Willowmurk, Rotbridge, Bogmire, Lanternfen, Mother's Hollow, Long Boardwalk, Misthollow Ruins, Drowned Belfry, Blackwater Reach, Tidal Flats, Blackwater Causeway |
| The Hearth Below (under the Keep) | III | Hollow Hall, Ash Stair, Chained Deep, Worldforge |

**Tone.** The settled rule is "**Warm epic with an edge.** Real stakes, with Hodge-style comedy on the side" (`docs/DESIGN-BRIEF.md` §12 #5). The art prompts ask for "A warm epic, with an edge of dread" (`art-requests/pilot.md`). Thornhollow is described as "A cosy frontier town: safe inside, wild outside."

**Hidden history** (`docs/DESIGN-BRIEF.md` §9, `game/docs/M7-SPEC.md`). "The hearth never burned wood." In the First Age a smith chained **four Sleepers** beneath the land as its fuel, and every legendary relic carries a spark of them. Fenwick is the last First-Age hearthkeeper, kept alive for 900 years by his poker. **Harrow Ironvein**, Hilda the smith's twin, stole the First-Age plans for the **Worldforge** from under Ironhold and built it. As **the Unsmith** he means to melt every relic into the Worldforge and end the age of heroes. The Sleepers met in play are the one under the sand at Scorchgate, **Hush** under Frostmere, **Lull** under Misthollow (sung to sleep for a thousand years by the drowned choir) and the **First Sleeper** under the Keep in the Chained Deep. Alondra's dream line is "Four Sleepers under four hills. One of them is turning over" (`game/src/data/dialogue.js`).

**Key terms**

| Term | Meaning (source) |
|---|---|
| Eternal Hearth / the flicker | The Keep's fire. Mid-Council "it gutters. Every torch in the hall goes blue" (prologue). It burns the Sleepers. |
| Hearthwarden | The player hero: "A young Hearthwarden of the Keep. Their moves come from the relic they carry" (`game/src/data/heroes.js`) |
| Hearthfire | Rest/save points (35 in all, `world.js HEARTHS`). Resting gives full HP/MP, revives the fallen, sets the respawn point, starts a new day and kindles the fire for fast travel. A "cold" fire is a lock you light with a relic power (Kindle, Lamplight...) or Attunement 3. |
| Brand / Hearth Clock | One per Champion, 8 in all (Briars, the Heartroot, Glass, Ash, Iron, Frost, Lanterns, the Deep). Each relights one coal of the hearth. |
| The Waking | Each Brand raises the world's Waking by 1 and "re-arms" every foe in the region: veterans and up +6 levels, rabble +2, +1 gear tier, +1 Omen, +1 loot luck (`RULES.md` §10). Brief: "stronger and stronger bad guys". |
| Omens | Elite traits stacked on foes (`data/omens.js`, 6 in code): Emberblooded, Thornskinned, Twinned, Frenzied, Ironclad, Swift. |
| Grudges | A foe that wipes the party or makes it flee gets a title ("Skarn the Twice-Fled"), an extra Omen, and hunts that route. Beating it pays one rarity higher, stamped *Grudge settled*. "Never a wall." |
| Relics / holders | "Every legend has a holder": each named relic is carried by a named foe. You see it glint, pry it loose (Grip), and claim it. Killing the holder first shatters it, and Hilda can reforge it. |
| Echo | A relic you already own comes back on its holder as a generated copy. |
| Hearth Codex | The relic binder: 75 entries (No. 000 to 074) on 5 pages, each stamped Sighted, Claimed and Awakened. A finished page gives a permanent party bonus (`data/codex.js`). |
| Tallymen | "A relic-thief cult with ink-stained fingers. They keep accounts of everything they steal." |
| The Whispering Rot | Blight in Eldergrove's eldest trees, spread by the Rotwarden's smith-mask |
| Hammer in a broken ring | Harrow's maker's mark, found on the Ichor Mask, the Leviathan's collar and the soot-sealed boxes |
| Unsmith letters | Taunts after each Brand: "One coal. How touching. Ask your hearthkeeper what a hearth eats... — U." |
| Hollow Council / gifts | The four Council members, hollowed by the soot-sealed "gifts" the Unsmith sent them |
| The Hearth Below | Act III, beneath the Keep |
| Crownwalls | Briarmaw's crown-growth. A story seal that falls with it. |
| Accretion Domains | The character-sheet skill system (main: `aethermoor-character-sheet-4.html`), with 9 Domains, Imprint Bonus and Imprint DC |

**Thareia canon differs** (TH `thareia/lore/thareia-aethermoor-lore-compendium.md`, `thareia/design/00-starting-point.md`). There, Aethermoor is a continent of the planet Thareia, and **Auros**, a companion moon, hangs "always overhead". The glowing **Aether** and **sunstone** make airships fly. The **Great Tide** is a 100-year sea cycle, and the **Approach** (the moon's closest pass) is about 18 months away. The Eternal Hearth is a fuel-less mystery tied to the **Ember Line**, a theorized sunstone network under the land. The **Warm Roads** are glowing waterways under the Gloomfen. The canon Gloomfen has halfling towns, lizardfolk in the deep marsh, Willowmurk's "old magic that predates the Wilds' druidic orders", and Misthollow with amber veins and a six-pillar chamber. 00-starting-point says: "the current game is best read as a **legacy-map spin-off**". The relic plot, the Sleepers, the Unsmith, Tamsin and the Tallymen are "not carried over by default".

---

## 2. Story

### Hearth & Heirloom by Act and Milestone (`HANDOFF.md`, `game/docs/M3..M7-SPEC.md`)

- **Prologue.** In the Council hall the hearth turns blue, and Fenwick "does not look surprised. He looks caught." A Tallyman thief backs out of the vault with the Warden's Seal. The Warden takes one of three dormant starters (Hearthbrand, the Stillwater Lance or Cairnmaul). Tamsin Vale, Warden Isolde's ward, grabs the one that beats it. The first fight is gentle: the Seal is pried off the thief.
- **Act I, the Verdant Wilds (M2 road, then M3).**
  - The party goes down the Hearth Road. Old Snag carries the Thornsplitter Hatchet, which cuts thornwalls.
  - At Thornhollow Pip joins. The party tracks **Briarmaw** to its den and earns the Brand of Briars, and the crownwalls fall.
  - Three leads open in any order. At Mossfall and Mosswatch are Hollis's lantern and Gorrow's Mire Pearl. In the Hindwood and at Fawnrest, the Gloamwing's Dawnbell brings the white deer home, and sleeping on the Dreaming Stone gives the dream of the four Sleepers. At Eldergrove's Grove circle is Oda's Rootsong.
  - Tamsin duels you at the Eldest Tree. Then comes the Heartroot, where the **Rotwarden** wears a smith's mask. That earns the Brand of the Heartroot. Hilda recognises her brother's mark on the mask.
- **Act II** opens three regions, fought one road stretch at a time after the M4.5 playtest.
  - **M4, the Sunscorch:** the Sand Wyrm, **Kharzul the Glass Scorpion** (Cinderfang in its tail), the **Ashen Warden** of Scorchgate, and Brother Cinder's hint of the Sleeper under the sand.
  - **M5, the Ironspire:** Mother Wynn's bell at Peak's Veil, Thane Brundar at Ironhold, and **Mother Anvil** in Harrow's cold forge. Beneath Frostmere is the **Rime-Abbot** (Brother Aurel, "who went down to listen to Hush and did not come up"), with Hush asleep below.
  - **M6, the Gloomfen**, where "Willowmurk's elders send for the Warden":
    - Elder Moss's wards are failing.
    - Hodge keeps the Rotbridge toll: "pay today's price, win his toll game, or fight him".
    - **Tamsin's fall**: on the black barge she trades her starter to "a tall man in a boatman's cloak with a smith's apron under it".
    - At Bogmire the children follow a lantern into the fen. The **Lantern Mother**, Misthollow's last lamplighter, is "leading children out again, to the drowned city, where she thinks they are safe".
    - In Misthollow's Drowned Belfry the choir's song stops and Lull is named.
    - The **Blackwater Leviathan** was chained by the Tallymen. Its fall lets the causeway rise. The fourth council ends Act II.
- **Act III, the Hearth Below (M7).**
  - The four soot-sealed gifts are opened, and the **Hollow Council** is fought back to back: Elder Miravel, Cistern Lord Qasim, Thane Brundar and Mayor Gretch. Freed, "their koText is their own words, coming back to themselves."
  - Fenwick tells the truth and gives **Fenwick's Poker** (No. 000). Hilda forges the Warden's **Masterpiece**.
  - The party goes down the Ash Stair to the Chained Deep, where Tamsin waits, "sorry". Then the **Worldforge**: the Unsmith, fought with Tamsin as a guest ally.
  - **Endings** (`data/endings.js`): **Rekindle** ("The Sleepers chained again, and the hearth as it was"), **Release** ("The chains broken, and the hearth gone out") and **Kindle Anew** ("The Sleepers freed, and the hearth fed a legend of your own"; it needs No. 000, the Masterpiece and every Codex page).
- **Not built:** the post-game (the Heat ladder, the Emberless Reach, the First Smith) and M8 (the optional AI "Hearthteller").

### Thareia's plan and decision log (TH `thareia/design/01-brainstorm.md`, 02-04)

- **The game.** "A **new hero and a full party**, starting where Sedrin starts (the Gloomfen, the same 18 months before the Approach)." The party crosses paths with Sedrin, is "**not all human-looking**", has "**No mount.** The airship is the party's 'mount'", "**reaches Auros**", and caps at "**Max level 50**".
- **Travel (the FF9 model).** "One big painted map per region", "Leaving a town by its gate: walk the region's map", "Leaving a town by its airship dock: fly". Travel works in layers: the world map, a region map where you pilot the skiff, closer walking views, and top-down towns and dungeons. Areas are level-gated.
- **Battles and loot.** "**Keep the current game's fight and loot mechanics and look**" and "**Enemies wear loot, and so do the players.** ... one of the best parts of the original game."
- **Quality bar.** "**The quality bar is Final Fantasy IX** in scope and feel; the look is retro pixel characters on painted backgrounds".
- **Look.** "**Lean into retro pixel characters on painted backgrounds.** The 2× and 3× sprites were tested and rejected: they look clunky, not better." Walking uses the 16 × 24 walker; "Battles and building interiors: the current **64 × 64** battle rig at 1×." ⚠ This conflicts with the new game's "3D chunky characters".
- **Cut-scenes.** "**Cut-scenes are painted images of events**, not of the party (their outfits change)." Also "**A full story**, told through those scenes and the game's dialogue."
- **Music.** "**No recorded songs.** All music is made in code, as in the old game, and made richer" (03: one recorded song is about 3.3 MB, all 12 synth songs 11 KB).
- **Camera.** 04 leaves it open: "One camera for walking maps: the new three-quarter view (`town-square`) or the old straight-down view. Mixing the two in one game may feel uneven." Battle backdrops are painted "from the side, open floor in front".
- **Delivery.** "**One single file** (about 30 MB)".
- **Demos.** `thareia/demo2/`: the 16 × 24 party walks the painted town square. Walking into Rhune the Pass-Warden starts a real H&H battle over the forest-ruins painting.
- **Open questions:** the party, the story's answer to the Ember Line, the level bands, and the Southern Lowlands.

---

## 3. Heroes (`game/src/data/heroes.js`, `data/skills.js`, `art/hero-looks.js`)

| Hero | Role / Domain | Look | Skills |
|---|---|---|---|
| **Hearthwarden** (player, human, d10) | Balanced frontliner, Combat. Hearthborn: +10% Surge. | Auburn hair, red cloak and tabard, chain shirt (customisable) | Challenge (Provoke + Guard), Wrench Free (grip damage), Rally the Hearth (party heal, cleanse fear, +Surge), plus the starter's Art: **Kindle Strike** (Hearthbrand, ember, Burning), **Stillwater Thrust** (Lance, frost, 2 Chilled) or **Sunder** (Cairnmaul, crush, grip, Stagger) |
| **Pip** (halfling, d8) | Scout and relic-thief, Survival | Freckled youth, copper hair, green hood, yew bow, reed charm | Disarm (grip damage), Mark Prey, Knife Work (Bleeding), Volley (hits all foes) |
| **Bryn the Bark-Reader** (d8) | Lore and control, Knowledge | Long moss-green hair, long ears, bark markings, bark robe, bogwood ring-staff | Analyze (reveal intent, Exposed), Rootbind (verdant, Rooted), Read the Rings (party Hasted, all intents shown), Heartwood Splinters |
| **Sister Alondra** (d8) | Blind healer of Fawnrest, Attunement. Immune to Frightened, "will not take up a blade" | Deep skin, white blindfold and robe, silver crook-staff, prayer beads | Mend, Radiant Lance, Ward, Revive, Dawnsong |
| **Tamsin Vale** (rival, then guest) | Duelled 4 times, then fights beside you vs the Unsmith (`data/rivals.js` finale kit) | Vale Gauntlets, later the violet-black Tamsin's Bargain | Riposte, Cheap Shot, Showboat, Not Like This; finale: Pry It Loose, Inside His Swing, On Your Feet |

The **starter triangle** is Hearthbrand (ember) > Stillwater Lance (frost) > Cairnmaul (stone) > Hearthbrand. The brief's other companions were never recruited, but their NPCs exist: **Nettie the Swamp Witch** (Attunement), Luma, Rook and Brother Kesh (`DESIGN-BRIEF.md` §8). Stats use 4d6-drop-lowest. XP to next level is `30 × L^1.55`, for levels 1-50.

---

## 4. Foes (`game/src/data/foes.js`: 57 families, grouped by region)

**Tiers and intent dice:** rabble d6 · veteran d8 · relic-bearer d12 · champion d20 (3 phases) · hollow d20 +4 while its gift is held · the Unsmith two d20s (two moves a turn). The "Look" column paraphrases each family's `text`.

**Verdant Wilds**

| Family | Tier / aspect | Look | Signature moves |
|---|---|---|---|
| Cutpurse | rabble | Hearth Road road-rats | Pocket Sand (DEX or Frightened); Bolt (flees) |
| ★ Briarling | rabble, verdant plant | "Bramble that learned to walk the night the hearth flickered" | Seed Spit (Poisoned); Tangle (Rooted) |
| Thornhound | rabble beast | Feral hunting dogs, burrs in their hides | Lunge (charging); Pack Howl (all foes Hasted) |
| Bandit | veteran | Deserters; better armed every Waking; variant Haskett (Hartshorn) | Heavy Swing (charge); Dirty Trick (Frightened) |
| Tallyman | veteran | Ink-stained relic-thieves; ~9 named variants across regions | Tally Mark (Marked); Cheat's Cut (2 Poisoned) |
| ★ The Rot-Stag | relic-bearer, blight | "Once the white stag of Fawnrest", a black crown in its antlers | Rot Bellow (Poisoned); Rotwood Crown (2d6 blight to all, drinks it) |
| Old Snag | relic-bearer | Cart-sized boar with a hatchet in its shoulder | Wallow (Regenerating); Splitting Charge |
| ★ Briarmaw | champion, verdant | Nameless beast wearing a thorn-crown "that grew there" | Call the Briars (summons); Rootquake (Rooted); Devour |
| Smuggler | rabble | Kerchiefed fen-runners; variants Mags Kestrel, Vell Saltglass | Caltrops (Rooted); Bolt |
| ★ Boglurcher | rabble, tide | "A heap of bog with eyes in it" | Mire Grab (Rooted); Drag Under (charging) |
| ★ Glowcap | rabble plant | Child-sized mushrooms that walk toward any light | Spore Puff (Poisoned); Glow (Warded) |
| ★ Rotgrub | rabble, blight | Pale arm-long grubs fat on black sap | Latch (Bleeding); Ichor Spit |
| ★ Feral Druid | veteran, verdant | Druids who "started answering the Rot"; variant Oda the Thornmother | Barkskin; Call the Briars |
| ★ Hollowed Ranger | veteran, blight | Last Thornwatch patrol, kept walking by the Rot | Rot-Arrow; Remember ("It says a name. Its own.") |
| ★ Sapwight | veteran, blight plant | "A ghoul of bark and black sap" | Sap Leech (drains); Grasp (Rooted) |
| ★ The Gloamwing | relic-bearer, radiant | Cart-sized pale moth with the Fawnrest bell in its silk | Dreamdust (Frightened); Bell-Hum (radiant to all, Stagger) |
| ★ Gorrow the Mire-King | relic-bearer, tide | Hut-wide frog-king, the Mire Pearl in a reed crown | Belly-Flop; Undertow (Chilled) |
| ★ The Rotwarden | champion, blight | First-Age root-warden, bark through plate, a smith's mask | Blacken the Sap; Graft (summons Sapwight); Grief |
| Tamsin | relic-bearer rival | The Keep's other Warden | Riposte; Not Like This |

**Sunscorch Wastes:** Sand-Skink (rabble, ember: Sun-Spit Burning, Skitter) · Dune Scavenger (rabble: Salvage Net, Scarper) · Dune Raider (veteran, storm: Sand in the Eyes, War-Cry; Rasa, Gnash) · Glass Scorpion (veteran, stone: Glass Sting Bleeding, Carapace) · ★ Mirage Wisp (veteran, frost spirit, "a shimmer that walks on its own": Cold Touch Chilled, Beguile Charmed; the Wisp-Queen) · ★ Ash-Wight (veteran, ember undead, a Scorchgate soldier "still on watch, three hundred years after the fire": Cinder Grasp drain, Ember Breath) · The Sand Wyrm (relic-bearer: Swallow, Scale-Grind) · **Kharzul** (champion: Glasscutter, Burrow then Erupt) · **The Ashen Warden** (champion undead: Call the Watch, Scorch the Vault).

**Ironspire Peaks:** Rime Wolf (rabble, frost: Rime Bite, Circle) · Pass Brigand (rabble: Crossbow, Desert; Rhune the Pass-Warden) · Rockling (rabble construct: Roll In, Hunker) · Forge-Spark (rabble, "a living cinder the size of a fist": Singe, Flare) · Iron Sentinel (veteran construct: Gate Slam, Lock Shields) · Forgeborn (veteran slag-man: Molten Fist, Stoke) · Peak-Troll (veteran: Hurl Boulder, Regrow; Old Horn) · ★ Rime-Wraith (veteran undead, "a drowned monk of Frostmere, still wet under the frost and still singing": Dirge Frightened, Pull Under; the Drowned Abbess) · The Thunder-Roc (relic-bearer: Carry Off, Storm Mantle) · **Mother Anvil** (champion forge-golem: Anvil Strike, Bellows summons) · ★ **The Rime-Abbot** (champion undead: Toll, Drown "held under", Hushing Charmed, Call the Choir).

**Gloomfen Marsh** (the best fit for a witch game)

| Family | Tier / aspect | Look | Signature moves |
|---|---|---|---|
| ★ Mire Leech | rabble, blight | Arm-long black leech in the fords | Latch On (Bleeding); Drink (heals) |
| ★ Marsh-Light | rabble, radiant spirit | "A light over the black water... The fen folk know better than to follow one. Children do not." | Lure (WIS or Charmed); Flicker |
| ★ Lamp-Moth | rabble, radiant | Pale-gold hand-sized moths drawn to the Lantern Mother | Dust in the Eyes (Frightened); Circle the Light |
| ★ Blackwater Gar | rabble, tide | Man-long gar, "all jaw and armour"; variant Old Jaws | Leap (charging, Stagger); Dive |
| ★ Bog-Hag | veteran, blight | "A pot on the boil and a curse on the tip of her tongue"; variant Mother Grue | Hex (Hexed); Rot (Rotting); Stir the Pot (heals kin) |
| ★ Willow-Wight | veteran, verdant | A willow that walked when the wards went dark; weeps; variant Grandfather Willow | Lash (Rooted); Weep (Regenerating) |
| ★ Drowned | veteran, tide undead | Misthollow's drowned, "ringing its bell, singing its hymn"; bell-ringer, chorister, the Drowned Cantor | Drag Down (Rooted + Chilled); Toll (Frightened) |
| Hodge | relic-bearer (unique) | "Not actually a troll: just an extremely unpleasant old man"; sits on his stool at 0 HP | Toll Is Due (loses a turn); Clipped Coin ("always heads") |
| ★ The Lantern Mother | champion, radiant undead | The last lamplighter, in a mourning veil | Lure; Hush Now (Hexed); Lead Them Down; Mourning (Rotting) |
| ★ Blackwater Leviathan | champion, tide | River-long thing, chained, with a harpoon in its side | Swallow; Flood; Pearl-Light |

**The Hearth Below:** Cinder-Thrall (rabble ash-man: Cinder Fist, Reform) · ★ The Unmade (veteran blight husk "still reaching" for its lost relic: Phantom Art, Grey Touch Rotting) · Forge-Warden (veteran kiln: Bellows Breath, Hold the Bridge) · Hollow Miravel (verdant: Hollow Bloom, Every Fallen Tree) · Hollow Qasim (ember: Drought, Drink Them Dry) · Hollow Brundar (stone: Iron Grip, Ironfall) · Hollow Gretch (blight: Too Tight, Every Favour Owed) · **The Unsmith** (Unmake strikes a relic's power out; Worldfire).

---

## 5. Battle system (`game/docs/RULES.md` §1-8, `game/ARCHITECTURE.md`, `game/src/rules/battle.js`)

- **Turn model: the Initiative Ribbon.** Each unit has a `next` time and the lowest acts. `delay = 100 + weapon weight − 4 × (speed − 10)`, minimum 45. A knife weighs −20 and a maul +30. The ribbon previews the next 8 turns (`timeline(state, 8)`). Hasted ×0.7, Rooted ×1.2, Staggered +35.
- **Commands** (`commands(state, heroId)`): Attack, the hero's skills (MP), consumable items, Defend (+2 Guard, half damage, +2 MP), Legend Surge (when the gauge is full) and Flee.
- **Rolls.** d20 + bonus vs **Guard**. A natural 20 is a **Legend Strike**: damage dice doubled, +20 Surge, and 25% of max grip jarred loose. Missing by 1-3 is a **graze** for half damage. A natural 1 is a fumble (+25 delay). Advantage and disadvantage roll 2d20 and show both. Saves go against the Imprint DC `8 + IB + mod`. "Fate tokens" appear in the brief but not in the code.
- **Damage.** `(dice + flat) × skill mult × graze × armour × aspect × resist`. Physical slash, pierce and crush meet armour types hide, mail, plate and chitin (crush cracks plate and chitin).
- **The 8-Aspect wheel** (`data/aspects.js`): ×1.5 if strong, ×0.5 if weak or the same aspect.

| Aspect | Beats | Flavour |
|---|---|---|
| Ember | frost, verdant | Hearth-heat and forge-fire |
| Frost | stone, storm | Stillwater cold |
| Storm | tide, radiant | Wind and lightning |
| Stone | ember, storm | Cairn-weight, breaks grips |
| Verdant | stone, tide | Root, thorn and green |
| Tide | ember, blight | Blackwater and the deep |
| Radiant | blight, frost | Holy light of Fawnrest |
| Blight | verdant, radiant | The Whispering Rot |

  Radiant and blight beat each other: "whoever strikes first wins". The design brief planned 12 aspects; the code has 8.
- **Statuses** (`data/statuses.js`):
  - Harmful: Burning (1d6 ember a turn) · Chilled (slower; 3 stacks becomes Frozen) · Frozen (skips its turn; crush ×1.5 shatters it) · Poisoned (1d4 blight per stack) · Bleeding (1d4 per stack) · Staggered (pushed back on the ribbon, cancels a charging move) · Frightened (attacks with disadvantage) · Rooted (attackers have advantage, acts later) · Marked (advantage, +2 damage) · Exposed (−2 Guard) · Provoked (must target the provoker) · Swallowed (removed from the line, "Held under", "Led away") · Charmed (next turn attacks an ally) · Rotting (1d6 blight per stack, heals halved) · Hexed (disadvantage on attacks and saves) · Unmade (relic Surge struck out)
  - Helpful: Warded (absorbs damage) · Hasted · Regenerating · Guarding · Burrowed (untargetable) · Hearthlit (+1 to hit)
- **Intent dice.** Each foe rolls its tier die at the end of its previous turn. The face picks a move from its table (for a cutpurse: 1-3 Stab, 4-5 Pocket Sand, 6 Bolt), and the move is shown in advance ("9: Splitting Charge, charging at Pip"). `charge` moves are cancelled by a Stagger. `requires` a relic, with a `fallback`. Champions switch tables at 66% and 33% HP (a `phase` event).
- **Grip & Claim.** A holder shows one grip meter per relic. Crush damage wears it at 60% of the damage dealt, disarm skills add dice, and a Legend Strike takes 25%. At 0 the relic drops, the holder loses its Arts, and a relic-bearer's die drops a size (d12 to d8). The relic is claimed at victory. If the holder dies first, the relic shatters.
- **Legend Surge.** A 0-100 gauge per hero, kept between fights (+5 hit, +20 crit, +8 kill, plus damage taken). When full, the best equipped relic's power fires and its card slams across the screen (`cardSlam`). With no relic the hero gets a Heroic Strike.
- **Flee.** d20 + best DEX + proficiency vs 10 (+3 if a veteran is present, +6 for a relic-bearer). Never against a Champion.
- **Rewards.** XP = tier rate × level (rabble 7, veteran 16, relic-bearer 48, champion 110). Gold 3/8/25/60 per level. +20% per Omen. After a win, everyone recovers 20% HP and 25% MP.
- **Party wipe.** "Wake at the last Hearthfire, keep all gear, lose 10% of gold". You still learn 25% of the XP, and the strongest elite becomes a Grudge. Losing a rival duel is a **yield**: no penalty, and the door opens anyway.
- **API.** `createBattle({heroes, foes, allies, seed, waking, ctx})`, `current`, `commands`, `targets`, `act(state, cmd) → {state, events}`, `foeTurn`, `outcome`, `inspect`. Events include `turn`, `intent`, `roll`, `damage`, `status`, `grip`, `disarm`, `legend`, `phase`, `spawn` and `victory`. Flow is `rules/gauntlet.js` `startBattle`/`resolveBattle`. Foe data shape: `{id, name, tier, kind, aspect, armor, hp, guard, atk, moves:{}, table:[[lo,hi,move]], phases, relics, variants, gear[4 tiers], text}`. Everything is pure and seeded (`core/rng.js`).

---

## 6. Loot (`data/rarity.js`, `data/items.js`, `data/affixes.js`, `data/relics.js`, `rules/loot.js`)

**Rarity tiers**

| Tier | Colour | Base drop weight | Content |
|---|---|---|---|
| Worn | grey #8b8b8b | 100 | Base stats only |
| Wrought | white #f4f1e8 | 55 | 1 trait |
| Tempered | green #4cbf56 | 22 | 2 traits, +1 enchant |
| Runed | blue #4a8fe7 | 7 | 3 traits, 1 gem slot |
| Storied | violet #a35ee8 | 1.5 | Generated name, lore line and minor power; drops **unidentified** |
| Heirloom | gold #e8b83a | never random | Hand-made relic, signature Surge, map power |
| Regalia | teal #2fb8a6 | never random | Set pieces |
| Primal | white flame #fffaf0 | never random | Endgame (Fenwick's Poker, the Worldforge Heart, the Masterpiece) |

**Luck** bends the curve: rank *i* is weighted × (1 + luck)^(0.7 *i*). Luck = foe tier + Waking + ½ per Omen + 1 for a Grudge.

**Slots and kinds.**
- **Slots:** weapon, offhand, head, body, hands, feet, amulet, ring.
- **Weapons:** sword, dagger, axe, hammer, mace, spear, bow, staff (for example the Belt Knife, Rowan Staff, Longbow, Maul).
- **Armour:** robe, leather, mail, plate (Guard 10-17).
- **Other:** shields and foci; hood, coif, helms, circlet, crown; gloves, gauntlets, boots.

**Affixes** (33: 16 prefixes, 17 suffixes). Prefixes are named for places: *Thornwoven* (regrow HP a turn), *Eldergrown* (+max HP), *Fawnlit* (+% healing), *Bogmire* (+1d blight on hit), *Willowmurk* (resist blight), *Misthollow* (resist verdant), *Hearthstone* (+% Surge), *Veilkissed* (+MP). Suffixes are named for Domains: *of the Stalker* (+1d vs marked, rooted, frozen or staggered foes), *of the Executioner*, *of the Mender*, *of the Seer* (wider crit range), *of the Wolf-Friend*. Each roll gets 1-5 quality stars. Generated names read like "Mossbound Arming Sword of the Hunt" or "Ashwick, the Quiet Oath" (`data/names.js`).

**Drops.** Rabble drop the weapon they carry (35%). Veterans always drop a piece they visibly wear. Relic-bearers drop their relic plus 1 item. Champions drop every broken piece plus 2 items. Consumable chances are 6/15/50/100%.

**Consumables:** Hearth Tonic (2d4 + 25% HP, 20g), Bitterroot Poultice (cures Poisoned and Bleeding: "Tastes like regret"), Frost Draught (cures Burning), Ember Salts (revive at 25%).

**Relic examples** (75 relics; each has a Legend Surge and an overworld map power):

| No. | Relic (holder) | Surge / map power |
|---|---|---|
| 000 | Fenwick's Poker, primal (Fenwick) | *Stir the Coals*: party heals 3d8, Hearthlit / *Stir* lights a cold hearth |
| 007 | Rotwood Circlet (the Rot-Stag's antlers) | *The Rot Remembers*: 2d8 blight to all, Poisoned / *Hear the Rot* |
| 018 | Dawnbell (spun on the Gloamwing) | *Matins*: party heals 2d8, cleanse / weak packs scatter; "Rung, it brings the deer home" |
| 031 | Cinderfang (Kharzul's tail) | *Glasscutter*: hits every foe, Burning / *Melt Glass* |
| 053 | Hodge's Unfair Toll | *Heads I Win*: every foe's next turn delayed / summons Hodge's ferry |
| 056 | The Willow-Ward (Elder Moss) | *The Wards Hold*: Warded 3d6, sheds Hexed and Charmed / *Ward-Song* quiets witch-wards |
| 057 | The Hag-Stone (Mother Grue) | *Through the Hole*: every foe Exposed and Hexed / *Hag-Sight* sees through fog and wards |
| 058 | The Lamplighter's Lantern (the Lantern Mother) | *Every Lamp Lit*: party Warded 3d8 / *Mother's Light*: "fog and darkness step back" |
| 059 | The Mourning Veil (the Lantern Mother) | *Veil of Tears*: foes Frightened and Rotting / *Mourner's Path* |
| 066 | Nettie's Hexbane Shawl (her remedy quest) | *Undo the Knot*: shed 3 harmful statuses / *Hexbane*; "one knot for every curse she ever undid" |

**How loot is revealed** (`game/src/ui/card.js`; the reveal is frozen, approved by the player):
1. Before the fight, the relic glints on the foe, and a hold opens a greyed card stamped *HELD BY*.
2. At victory, a chest and a rarity beam appear, and the card flips with a chime that grows grander by tier.
3. The *CLAIMED* stamp slams down, then "Equip on..." lets you try it on each hero live.
4. The card shows the portrait, stats with compare arrows, the power, gem sockets, temper flames, deed pips and a provenance ribbon ("Pried from...").
5. Its back is the **Chronicle**: foes felled, the mightiest kill, and every bearer.

Storied drops arrive unidentified. Gear shows on the battle sprite and the walker.

---

## 7. Other systems

**Hilda's forge** (`rules/forge.js`, `TUNING.temper/forge`).
- **Temper** +1 to +10: +1 enchant per step. Gold `30 × ⌈ilvl/2⌉ × [1,2,4,6,8,11,14,18,23,30]`; +4 to +6 also take silver, +7 to +10 embers.
- **Reroll** one trait for gold plus scrap or silver.
- **Salvage** non-relics into scrap, silver and embers.
- **Sockets:** runed and storied items take 1; relics take 0-2. A socket costs `20 × ⌈ilvl/2⌉` gold.
- **Awakening:** a relic goes Dormant → Kindled (1-2 of its 3 deeds, a small bonus) → Awakened (all three deeds plus Hilda's rite: 2 embers and gold). It then takes branch a, "the Hand" (a physical, combat, survival or beastmastery bearer), or b, "the Heart" (the other Domains). Deeds include First Blood, Pried Loose, Legend Strike, Untouched and Fifty Felled.
- **Masterpiece** (M7): one primal weapon you name, which Hilda forges from the Worldforge page. Its Surge *Kindle* makes the party Hearthlit and Warded 20.

**Gems** (`data/gems.js`): a gem does one thing in a weapon and another elsewhere. Dusthaven Sunstone (+ember dice / resist ember) · Moss Agate (vs hurt / regen) · Glass Pearl (+hit / +MP) · Ash Garnet (+crit / +HP) · Frost Opal · **Bog Amber** (+blight dice / resist blight, regen; found in the bogs' fights and chests, sold at Nettie's Hut). Won Act II fights pay spoils by tier: scrap, silver and embers.

**Hearth rest.** Hearthfires restore the party, save, advance the day and enable fast travel from the Atlas. Some start cold and must be kindled.

**Map powers and locks** (`data/locks.js`). "Two keys for every lock": a relic's map power or a Domain level. There are 23 lock types, including Thornwall, Bramble, Stream, Cold Hearth, Darkness (soft: see 2 tiles), Rot-Knot, Ichor (burns 4% HP a step), Bog, Fog (soft), Blackwater and **Witch-Ward** ("A ring of stones hung with charms. The air in it hums."; opened by Ward-Song, Hag-Sight or Hexbane, or Knowledge 7).

**Domains** (`data/domains.js`, main character sheet). Nine Accretion Domains: Physical, Predation & Conflict, Survival, Craft, Knowledge, Influence, Attunement, Psionics and Beastmastery. On the sheet a Domain gets a Path at L3 and specialisations at L7 and L13, and the Imprint Bonus runs +2 to +6. In the game a primary Domain level equals the hero's level (secondaries half). They gate locks and pick awakening branches.

**The overworld** (`rules/world.js`). Tile maps come traced from paintings. Roaming packs spot you within 5 tiles, show a "!" and give chase. Walking into a pack's back is a First Strike; being caught from behind is an ambush. Road gates are held by guard fights (M4.5), and there is fog and darkness.

**The Ladder, bounties and quests.** The Ladder is a wanted-poster board of villain silhouettes that scouting fills in. Bounty boards pay gold. Save codes (`AETH6.`) carry progress between versions.

---

## 8. Painted art available (pixels are measured from file headers; bytes from `git cat-file -s`)

**H&H `art-in/pilot/` and `art-in/extra/`**

| File | Pixels | Bytes | Shows |
|---|---|---|---|
| pilot/cut-blue-hearth.png | 1536×1024 | 2.6 MB | Prologue still: the Council hall, the Eternal Hearth burning cold blue, Fenwick standing (in the game as CUTS `hearth-blue`) |
| pilot/cut-gold-hearth.png | 1536×1024 | 2.5 MB | The same hall a moment earlier, the fire still gold (`hearth-gold`) |
| pilot/map-keep.png | 1536×1024 | 4.2 MB | Hearthstone Keep, island fortress, courtyard and Great Hall, top-down |
| pilot/map-thornhollow.png | 1254×1254 | 3.7 MB | Thornhollow, rangers' outpost with a living thorn-wood palisade |
| extra/world-aethermoor.jpg | 1536×1024 | 0.6 MB | The whole continent from above: central lake and Keep, forest W, desert SE, peaks NE (title backdrop `title-world`) |
| extra/region-gloomfen.jpg | 1536×1024 | 0.6 MB | Labelled Gloomfen: Mirrordeep, Bogmire, Misthollow, Rotbridge, Willowmurk, Tidal Flats, Aethersea (`region-gloomfen`) |
| extra/path-stone-bridge.png | 1536×1024 | 4.1 MB | Dirt road onto an old stone bridge, willow on the bank (walkable map Old Bridge) |
| extra/path-meadow.png | 1536×1024 | 4.5 MB | Winding path through a meadow, old oak, drystone wall (Drystone Lea) |
| extra/path-plank-bridge.png | 1536×1024 | 4.5 MB | Forest road over a stream on a plank bridge (Plankford) |
| extra/path-forest-ruin.png | 1536×1024 | 4.4 MB | Forest road, broken stone arch, carved standing stone (Shrinewood) |
| extra/path-waterfall.png | 1536×1024 | 4.2 MB | Forest road past a waterfall and clear pool (Silverfall) |
| extra/path-palisade-camp.png | 1536×1024 | 4.0 MB | Forest crossroads, palisade gate, fire ring, log bench (Last Camp) |

**H&H `art-in/maps/`** (whole-map top-down paintings, each traced as walkable ground)

| File | Pixels | Bytes | Shows |
|---|---|---|---|
| map-hearth-road.webp | 832×2240 | 0.9 MB | Oak-lined earth road north from the Keep, plank lake bridge |
| map-thornway.webp | 960×1792 | 0.8 MB | Verdant forest path, dark oak crowns |
| map-briarmaw-den.webp | 512×576 | 0.2 MB | Cave of living root and thorn, arena |
| map-mossfall.webp | 1664×704 | 0.7 MB | Mossy marsh ringed by willows, foot of Mosswatch Tower |
| map-mosswatch-1.webp | 448×512 | 0.1 MB | Tower ground floor, moss and ferns in flagstones |
| map-mosswatch-2.webp | 384×384 | 0.07 MB | The Lamp Room atop the tower |
| map-hindwood.webp | 1024×1280 | 0.8 MB | Deep oak woods, glades on a narrow trail |
| map-fawnrest.webp | 704×640 | 0.3 MB | Hushed shrine clearing, blue-green trees, Dreaming Stone court |
| map-eldergrove.png | 1347×1168 | 3.8 MB | Village among giant First-Age roots, the Eldest Tree |
| map-heartroot-1.png | 1254×1254 | 3.4 MB | Root tunnels under the Eldest Tree |
| map-heartroot-2.png | 1330×1182 | 3.0 MB | The Heart Chamber, pale ring-floors |
| map-keep-hall.webp | 768×448 | 0.2 MB | The Great Hall, granite and flagstones, hearth chimney |
| map-keep-gallery.png | 1881×836 | 3.0 MB | Sunscorch Gallery (reliquary room) |
| map-keep-gallery-2.webp / -2-door.png | 576×256 | 0.07 / 0.4 MB | Ironspire Gallery (the -door copy adds an east door) |
| map-sun-road.png | 799×1969 | 3.5 MB | Sunward Road: lake, plank causeway, desert road |
| map-sandspire.png | 1347×1168 | 3.3 MB | Sandstone mesa trade city |
| map-dust-trail.png | 1736×906 | 3.4 MB | Red canyon with an aqueduct |
| map-dusthaven.png | 1310×1201 | 3.3 MB | Sooty mining camp, rails, shaft head |
| map-deep-shaft-1.png | 1254×1254 | 3.3 MB | Timbered mine tunnels |
| map-deep-shaft-2.png | 1254×1254 | 3.1 MB | The Glass Heart crystal cavern |
| map-glass-flats.png | 1651×953 | 3.4 MB | Dune sea with amber glass lumps |
| map-miragewell.png | 1316×1195 | 3.6 MB | Palm oasis well-court |
| map-scorchgate.png | 1254×1254 | 3.4 MB | Burned black-stone fortress city |
| map-scorchgate-vaults.png | 1254×1254 | 3.1 MB | Basalt vault halls, ash drifts |
| map-rockslide-pass.webp | 832×1920 | 0.8 MB | Mountain pass through a slide |
| map-peaks-veil.webp | 896×768 | 0.3 MB | Monastery with bell tower |
| map-highfold.webp | 960×1280 | 0.7 MB | Scree slopes, the Roc's eyrie |
| map-iron-stair.webp | 768×1792 | 0.7 MB | Dwarf-cut switchbacks |
| map-ironhold.webp | 1024×896 | 0.2 MB | Thane's dwarf hall |
| map-ironhold-deeps.webp | 896×896 | 0.3 MB | Harrow's abandoned works (dark) |
| map-harrows-forge.webp | 640×576 | 0.2 MB | The cold forge, Mother Anvil's lair |
| map-stormwatch.webp | 832×768 | 0.3 MB | Army outpost |
| map-frost-road.webp | 1536×832 | 0.6 MB | Tundra road over the ice |
| map-frostmere.webp | 1152×960 | 0.6 MB | Frozen lake, drowned shrine, hole in the ice |
| map-frostmere-below.webp | 704×704 | 0.2 MB | Ice cave, the Rime-Abbot, Hush |

**H&H `art-in/batch-3/`, the Gloomfen** (all ★ for a witch world; traced from paintings)

| File | Pixels | Bytes | Shows |
|---|---|---|---|
| map-murkway-a.png / -b.png | 1024×1536 each | 4.5 / 4.4 MB | Bog safe-paths: black pools, reeds, bog-willows, plank path, cliff stair, a reed shrine |
| map-willowmurk.png | 1536×1024 | 4.5 MB | Hidden village of reed huts under weeping willows, plank walks, moot-circle, ring of ward-stones |
| map-rotbridge.png | 1536×1024 | 3.6 MB | Ancient carved timber bridge over the black channel, toll-house |
| map-bogmire.png | 1536×1024 | 3.6 MB | Stilt town, plank streets, moot-hall, lanterns on poles |
| map-lanternfen.png | 1536×1024 | 4.1 MB | Eerie open bog, dead grey trees, a sunken hut, faint lights over the water |
| map-mothers-hollow.png | 1536×1024 | 4.3 MB | Drowned grove of black willows around a sunken house with every window lit |
| map-long-boardwalk-a/-b/-c.png | 1536×1024 each | 3.6 / 3.5 / 3.5 MB | Planks on stilts over black water, lamp-posts, reed islets, mist to the east |
| map-misthollow.png | 1536×1024 | 4.4 MB | Sunken city: leaning towers, arcades, two belltowers, salvage camp |
| map-drowned-belfry.png | 1024×1536 | 4.1 MB | Pillared bell-hall under the city, green water-light, hanging bells |
| map-blackwater-reach.png | 1536×1024 | 4.4 MB | Lower channel, towpath, drowned mill, sunk boats |
| map-tidal-flats.png | 1536×1024 | 4.4 MB | Mudflats, wrecks, barge-camp, great chain into the sea |
| map-causeway.png | 1536×1024 | 4.5 MB | Raised stone causeway across shallows, morning after rain |
| map-keep-gallery-3.png | 1536×1024 | 4.1 MB | Gloomfen Gallery, torch-lit reliquary room |

Also on H&H: `art-requests/**/refs/*.png` holds 43 tool-drawn layout references (0.07-0.4 MB). They are not paintings. `game/src/ui/assets/paint/*.js` and `cuts/*.js` are these same paintings embedded as WebP. H&H's **battle backdrops are procedural code**, not paintings (`game/src/art/scenes.js` `BACKDROPS`, 45 keys such as `lanternfen` with wisps and mist, and `mothers-hollow` with moths). Batch 4 (the Act III maps and ending stills) was requested (`art-requests/batch-4.md`) but never arrived. **main**'s interactive map embeds one 1536×1024 PNG continent map.

**TH `thareia/art-in/` and demo assets**

| File | Pixels | Bytes | Shows |
|---|---|---|---|
| continent/Aethermoor-Complete-Map.png | 1536×1024 | 4.2 MB | New continent painting: Keep island in Mirrordeep, the four biomes (world map / title) |
| continent/Aethermoor-01…06-*.png | 512×512 each | ~0.6 MB each | The six crops (NW, N-centre, NE, SW, S-centre, SE) |
| regions/01-Verdant-Wilds.png | 1536×1024 | 4.2 MB | Fjord port with an airship mast, Mosswatch, Eldergrove tree-houses, Thornhollow, Fawnrest with white deer |
| regions/02-Northern-Heartland-and-Hearthstone-Keep.png | 1536×1024 | 4.1 MB | Keep island with airship docks, bridge, lakeshore villages, farmland |
| regions/03-Ironspire-Peaks.png | 1536×1024 | 4.2 MB | Ironhold with an airship, Peak's Veil, gatehouse, steaming hut |
| regions/04-Gloomfen-Marsh.png | 1536×1024 | 3.7 MB | ★ Two stilt towns with masts, boardwalks, Rotbridge, sunken Misthollow, mudflats |
| regions/05-Southern-Lowlands.png | 1536×1024 | 4.1 MB | Farms, hedges, ruined chapels and arches, coastal tower, marsh edge W |
| regions/06-Sunscorch-Wastes.png | 1536×1024 | 3.9 MB | Sandspire column with airships, oasis, canyon mines, Scorchgate |
| auros/auros-visible-face.png | 1536×1024 | 3.9 MB | Auros the amber-gold moon: silver plains, crystal spire forests, crater lakes, the Brightlands |
| airship/airship-skiff-turnaround.png | 1536×1024 | 2.0 MB | The first skiff in four views: wooden hull under amber sunstone crystals |
| scenes/town-square.png | 1448×1086 | 3.2 MB | Town square, three-quarter view (traced walkable in demo 2) |
| scenes/walk-stream-and-ruins.png | 1448×1086 | 3.3 MB | ★ Stream through ruins, three-quarter walking map |
| scenes/walk-graveyard-path-night.png | 1448×1086 | 3.2 MB | ★ Graveyard path at night, walking map |
| scenes/dungeon-temple-courtyard.png | 1448×1086 | 3.2 MB | Temple courtyard dungeon, walking map |
| scenes/battle-forest-ruins.png | 1448×1086 | 3.2 MB | ★ Battle backdrop: forest ruins, side view, open floor (used in demo 2) |
| scenes/battle-graveyard-night.png | 1448×1086 | 3.2 MB | ★ Battle backdrop: graveyard at night |
| scenes/battle-dark-cathedral.png | 1448×1086 | 2.9 MB | ★ Battle backdrop: dark cathedral |
| scenes/battle-temple-hall.png | 1448×1086 | 3.1 MB | Battle backdrop: temple hall |
| scenes/cut-town-at-sunset.png | 1448×1086 | 3.2 MB | Cut-scene / establishing vista: town at sunset |
| scenes/walk-top-*.png (6) | 1536×1024 | 4.0-4.5 MB | Byte-identical copies of H&H's six `path-*.png` |
| demo/assets/gloomfen.webp | 1536×1024 | 0.6 MB | The Gloomfen region painting as WebP |
| demo/assets/skiff-top.webp | 507×507 | 0.05 MB | Skiff top view cut from the turnaround |

Size guide (TH 04): a walking map as WebP at q80 is about 410-430 KB, and a battle backdrop at 1024 wide about 180-260 KB.

---

## 9. For the writer: keep vs clash

**Keep (fits a cozy moonlit witch game)**
- **The Gloomfen cast and places:**
  - **Nettie the Swamp Witch** ("Healer, herbalist, witch. Two of those you can buy. The third you don't cross. Mind the jars; some bite.") is a natural mentor or rival.
  - **Elder Moss** speaks in riddles, and Willowmurk has witch-wards and ward-stones that "sing".
  - Other places: Sedge's herb stall, Bogmire's stilt market, the Lanternfen's marsh-lights, drowned bells under Misthollow, and the Long Boardwalk under lamps.
- **Moonlit-ready foes:** marsh-lights, lamp-moths, glowcaps, willow-wights, boglurchers, mire leeches, bog-hags, the Drowned, rime-wraiths, the Rot-Stag, the Gloamwing, and Gorrow the frog-king.
- **Tender bosses:** the Lantern Mother ("She's kind, and wrong") is the ideal model. She is a grieving ghost to be released, not slain.
- **Non-lethal defeat framing:** `koText` lines (Hodge "sits down on his stool"), a lost duel as a yield, a wipe that keeps your gear, and Grudges that are "never a wall".
- **Mechanics that read as witchcraft:** Hexed, Charmed, Rotting, Warded, Rooted, Regenerating. The Radiant-vs-Blight pair can become moonlight vs rot, and Tide and Verdant fit marsh and river.
- **The visible-loot hook and card reveal**, which both the player and TH call the best part. So do herbal consumables (Bitterroot, Hearth Tonic), Bog Amber, and the fog and darkness soft-locks lifted by a lantern relic.

**Clashes**
- **Scale.** 160-relic ambitions (75 built), 8 Brands, the Waking escalation, 4 councils and 3 endings are far too big for 20-40 minutes. Borrow the rules, not the plot.
- **Violence and dread:**
  - Bleeding stacks, "Devour", swallowing heroes, the Rot's ichor and "Grey Touch".
  - Children led away by the Lantern Mother.
  - Council members hollowed; the Unmade husks; relics shattered by killing their holders.
  - For a cozy tone, lean on scaring off, calming or releasing foes, and drop Bleeding.
- **Witch as enemy.** The Bog-Hag and Mother Grue make hags into foes. Recast them as cursed or rival witches, or swap in bog creatures.
- **The moon.** H&H has no moon or sky lore. Thareia canon puts **Auros** "always overhead", which can supply the moonlight. The two canons contradict each other (00-starting-point):
  - Elder Moss is "he" in H&H but a halfling woman in canon.
  - Hodge's toll game vs Dock Bramble's 1 gp toll.
  - Fenwick vs Fen Rootwalker.
  - The Sleepers-as-fuel vs the Ember Line.
  Pick one canon for names.
- **Martial, masculine-coded names:** Hearthwarden, Brands, the Unsmith, Tallymen, Worldforge, and "hammer in a broken ring". Keep them only as distant background.
- **Look.** H&H and TH use 16×24 and 64×64 code-drawn pixel sprites (TH rejected upscaled sprites). The new game's "3D chunky characters" is a new art path. The painted backdrops (TH `scenes/`, H&H `batch-3/`) carry over directly.
- **No harvesting system exists.** Herbs appear only as shop stock (Sedge's Herbs, Nettie's Hut) and consumables. The nearest pieces to build on are chests, forge spoils (scrap, silver, embers), gems, and Nettie's remedy quest.
