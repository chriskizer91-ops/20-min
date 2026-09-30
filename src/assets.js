// Every file the game loads. The build turns each import into a data: URL, so the finished game is one file.
import wickhollowSquare from '../art/backgrounds/wickhollow-square.webp';
import hilde from '../art/portraits/hilde.png';
import agnes from '../art/portraits/agnes.png';
import inkblot from '../art/portraits/inkblot.png';
import jacquard from '../art/fonts/Jacquard12-Regular.ttf';
import pixelify from '../art/fonts/PixelifySans[wght].ttf';

export const images = { 'art/backgrounds/wickhollow-square.webp': wickhollowSquare };
export const portraits = { hilde, agnes, inkblot };
export const fonts = { 'Jacquard 12': jacquard, 'Pixelify Sans': pixelify };
