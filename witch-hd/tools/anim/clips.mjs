// Her animations. Each clip is a pose function of time; the physics (hair, skirt, shawl, hat) is added when
// the clip is baked. Loops: Idle, Walk, Run. One-shots start and end in her standing pose.
import * as THREE from 'three';
import { HAND, smooth, bell, lerp, env } from './pose.mjs';

const TAU = Math.PI * 2;
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const ANKLE_Y = 0.085;
const FOOT_X = 0.07;

// ---------------------------------------------------------------- shared pieces
// Feet flat on the ground at (x, z), with a little toe-out; knees point forward.
function plantFeet(p, { L = [FOOT_X, 0], R = [-FOOT_X, 0], liftL = 0, liftR = 0, pitchL = 0, pitchR = 0 } = {}) {
  for (const [side, [x, z], lift, pitch] of [[1, L, liftL, pitchL], [-1, R, liftR, pitchR]]) {
    const q = new THREE.Quaternion().setFromAxisAngle(Y, side * 0.07).multiply(new THREE.Quaternion().setFromAxisAngle(X, pitch));
    p.legIK(side, new THREE.Vector3(x + p.root.x, ANKLE_Y + lift, z - 0.01 + p.root.z), q);
  }
}

// Her relaxed standing pose (arms eased in, soft knees, a small head tilt)
function stand(p, { hipsY = -0.008, arms = true, hands = true } = {}) {
  p.move('hips', 0, hipsY, 0);
  p.euler('spine', 0.02, 0, 0).euler('chest', -0.03, 0, 0).euler('neck', -0.02, 0, 0).euler('head', 0.03, 0, 0.035);
  if (arms) {
    for (const s of [1, -1]) {
      p.shoulder(s, { raise: -0.07, forward: 0.06 });
      p.elbow(s, 0.22, 0.25);
      p.wrist(s, 0.1, 0);
    }
  }
  if (hands) for (const s of [1, -1]) p.hand(s, HAND.relaxed);
}

// Knuckles-in fist around the athame's grip
const gripHand = (p) => p.hand(-1, HAND.grip);

// ---------------------------------------------------------------- Idle: breathing, a weight shift, looking about, two blinks
const idle = {
  name: 'Idle', duration: 6, loop: true,
  pose(p, t) {
    const b = Math.sin((t / 3) * TAU); // two breaths
    const w = Math.sin((t / 6) * TAU); // one sway
    stand(p, { arms: false });
    p.move('hips', 0.008 * w, 0.002 * b, 0);
    p.euler('hips', 0, 0.03 * w, 0.018 * w);
    p.euler('spine', 0.006 * b, -0.02 * w, -0.015 * w);
    p.euler('chest', -0.012 * b, 0, -0.006 * w);
    for (const s of [1, -1]) {
      p.clavicle(s, { up: 0.012 * (b + 1) });
      p.shoulder(s, { raise: -0.07 + 0.012 * b, forward: 0.06 + 0.02 * Math.sin((t / 6) * TAU + s) });
      p.elbow(s, 0.24 + 0.03 * Math.sin((t / 3) * TAU + s), 0.25);
      p.wrist(s, 0.1, 0);
    }
    // Look left a moment, then right, then back
    const look = 0.3 * (env(t, 0.6, 1.2, 2.2, 2.8) - env(t, 3.4, 4.0, 5.0, 5.6));
    p.euler('neck', 0, look * 0.4, 0).euler('head', -0.02 * Math.abs(look), look * 0.6, 0.02 * look);
    plantFeet(p, { L: [FOOT_X + 0.005, 0.01], R: [-FOOT_X - 0.005, -0.01] });
    p.morph.Blink = Math.max(bell(1.3, 1.46, t), bell(4.4, 4.56, t));
  },
};

