# Art batch 2 (20 images)

**How to use this:** paste each prompt into your image tool. Every prompt marked **[match style: file]** names the picture to attach as the style reference. Some prompts also say **[also attach: file]**, a second picture for a character's or the airship's look. Name each file with its number, like `01-world-map.png`, zip them all, and send the zip back. High resolution is great; I'll compress everything.

**Where the reference pictures are:**

| File named in a prompt | Where to find it |
|---|---|
| `04-Gloomfen-Marsh.png` | New-game repo, branch `claude/tender-babbage-4wiplk`: `thareia/art-in/regions/04-Gloomfen-Marsh.png` |
| `airship-skiff-turnaround.png` | The same branch: `thareia/art-in/airship/airship-skiff-turnaround.png` |
| `wickhollow-square.webp`, `cottage-inside.webp`, `graveyard-path.webp` | This repo: `art/backgrounds/` |
| `graveyard-night.webp` | This repo: `art/battle/` |
| `moonrise.webp`, `witch-at-her-door.webp` | This repo: `art/stills/` |
| `witch-calm.webp` | This repo: `art/portraits/` |
| `hilde-agnes.webp` | This repo: `art/faces/` |
| `silas_standing.png` | Witch Way repo: `witch_game_assets/npcs/silas/` |

**No character sprites.** Every character, every foe and the airship are built in 3D in code. Only the movie stills and the portraits have people in them.

Three rules apply to every background (02 to 05):

- **Camera:** use the same high three-quarter view as the reference picture: looking down at about 30 degrees, straight on, not rotated, with no fisheye. The 3D camera in the game copies this angle, so it matters most.
- **Empty:** no people, animals, ghosts, airships or text. The game adds the characters and the skiff in 3D.
- **Floor:** leave clear open floor or planks in the middle where characters can walk.

Three rules apply to every battle backdrop (06 to 09):

- **Camera:** low and close, seen from the side, like `graveyard-night.webp`. The ground is a wide, open, flat stretch across the lower half where the fighters will stand, and the scenery rises behind it. Not top-down.
- **Empty:** no people, animals, ghosts, creatures or text.
- **Night:** a full moon, violet and indigo shadows, silver moonlight, and a few warm or violet lamp lights.

---

## The world map: for flying the airship (landscape 3:2, the largest size you can make)

**01 · The world map, from Wickhollow down to the Gloomfen, at night** [match style: `04-Gloomfen-Marsh.png`]
> A painted fantasy region map seen from high above at a three-quarter angle, in the same detailed painted style,
> scale and richness as the attached map, but at night under a full moon: deep violet and indigo land, silver moonlight
> on the water, and warm amber windows. In the upper left, a small lantern-lit village at the edge of a dark forest:
> a chapel with a bell tower and a small graveyard, a cobbled square with a round stone well, cottages with plum-coloured
> roofs, an arched stone bridge over a river, and an old wooden jetty by a willow. North and east of the village, the
> forest: a lantern-lit path past a waterfall, and a marshy hollow of twisted trees with green-glowing standing stones.
> An empty old castle on a hill far off at the top edge. From the village the river winds down across the whole picture,
> through heath, hedged fields and small woods, getting wider and darker as it goes, into a great marsh in the lower
> right: black pools, reed beds, plank paths, a long boardwalk on stilts with tiny lamp posts, and a stilt town of
> reed-thatched houses on plank streets around a round plank square, with a tall airship mooring mast. Near the stilt
> town, a grove of black willows around a half-sunken house with every window lit, and further out in the water the
> leaning towers of a drowned town. The sea's edge in the far bottom corner. Leave plenty of open land and water between
> the village and the stilt town to fly over. No text, labels, compass rose, border or frame. No airships, people or
> creatures. Landscape 3:2, the largest size you can make: at least 1536×1024, ideally 3072×2048 or bigger.

## Backgrounds: Bogmire, the fen town (landscape, 1536×1024 or larger)

