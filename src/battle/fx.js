import * as THREE from 'three';
import { glowSprite } from '../actors/kit.js';

// Spell effects on the battle stage: bolts of witchfire, a ring of moonlight, sparkles.
export class Fx {
  constructor(world) {
    this.world = world;
    this.live = [];
  }

  // A glowing bolt that arcs from one point to another; resolves when it lands.
  bolt(from, to, color, size = 1) {
    return new Promise((resolve) => {
      const head = glowSprite(color, 0.55 * size, 1);
      const core = glowSprite('#ffffff', 0.2 * size, 0.9);
      head.add(core);
      this.world.add(head);
      const trail = [];
      this.live.push({
        t: 0, dur: 0.38,
        step: (k) => {
          head.position.lerpVectors(from, to, k);
          head.position.y += Math.sin(k * Math.PI) * 0.6;
          if (Math.random() < 0.8) {
            const s = glowSprite(color, 0.22 * size, 0.6);
            s.position.copy(head.position);
            this.world.add(s);
            trail.push({ s, life: 0.3 });
          }
        },
        end: () => { this.world.remove(head); this.sparkle(to, color, 18); resolve(); },
        tick: (dt) => { for (const p of trail) { p.life -= dt; p.s.material.opacity = Math.max(0, p.life / 0.3) * 0.6; if (p.life <= 0) this.world.remove(p.s); } },
      });
    });
  }

  // Silver rings of moonlight open on the ground under each foe.
  moonRing(positions) {
    return new Promise((resolve) => {
      const rings = positions.map((p) => {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color: '#dfe6ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        m.rotation.x = -Math.PI / 2;
        m.position.copy(p).setY(p.y + 0.03);
        const g = glowSprite('#cfd8ff', 1.6, 0.6);
        g.position.copy(p).setY(p.y + 0.5);
        this.world.add(m, g);
        return { m, g };
      });
      this.live.push({
        t: 0, dur: 0.8,
        step: (k) => { for (const r of rings) { r.m.scale.setScalar(1 + k * 2.2); r.m.material.opacity = 0.9 * (1 - k); r.g.material.opacity = 0.6 * Math.sin(k * Math.PI); } },
        end: () => { for (const r of rings) this.world.remove(r.m, r.g); resolve(); },
      });
    });
  }

  // A beaten lamp-moth's stolen flame floats up and away, home to Wickhollow.
  floatHome(at) {
    const flame = glowSprite('#c77dff', 0.5, 1);
    const core = glowSprite('#ffffff', 0.16, 0.9);
    flame.add(core);
    flame.position.copy(at);
    this.world.add(flame);
    const start = at.clone();
    this.live.push({ t: 0, dur: 2.4, step: (k) => { flame.position.set(start.x + Math.sin(k * 6) * 0.2 + k * 1.5, start.y + k * 3, start.z - k * 2); flame.material.opacity = 1 - k * k; }, end: () => this.world.remove(flame) });
  }

  sparkle(at, color, n = 14) {
    for (let i = 0; i < n; i++) {
      const s = glowSprite(color, 0.12 + Math.random() * 0.1, 0.9);
      s.position.copy(at);
      const v = new THREE.Vector3((Math.random() - 0.5) * 2.2, Math.random() * 2.2, (Math.random() - 0.5) * 2.2);
      this.world.add(s);
      this.live.push({ t: 0, dur: 0.5 + Math.random() * 0.3, step: (k, dt) => { s.position.addScaledVector(v, dt); v.y -= 3 * dt; s.material.opacity = 0.9 * (1 - k); }, end: () => this.world.remove(s) });
    }
  }

  update(dt) {
    for (const f of this.live) {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur);
      f.step(k, dt);
      f.tick?.(dt);
      if (k >= 1) { f.end(); f.done = true; }
    }
    this.live = this.live.filter((f) => !f.done);
  }
}
