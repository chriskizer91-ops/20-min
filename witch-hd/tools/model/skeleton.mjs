// Her skeleton at rest: standing, arms hanging 25 degrees out from her sides, facing +z. Meters, feet at y = 0.
// FF9 proportions: about four heads tall to the crown of her head, and a hat that nearly doubles the head.
// Chains for the hair, skirt, shawl, hat and charms are added by the parts that own them.
import { Skeleton } from '../lib/rig.mjs';

export const ARM_ANGLE = (25 * Math.PI) / 180;
export const HEAD_CENTER = [0, 1.095, 0.008];

export function buildSkeleton() {
  const s = new Skeleton();
  s.add('root', null, [0, 0, 0]);
  s.add('hips', 'root', [0, 0.555, 0]);
  s.add('spine', 'hips', [0, 0.64, -0.004]);
  s.add('chest', 'spine', [0, 0.735, -0.008]);
  s.add('neck', 'chest', [0, 0.862, -0.014]);
  s.add('head', 'neck', [0, 0.935, -0.006]);

  for (const [side, sx] of [['L', 1], ['R', -1]]) {
    const d = [Math.sin(ARM_ANGLE) * sx, -Math.cos(ARM_ANGLE), 0];
    const at = (p, len, dir = d) => [p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len];
    const shoulder = [0.105 * sx, 0.832, -0.012];
    const elbow = at(shoulder, 0.165);
    const wrist = at(elbow, 0.145);
    s.add(`clavicle_${side}`, 'chest', [0.02 * sx, 0.83, -0.01]);
    s.add(`upperarm_${side}`, `clavicle_${side}`, shoulder);
    s.add(`forearm_${side}`, `upperarm_${side}`, elbow);
    s.add(`hand_${side}`, `forearm_${side}`, wrist);
    // Palm faces her thigh; the thumb side is forward (+z).
    const n = [-Math.cos(ARM_ANGLE) * sx, -Math.sin(ARM_ANGLE), 0]; // palm normal, toward her body
    const fingers = {
      index: { z: 0.0125, knuckle: 0.044, lens: [0.023, 0.016, 0.013] },
      middle: { z: 0.004, knuckle: 0.046, lens: [0.025, 0.017, 0.014] },
      ring: { z: -0.0045, knuckle: 0.044, lens: [0.023, 0.016, 0.013] },
      pinky: { z: -0.0125, knuckle: 0.040, lens: [0.018, 0.013, 0.012] },
    };
    for (const [name, f] of Object.entries(fingers)) {
      let p = at(wrist, f.knuckle);
      p[2] += f.z;
      p = [p[0] + n[0] * 0.001, p[1] + n[1] * 0.001, p[2]];
      let parent = `hand_${side}`;
      for (let k = 0; k < 3; k++) {
        const bn = `${name}${k + 1}_${side}`;
        s.add(bn, parent, p);
        parent = bn;
        p = at(p, f.lens[k]);
      }
      s.get(parent).tipEnd = p;
    }
    // Thumb: from the heel of the palm, forward and toward the palm
    const tdir = norm([d[0] * 0.55 + n[0] * 0.3, d[1] * 0.55 + n[1] * 0.3, 0.75]);
    let tp = at(wrist, 0.012);
    tp = [tp[0] + n[0] * 0.006, tp[1] + n[1] * 0.006, tp[2] + 0.011];
    let parent = `hand_${side}`;
    for (const [k, len] of [0.02, 0.017, 0.014].entries()) {
      const bn = `thumb${k + 1}_${side}`;
      s.add(bn, parent, tp);
      parent = bn;
      tp = at(tp, len, tdir);
    }
    s.get(parent).tipEnd = tp;

    s.add(`thigh_${side}`, 'hips', [0.066 * sx, 0.53, 0]);
    s.add(`shin_${side}`, `thigh_${side}`, [0.066 * sx, 0.305, 0.012]);
    s.add(`foot_${side}`, `shin_${side}`, [0.066 * sx, 0.085, -0.01]);
    s.add(`toe_${side}`, `foot_${side}`, [0.066 * sx, 0.024, 0.078]);
  }
  return s;
}

export function norm(v) {
  const l = Math.hypot(...v) || 1;
  return v.map((x) => x / l);
}
