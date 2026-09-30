import { createInkblot } from './inkblot.js';

// Inkblot for the Wickhollow square: the same model as the party's, behind the old crow's interface
// (villagers.js createCrow), so the field can swap one import to use him:
//   import { createCrow } from './actors/party-crow.js';
// update(dt, state, groundY): state 'stand' | 'hop' | 'fly'. The field moves his root (hops and flights along an
// arc); he flaps while it does, and his shadow stays on the ground under him.
export function createCrow() {
  const bird = createInkblot();
  bird.flyHeight = 0; // the field flies the root itself
  const { root, head, shadow } = bird;
  const base = shadow.material.opacity;
  return {
    root, head, shadow, bird,
    body: root.getObjectByName('hips'),
    name: 'Inkblot', height: bird.height, radius: 0.12, portrait: 'inkblot', voice: 6,
    play: (name, onHit, opts) => bird.play(name, onHit, opts),
    update(dt, state = 'stand', groundY = root.position.y) {
      bird.update(dt, state === 'fly' ? 2.5 : 0, 0);
      shadow.position.y = groundY - root.position.y + 0.01;
      const lift = Math.max(0, root.position.y - groundY);
      shadow.material.opacity = base / (1 + lift * 0.8);
    },
  };
}
