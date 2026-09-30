// The four cut-scenes, from docs/SLICE.md §3 "Story beats". The lines are SLICE's own, sometimes split in two so
// that no box holds more than it takes a breath to read; nothing is added to the plot.
//
// A beat is one painting, held while its lines play:
//   still     a painting from ./art.js (STILLS), 'title' for the title card, or 'grimoire' for the drawn page
//   from, to  the camera's start and end framing: [x, y, zoom], x and y the point of the painting (0-1) at the
//             centre of the screen, zoom over "just covers the screen" (1). The move is clamped so the painting
//             always covers the screen, so on a narrow phone the x also picks which part of it she sees.
//   lines     { say } is narration (a centred caption); { who, face, say } is spoken, in the dialogue box
//   music     switches the music as the beat starts (it fades itself; see ../audio/sound.js)
//   sfx       plays as the beat starts; a line can have its own
//   hold      seconds a beat without lines stays up before moving on by itself
//
// Framing notes are in the comments, in painting terms.

// Who speaks. The witch has no name (LORE §3), so her box says what SLICE calls her. Pitches are the synth's
// dialogue blip (Hz); Inkblot only says "Kraa", so he croaks instead of blipping.
export const SPEAKERS = {
  witch: { name: 'The Witch', pitch: 520 },
  nettie: { name: 'Nettie', pitch: 430 },
  mother: { name: 'The Lantern Mother', pitch: 760 },
  quill: { name: 'Quill', pitch: 330 },
  silas: { name: 'Silas', pitch: 360 },
  inkblot: { name: 'Inkblot', sfx: 'kraa' },
};