// ---------------------------------------------------------------- the gait: walk and run
// One leg's foot through a cycle p in [0,1): stance (planted, moving back under her) then swing (arcs forward).
function footAt(p, { stance, stride, lift, heel = 0.28, toeOff = 0.55, runFlight = false }) {
  let z, y = 0, pitch = 0, toe = 0;
  if (p < stance) {
    const u = p / stance;
    z = stride / 2 - stride * u;
    pitch = -heel * (1 - smooth(0, 0.15, u)) + toeOff * smooth(0.62, 1, u);
    toe = -toeOff * smooth(0.62, 1, u);
  } else {
    const u = (p - stance) / (1 - stance);
    const e = u * u * (3 - 2 * u);
    z = -stride / 2 + stride * (e + 0.04 * Math.sin(u * Math.PI));
    y = lift * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 1.1);
    pitch = lerp(toeOff, -heel, smooth(0.1, 0.95, u)) + 0.1 * Math.sin(u * Math.PI);
    toe = -toeOff * (1 - smooth(0, 0.35, u));
  }
  // Pivot the foot on the heel (toe up) or the ball (heel up) so it rolls along the ground
  const pivot = pitch < 0 ? new THREE.Vector3(0, -ANKLE_Y, -0.052) : new THREE.Vector3(0, -ANKLE_Y, 0.075);
  const q = new THREE.Quaternion().setFromAxisAngle(X, pitch);
  const off = pivot.clone().negate().applyQuaternion(q).add(pivot);
  return { z: z + off.z, y: y + off.y, pitch, toe };
}

function gait(p, t, { T, speed, stance, lift, bob, bobPhase, lean, armSwing, elbow, sway, yaw, run = false }) {
  const ph = (t / T) % 1;
  const stride = speed * stance * T;
  stand(p, { arms: false, hands: false, hipsY: 0 });
  // Hips: down and up twice a cycle, side to side over the standing foot, turning with the stride
  const hy = bob[0] + bob[1] * Math.cos(2 * TAU * (ph - bobPhase));
  p.move('hips', sway * Math.cos(TAU * (ph - stance / 2)), hy, 0);
  const pelvisYaw = -yaw * Math.cos(TAU * (ph - (stance + (1 - stance) / 2)));
  p.euler('hips', 0.0, pelvisYaw, -yaw * 0.4 * Math.cos(TAU * (ph - (stance + (1 - stance) / 2))));
  p.euler('spine', lean * 0.6, -pelvisYaw * 0.55, 0);
  p.euler('chest', lean * 0.4 - 0.02, -pelvisYaw * 0.75, 0);
  // Head steady, eyes ahead
  p.euler('neck', -lean * 0.5, pelvisYaw * 0.35, 0);
  p.euler('head', -lean * 0.4 + 0.015 * Math.cos(2 * TAU * (ph - bobPhase)), pelvisYaw * 0.3, 0.02);
  // Legs
  for (const [side, off] of [[1, 0], [-1, 0.5]]) {
    const f = footAt((ph + off) % 1, { stance, stride, lift });
    const q = new THREE.Quaternion().setFromAxisAngle(Y, side * 0.06).multiply(new THREE.Quaternion().setFromAxisAngle(X, f.pitch));
    p.legIK(side, new THREE.Vector3(side * FOOT_X, ANKLE_Y + f.y, f.z - 0.01 + p.root.z), q);
    p.rot(`toe_${side > 0 ? 'L' : 'R'}`, X, f.toe);
  }
  // Arms swing against the legs
  for (const side of [1, -1]) {
    const fwd = armSwing * Math.cos(TAU * (ph - (side > 0 ? 0.5 : 0)));
    p.shoulder(side, { raise: run ? -0.02 : -0.06, forward: fwd + (run ? 0.15 : 0.04) });
    p.elbow(side, elbow + (run ? 0.25 : 0.18) * Math.max(0, fwd / armSwing), 0.3);
    p.wrist(side, 0.12, 0.05);
    p.hand(side, run ? HAND.fist : HAND.relaxed);
  }
}

const WALK = { T: 0.84, speed: 0.72, stance: 0.6, lift: 0.055, bob: [-0.022, 0.009], bobPhase: 0.3, lean: 0.06, armSwing: 0.3, elbow: 0.25, sway: 0.012, yaw: 0.11 };
const walk = { name: 'Walk', duration: WALK.T, loop: true, speed: WALK.speed, pose: (p, t) => gait(p, t, WALK) };
const RUN = { T: 0.5, speed: 1.65, stance: 0.36, lift: 0.1, bob: [-0.032, -0.014], bobPhase: 0.18, lean: 0.2, armSwing: 0.55, elbow: 1.3, sway: 0.008, yaw: 0.14, run: true };
const run = { name: 'Run', duration: RUN.T, loop: true, speed: RUN.speed, pose: (p, t) => gait(p, t, RUN) };

// ---------------------------------------------------------------- actions (one-shots)
// Each starts and ends in her standing pose; k-weights ramp each movement in and out.
function base(p, t) {
  stand(p);
  plantFeet(p);
}
// Blend two foot targets
const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

