# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

`impartu/rmvbasketball` is served at **rmvbasketball.com** via GitHub Pages. The `CNAME`
file in the repo root binds the custom domain — do not rename, move, or delete it, or the
site goes down.

- **`index.html` (root)** is the RMV Basketball landing page: a Three.js 3D scene of the
  Pavilion gym with a "take three shots" mini-game that reveals a Facebook group CTA
  after three makes. It depends on `styles.css`, `config.js`, `court.js`, and
  `assets/` (`three.min.js`, `THREE-LICENSE.txt`, `pavilion.jpg`) all in the repo root,
  plus `.nojekyll`. `config.js` holds the Facebook group URL, an optional `logoUrl`, and
  the `autoRedirectAfterThree` flag. Everything is static/relative-path — no build step,
  no CDN, Three.js is vendored locally.
- **`bucketsquad/index.html`** is the project: BucketSquad Hoops, a single-file HTML
  canvas game served at `rmvbasketball.com/bucketsquad`. Unaffected by the root landing
  page.

## Build and dependencies

No build step, no bundler, no package manager, no test runner. The game is one HTML file
containing its own CSS and JS. External dependencies are Google Fonts (Bungee for display
type, Nunito for body) and the Firebase compat SDK (loaded from `gstatic.com` via two
`<script>` tags, for the shared leaderboard — see Browser storage below); everything
else — including the mascot image — is inline.

To work on it, open `bucketsquad/index.html` in a browser and reload. That's the whole
loop. Do not introduce a toolchain, a framework, or an npm dependency without asking.

## Architecture of bucketsquad/index.html

Everything lives in one file: inline `<style>`, DOM for the HUD/joystick/overlay, and a
`<script>` with the game. Rough order of the script:

- **Geometry constants.** The court is modeled in *feet*, not pixels: 50 x 94 with a 3 ft
  orange apron. `fx(x)`/`fy(y)` convert court feet to canvas pixels using scale `S`,
  recomputed in `layout()`. All game logic (distances, shot difficulty, three-point
  checks) works in feet, so it stays correct at any screen size.
- **`layout()`** sizes the canvas to fit the viewport above the control bar, sets `S`, and
  rebuilds the floor. Called on load, on resize, and once the mascot image decodes and
  fonts are ready — so it can run several times before first paint and again any time the
  viewport changes.
- **Floor rendering.** `buildFloor()` paints the entire court **once** into an offscreen
  canvas (cached as `floor`); the frame loop just blits it. Anything static belongs here,
  not in `draw()`. Paint order is deliberate: apron, wood, blue paint inside the arcs,
  orange keys, white lines, then the logos and mascots on top of the lines.
  - `flowRibbon()` walks a particle through a `vnoise()` flow field to produce the
    marbled wood swirls (sine waves were tried first and looked like sticks).
  - `arcPath()` builds the three-point line: straight corner segments meeting the arc at
    `ARC_DY`. The sweep direction differs per basket — getting the `anticlockwise` flag
    wrong makes an arc curve off the floor and vanish.
  - `drawB()` draws the BucketSquad B from `BPATH`, a `Path2D` traced from the real floor
    photo, filled `evenodd` so the counters stay open. The mascot is an inlined base64
    PNG cut from the same photo.
- **Game state** — flat module-level globals, no state object/class: `team[]` (two
  offensive players), `handler` (index of whoever has the ball, derives `me()`/`mate()`),
  `D` (the defender), `ball` (`null` when held, otherwise an object with `mode` of
  `"shot"`, `"pass"`, or `"steal"`), plus `score`, `run`, `timeLeft`, `playing`, etc.
