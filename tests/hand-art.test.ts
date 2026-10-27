import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firstPersonPixels } from '../scripts/first-person-pixels.mjs';

test('all nine hand combinations preserve the opponent, table and optics', { timeout: 10000 }, () => {
  for (const variant of ['desktop', 'mobile']) {
    const base = firstPersonPixels(variant);
    const staticLayers = base.layers.filter(l => !['Robot playing hand', 'Human foreground hand'].includes(l.name));
    for (let humanMove = 0; humanMove < 3; humanMove++) for (let robotMove = 0; robotMove < 3; robotMove++) {
      const posed = firstPersonPixels(variant, { humanMove, robotMove });
      for (const layer of staticLayers) assert.deepEqual(posed.layers.find(l => l.name === layer.name)?.pixels, layer.pixels);
    }
    const robot = base.layers.find(l => l.name === 'T-800 endoskeleton')!;
    // The static image must not contain a fist behind the animated fingers.
    const minX = variant === 'mobile' ? 20 : 66;
    const maxX = variant === 'mobile' ? 32 : 82;
    const minY = variant === 'mobile' ? 40 : 43;
    const maxY = variant === 'mobile' ? 49 : 53;
    assert(!robot.pixels.some(p => p.x >= minX && p.x < maxX && p.y >= minY && p.y < maxY));
  }
});

test('rock, paper, scissors and the pump frame have distinct connected silhouettes', { timeout: 10000 }, () => {
  for (const variant of ['desktop', 'mobile']) for (const role of ['Robot playing hand', 'Human foreground hand']) {
    const signatures = new Set<string>();
    for (let move = 0; move < 4; move++) {
      const art = firstPersonPixels(variant, { humanMove: move % 3, robotMove: move % 3, cocked: move === 3 });
      const pixels = art.layers.find(l => l.name === role)!.pixels;
      signatures.add(JSON.stringify(pixels));
      assert(pixels.every(p => Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0 && p.x < art.width && p.y < art.height));
      const remaining = new Set(pixels.map(p => p.y * art.width + p.x));
      let components = 0;
      while (remaining.size) {
        components++;
        const queue = [remaining.values().next().value!]; remaining.delete(queue[0]);
        for (let i = 0; i < queue.length; i++) {
          const n = queue[i], x = n % art.width, y = Math.floor(n / art.width);
          for (const next of [x > 0 ? n - 1 : -1, x < art.width - 1 ? n + 1 : -1, y > 0 ? n - art.width : -1, y < art.height - 1 ? n + art.width : -1]) if (remaining.delete(next)) queue.push(next);
        }
      }
      assert.equal(components, 1, `${variant} ${role} pose ${move} should not have floating fingers or wrists`);
    }
    assert.equal(signatures.size, 4);
  }
});

test('every runtime hand frame and static scene has the matching native canvas size', () => {
  for (const [variant, width, height] of [['desktop', 240, 100], ['mobile', 120, 90]] as const) {
    const frames = ['scene', ...['human', 'robot'].flatMap(role => ['rock', 'paper', 'scissors', 'windup'].map(pose => `${role}-${pose}`)), ...['neutral', 'victory', 'defeat'].map(face => `face-${face}`)];
    for (const frame of frames) {
      const data = readFileSync(new URL(`../public/assets/last-hand-first-person-${variant}-${frame}.png`, import.meta.url));
      assert.equal(data.subarray(1, 4).toString(), 'PNG');
      assert.equal(data.readUInt32BE(16), width);
      assert.equal(data.readUInt32BE(20), height);
      assert.equal(data[25], 6, `${frame} must retain RGBA transparency`);
    }
  }
});

test('facial expressions vary without changing the robot body, table or hands', { timeout: 10000 }, () => {
  for (const variant of ['desktop', 'mobile']) {
    const base = firstPersonPixels(variant);
    const signatures = new Set<string>();
    for (const expression of ['neutral', 'victory', 'defeat']) {
      const art = firstPersonPixels(variant, { expression });
      for (const layer of base.layers.filter(l => !['Robot face', 'Red optics'].includes(l.name))) {
        assert.deepEqual(art.layers.find(l => l.name === layer.name)?.pixels, layer.pixels);
      }
      const face = art.layers.filter(l => ['Robot face', 'Red optics'].includes(l.name));
      signatures.add(JSON.stringify(face));
      for (const layer of face) assert(layer.pixels.every(p => p.y < art.height * .42), 'face reactions must stay above the shoulders');
    }
    assert.equal(signatures.size, 3);
  }
});