// Gather: kneel on her right knee, draw the athame, cut a stem, pick it, look at it, stand and sheathe.
const gather = {
  name: 'Gather', duration: 2.6,
  pose(p, t) {
    stand(p, { arms: false, hands: false });
    const down = env(t, 0.25, 0.75, 1.85, 2.35);
    // Hips drop and lean; left foot steps forward, right knee to the ground
    p.move('hips', 0, -0.215 * down, -0.02 * down);
    p.euler('hips', 0.12 * down, 0.1 * down, 0);
    p.euler('spine', 0.3 * down, -0.05 * down, 0);
    p.euler('chest', 0.14 * down, 0, 0);
    const look = env(t, 0.5, 0.9, 1.5, 1.7);
    const admire = env(t, 1.45, 1.65, 1.95, 2.2);
    p.euler('neck', 0.06 * look - 0.12 * admire, 0.12 * admire, 0);
    p.euler('head', 0.22 * look - 0.2 * admire, 0.2 * admire, 0.08 * admire);
    const Lz = lerp(0, 0.14, smooth(0.2, 0.6, t) * (1 - smooth(1.9, 2.3, t)));
    const Rz = lerp(0, -0.2, down);
    p.legIK(1, new THREE.Vector3(FOOT_X + 0.01 * down, ANKLE_Y, Lz - 0.01), new THREE.Quaternion().setFromAxisAngle(Y, 0.07));
    // Right leg: kneeling, foot back with the toes tucked under
    const rq = new THREE.Quaternion().setFromAxisAngle(Y, -0.07).multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.9 * down));
    p.legIK(-1, new THREE.Vector3(-FOOT_X, ANKLE_Y + 0.035 * down, Rz - 0.01), rq);
    p.rot('toe_R', X, -0.8 * down);
    // Right arm: to the hip for the athame, then down and forward to cut, back to the hip, then relax
    const reachHip = env(t, 0.05, 0.25, 0.3, 0.5) + env(t, 1.95, 2.1, 2.2, 2.4);
    const cut = env(t, 0.6, 0.9, 1.35, 1.6);
    const saw = cut * 0.12 * Math.sin(t * 34);
    p.shoulder(-1, { raise: -0.07 - 0.25 * reachHip - 0.1 * cut, forward: 0.06 - 0.25 * reachHip + (1.05 + saw) * cut, twist: 0.3 * cut });
    p.elbow(-1, 0.22 + 0.9 * reachHip - 0.1 * cut, 0.25 + 0.6 * cut);
    p.wrist(-1, 0.1 - 0.3 * cut, 0.3 * cut);
    p.athame = t > 0.28 && t < 2.15 ? 1 : 0;
    if (p.athame || reachHip > 0.3) p.hand(-1, HAND.grip); else p.hand(-1, HAND.relaxed);
    // Left hand: reaches for the stem, then lifts the herb to look at it
    const pick = env(t, 0.75, 1.05, 1.4, 1.6);
    p.shoulder(1, { raise: -0.07 - 0.12 * pick - 0.15 * admire, forward: 0.06 + 0.95 * pick + 0.55 * admire });
    p.elbow(1, 0.22 + 0.05 * pick + 1.3 * admire, 0.25 + 0.7 * admire);
    p.wrist(1, 0.1 + 0.2 * pick, 0);
    p.hand(1, pick + admire > 0.3 ? HAND.pinch : HAND.relaxed);
    p.morph.Smile = admire;
    p.morph.Blink = bell(0.55, 0.7, t);
  },
};

// Cast: she lifts her left hand, palm up, and violet witchfire blooms in it.
const cast = {
  name: 'CastWitchfire', duration: 1.8,
  pose(p, t) {
    base(p, t);
    const up = env(t, 0.1, 0.45, 1.35, 1.75);
    const flare = bell(0.7, 1.15, t);
    p.shoulder(1, { raise: 0.25 * up, forward: 0.75 * up, twist: -0.2 * up });
    p.elbow(1, 1.25 * up, 2.1 * up);
    p.wrist(1, -0.35 * up, 0);
    p.hand(1, up > 0.4 ? HAND.cup : HAND.relaxed);
    p.fire = 1.3 * smooth(0.3, 0.55, t) * (1 - smooth(1.45, 1.7, t)) * (1 + 0.4 * flare);
    p.euler('spine', -0.05 * up, 0.15 * up, 0);
    p.euler('chest', -0.04 * up, 0.1 * up, 0);
    p.euler('head', 0.12 * up, 0.28 * up, 0.1 * up);
    p.shoulder(-1, { raise: 0.1 * up, back: 0.1 * up });
    p.elbow(-1, 0.1 * up, 0);
    p.morph.Smile = 0.6 * env(t, 0.55, 0.75, 1.3, 1.5);
  },
};

