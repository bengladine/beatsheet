import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { newGrooveWriter, buildGridDOM } from '../helpers/loadGrooveWriter.js';

// groove_writer.js is written assuming classic <script> global-scope sharing
// with groove_utils.js: it has a top-of-file `/*global ... */` comment listing
// bare identifiers (constant_ABC_*, constant_OUR_MIDI_*) that it expects to
// find on the page's shared global scope because, in the real app, both files
// are plain <script> tags whose top-level `var`s all land on `window`.
//
// Vitest's transform plugin (see vitest.config.js) turns each legacy file into
// its own real ES module so it can be `import`ed -- but that means groove_writer.js
// no longer shares scope with groove_utils.js: its module-level `var`s (the
// note-on/off color constants, which groove_writer.js *does* redeclare locally)
// resolve fine, but the ABC-notation and MIDI-note-number constants that only
// groove_utils.js declares are simply undefined here, and any code path that
// reads them throws a ReferenceError. We shim them onto globalThis with the
// literal values copied from groove_utils.js so the note-state getters/setters
// (which are otherwise being tested faithfully, unmodified) can run.
function shimCrossModuleConstants() {
  globalThis.constant_ABC_STICK_R = '"R"x';
  globalThis.constant_ABC_STICK_L = '"L"x';
  globalThis.constant_ABC_STICK_BOTH = '"R/L"x';
  globalThis.constant_ABC_STICK_COUNT = '"count"x';
  globalThis.constant_ABC_STICK_OFF = '""x';
  globalThis.constant_ABC_HH_Ride = "^A'";
  globalThis.constant_ABC_HH_Ride_Bell = "^B'";
  globalThis.constant_ABC_HH_Cow_Bell = "^D'";
  globalThis.constant_ABC_HH_Crash = "^c'";
  globalThis.constant_ABC_HH_Stacker = "^d'";
  globalThis.constant_ABC_HH_Metronome_Normal = "^e'";
  globalThis.constant_ABC_HH_Metronome_Accent = "^f'";
  globalThis.constant_ABC_HH_Open = '!open!^g';
  globalThis.constant_ABC_HH_Close = '!plus!^g';
  globalThis.constant_ABC_HH_Accent = '!accent!^g';
  globalThis.constant_ABC_HH_Normal = '^g';
  globalThis.constant_ABC_SN_Ghost = '!(.!!).!c';
  globalThis.constant_ABC_SN_Accent = '!accent!c';
  globalThis.constant_ABC_SN_Normal = 'c';
  globalThis.constant_ABC_SN_XStick = '^c';
  globalThis.constant_ABC_SN_Buzz = '!///!c';
  globalThis.constant_ABC_SN_Flam = '!accent!{/c}c';
  globalThis.constant_ABC_SN_Drag = '{/cc}c';
  globalThis.constant_ABC_KI_SandK = '[F^d,]';
  globalThis.constant_ABC_KI_Splash = '^d,';
  globalThis.constant_ABC_KI_Normal = 'F';
  globalThis.constant_ABC_T1_Normal = 'e';
  globalThis.constant_ABC_T2_Normal = 'd';
  globalThis.constant_ABC_T3_Normal = 'B';
  globalThis.constant_ABC_T4_Normal = 'A';
  globalThis.constant_NUMBER_OF_TOMS = 4;
  globalThis.constant_ABC_OFF = false;
  globalThis.constant_OUR_MIDI_VELOCITY_NORMAL = 85;
  globalThis.constant_OUR_MIDI_VELOCITY_ACCENT = 120;
  globalThis.constant_OUR_MIDI_VELOCITY_GHOST = 50;
  globalThis.constant_OUR_MIDI_METRONOME_1 = 76;
  globalThis.constant_OUR_MIDI_METRONOME_NORMAL = 77;
  globalThis.constant_OUR_MIDI_HIHAT_NORMAL = 42;
  globalThis.constant_OUR_MIDI_HIHAT_OPEN = 46;
  globalThis.constant_OUR_MIDI_HIHAT_ACCENT = 108;
  globalThis.constant_OUR_MIDI_HIHAT_CRASH = 49;
  globalThis.constant_OUR_MIDI_HIHAT_STACKER = 52;
  globalThis.constant_OUR_MIDI_HIHAT_METRONOME_NORMAL = 77;
  globalThis.constant_OUR_MIDI_HIHAT_METRONOME_ACCENT = 76;
  globalThis.constant_OUR_MIDI_HIHAT_RIDE = 51;
  globalThis.constant_OUR_MIDI_HIHAT_RIDE_BELL = 53;
  globalThis.constant_OUR_MIDI_HIHAT_COW_BELL = 105;
  globalThis.constant_OUR_MIDI_HIHAT_FOOT = 44;
  globalThis.constant_OUR_MIDI_SNARE_NORMAL = 38;
  globalThis.constant_OUR_MIDI_SNARE_ACCENT = 22;
  globalThis.constant_OUR_MIDI_SNARE_GHOST = 21;
  globalThis.constant_OUR_MIDI_SNARE_XSTICK = 37;
  globalThis.constant_OUR_MIDI_SNARE_BUZZ = 104;
  globalThis.constant_OUR_MIDI_SNARE_FLAM = 107;
  globalThis.constant_OUR_MIDI_SNARE_DRAG = 103;
  globalThis.constant_OUR_MIDI_KICK_NORMAL = 35;
  globalThis.constant_OUR_MIDI_TOM1_NORMAL = 48;
  globalThis.constant_OUR_MIDI_TOM2_NORMAL = 47;
  globalThis.constant_OUR_MIDI_TOM3_NORMAL = 45;
  globalThis.constant_OUR_MIDI_TOM4_NORMAL = 43;
}

