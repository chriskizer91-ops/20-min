// Wickhollow's art (wickhollow.html): the four paintings of the town and Rosalind's portraits. They live in their own
// module, imported only by the Wickhollow page, so the other demos don't carry them. (The square's painting and the
// cottage's are also in assets.js; the build keeps one copy of each.)
import cottageInside from '../art/backgrounds/cottage-inside.webp';
import cottageOutside from '../art/backgrounds/cottage-outside.webp';
import wickhollowSquare from '../art/backgrounds/wickhollow-square.webp';
import sableRiverbank from '../art/backgrounds/sable-riverbank.webp';
// Rosalind's two portraits, from Follow Me Down Witch Way (witch_game_assets/npcs/rosalind): calm, and happy with a rose
import rosalindCalm from '../art/portraits/rosalind-calm.webp';
import rosalindHappy from '../art/portraits/rosalind-happy.webp';

export const wickhollowImages = {
  'art/backgrounds/cottage-inside.webp': cottageInside,
  'art/backgrounds/cottage-outside.webp': cottageOutside,
  'art/backgrounds/wickhollow-square.webp': wickhollowSquare,
  'art/backgrounds/sable-riverbank.webp': sableRiverbank,
};
export const rosalindPortraits = { 'rosalind-calm': rosalindCalm, 'rosalind-happy': rosalindHappy };
