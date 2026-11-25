// Global test setup, run once per test file before any tests (see
// vitest.config.js `setupFiles`).
//
// The jsdom environment already provides `window`, `document`, `navigator`,
// `localStorage`, etc. Here we add the few browser APIs the Groove Scribe
// sources touch that jsdom does not implement, so that unmodified production
// code can be loaded and exercised without throwing at import time.

import { vi, beforeEach, afterAll } from 'vitest';

// The app starts a few delayed jobs on load (e.g. a scroll nudge after 1 s, the
// "What's new" card after 1.5 s). In a test file they can fire after the file has
// finished and its jsdom page is gone, and then throw "window is not defined",
// which vitest reports as an unhandled error. Remember every pending timeout and
// cancel what is left when the file is done.
const pendingTimeouts = new Set();
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
  pendingTimeouts.add(id);
  return id;
};
globalThis.clearTimeout = function (id) {
  pendingTimeouts.delete(id);
  return realClearTimeout(id);
};
afterAll(() => {
  pendingTimeouts.forEach((id) => realClearTimeout(id));
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