// noteLeftClick/noteOnMouseEnter always pass make_sound=true, which calls
// play_single_note_for_note_setting() -> MIDI.WebAudio.noteOn(...). The
// `MIDI` (MIDI.js) global is also not present under jsdom, so we mock the
// two entry points groove_writer.js can call.
function makeMidiMock() {
  return {
    WebAudio: { noteOn: vi.fn() },
    AudioTag: { noteOn: vi.fn() },
  };
}

// Elements grooveDataFromClickableUI / updateSheetMusic (called by every
// note-mutating method) reach for beyond the note grid itself.
function addExtraFixtures() {
  const extra = document.createElement('div');
  extra.innerHTML =
    '<textarea id="ABCsource"></textarea><div id="svgTarget"></div><div id="diverr"></div>';
  document.body.appendChild(extra);

  // Context menus referenced by noteRightClick/noteLabelClick.
  const menuIds = [
    'stickingContextMenu',
    'hhContextMenu',
    'tom1ContextMenu',
    'tom4ContextMenu',
    'snareContextMenu',
    'kickContextMenu',
    'stickingsLabelContextMenu',
    'hhLabelContextMenu',
    'tom1LabelContextMenu',
    'tom4LabelContextMenu',
    'snareLabelContextMenu',
    'kickLabelContextMenu',
  ];
  menuIds.forEach((id) => {
    const ul = document.createElement('ul');
    ul.id = id;
    document.body.appendChild(ul);
  });
}

let gw;

beforeEach(async () => {
  document.body.innerHTML = '';
  shimCrossModuleConstants();
  globalThis.MIDI = makeMidiMock();
  gw = await newGrooveWriter();
  buildGridDOM(gw, 1);
  addExtraFixtures();
  // Stub cascading render helpers not under test here (heavy SVG/ABC/URL work).
  gw.refresh_ABC = vi.fn();
  gw.updateCurrentURL = vi.fn();
  gw.displayNewSVG = vi.fn();
});

