// Rule checks for the painted-scene engine: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import scene from '../scenes/wickhollow-square.json' with { type: 'json' };
import { PaintCamera, ring } from '../src/paint.js';
import { Walkmesh } from '../src/walkmesh.js';

const paint = new PaintCamera(scene.size, scene.camera);
const walk = new Walkmesh(scene, paint);
walk.buildGrid(0.18);
const at = (x, y, h = 0) => paint.toWorld(x, y, h);

test('a painting pixel dropped into 3D lands back on the same pixel', () => {
  for (const [x, y, h] of [[0, 0, 0], [724, 543, 0], [1400, 1000, 0], [786, 410, 0.55]]) {
    const p = paint.toPixel(at(x, y, h));
    assert.ok(Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6, `${x},${y} came back as ${p.x},${p.y}`);
  }
});

test('the middle of the painting is the world origin, at the chosen scale', () => {
  const o = at(724, 543);
  assert.ok(Math.hypot(o.x, o.z) < 1e-6);
  const oneMeterRight = paint.toPixel(o.clone().setX(1));
  assert.ok(Math.abs(oneMeterRight.x - 724 - scene.camera.ppm) < 0.5);
});

test('she can stand where she starts, but not in the well or on a lamp post', () => {
  const spawn = at(...scene.spawn.pixel);
  assert.ok(walk.canStand(spawn.x, spawn.z, 0.18));
  const well = at(705, 724);
  assert.ok(!walk.canStand(well.x, well.z, 0));
  const lamp = at(343, 742);
  assert.ok(!walk.canStand(lamp.x, lamp.z, 0));
  const roof = at(870, 1040);
  assert.ok(!walk.canStand(roof.x, roof.z, 0), 'the roof in front is not floor');
});

test('the chapel steps rise from the square to the door', () => {
  assert.equal(walk.heightAt(at(768, 504).x, at(768, 504).z), 0);
  const mid = at(776, 460, 0.28);
  const h = walk.heightAt(mid.x, mid.z);
  assert.ok(h > 0.15 && h < 0.45, `halfway up the steps is ${h} m high`);
  const door = at(786, 410, 0.55);
  assert.ok(Math.abs(walk.heightAt(door.x, door.z) - 0.55) < 1e-6);
});

test('the floor is one piece: every open cell can reach the spawn point', () => {
  const spawn = at(...scene.spawn.pixel);
  for (const [x, y, h] of [[1150, 1000, 0], [320, 640, 0], [1240, 440, 0], [786, 430, 0.55], [700, 600, 0]]) {
    const path = walk.findPath(spawn, at(x, y, h));
    assert.ok(path && path.length, `no path to ${x},${y}`);
  }
});

test('a path never cuts through the well', () => {
  const path = walk.findPath(at(556, 724), at(856, 724));
  assert.ok(path);
  let prev = at(556, 724);
  for (const p of path) {
    assert.ok(walk.clearLine(prev, p, 0.17), 'a straight stretch of the path crosses something solid');
    prev = p;
  }
});

test('every cut-out, light and exit is drawn on the painting', () => {
  const [W, H] = scene.size;
  const inside = ([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H;
  for (const l of scene.layers) for (const part of l.outline) for (const p of ring(part)) assert.ok(inside(p), `${l.name} goes off the painting`);
  for (const l of scene.lights) assert.ok(inside(l.pixel) && inside(l.base));
  for (const e of scene.exits) for (const p of e.zone) assert.ok(inside(p));
});
