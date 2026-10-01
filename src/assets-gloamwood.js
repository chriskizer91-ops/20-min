// The Gloamwood's art (gloamwood.html): the lantern path (Witch Way's own painting), the Sable bridge, and Silas's two
// portraits from Witch Way (npcs/silas: his pole cold and smoking, and lit). They live in their own module, imported
// only by the Gloamwood page, so the other demos don't carry them. (The Gloamwood herbs' icons are in data/herbs.js.)
import lanternPath from '../art/backgrounds/lantern-path.webp';
import sableBridge from '../art/backgrounds/sable-bridge.webp';
import silasCalm from '../art/portraits/silas.webp';
import silasHappy from '../art/portraits/silas-happy.webp';

export const gloamwoodImages = {
  'art/backgrounds/lantern-path.webp': lanternPath,
  'art/backgrounds/sable-bridge.webp': sableBridge,
};
export const silasPortraits = { calm: silasCalm, happy: silasHappy };