describe('Snare "Tap adds" setting (normal / accent / ghost)', () => {
  const ev = { target: {}, preventDefault() {}, stopPropagation() {} };
  // the page reads the saved choice when it is built (in the file's beforeEach, before this
  // block's hooks), so clean up after each test, not only before it
  beforeEach(() => localStorage.removeItem('benSnareTap'));
  afterEach(() => localStorage.removeItem('benSnareTap'));

  it('defaults to normal', () => {
    expect(gw.getSnareTapMode()).toBe('normal');
    gw.noteLeftClick(ev, 'snare', 2);
    expect(gw.grooveDataFromClickableUI().snare_array[2]).toBe('c');
  });

  it('a tap adds the chosen stroke, and a second tap still turns the note off', () => {
    gw.setSnareTapMode('accent');
    gw.noteLeftClick(ev, 'snare', 2);
    expect(gw.grooveDataFromClickableUI().snare_array[2]).toBe('!accent!c');
    gw.noteLeftClick(ev, 'snare', 2);
    expect(gw.grooveDataFromClickableUI().snare_array[2]).toBe(false);

    gw.setSnareTapMode('ghost');
    gw.noteLeftClick(ev, 'snare', 3);
    expect(gw.grooveDataFromClickableUI().snare_array[3]).toBe('!(.!!).!c'); // constant_ABC_SN_Ghost
  });

  it('Ctrl+hover painting uses the setting too', () => {
    gw.setSnareTapMode('accent');
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'snare', 6);
    expect(gw.grooveDataFromClickableUI().snare_array[6]).toBe('!accent!c');
  });

  it('notes already in the groove keep their stroke when the setting changes', () => {
    gw.noteLeftClick(ev, 'snare', 4); // normal
    gw.setSnareTapMode('accent');
    expect(gw.grooveDataFromClickableUI().snare_array[4]).toBe('c');
  });

  it('is remembered in this browser (a new page starts with the saved choice)', async () => {
    gw.setSnareTapMode('ghost');
    expect(localStorage.getItem('benSnareTap')).toBe('ghost');
    const fresh = await newGrooveWriter();
    expect(fresh.getSnareTapMode()).toBe('ghost');
  });

  it('ignores an unknown value (from storage or a call) and keeps normal', async () => {
    gw.setSnareTapMode('flam');
    expect(gw.getSnareTapMode()).toBe('normal');
    localStorage.setItem('benSnareTap', 'bogus');
    const fresh = await newGrooveWriter();
    expect(fresh.getSnareTapMode()).toBe('normal');
  });

  it('the snare row menu shows "Tap adds" with the current choice, and picking one saves it and closes the menu', () => {
    gw.setSnareTapMode('accent');
    gw.noteLabelClick({ clientX: 300, clientY: 200, preventDefault() {}, stopPropagation() {} }, 'snare', 1);
    const menu = document.getElementById('snareLabelContextMenu');
    const row = menu.firstElementChild;
    expect(row.classList.contains('ben-tap-row')).toBe(true);
    expect(row.querySelector('button.on').getAttribute('data-mode')).toBe('accent');

    row.querySelector('button[data-mode="ghost"]').click();

    expect(gw.getSnareTapMode()).toBe('ghost');
    expect(row.querySelector('button.on').getAttribute('data-mode')).toBe('ghost');
    expect(menu.style.display).toBe('none');
    expect(menu.querySelectorAll('.ben-tap-row')).toHaveLength(1); // opening again adds no second row
    gw.noteLabelClick({ clientX: 300, clientY: 200, preventDefault() {}, stopPropagation() {} }, 'snare', 1);
    expect(menu.querySelectorAll('.ben-tap-row')).toHaveLength(1);
  });
});

