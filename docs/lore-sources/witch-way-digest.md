# Follow Me Down Witch Way: lore digest for the merge

Repo: `/home/user/follow-me-down-witch-way`, read-only. Paths below are relative to it. `BUNDLE` = `materials/Witch-Way-Bundle/Witch-Way-Current-Lore-and-PNGs`.

This digest is longer than planned because the rosters of herbs, characters and places are complete. For a quick read, start with §1 (the rules), §7 (anything fight-shaped) and §9 (merge notes); treat §3-6 as reference tables.

**Source ranking (the repo's own):**
1. `witch_game_assets/design/LORE.md`: the Chapter 1 bible. It wins on names and wording.
2. `BUNDLE/lore/01-Region-1-Existing-Game-Lore.md`: Chapter 1 mechanics as built.
3. `BUNDLE/lore/02-Beyond-Wickhollow.md`: the adopted Chapters 2-3 bible. It is byte-identical to `…/Chat_Archive/01_Lore/OFFICIAL_…Beyond_Wickhollow.md`.
4. `BUNDLE/lore/03-Story-Arcs-Discussion.md`: interpretation only. Its proposed additions are not canon.
5. `docs/PLAN.md` and `docs/DEPENDENCIES.md`: the user's decided defaults for gaps in the story.

**Other branch:** `origin/claude/bold-brahmagupta-amnclm` points at the same commit as the checked-out branch (`0754d3c`), and `git diff` between them is empty. It has no extra lore docs. Its only lore-adjacent file is `game/src/lore.js`, which parses LORE.md at runtime.

Chapter = region: Chapter 1 is Wickhollow, Chapter 2 is the Sable Fells, Chapter 3 is the Cradle. Only Chapter 1, the Falls Stair and Lower Steepwick are built. The rest of Chapters 2-3 is fully designed but not built (`docs/NOTES.md`).

---

## 1. World and tone rules
*Sources: LORE.md "The story", "Tone", "Retired ideas"; 02-Beyond-Wickhollow §1-2*

**Premise (LORE.md):** "Nothing is wrong with the world. There is no curse to lift, no villain and no clock. There are friends with small troubles, a grimoire to fill, and a full moon worth gathering under."

**Always (LORE.md, verbatim):**
- "**Dark in look, kind at heart:** moonlight, candle glow, crooked graves and friendly ghosts."
- "**Holistic witchcraft.** Brews are remedies for small troubles: sleep, a tired heart, cold hands, protection and remembrance. Graveyards and crypts are places of remembrance."
- "**Relaxing.** Nothing can hurt her, nothing is lost for good, and a night lasts as long as the player likes."
- "**Gentle mischief.** A crow pinches herbs, a mandrake screams if she's rude, and overdosed brews go comically wrong."
- "**Kind ghosts.** In Wickhollow the dead don't haunt. They linger over one small unfinished thing, and once it's done they stay because they like it here."

**Never (LORE.md, verbatim):** "gore, fighting, curses, danger, deadlines, money, or ghosts meant to frighten."

**Rules that hold in every region (Beyond §2):**
- "**Nothing can hurt her.** No fighting, curses, danger, deadlines or money, in any region. Every challenge is a puzzle of care."
- Nobody fades away once helped. Vesper Keep stays scenery. Wren is never in danger.
- Every region brings new herbs, a new way of gathering and a new idea about how herbs work.
- Every region has "a bed (sleep still turns the moon), a moonwater source, a place to brew, a handful of friends, one gate that a remedy opens, and one set piece that plays like a boss without the fight."
- Every region points onward: "one plant that doesn't belong, growing at the region's calmest spot, and a ghost who knows where it came from."

**Setting and era (Beyond §1):** the world reads as the mid-1800s, somewhere the railway hasn't reached, over "an older, medieval layer" (Sir Aldous, the empty keep). The bible names the target feel directly: "That's the Final Fantasy IX feeling: a storybook past with a newer world creeping in at the edges." The further from home she goes, the more modern the world gets:
- Region 1: candles, lanterns and folk remedies.
- Region 2: a water-powered lift, an observatory and a post runner.
- Region 3: miners' rails and a hermit's copper still.
- Region 4: gaslight, printed herbals and a glasshouse.
- Region 5: the coast and a lighthouse.

"None of it is a threat."

**Theme by region (Beyond §1):** Region 1 is care, Region 2 is rest ("the one remedy that's for her"), Region 3 is wonder. Regions 4 and 5 are "the wider world, then home." The shape of the journey is "up, then in, then down": the intro's last line, "Follow me down", becomes the shape of the whole game.

**Retired ideas: never use (LORE.md):**
- A fading moon, or anything that threatens or drains it, including the chalice.
- Wren vanished, trapped or in danger.
- "The restless dead who must be guided home, and ghosts who fade away once helped."
- Vesper Keep as a place to go, and the four-night chapter structure.
- Three rune shards that open a path to the keep.
- Sir Aldous holding the crypt key.
- Money, including silver or coins used as currency.
- "The hedge witch", or any personal name for her.
- "The frail old herbalist and the race to finish before moonset."
- The cracked chapel bell.
- The title "Walk With Me Down Witch Way", and the old intro lines.

---

## 2. The Moonlight Witch
*Sources: LORE.md "The Moonlight Witch"; manifest.json `walker`/`showcase`; dialogue.json; images in `witch_game_assets/showcase/` and `title/title_bg.png`*

**Name:** "the Moonlight Witch, with no other name." A personal name is a banned idea.

**Look, canon (LORE.md):** "a tall plum hat with cream horns and a chain of silver charms, round glasses, long wavy hair, a sheer purple veil and shawl stitched with gold, a black dress, buckled boots, and a silver athame."

**Look, as observed in the finished art** (not stated in any text):

| Detail | What the art shows |
|---|---|
| Hat | Magenta-plum, wide-brimmed, with a tall crooked tip |
| Horns | Curled cream horns, like a ram's, at the hat band |
| Hat charms | Gold and brass symbols and small dangling charms hang from the band |
| Hair | Very long, dark brown and wavy |
| Glasses | Round |
| Neck | A pendant with a crescent or cross |
| Shawl and veil | Magenta shawl with a ragged hem and dotted gold trim; the sheer veil can hang down her back or cover her face and hat |
| Dress | Black and layered, with a laced bodice |
| Legs and boots | Dark stockings; black buckled knee boots |
| Athame | A silver dagger, often with a small charm hanging from the hilt |
| Basket | Wicker (`witch_17_kneel_gather`) |

**Charms on the hat:** friends' charms go on the hat. Hilde gives "a Horseshoe charm for your hat chain", Rosalind "a little Bell charm for your hat", Bram "a Moth charm for your hat". Bram also asks: "Is your hat heavy? Why has it got horns?"

**Abilities (LORE.md; 01-Region-1; manifest):**
- **Moonlight:** "a circle of silver light around her that shows hidden herbs, buried curios and the runes of Witch Way." She casts it by holding confirm. Its radius is 48 px, and the Owl charm makes it 1.5 times wider.
- **Witchfire:** "the violet flame in her hand. It lights the cauldron, candles and lanterns, and blesses every brew." Only a grave candle lit with witchfire satisfies the moon altar.
- **The athame:** "it cuts herbs and nothing else."
- **Spirit Sight:** comes from the hag stone, not from her. Keep it separate from Moonlight and from witchfire (01-Region-1, "Foundations to retain").
- **Stillness** (Chapter 2): she sits or stands still so calmbud will open.

**Home:** Grandmother Wren's cottage at the edge of Wickhollow, with its cauldron, altar and "very old armchair". Wren taught her everything, left her the cottage and the grimoire, and retired to the coast.

**Personality:** "curious, kind, quietly brave and a little mischievous. She talks to plants and apologizes to mandrakes." 01-Region-1 adds: "observant, affectionate, and occasionally wry." The Story Arcs file (a proposal) describes her as "the one who couldn't sit still" and says she has to learn to rest. Wren's letter: "you were always the one who couldn't sit still."

**Voice:** grimoire notes are "first person, warm and dry, and often end on a small joke". Examples:
- "Admire the spots. Don't lick them." (glowcap)
- "Say sorry before you lift it, or it screams and my hat ends up in a bush." (mandrake)
- "Travelers once tucked it in their boots so they'd never tire. I tried it. My boots smell lovely." (silver mugwort)
- "It's also meant to keep witches away. Rude." (hag stone)
- "Wren said the goblins were welcome to it. I haven't met any goblins. I did check." (goblin's gold)
- "Wren says plants are terrible at keeping secrets." (eyebright)
- "The Edge takes a hat from everyone eventually. I'm keeping one hand on mine." (the Edge's hat)
- Quiet Cup: "For a long while I didn't think about anything at all. Then I thought about everyone, which was lovely. Then I slept."
- Still Mirror: "The moon has watched over me every night of my life. It was nice to return the favor."

**Art assets:**
- 17 showcase poses (`witch_game_assets/showcase/`). They include `witch_03_veil_lunge` ("Lunging forward with the veil over her face, dagger out"), `witch_11_dagger_dash` ("Dashing forward with the dagger thrust out"), `witch_01_cast`, `witch_16_cast_moonlight`, `witch_15_witchfire` and `witch_14_hat_off`.
- A 79 px walking sprite (`game/art/walker/witch_walker.png`) with droopy-hat and no-hat variants.
- There is no sitting pose yet (`docs/ART-NEEDED.md` B9).

---

## 3. Places
*Sources: LORE.md; manifest `backgrounds`; `game/data/regions/*.json`; `BUNDLE/backgrounds/README.md` and `scene-index.json`; `docs/ART-NEEDED.md`. Every background is 1448×1086.*

**The route:** Witch Way is marked by runestones carved with its sign, "a line through a diamond". It "only shows by moonlight" and runs from Wickhollow through the Gloamwood to the Hollow. After Chapter 1 it turns out to climb higher.

### Chapter 1: Wickhollow and the Gloamwood

| Place | One line | Background |
|---|---|---|
| Wickhollow (the village square) | The well, St. Vesper's chapel, a graveyard with an angel statue, Hilde's smithy, Quill's striped stall, the cottages and the stone bridge over the Sable. Its lanterns burn moonpetal oil. | `witch_game_assets/backgrounds/village.webp` |
| Her cottage | Brewing ("Pick Your Poison"), the altar, sleep | `witch_game_assets/screens/cottage.png` (a menu backdrop); the full painting `versions/path-polish/witch_game_assets/backgrounds/cottage.webp` is not walkable |
| The lantern path | The Gloamwood's gentlest stretch: lanterns, a waterfall and footbridge, the foxglove bank, the glowcap hollow, red lilies and gatherers' baskets. Silas's wayside kettle, crock, bench and moth-bower are here, and so is the hidden stair up. | `witch_game_assets/backgrounds/lantern_path.webp` (reference: `BUNDLE/references/region1/REF-01-Lantern-Path.webp`) |
| The stepping stones | Where Witch Way crosses the stream by an old ringed standing stone. The water runs high until the roots help. The hag stone is here. | `witch_game_assets/backgrounds/stepping_stones.webp` |
| The moonlit pond | A still pond with lily pads and a stone bench, "where the moon's reflection sits all night". Bram's coin is here, and so is the single calmbud. | `witch_game_assets/backgrounds/moonpool.webp` (reference: `REF-02-Moonlit-Pond.webp`) |
| The Hollow | A marshy old graveyard behind the twisted grove: green-glowing runestones, wisps, bone-hung trees, Inkblot's nest, and an iron gate toward Vesper Keep that stays shut | `witch_game_assets/backgrounds/hollow.webp` |
| The crypt | Under St. Vesper's: skull niches, hooded statues holding candles, green-flamed braziers, and the tomb in the candle circle (the moon altar). "Quiet rather than frightening." The painting also shows a great door with a horned-skull carving and hanging iron cages; no text mentions either. | `witch_game_assets/backgrounds/crypt.webp` |
| The Sable riverbank | An old jetty, a leaning willow and a stone bench where Rosalind's picnics were held | `game/art/backgrounds/sable-riverbank.webp` (reference: `REF-03-Sable-Riverbank.png`) |
| Vesper Keep | "The empty castle on the hill, seen from every outdoor scene. Nobody has lived there for a hundred years." Scenery only. | No background. It is visible on the skyline of `village.webp`, `hollow.webp` and `title/title_bg.png`. The manifest lists "A Vesper Keep background for a later update" as nice-to-have. |
| Story screens | The Full Moon Gathering; Wren's visit; the title and intro | `witch_game_assets/screens/full_moon_gathering.png`, `wren_visit.png`; `witch_game_assets/title/title_bg.png`, `intro_bg.png` |

### Chapter 2: the Sable Fells
Cold, clear air, with the wind as "the mountain's weather and its voice". The palette is blue and silver, slate, snow, gold larches, purple heather and amber windows. Rowan grows by every door "to keep witches out. She tries not to take it personally."

The full PNGs are in `BUNDLE/backgrounds/`. Only `r2-01` and `r2-02` exist as game webps (`game/art/backgrounds/`). Story states are in `materials/Witch-Way-PNGs/`.

| Place | One line | File |
|---|---|---|
| The Falls Stair | An old stair beside the Gloamwood's waterfall, its steps worn into cups, with a glowing runestone at every landing | `r2-01-falls-stair.png` |
| Lower Steepwick | A village in tiers: the Weary Mule inn (with a mule dozing by the trough), a market, a stream in a stone channel, and the lift's bottom station | `r2-02-lower-steepwick.png` |
| Upper Steepwick | The lift's top tank, a bell tower, goats on a roof, and Hester's domed observatory. The view falls away to Wickhollow. | `r2-03-upper-steepwick.png` |
| The Larchwood | Switchbacks through gold larches, a charcoal burners' camp and an owl. At the top bend, a rockfall is the region's gate. | `r2-04-larchwood.png`; closed state `r2-04-larchwood__rockfall.png` |
| The Shieling Pastures | High pasture, drystone walls and sleeping sheep. Wren's hut has a plum door and an iron wren on the roof. Beehives sit in wall niches. | `r2-05-shieling-pastures.png` |
| The Moon Tarn | A round dark lake holding the moon, with a drawing stone. A scree zigzag climbs to the ridge. | `r2-06-moon-tarn.png` |
| Hatless Edge | A knife-edge ridge above the clouds with gusts of wind. A lost hat sits on a cairn. Vesper Keep is seen from above. | `r2-07-hatless-edge.png` |
| The Lull and Sablehead | A windless bowl where the Sable wells up into a stone basin. Calmbud grows here, with an old stone seat, a worn runestone and a dark cleft. | `r2-08-lull-sablehead.png`; moonlight states `r2-08-lull__light-1/2/3.png` |
| Weary Mule and Wren's hut (interiors) | Where she sleeps and brews | No art yet (ART-NEEDED D1, D2) |

### Chapter 3: the Cradle
Caves inside the mountain "where every stream in the valley starts". There is no sky. The only moonlight comes down through roof shafts, and plants grow only where it lands. The palette is limestone and cream, with gold-green moss glow and green foxfire. "The mood is deep quiet, never fear. Nothing down here means her any harm."

| Place | One line | File |
|---|---|---|
| The Breath | A dripping, fern-furred cleft that breathes slowly, like a sleeper, with a wet stair down | `r3-01-breath.png` |
| The Moonwell Cavern | Three roof shafts over three terraces, a drip pool of moonmilk, and a hat-shaped stalagmite called "the Old Witch" | `r3-02-moonwell-cavern.png`; states `r3-02-moonwell__waxing/full/waning.png` |
| The Glimmer Galleries | Old mine workings: timber props glowing with foxfire, rails, a tipped ore cart, and the knockers' chalk marks. No lanterns. | `r3-03-glimmer-galleries.png`; state `…__cold-light.png` |
| The Still Mirror | An underground lake "so still it looks like a second ceiling", with a stone jetty and a stone boat. "The quietest place in the whole game." | `r3-04-still-mirror.png`; state `…__sleeping-moon.png` |
| The Apothecary's Grotto | A hermit's cave garden under a skylight: a cot, a desk, a huge herbal and a cold copper still | `r3-05-apothecarys-grotto.png` |
| Candlecombe | The miners' village on the far side, with a cheese cave, chapel and bakehouse. The lowlands and a river town lie beyond. | `r3-06-candlecombe.png`; state `…__cheese-door-open.png` |

**Not canon:** the pre-official prototypes in `…/Chat_Archive/03_Generated_Assets/Pre_Official_Region_2_Background_Prototypes/` were made before the official lore existed.

---

## 4. Characters
*Sources: LORE.md "The ten friends"; manifest `game.friends`; dialogue.json; Beyond §5-6; Round-01 `asset_manifest.json`. Chapter 1 art is in `witch_game_assets/npcs/<id>/` (a portrait, a happy portrait, a standing sprite and a "moment" sprite). Chapters 2-3 art is in `materials/Witch-Way-Bundle/Witch-Way-Round-01/PNG/R02_*`/`R03_*`.*

### Chapter 1: four living, five ghosts and Wren
Ghosts show only through the hag stone. They are drawn at 70-80% opacity with a glow and a bob.

| Friend | Look | Personality and trouble | Wants | Gives |
|---|---|---|---|---|
| **Hilde**, blacksmith (the smithy) | Forties, broad; copper braid wrapped around her head; soot on her nose; moss-green tunic; leather apron | Loud and warm, laughs at everything ("Ha!"). She has hammered all night and her heart won't settle. | Heartsease Tonic, then Warding Salt for the smithy door | Her work gloves (needed to pick wolfsbane), then the Horseshoe charm |
| **Mister Quill**, peddler (the striped stall) | Tall, thin, older; silver goatee; plum frock coat with too many pockets; striped waistcoat; watch chain; fingerless gloves; quill behind his ear; top hat hung with trinkets | Sly; "everything is a swap." His fingers ache in the cold. | Warming Balm | The "empty" wisp jar. After that he swaps any brew or dud for two herbs from any phase. Duds are "vintage". |
| **Inkblot**, Quill's crow (everywhere) | Glossy black with a blue-violet sheen, amber eyes, a brass leg ring, and a missing tail feather | "A thief with good intentions." He pinches one common herb from her basket each night. | His feather, which is in his nest in the Hollow | He stops stealing and leaves her an herb every night, rare ones included |
| **Tobias Grimsby**, sexton (St. Vesper's) | Sixties, stooped; bushy eyebrows and mutton-chops; patched coat; scarf; flat cap; amber lantern; iron keys | Gruff, jumpy, soft-hearted. He hasn't slept since Agnes died, and he is scared of ghosts. | Hush Tea | The crypt key. Once reunited with Agnes: "Scared of ghosts? Me? Never. Married to one, aren't I?" |
| **Silas**, lamplighter, ghost (the lantern path) | Lanky and young; long coat with brass buttons; peaked cap; lamplighter's pole | Patient and proud. The wisps keep blowing out his flame, so he has never finished his rounds. | Lantern Oil | The Owl charm. His local story, Silas's Last Lantern, involves the moth-bower. |
| **Rosalind**, ghost (the Sable bridge) | High-necked old gown; hair drifting "as if underwater"; a silver bell on a ribbon at her throat | Wistful and dramatic. She has waited 100 years for someone to bring her a rose. | A nightrose | The Bell charm. Her separate riverbank story is about a lost picnic ribbon. |
| **Agnes Grimsby**, ghost (the chapel graveyard) | Small, plump, elderly; round spectacles; a knitting needle through her bun; apron with a heart; always knitting | Sweet and scatterbrained. She can't remember her husband's name. | Remembrance Incense | The Heart charm and a reunion with Tobias. Agnes's note leads to the calmbud. |
| **Little Bram**, ghost (the well) | About eight, freckled, gap-toothed; suspenders; a cap too big for him with a pale moth on it | Cheerful and full of questions. He lost his wishing coin in the pond 100 years ago and forgot his wish. | His coin | The Moth charm. His wish was "a friend. Now he has one." |
| **Sir Aldous**, ghost (the crypt) | A tall knight in old plate; a surcoat with a crescent-moon emblem; drooping mustache; weary eyes | Formal and very tired. He has guarded the Moon chalice so long he forgot why, and he hasn't seen the sky in centuries. | Veil Tea | The Moon chalice and the Moonlit Draught recipe. "I was waiting for the next witch. For you." He stays: "Someone must keep the crypt tidy." |
| **Grandmother Wren** (letters, then a visit) | Silver braid; round spectacles; plum shawl; an old patched horned hat, an older version of the witch's, with a seashell on its band and a tiny wren on the brim | Warm and stubborn. She is retired to the coast. | — | Letters on full moons with hints and recipes. She visits when the grimoire is full. |

### Chapter 2: the Sable Fells

| Friend | Look | Story | Reward |
|---|---|---|---|
| **Clem Pugh**, lift-keeper (Lower Steepwick) | Fifties, small and wiry; grey curls under a knitted cap; oilskin coat; spanners; a brass whistle | Proud of her lift but terrified of heights. She has run it for 20 years and never ridden it. A Steady Head gets her in; she rides with her eyes shut and bursts out laughing at the top. | The lift runs whenever the witch likes |
| **Hester Vane**, stargazer (the observatory) | Sixties; a man's greatcoat over a velvet dress; inky fingers; spectacles pushed up into white hair; a brass telescope taller than she is | "Exact, dry and quietly thrilled." Her eyes ache (she needs Clear Sight), and later she keeps nodding off (she needs Watchful Bitters). | The moon almanac, then a look through the telescope at the full moon |
| **Mabyn Hale**, beekeeper (16), and **Gideon Hale**, ghost (the Pastures) | Mabyn: freckled, veiled straw hat, patched smock, bee smoker. Gideon: round and pink, veil pushed back, a bee on his nose that has never stung him. | Nobody "told the bees" when Gideon died, so the hives sulk. Hive Smoke settles them long enough for Gideon to tell them himself. | A comb of heather honey every night. Gideon stays "because the pastures are lovely in summer." |
| **Jem Tully**, post-runner (from the Falls Stair to Steepwick) | Lanky; mailbag; red neckerchief; mud to the knees; a grin | Talks while he runs and knows everyone's business. He is worn to a thread and needs a Runner's Draught. | Hobnail soles for the scree; Wren's letters now reach her on the mountain |
| **Bracken**, collie (the Pastures) | Old, black and white; grey muzzle; one ear up | Dignified and stiff in every leg. He needs Arnica Balm. | Shows her the sheep trod, a shortcut down to the village |
| **Nibble**, goat (all of Steepwick) | Small and white; a beard; a torn ear; "no manners" | "A thief with no good intentions at all." She eats the bitterest herb in the basket every night. | Once the witch finds her lost bell, she eats the trod's brambles instead |

Other folk in the scene descriptions: shepherds, beekeepers, market sellers, the dozing mule, sleeping sheep, and the Larchwood owl. The owner of the Edge's hat is unnamed.

### Chapter 3: the Cradle

| Friend | Look | Story | Reward |
|---|---|---|---|
| **The knockers** (the Glimmer Galleries) | Grey spirits the size of a lantern; bearded; miners' caps; leather aprons; tiny hammers | Helpful and shy. They used to knock to show miners the good seams and went quiet when the galleries went dark. Cold Light lights the galleries; Heartening Smoke brings back their rhythm. Until then, one curio a night turns up "somewhere silly". | They knock the way through, and afterward they knock wherever rare herbs grow |
| **Nutmeg**, pit pony, ghost (the Galleries) | Small, round, chestnut; white blaze; shaggy fringe; blinkers pushed up; four too-tight shoes | Patient and a little sad. Her shoes have pinched for 100 years. A sprig of moonwort pops them off, and she gallops the Moonwell. | She follows the witch "like a large, cheerful dog". The shoes go to Hilde's smithy door. |
| **Ambrose**, hermit apothecary (the Grotto) | Thin and elderly; a white beard tucked into his belt; moth-eaten velvet jacket; three pairs of spectacles on cords; ink to the wrists | Gentle, distracted, delighted by ferns. He came down 40 years ago to catalogue the Cradle and never left. His eyes are failing, and he needs Owlsight. | The copper still (for tinctures) and a letter of introduction to the Apothecaries' Hall |
| **Bess Cotter**, cheese-maker (Candlecombe) | Seventies, broad and floury; white cap; forearms "like a blacksmith's" | Blunt and generous; cheese is the answer to most things. Damp in her cave makes everything grow fur (she needs Cellar Smoke). Later she has a toothache (she needs Tooth Tincture). | A wedge of cave cheese every night, then the cheese-cave key, which is a shortcut |

**Regions 4-5, sketches only:** the Apothecaries' Hall, Wren's cliff cottage and a lighthouse. No characters are defined.

---

## 5. Herbs and gathering
*Sources: LORE.md "Herbs", "The moon"; manifest `phases`/`collectibles`/`gather_needs`; 01-Region-1 almanac; Beyond §3-6*

**The moon:** it "is never in danger." Each time she sleeps it moves one phase: **full → waning → new → waxing → full**. Play starts on a full moon.
- Full nights are clear.
- Waning and waxing nights have drifting clouds, so clear-moon herbs open and close.
- New moon is "the darkest night, when the wisps are busiest and ghost pipe blooms."

Each patch can be gathered once a night. The basket holds 12 slots of 5 each; the Horseshoe charm adds 4 slots. Herbs can be returned "to the earth" and keep their grimoire page.

**Gathering rules** (`gather_needs`):
- **none:** press to pick.
- **moonlight:** hidden until her Moonlight reveals it.
- **clear_moon:** only while no cloud covers the moon.
- **gloves:** needs Hilde's gloves.
- **gentle:** hold to apologize first. A quick tap still picks it, but it screams and knocks her hat off for about 8 seconds.
- **stillness** (calmbud): sit still.
- Chapter 2 adds **reach, pry and draw dew**. Chapter 3 adds **the angle of the light, scrape and scoop**.

### Chapter 1 herbs (13)

| Herb | Where | Moons | Rule / virtue | For |
|---|---|---|---|---|
| Moonpetal | Woods' edge, village walls, the pond | F, Wx | Light | Lantern Oil, Moonlit Draught. Wickhollow's lanterns burn its oil. |
| Witch's Bells | Foxglove bank | F, Wa, Wx | Dose herb; Heart | Heartsease Tonic |
| Glowcap | Glowcap hollow | Wa, N | Warm | Warming Balm |
| Wisp-sprout | Wherever wisps rest (the lantern path, the Hollow) | Wa, N | Moonlight; Calm; rare | Wisp-Calm |
| Ember-star lily | Red flowers in the Gloamwood | F, Wa | Warm | Warming Balm ("lights the way home for anyone who's lost") |
| Mandrake | Woods' edge | N, Wx | Gentle (say sorry); dose herb; Root | Rootwalk Draught |
| Lavender | Village gardens | every night | Calm | Hush Tea, Wisp-Calm ("settles even the jumpiest wisp") |
| Silver mugwort | Along the stream | F, Wx | Memory and Endure | Hush Tea, Rootwalk, Remembrance |
| Wolfsbane | By the waterfall | Wa | Hilde's gloves plus Moonlight; dose herb; Ward; rare; poisonous | Warding Salt |
| Chapel moss | Oldest chapel-yard stones | every night | Memory | Remembrance Incense, Moonlit Draught |
| Nightrose | Village climbing roses; the restored riverbank | F, Wx | Clear moon only; Heart | A gift for Rosalind |
| Bogwick | The Hollow's marshy banks | Wa, N | Light ("the Hollow's own candles") | Lantern Oil |
| Ghost pipe | The crypt floor | N only | Moonlight; Veil; rare; "flinches from lanterns" | Veil Tea, Moonlit Draught |

Silas's garden on the lantern path has four cultivated patches (lavender, wisp-sprout, bogwick and a sheltered moonpetal). These are exceptions that grow off-schedule.

### Chapter 2 herbs (9)

| Herb | Where | Moons | Rule / virtue |
|---|---|---|---|
| **Calmbud** | One plant by the pond bench (after Agnes's note); thick in the Lull | F only | Be still; Calm; "three from one moon" |
| Wild thyme | Steepwick terraces, pastures, the Edge | every night | Heart ("for courage") |
| Eyebright | High meadows | F, Wx | Sight |
| Arnica | High meadows | F, Wa | Mend; balm only (the cauldron spits it out of anything else) |
| Roseroot | The Edge's ledges, beside the falls | Wx, F | Reach; Endure |
| Juniper | Larchwood edges | every night | "Mind the needles"; Ward |
| Saxifrage | Rockfall cracks, scree boulders | Wa, N | Pry; Root ("stone-breaker") |
| Gentian | High pastures | Wa, N | Wake; bitter, needs honey |
| Lady's mantle | Moon Tarn margins | every night | Draw the dew; Clear ("the pot forgets its mistake") |

Calmbud's note: "It won't open for anyone in a hurry. Sit beside it, let your shoulders come down from your ears, and it unfolds a little with every breath… Wren kept one dried bud over her armchair and swore it was for guests."

### Chapter 3 herbs (6)

| Herb | Where | Moons | Rule / virtue |
|---|---|---|---|
| Moonwort | Turf at the lip of the Breath | F | Open. It "pulls the shoes off any horse… opens any lock". Hilde won't have it in the smithy. |
| Hart's-tongue fern | The Breath, old well shafts | every night | Heart |
| Maidenhair fern | The Still Mirror's walls | every night | Ward ("never gets its feet wet") |
| Goblin's gold | Gallery niches | Wa, N | Only shows with the light behind her; Light |
| Foxfire | Old timber props | Wa, N | Scrape; Light ("light with no flame") |
| Toothwort | Candlecombe hazel roots | N only | Mend |

**Chapter 3 bases and terraces:**
- **Moonmilk** replaces moonwater underground, three scoops a night, because "moonwater goes flat without the moon to look at."
- **Moonwell terraces:** the east shaft is lit on waxing moons, the centre on full, the west on waning, and none on the new moon.
- PLAN §4's decided default for what grows there: moonpetal and eyebright on the east and centre terraces, glowcap on the west.

**Virtues table (Beyond §4):** Calm, Heart, Warm, Light, Memory, Ward, Root, Veil, Mend, Sight, Endure, Wake, Clear, Open. Chapter 2 remedies accept any herbs with the right virtues. "The doctrine of signatures" is the puzzle hint: eyebright looks like an eye, toothwort like teeth.

---

## 6. Brewing, duds, charms and items
*Sources: LORE.md; manifest `brewing`; 01-Region-1; Beyond; PLAN §3*

**How brewing works:** the brewing screen is called **"Pick Your Poison."** The steps are:
1. Light the cauldron with witchfire.
2. Add one moonwater. The well gives three a night.
3. Add up to three herbs.
4. Stir.
5. Bless with witchfire.

Chapter 1 recipes are exact. Three dose herbs (witch's bells, mandrake and wolfsbane) are checked first, so two of any one of them makes a dud.

### Chapter 1 brews (10)
| Brew | Ingredients (+ moonwater) | Effect / for |
|---|---|---|
| Hush Tea | lavender + silver mugwort | Dreamless sleep; Tobias; crypt key |
| Heartsease Tonic | witch's bells | Steadies a heart; Hilde; gloves |
| Warming Balm | ember-star lily + glowcap | Warms hands; Quill; wisp jar |
| Wisp-Calm | lavender + wisp-sprout | "The wisps settle and drift aside"; opens the Hollow; calms the moth-bower |
| Warding Salt | wolfsbane | "Guards a doorway"; Hilde; Horseshoe |
| Rootwalk Draught | mandrake + silver mugwort | Roots rise into a bridge (a one-use gate opener) |
| Lantern Oil | moonpetal + bogwick | "A flame no wind or wisp can blow out"; Silas; Owl |
| Remembrance Incense | chapel moss + silver mugwort | Helps a ghost remember; Agnes; Heart |
| Veil Tea | ghost pipe | "Thins the veil between worlds"; Aldous; chalice |
| Moonlit Draught | moonpetal + ghost pipe + chapel moss | "Light, dark and remembrance in one cup"; the ending |

### Chapter 2 brews (8)
- **Steady Head** (thyme + lavender): Clem.
- **Clear Sight** (eyebright + moonpetal): Hester.
- **Watchful Bitters** (gentian + heather honey): Hester.
- **Hive Smoke** (juniper + lavender, burned at the hives): the bees.
- **Runner's Draught** (roseroot + mugwort): Jem.
- **Arnica Balm** (arnica + glowcap, rubbed in): Bracken.
- **Stonebreak Draught** (saxifrage + mandrake): "the rockfall… splits along its cracks and rolls aside."
- **The Quiet Cup** (three calmbud from one full moon, in Sablehead spring water, brewed over witchfire at the spring): "made once, for the witch herself."

Chapter 2 also adds three preparations. Smoke "changes a place"; tea changes a person. Balm is rubbed on. Bitters need something sweet.

### Chapter 3 brews (5; moonmilk base)
- **Cold Light** (foxfire + moonpetal): "a light with no flame"; opens the deep galleries.
- **Heartening Smoke** (hart's-tongue + thyme): the knockers.
- **Owlsight** (eyebright + goblin's gold): Ambrose.
- **Cellar Smoke** (juniper + maidenhair): Bess.
- **Tooth Tincture** (toothwort + glowcap, in the copper still): Bess. It is the first tincture, and "keeps for many nights."

Nutmeg needs no brew: the moonwort itself is the gift.

### Duds
Each dud is a harmless, comic effect that lasts about 60 seconds. Resting clears it.

| Chapter | Dud | Cause | Effect |
|---|---|---|---|
| 1 | Hiccup Tonic | 2+ witch's bells | She hiccups bubbles |
| 1 | Droopy Hat Draught | 2+ wolfsbane | Her hat wilts |
| 1 | Bellow Broth | 2+ mandrake | She can only shout (dialogue in capitals) |
| 1 | Swamp Tea | Any other wrong mix | She turns faintly green |
| 2 | Crosspatch Tea | Calmbud from two moons | She stomps and says "hmph" at flowers |
| 2 | Sourpuss Tea | Gentian without honey | Her face puckers |
| 2 | Rose-Tinted Tea | Too much roseroot | Bees follow her |
| 3 | Loose Buttons | Too much moonwort | Every button, buckle and bootlace pops open |
| 3 | Glow Tea | Too much goblin's gold | She glows "and can't sneak up on anything" |

Putting arnica in a cup is a separate gag: the cauldron spits it back out.

### Charms
Charms hang on her hat and give passive perks.

| Charm | From | Perk |
|---|---|---|
| Horseshoe | Hilde | Basket +4 slots |
| Owl | Silas | Moonlight reaches 1.5 times farther |
| Bell | Rosalind | Chimes near a rare herb |
| Heart | Agnes | Every brew makes two (duds too) |
| Moth | Bram | Walks 25% faster |

### Curios
**Chapter 1:**
- **Moonwater:** "Well water that held the moon's reflection all night."
- **Grave candle:** the only flame the altar accepts.
- **Wisp jar:** a calmed wisp in it drifts toward rare finds.
- **Crow feather.**
- **Hag stone:** gives Spirit Sight; "meant to keep witches away. Rude."
- **Wishing coin.**
- **Rune shard:** glows toward the next herb she needs.
- **Crypt key.**
- **Grimoire:** "The duds get pages too; Wren insisted."
- **Moon chalice:** "Anywhere else, it's just very fancy tea."
- **Keepsakes that are not grimoire pages:** Hilde's gloves, Rosalind's ribbon and Agnes's note.

**Chapter 2:** heather honey, the moon almanac (shows the nights until the next full moon), hobnail soles, Nibble's bell (brass, on a red ribbon) and the Edge's hat.

**Chapter 3:** moonmilk, Nutmeg's four shoes, the copper still, a letter of introduction, plus cave cheese and the cheese-cave key.

**Grimoire:** Chapter 1 has 47 pages (13 herbs, 10 curios, 10 brews, 4 duds, 10 friends).

---

## 7. Threats, mischief and anything fight-shaped
*Sources: all of the above, plus `game/src/config.js`, `ambience.js`, `witch_game_assets/fx/`, `…/Chat_Archive/01_Lore/ARCHIVE_PreOfficial…md`*

**Plainly: the sources contain no foes, no combat, no villains, no bosses, no curses and no danger.** The bibles ban them outright, in every region: "Nothing can hurt her… Every challenge is a puzzle of care." The Chapter 3 art prompts forbid "horror, bones, monsters, lava or threatening darkness." The superseded archive draft rejects a cave that is "a monster lair waiting to be cleared" and says: "No villain, combat system, world-ending threat… is required. Any later combat decision remains separate." That last line is the only place any source leaves room for combat.

Below is everything in the sources that has a fight-like shape, and how the canon frames it.

**Wisps (will-o'-wisps).** These are the closest thing to a mob.
- **Look:** a small green flame with a round pale face, big dark eyes and a curling tail (`witch_game_assets/fx/wisp_128.png`, `wisp_48.png`, `wisp_small.png`).
- **Behaviour:** they drift on the lantern path and in the Hollow. Their numbers rise by phase: 3 on a full moon, 4 on waning or waxing, 7 on a new moon, when they are "busiest" (`config.js WISPS_BY_PHASE`). They "keep blowing out" Silas's flame. Nine of them crowd the grove into the Hollow and block the way until Wisp-Calm makes them "settle and drift aside." They dart through the moth-bower and Silas's last lantern.
- **Framing:** Wren: "Wisps are shy, not wicked." Silas: "they don't mean it." A calmed wisp becomes a helper in the jar.
- **Counters in the lore:** Wisp-Calm, lavender ("settles even the jumpiest wisp"), wisp-sprout ("No wisp can resist its own sprout") and Lantern Oil.

**Nuisances.** Each one "attacks" in a small way:
- **Inkblot** steals one herb a night.
- **Nibble** eats the bitterest herb a night; she has "no good intentions at all".
- **The knockers** hide one curio a night.
- **The mandrake** screams and knocks her hat off if she is rude.
- **Hatless Edge gusts** blow her hat back along the path.
- **The bees** sulk and won't settle. Gideon's bee has "never once stung him."

**Obstacles that a remedy opens.** Each region has one of these, and each is the "boss door":
- **Chapter 1:** the stream running too high (Rootwalk Draught), the wisp-crowded grove (Wisp-Calm) and the locked crypt (the key).
- **Chapter 2:** the rockfall above the Larchwood (Stonebreak Draught), plus the scree (hobnail soles).
- **Chapter 3:** the dark deep galleries, where "candles gutter and die" (Cold Light).

**Rot and decay.** The only rot in the sources:
- Damp in Bess's cheese cave, where "everything is growing fur" (Cellar Smoke fixes it).
- Foxfire is fungus that has been "nibbling" the mine props for 100 years.
- The music track is titled "Herbal Decay" (`materials/Witch-Way-Bundle/Audio/`).
- There are no blights and no rotting land.

**Curses.** There are none, and the rules ban them. Two items are said to ward off witches: the hag stone and the mountain rowan. Both are played as jokes.

**Other dangers:**
- Wolfsbane is "poisonous right down to the root" (it needs gloves).
- Ghost pipe "flinches from lanterns."
- Nothing else in the sources is dangerous.

**Set pieces that "play like a boss without the fight".** Beyond §4 describes these as "something large that needs several steps in a single night."
- **Chapter 2, Three from One Moon:** moonlight fills the Lull bowl from east to west. She follows it, sits still and gathers one bud at each lit place.
- **Chapter 3, Where the Moon Sleeps:** on a new moon she carries Cold Light while the knockers knock the way ahead, crosses stepping stones, and rows the stone boat out to the sleeping moon's reflection. She does not wake it.

**Places and imagery that look dark:**
- The Hollow: a marsh graveyard, bone-hung trees, green runestones, and a shut iron gate. Its message in the code is "The iron gate toward Vesper Keep remains closed."
- Vesper Keep: empty for 100 years, and banned as a destination.
- The crypt: skull niches, hooded statues and green braziers. The art adds a horned-skull door and hanging cages that no text explains.
- The Breath "breathes like a sleeper."
- The sleeping moon lies under the Still Mirror.

**Troubles in Chapters 2-3.** Every one is a small ache or worry, never a hostile force:
- Clem's fear of heights, Hester's tired eyes and sleepiness, the grieving hives, Jem's exhaustion and Bracken's stiff legs.
- Nibble's lost bell.
- The quiet knockers, Nutmeg's pinching shoes, Ambrose's failing sight, and Bess's damp and toothache.

**Battle-shaped assets that already exist:**
- The witch's combat-like poses: `witch_03_veil_lunge`, `witch_11_dagger_dash`, `witch_01_cast`, `witch_16_cast_moonlight` and `witch_04_front_flame`.
- Duds that behave like status effects.
- Charms that behave like equipment perks.
- Brews that work like consumable items.

**Banned ideas that would be the obvious "enemies":** the fading or drained moon, restless dead who must be guided home, Wren in danger, Vesper Keep as a quest, the rune shards that open the keep, and the race before moonset.

**Superseded (not canon) draft with a conflict engine:** Brackenrise and Stillwater (`ARCHIVE_PreOfficial…md`). Its plot had failed hush-lamps, a shared "distress" signal causing dreams, and "an old instruction that now causes harm": a root floodward, set during a storm, that keeps closing a channel. The resolution was to understand and release it. It was replaced by the Sable Fells and Cradle.

---

## 8. Story beats, Chapters 1-3
*Sources: LORE.md "How the story unfolds", "The ending"; 01-Region-1 "The main story"; Beyond §3, §5-6; docs/DEPENDENCIES.md*

### Chapter 1: care (Wickhollow)
1. **Night 1.** Wren's first letter: "the cottage is yours now, and so is Witch Way." She draws water and gathers lavender and mugwort. Hush Tea helps Tobias, who gives her the crypt key.
2. **The stream.** A mandrake and mugwort make the Rootwalk Draught, and roots rise into a bridge. At the stepping stones she finds the hag stone and meets the ghosts. Her Moonlight finds Bram's coin in the pond.
3. **Helping around Wickhollow**, mostly in any order:
   - Hilde: Heartsease, then her gloves, then wolfsbane, then Warding Salt.
   - Quill: Warming Balm; he gives the jar and starts his swaps.
   - Rosalind: a nightrose.
   - Agnes and Tobias: Remembrance Incense reunites them. Agnes's note points to the calmbud by the pond.
4. **The Hollow.** Wisp-Calm opens it. Inside are bogwick, Inkblot's feather (returning it turns his theft into gifts) and the rune shard. Lantern Oil helps Silas. The local stories, Silas's Last Lantern and Rosalind's riverbank ribbon, fit in here.
5. **New moon.** Ghost pipe blooms in the crypt. Veil Tea lets Aldous see the sky, and he gives her the Moon chalice and the Moonlit Draught recipe.
6. **Ending: the Full Moon Gathering.** On a full moon, at the tomb in the candle circle, she lights a grave candle with witchfire and pours the Moonlit Draught into the chalice. Light runs up through the chapel, and every lantern in Wickhollow flares. Everyone she helped, living and dead, feasts at the well. Wren's last letter: **"I knew you'd find your way. Love, Wren."**
7. **After the ending.** When the grimoire is full, Wren comes home and hugs her at the cottage door (`screens/wren_visit.png`).

**Wren's letters:**
- Night 1: Tobias and the stream.
- Second full moon: "Wisps are shy, not wicked…"
- Third full moon: "Moonpetal for the light, ghost pipe for the dark, chapel moss so nobody is forgotten."

### Chapter 2: rest (the Sable Fells)
1. **The bridge from Chapter 1.** On the first full moon after the Gathering, she sits on the pond bench and picks the calmbud. The grimoire opens by itself to Wren's page, "The Quiet Cup": "You've looked after every one of them. There's one more remedy, and it's for you." Her Moonlight then finds runestones by the waterfall, and the Falls Stair opens.
2. **Early stories.** She meets Jem on the stair (Runner's Draught; he gives hobnails and the mountain letters start). In Lower Steepwick she meets Clem (Steady Head; the lift) and Nibble, and sleeps at the Weary Mule. She carries moonwater up from Wickhollow.
3. **Upper Steepwick.** Hester's two remedies earn the almanac and the telescope.
4. **The Larchwood.** She finds Nibble's bell in a bramble. On a new moon, a Stonebreak Draught (saxifrage + mandrake) clears the rockfall.
5. **The Pastures.** Wren's hut becomes her bed and cauldron; its door sticks, and there is a spider behind the kettle. Hive Smoke lets Gideon tell the bees, and Mabyn leaves honey every night. Bracken's balm opens the sheep trod.
6. **The Moon Tarn** gives water and lady's mantle. **Hatless Edge** has gusts, roseroot and the lost hat.
7. **Set piece: Three from One Moon** in the Lull on a full moon. She gathers three buds, brews the Quiet Cup at the spring, drinks it on the stone seat, and watches Wickhollow's lanterns go out far below. Then she sleeps. If the moon sets before she has three buds, "Nothing is lost"; she tries again next full moon.
8. **The way onward.** When she wakes, the cleft behind the spring is breathing, goblin's gold glows inside, and there is **Gideon's note:** "The spring isn't where the Sable starts. It only comes up here for air. Follow it down. — G. Hale"

### Chapter 3: wonder (the Cradle)
**The Cradle's secret:** "Every night at moonset, the moon's reflection sinks down through whatever water was holding it, down through the stone, until it reaches the Still Mirror… On new moons it stays down there all night." That is why moonwater works.

1. The Breath leads to the Moonwell, where she finds moonmilk and learns the terraces by phase.
2. **Ambrose** needs Owlsight. He gives her the copper still and a letter of introduction, and his grotto becomes her cot and hearth.
3. In the **Glimmer Galleries**, Cold Light lights the deep galleries. Heartening Smoke brings back the knockers' rhythm. Moonwort frees **Nutmeg**, who becomes a companion; her shoes go to Hilde's door, which changes Wickhollow.
4. In **Candlecombe**, **Bess** needs Cellar Smoke (and gives cheese nightly), then Tooth Tincture (and gives the cheese-cave shortcut).
5. **Set piece: Where the Moon Sleeps**, on a new moon at the Still Mirror. The ending is quiet, and she can linger as long as she likes.
6. **The hook to Region 4.** A lowland plant grows where "no seed should ever have landed", and Nutmeg noses it. She remembers the meadows beyond the mountain and walks toward Candlecombe. Region 4 (a gaslit river town) and Region 5 (the coast and Wren) are sketches only; the user has decided nothing about Region 4.

---

## 9. Notes for the merge writer
*Sources: all of the above*

**Names to keep exactly** (LORE.md "Names"):
- The heroine is "the Moonlight Witch".
- Places: Wickhollow, the Gloamwood, Witch Way, St. Vesper's, the Sable, Vesper Keep.
- Her things: the grimoire and the athame.
- Magic: Moonlight, witchfire, Spirit Sight.
- Buttons: **"Walk with me"** (start) and **"Where were we?"** (continue).
- The brewing screen: **"Pick Your Poison"**.
- The pop-up when she finds something: "Found it!"

**The logo** is "Follow Me Down" small and in gold, with "Witch Way" large in blackletter (Jacquard 12). The body font is Pixelify Sans.

**Intro text** (manifest, verbatim):
> When the moon rises, / an old path wakes in the woods. / They call it Witch Way. // Moonpetal, ghost pipe, / witch's bells... I gather / them, brew them, share them. // Follow me down.

**Running jokes:**
- **Her hat is the running gag.** A mandrake knocks it into a bush. Wolfsbane wilts it. Hatless Edge steals hats. Bram asks why it has horns. Hilde offers something "for that hat of yours". Wren wears an older horned hat.
- **Things meant to keep witches out:** the hag stone ("Rude.") and the rowan by every door.
- **Mischief-makers,** one per region: Inkblot, Nibble, the knockers.
- **Duds get pages:** "Wren insisted." Quill calls duds "vintage" and says of his swaps, "We both did very well. I did slightly better."
- **Hilde's "Ha!"**
- **Inkblot's "Kraa."**
- **Tobias's eyebrows.**
- "Everything up here needs honey."

**Motifs:**
- The moon, and its reflection sleeping in still water.
- Following the river: up, in, then down to the sea.
- Three moonwater a night.
- Runestones marked with a line through a diamond.
- Lanterns and flames that won't go out, and light with no fire.
- Remembering (Agnes, Aldous, Bram, Rosalind, Silas).
- Kind ghosts who stay after they're helped.
- Rest and sitting still ("let your shoulders come down from your ears").
- "Nothing is lost."
- A plant "one step too early" pointing to the next region.
- Kettles and tea.

**Structure worth copying:** the user's source bible already describes each region as bosses without fights:
- one "gate a remedy opens"
- one set piece that "plays like a boss without the fight"
- one mischief-maker
- rest, water and brewing points
- a handful of friends with small troubles

That is the same skeleton as an FF9-style area with a save point, a shop, an obstacle and a boss. It is a natural place to attach battles if the merge adds them, but it would be new, not canon.

**Open canon questions the user has not settled** (03-Story-Arcs; CURRENT-DIRECTION):
- How openly the witch admits she struggles to rest.
- The proposed "resting habits" for Jem, Hester and Bracken.
- The name of the lowland plant.

**Assets ready to reuse:**
- The Chapter 1 kit (`witch_game_assets/`), including 128 px portraits and map sprites for every friend.
- 40 Round-1 illustrations for the Chapter 2-3 cast and items (`materials/Witch-Way-Bundle/Witch-Way-Round-01/PNG/`).
- The Chapter 2 herb and curio cards (`…/Chat_Archive/03_Generated_Assets/Region_2_Plants`, `Region_2_Curios`).
- The music "Herbal Decay" (two versions, in `materials/Witch-Way-Bundle/Audio/`).
- Still missing: the Chapter 3 brew and dud pictures, both interiors, both set-piece screens, and a sitting pose for the witch (`docs/ART-NEEDED.md`).