// Throw: wind up behind her, fling the witchfire forward, follow through.
const toss = {
  name: 'ThrowWitchfire', duration: 1.3,
  pose(p, t) {
    base(p, t);
    const wind = env(t, 0.05, 0.4, 0.45, 0.55);
    const fling = env(t, 0.45, 0.58, 0.8, 1.2);
    p.fire = smooth(0.0, 0.2, t) * (1 - smooth(0.52, 0.6, t));
    p.shoulder(1, { raise: 0.35 * wind + 0.2 * fling, back: 0.9 * wind, forward: 1.45 * fling, twist: -0.3 * wind });
    p.elbow(1, 1.1 * wind + 0.15 * fling, 1.2 * wind + 0.5 * fling);
    p.wrist(1, -0.4 * wind + 0.35 * fling, 0);
    p.hand(1, fling > 0.3 ? HAND.open : HAND.cup);
    p.euler('hips', 0, 0.22 * wind - 0.25 * fling, 0);
    p.euler('spine', -0.05 * wind + 0.12 * fling, 0.25 * wind - 0.3 * fling, 0);
    p.euler('chest', 0, 0.2 * wind - 0.25 * fling, 0);
    p.euler('head', 0, -0.35 * wind + 0.4 * fling, 0);
    p.shoulder(-1, { raise: 0.25 * fling, back: 0.35 * fling, forward: 0.3 * wind });
    p.elbow(-1, 0.3 * wind, 0);
    p.morph.Surprise = 0; p.morph.Smile = 0.8 * env(t, 0.6, 0.7, 1.0, 1.2);
    p.morph.Blink = bell(0.46, 0.6, t);
  },
};

// Moonlight: both arms rise open to the sky, her face lifts, a little rise onto her toes.
const moonlight = {
  name: 'Moonlight', duration: 2.4,
  pose(p, t) {
    stand(p);
    const up = env(t, 0.2, 0.9, 1.7, 2.3);
    p.move('hips', 0, 0.025 * up, 0);
    plantFeet(p, { liftL: 0.03 * up, liftR: 0.03 * up, pitchL: 0.35 * up, pitchR: 0.35 * up });
    p.rot('toe_L', X, -0.35 * up).rot('toe_R', X, -0.35 * up);
    for (const s of [1, -1]) {
      p.shoulder(s, { raise: 1.45 * up, forward: 0.35 * up, twist: -0.6 * up });
      p.elbow(s, 0.25 * up, 1.2 * up);
      p.wrist(s, -0.3 * up, 0);
      p.hand(s, up > 0.4 ? HAND.open : HAND.relaxed);
    }
    p.euler('spine', -0.1 * up, 0, 0);
    p.euler('chest', -0.12 * up, 0, 0);
    p.euler('neck', -0.15 * up, 0, 0);
    p.euler('head', -0.3 * up, 0, 0);
    p.morph.Surprise = env(t, 0.3, 0.6, 0.9, 1.1);
    p.morph.Blink = env(t, 1.1, 1.3, 1.7, 1.9);
    p.morph.Smile = env(t, 1.0, 1.2, 1.9, 2.2);
  },
};

// Cheer: two happy hops with her fist up.
const cheer = {
  name: 'Cheer', duration: 1.4,
  pose(p, t) {
    stand(p);
    const on = env(t, 0.0, 0.15, 1.15, 1.4);
    const hop = Math.max(0, Math.sin(((t - 0.2) / 0.45) * Math.PI)) * (t > 0.2 && t < 1.1 ? 1 : 0);
    const squat = env(t, 0.05, 0.18, 0.18, 0.28) + env(t, 0.55, 0.62, 0.62, 0.72) + env(t, 1.0, 1.1, 1.15, 1.35);
    p.move('hips', 0, 0.09 * hop - 0.04 * squat, 0);
    const lift = 0.075 * hop;
    plantFeet(p, { liftL: lift, liftR: lift, pitchL: 0.3 * hop, pitchR: 0.3 * hop });
    p.shoulder(1, { raise: 0.3 * on, forward: 2.55 * on });
    p.elbow(1, 0.25 * on, 0.4 * on);
    p.hand(1, HAND.fist);
    p.shoulder(-1, { raise: 0.3 * on, forward: 0.7 * on });
    p.elbow(-1, 1.3 * on, 0.3 * on);
    p.hand(-1, HAND.fist);
    p.euler('spine', -0.08 * hop, 0, 0.05 * on);
    p.euler('head', -0.12 * on, 0, 0.1 * on);
    p.morph.Smile = on; p.morph.Blink = on;
  },
};