describe('Snare "Tap adds" setting follows the account when signed in', () => {
  // a stand-in for js/account.js (the real one talks to Firebase)
  function fakeAccount(saved, { failRead = false, failSave = false } = {}) {
    const acct = {
      saved: saved,
      writes: [],
      getPrefs: vi.fn(async () => {
        if (failRead) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
        return acct.saved;
      }),
      savePrefs: vi.fn(async (p) => {
        if (failSave) throw Object.assign(new Error('denied'), { code: 'permission-denied' });
        acct.writes.push(p);
        acct.saved = { snareTap: p.snareTap, updated: 1 };
      }),
    };
    return acct;
  }
  function signIn(acct) {
    const store = gw._benAccountStore;
    store.online = true;
    store.mod = acct;
  }
  beforeEach(() => localStorage.removeItem('benSnareTap'));
  afterEach(() => localStorage.removeItem('benSnareTap'));

  it('on sign-in, the account\'s choice wins and is kept in this browser too', async () => {
    gw.setSnareTapMode('ghost'); // this browser had ghost
    const acct = fakeAccount({ snareTap: 'accent', updated: 1 });
    signIn(acct);

    await gw.loadPrefsFromAccount();

    expect(gw.getSnareTapMode()).toBe('accent');
    expect(localStorage.getItem('benSnareTap')).toBe('accent');
    expect(acct.savePrefs).not.toHaveBeenCalled(); // nothing to send back
  });

  it('an account without settings yet gets this browser\'s choice', async () => {
    gw.setSnareTapMode('ghost');
    const acct = fakeAccount(null);
    signIn(acct);

    await gw.loadPrefsFromAccount();

    expect(gw.getSnareTapMode()).toBe('ghost');
    expect(acct.writes).toEqual([{ snareTap: 'ghost' }]);
  });

  it('changing the setting while signed in saves it in the account', async () => {
    const acct = fakeAccount(null);
    signIn(acct);

    gw.setSnareTapMode('accent');

    expect(acct.writes).toEqual([{ snareTap: 'accent' }]);
  });

  it('signed out: nothing is sent anywhere', () => {
    const acct = fakeAccount(null);
    gw._benAccountStore.mod = acct; // module loaded, but not signed in
    gw._benAccountStore.online = false;

    gw.setSnareTapMode('accent');

    expect(acct.savePrefs).not.toHaveBeenCalled();
    expect(gw.getSnareTapMode()).toBe('accent');
  });

  it('if the account refuses (e.g. database rules not updated yet), the browser setting still works', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const acct = fakeAccount(null, { failRead: true, failSave: true });
    signIn(acct);

    await expect(gw.loadPrefsFromAccount()).resolves.toBeUndefined();
    gw.setSnareTapMode('ghost');
    await Promise.resolve(); // let the refused save settle

    expect(gw.getSnareTapMode()).toBe('ghost');
    expect(localStorage.getItem('benSnareTap')).toBe('ghost');
    warn.mockRestore();
  });

  it('ignores an unknown value stored in the account', async () => {
    const acct = fakeAccount({ snareTap: 'flam', updated: 1 });
    signIn(acct);

    await gw.loadPrefsFromAccount();

    expect(gw.getSnareTapMode()).toBe('normal');
  });
});

