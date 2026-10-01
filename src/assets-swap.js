// The swap shop's art (swap-shop.html, and anywhere else Quill's shop opens): his stall's painting, his portraits,
// and an icon for everything that can change hands. They live in their own module, imported only by the swap shop,
// so the other demos don't carry them. Sources: the painting is 20-min's own; Quill's portraits, the charms, brews,
// duds and curios are Follow Me Down Witch Way's (witch_game_assets/), the herbs are the ones in art/herbs/, and the
// Magpie is cut from Thareia's turnaround sheet of the skiff (art/airship/skiff-sheet.webp). Gear and the few found
// things with no painted icon get one drawn in pixels in src/swap/icons.js.
import quillsStall from '../art/backgrounds/quills-stall.webp';
import quill from '../art/portraits/quill.webp';
import quillHappy from '../art/portraits/quill-happy.webp';
import magpie from '../art/swap/magpie.webp';
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

export const swapImages = { 'art/backgrounds/quills-stall.webp': quillsStall };
// 'cold' before the Warming Balm (WW's troubled portrait), 'happy' after
export const quillPortraits = { cold: quill, happy: quillHappy };
export const swapIcons = {
  'the-magpie': magpie,
  'charm-horseshoe': horseshoe, 'charm-owl': owl, 'charm-bell': bell,
  'heartsease-tonic': heartsease, 'hush-tea': hushTea, 'warming-balm': warmingBalm, 'lantern-oil': lanternOil,
  'remembrance-incense': incense, 'wisp-calm': wispCalm, 'swamp-tea': swampTea, 'hiccup-tonic': hiccup, 'droopy-hat-draught': droopy,
  'wisp-jar': wispJar, 'grave-candle': graveCandle, 'hag-stone': hagStone, moonwater,
  lavender, moonpetal, witchs_bells: witchsBells, nightrose, chapel_moss: chapelMoss, silver_mugwort: silverMugwort,
  ember_star_lily: emberStarLily, wisp_sprout: wispSprout, bogwick, glowcap, mandrake,
};
