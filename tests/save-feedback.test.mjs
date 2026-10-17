import test from 'node:test';
import assert from 'node:assert/strict';
import { compile, moduleUrl } from './loadTypeScript.mjs';

const { createSaveFeedback } = await import(
  moduleUrl(compile('../src/lib/saveFeedback.ts'))
);

function fixture(reduced = false) {
  const listeners = new Set();
  const events = [];
  const calls = [];
  const preference = {
    matches: reduced,
    addEventListener: (name, listener) => {
      assert.equal(name, 'change');
      listeners.add(listener);
    },
    removeEventListener: (name, listener) => {
      assert.equal(name, 'change');
      listeners.delete(listener);
    },
  };
  const target = {
    animate: (frames, options) => {
      const index = calls.length;
      calls.push({ frames, options });
      events.push(`play-${index}`);
      return { cancel: () => events.push(`cancel-${index}`) };
    },
  };
  const feedback = createSaveFeedback(target, preference);
  function change(reduce) {
    preference.matches = reduce;
    for (const listener of listeners) listener();
  }
  return { feedback, preference, target, calls, events, listeners, change };
}

test('saving gives finite transform-only feedback with a neutral final frame', () => {
  const { feedback, calls } = fixture();
  feedback.play(true);
  const { frames, options } = calls[0];
  assert.equal(options.duration, 260);
  assert.equal(options.iterations, 1);
  assert.equal(options.fill, undefined);
  assert.deepEqual(frames[0], { transform: 'scale(1)' });
  assert.deepEqual(frames.at(-1), { transform: 'scale(1)' });
  assert.ok(frames.every((frame) => Object.keys(frame).every(
    (key) => ['transform', 'offset'].includes(key),
  )));
  feedback.dispose();
});

test('un-saving uses shorter restrained feedback rather than a second celebration', () => {
  const { feedback, calls } = fixture();
  feedback.play(false);
  assert.equal(calls[0].options.duration, 180);
  assert.equal(calls[0].frames.length, 3);
  assert.equal(calls[0].frames.at(-1).transform, 'scale(1)');
  feedback.dispose();
});

test('rapid save changes cancel the previous animation before replacing it', () => {
  const { feedback, events } = fixture();
  feedback.play(true);
  feedback.play(false);
  feedback.play(true);
  assert.deepEqual(events, [
    'play-0', 'cancel-0', 'play-1', 'cancel-1', 'play-2',
  ]);
  feedback.dispose();
  assert.equal(events.at(-1), 'cancel-2');
});

test('an initial reduced-motion preference never starts feedback', () => {
  const { feedback, calls } = fixture(true);
  feedback.play(true);
  feedback.play(false);
  assert.equal(calls.length, 0);
  feedback.dispose();
});

test('live reduced-motion changes stop active feedback and can later resume', () => {
  const { feedback, calls, events, change } = fixture();
  feedback.play(true);
  change(true);
  assert.deepEqual(events, ['play-0', 'cancel-0']);
  feedback.play(false);
  assert.equal(calls.length, 1);
  change(false);
  feedback.play(false);
  assert.equal(calls.length, 2);
  feedback.dispose();
});

test('dispose cancels motion, removes the listener and prevents later playback', () => {
  const { feedback, events, calls, listeners } = fixture();
  assert.equal(listeners.size, 1);
  feedback.play(true);
  feedback.dispose();
  feedback.dispose();
  feedback.play(true);
  assert.equal(listeners.size, 0);
  assert.equal(calls.length, 1);
  assert.deepEqual(events, ['play-0', 'cancel-0']);
});

test('browsers without animate keep feedback optional', () => {
  const { feedback: original, preference } = fixture();
  original.dispose();
  const feedback = createSaveFeedback({}, preference);
  assert.doesNotThrow(() => feedback.play(true));
  feedback.dispose();
});

test('animation failure never escapes into the saved-items action', () => {
  const { feedback: original, preference } = fixture();
  original.dispose();
  const feedback = createSaveFeedback({
    animate: () => { throw new Error('Animation unavailable'); },
  }, preference);
  assert.doesNotThrow(() => feedback.play(true));
  assert.doesNotThrow(() => feedback.play(false));
  feedback.dispose();
});