describe('GrooveWriter clickable grid: grooveDataFromClickableUI', () => {
  it('returns all-false arrays sized notesPerMeasure * numberOfMeasures on an empty grid', () => {
    const gd = gw.grooveDataFromClickableUI();
    const expectedLen = gw.notesPerMeasure() * gw.numberOfMeasures();

    expect(gd.hh_array).toHaveLength(expectedLen);
    expect(gd.snare_array).toHaveLength(expectedLen);
    expect(gd.kick_array).toHaveLength(expectedLen);
    expect(gd.hh_array.every((v) => v === false)).toBe(true);
    expect(gd.snare_array.every((v) => v === false)).toBe(true);
    expect(gd.kick_array.every((v) => v === false)).toBe(true);
  });

  it('toms_array has one full-length slot for each of the 4 toms', () => {
    // Groove Scribe only ever filled tom1 and tom4 (indices 1 and 2 stayed empty);
    // Drumsheet reads all four toms.
    const gd = gw.grooveDataFromClickableUI();
    const len = gw.notesPerMeasure() * gw.numberOfMeasures();
    expect(gd.toms_array).toHaveLength(4);
    gd.toms_array.forEach((tom) => expect(tom).toHaveLength(len));
  });

  it('showStickings/showToms default to false, and sticking_array is only populated when stickings are shown', () => {
    let gd = gw.grooveDataFromClickableUI();
    expect(gd.showStickings).toBe(false);
    expect(gd.showToms).toBe(false);
    expect(gd.sticking_array).toEqual([]); // not collected while hidden

    gw.stickingsShowHide(true, true, true); // force show, don't re-render
    gd = gw.grooveDataFromClickableUI();
    expect(gd.showStickings).toBe(true);
    expect(gd.sticking_array).toHaveLength(gw.notesPerMeasure() * gw.numberOfMeasures());
    // Quirk: an "off" sticking reads back as the ABC_STICK_OFF string '""x',
    // NOT boolean false like the other (hh/snare/kick/tom) arrays.
    expect(gd.sticking_array.every((v) => v === '""x')).toBe(true);
  });

  it('showToms toggles the toms_array between all-false placeholders and real (still-off) tom states', () => {
    gw.showHideToms(true, true, true);
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.showToms).toBe(true);
    expect(gd.toms_array[0].every((v) => v === false)).toBe(true); // off tom reads back as false, same as hh/snare/kick
  });
});

describe('GrooveWriter clickable grid: noteLeftClick', () => {
  const ev = { target: {}, preventDefault() {}, stopPropagation() {} };

  it('toggles a hi-hat note on (normal) then back off', () => {
    gw.noteLeftClick(ev, 'hh', 0);
    expect(gw.grooveDataFromClickableUI().hh_array[0]).toBe('^g'); // constant_ABC_HH_Normal
    gw.noteLeftClick(ev, 'hh', 0);
    expect(gw.grooveDataFromClickableUI().hh_array[0]).toBe(false);
  });

  it('toggles a snare note on (normal, like the other drums) then back off', () => {
    // Groove Scribe turned a clicked snare on as an accent; Drumsheet uses a normal stroke
    // (accents are still in the right-click menu and the label menu's "all Accented").
    gw.noteLeftClick(ev, 'snare', 1);
    expect(gw.grooveDataFromClickableUI().snare_array[1]).toBe('c'); // constant_ABC_SN_Normal
    gw.noteLeftClick(ev, 'snare', 1);
    expect(gw.grooveDataFromClickableUI().snare_array[1]).toBe(false);
  });

  it('toggles a kick note on (normal) then back off', () => {
    gw.noteLeftClick(ev, 'kick', 2);
    expect(gw.grooveDataFromClickableUI().kick_array[2]).toBe('F'); // constant_ABC_KI_Normal
    gw.noteLeftClick(ev, 'kick', 2);
    expect(gw.grooveDataFromClickableUI().kick_array[2]).toBe(false);
  });

  it('toggles tom1 and tom4 notes on (normal) then back off', () => {
    gw.showHideToms(true, true, true);
    gw.noteLeftClick(ev, 'tom1', 3);
    gw.noteLeftClick(ev, 'tom4', 4);
    let gd = gw.grooveDataFromClickableUI();
    expect(gd.toms_array[0][3]).toBe('e'); // constant_ABC_T1_Normal
    expect(gd.toms_array[3][4]).toBe('A'); // constant_ABC_T4_Normal

    gw.noteLeftClick(ev, 'tom1', 3);
    gw.noteLeftClick(ev, 'tom4', 4);
    gd = gw.grooveDataFromClickableUI();
    expect(gd.toms_array[0][3]).toBe(false);
    expect(gd.toms_array[3][4]).toBe(false);
  });

  it('rotates sticking state off -> right -> left -> both -> count -> off on repeated clicks', () => {
    gw.stickingsShowHide(true, true, true);
    const cycle = ['"R"x', '"L"x', '"R/L"x', '"count"x', '""x'];
    cycle.forEach((expected) => {
      gw.noteLeftClick(ev, 'sticking', 0);
      expect(gw.grooveDataFromClickableUI().sticking_array[0]).toBe(expected);
    });
  });

  it('routes to noteRightClick instead when advanced-edit mode is on', () => {
    gw.toggleAdvancedEdit(); // turns class_advancedEditIsOn on
    gw.noteLeftClick(ev, 'hh', 0);
    // A plain left click never reaches set_hh_state in advanced-edit mode, so
    // the note stays off; instead the hh context menu should have opened.
    expect(gw.grooveDataFromClickableUI().hh_array[0]).toBe(false);
    expect(document.getElementById('hhContextMenu').style.display).toBe('block');
  });
});

