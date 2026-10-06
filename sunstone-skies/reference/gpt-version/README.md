# The GPT version: pieces to take

On October 6 Chris sent a version of the game made with ChatGPT, *Skies of Aethermoor, the Expanded Flight Edition*
(one 16 MB HTML file). It's the phone game from `chriskizer91-ops/airship-game-in-aethermoor-` with layers added on
top. Chris liked its map and some of what it added, and said to take pieces of it into Sunstone Skies. We keep building
on Sunstone Skies (our ships are better, and its ships, garage, skills, charts and balance go much further); the GPT
version is a place to take pieces from.

Take only what the GPT version added. Its title, port, three skies and four ships are the airship repository's game,
which this game takes nothing more from (`CLAUDE.md`).

## Taken so far

- **The map** (October 6): its nine top-down tiles (1952 x 1312 each: 1920 x 1280 of map, 4 m to a pixel, with a
  16-pixel border copied from the neighbouring tiles), re-saved as AVIF at quality 75 in `assets/map/`, and its corner
  map picture (`assets/map/minimap.webp`, resized to 1536 x 1024). Its ground detail (fine grain and water ripples close
  to the ground) is rewritten in `src/game/world.js`.
- **The rest** (October 6), each rewritten into our own modules and hooked to our game through `src/game/events.js`:
  - `sound.js` → `src/game/sound.js`: the same instruments and score, plus sounds for our four abilities, a new level
    and a finished voyage.
  - `services.js` and `settings.js` → `src/game/settings.js` and `settings-panel.js`: the settings, with music volume
    and showing the guide again added. Its port-panel changes belong to the phone game's port; from them our garage
    took the idea of a line on how each ship fights, and of showing what an upgrade would change (as strength).
  - `firing-board.js` → `src/game/board.js`: Hull, Sails or Crystals (no Auto: it aimed at the hull anyway), the
    batteries, the target panel and the hit mark.
  - `explore-photo.js` → `src/game/photo.js` and `explore.js`: the photo camera works in every mode; the flight courses
    and waypoints are in Explore, a mode of their own on the start screen.
  - `voyage-guide.js` → `src/game/guide.js` and the crystal power in `src/game/main.js` (R, not X: X is our Double
    Shot). The choice of encounter and perk between waves is left out: our charts, garage and skills cover that ground.
  - `near-ground.js` → `src/game/ground.js`: the trees. Its eight traced roofs are left out.

## The layers, as it wrote them

Kept for reference. They hook into the phone game through `window.Aether` and events the GPT
version patched into that game's code, so they're for reading and rewriting into our modules, not for dropping in.

| File | What it does |
|---|---|
| `services.js` | The settings store (sound, music, volume, mouse sensitivity, screen shake, HUD size, the guide) and an event hub the other layers use |
| `sound.js` | Sound and music made in code with Web Audio, no recordings: wind and creaking rigging, rolling broadside volleys, hits, sinkings, the surge, a reload cue, a danger bell, and a quiet score. Silent until the first click or key |
| `settings.js` | One settings dialog, from the title, port, pause and flight |
| `firing-board.js` | Target choice: Auto, hull, sails or crystals (T cycles), and a battery panel showing each side's guns and reload |
| `near-ground.js` | Low flying: 3D trees grown near the ship where the map shows woods, and 8 traced roofs |
| `explore-photo.js` | Free flight with flight courses (rings to fly through, timed), waypoints, and a pause-and-orbit photo camera that saves pictures |
| `voyage-guide.js` | Between waves, a choice of the next encounter (harder for more shards) and a perk; crystal power switched in flight (X: sails, even, guns); a five-step flight guide |
| `layers.css` | The styles for all of these (one large picture left out) |