**02 · Bogmire, the moot-circle and the mooring mast** [match style: `wickhollow-square.webp`]
> A small stilt town in a marsh at night, seen from a high three-quarter view looking down at about 30 degrees.
> Plank streets on stilts over black water lead to a round plank square in the middle, with a reed-thatched moot-hall on
> the far side and a round iron fire basket on a stone plinth in the square. Crooked stilt houses with amber windows and
> window boxes of grey, wilted herbs. Tall lamp poles with small lanterns burning violet-pink flames, with planters of
> candle-like reeds at their feet. On the right, a tall wooden airship mooring mast with an empty landing platform and
> coiled ropes. At the left edge, the door of a crooked hut with coloured bottles glinting in its window. Rowboats tied
> to the stilts, willows and mist beyond. Leave the round square and the plank streets clear to walk on. Detailed
> pixel-art-style painting, violet night, amber and violet lamplight. No people, animals or airships.

**03 · Nettie's hut, inside** [match style: `cottage-inside.webp`]
> The inside of a swamp witch's cluttered hut on stilts at night, seen from a high three-quarter view looking down at
> about 30 degrees. A peat fire under a black iron pot in the middle of the back wall. Shelves and racks of stoppered
> bottles in sea-glass green, ruby, amber and emerald. Jars with their lids tied down with string, one lid lifted a
> crack as if whatever is inside might bite. Bunches of bog-cotton and reeds drying from the rafters, and knotted
> charms of string and small bones. A narrow cot with a patchwork quilt on the right, a wooden rain barrel by the door,
> and a round window on the left looking out at violet lamplight over the marsh. Plank floor with a rag rug, clear to
> walk on. Door at the bottom. Detailed pixel-art-style painting, warm peat-fire light against violet shadows. No people
> or animals.

## Backgrounds: the fen, Bogmire's wild places (landscape, 1536×1024 or larger)

The Murkway already exists (`graveyard-path.webp`, from Thareia). These two sit beside it. The Wickhollow wild places reuse Witch Way's lantern path and Hollow paintings, and Wickhollow's jetty reuses Witch Way's Sable riverbank.

**04 · The Long Boardwalk** [match style: `graveyard-path.webp`]
> A long wooden boardwalk on stilts over still black marsh water at night, seen from a high three-quarter view looking
> down at about 30 degrees. The boardwalk runs from the bottom-left corner to the top-right corner, with a wider landing
> in the middle and a low rope-and-post rail. Lamp posts along it burn small violet-pink flames. Reed islets, lily pads,
> a small punt tied to one post, and mist thickening toward the top, where the boardwalk fades away. The full moon
> reflects in the water. Quiet, lonely and lovely, not scary. Leave the planks clear to walk on. Detailed pixel-art-style
> painting. No people, animals or ghosts.

**05 · Mother's Hollow** [match style: `graveyard-path.webp`]
> A drowned grove of black weeping willows at night around a half-sunken old house, seen from a high three-quarter view
> looking down at about 30 degrees. The house stands near the top, leaning in black water up to its windowsills, and every
> window glows with many small lanterns in warm amber and violet. A plank path winds from the bottom edge across the water
> to the house's porch steps, which end in a small dry landing. Willow branches hang all round, with lily pads, lamplight
> shimmering on the water, and low mist. It is the saddest, loveliest place in the marsh: grief, not horror. Leave the
> plank path and the porch landing clear to walk on. Detailed pixel-art-style painting. No people, animals or ghosts.

## Battle backdrops (landscape 4:3, 1448×1086 or larger, the same shape as the reference)

**06 · The Gloamwood at night** [match style: `graveyard-night.webp`]
> A clearing beside a woodland path at night, seen low and close from the side. In front, a wide open stretch of mossy
> ground and packed earth across the lower half. Behind it: old twisted oaks, a mossy standing stone carved with a
> simple line through a diamond, tall purple foxgloves and red lilies, small glowing mushrooms, an old iron lantern on a
> post, unlit, and a thin waterfall far back between the trees. The full moon through the branches and low mist. Detailed
> pixel-art-style painting, cozy but a little eerie.