export const SCENES = [
  {
    id: 'opening', name: 'The Opening', note: "Wickhollow's lanterns go out",
    beats: [
      // Moonrise: tilt up from the river and the bridge to the moon over the castle
      { still: 'moonrise', from: [0.64, 0.8, 1.32], to: [0.6, 0.12, 1.08], music: 'wickhollow', sfx: 'owl',
        lines: [{ say: 'When the moon rises, an old path wakes in the woods. They call it Witch Way.' }] },
      // The square: start on the lantern hanging over the well, pull back across the square to the chapel
      { still: 'square-from-the-well', from: [0.35, 0.36, 1.45], to: [0.62, 0.44, 1.08],
        lines: [{ say: "This month, Wickhollow's lanterns started going out." }, { say: 'One a night. No wind.' }] },
      // The river: from the nearest flames in the foreground, follow them downstream past the bridge
      { still: 'lights-go-down-the-river', from: [0.2, 0.84, 1.42], to: [0.64, 0.5, 1.12], sfx: 'river',
        lines: [{ say: "Each little flame lifts off its wick and floats down the Sable, like a leaf that knows where it's going." }] },
      // Her door: start out on the path, then pull back into the cottage to find her in the doorway
      { still: 'witch-at-her-door', from: [0.64, 0.46, 1.5], to: [0.47, 0.5, 1.03],
        lines: [{ say: 'Where they pass, the riverbank goes grey.' }, { who: 'witch', face: 'sly', say: 'Right. Boots. Basket. Hat.' }] },
      // The title card: the title painting with the logo, then back to the title screen
      { still: 'title', music: 'title', sfx: 'chapter', hold: 6, card: true },
    ],
  },
  {
    id: 'skiff', name: 'The Skiff Wakes', note: 'At the jetty, after the Hollow',
    beats: [
      // Quill at the jetty. He has no picture, so this is the riverbank below the village steps, lights still on
      // the water.
      { still: 'lights-go-down-the-river', from: [0.12, 0.5, 1.5], to: [0.26, 0.62, 1.3], music: 'wickhollow',
        lines: [{ who: 'quill', say: "Everything's a swap." }, { who: 'quill', say: 'Bring her back with the lights in her.' }] },
      // Witchfire to the brazier: close on the crystals, easing out to find Inkblot on the rail
      { still: 'the-skiff-wakes', from: [0.52, 0.42, 1.55], to: [0.6, 0.5, 1.12], music: 'flight', sfx: 'resonance',
        lines: [{ who: 'inkblot', face: 'calm', say: 'Kraa.' }] },
      // She lifts: the camera climbs from the hull and the water up the sails to the moon
      { still: 'the-skiff-wakes', from: [0.58, 0.82, 1.35], to: [0.66, 0.1, 1.1], sfx: 'ship-takeoff',
        lines: [{ who: 'witch', face: 'delighted', say: "It's a broom with ambitions." }] },
    ],
  },
  {
    id: 'middle', name: 'The Middle Turn', note: "At Nettie's hut, in Bogmire",
    beats: [
      // The hut, on the cauldron over the hearth, easing back into the room
      { still: 'nettie-hut', from: [0.5, 0.3, 1.45], to: [0.5, 0.42, 1.1], music: 'marsh',
        lines: [{ who: 'nettie', face: 'sly', say: "Your lamps weren't stolen. They were called." }] },
      // The night Misthollow sank: from the lamplighter's lantern along the line of children to the last one
      { still: 'the-night-misthollow-sank', from: [0.22, 0.26, 1.45], to: [0.68, 0.55, 1.18], sfx: 'nightfall',
        lines: [{ say: 'A hundred years ago the water came up.' }, { say: 'The lamplighter led the children out, and went back for the last one.' }] },
      // Back in the hut, on the round window and the marsh outside it
      { still: 'nettie-hut', from: [0.12, 0.2, 1.55], to: [0.2, 0.26, 1.3],
        lines: [{ who: 'nettie', face: 'calm', say: 'They all got home. Nobody told her.' }, { who: 'nettie', face: 'calm', say: "She's still lighting the way, and every light she can't find, she borrows." }] },
      // Her shelves of jars
      { still: 'nettie-hut', from: [0.84, 0.28, 1.5], to: [0.74, 0.34, 1.28],
        lines: [{ who: 'nettie', face: 'cross', say: "Where she takes the light, the rot comes in behind. That's your grey riverbank." }] },
      // The whole room, pulling back from the hearth
      { still: 'nettie-hut', from: [0.5, 0.36, 1.3], to: [0.5, 0.5, 1.0],
        lines: [
          { who: 'witch', face: 'calm', say: "So she's not a thief. She's someone who hasn't sat down in a hundred years." },
          { who: 'nettie', face: 'sly', say: "You'll have to fight her to sit her down. Then you can make her tea." },
        ] },
    ],
  },
  {
    id: 'ending', name: 'The Ending', note: "After Mother's Hollow",
    beats: [
      // The veil falls: pushing in slowly on the lamplighter's face and lantern, as she was
      { still: 'the-night-misthollow-sank', from: [0.3, 0.34, 1.2], to: [0.26, 0.24, 1.6], music: 'wickhollow', sfx: 'mystery',
        lines: [
          { say: 'The veil falls.' },
          { who: 'mother', face: 'surprised', say: 'Are they safe? I was taking them home.' },
          { who: 'mother', face: 'surprised', say: 'The water came up the stair, and I went back for the last one…' },
        ] },
      // Tea: from the witchfire in her hand down to the cauldron
      { still: 'witchfire-cauldron', from: [0.5, 0.22, 1.35], to: [0.56, 0.62, 1.06], sfx: 'hearthfire',
        lines: [{ who: 'witch', face: 'calm', say: 'Everyone got home. Every one. You can put the lamp down.' }] },
      // Bogmire's mast: across the moot-circle to the mooring mast
      { still: 'bogmire-mast', from: [0.46, 0.5, 1.08], to: [0.82, 0.3, 1.32], music: 'marsh',
        lines: [
          { who: 'nettie', face: 'sly', say: 'If your village ever needs a witch, ask me.' },
          { who: 'nettie', face: 'sly', say: "I'm not saying yes. I'm saying ask." },
        ] },
      // The lights go home: from the skiff among the flames, up the river toward the lit town
      { still: 'lights-go-home', from: [0.34, 0.68, 1.42], to: [0.66, 0.34, 1.1], music: 'title', sfx: 'luminal',
        lines: [{ say: 'The flames lift off the boardwalk and stream up the Sable, and the skiff follows them.' }] },
      // Two lamplighters: down the lantern path to the two of them
      { still: 'two-lamplighters', from: [0.74, 0.62, 1.38], to: [0.36, 0.44, 1.08],
        lines: [
          { say: 'Wickhollow is lit again.' },
          { say: "She didn't fade. Ghosts in Wickhollow don't." },
          { say: 'They walk the path together, and neither has finished a round since, because they talk.' },
        ] },
      // The grimoire, drawn in code (./grimoire.js): a slow push in on the open page
      { still: 'grimoire', from: [0.5, 0.5, 1.0], to: [0.5, 0.48, 1.06], sfx: 'ui-page',
        lines: [{ say: "The grimoire opens to the Dawnbell's page." }, { say: "It's a bell from somewhere far north.", sfx: 'bell' }] },
    ],
  },
];

export const sceneById = (id) => SCENES.find((s) => s.id === id);