// jsdom lays nothing out, so every menu measures 0x0 at (0,0) and the app's
// "keep menus on screen" step would always move it to 8px. Give the menu a real
// 120x160 box at wherever its style puts it.
function giveMenuASize(menu) {
  menu.getBoundingClientRect = () => {
    const left = parseFloat(menu.style.left) || 0;
    const top = parseFloat(menu.style.top) || 0;
    return { left, top, width: 120, height: 160, right: left + 120, bottom: top + 160, x: left, y: top };
  };
}

describe('GrooveWriter clickable grid: noteRightClick / notePopupClick', () => {
  it('noteRightClick opens the matching context menu and records which note was clicked', () => {
    const menu = document.getElementById('hhContextMenu');
    giveMenuASize(menu);
    const ev = { clientX: 300, clientY: 200, preventDefault() {}, stopPropagation() {} };
    const returnedError = gw.noteRightClick(ev, 'hh', 3);
    expect(returnedError).toBe(false); // false == "handled ok", per the function's own doc comment

    expect(menu.style.display).toBe('block');
    // Positioned relative to the click, offset -75px on X (vs. -35px for label menus).
    expect(menu.style.top).toBe(`${200 - 30}px`);
    expect(menu.style.left).toBe(`${300 - 75}px`);
  });

  it('noteRightClick near the screen edge keeps the menu on screen (8px margin)', () => {
    // Drumsheet: menus that would open past the edge (phones) are moved back inside.
    const menu = document.getElementById('hhContextMenu');
    giveMenuASize(menu);
    gw.noteRightClick({ clientX: 10, clientY: 20, preventDefault() {}, stopPropagation() {} }, 'hh', 3);
    expect(menu.style.top).toBe('8px');
    expect(menu.style.left).toBe('8px');
  });

  it('noteRightClick returns true (error) for an unknown note type (no matching context menu)', () => {
    const ev = { clientX: 10, clientY: 20, preventDefault() {}, stopPropagation() {} };
    const returnedError = gw.noteRightClick(ev, 'bogus', 0);
    expect(returnedError).toBe(true);
  });

  it('notePopupClick applies the chosen articulation to the note last opened via noteRightClick', () => {
    const ev = { clientX: 10, clientY: 20, preventDefault() {}, stopPropagation() {} };
    gw.noteRightClick(ev, 'hh', 4); // records class_which_index_last_clicked = 4
    gw.notePopupClick('hh', 'ride');
    expect(gw.grooveDataFromClickableUI().hh_array[4]).toBe("^A'"); // constant_ABC_HH_Ride
  });

  it('notePopupClick works for tom1/tom4 via the set_tom1_state/set_tom4_state indirection', () => {
    const ev = { clientX: 1, clientY: 1, preventDefault() {}, stopPropagation() {} };
    gw.showHideToms(true, true, true);
    gw.noteRightClick(ev, 'tom1', 2);
    gw.notePopupClick('tom1', 'normal');
    expect(gw.grooveDataFromClickableUI().toms_array[0][2]).toBe('e');
  });
});

