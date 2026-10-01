// A picture for everything she can carry: the herbs (art/herbs, Witch Way's), and the brews, duds, charms, curios and
// found things that have a painted icon (art/swap, Witch Way's). Anything else gets one drawn in pixels
// (src/swap/icons.js); src/items.js puts the two together. This module carries no paintings, so any page can show
// the basket without carrying the swap shop's stall.
import lavender from '../art/herbs/lavender.webp';
import moonpetal from '../art/herbs/moonpetal.webp';
import witchsBells from '../art/herbs/witchs_bells.webp';
import nightrose from '../art/herbs/nightrose.webp';
import chapelMoss from '../art/herbs/chapel_moss.webp';
import silverMugwort from '../art/herbs/silver_mugwort.webp';
import emberStarLily from '../art/herbs/ember_star_lily.webp';
import wispSprout from '../art/herbs/wisp_sprout.webp';
import bogwick from '../art/herbs/bogwick.webp';
import glowcap from '../art/herbs/glowcap.webp';
import mandrake from '../art/herbs/mandrake.webp';
import horseshoe from '../art/swap/charm-horseshoe.webp';
import owl from '../art/swap/charm-owl.webp';
import bell from '../art/swap/charm-bell.webp';
import heartsease from '../art/swap/heartsease-tonic.webp';
import hushTea from '../art/swap/hush-tea.webp';
import warmingBalm from '../art/swap/warming-balm.webp';
import lanternOil from '../art/swap/lantern-oil.webp';
import incense from '../art/swap/remembrance-incense.webp';
import wispCalm from '../art/swap/wisp-calm.webp';
import swampTea from '../art/swap/swamp-tea.webp';
import hiccup from '../art/swap/hiccup-tonic.webp';
import droopy from '../art/swap/droopy-hat-draught.webp';
import wispJar from '../art/swap/wisp-jar.webp';
import graveCandle from '../art/swap/grave-candle.webp';
import hagStone from '../art/swap/hag-stone.webp';
import moonwater from '../art/swap/moonwater.webp';

export const itemIcons = {
  'charm-horseshoe': horseshoe, 'charm-owl': owl, 'charm-bell': bell,
  'heartsease-tonic': heartsease, 'hush-tea': hushTea, 'warming-balm': warmingBalm, 'lantern-oil': lanternOil,
  'remembrance-incense': incense, 'wisp-calm': wispCalm, 'swamp-tea': swampTea, 'hiccup-tonic': hiccup, 'droopy-hat-draught': droopy,
  'wisp-jar': wispJar, 'grave-candle': graveCandle, 'hag-stone': hagStone, moonwater,
  lavender, moonpetal, witchs_bells: witchsBells, nightrose, chapel_moss: chapelMoss, silver_mugwort: silverMugwort,
  ember_star_lily: emberStarLily, wisp_sprout: wispSprout, bogwick, glowcap, mandrake,
};
