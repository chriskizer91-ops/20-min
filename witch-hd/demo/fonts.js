// Witch Way's two pixel fonts, from the game's art folder
import jacquard from '../../art/fonts/Jacquard12-Regular.ttf';
import pixelify from '../../art/fonts/PixelifySans[wght].ttf';

export function loadFonts() {
  for (const [family, url] of [['Jacquard 12', jacquard], ['Pixelify Sans', pixelify]]) {
    new FontFace(family, `url(${url})`).load().then((f) => document.fonts.add(f)).catch(() => {});
  }
}