- **Modes.** `mode` is `"game"` (Two on One), `"three"` (3-Point Contest), `"arizona"`
  (Arizona Drill), or `"shuttle"` (Shuttle Run), driven by `MODES`. Each mode reuses the
  same sim/render loop but branches early in `step()`/`draw()` instead of forking into a
  separate game.
  - Three-mode: `racks`/`RACK_SPOTS` place five ball racks on the floor (`buildRacks()`),
    the top-of-the-key rack is all money balls, the other four end in one;
    `holding`/`moneyHeld` track what's in hand.
  - Arizona-mode: a scripted full-court relay, not a second opponent-driven game. The
    player (`team[0]`) always carries the ball; `AZ_LEGS` holds two legs (one per basket)
    each with a `start`, two fixed relay spots, and a `finish` (a realistic catch spot near
    the key, not the rim itself) — `azStep` (0-6, commented above its declaration) walks
    the ball out to relay A, back, out to relay B, then B leads a pass the rest of the way
    to `finish`, where a normal charge/release shot fires. `resolveShot()` calls
    `azAdvanceLeg()`, which flips `azLeg` and teleports the runner to the other leg's start
    — the loop never pauses to wait for a rebound. `team[1]` doubles as a mirror runner
    (`stepMirror()`) that runs its own independent leg (`mLeg`, decoupled from the
    player's `azLeg` on purpose — see the comment above `mWp`) and always makes its shot,
    adding straight to the shared `score`.
  - Shuttle-mode: pure conditioning, no ball. `SHUTTLE_STOPS` is the player's course (a Y
    value per line to touch, in order — checkpoints are lines across the whole width, not
    points, so `shStep`'s advance only compares `p.y`); `SHUTTLE_LOOP` is the same course
    with a trailing return-to-baseline so the 10 AI racers (`shRacers`, one per
    `SHUTTLE_LANES` slot other than the player's) can loop it forever at their own
    randomized pace, entirely independent of the player. Scoring is time, not points —
    `MODES.shuttle.asc:true` flips the leaderboard to ascending, and `fmtScore()` renders
    it as seconds instead of a raw number everywhere a score is shown. `timeLeft` here is
    just a safety cap (see `frame()`), not a real countdown; the mode ends the instant
    `shStep` completes, or via `gameOver()`'s explicit DNF path if the cap is hit first.
  - `target()` is mode-aware (`hoops[0]` for game/three, whichever basket the current
    Arizona leg is running at); shots in three-mode must additionally clear `isThree()`
    (no close-range attempts).
- **Audio.** A small synth built directly on Web Audio, no audio files — `tone()` and
  `noise()` are the primitives, `sfx` is the sound bank. `Q` and `gain` are AudioParams,
  so they're set with `.value`/`setValueAtTime`, not by assignment. Audio can only start
  from a user gesture, which is why `audio()` is called from the play button, the shoot
  handler, and the mute button.
- **Input.** Two parallel paths feed the same `move`/shoot/pass state: a pointer-driven
  virtual stick plus PASS and hold-to-charge SHOOT buttons, and a keyboard fallback
  (WASD/arrows, space, P). Keep both in sync when changing input behavior.
- **Simulation.** `step(dt)` advances the sim each frame: handler movement, teammate
  spacing, defender pursuit, ball flight, pass interception, shot resolution math
  (`release()`/`resolveShot()`).
- **Rendering.** `draw()` renders floor + players + ball each frame; draw order
  determines occlusion. `frame()` is the rAF loop and owns the clock (`last`).

Design notes worth keeping: only the **top** hoop is live (`target()` returns
`hoops[0]`) — the second hoop is drawn but never a scoring target. Shot success comes
from how close the released power is to the ideal for the distance, adjusted for
defender proximity and whether the shooter is moving. Passing to an open teammate is
meant to be rewarded; a lazy pass through the defender can be picked off.

**Leaderboard storage:** the top-10-per-mode leaderboard lives in Cloud Firestore (project
`bucketsquadgame`), not in browser storage — `rmvbasketball.com` is plain static GitHub
Pages with no backend of its own, so anything meant to be shared across visitors has to
live somewhere off-site. `loadBoards()`/`saveScore()` read/write one flat collection per
mode (`scores_game`, `scores_three`, `scores_arizona`, `scores_shuttle` — one doc per
submitted score: `name`, `score`, `ts`), each queried with a single `orderBy("score", ...)
.limit(10)` — deliberately per-mode collections instead of one with a `mode` field, so no
composite index is needed. Sort direction comes from `MODES[m].asc` (shuttle's is
ascending — lower time wins; everything else is descending). Adding a mode means adding
its Firestore security-rules block by hand on the console (see the git history for the
exact text last given to the user) — nothing in the client enforces that they match up,
so a missing rules block silently permission-denies that one mode's reads/writes without
touching the others (`loadBoards()` fetches each collection independently precisely so
that a failure like this can't blank out the boards that do work).
The `firebaseConfig` object embedded in the script is meant to be public; Firestore access
is controlled by the security rules on the project console, not by hiding the config.
Every Firestore call is wrapped in try/catch — `saveScore()` returns `{ok, rank}` so the
UI can tell a real write failure (shown honestly as "Couldn't save your score") apart from
a successful save that's just outside the top 10 ("Nice run."). The player's own name is
the one piece of state that's still local-only, via `localStorage` (`bucketsquad:name`)
— it doesn't need to be shared, so it never touches Firestore.

## Workflow

After I approve a change, commit it with a descriptive message and push to `main`
without asking again. My approval of the change is the approval to ship it.

- One logical change per commit; write the message so it explains what changed and why.
- Push to `main` directly — there is no branch protection, PR flow, or CI.
- The change goes live on rmvbasketball.com within a minute or two of the push.
