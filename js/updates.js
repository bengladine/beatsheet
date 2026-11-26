// Drumsheet: "What's new". Add a new entry at the TOP with a higher id when you ship something
// users should know about, and keep the older entries below it. Each entry is shown once:
// a returning visitor gets every entry newer than the last one they saw, by date.
export const UPDATES = [
  {
    id: 5,
    date: '26 Nov 2026',
    items: [
      '<b>Snare taps are normal strokes now</b> (they used to be accented). Prefer accents or ghost notes? Tap the <b>Snare</b> row label and choose under <b>Tap adds</b>: Normal, Accent or Ghost. Your choice is remembered in this browser.',
    ],
  },
  {
    id: 4,
    date: '25 Nov 2026',
    items: [
      '<b>Move bars by dragging:</b> grab a bar by its ≡ handle in the editor, or drag it in the sheet music (on a phone: hold it a moment first), and drop it in front of or behind another bar.',
      '<b>Loop button</b> on the sheet: tap it, then tap a bar or drag the orange handles to choose which bars repeat.',
      'The play cursor now keeps moving over rests too.',
    ],
  },
  {
    id: 3,
    date: '24 Nov 2026',
    items: [
      '<b>Accounts (optional):</b> sign in with Google or email under ★ My grooves, and your grooves are saved online on all your devices.',
      '<b>★ My grooves:</b> save, name and reopen your grooves (Ctrl+S). Without an account they are only stored in this browser, and clearing your browser data (cookies, history) deletes them. Sign in to keep them safe.',
    ],
  },
  {
    id: 2,
    date: '20 Nov 2026',
    items: [
      '<b>Tap tempo:</b> the TAP button next to the BPM, or press T.',
      '<b>Crash 2</b> in the cymbals row (right-click a crash cell).',
      'Cymbals in the sheet now follow standard drum notation (ride on the top line, ride bell as a diamond).',
      'Longer grooves: links now keep up to 64 bars.',
      'Fixed: the grid per beat is kept after undo, reload and sharing.',
    ],
  },
];
