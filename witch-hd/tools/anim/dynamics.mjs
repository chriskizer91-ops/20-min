// Secondary motion: chains of bones whose tips are simulated as particles (the VRM "spring bone" method), so
// her hair, skirt, shawl drapes, hat tip and charms swing, trail and settle, and don't pass through her body.
// The results are baked into the animation clips, so nothing needs simulating at run time.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion();

export class SpringSim {
  // chains: [{ bones: [names], tail: Vector3 (rest-space tip of the last bone) | null, stiffness, drag, gravity, radius, colliders: [names] }]
  // colliders: { name: { type: 'sphere', bone, c: Vector3, r } | { type: 'capsule', a: [bone, Vector3], b: [bone, Vector3], r } }
  constructor(skel, chains, colliders) {
    this.skel = skel;
    this.colliders = colliders;
    this.chains = chains.map((c) => {
      const joints = c.bones.map((name, k) => {
        const b = skel.get(name);
        const next = k + 1 < c.bones.length ? skel.get(c.bones[k + 1]).rest : (c.tail ?? b.rest.clone().add(b.rest.clone().sub(b.parent.rest).normalize().multiplyScalar(0.08)));
        const dir = next.clone().sub(b.rest);
        return { b, len: dir.length(), dir: dir.normalize(), cur: new THREE.Vector3(), prev: new THREE.Vector3() };
      });
      return { ...c, joints };
    });
    this.names = new Set(chains.flatMap((c) => c.bones));
  }

  // World shapes of the colliders for the current pose
  worldColliders(pose) {
    const out = {};
    for (const [name, c] of Object.entries(this.colliders)) {
      if (c.type === 'sphere') out[name] = { type: 'sphere', c: pose.carry(c.bone, c.c), r: c.r };
      else out[name] = { type: 'capsule', a: pose.carry(c.a[0], c.a[1]), b: pose.carry(c.b[0], c.b[1]), r: c.r };
    }
    return out;
  }

  // Put every tip where the pose would carry it (no motion)
  reset(pose) {
    for (const ch of this.chains) for (const j of ch.joints) pose.q[j.b.index].identity();
    pose.fk();
    for (const ch of this.chains) {
      for (const j of ch.joints) {
        const W = pose.W[j.b.index];
        const head = _v.setFromMatrixPosition(W);
        const q = new THREE.Quaternion().setFromRotationMatrix(W);
        j.cur.copy(head).addScaledVector(j.dir.clone().applyQuaternion(q), j.len);
        j.prev.copy(j.cur);
      }
    }
  }

  step(pose, dt) {
    // Chain bones start from rest; the animation drives everything else
    for (const ch of this.chains) for (const j of ch.joints) pose.q[j.b.index].identity();
    pose.fk();
    const cols = this.worldColliders(pose);
    const gravity = new THREE.Vector3(0, -1, 0);
    for (const ch of this.chains) {
      for (const j of ch.joints) {
        const i = j.b.index, pi = j.b.parent.index;
        // World transform of this joint with no rotation of its own
        const Wp = pose.W[pi];
        const m = new THREE.Matrix4().compose(j.b.local.clone().add(pose.t[i]), new THREE.Quaternion(), new THREE.Vector3(pose.s[i], pose.s[i], pose.s[i]));
        const W0 = new THREE.Matrix4().multiplyMatrices(Wp, m);
        const head = new THREE.Vector3().setFromMatrixPosition(W0);
        const qp = new THREE.Quaternion().setFromRotationMatrix(Wp);
        const restDir = j.dir.clone().applyQuaternion(qp);
        const inertia = j.cur.clone().sub(j.prev).multiplyScalar(1 - ch.drag);
        const next = j.cur.clone().add(inertia)
          .addScaledVector(restDir, ch.stiffness * dt)
          .addScaledVector(gravity, ch.gravity * dt);
        if (ch.wind) next.add(ch.wind(pose).multiplyScalar(dt));
        next.sub(head).normalize().multiplyScalar(j.len).add(head);
        // Collisions
        for (const cn of ch.colliders ?? []) {
          const c = cols[cn];
          if (!c) continue;
          const R = c.r + (ch.radius ?? 0.01);
          let closest;
          if (c.type === 'sphere') closest = c.c;
          else {
            const ab = c.b.clone().sub(c.a);
            const t = Math.max(0, Math.min(1, next.clone().sub(c.a).dot(ab) / (ab.lengthSq() || 1)));
            closest = c.a.clone().addScaledVector(ab, t);
          }
          const d = next.clone().sub(closest);
          const l = d.length();
          if (l < R) {
            next.copy(closest).addScaledVector(l > 1e-6 ? d.normalize() : restDir, R);
            next.sub(head).normalize().multiplyScalar(j.len).add(head);
          }
        }
        j.prev.copy(j.cur);
        j.cur.copy(next);
        // Rotation that swings the rest direction onto the simulated one
        const want = next.clone().sub(head).normalize();
        const swing = new THREE.Quaternion().setFromUnitVectors(restDir, want);
        const qj = swing.multiply(qp);
        pose.q[i].copy(qp.clone().invert().multiply(qj));
        // Update this joint's world matrix so the next joint hangs from it
        pose.W[i].compose(head, qj, new THREE.Vector3(1, 1, 1));
        this.updateChildren(pose, j.b);
      }
    }
  }

  updateChildren(pose, b) {
    for (const c of b.children) {
      const m = new THREE.Matrix4().compose(c.local.clone().add(pose.t[c.index]), pose.q[c.index], new THREE.Vector3(pose.s[c.index], pose.s[c.index], pose.s[c.index]));
      pose.W[c.index].multiplyMatrices(pose.W[b.index], m);
      this.updateChildren(pose, c);
    }
  }
}