// Wave: a friendly wave with her right hand, head tilted.
const wave = {
  name: 'Wave', duration: 2.0,
  pose(p, t) {
    base(p, t);
    const up = env(t, 0.05, 0.35, 1.6, 1.95);
    const w = Math.sin((t - 0.35) * 11) * env(t, 0.35, 0.5, 1.45, 1.6);
    p.shoulder(-1, { raise: 1.0 * up, forward: 0.35 * up, twist: -0.4 * up });
    p.elbow(-1, 1.35 * up + 0.25 * w, 1.3 * up);
    p.wrist(-1, -0.2 * up + 0.25 * w, 0.1 * w);
    p.hand(-1, up > 0.4 ? HAND.open : HAND.relaxed);
    p.euler('chest', 0, -0.08 * up, 0.04 * up);
    p.euler('head', 0.02 * up, -0.12 * up, -0.14 * up);
    p.morph.Smile = env(t, 0.2, 0.4, 1.5, 1.8);
  },
};

// Athame dash: draw, crouch, spring forward with a sweeping cut, hop back.
const dash = {
  name: 'AthameDash', duration: 1.4,
  pose(p, t) {
    stand(p, { arms: false, hands: false });
    const draw = env(t, 0.0, 0.12, 0.14, 0.24);
    const crouch = env(t, 0.12, 0.26, 0.26, 0.36);
    const out = env(t, 0.3, 0.48, 0.72, 1.05);
    const hopBack = bell(0.8, 1.1, t);
    p.move('hips', 0, -0.05 * crouch - 0.08 * out + 0.04 * hopBack, 0.34 * out);
    p.euler('hips', 0.1 * out, -0.25 * out, 0);
    p.euler('spine', 0.18 * crouch + 0.25 * out, -0.2 * out, 0);
    p.euler('chest', 0.05 * out, -0.15 * out, 0);
    p.euler('head', -0.25 * out, 0.35 * out, 0);
    // Right foot lunges forward, left stays back
    const Rz = 0.44 * out;
    p.legIK(-1, new THREE.Vector3(-FOOT_X - 0.02 * out, ANKLE_Y + 0.05 * bell(0.3, 0.46, t) + 0.03 * hopBack, Rz - 0.01), new THREE.Quaternion().setFromAxisAngle(Y, -0.07 - 0.3 * out));
    p.legIK(1, new THREE.Vector3(FOOT_X + 0.03 * out, ANKLE_Y + 0.03 * hopBack, -0.08 * out - 0.01), new THREE.Quaternion().setFromAxisAngle(Y, 0.07 + 0.5 * out).multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.35 * out)));
    p.rot('toe_L', X, -0.35 * out);
    // The cut: from high over her left shoulder, sweeping down and out to the right
    const sweep = smooth(0.36, 0.56, t);
    const armOn = Math.max(draw, env(t, 0.12, 0.3, 1.0, 1.3));
    p.shoulder(-1, { raise: -0.07 + armOn * (0.3 + 0.9 * sweep), forward: 0.06 + armOn * (1.6 - 0.9 * sweep), twist: armOn * (0.5 - 0.9 * sweep) });
    p.elbow(-1, 0.22 + armOn * (1.4 - 1.25 * sweep), 0.25 + 0.8 * armOn);
    p.wrist(-1, 0.1 - 0.4 * sweep * armOn, 0.2 * armOn);
    p.athame = t > 0.1 && t < 1.25 ? 1 : 0;
    p.hand(-1, p.athame ? HAND.grip : HAND.relaxed);
    // Left arm flung back for balance
    p.shoulder(1, { raise: -0.07 + 0.6 * out, back: 0.5 * out, forward: 0.06 });
    p.elbow(1, 0.22 + 0.3 * out, 0.25);
    p.hand(1, HAND.open);
    p.morph.Surprise = 0; p.morph.Pain = 0;
  },
};

