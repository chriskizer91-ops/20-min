// Every file the game loads. The build turns each import into a data: URL, so the finished game is one file.
import wickhollowSquare from '../art/backgrounds/wickhollow-square.webp';
import cottageInside from '../art/backgrounds/cottage-inside.webp';
import hilde from '../art/portraits/hilde.png';
import agnes from '../art/portraits/agnes.png';
import inkblot from '../art/portraits/inkblot.png';
import witchCalm from '../art/portraits/witch-calm.webp';
import witchDelighted from '../art/portraits/witch-delighted.webp';
import witchSurprised from '../art/portraits/witch-surprised.webp';
import witchSly from '../art/portraits/witch-sly.webp';
import witchFace from '../art/faces/witch.webp';
import hildeAgnesFaces from '../art/faces/hilde-agnes.webp';
import witchfire from '../art/fx/witchfire.webp';
import sparks from '../art/fx/sparks.webp';
import mothsFireflies from '../art/fx/moths-fireflies.webp';
import moonpetal from '../art/herbs/moonpetal.webp';
import lavender from '../art/herbs/lavender.webp';
import nightrose from '../art/herbs/nightrose.webp';
import chapelMoss from '../art/herbs/chapel_moss.webp';
import jacquard from '../art/fonts/Jacquard12-Regular.ttf';
import pixelify from '../art/fonts/PixelifySans[wght].ttf';

export const images = { 'art/backgrounds/wickhollow-square.webp': wickhollowSquare, 'art/backgrounds/cottage-inside.webp': cottageInside };
export const portraits = { hilde, agnes, inkblot, witch: witchCalm, 'witch-calm': witchCalm, 'witch-delighted': witchDelighted, 'witch-surprised': witchSurprised, 'witch-sly': witchSly };
export const faces = { witch: witchFace, hildeAgnes: hildeAgnesFaces };
export const fx = { witchfire, sparks, mothsFireflies };
export const herbs = { moonpetal, lavender, nightrose, chapel_moss: chapelMoss };
export const fonts = { 'Jacquard 12': jacquard, 'Pixelify Sans': pixelify };