**07 · The open fen** [match style: `graveyard-night.webp`]
> A stretch of open bog at night, seen low and close from the side. In front, a wide flat shelf of firm dark peat and
> old boards across the lower half. Behind it: black pools with lily pads, reed beds, dead grey trees, a few old leaning
> gravestones sinking into the moss, a broken plank path, faint green lights far out over the water, low mist, and the
> full moon reflected in black water. Eerie but gentle, not scary. Detailed pixel-art-style painting.

**08 · The Long Boardwalk** [match style: `graveyard-night.webp`]
> A wide platform on a long boardwalk built on stilts over black water at night, seen low and close from the side. In
> front, broad weathered planks across the lower half, with a low rope-and-post rail along the back edge. Behind it: the
> boardwalk running away into mist, lamp posts with small lanterns burning violet-pink flames, reed islets and lily pads
> on still water, and the full moon's reflection. Quiet and sad-lovely. Detailed pixel-art-style painting.

**09 · Mother's Hollow, the sunken house** [match style: `graveyard-night.webp`]
> The front of a half-sunken old house in a drowned grove of black willows at night, seen low and close from the side.
> In front, a broad plank landing across the lower half, before the house's porch steps. Behind it: the house leaning in
> black water up to its windowsills, every window glowing with many small lanterns in amber and violet, weeping black
> willows hanging all round, lamplight shimmering on the water, mist, and the full moon. Grief, not horror. Detailed
> pixel-art-style painting.

## Movie stills: the cutscenes (landscape 16:9, 1920×1080 or larger)

These play as slow pans with text over them.

**10 · Opening: the lights go down the river** [match style: `moonrise.webp`]
> A wide view at night of a river winding away from a lantern-lit village toward a distant misty marsh. Dozens of tiny
> flames, violet at the edges and amber at the heart, have lifted off their lanterns and float on and just above the
> water, drifting downstream in a long line like little boats. An arched stone bridge in the middle distance, a willow
> on the bank, and a huge full moon. Cinematic, painterly, detailed pixel-art style, violet and indigo night.

**11 · The skiff wakes** [match style: `witch-at-her-door.webp`] [also attach: `airship-skiff-turnaround.png`]
> At an old wooden jetty on a moonlit river, a small wooden airship like the attached one floats a little above the
> water: a wooden hull, small patched sails, and a cluster of big amber crystals in a brass frame over a small brazier.
> The young witch from the attached still, seen from behind and a little to the side (tall plum hat with cream horns
> and silver charms, magenta shawl, long wavy brown hair), holds a small violet flame to the brazier, and the amber
> crystals light up with a violet glow at their core. A black crow perches on the bow rail next to a small hanging lamp.
> A willow and a lantern-lit village behind, the full moon above. Cinematic, detailed pixel-art-style painting.

**12 · The night Misthollow sank (a memory)** [match style: `moonrise.webp`]
> A storybook memory at night, soft-edged and a little faded, in violet and sepia. A young woman in a long black
> dress, a lamplighter, holds an old lantern high and leads a line of children along a boardwalk on stilts through
> mist. The children hold hands and walk calmly behind her; they are safe. Far behind them, the towers and belfries of
> a town sit low in rising water, lit only by her lantern. Gentle and sad, never frightening. Cinematic, painterly,
> detailed pixel-art style.

**13 · Ending: the lights go home** [match style: `moonrise.webp`] [also attach: `airship-skiff-turnaround.png`]
> A stream of hundreds of tiny flames, violet and amber, rises off a boardwalk in a dark marsh and flows up a winding
> river toward a faraway lantern-lit village on a hill. A small wooden airship like the attached one, its amber crystals
> glowing with a violet heart, follows the lights home, small against a huge full moon. Silver haze in the air.
> Cinematic, painterly, detailed pixel-art style, hopeful and warm.

**14 · Ending: two lamplighters** [match style: `moonrise.webp`] [also attach: `silas_standing.png`]
> A woodland lantern path at night with every lantern lit again, moths around the lights. Two kind, softly glowing
> ghosts, pale blue-white and a little see-through, light the last lantern together. One is a lanky young lamplighter
> in a long coat with brass buttons and a peaked cap, holding a long lamplighter's pole, like the attached character.
> The other is a young woman in a black mourning dress with a lace veil folded back from her face, holding up an old
> lantern and smiling. Warm, happy, peaceful. Cinematic, detailed pixel-art-style painting.