// Curtsy: one foot slides behind, knees dip, she holds out her skirt and bows her head (a greeting).
const curtsy = {
  name: 'Curtsy', duration: 2.2,
  pose(p, t) {
    stand(p, { arms: false, hands: false });
    const k = env(t, 0.15, 0.75, 1.35, 1.95);
    const dip = env(t, 0.45, 0.85, 1.2, 1.6);
    p.move('hips', 0.01 * k, -0.07 * dip, -0.02 * k);
    p.euler('hips', 0.05 * dip, 0.08 * k, 0);
    p.euler('spine', 0.18 * dip, 0, 0);
    p.euler('chest', 0.06 * dip, 0, 0);
    p.euler('head', 0.25 * dip, 0.1 * k, 0.12 * k);
    p.legIK(1, new THREE.Vector3(FOOT_X, ANKLE_Y, -0.01), new THREE.Quaternion().setFromAxisAngle(Y, 0.07 + 0.2 * k));
    const rq = new THREE.Quaternion().setFromAxisAngle(Y, -0.07 - 0.35 * k).multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.5 * k));
    p.legIK(-1, new THREE.Vector3(-FOOT_X + 0.03 * k, ANKLE_Y + 0.02 * k, -0.01 - 0.13 * k), rq);
    p.rot('toe_R', X, -0.5 * k);
    for (const s2 of [1, -1]) {
      p.shoulder(s2, { raise: -0.07 + 0.42 * k, forward: 0.06 + 0.22 * k });
      p.elbow(s2, 0.22 + 0.15 * k, 0.25 + 0.4 * k);
      p.wrist(s2, 0.1 - 0.2 * k, 0);
      p.hand(s2, k > 0.4 ? HAND.pinch : HAND.relaxed);
    }
    p.morph.Smile = env(t, 0.4, 0.7, 1.5, 1.9);
    p.morph.Blink = env(t, 0.6, 0.8, 1.2, 1.4);
  },
};

// Hurt: a flinch backward with a pained face.
const hurt = {
  name: 'Hurt', duration: 0.8,
  pose(p, t) {
    stand(p);
    const hit = bell(0.0, 0.8, Math.pow(t / 0.8, 0.6) * 0.8);
    p.move('hips', 0, -0.02 * hit, -0.05 * hit);
    plantFeet(p);
    p.euler('spine', -0.22 * hit, 0.1 * hit, 0);
    p.euler('chest', -0.1 * hit, 0, 0);
    p.euler('head', -0.3 * hit, -0.1 * hit, 0.1 * hit);
    for (const s of [1, -1]) { p.shoulder(s, { raise: 0.35 * hit, forward: 0.4 * hit }); p.elbow(s, 1.1 * hit, 0.5 * hit); p.hand(s, HAND.open); }
    p.morph.Pain = hit; p.morph.Blink = hit;
  },
};

// Twirl: one spin on the spot, her skirt, shawl and hair flaring out.
const twirl = {
  name: 'Twirl', duration: 1.6,
  pose(p, t) {
    stand(p);
    const k = smooth(0.15, 1.25, t);
    p.rot('root', Y, k * Math.PI * 2);
    const on = env(t, 0.05, 0.3, 1.2, 1.55);
    const hop = bell(0.3, 1.1, t);
    p.move('hips', 0, 0.02 * hop, 0);
    plantFeet(p, { liftL: 0.05 * bell(0.35, 0.75, t), liftR: 0.05 * bell(0.7, 1.1, t), pitchL: 0.3 * on, pitchR: 0.3 * on });
    for (const s of [1, -1]) { p.shoulder(s, { raise: 0.9 * on, forward: 0.2 * on }); p.elbow(s, 0.35 * on, 0.8 * on); p.hand(s, HAND.open); }
    p.euler('head', -0.1 * on, 0, 0.12 * on);
    p.morph.Smile = on; p.morph.Blink = on;
  },
};

export const CLIPS = [idle, walk, run, gather, cast, toss, moonlight, cheer, wave, dash, curtsy, hurt, twirl];
export const SPEEDS = { Walk: WALK.speed, Run: RUN.speed };
export { stand, plantFeet, gripHand, FOOT_X, ANKLE_Y };
