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
import { itemIcons } from './assets-items.js';

export const swapImages = { 'art/backgrounds/quills-stall.webp': quillsStall };
// 'cold' before the Warming Balm (WW's troubled portrait), 'happy' after
export const quillPortraits = { cold: quill, happy: quillHappy };
// Every thing's icon (src/assets-items.js), and the Magpie's for Quill's own swap
export const swapIcons = { 'the-magpie': magpie, ...itemIcons };
