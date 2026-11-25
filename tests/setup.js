// Global test setup, run once per test file before any tests (see
// vitest.config.js `setupFiles`).
//
// The jsdom environment already provides `window`, `document`, `navigator`,
// `localStorage`, etc. Here we add the few browser APIs the Groove Scribe
// sources touch that jsdom does not implement, so that unmodified production
// code can be loaded and exercised without throwing at import time.

import { vi, beforeEach, afterEach, afterAll } from 'vitest';

// The app starts delayed jobs: on load (a scroll nudge after 1 s, the "What's new"
// card after 1.5 s) and after edits (a note tap redraws the sheet one frame later).
// Left alone they fire after their test is over, on the next test's page or after
// the file's jsdom page is gone, and throw. So: a timeout or animation frame that a
// test starts is cancelled when that test ends, and whatever is left (started while
// loading the file) is cancelled when the file is done.
const pendingTimeouts = new Map(); // id -> started during a test?
const pendingFrames = new Set();
let inTest = false;
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
globalThis.setTimeout = function (fn, ms, ...args) {
  const id = realSetTimeout(
    function () {
      pendingTimeouts.delete(id);
      if (typeof fn === 'function') return fn.apply(this, arguments);
    },
    ms,
    ...args
  );
  pendingTimeouts.set(id, inTest);
  return id;
};
globalThis.clearTimeout = function (id) {
  pendingTimeouts.delete(id);
  return realClearTimeout(id);
};
const realRaf = globalThis.requestAnimationFrame;
const realCancelRaf = globalThis.cancelAnimationFrame;
if (realRaf) {
  globalThis.requestAnimationFrame = function (fn) {
    const id = realRaf.call(globalThis, function (t) {
      pendingFrames.delete(id);
      return fn(t);
    });
    if (inTest) pendingFrames.add(id);
    return id;
  };
  globalThis.cancelAnimationFrame = function (id) {
    pendingFrames.delete(id);
    return realCancelRaf.call(globalThis, id);
  };
}
beforeEach(() => {
  inTest = true;
});
afterEach(() => {
  inTest = false;
  pendingTimeouts.forEach((duringTest, id) => {
    if (!duringTest) return;
    realClearTimeout(id);
    pendingTimeouts.delete(id);
  });
  pendingFrames.forEach((id) => realCancelRaf && realCancelRaf.call(globalThis, id));
  pendingFrames.clear();
});
afterAll(() => {
  pendingTimeouts.forEach((_, id) => realClearTimeout(id));
  pendingTimeouts.clear();
});

// jsdom does not implement matchMedia; some display code queries it.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// jsdom does not implement scrollTo.
if (!window.scrollTo) {
  window.scrollTo = vi.fn();
}

// The page always loads MIDI.js (a global `MIDI`); tests do not. Code such as
// setMetronomeFrequency asks `MIDI.Player.playing`, so give every test an idle
// player. Tests that need a real mock (midi-playback.test.js) assign their own
// in their beforeEach, which runs after this one.
function idleMidi() {
  return { Player: { playing: false, currentTime: 0, endTime: 0 } };
}

// Keep every test isolated from any DOM one of its predecessors may have built.
beforeEach(() => {
  document.body.innerHTML = '';
  if (!globalThis.MIDI) globalThis.MIDI = idleMidi();
});
