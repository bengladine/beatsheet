# Beatsheet

**Free online drum notation editor.** Write a groove, hear it, loop it, share it.

👉 **Use it:** https://bengladine.github.io/beatsheet/

Made by [Drumhof](https://drumhof.com) — drum lessons in Gent, Belgium.
Like it? [Buy me a coffee ☕](https://ko-fi.com/gladinathor)

## What it can do

- Hi-hat, ride (own row), snare, kick and **4 toms** (each with its own sound)
- **Time signature per bar** (4/4, 7/8, 5/4… mixed in one groove)
- **Grid per beat**: 1/4, 1/8, 1/16, 1/32, triplets, sextuplets — mixable
- Bar tools: copy, empty bar, move, duplicate, clear, delete
- Click a bar on the sheet to play from there; drag across bars to **loop** them
- Convert a whole row at once (e.g. all accents → normal)
- Pinned sheet music, playback that follows the playing bar
- Works on phones (long-press = right-click)
- Share a link, embed it, print or download (PDF/MIDI/…)

Links from the original Groove Scribe open here too.

## Credits & license

Beatsheet is built on [GrooveScribe](https://github.com/montulli/GrooveScribe)
by Lou Montulli and Mike Johnston, and is released under the same
**GNU General Public License v2** (see `LICENSE.txt`).
The original README is kept in `README-GrooveScribe.md`.

## Repository layout

- Root: the full source (ES modules, no build step), tests and tooling.
  `npm install`, then `npm test` / `npm run test:e2e` / `npm run serve`.
- `docs/`: the published website (GitHub Pages serves this folder).
  It is a copy of the source with cache-busting `?v=` added to the module imports.