describe('GrooveWriter clickable grid: noteOnMouseEnter', () => {
  it('does nothing when hovering without ctrl or alt held', () => {
    gw.noteOnMouseEnter({ ctrlKey: false, altKey: false }, 'hh', 6);
    expect(gw.grooveDataFromClickableUI().hh_array[6]).toBe(false);
  });

  it('turns the note on when ctrlKey is held', () => {
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'hh', 5);
    expect(gw.grooveDataFromClickableUI().hh_array[5]).toBe('^g');
  });

  it('turns the note off when altKey is held', () => {
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'hh', 5); // turn on first
    gw.noteOnMouseEnter({ ctrlKey: false, altKey: true }, 'hh', 5);
    expect(gw.grooveDataFromClickableUI().hh_array[5]).toBe(false);
  });

  it('also drives snare and kick (both as normal)', () => {
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'snare', 7);
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'kick', 8);
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.snare_array[7]).toBe('c');
    expect(gd.kick_array[8]).toBe('F');
  });

  it('drives tom1/tom4 (as normal) when toms are shown', () => {
    gw.showHideToms(true, true, true); // force show, don't re-render
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'tom1', 3);
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'tom4', 4);
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.toms_array[0][3]).toBe('e'); // constant_ABC_T1_Normal
    expect(gd.toms_array[3][4]).toBe('A'); // constant_ABC_T4_Normal
  });

  it('drives stickings (ctrl -> right, alt -> off) when stickings are shown', () => {
    gw.stickingsShowHide(true, true, true); // force show, don't re-render
    gw.noteOnMouseEnter({ ctrlKey: true, altKey: false }, 'sticking', 2);
    expect(gw.grooveDataFromClickableUI().sticking_array[2]).toBe('"R"x'); // constant_ABC_STICK_R
    gw.noteOnMouseEnter({ ctrlKey: false, altKey: true }, 'sticking', 2);
    expect(gw.grooveDataFromClickableUI().sticking_array[2]).toBe('""x'); // constant_ABC_STICK_OFF
  });
});

