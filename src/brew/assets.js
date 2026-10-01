// The brewing screen's art. The build turns each import into a data: URL, so the page stays one file. Only pages
// that open the cauldron import this.
//   - all eleven herb icons (art/herbs, Witch Way's), for the basket and the pot
//   - the brews' and duds' pictures, the moonwater bottle and the grimoire (Witch Way's, copied to art/brews)
//   - the cottage painting, framed on its hearth (with the hanging pot painted out: she brews on the boards)
import cottageHearth from '../../art/brews/cottage-hearth.webp';
import lavender from '../../art/herbs/lavender.webp';
import moonpetal from '../../art/herbs/moonpetal.webp';
import witchsBells from '../../art/herbs/witchs_bells.webp';
import nightrose from '../../art/herbs/nightrose.webp';
import chapelMoss from '../../art/herbs/chapel_moss.webp';
import silverMugwort from '../../art/herbs/silver_mugwort.webp';
import emberStarLily from '../../art/herbs/ember_star_lily.webp';
import wispSprout from '../../art/herbs/wisp_sprout.webp';
import bogwick from '../../art/herbs/bogwick.webp';
import glowcap from '../../art/herbs/glowcap.webp';
import mandrake from '../../art/herbs/mandrake.webp';
import heartseaseTonic from '../../art/brews/heartsease-tonic.webp';
import warmingBalm from '../../art/brews/warming-balm.webp';
import lanternOil from '../../art/brews/lantern-oil.webp';
import hushTea from '../../art/brews/hush-tea.webp';
import wispCalm from '../../art/brews/wisp-calm.webp';
import remembranceIncense from '../../art/brews/remembrance-incense.webp';
import hiccupTonic from '../../art/brews/hiccup-tonic.webp';
import swampTea from '../../art/brews/swamp-tea.webp';
import droopyHatDraught from '../../art/brews/droopy-hat-draught.webp';
import moonwater from '../../art/brews/moonwater.webp';
import grimoire from '../../art/brews/grimoire.webp';

export const herbIcons = {
  lavender, moonpetal, witchs_bells: witchsBells, nightrose, chapel_moss: chapelMoss, silver_mugwort: silverMugwort,
  ember_star_lily: emberStarLily, wisp_sprout: wispSprout, bogwick, glowcap, mandrake,
};
export const brewArt = {
  'heartsease-tonic': heartseaseTonic, 'warming-balm': warmingBalm, 'lantern-oil': lanternOil, 'hush-tea': hushTea,
  'wisp-calm': wispCalm, 'remembrance-incense': remembranceIncense, 'hiccup-tonic': hiccupTonic, 'swamp-tea': swampTea,
  'droopy-hat-draught': droopyHatDraught,
};
export const itemArt = { moonwater, grimoire };
export const hearthImages = { 'art/brews/cottage-hearth.webp': cottageHearth };