**15 · Title screen: the skiff over the valley** [match style: `moonrise.webp`] [also attach: `airship-skiff-turnaround.png`]
> A small wooden airship like the attached one sails through a night sky of silver moonlit clouds. Its amber crystals
> glow with a violet heart, and a tiny figure in a tall witch hat stands at the rail with a crow on her shoulder. Far
> below, a lantern-lit village sits by a river that winds away toward a misty marsh. A huge full moon, and a soft
> glowing silver haze in the air. Keep the upper third calm and open, with sky only, for the title. Cinematic, painterly,
> detailed pixel-art style. No text.

## Portraits for the dialogue box (square, 1024×1024)

**16 · Nettie the Swamp Witch, four expressions** [match style: `witch-calm.webp`]
> A 2×2 grid of four matching bust portraits of the same swamp witch in pixel-art style, each in its own square on a
> flat dark slate-blue background. She is a sharp-featured woman of about fifty with pale skin, long black hair and dark
> brown eyes. She wears a crooked peat-brown witch hat with a reed band and a knotted shawl of white bog-cotton like an
> open net, with small tassels and bone charms on its edges and one thread that glows faintly, over a bark-brown robe.
> Small stoppered bottles in green, red and amber hang at her collar. Top left: dry, unimpressed half-smile. Top right:
> laughing despite herself. Bottom left: a cross scowl. Bottom right: a soft, kind look she would deny. Chunky readable
> pixel art, like a 128-pixel game portrait.

**17 · The Lantern Mother, four expressions** [match style: `witch-calm.webp`]
> A 2×2 grid of four matching bust portraits of the same ghostly young lamplighter in pixel-art style, each in its own
> square on a flat dark slate-blue background. She is pale blue-white and softly glowing, a little see-through, in a
> high-necked black mourning dress, lit warmly from below by an old lantern she holds at her chin. Top left: a wet black
> lace veil over her face, only a faint glint of eyes, calm and sad. Top right: veiled, her head bowed in grief. Bottom
> left: the veil folded back, showing a tired young woman's face streaked with lamp-black, with wide, hopeful eyes.
> Bottom right: veil back, eyes wet, a small relieved smile. Gentle, never frightening. Chunky readable pixel art, like a
> 128-pixel game portrait.

## Faces for the 3D models (square, 1024×1024, flat background)

**18 · Nettie and the Lantern Mother face sheet** [match style: `hilde-agnes.webp`]
> A 2×2 grid of front-facing cartoon face textures for chunky low-poly game characters, flat and straight on with no
> head outline, hair or shading. Top row on pale skin (#efd8c6): a sharp-featured swamp witch of about fifty with dark
> brown eyes, thin arched eyebrows and a small dry mouth. First with her eyes open and an unimpressed look, then with her
> eyes narrowed in a sly half-smile. Bottom row on pale ghostly blue-white (#d4ecf4): a tired young woman with soft dark
> eyes and faint smudges of lamp-black on her cheeks. First with her eyes open and sad, then with her eyes closed and a
> small peaceful smile. Clean shapes, game texture style.

## Effects (on pure black, so the game can make the black see-through)

**19 · Night clouds for the flight**
> A sprite sheet on pure black: a 3×2 grid of six soft night clouds seen from directly above, each a different size and
> shape. Their tops are lit silver and pale violet by moonlight, and their edges are thin and wispy. Each is centered in
> its cell with black all round it. Painterly pixel-art style. Nothing else in the picture.

**20 · Drifting lights and Aether motes**
> A sprite sheet on pure black: a 4×2 grid. The top row has 4 frames of a small floating flame with no lantern, violet
> at the edges and warm amber at the heart, bobbing and flickering. The bottom row has 4 frames of a tiny cluster of
> glittering gold and silver motes twinkling, like a sparkly trail left in the air. Soft glowing pixel-art style, each
> frame centered in its cell. Nothing else in the picture.