describe('GrooveWriter clickable grid: noteLabelClick / noteLabelPopupClick', () => {
  const evAt = (x, y) => ({ clientX: x, clientY: y, preventDefault() {}, stopPropagation() {} });

  it('noteLabelClick opens the label context menu for the given instrument', () => {
    const menu = document.getElementById('hhLabelContextMenu');
    giveMenuASize(menu);
    gw.noteLabelClick(evAt(300, 200), 'hh', 1);
    expect(menu.style.display).toBe('block');
    // Label-menu offset is -35px on X (vs. -75px for per-note right-click menus).
    expect(menu.style.left).toBe(`${300 - 35}px`);
  });

  it('"all_on" turns every note of the measure on (hh -> normal)', () => {
    gw.noteLabelClick(evAt(1, 1), 'hh', 1);
    gw.noteLabelPopupClick('hh', 'all_on');
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array.every((v) => v === '^g')).toBe(true);
  });

  it('"all_off" turns every note of the measure off, even if individually set beforehand', () => {
    const ev = { target: {}, preventDefault() {}, stopPropagation() {} };
    gw.noteLeftClick(ev, 'hh', 0);
    gw.noteLeftClick(ev, 'hh', 1);

    gw.noteLabelClick(evAt(1, 1), 'hh', 1);
    gw.noteLabelPopupClick('hh', 'all_off');
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array.every((v) => v === false)).toBe(true);
  });

  it('"downbeats" alternates normal/off starting on-beat', () => {
    gw.noteLabelClick(evAt(1, 1), 'hh', 1);
    gw.noteLabelPopupClick('hh', 'downbeats');
    const gd = gw.grooveDataFromClickableUI();
    gd.hh_array.forEach((v, i) => {
      expect(v).toBe(i % 2 === 0 ? '^g' : false);
    });
  });

  it('"cancel" is a no-op', () => {
    const ev = { target: {}, preventDefault() {}, stopPropagation() {} };
    gw.noteLeftClick(ev, 'hh', 0);
    const before = gw.grooveDataFromClickableUI().hh_array.slice();

    gw.noteLabelClick(evAt(1, 1), 'hh', 1);
    gw.noteLabelPopupClick('hh', 'cancel');

    expect(gw.grooveDataFromClickableUI().hh_array).toEqual(before);
  });

  it('"alternate" sticking action alternates right/left starting on-beat', () => {
    gw.stickingsShowHide(true, true, true);
    gw.noteLabelClick(evAt(1, 1), 'stickings', 1);
    gw.noteLabelPopupClick('stickings', 'alternate');
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.sticking_array[0]).toBe('"R"x');
    expect(gd.sticking_array[1]).toBe('"L"x');
    expect(gd.sticking_array[2]).toBe('"R"x');
    expect(gd.sticking_array[3]).toBe('"L"x');
  });

  it('"all_on_ghost" sets every snare note in the measure to a ghost note', () => {
    gw.noteLabelClick(evAt(1, 1), 'snare', 1);
    gw.noteLabelPopupClick('snare', 'all_on_ghost');
    const gd = gw.grooveDataFromClickableUI();
    expect(gd.snare_array.every((v) => v === '!(.!!).!c')).toBe(true); // constant_ABC_SN_Ghost
  });

  it('"mute" action delegates to muteInstrument for the clicked measure/instrument', () => {
    gw.noteLabelClick(evAt(1, 1), 'hh', 1);
    gw.noteLabelPopupClick('hh', 'mute');
    expect(document.getElementById('unmutehhButton1').style.display).toBe('inline-block');
  });
});

describe('GrooveWriter clickable grid: muteInstrument', () => {
  it('shows the unmute button when muting, hides it when unmuting', () => {
    const btn = document.getElementById('unmutehhButton1');
    expect(btn.style.display).not.toBe('inline-block');

    gw.muteInstrument('hh', 1, true);
    expect(btn.style.display).toBe('inline-block');

    gw.muteInstrument('hh', 1, false);
    expect(btn.style.display).toBe('none');
  });
});

describe('GrooveWriter clickable grid: clearAllNotes', () => {
  it('turns every instrument off, including stickings and toms, across the whole grid', () => {
    const ev = { target: {}, preventDefault() {}, stopPropagation() {} };
    gw.showHideToms(true, true, true);
    gw.stickingsShowHide(true, true, true);

    gw.noteLeftClick(ev, 'hh', 0);
    gw.noteLeftClick(ev, 'snare', 1);
    gw.noteLeftClick(ev, 'kick', 2);
    gw.noteLeftClick(ev, 'tom1', 3);
    gw.noteLeftClick(ev, 'tom4', 4);
    gw.noteLeftClick(ev, 'sticking', 0);

    // sanity: notes are actually on before clearing
    let gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array[0]).not.toBe(false);
    expect(gd.sticking_array[0]).not.toBe('""x');

    gw.clearAllNotes();

    gd = gw.grooveDataFromClickableUI();
    expect(gd.hh_array.every((v) => v === false)).toBe(true);
    expect(gd.snare_array.every((v) => v === false)).toBe(true);
    expect(gd.kick_array.every((v) => v === false)).toBe(true);
    expect(gd.toms_array[0].every((v) => v === false)).toBe(true);
    expect(gd.toms_array[3].every((v) => v === false)).toBe(true);
    // Sticking's "off" is the ABC_STICK_OFF string, not boolean false (same
    // quirk as the baseline-grid test above).
    expect(gd.sticking_array.every((v) => v === '""x')).toBe(true);
  });
});
